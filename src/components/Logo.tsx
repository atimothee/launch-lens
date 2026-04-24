export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="ll-g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff7a45" />
            <stop offset="1" stopColor="#ff5a1f" />
          </linearGradient>
        </defs>
        <circle cx="11" cy="11" r="7" stroke="url(#ll-g)" strokeWidth="2" />
        <path d="M16 16l5 5" stroke="url(#ll-g)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="11" r="2.5" fill="url(#ll-g)" />
      </svg>
      <span className="font-semibold tracking-tight" style={{ fontSize: size * 0.8 }}>
        LaunchLens
      </span>
    </div>
  );
}
