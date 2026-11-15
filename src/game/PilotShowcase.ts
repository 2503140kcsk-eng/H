import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { PilotProfile } from "./pilots";
import { getPilotSkinProfile } from "./pilot-skins";

type VrmRuntime = {
  scene: THREE.Object3D;
  update: (deltaTime: number) => void;
  expressionManager?: { setValue: (name: string, value: number) => void };
};

function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export class PilotShowcase {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(29, 1, 0.1, 40);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock();
  private animationFrame = 0;
  private elapsed = 0;
  private speaking = false;
  private disposed = false;
  private animationStyle: PilotProfile["animationStyle"] = "guide";
  private renderAccumulator = 0;
  private resizeObserver: ResizeObserver | null = null;
  private modelRoot: THREE.Group | null = null;
  private vrm: VrmRuntime | null = null;
  private disposeVrm: (() => void) | null = null;
  private mouth: THREE.Mesh | null = null;
  private leftArm: THREE.Group | null = null;
  private rightArm: THREE.Group | null = null;
  private readonly ambient = new THREE.AmbientLight(0xffffff, 1.25);
  private readonly keyLight = new THREE.DirectionalLight(0xffe6f4, 2.1);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
      depth: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.camera.position.set(0, 0.15, 6.8);
    this.camera.lookAt(0, -0.05, 0);
    this.keyLight.position.set(-3, 4, 5);
    this.scene.add(this.ambient, this.keyLight);
    this.scene.add(new THREE.HemisphereLight(0xb5d8ff, 0x3c244a, 0.8));
    this.resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => this.resize())
      : null;
    this.resizeObserver?.observe(canvas);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.animate();
  }

  setPilot(profile: PilotProfile, skinId = "standard"): void {
    this.clearModel();
    this.speaking = false;
    this.animationStyle = profile.animationStyle;
    this.modelRoot = this.createProceduralPilot(profile, skinId);
    this.scene.add(this.modelRoot);
  }

  setSpeaking(active: boolean): void {
    this.speaking = active;
  }

  private createProceduralPilot(profile: PilotProfile, skinId: string): THREE.Group {
    const root = new THREE.Group();
    root.position.y = -1.36;
    const outfit = getPilotSkinProfile(skinId);
    const uniformColor = outfit.uniformColor < 0 ? profile.accentColor : outfit.uniformColor;
    const skin = new THREE.MeshStandardMaterial({ color: 0xffd8ce, roughness: 0.75 });
    const uniform = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.48, metalness: 0.12 });
    const trim = new THREE.MeshStandardMaterial({ color: outfit.trimColor, roughness: 0.38, metalness: 0.18 });
    const accessory = new THREE.MeshStandardMaterial({ color: outfit.accessoryColor, roughness: 0.32, metalness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x26304f, roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({
      color: profile.id === "noa-celeste" ? 0x6e9dc4 : profile.id === "rin-vega" ? 0x9e426e : 0x7651a5,
      roughness: 0.82
    });
    const eye = new THREE.MeshBasicMaterial({ color: 0x202744 });
    const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x843e54 });

    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    // Head and hair are deliberately low-poly. The same rig is the offline-safe fallback for VRM.
    const head = add(new THREE.SphereGeometry(0.42, 14, 12), skin, root, 0, 1.18, 0);
    head.scale.set(0.88, 1.08, 0.8);
    add(new THREE.SphereGeometry(0.44, 12, 8), hair, root, 0, 1.42, -0.08).scale.set(1.04, 0.72, 0.92);
    add(new THREE.SphereGeometry(0.24, 10, 8), hair, root, -0.34, 1.2, 0.08).scale.set(0.6, 1.35, 0.65);
    add(new THREE.SphereGeometry(0.24, 10, 8), hair, root, 0.34, 1.2, 0.08).scale.set(0.6, 1.35, 0.65);
    add(new THREE.SphereGeometry(0.095, 8, 6), eye, root, -0.14, 1.21, 0.315);
    add(new THREE.SphereGeometry(0.095, 8, 6), eye, root, 0.14, 1.21, 0.315);
    this.mouth = add(new THREE.SphereGeometry(0.09, 8, 6), mouthMaterial, root, 0, 1.01, 0.337);
    this.mouth.scale.set(0.7, 0.12, 0.15);

    const torso = add(new THREE.CapsuleGeometry(0.28, 0.7, 3, 8), uniform, root, 0, 0.32, 0);
    torso.scale.set(1.05, 1, 0.78);
    const collar = add(new THREE.TorusGeometry(0.23, 0.055, 6, 16), trim, root, 0, 0.68, 0.06);
    collar.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.16, 0.18, 0.06), trim, root, 0, 0.28, 0.25);
    const belt = add(new THREE.CylinderGeometry(0.3, 0.26, 0.13, 8), dark, root, 0, -0.14, 0);
    belt.scale.z = 0.78;

    const skirt = add(new THREE.CylinderGeometry(0.26, 0.47, 0.38, 8), uniform, root, 0, -0.38, 0);
    skirt.rotation.y = Math.PI / 8;
    const legGeometry = new THREE.CapsuleGeometry(0.105, 0.55, 3, 7);
    const leftLeg = add(legGeometry, dark, root, -0.16, -0.86, 0);
    leftLeg.rotation.z = -0.05;
    const rightLeg = add(legGeometry.clone(), dark, root, 0.16, -0.86, 0);
    rightLeg.rotation.z = 0.05;
    add(new THREE.BoxGeometry(0.22, 0.13, 0.38), trim, root, -0.16, -1.2, 0.11);
    add(new THREE.BoxGeometry(0.22, 0.13, 0.38), trim, root, 0.16, -1.2, 0.11);

    const makeArm = (x: number): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.62, 0);
      const arm = add(new THREE.CapsuleGeometry(0.105, 0.55, 3, 7), uniform, pivot, 0, -0.34, 0);
      arm.rotation.z = x < 0 ? -0.12 : 0.12;
      add(new THREE.SphereGeometry(0.12, 8, 6), skin, pivot, 0, -0.69, 0.02);
      root.add(pivot);
      return pivot;
    };
    this.leftArm = makeArm(-0.39);
    this.rightArm = makeArm(0.39);

    const shoulder = new THREE.SphereGeometry(0.16, 8, 6);
    add(shoulder, trim, root, -0.39, 0.62, 0);
    add(shoulder.clone(), trim, root, 0.39, 0.62, 0);
    if (profile.id === "lumi-asteria") {
      const star = add(new THREE.OctahedronGeometry(0.13, 0), accessory, root, 0, 1.7, 0.02);
      star.rotation.z = Math.PI / 4;
    } else if (profile.id === "noa-celeste") {
      const halo = add(new THREE.TorusGeometry(0.19, 0.035, 6, 18), accessory, root, 0, 1.74, 0);
      halo.rotation.x = Math.PI / 2.8;
    } else {
      const crest = add(new THREE.ConeGeometry(0.12, 0.42, 5), accessory, root, 0.28, 1.55, 0);
      crest.rotation.z = -0.4;
    }
    return root;
  }

  private clearModel(): void {
    if (this.vrm) {
      this.scene.remove(this.vrm.scene);
      this.disposeVrm?.();
      this.vrm = null;
      this.disposeVrm = null;
    }
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      disposeObject(this.modelRoot);
      this.modelRoot = null;
    }
    this.mouth = null;
    this.leftArm = null;
    this.rightArm = null;
  }

  async loadVrm(file: File): Promise<void> {
    if (file.size > 18 * 1024 * 1024) throw new Error("VRMは18 MB以下に軽量化してから読み込んでね。");
    if (!/\.(vrm|glb)$/i.test(file.name)) throw new Error("VRMまたはGLB形式のファイルを選んでね。");
    const [{ VRMLoaderPlugin, VRMUtils }] = await Promise.all([
      import("@pixiv/three-vrm")
    ]);
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const bytes = await file.arrayBuffer();
    const gltf = await new Promise<{ scene: THREE.Group; userData: Record<string, unknown> }>((resolve, reject) => {
      loader.parse(bytes, "", (result) => resolve(result as { scene: THREE.Group; userData: Record<string, unknown> }), reject);
    });
    const vrm = gltf.userData.vrm as VrmRuntime | undefined;
    if (!vrm) throw new Error("VRMメタデータが見つからないGLBです。");
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.combineMorphs(vrm as never);
    VRMUtils.rotateVRM0(vrm as never);
    vrm.scene.traverse((object) => { object.frustumCulled = false; });
    this.clearModel();
    vrm.scene.scale.setScalar(0.82);
    vrm.scene.position.set(0, -1.38, 0);
    this.scene.add(vrm.scene);
    this.vrm = vrm;
    this.disposeVrm = () => VRMUtils.deepDispose(vrm.scene);
  }

  private resize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.canvas.clientWidth || 120);
    const height = Math.max(1, this.canvas.clientHeight || 150);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private animate = (): void => {
    if (this.disposed) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const frameDelta = Math.min(0.05, this.clock.getDelta());
    this.renderAccumulator += frameDelta;
    if (this.renderAccumulator < 1 / 30) return;
    const delta = Math.min(0.08, this.renderAccumulator);
    this.renderAccumulator = 0;
    this.elapsed += delta;
    const mouthAmount = this.speaking ? 0.18 + Math.abs(Math.sin(this.elapsed * 17)) * 0.52 : 0.015;
    if (this.modelRoot) {
      this.modelRoot.position.y = -1.36 + Math.sin(this.elapsed * 1.6) * 0.035;
      this.modelRoot.rotation.y = Math.sin(this.elapsed * (this.animationStyle === "ace" ? 0.75 : 0.42)) *
        (this.animationStyle === "guardian" ? 0.06 : 0.12);
      const armSpeed = this.animationStyle === "ace" ? 3.2 : this.animationStyle === "guardian" ? 1.1 : 1.8;
      const armRange = this.animationStyle === "guardian" ? 0.035 : this.animationStyle === "ace" ? 0.14 : 0.08;
      if (this.leftArm) this.leftArm.rotation.z = -0.12 + Math.sin(this.elapsed * armSpeed) * armRange;
      if (this.rightArm) this.rightArm.rotation.z = 0.12 + Math.sin(this.elapsed * armSpeed + Math.PI) * armRange;
      if (this.mouth) this.mouth.scale.y = 0.12 + mouthAmount * 0.72;
    }
    if (this.vrm) {
      this.vrm.expressionManager?.setValue("aa", this.speaking ? mouthAmount : 0);
      this.vrm.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.resize);
    this.clearModel();
    this.renderer.dispose();
  }
}
