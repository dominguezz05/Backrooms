# Pesadilla en los Backrooms

Juego de terror en primera persona para navegador, construido con Three.js r171 + TypeScript + Vite.

---

## Tabla de Contenidos

- [Estructura del Proyecto](#estructura-del-proyecto)
- [Cómo Ejecutar](#cómo-ejecutar)
- [Niveles — Objetivos y Jugabilidad](#niveles--objetivos-y-jugabilidad)
  - [Mecánicas Globales](#mecánicas-globales)
    - [Nivel 1 — Encuentra la Salida](#nivel-1--encuentra-la-salida)
  - [Nivel 2 — Recolecta 100 Puntos](#nivel-2--recolecta-100-puntos)
  - [Nivel 3 — Salas Abiertas](#nivel-3--salas-abiertas)
  - [Nivel 4 — Apagón Total](#nivel-4--apagón-total)
  - [Ultimate — Supervivencia](#ultimate--supervivencia)
- [Arquitectura Técnica](#arquitectura-técnica)
  - [Sistema de Laberintos](#sistema-de-laberintos)
  - [Construcción de Paredes](#construcción-de-paredes)
  - [Sistema de Iluminación](#sistema-de-iluminación)
  - [Sistema de Enemigos](#sistema-de-enemigos)
  - [Sistema de Audio](#sistema-de-audio)
- [Bugs Conocidos](#bugs-conocidos)
- [Mejoras de Enemigos Pendientes](#mejoras-de-enemigos-pendientes)
- [Mejoras Generales Pendientes](#mejoras-generales-pendientes)
- [Valoración del Proyecto](#valoración-del-proyecto)
- [Controles](#controles)

---

## Novedades Recientes

| Feature | Descripción |
|---------|-------------|
| 🎚️ **Sistema de dificultad** | Fácil / Normal / Pesadilla: modifica velocidades de enemigos, drenaje de batería/cordura y tiempo de spawn |
| ⚰️ **Ataúdes 3D** | Los escondites ya no son manchas en el suelo — son ataúdes de madera empotrados en las paredes con modelo 3D y cruz. Dentro la cordura no se ve afectada |
| 🔦 **Nivel 4 — Apagón Total** | Nivel sin ninguna fuente de luz excepto la linterna. Empieza con 55% de batería, sin luces de techo ni parpadeantes. 2 Runners + 1 Stalker |
| 👣 **Rastro de pisadas** | Al caminar se dejan marcas procedurales en el suelo que se desvanecen gradualmente |
| 📊 **Pantalla de estadísticas** | Al morir o ganar se muestra: tiempo, distancia caminada, baterías recogidas, sustos, veces en ataúd |
| 🎭 **Modal de nombre rediseñado** | Nueva pantalla de introducción de nombre con estética de "identificación de víctima" |
| 🔠 **Título original restaurado** | El título del menú vuelve al estilo grande del original |
| 🪟 **Vista desde dentro del ataúd** | El overlay ya no es negro sólido — tablones de madera con grietas finas permiten ver el juego desde dentro, con animación de respiración suave |
| 🔧 **Fix ataúd: CTRL toggle** | Antes era imposible salir del ataúd (el código de salida era inalcanzable). Ahora CTRL es toggle: un press entra, otro press sale |

---

## Estructura del Proyecto

```
Backroom game/
├── README.md                        ← Este archivo
├── backrooms-game/                  ← Stack moderno (TypeScript + Vite) — versión activa
│   ├── src/
│   │   ├── core/
│   │   │   ├── SceneManager.ts      # Three.js: escena, cámara, renderer, niebla, linterna
│   │   │   └── InputManager.ts      # Controles: teclado, ratón, táctil
│   │   ├── entities/
│   │   │   ├── Player.ts            # Stamina, batería, cordura, escondite
│   │   │   └── Enemy.ts             # 3 tipos de enemigo + caras texturizadas proceduralmente
│   │   ├── systems/
│   │   │   ├── MazeGenerator.ts     # Generación procedural (Recursive Backtracking)
│   │   │   ├── AudioManager.ts      # Audio 3D procedural, música dinámica, susurros con nombre
│   │   │   ├── HorrorEffects.ts     # Luces parpadeantes, distorsión FOV (mensajes random desactivados)
│   │   │   └── UIManager.ts         # HUD, barras de recursos, overlays, puntuación
│   │   ├── utils/
│   │   │   └── textures.ts          # Texturas procedurales (suelo sucio, paredes con sangre, techo)
│   │   ├── constants.ts             # CONFIG centralizado — tuning de dificultad aquí
│   │   ├── types.ts                 # Tipos TypeScript + enum CellType + enum EnemyType
│   │   ├── Game.ts                  # Bucle principal, sistema de niveles, buildMaze(), addExitArrows()
│   │   └── main.ts                  # Punto de entrada (carga Game.ts)
│   ├── index.html                   # Menú principal: modal de nombre rediseñado + 5 niveles + selector de dificultad
│   ├── game.html                    # Página del juego: modal auriculares + HUD + overlays + carga main.ts
│   ├── package.json                 # Three.js r171, TypeScript, Vite
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── old_original_files/              ← Stack legacy (HTML/JS puro) — solo referencia
    ├── index.html
    ├── juego_backrooms.html         # Nivel 1 original
    ├── juego_backrooms2.html        # Nivel 2 original
    └── juego_backrooms_ultimate.html
```

---

## Cómo Ejecutar

```bash
cd backrooms-game
npm install
npm run dev
```

Abrir `http://localhost:3000`. Seleccionar nivel desde el menú.

Para generar el build de producción:
```bash
npm run build
```
El resultado queda en `backrooms-game/dist/` (ignorado por `.gitignore`).

| URL | Nivel | Objetivo | Enemigos |
|-----|-------|----------|----------|
| `?level=1` | Nivel 1 | Encontrar la salida | 1 Stalker |
| `?level=2` | Nivel 2 | Recoger 100 monedas | Runner + Stalker |
| `?level=3` | Nivel 3 | Encontrar la salida | Stalker + Teleporter |
| `?level=4` | **Nivel 4** | Encontrar la salida (apagón total) | Runner + Runner + Stalker |
| `?level=ultimate` | Ultimate | Supervivencia | Runner + Stalker + Teleporter |

---

## Niveles — Objetivos y Jugabilidad

### Mecánicas Globales

Todos los niveles comparten el mismo sistema de tres recursos que el jugador debe gestionar simultáneamente:

#### Stamina (Energía)
- Máximo: 100
- Se drena a **15/s** mientras se esprint
- Recuperación: **ROTA** — el código de recuperación (10/s) es inalcanzable (Bug #3)
- Efecto: sin stamina no se puede correr, solo caminar (2.0 u/s vs 4.5 u/s)

#### Batería (Linterna)
- Máximo: 100
- Se drena a **5%/s** con la linterna encendida
- Se recarga +40% recogiendo baterías (8 por laberinto, cajas verdes en el suelo)
- Sin batería la linterna se apaga — fundamental para ver y para recuperar cordura

#### Cordura
- Máximo: 100
- **Fuentes de drenaje:**
  - -1/s en oscuridad (sin linterna, lejos de focos de techo)
  - -4/s cerca de un enemigo (escala con distancia)
- **Fuentes de recuperación:**
  - +0.8/s con linterna encendida
  - +0.8/s cerca de un foco de techo (sin linterna)
- **Efectos por umbral:**
  - < 60: los enemigos pueden susurrar el nombre del jugador (si está configurado)
  - < 40: la niebla se reduce drásticamente — el jugador ve menos lejos
  - < 30: respiración agitada, mensajes de advertencia más frecuentes
  - < 25: **alucinaciones** — imágenes perturbadoras aparecen en pantalla cada 4-7 segundos
  - = 0: **Game Over** — "HAS PERDIDO LA CORDURA"

#### Ataúdes (Escondite)
- 6 ataúdes por laberinto, empotrados en las paredes (modelo 3D de madera oscura con cruz)
- Tecla: **CTRL** cuando el jugador está a < 2.4 unidades de un ataúd
- Mientras está escondido: el jugador no puede moverse
- **La cordura no se drena ni se recupera dentro del ataúd** — zona neutral
- Los enemigos no detectan al jugador **salvo que estén a menos de 3 unidades**
- Visual: overlay de oscuridad total + texto "⚰ DENTRO DEL ATAÚD ⚰"

#### Condiciones de Muerte
| Causa | Pantalla |
|-------|---------|
| Enemigo toca al jugador (< 1.8 u.) | Jumpscare con la cara del tipo de enemigo → "¡HAS MUERTO!" |
| Cordura llega a 0 | "¡HAS PERDIDO LA CORDURA!" |

#### Spawn de Enemigos
Todos los niveles tienen un **retraso de 8 segundos** antes de que aparezcan los enemigos (`MONSTER_SPAWN_DELAY = 8000ms`). Aparecen en posiciones aleatorias a más de 8 unidades del jugador.

---

### Nivel 1 — Encuentra la Salida

**URL:** `game.html?level=1`

**Objetivo:** Llegar a la caja semitransparente verde que marca la salida. Está siempre en la esquina opuesta al spawn `(width-2, height-2)` del laberinto.

**Enemigos:** 1 × Stalker
- Velocidad: 1.5 u/s (más lento que el jugador caminando)
- Detección: 18 unidades (ve muy lejos)
- Comportamiento: te sigue lentamente una vez detectado — peligroso si te acorrala

**Laberinto:** Pasillos estrechos, laberinto procedural 25×25, sin salas abiertas

**Recursos disponibles:**
- 8 baterías (cajas verdes pequeñas)
- 5 notas de lore (planos con texto)
- 4 fotos de lore
- 12 manchas de sangre (decoración)
- ~30 luces parpadeantes (10% spawn por celda vacía)
- 10 focos de techo

**Flujo de juego típico:**
1. El jugador spawna en `(1,1)`, sin linterna
2. Explora pasillos a oscuras o con linterna (gastando batería)
3. A los 8 segundos aparece el Stalker
4. El jugador oye los pasos del Stalker (audio 3D) y tiene que decidir: correr o esconderse
5. Objetivo: navegar al extremo opuesto del laberinto sin ser atrapado

**Estado actual:** La condición de victoria está **rota** (Bug #2) — el jugador llega a la salida y no pasa nada.

---

### Nivel 2 — Recolecta 100 Puntos

**URL:** `game.html?level=2`

**Objetivo:** Recoger **10 monedas** (cada una vale 10 puntos) antes de ser atrapado. Score visible en el HUD (esquina superior izquierda).

**Enemigos:** 1 × Runner + 1 × Stalker
- **Runner**: velocidad 4.0 u/s (más rápido que el sprint del jugador), detección 5 u. — ciego pero rapidísimo
- **Stalker**: velocidad 1.5 u/s, detección 18 u. — lento pero omnisciente

**Laberinto:** Mismo sistema que Level 1. Las monedas spawnan en celdas vacías al **8% de probabilidad** — aproximadamente 25 monedas por laberinto (pero solo hacen falta 10).

Las monedas son esferas doradas animadas con rotación.

**Dinámica de los dos enemigos:**
- El Stalker te detecta desde lejos y te persigue despacio → crea presión constante
- El Runner no te ve pero si te cruza de cerca te mata en décimas de segundo → necesita reaccionar rápido
- La combinación fuerza al jugador a moverse rápido (para recoger monedas) pero con cuidado (Runner al doblar esquinas)

**Estado actual:**
- La recogida de monedas y el score **funcionan correctamente**
- La condición de victoria (score ≥ 100) **existe pero sin animación de victoria** — solo aparece un mensaje de texto durante 5 segundos

---

### Nivel 3 — Salas Abiertas

**URL:** `game.html?level=3`

**Objetivo:** Encontrar la salida (igual que Level 1).

**Enemigos:** 1 × Stalker + 1 × Teleporter
- **Stalker**: igual que Level 1
- **Teleporter**: velocidad 2.5 u/s, detección 12 u., se **teleporta cada 8 segundos** a 8-13 unidades del jugador — semi-transparente morado con destellos al teletransportarse

**Laberinto:** Generación con `openRooms: true` — además del laberinto base se generan:
- 4-6 habitaciones rectangulares de 3-5 tiles (espacios abiertos más grandes)
- 3-5 corredores anchos conectando las habitaciones

La combinación da lugares más abiertos donde el Teleporter es especialmente peligroso (aparece dentro de la misma habitación).

**Feature exclusiva de Level 3:** Cuando el enemigo está a menos de 15 unidades, se activa `playEnemySpeech()` — el enemigo habla/emite sonidos de forma más agresiva.

**Estado actual:** La condición de victoria está **rota** (Bug #2). La generación de salas abiertas puede producir **zonas inalcanzables** si la validación de conectividad falla.

---

### Nivel 4 — Apagón Total

**URL:** `game.html?level=4`

**Objetivo:** Encontrar la salida verde. Idéntico a Level 1 en estructura, pero con visibilidad prácticamente nula.

**Enemigos:** 2 × Runner + 1 × Stalker
- Dos Runners: rápidos (4.0 u/s), casi ciegos (5 u.) — letales en pasillos estrechos
- Un Stalker: lento pero te localiza desde 18 unidades

**Mecánica principal:** **apagón total**
- La luz ambiental es ínfima (`intensity: 0.02`) — el laberinto es negro sin linterna
- Sin focos de techo, sin luces parpadeantes
- El jugador empieza con la linterna **encendida** pero solo con **55% de batería**
- Sin linterna la cordura cae rápido → gestionar la batería es la clave del nivel

**Estrategia:**
- Alternar linterna (on/off) para ahorrar batería
- Moverse en oscuridad puntual para evitar dar pistas visuales a los enemigos
- Usar los ataúdes para esconderse de los Runners en pasillos
- Las baterías (8 por laberinto) son críticas — buscarlas activamente

**Dificultad real:** Más difícil que Level 3, inferior a Ultimate solo en número de enemigos. Sin linterna, la presión psicológica es máxima.

---

### Ultimate — Supervivencia

**URL:** `game.html?level=ultimate`

**Objetivo:** Encontrar la salida con los **3 enemigos activos simultáneamente**.

**Enemigos:** Runner + Stalker + Teleporter (los tres a la vez)

La combinación de los tres crea dinámicas únicas:
- El **Stalker** te localiza desde lejos y te marca — siempre sabe dónde estás
- El **Runner** patrulla aleatoriamente y mata de golpe si te cruza — el factor de muerte repentina
- El **Teleporter** aparece aleatoriamente cerca — interrumpe cualquier ruta segura

**Mecánicas adicionales activas en Ultimate:**
- La cordura baja más rápido al tener 3 focos de drenaje simultáneos
- Los susurros del nombre del jugador se activan antes (cordura < 60)
- Las alucinaciones son más frecuentes

**Laberinto:** Pasillos estrechos (sin salas abiertas) — el mismo tipo que Level 1.

**Dificultad real:** Es el único nivel donde las tres presiones (ver lejos/Stalker, velocidad/Runner, impredecibilidad/Teleporter) se combinan. Sin mejoras de IA (line of sight, investigación) es demasiado caótico en lugar de tenso. Con esas mejoras sería el nivel más aterrador.

---

### Comparativa de Niveles

| | Level 1 | Level 2 | Level 3 | Level 4 | Ultimate |
|---|---------|---------|---------|---------|---------|
| **Objetivo** | Salida | 100 puntos | Salida | Salida | Salida |
| **Enemigos** | Stalker | Runner + Stalker | Stalker + Teleporter | Runner×2 + Stalker | Los 3 |
| **Laberinto** | Pasillos | Pasillos + monedas | Pasillos + salas | Pasillos (oscuridad total) | Pasillos |
| **Dificultad** | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | ★★★★★ |
| **Mecánica especial** | — | Score/monedas | Salas abiertas | Apagón total, linterna obligatoria | Todo a la vez |

---

## Arquitectura Técnica

### Sistema de Laberintos

**Algoritmo:** Recursive Backtracking (carving)
**Clase:** `MazeGenerator.ts`

**Proceso de generación:**
1. Inicializa todo como `WALL`
2. Empieza en `(1,1)` como `EMPTY`
3. Expande visitando vecinos a 2 celdas de distancia, tallando el pasillo entre medio
4. Al acabar, coloca elementos especiales con `addSpecialRooms()`

**Tipos de celda** (`enum CellType` en `types.ts`):

| Valor | Nombre | Descripción | Representación 3D |
|-------|--------|-------------|-------------------|
| 0 | `EMPTY` | Suelo transitable | Plano de suelo + plano de techo |
| 1 | `WALL` | Pared sólida | `BoxGeometry(3, 3, 3)` colisionable |
| 2 | `PLAYER_SPAWN` | Spawn del jugador | Siempre en `(1, 1)` |
| 3 | `EXIT` | Salida del nivel | Caja semitransparente verde |
| 4 | `BATTERY` | Recarga linterna (+40%) | Caja verde pequeña `(0.3×0.5×0.3)` |
| 5 | `HIDING_SPOT` | Ataúd empotrado en pared | Modelo 3D de madera + cruz + lógica de detección |
| 6 | `NOTE` | Nota de lore | Plano con texto canvas |
| 7 | `PHOTO` | Foto de lore | Plano con imagen canvas |
| 8 | `BLOOD_STAIN` | Decoración | Decal en suelo `(1.5×1.5)` |
| 9 | `CEILING_LIGHT` | Foco de techo | Esfera `r=0.15` + `PointLight` |

**Elementos por laberinto** (tamaño 25×25):

| Elemento | Cantidad | Condición de spawn |
|----------|----------|-------------------|
| Baterías | 8 | Celdas vacías con `x>5 \|\| z>5` |
| Escondites | 6 | Celdas vacías con ≥2 paredes adyacentes |
| Notas | 5 | Celdas vacías con `x>3 \|\| z>3` |
| Fotos | 4 | Celdas vacías aleatorias |
| Manchas de sangre | 12 | Celdas vacías aleatorias |
| Focos de techo | 10 | Celdas vacías aleatorias |
| Salida | 1 | Siempre en `(width-2, height-2)` |

**Nivel 3 — Salas Abiertas:** activa `createOpenRooms()` que genera 4-6 habitaciones rectangulares de 3-5 tiles y 3-5 corredores anchos entre ellas.

---

### Flechas de Pista en Paredes

**Código:** `Game.ts` > `addExitArrows()` + `createArrowTexture()`

Después de construir el laberinto, se pintan flechas tenues en la superficie de ciertos muros que indican la **dirección general de la salida**. Son el único sistema de navegación del juego.

**Comportamiento visual — solo visibles con linterna:**
- Material: `MeshStandardMaterial` con `roughness: 1.0, metalness: 0.0, emissive: 0`
- Sin emisión propia → con la luz ambiental (`0x151515 × 0.5`) son prácticamente invisibles
- Bajo el `SpotLight` de la linterna (intensidad 2) se iluminan claramente
- Aspecto: flecha con estilo "pintura/graffiti" en tono crema-amarillento sobre fondo casi transparente

**Textura (`createArrowTexture()`):**
- Canvas 256×256 px
- Flecha apuntando a la **derecha** `(→)` en espacio local del plano
- Con sombra de trazo para dar sensación de pintura a mano

**Distribución:**
- Se recorre el laberinto buscando celdas `CellType.EMPTY`
- Se omiten las 6 primeras celdas desde el spawn (`distFromSpawn < 6`) para no trivializar el comienzo
- Densidad: aprox. **1 flecha cada 5-6 celdas** — hash `(x*3 + z*7) % 11 === 0`

**Dirección y orientación:**
- Vector `(dx, dz) = exitCell - currentCell`
- Si `|dx| >= |dz|`: dirección dominante en X → se busca un muro en eje Z (perpendicular) para pintar
- Si `|dz| > |dx|`: dirección dominante en Z → se busca muro en eje X
- Cada configuración de muro tiene su propia fórmula de `rotation.z` para proyectar la dirección de salida sobre la superficie del plano:

| Muro | `rotY` del plano | Fórmula `rotation.z` |
|------|-------------------|----------------------|
| `+Z` vecino | `Math.PI` | `atan2(0, -dx)` |
| `-Z` vecino | `0` | `atan2(0, dx)` |
| `+X` vecino | `-Math.PI/2` | `atan2(0, dz)` |
| `-X` vecino | `Math.PI/2` | `atan2(0, -dz)` |

- El plano se posiciona a `unitSize/2 - 0.06` del centro de la celda, a `y = 1.45` (altura de los ojos)
- Solo se coloca **una flecha por celda** (break al encontrar la primera pared válida)

---

### Modal de Auriculares

**Código:** `game.html` — elemento `#headphonesModal` + script de dismiss

Al abrir el juego aparece un modal que recomienda usar auriculares **antes** de la pantalla de inicio. Tiene dos botones:
- **"🎧 TENGO AURICULARES — COMENZAR"** — recomendado
- **"Continuar sin auriculares"** — bypass

Ambos ocultan el modal y dejan visible el `#startOverlay` (z-index: 200) detrás. El modal tiene z-index: 600 y animación de entrada `headphonesIn`.

El modal respeta el requisito del navegador: el `AudioContext` solo se crea en el handler de click del `#startOverlay`, no en el del modal.

---

### Construcción de Paredes

**Código:** `Game.ts` > `buildMaze()`, líneas ~160-189

**Geometría y material:**
```
BoxGeometry(UNIT_SIZE, WALL_HEIGHT, UNIT_SIZE)  // 3×3×3 unidades
MeshStandardMaterial({ map: wallTexture })       // Textura procedural
```

**Propiedades:**
- Posición: `(x * 3.0, 1.5, z * 3.0)` — centradas verticalmente en `wallHeight / 2`
- `castShadow = true`, `receiveShadow = true`
- Se añaden al array `collidableObjects` para colisión con jugador y enemigos

**Reutilización:**
- Una sola instancia de `BoxGeometry` compartida entre todos los muros
- Un solo `MeshStandardMaterial` compartido entre todos los muros
- **No** hay `InstancedMesh` ni geometría mergeada — cada muro es un `THREE.Mesh` individual

**Texturas procedurales** (generadas en `textures.ts` con Canvas API):
- `createWallTexture(level)` — papel pintado envejecido con manchas de sangre, grietas y costuras verticales
- `createFloorTexture(level)` — moqueta sucia con barro, manchas de humedad
- `createCeilingTexture(level)` — techo oscuro con ruido sutil

Las texturas se generan **una sola vez por nivel por sesión** gracias al cache `_textureCache` en `textures.ts` (Bug #8 arreglado).

---

### Sistema de Iluminación

El juego tiene **6 tipos de luz** distintos:

#### 1. Luz Ambiental Global
**Código:** `SceneManager.ts:36-37`
```
AmbientLight(color: 0x151515, intensity: 0.5)
```
Iluminación base muy tenue. Hace que las zonas sin luz no sean completamente negras.

---

#### 2. Linterna del Jugador (Flashlight)
**Código:** `SceneManager.ts:43-52` + constantes en `constants.ts:44-46`
```
SpotLight(
  color:     0xffffee,          // Blanco cálido
  intensity: 2,                 // Cuando está encendida
  distance:  20,                // 20 unidades de alcance
  angle:     Math.PI / 6,       // 30 grados de cono
  penumbra:  0.5,               // Bordes suaves
  decay:     1
)
```
- Adjunta directamente a la cámara (`camera.add(light)`) — sigue la vista
- `castShadow = false` para rendimiento
- Visible = false por defecto, se activa con tecla F
- **Recurso limitado:** se gasta a 8%/s, se recarga con baterías

---

#### 3. Focos de Techo (Ceiling Lights)
**Código:** `Game.ts:366-379` — generados por `MazeGenerator` en celdas tipo `CEILING_LIGHT`
```
PointLight(color: 0xffffee, intensity: 0.8, distance: 8, decay: 1.5)
```
- Hasta 10 por laberinto
- Acompañados de una esfera visual `SphereGeometry(0.15, 8, 8)` simulando la bombilla
- Posición: `(x, wallHeight - 0.3, z)` — colgando del techo
- `castShadow = false`

---

#### 4. Luces Parpadeantes de Horror (Flickering Lights)
**Código:** `HorrorEffects.ts:25-39` — creadas durante `buildMaze()`
```
PointLight(color: 0xffffaa, intensity: 0.5, distance: 15, decay: 2)
```
- Spawn aleatorio: **10% de probabilidad** en cada celda no-pared
- En un laberinto 25×25 (~312 celdas vacías) pueden generarse hasta **~30 luces parpadeantes**
- Cada luz tiene parámetros de parpadeo independientes:
  ```
  baseIntensity:  0.3 – 0.7  (aleatorio)
  flickerSpeed:   5  – 15 Hz (aleatorio)
  flickerAmount:  0.1 – 0.4  (aleatorio)
  ```
- **Fórmula de parpadeo** (actualizada cada frame en `HorrorEffects.ts:47-55`):
  ```
  intensity = baseIntensity
            + sin(time * flickerSpeed) * flickerAmount
            + random() * flickerAmount * 0.5
  ```
  Combinación de onda seno + ruido blanco para efecto orgánico.

---

#### 5. Luz Principal de Enemigo (Enemy Glow)
**Código:** `Enemy.ts:434-439`
```
PointLight(color: <por tipo>, intensity: 1.5, distance: 8)
castShadow = true, shadowMap: 256×256
```
Posición: altura de la cabeza, ligeramente adelantada.
Pulsa de forma sinusoidal: `intensity = 1.2 + sin(t * 5) * 0.3`

---

#### 6. Luz Secundaria de Enemigo (Ambient Glow)
**Código:** `Enemy.ts:441-443`
```
PointLight(color: <por tipo>, intensity: 0.5, distance: 4)
```
Posición: altura del torso. Sin sombras. Crea un halo suave alrededor del cuerpo.

**Colores de luz por tipo de enemigo:**

| Tipo | Color luz | Hex |
|------|-----------|-----|
| Runner | Rojo | `0xff0000` |
| Stalker | Verde | `0x44ff00` |
| Teleporter | Magenta | `0xff00ff` |

---

#### Resumen de todas las luces

| Tipo | Cantidad | Archivo | Sombras |
|------|----------|---------|---------|
| Ambiental | 1 | SceneManager.ts | No |
| Linterna | 1 | SceneManager.ts | No |
| Focos de techo | ≤10 | Game.ts | No |
| Parpadeantes de horror | ~30 | HorrorEffects.ts | No |
| Enemigo principal | 1–3 | Enemy.ts | Sí (256×256) |
| Enemigo secundaria | 1–3 | Enemy.ts | No |
| **Total aproximado** | **~46–48** | | |

**Renderer:** `BasicShadowMap` (más rápido, menos calidad). Solo los enemigos proyectan sombras.

---

### Sistema de Enemigos

**Clase:** `Enemy.ts`

Cada enemigo es un `THREE.Group` con geometría humanoid completa: piernas, torso, brazos, cabeza con textura de cara generada proceduralmente en Canvas.

#### Tipos de Enemigo

| Tipo | Velocidad | Detección | Visual | Comportamiento |
|------|-----------|-----------|--------|----------------|
| **Runner** | 3.5 | 5 u. | Silueta roja delgada | Ciega y rapidísima — peligrosa en pasillos rectos |
| **Stalker** | 1.2 | 18 u. | Silueta oscura ancha | Lenta pero te ve desde muy lejos, persistente |
| **Teleporter** | 2.0 | 12 u. | Semitransparente morada | Se teleporta cada 8s a 8-13 unidades del jugador |

#### Caras Texturizadas

Cada tipo genera su propia textura facial 512×512 en Canvas en tiempo real:
- Formas de ojos únicas: elipses (Runner), triángulos (Stalker), pentágonos (Teleporter)
- Bocas distintas: circular, curvada, diamante
- Glow de ojos con colores por tipo: rojo, verde, magenta
- Dientes irregulares, manchas de "sangre"

#### IA Actual (lo que hay)

```
1. Calcular distancia al jugador
2. Si distancia < detectionRange → moverse en línea recta hacia jugador
3. Verificar colisión con paredes (grid-based, O(1))
4. lookAt(jugador) cada frame
5. Teleporter: incrementar timer, teleportar si supera 8s
```

**Limitación crítica:** detecta al jugador **a través de las paredes**. Sin línea de visión real.

---

### Sistema de Horror — HorrorEffects.ts

**Luces parpadeantes:** activas, reaccionan a la proximidad del enemigo (velocidad y tinte rojo).

**Mensajes overlay aleatorios:** **desactivados** — el sistema `updateMessages()` ya no llama a `showRandomMessage()`. El overlay `#messageOverlay` solo se usa para mensajes explícitos de juego (via `showMessage()` desde `Game.ts`, p.ej. "BIENVENIDO" o mensajes de eventos). Los carteles tipo "ESCUCHA", "NO MIRES ATRÁS", etc. se eliminaron por ser visualmente disruptivos.

**Distorsión de FOV:** activa — cada 10-30 segundos la cámara cambia el FOV ±5° de forma imperceptible.

---

### Sistema de Audio

- Música dinámica con 3 capas: `drone` (siempre), `tension` (enemigo cerca), `danger` (muy cerca)
- Audio 3D posicional: `AudioListener` adjunto a la cámara, pasos del monstruo desde su posición real
- Susurros procedurales con síntesis Web Audio API (sin archivos externos)
- **Susurros con el nombre del jugador** — `whisperPlayerName()` en `AudioManager.ts`

---

## Bugs Conocidos

> **Estado:** ✅ = corregido | 🔴 = crítico pendiente | 🟡 = medio pendiente | 🟢 = bajo pendiente

---

### ✅ BUG #1 — El nombre del jugador nunca llegaba al juego

**Síntoma:** Los enemigos nunca decían el nombre aunque se introdujera en el menú.

**Causa raíz:** `index.html` guardaba el nombre en `window.playerName`. Al navegar a `game.html`, el contexto `window` se destruye y la nueva página siempre leía `''`.

**Fix aplicado:** `sessionStorage.setItem/getItem('playerName')` en `index.html` y `Game.ts:83`.

---

### ✅ BUG #2 — La salida no detectaba al jugador (juego no se podía ganar)

**Síntoma:** El jugador llegaba a la salida verde y no pasaba nada.

**Causa raíz:** `checkExit()` usaba `Math.round()` para convertir la posición a celda — sin margen de tolerancia. El jugador tenía que caer exactamente en el centro de la celda.

**Fix aplicado:** `Player.ts` ahora escanea el laberinto en `setMaze()` para guardar la posición mundo de la salida en `exitWorldPos`. `checkExit()` compara distancia euclídea (`< UNIT_SIZE * 0.9 = 2.7 u.`) en lugar de celda exacta.

---

### ✅ BUG #3 — La stamina nunca se recuperaba al caminar

**Síntoma:** La barra de energía se vaciaba al correr y nunca volvía.

**Causa raíz:** El bloque de recuperación tenía `else if (input.length() === 0)` dentro de un `if (input.length() > 0)` — condición imposible, código muerto.

**Fix aplicado:** `Player.ts:73` — cambiado a `else` simple. La stamina ahora se recupera caminando (no solo parado).

---

### ✅ BUG #10 — Era imposible salir del ataúd

**Síntoma:** Al entrar al ataúd con CTRL, el jugador quedaba atrapado indefinidamente sin poder salir.

**Causa raíz:** `updateMovement()` hace `return` inmediatamente cuando `isHiding = true`. El código de salida (`else if (!keys.hide && isHiding)`) estaba **después** de ese return — código muerto, nunca se ejecutaba. Además CTRL era "hold" (mantener para estar escondido) no toggle, por lo que aunque se hubiera llegado al check el jugador saldría al soltar la tecla sin control real.

**Fix aplicado:** `Player.ts` — la lógica de toggle se movió **antes** del return. CTRL se consume como one-shot igual que la tecla `F` de la linterna: un press entra, otro press sale, independientemente del return de movimiento. Eliminado `lastHidingState` que quedó sin uso.

---

### ✅ BUG #5 — El botón "Reintentar" no preservaba el nivel

**Síntoma:** Al morir en Ultimate y pulsar REINTENTAR, cargaba Level 1.

**Causa raíz:** `<a id="restartButton" href="game.html">` sin parámetro `?level=`.

**Fix aplicado:** `game.html` — script que lee el nivel de `URLSearchParams` al cargar y actualiza el `href` del botón dinámicamente.

---

### ✅ BUG #9 — El menú volvía a pedir el nombre al volver del juego

**Síntoma:** Al pulsar "VOLVER AL MENÚ" tras ganar o morir, `index.html` mostraba el modal del nombre otra vez aunque ya estuviera guardado.

**Causa raíz:** El modal siempre se muestra por defecto al cargar `index.html`. No había lógica para detectar que el jugador ya había introducido su nombre en la sesión anterior.

**Fix aplicado:** `index.html` — al cargar, comprueba `sessionStorage.getItem('playerName')`. Si existe, oculta el modal, muestra el menú directamente, arranca los efectos visuales, y enlaza el audio al primer click (el `AudioContext` requiere gesto de usuario y la navegación previa no cuenta como tal en la nueva página).

---

### ✅ BUG #4 — Memory leak en osciladores de audio

**Síntoma:** Tras 30+ minutos, el audio cruje y hay stuttering.

**Causa raíz:** `AudioManager.ts` creaba `OscillatorNode` y `BufferSourceNode` para susurros y pasos pero nunca llamaba `.disconnect()` tras `.stop()`. En sesiones largas se acumulaban cientos de nodos en el grafo de audio.

**Fix aplicado:** `AudioManager.ts` — añadidos handlers `onended` en **todos** los nodos temporales de las 15+ funciones que creaban osciladores sin cleanup: `playHeartbeat`, `playEnemyBreathing`, `playBreathSound`, `playFlashlightOn/Off`, `playBatteryEmpty`, `playFootstepsBehind`, `playVoiceCall`, `playCreepyLaugh`, `playItemPickup`, `playNoteFound`, `playRandomWhisper`, `playDripSound`, `playMetalCreak`, `playJumpscareSound` y los 4 helpers privados. Cada `onended` desconecta toda la cadena (osc → filter → gain → panner).

---

### ✅ BUG #6 — Detección de enemigos ignoraba paredes

**Síntoma:** El Stalker perseguía al jugador a través de muros.

**Causa raíz:** La detección era solo distancia euclidea, sin comprobación de obstáculos.

**Fix aplicado:** `Enemy.ts` — nuevo método privado `hasLineOfSight()` que usa el algoritmo de **Bresenham** sobre la rejilla del laberinto (O(n) sobre las celdas entre los dos puntos, sin raycasting 3D costoso). La detección ahora es `dist < detectionRange && hasLineOfSight(playerPos)`. Si hay una pared entre medio, el enemigo no detecta al jugador aunque esté a 1 metro.

---

### ✅ BUG #7 — Pointer lock atascaba las teclas al perderlo

**Síntoma:** Al redimensionar ventana o hacer alt-tab durante el juego, el jugador se movía solo sin control.

**Causa raíz:** Cuando el browser fuerza la salida del pointer lock (resize, alt-tab, ESC), el `pointerlockchange` actualizaba `isPointerLocked = false` pero no limpiaba el estado de las teclas. Cualquier tecla que estuviera pulsada en ese momento quedaba atascada en `true`.

**Fix aplicado:** `InputManager.ts:setupMouse()` — cuando `pointerlockchange` detecta que se perdió el lock llama a `this.reset()` para limpiar todas las teclas. Añadido también handler `pointerlockerror` con el mismo cleanup.

---

### ✅ BUG #5 — Mecánica de escondite sin feedback y detección imprecisa

**Síntoma:** El jugador se colocaba encima de un hiding spot, pulsaba CTRL y a veces no funcionaba. Sin ningún sonido de confirmación.

**Causa raíz 1:** `checkHidingSpot()` usaba `Math.round` para calcular la celda exacta — el jugador tenía que estar a menos de 0.5 tiles del centro del hiding spot.

**Causa raíz 2:** No había audio al entrar ni salir del escondite.

**Fix aplicado:**
- `Player.ts` — `checkHidingSpot()` reemplazado por búsqueda de radio: escanea celdas en ±1.2 UNIT_SIZE, calcula distancia euclídea real a cada hiding spot encontrado.
- `Player.ts` — `lastHidingState` rastrea el estado anterior; cuando cambia llama a `audioManager.playHideEnter()` o `playHideExit()`.
- `AudioManager.ts` — añadidos `playHideEnter()` (tono grave descendente) y `playHideExit()` (tono grave ascendente), ambos con `onended` cleanup.

---

### ✅ BUG #6b — Victoria Level 2 sin feedback claro ni mensaje correcto

**Síntoma:** Al llegar a 100 puntos, el overlay aparecía instantáneamente con el texto genérico "¡Lograste escapar de los Backrooms!" — incorrecto para Level 2.

**Fix aplicado:**
- `Game.ts` — `triggerVictory()` ahora acepta un subtext por nivel (Level 2 muestra "¡Recogiste todas las monedas! Conseguiste escapar.") y añade un delay de 600ms para que el jugador vea la última recogida antes del overlay.
- `Game.ts` — Al recoger moneda se llama `showPickupMessage('+10 — score/100')` y se muestran mensajes de proximidad en 80 y 90 puntos ("¡CASI! 2 monedas más", "¡ÚLTIMA MONEDA!").

---

### ✅ BUG #7b — Level 3 puede generar zonas inalcanzables

**Síntoma:** Con `openRooms: true`, las habitaciones y corredores rectangulares podían crear áreas de celdas EMPTY rodeadas de paredes sin conexión al laberinto base.

**Causa raíz:** `createOpenRooms()` elimina paredes arbitrariamente sin verificar que las nuevas celdas queden conectadas al grafo del laberinto.

**Fix aplicado:** `MazeGenerator.ts` — nuevo método `ensureConnectivity()` ejecutado tras `createOpenRooms()` y antes de `addSpecialRooms()`. Realiza BFS desde spawn `(1,1)` marcando todas las celdas alcanzables. Cualquier celda no-WALL que no sea alcanzable se convierte de vuelta a WALL. Coste: O(width × height).

---

### ✅ BUG #8 — Texturas no cacheadas entre niveles

**Síntoma:** Pequeño freeze al cambiar de nivel.

**Causa raíz:** `buildMaze()` regenera las tres texturas procedurales en cada init. Son operaciones síncronas de Canvas.

**Fix aplicado:** `textures.ts` — añadido `_textureCache: Map<string, THREE.CanvasTexture>` a nivel de módulo. Las tres funciones (`createFloorTexture`, `createWallTexture`, `createCeilingTexture`) comprueban la caché con clave `floor_<level>`, `wall_<level>`, `ceiling_<level>` antes de generar el canvas. Misma textura para toda la sesión por nivel.

---

## Mejoras de Enemigos Pendientes

Los enemigos ahora mismo son mecánicos, no psicológicos. Hacen todos lo mismo: detectan distancia → línea recta. El horror real viene de la **incertidumbre**. Estas son las mejoras de mayor impacto:

---

### ✅ Mejora #1 — Línea de Visión Real
**Implementada en `Enemy.ts`**

Método `hasLineOfSight()` usando algoritmo de Bresenham sobre la rejilla del laberinto. Sin raycasting 3D — usa los datos de la cuadrícula que ya existen. Ahora esconderse detrás de una esquina funciona de verdad.

---

### ✅ Mejora #2 — Estado de Investigación (Last Known Position)
**Implementada en `Enemy.ts`**

Los enemigos ahora tienen 3 estados: `idle` → `chase` → `investigate`. Cuando pierden de vista al jugador, van a su última posición conocida y la "investigan" durante 5 segundos antes de volver a `idle`. Ya no se paran en seco al doblar una esquina.

---

### ✅ Mejora #3 — Audio de Proximidad (Sin Ver al Enemigo)
**Implementada en `AudioManager.ts` + `Game.ts`**

El jugador **oye** al enemigo acercarse antes de verlo — un oscilador sawtooth de 55 Hz modulado por LFO (respiración orgánica) cuyo volumen sube según la cercanía del enemigo. La frecuencia del LFO también sube al acercarse (de 0.4 Hz a 1.6 Hz — más agitado cuanto más cerca).

**Implementación:**
- `AudioManager.startProximitySound()` — crea el oscilador y el LFO persistentes al iniciar el audio
- `AudioManager.updateEnemyProximity(closestDist)` — ajusta volumen y LFO cada frame con `setTargetAtTime` (transición de 0.3s para evitar clicks)
- `Game.ts:animate()` — llama `updateEnemyProximity(closestEnemyDist)` **siempre** (incluso con Infinity) para que el volumen baje a 0 suavemente cuando no hay enemigos

---

### ✅ Mejora #4 — Luces Reactivas al Enemigo
**Implementada en `HorrorEffects.ts` + `Game.ts`**

Las luces parpadeantes reaccionan a la proximidad del enemigo: parpadeo más rápido, mayor amplitud, y tinte rojizo progresivo. El jugador ve la "oscuridad" propagarse antes de ver al enemigo.

**Implementación:**
- `HorrorEffects.enemyProximityFactor` (0..1) — lerp suave (factor 0.05/frame) hacia el valor objetivo para evitar cambios bruscos
- `HorrorEffects.setEnemyProximity(dist)` — nuevo método público que actualiza el factor; umbral a 15 unidades
- `updateLights()` usa el factor para:
  - `speedMult = 1 + p * 4` — velocidad de parpadeo hasta 5× más rápida
  - `amountMult = 1 + p * 3` — amplitud hasta 4× mayor
  - Color: interpola de `0xffffaa` (amarillo neutro) a rojo puro (`rgb(255, g→0, b→0)`)
- `Game.ts:animate()` — llama `setEnemyProximity(closestEnemyDist)` junto al audio cada frame

---

### ✅ Mejora #5 — Patrulla Aleatoria
**Implementada en `Enemy.ts`**

Los enemigos se mueven cuando no tienen al jugador a la vista. El jugador puede **oírlos caminar** por otro pasillo antes de verlos — build-up de tensión real.

**Implementación:**
- `Enemy.patrolTarget: THREE.Vector3 | null` — objetivo actual de patrulla
- `Enemy.patrolTimer` — temporizador; rota objetivo tras `PATROL_TIMEOUT = 6s`
- `Enemy.findRandomPatrolPoint()` — elige celda vacía del laberinto en rango `[UNIT_SIZE, UNIT_SIZE*7]`; 25 intentos, devuelve `null` si no encuentra
- La patrulla ocurre en el bloque `else` (estado `idle`) del método `update()` — se activa cuando no hay persecución ni investigación
- Velocidad de patrulla: `currentSpeed * 0.45` (menos de la mitad de la velocidad de caza)
- Si choca con una pared al patrullar, `patrolTarget = null` para elegir destino nuevo el siguiente frame

---

### Mejora #6 — Comportamientos Únicos por Tipo
**Impacto: ⭐⭐⭐ | Tiempo: 2-3h**

Ahora mismo los tres enemigos hacen lo mismo (linea recta hacia el jugador). Con estos cambios se sienten radicalmente distintos:

| Enemigo | Cambio propuesto | Efecto psicológico |
|---------|-----------------|-------------------|
| **Runner** | Solo corre si tienes la **linterna encendida**. En oscuridad, se para confuso. | Te obliga a elegir: ver y ser visto, o esconderte en la oscuridad |
| **Stalker** | A veces se para 3-5 segundos y **te mira fijo** antes de acercarse. | Más psicológico que físico — la inmovilidad es más aterradora que el movimiento |
| **Teleporter** | Aparece siempre **justo delante** del camino que el jugador va a tomar. | Sensación de que sabe a dónde vas |

---

### Resumen de Prioridad — Mejoras de Enemigos

| Mejora | Estado | Impacto |
|--------|--------|---------|
| Audio de proximidad (#3) | ✅ Implementada | ⭐⭐⭐⭐⭐ |
| Línea de visión (#1) | ✅ Implementada | ⭐⭐⭐⭐⭐ |
| Last known position (#2) | ✅ Implementada | ⭐⭐⭐⭐ |
| Luces reactivas (#4) | ✅ Implementada | ⭐⭐⭐⭐ |
| Patrulla (#5) | ✅ Implementada | ⭐⭐⭐ |
| Comportamientos únicos (#6) | Pendiente | ⭐⭐⭐ |

---

## Mejoras Generales Pendientes

### Inmediatas — Bugs que impiden jugar

1. ~~**Arreglar nombre del jugador** (Bug #1)~~ ✅ Resuelto — `sessionStorage`
2. ~~**Arreglar detección de salida** (Bug #2)~~ ✅ Resuelto — distancia euclídea
3. ~~**Arreglar stamina** (Bug #3)~~ ✅ Resuelto — bloque de recuperación corregido
4. ~~**Arreglar botón reintentar** (Bug #5)~~ ✅ Resuelto — `?level=` en el href

### Corto plazo — Features incompletas

5. ~~**Mecánica de escondite**~~ ✅ Resuelto — detección por radio + audio enter/exit
6. ~~**Condición de victoria Level 2**~~ ✅ Resuelto — mensajes de progreso + texto correcto + delay
7. ~~**Level 3 "Salas Abiertas"**~~ ✅ Resuelto — `ensureConnectivity()` con BFS garantiza laberinto siempre conectable
8. ~~**Título desbordado en index.html**~~ ✅ Resuelto — `max-width: min(680px, 92vw)` en `.container` + font-size reducido a `clamp(2rem, 7vw, 4.5rem)`
9. ~~**Carteles overlay aleatorios ("ESCUCHA", etc.)**~~ ✅ Eliminados — `HorrorEffects.updateMessages()` ya no llama a `showRandomMessage()`; el overlay solo muestra mensajes explícitos de juego
10. ~~**Recomendación de auriculares**~~ ✅ Implementado — modal `#headphonesModal` en `game.html` con z-index 600, aparece antes del `#startOverlay`
11. ~~**Flechas de pista hacia la salida**~~ ✅ Implementado — `addExitArrows()` en `Game.ts`, solo visibles con linterna (`MeshStandardMaterial`, sin emisión)

### Medio plazo — Rendimiento y calidad

12. ~~**Cachear texturas procedurales** (Bug #8)~~ ✅ Resuelto — `_textureCache` en `textures.ts`
13. ~~**Memory leak de audio** (Bug #4)~~ ✅ Resuelto — `onended` cleanup en todos los osciladores
14. **Batching de DOM en UIManager** — no modificar estilos individuales 60 veces por segundo; comparar con valor anterior y usar clases CSS
15. ~~**Corregir pointer lock en resize** (Bug #7)~~ ✅ Resuelto

### Largo plazo — Features nuevas

12. **Persistencia entre sesiones** — mejores tiempos, niveles desbloqueados en `localStorage`
13. **Soporte móvil completo** — los joysticks táctiles existen, pero Pointer Lock no funciona en iOS; necesita capa de abstracción de controles
14. **Sistema de logros** — tiempo de supervivencia, veces atrapado, baterías recogidas
15. **Nuevos niveles** — la arquitectura de `Game.ts` solo necesita ampliar `LevelType` y configurar enemigos/objetivo
16. **Efectos de partículas** — niebla volumétrica, rastro del Teleporter, sangre al morir

---

## Valoración del Proyecto

### Puntos fuertes

- **Motor de audio procedural sofisticado** — síntesis 3D posicional con música dinámica por capas y susurros con el nombre del jugador es una feature genuinamente creativa y original
- **Generación procedural de laberintos** — cada partida es diferente, el algoritmo Recursive Backtracking genera laberintos siempre conectados
- **Tres tipos de enemigo** con personalidades visuales y mecánicas distintas (Runner ciego y rápido, Stalker lento pero omnisciente, Teleporter impredecible)
- **Caras de enemigos generadas en Canvas** — detalladas y únicas por tipo, sin assets externos
- **Arquitectura TypeScript moderna** con clases bien separadas — fácil de extender
- **Zero assets externos** — texturas, audio y caras generadas por código; el juego es un solo bundle compilado sin dependencias de red en runtime

### Puntos débiles

- ~~**Bugs game-breaking**~~ — todos los bugs críticos están resueltos
- ~~**IA de enemigos demasiado simple**~~ — línea de visión, investigación y patrulla implementadas
- ~~**Carteles overlay molestos**~~ — mensajes aleatorios eliminados
- ~~**Sin orientación al jugador**~~ — flechas de pista en paredes (solo linterna) añadidas
- **Sin tests** — cero cobertura, imposible saber qué falla sin jugar manualmente
- **Batching DOM** — `UIManager` actualiza estilos inline 60 veces/s, podría optimizarse con clases

### ¿Tiene futuro?

**Sí.** El concepto (horror 3D + generación procedural + audio adaptativo + navegador = sin instalación) es sólido y diferenciado. La parte técnica más difícil ya funciona: motor de audio, laberintos, enemigos con personalidad visual, sistema de supervivencia, flechas de navegación.

**Estado actual:** todos los bugs conocidos están resueltos. El juego es completamente jugable en los 4 niveles, con modal de auriculares, flechas de pista y sin carteles que rompan la inmersión.

**Siguiente fase:** comportamientos únicos por tipo de enemigo (Mejora #6) + nuevos niveles.

---

## Controles

| Acción | Tecla |
|--------|-------|
| Moverse | W / A / S / D |
| Correr | SHIFT |
| Linterna | F |
| Esconderse / salir | CTRL (cerca de ataúd — toggle: un press entra, otro sale) |
| Mirar | Ratón |

---

## Compatibilidad

- Chrome 90+, Firefox 88+, Edge 90+
- WebGL requerido
- Pointer Lock API (no disponible en iOS Safari — sin soporte móvil real todavía)
- Web Audio API + Speech Synthesis API
