import { CharacterCard, NewCard } from '../components/Cards';
import { PageHeader } from '../components/ui';
import { useApp } from '../store/app';

export function Portrait({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div className="portrait" style={{ width: size, height: size, backgroundImage: src ? `url(${src})` : undefined, fontSize: size * 0.4 }}>
      {!src && name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function CharactersView() {
  const { characters, go } = useApp();
  return (
    <div className="page wide">
      <PageHeader title="Personaggi" subtitle="I tuoi eroi, pronti per qualsiasi tavolo.">
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
