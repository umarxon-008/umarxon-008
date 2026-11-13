import { describe, expect, it } from 'vitest';
import { ndjsonLines, sseData } from '../../src/modules/ai/stream-parsers';
import { collect, streamOf } from './helpers/streams';

describe('SSE parser', () => {
  it('bo‘laklar har qanday joyda bo‘linsa ham hodisalarni to‘g‘ri ajratadi', async () => {
    const out = await collect(
      sseData(streamOf(['data: {"a"', ':1}\n', '\ndata: {"a":2}\r\n\r\n', 'data: {"a":3}'])),
    );
    expect(out).toEqual(['{"a":1}', '{"a":2}', '{"a":3}']);
  });

  it('o‘zbek harflari (o‘, g‘) baytlar o‘rtasida bo‘linsa ham buzilmaydi', async () => {
    const bytes = new TextEncoder().encode('data: {"t":"o‘g‘il 😊"}\n\n');
    const out = await collect(sseData(streamOf([bytes.slice(0, 15), bytes.slice(15, 17), bytes.slice(17)])));
    expect(JSON.parse(out[0]!)).toEqual({ t: 'o‘g‘il 😊' });
  });
});

describe('NDJSON parser', () => {
  it('qatorlarni ajratadi, bo‘sh qatorlarni tashlaydi', async () => {
    const out = await collect(ndjsonLines(streamOf(['{"a":1}\n{"a"', ':2}\n\n', '{"a":3}'])));
    expect(out).toEqual(['{"a":1}', '{"a":2}', '{"a":3}']);
  });
});
