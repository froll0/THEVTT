import { useRef, useState } from 'react';
import { Field, Modal } from '../components/ui';
import { calibrate } from '../lib/calibrate';

export function GridCalibration({ src, onDone, onClose }: { src: string; onDone: (r: { px: number; offsetX: number; offsetY: number }) => void; onClose: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [squares, setSquares] = useState(1);
  const pick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    // in the picture's own pixels
    const p = { x: ((e.clientX - r.left) / r.width) * img.naturalWidth, y: ((e.clientY - r.top) / r.height) * img.naturalHeight };
    setPoints((ps) => (ps.length >= 2 ? [p] : [...ps, p]));
  };
  const result = points.length === 2 ? calibrate(points[0]!, points[1]!, squares) : null;
  const img = imgRef.current;
  const mark = (p: { x: number; y: number }) => (img ? { left: `${(p.x / img.naturalWidth) * 100}%`, top: `${(p.y / img.naturalHeight) * 100}%` } : {});
  return (
    <Modal title="Allinea la griglia" wide onClose={onClose}>
      <div className="col" style={{ gap: 10 }}>
        <p className="small faint">
          Clicca due angoli opposti di un quadretto della mappa. Per più precisione prendi un blocco di quadretti (per esempio 5 × 5) e scrivi quanti sono per lato.
        </p>
        <div className="calibrate-view">
          <div className="calibrate-frame">
            <img ref={imgRef} src={src} alt="La mappa" onClick={pick} draggable={false} />
            {points.map((p, i) => (
              <span key={i} className="calibrate-dot" style={mark(p)} aria-hidden />
            ))}
            {points.length === 2 && img && (
              <span
                className="calibrate-box"
                style={{
                  left: `${(Math.min(points[0]!.x, points[1]!.x) / img.naturalWidth) * 100}%`,
                  top: `${(Math.min(points[0]!.y, points[1]!.y) / img.naturalHeight) * 100}%`,
                  width: `${(Math.abs(points[1]!.x - points[0]!.x) / img.naturalWidth) * 100}%`,
                  height: `${(Math.abs(points[1]!.y - points[0]!.y) / img.naturalHeight) * 100}%`,
                }}
                aria-hidden
              />
            )}
          </div>
        </div>
        <div className="row between wrap" style={{ gap: 8 }}>
          <Field label="Quadretti per lato">
            <input className="input" type="number" min={1} max={50} value={squares} onChange={(e) => setSquares(Math.max(1, Number(e.target.value) || 1))} aria-label="Quadretti per lato" />
          </Field>
          <span className="small" aria-live="polite">
            {points.length < 2 ? `Punto ${points.length + 1} di 2` : result ? `${result.px} pixel per quadretto` : 'Punti troppo vicini'}
          </span>
          <button className="btn primary" disabled={!result} onClick={() => result && onDone(result)}>
            Applica
          </button>
        </div>
      </div>
    </Modal>
  );
}
