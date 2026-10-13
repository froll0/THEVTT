import { newId, parseTable, tableText, type LootItem, type RollTable, type Shop, type ShopItem } from '@thevtt/shared';
import { addCoins, addItem, coinsOf, formatCoins, pay, purse, splitCoins } from '@thevtt/systems';
import { Coins, Dices, EyeOff, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Field, Switch } from '../components/ui';
import { useApp } from '../store/app';
import { useTable } from '../store/table';

/**
 * The GM's random tables, the party's loot and the shops: what's rolled,
 * found and bought at the table, straight onto the sheets.
 */
export function TreasurePanel() {
  const state = useTable((s) => s.state);
  const role = useTable((s) => s.role);
  const [section, setSection] = useState<'tables' | 'loot' | 'shops'>('tables');
  if (!state) return null;
  const isGm = role === 'gm';
  return (
    <div className="panel-body col treasure">
      <div className="seg" role="tablist" aria-label="Sezioni">
        <button role="tab" aria-selected={section === 'tables'} className={section === 'tables' ? 'on' : ''} onClick={() => setSection('tables')}>
          Tabelle
        </button>
        <button role="tab" aria-selected={section === 'loot'} className={section === 'loot' ? 'on' : ''} onClick={() => setSection('loot')}>
          Bottino
        </button>
        <button role="tab" aria-selected={section === 'shops'} className={section === 'shops' ? 'on' : ''} onClick={() => setSection('shops')}>
          Negozi
        </button>
      </div>
      {section === 'tables' && <Tables isGm={isGm} />}
      {section === 'loot' && <Loot isGm={isGm} />}
      {section === 'shops' && <Shops isGm={isGm} />}
    </div>
  );
}

/** The player's own character at this table (where loot and purchases go). */
function useMyCharacter() {
  const state = useTable((s) => s.state);
  const me = useApp((s) => s.user?.id ?? '');
  const id = state?.players[me]?.characterId;
  return id ? state?.characters[id] : undefined;
}

// ---------- random tables ----------

function Tables({ isGm }: { isGm: boolean }) {
  const state = useTable((s) => s.state)!;
  const dispatch = useTable((s) => s.dispatch);
  const [editing, setEditing] = useState<{ id?: string; name: string; text: string; shared: boolean } | null>(null);
  const tables = Object.values(state.tables ?? {}).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const save = () => {
    if (!editing) return;
    const { formula, entries } = parseTable(editing.text);
    dispatch({ type: 'table.save', table: { id: editing.id, name: editing.name.trim() || 'Tabella', formula, entries, shared: editing.shared } });
    setEditing(null);
  };
  if (editing)
    return (
      <div className="col" style={{ gap: 8 }}>
        <Field label="Nome">
          <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Nome della tabella" placeholder="Incontri nel bosco" />
        </Field>
        <Field label="Voci, una per riga">
          <textarea
            className="input mono"
            rows={8}
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            aria-label="Voci della tabella"
            placeholder={'1-3 Una pattuglia di goblin\n4-5 Lupi affamati\n6 Un mercante smarrito'}
          />
        </Field>
        <span className="faint tiny">
          Con i numeri davanti («1-3 …») decidi tu le probabilità; senza numeri, ogni riga vale uno. {editing.text.trim() && `Si tira ${parseTable(editing.text).formula}.`}
        </span>
        <label className="row small" style={{ gap: 8 }}>
          <Switch on={editing.shared} onChange={(v) => setEditing({ ...editing, shared: v })} label="I giocatori la vedono" />I giocatori la vedono e ci tirano
        </label>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn primary" disabled={!editing.text.trim()} onClick={save}>
            Salva
          </button>
          <button className="btn ghost" onClick={() => setEditing(null)}>
            Annulla
          </button>
        </div>
      </div>
    );
  return (
    <div className="col" style={{ gap: 6 }}>
      {isGm && (
        <button className="btn sm" onClick={() => setEditing({ name: '', text: '', shared: false })}>
          <Plus size={14} /> Nuova tabella
        </button>
      )}
      {!tables.length && <p className="faint small">{isGm ? 'Incontri casuali, bottini, nomi, voci di taverna: scrivi le voci e tira con un clic, o con /tabella in una macro.' : 'Il master non ha ancora condiviso tabelle.'}</p>}
      {tables.map((t: RollTable) => (
        <div key={t.id} className="treasure-row" role="group" aria-label={t.name}>
          <div className="col grow" style={{ minWidth: 0 }}>
            <b className="ellipsis">{t.name}</b>
            <span className="faint tiny">
              {t.formula} · {t.entries.length} voci{isGm && !t.shared ? ' · solo tu' : ''}
            </span>
          </div>
          <button className="btn sm" onClick={() => dispatch({ type: 'table.roll', tableId: t.id })} title="Tira, tutti vedono">
            <Dices size={14} /> Tira
          </button>
          <button className="btn ghost sm icon" onClick={() => dispatch({ type: 'table.roll', tableId: t.id, private: true })} title={isGm ? 'Tira di nascosto' : 'Tira: lo vedete solo tu e il master'} aria-label="Tira di nascosto">
            <EyeOff size={14} />
          </button>
          {isGm && (
            <>
              <button className="btn ghost sm icon" aria-label="Modifica" onClick={() => setEditing({ id: t.id, name: t.name, text: tableText(t), shared: t.shared })}>
                <Pencil size={13} />
              </button>
              <button className="btn ghost sm icon" aria-label="Elimina" onClick={() => dispatch({ type: 'table.delete', tableId: t.id })}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- the party's loot ----------

function CoinFields({ systemId, coins, onChange, label }: { systemId: string; coins: Record<string, number>; onChange: (c: Record<string, number>) => void; label: string }) {
  return (
    <div className="row wrap" style={{ gap: 6 }} role="group" aria-label={label}>
      {coinsOf(systemId).map((c) => (
        <Field key={c.key} label={c.short}>
          <input className="input" type="number" min={0} style={{ width: 70 }} aria-label={c.name} title={c.name} value={coins[c.key] ?? 0} onChange={(e) => onChange({ ...coins, [c.key]: Math.max(0, Number(e.target.value) || 0) })} />
        </Field>
      ))}
    </div>
  );
}

function Loot({ isGm }: { isGm: boolean }) {
  const state = useTable((s) => s.state)!;
  const dispatch = useTable((s) => s.dispatch);
  const toast = useApp((s) => s.toast);
  const mine = useMyCharacter();
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const loot = state.loot ?? { coins: {}, items: [] };
  const set = (patch: Partial<typeof loot>, note?: string) => dispatch({ type: 'loot.set', loot: { ...loot, ...patch }, note });
  // the characters of the players at the table
  const sheets = Object.values(state.players)
    .map((p) => (p.characterId ? state.characters[p.characterId] : undefined))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const split = () => {
    if (!sheets.length) return toast('Nessun personaggio al tavolo con cui dividere', 'error');
    const { share, rest } = splitCoins(state.systemId, loot.coins, sheets.length);
    for (const ch of sheets) dispatch({ type: 'character.update', characterId: ch.id, data: addCoins(state.systemId, ch.data, share) });
    set({ coins: rest }, `Monete divise tra ${sheets.length}: ${formatCoins(state.systemId, share)} a testa${Object.keys(rest).length ? `; restano ${formatCoins(state.systemId, rest)}` : ''}`);
  };

  const take = (item: LootItem) => {
    if (!mine && !isGm) return toast('Ti serve un personaggio a questo tavolo', 'error');
    if (mine) dispatch({ type: 'character.update', characterId: mine.id, data: addItem(state.systemId, mine.data, { name: item.name, qty: 1, note: item.note }) });
    dispatch({ type: 'loot.take', itemId: item.id, qty: 1 });
  };

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="col" style={{ gap: 6 }}>
        <b className="small">Monete del gruppo</b>
        {isGm ? <CoinFields systemId={state.systemId} coins={loot.coins} onChange={(coins) => set({ coins })} label="Monete del gruppo" /> : <span>{formatCoins(state.systemId, loot.coins)}</span>}
        {isGm && Object.values(loot.coins).some((v) => v > 0) && (
          <button className="btn sm" onClick={split} title="Una parte uguale sulla scheda di ogni personaggio al tavolo">
            <Coins size={14} /> Dividi tra i personaggi ({sheets.length})
          </button>
        )}
      </div>
      <div className="col" style={{ gap: 6 }}>
        <b className="small">Oggetti</b>
        {!loot.items.length && <span className="faint small">Niente da dividere.</span>}
        {loot.items.map((i) => (
          <div key={i.id} className="treasure-row" role="group" aria-label={i.name}>
            <span className="grow ellipsis">
              {i.qty > 1 && <b>{i.qty} × </b>}
              {i.name}
              {i.note && <span className="faint tiny"> · {i.note}</span>}
            </span>
            {(mine || isGm) && (
              <button className="btn sm" onClick={() => take(i)} title={mine ? 'Sulla tua scheda' : 'Toglilo dal bottino'}>
                Prendi
              </button>
            )}
            {isGm && (
              <button className="btn ghost sm icon" aria-label="Togli" onClick={() => set({ items: loot.items.filter((x) => x.id !== i.id) })}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        {isGm && (
          <div className="row" style={{ gap: 6 }}>
            <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spada lunga +1" aria-label="Oggetto da aggiungere al bottino" />
            <input className="input" type="number" min={1} style={{ width: 60 }} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantità" />
            <button
              className="btn sm"
              disabled={!name.trim()}
              onClick={() => {
                set({ items: [...loot.items, { id: newId(), name: name.trim(), qty }] });
                setName('');
                setQty(1);
              }}
            >
              <Plus size={14} /> Aggiungi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- shops ----------

const priceText = (systemId: string, price: Record<string, number>) => formatCoins(systemId, price).replace('niente', 'gratis');

function ShopEditor({ shop, systemId, onDone }: { shop: Shop | null; systemId: string; onDone: () => void }) {
  const dispatch = useTable((s) => s.dispatch);
  const [draft, setDraft] = useState<Shop>(shop ?? { id: '', name: '', description: '', open: false, items: [] });
  const coin = coinsOf(systemId)[systemId === 'wtow' ? 1 : systemId === 'dnd5e-2024' ? 1 : 0]!;
  const setItem = (id: string, patch: Partial<ShopItem>) => setDraft({ ...draft, items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  return (
    <div className="col" style={{ gap: 8 }}>
      <Field label="Nome">
        <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Nome del negozio" placeholder="Bottega di Ilda" />
      </Field>
      <Field label="Descrizione (facoltativa)">
        <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} aria-label="Descrizione del negozio" />
      </Field>
      <b className="small">Merci (prezzo in {coin.name.toLowerCase()})</b>
      {draft.items.map((i) => (
        <div key={i.id} className="row" style={{ gap: 4 }}>
          <input className="input grow" value={i.name} onChange={(e) => setItem(i.id, { name: e.target.value })} aria-label="Merce" />
          <input className="input" type="number" min={0} step={0.1} style={{ width: 70 }} value={i.price[coin.key] ?? 0} onChange={(e) => setItem(i.id, { price: { [coin.key]: Math.max(0, Number(e.target.value) || 0) } })} aria-label={`Prezzo di ${i.name}`} />
          <input className="input" type="number" min={0} style={{ width: 60 }} value={i.stock ?? ''} placeholder="∞" onChange={(e) => setItem(i.id, { stock: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) })} aria-label={`Quanti ce ne sono di ${i.name}`} title="Vuoto: quanti se ne vuole" />
          <button className="btn ghost sm icon" aria-label="Togli merce" onClick={() => setDraft({ ...draft, items: draft.items.filter((x) => x.id !== i.id) })}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button className="btn ghost sm" onClick={() => setDraft({ ...draft, items: [...draft.items, { id: newId(), name: '', price: { [coin.key]: 1 }, stock: null }] })}>
        <Plus size={14} /> Aggiungi merce
      </button>
      <label className="row small" style={{ gap: 8 }}>
        <Switch on={draft.open} onChange={(v) => setDraft({ ...draft, open: v })} label="Aperto ai giocatori" />
        Aperto ai giocatori
      </label>
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn primary"
          disabled={!draft.name.trim()}
          onClick={() => {
            dispatch({ type: 'shop.save', shop: { ...draft, id: draft.id || undefined, items: draft.items.filter((i) => i.name.trim()) } });
            onDone();
          }}
        >
          Salva
        </button>
        <button className="btn ghost" onClick={onDone}>
          Annulla
        </button>
      </div>
    </div>
  );
}

function Shops({ isGm }: { isGm: boolean }) {
  const state = useTable((s) => s.state)!;
  const dispatch = useTable((s) => s.dispatch);
  const toast = useApp((s) => s.toast);
  const mine = useMyCharacter();
  const [editing, setEditing] = useState<Shop | 'new' | null>(null);
  const shops = Object.values(state.shops ?? {});
  if (editing) return <ShopEditor shop={editing === 'new' ? null : editing} systemId={state.systemId} onDone={() => setEditing(null)} />;

  const buy = (shop: Shop, item: ShopItem) => {
    if (!mine) return toast('Ti serve un personaggio a questo tavolo', 'error');
    const paid = pay(state.systemId, mine.data, item.price);
    if ('error' in paid) return toast(paid.error, 'error');
    dispatch({ type: 'character.update', characterId: mine.id, data: addItem(state.systemId, paid.data, { name: item.name, qty: 1, note: item.note }) });
    dispatch({ type: 'shop.buy', shopId: shop.id, itemId: item.id });
  };

  return (
    <div className="col" style={{ gap: 10 }}>
      {isGm && (
        <button className="btn sm" onClick={() => setEditing('new')}>
          <Plus size={14} /> Nuovo negozio
        </button>
      )}
      {!isGm && mine && <span className="faint tiny">Nella borsa: {formatCoins(state.systemId, purse(state.systemId, mine.data))}</span>}
      {!shops.length && <p className="faint small">{isGm ? 'Un fabbro, una locanda, un mercante: metti le merci e i prezzi, apri il negozio e i giocatori comprano dalla scheda.' : 'Nessun negozio aperto.'}</p>}
      {shops.map((shop) => (
        <div key={shop.id} className="col treasure-shop" role="group" aria-label={shop.name}>
          <div className="row between">
            <b>
              <ShoppingBag size={14} /> {shop.name}
            </b>
            {isGm && (
              <div className="row" style={{ gap: 4 }}>
                <Switch on={shop.open} onChange={(v) => dispatch({ type: 'shop.save', shop: { id: shop.id, name: shop.name, open: v } })} label={`${shop.name} aperto ai giocatori`} />
                <button className="btn ghost sm icon" aria-label="Modifica negozio" onClick={() => setEditing(shop)}>
                  <Pencil size={13} />
                </button>
                <button className="btn ghost sm icon" aria-label="Elimina negozio" onClick={() => dispatch({ type: 'shop.delete', shopId: shop.id })}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
          {shop.description && <span className="faint small">{shop.description}</span>}
          {shop.items.map((i) => (
            <div key={i.id} className="treasure-row" role="group" aria-label={i.name}>
              <span className="grow ellipsis">{i.name}</span>
              <span className="faint small">{priceText(state.systemId, i.price)}</span>
              {i.stock !== null && <span className="faint tiny">({i.stock})</span>}
              {!isGm && (
                <button className="btn sm" disabled={i.stock === 0} onClick={() => buy(shop, i)}>
                  Compra
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
