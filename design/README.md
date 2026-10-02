# Muninn Logs — Design System

Un cuaderno de campo, no un dashboard. La app es el diario donde un grupo anota sus expediciones a Arnak: papel gastado, títulos pintados con pincel seco y datos que se leen como en un libro.

Esta es la **versión 3** de la dirección visual ("cuaderno de campo"). Reemplaza a la v2 ("diario de expedición", con bandas hechas con un filtro SVG de desplazamiento) y a la v1 (estilo Excalidraw/hachurado). Si en el código o en documentos viejos aparece `feDisplacementMap`, `feTurbulence` para las bandas, `paint-bg`/`paint-fg`, un header negro de borde a borde, hachurado o sombras duras offset: es de una versión anterior y ya no aplica.

## La idea en una frase

Todo lo que es **acento** (títulos, la sección actual, barras de datos) es una **pincelada de tinta**; lo que se toca (botones, opciones elegidas) se dibuja con **pluma**: una caja a mano alzada, un círculo alrededor de lo elegido; todo lo que es **superficie** es **papel** dentro de un **cuaderno**. Nada de rectángulos con borde y esquinas redondeadas como contenedores.

## El cuaderno: la estructura de cada pantalla

### Escritorio (≥ 1200 px): cuaderno abierto

Capas, de atrás hacia adelante:

1. **Fondo** — un papel de mapa topográfico, ocre, con viñeta fuerte (`paper/backdrop.webp`, `background-size: cover`). Color de respaldo: `backdrop`.
2. **Tapa** — un rectángulo de cuero oscuro (`cover`, `radius-cover`, `shadow-cover`) un poco más grande que las dos páginas.
3. **Separador** — una hoja suelta (`paper/page-insert.webp`) metida debajo de la página izquierda, girada −1,2°, que asoma por la izquierda. Lleva, de arriba a abajo: la identidad ("Diario de / Ezequiel / N expediciones registradas"), la navegación (Inicio, Partidas, Estadísticas, Amigos), el botón **Cargar partida**, una rosa de los vientos al 16 % de opacidad y los links Privacidad · Términos.
4. **Grosor de páginas** — dos copias de cada página corridas 3 y 6 px, con `filter: brightness(0.84)` y `brightness(0.68)`.
5. **Dos páginas** — izquierda (`paper/page-left.webp`) y derecha (`paper/page-right.webp`), 462 × 908 px cada una, separadas 24 px. Cada pantalla reparte su contenido en estas dos páginas (ver "Pantallas").
6. **Anillos** — 9 anillos de bronce que cruzan el lomo, con perforaciones en ambas páginas. Son SVG inline (ver `components/NotebookShell`).

### Celular (< 1200 px): libreta de campo

1. **Fondo** — el mismo mapa; solo se ve en los márgenes.
2. **Tapa** — una franja de cuero que asoma arriba, detrás de los anillos.
3. **Una sola página** (`paper/page-mobile.webp`, estirada al alto del contenido) con 10 px de margen a los lados y el mismo grosor de páginas.
4. **Anillos arriba** — 8 espirales sobre el borde superior: la libreta se encuaderna por arriba, como un anotador. La página scrollea junto con el contenido.
5. **Barra inferior = el separador** — una tira del papel del separador (`paper/tabbar.webp`, borde superior rasgado) con 5 posiciones: Inicio, Partidas, **Cargar** (círculo de tinta elevado, la acción principal en la mesa), Estadísticas, Amigos.
6. En **Cargar partida** la barra inferior se reemplaza por una barra de guardado (resumen + botón Guardar partida), para que la carga sea a pantalla completa.

El contenido de las dos páginas de escritorio se apila en una sola página en celular (izquierda arriba, derecha abajo), salvo que la pantalla diga otro orden.

## Las pinceladas (la firma del sistema)

Cada acento es un `div` con `background-color` y una **máscara PNG** de pincel seco (`mask-image` + `mask-size: 100% 100%`). La máscara define la forma (cerdas, bordes que se deshacen, vetas más claras, halo); el color sale del `background`. Por eso la misma máscara sirve en tinta para un título y en el color de un líder para una barra.

```css
.ink { position: absolute; -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
       -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; pointer-events: none; }
.ink--band1 { -webkit-mask-image: url(/brush/brush-band-1.png); mask-image: url(/brush/brush-band-1.png); }
```

```html
<div class="band">                      <!-- position: relative; height: 50px; centrado -->
  <div class="ink ink--band1" style="inset: -12px -26px; background: var(--ink)"></div>
  <h2 class="band__text">Win Rate</h2>  <!-- position: relative; z-index: 2 -->
</div>
```

| Máscara | Proporción | Uso | Capa de tinta |
| --- | --- | --- | --- |
| `brush-band-1.png`, `brush-band-2.png` | 6,5 : 1, ambos extremos secos | Títulos de sección | `inset: -12px -26px` (escritorio), `-11px -18px` (celular) |
| `brush-sweep-in.png` | 8 : 1, cuerpo sólido y cola larga | Ítem activo de la navegación del separador | `left: 12px; right: 34px; top/bottom: -12px` |
| `brush-tab.png` | 1,4 : 1, compacta | Pestaña activa de la barra inferior | `inset: 2px -2px` (pestaña), `-3px -6px` (selector) |
| `ink-blot.png` | círculo | Botón **Cargar** de la barra inferior | `inset: -4px` sobre un círculo de 62 px |
| `brush-bar-1…4.png` | 20 : 1, cola seca corta (~7 %) | Barras de valor | `inset: -6px 0` sobre una barra de 18 px (15 px en celular) |

Reglas:

- **Seleccionado = marcado a mano.** La sección actual (navegación, pestaña) se pinta con una pincelada y el texto pasa a `band-text`. Una opción elegida (selector, chip) se encierra en un círculo de pluma (`public/pen/pen-circle.svg`) y el texto queda en tinta, en 600. No hay otro estilo de "activo".
- **Las barras alternan** las 4 variantes (`i % 4`) para que no se vean idénticas. El ancho del contenedor es el valor; la cola seca es corta para no exagerar el dato. Un valor 0 no lleva barra: lleva una línea `hairline` al 18 %.
- **Variedad en los títulos:** alternar `band-1` y `band-2`, y espejar con `transform: scaleX(-1)` en la capa de tinta (nunca en el texto).
- **El texto va siempre encima de la tinta** (`z-index: 2`), sobre la parte sólida del trazo. No hay texto encima de la cola seca.
- **Nunca `border-radius`, `box-shadow` ni `filter` sobre la capa de tinta.** La forma sale solo de la máscara.
- Las máscaras se generan con `scripts/gen.py` (y `mobile_assets.py` para la de pestaña y la mancha). Si hace falta otra proporción, se genera una máscara nueva: no se estira una existente más de ~1,5× fuera de su proporción.

## El papel

Las hojas son imágenes WebP con alfa: bordes rasgados, manchas, fibras, bordes envejecidos y sombra hacia el lomo ya vienen pintados. Se aplican como `background-image` con `background-size: 100% 100%` y `filter: drop-shadow(...)` (no `box-shadow`, que no sigue el borde rasgado). Se generan con `scripts/paper.py` y `scripts/backdrop.py`.

| Archivo | Uso |
| --- | --- |
| `page-left.webp`, `page-right.webp` | Páginas de escritorio (lomo a la derecha / izquierda) |
| `page-insert.webp` | Separador de escritorio |
| `page-mobile.webp` | Página de celular (encuadernada arriba) |
| `tabbar.webp` | Barra inferior de celular |
| `backdrop.webp` | Fondo de mapa detrás del cuaderno |

El color plano de referencia de cada papel está en los tokens (`paper`, `paper-insert`), para placeholders y para cuando una imagen no cargó.

## Color

Un solo tema, **Cuaderno**. No hay tema oscuro todavía (ver Preguntas abiertas).

- `backdrop`, `cover` — el fondo de mapa y la tapa de cuero. Solo detrás del papel, nunca debajo de texto.
- `paper`, `paper-insert`, `surface-pop` — las hojas y los menús desplegables.
- `ink` — la tinta de las pinceladas. `band-text` es el texto sobre tinta.
- `ink-body`, `ink-muted` — texto de lectura y secundario sobre papel.
- `bronze` (+ `bronze-light`) — herrajes: anillos, marco de retratos, aro de win rate, el punto de "mejor valor".
- `gold` — la corona del ganador.
- `hairline` — separadores, siempre al 12–18 % de opacidad.
- `chart-1…8` — un color por líder de Arnak (también colorea las categorías de puntaje). Un líder siempre tiene el mismo color en toda la app.
- `player-you`, `player-2…4` — colores para distinguir jugadores en la comparativa.

## Tipografía

- **Display — Cinzel** (600/700): todo texto sobre una pincelada (mayúsculas, `letter-spacing: 0.14em`), el nombre del diario, los botones y las etiquetas chicas de turno.
- **Body — Spectral** (400–700, itálica): todo lo demás, incluidos los números. Las aclaraciones y textos de ayuda van en itálica `ink-muted`.

Nunca Cinzel para un número de dato, ni Spectral en mayúsculas dentro de una pincelada.

## Contenido y voz

- Español rioplatense, de vos: "Elegí hasta 4 amigos", "Pedile a tu amigo…", "Saliste 2.º de 4".
- Números con coma decimal y espacio antes del porcentaje: `64,8`, `32 %` (lo que da `Intl.NumberFormat('es-AR')`).
- Fechas cortas: `29 sept 2026`. Las partidas se agrupan por mes con el mes como título ("Septiembre 2026").
- Nada de emoji: el ganador lleva la corona (`gold`), los líderes llevan su retrato chico (20 px, marco `bronze`).

## Formularios

Se escribe sobre la línea, como en un cuaderno: los campos no son cajas, son una línea inferior (`1.5px`, `ink-body` al 45 %) que pasa a `bronze` con el foco. Etiqueta en Spectral 600, ayuda en itálica debajo. Los selectores de pocas opciones (lado del tablero, orden de turnos) y los chips (amigos a comparar) encierran la opción elegida en un círculo de pluma. Los desplegables y buscadores abren un panel `surface-pop` con `shadow-pop`. Ver `components/FormFields`.

## Iconografía

Íconos de trazo propios, inline, `currentColor`, trazo 1,4–1,6 px: libro abierto (Inicio), hoja con renglones (Partidas), barras (Estadísticas), dos personas (Amigos), silueta punteada (invitado sin cuenta), más, flechas de turno, cerrar, calendario, lupa. El rombo con centro relleno marca los ítems de la navegación del separador. Nada de sets de íconos de terceros ni emoji.

## Pantallas

Reparto de contenido en el cuaderno abierto (izquierda | derecha). En celular se apila en ese orden.

| Pantalla | Página izquierda | Página derecha |
| --- | --- | --- |
| Inicio | Tu resumen (win rate, lugar promedio, partidas) + Tus líderes (los 3 más jugados) | Últimas partidas |
| Cargar partida | Nueva partida (fecha, lado del tablero, duración) + Agregar jugador (buscador) | En la mesa (jugadores con líder y puntos) + Guardar partida |
| Estadísticas | Win rate (aro + victorias, lugar y puntos promedio) + Por categoría | Líderes más jugados (con orden) |
| Partidas | El mes más reciente | El mes anterior + paginación |
| Amigos | Agregar amigo + Invitados | Tus amigos + Comparar con varios amigos |
| Comparar | Elegir amigos + Puntos por categoría (barras agrupadas) | Tabla "Vos vs. …" con el mejor valor marcado |

En celular, Amigos muestra primero "Tus amigos" y después "Agregar amigo".

## Accesibilidad

- El texto sobre tinta (`band-text` sobre `ink`) siempre sobre la parte sólida del trazo; el contraste es > 12:1.
- Cada barra lleva su nombre y su valor como texto; el color nunca es la única señal. El mejor valor de la comparativa va en negrita además del punto de bronce.
- Controles reales: `<a>` para navegar, `<button>` para acciones, `<input>`/`<select>` con `<label>`. La selección se comunica con `aria-current="page"` (navegación) y `aria-pressed` (selectores y chips), no solo con la pincelada o el círculo.
- Áreas táctiles de 44 px mínimo en celular (pestañas, opciones, botones de turno).

## Archivos

- `assets/Pinceladas/` — las máscaras PNG (alfa = forma).
- `assets/Papel/` — las texturas WebP con alfa.
- Los retratos de los líderes no son parte del sistema: los pone la app (`public/leaders/`).

## Preguntas abiertas

- No hay tema oscuro. Cuando haga falta, pensarlo como "el mismo cuaderno a la luz de una vela", no como tokens invertidos.
- Los nombres en español de los líderes en los mockups son provisorios; mandan los de la app.
- El desempate por posición en el track de exploración todavía no tiene campo en el formulario de carga.
