# design/

Referencia para implementar la UI. No es código de producción — es lo que Claude Code traduce a componentes reales de Next.js + shadcn/Tailwind.

**Dirección visual: "diario de expedición"** (papel envejecido, títulos pintados con tinta, Cinzel + Spectral). Reemplaza cualquier versión anterior de estilo "dibujado a mano / hachurado" que haya quedado dando vueltas.

- `tokens.json` — colores, tipografía, spacing y radios. Formato propio de Claude Design (no DTCG), pero los valores son los reales a usar. Ver `SUMMARY.md` para la versión rápida de leer.
- `brand.md` — el brand book: el concepto, y sobre todo la receta exacta de la "banda pintada" (el filtro SVG de desplazamiento + las dos capas) que es la técnica de firma de todo el sistema.
- `components/painted-band.html` — implementación de referencia de esa técnica, en sus tres variantes (banda de borde a borde, banda de columna, barra de valor). Abrir en el navegador.
- `components/leader-ranking-card.html` — el patrón dropdown + ranking de líderes, funcional. Abrir en el navegador para ver el comportamiento (reordena y reescala al cambiar el stat).
- `mockups/profile.html` — mockup estático de la pantalla de perfil completa, con los 8 avatares de líderes embebidos. Abrir en el navegador para ver el layout de conjunto.

Solo hay un tema (claro/"Pergamino"). Todavía no hay una versión oscura pensada — no asumas que es simplemente invertir los tokens, es una decisión de diseño pendiente.
