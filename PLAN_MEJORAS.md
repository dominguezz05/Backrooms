# Plan de Mejoras - Pesadilla en los Backrooms

## ✅ COMPLETADO

### Optimizaciones de Rendimiento

- [x] **InstancedMesh para floors/ceilings/walls** - Reducción de ~1800 meshes a ~3 instanced meshes
- [x] **Texturas optimizadas** - Canvas operations reducidas de 3000 a ~400 por textura
- [x] **buildMaze() asíncrono con chunks** - Usa `yieldToMain()` para no bloquear el thread
- [x] **Input deshabilitado durante carga** - Evita acumulación de eventos de teclado
- [x] **Throttling de UI** - Updates cada 100ms (era cada frame)
- [x] **Visibility checks throttled** - Distancia a objetos cada 200ms
- [x] **Vector recycling en Player** - 5 vectores pre-asignados reutilizados
- [x] **Footprint materials compartidos** - 1 geometry + 1 material para todos los footprints
- [x] **AudioManager optimizado** - Eliminados distortion/filter innecesarios
- [x] **HorrorEffects throttled** - Luces y FOV actualizan cada 50-100ms
- [x] **Cooldown en sonidos de linterna** - 300ms entre sonidos

### Bugs Arreglados

- [x] **Rendijas corregidas** - Ahora consume el flag `interact` después de usarla
- [x] **Puertas dinámicas eliminadas** - Causaban lag, no convencían

### Audio/Visual Completado

- [x] **Pantalla de pausa** - Tecla P → opciones de volumen, sensibilidad
- [x] **Historial de puntuaciones** - LocalStorage con top 10 scores
- [x] **Logros** - 10 logros desbloqueables
- [x] **Pantalla de muerte mejorada** - Estadísticas + indicador de récord
- [x] **Audio 3D** - Sonidos posicionados espacialmente
- [x] **Música adaptativa** - Capas: exploración, tensión, peligro
- [x] **Sonidos de UI** - Click, hover en botones
- [x] **Partículas de polvo** - Pequeñas partículas flotando
- [x] **Indicador de dirección** - Flecha hacia la salida
- [x] **Transiciones suaves** - Fade entre pantallas

---

## 🎮 PENDIENTE - Bugs

- [ ] **Audio Safari** - Web Audio API puede dar problemas en Safari
- [ ] **Pointer Lock mobile** - No funciona bien en dispositivos táctiles

---

## 🆕 PENDIENTE - Gameplay

| Mejora                     | Descripción                                     | Prioridad |
| -------------------------- | ----------------------------------------------- | --------- |
| **Sonido de batería baja** | Beep cuando queda <20%                          | Alta      |
| **Hint para rendijas**     | "Algo brilla en la pared..." cuando estás cerca | Alta      |
| **Checkpoint system**      | Guardar posición si mueres mucho                | Media     |
| **Teléfono que suena**     | Escucha el teléfono, contesta para susto        | Media     |
| **Radio con estática**     | Encuentra la radio, súbele el volumen           | Media     |
| **Inventario rápido**      | Acceso rápido a objetos collected               | Baja      |

---

## 🎃 PENDIENTE - Horror

| Mejora                    | Descripción                                    | Prioridad |
| ------------------------- | ---------------------------------------------- | --------- |
| **Mensajes que cambian**  | Texto en paredes que cambia mientras los miras | Alta      |
| **Rastro de sangre**      | Huellas que no son tuyas                       | Media     |
| **Sonidos de lejos**      | Pasos detrás de ti cuando no hay nadie         | Media     |
| **Sombras que se mueven** | En el rabillo del ojo                          | Media     |

REVISAR A LA CHICA FANTASAME QUE NO FUNCIONA

---

## ⚡ PENDIENTE - Optimizaciones

| Mejora                        | Descripción                        | Prioridad |
| ----------------------------- | ---------------------------------- | --------- |
| **LOD (Level of Detail)**     | Objetos lejanos con menos detalle  | Media     |
| **Deshabilitar sombras**      | Opción para mejorar FPS            | Media     |
| **Web Workers**               | Para generación de maze            | Baja      |
| **Texture Atlas**             | Reducir llamadas de textura        | Baja      |
| **AudioBuffer pre-generados** | En lugar de oscillators en runtime | Baja      |

---

## 🎨 PENDIENTE - UI/UX

| Mejora | Descripción | Prioridad |
| ------ | ----------- | --------- |

| **Configuración gráfica** | Calidad baja/media/alta | Media |
| **Menú de pausa mejorado** | Más opciones | Media |
| **Feedback táctil** | Vibración en móvil al interactuar | Baja |
| **Ajustes de accesibilidad** | Tamaño de texto, daltonismo | Baja |

---

## 🗺️ PENDIENTE - Contenido

| Mejora                        | Descripción                       | Prioridad |
| ----------------------------- | --------------------------------- | --------- |
| **Más niveles**               | Level 5, 6, etc.                  | Media     |
| **Variedad de texturas**      | Diferentes estilos de backrooms   | Media     |
| **Enemigos únicos por nivel** | Nuevos tipos de monsters          | Baja      |
| **Collectibles especiales**   | Llaves, mapas, notas del escritor | Baja      |

---

## 📱 PENDIENTE - Mobile

| Mejora                         | Descripción                 | Prioridad |
| ------------------------------ | --------------------------- | --------- |
| **Touch controls optimizados** | Joysticks virtuales mejores | Alta      |
| **Botón de linterna grande**   | Más fácil de presionar      | Media     |
| **HUD adaptable**              | Se ajusta a orientación     | Baja      |

---

## 🔧 PENDIENTE - Technical Debt

| Mejora                     | Descripción              | Prioridad |
| -------------------------- | ------------------------ | --------- |
| **Refactorizar Enemy.ts**  | Simplificar lógica de IA | Media     |
| **Tests unitarios**        | Cubrir lógica core       | Baja      |
| **TypeScript strict mode** | Mejorar tipado           | Baja      |

---
