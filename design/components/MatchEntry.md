Una partida en una lista: fecha y tu resultado, quién ganó con la corona, y los jugadores en orden de llegada con el retrato chico de su líder.

## Anatomía

- Línea 1: fecha (Spectral 700 15 px) · a la derecha "Saliste 2.º de 4" en `ink-muted`.
- Línea 2: corona (`gold`, 18 px) + "Ganó Manuela" (17 px).
- Línea 3: jugadores en orden de llegada, separados por `·` al 35 %. Cada uno con su retrato de 20 px (marco `bronze` 1,5 px, `radius` 3 px) si jugó con líder; sin líder, solo el nombre. Tu nombre va en `ink-body` 600; el resto en `ink-muted`.
- Separador inferior `hairline` al 14 %, salvo la última de la lista.

## Reglas

- Sin emoji (ni trofeo ni íconos de líder): corona y retratos.
- Las listas largas se agrupan por mes con un título pintado por mes ("Septiembre 2026").

## Tokens

`gold`, `bronze`, `ink-body`, `ink-muted`, `hairline`, `entry-title`, `body`.
