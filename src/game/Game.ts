import * as THREE from "three";
import { clamp } from "./core";
import { absorbGuardianShield, ENEMY_PROFILES, getUnlockedEnemyKinds, selectEnemyKind, type EnemyKind } from "./enemies";
import type { CampaignCombatProfile } from "./campaign";
import { TouchInput } from "./input";
import { getPilotGrowthStats, getPilotProfile, type PilotProfile } from "./pilots";
import { PICKUP_EFFECTS, selectPickupKind, type PickupKind } from "./pickups";
import { getShipProfile, type ShipProfile } from "./ships";
import { createWeaponShotSpecs, getWeaponFireInterval, getWeaponProfile, registerProjectileHit, WEAPON_PROFILES, type WeaponProfile, type WeaponShotSpec } from "./weapons";
import { getActiveFrameIntervalMs, summarizeFrameTimes, type GameDiagnosticsSnapshot } from "./diagnostics";
import {
  assessEvasion,
  createAttackForecast,
  forecastHalfAngle,
  forecastPaths,
  type AttackForecast,
  type AttackPattern,
  type EvasionAssessment,
  type ThreatPath
} from "./threatForecast";
import {
  createBodyIntegrity,
  damageBodyPart,
  getBodyIntegrityEffects,
  selectAimPart,
  selectImpactPart,
  type BodyArchetype,
  type BodyIntegrity
} from "./bodyIntegrity";

export type GameMode = "story" | "stage" | "endless";
export type RunResult = {
  mode: GameMode;
  status: "clear" | "gameover";
  score: number;
  kills: number;
  shards: number;
  duration: number;
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
  evasion: EvasionAssessment;
};

type BulletOwner = "player" | "enemy";
type Projectile = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector2;
  owner: BulletOwner;
  damage: number;
  radius: number;
  homing?: boolean;
  pierceRemaining: number;
  hitTargets?: Set<object>;
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
  integrity: BodyIntegrity;
  attackForecast: AttackForecast | null;
  warning: THREE.Mesh;
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
type Boss = {
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  fireTimer: number;
  age: number;
  entering: boolean;
  integrity: BodyIntegrity;
  attackForecast: AttackForecast | null;
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
    lanceGeometry: new THREE.CylinderGeometry(0.075, 0.12, 0.72, 6),
    warningGeometry: new THREE.BoxGeometry(0.11, 7.5, 0.035),
    warningFanGeometry: (() => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(-1, 7.5);
      shape.lineTo(1, 7.5);
      shape.closePath();
      return new THREE.ShapeGeometry(shape);
    })()
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
    playerBullet: new THREE.MeshBasicMaterial({ color: WEAPON_PROFILES["star-pulse"].tint }),
    playerBulletFan: new THREE.MeshBasicMaterial({ color: WEAPON_PROFILES["prism-fan"].tint }),
    playerBulletLance: new THREE.MeshBasicMaterial({ color: WEAPON_PROFILES["nova-lance"].tint }),
    enemyBullet: new THREE.MeshBasicMaterial({ color: 0xff72a9 }),
    warning: new THREE.MeshBasicMaterial({ color: 0xffc16e, transparent: true, opacity: 0.5, depthWrite: false }),
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
  private playerMotionVelocity = new THREE.Vector2();
  private running = false;
  private disposed = false;
  private animationFrame = 0;
  private lastFrame: number | null = null;
  private readonly frameTimeSamples: number[] = [];
  private lastRenderMetrics = { renderCalls: 0, triangles: 0, geometries: 0, textures: 0 };
  private elapsed = 0;
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
  private readonly campaignProfile: CampaignCombatProfile | null;
  private campaignEventTriggered = false;
  private campaignPhaseEventTriggered = false;
  private pendingBossExposure = false;
  private bossExposureTimer = 0;
  private readonly pilotUpgrades: { attack: number; hull: number };
  private readonly shipProfile: ShipProfile;
  private readonly pilotProfile: PilotProfile;
  private readonly weaponProfile: WeaponProfile;
  private readonly pilotGrowth: ReturnType<typeof getPilotGrowthStats>;
  private readonly pilotCockpitMaterial: THREE.MeshStandardMaterial;
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
    onCampaignMessage?: (message: string) => void;
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
    weaponId?: string;
    campaignProfile?: CampaignCombatProfile;
    onCampaignMessage?: (message: string) => void;
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
      onCampaignMessage: options.onCampaignMessage
    };
    this.campaignProfile = options.campaignProfile ?? null;
    this.sensitivityValue = options.sensitivity ?? 1;
    this.shipProfile = getShipProfile(options.shipId ?? "Lumen-01");
    this.pilotProfile = getPilotProfile(options.pilotId ?? "lumi-asteria");
    this.weaponProfile = getWeaponProfile(options.weaponId ?? "star-pulse");
    this.pilotGrowth = getPilotGrowthStats(options.pilotLevel ?? 1);
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
    this.renderer.setClearColor(this.campaignProfile?.palette.background ?? 0x05091f, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(this.campaignProfile?.palette.background ?? 0x05091f);
    this.scene.fog = new THREE.FogExp2(this.campaignProfile?.palette.fog ?? 0x10133f, this.campaignProfile?.palette.fogDensity ?? 0.008);
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

  getDiagnosticsSnapshot(): GameDiagnosticsSnapshot {
    const summary = summarizeFrameTimes(this.frameTimeSamples);
    const drawingBuffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    let webgl: GameDiagnosticsSnapshot["webgl"] = null;

    try {
      const context = this.renderer.getContext() as WebGL2RenderingContext;
      const viewport = context.getParameter(context.MAX_VIEWPORT_DIMS) as ArrayLike<number>;
      const attributes = this.renderer.getContextAttributes();
      webgl = {
        version: "WebGL 2",
        maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: context.getParameter(context.MAX_RENDERBUFFER_SIZE),
        maxViewportWidth: Number(viewport[0]),
        maxViewportHeight: Number(viewport[1]),
        contextAttributes: attributes ? {
          alpha: attributes.alpha ?? false,
          antialias: attributes.antialias ?? false,
          depth: attributes.depth ?? false,
          stencil: attributes.stencil ?? false,
          preserveDrawingBuffer: attributes.preserveDrawingBuffer ?? false
        } : null
      };
    } catch {
      // A lost WebGL context is reported as unavailable; diagnostics must never break the game.
    }

    return {
      ...summary,
      ...this.lastRenderMetrics,
      pixelRatio: this.renderer.getPixelRatio(),
      drawingBuffer: {
        width: Math.round(drawingBuffer.x),
        height: Math.round(drawingBuffer.y)
      },
      webgl
    };
  }

  start(mode: GameMode): void {
    this.clearRunObjects();
    this.mode = mode;
    this.elapsed = 0;
    this.hp = 3 + this.pilotUpgrades.hull + this.shipProfile.hullBonus +
      this.pilotProfile.hullBonus + this.pilotGrowth.hullBonus;
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
    this.campaignEventTriggered = false;
    this.campaignPhaseEventTriggered = false;
    this.pendingBossExposure = false;
    this.bossExposureTimer = 0;
    this.player.position.set(0, -5.8, 0.6);
    this.playerTarget.set(0, -5.8);
    this.playerVelocity.set(0, 0);
    this.playerMotionVelocity.set(0, 0);
    this.running = true;
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
      this.pilotGrowth.attackMultiplier;
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      this.damageEnemy(index, (5 + this.pilotUpgrades.attack) * shipDamage);
    }
    if (this.boss) this.damageBoss((10 + this.pilotUpgrades.attack * 2) * shipDamage);
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
    const rightWing = new THREE.Mesh(wingGeometry, this.materials.wing);
    rightWing.position.set(wingOffset, -0.28, 0.02);
    rightWing.rotation.z = visual === "speed" ? 0.36 : 0.24;
    const engineGeometry = new THREE.CylinderGeometry(visual === "heavy" ? 0.16 : 0.12, 0.2, visual === "speed" ? 0.66 : 0.5, 8);
    const engineOffset = visual === "heavy" ? 0.38 : 0.27;
    const engineLeft = new THREE.Mesh(engineGeometry, this.materials.glow);
    engineLeft.position.set(-engineOffset, -0.8, 0.04);
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
    const starTint = this.campaignProfile?.palette.star;
    const layers = [
      { count: 170, speed: 0.7, size: 0.07, color: starTint ?? 0x94a9ff, depth: -8 },
      { count: 95, speed: 1.8, size: 0.12, color: starTint ?? 0x84eaff, depth: -5 },
      { count: 38, speed: 3.1, size: 0.18, color: starTint ?? 0xffb9ec, depth: -2 }
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
    const wasRunning = this.running;
    const frameIntervalMs = getActiveFrameIntervalMs(this.lastFrame, now, wasRunning);
    const dt = Math.min(0.04, (frameIntervalMs ?? 0) / 1000);
    this.lastFrame = now;
    if (wasRunning) this.update(dt);
    this.renderer.render(this.scene, this.camera);

    const render = this.renderer.info.render;
    const memory = this.renderer.info.memory;
    this.lastRenderMetrics = {
      renderCalls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures
    };
    if (frameIntervalMs !== null) {
      this.frameTimeSamples.push(frameIntervalMs);
      if (this.frameTimeSamples.length > 600) this.frameTimeSamples.shift();
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private update(dt: number): void {
    this.elapsed += dt;
    this.damageCooldown = Math.max(0, this.damageCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.bossExposureTimer = Math.max(0, this.bossExposureTimer - dt);
    this.updateCampaignBattleEvent();
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    this.multishotTimer = Math.max(0, this.multishotTimer - dt);
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    this.shield = Math.min(100, this.shield + dt * 2.5 *
      this.shipProfile.shieldRechargeMultiplier * this.pilotProfile.shieldRechargeMultiplier);
    this.special = Math.min(100, this.special + dt * 1.1);

    const dx = this.playerTarget.x - this.player.position.x;
    const dy = this.playerTarget.y - this.player.position.y;
    const speedBoost = this.speedBoostTimer > 0 ? 1.32 : 1;
    const smoothing = 1 - Math.exp(-13 * this.shipProfile.movementMultiplier *
      this.pilotProfile.movementMultiplier * speedBoost * dt);
    this.playerVelocity.set(dx * smoothing, dy * smoothing);
    if (dt > 1e-5) this.playerMotionVelocity.copy(this.playerVelocity).multiplyScalar(1 / dt);
    else this.playerMotionVelocity.set(0, 0);
    this.player.position.x += this.playerVelocity.x;
    this.player.position.y += this.playerVelocity.y;
    this.player.rotation.z = clamp(-this.playerVelocity.x * 0.12, -0.32, 0.32);
    const aura = this.player.getObjectByName("shieldAura");
    if (aura) aura.visible = this.shieldTimer > 0;
    if (aura) aura.rotation.z += dt * 0.9;

    this.updateStars(dt);
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.firePlayerShots();
      const baseFireInterval = Math.max(0.12, 0.23 - this.pilotUpgrades.attack * 0.004);
      this.fireTimer = getWeaponFireInterval(this.weaponProfile.id, baseFireInterval, this.overdriveTimer > 0) *
        this.shipProfile.fireIntervalMultiplier * this.pilotProfile.fireIntervalMultiplier;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < MAX_ENEMIES && !this.boss) {
      this.spawnEnemy();
      const difficulty = 1 + this.elapsed / 145;
      this.spawnTimer = Math.max(0.42, (this.mode === "endless" ? 1.05 : 1.35) / difficulty) *
        (this.campaignProfile?.spawnIntervalMultiplier ?? 1);
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
    const available = getUnlockedEnemyKinds(this.elapsed);
    const priority = this.campaignProfile?.enemyPriority.filter((kind) => available.includes(kind)) ?? [];
    const kind = priority.length > 0 && Math.random() < 0.72
      ? priority[Math.floor(Math.random() * priority.length)]
      : selectEnemyKind(this.elapsed, Math.random());
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
    body.name = "hull";
    group.add(body);

    const wingGeometry = new THREE.BoxGeometry(0.54, 0.19, 0.14);
    const leftWing = new THREE.Mesh(wingGeometry, material);
    leftWing.position.set(-0.48, 0.2, 0.08);
    leftWing.rotation.z = -0.18;
    leftWing.name = "leftWing";
    const rightWing = leftWing.clone();
    rightWing.position.x = 0.48;
    rightWing.rotation.z = 0.18;
    rightWing.name = "rightWing";
    const weaponModule = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.48, 0.16),
      this.materials.enemySniper
    );
    weaponModule.position.set(0, -0.52, 0.18);
    weaponModule.name = "weapon";
    const coreModule = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      this.materials.bossCore
    );
    coreModule.position.set(0, 0.12, 0.31);
    coreModule.name = "core";
    group.add(leftWing, rightWing, weaponModule, coreModule);

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
    const bodyArchetype: BodyArchetype = kind === "guardian"
      ? "guardian"
      : kind === "heavy" || kind === "bomber" || kind === "elite"
        ? "armored"
        : "fighter";
    if (bodyArchetype === "guardian" || bodyArchetype === "armored") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.05, 6, 20), this.materials.guardianShield);
      ring.rotation.x = Math.PI / 2;
      ring.position.z = 0.3;
      ring.name = "shieldEmitter";
      group.add(ring);
    }

    group.position.set(x, y, 0.25);
    this.scene.add(group);
    const warning = new THREE.Mesh(this.shared.warningGeometry, this.materials.warning);
    warning.visible = false;
    this.scene.add(warning);
    this.enemies.push({
      mesh: group,
      kind,
      hp: Math.max(1, Math.ceil(profile.health * (this.campaignProfile?.enemyHealthMultiplier ?? 1))),
      maxHp: Math.max(1, Math.ceil(profile.health * (this.campaignProfile?.enemyHealthMultiplier ?? 1))),
      speed: profile.speed * (this.campaignProfile?.enemySpeedMultiplier ?? 1),
      fireTimer: (0.65 + Math.random() * profile.fireInterval * 0.45) * (this.campaignProfile?.enemyFireIntervalMultiplier ?? 1),
      age: 0,
      radius: profile.radius,
      shield: profile.shield,
      score: profile.score,
      shards: profile.shards,
      integrity: createBodyIntegrity(bodyArchetype),
      attackForecast: null,
      warning
    });
  }

  private updateEnemies(dt: number): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const profile = ENEMY_PROFILES[enemy.kind];
      const effects = getBodyIntegrityEffects(enemy.integrity);
      enemy.age += dt;
      if (!enemy.attackForecast) {
        const sway = (profile.movement === "zigzag" ? 1.1
          : profile.movement === "strafe" ? 0.9
            : profile.movement === "steady" ? 0.2 : 0.42) * effects.lateralMovementMultiplier;
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
      }

      const emitter = enemy.mesh.getObjectByName("shieldEmitter");
      if (emitter) {
        emitter.rotation.z += dt * 1.5;
        emitter.scale.setScalar(0.95 + Math.sin(enemy.age * 3.5) * 0.06);
        emitter.visible = enemy.shield > 0 && effects.shieldActive;
      }
      if (profile.movement === "sniper" && enemy.fireTimer < 0.45) {
        enemy.mesh.scale.setScalar(1.04 + Math.sin(enemy.age * 18) * 0.035);
      } else {
        enemy.mesh.scale.setScalar(1);
      }

      enemy.fireTimer -= dt;
      if (effects.canAttack && profile.attack !== "none" &&
          enemy.fireTimer <= 0.55 && !enemy.attackForecast) {
        enemy.attackForecast = this.createEnemyForecast(enemy);
      }

      if (!effects.canAttack && enemy.attackForecast) enemy.attackForecast = null;
      if (enemy.attackForecast) {
        const forecast = enemy.attackForecast;
        const direction = forecast.direction;
        enemy.warning.visible = true;
        enemy.warning.rotation.z = -Math.atan2(direction.x, direction.y);
        if (forecast.pattern === "spread") {
          enemy.warning.geometry = this.shared.warningFanGeometry;
          enemy.warning.position.set(forecast.origin.x, forecast.origin.y, 0.18);
          enemy.warning.scale.set(Math.tan(forecastHalfAngle(forecast)), 1, 1);
        } else {
          enemy.warning.geometry = this.shared.warningGeometry;
          enemy.warning.position.set(
            forecast.origin.x + direction.x * 3.75,
            forecast.origin.y + direction.y * 3.75,
            0.18
          );
          enemy.warning.scale.set(1, 1, 1);
        }
      } else {
        enemy.warning.visible = false;
      }

      if (enemy.fireTimer <= 0) {
        if (effects.canAttack && profile.attack !== "none") {
          const forecast = enemy.attackForecast ?? this.createEnemyForecast(enemy);
          const tracking = forecast.pattern === "homing";
          for (const path of forecastPaths(forecast)) {
            this.addProjectile(
              path.position.x,
              path.position.y,
              new THREE.Vector2(path.velocity.x, path.velocity.y),
              "enemy",
              1,
              tracking
            );
          }
        }
        enemy.attackForecast = null;
        enemy.warning.visible = false;
        enemy.fireTimer = profile.fireInterval * (this.campaignProfile?.enemyFireIntervalMultiplier ?? 1);
      }

      if (enemy.mesh.position.distanceTo(this.player.position) < enemy.radius + 0.4) {
        this.damagePlayer(1);
        this.removeEnemy(index, false);
      } else if (enemy.mesh.position.y < -WORLD_HEIGHT / 2 - 1) {
        this.removeEnemy(index, false);
      }
    }
  }

  private createEnemyForecast(enemy: Enemy): AttackForecast {
    const profile = ENEMY_PROFILES[enemy.kind];
    const pattern: AttackPattern = profile.attack === "spread" || profile.attack === "triple"
      ? "spread"
      : profile.attack === "homing"
        ? "homing"
        : "aimed";
    const projectileSpeed = profile.attack === "homing"
      ? 4.4
      : profile.movement === "sniper"
        ? 8
        : profile.attack === "triple"
          ? 6.2
          : profile.attack === "spread"
            ? 5.1
            : 5.4;
    return createAttackForecast({
      origin: { x: enemy.mesh.position.x, y: enemy.mesh.position.y },
      target: { x: this.player.position.x, y: this.player.position.y },
      pattern,
      projectileSpeed,
      projectileCount: profile.attack === "triple" ? 3 : profile.attack === "spread" ? 5 : 1,
      spreadRadians: profile.attack === "triple" ? 0.18 : 0.28,
      projectileRadius: 0.19
    });
  }

  private firePlayerShots(): void {
    const target = this.findTarget();
    const origin = new THREE.Vector2(this.player.position.x, this.player.position.y + 0.75);
    const direction = target
      ? new THREE.Vector2(target.x - origin.x, target.y - origin.y).normalize()
      : new THREE.Vector2(0, 1);
    const bonusProjectiles = Math.floor(this.pilotUpgrades.attack / 4) + (this.multishotTimer > 0 ? 2 : 0);
    const baseDamage = Math.max(0.1,
      ((this.overdriveTimer > 0 ? 2 : 1) + Math.floor(this.pilotUpgrades.attack / 3)) *
      this.shipProfile.attackMultiplier * this.pilotProfile.attackMultiplier *
      this.pilotGrowth.attackMultiplier
    );
    const originVector = new THREE.Vector2();
    for (const shot of createWeaponShotSpecs(this.weaponProfile.id, bonusProjectiles)) {
      const velocity = direction.clone()
        .rotateAround(originVector, shot.spreadRadians)
        .multiplyScalar(shot.projectileSpeed);
      this.addProjectile(origin.x, origin.y, velocity, "player", baseDamage * shot.damageMultiplier, false, shot);
    }
  }

  private getModuleAimPoint(
    mesh: THREE.Group,
    integrity: BodyIntegrity,
    bodyRadius: number,
    shieldActive: boolean,
    isBoss = false
  ): THREE.Vector2 {
    const part = selectAimPart(integrity, shieldActive);
    let localX = 0;
    let localY = 0;
    switch (part) {
      case "weapon":
        localY = isBoss ? -1.1 : -Math.max(0.32, Math.min(0.58, bodyRadius * 0.75));
        break;
      case "shieldEmitter":
        localY = isBoss ? 1.55 : Math.max(0.5, bodyRadius * 0.78);
        break;
      case "leftWing":
        localX = -bodyRadius * 0.58;
        localY = bodyRadius * 0.2;
        break;
      case "rightWing":
        localX = bodyRadius * 0.58;
        localY = bodyRadius * 0.2;
        break;
      case "core":
        localY = bodyRadius * 0.1;
        break;
    }

    const scale = Math.max(0.05, Math.abs(mesh.scale.x));
    const x = localX * scale;
    const y = localY * scale;
    const cosine = Math.cos(mesh.rotation.z);
    const sine = Math.sin(mesh.rotation.z);
    return new THREE.Vector2(
      mesh.position.x + x * cosine - y * sine,
      mesh.position.y + x * sine + y * cosine
    );
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
        selected = this.getModuleAimPoint(
          enemy.mesh,
          enemy.integrity,
          enemy.radius,
          enemy.shield > 0 && getBodyIntegrityEffects(enemy.integrity).shieldActive
        );
      }
    }
    if (this.boss) {
      selected = this.getModuleAimPoint(
        this.boss.mesh,
        this.boss.integrity,
        2.2,
        getBodyIntegrityEffects(this.boss.integrity).shieldActive,
        true
      );
    }
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

  private addProjectile(
    x: number,
    y: number,
    velocity: THREE.Vector2,
    owner: BulletOwner,
    damage: number,
    homing = false,
    weaponShot?: WeaponShotSpec
  ): void {
    const geometry = owner === "player" && weaponShot?.visual === "lance"
      ? this.shared.lanceGeometry
      : owner === "player"
        ? this.shared.bulletGeometry
        : this.shared.enemyBulletGeometry;
    const material = owner !== "player"
      ? this.materials.enemyBullet
      : weaponShot?.visual === "fan"
        ? this.materials.playerBulletFan
        : weaponShot?.visual === "lance"
          ? this.materials.playerBulletLance
          : this.materials.playerBullet;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, owner === "player" ? 0.55 : 0.4);
    if (weaponShot?.visual === "lance") mesh.rotation.z = -Math.atan2(velocity.x, velocity.y);
    this.scene.add(mesh);
    const projectile: Projectile = {
      mesh, velocity, owner, damage,
      radius: weaponShot?.projectileRadius ?? (owner === "player" ? 0.14 : 0.19),
      homing,
      pierceRemaining: weaponShot?.pierceTargets ?? 0
    };
    if (projectile.pierceRemaining > 0) projectile.hitTargets = new Set<object>();
    this.projectiles.push(projectile);
    if (this.projectiles.length > MAX_PROJECTILES) this.removeProjectile(0);
  }

  private worldImpactToLocal(target: THREE.Object3D, worldX: number, worldY: number): THREE.Vector2 {
    const local = new THREE.Vector2(
      worldX - target.position.x,
      worldY - target.position.y
    ).rotateAround(new THREE.Vector2(), -target.rotation.z);
    const scale = Math.max(0.05, Math.abs(target.scale.x));
    return local.multiplyScalar(1 / scale);
  }

  private updateProjectiles(dt: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const bullet = this.projectiles[index];
      if (bullet.homing && bullet.owner === "enemy") {
        const speed = bullet.velocity.length();
        const desired = new THREE.Vector2(
          this.player.position.x - bullet.mesh.position.x,
          this.player.position.y - bullet.mesh.position.y
        ).normalize().multiplyScalar(speed);
        bullet.velocity.lerp(desired, Math.min(1, dt * 1.4));
        if (bullet.velocity.lengthSq() > 0) bullet.velocity.setLength(speed);
      }
      bullet.mesh.position.x += bullet.velocity.x * dt;
      bullet.mesh.position.y += bullet.velocity.y * dt;
      if (bullet.mesh.position.y > WORLD_HEIGHT / 2 + 2 || bullet.mesh.position.y < -WORLD_HEIGHT / 2 - 2 ||
          Math.abs(bullet.mesh.position.x) > this.world.width / 2 + 2) {
        this.removeProjectile(index);
        continue;
      }
      if (bullet.owner === "player") {
        let removeAfterHit = false;
        for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = this.enemies[enemyIndex];
          if (bullet.mesh.position.distanceTo(enemy.mesh.position) >= enemy.radius + bullet.radius) continue;
          const decision = bullet.hitTargets
            ? registerProjectileHit(bullet as Projectile & { hitTargets: Set<object> }, enemy)
            : "remove";
          if (decision === "duplicate") continue;
          const localHit = this.worldImpactToLocal(
            enemy.mesh,
            bullet.mesh.position.x,
            bullet.mesh.position.y
          );
          this.damageEnemy(enemyIndex, bullet.damage, localHit.x, localHit.y);
          if (decision === "remove") removeAfterHit = true;
          break;
        }
        if (!removeAfterHit && this.boss &&
            bullet.mesh.position.distanceTo(this.boss.mesh.position) < 2.15) {
          const decision = bullet.hitTargets
            ? registerProjectileHit(bullet as Projectile & { hitTargets: Set<object> }, this.boss)
            : "remove";
          if (decision !== "duplicate") {
            const localHit = this.worldImpactToLocal(
              this.boss.mesh,
              bullet.mesh.position.x,
              bullet.mesh.position.y
            );
            this.damageBoss(bullet.damage, localHit.x, localHit.y);
            if (decision === "remove") removeAfterHit = true;
          }
        }
        if (removeAfterHit) this.removeProjectile(index);
      } else if (bullet.mesh.position.distanceTo(this.player.position) < 0.54 + bullet.radius) {
        this.damagePlayer(bullet.damage);
        this.removeProjectile(index);
      }
    }
  }

  private damageEnemy(index: number, damage: number, hitX = 0, hitY = 0): void {
    const enemy = this.enemies[index];
    if (!enemy) return;

    const partId = selectImpactPart(enemy.integrity, hitX, hitY, enemy.radius);
    const partDamage = damageBodyPart(enemy.integrity, partId, Math.max(0.25, damage * 0.75));
    enemy.integrity = partDamage.integrity;
    if (partDamage.newlyDestroyed) {
      const visual = enemy.mesh.getObjectByName(partId);
      if (visual) visual.visible = false;
      if (partId === "shieldEmitter") enemy.shield = 0;
      this.spawnBurst(enemy.mesh.position, partId === "core" ? 0xffe89a : 0x8cefff, 7);
    }

    const effects = getBodyIntegrityEffects(enemy.integrity);
    let remainingDamage = Math.max(0, damage);
    if (enemy.shield > 0 && effects.shieldActive) {
      remainingDamage = this.drainEnemyShield(enemy, remainingDamage);
    } else if (enemy.kind !== "guardian") {
      const guardian = this.enemies.find((candidate) =>
        candidate !== enemy &&
        candidate.kind === "guardian" &&
        candidate.shield > 0 &&
        getBodyIntegrityEffects(candidate.integrity).shieldActive &&
        candidate.mesh.position.distanceTo(enemy.mesh.position) < 3.2
      );
      if (guardian) remainingDamage = this.drainEnemyShield(guardian, remainingDamage);
    }
    enemy.hp -= remainingDamage * effects.coreDamageMultiplier;
    if (enemy.hp <= 0) this.removeEnemy(index, true);
  }

  private drainEnemyShield(enemy: Enemy, damage: number): number {
    const result = absorbGuardianShield(enemy.shield, damage);
    enemy.shield = result.remainingShield;
    const ring = enemy.mesh.getObjectByName("shieldEmitter");
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
    this.scene.remove(enemy.warning);
    enemy.warning.visible = false;
    this.enemies.splice(index, 1);
    if (defeated) {
      this.kills += 1;
      this.combo += 1;
      this.comboTimer = 2.2;
      this.score += enemy.score * Math.min(5, 1 + this.combo * 0.08);
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
    const mesh = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.OctahedronGeometry(1.75, 1), this.materials.boss);
    hull.scale.set(1.45, 0.72, 0.65);
    hull.name = "hull";
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.35), this.materials.enemyFast);
    left.position.set(-2.05, -0.12, 0);
    left.rotation.z = -0.2;
    left.name = "leftWing";
    const right = left.clone();
    right.position.x = 2.05;
    right.rotation.z = 0.2;
    right.name = "rightWing";
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), this.materials.bossCore);
    core.position.z = 1;
    core.name = "core";
    const weapon = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.72, 8), this.materials.enemySniper);
    weapon.position.set(0, -1.1, 0.3);
    weapon.name = "weapon";
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.055, 8, 52), this.materials.glow);
    ring.rotation.x = Math.PI / 2;
    ring.name = "shieldEmitter";
    mesh.add(hull, left, right, core, weapon, ring);
    mesh.position.set(0, WORLD_HEIGHT / 2 + 3, 0.3);
    this.scene.add(mesh);
    this.boss = {
      mesh,
      hp: (180 + this.elapsed * 0.35) * (this.campaignProfile?.bossHealthMultiplier ?? 1),
      maxHp: (180 + this.elapsed * 0.35) * (this.campaignProfile?.bossHealthMultiplier ?? 1),
      fireTimer: 2.5,
      age: 0,
      entering: true,
      integrity: createBodyIntegrity("boss"),
      attackForecast: null
    };
    this.spawnBurst(mesh.position, this.campaignProfile?.palette.star ?? 0xff92de, 34);
    if (this.pendingBossExposure) {
      this.pendingBossExposure = false;
      this.bossExposureTimer = 8;
      this.callbacks.onCampaignMessage?.("敵の中継器を解析！ボスの防壁が8秒間弱体化します。");
    }
  }

  private updateBoss(dt: number): void {
    if (!this.boss) return;
    const boss = this.boss;
    boss.age += dt;
    if (!boss.attackForecast) {
      boss.mesh.position.x = Math.sin(boss.age * 0.48) * Math.min(4.2, this.world.width * 0.22);
      if (boss.entering) {
        boss.mesh.position.y = Math.max(5.0, boss.mesh.position.y - dt * 2.6);
        if (boss.mesh.position.y <= 5.01) boss.entering = false;
      } else {
        boss.mesh.position.y = 5 + Math.sin(boss.age * 0.8) * 0.22;
      }
      boss.mesh.rotation.z = Math.sin(boss.age * 0.65) * 0.08;
    }
    boss.fireTimer -= dt;

    const phaseTwo = boss.hp <= boss.maxHp * 0.5;
    if (phaseTwo && !this.campaignPhaseEventTriggered && this.campaignProfile &&
        (this.campaignProfile.battleEvent === "memory-reversal" || this.campaignProfile.battleEvent === "stasis-lock")) {
      this.campaignPhaseEventTriggered = true;
      this.clearEnemyProjectiles();
      boss.attackForecast = null;
      this.bossExposureTimer = this.campaignProfile.battleEvent === "memory-reversal" ? 7 : 4;
      boss.fireTimer += this.campaignProfile.battleEvent === "memory-reversal" ? 0.9 : 1.8;
      this.callbacks.onCampaignMessage?.(this.campaignProfile.battleEvent === "memory-reversal"
        ? "記憶反転！過去の自分がボスの防壁を7秒間崩します。"
        : "星環封印が作動！敵の弾幕を停止し、攻撃間隔を延長しました。");
    }
    const effects = getBodyIntegrityEffects(boss.integrity);
    if (!effects.canAttack && boss.attackForecast) boss.attackForecast = null;
    if (!boss.entering && effects.canAttack && boss.fireTimer <= 0.55 && !boss.attackForecast) {
      boss.attackForecast = createAttackForecast({
        origin: { x: boss.mesh.position.x, y: boss.mesh.position.y - 1 },
        target: { x: this.player.position.x, y: this.player.position.y },
        pattern: this.campaignProfile?.bossPattern ?? "spread",
        projectileSpeed: (phaseTwo ? 6.8 : 5.9) * (this.campaignProfile?.bossProjectileSpeedMultiplier ?? 1),
        projectileCount: Math.max(1, Math.min(9, (phaseTwo ? 7 : 3) + (this.campaignProfile?.bossProjectileCountBonus ?? 0))),
        spreadRadians: (phaseTwo ? 0.22 : 0.3) * (this.campaignProfile?.bossSpreadMultiplier ?? 1),
        projectileRadius: 0.19
      });
    }

    this.bossTelegraph.visible = !boss.entering && Boolean(boss.attackForecast);
    if (boss.attackForecast) {
      const forecast = boss.attackForecast;
      const direction = forecast.direction;
      this.bossTelegraph.rotation.z = -Math.atan2(direction.x, direction.y);
      if (forecast.pattern === "spread") {
        this.bossTelegraph.geometry = this.shared.warningFanGeometry;
        this.bossTelegraph.position.set(forecast.origin.x, forecast.origin.y, 0.2);
        this.bossTelegraph.scale.set(Math.tan(forecastHalfAngle(forecast)), 1, 1);
      } else {
        this.bossTelegraph.geometry = this.shared.warningGeometry;
        this.bossTelegraph.position.set(
          forecast.origin.x + direction.x * 3.8,
          forecast.origin.y + direction.y * 3.8,
          0.2
        );
        this.bossTelegraph.scale.set(1, 1, 1);
      }
    }

    if (boss.fireTimer <= 0 && !boss.entering) {
      if (effects.canAttack) {
        const forecast = boss.attackForecast ?? createAttackForecast({
          origin: { x: boss.mesh.position.x, y: boss.mesh.position.y - 1 },
          target: { x: this.player.position.x, y: this.player.position.y },
          pattern: this.campaignProfile?.bossPattern ?? "spread",
          projectileSpeed: (phaseTwo ? 6.8 : 5.9) * (this.campaignProfile?.bossProjectileSpeedMultiplier ?? 1),
          projectileCount: Math.max(1, Math.min(9, (phaseTwo ? 7 : 3) + (this.campaignProfile?.bossProjectileCountBonus ?? 0))),
          spreadRadians: (phaseTwo ? 0.22 : 0.3) * (this.campaignProfile?.bossSpreadMultiplier ?? 1),
          projectileRadius: 0.19
        });
        const releaseY = boss.mesh.position.y - 1;
        for (const path of this.getBossForecastPaths(forecast)) {
          this.addProjectile(
            path.position.x,
            path.position.y,
            new THREE.Vector2(path.velocity.x, path.velocity.y),
            "enemy",
            1
          );
        }
      }
      boss.fireTimer = (phaseTwo ? 0.95 : 1.5) * (this.campaignProfile?.bossFireIntervalMultiplier ?? 1);
      boss.attackForecast = null;
      this.bossTelegraph.visible = false;
    }
  }

  private damageBoss(damage: number, hitX = 0, hitY = 0): void {
    if (!this.boss) return;
    const boss = this.boss;
    const partId = selectImpactPart(boss.integrity, hitX, hitY, 2.2);
    const partDamage = damageBodyPart(boss.integrity, partId, Math.max(0.25, damage * 0.75));
    boss.integrity = partDamage.integrity;
    if (partDamage.newlyDestroyed) {
      const visual = boss.mesh.getObjectByName(partId);
      if (visual) visual.visible = false;
      this.spawnBurst(boss.mesh.position, partId === "core" ? 0xffe89a : 0x8cefff, 14);
    }

    const effects = getBodyIntegrityEffects(boss.integrity);
    const shieldDamageMultiplier = effects.shieldActive && this.bossExposureTimer <= 0
      ? (this.campaignProfile?.bossShieldDamageMultiplier ?? 0.65) : 1;
    boss.hp -= Math.max(0, damage) * shieldDamageMultiplier * effects.coreDamageMultiplier;
    this.spawnBurst(new THREE.Vector3(boss.mesh.position.x, boss.mesh.position.y - 0.4, 0.9), 0xff8bd4, 3);
    if (boss.hp <= 0) {
      const position = boss.mesh.position.clone();
      this.removeSceneObject(boss.mesh);
      this.boss = null;
      this.bossTelegraph.visible = false;
      this.score += 2500;
      this.shards += 30;
      this.kills += 1;
      this.spawnBurst(position, 0xc7a7ff, 72);
      if (this.mode === "endless") {
        this.bossTimer = 32;
      } else {
        this.finishRun("clear");
      }
    }
  }

    private damagePlayer(damage: number): void {
    if (this.damageCooldown > 0) return;
    this.damageCooldown = 0.72;
    if (this.shieldTimer > 0) {
      this.spawnBurst(this.player.position, 0x70efff, 10);
      return;
    }
    this.hp = Math.max(0, this.hp - Math.max(1, damage));
    this.spawnBurst(this.player.position, 0xff7da8, 16);
    if (this.hp <= 0) this.finishRun("gameover");
  }

  private updateCampaignBattleEvent(): void {
    const profile = this.campaignProfile;
    if (!profile || this.campaignEventTriggered || this.elapsed < profile.battleEventAtSeconds ||
        profile.battleEvent === "memory-reversal" || profile.battleEvent === "stasis-lock") return;
    this.campaignEventTriggered = true;
    if (profile.battleEvent === "rescue-support") {
      this.shield = Math.min(100, this.shield + 25);
      this.special = Math.min(100, this.special + 8);
      this.spawnBurst(this.player.position, 0x78ffe0, 26);
      this.callbacks.onCampaignMessage?.("救援ドローン到着！シールドと特殊ゲージを補給しました。");
    } else if (profile.battleEvent === "echo-pulse") {
      this.clearEnemyProjectiles();
      this.special = Math.min(100, this.special + 14);
      this.spawnBurst(this.player.position, 0xa7a0ff, 30);
      this.callbacks.onCampaignMessage?.("信号共鳴パルス！敵弾を消去し、特殊ゲージを補給しました。");
    } else if (profile.battleEvent === "signal-exposure") {
      this.pendingBossExposure = true;
      this.callbacks.onCampaignMessage?.("解析データを確保。ボス出現時に中継器を露出させます。");
    }
  }

  private clearEnemyProjectiles(): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      if (this.projectiles[index]?.owner === "enemy") this.removeProjectile(index);
    }
  }

  private spawnBurst(position: THREE.Vector3, color: number, count: number): void {
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

  private getBossForecastPaths(forecast: AttackForecast, delaySeconds = 0): ThreatPath[] {
    if (!this.boss) return [];
    const effects = getBodyIntegrityEffects(this.boss.integrity);
    return forecastPaths(forecast, delaySeconds).filter((path) => {
      if (path.velocity.x < -0.05 && !effects.leftVolleyEnabled) return false;
      if (path.velocity.x > 0.05 && !effects.rightVolleyEnabled) return false;
      return true;
    });
  }

  private getEvasionAssessment(): EvasionAssessment {
    const threats: ThreatPath[] = this.projectiles
      .filter((projectile) => projectile.owner === "enemy")
      .map((projectile) => ({
        position: { x: projectile.mesh.position.x, y: projectile.mesh.position.y },
        velocity: { x: projectile.velocity.x, y: projectile.velocity.y },
        radius: projectile.radius,
        source: "projectile" as const
      }));

    for (const enemy of this.enemies) {
      if (enemy.attackForecast && getBodyIntegrityEffects(enemy.integrity).canAttack) {
        threats.push(...forecastPaths(enemy.attackForecast, enemy.fireTimer));
      }
    }
    if (this.boss?.attackForecast && getBodyIntegrityEffects(this.boss.integrity).canAttack) {
      threats.push(...this.getBossForecastPaths(this.boss.attackForecast, this.boss.fireTimer));
    }

    return assessEvasion(
      { x: this.player.position.x, y: this.player.position.y },
      { x: this.playerMotionVelocity.x, y: this.playerMotionVelocity.y },
      threats,
      {
        minX: -this.world.width / 2 + 0.55,
        maxX: this.world.width / 2 - 0.55,
        minY: -WORLD_HEIGHT / 2 + 0.55,
        maxY: WORLD_HEIGHT / 2 - 0.55
      },
      {
        candidateSpeed: 4.6 * this.shipProfile.movementMultiplier * this.pilotProfile.movementMultiplier,
        horizonSeconds: 1.35,
        playerRadius: 0.52
      }
    );
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
      bossName: this.boss ? (this.campaignProfile?.bossName ?? "NEBULA EMPRESS") : "",
      mode: this.mode,
      combo: this.combo,
      evasion: this.getEvasionAssessment()
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
      duration: this.elapsed
    });
  }

  private clearRunObjects(): void {
    for (const enemy of this.enemies) {
      this.removeSceneObject(enemy.mesh);
      this.scene.remove(enemy.warning);
      enemy.warning.visible = false;
    }
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
            object.geometry !== this.shared.lanceGeometry &&
            object.geometry !== this.shared.warningGeometry &&
            object.geometry !== this.shared.warningFanGeometry) object.geometry.dispose();
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
