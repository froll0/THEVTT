import { pieceFromRows, type MapPiece } from '@thevtt/shared';

/**
 * Ready-made pieces of map. Ground by rows ('.' leaves what's there),
 * scenery and doors at their cells.
 */
export const STAMPS: MapPiece[] = [
  pieceFromRows(
    'Cella',
    ['rrrrrrr', 'rsssssr', 'rsssssr', 'rsssssr', 'rsssssr', 'rrrrrrr'],
    {
      walls: [{ x1: 3, y1: 5, x2: 4, y2: 5, kind: 'door', locked: true }],
      props: [
        { kind: 'bed', x: 1, y: 1, w: 1, h: 2 },
        { kind: 'barrel', x: 5, y: 1, w: 1, h: 1 },
      ],
    },
  ),
  pieceFromRows('Scalinata', ['rrrrr', 'rsssr', 'rsssr', 'rsssr', 'rsssr', 'r...r'], {
    props: [{ kind: 'stairs', x: 2, y: 1, w: 1, h: 2 }],
  }),
  pieceFromRows(
    'Sala del trono',
    ['rrrrrrrrrrr', 'rtttttttttr', 'rtttttttttr', 'rtttttttttr', 'rtttttttttr', 'rtttttttttr', 'rtttttttttr', 'rtttttttttr', 'rrrrrrrrrrr'],
    {
      walls: [{ x1: 5, y1: 8, x2: 6, y2: 8, kind: 'door' }],
      props: [
        { kind: 'altar', x: 4.5, y: 1.2, w: 2, h: 1 },
        { kind: 'rug', x: 4, y: 2.5, w: 3, h: 5 },
        { kind: 'pillar', x: 2, y: 2, w: 1, h: 1 },
        { kind: 'pillar', x: 8, y: 2, w: 1, h: 1 },
        { kind: 'pillar', x: 2, y: 5, w: 1, h: 1 },
        { kind: 'pillar', x: 8, y: 5, w: 1, h: 1 },
        { kind: 'brazier', x: 1, y: 1, w: 1, h: 1, light: { bright: 2, dim: 4, color: '#ff9e45' } },
        { kind: 'brazier', x: 9, y: 1, w: 1, h: 1, light: { bright: 2, dim: 4, color: '#ff9e45' } },
      ],
    },
  ),
  pieceFromRows('Ponte sul fiume', ['ggqqqqqgg', 'ggqqqqqgg', 'ggqqqqqgg'], {
    props: [{ kind: 'bridge', x: 3, y: 0.95, w: 1, h: 3, rotation: 90 }],
  }),
  pieceFromRows('Accampamento', ['ddddddd', 'ddddddd', 'ddddddd', 'ddddddd', 'ddddddd'], {
    props: [
      { kind: 'tent', x: 0, y: 0, w: 2, h: 2 },
      { kind: 'tent', x: 5, y: 0, w: 2, h: 2 },
      { kind: 'campfire', x: 3, y: 2, w: 1, h: 1, light: { bright: 4, dim: 8, color: '#ffb35c' } },
      { kind: 'cart', x: 0, y: 3, w: 2, h: 3, rotation: 90 },
      { kind: 'barrel', x: 6, y: 4, w: 1, h: 1 },
    ],
  }),
  pieceFromRows('Taverna', ['wwwwwwwww', 'wwwwwwwww', 'wwwwwwwww', 'wwwwwwwww', 'wwwwwwwww', 'wwwwwwwww'], {
    walls: [{ x1: 4, y1: 6, x2: 5, y2: 6, kind: 'door' }],
    props: [
      { kind: 'table', x: 1, y: 1, w: 2, h: 1 },
      { kind: 'table', x: 5, y: 1, w: 2, h: 1 },
      { kind: 'table', x: 1, y: 4, w: 2, h: 1 },
      { kind: 'bookshelf', x: 6, y: 5.6, w: 2, h: 0.4 },
      { kind: 'barrel', x: 8, y: 0, w: 1, h: 1 },
      { kind: 'barrel', x: 8, y: 1, w: 1, h: 1 },
    ],
  }),
];
