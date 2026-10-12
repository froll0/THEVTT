import type { Weather } from '@thevtt/shared';
import { useEffect, useRef } from 'react';
import { useSettings } from '../store/settings';

interface Drop {
  x: number;
  y: number;
  v: number;
  r: number;
  phase: number;
}

const COUNT: Record<Weather, number> = { rain: 420, storm: 650, snow: 260, fog: 14, embers: 90, ash: 160 };

/**
 * Weather over the map, in screen space: rain, a storm with lightning, snow,
 * drifting fog, embers, ash. With reduced motion only a still tint is drawn.
 */
export function WeatherLayer({ weather, intensity }: { weather: Weather; intensity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const still = useSettings((s) => s.reduceMotion);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, Math.round(r.width));
      h = canvas.height = Math.max(1, Math.round(r.height));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const n = Math.round(COUNT[weather] * intensity);
    const drops: Drop[] = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8, r: Math.random(), phase: Math.random() * Math.PI * 2 }));
    let flash = 0;
    let last = performance.now();
    let raf = 0;
    const tint = () => {
      const c: Record<Weather, string> = {
        rain: 'rgba(40,60,90,0.18)',
        storm: 'rgba(20,30,55,0.32)',
        snow: 'rgba(220,230,255,0.12)',
        fog: 'rgba(200,205,215,0.28)',
        embers: 'rgba(120,40,10,0.14)',
        ash: 'rgba(60,55,50,0.22)',
      };
      ctx.fillStyle = c[weather];
      ctx.fillRect(0, 0, w, h);
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      tint();
      if (weather === 'rain' || weather === 'storm') {
        const slant = weather === 'storm' ? 0.35 : 0.15;
        ctx.strokeStyle = weather === 'storm' ? 'rgba(190,210,240,0.45)' : 'rgba(180,200,230,0.38)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of drops) {
          d.y += d.v * dt * 1.6;
          d.x += d.v * dt * slant * 0.5;
          if (d.y > 1) (d.y -= 1.05), (d.x = Math.random());
          if (d.x > 1) d.x -= 1;
          const len = 10 + d.r * 14;
          ctx.moveTo(d.x * w, d.y * h);
          ctx.lineTo(d.x * w - slant * len, d.y * h - len);
        }
        ctx.stroke();
        if (weather === 'storm') {
          if (flash <= 0 && Math.random() < dt * 0.12 * intensity) flash = 0.35;
          if (flash > 0) {
            ctx.fillStyle = `rgba(235,240,255,${Math.min(0.55, flash * 1.6)})`;
            ctx.fillRect(0, 0, w, h);
            flash -= dt;
          }
        }
      } else if (weather === 'snow' || weather === 'ash') {
        ctx.fillStyle = weather === 'snow' ? 'rgba(255,255,255,0.85)' : 'rgba(70,65,60,0.7)';
        for (const d of drops) {
          d.y += d.v * dt * (weather === 'snow' ? 0.09 : 0.06);
          d.phase += dt * (0.8 + d.r);
          const x = (d.x + Math.sin(d.phase) * 0.008) * w;
          if (d.y > 1) (d.y -= 1.02), (d.x = Math.random());
          ctx.beginPath();
          ctx.arc(x, d.y * h, 1 + d.r * (weather === 'snow' ? 2.2 : 1.6), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (weather === 'embers') {
        for (const d of drops) {
          d.y -= d.v * dt * 0.08;
          d.phase += dt * (1 + d.r * 2);
          const x = (d.x + Math.sin(d.phase) * 0.01) * w;
          if (d.y < 0) (d.y += 1.02), (d.x = Math.random());
          const a = 0.4 + 0.5 * Math.abs(Math.sin(d.phase * 1.7));
          ctx.fillStyle = `rgba(255,${120 + Math.round(d.r * 80)},40,${a})`;
          ctx.beginPath();
          ctx.arc(x, d.y * h, 0.8 + d.r * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (weather === 'fog') {
        for (const d of drops) {
          d.x += d.v * dt * 0.012;
          if (d.x > 1.3) d.x -= 1.6;
          const r = (0.25 + d.r * 0.3) * Math.max(w, h);
          const g = ctx.createRadialGradient(d.x * w, d.y * h, 0, d.x * w, d.y * h, r);
          g.addColorStop(0, `rgba(215,220,228,${0.22 * intensity + 0.08})`);
          g.addColorStop(1, 'rgba(215,220,228,0)');
          ctx.fillStyle = g;
          ctx.fillRect(d.x * w - r, d.y * h - r, r * 2, r * 2);
        }
      }
      if (!still) raf = requestAnimationFrame(frame);
    };
    if (still) {
      ctx.clearRect(0, 0, w, h);
      tint();
    } else raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [weather, intensity, still]);
  return <canvas ref={ref} className="weather-layer" aria-hidden data-weather={weather} />;
}
