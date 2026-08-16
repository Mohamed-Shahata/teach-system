/**
 * The Drosi brand mark: a circular gradient badge with an open-book
 * glyph and a small spark accent. Pure SVG (not a raster image) so it
 * stays crisp at any size and its gradient follows the live theme
 * tokens (`--color-primary` → `--color-secondary`) — it repaints
 * instantly on light/dark toggle instead of shipping two PNGs.
 * Always perfectly circular by construction (a <circle>), per design.
 */
export function LogoMark({ className, id = "drosi-mark" }: { className?: string; id?: string }) {
  const gradientId = `${id}-gradient`;
  const glossId = `${id}-gloss`;

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </linearGradient>
        <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
      <circle cx="20" cy="20" r="20" fill={`url(#${glossId})`} />

      {/* Open book */}
      <path
        d="M20 15.4c-1.9-1.7-4.6-2.6-7.4-2.6-.7 0-1.3.55-1.3 1.25v9.4c0 .7.6 1.2 1.3 1.15 2.7-.2 5.3.6 7.4 2.35 2.1-1.75 4.7-2.55 7.4-2.35.7.05 1.3-.45 1.3-1.15v-9.4c0-.7-.6-1.25-1.3-1.25-2.8 0-5.5.9-7.4 2.6Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M20 15.4v10.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      {/* Spark accent */}
      <path
        d="M29.6 8.2 30.6 10.6 33 11.6 30.6 12.6 29.6 15 28.6 12.6 26.2 11.6 28.6 10.6 29.6 8.2Z"
        fill="#ffffff"
        opacity="0.92"
      />
    </svg>
  );
}
