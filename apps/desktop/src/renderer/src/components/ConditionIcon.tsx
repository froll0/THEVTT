import { ArrowDownToLine, Ban, BatteryLow, Biohazard, Brain, EarOff, EyeOff, Ghost, Hand, Heart, Link2, Lock, Moon, Mountain, ShieldAlert, Snowflake, Sparkles, type LucideIcon } from 'lucide-react';

/** Same icons as the badges on the map (table/conditionIcons.ts). */
const ICONS: Record<string, LucideIcon> = {
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

export function ConditionIcon({ name, size = 12 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Lock;
  return <Icon size={size} aria-hidden />;
}
