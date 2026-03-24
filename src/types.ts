import * as THREE from 'three';

export enum CellType {
  EMPTY = 0,
  WALL = 1,
  PLAYER_SPAWN = 2,
  EXIT = 3,
  BATTERY = 4,
  HIDING_SPOT = 5,
  NOTE = 6,
  BLOOD_STAIN = 7,
  PHOTO = 8,
  CEILING_LIGHT = 9,
  POWER_SPEED = 10,
  POWER_INVISIBLE = 11,
  POWER_STUN = 12,
  POWER_SANITY = 13,
}

export enum EnemyType {
  RUNNER = 'runner',
  STALKER = 'stalker',
  TELEPORTER = 'teleporter',
}

export interface Position {
  x: number;
  z: number;
}

export interface GameConfig {
  MAZE_SIZE: number;
  UNIT_SIZE: number;
  WALL_HEIGHT: number;
  WALK_SPEED: number;
  SPRINT_SPEED: number;
  STAMINA_MAX: number;
  STAMINA_DRAIN_RATE: number;
  STAMINA_RECOVERY_RATE: number;
  BATTERY_MAX: number;
  BATTERY_DRAIN_RATE: number;
  SANITY_MAX: number;
  SANITY_DRAIN_DARK: number;
  SANITY_DRAIN_NEAR_ENEMY: number;
  SANITY_RECOVERY_FLASHLIGHT: number;
  SANITY_CRITICAL_THRESHOLD: number;
  RUNNER_SPEED: number;
  STALKER_SPEED: number;
  TELEPORTER_SPEED: number;
  MONSTER_SPAWN_DELAY: number;
  FOG_NEAR: number;
  FOG_FAR: number;
}

export interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  height: number;
  speed: number;
  stamina: number;
  battery: number;
  sanity: number;
  isFlashlightOn: boolean;
  isSprinting: boolean;
  isHiding: boolean;
  canHide: boolean;
  yaw: number;
}

export interface GameState {
  isActive: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  hasWon: boolean;
  elapsedTime: number;
  monsterSpawned: boolean;
}
