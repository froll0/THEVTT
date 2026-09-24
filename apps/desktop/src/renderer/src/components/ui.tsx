import type { UserPublic } from '@thevtt/shared';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../store/app';

export function Avatar({ user, size = 32, presence }: { user: Pick<UserPublic, 'displayName' | 'avatarColor' | 'online'>; size?: number; presence?: boolean }) {
  const initials = user.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, background: user.avatarColor, fontSize: size * 0.38 }} title={user.displayName}>
      {initials}
      {presence && <span className={`presence ${user.online ? 'on' : ''}`} />}
    </div>
  );
}

/** A button that opens a floating panel; closes on outside click or Escape. */
export function Popover({
  trigger,
  children,
  align = 'right',
  width,
}: {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }} className="no-drag">
      {trigger(open, () => setOpen(!open))}
      {open && (
        <div className="popover" style={{ top: 'calc(100% + 6px)', [align]: 0, width }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  actions,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="row between">
          <h2>{title}</h2>
          <button className="btn ghost icon sm" onClick={onClose} aria-label="Chiudi">
            <X size={16} />
          </button>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`} onClick={() => dismiss(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs">
      {options.map((o) => (
        <button type="button" key={o.id} className={o.id === value ? 'active' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Section({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">{title}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Setting({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="setting">
      <div className="text">
        {title}
        {hint && <small>{hint}</small>}
      </div>
      <div className="control">{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="row">{children}</div>
    </div>
  );
}

/** Reads an image file as a data URL, downscaling very large maps. */
export async function readImage(file: File, maxSide = 4096): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/webp', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}
