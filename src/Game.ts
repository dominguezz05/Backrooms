import * as THREE from 'three';
import { SceneManager } from './core/SceneManager';
import { InputManager } from './core/InputManager';
import { MazeGenerator } from './systems/MazeGenerator';
import { AudioManager } from './systems/AudioManager';
import { HorrorEffects } from './systems/HorrorEffects';
import { UIManager } from './systems/UIManager';
import { ScoreManager } from './systems/ScoreManager';
import { Player } from './entities/Player';
import { Enemy } from './entities/Enemy';
import { CONFIG, POWERUP_STUN_DURATION, DOOR_SPAWN_CHANCE, DOOR_CLOSE_INTERVAL_MIN, DOOR_CLOSE_INTERVAL_MAX, DOOR_CLOSE_DURATION, DOOR_SPEED } from './constants';
import { CellType, EnemyType } from './types';
import { createFloorTexture, createWallTexture, createCeilingTexture } from './utils/textures';

export type LevelType = 'level1' | 'level2' | 'level3' | 'level4' | 'ultimate';

export class Game {
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private player: Player;
  private enemies: Enemy[] = [];
  private maze: number[][] = [];
  private mazeGenerator: MazeGenerator;
  private audioManager: AudioManager;
  private horrorEffects: HorrorEffects;
  private uiManager: UIManager;

  private clock: THREE.Clock;
  private isActive = false;
  private isPaused = false;
  private monsterSpawned = false;
  private monsterSpawnTimer = 0;
  private gameOver = false;
  private hasWon = false;

  private collidableObjects: THREE.Object3D[] = [];
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
  private footprintTimer = 0;
  private footprintLeft = true;
  private footprintTex: THREE.CanvasTexture | null = null;
  private readonly MAX_FOOTPRINTS = 28;
  private readonly FOOTPRINT_LIFETIME = 18;

  // ── Sistema de Trail del Jugador ────────────────────────────────────────────
  private trailPositions: THREE.Vector3[] = [];
  private trailTimer = 0;
  private readonly TRAIL_INTERVAL = 0.8;     // Guardar posición cada 0.8s
  private readonly MAX_TRAIL_LENGTH = 40;    // Máximo de puntos en el trail
  private trailCanvas: HTMLCanvasElement | null = null;
  private trailCtx: CanvasRenderingContext2D | null = null;
  private trailVisible = false;

  // ── Sistema de Transiciones Suaves ──────────────────────────────────────────
  private transitionOverlay: HTMLElement | null = null;

  // ── Sistema de Puertas Dinámicas ────────────────────────────────────────────
  private dynamicDoors: Array<{
    mesh: THREE.Group;
    meshCollider: THREE.Mesh;
    cellX: number;
    cellZ: number;
    isClosed: boolean;
    isClosing: boolean;
    isOpening: boolean;
    doorY: number;
    doorClosedY: number;
    light: THREE.PointLight;
    closeTimer: number;
    openTimer: number;
  }> = [];
  private doorCloseInterval = 0;
  private doorTimer = 0;



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

    // Inicializar sistemas de transición y trail
    this.initTransitionSystem();
    this.initTrailSystem();

    this.uiManager.showLoading(true);
    this.uiManager.setLoadingProgress(5, 'Preparando recursos...');
    await delay(200);

    this.uiManager.setLoadingProgress(15, 'Cargando texturas de enemigos...');
    Enemy.preloadTextures();
    await delay(300);

    this.uiManager.setLoadingProgress(25, 'Generando laberinto...');
    this.maze = this.mazeGenerator.generate();
    await delay(400);

    this.uiManager.setLoadingProgress(40, 'Construyendo entorno...');
    this.buildMaze();
    await delay(300);

    this.uiManager.setLoadingProgress(60, 'Inicializando mapa...');
    this.initMinimap();
    await delay(200);

    this.uiManager.setLoadingProgress(75, 'Configurando jugador...');
    this.player.setMaze(this.maze);
    this.player.setAudioManager(this.audioManager);

    if (this.currentLevel === 'level4') {
      this.sceneManager.ambientLight.intensity = 0.02;
    }

    await delay(200);
    this.uiManager.setLoadingProgress(85, 'Preparando efectos...');
    this.horrorEffects.setMessageElement(
      document.getElementById('messageOverlay') || document.createElement('div')
    );

    await delay(200);
    this.uiManager.setLoadingProgress(95, 'Listo para comenzar...');
    this.setupStartButton();

    await delay(300);
    this.uiManager.setLoadingProgress(100, '¡Pulsa para empezar!');
    await delay(500);
    this.uiManager.showLoading(false);

    await delay(300);
    this.uiManager.setLoadingProgress(100, '¡Pulsa para empezar!');
    await delay(500);
    this.uiManager.showLoading(false);
    
    // Detener audio del menú para evitar conflictos
    this.cleanupMenuAudio();
    
    console.log('[Game] Initialization complete - Level:', this.currentLevel);
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

  // ── Sistema de Trail del Jugador ────────────────────────────────────────────
  private initTrailSystem(): void {
    this.trailCanvas = document.getElementById('trailCanvas') as HTMLCanvasElement | null;
    if (this.trailCanvas) {
      this.trailCtx = this.trailCanvas.getContext('2d');
      this.resizeTrailCanvas();
      
      window.addEventListener('resize', () => this.resizeTrailCanvas());
    }
  }

  private resizeTrailCanvas(): void {
    if (this.trailCanvas) {
      this.trailCanvas.width = window.innerWidth;
      this.trailCanvas.height = window.innerHeight;
    }
    if (this.trailCtx) {
      this.trailCtx = this.trailCanvas?.getContext('2d') || null;
    }
  }

  /** Añade la posición actual al trail del jugador */
  private addTrailPosition(): void {
    this.trailPositions.push(this.player.position.clone());
    
    // Limitar longitud del trail
    if (this.trailPositions.length > this.MAX_TRAIL_LENGTH) {
      this.trailPositions.shift();
    }
    
    this.trailVisible = true;
  }

  /** Renderiza el trail del jugador en el canvas overlay */
  private renderTrail(): void {
    if (!this.trailCtx || !this.trailCanvas || !this.trailVisible || this.trailPositions.length < 2) {
      if (this.trailCtx && this.trailCanvas) {
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
      }
      return;
    }

    const ctx = this.trailCtx;
    const canvas = this.trailCanvas;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Obtener la dirección de la cámara
    const camera = this.sceneManager.camera;
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    
    // Proyectar puntos 3D a 2D usando la cámara
    const projectedPoints: Array<{ x: number; y: number; z: number }> = [];
    
    for (const pos of this.trailPositions) {
      const screenPos = pos.clone().project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * canvas.width;
      const y = (-screenPos.y * 0.5 + 0.5) * canvas.height;
      projectedPoints.push({ x, y, z: screenPos.z });
    }

    // Solo dibujar puntos que estén frente a la cámara
    const visiblePoints = projectedPoints.filter(p => p.z < 1);
    
    if (visiblePoints.length < 2) return;

    // Dibujar línea de trail con degradado
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 1; i < visiblePoints.length; i++) {
      const alpha = i / visiblePoints.length; // Más brillante hacia el jugador
      const prev = visiblePoints[i - 1];
      const curr = visiblePoints[i];
      
      // Calcular distancia en pantalla
      const distScreen = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      
      // No dibujar si los puntos están muy separados (fuera del campo de visión)
      if (distScreen > 200) continue;
      
      const lineWidth = 2 + alpha * 3;
      
      // Color con degradado de opacity
      const r = 60;
      const g = 50 + Math.floor(alpha * 30);
      const b = 40;
      
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // Dibujar puntos como pequeños círculos
    for (let i = 0; i < visiblePoints.length; i++) {
      const alpha = (i + 1) / visiblePoints.length;
      const p = visiblePoints[i];
      const radius = 2 + alpha * 3;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(80, 60, 40, ${alpha * 0.5})`;
      ctx.fill();
    }
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

  private buildMaze(): void {
    const floorTexture = createFloorTexture(this.currentLevel);
    const wallTexture = createWallTexture(this.currentLevel);
    const ceilingTexture = createCeilingTexture(this.currentLevel);

    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      map: ceilingTexture,
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1
    });

    const unitSize = CONFIG.UNIT_SIZE;
    const wallHeight = CONFIG.WALL_HEIGHT;

    const floorGeometry = new THREE.PlaneGeometry(unitSize, unitSize);
    const ceilingGeometry = new THREE.PlaneGeometry(unitSize, unitSize);
    const wallGeometry = new THREE.BoxGeometry(unitSize, wallHeight, unitSize);

    for (let z = 0; z < this.maze.length; z++) {
      for (let x = 0; x < this.maze[z].length; x++) {
        const cell = this.maze[z][x];
        const posX = x * unitSize;
        const posZ = z * unitSize;

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(posX, 0, posZ);
        floor.receiveShadow = true;
        this.sceneManager.scene.add(floor);

        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(posX, wallHeight, posZ);
        ceiling.receiveShadow = true;
        this.sceneManager.scene.add(ceiling);

        if (cell === CellType.WALL) {
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(posX, wallHeight / 2, posZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.sceneManager.scene.add(wall);
          this.collidableObjects.push(wall);
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

        if (cell === CellType.HIDING_SPOT) {
          // Ataúd empotrado en la pared más cercana
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

          // Textura de madera oscura
          const wc = document.createElement('canvas');
          wc.width = 64; wc.height = 128;
          const wctx = wc.getContext('2d')!;
          wctx.fillStyle = '#1a0c06'; wctx.fillRect(0, 0, 64, 128);
          for (let gi = 0; gi < 10; gi++) {
            wctx.strokeStyle = `rgba(50,25,8,${0.25 + Math.random() * 0.35})`;
            wctx.lineWidth = 1;
            wctx.beginPath(); wctx.moveTo(0, gi * 13); wctx.lineTo(64, gi * 13 + (Math.random() * 4 - 2)); wctx.stroke();
          }
          for (let pi = 0; pi < 3; pi++) {
            wctx.strokeStyle = 'rgba(0,0,0,0.5)'; wctx.lineWidth = 2;
            wctx.beginPath(); wctx.moveTo(pi * 22, 0); wctx.lineTo(pi * 22, 128); wctx.stroke();
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

          // Cruz en la cara frontal
          const faceDir = new THREE.Vector3(-chosenDir.dx, 0, -chosenDir.dz);
          const crossMat = new THREE.MeshBasicMaterial({ color: 0x3a1800 });
          const crossPos = new THREE.Vector3(cx + faceDir.x * (cD / 2 + 0.012), cH * 0.62, cz + faceDir.z * (cD / 2 + 0.012));
          const crossH2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.015), crossMat);
          crossH2.position.copy(crossPos); crossH2.rotation.y = chosenDir.angle;
          const crossV2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.015), crossMat);
          crossV2.position.copy(crossPos); crossV2.rotation.y = chosenDir.angle;
          this.sceneManager.scene.add(crossH2); this.sceneManager.scene.add(crossV2);

          // Tenue resplandor en la base para visibilidad
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
          // Grupo con pivote en el borde izquierdo de la puerta para que gire al abrirse
          const doorGroup = new THREE.Group();
          doorGroup.position.set(posX - unitSize * 0.35, 0, posZ);

          // Hoja de la puerta
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

          // Marco luminoso verde
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

          // Luz verde sobre la puerta
          const exitLight = new THREE.PointLight(0x00ff44, 1.5, 8, 2);
          exitLight.position.set(unitSize * 0.35, wallHeight + 0.3, 0);
          doorGroup.add(exitLight);

          this.sceneManager.scene.add(doorGroup);
          this.exitDoor = doorGroup;
          this.exitWorldPos.set(posX, wallHeight / 2, posZ);
        }

        // Nivel 4: sin luces de techo — apagón total
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

        // Guardar posiciones caminables para spawn de fantasmas
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

        // Nivel 4: sin luces parpadeantes
        if (cell !== CellType.WALL && this.currentLevel !== 'level4' && Math.random() < 0.1) {
          this.horrorEffects.addFlickeringLight(
            new THREE.Vector3(posX, wallHeight - 0.5, posZ)
          );
        }

        // Puertas dinámicas
        if (cell === CellType.DOOR) {
          this.createDoorMesh(x, z, posX, posZ, unitSize, wallHeight);
        }
      }
    }

    // Cuadros de miedo en las paredes
    this.addScaryPictures();

    // Flechas de pista pintadas en las paredes (solo visibles con linterna)
    this.addExitArrows();

    // Inicializar timers de puertas dinámicas
    this.doorCloseInterval = DOOR_CLOSE_INTERVAL_MIN + Math.random() * (DOOR_CLOSE_INTERVAL_MAX - DOOR_CLOSE_INTERVAL_MIN);
    this.doorTimer = 0;
  }

  private createDoorMesh(cellX: number, cellZ: number, posX: number, posZ: number, unitSize: number, wallHeight: number): void {
    const doorGroup = new THREE.Group();
    
    // Puerta corredera metálica (panel horizontal que baja desde el techo)
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.6,
      metalness: 0.8,
      emissive: new THREE.Color(0x1a1a1a),
      emissiveIntensity: 0.3
    });

    const doorWidth = unitSize * 0.95;
    const doorDepth = unitSize * 0.15;
    const doorHeight = wallHeight * 0.95;
    const doorY = wallHeight + doorHeight / 2; // Empieza ARRIBA del todo (abierta)

    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth),
      doorMat
    );
    
    doorMesh.position.set(posX, doorY, posZ);
    doorMesh.castShadow = true;
    doorMesh.receiveShadow = true;
    doorGroup.add(doorMesh);

    // Marco metálico en el techo
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.9
    });

    // Riel superior
    const railMesh = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.2, 0.15, doorDepth + 0.2),
      frameMat
    );
    railMesh.position.set(posX, wallHeight - 0.05, posZ);
    doorGroup.add(railMesh);

    // Soportes laterales del riel
    const supportGeo = new THREE.BoxGeometry(0.1, 0.3, doorDepth + 0.3);
    const supportL = new THREE.Mesh(supportGeo, frameMat);
    supportL.position.set(posX - doorWidth / 2 - 0.05, wallHeight - 0.15, posZ);
    doorGroup.add(supportL);
    const supportR = new THREE.Mesh(supportGeo, frameMat);
    supportR.position.set(posX + doorWidth / 2 + 0.05, wallHeight - 0.15, posZ);
    doorGroup.add(supportR);

    // Luz indicadora en el marco (verde = abierta/arriba, roja = cerrada/abajo)
    const indicatorLight = new THREE.PointLight(0x00ff00, 0.6, 4);
    indicatorLight.position.set(posX, wallHeight - 0.5, posZ);
    doorGroup.add(indicatorLight);

    // Linha de advertencia en el suelo (se ve cuando está cerrada)
    const warningLineMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    const warningLine = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth - 0.2, 0.05, doorDepth + 0.1),
      warningLineMat
    );
    warningLine.position.set(posX, 0.02, posZ);
    doorGroup.add(warningLine);

    this.sceneManager.scene.add(doorGroup);

    this.dynamicDoors.push({
      mesh: doorGroup,
      meshCollider: doorMesh,
      cellX,
      cellZ,
      isClosed: false,
      isClosing: false,
      isOpening: false,
      doorY: doorY, // Posición arriba (abierta)
      doorClosedY: doorHeight / 2, // Posición abajo (cerrada)
      light: indicatorLight,
      closeTimer: 0,
      openTimer: 0
    });
  }

  private updateDynamicDoors(delta: number): void {
    if (this.dynamicDoors.length === 0) return;

    // Timer para cierre aleatorio de puertas
    this.doorTimer += delta * 1000;

    if (this.doorTimer >= this.doorCloseInterval) {
      this.doorTimer = 0;
      this.doorCloseInterval = DOOR_CLOSE_INTERVAL_MIN + Math.random() * (DOOR_CLOSE_INTERVAL_MAX - DOOR_CLOSE_INTERVAL_MIN);

      // Elegir una puerta aleatoria que esté abierta
      const openDoors = this.dynamicDoors.filter(d => !d.isClosed && !d.isClosing);
      if (openDoors.length > 0) {
        const door = openDoors[Math.floor(Math.random() * openDoors.length)];
        door.isClosing = true;
        door.closeTimer = 0;
        
        // Sonido de puerta cerrándose
        this.audioManager.playDoorCreak();
        
        console.log('[Game] Door closing at cell:', door.cellX, door.cellZ);
      }
    }

    // Actualizar estado de cada puerta
    for (const door of this.dynamicDoors) {
      if (door.isClosing) {
        door.closeTimer += delta * 1000;
        
        // Animación de cierre - la puerta baja suavemente
        const closeProgress = Math.min(door.closeTimer / 1000, 1);
        const easedProgress = 1 - Math.pow(1 - closeProgress, 3); // Ease out cubic
        const newY = door.doorY - (door.doorY - door.doorClosedY) * easedProgress;
        door.mesh.position.y = newY;
        
        if (door.closeTimer >= 1000) {
          door.isClosing = false;
          door.isClosed = true;
          
          // Cambiar luz indicadora a rojo
          if (door.light) door.light.color.setHex(0xff0000);
          
          // Añadir collider
          this.addDoorCollider(door);
        }
      }

      if (door.isOpening) {
        door.openTimer += delta * 1000;
        
        // Animación de apertura - la puerta sube suavemente
        const openProgress = Math.min(door.openTimer / 1000, 1);
        const easedProgress = 1 - Math.pow(1 - openProgress, 3);
        const newY = door.doorClosedY + (door.doorY - door.doorClosedY) * easedProgress;
        door.mesh.position.y = newY;
        
        if (door.openTimer >= 1000) {
          door.isOpening = false;
          door.isClosed = false;
          
          // Cambiar luz indicadora a verde
          if (door.light) door.light.color.setHex(0x00ff00);
          
          // Quitar collider
          this.removeDoorCollider(door);
        }
      }

      // Las puertas se abren automáticamente después de un tiempo
      if (door.isClosed && !door.isOpening) {
        door.closeTimer += delta * 1000;
        if (door.closeTimer >= DOOR_CLOSE_DURATION) {
          door.isOpening = true;
          door.openTimer = 0;
          door.closeTimer = 0;
          this.audioManager.playDoorCreak();
        }
      }
    }
  }

  private addDoorCollider(door: { meshCollider: THREE.Mesh }): void {
    if (!this.collidableObjects.includes(door.meshCollider)) {
      this.collidableObjects.push(door.meshCollider);
    }
  }

  private removeDoorCollider(door: { meshCollider: THREE.Mesh }): void {
    const index = this.collidableObjects.indexOf(door.meshCollider);
    if (index > -1) {
      this.collidableObjects.splice(index, 1);
    }
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

  private triggerJumpscare(enemyType: string = 'stalker'): void {
    const jumpscareOverlay = document.getElementById('jumpscareOverlay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');

    // 1) Flash rojo inmediato + shake fuerte de cámara
    const flashFn = (window as unknown as { triggerScreenFlash?: (color: string, ms: number) => void }).triggerScreenFlash;
    if (flashFn) flashFn('#ff0000', 60);
    this.sceneManager.startCameraShake(0.22, 0.55);

    // 2) Sonido de jumpscare inmediato (lo más importante)
    this.audioManager.playJumpscareSound();

    // 3) Cara aparece 220 ms después para que el flash/shake preceda a la imagen
    setTimeout(() => {
      const drawFn = (window as unknown as { triggerEnhancedJumpscare?: (type: string) => void }).triggerEnhancedJumpscare;
      if (drawFn) {
        drawFn(enemyType);
      } else {
        (window as unknown as { drawJumpscareFace?: () => void }).drawJumpscareFace?.();
        if (jumpscareOverlay) jumpscareOverlay.classList.add('active');
      }
    }, 220);

    const stats = ScoreManager.getStats();
    stats.totalDeaths++;
    stats.totalCoins += this.statsCoinsCollected;
    stats.totalBatteries += this.statsBatteriesCollected;
    ScoreManager.saveStats(stats);
    
    ScoreManager.unlockAchievement('first_death');

    setTimeout(() => {
      if (jumpscareOverlay) jumpscareOverlay.classList.remove('active');
      this.showStats(false);
      if (gameOverOverlay) gameOverOverlay.classList.add('active');
      document.exitPointerLock();
      
      // Fade-in suave del overlay de muerte
      if (this.transitionOverlay) {
        this.transitionOverlay.style.transition = 'opacity 0.5s ease';
        this.transitionOverlay.style.opacity = '0';
        this.transitionOverlay.classList.remove('active');
      }
    }, 2500);
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

  private addFootprint(): void {
    if (!this.footprintTex) this.footprintTex = this.createFootprintTexture();

    const mat = new THREE.MeshBasicMaterial({
      map: this.footprintTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.38), mat);

    // Offset lateral alternando pie izquierdo/derecho
    const sideOffset = this.footprintLeft ? 0.16 : -0.16;
    const rx = Math.cos(this.player.yaw) * sideOffset;
    const rz = -Math.sin(this.player.yaw) * sideOffset;

    mesh.position.set(this.player.position.x + rx, 0.012, this.player.position.z + rz);
    // Orientación: aplana sobre el suelo y rota en la dirección de marcha
    mesh.rotation.set(0, this.player.yaw, 0);
    mesh.rotateX(-Math.PI / 2);

    this.footprintLeft = !this.footprintLeft;
    this.sceneManager.scene.add(mesh);
    this.footprints.push({ mesh, life: this.FOOTPRINT_LIFETIME });

    if (this.footprints.length > this.MAX_FOOTPRINTS) {
      const old = this.footprints.shift()!;
      this.sceneManager.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      (old.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
  }

  private updateFootprints(delta: number): void {
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      fp.life -= delta;
      (fp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fp.life / this.FOOTPRINT_LIFETIME) * 0.55;
      if (fp.life <= 0) {
        this.sceneManager.scene.remove(fp.mesh);
        fp.mesh.geometry.dispose();
        (fp.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.footprints.splice(i, 1);
      }
    }
  }

  private doSpawnEnemies(): void {
    if (this.monsterSpawned) return;

    let types: EnemyType[] = [];
    
    switch (this.currentLevel) {
      case 'level1':
        types = [EnemyType.STALKER];
        break;
      case 'level2':
        types = [EnemyType.RUNNER, EnemyType.STALKER];
        break;
      case 'level3':
        types = [EnemyType.STALKER, EnemyType.TELEPORTER];
        break;
      case 'level4':
        types = [EnemyType.RUNNER, EnemyType.RUNNER, EnemyType.STALKER];
        break;
      case 'ultimate':
        types = [EnemyType.RUNNER, EnemyType.STALKER, EnemyType.TELEPORTER];
        break;
    }
    
    for (const type of types) {
      const pos = this.mazeGenerator.findRandomEmptyPosition(8);
      if (pos) {
        const enemy = new Enemy(
          type,
          new THREE.Vector3(pos.x * CONFIG.UNIT_SIZE, 0, pos.z * CONFIG.UNIT_SIZE),
          this.sceneManager.scene,
          this.maze
        );
        this.enemies.push(enemy);
      }
    }

    this.monsterSpawned = true;
    console.log('[Game] Enemies spawned for level:', this.currentLevel);
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

  private updateMinimap(): void {
    if (!this.minimapCtx || !this.minimapCanvas || !this.minimapBaseImageData) return;

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

    // 1) Laberinto completo (base)
    ctx.putImageData(this.minimapBaseImageData, 0, 0);

    // Nivel 2: monedas restantes como puntos dorados
    if (this.currentLevel === 'level2') {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      for (const coin of this.coins) {
        const cx = coin.position.x / CONFIG.UNIT_SIZE;
        const cz = coin.position.z / CONFIG.UNIT_SIZE;
        ctx.beginPath();
        ctx.arc(cx * cellPx, cz * cellPx, cellPx * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      // Revelar salida cuando el score llegue al objetivo
      if (this.score >= this.targetScore) {
        ctx.fillStyle = 'rgba(0, 240, 90, 1)';
        ctx.beginPath();
        ctx.arc(
          this.minimapExitCellX * cellPx,
          this.minimapExitCellZ * cellPx,
          cellPx * 0.8, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Power-ups en el mapa
    for (const powerUp of this.powerUps) {
      const pux = powerUp.position.x / CONFIG.UNIT_SIZE;
      const puz = powerUp.position.z / CONFIG.UNIT_SIZE;
      const cellType = powerUp.userData.cellType;
      
      // Color según tipo
      let color = 'rgba(255, 255, 255, 0.9)'; // Default: blanco
      if (cellType === CellType.POWER_SPEED) {
        color = 'rgba(255, 136, 0, 0.95)'; // Naranja para velocidad
      } else if (cellType === CellType.POWER_INVISIBLE) {
        color = 'rgba(0, 255, 255, 0.95)'; // Cian para invisibilidad
      } else if (cellType === CellType.POWER_STUN) {
        color = 'rgba(255, 215, 0, 0.95)'; // Amarillo para stun
      } else if (cellType === CellType.POWER_SANITY) {
        color = 'rgba(200, 100, 255, 0.95)'; // Púrpura para cordura
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      // Diamante en vez de círculo
      const cx = pux * cellPx;
      const cz = puz * cellPx;
      const r = cellPx * 0.5;
      ctx.moveTo(cx, cz - r);
      ctx.lineTo(cx + r, cz);
      ctx.lineTo(cx, cz + r);
      ctx.lineTo(cx - r, cz);
      ctx.closePath();
      ctx.fill();
      
      // Borde blanco
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 2) Capa de niebla de guerra encima del laberinto (antes de los iconos dinámicos)
    if (this.fogCanvas) {
      ctx.drawImage(this.fogCanvas, 0, 0);
    }

    // Enemigos: puntos rojos (solo si están en zona revelada)
    for (const enemy of this.enemies) {
      const ex = enemy.position.x / CONFIG.UNIT_SIZE;
      const ez = enemy.position.z / CONFIG.UNIT_SIZE;
      ctx.fillStyle = 'rgba(230, 20, 20, 0.95)';
      ctx.beginPath();
      ctx.arc(ex * cellPx, ez * cellPx, cellPx * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Borde blanco para contraste
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Jugador: triángulo amarillo con dirección
    const px = this.player.position.x / CONFIG.UNIT_SIZE;
    const pz = this.player.position.z / CONFIG.UNIT_SIZE;
    const r = cellPx * 1.1;

    ctx.save();
    ctx.translate(px * cellPx, pz * cellPx);
    // yaw=0 → cámara apunta -Z (norte en canvas = arriba). Negamos para que
    // la rotación canvas (CW) coincida con la dirección real de la cámara.
    ctx.rotate(-this.player.yaw);
    // Sombra para legibilidad
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

    // Leyenda en esquina inferior izquierda del canvas
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

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.monsterSpawnTimer += delta * 1000;
    if (this.monsterSpawnTimer >= CONFIG.MONSTER_SPAWN_DELAY) {
      this.doSpawnEnemies();
    }

    // Aplicar estado de puertas cerradas al jugador
    this.player.closedDoors = this.dynamicDoors.filter(d => d.isClosed || d.isClosing);
    this.player.update(delta);
    this.checkBatteryCollection();
    this.updatePowerUpVisuals(delta);

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
        this.triggerJumpscare(enemy.type);
        console.log('[Game] Game Over - Player killed');
        return;
      }
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

    // ── Puertas Dinámicas ─────────────────────────────────────────────────────
    this.updateDynamicDoors(delta);

    // ── Trail del Jugador ─────────────────────────────────────────────────────
    if (isMoving) {
      this.trailTimer += delta;
      if (this.trailTimer >= this.TRAIL_INTERVAL) {
        this.addTrailPosition();
        this.trailTimer = 0;
      }
    }
    this.renderTrail();

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

    this.horrorEffects.update(delta);
    this.horrorEffects.updateGhosts(this.player.position, delta);
    this.sceneManager.updateShake(delta);

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

    this.uiManager.updateStamina(this.player.stamina);
    this.uiManager.updateBattery(this.player.battery);
    this.uiManager.updateSanity(this.player.sanity, CONFIG.SANITY_MAX);
    this.uiManager.updateHiding(this.player.isHiding, this.player.canHide);
    this.uiManager.updatePowerUps(this.player.speedBoostTimer, this.player.invisibilityTimer);

    // Actualizar objetivo dinámicamente
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
    this.sceneManager.render();
  };
}

new Game();
