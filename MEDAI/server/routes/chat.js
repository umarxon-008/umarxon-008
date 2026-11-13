import { Router } from 'express';
import { config, isAiEnabled } from '../config.js';
import { aiChat } from '../services/ai.js';
import { demoReply } from '../services/demo.js';
import { assessMessage } from '../services/safety.js';
import { searchSources, ragStatus } from '../rag/index.js';
import { libraryMeta } from '../services/library.js';

const router = Router();

class ValidationError extends Error {
  constructor(message) { super(message); this.status = 400; this.expose = true; }
}

/** Kiruvchi suhbat tarixini tekshiradi va AI API talablariga moslaydi. */
export function sanitizeMessages(input) {
  if (!Array.isArray(input) || input.length === 0) throw new ValidationError('Xabar yuborilmadi.');
  if (input.length > 100) throw new ValidationError('Suhbat tarixi juda uzun.');
  const cleaned = [];
  for (const m of input.slice(-config.maxHistoryMessages)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      throw new ValidationError('Xabar formati notoʻgʻri.');
    }
    const content = m.content.trim();
    if (!content) continue;
    if (content.length > config.maxMessageChars) {
      throw new ValidationError(`Xabar ${config.maxMessageChars} belgidan oshmasligi kerak.`);
    }
    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.role === m.role) prev.content += `\n\n${content}`; // ketma-ket bir xil rolni birlashtirish
    else cleaned.push({ role: m.role, content });
  }
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  if (!cleaned.length) throw new ValidationError('Xabar boʻsh boʻlmasligi kerak.');
  if (cleaned[cleaned.length - 1].role !== 'user') {
    throw new ValidationError('Oxirgi xabar foydalanuvchidan boʻlishi kerak.');
  }
  return cleaned;
}

router.post('/chat', async (req, res, next) => {
  try {
    const messages = sanitizeMessages(req.body?.messages);
    const last = messages[messages.length - 1].content;
    const generatedAt = new Date().toISOString();

    if (!isAiEnabled()) {
      const r = demoReply(last);
      return res.json({
        mode: 'demo', reply: r.reply, sources: r.sources, sourceNote: r.sourceNote, flags: r.flags, kind: r.kind, generatedAt,
        dataDate: r.sources.length ? libraryMeta.updatedAt : null,
      });
    }

    const flags = assessMessage(last);
    const sources = ragStatus.enabled ? await searchSources(last) : [];
    const reply = await aiChat(messages);
    return res.json({
      mode: 'ai',
      model: config.model,
      reply,
      sources,
      sourceNote: sources.length
        ? 'Javob quyidagi hujjatlarga tayangan.'
        : 'Javob AI modelining umumiy bilimiga asoslangan. Ishonchli hujjatlar bazasi (RAG) ulanmagan — rasmiy manba bilan tasdiqlanmagan.',
      flags,
      generatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
