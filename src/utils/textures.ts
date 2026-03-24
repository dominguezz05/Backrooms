import * as THREE from 'three';

export type LevelType = 'level1' | 'level2' | 'level3' | 'level4' | 'ultimate';

// Cache por nivel — se genera una sola vez por sesión y se reutiliza en todos los tiles
const _textureCache = new Map<string, THREE.CanvasTexture>();

export function createFloorTexture(level: LevelType = 'level1', seed: number = Math.random()): THREE.CanvasTexture {
  const key = `floor_${level}`;
  const cached = _textureCache.get(key);
  if (cached) return cached;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const floorConfigs: Record<LevelType, { base: string; variant: string; pattern: string }[]> = {
    level1: [
      { base: '#8b7355', variant: '#9b8365', pattern: 'carpet' },
      { base: '#7a6a50', variant: '#8a7a60', pattern: 'tile' },
      { base: '#9b8b70', variant: '#ab9b80', pattern: 'wood' },
    ],
    level2: [
      { base: '#6b7b6b', variant: '#7b8b7b', pattern: 'office' },
      { base: '#5a6a5a', variant: '#6a7a6a', pattern: 'tile' },
      { base: '#7b8b7b', variant: '#8b9b8b', pattern: 'carpet' },
    ],
    level3: [
      { base: '#5a6a7a', variant: '#6a7a8a', pattern: 'concrete' },
      { base: '#4a5a6a', variant: '#5a6a7a', pattern: 'metal' },
      { base: '#6a7a8a', variant: '#7a8a9a', pattern: 'tile' },
    ],
    level4: [
      { base: '#0a0808', variant: '#100c0c', pattern: 'char' },
      { base: '#080808', variant: '#0e0e0e', pattern: 'tile' },
      { base: '#0c0a0a', variant: '#120e0e', pattern: 'blood' },
    ],
    ultimate: [
      { base: '#4a3030', variant: '#5a4040', pattern: 'blood' },
      { base: '#3a2020', variant: '#4a3030', pattern: 'char' },
      { base: '#5a3535', variant: '#6a4545', pattern: 'tile' },
    ],
  };

  const configs = floorConfigs[level];
  const config = configs[Math.floor(seed * configs.length)];
  
  ctx.fillStyle = seed > 0.5 ? config.variant : config.base;
  ctx.fillRect(0, 0, size, size);

  if (config.pattern === 'carpet') {
    for (let y = 0; y < size; y += 4) {
      ctx.strokeStyle = seed > 0.3 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (config.pattern === 'tile') {
    const tileSize = 32 + Math.floor(seed * 32);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= size; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (config.pattern === 'wood') {
    for (let i = 0; i < 8; i++) {
      const y = i * 32 + seed * 20;
      ctx.strokeStyle = `rgba(60,40,20,${0.3 + seed * 0.3})`;
      ctx.lineWidth = 2 + seed * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + seed * 10, size * 0.7, y - seed * 10, size, y + seed * 5);
      ctx.stroke();
    }
  } else if (config.pattern === 'concrete') {
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '80,80,80' : '40,40,40'},${0.1 + seed * 0.2})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 20 + 5, Math.random() * 20 + 5);
    }
  } else if (config.pattern === 'metal') {
    for (let x = 0; x < size; x += 8) {
      ctx.strokeStyle = `rgba(100,110,120,${0.2 + seed * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  } else if (config.pattern === 'blood') {
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${120 + seed * 80},0,0,${0.3 + seed * 0.4})`;
      ctx.beginPath();
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const r = 5 + seed * 25;
      ctx.ellipse(cx, cy, r, r * (0.5 + seed), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (config.pattern === 'char') {
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(${20 + seed * 30},${10 + seed * 20},${10 + seed * 20},${0.3 + seed * 0.5})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 15 + 2, Math.random() * 15 + 2);
    }
  }

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random() * 30 - 15;
    const baseR = parseInt(config.base.slice(1, 3), 16);
    const baseG = parseInt(config.base.slice(3, 5), 16);
    const baseB = parseInt(config.base.slice(5, 7), 16);
    ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, baseR + brightness))},${Math.min(255, Math.max(0, baseG + brightness))},${Math.min(255, Math.max(0, baseB + brightness))})`;
    ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  _textureCache.set(key, texture);
  return texture;
}

export function createWallTexture(level: LevelType = 'level1', seed: number = Math.random()): THREE.CanvasTexture {
  const key = `wall_${level}`;
  const cached = _textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const wallConfigs: Record<LevelType, { base: string; variant: string; accent: string; style: string }[]> = {
    level1: [
      { base: '#a09080', variant: '#b0a090', accent: '#8a7a6a', style: 'paper' },
      { base: '#9a8a7a', variant: '#aa9a8a', accent: '#7a6a5a', style: 'brick' },
      { base: '#b0a090', variant: '#c0b0a0', accent: '#908070', style: 'panel' },
    ],
    level2: [
      { base: '#8090a0', variant: '#90a0b0', accent: '#607080', style: 'office' },
      { base: '#708080', variant: '#809090', accent: '#506060', style: 'tile' },
      { base: '#90a090', variant: '#a0b0a0', accent: '#708070', style: 'panel' },
    ],
    level3: [
      { base: '#606a7a', variant: '#707a8a', accent: '#404a5a', style: 'concrete' },
      { base: '#505a6a', variant: '#606a7a', accent: '#303a4a', style: 'metal' },
      { base: '#706a7a', variant: '#807a8a', accent: '#504a5a', style: 'pipes' },
    ],
    level4: [
      { base: '#080808', variant: '#0e0a0a', accent: '#040404', style: 'dark' },
      { base: '#060404', variant: '#0c0808', accent: '#030303', style: 'burned' },
      { base: '#0a0808', variant: '#100c0c', accent: '#050404', style: 'dark' },
    ],
    ultimate: [
      { base: '#4a3030', variant: '#5a4040', accent: '#2a1010', style: 'bloody' },
      { base: '#3a2020', variant: '#4a3030', accent: '#1a0000', style: 'burned' },
      { base: '#2a1515', variant: '#3a2525', accent: '#1a0505', style: 'dark' },
    ],
  };

  const configs = wallConfigs[level];
  const config = configs[Math.floor(seed * configs.length)];

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, config.variant);
  gradient.addColorStop(0.5, config.base);
  gradient.addColorStop(1, config.accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  if (config.style === 'paper') {
    for (let x = 0; x < size; x += 32) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  } else if (config.style === 'brick') {
    const brickH = 16;
    for (let y = 0; y < size; y += brickH) {
      const offset = (Math.floor(y / brickH) % 2) * 16;
      for (let x = -offset; x < size; x += 32) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 32, brickH);
      }
    }
  } else if (config.style === 'concrete') {
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '70,70,70' : '50,50,50'},${0.1 + seed * 0.15})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 30 + 5, Math.random() * 10 + 2);
    }
  } else if (config.style === 'metal') {
    for (let x = 0; x < size; x += 16) {
      ctx.strokeStyle = `rgba(120,130,140,${0.2 + seed * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += 64) {
      ctx.strokeStyle = `rgba(80,90,100,${0.3 + seed * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (config.style === 'pipes') {
    ctx.strokeStyle = 'rgba(60,60,70,0.6)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(size * 0.3, 0);
    ctx.lineTo(size * 0.3, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.7, 0);
    ctx.lineTo(size * 0.7, size);
    ctx.stroke();
  } else if (config.style === 'bloody') {
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${150 + seed * 50},0,0,${0.3 + seed * 0.4})`;
      ctx.beginPath();
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      ctx.ellipse(cx, cy, 3 + seed * 15, 5 + seed * 25, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (config.style === 'burned') {
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(${20 + seed * 30},${10 + seed * 15},${10 + seed * 15},${0.4 + seed * 0.4})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 20 + 3, Math.random() * 20 + 3);
    }
  }

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random() * 25 - 12;
    const baseR = parseInt(config.base.slice(1, 3), 16);
    const baseG = parseInt(config.base.slice(3, 5), 16);
    const baseB = parseInt(config.base.slice(5, 7), 16);
    ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, baseR + brightness))},${Math.min(255, Math.max(0, baseG + brightness))},${Math.min(255, Math.max(0, baseB + brightness))})`;
    ctx.fillRect(x, y, 2, 2);
  }

  if (level === 'level1' || level === 'ultimate') {
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = Math.random() * 20 + 5;
      const bloodGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      bloodGrad.addColorStop(0, `rgba(${180 + seed * 50},0,0,${0.4 + seed * 0.3})`);
      bloodGrad.addColorStop(0.5, `rgba(100,0,0,${0.2 + seed * 0.2})`);
      bloodGrad.addColorStop(1, 'rgba(50,0,0,0)');
      ctx.fillStyle = bloodGrad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  _textureCache.set(key, texture);
  return texture;
}

export function createCeilingTexture(level: LevelType = 'level1', seed: number = Math.random()): THREE.CanvasTexture {
  const key = `ceiling_${level}`;
  const cached = _textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const ceilingConfigs: Record<LevelType, { base: string; variant: string; accent: string; detail: string }[]> = {
    level1: [
      { base: '#1a1a1a', variant: '#252525', accent: '#151515', detail: 'tiles' },
      { base: '#202020', variant: '#2a2a2a', accent: '#181818', detail: 'pipes' },
      { base: '#181818', variant: '#222222', accent: '#121212', detail: 'plain' },
    ],
    level2: [
      { base: '#1a1f1a', variant: '#252f25', accent: '#151f15', detail: 'tiles' },
      { base: '#1a201a', variant: '#243024', accent: '#141814', detail: 'pipes' },
      { base: '#151a15', variant: '#1f241f', accent: '#111411', detail: 'plain' },
    ],
    level3: [
      { base: '#1a1a25', variant: '#252530', accent: '#151520', detail: 'concrete' },
      { base: '#152025', variant: '#203035', accent: '#101820', detail: 'metal' },
      { base: '#101520', variant: '#182028', accent: '#0a1015', detail: 'pipes' },
    ],
    level4: [
      { base: '#050505', variant: '#080808', accent: '#030303', detail: 'dark' },
      { base: '#040404', variant: '#070707', accent: '#020202', detail: 'plain' },
      { base: '#060606', variant: '#090909', accent: '#040404', detail: 'burned' },
    ],
    ultimate: [
      { base: '#0a0505', variant: '#150a0a', accent: '#050000', detail: 'burned' },
      { base: '#080202', variant: '#120808', accent: '#040101', detail: 'char' },
      { base: '#0a0202', variant: '#100808', accent: '#050101', detail: 'dark' },
    ],
  };

  const configs = ceilingConfigs[level];
  const config = configs[Math.floor(seed * configs.length)];

  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.7);
  gradient.addColorStop(0, config.variant);
  gradient.addColorStop(1, config.base);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  if (config.detail === 'tiles') {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (config.detail === 'pipes') {
    ctx.strokeStyle = 'rgba(50,50,60,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(size * 0.2, 0);
    ctx.lineTo(size * 0.2, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.8, 0);
    ctx.lineTo(size * 0.8, size);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(size * 0.5, size);
    ctx.stroke();
  } else if (config.detail === 'metal') {
    for (let x = 0; x < size; x += 12) {
      ctx.strokeStyle = `rgba(80,90,100,${0.15 + seed * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  } else if (config.detail === 'concrete') {
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${30 + seed * 20},${30 + seed * 20},${35 + seed * 20},${0.2 + seed * 0.2})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 25 + 3, Math.random() * 25 + 3);
    }
  } else if (config.detail === 'burned' || config.detail === 'char') {
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${15 + seed * 25},${8 + seed * 15},${8 + seed * 15},${0.3 + seed * 0.4})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 18 + 2, Math.random() * 18 + 2);
    }
  }

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random() * 15 + 5;
    const baseR = parseInt(config.base.slice(1, 3), 16);
    const baseG = parseInt(config.base.slice(3, 5), 16);
    const baseB = parseInt(config.base.slice(5, 7), 16);
    ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, baseR + brightness))},${Math.min(255, Math.max(0, baseG + brightness))},${Math.min(255, Math.max(0, baseB + brightness))})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  _textureCache.set(key, texture);
  return texture;
}
