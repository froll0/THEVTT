import { roll, type Campaign } from '@thevtt/shared';
import { free as f } from '@thevtt/systems';
import { Copy, FileDown, FileUp, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Field, Modal } from '../components/ui';
import { FreeSheet, StructureEditor } from '../systems/libero/Sheet';
import { download } from '../table/sceneImage';
import { useApp } from '../store/app';

/** a design as a character, so the sheet and its editor can show it */
const asCharacter = (d: f.SheetDesign): f.FreeCharacter => ({ ...f.createCharacter('vuota'), name: 'Anteprima', concept: d.name, fields: d.fields, rolls: d.rolls });

/**
 * GM, free system: the campaign's own character sheets. Fields, tracks, ticks
 * and rolls arranged by hand, with the sheet as players will see it next to
 * it; the players then start their characters from these.
 */
export function SheetDesigner({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { api, run, upsertCampaign, toast } = useApp();
  const [hb, setHb] = useState<f.FreeHomebrew>(() => f.cleanFreeHomebrew(campaign.homebrew));
  const [openId, setOpenId] = useState<string | null>(hb.sheets[0]?.id ?? null);
  const [from, setFrom] = useState('d20');
  const file = useRef<HTMLInputElement>(null);
  const design = hb.sheets.find((d) => d.id === openId) ?? null;
  const [lastRoll, setLastRoll] = useState<string | null>(null);

  const change = (id: string, patch: Partial<f.SheetDesign>) => setHb((h) => ({ sheets: h.sheets.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  const add = (d: f.SheetDesign) => {
    setHb((h) => ({ sheets: [...h.sheets, d].slice(0, 20) }));
    setOpenId(d.id);
  };
  const save = () =>
    run(async () => {
      upsertCampaign(await api.updateCampaign(campaign.id, { homebrew: f.cleanFreeHomebrew(hb) }));
      onClose();
    }, 'Schede salvate: i giocatori le trovano creando un personaggio');

  return (
    <Modal
      title="Schede della campagna"
      onClose={onClose}
      wide
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={save}>
            Salva
          </button>
        </>
      }
    >
      <div className="designer">
        <aside className="designer-list" aria-label="Le schede">
          {hb.sheets.map((d) => (
            <button key={d.id} className={`designer-item ${d.id === openId ? 'on' : ''}`} onClick={() => setOpenId(d.id)}>
              <b>{d.name}</b>
              <span className="faint tiny">
                {d.fields.length} campi · {d.rolls.length} tiri
              </span>
            </button>
          ))}
          <div className="col" style={{ gap: 4, marginTop: 6 }}>
            <select className="select" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Parti da">
              {f.TEMPLATES.filter((t) => !t.campaign).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button className="btn sm" onClick={() => add(f.designFrom(from, `Scheda ${hb.sheets.length + 1}`))}>
              <Plus size={13} /> Nuova scheda
            </button>
            <button className="btn ghost sm" onClick={() => file.current?.click()}>
              <FileUp size={13} /> Importa
            </button>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                e.target.value = '';
                if (!picked) return;
                try {
                  const raw = JSON.parse(await picked.text());
                  const got = f.cleanFreeHomebrew({ sheets: Array.isArray(raw?.sheets) ? raw.sheets : [raw] }).sheets;
                  if (!got.length) throw new Error();
                  for (const d of got) add({ ...d, id: `${d.id}-${Date.now().toString(36)}` });
                  toast(`${got.length === 1 ? `«${got[0]!.name}» importata` : `${got.length} schede importate`}`, 'success');
                } catch {
                  toast('Questo file non è una scheda di TheVTT', 'error');
                }
              }}
            />
          </div>
          <p className="faint tiny">I giocatori le trovano per prime quando creano un personaggio; quelle già fatte non cambiano.</p>
        </aside>

        {design ? (
          <>
            <section className="designer-edit" aria-label="Struttura della scheda">
              <div className="fields">
                <Field label="Nome della scheda">
                  <input className="input" value={design.name} onChange={(e) => change(design.id, { name: e.target.value.slice(0, 60) })} />
                </Field>
                <Field label="Descrizione">
                  <input className="input" value={design.text} onChange={(e) => change(design.id, { text: e.target.value.slice(0, 300) })} placeholder="Per chi è, cosa si tira" />
                </Field>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn ghost sm" onClick={() => add({ ...design, id: `${design.id}-copia-${Date.now().toString(36)}`, name: `${design.name} (copia)` })}>
                  <Copy size={13} /> Duplica
                </button>
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' }));
                    download(url, `${design.name}.scheda.json`);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  <FileDown size={13} /> Esporta
                </button>
                <div className="grow" />
                <button
                  className="btn ghost sm danger"
                  onClick={() => {
                    setHb((h) => ({ sheets: h.sheets.filter((d) => d.id !== design.id) }));
                    setOpenId(hb.sheets.find((d) => d.id !== design.id)?.id ?? null);
                  }}
                >
                  <Trash2 size={13} /> Elimina
                </button>
              </div>
              <StructureEditor c={asCharacter(design)} set={(patch) => change(design.id, { ...(patch.fields ? { fields: patch.fields } : {}), ...(patch.rolls ? { rolls: patch.rolls } : {}) })} />
            </section>
            <section className="designer-preview" aria-label="Anteprima">
              <span className="faint tiny">Anteprima: i valori che scrivi qui sono quelli di partenza.</span>
              <FreeSheet
                data={asCharacter(design)}
                editable
                design={false}
                onChange={(d) => change(design.id, { fields: f.normalize(d).fields })}
                onRoll={(formula, label) => {
                  try {
                    setLastRoll(`${label}: ${formula} = ${roll(formula).total}`);
                  } catch (e) {
                    setLastRoll(`${label}: ${(e as Error).message}`);
                  }
                }}
              />
              {lastRoll && (
                <p className="small designer-roll" role="status">
                  {lastRoll}
                </p>
              )}
            </section>
          </>
        ) : (
          <p className="muted">Nessuna scheda ancora: creane una partendo da un modello, poi cambiala come vuoi.</p>
        )}
      </div>
    </Modal>
  );
}
