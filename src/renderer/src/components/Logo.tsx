/** MARIUS'ning vaqtinchalik original belgisi. Foydalanuvchi dizayni kelganda almashtiriladi. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="marius-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-strong)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="none" stroke="url(#marius-g)" strokeWidth="3" />
      <path
        d="M17 44V21l15 15 15-15v23"
        fill="none"
        stroke="url(#marius-g)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <LogoMark />
      <span className="logo__text">MARIUS</span>
    </div>
  );
}
