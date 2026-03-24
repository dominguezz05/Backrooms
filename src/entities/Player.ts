import * as THREE from 'three';
import { CONFIG, PLAYER_HEIGHT, POWERUP_SPEED_DURATION, POWERUP_SPEED_MULTIPLIER, POWERUP_INVISIBLE_DURATION, POWERUP_SANITY_AMOUNT } from '../constants';
import type { InputManager } from '../core/InputManager';
import type { SceneManager } from '../core/SceneManager';
import { CellType } from '../types';
import type { AudioManager } from '../systems/AudioManager';

export class Player {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  height: number;
  yaw: number;
  stamina: number;
  battery: number;
  sanity: number;
  isFlashlightOn: boolean;
  isSprinting: boolean;
  isHiding: boolean;
  canHide: boolean;
  speedBoostTimer: number = 0;
  invisibilityTimer: number = 0;
  isInvisible: boolean = false;
  cobwebSlowFactor: number = 1.0; // Factor de ralentización por telarañas
  closedDoors: Array<{ cellX: number; cellZ: number; isClosed: boolean }> = []; // Puertas cerradas
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private maze: number[][];
  private audioManager: AudioManager | null = null;
  private lastFlashlightState = false;
  private exitWorldPos: THREE.Vector3 | null = null;

  constructor(sceneManager: SceneManager, inputManager: InputManager) {
    this.sceneManager = sceneManager;
    this.inputManager = inputManager;
    this.position = new THREE.Vector3(CONFIG.UNIT_SIZE, PLAYER_HEIGHT, CONFIG.UNIT_SIZE);
    this.velocity = new THREE.Vector3();
    this.height = PLAYER_HEIGHT;
    this.yaw = 0;
    this.stamina = CONFIG.STAMINA_MAX;
    this.battery = CONFIG.BATTERY_MAX;
    this.sanity = CONFIG.SANITY_MAX;
    this.isFlashlightOn = false;
    this.isSprinting = false;
    this.isHiding = false;
    this.canHide = false;
    this.maze = [];
  }

  setMaze(maze: number[][]): void {
    this.maze = maze;
    this.exitWorldPos = null;
    for (let z = 0; z < maze.length; z++) {
      for (let x = 0; x < maze[z].length; x++) {
        if (maze[z][x] === CellType.EXIT) {
          this.exitWorldPos = new THREE.Vector3(x * CONFIG.UNIT_SIZE, 0, z * CONFIG.UNIT_SIZE);
        }
      }
    }
    const spawnX = 1 * CONFIG.UNIT_SIZE;
    const spawnZ = 1 * CONFIG.UNIT_SIZE;
    this.position.set(spawnX, PLAYER_HEIGHT, spawnZ);
    this.sceneManager.camera.position.copy(this.position);
  }

  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }

  update(delta: number): void {
    this.updatePowerUps(delta);
    this.updateMovement(delta);
    this.updateResources(delta);
    this.updateCamera();
    this.updateFlashlight();
  }

  private updatePowerUps(delta: number): void {
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= delta;
      if (this.speedBoostTimer <= 0) {
        this.speedBoostTimer = 0;
      }
    }
    if (this.invisibilityTimer > 0) {
      this.invisibilityTimer -= delta;
      if (this.invisibilityTimer <= 0) {
        this.invisibilityTimer = 0;
        this.isInvisible = false;
      }
    }
  }

  activateSpeedBoost(): void {
    this.speedBoostTimer = POWERUP_SPEED_DURATION;
  }

  activateInvisibility(): void {
    this.invisibilityTimer = POWERUP_INVISIBLE_DURATION;
    this.isInvisible = true;
  }

  restoreSanity(): void {
    this.sanity = Math.min(CONFIG.SANITY_MAX, this.sanity + POWERUP_SANITY_AMOUNT);
  }

  getSpeedMultiplier(): number {
    return this.speedBoostTimer > 0 ? POWERUP_SPEED_MULTIPLIER : 1.0;
  }

  isPlayerInvisible(): boolean {
    return this.invisibilityTimer > 0;
  }

  private updateMovement(delta: number): void {
    // Actualizar canHide y manejar toggle ANTES del return de escondite
    this.checkHidingSpot();
    if (this.inputManager.keys.hide) {
      this.inputManager.keys.hide = false; // consumir one-shot igual que la linterna
      if (!this.isHiding && this.canHide) {
        this.isHiding = true;
        this.audioManager?.playHideEnter();
      } else if (this.isHiding) {
        this.isHiding = false;
        this.audioManager?.playHideExit();
      }
    }

    // Permitir mirar dentro del ataúd aunque no se pueda mover
    const mouseDelta = this.inputManager.consumeMouseMovement();
    const sensFactor = this.inputManager.sensitivity / 5; // 1-10 mapeado a 0.2-2
    this.yaw -= mouseDelta.x * 0.002 * sensFactor;

    if (this.isHiding) return;

    const input = this.inputManager.getMovementInput();

    if (input.length() > 0) {
      this.isSprinting = this.inputManager.keys.sprint && this.stamina > 0;

      if (this.isSprinting) {
        this.stamina -= CONFIG.STAMINA_DRAIN_RATE * delta;
        this.stamina = Math.max(0, this.stamina);
      } else {
        // Recuperar stamina caminando (no esprintando)
        this.stamina += CONFIG.STAMINA_RECOVERY_RATE * delta;
        this.stamina = Math.min(CONFIG.STAMINA_MAX, this.stamina);
      }

      const baseSpeed = this.isSprinting ? CONFIG.SPRINT_SPEED : CONFIG.WALK_SPEED;
      const speed = baseSpeed * this.getSpeedMultiplier() * this.cobwebSlowFactor;

      const forward = new THREE.Vector3(
        -Math.sin(this.yaw),
        0,
        -Math.cos(this.yaw)
      );
      const right = new THREE.Vector3(
        Math.cos(this.yaw),
        0,
        -Math.sin(this.yaw)
      );

      const moveDir = forward.multiplyScalar(input.y).add(right.multiplyScalar(input.x));
      moveDir.normalize().multiplyScalar(speed * delta);

      const newPos = this.position.clone();
      newPos.x += moveDir.x;
      newPos.z += moveDir.z;

      if (!this.checkWallCollision(newPos)) {
        this.position.x = newPos.x;
        this.position.z = newPos.z;
      } else {
        const newPosX = this.position.clone();
        newPosX.x += moveDir.x;
        if (!this.checkWallCollision(newPosX)) {
          this.position.x = newPosX.x;
        }
        const newPosZ = this.position.clone();
        newPosZ.z += moveDir.z;
        if (!this.checkWallCollision(newPosZ)) {
          this.position.z = newPosZ.z;
        }
      }
    } else if (!this.isSprinting && this.stamina < CONFIG.STAMINA_MAX) {
      this.stamina += CONFIG.STAMINA_RECOVERY_RATE * delta;
      this.stamina = Math.min(CONFIG.STAMINA_MAX, this.stamina);
    }

  }

  private checkWallCollision(pos: THREE.Vector3): boolean {
    // Check 4 points offset by a safety radius around the player so they
    // can never get close enough to a wall face to clip through it.
    const r = 0.70; // must be > camera near-plane (0.25) and feel solid
    const checks = [
      { x: pos.x + r, z: pos.z },
      { x: pos.x - r, z: pos.z },
      { x: pos.x,     z: pos.z + r },
      { x: pos.x,     z: pos.z - r },
    ];

    for (const pt of checks) {
      const cellX = Math.round(pt.x / CONFIG.UNIT_SIZE);
      const cellZ = Math.round(pt.z / CONFIG.UNIT_SIZE);
      if (cellZ < 0 || cellZ >= this.maze.length ||
          cellX < 0 || cellX >= this.maze[0].length) {
        return true;
      }
      if (this.maze[cellZ][cellX] === CellType.WALL) return true;
      
      // Check for closed doors
      for (const door of this.closedDoors) {
        if (door.cellX === cellX && door.cellZ === cellZ && door.isClosed) {
          return true;
        }
      }
    }
    return false;
  }

  /** Get closed doors for collision checking - called from Game */
  getClosedDoors(): Array<{ cellX: number; cellZ: number; isClosed: boolean }> {
    return this.closedDoors;
  }

  private checkHidingSpot(): void {
    // Radio de detección: 1.2 * UNIT_SIZE para que el jugador no tenga que estar
    // exactamente encima de la celda
    const radius = CONFIG.UNIT_SIZE * 1.2;
    const minX = Math.floor((this.position.x - radius) / CONFIG.UNIT_SIZE);
    const maxX = Math.ceil((this.position.x + radius) / CONFIG.UNIT_SIZE);
    const minZ = Math.floor((this.position.z - radius) / CONFIG.UNIT_SIZE);
    const maxZ = Math.ceil((this.position.z + radius) / CONFIG.UNIT_SIZE);

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (z >= 0 && z < this.maze.length && x >= 0 && x < this.maze[0].length) {
          if (this.maze[z][x] === CellType.HIDING_SPOT) {
            const cellWorldX = x * CONFIG.UNIT_SIZE;
            const cellWorldZ = z * CONFIG.UNIT_SIZE;
            const dx = this.position.x - cellWorldX;
            const dz = this.position.z - cellWorldZ;
            if (Math.sqrt(dx * dx + dz * dz) <= radius) {
              this.canHide = true;
              return;
            }
          }
        }
      }
    }
    this.canHide = false;
  }

  private updateResources(delta: number): void {
    if (this.isFlashlightOn) {
      this.battery -= CONFIG.BATTERY_DRAIN_RATE * delta;
      this.battery = Math.max(0, this.battery);

      if (this.battery <= 0) {
        this.isFlashlightOn = false;
        this.sceneManager.toggleFlashlight(false);
      }
    }

    // Dentro del ataúd la cordura no se ve afectada
    if (!this.isHiding) {
      if (this.isFlashlightOn) {
        this.sanity += CONFIG.SANITY_RECOVERY_FLASHLIGHT * delta;
        this.sanity = Math.min(CONFIG.SANITY_MAX, this.sanity);
      } else {
        this.sanity -= CONFIG.SANITY_DRAIN_DARK * delta;
        this.sanity = Math.max(0, this.sanity);
      }
    }
  }

  private updateFlashlight(): void {
    if (this.inputManager.keys.flashlight && this.battery > 0) {
      this.isFlashlightOn = !this.isFlashlightOn;
      this.sceneManager.toggleFlashlight(this.isFlashlightOn);
      this.inputManager.keys.flashlight = false;
      
      if (this.audioManager) {
        if (this.isFlashlightOn) {
          this.audioManager.playFlashlightOn();
        } else {
          this.audioManager.playFlashlightOff();
        }
      }
    }
    
    if (this.lastFlashlightState && !this.isFlashlightOn && this.battery <= 0 && this.audioManager) {
      this.audioManager.playBatteryEmpty();
    }
    this.lastFlashlightState = this.isFlashlightOn;
  }

  private updateCamera(): void {
    this.sceneManager.camera.position.copy(this.position);
    this.sceneManager.camera.rotation.y = this.yaw;
  }

  drainSanityNearEnemy(distance: number): void {
    if (distance < 5) {
      const drain = CONFIG.SANITY_DRAIN_NEAR_ENEMY * (1 - distance / 5);
      this.sanity -= drain * 0.016;
      this.sanity = Math.max(0, this.sanity);
    }
  }

  collectBattery(): void {
    this.battery = Math.min(CONFIG.BATTERY_MAX, this.battery + 40);
  }

  getPosition2D(): THREE.Vector2 {
    return new THREE.Vector2(this.position.x, this.position.z);
  }

  checkExit(): boolean {
    if (!this.exitWorldPos) return false;
    const dx = this.position.x - this.exitWorldPos.x;
    const dz = this.position.z - this.exitWorldPos.z;
    return Math.sqrt(dx * dx + dz * dz) < CONFIG.UNIT_SIZE * 0.9;
  }
}
