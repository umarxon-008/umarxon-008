/**
 * Oqim parserlari. Tarmoq bo'laklari istalgan joyda (hatto UTF-8 harf o'rtasida) bo'linishi mumkin,
 * shuning uchun matn bufer orqali yig'iladi.
 */

async function* textChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) yield decoder.decode(value, { stream: true });
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

/** Server-Sent Events: har bir hodisaning `data:` qismini qaytaradi. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  let buffer = '';
  const flush = function* (block: string) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).replace(/^ /, ''))
      .join('\n');
    if (data) yield data;
  };
  for await (const chunk of textChunks(body)) {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(buffer.slice(idx).match(/^\r?\n\r?\n/)![0].length + idx);
      yield* flush(block);
    }
  }
  if (buffer.trim()) yield* flush(buffer);
}

/** Newline-delimited JSON (Ollama): har bir qator alohida JSON obyekt. */
export async function* ndjsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  let buffer = '';
  for await (const chunk of textChunks(body)) {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line) yield line;
    }
  }
  if (buffer.trim()) yield buffer.trim();
}
