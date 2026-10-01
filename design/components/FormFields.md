Campos para escribir en el cuaderno: se escribe sobre una línea, no dentro de una caja. Incluye texto, fecha, número, selector de pocas opciones, chips, buscador de jugadores y la tarjeta de puntos de un jugador.

## Campo de texto / fecha / número

- `input` sin caja: `border-bottom: 1.5px solid` `ink-body` al 45 %, Spectral 16 px, mínimo 42 px de alto. Con foco, la línea pasa a 2 px `bronze`.
- Etiqueta arriba (Spectral 600 14 px, `<label for>`), ayuda debajo en itálica `ink-muted` 13 px. "(opcional)" va en la etiqueta en peso 400.
- Íconos (calendario, lupa) o sufijos ("min") a la derecha, dentro de la línea, en `ink-muted`.

## Selector de pocas opciones (lado del tablero)

- Grilla de 3 botones de 44 px con `aria-pressed`. Sin elegir: texto sobre una línea al 30 %. Elegido: pincelada `brush-tab.png` (`inset: -3px -6px`) y texto `band-text`.
- Mismo patrón para los **chips** de amigos a comparar (40 px, ancho según el nombre).

## Buscador de jugadores (combobox)

- Campo con lupa; al escribir abre un panel `surface-pop` (`radius-sm`, `shadow-pop`) debajo.
- Grupos con encabezado `overline`: "Tus invitados", "Jugaron con vos" (invitados de otros con los que compartiste partida), y amigos con cuenta. Cada opción de 46 px muestra monograma (punteado si no tiene cuenta), nombre y una aclaración en itálica.
- La última opción siempre es **Crear invitado «texto»**.

## Tarjeta de jugador (puntos)

- Cabecera: `TURNO N` (overline) + nombre en negrita + `· vos / amiga / invitada`; a la derecha botones de 34 px para subir/bajar turno y quitar.
- Selector de líder con el retrato chico + el **total calculado** a la derecha (no se escribe).
- Grilla de 3 × 2 campos numéricos (Investigación, Templo, Ídolos, Guardianes, Cartas, Miedo) con el punto de color de cada categoría, 17 px 600, `inputmode="numeric"`.

## Tokens

`ink-body`, `ink-muted`, `bronze`, `surface-pop`, `shadow-pop`, `radius-sm`, `input`, `label`, `caption`, `overline`, `chart-*` (categorías). Máscara: `brush-tab.png`.
