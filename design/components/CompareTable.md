Tabla de comparativa: vos contra hasta 4 amigos, una fila por estadística, con el mejor valor de cada fila marcado.

## Anatomía

- Encabezado: "Estadística" en `ink-muted` + una columna por jugador con su punto de color (`player-you`, `player-2…5`) y su nombre.
- Filas de 15 px (14 px en celular): etiqueta en `ink-body`, valores centrados en `ink-muted`.
- **Mejor valor**: negrita `ink-body` + un punto `bronze` de 7 px con `aria-label="mejor"`. Empates: se marcan todos.
- Nota al pie en itálica explicando el punto y que en lugar promedio y en miedo gana el valor más bajo / más alto según corresponda.

## Acompañantes

En escritorio, la página izquierda muestra los chips para elegir amigos, el botón Comparar y **Puntos por categoría**: barras de pincel agrupadas (una por jugador, 9 px, en su color).

## Tokens

`player-you`, `player-2…5`, `bronze`, `ink-body`, `ink-muted`, `hairline`, `body`.
