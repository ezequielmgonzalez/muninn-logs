Botón de tinta: la acción principal de una pantalla, pintada con la misma pincelada que los títulos.

## Cuándo usarlo

Una vez por pantalla, para la acción que cierra la tarea: Guardar partida, Enviar solicitud, Comparar, y Cargar partida en el separador. Las acciones secundarias son links subrayados (`Ver todas las partidas →`) o botones de ícono; no hay botón "outline" ni gris.

## Variantes

- **Principal** — 52 px de alto, ancho completo de la columna, Cinzel 700 14 px mayúsculas `letter-spacing: 0.12em`, `color: band-text`. Capa de tinta con máscara `brush-band-1.png`, `inset: -9px -12px`.
- **Deshabilitado** — la tinta baja a 42 % de opacidad y el motivo se dice arriba en itálica ("Agregá al menos 2 jugadores para guardar."). Nunca deshabilitar sin explicar por qué.
- **Separador** — 48 px, 13 px, máscara `brush-band-2.png`, con el ícono de más.
- **Cargar (celular)** — círculo de 62 px elevado 40 px sobre la barra inferior, máscara `ink-blot.png` con `inset: -4px`, más en `band-text`, etiqueta "Cargar" debajo.

## Reglas

- Es un `<button>` (o `<a>` si navega). Foco: contorno `bronze` de 2 px con 3 px de separación.
- Sin `border-radius` ni sombra en la tinta.

## Tokens

`ink`, `band-text`, `ink-button`. Máscaras: `brush-band-1.png`, `brush-band-2.png`, `ink-blot.png`.
