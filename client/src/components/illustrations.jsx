/**
 * Flat medical illustrations, drawn in the app palette.
 * Each takes className for sizing; all are decorative (aria-hidden).
 */
const C = {
  navy: '#0B2239', navy2: '#1E3A5F', teal: '#2DD4BF', tealDeep: '#0F766E', tealSoft: '#CCFBF1',
  sky: '#2F80ED', skySoft: '#D4E6FF', coral: '#FF7A6B', coralSoft: '#FFE1DB', mint: '#E3F7F1',
  sun: '#FFD66B', white: '#FFFFFF', line: '#E1E8EE', skin1: '#F3C9A6', skin2: '#C98B63', skin3: '#8D5A3B', hair: '#2A2A35', grey: '#B7C4CF',
};

const Sparkle = ({ x, y, s = 1, fill = C.teal }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-10 C1-3 3-1 10 0 C3 1 1 3 0 10 C-1 3-3 1-10 0 C-3-1-1-3 0-10Z" fill={fill} />
);

const Person = ({ x, y, skin, shirt, hair = C.hair, scale = 1, glasses, bun }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-34 70 C-34 30 -20 18 0 18 C20 18 34 30 34 70 Z" fill={shirt} />
    <rect x="-7" y="6" width="14" height="16" rx="5" fill={skin} />
    <circle cx="0" cy="-8" r="20" fill={skin} />
    <path d="M-20 -10 C-20 -32 20 -34 21 -10 C14 -20 -6 -22 -20 -10Z" fill={hair} />
    {bun && <circle cx="0" cy="-30" r="8" fill={hair} />}
    {glasses && (
      <g fill="none" stroke={C.navy} strokeWidth="2">
        <circle cx="-8" cy="-7" r="6" /><circle cx="8" cy="-7" r="6" /><path d="M-2 -7h4" />
      </g>
    )}
    <circle cx="-7" cy="-6" r="1.8" fill={C.navy} /><circle cx="7" cy="-6" r="1.8" fill={C.navy} />
    <path d="M-5 3 Q0 7 5 3" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" />
  </g>
);

/** Landing hero: family, heart with ECG, forecast card, pills, shield. */
export function HeroArt({ className }) {
  return (
    <svg viewBox="0 0 560 460" className={className} aria-hidden>
      <defs>
        <linearGradient id="hgBlob" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E6F8F4" /><stop offset="1" stopColor="#DCEBFF" /></linearGradient>
        <linearGradient id="hgHeart" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF8E80" /><stop offset="1" stopColor="#F2545B" /></linearGradient>
      </defs>
      <path d="M86 92 C150 10 330 0 440 62 C540 118 560 250 500 340 C430 440 230 470 120 410 C20 356 22 172 86 92Z" fill="url(#hgBlob)" />
      <circle cx="470" cy="70" r="6" fill={C.teal} /><circle cx="70" cy="330" r="8" fill={C.skySoft} /><circle cx="520" cy="300" r="5" fill={C.coral} />

      {/* heart + ECG */}
      <g transform="translate(280 150)">
        <path d="M0 70 C-80 18 -96 -42 -54 -64 C-28 -78 -6 -64 0 -46 C6 -64 28 -78 54 -64 C96 -42 80 18 0 70Z" fill="url(#hgHeart)" />
        <path d="M-70 -6 H-34 L-22 -30 L-6 22 L8 -16 L18 -6 H70" fill="none" stroke={C.white} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* family */}
      <Person x={150} y={330} skin={C.skin2} shirt={C.sky} glasses scale={1.05} />
      <Person x={410} y={330} skin={C.skin1} shirt={C.tealDeep} bun scale={1.05} />
      <Person x={282} y={360} skin={C.skin3} shirt={C.coral} scale={0.82} />
      <path d="M90 405 H470" stroke={C.line} strokeWidth="4" strokeLinecap="round" />

      {/* forecast card */}
      <g transform="translate(372 196)">
        <rect width="150" height="96" rx="18" fill={C.white} stroke={C.line} />
        <text x="16" y="26" fontFamily="Geist, sans-serif" fontSize="11" fill={C.navy2} fontWeight="600">BP forecast</text>
        <rect x="16" y="54" width="118" height="18" rx="4" fill={C.mint} />
        <path d="M16 46 L40 42 L62 48 L82 40" fill="none" stroke={C.navy} strokeWidth="3" strokeLinecap="round" />
        <path d="M82 40 L106 52 L134 58" fill="none" stroke={C.teal} strokeWidth="3" strokeDasharray="5 5" strokeLinecap="round" />
        <circle cx="134" cy="58" r="5" fill={C.teal} />
        <text x="16" y="86" fontFamily="Geist, sans-serif" fontSize="10" fill={C.tealDeep} fontWeight="600">▼ improving</text>
      </g>

      {/* pill + capsule */}
      <g transform="translate(70 170) rotate(-30)">
        <rect width="72" height="30" rx="15" fill={C.white} stroke={C.line} strokeWidth="2" />
        <path d="M36 0 H57 A15 15 0 0 1 57 30 H36Z" fill={C.coral} />
      </g>
      <circle cx="132" cy="236" r="13" fill={C.sun} /><path d="M124 236 H140" stroke="#E7B93C" strokeWidth="3" strokeLinecap="round" />

      {/* shield with cross */}
      <g transform="translate(176 66)">
        <path d="M0 0 L34 -12 L68 0 V30 C68 54 50 68 34 76 C18 68 0 54 0 30Z" fill={C.navy} />
        <path d="M34 18 V50 M18 34 H50" stroke={C.teal} strokeWidth="8" strokeLinecap="round" />
      </g>

      <Sparkle x={448} y={160} s={1.1} />
      <Sparkle x={110} y={120} s={0.8} fill={C.sky} />
      <Sparkle x={505} y={380} s={0.7} fill={C.coral} />
    </svg>
  );
}

/** Prediction: chart with forecast cone and a lens. */
export function ForecastArt({ className }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden>
      <rect x="10" y="20" width="300" height="180" rx="26" fill={C.mint} />
      <rect x="34" y="44" width="252" height="132" rx="16" fill={C.white} stroke={C.line} />
      <path d="M50 150 H270" stroke={C.line} strokeWidth="2" />
      <path d="M160 96 L270 70 L270 128 Z" fill={C.tealSoft} />
      <path d="M50 132 L80 120 L104 126 L130 104 L160 98" fill="none" stroke={C.navy} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160 98 L270 99" fill="none" stroke={C.teal} strokeWidth="4" strokeDasharray="7 7" strokeLinecap="round" />
      {[[50, 132], [80, 120], [104, 126], [130, 104], [160, 98]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill={C.navy} />)}
      <circle cx="270" cy="99" r="7" fill={C.teal} />
      <g transform="translate(222 34)">
        <circle r="26" fill="none" stroke={C.navy} strokeWidth="7" />
        <circle r="20" fill="#ffffff" fillOpacity=".6" />
        <path d="M18 18 L38 38" stroke={C.navy} strokeWidth="9" strokeLinecap="round" />
      </g>
      <Sparkle x={58} y={70} s={1} />
      <Sparkle x={292} y={182} s={0.7} fill={C.sky} />
    </svg>
  );
}

/** Doctor with stethoscope and clipboard. */
export function DoctorArt({ className }) {
  return (
    <svg viewBox="0 0 260 240" className={className} aria-hidden>
      <circle cx="130" cy="120" r="108" fill={C.skySoft} />
      <path d="M58 240 C58 170 90 150 130 150 C170 150 202 170 202 240Z" fill={C.white} stroke={C.line} strokeWidth="2" />
      <path d="M112 150 L130 196 L148 150" fill={C.tealDeep} />
      <rect x="122" y="128" width="16" height="26" rx="6" fill={C.skin2} />
      <circle cx="130" cy="100" r="34" fill={C.skin2} />
      <path d="M96 98 C94 62 166 60 165 98 C152 80 112 80 96 98Z" fill={C.hair} />
      <circle cx="118" cy="102" r="3" fill={C.navy} /><circle cx="142" cy="102" r="3" fill={C.navy} />
      <path d="M121 116 Q130 123 139 116" fill="none" stroke={C.navy} strokeWidth="3" strokeLinecap="round" />
      <path d="M104 160 C96 190 106 206 124 206 M156 160 C164 190 154 206 136 206" fill="none" stroke={C.navy} strokeWidth="4" strokeLinecap="round" />
      <circle cx="130" cy="210" r="9" fill={C.teal} stroke={C.navy} strokeWidth="3" />
      <g transform="translate(172 160) rotate(8)">
        <rect width="54" height="68" rx="8" fill={C.white} stroke={C.navy} strokeWidth="3" />
        <rect x="16" y="-6" width="22" height="12" rx="4" fill={C.navy} />
        <path d="M12 26 H42 M12 38 H42 M12 50 H32" stroke={C.grey} strokeWidth="3" strokeLinecap="round" />
      </g>
      <Sparkle x={42} y={60} s={0.9} />
    </svg>
  );
}

/** Phone with emergency QR and a shield. */
export function EmergencyArt({ className }) {
  return (
    <svg viewBox="0 0 260 240" className={className} aria-hidden>
      <circle cx="130" cy="124" r="104" fill={C.coralSoft} />
      <rect x="80" y="30" width="100" height="186" rx="20" fill={C.navy} />
      <rect x="88" y="44" width="84" height="158" rx="12" fill={C.white} />
      <rect x="100" y="56" width="60" height="14" rx="4" fill={C.coral} />
      <g transform="translate(102 82)" fill={C.navy}>
        {[[0, 0], [8, 0], [24, 0], [40, 0], [48, 0], [0, 8], [16, 8], [40, 8], [0, 16], [8, 16], [24, 16], [48, 16], [16, 24], [32, 24], [0, 32], [8, 32], [40, 32], [48, 32], [24, 40], [0, 48], [16, 48], [32, 48], [48, 48]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.5" />)}
      </g>
      <path d="M100 152 H160 M100 166 H148 M100 180 H154" stroke={C.grey} strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(160 132)">
        <path d="M0 0 L30 -10 L60 0 V26 C60 48 44 60 30 66 C16 60 0 48 0 26Z" fill={C.teal} stroke={C.navy} strokeWidth="3" />
        <path d="M30 14 V42 M16 28 H44" stroke={C.white} strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Pill bottle, capsules and a clock. */
export function PillsArt({ className }) {
  return (
    <svg viewBox="0 0 260 220" className={className} aria-hidden>
      <ellipse cx="130" cy="196" rx="110" ry="14" fill={C.line} />
      <circle cx="130" cy="104" r="96" fill={C.mint} />
      <rect x="64" y="58" width="78" height="20" rx="6" fill={C.navy} />
      <rect x="70" y="76" width="66" height="112" rx="14" fill={C.white} stroke={C.navy} strokeWidth="3" />
      <rect x="70" y="106" width="66" height="44" fill={C.teal} />
      <path d="M103 116 V140 M91 128 H115" stroke={C.white} strokeWidth="6" strokeLinecap="round" />
      <g transform="translate(160 150) rotate(-25)">
        <rect width="58" height="24" rx="12" fill={C.white} stroke={C.navy} strokeWidth="3" />
        <path d="M29 1.5 H46 A10.5 10.5 0 0 1 46 22.5 H29Z" fill={C.coral} />
      </g>
      <circle cx="210" cy="190" r="10" fill={C.sun} stroke={C.navy} strokeWidth="2.5" />
      <g transform="translate(196 68)">
        <circle r="30" fill={C.white} stroke={C.navy} strokeWidth="4" />
        <path d="M0 -16 V0 L12 8" stroke={C.navy} strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/** Lab flask and report being scanned. */
export function LabArt({ className }) {
  return (
    <svg viewBox="0 0 260 220" className={className} aria-hidden>
      <circle cx="130" cy="110" r="98" fill={C.skySoft} />
      <g transform="translate(58 40)">
        <rect width="96" height="128" rx="12" fill={C.white} stroke={C.navy} strokeWidth="3" />
        <path d="M18 26 H78 M18 42 H66 M18 58 H72 M18 74 H58" stroke={C.grey} strokeWidth="5" strokeLinecap="round" />
        <rect x="18" y="88" width="34" height="22" rx="5" fill={C.coralSoft} />
        <rect x="-8" y="62" width="112" height="6" rx="3" fill={C.teal} opacity=".85" />
      </g>
      <g transform="translate(160 70)">
        <path d="M14 0 H42 V30 L62 84 C66 96 58 104 46 104 H10 C-2 104 -10 96 -6 84 L14 30Z" fill={C.white} stroke={C.navy} strokeWidth="3" />
        <path d="M-2 76 C14 70 40 82 58 74 L62 84 C66 96 58 104 46 104 H10 C-2 104 -10 96 -6 84Z" fill={C.teal} />
        <circle cx="22" cy="88" r="4" fill={C.white} /><circle cx="36" cy="94" r="3" fill={C.white} />
        <rect x="8" y="-8" width="40" height="10" rx="4" fill={C.navy} />
      </g>
      <Sparkle x={210} y={48} s={0.9} />
    </svg>
  );
}

/** Small family with a heart — auth panel & onboarding. */
export function FamilyArt({ className }) {
  return (
    <svg viewBox="0 0 360 260" className={className} aria-hidden>
      <ellipse cx="180" cy="236" rx="160" ry="16" fill="#ffffff" fillOpacity=".08" />
      <g transform="translate(180 64)">
        <path d="M0 44 C-52 12 -60 -26 -34 -40 C-18 -48 -4 -40 0 -28 C4 -40 18 -48 34 -40 C60 -26 52 12 0 44Z" fill={C.coral} />
        <path d="M-44 -2 H-22 L-14 -18 L-4 14 L6 -10 L12 -2 H44" fill="none" stroke={C.white} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Person x={84} y={170} skin={C.skin1} shirt={C.sky} glasses scale={0.95} />
      <Person x={150} y={176} skin={C.skin2} shirt={C.teal} scale={0.9} />
      <Person x={214} y={184} skin={C.skin2} shirt={C.coral} scale={0.62} bun />
      <Person x={276} y={170} skin={C.skin3} shirt={C.sun} scale={0.95} bun />
      <Sparkle x={300} y={50} s={1} />
      <Sparkle x={52} y={70} s={0.8} fill={C.sky} />
    </svg>
  );
}

/** Generic empty-state art: clipboard with a plus. */
export function EmptyArt({ className }) {
  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden>
      <circle cx="100" cy="82" r="70" fill={C.mint} />
      <rect x="62" y="34" width="76" height="98" rx="10" fill={C.white} stroke={C.navy} strokeWidth="3" />
      <rect x="82" y="26" width="36" height="16" rx="6" fill={C.navy} />
      <path d="M78 70 H122 M78 86 H110" stroke={C.grey} strokeWidth="5" strokeLinecap="round" />
      <circle cx="132" cy="118" r="18" fill={C.teal} stroke={C.navy} strokeWidth="3" />
      <path d="M132 109 V127 M123 118 H141" stroke={C.white} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
