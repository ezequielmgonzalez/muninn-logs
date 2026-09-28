# Resumen rápido de tokens

Para no tener que leer todo `tokens.json`. Los valores completos y su uso están ahí; esto es solo la lista.

## Color (un solo tema, claro — "Pergamino")

| Token | Hex | Uso |
|---|---|---|
| surface-page | #EAE0C8 | Fondo (en la práctica es un gradiente, ver brand.md) |
| ink | #211D19 | Tinta de las bandas pintadas |
| ink-body | #2B241E | Texto de lectura |
| ink-muted | #6E6154 | Texto secundario |
| band-text | #F1E9D8 | Texto sobre una banda oscura |
| band-text-muted | #C9BC9C | Texto secundario sobre una banda oscura |
| bronze | #8A6A3E | Marcos de retrato, aro de progreso |
| hairline | #3A332C | Separadores (usar a 12–16% opacidad) |
| chart-1 | #8C3E3E | Rojo apagado |
| chart-2 | #B8862F | Oro/ámbar |
| chart-3 | #3E5E8C | Azul |
| chart-4 | #4E7A3E | Verde |
| chart-5 | #6A4E8C | Violeta |
| chart-6 | #3E7A72 | Verde azulado |
| chart-7 | #6E7A3E | Oliva |
| chart-8 | #A65A4E | Óxido/terracota |

**No hay tema oscuro todavía.**

## Tipografía

- Display: `Cinzel` (Google Fonts, pesos 600/700) — solo texto sobre una banda pintada, siempre mayúsculas, `letter-spacing: 0.14em`.
- Body: `Spectral` (Google Fonts, pesos 400–700) — todo lo demás, incluidos los números.

| Estilo | Familia | Tamaño | Alto de línea | Peso |
|---|---|---|---|---|
| band-lg | Display | 26px | 30px | 700 |
| band-md | Display | 14px | 18px | 600 |
| band-sm | Display | 11px | 14px | 600 |
| stat-hero | Body | 34px | 38px | 700 |
| stat-lg | Body | 18px | 24px | 700 |
| body-strong | Body | 15px | 20px | 600 |
| caption | Body | 13px | 18px | 400 (+ italic manual) |

## Spacing

4 · 8 · 12 · 16 · 20 · 28 · 44 · 56 (px) — `space-1` a `space-8`.

## Radius

Un solo valor: `radius-sm` = 4px, reservado para el marco de los retratos. **Las bandas de tinta nunca llevan `border-radius`** — su forma sale del filtro SVG (ver `brand.md` y `components/painted-band.html`), no de esquinas curvas.
