import type { AIAnalysisInput, AIProvider, LLMOutput } from './types';

/** LLM mavjud bo'lmaganda ishlaydigan deterministik provider (fallback). */
export const ruleBasedProvider: AIProvider = {
  id: 'rule-based',
  model: null,
  isConfigured: () => true,
  async analyze(input: AIAnalysisInput): Promise<LLMOutput> {
    const { alert, equipment, stats24h } = input;
    const dayFact = `So'nggi 24 soatda ${stats24h.energyKwh.toFixed(1)} kWh sarflandi, o'rtacha quvvat ${stats24h.avgPowerKw.toFixed(1)} kW, maksimal ${stats24h.maxPowerKw.toFixed(1)} kW (${stats24h.readings} ta o'lchov).`;
    if (!alert) {
      const facts = [dayFact];
      const assumptions: string[] = [];
      if (equipment.baselinePowerKw) {
        facts.push(`Belgilangan baseline: ${equipment.baselinePowerKw} kW.`);
      } else {
        assumptions.push('Baseline belgilanmagan — odatiy sarf bilan taqqoslash taxminiy.');
      }
      if (stats24h.readings === 0) assumptions.push("So'nggi 24 soatda o'lchov yo'q, tahlil cheklangan.");
      return {
        title: `${equipment.name}: umumiy holat tahlili`,
        severity: 'info',
        explanation: `${equipment.name} uchun faol ogohlantirish yo'q. Quyidagi xulosa faqat so'nggi 24 soatlik o'lchovlarga asoslangan.`,
        facts,
        assumptions,
        recommendations: [
          equipment.baselinePowerKw
            ? "Sarfni baseline bilan muntazam taqqoslab boring."
            : "Aniqroq tahlil uchun uskuna sozlamalarida baseline quvvatni belgilang.",
        ],
        confidence: stats24h.readings > 0 ? 'medium' : 'low',
      };
    }
    return {
      title: alert.title,
      severity: alert.severity.toLowerCase() as LLMOutput['severity'],
      explanation: alert.explanation,
      facts: [...alert.facts, dayFact],
      assumptions: alert.assumptions,
      recommendations: [alert.recommendation],
      confidence: alert.confidence.toLowerCase() as LLMOutput['confidence'],
    };
  },
};
