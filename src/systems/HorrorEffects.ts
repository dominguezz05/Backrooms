import * as THREE from 'three';

interface GhostFigure {
  group: THREE.Group;
  mat: THREE.MeshBasicMaterial;
  timer: number;
  opacity: number;       // opacidad actual (fade-in / fade-out)
  targetOpacity: number;
  speed: number;         // velocidad hacia el jugador
  dying: boolean;        // fase de desvanecimiento
}

interface WallMsg {
  mesh: THREE.Mesh;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  timer: number;
  interval: number;
}

interface BloodDecal {
  mesh: THREE.Mesh;
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
  private enemyProximityFactor = 0;

  // ── Figuras fantasma ───────────────────────────────────────────────────────
  private ghosts: GhostFigure[] = [];

  // ── Mensajes en paredes ───────────────────────────────────────────────────
  private wallMsgs: WallMsg[] = [];
  private static readonly CREEPY_MSGS = [
    'AYÚDAME', 'TE ESTÁ MIRANDO', 'CORRE', 'NO ESTÁS SOLO',
    'DETRÁS DE TI', 'ESCÚCHAME', 'NO MIRES', 'YA ES TARDE',
    'SALTE', 'TE VEO', '¿LO OYES?', 'VUELVE ATRÁS',
  ];

  // ── Rastro de sangre ──────────────────────────────────────────────────────
  private bloodDecals: BloodDecal[] = [];

  // ── Sombra periférica ─────────────────────────────────────────────────────
  private _shadowDiv: HTMLDivElement | null = null;

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
    this.scene.add(light);
    this.lights.push(light);
    this.lightData.push({
      baseIntensity: 0.3 + Math.random() * 0.4,
      flickerSpeed: 5 + Math.random() * 10,
      flickerAmount: 0.1 + Math.random() * 0.3,
    });
  }

  setEnemyProximity(closestDist: number): void {
    const maxDist = 15;
    const target = closestDist < maxDist ? 1 - closestDist / maxDist : 0;
    this.enemyProximityFactor += (target - this.enemyProximityFactor) * 0.05;
  }

  update(delta: number): void {
    this.updateLights(delta);
    this.updateMessages(delta);
    this.updateFOV(delta);
    this.updateWallMsgs(delta);
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
    if (danger !== this.lightsInDangerMode) {
      this.lightsInDangerMode = danger;
      if (!danger) {
        for (let i = 0; i < this.lights.length; i++) this.lights[i].color.set(0xffffaa);
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

  spawnGhostFigure(spawnPos: THREE.Vector3, playerPos: THREE.Vector3): void {
    for (const g of this.ghosts) this.scene.remove(g.group);
    this.ghosts = [];

    const group = new THREE.Group();

    // Material con opacidad 0 — hace fade-in en updateGhosts
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc8d8ff,
      transparent: true,
      opacity: 0,
      fog: true,
    });

    // Cuerpo
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.18), mat);
    body.position.y = 0.68;
    group.add(body);

    // Cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), mat);
    head.position.y = 1.65;
    group.add(head);

    // Ojos: brillantes y visibles aunque estén lejos
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false });
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), eyeMat);
    eL.position.set(-0.08, 1.67, 0.22);
    eL.userData.isEye = true;
    group.add(eL);
    const eR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), eyeMat);
    eR.position.set(0.08, 1.67, 0.22);
    eR.userData.isEye = true;
    group.add(eR);

    group.position.set(spawnPos.x, 0, spawnPos.z);
    group.lookAt(new THREE.Vector3(playerPos.x, 0, playerPos.z));
    this.scene.add(group);

    this.ghosts.push({
      group,
      mat,
      timer: 9 + Math.random() * 4,
      opacity: 0,
      targetOpacity: 0.58,
      speed: 0.4 + Math.random() * 0.3,
      dying: false,
    });
  }

  updateGhosts(playerPos: THREE.Vector3, delta: number): void {
    if (this.ghosts.length === 0) return;
    const ghost = this.ghosts[0];

    // Timer
    ghost.timer -= delta;

    const dx = playerPos.x - ghost.group.position.x;
    const dz = playerPos.z - ghost.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Empieza a desvanecerse si el jugador se acerca o expira
    if ((dist < 5 || ghost.timer <= 0) && !ghost.dying) {
      ghost.dying = true;
      ghost.targetOpacity = 0;
    }

    // Fade in / out
    ghost.opacity += (ghost.targetOpacity - ghost.opacity) * Math.min(1, delta * 2.5);
    ghost.mat.opacity = ghost.opacity;
    // Ojos más opacos que el cuerpo
    ghost.group.children.forEach(c => {
      if (c.userData.isEye) {
        (c as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = Math.min(1, ghost.opacity * 1.8);
      }
    });

    // Si murió y es invisible, eliminarlo
    if (ghost.dying && ghost.opacity < 0.01) {
      this.scene.remove(ghost.group);
      this.ghosts = [];
      return;
    }

    // Movimiento lento hacia el jugador (solo cuando está visible)
    if (!ghost.dying && ghost.opacity > 0.1) {
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0.5) {
        ghost.group.position.x += (dx / len) * ghost.speed * delta;
        ghost.group.position.z += (dz / len) * ghost.speed * delta;
      }
      // Siempre mira al jugador
      ghost.group.lookAt(new THREE.Vector3(playerPos.x, ghost.group.position.y, playerPos.z));
    }

    // Bob vertical
    ghost.group.position.y = Math.sin(performance.now() * 0.0018) * 0.12;
  }

  // ── Mensajes en paredes ───────────────────────────────────────────────────

  /** Coloca un plano con texto aterrador en una posición de pared. */
  spawnWallMessage(wallPos: THREE.Vector3, normalDir: THREE.Vector3): void {
    if (this.wallMsgs.length >= 4) return; // máx 4 a la vez

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size / 3;
    const ctx = canvas.getContext('2d')!;

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const geo = new THREE.PlaneGeometry(1.4, 0.45);
    const mesh = new THREE.Mesh(geo, mat);

    // Posicionar pegado a la pared, ligeramente offset para evitar z-fighting
    mesh.position.copy(wallPos).addScaledVector(normalDir, 0.06);
    mesh.position.y = 1.4 + Math.random() * 0.5;
    mesh.lookAt(mesh.position.clone().add(normalDir));

    this.scene.add(mesh);
    const entry: WallMsg = { mesh, ctx, tex, timer: 0, interval: 2.5 + Math.random() * 2.5 };
    this._writeWallMsg(entry);
    this.wallMsgs.push(entry);
  }

  private _writeWallMsg(entry: WallMsg): void {
    const { ctx } = entry;
    const w = ctx.canvas.width; const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(0, 0, w, h);
    const msg = HorrorEffects.CREEPY_MSGS[Math.floor(Math.random() * HorrorEffects.CREEPY_MSGS.length)];
    const fontSize = Math.floor(h * 0.58);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = `rgba(${160 + Math.random() * 80 | 0}, 0, 0, 1)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Ligero temblor
    const ox = (Math.random() - 0.5) * 4;
    const oy = (Math.random() - 0.5) * 4;
    ctx.fillText(msg, w / 2 + ox, h / 2 + oy);
    entry.tex.needsUpdate = true;
  }

  private updateWallMsgs(delta: number): void {
    for (const entry of this.wallMsgs) {
      entry.timer += delta;
      if (entry.timer >= entry.interval) {
        entry.timer = 0;
        entry.interval = 2 + Math.random() * 3;
        this._writeWallMsg(entry);
      }
    }
  }

  clearWallMessages(): void {
    for (const entry of this.wallMsgs) this.scene.remove(entry.mesh);
    this.wallMsgs = [];
  }

  // ── Rastro de sangre ──────────────────────────────────────────────────────

  /**
   * Genera un rastro de 7 huellas de sangre que aparecen una a una
   * detrás del jugador, como si alguien caminara hacia él.
   */
  spawnBloodTrail(fromPos: THREE.Vector3, forwardDir: THREE.Vector3): void {
    // Limpiar rastro anterior
    for (const d of this.bloodDecals) this.scene.remove(d.mesh);
    this.bloodDecals = [];

    const right = new THREE.Vector3(-forwardDir.z, 0, forwardDir.x).normalize();
    const mat = new THREE.MeshBasicMaterial({ color: 0x550000, transparent: true, opacity: 0, depthWrite: false });
    const geo = new THREE.PlaneGeometry(0.28, 0.38);

    for (let i = 0; i < 7; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const pos = fromPos.clone()
        .addScaledVector(forwardDir, -(i + 1) * 0.9)  // detrás del jugador
        .addScaledVector(right, side * 0.2);
      pos.y = 0.015; // sobre el suelo

      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = Math.random() * 0.4 - 0.2;
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.bloodDecals.push({ mesh });

      // Aparece con delay escalonado
      const delay = i * 220;
      setTimeout(() => {
        const m = mesh.material as THREE.MeshBasicMaterial;
        m.opacity = 0.75 + Math.random() * 0.2;
      }, delay);
    }

    // Se desvanece después de 18s
    setTimeout(() => {
      for (const d of this.bloodDecals) {
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      }
      setTimeout(() => {
        for (const d of this.bloodDecals) this.scene.remove(d.mesh);
        this.bloodDecals = [];
      }, 500);
    }, 18000);
  }

  // ── Sombra periférica ─────────────────────────────────────────────────────

  /** Hace aparecer una sombra oscura en el rabillo del ojo (borde de pantalla). */
  triggerPeripheralShadow(): void {
    if (this._shadowDiv) return; // ya hay una activa

    const div = document.createElement('div');
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const vpos = Math.random() < 0.5 ? '10%' : '30%';

    div.style.cssText = `
      position:fixed;
      top:${vpos};
      ${side}:0;
      width:18vw;
      height:60vh;
      pointer-events:none;
      z-index:7000;
      background:radial-gradient(ellipse at ${side === 'left' ? 'left' : 'right'} center,
        rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%);
      opacity:0;
      transition:opacity 0.12s ease-in;
    `;
    document.body.appendChild(div);
    this._shadowDiv = div;

    // Aparece
    requestAnimationFrame(() => { div.style.opacity = '1'; });

    // Desaparece en 220-380ms (muy breve, como si fuera de reojo)
    const duration = 220 + Math.random() * 160;
    setTimeout(() => {
      div.style.transition = 'opacity 0.18s ease-out';
      div.style.opacity = '0';
      setTimeout(() => {
        div.remove();
        this._shadowDiv = null;
      }, 200);
    }, duration);
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  triggerImmediateMessage(): void {
    this.messageTimer = this.messageInterval - 500;
  }

  hideMessage(): void {
    if (!this.messageElement) return;
    this.messageElement.style.display = 'none';
    this.currentMessage = '';
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
