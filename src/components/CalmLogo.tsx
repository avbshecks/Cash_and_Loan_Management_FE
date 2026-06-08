// Welble Investments P/L — accurate SVG recreation of the official logo emblem
// White background · Gold pyramid rays · WB bold text · Shovel + Pickaxe silhouettes

interface CalmLogoProps {
  size?: number;
  className?: string;
}

export default function CalmLogo({ size = 64, className = '' }: CalmLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 200"
      width={size}
      height={size}
      className={className}
    >
      {/* ── White background ──────────────────────────────────────── */}
      <rect width="220" height="200" fill="white" />

      {/* ── Gold pyramid rays — apex at top-centre (110, 42) ─────── */}
      {/* 7 triangular facets, alternating darker / lighter gold     */}
      {/* Far-left — dark gold */}
      <polygon points="110,42  14,185  34,185"  fill="#7a5c14" />
      {/* Left-outer — medium dark */}
      <polygon points="110,42  32,185  60,185"  fill="#a07820" />
      {/* Left-inner — gold */}
      <polygon points="110,42  57,185  88,185"  fill="#c89b2a" />
      {/* Centre — bright gold (widest) */}
      <polygon points="110,42  85,185 135,185"  fill="#e8b830" />
      {/* Right-inner — gold */}
      <polygon points="110,42 132,185 163,185"  fill="#c89b2a" />
      {/* Right-outer — medium dark */}
      <polygon points="110,42 160,185 188,185"  fill="#a07820" />
      {/* Far-right — dark gold */}
      <polygon points="110,42 186,185 206,185"  fill="#7a5c14" />

      {/* ── Shovel silhouette — top-left ─────────────────────────── */}
      <g transform="translate(10,4) rotate(-32,32,50)">
        {/* Blade body */}
        <path d="M20,10 Q10,14 8,28 Q6,42 14,50 Q22,58 32,54 Q42,50 44,36 Q46,22 38,14 Q30,6 20,10Z"
              fill="#1a1a1a"/>
        {/* Blade edge highlight */}
        <path d="M18,12 Q10,18 10,30 Q10,42 20,50 Q24,53 30,52"
              stroke="#000" strokeWidth="1.5" fill="none"/>
        {/* Socket/collar */}
        <rect x="26" y="50" width="10" height="8" rx="2" fill="#1a1a1a"/>
        {/* Handle */}
        <rect x="28" y="56" width="7" height="48" rx="3" fill="#1a1a1a"/>
        {/* D-grip */}
        <path d="M28,100 Q18,110 22,120 Q26,130 35,126 Q38,122 35,113"
              stroke="#1a1a1a" strokeWidth="6" fill="none" strokeLinecap="round"/>
      </g>

      {/* ── Pickaxe silhouette — top-right ────────────────────────── */}
      <g transform="translate(135,0) rotate(28,50,30)">
        {/* Pick head — elongated with sharp right tip and blunt left */}
        <path d="M0,22 Q2,14 12,10 Q22,6 28,14 L72,22 Q82,16 84,22 Q86,28 80,32 L28,30 Q22,38 12,36 Q2,34 0,28 Z"
              fill="#1a1a1a"/>
        {/* Handle */}
        <rect x="32" y="30" width="7" height="52" rx="3" fill="#1a1a1a"/>
      </g>

      {/* ── "WB" text — white fill, thick black stroke ───────────── */}
      <text
        x="110"
        y="115"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="68"
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="#111111"
        strokeWidth="6"
        strokeLinejoin="round"
        paintOrder="stroke fill"
      >WB</text>
    </svg>
  );
}
