import { useMemo } from 'react';

/**
 * A landscape for the big moments (the first screen, the home, a campaign
 * without a picture): a sky, the moon (the sun on parchment), three ranges of
 * mountains, a castle on a crag, pines and mist. Colours come from the theme
 * (--scene-*), so it is a night in the tavern and a dawn on parchment.
 */

/** the same stars every time, from a seed */
function stars(seed: number, n: number) {
  let s = seed;
  const r = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32);
  return Array.from({ length: n }, () => ({ x: r() * 1600, y: r() * 300, r: 0.4 + r() * 1.3, o: 0.3 + r() * 0.7, d: r() * 6 }));
}

/** a ridge from left to right: smooth peaks */
function ridge(seed: number, base: number, amp: number, step: number) {
  let s = seed;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  let d = `M0 500 L0 ${base}`;
  for (let x = 0; x <= 1600 + step; x += step) {
    const y = base - r() * amp;
    const cx = x - step / 2;
    d += ` Q${cx} ${y - amp * 0.35} ${x} ${y}`;
  }
  return `${d} L1600 500 Z`;
}

/** pines along a slope */
function pines(seed: number, from: number, to: number, baseY: (x: number) => number, n: number) {
  let s = seed;
  const r = () => ((s = (Math.imul(s, 22695477) + 1) >>> 0) / 2 ** 32);
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = from + r() * (to - from);
    const h = 18 + r() * 26;
    const y = baseY(x);
    d += `M${x} ${y - h} L${x + h * 0.32} ${y} L${x - h * 0.32} ${y} Z `;
  }
  return d;
}

export function Scenery({ className = '', seed = 7, castle = true }: { className?: string; seed?: number; castle?: boolean }) {
  const sky = useMemo(() => stars(seed * 97 + 3, 90), [seed]);
  const far = useMemo(() => ridge(seed * 31 + 1, 300, 120, 140), [seed]);
  const mid = useMemo(() => ridge(seed * 17 + 5, 370, 90, 110), [seed]);
  const near = useMemo(() => ridge(seed * 13 + 9, 430, 50, 90), [seed]);
  const trees = useMemo(() => pines(seed * 7 + 2, 0, 1600, () => 445, 70), [seed]);
  return (
    <svg className={`scenery ${className}`} viewBox="0 0 1600 500" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--scene-sky-top)" />
          <stop offset="0.75" stopColor="var(--scene-sky-bottom)" />
        </linearGradient>
        <radialGradient id="scene-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--scene-moon)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--scene-moon)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="scene-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--scene-mist)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--scene-mist)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--scene-mist)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="500" fill="url(#scene-sky)" />
      <g className="scenery-stars">
        {sky.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--scene-star)" opacity={s.o} style={{ animationDelay: `${s.d}s` }} />
        ))}
      </g>
      <circle cx="1040" cy="165" r="150" fill="url(#scene-glow)" />
      {/* a crescent at night (a disc with its shadow cut out), the full sun at dawn */}
      <mask id="scene-crescent-cut">
        <rect width="1600" height="500" fill="#fff" />
        <circle cx="1058" cy="153" r="35" fill="#000" />
      </mask>
      <circle cx="1040" cy="165" r="40" fill="var(--scene-moon)" mask="url(#scene-crescent-cut)" className="scenery-moon" />
      <circle cx="1040" cy="165" r="44" fill="var(--scene-moon)" className="scenery-sun" />
      <path d={far} fill="var(--scene-far)" />
      <rect className="scenery-mist slow" x="-200" y="270" width="2000" height="80" fill="url(#scene-mist)" />
      <path d={mid} fill="var(--scene-mid)" />
      {castle && (
        <g fill="var(--scene-mid)" transform="translate(560 222)">
          {/* a crag, a keep, two towers, a curtain wall, a lit window */}
          <path d="M-60 140 L-20 60 L60 40 L130 70 L170 140 Z" />
          <path d="M-8 60 V-10 H-14 V-28 H-6 V-20 H2 V-28 H10 V-20 H18 V-28 H26 V-10 H20 V60 Z" />
          <path d="M40 60 V-58 L52 -82 L64 -58 V60 Z" />
          <path d="M82 70 V-6 H76 V-22 H84 V-14 H92 V-22 H100 V-14 H108 V-22 H114 V-6 H108 V70 Z" />
          <path d="M20 30 H82 V12 H76 V4 H70 V12 H62 V4 H56 V12 H48 V4 H42 V12 H34 V4 H28 V12 H20 Z" />
          <rect x="49" y="-40" width="6" height="10" rx="3" fill="var(--scene-window)" className="scenery-window" />
          <rect x="2" y="8" width="5" height="8" rx="2.5" fill="var(--scene-window)" className="scenery-window late" />
        </g>
      )}
      <rect className="scenery-mist" x="-200" y="350" width="2000" height="90" fill="url(#scene-mist)" />
      <path d={near} fill="var(--scene-near)" />
      <path d={trees} fill="var(--scene-near)" />
      <rect y="440" width="1600" height="60" fill="var(--scene-near)" />
    </svg>
  );
}
