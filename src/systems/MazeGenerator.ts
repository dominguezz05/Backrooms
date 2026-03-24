import { CellType } from '../types';
import { CONFIG } from '../constants';

export interface MazeOptions {
  openRooms?: boolean;
}

export class MazeGenerator {
  width: number;
  height: number;
  maze: number[][];
  private options: MazeOptions = {};

  constructor(width: number, height: number, options: MazeOptions = {}) {
    this.width = width;
    this.height = height;
    this.options = options;
    this.maze = [];
  }

  generate(): number[][] {
    this.maze = Array(this.height).fill(null).map(() => Array(this.width).fill(CellType.WALL));

    const stack: [number, number][] = [];
    const startX = 1;
    const startZ = 1;

    this.maze[startZ][startX] = CellType.EMPTY;
    stack.push([startX, startZ]);

    while (stack.length > 0) {
      const [x, z] = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(x, z);

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const [nx, nz] = neighbors[Math.floor(Math.random() * neighbors.length)];

      const mx = x + Math.floor((nx - x) / 2);
      const mz = z + Math.floor((nz - z) / 2);

      this.maze[nz][nx] = CellType.EMPTY;
      this.maze[mz][mx] = CellType.EMPTY;

      stack.push([nx, nz]);
    }

    if (this.options.openRooms) {
      this.createOpenRooms();
    }

    const exitX = this.width - 2;
    const exitZ = this.height - 2;
    this.maze[exitZ][exitX] = CellType.EXIT;

    // Verificar conectividad: sellar celdas no-pared inalcanzables desde el spawn
    this.ensureConnectivity();

    this.addSpecialRooms();

    return this.maze;
  }

  private ensureConnectivity(): void {
    const reachable = new Set<number>();
    const toKey = (x: number, z: number) => z * this.width + x;
    const queue: [number, number][] = [[1, 1]];
    reachable.add(toKey(1, 1));

    const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
      const [x, z] = queue.shift()!;
      for (const [dx, dz] of dirs) {
        const nx = x + dx;
        const nz = z + dz;
        if (nz < 0 || nz >= this.height || nx < 0 || nx >= this.width) continue;
        const key = toKey(nx, nz);
        if (!reachable.has(key) && this.maze[nz][nx] !== CellType.WALL) {
          reachable.add(key);
          queue.push([nx, nz]);
        }
      }
    }

    // Convertir a muro cualquier celda no-pared que no sea alcanzable desde spawn
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        if (this.maze[z][x] !== CellType.WALL && !reachable.has(toKey(x, z))) {
          this.maze[z][x] = CellType.WALL;
        }
      }
    }
  }

  private createOpenRooms(): void {
    const numRooms = 4 + Math.floor(Math.random() * 3);
    
    for (let r = 0; r < numRooms; r++) {
      const roomX = 3 + Math.floor(Math.random() * (this.width - 10));
      const roomZ = 3 + Math.floor(Math.random() * (this.height - 10));
      const roomWidth = 3 + Math.floor(Math.random() * 3);
      const roomHeight = 3 + Math.floor(Math.random() * 3);
      
      for (let z = roomZ; z < Math.min(roomZ + roomHeight, this.height - 2); z++) {
        for (let x = roomX; x < Math.min(roomX + roomWidth, this.width - 2); x++) {
          if (z > 2 && x > 2) {
            this.maze[z][x] = CellType.EMPTY;
          }
        }
      }
    }

    const numCorridors = 3 + Math.floor(Math.random() * 2);
    for (let c = 0; c < numCorridors; c++) {
      const isHorizontal = Math.random() > 0.5;
      const pos = 3 + Math.floor(Math.random() * (isHorizontal ? this.width - 8 : this.height - 8));
      
      if (isHorizontal) {
        for (let x = 2; x < this.width - 2; x++) {
          if (this.maze[pos] && this.maze[pos][x] !== CellType.EXIT) {
            this.maze[pos][x] = CellType.EMPTY;
          }
        }
      } else {
        for (let z = 2; z < this.height - 2; z++) {
          if (this.maze[z] && this.maze[z][pos] !== CellType.EXIT) {
            this.maze[z][pos] = CellType.EMPTY;
          }
        }
      }
    }
  }

  private getUnvisitedNeighbors(x: number, z: number): [number, number][] {
    const neighbors: [number, number][] = [];
    const directions: [number, number][] = [
      [0, -2], [2, 0], [0, 2], [-2, 0]
    ];

    for (const [dx, dz] of directions) {
      const nx = x + dx;
      const nz = z + dz;

      if (nx > 0 && nx < this.width - 1 &&
          nz > 0 && nz < this.height - 1 &&
          this.maze[nz][nx] === CellType.WALL) {
        neighbors.push([nx, nz]);
      }
    }

    return neighbors;
  }

  private addSpecialRooms(): void {
    let batteriesPlaced = 0;
    const maxBatteries = 8;

    while (batteriesPlaced < maxBatteries) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.maze[z][x] === CellType.EMPTY && (x > 5 || z > 5)) {
        this.maze[z][x] = CellType.BATTERY;
        batteriesPlaced++;
      }
    }

    const powerUpTypes = [CellType.POWER_SPEED, CellType.POWER_INVISIBLE, CellType.POWER_STUN, CellType.POWER_SANITY];
    for (const powerType of powerUpTypes) {
      let count = 0;
      const maxCount = powerType === CellType.POWER_SANITY ? 3 : 2;
      while (count < maxCount) {
        const x = Math.floor(Math.random() * (this.width - 2)) + 1;
        const z = Math.floor(Math.random() * (this.height - 2)) + 1;
        if (this.maze[z][x] === CellType.EMPTY && (x > 4 || z > 4)) {
          this.maze[z][x] = powerType;
          count++;
        }
      }
    }

    let hidingSpotsPlaced = 0;
    const maxHidingSpots = 6;

    while (hidingSpotsPlaced < maxHidingSpots) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.maze[z][x] === CellType.EMPTY) {
        const wallCount = this.countNearbyWalls(x, z);
        if (wallCount >= 2) {
          this.maze[z][x] = CellType.HIDING_SPOT;
          hidingSpotsPlaced++;
        }
      }
    }

    let notesPlaced = 0;
    const maxNotes = 5;

    while (notesPlaced < maxNotes) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.maze[z][x] === CellType.EMPTY && (x > 3 || z > 3)) {
        this.maze[z][x] = CellType.NOTE;
        notesPlaced++;
      }
    }

    let photosPlaced = 0;
    const maxPhotos = 4;

    while (photosPlaced < maxPhotos) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.maze[z][x] === CellType.EMPTY) {
        this.maze[z][x] = CellType.PHOTO;
        photosPlaced++;
      }
    }

    let bloodStainsPlaced = 0;
    const maxBloodStains = 12;

    while (bloodStainsPlaced < maxBloodStains) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.maze[z][x] === CellType.EMPTY) {
        this.maze[z][x] = CellType.BLOOD_STAIN;
        bloodStainsPlaced++;
      }
    }

    let lightsPlaced = 0;
    const maxLights = 10;

    while (lightsPlaced < maxLights) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.maze[z][x] === CellType.EMPTY) {
        this.maze[z][x] = CellType.CEILING_LIGHT;
        lightsPlaced++;
      }
    }
  }

  private countNearbyWalls(x: number, z: number): number {
    let count = 0;
    const directions: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    for (const [dx, dz] of directions) {
      if (this.maze[z + dz] && this.maze[z + dz][x + dx] === CellType.WALL) {
        count++;
      }
    }

    return count;
  }

  findRandomEmptyPosition(minDistanceFromPlayer: number = 8): { x: number; z: number } | null {
    const playerX = 1;
    const playerZ = 1;

    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.maze[z][x] === CellType.EMPTY) {
        const dist = Math.sqrt(
          Math.pow((x - playerX) * CONFIG.UNIT_SIZE, 2) +
          Math.pow((z - playerZ) * CONFIG.UNIT_SIZE, 2)
        );
        if (dist >= minDistanceFromPlayer) {
          return { x, z };
        }
      }
    }
    return null;
  }
}
