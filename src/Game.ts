import * as THREE from 'three';
import { SceneManager } from './core/SceneManager';
import { InputManager } from './core/InputManager';
import { MazeGenerator } from './systems/MazeGenerator';
import { AudioManager } from './systems/AudioManager';
import { HorrorEffects } from './systems/HorrorEffects';
import { UIManager } from './systems/UIManager';
import { ScoreManager } from './systems/ScoreManager';
import { ChunkManager } from './systems/ChunkManager';
import { Player } from './entities/Player';
import { Enemy } from './entities/Enemy';
import { CONFIG, POWERUP_STUN_DURATION, DOOR_SPAWN_CHANCE } from './constants';
import { CellType, EnemyType } from './types';
import { createFloorTexture, createWallTexture, createCeilingTexture } from './utils/textures';

export type LevelType = 'level1' | 'level2' | 'level3' | 'level4' | 'ultimate';

export class Game {
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private player: Player;
  private enemies: Enemy[] = [];
  private enemyPool: Enemy[] = []; // Enemigos pre-creados durante carga, activados al spawnear
  private maze: number[][] = [];
  private mazeGenerator: MazeGenerator;
  private audioManager: AudioManager;
  private horrorEffects: HorrorEffects;
  private uiManager: UIManager;
  private chunkManager: ChunkManager | null = null;

  private clock: THREE.Clock;
  private isActive = false;
  private isPaused = false;
  private monsterSpawned = false;
  private monsterSpawnTimer = 0;
  private gameOver = false;
  private hasWon = false;

  private batteries: THREE.Mesh[] = [];
  private coins: THREE.Mesh[] = [];
  private notes: THREE.Mesh[] = [];
  private photos: THREE.Mesh[] = [];
  private bloodStains: THREE.Mesh[] = [];
  private ceilingLights: THREE.Vector3[] = [];
  private powerUps: THREE.Mesh[] = [];

  // Puerta de salida animada
  private exitDoor: THREE.Group | null = null;
  private exitDoorAngle = 0;        // 0 = cerrada, π/2 = abierta
  private exitDoorOpen = false;
  private exitWorldPos = new THREE.Vector3();
  
  private currentLevel: LevelType = 'level1';
  private score = 0;
  private targetScore = 100;
  private enemyStepTimer = 0;
  private playerStepTimer = 0;
  private breathingTimer = 0;
  private horrorSoundTimer = 0;
  private hallucinationTimer = 0;
  private whisperNameTimer = 0;
  private dripTimer = 0;
  private metalCreakTimer = 0;
  private chairDragTimer = 0;
  private tvStaticTimer = 0;
  private ventGustTimer = 0;

  // ── Mini-sustos ambientales ────────────────────────────────────────────────
  private ambientScareTimer  = 0;
  private ambientScareInterval = 35 + Math.random() * 25;   // 35–60 s entre sustos
  private lastClosestEnemyDist = Infinity;
  private ceilingLightMeshes: THREE.PointLight[] = [];
  private emptyWalkablePositions: THREE.Vector3[] = [];

  // Minimap
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;
  private minimapBaseImageData: ImageData | null = null;
  private minimapBaseCanvas: HTMLCanvasElement | null = null;   // offscreen: paredes/suelo
  private minimapStaticCanvas: HTMLCanvasElement | null = null; // offscreen: coins/powerups
  private minimapStaticDirty = true; // reconstruir capa estática
  private minimapExitCellX = 0;
  private minimapExitCellZ = 0;
  private minimapFrameSkip = 0;

  // Fog of war — 2D array de celdas visitadas (true = visible en mapa)
  private fogOfWar: boolean[][] = [];
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogCtx: CanvasRenderingContext2D | null = null;

  // Estadísticas de partida
  private gameStartTime = 0;
  private statsDistanceWalked = 0;
  private statsBatteriesCollected = 0;
  private statsCoinsCollected = 0;
  private statsHidingCount = 0;
  private statsCloseCallsEnemies = 0;
  private statsLastPos = new THREE.Vector3();
  private _wasCloseToEnemy = false;
  private _wasHiding = false;

  // Rastro de pisadas
  private footprints: Array<{ mesh: THREE.Mesh; life: number }> = [];
  private footprintPool: THREE.Mesh[] = [];
  private footprintTimer = 0;
  private footprintLeft = true;
  private footprintTex: THREE.CanvasTexture | null = null;
  private footprintMat: THREE.MeshBasicMaterial | null = null;
  private footprintGeo: THREE.PlaneGeometry | null = null;
  private readonly MAX_FOOTPRINTS = 28;
  private readonly FOOTPRINT_LIFETIME = 18;
  
  // Throttle para visibility checks (cada 200ms)
  private visibilityThrottle = 0;
  private readonly VISIBILITY_THROTTLE_MS = 200;

  // ── Sistema de Transiciones Suaves ──────────────────────────────────────────
  private transitionOverlay: HTMLElement | null = null;

  constructor() {
    this.sceneManager = new SceneManager();
    this.inputManager = new InputManager();
    this.player = new Player(this.sceneManager, this.inputManager);
    
    this.inputManager.onPause(() => this.togglePause());
    
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'level1';
    this.currentLevel = this.getLevelType(level);
    
    const mazeOptions: { openRooms: boolean } = { openRooms: this.currentLevel === 'level3' };
    this.mazeGenerator = new MazeGenerator(CONFIG.MAZE_SIZE, CONFIG.MAZE_SIZE, mazeOptions);
    this.audioManager = new AudioManager();
    this.horrorEffects = new HorrorEffects(this.sceneManager.scene, this.sceneManager.camera);
    this.uiManager = new UIManager();
    this.clock = new THREE.Clock();
    
    const win = window as Window & { gameAudioManager?: AudioManager };
    win.gameAudioManager = this.audioManager;

    this.init();
  }

  private getLevelType(level: string): LevelType {
    if (level === '2' || level === 'level2') return 'level2';
    if (level === '3' || level === 'level3') return 'level3';
    if (level === '4' || level === 'level4') return 'level4';
    if (level === 'ultimate') return 'ultimate';
    return 'level1';
  }

  private async init(): Promise<void> {
    console.log('[Game] Initializing... Level:', this.currentLevel);

    const playerName = sessionStorage.getItem('playerName') || '';
    if (playerName) {
      this.audioManager.setPlayerName(playerName);
      console.log('[Game] Player name:', playerName);
    }

    this.configureLevel();
    this.applyDifficulty();

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // DESHABILITAR INPUT durante carga para evitar acumulación de eventos
    this.inputManager.disableInput();

    // Inicializar sistemas de transición y trail
    this.initTransitionSystem();

    this.uiManager.showLoading(true);
    this.uiManager.setLoadingProgress(5, 'Preparando recursos...');
    await delay(100);

    this.uiManager.setLoadingProgress(15, 'Cargando texturas de enemigos...');
    Enemy.preloadTextures();
    await delay(100);

    this.uiManager.setLoadingProgress(25, 'Generando laberinto...');
    this.maze = this.mazeGenerator.generate();
    await this.yieldToMain();

    this.uiManager.setLoadingProgress(40, 'Construyendo entorno...');
    await this.buildMazeChunked();

    this.uiManager.setLoadingProgress(60, 'Inicializando mapa...');
    this.initMinimap();
    await this.yieldToMain();

    // Pre-crear meshes de enemigos durante la carga para evitar spike al spawnear
    this.uiManager.setLoadingProgress(68, 'Pre-creando enemigos...');
    await this.prewarmEnemies();

    // Forzar compilación de shaders GLSL ahora (loading screen) en vez de al primer render.
    // Sin esto, MeshStandardMaterial se compila la primera vez que se ve → bloquea ~2000ms.
    // Los enemigos están visible=false, así que Three.js los saltaría; los activamos brevemente.
    this.uiManager.setLoadingProgress(72, 'Compilando shaders...');
    for (const e of this.enemyPool) e.mesh.visible = true;
    this.sceneManager.renderer.compile(this.sceneManager.scene, this.sceneManager.camera);
    for (const e of this.enemyPool) e.mesh.visible = false;
    await this.yieldToMain();

    this.uiManager.setLoadingProgress(75, 'Configurando jugador...');
    this.player.setMaze(this.maze);
    this.player.setAudioManager(this.audioManager);

    if (this.currentLevel === 'level4') {
      this.sceneManager.ambientLight.intensity = 0.02;
    }

    this.uiManager.setLoadingProgress(85, 'Preparando efectos...');
    this.horrorEffects.setMessageElement(
      document.getElementById('messageOverlay') || document.createElement('div')
    );

    // Pre-inicializar pool de huellas para evitar spike en el primer paso
    this.initFootprintPool();
    await this.yieldToMain();

    await this.yieldToMain();
    this.uiManager.setLoadingProgress(95, 'Listo para comenzar...');
    this.setupStartButton();

    await delay(300);
    this.uiManager.setLoadingProgress(100, '¡Pulsa para empezar!');
    await delay(300);
    this.uiManager.showLoading(false);

    await delay(200);
    
    // Detener audio del menú para evitar conflictos
    this.cleanupMenuAudio();
    
    // HABILITAR INPUT solo cuando el juego esté completamente listo
    this.inputManager.enableInput();
    
    console.log('[Game] Initialization complete - Level:', this.currentLevel);
  }

  private yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(), { timeout: 50 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  // ── Sistema de Transiciones Suaves ──────────────────────────────────────────
  private initTransitionSystem(): void {
    this.transitionOverlay = document.getElementById('transitionOverlay');
  }

  /** Hace un fade a negro y luego fade desde negro (para transiciones entre pantallas) */
  public transitionFade(callback: () => void, fadeOutMs = 500, fadeInMs = 500): void {
    if (!this.transitionOverlay) {
      callback();
      return;
    }
    
    // Fade a negro
    this.transitionOverlay.classList.add('active');
    this.transitionOverlay.style.transition = `opacity ${fadeOutMs}ms ease`;
    this.transitionOverlay.style.opacity = '1';
    
    setTimeout(() => {
      // Ejecutar la acción (cambiar pantalla, etc.)
      callback();
      
      // Fade desde negro
      if (this.transitionOverlay) {
        this.transitionOverlay.style.transition = `opacity ${fadeInMs}ms ease`;
        this.transitionOverlay.style.opacity = '0';
      }
      
      setTimeout(() => {
        this.transitionOverlay?.classList.remove('active');
      }, fadeInMs);
    }, fadeOutMs);
  }

  private cleanupMenuAudio(): void {
    // Detener TODOS los AudioContexts del menú
    const menuCtx = (window as any).menuAudioContext;
    if (menuCtx) {
      try {
        if (menuCtx.state === 'running') {
          menuCtx.suspend();
        }
        menuCtx.close();
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Si hay un thunderAudioContext del menú, también cerrarlo
    const thunderCtx = (window as any).thunderAudioContext;
    if (thunderCtx) {
      try {
        if (thunderCtx.state === 'running') {
          thunderCtx.suspend();
        }
        thunderCtx.close();
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Limpiar variables globales del menú
    (window as any).menuAudioContext = null;
    (window as any).menuMasterGain = null;
    (window as any).thunderAudioContext = null;
    (window as any).thunderMasterGain = null;
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
    
    const win = window as Window & { showPauseMenu?: () => void; hidePauseMenu?: () => void };
    
    if (this.isPaused) {
      this.inputManager.setPausedByGame(true);
      document.exitPointerLock();
      win.showPauseMenu?.();
    } else {
      this.inputManager.setPausedByGame(false);
      win.hidePauseMenu?.();
      this.inputManager.requestPointerLock();
    }
  }

  private configureLevel(): void {
    const subtitleEl = document.getElementById('levelSubtitle');
    if (subtitleEl) {
      const subtitles: Record<LevelType, string> = {
        level1:   'NIVEL I — LA BÚSQUEDA',
        level2:   'NIVEL II — EL BOTÍN',
        level3:   'NIVEL III — SALAS ABIERTAS',
        level4:   'NIVEL IV — APAGÓN TOTAL',
        ultimate: '⚠ MODO SUPERVIVENCIA ⚠',
      };
      subtitleEl.textContent = subtitles[this.currentLevel];
    }
    // Lore contextual según nivel
    const loreEl = document.getElementById('loreText');
    if (loreEl) {
      const lores: Record<LevelType, string> = {
        level1:   'Hay una salida. Dicen que brilla en verde.<br><br>Nadie sabe si es real o una trampa.<br><br><span style="color:#ff4444;">Encuéntrala antes de que te encuentren a ti.</span>',
        level2:   'Las monedas se esconden en la oscuridad.<br>Recoge 100 puntos... si puedes.<br><br><span style="color:#ffd700;">No dejes que el miedo te frene.</span>',
        level3:   'Los pasillos se abren. El espacio engaña.<br>Aquí no hay esquinas para esconderse.<br><br><span style="color:#88ffaa;">Corre. Siempre corre.</span>',
        level4:   'Las luces han muerto.<br>Solo tienes tu linterna... y no durará.<br><br><span style="color:#ff2222;">No hay suelo que pisar sin luz.</span>',
        ultimate: 'Tres de ellos. Hambrientos. Pacientes.<br>No hay reglas. No hay piedad.<br><br><span style="color:#ff4444;">Sobrevive. No mires atrás.</span>',
      };
      loreEl.innerHTML = lores[this.currentLevel];
    }

    // Objetivo inicial en HUD
    const objInitials: Record<LevelType, string> = {
      level1:   '<span class="obj-title">OBJETIVO</span>🟢 Encuentra la salida verde',
      level2:   `<span class="obj-title">OBJETIVO</span>💰 Recoge <strong>100</strong> puntos en monedas`,
      level3:   '<span class="obj-title">OBJETIVO</span>🟢 Llega a la salida (salas abiertas)',
      level4:   '<span class="obj-title">OBJETIVO</span>🔦 Encuentra la salida — sin luz no hay vida',
      ultimate: '<span class="obj-title">OBJETIVO</span>⚠ Sobrevive el mayor tiempo posible',
    };
    this.uiManager.setLevelObjective(objInitials[this.currentLevel]);
  }

  private applyDifficulty(): void {
    const diff = sessionStorage.getItem('difficulty') || 'normal';
    if (diff === 'easy') {
      CONFIG.RUNNER_SPEED      *= 0.65;
      CONFIG.STALKER_SPEED     *= 0.65;
      CONFIG.TELEPORTER_SPEED  *= 0.65;
      CONFIG.BATTERY_DRAIN_RATE      *= 0.50;
      CONFIG.SANITY_DRAIN_DARK       *= 0.50;
      CONFIG.SANITY_DRAIN_NEAR_ENEMY *= 0.50;
      CONFIG.MONSTER_SPAWN_DELAY     *= 1.60;
    } else if (diff === 'nightmare') {
      CONFIG.RUNNER_SPEED      *= 1.45;
      CONFIG.STALKER_SPEED     *= 1.45;
      CONFIG.TELEPORTER_SPEED  *= 1.45;
      CONFIG.BATTERY_DRAIN_RATE      *= 2.00;
      CONFIG.SANITY_DRAIN_DARK       *= 2.00;
      CONFIG.SANITY_DRAIN_NEAR_ENEMY *= 2.00;
      CONFIG.MONSTER_SPAWN_DELAY     *= 0.55;
    }
    console.log('[Game] Difficulty:', diff);
  }

  private setupStartButton(): void {
    const startOverlay = document.getElementById('startOverlay');
    const tutorialModal = document.getElementById('tutorialModal');
    const tutorialBtn = document.getElementById('tutorialStartBtn');
    const self = this;

    if (startOverlay) {
      startOverlay.addEventListener('click', async () => {
        startOverlay.style.display = 'none';

        // Mostrar tutorial solo en nivel 1 y primera vez
        const isFirstTime = !localStorage.getItem('backrooms_tutorial_done');
        if (tutorialModal && self.currentLevel === 'level1' && isFirstTime) {
          tutorialModal.classList.add('active');
          
          if (tutorialBtn) {
            tutorialBtn.addEventListener('click', () => {
              tutorialModal.classList.remove('active');
              localStorage.setItem('backrooms_tutorial_done', 'true');
              self.startGame();
            });
          }
        } else {
          self.startGame();
        }
      });
    }
  }

  private startGame(): void {
    const self = this;
    
    // Fade-out del overlay de inicio
    const startOverlay = document.getElementById('startOverlay');
    if (startOverlay) {
      startOverlay.style.transition = 'opacity 0.6s ease';
      startOverlay.style.opacity = '0';
      setTimeout(() => {
        startOverlay.style.display = 'none';
      }, 600);
    }
    
    // Fade-in del juego
    if (this.transitionOverlay) {
      this.transitionOverlay.style.transition = 'opacity 0.8s ease';
      this.transitionOverlay.style.opacity = '0';
      this.transitionOverlay.classList.remove('active');
    }
    
    this.inputManager.requestPointerLock();
    this.audioManager.init(this.sceneManager.camera).then(() => {
      this.audioManager.startAmbientMusic();
      this.audioManager.startFluorescentHum();
      this.audioManager.startLevelAmbience(this.currentLevel);
    });
    (window as Window & { togglePause?: () => void }).togglePause = () => this.togglePause();
    
    if (this.currentLevel === 'level4') {
      this.player.battery = 55;
      this.player.isFlashlightOn = true;
      this.sceneManager.toggleFlashlight(true);
    }
    
    this.gameStartTime = Date.now();
    this.statsLastPos.copy(this.player.position);
    this.isActive = true;
    this.animate();
  }

  private async buildMazeChunked(): Promise<void> {
    console.log('[Game] Starting chunked maze build...');
    const startTime = performance.now();

    // Chunk 1: Texturas (puede bloquear, pero es necesario)
    this.uiManager.setLoadingProgress(42, 'Creando texturas...');
    const floorTexture = createFloorTexture(this.currentLevel);
    const wallTexture = createWallTexture(this.currentLevel);
    const ceilingTexture = createCeilingTexture(this.currentLevel);
    await this.yieldToMain();

    // Chunk 2: Materials y geometries
    this.uiManager.setLoadingProgress(44, 'Preparando materiales...');
    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      map: ceilingTexture,
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1
    });
    await this.yieldToMain();

    const unitSize = CONFIG.UNIT_SIZE;
    const wallHeight = CONFIG.WALL_HEIGHT;
    const floorGeometry = new THREE.PlaneGeometry(unitSize, unitSize);
    const ceilingGeometry = new THREE.PlaneGeometry(unitSize, unitSize);
    const wallGeometry = new THREE.BoxGeometry(unitSize, wallHeight, unitSize);
    await this.yieldToMain();

    // Chunk 3: ChunkManager
    this.uiManager.setLoadingProgress(46, 'Inicializando gestor de chunks...');
    this.chunkManager = new ChunkManager(this.sceneManager.scene, this.maze, {
      chunkSize: 5,
      renderDistance: 3,
      instanceThreshold: 50
    });
    await this.yieldToMain();

    // Chunk 4: Coleccionar posiciones y crear objetos en chunks
    this.uiManager.setLoadingProgress(48, 'Construyendo maze...');
    const wallPositions: THREE.Vector3[] = [];
    const floorPositions: THREE.Vector3[] = [];
    const ceilingPositions: THREE.Vector3[] = [];

    const totalCells = this.maze.length * this.maze[0].length;
    let processedCells = 0;
    const CHUNK_SIZE = 100;

    for (let z = 0; z < this.maze.length; z++) {
      for (let x = 0; x < this.maze[z].length; x++) {
        const cell = this.maze[z][x];
        const posX = x * unitSize;
        const posZ = z * unitSize;

        floorPositions.push(new THREE.Vector3(posX, 0, posZ));
        ceilingPositions.push(new THREE.Vector3(posX, wallHeight, posZ));

        if (cell === CellType.WALL) {
          wallPositions.push(new THREE.Vector3(posX, wallHeight / 2, posZ));
        }

        if (cell === CellType.BATTERY) {
          const battery = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.5, 0.3),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
          );
          battery.position.set(posX, 0.5, posZ);
          this.sceneManager.scene.add(battery);
          this.batteries.push(battery);
        }

        if (cell === CellType.POWER_SPEED || cell === CellType.POWER_INVISIBLE || 
            cell === CellType.POWER_STUN || cell === CellType.POWER_SANITY) {
          const powerUpMesh = this.createPowerUpMesh(cell);
          powerUpMesh.position.set(posX, 0.8, posZ);
          this.sceneManager.scene.add(powerUpMesh);
          this.powerUps.push(powerUpMesh);
        }

        if (cell === CellType.NOTE) {
          const noteGeometry = new THREE.PlaneGeometry(0.4, 0.5);
          const noteCanvas = document.createElement('canvas');
          noteCanvas.width = 128;
          noteCanvas.height = 160;
          const ctx = noteCanvas.getContext('2d')!;
          ctx.fillStyle = '#f4e4bc';
          ctx.fillRect(0, 0, 128, 160);
          ctx.fillStyle = '#333';
          ctx.font = '10px monospace';
          ctx.fillText('NOTA', 45, 20);
          ctx.font = '7px monospace';
          const loreNotes = [
            'Día 47: Sigo aquí. La salida no existe. Solo pasillos infinitos y... algo más.',
            'Los trabajadores éramos 12. Ahora solo quedo yo. No preguntes qué les pasó.',
            'Encontré fotos antiguas. Gente sonriente. Nadie sabe qué fue de ellos.',
            'El café de la máquina sigue caliente. Pero nadie lo toca. Nunca.',
            'Oigo susurros desde las paredes. Dicen mi nombre. ¡CONOZCO MI NOMBRE!',
            'La empresa nos pagó por.callar. демasiado tarde para mí.',
            'Hay niveles más abajo. Floor -1. Floor -2. Nadie vuelve de ahí.',
            'El mono amarillo no es una señal. Es una advertencia.',
            'Me voy a esconder. Они меня найдут si me ven.',
            'La luz parpadea cuando están cerca. Créeme, lo sé.',
            '¡ALGUIEN! ¿Hay alguien? Por favor... solo quiero ir a casa.',
            'Encontré una puerta verde. Era una truco. Nada más.',
            'El tiempo no existe aquí. Solo douleur permanente.',
            'Tengo hambre. Sed. Miedo. Esto es el infierno, ¿verdad?',
            'No mires a los ojos del Runner. No quiero pensar en qué pasó.',
            'Помогите! Не могу выбраться! Кто-нибудь!',
            'Las notas son mías. Las otras personas... ya no pueden escribir.',
            '田所先生, 助けて! この怪物から逃げて!',
            'La cámara me sigue. Mi foto salió diferente. Peor.',
            'Contracto: silencio. условие: nunca irse.'
          ];
          const tip = loreNotes[Math.floor(Math.random() * loreNotes.length)];
          const words = tip.split(' ');
          let line = '';
          let y = 40;
          words.forEach(word => {
            if (line.length + word.length > 18) {
              ctx.fillText(line, 8, y);
              line = word + ' ';
              y += 11;
            } else {
              line += word + ' ';
            }
          });
          ctx.fillText(line, 8, y);
          const noteTexture = new THREE.CanvasTexture(noteCanvas);
          const noteMaterial = new THREE.MeshBasicMaterial({ map: noteTexture, side: THREE.DoubleSide });
          const note = new THREE.Mesh(noteGeometry, noteMaterial);
          note.position.set(posX, 1.2, posZ);
          note.rotation.y = Math.random() * Math.PI * 2;
          this.sceneManager.scene.add(note);
          this.notes.push(note);
        }

        if (cell === CellType.PHOTO) {
          const photoGeometry = new THREE.PlaneGeometry(0.5, 0.4);
          const photoCanvas = document.createElement('canvas');
          photoCanvas.width = 160;
          photoCanvas.height = 120;
          const ctx = photoCanvas.getContext('2d')!;
          const photoTypes = [
            { bg: '#1a1a2e', text: 'EQUIPO A', sub: '12/03/1998', color: '#0ff' },
            { bg: '#2d1b1b', text: 'DESAPARECIDOS', sub: 'NUNCA ENCONTRADOS', color: '#f00' },
            { bg: '#1b2d1b', text: 'SALA 7', sub: 'PISO -1', color: '#0f0' },
            { bg: '#1b1b2d', text: 'ESTUDIO 4', sub: 'PROYECTO OLVIDADO', color: '#80f' },
            { bg: '#2d2d1b', text: 'ADVERTENCIA', sub: 'NO ENTRAR', color: '#ff0' },
          ];
          const type = photoTypes[Math.floor(Math.random() * photoTypes.length)];
          ctx.fillStyle = type.bg;
          ctx.fillRect(0, 0, 160, 120);
          ctx.fillStyle = '#333';
          ctx.fillRect(8, 8, 144, 80);
          ctx.fillStyle = '#111';
          ctx.fillRect(12, 12, 136, 72);
          if (Math.random() > 0.5) {
            ctx.fillStyle = '#222';
            for (let i = 0; i < 3; i++) {
              ctx.fillRect(20 + i * 35, 30, 25, 40);
              ctx.beginPath();
              ctx.arc(32 + i * 35, 28, 12, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = '#1a0505';
            ctx.fillRect(60, 20, 40, 55);
            ctx.beginPath();
            ctx.arc(80, 18, 18, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = type.color;
          ctx.font = 'bold 12px monospace';
          ctx.fillText(type.text, 15, 105);
          ctx.font = '7px monospace';
          ctx.fillStyle = '#666';
          ctx.fillText(type.sub, 15, 116);
          ctx.fillStyle = type.color;
          ctx.font = '6px monospace';
          ctx.fillText('ARCHIVO', 130, 115);
          const photoTexture = new THREE.CanvasTexture(photoCanvas);
          const photoMaterial = new THREE.MeshBasicMaterial({ map: photoTexture, side: THREE.DoubleSide });
          const photo = new THREE.Mesh(photoGeometry, photoMaterial);
          photo.position.set(posX, 1.0, posZ);
          photo.rotation.y = Math.random() * Math.PI * 2;
          this.sceneManager.scene.add(photo);
          this.photos.push(photo);
        }

        if (cell === CellType.BLOOD_STAIN) {
          const stainGeometry = new THREE.PlaneGeometry(1.5, 1.5);
          const stainCanvas = document.createElement('canvas');
          stainCanvas.width = 128;
          stainCanvas.height = 128;
          const ctx = stainCanvas.getContext('2d')!;
          ctx.fillStyle = 'transparent';
          ctx.clearRect(0, 0, 128, 128);
          ctx.fillStyle = '#4a0000';
          for (let i = 0; i < 8; i++) {
            const cx = 30 + Math.random() * 68;
            const cy = 30 + Math.random() * 68;
            const r = 10 + Math.random() * 25;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#300000';
          for (let i = 0; i < 15; i++) {
            const cx = 20 + Math.random() * 88;
            const cy = 20 + Math.random() * 88;
            ctx.beginPath();
            ctx.arc(cx, cy, 3 + Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
          }
          const stainTexture = new THREE.CanvasTexture(stainCanvas);
          const stainMaterial = new THREE.MeshBasicMaterial({ 
            map: stainTexture, 
            transparent: true, 
            opacity: 0.6,
            side: THREE.DoubleSide 
          });
          const stain = new THREE.Mesh(stainGeometry, stainMaterial);
          stain.position.set(posX, 0.01, posZ);
          stain.rotation.x = -Math.PI / 2;
          stain.rotation.z = Math.random() * Math.PI * 2;
          this.sceneManager.scene.add(stain);
          this.bloodStains.push(stain);
        }

        if (cell === CellType.RENDIJA) {
          const rendijaWall = new THREE.Mesh(wallGeometry, wallMaterial);
          rendijaWall.position.set(posX, wallHeight / 2, posZ);
          rendijaWall.castShadow = true;
          rendijaWall.receiveShadow = true;
          this.sceneManager.scene.add(rendijaWall);

          const leftEmpty  = this.maze[z]?.[x - 1] !== CellType.WALL && this.maze[z]?.[x - 1] !== CellType.RENDIJA;
          const rightEmpty = this.maze[z]?.[x + 1] !== CellType.WALL && this.maze[z]?.[x + 1] !== CellType.RENDIJA;
          const isHorizontal = leftEmpty || rightEmpty;

          const cc = document.createElement('canvas');
          cc.width = 32; cc.height = 256;
          const ctx = cc.getContext('2d')!;
          ctx.clearRect(0, 0, 32, 256);
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(16, 4);
          ctx.lineTo(13, 55); ctx.lineTo(19, 100);
          ctx.lineTo(12, 155); ctx.lineTo(17, 200);
          ctx.lineTo(15, 252);
          ctx.stroke();

          const grd = ctx.createLinearGradient(16, 0, 16, 256);
          grd.addColorStop(0,    'rgba(255,80,0,0)');
          grd.addColorStop(0.1,  'rgba(255,100,10,0.7)');
          grd.addColorStop(0.5,  'rgba(255,60,0,1)');
          grd.addColorStop(0.9,  'rgba(255,100,10,0.7)');
          grd.addColorStop(1,    'rgba(255,80,0,0)');
          ctx.strokeStyle = grd;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.strokeStyle = 'rgba(200,60,0,0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(13, 55); ctx.lineTo(4, 70); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(19, 120); ctx.lineTo(28, 135); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(12, 170); ctx.lineTo(3, 185); ctx.stroke();

          const crackTex = new THREE.CanvasTexture(cc);
          const crackMat = new THREE.MeshBasicMaterial({
            map: crackTex,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          });

          const halfU = unitSize * 0.501;
          const crackGeomInst = new THREE.PlaneGeometry(unitSize * 0.18, wallHeight * 0.9);
          for (const sign of [-1, 1]) {
            const crackMesh = new THREE.Mesh(crackGeomInst, crackMat);
            if (isHorizontal) {
              crackMesh.position.set(posX + sign * halfU, wallHeight / 2, posZ);
              crackMesh.rotation.y = Math.PI / 2;
            } else {
              crackMesh.position.set(posX, wallHeight / 2, posZ + sign * halfU);
              crackMesh.rotation.y = 0;
            }
            this.sceneManager.scene.add(crackMesh);
          }

          const rendijaLight = new THREE.PointLight(0xff4400, 1.2, 4);
          rendijaLight.position.set(posX, wallHeight * 0.45, posZ);
          this.sceneManager.scene.add(rendijaLight);
        }

        if (cell === CellType.HIDING_SPOT) {
          const coffinDirs = [
            { dx: 0,  dz: -1, angle: 0 },
            { dx: 1,  dz:  0, angle: -Math.PI / 2 },
            { dx: 0,  dz:  1, angle: Math.PI },
            { dx: -1, dz:  0, angle: Math.PI / 2 },
          ];
          let chosenDir = coffinDirs[0];
          for (const d of coffinDirs) {
            const nx = x + d.dx, nz = z + d.dz;
            if (nz >= 0 && nz < this.maze.length && nx >= 0 && nx < this.maze[nz].length) {
              if (this.maze[nz][nx] === CellType.WALL) { chosenDir = d; break; }
            }
          }

          const cW = 0.75, cH = 2.25, cD = 0.50;
          const wallOff = unitSize * 0.5 - cD * 0.15;
          const cx = posX + chosenDir.dx * wallOff;
          const cz = posZ + chosenDir.dz * wallOff;

          const wc = document.createElement('canvas');
          wc.width = 64; wc.height = 128;
          const wctx = wc.getContext('2d')!;
          wctx.fillStyle = '#1a0c06'; wctx.fillRect(0, 0, 64, 128);
          for (let gi = 0; gi < 10; gi++) {
            wctx.strokeStyle = `rgba(50,25,8,${0.25 + Math.random() * 0.35})`;
            wctx.lineWidth = 1;
            wctx.beginPath(); wctx.moveTo(0, gi * 13); wctx.lineTo(64, gi * 13 + (Math.random() * 4 - 2)); wctx.stroke();
          }
          const woodTex = new THREE.CanvasTexture(wc);

          const coffinMesh = new THREE.Mesh(
            new THREE.BoxGeometry(cW, cH, cD),
            new THREE.MeshStandardMaterial({ map: woodTex, color: 0x0d0806, roughness: 0.95, emissive: new THREE.Color(0x0a0400), emissiveIntensity: 0.25 })
          );
          coffinMesh.position.set(cx, cH / 2, cz);
          coffinMesh.rotation.y = chosenDir.angle;
          coffinMesh.castShadow = true;
          this.sceneManager.scene.add(coffinMesh);

          const faceDir = new THREE.Vector3(-chosenDir.dx, 0, -chosenDir.dz);
          const crossMat = new THREE.MeshBasicMaterial({ color: 0x3a1800 });
          const crossPos = new THREE.Vector3(cx + faceDir.x * (cD / 2 + 0.012), cH * 0.62, cz + faceDir.z * (cD / 2 + 0.012));
          const crossH2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.015), crossMat);
          crossH2.position.copy(crossPos); crossH2.rotation.y = chosenDir.angle;
          const crossV2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.015), crossMat);
          crossV2.position.copy(crossPos); crossV2.rotation.y = chosenDir.angle;
          this.sceneManager.scene.add(crossH2); this.sceneManager.scene.add(crossV2);

          const glowMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(cW + 0.3, cD + 0.3),
            new THREE.MeshBasicMaterial({ color: 0x1a0800, transparent: true, opacity: 0.5, depthWrite: false })
          );
          glowMesh.rotation.x = -Math.PI / 2;
          glowMesh.rotation.z = chosenDir.angle;
          glowMesh.position.set(cx, 0.01, cz);
          this.sceneManager.scene.add(glowMesh);
        }

        if (cell === CellType.EXIT) {
          const doorGroup = new THREE.Group();
          doorGroup.position.set(posX - unitSize * 0.35, 0, posZ);

          const doorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(unitSize * 0.72, wallHeight * 0.92, 0.1),
            new THREE.MeshStandardMaterial({
              color: 0x003300,
              emissive: new THREE.Color(0x00aa33),
              emissiveIntensity: 0.4,
              roughness: 0.8,
            })
          );
          doorMesh.position.set(unitSize * 0.35, wallHeight * 0.46, 0);
          doorGroup.add(doorMesh);

          const frameMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
          const frameTop = new THREE.Mesh(new THREE.BoxGeometry(unitSize * 0.8, 0.06, 0.12), frameMat);
          frameTop.position.set(unitSize * 0.35, wallHeight * 0.94, 0);
          doorGroup.add(frameTop);
          const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallHeight * 0.92, 0.12), frameMat);
          frameL.position.set(0.03, wallHeight * 0.46, 0);
          doorGroup.add(frameL);
          const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallHeight * 0.92, 0.12), frameMat);
          frameR.position.set(unitSize * 0.72, wallHeight * 0.46, 0);
          doorGroup.add(frameR);

          const exitLight = new THREE.PointLight(0x00ff44, 1.5, 8, 2);
          exitLight.position.set(unitSize * 0.35, wallHeight + 0.3, 0);
          doorGroup.add(exitLight);

          this.sceneManager.scene.add(doorGroup);
          this.exitDoor = doorGroup;
          this.exitWorldPos.set(posX, wallHeight / 2, posZ);
        }

        if (cell === CellType.CEILING_LIGHT && this.currentLevel !== 'level4') {
          const lightBulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          lightBulb.position.set(posX, wallHeight - 0.1, posZ);
          this.sceneManager.scene.add(lightBulb);

          const ceilingLight = new THREE.PointLight(0xffffee, 0.8, 8, 1.5);
          ceilingLight.position.set(posX, wallHeight - 0.3, posZ);
          ceilingLight.castShadow = false;
          this.sceneManager.scene.add(ceilingLight);
          this.ceilingLights.push(new THREE.Vector3(posX, 0, posZ));
          this.ceilingLightMeshes.push(ceilingLight);
        }

        if (cell !== CellType.WALL && cell !== CellType.EXIT && x > 2 && z > 2 &&
            x < this.maze[z].length - 2 && z < this.maze.length - 2) {
          this.emptyWalkablePositions.push(new THREE.Vector3(posX, 0, posZ));
        }

        if (this.currentLevel === 'level2' && cell === CellType.EMPTY && (x > 3 || z > 3)) {
          if (Math.random() < 0.08) {
            const coin = new THREE.Mesh(
              new THREE.SphereGeometry(0.25, 16, 16),
              new THREE.MeshBasicMaterial({ color: 0xffd700 })
            );
            coin.position.set(posX, 0.5, posZ);
            this.sceneManager.scene.add(coin);
            this.coins.push(coin);
          }
        }

        if (cell !== CellType.WALL && this.currentLevel !== 'level4' && Math.random() < 0.1) {
          this.horrorEffects.addFlickeringLight(
            new THREE.Vector3(posX, wallHeight - 0.5, posZ)
          );
        }

        processedCells++;
        if (processedCells % CHUNK_SIZE === 0) {
          const progress = 48 + Math.round((processedCells / totalCells) * 10);
          this.uiManager.setLoadingProgress(progress, `Construyendo maze... ${Math.round((processedCells / totalCells) * 100)}%`);
          await this.yieldToMain();
        }
      }
    }

    // Chunk 5: InstancedMeshes
    this.uiManager.setLoadingProgress(56, 'Creando meshes...');
    this.createInstancedFloors(floorPositions, floorMaterial, floorGeometry);
    await this.yieldToMain();
    
    this.uiManager.setLoadingProgress(57, 'Creando ceilings...');
    this.createInstancedCeilings(ceilingPositions, ceilingMaterial, ceilingGeometry);
    await this.yieldToMain();
    
    this.uiManager.setLoadingProgress(58, 'Creando paredes...');
    this.createInstancedWalls(wallPositions, wallMaterial, wallGeometry);
    await this.yieldToMain();

    // Chunk 6: Scary pictures y arrows
    this.uiManager.setLoadingProgress(59, 'Añadiendo detalles...');
    this.addScaryPictures();
    await this.yieldToMain();
    
    this.addExitArrows();
    
    const elapsed = performance.now() - startTime;
    console.log(`[Game] Maze built in ${elapsed.toFixed(0)}ms`);
  }

  private createInstancedWalls(positions: THREE.Vector3[], material: THREE.MeshStandardMaterial, geometry: THREE.BoxGeometry): void {
    if (positions.length < 50) {
      for (const pos of positions) {
        const wall = new THREE.Mesh(geometry, material);
        wall.position.copy(pos);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.sceneManager.scene.add(wall);
      }
      console.log(`[Game] Created ${positions.length} individual walls (below threshold)`);
      return;
    }

    const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < positions.length; i++) {
      matrix.setPosition(positions[i]);
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    instancedMesh.frustumCulled = true;

    this.sceneManager.scene.add(instancedMesh);

    console.log(`[Game] Created instanced mesh with ${positions.length} walls (optimized)`);
  }

  private createInstancedFloors(positions: THREE.Vector3[], material: THREE.MeshStandardMaterial, geometry: THREE.PlaneGeometry): void {
    const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < positions.length; i++) {
      matrix.makeRotationX(-Math.PI / 2);
      matrix.setPosition(positions[i]);
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.receiveShadow = true;
    instancedMesh.frustumCulled = true;

    this.sceneManager.scene.add(instancedMesh);
    console.log(`[Game] Created instanced mesh with ${positions.length} floors`);
  }

  private createInstancedCeilings(positions: THREE.Vector3[], material: THREE.MeshStandardMaterial, geometry: THREE.PlaneGeometry): void {
    const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < positions.length; i++) {
      matrix.makeRotationX(Math.PI / 2);
      matrix.setPosition(positions[i]);
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.receiveShadow = true;
    instancedMesh.frustumCulled = true;

    this.sceneManager.scene.add(instancedMesh);
    console.log(`[Game] Created instanced mesh with ${positions.length} ceilings`);
  }

  /** BFS desde la salida → mapa de distancias mínimas por celda caminable. */
  private buildExitDistanceMap(): number[][] | null {
    const rows = this.maze.length;
    const cols = this.maze[0].length;
    const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));

    let exitX = -1, exitZ = -1;
    for (let z = 0; z < rows && exitX === -1; z++)
      for (let x = 0; x < cols && exitX === -1; x++)
        if (this.maze[z][x] === CellType.EXIT) { exitX = x; exitZ = z; }
    if (exitX === -1) return null;

    const queue: [number, number][] = [[exitX, exitZ]];
    dist[exitZ][exitX] = 0;
    const dirs4 = [[0,1],[0,-1],[1,0],[-1,0]];

    while (queue.length > 0) {
      const [cx, cz] = queue.shift()!;
      for (const [ddx, ddz] of dirs4) {
        const nx = cx + ddx, nz = cz + ddz;
        if (nz >= 0 && nz < rows && nx >= 0 && nx < cols &&
            dist[nz][nx] === -1 && this.maze[nz][nx] !== CellType.WALL) {
          dist[nz][nx] = dist[cz][cx] + 1;
          queue.push([nx, nz]);
        }
      }
    }
    return dist;
  }

  /** Flechas pintadas en las paredes que indican la ruta real del laberinto hacia la salida.
   *  Usan BFS para que la dirección siempre sea el siguiente paso del camino óptimo. */
  private addExitArrows(): void {
    const distMap = this.buildExitDistanceMap();
    if (!distMap) return;

    const unitSize = CONFIG.UNIT_SIZE;
    const arrowTexture = this.createArrowTexture();
    const arrowGeo = new THREE.PlaneGeometry(0.9, 0.65);
    const arrowMat = new THREE.MeshStandardMaterial({
      map: arrowTexture,
      transparent: true,
      alphaTest: 0.05,
      roughness: 1.0,
      metalness: 0.0,
      emissive: new THREE.Color(0x3a2800),
      emissiveIntensity: 0.6,
    });

    // Configuración de cada cara de pared posible (la pared debe estar al lado de la celda vacía).
    // getArrowAngle recibe el paso BFS (dx,dz) normalizado y devuelve rotation.z.
    const wallConfigs = [
      {
        wallDx: 0, wallDz: 1,   // pared al sur → plano mira al norte (hacia el corredor)
        planeOffsetX: 0, planeOffsetZ: unitSize / 2 - 0.06,
        rotY: Math.PI,
        getArrowAngle: (dx: number, _dz: number) => dx >= 0 ? Math.PI : 0,
      },
      {
        wallDx: 0, wallDz: -1,  // pared al norte → plano mira al sur
        planeOffsetX: 0, planeOffsetZ: -(unitSize / 2 - 0.06),
        rotY: 0,
        getArrowAngle: (dx: number, _dz: number) => dx > 0 ? 0 : Math.PI,
      },
      {
        wallDx: 1, wallDz: 0,   // pared al este → plano mira al oeste
        planeOffsetX: unitSize / 2 - 0.06, planeOffsetZ: 0,
        rotY: -Math.PI / 2,
        getArrowAngle: (_dx: number, dz: number) => dz <= 0 ? Math.PI : 0,
      },
      {
        wallDx: -1, wallDz: 0,  // pared al oeste → plano mira al este
        planeOffsetX: -(unitSize / 2 - 0.06), planeOffsetZ: 0,
        rotY: Math.PI / 2,
        getArrowAngle: (_dx: number, dz: number) => dz >= 0 ? Math.PI : 0,
      },
    ];

    const dirs4 = [{dx:-1,dz:0},{dx:1,dz:0},{dx:0,dz:-1},{dx:0,dz:1}];

    for (let z = 2; z < this.maze.length - 2; z++) {
      for (let x = 2; x < this.maze[z].length - 2; x++) {
        if (this.maze[z][x] !== CellType.EMPTY) continue;
        if (Math.abs(x - 1) + Math.abs(z - 1) < 6) continue;    // zona de spawn
        if ((x * 3 + z * 7) % 11 !== 0) continue;               // densidad espaciada

        // --- Dirección BFS: vecino caminable con menor distancia a la salida ---
        let bestDx = 0, bestDz = 0, minDist = Infinity;
        for (const d of dirs4) {
          const nx = x + d.dx, nz = z + d.dz;
          if (nz >= 0 && nz < this.maze.length && nx >= 0 && nx < this.maze[0].length) {
            const dv = distMap[nz][nx];
            if (dv >= 0 && dv < minDist) { minDist = dv; bestDx = d.dx; bestDz = d.dz; }
          }
        }
        if (minDist === Infinity) continue; // celda aislada, nada que hacer

        const worldX = x * unitSize;
        const worldZ = z * unitSize;

        // Preferir paredes perpendiculares a la dirección de movimiento
        const dominantX = Math.abs(bestDx) >= Math.abs(bestDz);
        const sorted = dominantX
          ? [...wallConfigs.filter(c => c.wallDz !== 0), ...wallConfigs.filter(c => c.wallDx !== 0)]
          : [...wallConfigs.filter(c => c.wallDx !== 0), ...wallConfigs.filter(c => c.wallDz !== 0)];

        for (const cfg of sorted) {
          const nx = x + cfg.wallDx;
          const nz = z + cfg.wallDz;
          if (nz < 0 || nz >= this.maze.length || nx < 0 || nx >= this.maze[nz].length) continue;
          if (this.maze[nz][nx] !== CellType.WALL) continue;

          const arrow = new THREE.Mesh(arrowGeo, arrowMat.clone());
          arrow.position.set(worldX + cfg.planeOffsetX, 1.45, worldZ + cfg.planeOffsetZ);
          arrow.rotation.y = cfg.rotY;
          arrow.rotation.z = cfg.getArrowAngle(bestDx, bestDz);
          this.sceneManager.scene.add(arrow);
          break;
        }
      }
    }
  }

  private addScaryPictures(): void {
    const unitSize = CONFIG.UNIT_SIZE;
    const wallHeight = CONFIG.WALL_HEIGHT;
    const pictureCount = 5 + Math.floor(Math.random() * 4);

    const scaryImages = [
      { text: 'CORPORATION', subtext: 'TE NECESITA', dark: true },
      { text: 'SALIDA', subtext: '→ → →', dark: false },
      { text: 'NO MIRES', subtext: 'ATRÁS', dark: true },
      { text: '¿QUIÉN', subtext: 'ESTÁ AHÍ?', dark: true },
      { text: 'AYUDA', subtext: ' POR FAVOR', dark: false },
      { text: 'SÉ QUE', subtext: 'TE VEO', dark: true },
      { text: 'VUELVE', subtext: 'A casa', dark: false },
      { text: 'ERROR', subtext: '404: cordura no encontrada', dark: true },
    ];

    const wallConfigs = [
      { dx: 0, dz: 1, offsetZ: unitSize / 2 - 0.02, rotY: Math.PI },
      { dx: 0, dz: -1, offsetZ: -(unitSize / 2 - 0.02), rotY: 0 },
      { dx: 1, dz: 0, offsetX: unitSize / 2 - 0.02, rotY: -Math.PI / 2 },
      { dx: -1, dz: 0, offsetX: -(unitSize / 2 - 0.02), rotY: Math.PI / 2 },
    ];

    let placed = 0;
    const maxAttempts = 200;
    let attempts = 0;

    while (placed < pictureCount && attempts < maxAttempts) {
      attempts++;
      const x = 3 + Math.floor(Math.random() * (this.maze[0].length - 6));
      const z = 3 + Math.floor(Math.random() * (this.maze.length - 6));

      if (this.maze[z][x] !== CellType.EMPTY) continue;
      if (Math.abs(x - 1) + Math.abs(z - 1) < 8) continue;

      const config = wallConfigs[Math.floor(Math.random() * wallConfigs.length)];
      const nx = x + config.dx;
      const nz = z + config.dz;

      if (nx < 0 || nx >= this.maze[0].length || nz < 0 || nz >= this.maze.length) continue;
      if (this.maze[nz][nx] !== CellType.WALL) continue;

      const imageData = scaryImages[Math.floor(Math.random() * scaryImages.length)];
      const texture = this.createScaryPictureTexture(imageData.text, imageData.subtext, imageData.dark);
      const geo = new THREE.PlaneGeometry(1.0, 0.7);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
      });

      const picture = new THREE.Mesh(geo, mat);
      const posX = x * unitSize + (config.offsetX || 0);
      const posZ = z * unitSize + (config.offsetZ || 0);
      picture.position.set(posX, 1.5, posZ);
      picture.rotation.y = config.rotY;

      this.sceneManager.scene.add(picture);
      placed++;
    }
  }

  private createScaryPictureTexture(mainText: string, subtext: string, dark: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 180;
    const ctx = canvas.getContext('2d')!;

    if (dark) {
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(0, 0, 256, 180);
      ctx.strokeStyle = '#4a1515';
    } else {
      ctx.fillStyle = '#f5f0e0';
      ctx.fillRect(0, 0, 256, 180);
      ctx.strokeStyle = '#8a7a6a';
    }
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, 246, 170);

    ctx.fillStyle = dark ? '#cc2222' : '#553300';
    ctx.font = 'bold 32px Creepster, cursive';
    ctx.textAlign = 'center';
    ctx.fillText(mainText, 128, 70);

    ctx.fillStyle = dark ? '#884444' : '#776655';
    ctx.font = '20px VT323, monospace';
    ctx.fillText(subtext, 128, 110);

    ctx.fillStyle = dark ? '#331111' : '#a09080';
    ctx.font = '12px monospace';
    for (let i = 0; i < 5; i++) {
      ctx.fillText('░', 20 + Math.random() * 216, 140 + Math.random() * 30);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /** Canvas texture de flecha apuntando a la derecha (→).
   *  Sin emissive: solo visible bajo iluminación (linterna). */
  private createArrowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);

    // Fondo muy sutil — casi transparente
    ctx.fillStyle = 'rgba(40, 30, 10, 0.08)';
    ctx.fillRect(0, 0, 256, 256);

    // Flecha tipo pintada a mano (aspecto de graffiti/pintura)
    ctx.save();
    ctx.translate(128, 128);

    // Sombra para dar aspecto de pintura
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Cuerpo de la flecha apuntando DERECHA (→)
    ctx.fillStyle = 'rgba(230, 210, 150, 0.88)';
    ctx.beginPath();
    ctx.moveTo(-95, -18);
    ctx.lineTo(30, -18);
    ctx.lineTo(30, -45);
    ctx.lineTo(100, 0);
    ctx.lineTo(30, 45);
    ctx.lineTo(30, 18);
    ctx.lineTo(-95, 18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    return new THREE.CanvasTexture(canvas);
  }

  private createPowerUpMesh(cellType: number): THREE.Mesh {
    const colors: Record<number, { color: number; emissive: number }> = {
      [CellType.POWER_SPEED]:     { color: 0xff8800, emissive: 0xff4400 },
      [CellType.POWER_INVISIBLE]: { color: 0x00ffff, emissive: 0x0088ff },
      [CellType.POWER_STUN]:      { color: 0xffff00, emissive: 0xffaa00 },
      [CellType.POWER_SANITY]:    { color: 0xff00ff, emissive: 0xaa00ff },
    };
    const style = colors[cellType] || { color: 0xffffff, emissive: 0x888888 };

    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: style.emissive,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1,
      })
    );
    group.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.04, 8, 24),
      new THREE.MeshBasicMaterial({
        color: style.color,
        transparent: true,
        opacity: 0.5,
      })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const light = new THREE.PointLight(style.color, 1.5, 6);
    light.position.set(0, 0.5, 0);
    group.add(light);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    mesh.userData = { cellType, group };
    group.userData = { core, ring, light };
    mesh.add(group);

    return mesh;
  }

  private showStats(isVictory: boolean): void {
    const elapsed = (Date.now() - this.gameStartTime) / 1000;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);

    const set = (id: string, val: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('statTime',  `${mins}:${secs.toString().padStart(2, '0')}`);
    set('statDist',  `${Math.round(this.statsDistanceWalked)} m`);
    set('statBatt',  String(this.statsBatteriesCollected));
    set('statClose', String(this.statsCloseCallsEnemies));
    set('statHide',  String(this.statsHidingCount));

    const coinsRow = document.getElementById('statCoinsRow');
    if (coinsRow) {
      coinsRow.style.display = this.currentLevel === 'level2' ? 'flex' : 'none';
      set('statCoins', `${this.statsCoinsCollected}`);
    }

    const panel = document.getElementById('statsPanel');
    if (panel) {
      panel.style.display = 'block';
      panel.style.borderColor = isVictory ? 'rgba(0,255,136,0.3)' : 'rgba(255,60,60,0.3)';
    }
  }

  private triggerVictory(message: string): void {
    document.exitPointerLock();
    this.audioManager.playItemPickup();

    const elapsed = (Date.now() - this.gameStartTime) / 1000;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    
    const score = this.currentLevel === 'level2' ? this.score : Math.max(0, 1000 - Math.floor(elapsed * 10));
    const isTop3 = ScoreManager.saveHighscore(this.currentLevel, score, elapsed);
    
    const stats = ScoreManager.getStats();
    stats.totalVictories++;
    stats.totalCoins += this.statsCoinsCollected;
    stats.totalBatteries += this.statsBatteriesCollected;
    if (!stats.levelsCompleted[this.currentLevel]) {
      stats.levelsCompleted[this.currentLevel] = 0;
    }
    stats.levelsCompleted[this.currentLevel]++;
    ScoreManager.saveStats(stats);
    
    if (mins < 2 && this.currentLevel === 'level1') {
      ScoreManager.unlockAchievement('speedrunner');
    }
    ScoreManager.unlockAchievement('first_escape');

    const subtexts: Partial<Record<LevelType, string>> = {
      level2: '¡Recogiste todas las monedas! Conseguiste escapar.',
    };
    const subtext = subtexts[this.currentLevel] ?? '¡Lograste escapar de los Backrooms!';

    // Fade transition to victory screen
    this.transitionFade(() => {
      const overlay = document.getElementById('gameOverOverlay');
      const title = overlay?.querySelector('h1');
      const text = overlay?.querySelector('p');
      const btn = document.getElementById('restartButton') as HTMLAnchorElement | null;

      if (title) { title.textContent = message; title.style.color = '#00ff88'; }
      if (text) {
        let finalText = subtext;
        if (isTop3) {
          finalText += ` ¡NUEVO RÉCORD #${score}!`;
        }
        text.textContent = finalText;
      }
      if (btn) {
        btn.textContent = 'VOLVER AL MENÚ';
        btn.href = 'index.html';
        btn.style.borderColor = '#00ff88';
      }
      this.showStats(true);
      if (overlay) overlay.classList.add('active');
    }, 400, 600);
  }

  private triggerJumpscare(killingEnemy: Enemy): void {
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const flash = document.getElementById('screenFlash');

    const doFlash = (color: string, ms: number, opacity = 0.75) => {
      if (!flash) return;
      flash.style.background = color;
      flash.style.transition = 'none';
      flash.style.opacity = String(opacity);
      void (flash as HTMLElement).offsetWidth;
      flash.style.transition = `opacity ${ms}ms ease-out`;
      flash.style.opacity = '0';
    };

    // Stats y logros
    const stats = ScoreManager.getStats();
    stats.totalDeaths++;
    stats.totalCoins      += this.statsCoinsCollected;
    stats.totalBatteries  += this.statsBatteriesCollected;
    ScoreManager.saveStats(stats);
    ScoreManager.unlockAchievement('first_death');

    // Flash rojo inmediato + sonido
    doFlash('#cc0000', 80);
    this.audioManager.playJumpscareSound();

    // Apagar linterna — oscuridad total
    this.sceneManager.toggleFlashlight(false);
    this.sceneManager.ambientLight.intensity = 0.02;

    // Iniciar animación de mordida del enemigo
    killingEnemy.startEatAnimation(this.sceneManager.camera, () => {
      // Momento de la mordida: flash rojo fuerte + segundo sonido
      doFlash('#ff0000', 350, 0.9);
      this.audioManager.playJumpscareSound();
    });

    // Overlay rojo que se oscurece durante la animación
    const eatOverlay = document.createElement('div');
    eatOverlay.style.cssText = `
      position:fixed;inset:0;background:rgba(120,0,0,0);
      pointer-events:none;z-index:8000;transition:none;
    `;
    document.body.appendChild(eatOverlay);

    // Loop de animación dedicado (el loop principal se detuvo por gameOver=true)
    const eatClock = new THREE.Clock();
    eatClock.getDelta(); // consumir primer delta
    let eatElapsed = 0;
    const EAT_DURATION = Enemy.EAT_DURATION;

    const eatLoop = () => {
      const d = Math.min(eatClock.getDelta(), 0.05);
      eatElapsed += d;
      const progress = Math.min(1, eatElapsed / EAT_DURATION);

      // Sacudida de cámara creciente
      this.sceneManager.startCameraShake(0.08 + progress * 0.45, 0.06);

      // Overlay rojo se vuelve negro progresivamente en la última tercera parte
      if (progress > 0.6) {
        const fade = (progress - 0.6) / 0.4;
        eatOverlay.style.background = `rgba(${Math.round(120 * (1 - fade))},0,0,${(0.3 + fade * 0.7).toFixed(2)})`;
      }

      const stillEating = killingEnemy.updateEatAnimation(d);
      this.sceneManager.render();

      if (stillEating) {
        requestAnimationFrame(eatLoop);
      } else {
        // Pantalla negra total → modal
        eatOverlay.style.background = 'rgba(0,0,0,1)';
        setTimeout(() => {
          document.body.removeChild(eatOverlay);
          this.showStats(false);
          if (gameOverOverlay) gameOverOverlay.classList.add('active');
          document.exitPointerLock();
        }, 350);
      }
    };
    requestAnimationFrame(eatLoop);
  }

  private triggerSanityGameOver(): void {
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const gameOverText = gameOverOverlay?.querySelector('p');
    const gameOverTitle = gameOverOverlay?.querySelector('h1');

    if (gameOverTitle) gameOverTitle.textContent = '¡HAS PERDIDO LA CORDURA!';
    if (gameOverText)  gameOverText.textContent  = 'La oscuridad te consumió...';

    const stats = ScoreManager.getStats();
    stats.totalDeaths++;
    stats.totalCoins += this.statsCoinsCollected;
    stats.totalBatteries += this.statsBatteriesCollected;
    ScoreManager.saveStats(stats);
    
    ScoreManager.unlockAchievement('first_death');

    // Fade transition
    this.transitionFade(() => {
      this.showStats(false);
      if (gameOverOverlay) {
        gameOverOverlay.classList.add('active');
        this.audioManager.playJumpscareSound();
      }
    }, 500, 600);

    document.exitPointerLock();
    console.log('[Game] Game Over - Player lost sanity');
  }

  private createFootprintTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 56;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 32, 56);
    ctx.fillStyle = 'rgba(18,10,4,0.75)';
    // Talón
    ctx.beginPath(); ctx.ellipse(16, 42, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Puntera
    ctx.beginPath(); ctx.ellipse(16, 16, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    // Arco (puente)
    ctx.fillStyle = 'rgba(18,10,4,0.4)';
    ctx.beginPath(); ctx.ellipse(16, 30, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  private initFootprintPool(): void {
    this.footprintTex = this.createFootprintTexture();
    this.footprintMat = new THREE.MeshBasicMaterial({
      map: this.footprintTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.footprintGeo = new THREE.PlaneGeometry(0.22, 0.38);

    for (let i = 0; i < this.MAX_FOOTPRINTS; i++) {
      const mesh = new THREE.Mesh(this.footprintGeo, this.footprintMat);
      mesh.visible = false;
      this.sceneManager.scene.add(mesh);
      this.footprintPool.push(mesh);
    }
  }

  private addFootprint(): void {
    if (!this.footprintGeo || !this.footprintMat) return; // Pool no listo (no debería pasar)

    if (!this.footprintPool.length) {
      // Pool vacío: reutilizar la huella más antigua
      const old = this.footprints.shift()!;
      this.footprintPool.push(old.mesh);
    }

    const mesh = this.footprintPool.pop()!;

    const sideOffset = this.footprintLeft ? 0.16 : -0.16;
    const rx = Math.cos(this.player.yaw) * sideOffset;
    const rz = -Math.sin(this.player.yaw) * sideOffset;

    mesh.position.set(this.player.position.x + rx, 0.012, this.player.position.z + rz);
    // -PI/2 para tumbarlo en el suelo, yaw para orientarlo en la dirección del jugador
    mesh.rotation.set(-Math.PI / 2, this.player.yaw, 0);
    mesh.visible = true;

    this.footprintLeft = !this.footprintLeft;
    this.footprints.push({ mesh, life: this.FOOTPRINT_LIFETIME });
  }

  private updateFootprints(delta: number): void {
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      fp.life -= delta;
      if (fp.life <= 0) {
        fp.mesh.visible = false;
        this.footprintPool.push(fp.mesh);
        this.footprints.splice(i, 1);
      }
    }
  }

  private getEnemyTypesForLevel(): EnemyType[] {
    switch (this.currentLevel) {
      case 'level1':   return [EnemyType.STALKER];
      case 'level2':   return [EnemyType.RUNNER, EnemyType.STALKER];
      case 'level3':   return [EnemyType.STALKER, EnemyType.TELEPORTER];
      case 'level4':   return [EnemyType.RUNNER, EnemyType.RUNNER, EnemyType.STALKER];
      case 'ultimate': return [EnemyType.RUNNER, EnemyType.STALKER, EnemyType.TELEPORTER];
      default:         return [];
    }
  }

  /** Crea los meshes de los enemigos durante la carga (pantalla de carga visible).
   *  Al spawnear solo hay que reposicionar y hacer visible — zero geometry creation en gameplay. */
  private async prewarmEnemies(): Promise<void> {
    const types = this.getEnemyTypesForLevel();
    const farPos = new THREE.Vector3(-9999, 0, -9999);
    for (const type of types) {
      const enemy = new Enemy(type, farPos, this.sceneManager.scene, this.maze);
      enemy.mesh.visible = false;
      this.enemyPool.push(enemy);
      await this.yieldToMain(); // ceder el hilo entre cada enemigo
    }
  }

  private doSpawnEnemies(): void {
    if (this.monsterSpawned) return;
    this.monsterSpawned = true;

    // Los meshes ya están creados en enemyPool — solo reposicionar y activar
    this.enemyPool.forEach((enemy, index) => {
      setTimeout(() => {
        if (!this.isActive) return;
        const pos = this.mazeGenerator.findRandomEmptyPosition(8);
        if (pos) {
          const spawnX = pos.x * CONFIG.UNIT_SIZE;
          const spawnZ = pos.z * CONFIG.UNIT_SIZE;
          enemy.position.set(spawnX, 0, spawnZ);
          enemy.mesh.position.set(spawnX, 0, spawnZ);
          enemy.mesh.visible = true;
          this.enemies.push(enemy);
        }
      }, index * 80);
    });

    this.enemyPool = [];
    console.log('[Game] Enemies activated for level:', this.currentLevel);
  }

  private checkBatteryCollection(): void {
    for (let i = this.batteries.length - 1; i >= 0; i--) {
      const battery = this.batteries[i];
      const dist = this.player.position.distanceTo(battery.position);
      
      if (dist < CONFIG.UNIT_SIZE) {
        const cellX = Math.round(battery.position.x / CONFIG.UNIT_SIZE);
        const cellZ = Math.round(battery.position.z / CONFIG.UNIT_SIZE);
        
        if (this.maze[cellZ] && this.maze[cellZ][cellX] === CellType.BATTERY) {
          this.maze[cellZ][cellX] = CellType.EMPTY;
          this.sceneManager.scene.remove(battery);
          this.batteries.splice(i, 1);
          this.player.collectBattery();
          this.statsBatteriesCollected++;
          this.audioManager.playItemPickup();
          this.showPickupMessage('¡BATERÍA! +40%');
          console.log('[Game] Battery collected! New battery level:', this.player.battery);
        }
      }
    }

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      const dist = this.player.position.distanceTo(note.position);
      
      if (dist < CONFIG.UNIT_SIZE * 0.8) {
        this.sceneManager.scene.remove(note);
        this.notes.splice(i, 1);
        this.audioManager.playNoteFound();
        this.showNote();
        console.log('[Game] Note collected!');
      }
    }

    for (let i = this.photos.length - 1; i >= 0; i--) {
      const photo = this.photos[i];
      const dist = this.player.position.distanceTo(photo.position);
      
      if (dist < CONFIG.UNIT_SIZE * 0.8) {
        this.sceneManager.scene.remove(photo);
        this.photos.splice(i, 1);
        this.audioManager.playItemPickup();
        this.showPhoto();
        console.log('[Game] Photo collected!');
      }
    }

    if (this.currentLevel === 'level2') {
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        const dist = this.player.position.distanceTo(coin.position);
        
        if (dist < CONFIG.UNIT_SIZE * 0.8) {
          this.sceneManager.scene.remove(coin);
          this.coins.splice(i, 1);
          this.invalidateMinimapStatic();
          this.score += 10;
          this.statsCoinsCollected++;
          this.audioManager.playItemPickup();
          this.showPickupMessage(`+10 — ${this.score}/${this.targetScore}`);
          if (this.score === 80) this.horrorEffects.showMessage('¡CASI! 2 monedas más', 2000);
          if (this.score === 90) this.horrorEffects.showMessage('¡ÚLTIMA MONEDA!', 2000);
          console.log('[Game] Coin collected! Score:', this.score);
        }
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      const dist = this.player.position.distanceTo(powerUp.position);
      
      if (dist < CONFIG.UNIT_SIZE * 0.8) {
        const cellType = powerUp.userData.cellType;
        const cellX = Math.round(powerUp.position.x / CONFIG.UNIT_SIZE);
        const cellZ = Math.round(powerUp.position.z / CONFIG.UNIT_SIZE);
        
        if (this.maze[cellZ] && this.maze[cellZ][cellX] === cellType) {
          this.maze[cellZ][cellX] = CellType.EMPTY;
          this.sceneManager.scene.remove(powerUp);
          this.powerUps.splice(i, 1);
          this.invalidateMinimapStatic();
          
          this.audioManager.playPowerUpPickup();
          
          switch (cellType) {
            case CellType.POWER_SPEED:
              this.player.activateSpeedBoost();
              this.showPickupMessage('⚡ ¡VELOCIDAD x1.5!');
              break;
            case CellType.POWER_INVISIBLE:
              this.player.activateInvisibility();
              this.showPickupMessage('👻 ¡INVISIBILIDAD!');
              break;
            case CellType.POWER_STUN:
              this.stunAllEnemies();
              this.showPickupMessage('💥 ¡ENEMIGOS ATURDIDOS!');
              break;
            case CellType.POWER_SANITY:
              this.player.restoreSanity();
              this.showPickupMessage('🧠 ¡CORDURA RESTAURADA!');
              break;
          }
          console.log('[Game] Power-up collected! Type:', cellType);
        }
      }
    }
  }
  
  private nearbyRendija: { x: number; z: number; exitX: number; exitZ: number } | null = null;
  
  private checkRendijaInteraction(): void {
    const px = Math.round(this.player.position.x / CONFIG.UNIT_SIZE);
    const pz = Math.round(this.player.position.z / CONFIG.UNIT_SIZE);
    
    this.nearbyRendija = null;
    
    const directions: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const checkX = px + dx;
        const checkZ = pz + dz;
        
        if (checkZ >= 0 && checkZ < this.maze.length && 
            checkX >= 0 && checkX < this.maze[0].length) {
          if (this.maze[checkZ][checkX] === CellType.RENDIJA) {
            const exit = this.mazeGenerator.getRendijaExit(checkX, checkZ, px, pz);
            if (exit) {
              const distToRendija = Math.sqrt(
                Math.pow((checkX - px) * CONFIG.UNIT_SIZE, 2) +
                Math.pow((checkZ - pz) * CONFIG.UNIT_SIZE, 2)
              );
              if (distToRendija < 2.5) {
                this.nearbyRendija = { x: checkX, z: checkZ, exitX: exit.x, exitZ: exit.z };
                break;
              }
            }
          }
        }
      }
      if (this.nearbyRendija) break;
    }
    
    if (this.nearbyRendija && this.inputManager.keys.interact) {
      const newX = this.nearbyRendija.exitX * CONFIG.UNIT_SIZE;
      const newZ = this.nearbyRendija.exitZ * CONFIG.UNIT_SIZE;
      
      this.player.position.x = newX;
      this.player.position.z = newZ;
      
      // Consumir el flag para evitar teleports múltiples
      this.inputManager.keys.interact = false;
      
      console.log('[Game] Used rendija! Teleported to:', this.nearbyRendija.exitX, this.nearbyRendija.exitZ);
    }
  }

  private stunAllEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.stun(POWERUP_STUN_DURATION);
    }
  }

  private updatePowerUpVisuals(delta: number): void {
    const time = Date.now() * 0.001;
    for (const powerUp of this.powerUps) {
      const group = powerUp.userData.group;
      if (group) {
        group.rotation.y += delta * 1.5;
        const floatY = Math.sin(time * 2 + powerUp.position.x) * 0.15;
        group.position.y = floatY;
        
        const ring = group.userData.ring;
        if (ring) {
          ring.rotation.z += delta * 0.8;
        }
      }
    }
  }

  private showPickupMessage(text: string): void {
    const pickupMsg = document.getElementById('pickupMessage');
    if (pickupMsg) {
      pickupMsg.textContent = text;
      pickupMsg.classList.add('visible');
      setTimeout(() => {
        pickupMsg.classList.remove('visible');
      }, 2000);
    }
  }

  private showNote(): void {
    const noteOverlay = document.getElementById('noteOverlay');
    const noteTitle = document.getElementById('noteTitle');
    const noteText = document.getElementById('noteText');
    
    if (noteOverlay && noteTitle && noteText) {
      const notes = [
        { title: 'DIA 1', text: 'Llevamos perdidos tres días. La linterna es nuestra única esperanza. Cuidala.' },
        { title: 'DIA 3', text: 'Escuché pasos... pero no había nadie. Esta cosa nos está buscando.' },
        { title: 'DIA 5', text: 'No mires a los ojos del monstruo. Corrí. Solo corro.' },
        { title: 'AYUDA', text: 'Alguien... cualquiera... por favor... está en todas partes.' },
        { title: 'ESCAPE', text: 'La salida está marcada con luz verde. ¡Encuéntrala!' }
      ];
      const note = notes[Math.floor(Math.random() * notes.length)];
      noteTitle.textContent = note.title;
      noteText.textContent = note.text;
      noteOverlay.classList.add('active');
      
      setTimeout(() => {
        noteOverlay.classList.remove('active');
      }, 3000);
    }
  }

  private showPhoto(): void {
    const photoOverlay = document.getElementById('photoOverlay');
    const photoCanvas = document.getElementById('photoCanvas') as HTMLCanvasElement | null;
    const photoDesc = document.getElementById('photoDesc');
    
    if (photoOverlay && photoCanvas && photoDesc) {
      const descriptions = [
        'Una familia sonriente. No duraron mucho.',
        'La fecha está borrosa. Quizás sea mejor así.',
        '¿Quién es esa figura al fondo?',
        'El edificio parece... diferente.',
        'Sonriendo en el momento equivocado.'
      ];
      
      const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
      photoDesc.textContent = desc;
      
      const ctx = photoCanvas.getContext('2d');
      if (ctx) {
        photoCanvas.width = 300;
        photoCanvas.height = 200;
        
        ctx.fillStyle = '#1a1510';
        ctx.fillRect(0, 0, 300, 200);
        
        ctx.fillStyle = '#2a2520';
        ctx.fillRect(10, 10, 280, 180);
        
        ctx.fillStyle = '#0a0505';
        ctx.fillRect(20, 20, 150, 140);
        
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(250, 170, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#666';
        ctx.font = '10px monospace';
        ctx.fillText('1998', 30, 175);
        
        ctx.fillStyle = '#888';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(80 + i * 40, 80, 15, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.fillStyle = '#0a0505';
        ctx.fillRect(60, 120, 100, 40);
      }
      
      photoOverlay.classList.add('active');
      
      setTimeout(() => {
        photoOverlay.classList.remove('active');
      }, 4000);
    }
  }

  private updateSanityEffects(): void {
    const sanity = this.player.sanity;
    const sanityOverlay = document.getElementById('sanityOverlay');
    const sanityDistortion = document.getElementById('sanityDistortion');
    
    if (sanityOverlay && sanityDistortion) {
      const opacity = Math.max(0, (50 - sanity) / 50);
      sanityOverlay.style.opacity = opacity.toString();
      
      if (sanity < 40) {
        const distortIntensity = (40 - sanity) / 40;
        sanityDistortion.style.opacity = (distortIntensity * 0.8).toString();
        
        if (sanity < 20) {
          sanityDistortion.style.animation = `sanityWave ${0.3 + Math.random() * 0.3}s ease-in-out infinite, sanityBlur ${0.2 + Math.random() * 0.2}s ease-in-out infinite`;
        } else {
          sanityDistortion.style.animation = `sanityWave ${0.5 + Math.random() * 0.5}s ease-in-out infinite`;
        }
        
        sanityDistortion.style.background = `rgba(80, 0, 0, ${distortIntensity * 0.15})`;
      } else {
        sanityDistortion.style.opacity = '0';
        sanityDistortion.style.animation = 'none';
      }
    }
  }

  private updateHorrorSounds(delta: number): void {
    this.horrorSoundTimer += delta;
    
    const sanity = this.player.sanity;
    const interval = sanity < 30 ? 5 : (sanity < 50 ? 10 : 20);
    
    if (this.horrorSoundTimer > interval + Math.random() * 10) {
      this.horrorSoundTimer = 0;
      
      const soundType = Math.floor(Math.random() * 4);
      switch (soundType) {
        case 0:
          this.audioManager.playRandomWhisper();
          break;
        case 1:
          if (Math.random() < 0.3) {
            this.audioManager.playFootstepsBehind();
          }
          break;
        case 2:
          if (Math.random() < 0.2) {
            this.audioManager.playVoiceCall();
          }
          break;
        case 3:
          if (Math.random() < 0.15 && sanity < 40) {
            this.audioManager.playCreepyLaugh();
          }
          break;
      }
    }
  }

  private updateHallucinations(delta: number): void {
    const sanity = this.player.sanity;
    
    if (sanity < 25) {
      this.hallucinationTimer += delta;
      
      if (this.hallucinationTimer > 4 + Math.random() * 3) {
        this.hallucinationTimer = 0;
        this.showHallucination();
      }
    }
  }

  private showHallucination(): void {
    const hallucinationOverlay = document.getElementById('hallucinationOverlay');
    if (!hallucinationOverlay) return;
    
    const img = document.createElement('img');
    img.className = 'hallucination-image';
    
    const images = [
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzEwMCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjMwIiBmaWxsPSIjODAwMCIvPjwvc3ZnPg==',
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VEFOQzwvdGV4dD48L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMwMCIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEwIiBmaWxsPSIjZmYwIi8+PGNpcmNsZSBjeT0iNzAiIGN5PSI3MCIgcj0iMTAiIGZpbGw9IiNmZjAiLz48L3N2Zz4='
    ];
    
    img.src = images[Math.floor(Math.random() * images.length)];
    img.style.left = (20 + Math.random() * 60) + '%';
    img.style.top = (20 + Math.random() * 60) + '%';
    
    hallucinationOverlay.appendChild(img);
    
    setTimeout(() => {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
    }, 2500);
  }

  private initMinimap(): void {
    this.minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement | null;
    if (!this.minimapCanvas) return;
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    if (!this.minimapCtx) return;

    const size = this.minimapCanvas.width; // 160
    const mazeSize = this.maze.length;
    const cellPx = size / mazeSize;

    // Localizar celda de salida
    for (let z = 0; z < mazeSize; z++) {
      for (let x = 0; x < this.maze[z].length; x++) {
        if (this.maze[z][x] === CellType.EXIT) {
          this.minimapExitCellX = x;
          this.minimapExitCellZ = z;
        }
      }
    }

    // Inicializar fog of war — todo oculto excepto la celda de spawn
    this.fogOfWar = Array.from({ length: mazeSize }, () => Array(mazeSize).fill(false));
    // Revelar celda inicial
    this.fogOfWar[1][1] = true;

    // Canvas offscreen para el laberinto completo (siempre existente, tapado por niebla)
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const offCtx = offscreen.getContext('2d')!;

    for (let z = 0; z < mazeSize; z++) {
      for (let x = 0; x < this.maze[z].length; x++) {
        const cell = this.maze[z][x];
        if (cell === CellType.WALL) {
          offCtx.fillStyle = 'rgba(8, 6, 2, 1)';
        } else if (cell === CellType.EXIT && this.currentLevel !== 'level2') {
          offCtx.fillStyle = 'rgba(0, 240, 90, 1)';
        } else if (cell === CellType.HIDING_SPOT) {
          offCtx.fillStyle = 'rgba(30, 60, 160, 0.85)';
        } else {
          offCtx.fillStyle = 'rgba(120, 105, 60, 0.45)';
        }
        offCtx.fillRect(x * cellPx, z * cellPx, cellPx, cellPx);
      }
    }

    this.minimapBaseImageData = offCtx.getImageData(0, 0, size, size);
    // Guardar también el canvas offscreen para drawImage (más rápido que putImageData)
    this.minimapBaseCanvas = offscreen;

    // Canvas offscreen para la capa estática (coins/powerups) — se reconstruye solo al cambiar
    this.minimapStaticCanvas = document.createElement('canvas');
    this.minimapStaticCanvas.width = size;
    this.minimapStaticCanvas.height = size;
    this.minimapStaticDirty = true;

    // Canvas secundario para la capa de niebla (se actualiza solo cuando el jugador se mueve)
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = size;
    this.fogCanvas.height = size;
    this.fogCtx = this.fogCanvas.getContext('2d');
    // Arrancar con todo negro (niebla total)
    if (this.fogCtx) {
      this.fogCtx.fillStyle = 'rgba(0,0,0,1)';
      this.fogCtx.fillRect(0, 0, size, size);
    }
  }

  /** Actualiza el fog of war con la posición actual del jugador */
  private updateFogOfWar(): void {
    if (!this.fogCtx || !this.fogCanvas || !this.fogOfWar.length) return;

    const mazeSize = this.maze.length;
    const size = this.fogCanvas.width;
    const cellPx = size / mazeSize;

    // Celda actual del jugador
    const px = Math.round(this.player.position.x / CONFIG.UNIT_SIZE);
    const pz = Math.round(this.player.position.z / CONFIG.UNIT_SIZE);

    // Radio de visión: 2 celdas (ilumina el corredor delante y los lados)
    const visionR = 2;
    let changed = false;

    for (let dz = -visionR; dz <= visionR; dz++) {
      for (let dx = -visionR; dx <= visionR; dx++) {
        const nx = px + dx, nz = pz + dz;
        if (nx < 0 || nx >= mazeSize || nz < 0 || nz >= mazeSize) continue;
        if (!this.fogOfWar[nz][nx]) {
          this.fogOfWar[nz][nx] = true;
          changed = true;
        }
      }
    }

    if (!changed) return;

    // Borrar la zona revelada en el canvas de niebla con "erase" (destination-out)
    this.fogCtx.globalCompositeOperation = 'destination-out';
    for (let dz = -visionR; dz <= visionR; dz++) {
      for (let dx = -visionR; dx <= visionR; dx++) {
        const nx = px + dx, nz = pz + dz;
        if (nx < 0 || nx >= mazeSize || nz < 0 || nz >= mazeSize) continue;
        if (this.fogOfWar[nz][nx]) {
          // Borrado suave con gradiente circular en el centro, más sólido en los bordes
          const dist = Math.sqrt(dx * dx + dz * dz);
          const alpha = dist <= 1 ? 1 : dist <= 1.5 ? 0.85 : 0.6;
          this.fogCtx.globalAlpha = alpha;
          this.fogCtx.fillRect(nx * cellPx, nz * cellPx, cellPx + 0.5, cellPx + 0.5);
        }
      }
    }
    this.fogCtx.globalCompositeOperation = 'source-over';
    this.fogCtx.globalAlpha = 1;
  }

  /** Marca la capa estática (coins/powerups) para que se reconstruya en el próximo frame del minimap */
  invalidateMinimapStatic(): void {
    this.minimapStaticDirty = true;
  }

  private rebuildMinimapStaticLayer(size: number, cellPx: number): void {
    if (!this.minimapStaticCanvas) return;
    const sCtx = this.minimapStaticCanvas.getContext('2d')!;
    sCtx.clearRect(0, 0, size, size);

    // Nivel 2: monedas restantes como puntos dorados
    if (this.currentLevel === 'level2') {
      sCtx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      for (const coin of this.coins) {
        const cx = coin.position.x / CONFIG.UNIT_SIZE;
        const cz = coin.position.z / CONFIG.UNIT_SIZE;
        sCtx.beginPath();
        sCtx.arc(cx * cellPx, cz * cellPx, cellPx * 0.45, 0, Math.PI * 2);
        sCtx.fill();
      }
      if (this.score >= this.targetScore) {
        sCtx.fillStyle = 'rgba(0, 240, 90, 1)';
        sCtx.beginPath();
        sCtx.arc(
          this.minimapExitCellX * cellPx,
          this.minimapExitCellZ * cellPx,
          cellPx * 0.8, 0, Math.PI * 2
        );
        sCtx.fill();
      }
    }

    // Power-ups
    for (const powerUp of this.powerUps) {
      const pux = powerUp.position.x / CONFIG.UNIT_SIZE;
      const puz = powerUp.position.z / CONFIG.UNIT_SIZE;
      const cellType = powerUp.userData.cellType;

      if (cellType === CellType.POWER_SPEED) {
        sCtx.fillStyle = 'rgba(255, 136, 0, 0.95)';
      } else if (cellType === CellType.POWER_INVISIBLE) {
        sCtx.fillStyle = 'rgba(0, 255, 255, 0.95)';
      } else if (cellType === CellType.POWER_STUN) {
        sCtx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      } else if (cellType === CellType.POWER_SANITY) {
        sCtx.fillStyle = 'rgba(200, 100, 255, 0.95)';
      } else {
        sCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      }

      const cx = pux * cellPx;
      const cz = puz * cellPx;
      const r = cellPx * 0.5;
      sCtx.beginPath();
      sCtx.moveTo(cx, cz - r);
      sCtx.lineTo(cx + r, cz);
      sCtx.lineTo(cx, cz + r);
      sCtx.lineTo(cx - r, cz);
      sCtx.closePath();
      sCtx.fill();
      sCtx.strokeStyle = 'rgba(255,255,255,0.4)';
      sCtx.lineWidth = 0.5;
      sCtx.stroke();
    }

    this.minimapStaticDirty = false;
  }

  private updateMinimap(): void {
    if (!this.minimapCtx || !this.minimapCanvas) return;

    // Throttle: draw every 3 frames
    this.minimapFrameSkip++;
    if (this.minimapFrameSkip < 3) return;
    this.minimapFrameSkip = 0;

    const ctx = this.minimapCtx;
    const size = this.minimapCanvas.width;
    const mazeSize = this.maze.length;
    const cellPx = size / mazeSize;

    // Actualizar fog of war con posición actual
    this.updateFogOfWar();

    // 1) Base del laberinto — drawImage es GPU blit, mucho más rápido que putImageData
    if (this.minimapBaseCanvas) {
      ctx.drawImage(this.minimapBaseCanvas, 0, 0);
    } else if (this.minimapBaseImageData) {
      ctx.putImageData(this.minimapBaseImageData, 0, 0);
    }

    // 2) Capa estática (coins/powerups) — solo se recalcula cuando cambia algo
    if (this.minimapStaticDirty) {
      this.rebuildMinimapStaticLayer(size, cellPx);
    }
    if (this.minimapStaticCanvas) {
      ctx.drawImage(this.minimapStaticCanvas, 0, 0);
    }

    // 3) Fog of war
    if (this.fogCanvas) {
      ctx.drawImage(this.fogCanvas, 0, 0);
    }

    // 4) Enemigos — solo visibles cuando están muy cerca (≤5 celdas)
    const ENEMY_REVEAL_DIST = 5 * CONFIG.UNIT_SIZE;
    for (const enemy of this.enemies) {
      const dx = enemy.position.x - this.player.position.x;
      const dz = enemy.position.z - this.player.position.z;
      if (dx * dx + dz * dz > ENEMY_REVEAL_DIST * ENEMY_REVEAL_DIST) continue;

      const ex = enemy.position.x / CONFIG.UNIT_SIZE;
      const ez = enemy.position.z / CONFIG.UNIT_SIZE;
      ctx.fillStyle = 'rgba(230, 20, 20, 0.95)';
      ctx.beginPath();
      ctx.arc(ex * cellPx, ez * cellPx, cellPx * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 5) Jugador: triángulo amarillo con dirección
    const px = this.player.position.x / CONFIG.UNIT_SIZE;
    const pz = this.player.position.z / CONFIG.UNIT_SIZE;
    const r = cellPx * 1.1;

    ctx.save();
    ctx.translate(px * cellPx, pz * cellPx);
    ctx.rotate(-this.player.yaw);
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = this.player.isHiding ? 'rgba(100,180,255,1)' : 'rgba(255, 230, 60, 1)';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.55, r * 0.65);
    ctx.lineTo(-r * 0.55, r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 6) Leyenda (texto cacheado — ctx.font solo una vez)
    ctx.font = `${Math.max(5, cellPx * 1.2)}px monospace`;
    ctx.fillStyle = 'rgba(255,230,60,0.9)';
    ctx.fillText('● TÚ', 2, size - 20);
    ctx.fillStyle = 'rgba(230,20,20,0.9)';
    ctx.fillText('● ENE', 2, size - 12);
    if (this.currentLevel !== 'level2' || this.score >= this.targetScore) {
      ctx.fillStyle = 'rgba(0,240,90,0.9)';
      ctx.fillText('■ META', 2, size - 4);
    }
  }

  // ── Sistema de mini-sustos ambientales ────────────────────────────────────

  /** Elige un susto aleatorio y lo ejecuta (solo si el enemigo no está ya encima). */
  private triggerAmbientScare(): void {
    if (this.lastClosestEnemyDist < 9) return;   // el enemigo ya da miedo solo

    const roll = Math.random();
    if (roll < 0.34) {
      this.triggerGhostScare();
    } else if (roll < 0.67) {
      this.triggerLightScare();
    } else {
      this.triggerBangScare();
    }

    // Reiniciar interval con variedad
    this.ambientScareInterval = 30 + Math.random() * 30;
    this.ambientScareTimer = 0;
  }

  /** Susto 1: aparece una figura fantasma al fondo del pasillo */
  private triggerGhostScare(): void {
    if (this.emptyWalkablePositions.length === 0) return;

    // Buscar posición que esté 10-20 unidades del jugador
    const candidates = this.emptyWalkablePositions.filter(p => {
      const d = this.player.position.distanceTo(p);
      return d >= 10 && d <= 22;
    });
    if (candidates.length === 0) return;

    const spawnPos = candidates[Math.floor(Math.random() * candidates.length)];
    this.horrorEffects.spawnGhostFigure(spawnPos, this.player.position);
    // Sin sonido propio — el silencio es el susto
  }

  /** Susto 2: una luz del techo se apaga y vuelve con zumbido */
  private triggerLightScare(): void {
    if (this.ceilingLightMeshes.length === 0) return;

    // Elegir luz más cercana al jugador (entre 3 y 14 unidades)
    let chosen: THREE.PointLight | null = null;
    let bestDist = Infinity;
    for (const light of this.ceilingLightMeshes) {
      const d = this.player.position.distanceTo(light.position);
      if (d >= 3 && d <= 14 && d < bestDist) { bestDist = d; chosen = light; }
    }
    if (!chosen) return;

    const originalIntensity = chosen.intensity;
    this.audioManager.playLightBuzz();
    chosen.intensity = 0;

    // Apagado total 0.4 s — luego zumbido y vuelta
    setTimeout(() => {
      this.audioManager.playLightBuzz();
      if (chosen) chosen.intensity = originalIntensity * 0.3;
      setTimeout(() => {
        this.audioManager.playLightBuzz();
        if (chosen) chosen.intensity = 0;
        setTimeout(() => {
          if (chosen) chosen.intensity = originalIntensity;
        }, 180);
      }, 220);
    }, 400);
  }

  /** Susto 3: golpe fuerte + camera shake + pasos falsos */
  private triggerBangScare(): void {
    this.audioManager.playLoudBang();
    this.sceneManager.startCameraShake(0.14, 0.45);

    // Pasos falsos 0.6 s después del golpe
    setTimeout(() => {
      this.audioManager.playFootstepsBehind();
    }, 600);

    // Flash de pantalla rojo en HTML
    const flashFn = (window as unknown as { triggerScreenFlash?: (color: string, ms: number) => void }).triggerScreenFlash;
    if (flashFn) flashFn('#ff0000', 80);
  }

  private animate = (): void => {
    if (!this.isActive || this.gameOver || this.hasWon) return;

    if (this.isPaused) {
      requestAnimationFrame(this.animate);
      return;
    }

    requestAnimationFrame(this.animate);

    const frameStart = performance.now();
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.monsterSpawnTimer += delta * 1000;
    if (this.monsterSpawnTimer >= CONFIG.MONSTER_SPAWN_DELAY) {
      this.doSpawnEnemies();
    }

    const playerUpdateStart = performance.now();
    this.player.update(delta);
    const playerUpdateTime = performance.now() - playerUpdateStart;
    if (playerUpdateTime > 8) {
      console.warn(`[PERF] player.update() tardó ${playerUpdateTime.toFixed(2)}ms`);
    }
    
    this.checkBatteryCollection();
    this.updatePowerUpVisuals(delta);
    
    // ── Rendijas (atajos secretos) ──────────────────────────────────────────────
    this.checkRendijaInteraction();
    this.uiManager.updateRendijaHint(this.nearbyRendija !== null);

    if (this.chunkManager) {
      this.chunkManager.update(this.player.position.x, this.player.position.z);
    }

    // Throttle visibility checks
    this.visibilityThrottle += delta * 1000;
    if (this.visibilityThrottle >= this.VISIBILITY_THROTTLE_MS) {
      this.visibilityThrottle = 0;
      
      const playerPos = this.player.position;
      const maxDist = CONFIG.FOG_FAR * CONFIG.UNIT_SIZE * 0.9;
      const mediumDist = CONFIG.FOG_FAR * CONFIG.UNIT_SIZE * 0.6;
      
      if (this.batteries.length > 0) {
        for (const battery of this.batteries) {
          battery.visible = battery.position.distanceTo(playerPos) < mediumDist;
        }
      }
      
      if (this.powerUps.length > 0) {
        for (const powerUp of this.powerUps) {
          powerUp.visible = powerUp.position.distanceTo(playerPos) < mediumDist;
        }
      }
      
      if (this.notes.length > 0) {
        for (const note of this.notes) {
          note.visible = note.position.distanceTo(playerPos) < maxDist;
        }
      }
      
      if (this.photos.length > 0) {
        for (const photo of this.photos) {
          photo.visible = photo.position.distanceTo(playerPos) < maxDist;
        }
      }
      
      if (this.bloodStains.length > 0) {
        for (const stain of this.bloodStains) {
          stain.visible = stain.position.distanceTo(playerPos) < maxDist;
        }
      }
      
      if (this.ceilingLightMeshes.length > 0) {
        for (const light of this.ceilingLightMeshes) {
          light.visible = light.position.distanceTo(playerPos) < maxDist;
        }
      }
    }

    // ── Estadísticas ─────────────────────────────────────────────────────────
    this.statsDistanceWalked += this.player.position.distanceTo(this.statsLastPos);
    this.statsLastPos.copy(this.player.position);

    if (this.player.isHiding && !this._wasHiding) { this.statsHidingCount++; }
    this._wasHiding = this.player.isHiding;

    let nearCeilingLight = false;
    for (const lightPos of this.ceilingLights) {
      const dist = this.player.position.distanceTo(lightPos);
      if (dist < 4) {
        nearCeilingLight = true;
        break;
      }
    }
    if (nearCeilingLight && !this.player.isFlashlightOn) {
      this.player.sanity = Math.min(CONFIG.SANITY_MAX, this.player.sanity + 0.8 * delta);
    }

    let closestEnemyDist = Infinity;
    const sanityBonus = this.player.sanity < 30 ? 1.3 : (this.player.sanity < 50 ? 1.15 : 1.0);
    const isEffectivelyHidden = this.player.isHiding || this.player.isPlayerInvisible();
    
    const enemyUpdateStart = performance.now();
    for (const enemy of this.enemies) {
      const dist = enemy.update(delta, this.player.position, isEffectivelyHidden, sanityBonus);
      closestEnemyDist = Math.min(closestEnemyDist, dist);

      this.enemyStepTimer += delta;
      const stepInterval = enemy.type === 'runner' ? 0.25 : (enemy.type === 'teleporter' ? 0.4 : 0.5);
      if (this.enemyStepTimer > stepInterval && dist < 15) {
        this.audioManager.playMonsterFootstep(enemy.position, enemy.type);
        this.enemyStepTimer = 0;
      }

      if (dist < 10) {
        this.breathingTimer += delta;
        if (this.breathingTimer > 2) {
          this.audioManager.playEnemyBreathing(dist, enemy.type);
          this.breathingTimer = 0;
        }
      }

      if (enemy.canKillPlayer(this.player.position)) {
        this.gameOver = true;
        this.triggerJumpscare(enemy);
        console.log('[Game] Game Over - Player killed');
        return;
      }
    }
    const enemyUpdateTime = performance.now() - enemyUpdateStart;
    if (enemyUpdateTime > 10) {
      console.warn(`[PERF] Enemies update() tardó ${enemyUpdateTime.toFixed(2)}ms (${this.enemies.length} enemigos)`);
    }

    // Susto contado: enemigo muy cerca pero el jugador sobrevive
    if (closestEnemyDist < 2.5 && !this.player.isHiding && !this._wasCloseToEnemy) {
      this.statsCloseCallsEnemies++;
      this._wasCloseToEnemy = true;
    } else if (closestEnemyDist >= 2.5) {
      this._wasCloseToEnemy = false;
    }

    // ── Pisadas ───────────────────────────────────────────────────────────────
    this.footprintTimer += delta;
    const isMoving = this.inputManager.keys.forward || this.inputManager.keys.backward ||
                     this.inputManager.keys.left || this.inputManager.keys.right;
    if (isMoving && this.footprintTimer > 0.55) {
      this.addFootprint();
      this.footprintTimer = 0;
    }
    this.updateFootprints(delta);

    // Guardar distancia para los mini-sustos
    this.lastClosestEnemyDist = closestEnemyDist;

    // Audio y luces reactivos: siempre actualizar para que el efecto se disipe suavemente
    this.audioManager.updateEnemyProximity(closestEnemyDist);
    this.horrorEffects.setEnemyProximity(closestEnemyDist);

    if (closestEnemyDist < Infinity) {
      this.player.drainSanityNearEnemy(closestEnemyDist);
      this.audioManager.updateDynamicMusic(closestEnemyDist);
      this.audioManager.playHeartbeat(closestEnemyDist);
      this.uiManager.updateEnemyIndicator(closestEnemyDist);
      
      if (this.currentLevel === 'level3' && closestEnemyDist < 15) {
        this.audioManager.playEnemySpeech(closestEnemyDist);
      }
    }

    this.updateSanityEffects();
    this.updateHorrorSounds(delta);
    this.updateHallucinations(delta);

    this.whisperNameTimer += delta;
    if (this.player.sanity < 60 && this.whisperNameTimer > 20 + Math.random() * 30) {
      this.whisperNameTimer = 0;
      if (Math.random() < 0.4) {
        this.audioManager.whisperPlayerName();
      }
    }

    this.dripTimer += delta;
    if (this.dripTimer > 2 + Math.random() * 4) {
      this.dripTimer = 0;
      if (Math.random() < 0.6) {
        this.audioManager.playDripSound();
      }
    }

    this.metalCreakTimer += delta;
    if (this.metalCreakTimer > 8 + Math.random() * 15) {
      this.metalCreakTimer = 0;
      if (Math.random() < 0.3) {
        this.audioManager.playMetalCreak();
      }
    }

    // Silla arrastrándose — más frecuente en salas abiertas (level3) y ultimate
    this.chairDragTimer += delta;
    const chairInterval = (this.currentLevel === 'level3' || this.currentLevel === 'ultimate') ? 12 : 25;
    if (this.chairDragTimer > chairInterval + Math.random() * 20) {
      this.chairDragTimer = 0;
      if (Math.random() < 0.5) this.audioManager.playChairDrag();
    }

    // TV estática — solo en nivel 2 y ultimate (ambiente de oficina abandonada)
    if (this.currentLevel === 'level2' || this.currentLevel === 'ultimate') {
      this.tvStaticTimer += delta;
      if (this.tvStaticTimer > 15 + Math.random() * 25) {
        this.tvStaticTimer = 0;
        if (Math.random() < 0.6) this.audioManager.playTVStatic();
      }
    }

    // Ráfaga de ventilación — en todos los niveles
    this.ventGustTimer += delta;
    if (this.ventGustTimer > 10 + Math.random() * 20) {
      this.ventGustTimer = 0;
      if (Math.random() < 0.7) this.audioManager.playVentGust();
    }

    const sanity = this.player.sanity;
    if (sanity < 40) {
      const fogMultiplier = sanity / 40;
      this.sceneManager.updateFog(
        CONFIG.FOG_NEAR * fogMultiplier,
        CONFIG.FOG_FAR * fogMultiplier
      );
    } else {
      this.sceneManager.updateFog(CONFIG.FOG_NEAR, CONFIG.FOG_FAR);
    }

    const horrorStart = performance.now();
    this.horrorEffects.update(delta);
    this.horrorEffects.updateGhosts(this.player.position, delta);
    this.sceneManager.updateShake(delta);
    const horrorTime = performance.now() - horrorStart;
    if (horrorTime > 5) {
      console.warn(`[PERF] horrorEffects.update() tardó ${horrorTime.toFixed(2)}ms`);
    }

    // ── Mini-sustos ambientales ────────────────────────────────────────────
    this.ambientScareTimer += delta;
    if (this.ambientScareTimer >= this.ambientScareInterval) {
      this.triggerAmbientScare();
    }

    this.playerStepTimer += delta;
    const isPlayerMoving = this.inputManager.keys.forward || this.inputManager.keys.backward || 
                          this.inputManager.keys.left || this.inputManager.keys.right;
    if (isPlayerMoving && this.playerStepTimer > 0.4) {
      this.audioManager.playPlayerFootstep();
      this.playerStepTimer = 0;
    }

    if (this.uiManager.shouldUpdateUI(delta)) {
      this.uiManager.updateStamina(this.player.stamina);
      this.uiManager.updateBattery(this.player.battery);
      this.uiManager.updateSanity(this.player.sanity, CONFIG.SANITY_MAX);
      this.uiManager.updateHiding(this.player.isHiding, this.player.canHide);
      this.uiManager.updatePowerUps(this.player.speedBoostTimer, this.player.invisibilityTimer);

      if (this.currentLevel === 'level2') {
        const remaining = this.targetScore - this.score;
        const pct = Math.round((this.score / this.targetScore) * 100);
        if (this.score >= this.targetScore) {
          this.uiManager.updateLevelObjective(
            '<span class="obj-title">OBJETIVO</span>✅ ¡Ahora encuentra la <strong style="color:#00ff88">SALIDA VERDE</strong>!'
          );
        } else {
          this.uiManager.updateLevelObjective(
            `<span class="obj-title">OBJETIVO</span>💰 Faltan <strong>${remaining}</strong> pts (${pct}%)`
          );
        }
      }
    }

    if (this.player.sanity < 30) {
      this.breathingTimer += delta;
      if (this.breathingTimer > 3) {
        this.audioManager.playBreathSound();
        this.breathingTimer = 0;
      }
    }

    if (this.player.sanity <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.triggerSanityGameOver();
      return;
    }

    if (this.player.sanity < CONFIG.SANITY_CRITICAL_THRESHOLD && this.player.sanity > 0) {
      const criticalMessages = [
        '¡PERDIENDO LA CORDURA!',
        'NO PUEDES AGUANTAR MÁS...',
        'LA OSCURIDAD TE CONSUME',
        '¿ESTÁS BIEN?!'
      ];
      if (Math.random() < 0.005) {
        this.horrorEffects.showMessage(criticalMessages[Math.floor(Math.random() * criticalMessages.length)], 2000);
      }
    }

    if (this.currentLevel === 'level2') {
      this.uiManager.updateScore(this.score, this.targetScore);
    }

    let winCondition = false;
    let winMessage = '';

    switch (this.currentLevel) {
      case 'level1':
      case 'level3':
      case 'level4':
      case 'ultimate':
        if (this.player.checkExit()) {
          winCondition = true;
          winMessage = '¡HAS ESCAPADO!';
        }
        break;
      case 'level2':
        if (this.score >= this.targetScore) {
          winCondition = true;
          winMessage = `¡100 PUNTOS! ¡HAS GANADO!`;
        }
        break;
    }

    if (winCondition) {
      this.hasWon = true;
      this.triggerVictory(winMessage);
      console.log('[Game] Victory!', winMessage);
    }

    // Animación de puerta de salida
    if (this.exitDoor && this.currentLevel !== 'level2' && this.currentLevel !== 'ultimate') {
      const distToExit = this.player.position.distanceTo(this.exitWorldPos);
      if (distToExit < CONFIG.UNIT_SIZE * 2.5 && !this.exitDoorOpen) {
        this.exitDoorOpen = true;
      }
      if (this.exitDoorOpen && this.exitDoorAngle < Math.PI / 2) {
        this.exitDoorAngle = Math.min(Math.PI / 2, this.exitDoorAngle + delta * 2.5);
        this.exitDoor.rotation.y = this.exitDoorAngle;
      }
    }

    this.updateMinimap();
    
    const frameTime = performance.now() - frameStart;
    if (frameTime > 20) {
      console.warn(`[PERF] Frame completo tardó ${frameTime.toFixed(2)}ms (objetivo: <16.67ms para 60fps)`);
    }
    
    this.sceneManager.render();
  };
}

new Game();
