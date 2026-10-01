Ranking de los líderes de Arnak por una estadística elegida: título pintado, selector de orden y una fila por líder con retrato, valor y una barra de pincel en el color del líder.

## Cuándo usarlo

En Estadísticas (todos los líderes) y en Inicio ("Tus líderes", los 3 más jugados). La misma fila sirve para cualquier ranking por líder.

## Anatomía de una fila

- Retrato de 46 px (40 px en celular) en marco `bronze` de 2 px, `radius-sm`, `shadow-portrait`, `object-fit: cover; object-position: center 20%`.
- Arriba: nombre (Spectral 600) + `· 6 partidas` en `ink-muted`; a la derecha el valor (Spectral 700, 17 px).
- Abajo: la barra. Contenedor de 18 px de alto (15 px en celular) con `width` = valor relativo al máximo de la lista; adentro la capa de tinta con `background` = color del líder (`chart-*`) y la máscara `brush-bar-{(i % 4) + 1}.png`, `inset: -6px 0`.

## Reglas

- Las 4 máscaras de barra se alternan por posición (`i % 4`).
- Valor 0: sin barra; una línea `hairline` al 18 % de 1 px en su lugar.
- Al cambiar el orden se reordenan las filas y se reescalan las barras. En "lugar promedio" menos es mejor: invertir antes de escalar.
- El color de un líder es fijo en toda la app (ver tokens `chart-*`).

## Tokens

`chart-1…8`, `bronze`, `shadow-portrait`, `ink-body`, `ink-muted`, `hairline`. Máscaras: `assets/Pinceladas/brush-bar-1…4.png`.
