import { getSystem } from '@thevtt/systems';
import { Download, Upload } from 'lucide-react';
import { CharacterCard, NewCard } from '../components/Cards';
import { PageHeader } from '../components/ui';
import { useApp } from '../store/app';

const FORMAT = 'thevtt-character';

export function Portrait({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div className="portrait" style={{ width: size, height: size, backgroundImage: src ? `url(${src})` : undefined, fontSize: size * 0.4 }}>
      {!src && name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function CharactersView() {
  const { characters, go, api, upsertCharacter, toast } = useApp();

  // to another computer, or to a friend: name, system and the whole sheet
  const exportAll = () => {
    const out = { format: FORMAT, version: 1, characters: characters.map((c) => ({ name: c.name, systemId: c.systemId, data: c.data })) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    a.download = characters.length === 1 ? `${characters[0]!.name}.thevtt.json` : 'personaggi-thevtt.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as { characters?: unknown[] } & Record<string, unknown>;
      const list = (Array.isArray(parsed.characters) ? parsed.characters : [parsed]) as { name?: unknown; systemId?: unknown; data?: unknown }[];
      const ok = list.filter((c) => c && typeof c.systemId === 'string' && getSystem(c.systemId) && c.data && typeof c.data === 'object');
      for (const c of ok) {
        const name = String(c.name ?? (c.data as { name?: string }).name ?? 'Senza nome').slice(0, 80);
        upsertCharacter(await api.createCharacter({ name, systemId: c.systemId as string, data: c.data }));
      }
      toast(ok.length ? (ok.length === 1 ? 'Personaggio importato' : `${ok.length} personaggi importati`) : 'Nessun personaggio nel file', ok.length ? 'success' : 'error');
    } catch {
      toast('File non valido', 'error');
    }
  };

  return (
    <div className="page wide">
      <PageHeader title="Personaggi" subtitle="I tuoi eroi, pronti per qualsiasi tavolo.">
        <label className="btn ghost" title="Un file di personaggi esportato da TheVTT">
          <Upload size={14} /> Importa
          <input aria-label="Importa personaggi" type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0]).then(() => (e.target.value = ''))} />
        </label>
        <button className="btn ghost" disabled={!characters.length} onClick={exportAll} title="Salva i tuoi personaggi in un file">
          <Download size={14} /> Esporta
        </button>
        <button className="btn primary" onClick={() => go({ name: 'character', id: null })}>
          Nuovo personaggio
        </button>
      </PageHeader>
      {characters.length ? (
        <div className="tile-grid small">
          {characters.map((c) => (
            <CharacterCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="tile-grid small">
          <NewCard label="Crea il tuo primo eroe" onClick={() => go({ name: 'character', id: null })} />
        </div>
      )}
    </div>
  );
}
