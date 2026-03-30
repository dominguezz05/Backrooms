import * as THREE from 'three';

interface GhostFigure {
  group: THREE.Group;
  timer: number;
}

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

  // ── Figuras fantasma ───────────────────────────────────────────────────────
  private ghosts: GhostFigure[] = [];

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

  private lastLightUpdate = 0;
  private flickerTime = 0;
  private lightsInDangerMode = false;

  private updateLights(_delta: number): void {
    const now = performance.now();
    if (now - this.lastLightUpdate < 50) return;
    this.lastLightUpdate = now;
    
    this.flickerTime += 0.05;
    const p = this.enemyProximityFactor;
    const speedMult = 1 + p * 4;
    const amountMult = 1 + p * 3;
    
    const danger = p > 0.05;
    // Solo cambia el color si el modo cambió (danger↔normal) para evitar setRGB cada 50ms
    if (danger !== this.lightsInDangerMode) {
      this.lightsInDangerMode = danger;
      if (!danger) {
        for (let i = 0; i < this.lights.length; i++) {
          this.lights[i].color.set(0xffffaa);
        }
      }
    }

    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      const data = this.lightData[i];
      const flicker = Math.sin(this.flickerTime * data.flickerSpeed * speedMult) * data.flickerAmount * amountMult;
      light.intensity = Math.max(0, data.baseIntensity + flicker);

      if (danger) {
        const g = Math.max(0, 1.0 - p * 0.85);
        const b = Math.max(0, 0.67 - p * 0.67);
        light.color.setRGB(1, g, b);
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

  private lastFovUpdate = 0;

  private updateFOV(delta: number): void {
    this.fovTimer += delta;

    if (this.fovTimer > 10 + Math.random() * 20) {
      this.fovTimer = 0;
      this.fovTarget = 75 + (Math.random() - 0.5) * 10;
    }

    const now = performance.now();
    if (now - this.lastFovUpdate > 100) {
      const diff = this.fovTarget - this.camera.fov;
      if (Math.abs(diff) > 0.01) {
        this.camera.fov += diff * 0.02;
        this.camera.updateProjectionMatrix();
      }
      this.lastFovUpdate = now;
    }
  }

  // ── API pública: figuras fantasma ─────────────────────────────────────────

  /**
   * Materializa un fantasma en `spawnPos`. Desaparece cuando el jugador se acerca
   * a menos de `despawnDist` unidades o cuando el timer expira (~10-14 s).
   */
  spawnGhostFigure(spawnPos: THREE.Vector3, playerPos: THREE.Vector3): void {
    // Solo un fantasma a la vez
    for (const g of this.ghosts) this.scene.remove(g.group);
    this.ghosts = [];

    const group = new THREE.Group();

    const mat = new THREE.MeshBasicMaterial({ color: 0x99aeff, transparent: true, opacity: 0.28 });

    // Cuerpo
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.18), mat);
    body.position.y = 0.68;
    group.add(body);

    // Cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), mat);
    head.position.y = 1.65;
    group.add(head);

    // Ojos: puntos blancos brillantes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
    eL.position.set(-0.08, 1.67, 0.22);
    group.add(eL);
    const eR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
    eR.position.set(0.08, 1.67, 0.22);
    group.add(eR);

    group.position.set(spawnPos.x, 0, spawnPos.z);
    // Girar para mirar al jugador (solo eje Y)
    group.lookAt(new THREE.Vector3(playerPos.x, 0, playerPos.z));

    this.scene.add(group);
    this.ghosts.push({ group, timer: 10 + Math.random() * 4 });
  }

  /** Llamar cada frame desde Game.ts para gestionar el ciclo de vida del fantasma. */
  updateGhosts(playerPos: THREE.Vector3, delta: number): void {
    if (this.ghosts.length === 0) return;
    
    const ghost = this.ghosts[0];
    ghost.timer -= delta;

    const dx = playerPos.x - ghost.group.position.x;
    const dz = playerPos.z - ghost.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < 4.5 || ghost.timer <= 0) {
      this.scene.remove(ghost.group);
      this.ghosts = [];
      return;
    }

    ghost.group.position.y = Math.sin(performance.now() * 0.0018) * 0.08;
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
