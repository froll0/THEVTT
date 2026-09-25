import type { MusicState } from '@thevtt/shared';
import { Music, Pause, Play, Plus, Repeat, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Popover } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';

/** One audio element for the whole table: the panel and the top bar chip read it. */
let audio: HTMLAudioElement | null = null;
const getAudio = () => (audio ??= new Audio());

/** Where the track should be now, in seconds, following the host's clock. */
export function expectedPosition(m: MusicState, clockOffset: number, now = Date.now()): number {
  return m.playing ? m.position + (now + clockOffset - m.startedAt) / 1000 : m.position;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/**
 * Headless player mounted on the table for everyone: follows the shared music
 * state, corrects drift, and on the GM's machine moves to the next track.
 */
export function MusicPlayer() {
  const music = useTable((s) => s.state?.music);
  const assets = useTable((s) => s.assets);
  const offset = useTable((s) => s.clockOffset);
  const isGm = useTable((s) => s.role === 'gm');
  const volume = useSettings((s) => s.musicVolume);
  const latest = useRef(music);
  latest.current = music;
  const track = music?.tracks.find((t) => t.id === music.current);
  const src = track ? assets[track.asset] : undefined;

  useEffect(() => {
    getAudio().volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  useEffect(() => {
    const a = getAudio();
    return () => {
      a.pause();
      a.removeAttribute('src');
      delete a.dataset.asset;
      a.load();
    };
  }, []);

  useEffect(() => {
    const a = getAudio();
    if (!music || !track || !src) {
      a.pause();
      return;
    }
    if (a.dataset.asset !== track.asset) {
      a.src = src;
      a.dataset.asset = track.asset;
    }
    a.loop = music.loop;
    const sync = () => {
      const m = latest.current;
      if (!m) return;
      const dur = a.duration;
      let pos = expectedPosition(m, offset);
      const finished = Number.isFinite(dur) && !m.loop && pos >= dur;
      if (Number.isFinite(dur) && dur > 0) pos = m.loop ? pos % dur : Math.min(pos, dur);
      // small drift is fine, a jump is worse than being half a second late
      if (Math.abs(a.currentTime - pos) > 1) a.currentTime = pos;
      if (m.playing && !finished) void a.play().catch(() => undefined);
      else a.pause();
    };
    if (a.readyState >= 1) sync();
    else a.addEventListener('loadedmetadata', sync, { once: true });
    const timer = setInterval(sync, 4000);
    return () => {
      clearInterval(timer);
      a.removeEventListener('loadedmetadata', sync);
    };
  }, [music, track, src, offset]);

  // the host moves the playlist along when a track ends
  useEffect(() => {
    if (!isGm) return;
    const a = getAudio();
    const onEnded = () => {
      const m = latest.current;
      if (!m || m.loop || !m.playing) return;
      const i = m.tracks.findIndex((t) => t.id === m.current);
      const next = m.tracks[i + 1];
      const { dispatch } = useTable.getState();
      if (next) dispatch({ type: 'music.play', trackId: next.id });
      else {
        dispatch({ type: 'music.pause' });
        dispatch({ type: 'music.seek', position: 0 });
      }
    };
    a.addEventListener('ended', onEnded);
    return () => a.removeEventListener('ended', onEnded);
  }, [isGm]);

  return null;
}

function useAudioClock() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);
  const a = getAudio();
  return { time: a.currentTime, duration: a.duration };
}

function VolumeSlider() {
  const volume = useSettings((s) => s.musicVolume);
  const set = useSettings((s) => s.set);
  return (
    <div className="row" style={{ gap: 8 }}>
      <button className="btn ghost sm icon" onClick={() => set({ musicVolume: volume > 0 ? 0 : 0.6 })} aria-label={volume > 0 ? 'Silenzia' : 'Riattiva audio'}>
        {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </button>
      <input className="range grow" type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} aria-label="Volume musica" />
    </div>
  );
}

/** Top bar: what's playing, with each player's own volume. */
export function MusicChip() {
  const music = useTable((s) => s.state?.music);
  const track = music?.tracks.find((t) => t.id === music.current);
  useAudioClock();
  if (!music || !track) return null;
  const audible = !getAudio().paused;
  return (
    <Popover
      align="left"
      width={260}
      trigger={(_, toggle) => (
        <button className={`badge music-chip ${music.playing ? 'live' : ''}`} data-audible={audible} onClick={toggle} title="Musica del tavolo">
          <Music size={11} /> <span className="ellipsis">{track.name}</span>
        </button>
      )}
    >
      {() => (
        <div className="col" style={{ padding: 'var(--s3)', gap: 8 }}>
          <div className="small">
            <span className="faint">{music.playing ? 'In riproduzione' : 'In pausa'}</span>
            <div className="ellipsis">
              <b>{track.name}</b>
            </div>
          </div>
          <VolumeSlider />
          <span className="faint tiny">Il volume vale solo per te.</span>
        </div>
      )}
    </Popover>
  );
}

const readAudio = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

/** GM: the playlist. */
export function MusicPanel() {
  const { state, dispatch } = useTable();
  const toast = useApp((s) => s.toast);
  const { time, duration } = useAudioClock();
  const [seeking, setSeeking] = useState<number | null>(null);
  const [loading, setLoading] = useState(0);
  if (!state) return null;
  const m = state.music;
  if (!m) return null;
  const current = m.tracks.find((t) => t.id === m.current);

  const add = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      if (!f.type.startsWith('audio/')) {
        toast(`${f.name}: non è un file audio`, 'error');
        continue;
      }
      if (f.size > 11 * 1024 * 1024) {
        toast(`${f.name}: troppo grande (max 11 MB). Prova un MP3 o OGG.`, 'error');
        continue;
      }
      setLoading((n) => n + 1);
      try {
        const dataUrl = await readAudio(f);
        dispatch({ type: 'asset.add', dataUrl, attachTo: { track: f.name.replace(/\.[^.]+$/, '') } });
      } finally {
        setLoading((n) => n - 1);
      }
    }
  };

  return (
    <div className="panel-body col">
      <div className="now-playing">
        <div className="row between">
          <div className="col" style={{ gap: 0, minWidth: 0 }}>
            <span className="faint tiny">{current ? (m.playing ? 'In riproduzione per tutti' : 'In pausa') : 'Nessun brano'}</span>
            <b className="ellipsis">{current?.name ?? '—'}</b>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className={`btn ghost sm icon ${m.loop ? 'on' : ''}`} title={m.loop ? 'Ripeti il brano: attivo' : 'Ripeti il brano'} onClick={() => dispatch({ type: 'music.loop', loop: !m.loop })}>
              <Repeat size={14} />
            </button>
            <button
              className="btn primary sm icon"
              disabled={!m.tracks.length}
              aria-label={m.playing ? 'Pausa' : 'Riproduci'}
              onClick={() => dispatch(m.playing ? { type: 'music.pause' } : { type: 'music.play' })}
            >
              {m.playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        </div>
        {current && (
          <div className="row" style={{ gap: 8 }}>
            <span className="faint tiny mono">{fmt(seeking ?? time)}</span>
            <input
              className="range grow"
              type="range"
              min={0}
              max={Number.isFinite(duration) ? duration : 0}
              step={1}
              value={seeking ?? time}
              aria-label="Posizione"
              onChange={(e) => setSeeking(Number(e.target.value))}
              onPointerUp={() => {
                if (seeking !== null) dispatch({ type: 'music.seek', position: seeking });
                setSeeking(null);
              }}
              onKeyUp={() => {
                if (seeking !== null) dispatch({ type: 'music.seek', position: seeking });
                setSeeking(null);
              }}
            />
            <span className="faint tiny mono">{fmt(duration)}</span>
          </div>
        )}
        <VolumeSlider />
      </div>

      <div className="row between">
        <span className="section-title">Scaletta</span>
        <label className="btn sm">
          <Plus size={14} /> {loading ? 'Carico…' : 'Aggiungi brani'}
          <input type="file" accept="audio/*" multiple hidden onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))} />
        </label>
      </div>
      {m.tracks.length === 0 ? (
        <p className="faint small">Aggiungi file MP3 o OGG dal tuo computer: vengono inviati ai giocatori e suonano per tutti nello stesso momento.</p>
      ) : (
        <div className="track-list">
          {m.tracks.map((t) => (
            <div key={t.id} className={`track ${t.id === m.current ? 'active' : ''}`}>
              <button
                className="btn ghost sm icon"
                aria-label={t.id === m.current && m.playing ? 'Pausa' : `Riproduci ${t.name}`}
                onClick={() => dispatch(t.id === m.current && m.playing ? { type: 'music.pause' } : { type: 'music.play', trackId: t.id })}
              >
                {t.id === m.current && m.playing ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <input
                className="input bare grow"
                defaultValue={t.name}
                key={t.name}
                aria-label="Nome del brano"
                onBlur={(e) => e.target.value.trim() && e.target.value !== t.name && dispatch({ type: 'music.rename', trackId: t.id, name: e.target.value.trim() })}
              />
              <button className="btn ghost sm icon" aria-label={`Rimuovi ${t.name}`} onClick={() => dispatch({ type: 'music.remove', trackId: t.id })}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
