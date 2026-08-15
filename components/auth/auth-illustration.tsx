export type AuthIllustrationVariant = "learn" | "key" | "shield";

/**
 * Decorative panel for the auth split-layout (login/register/forgot/reset).
 * Original SVG illustration built from design-system tokens — no external
 * images, so it always matches the active theme/locale automatically.
 * Each `variant` swaps the floating scene to fit the screen's purpose while
 * sharing the same background treatment for visual consistency.
 */
export function AuthIllustration({
  tagline,
  variant = "learn",
}: {
  tagline: string;
  variant?: AuthIllustrationVariant;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-primary">
      <svg
        viewBox="0 0 800 1000"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="authBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="#0b2a99" />
          </linearGradient>
          <radialGradient id="authGlow" cx="50%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="1000" fill="url(#authBgGrad)" />
        <rect width="800" height="1000" fill="url(#authGlow)" />

        {/* soft dotted texture */}
        <g fill="#ffffff" opacity="0.08">
          {Array.from({ length: 12 }).map((_, row) =>
            Array.from({ length: 10 }).map((_, col) => (
              <circle key={`${row}-${col}`} cx={40 + col * 80} cy={40 + row * 80} r="2" />
            ))
          )}
        </g>

        {/* large soft blobs */}
        <circle cx="640" cy="140" r="220" fill="var(--color-secondary)" opacity="0.18" />
        <circle cx="60" cy="880" r="260" fill="#ffffff" opacity="0.06" />

        {variant === "learn" && (
          <>
            {/* floating card: open book */}
            <g transform="translate(150,470)">
              <rect x="0" y="0" width="220" height="150" rx="18" fill="#ffffff" opacity="0.98" />
              <path d="M20 30 h80 v90 a90 6 0 0 1 -80 0 Z" fill="var(--color-accent)" />
              <path d="M200 30 h-80 v90 a90 6 0 0 0 80 0 Z" fill="var(--color-accent)" />
              <rect x="30" y="46" width="60" height="6" rx="3" fill="var(--color-primary)" opacity="0.55" />
              <rect x="30" y="60" width="46" height="6" rx="3" fill="var(--color-primary)" opacity="0.35" />
              <rect x="110" y="46" width="60" height="6" rx="3" fill="var(--color-primary)" opacity="0.55" />
              <rect x="110" y="60" width="46" height="6" rx="3" fill="var(--color-primary)" opacity="0.35" />
            </g>

            {/* floating card: graduation cap badge */}
            <g transform="translate(430,360)">
              <circle cx="60" cy="60" r="60" fill="var(--color-secondary)" />
              <path d="M60 34 20 52l40 18 40-18-40-18Z" fill="#ffffff" />
              <path
                d="M34 58v16c0 8 12 14 26 14s26-6 26-14V58l-26 12-26-12Z"
                fill="#ffffff"
                opacity="0.85"
              />
            </g>

            {/* floating card: chart / progress */}
            <g transform="translate(420,560)">
              <rect x="0" y="0" width="190" height="120" rx="18" fill="#ffffff" opacity="0.98" />
              <rect x="24" y="70" width="18" height="30" rx="4" fill="var(--color-primary)" opacity="0.35" />
              <rect x="52" y="52" width="18" height="48" rx="4" fill="var(--color-primary)" opacity="0.55" />
              <rect x="80" y="34" width="18" height="66" rx="4" fill="var(--color-secondary)" />
              <rect x="108" y="58" width="18" height="42" rx="4" fill="var(--color-primary)" opacity="0.45" />
            </g>
          </>
        )}

        {variant === "key" && (
          <>
            {/* floating card: envelope */}
            <g transform="translate(150,430)">
              <rect x="0" y="0" width="240" height="150" rx="20" fill="#ffffff" opacity="0.98" />
              <path
                d="M14 20 120 100 226 20"
                fill="none"
                stroke="var(--color-primary)"
                strokeOpacity="0.55"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="14"
                y="20"
                width="212"
                height="110"
                rx="10"
                fill="none"
                stroke="var(--color-primary)"
                strokeOpacity="0.25"
                strokeWidth="6"
              />
            </g>

            {/* floating card: key badge */}
            <g transform="translate(430,340)">
              <circle cx="70" cy="70" r="70" fill="var(--color-secondary)" />
              <g transform="translate(38,42) rotate(-40 30 28)">
                <circle cx="16" cy="16" r="16" fill="none" stroke="#ffffff" strokeWidth="8" />
                <rect x="26" y="10" width="34" height="12" rx="4" fill="#ffffff" />
                <rect x="48" y="16" width="8" height="14" fill="#ffffff" />
                <rect x="38" y="16" width="8" height="10" fill="#ffffff" />
              </g>
            </g>

            {/* floating card: shield check (trust) */}
            <g transform="translate(430,570)">
              <rect x="0" y="0" width="150" height="110" rx="18" fill="#ffffff" opacity="0.98" />
              <path
                d="M75 24 108 34v22c0 22-14 34-33 42-19-8-33-20-33-42V34l33-10Z"
                fill="var(--color-primary)"
                opacity="0.5"
              />
              <path
                d="M60 60l11 11 20-22"
                fill="none"
                stroke="#ffffff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </>
        )}

        {variant === "shield" && (
          <>
            {/* large centered shield-lock */}
            <g transform="translate(220,380)">
              <rect x="0" y="0" width="360" height="280" rx="26" fill="#ffffff" opacity="0.98" />
              <path
                d="M180 40 260 60v70c0 60-36 92-80 108-44-16-80-48-80-108V60l80-20Z"
                fill="var(--color-accent)"
              />
              <path
                d="M180 40 260 60v70c0 60-36 92-80 108V40Z"
                fill="var(--color-primary)"
                opacity="0.12"
              />
              <rect x="152" y="128" width="56" height="46" rx="8" fill="var(--color-primary)" />
              <path
                d="M162 128v-16a18 18 0 0 1 36 0v16"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <circle cx="180" cy="150" r="6" fill="#ffffff" />
            </g>

            {/* small badge: check */}
            <g transform="translate(500,300)">
              <circle cx="45" cy="45" r="45" fill="var(--color-secondary)" />
              <path
                d="M28 46l12 12 22-24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </>
        )}

        {/* small dots / stars scattered */}
        <g fill="#ffffff">
          <circle cx="250" cy="330" r="4" opacity="0.8" />
          <circle cx="600" cy="620" r="5" opacity="0.6" />
          <circle cx="120" cy="200" r="3" opacity="0.7" />
          <circle cx="700" cy="420" r="3" opacity="0.6" />
        </g>
      </svg>

      <div className="absolute inset-x-0 bottom-0 p-12 text-white">
        <p className="max-w-sm text-2xl font-semibold leading-snug text-start">{tagline}</p>
      </div>
    </div>
  );
}
