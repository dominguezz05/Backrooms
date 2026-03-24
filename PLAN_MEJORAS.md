# Plan de Mejoras - Pesadilla en los Backrooms

## 1. Menú/UI ✅ COMPLETADO

| Mejora | Descripción | Estado |
|--------|-------------|--------|
| Pantalla de pausa | Tecla P → opciones de volumen, sensibilidad, reanudar o salir | ✅ Implementado |
| Historial de puntuaciones | LocalStorage con top 10 scores por nivel (5 niveles) | ✅ Implementado |
| Logros | Desbloqueables (10 logros) | ✅ Implementado |
| Pantalla de muerte mejorada | Estadísticas + indicador de récord | ✅ Implementado |
| Index reestructurado | Modal de niveles, portada mejorada, cara del malo | ✅ Implementado |
| Opciones de volumen | Música, SFX con control en tiempo real | ✅ Implementado |
| Nombre del jugador | Se dice al entrar, usado por enemigos | ✅ Implementado |
| Sensibilidad del ratón | Ajustable en opciones, aplicada en gameplay | ✅ Implementado |
| CSS externalizado | Estilos extraídos a archivos en public/styles/ | ✅ Implementado |
| Cara del malo 45° | Figura diagonal con mano sorpresa | ✅ Implementado |
| Relámpagos con trueno | Efectos visuales + audio procedural | ✅ Implementado |
| Modal auriculares | Movido al index (antes del nombre) | ✅ Implementado |
| Pantalla de carga | Barra de progreso animada por etapas | ✅ Implementado |

## 2. Gameplay

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Power-ups | Velocidad, Invisibilidad, Stun, Cordura | ✅ Completado |
| Notas/historia | Notas创伤adas con texto sobre los Backrooms | ✅ Ya existe |
| Telarañas | Obstáculos que reducen velocidad 30% | ❌ Eliminado |
| Puertas dinámicas | Se cierran aleatoriamente creando presión | ✅ Completado |
| Sistema de checkpoints | Guardar progreso en niveles largos | Media |
| Inventario rápido | Acceso rápido a objetos collected | Baja |

## 3. Audio

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Música adaptativa 2.0 | Más capas: exploración, tensión, peligro, calma | Alta |
| Radio/estática | Intensidad aumenta cerca de la salida | Media |
| Nuevos sonidos | Crujidos, susurros, pasos lejanos | ✅ Parcialmente implementado |
| Sonidos de UI | Click, hover en botones del menú | ✅ Completado |
| Audio 3D mejorado | Mejor posicionamiento de sonidos | Media |

## 4. Contenido

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Modo Endless | Supervivencia infinita, dificultad progresiva | Alta |
| Daily Challenge | Semilla diaria igual para todos, leaderboard | Baja |
| Más niveles | Nivel 3, 4 con layouts únicos | ✅ Ya existe (5 niveles) |

## 5. Progresión

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Sistema de desbloqueo progresivo | Niveles se desbloquean al completar el anterior. Pesadilla se desbloquea al completar en Normal | Media |
| Indicadores visuales | Candados 🔒 en niveles/dificultades bloqueadas | Baja |

### Lógica de Desbloqueo

- **Nivel 1**: Siempre desbloqueado
- **Nivel 2**: Completar Nivel 1
- **Nivel 3**: Completar Nivel 2
- **Nivel 4**: Completar Nivel 3
- **Ultimate**: Completar Nivel 4
- **Pesadilla**: Completar cualquier nivel en Normal

### Datos en LocalStorage

```json
{
  "progress": {
    "unlockedLevels": [1],
    "unlockedDifficulty": ["easy", "normal"],
    "completedLevels": []
  }
}
```

---

## 6. Audio Menú/Index

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Viento mejorado | Ruido de viento más intenso con relámpagos | ✅ Implementado |
| Música ambiente menú | Drone base + tensión gradual | ✅ Implementado |
| Efecto glitch título | Glitches ocasionales en "PESADILLA EN LOS BACKROOMS" | ✅ Implementado |
| Suspiro distante | Sonido atmosférico de alguien suspirando | ✅ Implementado |
| Clock tick | Sonido de reloj marcando el tiempo | ✅ Implementado |

## 7. Experiencia de Usuario

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Tutorial/Hints | Instrucciones contextuales al inicio de cada nivel | ✅ Implementado |
| ~~Screen shake mejorado~~ | ~~Efecto de temblor al estar cerca de enemigos~~ | ✅ Implementado |
| Trail del jugador | Línea sutil de por dónde has pasado | ❌ Eliminado |
| Partículas de polvo | Pequeñas partículas flotando en el aire | ✅ Implementado |
| Indicador de dirección | Flecha hacia la salida cuando no la ves | ✅ Implementado |
| Vibration móvil | Feedback háptico en dispositivos móviles | Baja |
| Transiciones suaves | Fade entre pantallas (menú→juego→muerte) | ✅ Completado |
| Transiciones suaves menú | Fade entre modales del menú | ✅ Completado |

## 8. Efectos Visuales

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Partículas flotantes | Polvo/flocos en el fondo del menú | ✅ Implementado |
| Niebla dinámica | Niebla que se mueve lentamente | ✅ Implementado |
| Escuchas | Manos en las paredes como decoración | Baja |
| Cuadros de miedo | Pinturas perturbadoras en las paredes del laberinto | ✅ Implementado |

## 9. Gameplay Avanzado

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Logro oculto | Solo aparecen al descubrirlos | Baja |
| Tiempo limitado | Modo contrarreloj opcional | Media |
| Desafíos diarios | Semilla diaria igual para todos | Baja |
| Bonus de tiempo | Tiempo restante = puntos extra | Media |

---

## Orden Recomendado

1. ~~**Pantalla de pausa**~~ - ✅ COMPLETADO
2. ~~**Power-ups**~~ - ✅ COMPLETADO
3. ~~**Jumpscares mejorados + mini-sustos ambientales**~~ - ✅ COMPLETADO
4. **Sistema de desbloqueo progresivo** - Progresión del jugador ← SIGUIENTE
5. **Tutorial/Hints** - Ayudar a nuevos jugadores
6. **Música adaptativa mejorada** - Más atmósfera
7. **Modo Endless** - Supervivencia infinita
8. **Indicador de dirección** - Facilitar navegación
9. **Cuadros de miedo** - Pinturas perturbadoras interactivas
10. **Puertas dinámicas** - Presión adicional
11. ~~**CSS externalizado**~~ - ✅ COMPLETADO
12. ~~**Cara del malo 45° + mano**~~ - ✅ COMPLETADO
13. ~~**Relámpagos + trueno procedural**~~ - ✅ COMPLETADO
14. ~~**Modal auriculares en index**~~ - ✅ COMPLETADO
15. ~~**Loading screen mejorado**~~ - ✅ COMPLETADO
16. ~~**Power-ups en minimapa**~~ - ✅ COMPLETADO
17. ~~**Screen shake de cámara**~~ - ✅ COMPLETADO
18. ~~**Transiciones suaves**~~ - ✅ COMPLETADO
19. ~~**Trail del jugador**~~ - ✅ COMPLETADO

---

---

## Jumpscares + Mini-sustos Ambientales - ✅ COMPLETADO

### Jumpscares mejorados

| Mejora | Implementación |
|--------|---------------|
| Pre-flash rojo | `triggerScreenFlash('#ff0000', 60ms)` inmediato al morir |
| Camera shake violento | `SceneManager.startCameraShake(0.22, 0.55s)` antes de la cara |
| Cara con delay | La cara aparece 220ms después del sonido/flash (más impacto) |
| Body shake CSS | Animación `jumpscareShake 0.6s` en `document.body` |

### Mini-sustos ambientales (cada 30-60 s)

| Tipo | Descripción | Condición |
|------|-------------|-----------|
| **Figura fantasma** | Silueta azul semitransparente a 10-22 u. del jugador. Desaparece al acercarse 4.5 u. o tras ~12 s | Solo si enemigo >9 u. |
| **Luz que falla** | Bombilla cercana apaga/enciende 3 veces con zumbido eléctrico fuerte | Solo si enemigo >9 u. |
| **Golpe fuerte** | Bang (gain 0.9) + camera shake (0.45s) + flash pantalla + pasos falsos 0.6s después | Solo si enemigo >9 u. |

### Archivos modificados

- `src/core/SceneManager.ts` — sistema de camera shake (`startCameraShake`, `updateShake`, offset en `render`)
- `src/systems/AudioManager.ts` — `playLoudBang()`, `playLightBuzz()`, volumen `playFootstepsBehind` x2.75
- `src/systems/HorrorEffects.ts` — `spawnGhostFigure()`, `updateGhosts()`
- `src/Game.ts` — `triggerAmbientScare()`, `triggerGhostScare()`, `triggerLightScare()`, `triggerBangScare()`, jumpscare mejorado
- `game.html` — `triggerScreenFlash()`, `#screenFlash` div

---

## Logros Implementados

1. **Primera Muerte** - Muere por primera vez
2. **Primer Escape** - Escapa de un nivel
3. **Speedrunner** - Completa el Nivel 1 en menos de 2 minutos
4. **Coleccionista** - Recoge 500 monedas totales
5. **Superviviente** - Sobrevive 5 minutos en Ultimate
6. **Curioso** - Lee 10 notas
7. **Tímido** - Escondete 50 veces
8. **Coleccionista de Baterías** - Recoge 100 baterías totales
9. **A oscuras** - Completa el Nivel 4 sin usar la linterna
10. **Afortunado** - Escapa de un enemigo 10 veces

---

## Power-ups - ✅ COMPLETADO

### Tipos de Power-ups Implementados

| Tipo | Icono | Efecto | Duración |
|------|-------|--------|----------|
| Velocidad | ⚡ | +50% velocidad de movimiento | 10s |
| Invisibilidad | 👻 | Enemigos no te detectan | 8s |
| Stun | ⚡💥 | Enemigos paralizados | 3s |
| Batería | 🔋 | Recarga linterna al 100% | Instantáneo |
| Cordura | 🧠 | +50 cordura | Instantáneo |

### Características

- ✅ CellTypes en `types.ts`
- ✅ Generación aleatoria en maze (5-8 por nivel)
- ✅ Detección de colisión en `Game.ts`
- ✅ Efectos en `Player.ts` y `Enemy.ts`
- ✅ UI: icono y timer en HUD
- ✅ Sonido de pickup característico
- ✅ Visibles en minimapa (diamantes de colores)
