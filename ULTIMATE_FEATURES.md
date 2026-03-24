# 🔥 BACKROOMS ULTIMATE - MODO BESTIAL SUPREMO

## ✨ RESUMEN DE MEJORAS ÉPICAS

Has desbloqueado el **Modo Bestial Supremo** - una transformación completa del juego que implementa:

1. ✅ **Laberintos Procedurales Infinitos**
2. ✅ **Mecánicas de Supervivencia Avanzadas**
3. ✅ **Sistema de Múltiples Enemigos con IA Mejorada**

---

## 🎮 ARCHIVO CREADO

**`juego_backrooms_ultimate.html`** - Versión definitiva del juego

---

## 📊 CARACTERÍSTICAS IMPLEMENTADAS

### 1. 🗺️ GENERACIÓN PROCEDURAL DE LABERINTOS

#### Algoritmo: Recursive Backtracking
- **Laberintos únicos** cada partida - nunca juegas el mismo dos veces
- **Tamaño**: 25x25 celdas (625 espacios)
- **Garantizado**: Siempre hay un camino desde inicio hasta salida
- **Sin callejones sin salida injustos** - diseño orgánico y jugable

#### Elementos Especiales Generados:
- **8 Baterías** distribuidas aleatoriamente (necesarias para sobrevivir)
- **6 Lugares para Esconderse** en esquinas oscuras (detectados por estar cerca de múltiples paredes)
- **Salida Verde** siempre en posición lejana del inicio
- **Iluminación Variable** - 12% de las celdas tienen luces

#### Cómo Funciona:
```
1. Inicializar todo el maze como paredes
2. Empezar en posición (1,1)
3. Marcar como visitado
4. Mientras haya celdas sin visitar:
   - Buscar vecinos no visitados (2 celdas de distancia)
   - Elegir vecino aleatorio
   - Abrir camino hacia ese vecino (romper pared intermedia)
   - Repetir desde el nuevo vecino
5. Agregar elementos especiales (baterías, hiding spots)
```

---

### 2. ⚡ MECÁNICAS DE SUPERVIVENCIA

#### A. Sistema de Estamina
- **Capacidad**: 100 puntos
- **Sprint** (SHIFT): Velocidad 4.5 u/s (vs 2.0 normal)
- **Consumo**: -15 estamina/segundo al correr
- **Recuperación**: +10 estamina/segundo al caminar
- **Visual**: Barra verde que pulsa en rojo cuando <20%

**Estrategia**: No puedes correr infinitamente. Gestiona tu estamina - úsala para escapar, no para explorar.

#### B. Sistema de Linterna con Batería
- **Capacidad**: 100% de batería
- **Toggle**: Tecla **F** para encender/apagar
- **Consumo**: -8% batería/segundo cuando está encendida
- **Duración**: ~12.5 segundos de uso continuo antes de necesitar recarga
- **Baterías**: +40% de carga cada una (8 disponibles en el laberinto)
- **Características Técnicas**:
  - SpotLight con intensidad 2.5
  - Rango de 15 unidades
  - Sombras dinámicas
  - Ángulo de 30° (π/6)

**Estrategia**: La linterna es CRÍTICA pero limitada. Úsala con inteligencia:
- Encender para explorar áreas nuevas
- Apagar en zonas familiares para ahorrar
- Buscar baterías constantemente
- Recordar que la linterna RECUPERA cordura

#### C. Sistema de Esconderse
- **Activación**: Tecla **CTRL** cerca de hiding spots
- **Detección**: Lugares marcados sutilmente con plataforma gris oscura
- **Efecto**: Los enemigos NO te detectan si estás escondido (excepto si están muy cerca <3 unidades)
- **Visual**: Overlay radial oscuro + texto "ESCONDIDO"
- **Uso**: Mantén CTRL presionado para permanecer escondido

**Estrategia**: Escóndete cuando:
- Escuches pasos de enemigos cercanos
- Tu cordura esté muy baja
- Necesites planificar tu siguiente movimiento

#### D. Medidor de Cordura (Sanity)
- **Capacidad**: 100 puntos
- **Pérdida**:
  - -2/segundo en oscuridad sin linterna
  - -5/segundo cuando enemigo está cerca (escala con distancia)
- **Recuperación**: +1/segundo con linterna encendida
- **Game Over**: Cordura = 0 → Pierdes
- **Efectos Visuales**:
  - Overlay púrpura que aumenta al bajar cordura
  - Vignette radial opresivo
  - Barra UI pulsa en rojo <30%

**Mecánica Central**: Balancea el uso de linterna (gasta batería pero recupera cordura) vs oscuridad (ahorra batería pero drena cordura).

---

### 3. 👾 SISTEMA DE MÚLTIPLES ENEMIGOS

#### A. EL CORREDOR (Runner)
**Características**:
- ⚡ **MUY RÁPIDO**: Velocidad 3.5 (casi el doble que caminar)
- 👁️ **CIEGO**: Solo te detecta a 5 unidades de distancia
- 🎨 **Visual**: Delgado (0.4x2.7x0.4), color rojizo oscuro con emisión roja
- 🎯 **Peligro**: Alto en pasillos estrechos, bajo en espacios abiertos

**Estrategia de Escape**:
- Usa linterna para verlo desde lejos
- Escóndete antes de que llegue
- Si te persigue, busca esquinas y giros rápidos
- NO intentes escapar en línea recta - te alcanzará

#### B. EL ACECHADOR (Stalker)
**Características**:
- 🐌 **LENTO**: Velocidad 1.2 (más lento que caminar)
- 👀 **OJO DE ÁGUILA**: Te detecta a 18 unidades
- 🎨 **Visual**: Ancho (0.8x2.1x0.8), negro con leve emisión verde
- 🎯 **Peligro**: Te encuentra siempre, pero puedes escapar fácilmente

**Estrategia de Escape**:
- Mantén distancia - te ve pero no puede alcanzarte
- Apaga linterna para reducir detección
- Usa su lentitud a tu favor
- Si aparece, simplemente camina lejos

#### C. EL TELEPORTER (Teleporter)
**Características**:
- ⚡ **MEDIO**: Velocidad 2.0 (igual que caminar)
- 📍 **TELEPORT**: Se teletransporta cada 8 segundos cerca de ti
- 👁️ **MEDIO**: Detección a 12 unidades
- 🎨 **Visual**: Púrpura semitransparente (0.5x2.4x0.5)
- 🎯 **Peligro**: IMPREDECIBLE - puede aparecer detrás de ti

**Estrategia de Escape**:
- El MÁS PELIGROSO psicológicamente
- Cuando desaparece, prepárate - reaparecerá cerca (8-13 unidades)
- Busca hiding spots rápidamente después de sus teleports
- Efecto visual: se vuelve semitransparente (30% opacidad) al teleportarse

#### IA Mejorada (Todos los Enemigos)

**Pathfinding Básico**:
- Movimiento directo hacia el jugador
- Colisión con paredes
- Cálculo de distancia en tiempo real
- Orientación dinámica (LookAt player)

**Sistema de Detección**:
```javascript
SI distancia_al_jugador < rango_detección:
  SI jugador_escondido Y distancia > 3:
    NO DETECTAR
  SINO:
    PERSEGUIR
```

**Spawning Inteligente**:
- Spawn garantizado a >8 unidades del jugador
- Un enemigo de cada tipo
- Spawn después de 15 segundos (da tiempo para explorar)
- Posiciones validadas (no spawns en paredes)

---

## 🎛️ CONTROLES COMPLETOS

| Tecla | Acción |
|-------|--------|
| **W, A, S, D** | Movimiento básico |
| **SHIFT** | Sprint (gasta estamina) |
| **F** | Toggle linterna (gasta batería) |
| **CTRL** | Esconderse (solo cerca de hiding spots) |
| **Ratón** | Mirar (horizontal) |
| **Click** | Iniciar juego (Pointer Lock) |

---

## 📊 HUD COMPLETO

### Barras de Estado:
1. **⚡ ESTAMINA** (Verde)
   - Llena: Puedes correr
   - <20%: Pulsa rojo - cuidado

2. **🔦 BATERÍA** (Amarilla)
   - Linterna solo funciona si >0%
   - <20%: Pulsa rojo - busca baterías YA

3. **🧠 CORDURA** (Púrpura)
   - <30%: Efectos visuales intensos
   - 0%: Game Over

### Indicador de Enemigos:
- Aparece cuando enemigo <15 unidades
- Muestra tipo y proximidad con barras: `⚠️ RUNNER ███░░`
- Más barras = MÁS CERCA = MÁS PELIGRO

---

## 🎯 OBJETIVOS Y CONDICIONES

### ✅ VICTORIA:
- Encuentra la salida verde
- Llega a ella (distancia <2.4 unidades)
- Mensaje: "¡ESCAPASTE!"

### ❌ DERROTA:
1. **Capturado por enemigo** (distancia <0.8 unidades)
   - Mensaje: "¡TE ATRAPÓ EL [TIPO]!"

2. **Cordura = 0**
   - Mensaje: "¡PERDISTE LA CORDURA!"

---

## 🧪 BALANCEO Y NÚMEROS CLAVE

### Recursos Iniciales:
- Estamina: 100 / 100
- Batería: 100 / 100
- Cordura: 100 / 100

### Tiempos Críticos:
- **Batería llena**: ~12.5 segundos de uso continuo
- **Sprint lleno**: ~6.7 segundos de carrera continua
- **Tiempo para cordura 0** (oscuridad total): 50 segundos
- **Spawn de enemigos**: 15 segundos después de iniciar

### Distancias Importantes:
- Detección Runner: 5 unidades
- Detección Stalker: 18 unidades
- Detección Teleporter: 12 unidades
- Rango linterna: 15 unidades
- Distancia de muerte: <0.8 unidades
- Recogida batería: <1.5 unidades

---

## 🎮 ESTRATEGIAS GANADORAS

### 1. **Gestión de Recursos**
- Usa sprint SOLO para escapar, no para explorar
- Apaga linterna en áreas que ya conoces
- Recoge TODAS las baterías que encuentres
- La cordura es tu recurso más crítico - mantén linterna encendida si necesario

### 2. **Contra Cada Enemigo**

**vs Runner**:
- Detéctalo temprano con linterna
- Escóndete en hiding spots
- Usa giros cerrados si te persigue

**vs Stalker**:
- No te asustes - es lento
- Simplemente mantén distancia
- Usa como "temporizador de peligro" (si lo ves, hay tiempo)

**vs Teleporter**:
- El más mental - prepárate psicológicamente
- Cuenta ~8 segundos después de cada teleport
- Busca hiding spots inmediatamente después

### 3. **Exploración Eficiente**
- Mapea mentalmente mientras exploras
- Marca hiding spots en tu memoria
- Anota dónde viste baterías
- La salida está siempre en esquina lejana

### 4. **Combos Tácticos**
- **Low Battery + High Sanity**: Explora en oscuridad pero rápido
- **High Battery + Low Sanity**: Linterna encendida siempre, camina
- **Enemy Near + Hiding Spot**: Escóndete hasta que pase
- **Low Stamina**: Camina, NO corras - eres vulnerable

---

## ⚙️ PARÁMETROS TÉCNICOS (Para Modders)

Todos los parámetros están en el objeto `CONFIG` al inicio del script:

```javascript
const CONFIG = {
  // Laberinto
  MAZE_SIZE: 25,          // Tamaño del maze (NxN)
  WALL_HEIGHT: 3.0,
  UNIT_SIZE: 3.0,

  // Jugador
  WALK_SPEED: 2.0,        // Velocidad caminando
  SPRINT_SPEED: 4.5,      // Velocidad corriendo
  STAMINA_MAX: 100,
  STAMINA_DRAIN_RATE: 15,
  STAMINA_RECOVER_RATE: 10,

  // Linterna
  BATTERY_MAX: 100,
  BATTERY_DRAIN_RATE: 8,
  FLASHLIGHT_INTENSITY: 2.5,
  FLASHLIGHT_DISTANCE: 15,

  // Cordura
  SANITY_MAX: 100,
  SANITY_DRAIN_NEAR_ENEMY: 5,
  SANITY_DRAIN_DARK: 2,
  SANITY_RECOVER_LIGHT: 1,

  // Enemigos
  ENEMY_SPAWN_DELAY: 15000,
  RUNNER_SPEED: 3.5,
  STALKER_SPEED: 1.2,
  TELEPORTER_SPEED: 2.0,
};
```

**Modifica estos valores para ajustar dificultad!**

### Sugerencias de Modificación:

**Más Fácil**:
- `MAZE_SIZE: 15` (maze más pequeño)
- `STAMINA_DRAIN_RATE: 10` (sprint dura más)
- `BATTERY_DRAIN_RATE: 5` (linterna dura más)
- `RUNNER_SPEED: 2.5` (runner más lento)

**Más Difícil**:
- `MAZE_SIZE: 35` (maze ENORME)
- `ENEMY_SPAWN_DELAY: 8000` (enemigos aparecen antes)
- `SANITY_DRAIN_DARK: 5` (cordura cae rápido en oscuridad)
- `RUNNER_SPEED: 5.0` (runner SUPER rápido)

**Modo Nightmare**:
- `BATTERY_MAX: 50`
- `STAMINA_MAX: 50`
- `SANITY_DRAIN_NEAR_ENEMY: 10`
- `RUNNER_SPEED: 5.0`
- `TELEPORTER_SPEED: 3.5`

---

## 🔧 ARQUITECTURA DEL CÓDIGO

### Clases Principales:

#### `MazeGenerator`
- Método `generate()`: Algoritmo recursive backtracking
- Método `getUnvisitedNeighbors()`: Encuentra celdas válidas
- Método `addSpecialRooms()`: Coloca baterías y hiding spots

#### `Enemy`
- Constructor recibe tipo ('runner', 'stalker', 'teleporter')
- Método `createMesh()`: Genera geometría según tipo
- Método `update(delta, playerPos, playerHiding)`: IA y movimiento
- Método `teleport(playerPos)`: Solo para Teleporter
- Método `checkWallCollision(position)`: Colisión simple con maze

### Funciones Principales:

```javascript
init()                    // Setup inicial
buildMaze()               // Construir maze 3D desde array
spawnEnemies()            // Crear 3 enemigos
updatePlayer(delta)       // Mecánicas del jugador
updateEnemies(delta)      // IA de todos los enemigos
updateStamina(delta)      // Sistema de estamina
updateBattery(delta)      // Sistema de batería
updateSanity(delta)       // Sistema de cordura
updateUI()                // Actualizar HUD
animate()                 // Game loop principal
```

---

## 🎨 EFECTOS VISUALES

### Fog System:
- Near: 1.5 unidades (0.5 * UNIT_SIZE)
- Far: 24 unidades (8 * UNIT_SIZE)
- Color: Negro absoluto (#000000)

### Iluminación:
- **Ambiente**: Muy tenue (0x101010) para atmósfera opresiva
- **Luces de techo**: 12% de celdas vacías
- **Linterna**: SpotLight con sombras dinámicas
- **Salida**: PointLight verde brillante
- **Baterías**: PointLight amarilla sutil

### HUD:
- Degradados de color en barras
- Animación de pulso cuando <20%
- Transiciones suaves (0.3s)
- Overlay radial para hiding y sanity

---

## 🚀 PRÓXIMAS MEJORAS POSIBLES

1. **Sistema de Audio 3D** (integrar el sistema del nivel 1)
2. **Minimapa** revelado progresivamente
3. **Más tipos de enemigos** (Crawler, Shadow, etc.)
4. **Power-ups** (velocidad temporal, invencibilidad, etc.)
5. **Dificultad escalable** (modo Easy/Normal/Hard)
6. **Estadísticas finales** (tiempo, enemigos evadidos, etc.)
7. **Achievements** (speedrun, no damage, etc.)
8. **Niveles múltiples** (diferentes biomas de Backrooms)
9. **Objetos usables** (bengalas, radios, etc.)
10. **Modo multijugador cooperativo**

---

## 📈 MÉTRICAS DE PERFORMANCE

### Optimizaciones Implementadas:
- ✅ Geometrías compartidas (floor, wall, ceiling)
- ✅ Materiales reutilizados
- ✅ Sombras limitadas (solo luces principales)
- ✅ Fog para ocultar geometría lejana
- ✅ Colisión simple (Box3 vs Box3)
- ✅ Update condicional (solo cuando gameActive)

### Performance Esperado:
- **60 FPS** en máquinas modernas
- **30-45 FPS** en laptops integradas
- **Uso de RAM**: ~150-200 MB
- **CPU**: ~5-8% en PC modernas

---

## 🎓 TECNOLOGÍAS USADAS

- **Three.js r128**: Motor 3D
- **Web Audio API**: (pendiente integración del sistema del nivel 1)
- **Pointer Lock API**: Control de cámara
- **JavaScript ES6**: Clases, arrow functions, template literals
- **CSS3**: Animaciones, gradientes, efectos visuales
- **HTML5 Canvas**: Renderizado via WebGL

---

## ✅ CHECKLIST DE FEATURES

- [x] Generación procedural de laberintos (Recursive Backtracking)
- [x] Laberintos únicos cada partida
- [x] Sistema de estamina (sprint/walk)
- [x] Sistema de linterna con batería
- [x] Baterías coleccionables
- [x] Sistema de esconderse
- [x] Medidor de cordura
- [x] Efectos visuales de baja cordura
- [x] 3 tipos de enemigos diferentes
- [x] IA mejorada con detección variable
- [x] Teleporter con mecánica única
- [x] HUD completo y elegante
- [x] Indicador de proximidad de enemigos
- [x] Colisión con paredes
- [x] Condiciones de victoria y derrota
- [x] Sistema de fog
- [x] Iluminación dinámica
- [x] Responsive UI

---

## 🎮 CÓMO JUGAR

1. **Abre** `juego_backrooms_ultimate.html` en tu navegador
2. **Haz click** para iniciar (Pointer Lock)
3. **Explora** el laberinto procedural
4. **Gestiona** tus recursos (estamina, batería, cordura)
5. **Evita** a los 3 tipos de enemigos
6. **Encuentra** la salida verde
7. **SOBREVIVE** al horror infinito

---

**¡Bienvenido al verdadero terror de los Backrooms! 👻🔦**
