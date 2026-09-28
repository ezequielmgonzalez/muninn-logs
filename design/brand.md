# Muninn Logs — Design System

Un diario de expedición, no una app de estadísticas genérica.

## Concept

Muninn Logs registra partidas de un juego sobre ruinas y exploración. La interfaz se piensa como el cuaderno de campo de quien juega: papel envejecido, títulos de sección pintados con un pincel de tinta oscura, y datos que se leen con la claridad de una serif de libro, no de una tabla de spreadsheet. Nada acá debería parecer un dashboard de SaaS.

Esta es la **segunda** dirección visual del proyecto (reemplaza una anterior de estilo "dibujado a mano tipo Excalidraw", descartada por completo). Si encontrás referencias a hachurado, sombras duras offset o Shantell Sans en versiones viejas de este documento o del código, son de esa dirección anterior y ya no aplican.

## El papel

El fondo no es un color plano. Es:

```css
background: radial-gradient(ellipse at 50% 0%, #F3ECDA 0%, #EAE0C8 55%, #DCCFA9 100%);
box-shadow: inset 0 0 130px 40px rgba(43,32,20,0.32);
```

Encima de eso, una textura de grano sutil (no una imagen — un filtro SVG):

```html
<filter id="mjGrain">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise"/>
  <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0"/>
</filter>
```
aplicado a un `<div>` que cubre toda la pantalla: `filter: url(#mjGrain); mix-blend-mode: multiply; pointer-events: none;`.

## Las bandas pintadas (la firma del sistema)

Cada título de sección ("Win Rate", "Por categoría", "Líderes más jugados", el masthead) y cada barra de ranking son la MISMA técnica: dos capas superpuestas del mismo color, cada una pasada por un filtro de desplazamiento SVG que rompe sus bordes rectos.

```html
<filter id="mjRough" x="-15%" y="-60%" width="130%" height="220%">
  <feTurbulence type="fractalNoise" baseFrequency="0.014 0.11" numOctaves="2" seed="7" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="mjRoughBlur" x="-25%" y="-120%" width="150%" height="340%">
  <feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="2" seed="3" result="noise2"/>
  <feDisplacementMap in="SourceGraphic" in2="noise2" scale="13" xChannelSelector="R" yChannelSelector="G"/>
  <feGaussianBlur stdDeviation="3"/>
</filter>
```

```css
.paint-bg { position: absolute; inset: -14px -30px; opacity: 0.26; filter: url(#mjRoughBlur); }
.paint-fg { position: absolute; inset: -3px -9px; filter: url(#mjRough); }
```

Uso: un contenedor `position: relative` con dos `<div>` absolutos (`paint-bg` detrás, `paint-fg` encima, mismo `background-color`) y el texto o la barra por encima de ambos con `z-index: 2`. `paint-bg` es la pasada difusa y más grande (el "sangrado" del pigmento en el papel); `paint-fg` es la pasada nítida. Ver `components/PaintedBand/` para la implementación completa en sus tres variantes (banda de borde a borde, banda de columna, barra de valor).

**Regla:** las bandas nunca usan `border-radius`. Su forma sale enteramente de este filtro, no de esquinas curvas — un `border-radius` en una banda es una señal de que el componente no está usando la técnica real.

Cada barra de ranking reusa exactamente esto: el color pasa a ser el color categórico del líder/categoría (`chart-1`…`chart-8`) en vez de `ink`, y el ancho del contenedor es el porcentaje del valor.

## Color

Un solo tema por ahora — **Pergamino** (claro). Todavía no hay una versión oscura pensada; es una decisión pendiente, no un olvido (ver "Preguntas abiertas" al final).

- `surface-page` — el papel (ver arriba, es un degradé, no un color plano).
- `ink` — la tinta de las bandas.
- `ink-body` / `ink-muted` — texto de lectura, primario y secundario.
- `band-text` / `band-text-muted` — texto sobre una banda de tinta.
- `bronze` — herrajes: marco de retrato, aro de progreso.
- `chart-1`…`chart-8` — colores categóricos para líderes y categorías de puntaje. Ocho tintas apagadas (no colores de lápiz brillantes) para que convivan con el papel envejecido.

## Typography

- **Display** (`Cinzel`) — todo texto sobre una banda de tinta: mayúsculas, `letter-spacing: 0.14em`. Es la voz "grabada/ceremonial" del sistema.
- **Body** (`Spectral`) — todo lo demás, incluidos los números. Una serif de libro, cómoda de leer, con buenas cifras numéricas.

Nunca uses Display para un número de dato, ni Body en mayúsculas dentro de una banda.

## Retratos

Los personajes (líderes) llevan retrato a color real (ilustración pintada, no ícono de línea) dentro de un marco: `border: 2px solid var(--bronze); border-radius: 4px; box-shadow: 0 2px 5px rgba(43,32,20,0.35);`, recortado con `object-fit: cover; object-position: center 20%` para priorizar la cara.

## Spacing & radius

Escala de 8 pasos (`space-1`…`space-8`). Un solo radio (`radius-sm`, 4px), reservado para el marco de los retratos y controles chicos — no para las bandas.

## Accesibilidad

El texto sobre una banda de tinta (`band-text` sobre `ink`) tiene que mantener buen contraste — no lo comprometas por ponerle la pasada `paint-bg` debajo del texto: el texto va siempre sobre `paint-fg`, con `z-index: 2`, nunca directamente sobre `paint-bg`. Cada barra de ranking lleva su nombre y su valor como texto real al lado, nunca solo el color como señal.

## Preguntas abiertas

- No hay tema oscuro todavía. Cuando se necesite, hay que decidir si es "el mismo diario a la luz de una vela" (papel más oscuro, tinta más clara) o algo distinto — no asumir que es simplemente invertir los tokens.
- Las 8 tintas categóricas están pensadas para 8 líderes de Arnak. Si se suma otro juego con más personajes, van a hacer falta más.
