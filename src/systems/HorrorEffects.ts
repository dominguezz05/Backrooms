import * as THREE from 'three';

export class HorrorEffects {
  private scene: THREE.Scene;
  private lights: THREE.PointLight[] = [];
  private lightData: { baseIntensity: number; flickerSpeed: number; flickerAmount: number }[] = [];
  private messageTimer = 0;
  private messageInterval = 4000 + Math.random() * 5000;
  private currentMessage = '';
  private fovTimer = 0;
  private fovTarget = 75;
  private camera: THREE.PerspectiveCamera;
  private messageElement: HTMLElement | null = null;
  // Factor de proximidad de enemigos: 0 = lejos, 1 = muy cerca
  private enemyProximityFactor = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  setMessageElement(element: HTMLElement): void {
    this.messageElement = element;
  }

  addFlickeringLight(position: THREE.Vector3): void {
    const light = new THREE.PointLight(0xffffaa, 0.5, 15, 2);
    light.position.copy(position);
    light.castShadow = false;
    light.shadow.mapSize.width = 256;
    light.shadow.mapSize.height = 256;
    this.scene.add(light);
    this.lights.push(light);

    this.lightData.push({
      baseIntensity: 0.3 + Math.random() * 0.4,
      flickerSpeed: 5 + Math.random() * 10,
      flickerAmount: 0.1 + Math.random() * 0.3,
    });
  }

  /** Llamar cada frame con la distancia al enemigo más cercano (Infinity si no hay enemigos). */
  setEnemyProximity(closestDist: number): void {
    const maxDist = 15;
    const target = closestDist < maxDist ? 1 - closestDist / maxDist : 0;
    // Lerp suave para evitar cambios bruscos
    this.enemyProximityFactor += (target - this.enemyProximityFactor) * 0.05;
  }

  update(delta: number): void {
    this.updateLights(delta);
    this.updateMessages(delta);
    this.updateFOV(delta);
  }

  private updateLights(_delta: number): void {
    const p = this.enemyProximityFactor; // 0..1
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      const data = this.lightData[i];
      // Con enemigo cerca: parpadeo más rápido y cantidad mayor
      const speedMult = 1 + p * 4;
      const amountMult = 1 + p * 3;
      const flicker = Math.sin(Date.now() * 0.001 * data.flickerSpeed * speedMult) * data.flickerAmount * amountMult;
      const randomFlicker = Math.random() * data.flickerAmount * 0.5 * amountMult;
      light.intensity = Math.max(0, data.baseIntensity + flicker + randomFlicker);

      // Tinte rojizo progresivo cuando el enemigo se acerca
      if (p > 0.05) {
        const r = Math.round(255 * Math.min(1, 1.0));
        const g = Math.round(255 * Math.max(0, 1.0 - p * 0.85));
        const b = Math.round(255 * Math.max(0, 0.67 - p * 0.67));
        light.color.setRGB(r / 255, g / 255, b / 255);
      } else {
        light.color.set(0xffffaa);
      }
    }
  }

  private updateMessages(delta: number): void {
    // Los mensajes aleatorios fueron desactivados — solo se muestran mensajes de juego
    // mediante showMessage() explícito
    if (this.currentMessage && this.messageElement) {
      this.messageTimer += delta * 1000;
      if (this.messageTimer >= this.messageInterval) {
        this.messageElement.style.display = 'none';
        this.currentMessage = '';
      }
    }
  }

  private updateFOV(delta: number): void {
    this.fovTimer += delta;

    if (this.fovTimer > 10 + Math.random() * 20) {
      this.fovTimer = 0;
      this.fovTarget = 75 + (Math.random() - 0.5) * 10;
    }

    this.camera.fov += (this.fovTarget - this.camera.fov) * 0.02;
    this.camera.updateProjectionMatrix();
  }

  triggerImmediateMessage(): void {
    this.messageTimer = this.messageInterval - 500;
  }

  showMessage(message: string, duration: number = 3000): void {
    if (!this.messageElement) return;
    this.currentMessage = message;
    this.messageElement.textContent = message;
    this.messageElement.style.display = 'block';
    this.messageTimer = duration;
    this.messageInterval = duration + 500;
  }
}
