/**
 * Who's who in the campaign: characters, NPCs, factions and places, and the
 * ties between them («serve», «odia», «deve un favore a»). Factions keep the
 * party's standing with them. Players see what the GM made visible.
 */
export type RelationKind = 'png' | 'pg' | 'fazione' | 'luogo';

export interface RelationNode {
  id: string;
  name: string;
  kind: RelationKind;
  note: string;
  color: string;
  /** factions: the party's standing, -3 (nemici giurati) to +3 (alleati) */
  standing?: number;
  visible: boolean;
}

export interface RelationLink {
  id: string;
  from: string;
  to: string;
  label: string;
  visible: boolean;
}

export interface Relations {
  nodes: Record<string, RelationNode>;
  links: Record<string, RelationLink>;
}

export const STANDINGS: Record<number, string> = {
  [-3]: 'Nemici giurati',
  [-2]: 'Ostili',
  [-1]: 'Diffidenti',
  0: 'Neutrali',
  1: 'Amichevoli',
  2: 'Alleati',
  3: 'Devoti',
};

export const standingLabel = (n: number | undefined) => STANDINGS[Math.max(-3, Math.min(3, Math.round(n ?? 0)))]!;

/** What a player sees: visible nodes, and visible links between visible nodes. */
export function visibleRelations(r: Relations | undefined): Relations {
  if (!r) return { nodes: {}, links: {} };
  const nodes = Object.fromEntries(Object.entries(r.nodes).filter(([, n]) => n.visible));
  const links = Object.fromEntries(Object.entries(r.links).filter(([, l]) => l.visible && nodes[l.from] && nodes[l.to]));
  return { nodes, links };
}

/** Where to draw each node: in a circle, factions and places inside, people around. */
export function relationLayout(nodes: RelationNode[], w: number, h: number): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const inner = nodes.filter((n) => n.kind === 'fazione' || n.kind === 'luogo');
  const outer = nodes.filter((n) => n.kind !== 'fazione' && n.kind !== 'luogo');
  const cx = w / 2;
  const cy = h / 2;
  const ring = (list: RelationNode[], r: number, phase: number) =>
    list.forEach((n, i) => {
      const a = phase + (i / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2;
      out[n.id] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
  const R = Math.min(w, h) / 2 - 40;
  if (!outer.length) ring(inner, inner.length > 1 ? R * 0.6 : 0, 0);
  else if (!inner.length) ring(outer, outer.length > 1 ? R : 0, 0);
  else {
    ring(inner, inner.length > 1 ? R * 0.38 : 0, 0);
    ring(outer, R, Math.PI / Math.max(2, outer.length));
  }
  return out;
}
