/**
 * Anthropic Claude API bilan ishlash qatlami.
 * API kaliti faqat serverda (process.env) saqlanadi va brauzerga hech qachon yuborilmaydi.
 */
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import {
  SYSTEM_PROMPT, ANALYZE_INSTRUCTION, ANALYZE_SCHEMA, MEDICINE_SCHEMA,
  MEDICINE_FROM_DOC_INSTRUCTION, MEDICINE_BY_NAME_INSTRUCTION,
} from './prompts.js';

// Server tomonidagi "fallback" (rad etilgan so'rovni boshqa modelda qayta ishlash) qo'llab-quvvatlanadigan modellar.
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-2', 'claude-fable-5-1', 'claude-sonnet-5-5']);

export class AiError extends Error {
  constructor(message, { status = 502, kind = 'ai_error' } = {}) {
    super(message);
    this.status = status;
    this.kind = kind;
    this.expose = true;
  }
}

let client = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: config.apiKey, timeout: 120_000, maxRetries: 1 });
  return client;
}

async function createMessage(params) {
  const c = getClient();
  try {
    if (config.refusalFallback && FALLBACK_MODELS.has(config.model)) {
      return await c.beta.messages.create({
        ...params,
        model: config.model,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    }
    return await c.messages.create({ ...params, model: config.model });
  } catch (err) {
    throw mapSdkError(err);
  }
}

/** SDK xatolarini foydalanuvchiga ko'rsatsa bo'ladigan (maxfiy tafsilotsiz) xatoga aylantiradi. */
function mapSdkError(err) {
  // Faqat xato turi va statusini log qilamiz — so'rov mazmuni (tibbiy ma'lumot) log qilinmaydi.
  console.error(`[ai] ${err?.constructor?.name || 'Error'} status=${err?.status ?? '-'}`);
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AiError('AI xizmati sozlamalarida muammo bor (API kaliti). Administrator bilan bogʻlaning.', { status: 503, kind: 'auth' });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AiError('AI xizmati hozir band. Birozdan soʻng qayta urinib koʻring.', { status: 429, kind: 'rate_limit' });
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new AiError('Soʻrovni AI qayta ishlay olmadi. Matn yoki faylni tekshirib, qayta urinib koʻring.', { status: 400, kind: 'bad_request' });
  }
  return new AiError('AI xizmati vaqtincha javob bermadi. Birozdan soʻng qayta urinib koʻring.', { status: 502, kind: 'unavailable' });
}

function ensureUsable(resp) {
  if (resp.stop_reason === 'refusal') {
    throw new AiError('AI bu soʻrovga javob berishni rad etdi. Savolni boshqacha shaklda yozib koʻring.', { status: 422, kind: 'refusal' });
  }
}

function textOf(resp) {
  return resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

function jsonOf(resp) {
  const text = textOf(resp);
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError('AI javobini oʻqib boʻlmadi. Qayta urinib koʻring.', { status: 502, kind: 'parse' });
  }
}

function fileBlock(file) {
  const data = file.buffer.toString('base64');
  if (file.type === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: file.type, data } };
}

/** Chat: messages = [{role:'user'|'assistant', content:string}] */
export async function aiChat(messages) {
  const resp = await createMessage({
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { effort: 'low' },
    messages,
  });
  ensureUsable(resp);
  const reply = textOf(resp);
  if (!reply) throw new AiError('AI boʻsh javob qaytardi. Qayta urinib koʻring.');
  return reply;
}

/** Laboratoriya hujjati (PDF yoki rasm) tahlili. */
export async function aiAnalyzeReport(file) {
  const resp = await createMessage({
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ANALYZE_SCHEMA } },
    messages: [{ role: 'user', content: [fileBlock(file), { type: 'text', text: ANALYZE_INSTRUCTION }] }],
  });
  ensureUsable(resp);
  return jsonOf(resp);
}

/** Dori yo'riqnomasi: { name } yoki { text } yoki { file }. */
export async function aiExplainMedicine({ name, text, file }) {
  let content;
  if (file) content = [fileBlock(file), { type: 'text', text: MEDICINE_FROM_DOC_INSTRUCTION }];
  else if (text) content = `<yoriqnoma>\n${text}\n</yoriqnoma>\n\n${MEDICINE_FROM_DOC_INSTRUCTION}`;
  else content = MEDICINE_BY_NAME_INSTRUCTION(name);

  const resp = await createMessage({
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: MEDICINE_SCHEMA } },
    messages: [{ role: 'user', content }],
  });
  ensureUsable(resp);
  return jsonOf(resp);
}
