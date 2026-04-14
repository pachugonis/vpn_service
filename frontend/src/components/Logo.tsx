interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoShield" x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#2dd4a8" />
        </linearGradient>
      </defs>

      <path
        d="M32 4 L56 12 V32 C56 46 45 56 32 60 C19 56 8 46 8 32 V12 Z"
        fill="url(#logoShield)"
        stroke="#34d399"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 9 L51 15.5 V32 C51 43 43 51.5 32 55 C21 51.5 13 43 13 32 V15.5 Z"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
      />

      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="26"
        fontWeight="900"
        fill="#ffffff"
      >
        ?!
      </text>
    </svg>
  );
}
