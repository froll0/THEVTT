import { Minus, Square, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useWindows, type FloatWin } from '../store/windows';

const MIN_W = 320;
const MIN_H = 200;

/** A minimised window: a pill in the tray at the bottom of the board. */
export function MinimizedWindow({ win }: { win: FloatWin }) {
  const { close, toggleMinimized } = useWindows();
  return (
    <div className="fwin-pill" role="dialog" aria-label={win.title}>
      <button className="pill-title ellipsis" onClick={() => toggleMinimized(win.id)} title="Espandi" aria-label="Espandi">
        <Square size={11} /> <span className="ellipsis">{win.title}</span>
      </button>
      <button className="btn ghost sm icon" onClick={() => close(win.id)} aria-label="Chiudi finestra" title="Chiudi">
        <X size={13} />
      </button>
    </div>
  );
}

/** A window over the table: drag by the title, resize from the corner, minimise to the tray. */
export function FloatingWindow({ win, children }: { win: FloatWin; children: ReactNode }) {
  const { update, close, focus, toggleMinimized } = useWindows();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: 'move' | 'resize'; sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const parent = ref.current?.parentElement?.getBoundingClientRect();
      const pw = parent?.width ?? window.innerWidth;
      const ph = parent?.height ?? window.innerHeight;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (d.kind === 'move') {
        // keep at least the title bar reachable
        update(win.id, { x: Math.round(Math.max(-d.w + 120, Math.min(pw - 120, d.x + dx))), y: Math.round(Math.max(0, Math.min(ph - 36, d.y + dy))) });
      } else {
        update(win.id, { w: Math.round(Math.max(MIN_W, Math.min(pw - d.x, d.w + dx))), h: Math.round(Math.max(MIN_H, Math.min(ph - d.y, d.h + dy))) });
      }
    };
    const up = () => {
      drag.current = null;
      document.body.classList.remove('dragging-window');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [win.id, update]);

  const start = (kind: 'move' | 'resize') => (e: React.PointerEvent) => {
    if (e.button !== 0 || (kind === 'move' && (e.target as HTMLElement).closest('button'))) return;
    e.preventDefault();
    focus(win.id);
    drag.current = { kind, sx: e.clientX, sy: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h };
    document.body.classList.add('dragging-window');
  };

  return (
    <div
      ref={ref}
      className={`fwin ${win.minimized ? 'min' : ''}`}
      style={{ left: win.x, top: win.y, width: win.minimized ? Math.min(win.w, 280) : win.w, height: win.minimized ? undefined : win.h, zIndex: win.z }}
      onPointerDown={() => focus(win.id)}
      role="dialog"
      aria-label={win.title}
    >
      <div className="fwin-bar" onPointerDown={start('move')} onDoubleClick={() => toggleMinimized(win.id)}>
        <span className="ellipsis grow">{win.title}</span>
        <button className="btn ghost sm icon" onClick={() => toggleMinimized(win.id)} aria-label={win.minimized ? 'Espandi' : 'Riduci'} title={win.minimized ? 'Espandi' : 'Riduci'}>
          {win.minimized ? <Square size={12} /> : <Minus size={13} />}
        </button>
        <button className="btn ghost sm icon" onClick={() => close(win.id)} aria-label="Chiudi finestra" title="Chiudi">
          <X size={14} />
        </button>
      </div>
      {!win.minimized && (
        <>
          <div className="fwin-body">{children}</div>
          <div className="fwin-resize" onPointerDown={start('resize')} aria-hidden />
        </>
      )}
    </div>
  );
}
