import * as THREE from 'three';
import { CONFIG, FLASHLIGHT_ANGLE, FLASHLIGHT_DISTANCE, FLASHLIGHT_INTENSITY } from '../constants';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ambientLight: THREE.AmbientLight;
  flashlight: THREE.SpotLight;
  shadowsEnabled: boolean = true;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(
      0x000000,
      CONFIG.FOG_NEAR * CONFIG.UNIT_SIZE,
      CONFIG.FOG_FAR * CONFIG.UNIT_SIZE
    );

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.25,
      1000
    );
    this.camera.rotation.order = 'YXZ';

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0x151515, 0.5);
    this.scene.add(this.ambientLight);

    this.flashlight = this.createFlashlight();
    this.addResizeListener();
  }

  setShadows(enabled: boolean): void {
    this.shadowsEnabled = enabled;
    this.renderer.shadowMap.enabled = enabled;
    if (!enabled) {
      this.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.castShadow) mesh.castShadow = false;
          if (mesh.receiveShadow) mesh.receiveShadow = false;
        }
      });
    }
  }

  isShadowsEnabled(): boolean {
    return this.shadowsEnabled;
  }

  private createFlashlight(): THREE.SpotLight {
    // Intensity starts at 0 (off). We never toggle `visible` because that forces
    // Three.js to recompile all shaders → noticeable frame hitch. Instead we
    // only vary intensity between 0 and FLASHLIGHT_INTENSITY.
    const light = new THREE.SpotLight(0xffffee, 0, FLASHLIGHT_DISTANCE, FLASHLIGHT_ANGLE, 0.5, 1);
    light.castShadow = false;
    this.camera.add(light);
    light.position.set(0, 0, 0);
    light.target.position.set(0, 0, -1);
    this.camera.add(light.target);
    this.scene.add(this.camera);
    return light;
  }

  toggleFlashlight(enabled: boolean): void {
    // Only change intensity — never touch `visible` to avoid shader recompile lag
    this.flashlight.intensity = enabled ? FLASHLIGHT_INTENSITY : 0;
  }

  updateFog(near: number, far: number): void {
    const fog = this.scene.fog as THREE.Fog;
    fog.near = near * CONFIG.UNIT_SIZE;
    fog.far = far * CONFIG.UNIT_SIZE;
  }

  private addResizeListener(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  getClock(): THREE.Clock {
    return new THREE.Clock();
  }
}
