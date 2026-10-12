import { REVEAL_COLS, REVEAL_ROWS, type Note } from '@thevtt/shared';
import { useTable } from '../store/table';

const CELLS = REVEAL_COLS * REVEAL_ROWS;

/** The picture as the players get it: covered pieces painted over like torn parchment. */
export async function maskedImage(src: string, reveal: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, c.width, c.height);
  const cw = c.width / REVEAL_COLS;
  const ch = c.height / REVEAL_ROWS;
  for (let i = 0; i < CELLS; i++) {
    if (reveal[i] === '1') continue;
    const x = (i % REVEAL_COLS) * cw;
    const y = Math.floor(i / REVEAL_COLS) * ch;
    // ragged edges, so the cover looks torn rather than a grid of boxes
    g.beginPath();
    const steps = 6;
    const j = () => (Math.random() - 0.5) * Math.min(cw, ch) * 0.08;
    for (let k = 0; k <= steps; k++) g.lineTo(x + (cw * k) / steps + j(), y + j());
    for (let k = 0; k <= steps; k++) g.lineTo(x + cw + j(), y + (ch * k) / steps + j());
    for (let k = steps; k >= 0; k--) g.lineTo(x + (cw * k) / steps + j(), y + ch + j());
    for (let k = steps; k >= 0; k--) g.lineTo(x + j(), y + (ch * k) / steps + j());
    g.closePath();
    const grad = g.createLinearGradient(x, y, x + cw, y + ch);
    grad.addColorStop(0, '#d9c8a2');
    grad.addColorStop(1, '#bfa877');
    g.fillStyle = grad;
    g.fill();
    g.strokeStyle = 'rgba(90,70,40,0.45)';
    g.lineWidth = 1.5;
    g.stroke();
  }
  return c.toDataURL('image/webp', 0.85);
}

/** GM: which pieces of a handout's picture the players see. */
export function RevealEditor({ note, image }: { note: Note; image: string }) {
  const dispatch = useTable((s) => s.dispatch);
  const reveal = note.reveal ?? null;
  const apply = async (next: string | null) => {
    dispatch({ type: 'note.update', noteId: note.id, patch: { reveal: next } });
    if (next) dispatch({ type: 'asset.add', dataUrl: await maskedImage(image, next), attachTo: { noteShown: note.id } });
  };
  const shown = reveal ? [...reveal].filter((c) => c === '1').length : CELLS;
  return (
    <div className="col reveal-editor" style={{ gap: 6 }}>
      <div className="row between small">
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={!!reveal} onChange={(e) => void apply(e.target.checked ? '0'.repeat(CELLS) : null)} /> Rivela a pezzi
        </label>
        {reveal && (
          <span className="faint tiny">
            {shown} pezzi su {CELLS} visibili ai giocatori
          </span>
        )}
      </div>
      {reveal && (
        <>
          <div className="reveal-wrap">
          <img src={image} alt="" />
          <div className="reveal-grid" style={{ gridTemplateColumns: `repeat(${REVEAL_COLS}, 1fr)` }} role="grid" aria-label="Pezzi della dispensa">
            {[...reveal].map((c, i) => (
              <button
                key={i}
                className={`reveal-cell ${c === '1' ? 'on' : ''}`}
                aria-label={`Pezzo ${i + 1}: ${c === '1' ? 'visibile' : 'coperto'}`}
                aria-pressed={c === '1'}
                onClick={() => void apply(reveal.slice(0, i) + (c === '1' ? '0' : '1') + reveal.slice(i + 1))}
              />
            ))}
          </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" onClick={() => void apply('1'.repeat(CELLS))}>
              Scopri tutto
            </button>
            <button className="btn ghost sm" onClick={() => void apply('0'.repeat(CELLS))}>
              Copri tutto
            </button>
          </div>
          <span className="faint tiny">Clic su un pezzo per scoprirlo o coprirlo. I giocatori ricevono solo i pezzi scoperti, mai l’immagine intera.</span>
        </>
      )}
    </div>
  );
}
