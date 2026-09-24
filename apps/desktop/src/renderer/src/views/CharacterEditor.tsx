import { getSystem, listSystems } from '@thevtt/systems';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Empty, Modal, PageHeader } from '../components/ui';
import { useApp } from '../store/app';
import { getSystemUi } from '../systems';

export function CharacterEditor({ id, systemId: requestedSystem, assignTo }: { id: string | null; systemId?: string; assignTo?: string }) {
  const { characters, api, run, go, upsertCharacter, upsertCampaign, refresh } = useApp();
  const existing = id ? characters.find((c) => c.id === id) : undefined;
  const systems = listSystems();
  const [systemId, setSystemId] = useState<string | undefined>(existing?.systemId ?? requestedSystem ?? (systems.length === 1 ? systems[0]!.id : undefined));
  const system = systemId ? getSystem(systemId) : undefined;
  const ui = systemId ? getSystemUi(systemId) : undefined;
  const initial = useMemo(() => existing?.data ?? system?.createCharacter(), [existing, system]);
  const [data, setData] = useState<unknown>(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (id && !existing) return <div className="page"><Empty>Personaggio non trovato.</Empty></div>;

  if (!system || !ui) {
    return (
      <div className="page">
        <PageHeader title="Nuovo personaggio" subtitle="Per quale sistema di gioco?" />
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

  const current = data ?? initial;
  const name = ((current as { name?: string }).name ?? '').trim();
  const issues = system.validate(current);

  const save = () =>
    run(async () => {
      const body = { name: name || 'Senza nome', systemId: system.id, data: current };
      const rec = existing ? await api.updateCharacter(existing.id, body) : await api.createCharacter(body);
      upsertCharacter(rec);
      if (assignTo) {
        upsertCampaign(await api.assignCharacter(assignTo, rec.id));
        await refresh(['characters']);
        go({ name: 'campaign', id: assignTo });
      } else go({ name: 'characters' });
    }, issues.length ? 'Salvato come bozza' : 'Personaggio salvato');

  return (
    <div className="page">
      <button className="btn ghost sm" style={{ width: 'fit-content' }} onClick={() => go(assignTo ? { name: 'campaign', id: assignTo } : { name: 'characters' })}>
        <ArrowLeft size={14} /> Indietro
      </button>
      <PageHeader title={name || (existing ? 'Personaggio' : 'Nuovo personaggio')} subtitle={system.name}>
        {existing && (
          <button className="btn ghost danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} /> Elimina
          </button>
        )}
        <button className="btn primary" onClick={save}>
          <Save size={15} /> Salva{issues.length ? ' bozza' : ''}
        </button>
      </PageHeader>
      <ui.Builder value={current} onChange={setData} />
      {confirmDelete && existing && (
        <Modal
          title="Eliminare il personaggio?"
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)}>Annulla</button>
              <button
                className="btn primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}
                onClick={() => run(async () => { await api.deleteCharacter(existing.id); await refresh(['characters', 'campaigns']); go({ name: 'characters' }); }, 'Personaggio eliminato')}
              >
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
