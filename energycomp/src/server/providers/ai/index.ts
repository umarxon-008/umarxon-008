import 'server-only';
import { serverEnv } from '@/server/env';
import { AnthropicProvider } from './anthropic';
import { ruleBasedProvider } from './rule-based';
import { AI_DISCLAIMER, type AIAnalysisInput, type AIAnalysisResult, type AIProvider } from './types';

export interface AnalysisOutcome {
  result: AIAnalysisResult;
  status: 'SUCCESS' | 'FALLBACK';
  errorMessage: string | null;
}

let testOverride: AIProvider | null = null;
/** Faqat testlar uchun. */
export function __setPrimaryProviderForTests(p: AIProvider | null) {
  testOverride = p;
}

export function getPrimaryProvider(allowLLM: boolean): AIProvider {
  if (testOverride) return testOverride;
  if (allowLLM && serverEnv.aiProvider === 'anthropic') {
    const p = new AnthropicProvider();
    if (p.isConfigured()) return p;
  }
  return ruleBasedProvider;
}

export function aiProviderStatus() {
  const llmRequested = serverEnv.aiProvider === 'anthropic';
  const configured = llmRequested && Boolean(serverEnv.anthropicApiKey);
  return { llmRequested, configured, model: configured ? serverEnv.aiModel : null };
}

/** Asosiy provider ishlamasa qoidaga asoslangan fallback ishlaydi. Dalillar har doim bazadan olinadi. */
export async function analyzeWithFallback(input: AIAnalysisInput, allowLLM: boolean): Promise<AnalysisOutcome> {
  const primary = getPrimaryProvider(allowLLM);
  const evidence = input.alert?.evidence ?? [
    { label: '24 soatlik energiya', value: Number(input.stats24h.energyKwh.toFixed(3)), unit: 'kWh' },
    { label: "24 soatlik o'rtacha quvvat", value: Number(input.stats24h.avgPowerKw.toFixed(2)), unit: 'kW' },
    { label: '24 soatlik maksimal quvvat', value: Number(input.stats24h.maxPowerKw.toFixed(2)), unit: 'kW' },
  ];
  const build = (out: Awaited<ReturnType<AIProvider['analyze']>>, provider: AIProvider): AIAnalysisResult => ({
    ...out,
    recommendation: out.recommendations.join(' '),
    evidence,
    createdAt: new Date().toISOString(),
    provider: provider.id,
    model: provider.model,
    disclaimer: AI_DISCLAIMER,
  });
  try {
    const out = await primary.analyze(input);
    return { result: build(out, primary), status: 'SUCCESS', errorMessage: null };
  } catch (err) {
    if (primary === ruleBasedProvider) throw err;
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[ai] asosiy provider ishlamadi, fallback ishlatiladi:', message);
    const out = await ruleBasedProvider.analyze(input);
    return { result: build(out, ruleBasedProvider), status: 'FALLBACK', errorMessage: message.slice(0, 500) };
  }
}
