import * as THREE from "three";
import { clamp } from "./core";
import { absorbGuardianShield, ENEMY_PROFILES, selectEnemyKind, type EnemyKind } from "./enemies";
import { TouchInput } from "./input";
import { getPilotGrowthStats, getPilotProfile, type PilotProfile } from "./pilots";
import { getPilotSkillBonuses, type PilotSkillBonuses } from "./pilot-skills";
import { getBossAttackInterval, getBossPhase, getBossVolleyCount, isBossWeakpointOpen, type BossPhase } from "./boss-mechanics";
import { PICKUP_EFFECTS, selectPickupKind, type PickupKind } from "./pickups";
import { getShipProfile, type ShipProfile } from "./ships";
import { getEndlessBossProfile, getPlanetProfile, type BossProfile, type PlanetEventKind, type PlanetId, type PlanetProfile } from "./campaign";
import { getWeaponProfile, normalizeEquippedWeaponIds, normalizeUnlockedWeaponIds, normalizeWeaponSlot, type WeaponId } from "./weapons";

export type GameMode = "story" | "stage" | "endless";
export type RunResult = {
  mode: GameMode;
  status: "clear" | "gameover";
  score: number;
  kills: number;
  shards: number;
  duration: number;
  planetId: PlanetId;
  bossesDefeated: string[];
};

export type HudState = {
  hp: number;
  maxHp: number;
  shield: number;
  special: number;
  score: number;
  kills: number;
  shards: number;
  elapsed: number;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  mode: GameMode;
  combo: number;
  planetName: string;
  weaponName: string;
  weaponSlot: 0 | 1;
  bossWeakpointOpen: boolean;
  bossPhase: BossPhase;
  bossPartsRemaining: number;
  bossPartCount: number;
};

type BulletOwner = "player" | "enemy";
type Projectile = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector2;
  owner: BulletOwner;
  damage: number;
  radius: number;
  homing?: boolean;
  pierceRemaining?: number;
  weaponId?: WeaponId;
  bossHit?: boolean;
};
type Enemy = {
  mesh: THREE.Group;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  fireTimer: number;
  age: number;
  radius: number;
  shield: number;
  score: number;
  shards: number;
};
type Pickup = {
  mesh: THREE.Group;
  kind: PickupKind;
  velocity: number;
  age: number;
};
type Particle = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
};
type BossPart = {
  id: "port-left" | "port-right" | "armor-plate";
  mesh: THREE.Mesh;
  hp: number;
  maxHp: number;
  destroyed: boolean;
};
type Boss = {
  mesh: THREE.Group;
  parts: BossPart[];
  phase: BossPhase;
  hp: number;
  maxHp: number;
  fireTimer: number;
  age: number;
  entering: boolean;
  profile: BossProfile;
  core: THREE.Mesh;
  weakpointOpen: boolean;
};

const WORLD_HEIGHT = 16;
const MAX_ENEMIES = 18;
const MAX_PROJECTILES = 110;
const MAX_PARTICLES = 100;
const TAU = Math.PI * 2;

export class Game {
  readonly world = { width: 24, height: WORLD_HEIGHT };
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 80);
  private readonly clock = new THREE.Clock();
  private readonly player = new THREE.Group();
  private readonly input: TouchInput;
  private readonly stars: Array<{ geometry: THREE.BufferGeometry; points: THREE.Points; speed: number; count: number }> = [];
  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly pickups: Pickup[] = [];
  private readonly particles: Particle[] = [];
  private readonly shared = {
    bulletGeometry: new THREE.SphereGeometry(0.095, 8, 8),
    enemyBulletGeometry: new THREE.SphereGeometry(0.12, 8, 8),
    particleGeometry: new THREE.IcosahedronGeometry(0.09, 0),
    shardGeometry: new THREE.OctahedronGeometry(0.24, 0),
    ringGeometry: new THREE.TorusGeometry(0.56, 0.045, 6, 24),
    laserGeometry: new THREE.CylinderGeometry(0.085, 0.085, 1.25, 6),
    homingGeometry: new THREE.ConeGeometry(0.15, 0.42, 6),
    pierceGeometry: new THREE.OctahedronGeometry(0.2, 0)
  };
  private readonly materials = {
    player: new THREE.MeshStandardMaterial({ color: 0xf7f3ff, metalness: 0.55, roughness: 0.3, emissive: 0x251a53 }),
    wing: new THREE.MeshStandardMaterial({ color: 0x69dfff, metalness: 0.35, roughness: 0.28, emissive: 0x124b70 }),
    pink: new THREE.MeshStandardMaterial({ color: 0xff8bc8, metalness: 0.25, roughness: 0.32, emissive: 0x692044 }),
    glow: new THREE.MeshBasicMaterial({ color: 0x87eeff }),
    enemyScout: new THREE.MeshStandardMaterial({ color: 0xff87a9, metalness: 0.25, roughness: 0.45, emissive: 0x591326 }),
    enemyFast: new THREE.MeshStandardMaterial({ color: 0xb894ff, metalness: 0.35, roughness: 0.35, emissive: 0x33205e }),
    enemyHeavy: new THREE.MeshStandardMaterial({ color: 0xffc078, metalness: 0.6, roughness: 0.42, emissive: 0x663719 }),
    enemySniper: new THREE.MeshStandardMaterial({ color: 0x77dfff, metalness: 0.45, roughness: 0.3, emissive: 0x164b71 }),
    enemyBomber: new THREE.MeshStandardMaterial({ color: 0xff72bb, metalness: 0.38, roughness: 0.34, emissive: 0x641b46 }),
    enemyMissile: new THREE.MeshStandardMaterial({ color: 0xff796f, metalness: 0.42, roughness: 0.32, emissive: 0x68231f }),
    enemyGuardian: new THREE.MeshStandardMaterial({ color: 0x7ceee0, metalness: 0.55, roughness: 0.25, emissive: 0x16594f }),
    enemySwarm: new THREE.MeshStandardMaterial({ color: 0xffe48c, metalness: 0.3, roughness: 0.38, emissive: 0x70501c }),
    enemyElite: new THREE.MeshStandardMaterial({ color: 0xffadf2, metalness: 0.6, roughness: 0.28, emissive: 0x6e246a }),
    guardianShield: new THREE.MeshBasicMaterial({ color: 0x79ecff, transparent: true, opacity: 0.58 }),
    boss: new THREE.MeshStandardMaterial({ color: 0x8c7bff, metalness: 0.68, roughness: 0.25, emissive: 0x38267f }),
    bossCore: new THREE.MeshStandardMaterial({ color: 0xff83dc, metalness: 0.15, roughness: 0.2, emissive: 0xb20a71 }),
    playerBullet: new THREE.MeshBasicMaterial({ color: 0x8cf5ff }),
    laser: new THREE.MeshBasicMaterial({ color: 0xffe58e }),
    homing: new THREE.MeshBasicMaterial({ color: 0xffa1e5 }),
    pierce: new THREE.MeshBasicMaterial({ color: 0x9b9dff }),
    enemyBullet: new THREE.MeshBasicMaterial({ color: 0xff72a9 }),
    shard: new THREE.MeshStandardMaterial({ color: 0x7deeff, emissive: 0x176c91, metalness: 0.25 }),
    repair: new THREE.MeshStandardMaterial({ color: 0xffa2c8, emissive: 0x8e2758 }),
    overdrive: new THREE.MeshStandardMaterial({ color: 0xc6a3ff, emissive: 0x5b28a0 }),
    multishot: new THREE.MeshStandardMaterial({ color: 0xffe78b, emissive: 0x93631c }),
    shieldPickup: new THREE.MeshStandardMaterial({ color: 0x78eaff, emissive: 0x1b7297 }),
    speedPickup: new THREE.MeshStandardMaterial({ color: 0x8dffa9, emissive: 0x287c45 }),
    specialPickup: new THREE.MeshStandardMaterial({ color: 0xffa5eb, emissive: 0x86346f }),
    particle: new THREE.MeshBasicMaterial({ color: 0xffb4e2 })
  };
  private playerTarget = new THREE.Vector2(0, -5.8);
  private playerVelocity = new THREE.Vector2();
  private running = false;
  private disposed = false;
  private animationFrame = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private planetEventTriggered = false;
  private planetEventRemaining = 0;
  private eventDamageMultiplier = 1;
  private enemyProjectileSpeedMultiplier = 1;
  private hudTimer = 0;
  private spawnTimer = 0.6;
  private fireTimer = 0;
  private damageCooldown = 0;
  private shieldTimer = 0;
  private overdriveTimer = 0;
  private multishotTimer = 0;
  private speedBoostTimer = 0;
  private bossTimer = 28;
  private boss: Boss | null = null;
  private bossTelegraph: THREE.Mesh;
  private readonly pilotUpgrades: { attack: number; hull: number };
  private readonly shipProfile: ShipProfile;
  private readonly pilotProfile: PilotProfile;
  private readonly pilotGrowth: ReturnType<typeof getPilotGrowthStats>;
  private readonly pilotSkillBonuses: PilotSkillBonuses;
  private readonly bossPartHitPosition = new THREE.Vector3();
  private readonly pilotCockpitMaterial: THREE.MeshStandardMaterial;
  private readonly invulnerableForTest: boolean;
  private readonly planetProfile: PlanetProfile;
  private readonly weaponIds: [WeaponId, WeaponId];
  private activeWeaponSlot: 0 | 1;
  private bossSequence = 0;
  private readonly defeatedBosses: string[] = [];
  private pilotAnimationTime = 0;
  private cameraShakeTime = 0;
  private cameraShakeStrength = 0;
  private sensitivityValue: number;
  private mode: GameMode = "story";
  private hp = 3;
  private maxHp = 3;
  private shield = 100;
  private special = 60;
  private score = 0;
  private kills = 0;
  private shards = 0;
  private combo = 0;
  private comboTimer = 0;
  private readonly callbacks: {
    onHudUpdate: (state: HudState) => void;
    onRunEnd: (result: RunResult) => void;
    onGraphicsContextLost: () => void;
    onGraphicsContextRestored: () => void;
    onMissionEvent: (message: string, speaker?: string) => void;
  };
  private readonly handleWebGLContextLost = (event: Event): void => {
    // Three.js also listens for this event and restores its renderer when the browser does.
    event.preventDefault();
    if (this.disposed || !this.running) return;
    this.running = false;
    this.callbacks.onGraphicsContextLost();
  };
  private readonly handleWebGLContextRestored = (): void => {
    if (this.disposed) return;
    this.callbacks.onGraphicsContextRestored();
  };

  constructor(options: {
    canvas: HTMLCanvasElement;
    sensitivity?: number;
    upgrades?: { attack: number; hull: number };
    shipId?: string;
    pilotId?: string;
    pilotLevel?: number;
    pilotSkills?: readonly string[];
    planetId?: string;
    weaponIds?: readonly string[];
    activeWeaponSlot?: number;
    invulnerableForTest?: boolean;
    onMissionEvent?: (message: string, speaker?: string) => void;
    onHudUpdate: (state: HudState) => void;
    onRunEnd: (result: RunResult) => void;
    onGraphicsContextLost: () => void;
    onGraphicsContextRestored: () => void;
  }) {
    this.canvas = options.canvas;
    this.callbacks = {
      onHudUpdate: options.onHudUpdate,
      onRunEnd: options.onRunEnd,
      onGraphicsContextLost: options.onGraphicsContextLost,
      onGraphicsContextRestored: options.onGraphicsContextRestored,
      onMissionEvent: options.onMissionEvent ?? (() => undefined)
    };
    this.sensitivityValue = options.sensitivity ?? 1;
    this.planetProfile = getPlanetProfile(options.planetId ?? "aurora-prime");
    const suppliedWeapons = options.weaponIds ?? ["photon-pulse"];
    this.weaponIds = normalizeEquippedWeaponIds(suppliedWeapons, normalizeUnlockedWeaponIds(suppliedWeapons));
    this.activeWeaponSlot = normalizeWeaponSlot(options.activeWeaponSlot ?? 0);
    this.shipProfile = getShipProfile(options.shipId ?? "Lumen-01");
    this.pilotProfile = getPilotProfile(options.pilotId ?? "lumi-asteria");
    this.pilotGrowth = getPilotGrowthStats(options.pilotLevel ?? 1);
    this.pilotSkillBonuses = getPilotSkillBonuses(this.pilotProfile.id, options.pilotSkills ?? []);
    this.invulnerableForTest = import.meta.env.DEV && options.invulnerableForTest === true;
    this.pilotCockpitMaterial = new THREE.MeshStandardMaterial({
      color: this.pilotProfile.accentColor,
      metalness: 0.2,
      roughness: 0.22,
      emissive: this.pilotProfile.accentColor,
      emissiveIntensity: 0.22
    });
    this.pilotUpgrades = {
      attack: clamp(options.upgrades?.attack ?? 0, 0, 20),
      hull: clamp(options.upgrades?.hull ?? 0, 0, 20)
    };

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      depth: true
    });
    this.canvas.addEventListener("webglcontextlost", this.handleWebGLContextLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.handleWebGLContextRestored, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.renderer.setClearColor(0x05091f, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(this.planetProfile.backgroundColor);
    this.scene.fog = new THREE.FogExp2(this.planetProfile.fogColor, 0.008);
    this.camera.position.set(0, 0, 32);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x9bbdff, 1.5);
    const key = new THREE.PointLight(0x65deff, 2.4, 30);
    key.position.set(0, -3, 7);
    this.scene.add(ambient, key);
    this.createStarfield();
    this.createPlayer();

    this.bossTelegraph = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 7.5, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xff528b, transparent: true, opacity: 0.35 })
    );
    this.bossTelegraph.visible = false;
    this.scene.add(this.bossTelegraph);

    this.input = new TouchInput(
      options.canvas,
      () => this.world,
      () => this.sensitivityValue,
      (target) => {
        if (target) this.playerTarget.set(
          clamp(target.x, -this.world.width / 2 + 0.8, this.world.width / 2 - 0.8),
          clamp(target.y, -this.world.height / 2 + 0.7, this.world.height / 2 - 0.8)
        );
      }
    );
    this.resize();
    window.addEventListener("resize", this.resize);
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  setSensitivity(value: number): void {
    this.sensitivityValue = clamp(value, 0.35, 2.5);
  }

  start(mode: GameMode): void {
    this.clearRunObjects();
    this.mode = mode;
    this.elapsed = 0;
    this.bossSequence = 0;
    this.defeatedBosses.length = 0;
    this.planetEventTriggered = false;
    this.planetEventRemaining = 0;
    this.eventDamageMultiplier = 1;
    this.enemyProjectileSpeedMultiplier = 1;
    this.scene.background = new THREE.Color(this.planetProfile.backgroundColor);
    this.scene.fog = new THREE.FogExp2(this.planetProfile.fogColor, 0.008);
    const pilotBriefing = this.planetProfile.pilotBriefings[this.pilotProfile.id] ?? this.pilotProfile.storyIntro;
    this.callbacks.onMissionEvent(pilotBriefing, this.pilotProfile.name);
    this.callbacks.onMissionEvent(this.planetProfile.event, "MISSION CONTROL");
    this.hp = 3 + this.pilotUpgrades.hull + this.shipProfile.hullBonus +
      this.pilotProfile.hullBonus + this.pilotGrowth.hullBonus + this.pilotSkillBonuses.hullBonus;
    this.maxHp = this.hp;
    this.shield = 100;
    this.special = 60;
    this.score = 0;
    this.kills = 0;
    this.shards = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.spawnTimer = 0.65;
    this.fireTimer = 0;
    this.damageCooldown = 0;
    this.shieldTimer = 0;
    this.overdriveTimer = 0;
    this.multishotTimer = 0;
    this.speedBoostTimer = 0;
    this.bossTimer = mode === "stage" ? 30 : 38;
    this.player.position.set(0, -5.8, 0.6);
    this.playerTarget.set(0, -5.8);
    this.playerVelocity.set(0, 0);
    this.running = true;
    this.callbacks.onHudUpdate(this.getHudState());
  }

  switchWeaponSlot(): void {
    this.activeWeaponSlot = this.activeWeaponSlot === 0 ? 1 : 0;
    this.callbacks.onHudUpdate(this.getHudState());
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    if (!this.disposed) {
      this.running = true;
      this.lastFrame = performance.now();
    }
  }

  activateShield(): void {
    if (!this.running || this.shield < 30 || this.shieldTimer > 0) return;
    this.shield -= 30;
    this.shieldTimer = 3.2;
    this.spawnBurst(this.player.position, 0x70efff, 20);
  }

  specialAttack(): void {
    if (!this.running || this.special < 60) return;
    this.special -= 60;
    const center = this.player.position.clone();
    this.spawnBurst(center, 0xb79cff, 42);
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const bullet = this.projectiles[index];
      if (bullet.owner === "enemy") this.removeProjectile(index);
    }
    const shipDamage = this.shipProfile.attackMultiplier *
      this.pilotProfile.attackMultiplier * this.pilotProfile.specialMultiplier *
      this.pilotGrowth.attackMultiplier * this.pilotSkillBonuses.attackMultiplier *
      this.pilotSkillBonuses.specialMultiplier;
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      this.damageEnemy(index, (5 + this.pilotUpgrades.attack) * shipDamage);
    }
    if (this.boss) this.damageBoss((10 + this.pilotUpgrades.attack * 2) * shipDamage);
    if (this.pilotProfile.skillType === "aegis") {
      this.shield = Math.min(100, this.shield + 35);
      this.shieldTimer = Math.max(this.shieldTimer, 1.4);
    } else if (this.pilotProfile.skillType === "comet") {
      this.overdriveTimer = Math.max(this.overdriveTimer, 3.5);
      this.speedBoostTimer = Math.max(this.speedBoostTimer, 3.5);
    }
  }

  private createPlayer(): void {
    const visual = this.shipProfile.visual;
    const bodyWidth = visual === "speed" ? 0.35 : visual === "heavy" ? 0.58 : 0.47;
    const bodyLength = visual === "speed" ? 1.9 : visual === "heavy" ? 1.5 : 1.65;
    const bodyMaterial = visual === "speed" ? this.materials.wing
      : visual === "heavy" ? this.materials.pink : this.materials.player;
    const body = new THREE.Mesh(new THREE.ConeGeometry(bodyWidth, bodyLength, visual === "heavy" ? 6 : 5), bodyMaterial);
    body.position.y = 0.05;
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(visual === "heavy" ? 0.29 : 0.25, 12, 10), this.pilotCockpitMaterial);
    cockpit.scale.set(0.78, 1.45, 0.58);
    cockpit.position.set(0, 0.12, 0.42);
    const wingSpan = visual === "heavy" ? 1.02 : visual === "speed" ? 0.92 : 0.78;
    const wingOffset = visual === "heavy" ? 0.72 : visual === "speed" ? 0.58 : 0.54;
    const wingGeometry = new THREE.BoxGeometry(wingSpan, visual === "heavy" ? 0.36 : 0.24, 0.18);
    const leftWing = new THREE.Mesh(wingGeometry, this.materials.wing);
    leftWing.position.set(-wingOffset, -0.28, 0.02);
    leftWing.rotation.z = visual === "speed" ? -0.36 : -0.24;
    leftWing.name = "wing-left";
    const rightWing = new THREE.Mesh(wingGeometry, this.materials.wing);
    rightWing.position.set(wingOffset, -0.28, 0.02);
    rightWing.rotation.z = visual === "speed" ? 0.36 : 0.24;
    rightWing.name = "wing-right";
    const engineGeometry = new THREE.CylinderGeometry(visual === "heavy" ? 0.16 : 0.12, 0.2, visual === "speed" ? 0.66 : 0.5, 8);
    const engineOffset = visual === "heavy" ? 0.38 : 0.27;
    const engineLeft = new THREE.Mesh(engineGeometry, this.materials.glow);
    engineLeft.position.set(-engineOffset, -0.8, 0.04);
    engineLeft.name = "engine-left";
    const engineRight = engineLeft.clone();
    engineRight.position.x = engineOffset;
    if (visual === "heavy") {
      const armorGeometry = new THREE.BoxGeometry(0.28, 0.62, 0.24);
      const armorLeft = new THREE.Mesh(armorGeometry, this.materials.player);
      armorLeft.position.set(-0.9, -0.32, 0.08);
      const armorRight = armorLeft.clone();
      armorRight.position.x = 0.9;
      this.player.add(armorLeft, armorRight);
    }
    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 6, 24), this.materials.glow);
    aura.rotation.x = Math.PI / 2;
    aura.position.z = -0.1;
    aura.visible = false;
    aura.name = "shieldAura";
    this.player.add(body, cockpit, leftWing, rightWing, engineLeft, engineRight, aura);
    this.scene.add(this.player);
  }

  private createStarfield(): void {
    const layers = [
      { count: 170, speed: 0.7, size: 0.07, color: 0x94a9ff, depth: -8 },
      { count: 95, speed: 1.8, size: 0.12, color: 0x84eaff, depth: -5 },
      { count: 38, speed: 3.1, size: 0.18, color: 0xffb9ec, depth: -2 }
    ];
    for (const layer of layers) {
      const positions = new Float32Array(layer.count * 3);
      for (let index = 0; index < layer.count; index += 1) {
        positions[index * 3] = (Math.random() - 0.5) * 32;
        positions[index * 3 + 1] = (Math.random() - 0.5) * 24;
        positions[index * 3 + 2] = layer.depth;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: layer.color,
        size: layer.size,
        transparent: true,
        opacity: 0.82,
        sizeAttenuation: false
      });
      const points = new THREE.Points(geometry, material);
      this.scene.add(points);
      this.stars.push({ geometry, points, speed: layer.speed, count: layer.count });
    }
  }

  private resize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.world.width = WORLD_HEIGHT * aspect;
    this.camera.left = -this.world.width / 2;
    this.camera.right = this.world.width / 2;
    this.camera.top = WORLD_HEIGHT / 2;
    this.camera.bottom = -WORLD_HEIGHT / 2;
    this.camera.updateProjectionMatrix();
  };

  private animate = (now: number): void => {
    if (this.disposed) return;
    const dt = Math.min(0.04, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (this.running) this.update(dt);
    this.cameraShakeTime = Math.max(0, this.cameraShakeTime - dt);
    if (this.cameraShakeTime > 0) {
      const fade = this.cameraShakeTime / 0.42;
      this.camera.position.x = Math.sin(now * 0.047) * this.cameraShakeStrength * fade;
      this.camera.position.y = Math.cos(now * 0.061) * this.cameraShakeStrength * fade * 0.6;
    } else {
      this.camera.position.x = 0;
      this.camera.position.y = 0;
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private update(dt: number): void {
    this.elapsed += dt;
    if (!this.planetEventTriggered && this.elapsed >= this.planetProfile.missionEvent.triggerAtSeconds) {
      this.activatePlanetEvent();
    }
    if (this.planetEventRemaining > 0) {
      this.planetEventRemaining = Math.max(0, this.planetEventRemaining - dt);
      if (this.planetEventRemaining === 0) this.completePlanetEvent();
    }
    this.damageCooldown = Math.max(0, this.damageCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    this.multishotTimer = Math.max(0, this.multishotTimer - dt);
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    this.shield = Math.min(100, this.shield + dt * 2.5 *
      this.shipProfile.shieldRechargeMultiplier * this.pilotProfile.shieldRechargeMultiplier *
      this.pilotSkillBonuses.shieldRechargeMultiplier);
    this.special = Math.min(100, this.special + dt * 1.1);

    const dx = this.playerTarget.x - this.player.position.x;
    const dy = this.playerTarget.y - this.player.position.y;
    const speedBoost = this.speedBoostTimer > 0 ? 1.32 : 1;
    const smoothing = 1 - Math.exp(-13 * this.shipProfile.movementMultiplier *
      this.pilotProfile.movementMultiplier * this.pilotSkillBonuses.movementMultiplier * speedBoost * dt);
    this.playerVelocity.set(dx * smoothing, dy * smoothing);
    this.player.position.x += this.playerVelocity.x;
    this.player.position.y += this.playerVelocity.y;
    this.pilotAnimationTime += dt;
    const animationAmount = this.pilotProfile.animationStyle === "ace" ? 0.2
      : this.pilotProfile.animationStyle === "guardian" ? 0.055 : 0.12;
    const leftWing = this.player.getObjectByName("wing-left");
    const rightWing = this.player.getObjectByName("wing-right");
    if (leftWing && rightWing) {
      const wingBeat = Math.sin(this.pilotAnimationTime * (this.pilotProfile.animationStyle === "ace" ? 8 : 3.5)) * animationAmount;
      leftWing.rotation.y = wingBeat;
      rightWing.rotation.y = -wingBeat;
    }
    this.pilotCockpitMaterial.emissiveIntensity = 0.18 + (Math.sin(this.pilotAnimationTime * 2.4) + 1) * 0.055;
    this.player.rotation.z = clamp(-this.playerVelocity.x * 0.12, -0.32, 0.32);
    const aura = this.player.getObjectByName("shieldAura");
    if (aura) aura.visible = this.shieldTimer > 0;
    if (aura) aura.rotation.z += dt * 0.9;

    this.updateStars(dt);
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      const weaponInterval = getWeaponProfile(this.weaponIds[this.activeWeaponSlot]).fireIntervalMultiplier;
      this.firePlayerShots();
      this.fireTimer = this.overdriveTimer > 0
        ? 0.095 * this.shipProfile.fireIntervalMultiplier * this.pilotProfile.fireIntervalMultiplier * weaponInterval
        : Math.max(0.12, 0.23 - this.pilotUpgrades.attack * 0.004) *
          this.shipProfile.fireIntervalMultiplier * this.pilotProfile.fireIntervalMultiplier *
          this.pilotSkillBonuses.fireIntervalMultiplier * weaponInterval;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < MAX_ENEMIES && !this.boss) {
      this.spawnEnemy();
      const difficulty = 1 + this.elapsed / 145;
      this.spawnTimer = Math.max(0.42, (this.mode === "endless" ? 1.05 : 1.35) / difficulty);
    }
    this.bossTimer -= dt;
    if (!this.boss && this.bossTimer <= 0) this.spawnBoss();
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    if (this.boss) this.updateBoss(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.callbacks.onHudUpdate(this.getHudState());
      this.hudTimer = 0.08;
    }
  }

  private activatePlanetEvent(): void {
    const event = this.planetProfile.missionEvent;
    this.planetEventTriggered = true;
    this.planetEventRemaining = event.durationSeconds;
    const dialogue = event.pilotDialogue[this.pilotProfile.id] ?? event.name;
    this.callbacks.onMissionEvent(`【${event.name}】${dialogue}`, this.pilotProfile.name);

    if (event.kind === "resonance") {
      this.eventDamageMultiplier = 1.28;
      this.spawnBurst(this.player.position, 0x9dfff2, 32);
    } else if (event.kind === "gravity-shear") {
      this.enemyProjectileSpeedMultiplier = 1.28;
      this.spawnBurst(this.player.position, 0xff9a73, 26);
    } else if (event.kind === "archive-ward") {
      this.shieldTimer = Math.max(this.shieldTimer, event.durationSeconds);
      for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
        if (this.projectiles[index].owner === "enemy") this.removeProjectile(index);
      }
      this.spawnBurst(this.player.position, 0x8cecff, 44);
    }
  }

  private completePlanetEvent(): void {
    this.eventDamageMultiplier = 1;
    this.enemyProjectileSpeedMultiplier = 1;
    this.score += 650;
    this.shards += 12;
    this.callbacks.onMissionEvent(
      `惑星イベント「${this.planetProfile.missionEvent.name}」達成！ +650 SCORE / +12 ✦`,
      "MISSION CONTROL"
    );
    this.spawnBurst(this.player.position, 0xffe7a1, 24);
  }

  private updateStars(dt: number): void {
    for (const layer of this.stars) {
      const positions = layer.geometry.attributes.position as THREE.BufferAttribute;
      const array = positions.array as Float32Array;
      for (let index = 0; index < layer.count; index += 1) {
        const yIndex = index * 3 + 1;
        array[yIndex] -= layer.speed * dt * 2;
        if (array[yIndex] < -WORLD_HEIGHT / 2 - 1) array[yIndex] = WORLD_HEIGHT / 2 + 1;
        array[index * 3] -= this.playerVelocity.x * 0.012 * layer.speed;
        if (array[index * 3] < -this.world.width / 2) array[index * 3] = this.world.width / 2;
        if (array[index * 3] > this.world.width / 2) array[index * 3] = -this.world.width / 2;
      }
      positions.needsUpdate = true;
    }
    this.camera.position.x += (this.player.position.x * 0.045 - this.camera.position.x) * Math.min(1, dt * 2);
  }

  private spawnEnemy(): void {
    const kind = selectEnemyKind(this.elapsed, Math.random());
    const xLimit = Math.max(1, this.world.width / 2 - 1);
    const x = (Math.random() * 2 - 1) * xLimit;
    if (kind === "swarm") {
      const count = Math.min(3, MAX_ENEMIES - this.enemies.length);
      for (let index = 0; index < count; index += 1) {
        this.createEnemy("swarm", x + (index - (count - 1) / 2) * 0.8, WORLD_HEIGHT / 2 + 1 - Math.abs(index - 1) * 0.22);
      }
      return;
    }
    this.createEnemy(kind, x, WORLD_HEIGHT / 2 + 1);
  }

  private createEnemy(kind: EnemyKind, x: number, y: number): void {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const profile = ENEMY_PROFILES[kind];
    const group = new THREE.Group();
    const bodyGeometry: THREE.BufferGeometry = (() => {
      switch (profile.shape) {
        case "cone": return new THREE.ConeGeometry(0.42, 1.05, 5);
        case "octahedron": return new THREE.OctahedronGeometry(0.52, 0);
        case "box": return new THREE.BoxGeometry(1.2, 0.88, 0.7);
        case "needle": return new THREE.ConeGeometry(0.3, 1.4, 5);
        case "bomber": return new THREE.BoxGeometry(1.35, 0.9, 0.7);
        case "dart": return new THREE.ConeGeometry(0.26, 1.25, 5);
        case "orb": return new THREE.OctahedronGeometry(0.58, 1);
        case "swarm": return new THREE.ConeGeometry(0.22, 0.55, 4);
        case "elite": return new THREE.DodecahedronGeometry(0.68, 0);
      }
    })();
    const material = {
      scout: this.materials.enemyScout,
      interceptor: this.materials.enemyFast,
      heavy: this.materials.enemyHeavy,
      sniper: this.materials.enemySniper,
      bomber: this.materials.enemyBomber,
      missile: this.materials.enemyMissile,
      guardian: this.materials.enemyGuardian,
      swarm: this.materials.enemySwarm,
      elite: this.materials.enemyElite
    }[kind];
    const body = new THREE.Mesh(bodyGeometry, material);
    body.rotation.z = Math.PI;
    group.add(body);

    if (kind === "heavy" || kind === "elite") {
      const core = new THREE.Mesh(new THREE.SphereGeometry(kind === "elite" ? 0.28 : 0.2, 10, 8), this.materials.bossCore);
      core.position.z = 0.42;
      group.add(core);
    }
    if (kind === "bomber" || kind === "elite") {
      const wingGeometry = new THREE.BoxGeometry(0.72, 0.18, 0.16);
      const left = new THREE.Mesh(wingGeometry, this.materials.enemyHeavy);
      left.position.set(-0.66, -0.12, -0.04);
      left.rotation.z = -0.16;
      const right = left.clone();
      right.position.x = 0.66;
      right.rotation.z = 0.16;
      group.add(left, right);
    }
    if (kind === "sniper") {
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.85, 0.12), this.materials.glow);
      barrel.position.set(0, -0.7, 0.24);
      group.add(barrel);
    }
    if (kind === "missile") {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 0.4, 5), this.materials.bossCore);
      tail.position.set(0, 0.66, 0);
      group.add(tail);
    }
    if (kind === "guardian" || profile.shield > 0) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.05, 6, 20), this.materials.guardianShield);
      ring.rotation.x = Math.PI / 2;
      ring.position.z = 0.3;
      ring.name = "guardRing";
      group.add(ring);
    }

    group.position.set(x, y, 0.25);
    this.scene.add(group);
    this.enemies.push({
      mesh: group,
      kind,
      hp: profile.health,
      maxHp: profile.health,
      speed: profile.speed,
      fireTimer: 0.65 + Math.random() * profile.fireInterval * 0.45,
      age: 0,
      radius: profile.radius,
      shield: profile.shield,
      score: profile.score,
      shards: profile.shards
    });
  }

  private updateEnemies(dt: number): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const profile = ENEMY_PROFILES[enemy.kind];
      enemy.age += dt;
      const sway = profile.movement === "zigzag" ? 1.1
        : profile.movement === "strafe" ? 0.9
          : profile.movement === "steady" ? 0.2 : 0.42;
      const frequency = profile.movement === "zigzag" ? 4.5
        : profile.movement === "sniper" ? 1.3
          : profile.movement === "strafe" ? 3.2 : 2.2;
      enemy.mesh.position.x += Math.sin(enemy.age * frequency) * sway * dt;
      if (profile.movement === "sniper") {
        if (enemy.age > 9 || enemy.mesh.position.y > 5.6) {
          enemy.mesh.position.y -= enemy.speed * dt;
        }
      } else {
        enemy.mesh.position.y -= enemy.speed * (1 + this.elapsed / 220) * dt;
      }
      enemy.mesh.rotation.z = Math.PI + Math.sin(enemy.age * 3) * (profile.movement === "strafe" ? 0.24 : 0.14);

      const guardRing = enemy.mesh.getObjectByName("guardRing");
      if (guardRing) {
        guardRing.rotation.z += dt * 1.5;
        guardRing.scale.setScalar(0.95 + Math.sin(enemy.age * 3.5) * 0.06);
        guardRing.visible = enemy.shield > 0;
      }
      if (profile.movement === "sniper" && enemy.fireTimer < 0.45) {
        enemy.mesh.scale.setScalar(1.04 + Math.sin(enemy.age * 18) * 0.035);
      } else {
        enemy.mesh.scale.setScalar(1);
      }

      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && enemy.mesh.position.y < WORLD_HEIGHT / 2 - 1 && profile.attack !== "none") {
        if (profile.attack === "spread") this.fireEnemySpread(enemy.mesh.position.x, enemy.mesh.position.y, 5, 0.28, 5.1);
        else if (profile.attack === "homing") this.fireEnemyHomingShot(enemy.mesh.position.x, enemy.mesh.position.y);
        else if (profile.attack === "triple") this.fireEnemySpread(enemy.mesh.position.x, enemy.mesh.position.y, 3, 0.18, 6.2);
        else this.fireEnemyShot(enemy.mesh.position.x, enemy.mesh.position.y, profile.movement === "sniper" ? 8 : 5.4);
        enemy.fireTimer = profile.fireInterval;
      }
      if (enemy.mesh.position.distanceTo(this.player.position) < enemy.radius + 0.4) {
        this.damagePlayer(1);
        this.removeEnemy(index, false);
      } else if (enemy.mesh.position.y < -WORLD_HEIGHT / 2 - 1) {
        this.removeEnemy(index, false);
      }
    }
  }

  private firePlayerShots(): void {
    const weapon = getWeaponProfile(this.weaponIds[this.activeWeaponSlot]);
    const target = this.findTarget();
    const origin = new THREE.Vector2(this.player.position.x, this.player.position.y + 0.75);
    const direction = target
      ? new THREE.Vector2(target.x - origin.x, target.y - origin.y).normalize()
      : new THREE.Vector2(0, 1);
    const count = weapon.id === "prism-laser" ? 1 : Math.min(5, 1 + Math.floor(this.pilotUpgrades.attack / 4) +
      (this.multishotTimer > 0 ? 2 : 0));
    const geometry = weapon.id === "prism-laser" ? this.shared.laserGeometry
      : weapon.id === "comet-homing" ? this.shared.homingGeometry
        : weapon.id === "nova-piercer" ? this.shared.pierceGeometry : this.shared.bulletGeometry;
    const material = weapon.id === "prism-laser" ? this.materials.laser
      : weapon.id === "comet-homing" ? this.materials.homing
        : weapon.id === "nova-piercer" ? this.materials.pierce : this.materials.playerBullet;
    for (let index = 0; index < count; index += 1) {
      const spread = (index - (count - 1) / 2) * 0.105;
      const velocity = direction.clone().rotateAround(new THREE.Vector2(), spread).multiplyScalar(weapon.projectileSpeed);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(origin.x, origin.y, 0.55);
      mesh.rotation.z = Math.atan2(-velocity.x, velocity.y);
      if (weapon.id === "prism-laser") mesh.scale.set(1, 1.35, 1);
      this.scene.add(mesh);
      this.projectiles.push({
        mesh,
        velocity,
        owner: "player",
        weaponId: weapon.id,
        homing: weapon.homing,
        pierceRemaining: weapon.pierce,
        damage: Math.max(0.1,
          ((this.overdriveTimer > 0 ? 2 : 1) + Math.floor(this.pilotUpgrades.attack / 3)) *
          this.shipProfile.attackMultiplier * this.pilotProfile.attackMultiplier *
          this.pilotGrowth.attackMultiplier * weapon.damageMultiplier * this.eventDamageMultiplier
        ),
        radius: weapon.radius
      });
    }
    if (this.projectiles.length > MAX_PROJECTILES) this.removeProjectile(0);
  }

  private findClosestTarget(x: number, y: number): THREE.Vector2 | null {
    let selected: THREE.Vector2 | null = null;
    let best = Infinity;
    for (const enemy of this.enemies) {
      const distance = (enemy.mesh.position.x - x) ** 2 + (enemy.mesh.position.y - y) ** 2;
      if (distance < best) {
        best = distance;
        selected = new THREE.Vector2(enemy.mesh.position.x, enemy.mesh.position.y);
      }
    }
    if (this.boss) {
      const distance = (this.boss.mesh.position.x - x) ** 2 + (this.boss.mesh.position.y - y) ** 2;
      if (distance < best) selected = new THREE.Vector2(this.boss.mesh.position.x, this.boss.mesh.position.y);
    }
    return selected;
  }

  private findTarget(): THREE.Vector2 | null {
    let selected: THREE.Vector2 | null = null;
    let best = Infinity;
    for (const enemy of this.enemies) {
      if (enemy.mesh.position.y <= this.player.position.y) continue;
      const dx = enemy.mesh.position.x - this.player.position.x;
      const dy = enemy.mesh.position.y - this.player.position.y;
      const distance = dx * dx + dy * dy;
      if (distance < best) {
        best = distance;
        selected = new THREE.Vector2(enemy.mesh.position.x, enemy.mesh.position.y);
      }
    }
    if (this.boss) selected = new THREE.Vector2(this.boss.mesh.position.x, this.boss.mesh.position.y);
    return selected;
  }

  private fireEnemyShot(x: number, y: number, speed = 5.4): void {
    const direction = new THREE.Vector2(this.player.position.x - x, this.player.position.y - y).normalize();
    this.addProjectile(x, y, direction.multiplyScalar(speed), "enemy", 1);
  }

  private fireEnemySpread(x: number, y: number, count: number, spread: number, speed: number): void {
    const direction = new THREE.Vector2(this.player.position.x - x, this.player.position.y - y).normalize();
    const origin = new THREE.Vector2();
    for (let index = 0; index < count; index += 1) {
      const angle = (index - (count - 1) / 2) * spread;
      this.addProjectile(x, y, direction.clone().rotateAround(origin, angle).multiplyScalar(speed), "enemy", 1);
    }
  }

  private fireEnemyHomingShot(x: number, y: number): void {
    const direction = new THREE.Vector2(this.player.position.x - x, this.player.position.y - y).normalize();
    this.addProjectile(x, y, direction.multiplyScalar(4.4), "enemy", 1, true);
  }

  private addProjectile(x: number, y: number, velocity: THREE.Vector2, owner: BulletOwner, damage: number, homing = false): void {
    const mesh = new THREE.Mesh(
      owner === "player" ? this.shared.bulletGeometry : this.shared.enemyBulletGeometry,
      owner === "player" ? this.materials.playerBullet : this.materials.enemyBullet
    );
    mesh.position.set(x, y, owner === "player" ? 0.55 : 0.4);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, velocity, owner, damage, radius: owner === "player" ? 0.14 : 0.19, homing });
    if (this.projectiles.length > MAX_PROJECTILES) this.removeProjectile(0);
  }

  private updateProjectiles(dt: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const bullet = this.projectiles[index];
      if (bullet.homing) {
        const target = bullet.owner === "enemy"
          ? new THREE.Vector2(this.player.position.x, this.player.position.y)
          : this.findClosestTarget(bullet.mesh.position.x, bullet.mesh.position.y);
        if (target) {
          const speed = bullet.velocity.length();
          const desired = new THREE.Vector2(
            target.x - bullet.mesh.position.x,
            target.y - bullet.mesh.position.y
          ).normalize().multiplyScalar(speed);
          bullet.velocity.lerp(desired, Math.min(1, dt * (bullet.owner === "player" ? 2.2 : 1.4)));
          if (bullet.velocity.lengthSq() > 0) bullet.velocity.setLength(speed);
        }
      }
      const eventSpeed = bullet.owner === "enemy" ? this.enemyProjectileSpeedMultiplier : 1;
      bullet.mesh.position.x += bullet.velocity.x * dt * eventSpeed;
      bullet.mesh.position.y += bullet.velocity.y * dt * eventSpeed;
      if (bullet.weaponId === "comet-homing" || bullet.weaponId === "prism-laser") {
        bullet.mesh.rotation.z = Math.atan2(-bullet.velocity.x, bullet.velocity.y);
      }
      if (bullet.mesh.position.y > WORLD_HEIGHT / 2 + 2 || bullet.mesh.position.y < -WORLD_HEIGHT / 2 - 2 ||
          Math.abs(bullet.mesh.position.x) > this.world.width / 2 + 2) {
        this.removeProjectile(index);
        continue;
      }
      if (bullet.owner === "player") {
        let consumed = false;
        for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = this.enemies[enemyIndex];
          if (bullet.mesh.position.distanceTo(enemy.mesh.position) < enemy.radius + bullet.radius) {
            this.damageEnemy(enemyIndex, bullet.damage);
            if ((bullet.pierceRemaining ?? 0) > 0) {
              bullet.pierceRemaining = (bullet.pierceRemaining ?? 0) - 1;
              bullet.mesh.position.y += Math.sign(bullet.velocity.y || 1) * (enemy.radius + bullet.radius + 0.18);
            } else {
              consumed = true;
            }
            break;
          }
        }
        if (!consumed && this.boss && !bullet.bossHit) {
          const boss = this.boss;
          let struckPart: BossPart | undefined;
          for (const part of boss.parts) {
            if (part.destroyed) continue;
            part.mesh.getWorldPosition(this.bossPartHitPosition);
            if (bullet.mesh.position.distanceTo(this.bossPartHitPosition) < 0.72 + bullet.radius) {
              struckPart = part;
              break;
            }
          }
          if (struckPart) {
            this.damageBossPart(struckPart, bullet.damage);
            bullet.bossHit = true;
            consumed = (bullet.pierceRemaining ?? 0) <= 0;
            if (!consumed) bullet.pierceRemaining = (bullet.pierceRemaining ?? 0) - 1;
          } else {
            const corePosition = boss.core.getWorldPosition(this.bossPartHitPosition);
            if (bullet.mesh.position.distanceTo(corePosition) < 0.84) {
              this.damageBoss(bullet.damage, boss.weakpointOpen);
              bullet.bossHit = true;
              consumed = (bullet.pierceRemaining ?? 0) <= 0;
              if (!consumed) bullet.pierceRemaining = (bullet.pierceRemaining ?? 0) - 1;
            } else if (bullet.mesh.position.distanceTo(boss.mesh.position) < 2.15) {
              this.damageBoss(bullet.damage, false);
              bullet.bossHit = true;
              consumed = (bullet.pierceRemaining ?? 0) <= 0;
              if (!consumed) bullet.pierceRemaining = (bullet.pierceRemaining ?? 0) - 1;
            }
          }
        }
        if (consumed) this.removeProjectile(index);
      } else if (bullet.mesh.position.distanceTo(this.player.position) < 0.54 + bullet.radius) {
        this.damagePlayer(bullet.damage);
        this.removeProjectile(index);
      }
    }
  }

  private damageEnemy(index: number, damage: number): void {
    const enemy = this.enemies[index];
    if (!enemy) return;
    let remainingDamage = Math.max(0, damage);
    if (enemy.shield > 0) {
      remainingDamage = this.drainEnemyShield(enemy, remainingDamage);
    } else if (enemy.kind !== "guardian") {
      const guardian = this.enemies.find((candidate) =>
        candidate !== enemy &&
        candidate.kind === "guardian" &&
        candidate.shield > 0 &&
        candidate.mesh.position.distanceTo(enemy.mesh.position) < 3.2
      );
      if (guardian) remainingDamage = this.drainEnemyShield(guardian, remainingDamage);
    }
    enemy.hp -= remainingDamage;
    if (enemy.hp <= 0) this.removeEnemy(index, true);
  }

  private drainEnemyShield(enemy: Enemy, damage: number): number {
    const result = absorbGuardianShield(enemy.shield, damage);
    enemy.shield = result.remainingShield;
    const ring = enemy.mesh.getObjectByName("guardRing");
    if (ring && enemy.shield <= 0) ring.visible = false;
    return result.remainingDamage;
  }

  private removeSceneObject(root: THREE.Object3D): void {
    this.scene.remove(root);
    const sharedGeometries = new Set<THREE.BufferGeometry>(Object.values(this.shared));
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) ||
          sharedGeometries.has(object.geometry) ||
          disposedGeometries.has(object.geometry)) return;
      disposedGeometries.add(object.geometry);
      object.geometry.dispose();
    });
  }

  private removeEnemy(index: number, defeated: boolean): void {
    const enemy = this.enemies[index];
    if (!enemy) return;
    this.removeSceneObject(enemy.mesh);
    this.enemies.splice(index, 1);
    if (defeated) {
      this.kills += 1;
      this.combo += 1;
      this.comboTimer = 2.2;
      this.score += enemy.score * Math.min(5, 1 + this.combo * 0.08) * this.pilotSkillBonuses.comboMultiplier;
      this.shards += enemy.shards;
      const burstColor = enemy.kind === "guardian" ? 0x79ecff
        : enemy.kind === "elite" ? 0xffa5e9
          : enemy.kind === "heavy" || enemy.kind === "bomber" ? 0xffca82 : 0xff91c9;
      this.spawnBurst(enemy.mesh.position, burstColor, enemy.kind === "elite" ? 15 : 9);
      if (Math.random() < 0.24) this.spawnPickup(enemy.mesh.position);
    }
  }

  private spawnPickup(position: THREE.Vector3): void {
    const roll = Math.random();
    const kind = selectPickupKind(roll);
    const mesh = new THREE.Group();
    const materialByKind: Record<PickupKind, THREE.Material> = {
      shard: this.materials.shard,
      repair: this.materials.repair,
      overdrive: this.materials.overdrive,
      multishot: this.materials.multishot,
      shield: this.materials.shieldPickup,
      speed: this.materials.speedPickup,
      special: this.materials.specialPickup
    };
    const material = materialByKind[kind];
    const gem = new THREE.Mesh(this.shared.shardGeometry, material);
    const ring = new THREE.Mesh(this.shared.ringGeometry, material);
    ring.rotation.x = Math.PI / 2;
    mesh.add(gem, ring);
    mesh.position.copy(position);
    mesh.position.z = 0.6;
    this.scene.add(mesh);
    this.pickups.push({ mesh, kind, velocity: 1.8, age: 0 });
  }

  private updatePickups(dt: number): void {
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      pickup.age += dt;
      pickup.mesh.position.y -= pickup.velocity * dt;
      pickup.mesh.rotation.y += dt * 1.8;
      pickup.mesh.rotation.z += dt;
      if (pickup.mesh.position.distanceTo(this.player.position) < 0.86) {
        switch (pickup.kind) {
          case "shard":
            this.shards += PICKUP_EFFECTS.shardReward;
            this.score += 60;
            break;
          case "repair":
            this.hp = Math.min(this.maxHp, this.hp + 1);
            break;
          case "overdrive":
            this.overdriveTimer = Math.max(this.overdriveTimer, PICKUP_EFFECTS.overdriveSeconds);
            this.special = Math.min(100, this.special + 22);
            break;
          case "multishot":
            this.multishotTimer = Math.max(this.multishotTimer, PICKUP_EFFECTS.multishotSeconds);
            break;
          case "shield":
            this.shield = Math.min(100, this.shield + PICKUP_EFFECTS.shieldRestore);
            break;
          case "speed":
            this.speedBoostTimer = Math.max(this.speedBoostTimer, PICKUP_EFFECTS.speedSeconds);
            break;
          case "special":
            this.special = Math.min(100, this.special + PICKUP_EFFECTS.specialRestore);
            break;
        }
        const pickupColors: Record<PickupKind, number> = {
          shard: 0x71edff,
          repair: 0xff9ec9,
          overdrive: 0xb89aff,
          multishot: 0xffe78b,
          shield: 0x78eaff,
          speed: 0x8dffa9,
          special: 0xffa5eb
        };
        this.spawnBurst(pickup.mesh.position, pickupColors[pickup.kind], 8);
        this.removePickup(index);
      } else if (pickup.mesh.position.y < -WORLD_HEIGHT / 2 - 1 || pickup.age > 12) {
        this.removePickup(index);
      }
    }
  }

  private removePickup(index: number): void {
    const pickup = this.pickups[index];
    if (!pickup) return;
    this.removeSceneObject(pickup.mesh);
    this.pickups.splice(index, 1);
  }

  private spawnBoss(): void {
    const profile = this.mode === "endless"
      ? getEndlessBossProfile(this.bossSequence)
      : this.planetProfile.boss;
    this.bossSequence += 1;
    const mesh = new THREE.Group();
    const hullGeometry = profile.id === "rift-wyrm"
      ? new THREE.TorusKnotGeometry(1.25, 0.38, 72, 8, 2, 3)
      : profile.id === "aegis-colossus"
        ? new THREE.BoxGeometry(3.3, 2.0, 0.95)
        : new THREE.OctahedronGeometry(1.75, 1);
    const hull = new THREE.Mesh(hullGeometry, this.materials.boss);
    hull.scale.set(profile.id === "rift-wyrm" ? 1.2 : 1.45, profile.id === "aegis-colossus" ? 1.05 : 0.72, 0.65);
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.35), this.materials.enemyFast);
    left.position.set(-2.05, -0.12, 0);
    left.rotation.z = -0.2;
    left.name = "boss-port-left";
    const right = left.clone();
    right.position.x = 2.05;
    right.rotation.z = 0.2;
    right.name = "boss-port-right";
    const partHealth = Math.max(18, Math.round(profile.maxHp * 0.11));
    const parts: BossPart[] = [
      { id: "port-left", mesh: left, hp: partHealth, maxHp: partHealth, destroyed: false },
      { id: "port-right", mesh: right, hp: partHealth, maxHp: partHealth, destroyed: false }
    ];
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), this.materials.bossCore);
    core.position.set(0, -0.38, 1);
    core.name = "boss-weakpoint";
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.055, 8, 52), this.materials.glow);
    ring.rotation.x = Math.PI / 2;
    mesh.add(hull, left, right, core, ring);
    if (profile.id === "aegis-colossus") {
      const armor = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.38, 0.5), this.materials.enemyGuardian);
      armor.position.y = -0.95;
      armor.name = "boss-armor-plate";
      mesh.add(armor);
      const armorHealth = Math.max(22, Math.round(profile.maxHp * 0.14));
      parts.push({ id: "armor-plate", mesh: armor, hp: armorHealth, maxHp: armorHealth, destroyed: false });
    }
    mesh.position.set(0, WORLD_HEIGHT / 2 + 3, 0.3);
    this.scene.add(mesh);
    this.boss = {
      mesh, core, profile, parts, phase: 1, hp: profile.maxHp, maxHp: profile.maxHp,
      fireTimer: 2.5, age: 0, entering: true, weakpointOpen: false
    };
    this.spawnBurst(mesh.position, 0xff92de, 34);
    this.callbacks.onMissionEvent(profile.name + " 接近！ コア開放の瞬間を狙って！");
  }

  private updateBoss(dt: number): void {
    if (!this.boss) return;
    const boss = this.boss;
    boss.age += dt;
    boss.mesh.position.x = Math.sin(boss.age * (boss.profile.id === "rift-wyrm" ? 0.72 : 0.48)) * Math.min(4.2, this.world.width * 0.22);
    if (boss.entering) {
      boss.mesh.position.y = Math.max(5.0, boss.mesh.position.y - dt * 2.6);
      if (boss.mesh.position.y <= 5.01) boss.entering = false;
    } else {
      boss.mesh.position.y = 5 + Math.sin(boss.age * 0.8) * 0.22;
    }
    boss.mesh.rotation.z = Math.sin(boss.age * 0.65) * 0.08;
    const phase = getBossPhase(boss.hp, boss.maxHp);
    if (phase > boss.phase) {
      boss.phase = phase;
      this.callbacks.onMissionEvent(`ボス第${phase}形態！ 攻撃パターンが複合化した！`);
    }
    const weakpointOpen = isBossWeakpointOpen(boss.age, phase, boss.entering);
    if (weakpointOpen && !boss.weakpointOpen) this.callbacks.onMissionEvent("弱点コア開放！ 今が攻撃のチャンス！");
    boss.weakpointOpen = weakpointOpen;
    boss.core.scale.setScalar(weakpointOpen ? 1.22 : 0.82);
    (boss.core.material as THREE.MeshStandardMaterial).emissiveIntensity = weakpointOpen ? 1.7 : 0.45;
    boss.fireTimer -= dt;
    const phaseTwo = phase >= 2;
    const phaseThree = phase === 3;
    const leftPortActive = boss.parts.some((part) => part.id === "port-left" && !part.destroyed);
    const rightPortActive = boss.parts.some((part) => part.id === "port-right" && !part.destroyed);
    this.bossTelegraph.visible = !boss.entering && boss.fireTimer < 0.62;
    if (this.bossTelegraph.visible) {
      this.bossTelegraph.position.set(boss.mesh.position.x, boss.mesh.position.y - 4.1, 0.2);
      this.bossTelegraph.rotation.z = Math.atan2(this.player.position.x - boss.mesh.position.x, boss.mesh.position.y - this.player.position.y);
      (this.bossTelegraph.material as THREE.MeshBasicMaterial).color.setHex(
        boss.profile.attackPattern === "seeker" ? 0xffa15e : boss.profile.attackPattern === "cross" ? 0x9b9dff : 0xff528b
      );
    }
    if (boss.fireTimer <= 0 && !boss.entering) {
      if (boss.profile.attackPattern === "seeker") {
        const missileCount = phaseThree ? 3 : phaseTwo ? 2 : 1;
        for (let index = 0; index < missileCount; index += 1) {
          const useLeftPort = index % 2 === 0;
          if ((useLeftPort && !leftPortActive) || (!useLeftPort && !rightPortActive)) continue;
          this.addProjectile(boss.mesh.position.x + (useLeftPort ? -1.1 : 1.1), boss.mesh.position.y - 1,
            new THREE.Vector2((this.player.position.x - boss.mesh.position.x) * 0.18, -7.2), "enemy", 1, true);
        }
      } else {
        const shots = getBossVolleyCount(phase);
        for (let index = 0; index < shots; index += 1) {
          const useLeftPort = index < Math.ceil(shots / 2);
          if ((useLeftPort && !leftPortActive) || (!useLeftPort && !rightPortActive)) continue;
          const angle = (index - (shots - 1) / 2) * (phaseThree ? 0.16 : phaseTwo ? 0.22 : 0.3);
          const direction = new THREE.Vector2(this.player.position.x - boss.mesh.position.x, this.player.position.y - boss.mesh.position.y)
            .normalize().rotateAround(new THREE.Vector2(), angle);
          this.addProjectile(boss.mesh.position.x, boss.mesh.position.y - 1, direction.multiplyScalar(phaseTwo ? 6.8 : 5.9), "enemy", 1);
          if (boss.profile.attackPattern === "cross" && phaseTwo && index === Math.floor(shots / 2) && leftPortActive && rightPortActive) {
            this.addProjectile(boss.mesh.position.x, boss.mesh.position.y - 1, new THREE.Vector2(6.5, -0.8), "enemy", 1);
            this.addProjectile(boss.mesh.position.x, boss.mesh.position.y - 1, new THREE.Vector2(-6.5, -0.8), "enemy", 1);
          }
        }
      }
      if (phaseThree && boss.profile.attackPattern !== "seeker" && (leftPortActive || rightPortActive)) {
        this.addProjectile(boss.mesh.position.x, boss.mesh.position.y - 1,
          new THREE.Vector2((this.player.position.x - boss.mesh.position.x) * 0.14, -6.6), "enemy", 1, true);
      }
      boss.fireTimer = getBossAttackInterval(phase);
      this.bossTelegraph.visible = false;
    }
  }

  private damageBossPart(part: BossPart, damage: number): void {
    if (part.destroyed || !Number.isFinite(damage) || damage <= 0) return;
    part.hp = Math.max(0, part.hp - damage);
    part.mesh.getWorldPosition(this.bossPartHitPosition);
    this.spawnBurst(this.bossPartHitPosition, part.hp <= 0 ? 0xffd78c : 0x9ceaff, part.hp <= 0 ? 18 : 4);
    if (part.hp <= 0) {
      part.destroyed = true;
      part.mesh.visible = false;
      this.score += 320;
      this.shards += 6;
      this.combo += 1;
      this.comboTimer = 2.2;
      this.callbacks.onMissionEvent(`${part.id === "armor-plate" ? "装甲プレート" : part.id === "port-left" ? "左砲塔" : "右砲塔"}を破壊！ ボスの攻撃能力が低下した！`);
    }
  }

  private damageBoss(damage: number, weakpoint = false): void {
    if (!this.boss) return;
    const boss = this.boss;
    const multiplier = weakpoint && boss.weakpointOpen
      ? boss.profile.weakpointMultiplier * this.pilotSkillBonuses.weakpointMultiplier : 1;
    boss.hp -= Math.max(0, damage) * multiplier;
    this.triggerCameraShake(weakpoint && boss.weakpointOpen ? 0.55 : 0.16, 0.42);
    this.spawnBurst(new THREE.Vector3(boss.mesh.position.x, boss.mesh.position.y - 0.4, 0.9),
      weakpoint && boss.weakpointOpen ? 0xffe58e : 0xff8bd4, weakpoint && boss.weakpointOpen ? 8 : 3);
    if (boss.hp <= 0) {
      const position = boss.mesh.position.clone();
      this.defeatedBosses.push(boss.profile.id);
      this.removeSceneObject(boss.mesh);
      this.boss = null;
      this.bossTelegraph.visible = false;
      this.score += boss.profile.scoreReward;
      this.shards += boss.profile.rewardShards;
      this.kills += 1;
      this.spawnBurst(position, 0xc7a7ff, 72);
      this.callbacks.onMissionEvent(boss.profile.name + " 撃破！ 報酬を獲得！");
      if (this.mode === "endless") {
        this.bossTimer = 32;
      } else {
        this.finishRun("clear");
      }
    }
  }

  private damagePlayer(damage: number): void {
    if (this.invulnerableForTest || this.damageCooldown > 0) return;
    this.damageCooldown = 0.72;
    if (this.shieldTimer > 0) {
      this.spawnBurst(this.player.position, 0x70efff, 10);
      return;
    }
    this.hp = Math.max(0, this.hp - Math.max(1, damage));
    this.spawnBurst(this.player.position, 0xff7da8, 16);
    if (this.hp <= 0) this.finishRun("gameover");
  }

  private spawnBurst(position: THREE.Vector3, color: number, count: number): void {
    if (count >= 20) this.triggerCameraShake(count >= 60 ? 0.42 : 0.16, 0.38);
    const material = new THREE.MeshBasicMaterial({ color });
    const actualCount = Math.min(count, MAX_PARTICLES - this.particles.length);
    if (actualCount <= 0) {
      material.dispose();
      return;
    }
    for (let index = 0; index < actualCount; index += 1) {
      const mesh = new THREE.Mesh(this.shared.particleGeometry, material);
      mesh.position.copy(position);
      mesh.position.z = 0.8 + Math.random() * 0.35;
      const angle = Math.random() * TAU;
      const speed = 1.2 + Math.random() * 4.6;
      const life = 0.35 + Math.random() * 0.5;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * 1.5),
        life,
        maxLife: life
      });
    }
    // Each burst owns one material; remove it after its last particle is gone.
    (material as THREE.MeshBasicMaterial & { burstOwned?: boolean }).burstOwned = true;
  }

  private updateParticles(dt: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.velocity.multiplyScalar(Math.max(0, 1 - dt * 1.8));
      const scale = Math.max(0.02, particle.life / particle.maxLife);
      particle.mesh.scale.setScalar(scale);
      if (particle.life <= 0) {
        const material = particle.mesh.material as THREE.Material & { burstOwned?: boolean };
        this.scene.remove(particle.mesh);
        this.particles.splice(index, 1);
        if (material.burstOwned && !this.particles.some((entry) => entry.mesh.material === material)) material.dispose();
      }
    }
  }

  private removeProjectile(index: number): void {
    const bullet = this.projectiles[index];
    if (!bullet) return;
    this.scene.remove(bullet.mesh);
    this.projectiles.splice(index, 1);
  }

  private triggerCameraShake(strength: number, duration: number): void {
    this.cameraShakeStrength = Math.max(this.cameraShakeStrength, strength);
    this.cameraShakeTime = Math.max(this.cameraShakeTime, duration);
  }

  private getHudState(): HudState {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      shield: this.shield,
      special: this.special,
      score: this.score,
      kills: this.kills,
      shards: this.shards,
      elapsed: this.elapsed,
      bossHp: this.boss?.hp ?? 0,
      bossMaxHp: this.boss?.maxHp ?? 0,
      bossName: this.boss?.profile.name ?? "",
      bossPhase: this.boss ? getBossPhase(this.boss.hp, this.boss.maxHp) : 1,
      bossPartsRemaining: this.boss?.parts.filter((part) => !part.destroyed).length ?? 0,
      bossPartCount: this.boss?.parts.length ?? 0,
      mode: this.mode,
      combo: this.combo,
      planetName: this.planetProfile.name,
      weaponName: getWeaponProfile(this.weaponIds[this.activeWeaponSlot]).shortName,
      weaponSlot: this.activeWeaponSlot,
      bossWeakpointOpen: this.boss?.weakpointOpen ?? false
    };
  }

  private finishRun(status: "clear" | "gameover"): void {
    if (!this.running) return;
    this.running = false;
    this.callbacks.onHudUpdate(this.getHudState());
    this.callbacks.onRunEnd({
      mode: this.mode,
      status,
      score: this.score,
      kills: this.kills,
      shards: this.shards,
      duration: this.elapsed,
      planetId: this.planetProfile.id,
      bossesDefeated: [...this.defeatedBosses]
    });
  }

  private clearRunObjects(): void {
    for (const enemy of this.enemies) this.removeSceneObject(enemy.mesh);
    this.enemies.length = 0;
    for (const projectile of this.projectiles) this.scene.remove(projectile.mesh);
    this.projectiles.length = 0;
    for (const pickup of this.pickups) this.removeSceneObject(pickup.mesh);
    this.pickups.length = 0;
    const particleMaterials = new Set<THREE.Material>();
    for (const particle of this.particles) {
      this.removeSceneObject(particle.mesh);
      const material = particle.mesh.material as THREE.Material & { burstOwned?: boolean };
      if (material.burstOwned) particleMaterials.add(material);
    }
    for (const material of particleMaterials) material.dispose();
    this.particles.length = 0;
    if (this.boss) this.removeSceneObject(this.boss.mesh);
    this.boss = null;
    this.bossTelegraph.visible = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.resize);
    this.canvas.removeEventListener("webglcontextlost", this.handleWebGLContextLost, false);
    this.canvas.removeEventListener("webglcontextrestored", this.handleWebGLContextRestored, false);
    this.input.dispose();
    this.clearRunObjects();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry !== this.shared.bulletGeometry &&
            object.geometry !== this.shared.enemyBulletGeometry &&
            object.geometry !== this.shared.particleGeometry &&
            object.geometry !== this.shared.shardGeometry &&
            object.geometry !== this.shared.ringGeometry &&
            object.geometry !== this.shared.laserGeometry &&
            object.geometry !== this.shared.homingGeometry &&
            object.geometry !== this.shared.pierceGeometry) object.geometry.dispose();
      }
    });
    for (const layer of this.stars) {
      layer.geometry.dispose();
      (layer.points.material as THREE.Material).dispose();
    }
    for (const material of Object.values(this.materials)) material.dispose();
    this.pilotCockpitMaterial.dispose();
    for (const geometry of Object.values(this.shared)) geometry.dispose();
    this.renderer.dispose();
  }
}
