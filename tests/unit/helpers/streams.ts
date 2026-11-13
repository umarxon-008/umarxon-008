/** Berilgan bo'laklardan oqim yasaydi (tarmoq bo'laklarini taqlid qilish uchun). */
export function streamOf(chunks: (string | Uint8Array)[], delayMs = 0): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const c of chunks) {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        controller.enqueue(typeof c === 'string' ? enc.encode(c) : c);
      }
      controller.close();
    },
  });
}

export async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}
