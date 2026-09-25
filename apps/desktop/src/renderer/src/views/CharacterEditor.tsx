import { describeRoll, roll } from '@thevtt/shared';
import { getSystem, listSystems } from '@thevtt/systems';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, Modal, PageHeader, Popover } from '../components/ui';
import { useApp } from '../store/app';
import { getSystemUi } from '../systems';

type Mode = 'sheet' | 'build';

export function CharacterEditor({ id, systemId: requestedSystem, assignTo }: { id: string | null; systemId?: string; assignTo?: string }) {
  const { characters, api, run, go, upsertCharacter, upsertCampaign, refresh, toast } = useApp();
  const existing = id ? characters.find((c) => c.id === id) : undefined;
  const systems = listSystems();
  const [systemId, setSystemId] = useState<string | undefined>(existing?.systemId ?? requestedSystem ?? (systems.length === 1 ? systems[0]!.id : undefined));
  const system = systemId ? getSystem(systemId) : undefined;
  const ui = systemId ? getSystemUi(systemId) : undefined;
  const initial = useMemo(() => existing?.data ?? system?.createCharacter(), [existing, system]);
  const [data, setData] = useState<unknown>(initial);
  const [mode, setMode] = useState<Mode>(existing && system && !system.validate(existing.data).length ? 'sheet' : 'build');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const savedId = useRef<string | null>(existing?.id ?? null);

  const current = data ?? initial;
  const name = ((current as { name?: string } | undefined)?.name ?? '').trim();
  const issues = system && current ? system.validate(current) : [];

  const persist = async (quiet = false) => {
    if (!system) return;
    const body = { name: name || 'Senza nome', systemId: system.id, data: current };
    const rec = savedId.current ? await api.updateCharacter(savedId.current, body) : await api.createCharacter(body);
    savedId.current = rec.id;
    upsertCharacter(rec);
    setDirty(false);
    if (!quiet) toast(issues.length ? 'Bozza salvata' : 'Personaggio salvato', 'success');
    return rec;
  };

  // in sheet mode, play changes (HP, slots, inventory…) save automatically
  useEffect(() => {
    if (mode !== 'sheet' || !dirty) return;
    const t = setTimeout(() => void persist(true).catch(() => toast('Salvataggio non riuscito', 'error')), 700);
    return () => clearTimeout(t);
  }, [data, mode, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  if (id && !existing) {
    return (
      <div className="page">
        <Empty>Personaggio non trovato.</Empty>
      </div>
    );
  }

  if (!system || !ui) {
    return (
      <div className="page">
        <PageHeader title="Nuovo personaggio" subtitle="Per quale gioco?" />
        <div className="option-grid">
          {systems.map((s) => (
            <button key={s.id} className="option" onClick={() => { setSystemId(s.id); setData(s.createCharacter()); }}>
              <b>{s.name}</b>
              <small>{s.description}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const change = (next: unknown) => {
    setData(next);
    setDirty(true);
  };

  const localRoll = (formula: string, label: string) => {
    try {
      const r = roll(formula);
      toast(`${label}: ${r.total}  (${describeRoll(r).replace(/~(\d+)~/g, '($1)')})`);
    } catch {
      toast(label);
    }
  };

  const finish = () =>
    run(async () => {
      const rec = await persist(true);
      if (!rec) return;
      if (assignTo) {
        upsertCampaign(await api.assignCharacter(assignTo, rec.id));
        await refresh(['characters']);
        go({ name: 'campaign', id: assignTo });
        return;
      }
      if (!issues.length) setMode('sheet');
      toast(issues.length ? 'Bozza salvata' : 'Personaggio salvato', 'success');
    });

  const back = () => go(assignTo ? { name: 'campaign', id: assignTo } : { name: 'characters' });

  return (
    <div className="page wide">
      <button className="back" onClick={back}>
        <ArrowLeft size={14} /> {assignTo ? 'Campagna' : 'Personaggi'}
      </button>
      {mode === 'build' ? (
        <>
          <PageHeader title={name || (existing ? 'Modifica personaggio' : 'Nuovo personaggio')} subtitle={system.name}>
            {existing && !issues.length && (
              <button className="btn ghost" onClick={() => setMode('sheet')}>
                Torna alla scheda
              </button>
            )}
            <button className="btn primary" onClick={finish}>
              {issues.length ? 'Salva bozza' : assignTo ? 'Salva e assegna' : 'Salva'}
            </button>
          </PageHeader>
          <ui.Builder value={current} onChange={change} />
        </>
      ) : (
        <>
          <div className="row end" style={{ marginBottom: 'calc(var(--s6) * -0.6)' }}>
            <span className="faint small">{dirty ? 'Salvataggio…' : 'Salvato'}</span>
            <button className="btn sm" onClick={() => setMode('build')}>
              Modifica scelte
            </button>
            <Popover
              trigger={(_o, toggle) => (
                <button className="btn ghost sm icon" onClick={toggle} aria-label="Altre azioni">
                  <MoreHorizontal size={15} />
                </button>
              )}
            >
              {(close) => (
                <button className="menu-item" style={{ color: 'var(--danger)' }} onClick={() => { close(); setConfirmDelete(true); }}>
                  Elimina personaggio
                </button>
              )}
            </Popover>
          </div>
          <ui.Sheet data={current} editable onChange={change} onRoll={localRoll} />
        </>
      )}
      {confirmDelete && existing && (
        <Modal
          title="Eliminare il personaggio?"
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)}>
                Annulla
              </button>
              <button className="btn danger solid" onClick={() => run(async () => { await api.deleteCharacter(existing.id); await refresh(['characters', 'campaigns']); go({ name: 'characters' }); }, 'Personaggio eliminato')}>
                Elimina
              </button>
            </>
          }
        >
          <p className="muted">«{existing.name}» verrà eliminato definitivamente.</p>
        </Modal>
      )}
    </div>
  );
}
