import { afterEach, describe, expect, it } from 'vitest';
import { __setPrimaryProviderForTests, analyzeWithFallback } from '@/server/providers/ai';
import { llmOutputSchema, type AIAnalysisInput } from '@/server/providers/ai/types';

const input: AIAnalysisInput = {
  equipment: { name: 'CNC-3', category: 'CNC', nominalPowerKw: 25, baselinePowerKw: 16, hasProductionSignal: true, dataSource: 'DEMO', status: 'WARNING' },
  alert: {
    rule: 'NO_PRODUCTION_SIGNAL',
    title: 'CNC-3: energiya sarflanmoqda, ishlab chiqarish signali kelmadi',
    severity: 'WARNING',
    explanation: 'Izoh',
    recommendation: 'Jarayonni tekshiring.',
    confidence: 'MEDIUM',
    evidence: [{ label: "O'rtacha quvvat", value: 10, unit: 'kW' }],
    facts: ['Signal kelmadi.'],
    assumptions: ['Taxmin.'],
    windowStart: '2026-01-01T11:55:00Z',
    windowEnd: '2026-01-01T12:00:00Z',
  },
  stats24h: { energyKwh: 100, avgPowerKw: 4.2, maxPowerKw: 11, readings: 400 },
  timezone: 'Asia/Tashkent',
};

afterEach(() => __setPrimaryProviderForTests(null));

describe('AI provider va fallback', () => {
  it('LLM ulanmagan — qoidaga asoslangan provider ishlaydi', async () => {
    const r = await analyzeWithFallback(input, true);
    expect(r.status).toBe('SUCCESS');
    expect(r.result.provider).toBe('rule-based');
    expect(r.result.disclaimer).toMatch(/operator qarorini almashtirmaydi/);
  });
  it('asosiy provider xato bersa — FALLBACK va xato matni saqlanadi', async () => {
    __setPrimaryProviderForTests({ id: 'broken', model: 'x', isConfigured: () => true, analyze: async () => { throw new Error('timeout'); } });
    const r = await analyzeWithFallback(input, true);
    expect(r.status).toBe('FALLBACK');
    expect(r.errorMessage).toBe('timeout');
    expect(r.result.provider).toBe('rule-based');
  });
  it('dalillar har doim kirish ma’lumotidan olinadi (LLM raqam to‘qiy olmaydi)', async () => {
    __setPrimaryProviderForTests({
      id: 'fake-llm',
      model: 'm',
      isConfigured: () => true,
      analyze: async () => ({ title: 'T', severity: 'warning', explanation: 'Tushuntirish matni', facts: ['f'], assumptions: [], recommendations: ['r'], confidence: 'low' }),
    });
    const r = await analyzeWithFallback(input, true);
    expect(r.result.provider).toBe('fake-llm');
    expect(r.result.evidence).toEqual(input.alert!.evidence);
  });
  it('LLM javobi sxemasi noto‘g‘ri strukturani rad etadi', () => {
    expect(llmOutputSchema.safeParse({ title: 'x' }).success).toBe(false);
    expect(llmOutputSchema.safeParse({ title: 'Sarlavha', severity: 'fatal', explanation: 'uzun izoh matni', facts: [], assumptions: [], recommendations: ['r'], confidence: 'low' }).success).toBe(false);
  });
});
