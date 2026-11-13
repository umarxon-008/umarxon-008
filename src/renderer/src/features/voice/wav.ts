/**
 * Mikrofon yozuvini 16 kHz mono 16-bit WAV'ga aylantirish (DOM'siz sof funksiyalar, unit testda sinaladi).
 * WAV tanlangani sababi: Gemini uni rasmiy qo'llaydi va kodlash brauzer kodeklariga bog'liq emas.
 */
export const TARGET_SAMPLE_RATE = 16_000;

/** Bir nechta bo'lakni bitta massivga birlashtiradi */
export function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Chastotani pasaytirish (o'rtacha qiymat bilan, oddiy anti-aliasing) */
export function downsample(input: Float32Array, fromRate: number, toRate = TARGET_SAMPLE_RATE): Float32Array {
  if (toRate >= fromRate) return input;
  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j]!;
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

export function floatTo16BitPcm(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** 16-bit PCM → WAV fayl baytlari (RIFF sarlavha bilan) */
export function encodeWav(pcm: Int16Array, sampleRate: number): Uint8Array {
  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) v.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt bo'lagi hajmi
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  write(36, 'data');
  v.setUint32(40, dataBytes, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, pcm[i]!, true);
  return new Uint8Array(buffer);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Yozuvdan tayyor base64 WAV. Juda qisqa yoki jim yozuv uchun null. */
export function recordingToWavBase64(
  chunks: Float32Array[],
  sampleRate: number,
): { base64: string; seconds: number } | null {
  const samples = downsample(concatFloat32(chunks), sampleRate);
  const seconds = samples.length / TARGET_SAMPLE_RATE;
  if (seconds < 0.4) return null;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]!));
  if (peak < 0.01) return null; // amalda jimlik
  return { base64: bytesToBase64(encodeWav(floatTo16BitPcm(samples), TARGET_SAMPLE_RATE)), seconds };
}

/** Gemini TTS javobi: "audio/L16;codec=pcm;rate=24000" → 24000 */
export function parsePcmRate(mimeType: string, fallback = 24_000): number {
  const m = mimeType.match(/rate=(\d+)/i);
  return m ? Number(m[1]) : fallback;
}

/** Little-endian 16-bit PCM baytlari → Float32 (-1..1) */
export function pcm16ToFloat32(bytes: Uint8Array): Float32Array<ArrayBuffer> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}
