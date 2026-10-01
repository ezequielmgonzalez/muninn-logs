Título de sección pintado: una pincelada de tinta seca con el título en Cinzel encima. Es la pieza más reconocible del sistema.

## Cuándo usarlo

Para cada sección de una página (Win Rate, Por categoría, Últimas partidas, el mes en Partidas…). Una página de escritorio tiene uno o dos; no más de tres.

## Anatomía

- Contenedor `position: relative`, 50 px de alto (46 px en celular), centrado.
- **Capa de tinta**: `div` absoluto con `background: var(--ink)` y la máscara `brush-band-1.png` o `brush-band-2.png` (`mask-size: 100% 100%`). Sobresale del contenedor: `inset: -12px -26px` en escritorio, `-11px -18px` en celular, para que los extremos secos queden cerca del borde de la página.
- **Texto**: `h2` en Cinzel 600, 14 px (13 px en celular), mayúsculas, `letter-spacing: 0.14em`, `color: var(--band-text)`, `position: relative; z-index: 2`.

## Reglas

- Alternar `band-1` / `band-2` entre secciones de la misma página, y espejar la capa de tinta con `transform: scaleX(-1)` para que dos títulos seguidos no sean el mismo trazo.
- Sin `border-radius`, sombra ni filtros: la forma es la máscara.
- El texto entra en la parte sólida: títulos de hasta ~24 caracteres en escritorio y ~22 en celular. Si no entra, acortar el texto.

## Implementación sugerida

```tsx
export function PaintedBand({ children, variant = 1, flip = false }: Props) {
  return (
    <div className="relative flex h-[50px] items-center justify-center max-[1199px]:h-[46px]">
      <div aria-hidden className={cn("ink absolute inset-[-12px_-26px] bg-ink", variant === 1 ? "ink--band1" : "ink--band2", flip && "-scale-x-100")} />
      <h2 className="relative z-[2] font-display text-[14px] font-semibold uppercase tracking-[0.14em] text-band-text">{children}</h2>
    </div>
  );
}
```

## Tokens

`ink`, `band-text`, `band-md` / `band-sm`. Máscaras: `assets/Pinceladas/brush-band-1.png`, `brush-band-2.png`.
