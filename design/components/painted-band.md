La técnica de firma del sistema: dos capas del mismo color, cada una rota por un filtro de desplazamiento SVG, en vez de un rectángulo con esquinas redondeadas.

## Las tres variantes

1. **Borde a borde**: la banda ocupa el ancho total de la página (el masthead "Diario de Ezequiel"). Sangra hasta los bordes reales de la pantalla — no tiene margen visible alrededor.
2. **Ancho de columna**: la banda ocupa el ancho de su columna, título de una sección ("Win Rate", "Por categoría", "Líderes más jugados").
3. **Impulsada por un valor**: el mismo par `paint-bg`/`paint-fg`, pero el color pasa a ser uno categórico (`chart-1`…`chart-8`) y el contenedor que los envuelve tiene `width: <valor>%` en vez de `width: 100%` — así una barra de ranking es la misma pincelada, solo que cortada donde termina el dato.

## Por qué dos capas y no una

`paint-bg` es una pasada más grande, más difusa y a menor opacidad — simula cómo el pigmento se corre un poco en el papel alrededor del trazo principal. `paint-fg` es la pasada nítida encima. Ninguna de las dos lleva `border-radius`: la forma irregular sale del filtro `feDisplacementMap`, no de las esquinas.

## Reglas

- El texto (o, en una barra, no hay texto encima) va siempre sobre `paint-fg`, con `z-index: 2` — nunca directamente sobre `paint-bg`, que es demasiado difusa para sostener contraste de lectura.
- Nunca agregues un `border-radius` a `.paint-bg` / `.paint-fg` — es la señal de que el componente no está usando la técnica real, sino imitándola con un rectángulo redondeado.
- El color de ambas capas es siempre el mismo (no uses un tono distinto para el fondo difuso); lo que cambia es opacidad y blur, no el color.

## Tokens usados

`ink` (bandas de sección), `chart-1`…`chart-8` (barras de valor), `band-text` (texto sobre la banda), familias `display` (título de la banda) y `body` (todo lo demás).
