# Muninn Logs — Documento de visión

Sep 25, 2026 · @Ezequiel

## Resumen

Muninn Logs es una web donde grupos de amigos registran sus partidas de juegos de mesa y descubren estadísticas de cómo juegan. Empieza con Las Ruinas de Arnak y está diseñada para sumar más juegos después.

El nombre viene de Muninn, uno de los cuervos de Odín en la mitología nórdica: su nombre significa "memoria". Muninn Logs es la memoria de tu mesa de juego.

## Problema

Los grupos que juegan seguido pierden el registro de sus partidas: los puntajes quedan en un papel o en una foto del tablero. Sin ese historial no pueden responder preguntas que les interesan de verdad.

-   ¿Quién gana más en nuestro grupo, y por cuánto?
-   ¿Con qué líder de Arnak me va mejor?
-   ¿En qué categoría de puntos soy fuerte y en cuál floja?
-   ¿Estoy mejorando con el tiempo?

Hipótesis a validar: las apps de registro existentes (por ejemplo BG Stats) son genéricas y no explotan el desglose y los personajes de cada juego. Muninn Logs apuesta por estadísticas pensadas para cada juego y por la comparación dentro del grupo.

## Usuarios

No hay un "grupo" que contenga las partidas: cada usuario es independiente, y cada partida es simplemente una lista de jugadores, mezclando usuarios registrados, amigos y invitados sin cuenta. La relación "amigo" entre usuarios sirve para comparar y filtrar, no para poder cargar una partida junto a alguien.

Ejemplo: Manuela, Ezequiel e Iñaki tienen cuenta y son amigos entre sí. Ezequiel es quien más carga partidas: algunas son los tres juntos, otras son él con Manuela y dos invitados sin cuenta, otras son él solo con Iñaki. Cada partida queda asociada a los jugadores que realmente estuvieron, tengan cuenta o no.

| Perfil                        | Qué hace                                                              | Qué necesita                                                                        |
| ----------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Quien carga la partida        | Arma la lista de jugadores: con cuenta, amigos o invitados sin cuenta | Cargar en segundos, sin depender de un grupo previo                                 |
| Jugador con cuenta            | Aparece en partidas que carga él u otros                              | Ver sus estadísticas juntando TODAS sus partidas, y compararse con amigos puntuales |
| Jugador sin cuenta (invitado) | Aparece en partidas que carga otro                                    | Poder reclamar su historial si se registra después                                  |

Cada usuario ve dos vistas de sus estadísticas: contra todos los rivales que enfrentó (con cuenta o no) y, aparte, comparado solo contra los amigos que también están en la app.

## Modelo de jugadores y amistad

-   Agregar a un usuario con cuenta a una partida requiere que sea tu amigo. Evita que te carguen puntajes falsos sin que lo sepas, y reusa la misma relación de amistad ya pensada para comparar.
-   Un invitado sin cuenta es un jugador (`player`), no un usuario: vive en el roster privado de quien lo carga. Reusar el mismo registro (por ejemplo "Jessi") en cada partida es lo que le da continuidad a sus estadísticas.
-   Crear o editar un invitado (su nombre, por ejemplo) es privado de quien lo creó: dos organizadores pueden tener cada uno su propio "Jessi", sin cruzarse.
-   Pero **ver y comparar** contra un invitado no es privado de quién lo creó: cualquier usuario con cuenta que compartió al menos una partida con él puede ver sus estadísticas y compararse, sumando todas las partidas donde coincidieron (aunque el registro sea de otro organizador).

    Al armar una partida nueva, el buscador de jugadores sugiere tanto los propios invitados como los invitados de otros con los que ya jugaste, para reusar el mismo registro en vez de crear un duplicado.

-   Un invitado puede convertirse en usuario más adelante reclamando su registro (fase 2), heredando su historial.

|                                      | Usuario con cuenta | Invitado sin cuenta                                                                      |
| ------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------- |
| Quién lo puede agregar a una partida | Solo amigos        | Quien lo creó, o cualquiera que ya jugó con él                                           |
| Quién lo puede ver y comparar        | Solo amigos (en una partida compartida, cualquiera ve su nombre) | Cualquiera que jugó con él en alguna partida, aunque el registro sea de otro organizador |
| Dónde vive el registro               | Global (la cuenta) | Privado, en el roster de quien lo cargó                                                  |
| Continuidad de estadísticas          | Automática         | Automática si se reusa el mismo registro                                                 |
| Puede volverse el otro tipo          | —                  | Sí, reclamando el registro al crear cuenta                                               |

## Alcance del MVP

El MVP está completo cuando un usuario real puede registrar sus partidas de Arnak, solas o mezcladas con amigos e invitados, y ver sus estadísticas.

**Entra en el MVP**

-   Registro e inicio de sesión (email y Google).
-   Agregar amigos (otros usuarios con cuenta) para poder compararse con ellos.
-   Cargar una partida de Arnak con cualquier combinación de jugadores: amigos con cuenta, e invitados sin cuenta creados o reutilizados al vuelo.
-   Líder opcional por jugador y puntos por categoría.
-   Historial propio: todas las partidas en las que participé o que cargé.
-   Estadísticas personales contra todos los rivales: partidas, victorias, win rate, promedio de puntos y por categoría.
-   Comparativa contra un amigo específico (o varios) que también esté en la app.
-   Diseño usable en celular.
-   Interfaz en español e inglés.

**Queda afuera del MVP (a propósito)**

-   Otros juegos distintos de Arnak.
-   Estadísticas por líder y comparativas cara a cara (fase 2).
-   Reclamar un jugador sin cuenta al registrarse (fase 2).
-   Fotos de partidas, comentarios o feed social.
-   App móvil nativa.
-   Importar datos desde otras apps.

## Por qué Las Ruinas de Arnak

Arnak es el primer juego porque su puntuación tiene categorías fijas y claras, y porque la expansión de líderes agrega personajes con estilos distintos. Eso da estadísticas ricas desde el día uno.

El juego base es simétrico: la asimetría la agrega la expansión _Los Líderes de la Expedición_. Por eso el líder es un dato opcional de cada jugador.

**Datos por partida**

| Dato               | Tipo               | Notas                                 |
| ------------------ | ------------------ | ------------------------------------- |
| Fecha              | Fecha              | Obligatorio                           |
| Lado del tablero   | Pájaro / Serpiente | Opcional, permite comparar dificultad |
| Duración           | Minutos            | Opcional                              |

**Datos por jugador en la partida**

| Dato           | Tipo             | Notas                         |
| -------------- | ---------------- | ----------------------------- |
| Jugador        | Referencia       | Con o sin cuenta              |
| Orden de turno | Número           | 1 a 4                         |
| Líder          | Opción           | Opcional (vacío = sin la expansión). Único por partida |
| Investigación  | Puntos           | Track de investigación        |
| Templo         | Puntos           | Losetas de templo             |
| Ídolos         | Puntos           |                               |
| Guardianes     | Puntos           |                               |
| Cartas         | Puntos           | Objetos y artefactos          |
| Miedo          | Puntos negativos | Cartas de miedo               |
| Total          | Puntos           | Calculado, no se carga a mano |

Conviene verificar estas categorías contra la hoja de puntuación oficial antes de programar el formulario.

**Desempate:** en caso de empate en puntos totales, gana quien llevó la lupa más lejos en el track de exploración. Solo si hay empate en el primer puesto, el formulario pregunta quién ganó el desempate; no se guarda la posición en el track. El ganador se calcula a partir de los puntos, no se guarda (ver [data-model.md](data-model.md)).

## Métricas de éxito del MVP

El MVP funciona si tu propio grupo lo usa sin que tengas que recordarles. Metas iniciales, a ajustar:

| Métrica                                        | Meta                                      |
| ---------------------------------------------- | ----------------------------------------- |
| Tiempo para cargar una partida de 4 jugadores  | Menos de 2 minutos                        |
| Partidas reales cargadas en el primer mes      | 20 o más                                  |
| Amigos usando la app fuera de vos              | Al menos 2, con partidas propias cargadas |
| Jugadores que vuelven a mirar sus estadísticas | La mitad del grupo, una vez por semana    |

## Principios y restricciones

-   **Cargar es rápido o no se usa.** El formulario de partida se diseña primero para celular, en la mesa.
-   **Genérico por dentro, específico por fuera.** Las tablas sirven para cualquier juego; cada juego define sus categorías de puntuación y personajes.
-   **Nadie queda afuera por no tener cuenta.** Los jugadores sin cuenta son ciudadanos de primera.
-   **Privado por defecto.** Una partida la ven los usuarios con cuenta que participaron en ella; nadie más.
-   **Dueño de la carga, dueño del edit.** Solo quien cargó una partida puede editarla o borrarla.
-   **Costo cero al arrancar.** Todo corre en planes gratuitos (Vercel y Supabase) hasta que haya usuarios reales.
-   **Proyecto personal de aprendizaje.** Se prioriza hacer las cosas bien (tests, CI/CD, migraciones) por sobre la velocidad.

## Stack y objetivos de aprendizaje

| Capa         | Elección                          | Motivo                                                           |
| ------------ | --------------------------------- | ---------------------------------------------------------------- |
| Framework    | Next.js (App Router) + TypeScript | Es una app con login y datos dinámicos, no un sitio de contenido |
| UI           | shadcn/ui + Tailwind              | Componentes propios y editables; incluye charts                  |
| Backend      | Supabase (Postgres, Auth, RLS)    | Alcanza sin servidor propio                                      |
| Validación   | Zod                               | Mismo esquema en formularios y datos                             |
| Idioma       | next-intl                         | Español e inglés desde el MVP; código siempre en inglés          |
| Tests        | Vitest + Playwright               | Unitarios y end-to-end                                           |
| Deploy       | Vercel                            | Preview por cada PR                                              |
| CI/CD        | GitHub Actions                    | Objetivo de aprendizaje principal                                |
| Organización | GitHub Projects                   | Issues enlazados a PRs                                           |

Objetivos de aprendizaje:

-   [ ] Pipeline de CI con lint, typecheck, build y tests en cada PR.
-   [ ] Migraciones de base de datos versionadas y aplicadas automáticamente.
-   [ ] Entornos separados de staging y producción.
-   [ ] Revisión automática de PRs con Claude Code.
-   [ ] Row Level Security bien entendida y testeada.

## Preguntas abiertas

Estas decisiones cambian el MVP, así que conviene cerrarlas antes de programar.

-   [x] Es para vos y tus amigos, pero pública en internet: también va a ser parte de tu portfolio.
-   [x] Español e inglés desde el inicio. El código (nombres de variables, funciones, tablas) siempre en inglés.
-   [x] No. El modo en solitario de Arnak queda fuera del MVP.
-   [x] Solo quien cargó la partida puede editarla o borrarla.
-   [x] No hace falta corregir duplicados: crear un invitado es privado de quien lo carga, pero verlo y compararse contra él es de cualquiera que jugó en esa partida. Dos "Roberto" de organizadores que nunca compartieron mesa quedan, correctamente, como dos personas distintas hasta que juegan juntos o el Roberto real se crea una cuenta y vincula ambos registros.
-   [x] Sí. En caso de empate en puntos, gana quien llevó la lupa más lejos en el track de exploración; lo indica quien carga la partida.
-   [x] Todavía sin definir, pero no más de 6–8 horas semanales. El roadmap debe planearse con ese ritmo.
