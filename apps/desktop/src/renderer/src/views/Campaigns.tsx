import { listSystems } from '@thevtt/systems';
import { useState } from 'react';
import { Empty, Field, Modal, PageHeader, Section } from '../components/ui';
import { useApp } from '../store/app';
import { CampaignCard, NewCard } from '../components/Cards';

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
    });

  return (
    <div className="page wide">
      <PageHeader title="Campagne" subtitle="Quelle che guidi e quelle a cui partecipi.">
        <button className="btn primary" onClick={() => setCreating(true)}>
          Nuova campagna
        </button>
      </PageHeader>

      <Section title="Come master">
        <div className="tile-grid">
          {mine.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
          {mine.length === 0 && <NewCard label="La tua prima campagna" onClick={() => setCreating(true)} />}
        </div>
      </Section>
      <Section title="Come giocatore">
        {joined.length ? (
          <div className="tile-grid">
            {joined.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <Empty>Quando un amico ti invita, la campagna comparirà qui.</Empty>
        )}
      </Section>

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
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Due righe per i giocatori: tono, ambientazione, orari."
            />
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
        </Modal>
      )}
    </div>
  );
}
