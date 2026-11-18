import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";

type LoadedGltf = {
  scene: THREE.Group;
  userData: { vrm?: VRM };
};

export class VrmPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
  private readonly clock = new THREE.Clock();
  private readonly floor: THREE.Mesh;
  private readonly resizeObserver: ResizeObserver | null;
  private model: VRM | null = null;
  private frame = 0;
  private lastRenderTime = 0;
  private elapsed = 0;
  private loadGeneration = 0;
  private disposed = false;

  private readonly animate = (timestamp: number): void => {
    if (this.disposed || document.hidden) {
      this.frame = 0;
      return;
    }
    if (timestamp - this.lastRenderTime >= 1000 / 30) {
      const delta = Math.min(this.clock.getDelta(), 0.05);
      this.elapsed += delta;
      if (this.model) {
        this.model.update(delta);
        this.model.scene.rotation.y = Math.sin(this.elapsed * 0.42) * 0.12;
        const baseY = Number(this.model.scene.userData.baseY) || 0;
        this.model.scene.position.y = baseY + Math.sin(this.elapsed * 1.7) * 0.018;
      }
      this.renderer.render(this.scene, this.camera);
      this.lastRenderTime = timestamp;
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  private readonly handleResize = (): void => this.resize();

  private readonly handleVisibility = (): void => {
    if (document.hidden) {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.clock.stop();
      return;
    }
    this.clock.start();
    this.lastRenderTime = 0;
    if (!this.frame && !this.disposed) this.frame = requestAnimationFrame(this.animate);
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene.add(new THREE.HemisphereLight(0xd7edff, 0x29234d, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1.6, 2.4, 3.2);
    this.scene.add(key);
    const fill = new THREE.PointLight(0x79dcff, 8, 5);
    fill.position.set(-1.4, 0.7, 1.6);
    this.scene.add(fill);

    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 28),
      new THREE.MeshBasicMaterial({ color: 0x8beaff, transparent: true, opacity: 0.12, depthWrite: false })
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0.015;
    this.scene.add(this.floor);

    this.camera.position.set(0, 0.92, 3.45);
    this.camera.lookAt(0, 0.83, 0);
    this.resize();

    this.resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(this.handleResize)
      : null;
    this.resizeObserver?.observe(canvas);
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.clock.start();
    this.frame = requestAnimationFrame(this.animate);
  }

  async load(blob: Blob): Promise<string> {
    const generation = ++this.loadGeneration;
    this.clearCurrentModel();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let gltf: LoadedGltf | null = null;
    try {
      const bytes = await blob.arrayBuffer();
      gltf = await loader.parseAsync(bytes, "") as LoadedGltf;
      const vrm = gltf.userData.vrm;
      if (!vrm) throw new Error("このファイルからVRMモデルを確認できませんでした。");
      if (generation !== this.loadGeneration || this.disposed) {
        throw new Error("モデルの読み込みはキャンセルされました。");
      }

      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      vrm.scene.traverse((object) => {
        object.frustumCulled = false;
      });

      const bounds = new THREE.Box3().setFromObject(vrm.scene);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y < 0.1 || size.y > 100) {
        throw new Error("モデルの身長情報が不正です。");
      }

      const scale = 1.62 / size.y;
      vrm.scene.scale.setScalar(scale);
      const baseY = -bounds.min.y * scale;
      vrm.scene.position.y = baseY;
      vrm.scene.userData.baseY = baseY;
      this.scene.add(vrm.scene);
      this.model = vrm;
      gltf = null;
      this.elapsed = 0;
      this.camera.position.set(0, 0.93, 3.45);
      this.camera.lookAt(0, 0.82, 0);
      this.resize();
      // VRM 0.x and 1.0 metadata use different schemas; avoid assuming one shared name field.
      return "VRMパイロット";
    } catch (error) {
      if (gltf) VRMUtils.deepDispose(gltf.scene);
      throw error;
    }
  }

  clear(): void {
    this.loadGeneration += 1;
    this.clearCurrentModel();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loadGeneration += 1;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.clearCurrentModel();
    this.floor.geometry.dispose();
    (this.floor.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private clearCurrentModel(): void {
    if (!this.model) return;
    this.scene.remove(this.model.scene);
    VRMUtils.deepDispose(this.model.scene);
    this.model = null;
  }

  private resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
