import { Router } from 'express';
import { config, isAiEnabled } from '../config.js';
import { ragStatus } from '../rag/index.js';

const router = Router();

router.get('/status', (_req, res) => {
  const ai = isAiEnabled();
  res.json({
    mode: ai ? 'ai' : 'demo',
    model: ai ? config.model : null,
    rag: ragStatus,
    limits: { maxFileMb: config.maxFileBytes / 1024 / 1024, maxMessageChars: config.maxMessageChars },
    version: '0.1.0',
  });
});

export default router;
