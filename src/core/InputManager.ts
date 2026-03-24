import * as THREE from 'three';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  flashlight: boolean;
  hide: boolean;
  pause: boolean;
}

export type PauseCallback = () => void;

export class InputManager {
  keys: InputState;
  mouseMovement: { x: number; y: number };
  isPointerLocked: boolean;
  isTouchDevice: boolean;
  sensitivity: number = 5;
  private touchStartX = 0;
  private touchStartY = 0;
  private moveTouchId: number | null = null;
  private lookTouchId: number | null = null;
  private moveVector = { x: 0, y: 0 };
  private lookVector = { x: 0, y: 0 };
  private pauseCallbacks: PauseCallback[] = [];
  private pausePressed = false;
  private _pausedByGame = false;

  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      flashlight: false,
      hide: false,
      pause: false,
    };
    this.mouseMovement = { x: 0, y: 0 };
    this.isPointerLocked = false;
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const savedSens = localStorage.getItem('optSensitivity');
    if (savedSens) {
      this.sensitivity = parseInt(savedSens);
    }

    this.setupKeyboard();
    this.setupMouse();
    if (this.isTouchDevice) {
      this.setupTouch();
    }
  }

  onPause(callback: PauseCallback): void {
    this.pauseCallbacks.push(callback);
  }

  setPausedByGame(paused: boolean): void {
    this._pausedByGame = paused;
    if (!paused) {
      // Al despausar, solicitar pointer lock
      this.requestPointerLock();
    }
  }

  isGamePaused(): boolean {
    return this._pausedByGame;
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
        case 'KeyF':
          this.keys.flashlight = true;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          this.keys.hide = true;
          break;
        case 'KeyP':
          if (!this.pausePressed) {
            this.pausePressed = true;
            this.pauseCallbacks.forEach(cb => cb());
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
        case 'KeyF':
          this.keys.flashlight = false;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          this.keys.hide = false;
          break;
        case 'KeyP':
          this.pausePressed = false;
          break;
      }
    });
  }

  private setupMouse(): void {
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.isPointerLocked;
      this.isPointerLocked = document.pointerLockElement === document.body;
      
      // Si perdemos el lock (ESC, alt-tab), NO limpiar teclas automáticamente
      // El juego maneja la pausa con P, así que el jugador decide cuándo reanudar
      if (!this.isPointerLocked && wasLocked) {
        // Solo limpiar si no es porque ourselves pusimos la pausa
        if (!this._pausedByGame) {
          // No hacer reset aquí - el jugador puede querer volver al juego
        }
      }
    });

    document.addEventListener('pointerlockerror', () => {
      // Intentar recuperar el lock
      setTimeout(() => this.requestPointerLock(), 100);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseMovement.x += e.movementX;
        this.mouseMovement.y += e.movementY;
      }
    });
  }

  private setupTouch(): void {
    window.addEventListener('touchstart', (e) => {
      for (const touch of e.changedTouches) {
        const x = touch.clientX;
        const isLeftSide = x < window.innerWidth / 2;

        if (isLeftSide && this.moveTouchId === null) {
          this.moveTouchId = touch.identifier;
          this.touchStartX = x;
          this.touchStartY = touch.clientY;
        } else if (!isLeftSide && this.lookTouchId === null) {
          this.lookTouchId = touch.identifier;
          this.touchStartX = x;
          this.touchStartY = touch.clientY;
        }
      }
    });

    window.addEventListener('touchmove', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.moveTouchId) {
          const dx = touch.clientX - this.touchStartX;
          const dy = touch.clientY - this.touchStartY;
          this.moveVector.x = Math.max(-1, Math.min(1, dx / 50));
          this.moveVector.y = Math.max(-1, Math.min(1, dy / 50));
        }
        if (touch.identifier === this.lookTouchId) {
          const dx = touch.clientX - this.touchStartX;
          this.mouseMovement.x += dx * 0.5;
          this.touchStartX = touch.clientX;
          this.touchStartY = touch.clientY;
        }
      }
    });

    window.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.moveTouchId) {
          this.moveTouchId = null;
          this.moveVector = { x: 0, y: 0 };
        }
        if (touch.identifier === this.lookTouchId) {
          this.lookTouchId = null;
        }
      }
    });
  }

  requestPointerLock(): void {
    if (!this.isTouchDevice) {
      document.body.requestPointerLock();
    }
  }

  getMovementInput(): THREE.Vector2 {
    if (this.isTouchDevice) {
      return new THREE.Vector2(this.moveVector.x, -this.moveVector.y);
    }

    const input = new THREE.Vector2(0, 0);
    if (this.keys.forward) input.y += 1;
    if (this.keys.backward) input.y -= 1;
    if (this.keys.left) input.x -= 1;
    if (this.keys.right) input.x += 1;
    return input.normalize();
  }

  consumeMouseMovement(): { x: number; y: number } {
    const movement = { ...this.mouseMovement };
    this.mouseMovement = { x: 0, y: 0 };
    return movement;
  }

  reset(): void {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      flashlight: false,
      hide: false,
      pause: false,
    };
    this.mouseMovement = { x: 0, y: 0 };
  }
}
