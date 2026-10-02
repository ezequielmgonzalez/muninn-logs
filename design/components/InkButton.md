Botón de tinta: la acción principal de una pantalla, una caja dibujada a mano alzada con pluma alrededor de la etiqueta, con una aguada de tinta suave adentro. Las pinceladas son para los títulos; lo que se toca se dibuja con pluma.

## Cuándo usarlo

Una vez por pantalla, para la acción que cierra la tarea: Guardar partida, Enviar solicitud, Comparar, y Cargar partida en el separador. Las acciones secundarias son links subrayados (`Ver todas las partidas →`) o botones de ícono; no hay botón "outline" ni gris.

## Variantes

- **Principal** — 52 px de alto, ancho completo de la columna, Cinzel 700 14 px mayúsculas `letter-spacing: 0.12em`, `color: ink`. Caja de pluma: máscara `public/pen/pen-box.svg` (trazo de 1,9 px con esquinas que se pasan, `non-scaling-stroke` para que no se deforme a ningún ancho), `inset: -4px`, dibujada de izquierda a derecha con la pantalla. Adentro, aguada `ink` al 7 % (12 % al pasar el mouse).
- **Deshabilitado** — todo el botón baja a 45 % de opacidad y el motivo se dice arriba en itálica ("Agregá al menos 2 jugadores para guardar."). Nunca deshabilitar sin explicar por qué.
- **Separador** — 48 px, 13 px, la misma caja de pluma (no se vuelve a dibujar en cada pantalla), con el ícono de más.
- **Cargar (celular)** — círculo de 62 px elevado 40 px sobre la barra inferior, máscara `ink-blot.png` con `inset: -4px`, más en `band-text`, etiqueta "Cargar" debajo.

## Reglas

- Es un `<button>` (o `<a>` si navega). Foco: contorno `bronze` de 2 px con 3 px de separación.
- Sin `border-radius` ni sombra en la tinta.
- **Peligro** (eliminar una partida, la cuenta): la caja, el texto y la aguada en tinta roja (`destructive`).

## Tokens

`ink`, `band-text`, `ink-button`, `destructive`. Máscaras: `pen/pen-box.svg`, `brush/ink-blot.png` (Cargar en el celular).
