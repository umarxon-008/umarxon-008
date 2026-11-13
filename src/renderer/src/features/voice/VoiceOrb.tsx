import { useEffect, useRef } from 'react';
import { smoothLevel } from './level';
import { mic, useVoice } from './voiceStore';
import { useSettings } from '../../store/settings';
import { uz } from '../../i18n/uz';

const LAYERS = 9;
const POINTS = 240;
const DUST = 170;
const TAU = Math.PI * 2;

interface Dust {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  phase: number;
}

function makeDust(): Dust[] {
  return Array.from({ length: DUST }, (_, i) => ({
    angle: (i / DUST) * TAU + Math.sin(i * 12.9898) * 0.5,
    radius: 1.02 + ((Math.sin(i * 78.233) + 1) / 2) * 0.55,
    speed: 0.02 + ((Math.sin(i * 3.17) + 1) / 2) * 0.06,
    size: 0.6 + ((Math.sin(i * 5.71) + 1) / 2) * 1.2,
    phase: i * 0.37,
  }));
}

/**
 * MARIUS ovoz shari: zarrachalardan iborat halqa.
 * Tinglayotganda mikrofon ovoz balandligiga qarab kattalashadi, to'lqinlanadi va yorqinlashadi.
 * Jim turganda sekin "nafas oladi". Hech qanday audio saqlanmaydi.
 */
export function VoiceOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const status = useVoice((s) => s.status);
  const reducedMotion = useSettings((s) => s.settings?.reducedMotion ?? false);
  const theme = useSettings((s) => s.settings?.theme ?? 'dark');

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = prefersReduced ? 0.2 : 1;
    const rgb =
      getComputedStyle(document.documentElement).getPropertyValue('--orb-rgb').trim() || '95, 227, 240';
    const color = (a: number) => `rgba(${rgb}, ${a.toFixed(3)})`;
    const dust = makeDust();

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let level = 0;
    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = ((now - start) / 1000) * speed;
      const listening = statusRef.current === 'listening';

      // Maqsad daraja: tinglayotganda mikrofon, aks holda sekin nafas olish.
      const breathing = 0.06 + 0.04 * Math.sin(t * 1.2);
      const target = listening ? Math.max(0.08, mic.readLevel()) : breathing;
      level = smoothLevel(level, prefersReduced ? target * 0.5 : target);

      const cx = width / 2;
      const cy = height / 2;
      const R = Math.min(width, height) * 0.3 * (1 + level * 0.14);

      ctx.clearRect(0, 0, width, height);

      // Orqa nur
      const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.7);
      glow.addColorStop(0, color(0.05 + level * 0.12));
      glow.addColorStop(0.55, color(0.08 + level * 0.18));
      glow.addColorStop(1, color(0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';

      // Halqa atrofidagi yumshoq porlash (torus nuri)
      const band = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R * 1.32);
      band.addColorStop(0, color(0));
      band.addColorStop(0.5, color(0.1 + level * 0.16));
      band.addColorStop(1, color(0));
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.32, 0, TAU);
      ctx.fill();

      // Zarrachali halqa qatlamlari: har bir qatlam nurli ip + zarrachalar
      const amp = 0.045 + level * 0.24;
      const xs = new Float32Array(POINTS);
      const ys = new Float32Array(POINTS);
      for (let i = 0; i < LAYERS; i++) {
        const offset = (i - (LAYERS - 1) / 2) / LAYERS; // -0.44..0.44
        const spread = 0.18 + level * 0.32;
        const centrality = Math.max(0, 1 - Math.abs(offset) * 2);
        const layerAlpha = 0.22 + 0.6 * centrality;
        const rot = t * (0.05 + i * 0.012) * (i % 2 === 0 ? 1 : -1);
        for (let j = 0; j < POINTS; j++) {
          const th = (j / POINTS) * TAU;
          const wobble =
            Math.sin(3 * th + t * 0.7 + i * 0.6) * 0.5 +
            Math.sin(5 * th - t * 1.1 + i * 1.3) * 0.3 +
            Math.sin(2 * th + t * 0.45 - i) * 0.2 +
            Math.sin(9 * th + t * 3.1 + i * 0.9) * 0.18 * level;
          const r = R * (1 + offset * spread + amp * wobble);
          const a = th + rot;
          xs[j] = cx + r * Math.cos(a);
          ys[j] = cy + r * Math.sin(a);
        }

        // nurli ip
        ctx.beginPath();
        ctx.moveTo(xs[0]!, ys[0]!);
        for (let j = 1; j < POINTS; j++) ctx.lineTo(xs[j]!, ys[j]!);
        ctx.closePath();
        ctx.strokeStyle = color((0.05 + level * 0.1) * (0.5 + centrality));
        ctx.lineWidth = 1;
        ctx.stroke();

        // zarrachalar
        for (let j = 0; j < POINTS; j++) {
          const sparkle = 0.6 + 0.4 * Math.sin(j * 12.9898 + t * 2.4 + i);
          const size = (0.9 + centrality * 1.2) * (1 + level * 0.45);
          ctx.fillStyle = color(Math.min(1, layerAlpha * sparkle * (0.85 + level * 0.6)));
          ctx.fillRect(xs[j]! - size / 2, ys[j]! - size / 2, size, size);
        }
      }

      // Atrofdagi chang zarrachalari
      for (const d of dust) {
        const a = d.angle + t * d.speed;
        const r = R * (d.radius + level * 0.25 + Math.sin(t * 0.8 + d.phase) * 0.03);
        const alpha = (0.12 + level * 0.35) * (0.5 + 0.5 * Math.sin(t * 1.7 + d.phase));
        ctx.fillStyle = color(Math.max(0, alpha));
        ctx.fillRect(cx + r * Math.cos(a), cy + r * Math.sin(a), d.size, d.size);
      }

      ctx.globalCompositeOperation = 'source-over';

      // Markazdagi to'lqin chizig'i
      const waveWidth = R * 1.25;
      const left = cx - waveWidth / 2;
      const baseY = cy + R * 0.12;
      const samples = listening ? mic.waveform() : null;
      ctx.beginPath();
      const steps = 120;
      for (let k = 0; k <= steps; k++) {
        const p = k / steps;
        const envelope = Math.sin(p * Math.PI) ** 1.5; // chetlarda tekis
        let v: number;
        if (samples && samples.length > 0) {
          v = (samples[Math.floor(p * (samples.length - 1))] ?? 0) * 2.2;
        } else {
          // jimlikdagi yurak urishi kabi kichik to'lqin
          const beat = Math.exp(-(((p - 0.5 - Math.sin(t * 0.6) * 0.05) * 9) ** 2));
          v = Math.sin(p * 40 + t * 3) * 0.08 * beat + Math.sin(p * 9 - t * 2) * 0.02;
        }
        const y = baseY - Math.max(-1, Math.min(1, v)) * R * 0.35 * envelope;
        if (k === 0) ctx.moveTo(left + p * waveWidth, y);
        else ctx.lineTo(left + p * waveWidth, y);
      }
      ctx.strokeStyle = color(0.95);
      ctx.lineWidth = 1.6;
      ctx.shadowColor = color(0.9);
      ctx.shadowBlur = 10 + level * 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [reducedMotion, theme]);

  const listening = status === 'listening';
  return (
    <div className="orb">
      <canvas ref={canvasRef} className="orb__canvas" aria-hidden="true" />
      <span className={`orb__label${listening ? ' is-listening' : ''}`} aria-hidden="true">
        {listening ? uz.voice.listening : uz.voice.orbIdle}
      </span>
    </div>
  );
}
