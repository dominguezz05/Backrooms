import * as THREE from 'three';
import { CONFIG, MONSTER_KILL_DISTANCE } from '../constants';
import { EnemyType, CellType } from '../types';

function createScaryFaceTexture(type: EnemyType): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bgColors: Record<EnemyType, string> = {
    [EnemyType.RUNNER]: '#0a0000',
    [EnemyType.STALKER]: '#050505',
    [EnemyType.TELEPORTER]: '#0a0015',
  };
  
  ctx.fillStyle = bgColors[type];
  ctx.fillRect(0, 0, size, size);

  const faceX = size / 2;
  const faceY = size / 2;
  const faceW = size * 0.75;
  const faceH = size * 0.9;

  const faceGrad = ctx.createRadialGradient(faceX, faceY, 0, faceX, faceY, faceW / 2);
  
  const gradColors: Record<EnemyType, string[]> = {
    [EnemyType.RUNNER]: ['#3a0000', '#1a0000', '#050000'],
    [EnemyType.STALKER]: ['#1a1a0a', '#0a0a00', '#000000'],
    [EnemyType.TELEPORTER]: ['#200030', '#100015', '#050008'],
  };
  
  faceGrad.addColorStop(0, gradColors[type][0]);
  faceGrad.addColorStop(0.6, gradColors[type][1]);
  faceGrad.addColorStop(1, gradColors[type][2]);
  
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(faceX, faceY, faceW / 2, faceH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1a0000';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.shadowColor = '#000';
  ctx.shadowBlur = 30;
  for (let i = 0; i < 15; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#1a0000' : '#0a0000';
    ctx.lineWidth = 3 + Math.random() * 6;
    ctx.beginPath();
    const startX = faceX + (Math.random() - 0.5) * faceW * 0.9;
    const startY = faceY + (Math.random() - 0.5) * faceH * 0.9;
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + (Math.random() - 0.5) * size * 0.4, startY + (Math.random() - 0.5) * size * 0.3);
    ctx.stroke();
  }

  const eyeY = faceY - size * 0.12;
  const eyeSpacing = size * 0.2;
  
  const eyeGlow: Record<EnemyType, string> = {
    [EnemyType.RUNNER]: '#ff0000',
    [EnemyType.STALKER]: '#44ff00',
    [EnemyType.TELEPORTER]: '#ff00ff',
  };

  ctx.shadowColor = eyeGlow[type];
  ctx.shadowBlur = size * 0.25;
  ctx.fillStyle = eyeGlow[type];
  
  const eyeShapes: Record<EnemyType, () => void> = {
    [EnemyType.RUNNER]: () => {
      ctx.beginPath();
      ctx.ellipse(faceX - eyeSpacing, eyeY, size * 0.12, size * 0.18, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(faceX + eyeSpacing, eyeY, size * 0.12, size * 0.18, 0.2, 0, Math.PI * 2);
      ctx.fill();
    },
    [EnemyType.STALKER]: () => {
      ctx.beginPath();
      ctx.moveTo(faceX - eyeSpacing - size * 0.1, eyeY - size * 0.08);
      ctx.lineTo(faceX - eyeSpacing + size * 0.1, eyeY + size * 0.05);
      ctx.lineTo(faceX - eyeSpacing - size * 0.1, eyeY + size * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(faceX + eyeSpacing + size * 0.1, eyeY - size * 0.08);
      ctx.lineTo(faceX + eyeSpacing - size * 0.1, eyeY + size * 0.05);
      ctx.lineTo(faceX + eyeSpacing + size * 0.1, eyeY + size * 0.08);
      ctx.closePath();
      ctx.fill();
    },
    [EnemyType.TELEPORTER]: () => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = faceX - eyeSpacing + Math.cos(angle) * size * 0.08;
        const y = eyeY + Math.sin(angle) * size * 0.12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = faceX + eyeSpacing + Math.cos(angle) * size * 0.08;
        const y = eyeY + Math.sin(angle) * size * 0.12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    },
  };
  
  eyeShapes[type]();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000';
  
  const pupilShapes: Record<EnemyType, () => void> = {
    [EnemyType.RUNNER]: () => {
      ctx.beginPath();
      ctx.ellipse(faceX - eyeSpacing, eyeY, size * 0.04, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(faceX + eyeSpacing, eyeY, size * 0.04, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    [EnemyType.STALKER]: () => {
      ctx.beginPath();
      ctx.arc(faceX - eyeSpacing, eyeY, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(faceX + eyeSpacing, eyeY, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
    },
    [EnemyType.TELEPORTER]: () => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(faceX - eyeSpacing, eyeY, size * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(faceX + eyeSpacing, eyeY, size * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(faceX - eyeSpacing, eyeY, size * 0.015, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(faceX + eyeSpacing, eyeY, size * 0.015, 0, Math.PI * 2);
      ctx.fill();
    },
  };
  
  pupilShapes[type]();

  ctx.fillStyle = '#150000';
  ctx.beginPath();
  ctx.ellipse(faceX - eyeSpacing, eyeY + size * 0.02, size * 0.1, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(faceX + eyeSpacing, eyeY + size * 0.02, size * 0.1, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  const mouthY = faceY + size * 0.28;
  const mouthW = size * 0.4;
  const mouthH = size * 0.4;

  const mouthColors: Record<EnemyType, string> = {
    [EnemyType.RUNNER]: '#1a0000',
    [EnemyType.STALKER]: '#0a0500',
    [EnemyType.TELEPORTER]: '#100015',
  };
  
  ctx.fillStyle = mouthColors[type];
  
  const mouthShapes: Record<EnemyType, () => void> = {
    [EnemyType.RUNNER]: () => {
      ctx.beginPath();
      ctx.ellipse(faceX, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    [EnemyType.STALKER]: () => {
      ctx.beginPath();
      ctx.moveTo(faceX - mouthW * 0.8, mouthY - mouthH * 0.3);
      ctx.quadraticCurveTo(faceX, mouthY + mouthH, faceX + mouthW * 0.8, mouthY - mouthH * 0.3);
      ctx.closePath();
      ctx.fill();
    },
    [EnemyType.TELEPORTER]: () => {
      ctx.beginPath();
      ctx.moveTo(faceX - mouthW, mouthY);
      ctx.lineTo(faceX, mouthY - mouthH * 0.5);
      ctx.lineTo(faceX + mouthW, mouthY);
      ctx.lineTo(faceX, mouthY + mouthH * 0.3);
      ctx.closePath();
      ctx.fill();
    },
  };
  
  mouthShapes[type]();

  const teethColors: Record<EnemyType, string> = {
    [EnemyType.RUNNER]: '#ff0000',
    [EnemyType.STALKER]: '#3a3020',
    [EnemyType.TELEPORTER]: '#aa00ff',
  };
  
  ctx.fillStyle = teethColors[type];
  for (let i = 0; i < 8; i++) {
    const toothX = faceX - mouthW * 0.7 + i * mouthW * 0.2;
    const toothW = size * 0.05 + Math.random() * size * 0.04;
    const toothH = size * 0.1 + Math.random() * size * 0.08;
    ctx.beginPath();
    ctx.moveTo(toothX, mouthY - mouthH * 0.4);
    ctx.lineTo(toothX + toothW / 2, mouthY - mouthH * 0.4 - toothH);
    ctx.lineTo(toothX + toothW, mouthY - mouthH * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = teethColors[type];
  ctx.lineWidth = 4;
  ctx.shadowColor = teethColors[type];
  ctx.shadowBlur = 15;
  for (let i = 0; i < 20; i++) {
    const dripX = faceX - mouthW + Math.random() * mouthW * 2;
    const dripStart = mouthY + mouthH * 0.3;
    const dripLen = size * 0.08 + Math.random() * size * 0.25;
    ctx.beginPath();
    ctx.moveTo(dripX, dripStart);
    ctx.lineTo(dripX + (Math.random() - 0.5) * 8, dripStart + dripLen);
    ctx.stroke();
  }

  const noseY = faceY + size * 0.08;
  const noseColors: Record<EnemyType, string> = {
    [EnemyType.RUNNER]: '#1a0000',
    [EnemyType.STALKER]: '#0a0800',
    [EnemyType.TELEPORTER]: '#150020',
  };
  
  ctx.fillStyle = noseColors[type];
  ctx.shadowBlur = 0;
  
  const noseShapes: Record<EnemyType, () => void> = {
    [EnemyType.RUNNER]: () => {
      ctx.beginPath();
      ctx.moveTo(faceX, noseY - size * 0.1);
      ctx.lineTo(faceX - size * 0.08, noseY + size * 0.12);
      ctx.lineTo(faceX, noseY + size * 0.06);
      ctx.lineTo(faceX + size * 0.08, noseY + size * 0.12);
      ctx.closePath();
      ctx.fill();
    },
    [EnemyType.STALKER]: () => {
      ctx.beginPath();
      ctx.moveTo(faceX - size * 0.06, noseY);
      ctx.lineTo(faceX, noseY + size * 0.1);
      ctx.lineTo(faceX + size * 0.06, noseY);
      ctx.stroke();
    },
    [EnemyType.TELEPORTER]: () => {
      ctx.beginPath();
      ctx.arc(faceX, noseY, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    },
  };
  
  noseShapes[type]();

  ctx.strokeStyle = '#1a0000';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(faceX - faceW * 0.35, faceY - faceH * 0.35);
  ctx.lineTo(faceX - faceW * 0.25, faceY - faceH * 0.4);
  ctx.lineTo(faceX - faceW * 0.3, faceY - faceH * 0.32);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(faceX + faceW * 0.35, faceY - faceH * 0.35);
  ctx.lineTo(faceX + faceW * 0.25, faceY - faceH * 0.4);
  ctx.lineTo(faceX + faceW * 0.3, faceY - faceH * 0.32);
  ctx.stroke();

  const bloodColors: Record<EnemyType, string> = {
    [EnemyType.RUNNER]: 'rgba(180, 0, 0, 0.7)',
    [EnemyType.STALKER]: 'rgba(80, 60, 20, 0.6)',
    [EnemyType.TELEPORTER]: 'rgba(120, 0, 150, 0.6)',
  };
  
  ctx.fillStyle = bloodColors[type];
  for (let i = 0; i < 30; i++) {
    const bloodX = faceX + (Math.random() - 0.5) * faceW;
    const bloodY = faceY + (Math.random() - 0.3) * faceH;
    const bloodR = size * 0.015 + Math.random() * size * 0.05;
    ctx.beginPath();
    ctx.arc(bloodX, bloodY, bloodR, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/** Cache de texturas generada UNA sola vez al inicio — evita el tirón al spawnear */
const _faceTextureCache = new Map<EnemyType, THREE.CanvasTexture>();

export class Enemy {
  type: EnemyType;
  position: THREE.Vector3;
  mesh: THREE.Group;
  speed!: number;
  detectionRange!: number;
  private teleportTimer = 0;
  private teleportInterval = 8000;
  private maze: number[][];
  private animationTime = 0;
  private isMoving = false;
  private stuckTimer = 0;
  private lastPosition: THREE.Vector3;
  private state: 'idle' | 'chase' | 'investigate' = 'idle';
  private lastKnownPlayerPos: THREE.Vector3 | null = null;
  private investigateTimer = 0;
  private patrolTarget: THREE.Vector3 | null = null;
  private patrolTimer = 0;
  private readonly PATROL_TIMEOUT = 6;
  private stunTimer = 0;

  /** Llamar durante la carga del juego para pre-generar las texturas y evitar el tirón al spawnear */
  static preloadTextures(): void {
    for (const t of [EnemyType.RUNNER, EnemyType.STALKER, EnemyType.TELEPORTER]) {
      if (!_faceTextureCache.has(t)) {
        _faceTextureCache.set(t, createScaryFaceTexture(t));
      }
    }
  }

  constructor(type: EnemyType, position: THREE.Vector3, scene: THREE.Scene, maze: number[][]) {
    this.type = type;
    this.position = position.clone();
    this.maze = maze;
    this.lastPosition = position.clone();
    this.mesh = this.createMesh(scene);
    this.configureByType();
  }

  private createMesh(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    // Usa la textura cacheada si ya existe; si no, la genera (no debería pasar si preloadTextures() se llamó)
    const faceTexture = _faceTextureCache.get(this.type) ?? createScaryFaceTexture(this.type);

    const sizes: Record<EnemyType, { torsoHeight: number; torsoWidth: number; legHeight: number; legWidth: number; armHeight: number; headSize: number }> = {
      [EnemyType.RUNNER]: { torsoHeight: 1.0, torsoWidth: 0.6, legHeight: 1.0, legWidth: 0.2, armHeight: 0.9, headSize: 0.5 },
      [EnemyType.STALKER]: { torsoHeight: 1.2, torsoWidth: 0.7, legHeight: 1.1, legWidth: 0.25, armHeight: 1.0, headSize: 0.6 },
      [EnemyType.TELEPORTER]: { torsoHeight: 1.1, torsoWidth: 0.65, legHeight: 1.0, legWidth: 0.22, armHeight: 0.95, headSize: 0.55 },
    };

    const size = sizes[this.type];
    const bodyColor = this.getBodyColor();

    const torsoGeom = new THREE.BoxGeometry(size.torsoWidth, size.torsoHeight, size.torsoWidth * 0.8);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(this.getEmissiveColor()),
      emissiveIntensity: 0.2,
    });
    const torso = new THREE.Mesh(torsoGeom, torsoMat);
    torso.position.y = size.legHeight + size.torsoHeight / 2;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    const headGeom = new THREE.BoxGeometry(size.headSize, size.headSize * 1.2, size.headSize * 0.9);
    const headMat = new THREE.MeshStandardMaterial({
      map: faceTexture,
      roughness: 0.7,
      metalness: 0.15,
      emissive: new THREE.Color(0x110000),
      emissiveIntensity: 0.3,
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = size.legHeight + size.torsoHeight + size.headSize * 0.5;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    const leftArmGroup = new THREE.Group();
    const armGeom = new THREE.BoxGeometry(size.torsoWidth * 0.25, size.armHeight, size.torsoWidth * 0.25);
    const armMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.y = -size.armHeight / 2;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    leftArmGroup.position.set(-size.torsoWidth * 0.6, size.legHeight + size.torsoHeight - size.torsoHeight * 0.1, 0);
    group.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    const rightArm = new THREE.Mesh(armGeom, armMat.clone());
    rightArm.position.y = -size.armHeight / 2;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    rightArmGroup.position.set(size.torsoWidth * 0.6, size.legHeight + size.torsoHeight - size.torsoHeight * 0.1, 0);
    group.add(rightArmGroup);

    const leftLegGeom = new THREE.BoxGeometry(size.legWidth, size.legHeight, size.legWidth);
    const legMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
    });

    const leftLegGroup = new THREE.Group();
    const leftLeg = new THREE.Mesh(leftLegGeom, legMat);
    leftLeg.position.y = -size.legHeight / 2;
    leftLeg.castShadow = true;
    leftLegGroup.add(leftLeg);
    leftLegGroup.position.set(-size.legWidth * 1.2, size.legHeight, 0);
    group.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    const rightLeg = new THREE.Mesh(leftLegGeom.clone(), legMat.clone());
    rightLeg.position.y = -size.legHeight / 2;
    rightLeg.castShadow = true;
    rightLegGroup.add(rightLeg);
    rightLegGroup.position.set(size.legWidth * 1.2, size.legHeight, 0);
    group.add(rightLegGroup);

    (group as THREE.Group & { bodyParts?: { leftArm: THREE.Group; rightArm: THREE.Group; leftLeg: THREE.Group; rightLeg: THREE.Group; head: THREE.Mesh } }).bodyParts = {
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      head: head,
    };

    const glowColors: Record<EnemyType, number> = {
      [EnemyType.RUNNER]: 0xff0000,
      [EnemyType.STALKER]: 0x44ff00,
      [EnemyType.TELEPORTER]: 0xff00ff,
    };

    const light = new THREE.PointLight(glowColors[this.type], 1.5, 8);
    light.position.set(0, size.legHeight + size.torsoHeight + size.headSize * 0.5, 0.6);
    light.castShadow = true;
    light.shadow.mapSize.width = 256;
    light.shadow.mapSize.height = 256;
    group.add(light);

    const secondaryLight = new THREE.PointLight(glowColors[this.type], 0.5, 4);
    secondaryLight.position.set(0, size.legHeight + size.torsoHeight, 0.3);
    group.add(secondaryLight);

    const totalHeight = size.legHeight + size.torsoHeight + size.headSize * 1.2;
    const auraSize = size.torsoWidth * 2;
    const auraGeom = new THREE.PlaneGeometry(auraSize, totalHeight);
    const auraColors: Record<EnemyType, string> = {
      [EnemyType.RUNNER]: '#ff0000',
      [EnemyType.STALKER]: '#22aa00',
      [EnemyType.TELEPORTER]: '#aa00ff',
    };
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColors[this.type],
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const aura = new THREE.Mesh(auraGeom, auraMat);
    aura.position.set(0, totalHeight / 2, -0.4);
    group.add(aura);

    const backAura = new THREE.Mesh(auraGeom.clone(), auraMat.clone());
    backAura.position.set(0, totalHeight / 2, -0.6);
    backAura.rotation.y = Math.PI;
    group.add(backAura);

    const floatParticles = new THREE.Group();
    const particleCount = 15;
    const particleGeom = new THREE.SphereGeometry(0.03, 4, 4);
    const particleMat = new THREE.MeshBasicMaterial({
      color: auraColors[this.type],
      transparent: true,
      opacity: 0.6,
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.position.set(
        (Math.random() - 0.5) * size.torsoWidth * 2,
        Math.random() * totalHeight,
        (Math.random() - 0.5) * size.torsoWidth + 0.3
      );
      particle.userData = {
        speed: 0.5 + Math.random() * 1,
        offset: Math.random() * Math.PI * 2,
        radius: 0.3 + Math.random() * 0.3,
      };
      floatParticles.add(particle);
    }
    group.add(floatParticles);
    (group as THREE.Group & { floatParticles?: THREE.Group }).floatParticles = floatParticles;

    group.position.copy(this.position);
    group.position.y = 0;
    scene.add(group);
    return group;
  }

  private configureByType(): void {
    switch (this.type) {
      case EnemyType.RUNNER:
        this.speed = CONFIG.RUNNER_SPEED;
        this.detectionRange = 5;
        break;
      case EnemyType.STALKER:
        this.speed = CONFIG.STALKER_SPEED;
        this.detectionRange = 18;
        break;
      case EnemyType.TELEPORTER:
        this.speed = CONFIG.TELEPORTER_SPEED;
        this.detectionRange = 12;
        break;
    }
  }

  private getBodyColor(): number {
    const colors: Record<EnemyType, number> = {
      [EnemyType.RUNNER]: 0x1a0a0a,
      [EnemyType.STALKER]: 0x0a1a0a,
      [EnemyType.TELEPORTER]: 0x1a0a1a,
    };
    return colors[this.type];
  }

  private getEmissiveColor(): number {
    const colors: Record<EnemyType, number> = {
      [EnemyType.RUNNER]: 0x330000,
      [EnemyType.STALKER]: 0x003300,
      [EnemyType.TELEPORTER]: 0x330033,
    };
    return colors[this.type];
  }

  private hasLineOfSight(playerPos: THREE.Vector3): boolean {
    let x0 = Math.round(this.position.x / CONFIG.UNIT_SIZE);
    let z0 = Math.round(this.position.z / CONFIG.UNIT_SIZE);
    const x1 = Math.round(playerPos.x / CONFIG.UNIT_SIZE);
    const z1 = Math.round(playerPos.z / CONFIG.UNIT_SIZE);

    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    while (x0 !== x1 || z0 !== z1) {
      if (z0 >= 0 && z0 < this.maze.length && x0 >= 0 && x0 < this.maze[0].length) {
        if (this.maze[z0][x0] === CellType.WALL) return false;
      }
      const e2 = 2 * err;
      if (e2 > -dz) { err -= dz; x0 += sx; }
      if (e2 < dx)  { err += dx; z0 += sz; }
    }
    return true;
  }

  update(delta: number, playerPos: THREE.Vector3, playerHiding: boolean, sanityBonus: number = 1.0): number {
    const distToPlayer = this.position.distanceTo(playerPos);
    
    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      this.isMoving = false;
      if (this.mesh.children.length > 0) {
        const torso = this.mesh.children[0] as THREE.Mesh;
        if (torso.material instanceof THREE.MeshStandardMaterial) {
          torso.material.emissive.setHex(0x888800);
          torso.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
        }
      }
      this.animationTime += delta;
      this.animate(delta);
      return distToPlayer;
    }
    
    if (this.mesh.children.length > 0) {
      const torso = this.mesh.children[0] as THREE.Mesh;
      if (torso.material instanceof THREE.MeshStandardMaterial) {
        torso.material.emissive.setHex(this.getEmissiveColor());
        torso.material.emissiveIntensity = 0.2;
      }
    }

    const currentSpeed = this.speed * sanityBonus;

    if (this.type === EnemyType.TELEPORTER) {
      this.teleportTimer += delta * 1000;
      if (this.teleportTimer >= this.teleportInterval) {
        this.teleport(playerPos, sanityBonus);
        this.teleportTimer = 0;
      }
    }

    // Si el jugador está escondido, el enemigo le pierde la pista y no le persigue
    if (playerHiding) {
      this.isMoving = false;
      // El enemigo se queda quieto y vuelve a idle, no investiga
      if (this.state === 'chase' || this.state === 'investigate') {
        this.state = 'idle';
        this.lastKnownPlayerPos = null;
      }
      return distToPlayer;
    }

    const canSeePlayer = distToPlayer < this.detectionRange && this.hasLineOfSight(playerPos);

    if (canSeePlayer) {
      const pathStep = this.findPathStep(playerPos);
      
      if (pathStep) {
        const dir = new THREE.Vector3().subVectors(pathStep, this.position);
        dir.y = 0;
        const dist = dir.length();
        
        if (dist > 0.1) {
          dir.normalize();
          const moveAmount = Math.min(currentSpeed * delta, dist);
          const newPos = this.position.clone().add(dir.multiplyScalar(moveAmount));
          
          if (!this.checkWallCollision(newPos)) {
            this.position.copy(newPos);
            this.mesh.position.copy(this.position);
            this.isMoving = true;
            this.stuckTimer = 0;
          } else {
            const escaped = this.escapeStuck();
            if (escaped) this.isMoving = true;
            else {
              this.isMoving = false;
              this.stuckTimer += delta;
            }
          }
        }
      } else {
        this.isMoving = false;
      }

      this.mesh.lookAt(new THREE.Vector3(playerPos.x, this.mesh.position.y, playerPos.z));
      this.lastKnownPlayerPos = playerPos.clone();
      this.state = 'chase';
    } else if (this.state === 'chase') {
      // Acaba de perder de vista al jugador — ir a investigar la última posición conocida
      this.state = 'investigate';
      this.investigateTimer = 5;
      this.isMoving = false;
    } else if (this.state === 'investigate' && this.lastKnownPlayerPos) {
      const distToLast = this.position.distanceTo(this.lastKnownPlayerPos);
      if (distToLast > 0.5 && this.investigateTimer > 0) {
        const dir = new THREE.Vector3().subVectors(this.lastKnownPlayerPos, this.position);
        dir.y = 0;
        dir.normalize();
        const newPos = this.position.clone();
        newPos.x += dir.x * currentSpeed * delta;
        newPos.z += dir.z * currentSpeed * delta;
        if (!this.checkWallCollision(newPos)) {
          this.position.copy(newPos);
          this.mesh.position.copy(this.position);
          this.mesh.lookAt(new THREE.Vector3(this.lastKnownPlayerPos.x, this.mesh.position.y, this.lastKnownPlayerPos.z));
        }
        this.isMoving = true;
        this.investigateTimer -= delta;
      } else {
        this.state = 'idle';
        this.isMoving = false;
      }
    } else {
      // Patrulla aleatoria cuando no hay objetivo
      this.patrolTimer += delta;
      const reachedTarget = this.patrolTarget && this.position.distanceTo(this.patrolTarget) < CONFIG.UNIT_SIZE * 0.6;
      if (!this.patrolTarget || this.patrolTimer > this.PATROL_TIMEOUT || reachedTarget) {
        this.patrolTarget = this.findRandomPatrolPoint();
        this.patrolTimer = 0;
      }
      if (this.patrolTarget) {
        const dir = new THREE.Vector3().subVectors(this.patrolTarget, this.position);
        dir.y = 0;
        if (dir.length() > 0.2) {
          dir.normalize();
          const patrolSpeed = currentSpeed * 0.45;
          const newPos = this.position.clone();
          newPos.x += dir.x * patrolSpeed * delta;
          newPos.z += dir.z * patrolSpeed * delta;
          if (!this.checkWallCollision(newPos)) {
            this.position.copy(newPos);
            this.mesh.position.copy(this.position);
            this.mesh.lookAt(new THREE.Vector3(this.patrolTarget.x, this.mesh.position.y, this.patrolTarget.z));
            this.isMoving = true;
          } else {
            // Obstáculo — elegir nuevo objetivo en el siguiente frame
            this.patrolTarget = null;
            this.isMoving = false;
          }
        } else {
          this.isMoving = false;
        }
      } else {
        this.isMoving = false;
      }
    }

    this.animationTime += delta;
    this.animate(delta);

    return distToPlayer;
  }

  private animate(delta: number): void {
    const t = this.animationTime;
    const bodyParts = (this.mesh as THREE.Group & { bodyParts?: { leftArm: THREE.Group; rightArm: THREE.Group; leftLeg: THREE.Group; rightLeg: THREE.Group; head: THREE.Mesh } }).bodyParts;
    
    if (this.isMoving) {
      const walkSpeed = this.type === EnemyType.RUNNER ? 12 : (this.type === EnemyType.STALKER ? 3 : 6);
      const legSwing = this.type === EnemyType.RUNNER ? 0.6 : (this.type === EnemyType.STALKER ? 0.2 : 0.4);
      const armSwing = this.type === EnemyType.RUNNER ? 0.4 : (this.type === EnemyType.STALKER ? 0.15 : 0.3);
      const bounce = this.type === EnemyType.RUNNER ? 0.1 : (this.type === EnemyType.STALKER ? 0.02 : 0.05);

      if (bodyParts) {
        bodyParts.leftLeg.rotation.x = Math.sin(t * walkSpeed) * legSwing;
        bodyParts.rightLeg.rotation.x = Math.sin(t * walkSpeed + Math.PI) * legSwing;
        bodyParts.leftArm.rotation.x = Math.sin(t * walkSpeed + Math.PI) * armSwing;
        bodyParts.rightArm.rotation.x = Math.sin(t * walkSpeed) * armSwing;
        this.mesh.position.y = Math.abs(Math.sin(t * walkSpeed * 2)) * bounce;
      }
    } else {
      if (bodyParts) {
        bodyParts.leftLeg.rotation.x = 0;
        bodyParts.rightLeg.rotation.x = 0;
        bodyParts.leftArm.rotation.x = this.type === EnemyType.STALKER ? 0.1 : 0;
        bodyParts.rightArm.rotation.x = this.type === EnemyType.STALKER ? 0.1 : 0;
        this.mesh.position.y = 0;
      }
    }

    if (this.type === EnemyType.TELEPORTER && !this.isMoving) {
      if (bodyParts) {
        bodyParts.leftArm.rotation.x = Math.sin(t * 2) * 0.2;
        bodyParts.rightArm.rotation.x = Math.sin(t * 2 + Math.PI) * 0.2;
        bodyParts.leftLeg.rotation.x = Math.sin(t * 1.5) * 0.1;
        bodyParts.rightLeg.rotation.x = Math.sin(t * 1.5 + Math.PI) * 0.1;
      }
      this.mesh.rotation.y += delta * 0.5;
    }

    if (bodyParts && bodyParts.head) {
      if (this.type === EnemyType.STALKER) {
        bodyParts.head.rotation.y = Math.sin(t * 0.5) * 0.1;
      } else if (this.type === EnemyType.RUNNER) {
        bodyParts.head.rotation.x = Math.sin(t * 2) * 0.1;
      }
    }

    const floatParticles = (this.mesh as THREE.Group & { floatParticles?: THREE.Group }).floatParticles;
    if (floatParticles) {
      floatParticles.children.forEach((particle, i) => {
        const data = particle.userData as { speed: number; offset: number; radius: number };
        const meshParticle = particle as THREE.Mesh;
        const angle = t * data.speed + data.offset;
        particle.position.x += Math.sin(angle) * delta * 0.5;
        particle.position.y += Math.cos(angle * 0.7) * delta * 0.3;
        particle.position.z += Math.sin(angle * 0.5) * delta * 0.3;
        
        const maxY = 3.0;
        const minY = 0.3;
        if (particle.position.y > maxY) particle.position.y = minY;
        if (particle.position.y < minY) particle.position.y = maxY;
        
        if (meshParticle.material) {
          (meshParticle.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 3 + i) * 0.3;
        }
      });
    }

    this.mesh.children.forEach(child => {
      if (child instanceof THREE.PointLight) {
        child.intensity = 1.2 + Math.sin(t * 5) * 0.3;
      }
    });
  }

  private teleport(playerPos: THREE.Vector3, sanityBonus: number = 1.0): void {
    const angle = Math.random() * Math.PI * 2;
    const minDistance = Math.max(4, 8 - (sanityBonus - 1) * 20);
    const maxDistance = Math.max(8, 13 - (sanityBonus - 1) * 30);
    const distance = minDistance + Math.random() * (maxDistance - minDistance);

    const newPos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      this.position.y,
      playerPos.z + Math.sin(angle) * distance
    );

    if (!this.checkWallCollision(newPos)) {
      this.position.copy(newPos);
      this.mesh.position.copy(this.position);

      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          (child.material as THREE.MeshStandardMaterial).opacity = 0.2;
        }
        if (child instanceof THREE.PointLight) {
          child.intensity = 0.1;
        }
      });

      setTimeout(() => {
        this.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            (child.material as THREE.MeshStandardMaterial).opacity = 1;
          }
          if (child instanceof THREE.PointLight) {
            child.intensity = 0.5;
          }
        });
      }, 300);
    }
  }

  private findRandomPatrolPoint(): THREE.Vector3 | null {
    const minDist = CONFIG.UNIT_SIZE;
    const maxDist = CONFIG.UNIT_SIZE * 7;
    for (let attempt = 0; attempt < 25; attempt++) {
      const cellX = Math.floor(Math.random() * this.maze[0].length);
      const cellZ = Math.floor(Math.random() * this.maze.length);
      if (this.maze[cellZ]?.[cellX] === CellType.WALL) continue;
      const target = new THREE.Vector3(cellX * CONFIG.UNIT_SIZE, 0, cellZ * CONFIG.UNIT_SIZE);
      const d = target.distanceTo(this.position);
      if (d >= minDist && d <= maxDist) return target;
    }
    return null;
  }

  private escapeStuck(): boolean {
    const cellX = Math.round(this.position.x / CONFIG.UNIT_SIZE);
    const cellZ = Math.round(this.position.z / CONFIG.UNIT_SIZE);
    const offsets = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [2, 0], [-2, 0], [0, 2], [0, -2],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
      [3, 0], [-3, 0], [0, 3], [0, -3],
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2],
    ];
    
    const playerDir = new THREE.Vector3();
    const self = this;
    
    const freeCells = offsets
      .map(([dx, dz]) => {
        const nx = cellX + dx;
        const nz = cellZ + dz;
        if (nz >= 0 && nz < self.maze.length && nx >= 0 && nx < self.maze[0].length &&
            self.maze[nz][nx] !== CellType.WALL) {
          return { nx, nz, dx, dz, dist: Math.sqrt(dx*dx + dz*dz) };
        }
        return null;
      })
      .filter(Boolean) as { nx: number; nz: number; dx: number; dz: number; dist: number }[];
    
    if (freeCells.length === 0) return false;
    
    freeCells.sort((a, b) => a.dist - b.dist);
    
    for (const cell of freeCells) {
      const testPos = new THREE.Vector3(
        cell.nx * CONFIG.UNIT_SIZE,
        0,
        cell.nz * CONFIG.UNIT_SIZE
      );
      if (!this.checkWallCollision(testPos)) {
        this.position.set(testPos.x, 0, testPos.z);
        this.mesh.position.copy(this.position);
        return true;
      }
    }
    
    const bestCell = freeCells[0];
    this.position.set(bestCell.nx * CONFIG.UNIT_SIZE, 0, bestCell.nz * CONFIG.UNIT_SIZE);
    this.mesh.position.copy(this.position);
    return true;
  }

  private checkWallCollision(position: THREE.Vector3): boolean {
    const cellX = Math.round(position.x / CONFIG.UNIT_SIZE);
    const cellZ = Math.round(position.z / CONFIG.UNIT_SIZE);

    if (cellZ >= 0 && cellZ < this.maze.length &&
        cellX >= 0 && cellX < this.maze[0].length) {
      return this.maze[cellZ][cellX] === CellType.WALL;
    }

    return true;
  }

  private findPathStep(targetPos: THREE.Vector3): THREE.Vector3 | null {
    const startX = Math.round(this.position.x / CONFIG.UNIT_SIZE);
    const startZ = Math.round(this.position.z / CONFIG.UNIT_SIZE);
    const endX = Math.round(targetPos.x / CONFIG.UNIT_SIZE);
    const endZ = Math.round(targetPos.z / CONFIG.UNIT_SIZE);

    if (startX === endX && startZ === endZ) return null;
    if (this.maze[endZ]?.[endX] === CellType.WALL) return null;

    interface PathNode {x: number; z: number; g: number; f: number; parent: PathNode | null}
    const openSet: PathNode[] = [{x: startX, z: startZ, g: 0, f: 0, parent: null}];
    const closedSet = new Set<string>();
    const key = (x: number, z: number) => `${x},${z}`;
    const heuristic = (x: number, z: number) => Math.abs(x - endX) + Math.abs(z - endZ);

    let iterations = 0;
    const maxIterations = 200;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = key(current.x, current.z);

      if (current.x === endX && current.z === endZ) {
        let node: PathNode | null = current;
        while (node && node.parent) {
          const prev = node;
          node = node.parent;
          if (!node.parent || (node.x === startX && node.z === startZ)) {
            return new THREE.Vector3(prev.x * CONFIG.UNIT_SIZE, 0, prev.z * CONFIG.UNIT_SIZE);
          }
        }
        return null;
      }

      closedSet.add(currentKey);

      const neighbors = [
        {x: current.x + 1, z: current.z}, {x: current.x - 1, z: current.z},
        {x: current.x, z: current.z + 1}, {x: current.x, z: current.z - 1},
      ];

      for (const neighbor of neighbors) {
        const nKey = key(neighbor.x, neighbor.z);
        if (closedSet.has(nKey)) continue;
        if (neighbor.z < 0 || neighbor.z >= this.maze.length) continue;
        if (neighbor.x < 0 || neighbor.x >= this.maze[0].length) continue;
        if (this.maze[neighbor.z][neighbor.x] === CellType.WALL) continue;

        const g = current.g + 1;
        const f = g + heuristic(neighbor.x, neighbor.z);
        const existing = openSet.find(n => n.x === neighbor.x && n.z === neighbor.z);

        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          }
        } else {
          openSet.push({x: neighbor.x, z: neighbor.z, g, f, parent: current});
        }
      }
    }
    return null;
  }

  private isInOpenArea(position: THREE.Vector3): boolean {
    const cellX = Math.round(position.x / CONFIG.UNIT_SIZE);
    const cellZ = Math.round(position.z / CONFIG.UNIT_SIZE);
    
    let emptyCount = 0;
    let totalCheck = 0;
    
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const checkX = cellX + dx;
        const checkZ = cellZ + dz;
        
        if (checkZ >= 0 && checkZ < this.maze.length &&
            checkX >= 0 && checkX < this.maze[0].length) {
          totalCheck++;
          if (this.maze[checkZ][checkX] !== CellType.WALL) {
            emptyCount++;
          }
        }
      }
    }
    
    return totalCheck > 0 && emptyCount / totalCheck > 0.7;
  }

  private findPathAroundObstacle(targetPos: THREE.Vector3, stepSize: number): THREE.Vector3 | null {
    const currentCellX = Math.round(this.position.x / CONFIG.UNIT_SIZE);
    const currentCellZ = Math.round(this.position.z / CONFIG.UNIT_SIZE);
    
    const directions: THREE.Vector3[] = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize(),
    ];
    
    let bestDir: THREE.Vector3 | null = null;
    let bestScore = -Infinity;
    
    for (const dir of directions) {
      const testPos = this.position.clone().add(dir.multiplyScalar(stepSize));
      
      if (!this.checkWallCollision(testPos)) {
        const toTarget = new THREE.Vector3().subVectors(targetPos, testPos);
        const distanceScore = -toTarget.length();
        
        const cellX = Math.round(testPos.x / CONFIG.UNIT_SIZE);
        const cellZ = Math.round(testPos.z / CONFIG.UNIT_SIZE);
        let opennessScore = 0;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const checkX = cellX + dx;
            const checkZ = cellZ + dz;
            if (checkZ >= 0 && checkZ < this.maze.length &&
                checkX >= 0 && checkX < this.maze[0].length) {
              if (this.maze[checkZ][checkX] !== CellType.WALL) {
                opennessScore += 0.1;
              }
            }
          }
        }
        
        const score = distanceScore + opennessScore;
        
        if (score > bestScore) {
          bestScore = score;
          bestDir = testPos;
        }
      }
    }
    
    return bestDir;
  }

  stun(duration: number): void {
    this.stunTimer = duration;
    console.log(`[Enemy] ${this.type} stunned for ${duration}s`);
  }

  canKillPlayer(playerPos: THREE.Vector3): boolean {
    const dx = this.position.x - playerPos.x;
    const dz = this.position.z - playerPos.z;
    const distance2D = Math.sqrt(dx * dx + dz * dz);
    return distance2D < MONSTER_KILL_DISTANCE;
  }

  destroy(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.map?.dispose();
          }
          child.material.dispose();
        }
      }
    });
  }
}
