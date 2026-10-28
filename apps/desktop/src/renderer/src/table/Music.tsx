import { AMBIENCES, BUILTIN_SOUNDS, type MusicState } from '@thevtt/shared';
import { AudioLines, Music, Pause, Trees, Play, Plus, Repeat, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Popover } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { resumeAudio, startAmbience, type AmbiencePlayer } from '../lib/ambience';

/** One audio element for the whole table: the panel and the top bar chip read it. */
let audio: HTMLAudioElement | null = null;
const getAudio = () => (audio ??= new Audio());

/** changing track: the old one fades out, the new one fades in */
const FADE_MS = 1200;
let gain = 1;
let baseVolume = 0.6;
let fading: ReturnType<typeof setInterval> | null = null;
const applyVolume = () => {
  getAudio().volume = Math.max(0, Math.min(1, baseVolume * gain));
};
function fade(to: number, ms: number, done?: () => void) {
  if (fading) clearInterval(fading);
  fading = null;
  const from = gain;
  const t0 = performance.now();
  if (ms <= 0 || from === to) {
    gain = to;
    applyVolume();
    done?.();
    return;
  }
  fading = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    gain = from + (to - from) * k;
    applyVolume();
    if (k >= 1) {
      clearInterval(fading!);
      fading = null;
      done?.();
    }
  }, 40);
}

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
    baseVolume = volume;
    applyVolume();
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
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      const m = latest.current;
      if (!m || cancelled) return;
      const dur = a.duration;
      let pos = expectedPosition(m, offset);
      const finished = Number.isFinite(dur) && !m.loop && pos >= dur;
      if (Number.isFinite(dur) && dur > 0) pos = m.loop ? pos % dur : Math.min(pos, dur);
      // small drift is fine, a jump is worse than being half a second late
      if (Math.abs(a.currentTime - pos) > 1) a.currentTime = pos;
      if (m.playing && !finished) void a.play().catch(() => undefined);
      else a.pause();
    };
    const begin = () => {
      a.loop = music.loop;
      if (a.readyState >= 1) sync();
      else a.addEventListener('loadedmetadata', sync, { once: true });
      timer = setInterval(sync, 4000);
    };
    if (a.dataset.asset !== track.asset) {
      const swap = () => {
        if (cancelled) return;
        a.src = src;
        a.dataset.asset = track.asset;
        gain = 0;
        applyVolume();
        begin();
        fade(1, FADE_MS);
      };
      // something was playing: let it fade out first
      if (!a.paused && a.dataset.asset) fade(0, FADE_MS, swap);
      else swap();
    } else begin();
    return () => {
      cancelled = true;
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

/** The live scene's ambience, for everyone, at each one's own volume; changing scene crossfades. */
export function AmbienceLoop() {
  const ambience = useTable((s) => (s.state ? s.state.scenes[s.state.activeSceneId]?.ambience : null)) ?? null;
  const volume = useSettings((s) => s.musicVolume * s.ambienceVolume);
  const player = useRef<AmbiencePlayer | null>(null);
  const level = useRef(volume);
  level.current = volume;
  useEffect(() => {
    if (!ambience) return;
    const p = startAmbience(ambience, level.current);
    player.current = p;
    // a browser may hold sound back until the first click
    window.addEventListener('pointerdown', resumeAudio, { once: true });
    return () => {
      p?.stop();
      if (player.current === p) player.current = null;
      window.removeEventListener('pointerdown', resumeAudio);
    };
  }, [ambience]);
  useEffect(() => player.current?.setVolume(volume), [volume]);
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

function VolumeSlider({ ambience }: { ambience?: boolean }) {
  const volume = useSettings((s) => s.musicVolume);
  const amb = useSettings((s) => s.ambienceVolume);
  const set = useSettings((s) => s.set);
  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost sm icon" onClick={() => set({ musicVolume: volume > 0 ? 0 : 0.6 })} aria-label={volume > 0 ? 'Silenzia' : 'Riattiva audio'}>
          {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        <input className="range grow" type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} aria-label="Volume musica" />
      </div>
      {ambience && (
        <div className="row" style={{ gap: 8 }} title="L’ambiente della scena, rispetto alla musica">
          <span className="btn ghost sm icon" aria-hidden>
            <Trees size={15} />
          </span>
          <input className="range grow" type="range" min={0} max={1} step={0.05} value={amb} onChange={(e) => set({ ambienceVolume: Number(e.target.value) })} aria-label="Volume ambiente" />
        </div>
      )}
    </>
  );
}

/** Top bar: what's playing, with each player's own volume. */
export function MusicChip() {
  const music = useTable((s) => s.state?.music);
  const ambience = useTable((s) => (s.state ? s.state.scenes[s.state.activeSceneId]?.ambience : null));
  const track = music?.tracks.find((t) => t.id === music.current);
  const place = AMBIENCES.find((a) => a.id === ambience);
  useAudioClock();
  if (!track && !place) return null;
  const audible = !getAudio().paused;
  return (
    <Popover
      align="left"
      width={260}
      trigger={(_, toggle) => (
        <button className={`badge music-chip ${track && music?.playing ? 'live' : ''}`} data-audible={audible} onClick={toggle} title={track ? 'Musica del tavolo' : 'Ambiente della scena'}>
          {track ? <Music size={11} /> : <Trees size={11} />} <span className="ellipsis">{track ? track.name : place!.name}</span>
        </button>
      )}
    >
      {() => (
        <div className="col" style={{ padding: 'var(--s3)', gap: 8 }}>
          {track && (
            <div className="small">
              <span className="faint">{music?.playing ? 'In riproduzione' : 'In pausa'}</span>
              <div className="ellipsis">
                <b>{track.name}</b>
              </div>
            </div>
          )}
          {place && (
            <div className="small">
              <span className="faint">Ambiente</span>
              <div className="ellipsis">
                <b>{place.name}</b>
              </div>
            </div>
          )}
          <VolumeSlider ambience={!!place} />
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
          <input type="file" accept="audio/*" multiple hidden aria-label="Aggiungi brani" onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))} />
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
      <AmbienceBoard />
      <SoundBoard />
    </div>
  );
}

/** GM: the background sound of the live scene, for everyone; it stays with the scene. */
function AmbienceBoard() {
  const { state, dispatch } = useTable();
  if (!state) return null;
  const scene = state.scenes[state.activeSceneId];
  if (!scene) return null;
  const set = (ambience: (typeof AMBIENCES)[number]['id'] | null) => dispatch({ type: 'scene.update', sceneId: scene.id, patch: { ambience } });
  return (
    <>
      <span className="section-title">Ambiente della scena</span>
      <div className="sfx-grid" role="radiogroup" aria-label="Ambiente della scena">
        <button role="radio" aria-checked={!scene.ambience} className={`btn sm sfx ${!scene.ambience ? 'on' : ''}`} onClick={() => set(null)}>
          Silenzio
        </button>
        {AMBIENCES.map((a) => (
          <button key={a.id} role="radio" aria-checked={scene.ambience === a.id} className={`btn sm sfx ${scene.ambience === a.id ? 'on' : ''}`} onClick={() => set(a.id)} title={`Lo sentono tutti, finché la scena «${scene.name}» è attiva`}>
            <Trees size={12} /> {a.name}
          </button>
        ))}
      </div>
      <p className="faint tiny">Resta legato alla scena: torna da solo quando la riattivi. Ognuno ne regola il volume dalla musica in alto.</p>
    </>
  );
}

/** GM: one-shot sound effects everyone hears at once (also from macros: /suono tuono). */
function SoundBoard() {
  const { state, dispatch } = useTable();
  const toast = useApp((x) => x.toast);
  const [loading, setLoading] = useState(false);
  const own = state?.sounds ?? [];
  const add = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      if (!f.type.startsWith('audio/')) {
        toast(`${f.name}: non è un file audio`, 'error');
        continue;
      }
      if (f.size > 2 * 1024 * 1024) {
        toast(`${f.name}: troppo grande per un effetto (max 2 MB)`, 'error');
        continue;
      }
      setLoading(true);
      try {
        dispatch({ type: 'asset.add', dataUrl: await readAudio(f), attachTo: { sound: f.name.replace(/\.[^.]+$/, '') } });
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <>
      <div className="row between">
        <span className="section-title">Effetti sonori</span>
        <label className="btn sm">
          <Plus size={14} /> {loading ? 'Carico…' : 'Aggiungi'}
          <input type="file" accept="audio/*" multiple hidden aria-label="Aggiungi effetti sonori" onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))} />
        </label>
      </div>
      <div className="sfx-grid" role="list" aria-label="Effetti sonori">
        {BUILTIN_SOUNDS.map((x) => (
          <button key={x.id} role="listitem" className="btn sm sfx" onClick={() => dispatch({ type: 'sfx.play', sound: x.id })} title={`Fai sentire a tutti: ${x.name}`}>
            <AudioLines size={12} /> {x.name}
          </button>
        ))}
        {own.map((x) => (
          <span key={x.id} role="listitem" className="sfx-own">
            <button className="btn sm sfx" onClick={() => dispatch({ type: 'sfx.play', sound: x.id })} title={`Fai sentire a tutti: ${x.name}`}>
              <AudioLines size={12} /> {x.name}
            </button>
            <button className="btn ghost sm icon" aria-label={`Rimuovi ${x.name}`} onClick={() => dispatch({ type: 'sfx.remove', soundId: x.id })}>
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </div>
      <p className="faint tiny">Li sentono tutti, al volume della musica di ciascuno. Nelle macro: /suono tuono.</p>
    </>
  );
}
