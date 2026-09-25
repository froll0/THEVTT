import { ArrowDownToLine, Ban, BatteryLow, Biohazard, Brain, EarOff, EyeOff, Ghost, Hand, Heart, Link2, Lock, Moon, Mountain, ShieldAlert, Sparkles, Snowflake, type IconNode } from 'lucide';

/** An icon for each condition, drawn in a badge around the token. */
export const CONDITION_ICONS: Record<string, IconNode> = {
  Accecato: EyeOff,
  Affascinato: Heart,
  Assordato: EarOff,
  Afferrato: Hand,
  Avvelenato: Biohazard,
  Incapacitato: Ban,
  Invisibile: Ghost,
  Paralizzato: Snowflake,
  Pietrificato: Mountain,
  Prono: ArrowDownToLine,
  Spaventato: ShieldAlert,
  Stordito: Sparkles,
  'Privo di sensi': Moon,
  Trattenuto: Link2,
  Indebolimento: BatteryLow,
  Concentrazione: Brain,
};

/** Badge colours by kind: harmful red, control amber, magic violet. */
export const CONDITION_COLORS: Record<string, string> = {
  Concentrazione: '#8b7cf6',
  Invisibile: '#8b7cf6',
  Affascinato: '#d6589a',
  Avvelenato: '#4fa37e',
  Indebolimento: '#b0703a',
};

const svg = (node: IconNode) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('')}</svg>`;

const cache = new Map<string, HTMLImageElement>();

/** Ready-to-draw image of a condition's icon (a generic lock for unknown ones). */
export function conditionImage(name: string, onLoad: () => void): HTMLImageElement | null {
  let img = cache.get(name);
  if (!img) {
    img = new Image();
    img.onload = onLoad;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(CONDITION_ICONS[name] ?? Lock))}`;
    cache.set(name, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
