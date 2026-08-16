/**
 * Decorative hero illustration for the marketing landing page.
 * Built from design-system tokens — no external images.
 */
export function LandingHeroIllustration() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <svg
        viewBox="0 0 640 480"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="landingBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="#0b2a99" />
          </linearGradient>
          <radialGradient id="landingGlow" cx="30%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="640" height="480" fill="url(#landingBgGrad)" />
        <rect width="640" height="480" fill="url(#landingGlow)" />

        <circle cx="520" cy="80" r="120" fill="var(--color-secondary)" opacity="0.2" />
        <circle cx="80" cy="400" r="140" fill="#ffffff" opacity="0.06" />

        {/* dashboard card */}
        <g transform="translate(60,80)">
          <rect x="0" y="0" width="280" height="200" rx="16" fill="#ffffff" opacity="0.98" />
          <rect x="20" y="20" width="80" height="10" rx="5" fill="var(--color-primary)" opacity="0.5" />
          <rect x="20" y="38" width="120" height="8" rx="4" fill="var(--color-primary)" opacity="0.25" />

          <rect x="20" y="70" width="55" height="50" rx="10" fill="var(--color-accent)" />
          <rect x="85" y="70" width="55" height="50" rx="10" fill="var(--color-accent)" />
          <rect x="150" y="70" width="55" height="50" rx="10" fill="var(--color-accent)" />
          <rect x="215" y="70" width="45" height="50" rx="10" fill="var(--color-accent)" />

          <rect x="28" y="100" width="20" height="12" rx="3" fill="var(--color-primary)" opacity="0.45" />
          <rect x="93" y="92" width="20" height="20" rx="3" fill="var(--color-secondary)" />
          <rect x="158" y="96" width="20" height="16" rx="3" fill="var(--color-primary)" opacity="0.35" />
          <rect x="223" y="88" width="20" height="24" rx="3" fill="var(--color-primary)" opacity="0.55" />

          <rect x="20" y="140" width="240" height="8" rx="4" fill="var(--color-primary)" opacity="0.15" />
          <rect x="20" y="156" width="180" height="8" rx="4" fill="var(--color-primary)" opacity="0.1" />
          <rect x="20" y="172" width="210" height="8" rx="4" fill="var(--color-primary)" opacity="0.1" />
        </g>

        {/* course card */}
        <g transform="translate(340,140)">
          <rect x="0" y="0" width="220" height="150" rx="16" fill="#ffffff" opacity="0.98" />
          <rect x="16" y="16" width="188" height="60" rx="10" fill="var(--color-accent)" />
          <rect x="16" y="88" width="120" height="10" rx="5" fill="var(--color-primary)" opacity="0.55" />
          <rect x="16" y="106" width="90" height="8" rx="4" fill="var(--color-primary)" opacity="0.3" />
          <rect x="16" y="122" width="60" height="16" rx="8" fill="var(--color-secondary)" />
        </g>

        {/* quiz badge */}
        <g transform="translate(380,60)">
          <circle cx="50" cy="50" r="50" fill="var(--color-secondary)" />
          <path
            d="M50 28 22 42l28 14 28-14-28-14Z"
            fill="#ffffff"
          />
          <path
            d="M34 48v12c0 6 8 10 16 10s16-4 16-10V48l-16 8-16-8Z"
            fill="#ffffff"
            opacity="0.85"
          />
        </g>

        {/* progress chart */}
        <g transform="translate(80,310)">
          <rect x="0" y="0" width="200" height="120" rx="16" fill="#ffffff" opacity="0.98" />
          <rect x="20" y="70" width="16" height="30" rx="4" fill="var(--color-primary)" opacity="0.35" />
          <rect x="44" y="54" width="16" height="46" rx="4" fill="var(--color-primary)" opacity="0.55" />
          <rect x="68" y="38" width="16" height="62" rx="4" fill="var(--color-secondary)" />
          <rect x="92" y="58" width="16" height="42" rx="4" fill="var(--color-primary)" opacity="0.45" />
          <rect x="116" y="48" width="16" height="52" rx="4" fill="var(--color-primary)" opacity="0.6" />
          <rect x="140" y="62" width="16" height="38" rx="4" fill="var(--color-primary)" opacity="0.35" />
        </g>

        {/* scattered dots */}
        <g fill="#ffffff">
          <circle cx="300" cy="60" r="3" opacity="0.7" />
          <circle cx="580" cy="320" r="4" opacity="0.5" />
          <circle cx="160" cy="40" r="2.5" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
