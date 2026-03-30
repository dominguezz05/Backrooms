import * as THREE from 'three';
import { CONFIG } from '../constants';
import { CellType } from '../types';

export interface ChunkConfig {
  chunkSize: number;
  renderDistance: number;
  instanceThreshold: number;
}

export interface ChunkObject {
  mesh: THREE.Object3D;
  isStatic: boolean;
  priority: 'high' | 'medium' | 'low';
  distanceCull?: number;
}

export class ChunkManager {
  private scene: THREE.Scene;
  private maze: number[][];
  private unitSize: number;
  private chunkSize: number;
  private renderDistance: number;
  private chunks: Map<string, Chunk> = new Map();
  private playerChunkX = -1;
  private playerChunkZ = -1;
  private instanceThreshold: number;

  private instancedWalls: THREE.InstancedMesh | null = null;
  private instancedFloors: THREE.InstancedMesh | null = null;
  private instancedCeilings: THREE.InstancedMesh | null = null;

  private matrix = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private quaternion = new THREE.Quaternion();
  private scale = new THREE.Vector3(1, 1, 1);
  private color = new THREE.Color();

  private decorativeObjects: ChunkObject[] = [];
  private lastVisibilityUpdate = 0;
  private readonly VISIBILITY_UPDATE_INTERVAL = 100;

  constructor(
    scene: THREE.Scene,
    maze: number[][],
    config: ChunkConfig = {
      chunkSize: 5,
      renderDistance: 3,
      instanceThreshold: 50
    }
  ) {
    this.scene = scene;
    this.maze = maze;
    this.unitSize = CONFIG.UNIT_SIZE;
    this.chunkSize = config.chunkSize;
    this.renderDistance = config.renderDistance;
    this.instanceThreshold = config.instanceThreshold;
  }

  getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  getChunkCoords(worldX: number, worldZ: number): { cx: number; cz: number } {
    return {
      cx: Math.floor(worldX / (this.chunkSize * this.unitSize)),
      cz: Math.floor(worldZ / (this.chunkSize * this.unitSize))
    };
  }

  createInstancedGeometry(): void {
    const cols = Math.ceil(this.maze[0].length / this.chunkSize);
    const rows = Math.ceil(this.maze.length / this.chunkSize);

    let wallCount = 0;
    let floorCount = 0;
    let ceilingCount = 0;

    for (let z = 0; z < this.maze.length; z++) {
      for (let x = 0; x < this.maze[z].length; x++) {
        const cell = this.maze[z][x];
        if (cell === CellType.WALL || cell === CellType.RENDIJA) wallCount++;
        floorCount++;
        ceilingCount++;
      }
    }

    console.log(`[ChunkManager] Creating instanced geometry: ${wallCount} walls, ${floorCount} floors, ${ceilingCount} ceilings`);

    const wallGeometry = new THREE.BoxGeometry(this.unitSize, CONFIG.WALL_HEIGHT, this.unitSize);
    const floorGeometry = new THREE.PlaneGeometry(this.unitSize, this.unitSize);
    const ceilingGeometry = new THREE.PlaneGeometry(this.unitSize, this.unitSize);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.1,
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.95,
      metalness: 0.0,
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 1.0,
      metalness: 0.0,
    });

    if (wallCount > this.instanceThreshold) {
      this.instancedWalls = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCount);
      this.instancedWalls.castShadow = true;
      this.instancedWalls.receiveShadow = true;
      this.instancedWalls.frustumCulled = true;
    }

    if (floorCount > this.instanceThreshold) {
      this.instancedFloors = new THREE.InstancedMesh(floorGeometry, floorMaterial, floorCount);
      this.instancedFloors.receiveShadow = true;
      this.instancedFloors.frustumCulled = true;
      (this.instancedFloors as THREE.InstancedMesh).rotation.x = -Math.PI / 2;
    }

    if (ceilingCount > this.instanceThreshold) {
      this.instancedCeilings = new THREE.InstancedMesh(ceilingGeometry, ceilingMaterial, ceilingCount);
      this.instancedCeilings.receiveShadow = true;
      this.instancedCeilings.frustumCulled = true;
      (this.instancedCeilings as THREE.InstancedMesh).rotation.x = Math.PI / 2;
      (this.instancedCeilings as THREE.InstancedMesh).position.y = CONFIG.WALL_HEIGHT;
    }

    let wallIndex = 0;
    let floorIndex = 0;
    let ceilingIndex = 0;

    for (let z = 0; z < this.maze.length; z++) {
      for (let x = 0; x < this.maze[z].length; x++) {
        const cell = this.maze[z][x];
        const worldX = x * this.unitSize;
        const worldZ = z * this.unitSize;

        if (cell === CellType.WALL || cell === CellType.RENDIJA) {
          if (this.instancedWalls && wallIndex < wallCount) {
            this.position.set(worldX, CONFIG.WALL_HEIGHT / 2, worldZ);
            this.matrix.compose(this.position, this.quaternion, this.scale);
            this.instancedWalls.setMatrixAt(wallIndex, this.matrix);
            
            if (cell === CellType.RENDIJA) {
              this.color.setHex(0x6b4423);
              this.instancedWalls.setColorAt(wallIndex, this.color);
            }
            
            wallIndex++;
          }
        }

        if (this.instancedFloors && floorIndex < floorCount) {
          this.position.set(worldX, 0, worldZ);
          this.matrix.compose(this.position, this.quaternion, this.scale);
          (this.instancedFloors as THREE.InstancedMesh).setMatrixAt(floorIndex, this.matrix);
          floorIndex++;
        }

        if (this.instancedCeilings && ceilingIndex < ceilingCount) {
          this.position.set(worldX, CONFIG.WALL_HEIGHT, worldZ);
          this.matrix.compose(this.position, this.quaternion, this.scale);
          (this.instancedCeilings as THREE.InstancedMesh).setMatrixAt(ceilingIndex, this.matrix);
          ceilingIndex++;
        }

        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        const key = this.getChunkKey(cx, cz);
        
        if (!this.chunks.has(key)) {
          this.chunks.set(key, new Chunk(cx, cz, this.chunkSize, this.unitSize));
        }
      }
    }

    if (this.instancedWalls) {
      this.instancedWalls.instanceMatrix.needsUpdate = true;
      if (this.instancedWalls.instanceColor) {
        this.instancedWalls.instanceColor.needsUpdate = true;
      }
      this.scene.add(this.instancedWalls);
      console.log(`[ChunkManager] Added instanced walls: ${wallIndex} instances`);
    }

    if (this.instancedFloors) {
      (this.instancedFloors as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
      this.scene.add(this.instancedFloors as THREE.InstancedMesh);
      console.log(`[ChunkManager] Added instanced floors: ${floorIndex} instances`);
    }

    if (this.instancedCeilings) {
      (this.instancedCeilings as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
      this.scene.add(this.instancedCeilings as THREE.InstancedMesh);
      console.log(`[ChunkManager] Added instanced ceilings: ${ceilingIndex} instances`);
    }
  }

  addDecorativeObject(mesh: THREE.Object3D, priority: 'high' | 'medium' | 'low' = 'medium', distanceCull?: number): void {
    this.decorativeObjects.push({
      mesh,
      isStatic: true,
      priority,
      distanceCull
    });
  }

  update(playerX: number, playerZ: number): void {
    const now = performance.now();
    if (now - this.lastVisibilityUpdate < this.VISIBILITY_UPDATE_INTERVAL) {
      return;
    }
    this.lastVisibilityUpdate = now;

    const { cx, cz } = this.getChunkCoords(playerX, playerZ);

    if (cx !== this.playerChunkX || cz !== this.playerChunkZ) {
      this.playerChunkX = cx;
      this.playerChunkZ = cz;
      this.updateChunkVisibility();
    }

    this.updateDecorativeVisibility(playerX, playerZ);
  }

  private updateChunkVisibility(): void {
    const maxDist = this.renderDistance * this.chunkSize * this.unitSize;
    const maxDistSq = maxDist * maxDist;

    this.chunks.forEach((chunk, _key) => {
      const dx = chunk.centerX - this.playerChunkX * this.chunkSize * this.unitSize;
      const dz = chunk.centerZ - this.playerChunkZ * this.chunkSize * this.unitSize;

      const shouldShow = dx * dx + dz * dz < maxDistSq;
      
      if (chunk.visible !== shouldShow) {
        chunk.setVisible(shouldShow, this.scene);
      }
    });
  }

  private updateDecorativeVisibility(playerX: number, playerZ: number): void {
    for (const obj of this.decorativeObjects) {
      const dx = obj.mesh.position.x - playerX;
      const dz = obj.mesh.position.z - playerZ;
      const distSq = dx * dx + dz * dz;
      const cullDist = obj.distanceCull || this.renderDistance * this.chunkSize * this.unitSize;

      let cullSq: number;
      if (obj.priority === 'high') {
        cullSq = cullDist * 1.5 * cullDist * 1.5;
      } else if (obj.priority === 'low') {
        cullSq = cullDist * 0.5 * cullDist * 0.5;
      } else {
        cullSq = cullDist * cullDist;
      }

      const shouldShow = distSq < cullSq;
      if (obj.mesh.visible !== shouldShow) {
        obj.mesh.visible = shouldShow;
      }
    }
  }

  getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, new Chunk(cx, cz, this.chunkSize, this.unitSize));
    }
    return this.chunks.get(key)!;
  }

  setRenderDistance(distance: number): void {
    this.renderDistance = distance;
    this.updateChunkVisibility();
  }

  dispose(): void {
    this.instancedWalls?.geometry.dispose();
    if (this.instancedWalls?.material instanceof THREE.Material) {
      this.instancedWalls.material.dispose();
    }
    this.instancedFloors?.geometry.dispose();
    if (this.instancedFloors?.material instanceof THREE.Material) {
      this.instancedFloors.material.dispose();
    }
    this.instancedCeilings?.geometry.dispose();
    if (this.instancedCeilings?.material instanceof THREE.Material) {
      this.instancedCeilings.material.dispose();
    }

    this.chunks.forEach(chunk => chunk.dispose());
    this.chunks.clear();
    this.decorativeObjects = [];
  }

  getStats(): { chunks: number; decorative: number; instanced: boolean } {
    return {
      chunks: this.chunks.size,
      decorative: this.decorativeObjects.length,
      instanced: !!(this.instancedWalls && this.instancedFloors && this.instancedCeilings)
    };
  }
}

export class Chunk {
  public visible = true;
  public readonly centerX: number;
  public readonly centerZ: number;
  public readonly worldX: number;
  public readonly worldZ: number;
  
  private meshes: THREE.Object3D[] = [];
  private addedToScene = new Set<THREE.Object3D>();

  constructor(
    public readonly cx: number,
    public readonly cz: number,
    private size: number,
    private unitSize: number
  ) {
    this.centerX = (cx * size + size / 2) * unitSize;
    this.centerZ = (cz * size + size / 2) * unitSize;
    this.worldX = cx * size * unitSize;
    this.worldZ = cz * size * unitSize;
  }

  addMesh(mesh: THREE.Object3D, scene?: THREE.Scene): void {
    this.meshes.push(mesh);
    if (scene && !this.addedToScene.has(mesh)) {
      scene.add(mesh);
      this.addedToScene.add(mesh);
    }
  }

  setVisible(visible: boolean, scene?: THREE.Scene): void {
    this.visible = visible;
    for (const mesh of this.meshes) {
      mesh.visible = visible;
    }
  }

  isInRange(playerX: number, playerZ: number, maxDist: number): boolean {
    const dx = this.centerX - playerX;
    const dz = this.centerZ - playerZ;
    return dx * dx + dz * dz < maxDist * maxDist;
  }

  getMeshes(): THREE.Object3D[] {
    return this.meshes;
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry?.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    }
    this.meshes = [];
    this.addedToScene.clear();
  }
}
