Navegación principal: en escritorio es la lista del separador; en celular, la barra inferior. En los dos casos el ítem actual está pintado.

## Escritorio — separador

- Ítems: Inicio, Partidas, Estadísticas, Amigos. Spectral 18 px, 52 px de alto, `padding-left: 38px`, rombo de 15 px antes del texto.
- Activo: `aria-current="page"`, texto `band-text` y una pincelada `brush-sweep-in.png` detrás (`left: 12px; right: 34px; top/bottom: -12px`): arranca con borde de pincel y se seca hacia la derecha, sin llegar a la página.
- Debajo de la lista va el botón de tinta **Cargar partida** (ver InkButton).

## Celular — barra inferior

- Tira de papel `tabbar.webp` de 96 px pegada abajo, con `drop-shadow` hacia arriba.
- 5 columnas: Inicio, Partidas, **Cargar** (círculo de tinta elevado), Estadísticas, Amigos. Ícono de 22 px + etiqueta Spectral 500 11 px.
- Activa: `aria-current="page"`, `band-text` y la pincelada compacta `brush-tab.png` (`inset: 2px -2px`).
- En Cargar partida la barra se reemplaza por la barra de guardado.

## Reglas

- Comparar e Invitados no están en la navegación: se llega desde Amigos (y Comparar marca Amigos como activo).
- Son `<a>` (navegan), no `<button>`.

## Tokens

`ink`, `band-text`, `ink-body`, `nav`, `tab-label`, `paper-insert`. Máscaras: `brush-sweep-in.png`, `brush-tab.png`, `ink-blot.png`. Papel: `page-insert.webp`, `tabbar.webp`.
