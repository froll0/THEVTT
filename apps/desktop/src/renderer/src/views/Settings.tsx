import { Download, LogOut, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Avatar, PageHeader, Switch, Tabs } from '../components/ui';
import { bridge } from '../lib/platform';
import { useApp } from '../store/app';
import { exportSettings, PRESETS, useSettings, type Settings } from '../store/settings';

const ACCENTS = ['#c9a227', '#e4572e', '#ef476f', '#b388eb', '#8b7cf6', '#3d85c6', '#2f6fed', '#06b6d4', '#5fb58a', '#39d353'];
const AVATAR_COLORS = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#b388eb', '#ef476f', '#06d6a0', '#ffd166'];

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
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

type Section = 'appearance' | 'layout' | 'table' | 'account' | 'advanced';

export function SettingsView() {
  const s = useSettings();
  const { user, api, run, setUser, logout, serverUrl } = useApp();
  const [section, setSection] = useState<Section>('appearance');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [css, setCss] = useState(s.customCss);
  const [info, setInfo] = useState<{ version: string; dataDir: string } | null>(null);

  useEffect(() => {
    void bridge?.info().then(setInfo);
  }, []);

  const exportTheme = () => {
    const blob = new Blob([exportSettings(s)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'thevtt-tema.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importTheme = (file: File) =>
    run(async () => {
      s.importJson(await file.text());
      setCss(useSettings.getState().customCss);
    }, 'Tema importato');

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHeader title="Impostazioni" subtitle="Rendi TheVTT tuo: ogni dettaglio si può cambiare." />
      <Tabs<Section>
        value={section}
        onChange={setSection}
        options={[
          { id: 'appearance', label: 'Aspetto' },
          { id: 'layout', label: 'Layout' },
          { id: 'table', label: 'Tavolo' },
          { id: 'account', label: 'Account' },
          { id: 'advanced', label: 'Avanzate' },
        ]}
      />

      {section === 'appearance' && (
        <>
          <div className="section">
            <div className="section-title">Temi</div>
            <div className="option-grid">
              {PRESETS.map((p) => {
                const active = p.patch.accent === s.accent && p.patch.theme === s.theme && p.patch.font === s.font;
                return (
                  <button key={p.id} className={`option ${active ? 'on' : ''}`} onClick={() => s.set(p.patch)}>
                    <div className="row">
                      <span className="swatch" style={{ background: p.patch.accent, cursor: 'inherit' }} />
                      <b>{p.name}</b>
                    </div>
                    <small>{p.patch.theme === 'light' ? 'Chiaro' : 'Scuro'}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="list">
            <Row title="Modalità">
              <Tabs<Settings['theme']>
                value={s.theme}
                onChange={(theme) => s.set({ theme })}
                options={[
                  { id: 'dark', label: 'Scura' },
                  { id: 'light', label: 'Chiara' },
                  { id: 'system', label: 'Sistema' },
                ]}
              />
            </Row>
            <Row title="Colore d'accento">
              <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                {ACCENTS.map((c) => (
                  <button key={c} className={`swatch ${s.accent === c ? 'on' : ''}`} style={{ background: c }} onClick={() => s.set({ accent: c })} aria-label={c} />
                ))}
                <input type="color" value={s.accent} onChange={(e) => s.set({ accent: e.target.value })} />
              </div>
            </Row>
            <Row title="Carattere">
              <select className="select" style={{ width: 200 }} value={s.font} onChange={(e) => s.set({ font: e.target.value as Settings['font'] })}>
                <option value="sans">Moderno</option>
                <option value="rounded">Arrotondato</option>
                <option value="serif">Classico (serif)</option>
                <option value="mono">Monospace</option>
              </select>
            </Row>
            <Row title="Dimensione interfaccia" hint={`${Math.round(s.uiScale * 100)}%`}>
              <input type="range" min={0.8} max={1.3} step={0.05} value={s.uiScale} onChange={(e) => s.set({ uiScale: Number(e.target.value) })} />
            </Row>
            <Row title="Arrotondamento angoli" hint={`${s.radius}px`}>
              <input type="range" min={0} max={20} step={1} value={s.radius} onChange={(e) => s.set({ radius: Number(e.target.value) })} />
            </Row>
            <Row title="Densità">
              <Tabs<Settings['density']>
                value={s.density}
                onChange={(density) => s.set({ density })}
                options={[
                  { id: 'compact', label: 'Compatta' },
                  { id: 'comfortable', label: 'Normale' },
                  { id: 'spacious', label: 'Ariosa' },
                ]}
              />
            </Row>
            <Row title="Pannelli traslucidi" hint="Effetto vetro sui pannelli del tavolo">
              <Switch on={s.glass} onChange={(glass) => s.set({ glass })} />
            </Row>
            <Row title="Riduci animazioni">
              <Switch on={s.reduceMotion} onChange={(reduceMotion) => s.set({ reduceMotion })} />
            </Row>
          </div>
        </>
      )}

      {section === 'layout' && (
        <div className="list">
          <Row title="Barra laterale">
            <Tabs
              value={s.sidebarPosition}
              onChange={(sidebarPosition) => s.set({ sidebarPosition })}
              options={[
                { id: 'left', label: 'Sinistra' },
                { id: 'right', label: 'Destra' },
              ]}
            />
          </Row>
          <Row title="Barra laterale compatta" hint="Mostra solo le icone">
            <Switch on={s.sidebarCollapsed} onChange={(sidebarCollapsed) => s.set({ sidebarCollapsed })} />
          </Row>
          <Row title="Pannello del tavolo" hint="Chat, iniziativa, scheda">
            <Tabs
              value={s.dockPosition}
              onChange={(dockPosition) => s.set({ dockPosition })}
              options={[
                { id: 'left', label: 'Sinistra' },
                { id: 'right', label: 'Destra' },
              ]}
            />
          </Row>
        </div>
      )}

      {section === 'table' && (
        <div className="list">
          <Row title="Sfondo del tavolo">
            <input type="color" value={s.board.background} onChange={(e) => s.setBoard({ background: e.target.value })} />
          </Row>
          <Row title="Colore griglia">
            <input type="color" value={s.board.gridColor} onChange={(e) => s.setBoard({ gridColor: e.target.value })} />
          </Row>
          <Row title="Opacità griglia" hint={`${Math.round(s.board.gridOpacity * 100)}%`}>
            <input type="range" min={0} max={0.6} step={0.02} value={s.board.gridOpacity} onChange={(e) => s.setBoard({ gridOpacity: Number(e.target.value) })} />
          </Row>
          <Row title="Nomi dei token">
            <Tabs
              value={s.board.tokenNames}
              onChange={(tokenNames) => s.setBoard({ tokenNames })}
              options={[
                { id: 'always', label: 'Sempre' },
                { id: 'hover', label: 'Al passaggio' },
                { id: 'never', label: 'Mai' },
              ]}
            />
          </Row>
          <Row title="Barre dei punti ferita">
            <Switch on={s.board.hpBars} onChange={(hpBars) => s.setBoard({ hpBars })} />
          </Row>
        </div>
      )}

      {section === 'account' && user && (
        <div className="list">
          <Row title="Nome visualizzato">
            <input className="input" style={{ width: 200 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <button className="btn" disabled={!displayName.trim() || displayName === user.displayName} onClick={() => run(async () => setUser(await api.updateMe({ displayName })), 'Salvato')}>
              Salva
            </button>
          </Row>
          <Row title="Colore avatar" hint="Usato anche per i tuoi token e i ping">
            <Avatar user={user} size={26} />
            {AVATAR_COLORS.map((c) => (
              <button key={c} className={`swatch ${user.avatarColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => run(async () => setUser(await api.updateMe({ avatarColor: c })))} aria-label={c} />
            ))}
          </Row>
          <Row title="Server" hint="Server social e di relay">
            <span className="mono small muted">{serverUrl}</span>
          </Row>
          <Row title="Esci dall'account">
            <button className="btn danger" onClick={() => void logout()}>
              <LogOut size={15} /> Esci
            </button>
          </Row>
        </div>
      )}

      {section === 'advanced' && (
        <>
          <div className="list">
            <Row title="Esporta tema" hint="Condividi il tuo stile con gli amici">
              <button className="btn" onClick={exportTheme}>
                <Download size={15} /> Esporta
              </button>
            </Row>
            <Row title="Importa tema">
              <label className="btn">
                <Upload size={15} /> Importa
                <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importTheme(e.target.files[0])} />
              </label>
            </Row>
            <Row title="Ripristina impostazioni">
              <button className="btn" onClick={() => { s.reset(); setCss(''); }}>
                <RotateCcw size={15} /> Ripristina
              </button>
            </Row>
            {info && (
              <Row title="Dati locali" hint="Qui vengono salvati i tavoli che ospiti">
                <span className="mono small muted ellipsis" style={{ maxWidth: 320 }}>{info.dataDir}</span>
              </Row>
            )}
          </div>
          <div className="section">
            <div className="section-title">CSS personalizzato</div>
            <p className="muted small">
              Sovrascrivi qualsiasi stile. Variabili utili: <code>--accent</code>, <code>--bg</code>, <code>--bg-elev</code>, <code>--fg</code>, <code>--radius</code>, <code>--font</code>.
            </p>
            <textarea className="textarea mono" rows={10} value={css} onChange={(e) => setCss(e.target.value)} placeholder={':root { --bg: #0b0b12; }\n.sidebar { backdrop-filter: blur(8px); }'} />
            <div className="row">
              <button className="btn primary" onClick={() => s.set({ customCss: css })}>Applica</button>
              {css !== s.customCss && <span className="faint small">Modifiche non applicate</span>}
            </div>
          </div>
        </>
      )}
      {info && <p className="faint small">TheVTT v{info.version}</p>}
    </div>
  );
}
