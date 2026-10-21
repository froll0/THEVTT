import { useId, useMemo } from 'react';

/**
 * Coats of arms drawn from a name: every campaign and character gets its own,
 * always the same. A field (plain or divided), an ordinary, a charge, with the
 * old rule of tinctures (a metal on a colour, a colour on a metal).
 */

const METALS = ['#d9ae4a', '#e9e4d6'];
const COLOURS = ['#8f1d22', '#1f4a86', '#2c6a47', '#5b3784', '#1d1a18', '#a5501c'];

/** FNV-1a: similar names, different arms */
function hash(s: string): number {
  let x = 2166136261;
  for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return x >>> 0;
}
/** a little sequence of choices from one hash */
function picker(seed: number) {
  let s = seed || 1;
  return (n: number) => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    // unsigned: a negative remainder would pick nothing
    return ((s ^ (s >>> 16)) >>> 0) % n;
  };
}

const SHIELD = 'M6 6 H94 V52 C94 86 72 104 50 114 C28 104 6 86 6 52 Z';

const DIVISIONS = ['plain', 'plain', 'plain', 'pale', 'fess', 'bend', 'quarterly', 'chevron', 'saltire'] as const;
const ORDINARIES = ['none', 'none', 'fess', 'pale', 'bend', 'chevron', 'cross', 'chief', 'bordure'] as const;
const CHARGES = ['star', 'crescent', 'crown', 'tower', 'sword', 'sun', 'tree', 'key', 'mountain', 'fleur'] as const;

/** charges, drawn in a 40 × 40 box centred on 0,0 */
const CHARGE_PATHS: Record<(typeof CHARGES)[number], string> = {
  star: 'M0-18 L5-6 L18-6 L8 2 L12 15 L0 7 L-12 15 L-8 2 L-18-6 L-5-6 Z',
  crescent: 'M10-16 A18 18 0 1 0 10 16 A14 14 0 1 1 10-16 Z',
  crown: 'M-16 10 H16 L18-10 L9-2 L0-14 L-9-2 L-18-10 Z M-16 13 H16 V17 H-16 Z',
  tower: 'M-11 18 V-6 H-14 V-16 H-8 V-11 H-3 V-16 H3 V-11 H8 V-16 H14 V-6 H11 V18 Z M-3 18 V8 A3 3 0 0 1 3 8 V18 Z',
  sword: 'M-2-20 H2 V8 H9 V11 H2 V16 A2 2 0 0 1 2 18 H-2 A2 2 0 0 1 -2 16 V11 H-9 V8 H-2 Z',
  sun: 'M0-8 A8 8 0 1 1 0 8 A8 8 0 1 1 0-8 Z M0-19 L3-11 L-3-11 Z M0 19 L3 11 L-3 11 Z M-19 0 L-11 3 L-11-3 Z M19 0 L11 3 L11-3 Z M-13-13 L-6-9 L-9-6 Z M13 13 L6 9 L9 6 Z M13-13 L9-6 L6-9 Z M-13 13 L-9 6 L-6 9 Z',
  tree: 'M0-19 L13 2 H6 L15 12 H3 V19 H-3 V12 H-15 L-6 2 H-13 Z',
  key: 'M-7-14 A7 7 0 1 1 -7 0 A7 7 0 1 1 -7-14 Z M-7-10 A3 3 0 1 0 -7-4 A3 3 0 1 0 -7-10 Z M-1-9 H17 V-5 H14 V0 H10 V-5 H6 V-2 H2 V-5 H-1 Z',
  mountain: 'M-19 15 L-6-8 L0 2 L7-15 L19 15 Z',
  fleur: 'M0-19 C7-11 6-3 2 2 H8 C10-6 18-6 17 2 C16 8 9 8 6 6 H2 V10 H6 V13 H2 V18 H-2 V13 H-6 V10 H-2 V6 H-6 C-9 8 -16 8 -17 2 C-18-6 -10-6 -8 2 H-2 C-6-3 -7-11 0-19 Z',
};

export interface Arms {
  field: string;
  field2: string;
  division: (typeof DIVISIONS)[number];
  ordinary: (typeof ORDINARIES)[number];
  ordinaryTint: string;
  charge: (typeof CHARGES)[number];
  chargeTint: string;
}

export function armsFor(name: string): Arms {
  const pick = picker(hash(name.trim().toLowerCase() || 'thevtt'));
  const metalField = pick(3) === 0;
  const field = metalField ? METALS[pick(2)]! : COLOURS[pick(COLOURS.length)]!;
  // the other half of a divided field: the other kind of tincture
  const field2 = metalField ? COLOURS[pick(COLOURS.length)]! : METALS[pick(2)]!;
  const division = DIVISIONS[pick(DIVISIONS.length)]!;
  const ordinary = division === 'plain' ? ORDINARIES[pick(ORDINARIES.length)]! : 'none';
  const contrast = metalField ? COLOURS[pick(COLOURS.length)]! : METALS[pick(2)]!;
  return { field, field2, division, ordinary, ordinaryTint: contrast, charge: CHARGES[pick(CHARGES.length)]!, chargeTint: division === 'plain' ? contrast : METALS[0]! };
}

function divisionShape(d: Arms['division']): string | null {
  switch (d) {
    case 'pale':
      return 'M50 0 H100 V120 H50 Z';
    case 'fess':
      return 'M0 58 H100 V120 H0 Z';
    case 'bend':
      return 'M0 0 L100 120 H0 Z';
    case 'quarterly':
      return 'M50 0 H100 V58 H50 Z M0 58 H50 V120 H0 Z';
    case 'chevron':
      return 'M0 120 V92 L50 42 L100 92 V120 Z';
    case 'saltire':
      return 'M0 0 L50 58 L0 120 Z M100 0 L50 58 L100 120 Z';
    default:
      return null;
  }
}

function ordinaryShape(o: Arms['ordinary']): string | null {
  switch (o) {
    case 'fess':
      return 'M0 46 H100 V70 H0 Z';
    case 'pale':
      return 'M38 0 H62 V120 H38 Z';
    case 'bend':
      return 'M-10 8 L8-10 L110 102 L92 120 Z';
    case 'chevron':
      return 'M0 96 L50 48 L100 96 V116 L50 68 L0 116 Z';
    case 'cross':
      return 'M40 0 H60 V48 H100 V68 H60 V120 H40 V68 H0 V48 H40 Z';
    case 'chief':
      return 'M0 0 H100 V30 H0 Z';
    default:
      return null;
  }
}

/** A coat of arms on a heater shield, with a little relief. */
export function CoatOfArms({ name, size = 64, className = '' }: { name: string; size?: number; className?: string }) {
  const a = useMemo(() => armsFor(name), [name]);
  const uid = useId().replace(/:/g, '');
  const div = divisionShape(a.division);
  const ord = ordinaryShape(a.ordinary);
  // where the charge sits: on the chief's band, or in the middle
  const chargeAt = a.ordinary === 'chief' ? { x: 50, y: 15, s: 0.62 } : a.ordinary === 'fess' ? { x: 50, y: 90, s: 0.9 } : { x: 50, y: 56, s: a.division === 'plain' ? 1.5 : 1.2 };
  return (
    <svg className={`arms ${className}`} width={size} height={size * 1.2} viewBox="0 0 100 120" role="img" aria-label={`Stemma di ${name}`}>
      <defs>
        <clipPath id={`c${uid}`}>
          <path d={SHIELD} />
        </clipPath>
        <radialGradient id={`l${uid}`} cx="35%" cy="25%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc8c" />
          <stop offset="0.5" stopColor="#b98a2e" />
          <stop offset="1" stopColor="#6e4c16" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width="100" height="120" fill={a.field} />
        {div && <path d={div} fill={a.field2} />}
        {ord && <path d={ord} fill={a.ordinaryTint} />}
        {a.ordinary === 'bordure' && <path d={SHIELD} fill="none" stroke={a.ordinaryTint} strokeWidth="14" />}
        <path d={CHARGE_PATHS[a.charge]} transform={`translate(${chargeAt.x} ${chargeAt.y}) scale(${chargeAt.s})`} fill={a.chargeTint} stroke={a.division === 'plain' ? 'rgb(0 0 0 / 0.35)' : 'rgb(0 0 0 / 0.6)'} strokeWidth={a.division === 'plain' ? 1 : 2.2} paintOrder="stroke" fillRule="evenodd" />
        <rect width="100" height="120" fill={`url(#l${uid})`} />
      </g>
      <path d={SHIELD} fill="none" stroke={`url(#g${uid})`} strokeWidth="4" />
      <path d={SHIELD} fill="none" stroke="rgb(0 0 0 / 0.5)" strokeWidth="1" transform="translate(50 60) scale(0.93) translate(-50 -60)" />
    </svg>
  );
}
