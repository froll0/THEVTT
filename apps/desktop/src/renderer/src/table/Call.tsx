import { AlertTriangle, ChevronDown, Headphones, Maximize2, Mic, MicOff, Minimize2, PhoneOff, Settings2, Video, VideoOff, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Field, Popover } from '../components/ui';
import { useApp } from '../store/app';
import { useCall } from '../store/call';
import { useSettings } from '../store/settings';

export interface CallPerson {
  name: string;
  color: string;
  avatar?: string | null;
}

/** The buttons in the table's top bar: join, microphone, camera, devices, leave. */
export function CallControls({ people }: { people: Record<string, CallPerson> }) {
  const { joined, joining, mic, cam, members, error, join, leave, toggleMic, toggleCam } = useCall();
  const myId = useApp((s) => s.user?.id ?? '');
  const others = Object.keys(members).filter((id) => id !== myId);
  const toast = useApp((s) => s.toast);
  const lastError = useRef<string | null>(null);
  useEffect(() => {
    if (error && error !== lastError.current) toast(error, 'error');
    lastError.current = error;
  }, [error, toast]);

  if (!joined) {
    return (
      <div className="row call-controls">
        <button
          className={`btn sm ${others.length ? 'primary' : 'ghost'}`}
          disabled={joining}
          onClick={() => void join(false)}
          title={others.length ? `In voce: ${others.map((id) => people[id]?.name ?? '?').join(', ')}` : 'Entra nella chat vocale del tavolo'}
        >
          <Headphones size={14} /> {joining ? 'Mi collego…' : others.length ? `Entra in voce · ${others.length}` : 'Voce'}
        </button>
        <button className="btn sm ghost icon" disabled={joining} onClick={() => void join(true)} title="Entra con la videocamera" aria-label="Entra con la videocamera">
          <Video size={14} />
        </button>
      </div>
    );
  }
  return (
    <div className="row call-controls in-call" role="group" aria-label="Chat vocale">
      <button className={`btn sm icon ${mic ? 'ghost' : 'danger-soft'}`} onClick={() => void toggleMic()} title={mic ? 'Spegni il microfono (Ctrl+Maiusc+M)' : 'Accendi il microfono (Ctrl+Maiusc+M)'} aria-label={mic ? 'Spegni il microfono' : 'Accendi il microfono'} aria-pressed={!mic}>
        {mic ? <Mic size={14} /> : <MicOff size={14} />}
      </button>
      <button className={`btn sm icon ${cam ? 'primary' : 'ghost'}`} onClick={() => void toggleCam()} title={cam ? 'Spegni la videocamera' : 'Accendi la videocamera'} aria-label={cam ? 'Spegni la videocamera' : 'Accendi la videocamera'} aria-pressed={cam}>
        {cam ? <Video size={14} /> : <VideoOff size={14} />}
      </button>
      <Popover
        width={300}
        trigger={(open, toggle) => (
          <button className={`btn sm icon ghost ${open ? 'on' : ''}`} onClick={toggle} title="Microfono, videocamera e altoparlanti" aria-label="Impostazioni audio e video">
            <Settings2 size={14} />
          </button>
        )}
      >
        {() => <CallSettings />}
      </Popover>
      <button className="btn sm danger" onClick={leave} title="Esci dalla chat vocale" aria-label="Esci dalla chat vocale">
        <PhoneOff size={14} />
      </button>
    </div>
  );
}

/** Which microphone, camera and speakers; and a meter to see the microphone works. */
function CallSettings() {
  const call = useSettings((s) => s.call);
  const setSettings = useSettings((s) => s.set);
  const { myLevel, applyDevices, mic } = useCall();
  const [list, setList] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    const load = () => void navigator.mediaDevices.enumerateDevices().then(setList).catch(() => undefined);
    load();
    navigator.mediaDevices.addEventListener('devicechange', load);
    return () => navigator.mediaDevices.removeEventListener('devicechange', load);
  }, []);
  const pick = (key: 'micId' | 'camId' | 'outId', id: string) => {
    setSettings({ call: { ...useSettings.getState().call, [key]: id } });
    void applyDevices();
  };
  const select = (kind: MediaDeviceKind, key: 'micId' | 'camId' | 'outId', label: string) => {
    const options = list.filter((d) => d.kind === kind && d.deviceId !== 'default' && d.deviceId !== 'communications');
    return (
      <Field label={label}>
        <select className="select" value={call[key]} onChange={(e) => pick(key, e.target.value)} aria-label={label}>
          <option value="">Quello del sistema</option>
          {options.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `${label} ${i + 1}`}
            </option>
          ))}
        </select>
      </Field>
    );
  };
  return (
    <div className="col call-settings" style={{ gap: 10, padding: 4 }}>
      {select('audioinput', 'micId', 'Microfono')}
      <div className="call-meter" aria-label="Livello del microfono" role="meter" aria-valuenow={Math.round(myLevel * 100)}>
        <span style={{ width: `${Math.min(100, myLevel * 400)}%`, opacity: mic ? 1 : 0.3 }} />
      </div>
      {select('videoinput', 'camId', 'Videocamera')}
      {select('audiooutput', 'outId', 'Altoparlanti o cuffie')}
      <p className="faint tiny">Le voci arrivano dirette dai computer degli altri, senza passare dal server. Usa le cuffie per evitare l’eco.</p>
    </div>
  );
}

function VideoView({ stream, mirror }: { stream: MediaStream; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (v && v.srcObject !== stream) v.srcObject = stream;
  }, [stream]);
  // audio plays elsewhere (with each person's volume): the picture is always muted
  return <video ref={ref} autoPlay playsInline muted className={mirror ? 'mirror' : ''} />;
}

/** The people in the call, over the map: their camera, or their picture with a ring when they speak. */
export function CallTiles({ people }: { people: Record<string, CallPerson> }) {
  const { joined, members, local, streams, links, speaking, cam, mic, setVolume } = useCall();
  const myId = useApp((s) => s.user?.id ?? '');
  const settings = useSettings((s) => s.call);
  const setSettings = useSettings((s) => s.set);
  if (!joined) return null;
  const ids = [myId, ...Object.keys(members).filter((id) => id !== myId)];
  const size = settings.tiles;
  const setSize = (tiles: typeof size) => setSettings({ call: { ...useSettings.getState().call, tiles } });

  if (size === 'hidden') {
    return (
      <button className="float call-pill glass" onClick={() => setSize('small')} title="Mostra chi è in voce">
        <Headphones size={13} /> Voce · {ids.length}
        {ids.some((id) => speaking[id]) && <span className="call-dot" />}
      </button>
    );
  }
  return (
    <div className={`float call-tiles ${size}`} role="list" aria-label="Chi è in voce">
      <div className="call-tiles-bar">
        <span className="tiny">In voce · {ids.length}</span>
        <button className="icon-btn" onClick={() => setSize(size === 'small' ? 'large' : 'small')} title={size === 'small' ? 'Riquadri più grandi' : 'Riquadri più piccoli'} aria-label="Cambia grandezza">
          {size === 'small' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
        </button>
        <button className="icon-btn" onClick={() => setSize('hidden')} title="Nascondi i riquadri" aria-label="Nascondi i riquadri">
          <ChevronDown size={13} />
        </button>
      </div>
      {ids.map((id) => {
        const self = id === myId;
        const state = self ? { mic, cam } : members[id];
        const stream = self ? local : streams[id];
        const person = people[id] ?? { name: '?', color: '#888' };
        const link = links[id];
        const showVideo = !!state?.cam && !!stream && stream.getVideoTracks().length > 0;
        const volume = settings.volumes[id] ?? 1;
        return (
          <div key={id} role="listitem" className={`call-tile ${showVideo ? 'video' : ''} ${speaking[id] ? 'speaking' : ''} ${!self && link !== 'connected' ? 'pending' : ''}`} aria-label={person.name}>
            {showVideo ? (
              <VideoView stream={stream!} mirror={self} />
            ) : (
              <Avatar user={{ displayName: person.name, avatarColor: person.color, avatar: person.avatar, online: true }} size={size === 'large' ? 44 : 28} />
            )}
            <div className="call-tile-name">
              {state?.mic === false && <MicOff size={11} aria-label="microfono spento" />}
              <span className="ellipsis">
                {person.name}
                {self ? ' (tu)' : ''}
              </span>
              {!self && link === 'failed' && (
                <span title="Connessione diretta non riuscita: le vostre reti non si raggiungono. Riprovo da solo." className="call-warn">
                  <AlertTriangle size={11} />
                </span>
              )}
            </div>
            {!self && (
              <label className="call-volume" title={`Volume di ${person.name}`}>
                <Volume2 size={11} />
                <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(id, Number(e.target.value))} aria-label={`Volume di ${person.name}`} />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
