import { listSystems } from '@thevtt/systems';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Empty, Field, Modal, PageHeader } from '../components/ui';
import { useApp } from '../store/app';
import { CampaignCard } from './Home';

export function CampaignsView() {
  const { campaigns, user, api, run, upsertCampaign, go } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const systems = listSystems();
  const [systemId, setSystemId] = useState(systems[0]?.id ?? '');

  const mine = campaigns.filter((c) => c.gmId === user?.id);
  const joined = campaigns.filter((c) => c.gmId !== user?.id);

  const create = () =>
    run(async () => {
      const c = await api.createCampaign({ name, description, systemId });
      upsertCampaign(c);
      setCreating(false);
      setName('');
      setDescription('');
      go({ name: 'campaign', id: c.id });
    }, 'Campagna creata');

  return (
    <div className="page">
      <PageHeader title="Campagne" subtitle="Le avventure che guidi e quelle a cui partecipi.">
        <button className="btn primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nuova campagna
        </button>
      </PageHeader>

      <section className="section">
        <div className="section-title">Come master</div>
        {mine.length ? (
          <div className="grid">{mine.map((c) => <CampaignCard key={c.id} c={c} />)}</div>
        ) : (
          <Empty>Non guidi ancora nessuna campagna.</Empty>
        )}
      </section>
      <section className="section">
        <div className="section-title">Come giocatore</div>
        {joined.length ? (
          <div className="grid">{joined.map((c) => <CampaignCard key={c.id} c={c} />)}</div>
        ) : (
          <Empty>Quando un amico ti invita, la campagna comparirà qui.</Empty>
        )}
      </section>

      {creating && (
        <Modal
          title="Nuova campagna"
          onClose={() => setCreating(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setCreating(false)}>
                Annulla
              </button>
              <button className="btn primary" disabled={!name.trim() || !systemId} onClick={create}>
                Crea
              </button>
            </>
          }
        >
          <Field label="Nome">
            <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="La maledizione di…" />
          </Field>
          <Field label="Descrizione">
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Sistema di gioco">
            <select className="select" value={systemId} onChange={(e) => setSystemId(e.target.value)}>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="faint small">{systems.find((s) => s.id === systemId)?.description}</p>
        </Modal>
      )}
    </div>
  );
}
