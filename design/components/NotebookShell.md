La estructura de cada pantalla: un cuaderno abierto en escritorio y una libreta encuadernada arriba en celular. Las pantallas solo llenan sus páginas.

## Escritorio (≥ `breakpoint-notebook`)

Escena de 1280 × 1000 px centrada (escalarla para que entre en el viewport si es más chico; nunca más grande que 1:1):

1. Fondo `backdrop.webp` cubriendo todo.
2. Tapa: `left 270, top 28, 992 × 944`, `radius-cover`, gradiente de cuero, `shadow-cover`.
3. Separador: `left 24, top 104, 300 × 790`, `rotate(-1.2deg)`, `page-insert.webp` con `shadow-sheet`. Contenido: identidad, navegación, Cargar partida, rosa de los vientos, links legales.
4. Grosor: dos copias de cada página corridas 3 px y 6 px con `brightness(0.84)` / `brightness(0.68)`.
5. Páginas: izquierda `left 290, top 46`, derecha `left 776, top 46`, 462 × 908 cada una. Padding de contenido `54px 50px 0 46px` (izq.) y `54px 46px 0 50px` (der.).
6. Anillos: SVG de 84 × 908 en `left 722`, 9 anillos cada 98 px: perforación (elipse oscura) en cada página y un arco de bronce en tres trazos (sombra, base `#3E2D1B` 7,5 px, `bronze` 4,8 px, brillo `bronze-light` 1,3 px).

API sugerida: `<NotebookShell active="estadisticas" left={…} right={…} />`.

## Celular (< `breakpoint-notebook`)

1. Fondo `backdrop.webp`.
2. Tapa: franja de cuero de 80 px arriba (`top 14`, 4 px de margen).
3. Página `page-mobile.webp` con 10 px de margen lateral, estirada al alto del contenido (fluye con el scroll), con el mismo grosor.
4. 8 espirales de bronce sobre el borde superior.
5. Contenido con padding `46px 26px` y espacio abajo para la barra.
6. Barra inferior fija (Navigation) o barra de guardado en Cargar partida.

API sugerida: la misma `<NotebookShell>`; debajo del breakpoint apila `left` y `right` (o `mobileOrder` si la pantalla lo pide).

## Reglas

- El contenido de una página de escritorio no pasa de 908 px: si no entra, se pagina o se mueve a la otra página.
- Los papeles llevan `drop-shadow`, no `box-shadow`.
- No hay header de borde a borde: la identidad vive en el separador (escritorio) o arriba de Inicio (celular).

## Tokens

`backdrop`, `cover`, `paper`, `paper-insert`, `bronze`, `bronze-light`, `radius-cover`, `shadow-cover`, `shadow-sheet`, `page-width`, `page-height`, `spine-gap`, `insert-width`, `mobile-page-inset`, `tabbar-height`, `breakpoint-notebook`.
