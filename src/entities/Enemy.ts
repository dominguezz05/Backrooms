import * as THREE from 'three';
import { CONFIG, MONSTER_KILL_DISTANCE } from '../constants';
import { EnemyType, CellType } from '../types';

interface EnemyProportions {
  torsoHeight: number;
  torsoWidth: number;
  torsoDepth: number;
  neckLength: number;
  armLength: number;
  armWidth: number;
  forearmLength: number;
  handSize: number;
  legLength: number;
  legWidth: number;
  lowerLegLength: number;
  footSize: number;
  headWidth: number;
  headHeight: number;
  headDepth: number;
  jawHeight: number;
  shoulderWidth: number;
  hipWidth: number;
}

const ENEMY_PROPORTIONS: Record<EnemyType, EnemyProportions> = {
  [EnemyType.RUNNER]: {
    torsoHeight: 0.9,
    torsoWidth: 0.35,
    torsoDepth: 0.25,
    neckLength: 0.25,
    armLength: 0.8,
    armWidth: 0.08,
    forearmLength: 0.7,
    handSize: 0.12,
    legLength: 0.55,
    legWidth: 0.1,
    lowerLegLength: 0.55,
    footSize: 0.15,
    headWidth: 0.35,
    headHeight: 0.45,
    headDepth: 0.3,
    jawHeight: 0.18,
    shoulderWidth: 0.5,
    hipWidth: 0.25,
  },
  [EnemyType.STALKER]: {
    torsoHeight: 1.1,
    torsoWidth: 0.7,
    torsoDepth: 0.45,
    neckLength: 0.1,
    armLength: 0.7,
    armWidth: 0.15,
    forearmLength: 0.6,
    handSize: 0.2,
    legLength: 0.5,
    legWidth: 0.18,
    lowerLegLength: 0.45,
    footSize: 0.25,
    headWidth: 0.5,
    headHeight: 0.55,
    headDepth: 0.4,
    jawHeight: 0.15,
    shoulderWidth: 0.9,
    hipWidth: 0.5,
  },
  [EnemyType.TELEPORTER]: {
    torsoHeight: 1.0,
    torsoWidth: 0.45,
    torsoDepth: 0.3,
    neckLength: 0.15,
    armLength: 0.75,
    armWidth: 0.1,
    forearmLength: 0.65,
    handSize: 0.16,
    legLength: 0.5,
    legWidth: 0.12,
    lowerLegLength: 0.5,
    footSize: 0.18,
    headWidth: 0.4,
    headHeight: 0.5,
    headDepth: 0.35,
    jawHeight: 0.15,
    shoulderWidth: 0.6,
    hipWidth: 0.3,
  },
};

interface BodyParts {
  torso: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Mesh;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
  leftClaws: THREE.Group;
  rightClaws: THREE.Group;
}

function createVeinTexture(type: EnemyType): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(18, 14, 12)'; // Color base uniforme oscuro
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#0d0a08'; // Venas uniformes, apenas visibles
  ctx.lineWidth = 2;

  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);

    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 40;
      y += Math.random() * 30 + 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(${type === EnemyType.RUNNER ? '60, 0, 0' : type === EnemyType.STALKER ? '0, 50, 0' : '50, 0, 60'}, 0.3)`;
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 15 + 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

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

const _faceTextureCache = new Map<EnemyType, THREE.CanvasTexture>();
const _veinTextureCache = new Map<EnemyType, THREE.CanvasTexture>();

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
  private bodyParts: BodyParts | null = null;

  static preloadTextures(): void {
    for (const t of [EnemyType.RUNNER, EnemyType.STALKER, EnemyType.TELEPORTER]) {
      if (!_faceTextureCache.has(t)) {
        _faceTextureCache.set(t, createScaryFaceTexture(t));
      }
      if (!_veinTextureCache.has(t)) {
        _veinTextureCache.set(t, createVeinTexture(t));
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

  private createDetailedArm(
    isLeft: boolean,
    p: EnemyProportions,
    bodyColor: number,
    veinTexture: THREE.CanvasTexture
  ): { group: THREE.Group; forearmGroup: THREE.Group; handGroup: THREE.Group; clawsGroup: THREE.Group } {
    const side = isLeft ? -1 : 1;
    const armGroup = new THREE.Group();

    const shoulderGeom = new THREE.SphereGeometry(p.armWidth * 1.2, 8, 6);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.75,
      metalness: 0.1,
    });
    const shoulder = new THREE.Mesh(shoulderGeom, shoulderMat);
    shoulder.scale.set(1, 0.8, 0.9);
    shoulder.castShadow = true;
    armGroup.add(shoulder);

    const upperArmGeom = new THREE.CylinderGeometry(p.armWidth * 0.85, p.armWidth, p.armLength, 8);
    const upperArmMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
      map: veinTexture,
    });
    const upperArm = new THREE.Mesh(upperArmGeom, upperArmMat);
    upperArm.position.y = -p.armLength / 2 - p.armWidth * 0.3;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    const elbowGeom = new THREE.SphereGeometry(p.armWidth * 0.9, 8, 6);
    const elbow = new THREE.Mesh(elbowGeom, shoulderMat.clone());
    elbow.position.y = -p.armLength - p.armWidth * 0.3;
    elbow.scale.set(1.1, 0.7, 1.1);
    elbow.castShadow = true;
    armGroup.add(elbow);

    const forearmGroup = new THREE.Group();
    forearmGroup.position.y = -p.armLength - p.armWidth * 0.3;

    const forearmGeom = new THREE.CylinderGeometry(p.armWidth * 0.7, p.armWidth * 0.6, p.forearmLength, 8);
    const forearmMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.85,
      metalness: 0.05,
      map: veinTexture,
    });
    const forearm = new THREE.Mesh(forearmGeom, forearmMat);
    forearm.position.y = -p.forearmLength / 2;
    forearm.castShadow = true;
    forearmGroup.add(forearm);

    const handGroup = new THREE.Group();
    handGroup.position.y = -p.forearmLength;

    const handGeom = this.type === EnemyType.RUNNER
      ? new THREE.BoxGeometry(p.handSize * 1.5, p.handSize * 0.4, p.handSize * 0.8)
      : this.type === EnemyType.STALKER
        ? new THREE.BoxGeometry(p.handSize * 1.3, p.handSize * 0.7, p.handSize * 1.2)
        : new THREE.SphereGeometry(p.handSize * 0.7, 6, 4);
    const handMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.15,
    });
    const hand = new THREE.Mesh(handGeom, handMat);
    hand.castShadow = true;
    handGroup.add(hand);

    const clawsGroup = new THREE.Group();
    clawsGroup.position.y = -p.handSize * 0.2;

    const clawCount = this.type === EnemyType.RUNNER ? 4 : this.type === EnemyType.STALKER ? 3 : 5;
    const clawColor = this.getEmissiveColor();

    for (let i = 0; i < clawCount; i++) {
      const clawGeom = new THREE.ConeGeometry(p.handSize * 0.08, p.handSize * 1.2, 4);
      const clawMat = new THREE.MeshStandardMaterial({
        color: clawColor,
        roughness: 0.4,
        metalness: 0.6,
        emissive: new THREE.Color(clawColor),
        emissiveIntensity: 0.3,
      });
      const claw = new THREE.Mesh(clawGeom, clawMat);
      const spread = (i - (clawCount - 1) / 2) * p.handSize * 0.4;
      claw.position.set(spread, -p.handSize * 0.6, p.handSize * 0.3);
      claw.rotation.x = Math.PI * 0.6;
      claw.castShadow = true;
      clawsGroup.add(claw);
    }

    handGroup.add(clawsGroup);
    forearmGroup.add(handGroup);
    armGroup.add(forearmGroup);

    armGroup.position.x = side * p.shoulderWidth / 2;

    return { group: armGroup, forearmGroup, handGroup, clawsGroup };
  }

  private createDetailedLeg(
    isLeft: boolean,
    p: EnemyProportions,
    bodyColor: number,
    veinTexture: THREE.CanvasTexture
  ): { group: THREE.Group; lowerLegGroup: THREE.Group; foot: THREE.Mesh } {
    const side = isLeft ? -1 : 1;
    const legGroup = new THREE.Group();

    const hipGeom = new THREE.SphereGeometry(p.legWidth * 1.3, 8, 6);
    const hipMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.75,
      metalness: 0.1,
    });
    const hip = new THREE.Mesh(hipGeom, hipMat);
    hip.scale.set(0.9, 0.7, 1);
    hip.castShadow = true;
    legGroup.add(hip);

    const upperLegGeom = new THREE.CylinderGeometry(p.legWidth * 0.9, p.legWidth * 0.85, p.legLength, 8);
    const upperLegMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
      map: veinTexture,
    });
    const upperLeg = new THREE.Mesh(upperLegGeom, upperLegMat);
    upperLeg.position.y = -p.legLength / 2;
    upperLeg.castShadow = true;
    legGroup.add(upperLeg);

    const kneeGeom = new THREE.SphereGeometry(p.legWidth * 0.95, 8, 6);
    const knee = new THREE.Mesh(kneeGeom, hipMat.clone());
    knee.position.y = -p.legLength;
    knee.scale.set(1.1, 0.8, 1.1);
    knee.castShadow = true;
    legGroup.add(knee);

    const lowerLegGroup = new THREE.Group();
    lowerLegGroup.position.y = -p.legLength;

    const lowerLegGeom = new THREE.CylinderGeometry(p.legWidth * 0.8, p.legWidth * 0.7, p.lowerLegLength, 8);
    const lowerLegMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.85,
      metalness: 0.05,
      map: veinTexture,
    });
    const lowerLeg = new THREE.Mesh(lowerLegGeom, lowerLegMat);
    lowerLeg.position.y = -p.lowerLegLength / 2;
    lowerLeg.castShadow = true;
    lowerLegGroup.add(lowerLeg);

    const ankleGeom = new THREE.SphereGeometry(p.legWidth * 0.75, 6, 4);
    const ankle = new THREE.Mesh(ankleGeom, hipMat.clone());
    ankle.position.y = -p.lowerLegLength;
    ankle.scale.set(0.8, 0.6, 0.8);
    ankle.castShadow = true;
    lowerLegGroup.add(ankle);

    const footGeom = this.type === EnemyType.RUNNER
      ? new THREE.BoxGeometry(p.footSize * 0.5, p.footSize * 0.3, p.footSize * 1.8)
      : this.type === EnemyType.STALKER
        ? new THREE.BoxGeometry(p.footSize * 1.2, p.footSize * 0.6, p.footSize * 1.5)
        : new THREE.BoxGeometry(p.footSize, p.footSize * 0.4, p.footSize * 1.3);
    const footMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.15,
    });
    const foot = new THREE.Mesh(footGeom, footMat);
    foot.position.set(0, -p.lowerLegLength - p.footSize * 0.3, p.footSize * 0.3);
    foot.castShadow = true;
    lowerLegGroup.add(foot);

    legGroup.position.x = side * p.hipWidth / 2;

    return { group: legGroup, lowerLegGroup, foot };
  }

  private createDetailedHead(
    p: EnemyProportions,
    faceTexture: THREE.CanvasTexture,
    bodyColor: number
  ): { group: THREE.Group; jaw: THREE.Mesh } {
    const headGroup = new THREE.Group();

    const neckGeom = new THREE.CylinderGeometry(p.headWidth * 0.35, p.headWidth * 0.4, p.neckLength, 8);
    const neckMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    const neck = new THREE.Mesh(neckGeom, neckMat);
    neck.position.y = p.neckLength / 2;
    neck.castShadow = true;
    headGroup.add(neck);

    const skullGeom = new THREE.BoxGeometry(p.headWidth, p.headHeight, p.headDepth);
    const skullMat = new THREE.MeshStandardMaterial({
      map: faceTexture,
      roughness: 0.7,
      metalness: 0.15,
      emissive: new THREE.Color(this.getEmissiveColor()),
      emissiveIntensity: 0.2,
    });
    const skull = new THREE.Mesh(skullGeom, skullMat);
    skull.position.y = p.neckLength + p.headHeight / 2;
    skull.castShadow = true;
    headGroup.add(skull);

    const browRidgeGeom = new THREE.BoxGeometry(p.headWidth * 1.1, p.headHeight * 0.15, p.headDepth * 0.4);
    const browRidgeMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.6,
      metalness: 0.2,
    });
    const browRidge = new THREE.Mesh(browRidgeGeom, browRidgeMat);
    browRidge.position.set(0, p.neckLength + p.headHeight * 0.85, p.headDepth * 0.4);
    browRidge.castShadow = true;
    headGroup.add(browRidge);

    if (this.type === EnemyType.RUNNER) {
      for (let side = -1; side <= 1; side += 2) {
        const hornGeom = new THREE.ConeGeometry(0.05, 0.25, 6);
        const hornMat = new THREE.MeshStandardMaterial({
          color: 0x220000,
          roughness: 0.4,
          metalness: 0.5,
        });
        const horn = new THREE.Mesh(hornGeom, hornMat);
        horn.position.set(side * p.headWidth * 0.6, p.neckLength + p.headHeight * 1.1, -p.headDepth * 0.2);
        horn.rotation.z = side * 0.3;
        horn.castShadow = true;
        headGroup.add(horn);
      }
    } else if (this.type === EnemyType.STALKER) {
      for (let side = -1; side <= 1; side += 2) {
        const earGeom = new THREE.BoxGeometry(0.08, 0.2, 0.05);
        const earMat = new THREE.MeshStandardMaterial({
          color: bodyColor,
          roughness: 0.7,
          metalness: 0.1,
        });
        const ear = new THREE.Mesh(earGeom, earMat);
        ear.position.set(side * p.headWidth * 0.65, p.neckLength + p.headHeight * 0.7, -p.headDepth * 0.3);
        ear.rotation.z = side * 0.4;
        ear.castShadow = true;
        headGroup.add(ear);
      }
    } else {
      const crystalGeom = new THREE.OctahedronGeometry(0.1, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xaa00ff,
        roughness: 0.2,
        metalness: 0.8,
        emissive: new THREE.Color(0x5500aa),
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      });
      for (let i = 0; i < 3; i++) {
        const crystal = new THREE.Mesh(crystalGeom, crystalMat);
        crystal.position.set(
          (Math.random() - 0.5) * p.headWidth * 0.6,
          p.neckLength + p.headHeight * (0.9 + i * 0.15),
          (Math.random() - 0.5) * p.headDepth * 0.3
        );
        crystal.rotation.set(Math.random(), Math.random(), Math.random());
        crystal.scale.setScalar(0.5 + Math.random() * 0.5);
        crystal.castShadow = true;
        headGroup.add(crystal);
      }
    }

    const jawGroup = new THREE.Group();
    jawGroup.position.y = p.neckLength + p.headHeight * 0.2;

    const jawGeom = new THREE.BoxGeometry(p.headWidth * 0.9, p.jawHeight, p.headDepth * 0.7);
    const jawMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.75,
      metalness: 0.1,
    });
    const jaw = new THREE.Mesh(jawGeom, jawMat);
    jaw.position.y = -p.jawHeight / 2;
    jaw.castShadow = true;
    jawGroup.add(jaw);

    const teethGeom = new THREE.BoxGeometry(p.headWidth * 0.7, p.jawHeight * 0.4, p.headDepth * 0.5);
    const teethMat = new THREE.MeshStandardMaterial({
      color: this.getEmissiveColor(),
      roughness: 0.3,
      metalness: 0.3,
      emissive: new THREE.Color(this.getEmissiveColor()),
      emissiveIntensity: 0.3,
    });
    const teeth = new THREE.Mesh(teethGeom, teethMat);
    teeth.position.set(0, p.jawHeight * 0.2, p.headDepth * 0.35);
    jawGroup.add(teeth);

    headGroup.add(jawGroup);

    return { group: headGroup, jaw };
  }

  private createDetailedTorso(
    p: EnemyProportions,
    bodyColor: number,
    veinTexture: THREE.CanvasTexture
  ): THREE.Group {
    const torsoGroup = new THREE.Group();

    const chestGeom = new THREE.BoxGeometry(p.torsoWidth, p.torsoHeight * 0.7, p.torsoDepth);
    const chestMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.75,
      metalness: 0.15,
      map: veinTexture,
    });
    const chest = new THREE.Mesh(chestGeom, chestMat);
    chest.position.y = p.torsoHeight * 0.15;
    chest.castShadow = true;
    torsoGroup.add(chest);

    const ribcageGeom = new THREE.BoxGeometry(p.torsoWidth * 0.85, p.torsoHeight * 0.5, p.torsoDepth * 0.5);
    const ribcageMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7,
    });
    const ribcage = new THREE.Mesh(ribcageGeom, ribcageMat);
    ribcage.position.set(0, p.torsoHeight * 0.25, p.torsoDepth * 0.15);
    ribcage.castShadow = true;
    torsoGroup.add(ribcage);

    const abdomenGeom = new THREE.BoxGeometry(p.torsoWidth * 0.9, p.torsoHeight * 0.4, p.torsoDepth * 0.85);
    const abdomen = new THREE.Mesh(abdomenGeom, chestMat.clone());
    abdomen.position.y = -p.torsoHeight * 0.3;
    abdomen.castShadow = true;
    torsoGroup.add(abdomen);

    if (this.type === EnemyType.STALKER) {
      const humpGeom = new THREE.SphereGeometry(p.torsoWidth * 0.4, 8, 6);
      const humpMat = new THREE.MeshStandardMaterial({
        color: bodyColor,
        roughness: 0.8,
        metalness: 0.1,
      });
      const hump = new THREE.Mesh(humpGeom, humpMat);
      hump.position.set(0, p.torsoHeight * 0.4, -p.torsoDepth * 0.6);
      hump.scale.set(1, 0.6, 0.8);
      hump.castShadow = true;
      torsoGroup.add(hump);
    }

    const pelvisGeom = new THREE.BoxGeometry(p.torsoWidth * 0.95, p.torsoHeight * 0.25, p.torsoDepth * 0.75);
    const pelvisMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    const pelvis = new THREE.Mesh(pelvisGeom, pelvisMat);
    pelvis.position.y = -p.torsoHeight * 0.5;
    pelvis.castShadow = true;
    torsoGroup.add(pelvis);

    return torsoGroup;
  }

  private createMesh(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    const faceTexture = _faceTextureCache.get(this.type) ?? createScaryFaceTexture(this.type);
    const veinTexture = _veinTextureCache.get(this.type) ?? createVeinTexture(this.type);
    const p = ENEMY_PROPORTIONS[this.type];
    const bodyColor = this.getBodyColor();

    const totalHeight = p.legLength + p.lowerLegLength + p.torsoHeight + p.neckLength + p.headHeight;
    const torso = this.createDetailedTorso(p, bodyColor, veinTexture);
    torso.position.y = p.legLength + p.lowerLegLength + p.torsoHeight / 2;
    group.add(torso);

    const headData = this.createDetailedHead(p, faceTexture, bodyColor);
    headData.group.position.y = p.legLength + p.lowerLegLength + p.torsoHeight + p.neckLength / 2;
    group.add(headData.group);

    const leftArmData = this.createDetailedArm(true, p, bodyColor, veinTexture);
    leftArmData.group.position.y = p.legLength + p.lowerLegLength + p.torsoHeight * 0.85;
    group.add(leftArmData.group);

    const rightArmData = this.createDetailedArm(false, p, bodyColor, veinTexture);
    rightArmData.group.position.y = p.legLength + p.lowerLegLength + p.torsoHeight * 0.85;
    group.add(rightArmData.group);

    const leftLegData = this.createDetailedLeg(true, p, bodyColor, veinTexture);
    leftLegData.group.position.y = p.legLength + p.lowerLegLength;
    group.add(leftLegData.group);

    const rightLegData = this.createDetailedLeg(false, p, bodyColor, veinTexture);
    rightLegData.group.position.y = p.legLength + p.lowerLegLength;
    group.add(rightLegData.group);

    this.bodyParts = {
      torso,
      head: headData.group,
      jaw: headData.jaw,
      leftShoulder: leftArmData.group,
      rightShoulder: rightArmData.group,
      leftArm: leftArmData.group,
      rightArm: rightArmData.group,
      leftForearm: leftArmData.forearmGroup,
      rightForearm: rightArmData.forearmGroup,
      leftHand: leftArmData.handGroup,
      rightHand: rightArmData.handGroup,
      leftHip: leftLegData.group,
      rightHip: rightLegData.group,
      leftLeg: leftLegData.group,
      rightLeg: rightLegData.group,
      leftLowerLeg: leftLegData.lowerLegGroup,
      rightLowerLeg: rightLegData.lowerLegGroup,
      leftFoot: leftLegData.foot,
      rightFoot: rightLegData.foot,
      leftClaws: leftArmData.clawsGroup,
      rightClaws: rightArmData.clawsGroup,
    };

    const glowColors: Record<EnemyType, number> = {
      [EnemyType.RUNNER]: 0xff0000,
      [EnemyType.STALKER]: 0x44ff00,
      [EnemyType.TELEPORTER]: 0xff00ff,
    };

    const light = new THREE.PointLight(glowColors[this.type], 1.5, 8);
    light.position.set(0, totalHeight * 0.7, 0.6);
    light.castShadow = false;
    group.add(light);

    const secondaryLight = new THREE.PointLight(glowColors[this.type], 0.5, 4);
    secondaryLight.position.set(0, totalHeight * 0.5, 0.3);
    group.add(secondaryLight);

    const auraSize = p.torsoWidth * 2;
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
        (Math.random() - 0.5) * p.torsoWidth * 2,
        Math.random() * totalHeight,
        (Math.random() - 0.5) * p.torsoWidth + 0.3
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
    return 0x0d0d0d; // Negro uniforme — sin pistas visuales de tipo
  }

  private getEmissiveColor(): number {
    return 0x000000; // Sin brillo — todos igual de oscuros
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
          const newPos = this.position.clone().addScaledVector(dir, moveAmount);

          if (!this.checkWallCollision(newPos)) {
            this.position.copy(newPos);
            this.mesh.position.copy(this.position);
            this.isMoving = true;
            this.stuckTimer = 0;
          } else {
            // Wall slide: probar solo X o solo Z antes de escapeStuck
            const newPosX = this.position.clone();
            newPosX.x += dir.x * moveAmount;
            const newPosZ = this.position.clone();
            newPosZ.z += dir.z * moveAmount;

            if (!this.checkWallCollision(newPosX)) {
              this.position.copy(newPosX);
              this.mesh.position.copy(this.position);
              this.isMoving = true;
              this.stuckTimer = 0;
            } else if (!this.checkWallCollision(newPosZ)) {
              this.position.copy(newPosZ);
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
        const moveAmount = currentSpeed * delta;
        const newPos = this.position.clone().addScaledVector(dir, moveAmount);
        if (!this.checkWallCollision(newPos)) {
          this.position.copy(newPos);
          this.mesh.position.copy(this.position);
        } else {
          const newPosX = this.position.clone();
          newPosX.x += dir.x * moveAmount;
          const newPosZ = this.position.clone();
          newPosZ.z += dir.z * moveAmount;
          if (!this.checkWallCollision(newPosX)) {
            this.position.copy(newPosX);
            this.mesh.position.copy(this.position);
          } else if (!this.checkWallCollision(newPosZ)) {
            this.position.copy(newPosZ);
            this.mesh.position.copy(this.position);
          }
        }
        this.mesh.lookAt(new THREE.Vector3(this.lastKnownPlayerPos.x, this.mesh.position.y, this.lastKnownPlayerPos.z));
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
    const bp = this.bodyParts;

    if (this.isMoving) {
      const walkSpeed = this.type === EnemyType.RUNNER ? 12 : (this.type === EnemyType.STALKER ? 3 : 6);
      const legSwing = this.type === EnemyType.RUNNER ? 0.5 : (this.type === EnemyType.STALKER ? 0.15 : 0.35);
      const armSwing = this.type === EnemyType.RUNNER ? 0.35 : (this.type === EnemyType.STALKER ? 0.1 : 0.25);
      const forearmSwing = this.type === EnemyType.RUNNER ? 0.3 : (this.type === EnemyType.STALKER ? 0.05 : 0.2);
      const bounce = this.type === EnemyType.RUNNER ? 0.08 : (this.type === EnemyType.STALKER ? 0.015 : 0.04);

      if (bp) {
        bp.leftLeg.rotation.x = Math.sin(t * walkSpeed) * legSwing;
        bp.rightLeg.rotation.x = Math.sin(t * walkSpeed + Math.PI) * legSwing;
        bp.leftLowerLeg.rotation.x = Math.max(0, Math.sin(t * walkSpeed + Math.PI * 0.5) * 0.3);
        bp.rightLowerLeg.rotation.x = Math.max(0, Math.sin(t * walkSpeed + Math.PI * 1.5) * 0.3);

        bp.leftArm.rotation.x = Math.sin(t * walkSpeed + Math.PI) * armSwing;
        bp.rightArm.rotation.x = Math.sin(t * walkSpeed) * armSwing;
        bp.leftForearm.rotation.x = Math.sin(t * walkSpeed + Math.PI * 0.5) * forearmSwing + 0.2;
        bp.rightForearm.rotation.x = Math.sin(t * walkSpeed + Math.PI * 1.5) * forearmSwing + 0.2;

        bp.leftHand.rotation.z = Math.sin(t * walkSpeed * 2) * 0.1;
        bp.rightHand.rotation.z = Math.sin(t * walkSpeed * 2 + Math.PI) * 0.1;

        this.mesh.position.y = Math.abs(Math.sin(t * walkSpeed * 2)) * bounce;
      }
    } else {
      if (bp) {
        bp.leftLeg.rotation.x = 0;
        bp.rightLeg.rotation.x = 0;
        bp.leftLowerLeg.rotation.x = 0;
        bp.rightLowerLeg.rotation.x = 0;

        bp.leftArm.rotation.x = 0;
        bp.rightArm.rotation.x = 0;
        bp.leftForearm.rotation.x = this.type === EnemyType.RUNNER ? -0.5 : (this.type === EnemyType.STALKER ? 0.2 : -0.3);
        bp.rightForearm.rotation.x = bp.leftForearm.rotation.x;

        bp.leftHand.rotation.z = 0;
        bp.rightHand.rotation.z = 0;
        this.mesh.position.y = 0;
      }
    }

    if (this.type === EnemyType.TELEPORTER) {
      if (bp) {
        if (this.isMoving) {
          bp.leftArm.rotation.x = Math.sin(t * 6) * 0.15;
          bp.rightArm.rotation.x = Math.sin(t * 6 + Math.PI) * 0.15;
          bp.leftForearm.rotation.x = Math.sin(t * 4) * 0.2 + 0.3;
          bp.rightForearm.rotation.x = Math.sin(t * 4 + Math.PI) * 0.2 + 0.3;
        } else {
          bp.leftArm.rotation.x = Math.sin(t * 1.5) * 0.2;
          bp.rightArm.rotation.x = Math.sin(t * 1.5 + Math.PI) * 0.2;
          bp.leftForearm.rotation.x = Math.sin(t * 2) * 0.3 + 0.4;
          bp.rightForearm.rotation.x = Math.sin(t * 2 + Math.PI) * 0.3 + 0.4;
        }
        bp.leftLeg.rotation.x = Math.sin(t * 1.2) * 0.1;
        bp.rightLeg.rotation.x = Math.sin(t * 1.2 + Math.PI) * 0.1;
        bp.leftLowerLeg.rotation.x = Math.sin(t * 1.8) * 0.15;
        bp.rightLowerLeg.rotation.x = Math.sin(t * 1.8 + Math.PI) * 0.15;
      }
      this.mesh.rotation.y += delta * 0.5;
    } else if (this.type === EnemyType.RUNNER && !this.isMoving) {
      if (bp) {
        bp.leftArm.rotation.x = -0.6;
        bp.rightArm.rotation.x = -0.6;
        bp.leftForearm.rotation.x = -0.4;
        bp.rightForearm.rotation.x = -0.4;
      }
    } else if (this.type === EnemyType.STALKER && !this.isMoving) {
      if (bp) {
        bp.leftArm.rotation.x = 0.3;
        bp.rightArm.rotation.x = 0.3;
        bp.leftForearm.rotation.x = 0.4;
        bp.rightForearm.rotation.x = 0.4;
      }
    }

    if (bp && bp.head) {
      if (this.type === EnemyType.STALKER) {
        bp.head.rotation.y = Math.sin(t * 0.5) * 0.1;
      } else if (this.type === EnemyType.RUNNER) {
        bp.head.rotation.x = Math.sin(t * 2) * 0.08;
      } else if (this.type === EnemyType.TELEPORTER) {
        bp.head.rotation.y += delta * 0.3;
      }
    }

    if (bp && bp.jaw) {
      if (this.type === EnemyType.RUNNER) {
        bp.jaw.rotation.x = Math.sin(t * 3) * 0.1 + 0.1;
      } else if (this.type === EnemyType.TELEPORTER) {
        bp.jaw.rotation.x = Math.sin(t * 2) * 0.15;
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
      const cell = this.maze[cellZ][cellX];
      return cell === CellType.WALL || cell === CellType.RENDIJA;
    }

    return true;
  }

  private findPathStep(targetPos: THREE.Vector3): THREE.Vector3 | null {
    const startX = Math.round(this.position.x / CONFIG.UNIT_SIZE);
    const startZ = Math.round(this.position.z / CONFIG.UNIT_SIZE);
    const endX = Math.round(targetPos.x / CONFIG.UNIT_SIZE);
    const endZ = Math.round(targetPos.z / CONFIG.UNIT_SIZE);

    if (startX === endX && startZ === endZ) return null;
    const endCell = this.maze[endZ]?.[endX];
    if (endCell === CellType.WALL || endCell === CellType.RENDIJA) return null;

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
        const neighborCell = this.maze[neighbor.z][neighbor.x];
        if (neighborCell === CellType.WALL || neighborCell === CellType.RENDIJA) continue;

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

  // ── Eat / jumpscare animation ──────────────────────────────────────────────
  private _eatActive  = false;
  private _eatTimer   = 0;
  private _eatBiteDone = false;
  private _eatCamera: THREE.PerspectiveCamera | null = null;
  private _eatOnBite: (() => void) | null = null;
  static readonly EAT_DURATION = 1.6;

  startEatAnimation(camera: THREE.PerspectiveCamera, onBite: () => void): void {
    this._eatCamera  = camera;
    this._eatOnBite  = onBite;
    this._eatTimer   = 0;
    this._eatActive  = true;
    this._eatBiteDone = false;

    // Colocar el enemigo justo delante de la cámara
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    this.mesh.position.copy(camera.position).addScaledVector(camDir, 3.5);
    this.mesh.position.y = 0;
    this.position.copy(this.mesh.position);
    this.mesh.lookAt(new THREE.Vector3(camera.position.x, 0, camera.position.z));

    // Brazos extendidos hacia adelante desde el inicio
    if (this.bodyParts) {
      this.bodyParts.leftArm.rotation.x  = -0.8;
      this.bodyParts.rightArm.rotation.x = -0.8;
      this.bodyParts.leftForearm.rotation.x  = -0.4;
      this.bodyParts.rightForearm.rotation.x = -0.4;
      this.bodyParts.head.rotation.x = 0;
    }
  }

  /** Llamar cada frame desde Game durante el jumpscare. Devuelve false cuando termina. */
  updateEatAnimation(delta: number): boolean {
    if (!this._eatActive || !this._eatCamera) return false;

    this._eatTimer += delta;
    const t = Math.min(1, this._eatTimer / Enemy.EAT_DURATION);

    const camDir = new THREE.Vector3();
    this._eatCamera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    // Easing: lento al inicio, aceleración en la última mitad
    const eased = t < 0.25 ? t * t * 0.5 : 0.03125 + (t - 0.25) * 1.29;
    const dist = 3.5 - eased * 4.2; // 3.5 → -0.7

    this.mesh.position.copy(this._eatCamera.position).addScaledVector(camDir, dist);
    this.mesh.position.y = 0;
    this.mesh.lookAt(new THREE.Vector3(
      this._eatCamera.position.x, 0, this._eatCamera.position.z
    ));

    // Abrir la mandíbula progresivamente
    if (this.bodyParts) {
      const jawGroup = this.bodyParts.jaw.parent as THREE.Group | null;
      if (jawGroup) {
        jawGroup.rotation.x = Math.min(1, t * 1.8) * 1.0; // hasta ~57° abierto
      }

      // Brazos se lanzan hacia la cámara
      const reach = Math.min(1, t * 2.2);
      this.bodyParts.leftArm.rotation.x  = -0.8 - reach * 1.4;
      this.bodyParts.rightArm.rotation.x = -0.8 - reach * 1.4;
      this.bodyParts.leftForearm.rotation.x  = -0.4 - reach * 1.0;
      this.bodyParts.rightForearm.rotation.x = -0.4 - reach * 1.0;

      // Cabeza se inclina al morder
      if (t > 0.45) {
        this.bodyParts.head.rotation.x = ((t - 0.45) / 0.55) * 0.5;
      }
    }

    // Disparar callback de mordida al 65%
    if (!this._eatBiteDone && t >= 0.65) {
      this._eatBiteDone = true;
      this._eatOnBite?.();
    }

    if (t >= 1) {
      this._eatActive = false;
      return false;
    }
    return true;
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
