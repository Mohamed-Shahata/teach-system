/**
 * The Darsi brand mark: a circular gradient badge with a "D" monogram and
 * a small spark accent. Pure SVG (not a raster image) so it stays crisp
 * at any size and its gradient follows the live theme tokens — it
 * repaints instantly on light/dark toggle instead of shipping two PNGs.
 * Always perfectly circular by construction (a <circle>), per design.
 */
export function LogoMark({ className, id = "darsi-mark" }: { className?: string; id?: string }) {
  const gradientId = `${id}-gradient`;

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
      <text
        x="17.5"
        y="27.5"
        textAnchor="middle"
        fontFamily="var(--font-sans-en, ui-sans-serif), sans-serif"
        fontWeight="700"
        fontSize="20"
        fill="#ffffff"
      >
        D
      </text>
      <path
        d="M30.2 7.6 31.4 10.4 34.2 11.6 31.4 12.8 30.2 15.6 29 12.8 26.2 11.6 29 10.4 30.2 7.6Z"
        fill="#ffffff"
        opacity="0.92"
      />
    </svg>
  );
}
