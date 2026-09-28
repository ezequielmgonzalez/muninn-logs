/**
 * The paper everything sits on, plus the SVG filters the painted bands use.
 * Render once, in the root layout. See design/brand.md ("El papel", "Las
 * bandas pintadas").
 */
export function Paper() {
  return (
    <>
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          {/* Paper grain: noise at 5% alpha, multiplied onto the gradient. */}
          <filter id="paper-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves={2}
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0"
            />
          </filter>
          {/* Sharp brush pass: breaks the straight edges of a band. */}
          <filter id="paint-rough" x="-15%" y="-60%" width="130%" height="220%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.11"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={9}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          {/* Diffuse pass: the pigment bleeding into the paper around the stroke. */}
          <filter id="paint-rough-blur" x="-25%" y="-120%" width="150%" height="340%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.09"
              numOctaves={2}
              seed={3}
              result="noise2"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise2"
              scale={13}
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation={3} />
          </filter>
        </defs>
      </svg>
      {/* Aged-paper gradient with an inner vignette, lighter on small screens
          where the desktop vignette would cover most of the page. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,#f3ecda_0%,#eae0c8_55%,#dccfa9_100%)] shadow-[inset_0_0_70px_20px_rgba(43,32,20,0.26)] sm:shadow-[inset_0_0_130px_40px_rgba(43,32,20,0.32)]"
      >
        <div className="absolute inset-0 mix-blend-multiply [filter:url(#paper-grain)]" />
      </div>
    </>
  );
}
