import { z } from 'zod';
import type { Evidence } from '@/server/inspector/rules';

/** AI ga beriladigan kontekst — faqat bazadagi haqiqiy qiymatlar. */
export interface AIAnalysisInput {
  equipment: {
    name: string;
    category: string | null;
    nominalPowerKw: number;
    baselinePowerKw: number | null;
    hasProductionSignal: boolean;
    dataSource: 'DEMO' | 'REAL';
    status: string;
  };
  alert: {
    rule: string;
    title: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    explanation: string;
    recommendation: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    evidence: Evidence[];
    facts: string[];
    assumptions: string[];
    windowStart: string;
    windowEnd: string;
  } | null;
  stats24h: {
    energyKwh: number;
    avgPowerKw: number;
    maxPowerKw: number;
    readings: number;
  };
  timezone: string;
}

/** LLM qaytarishi kerak bo'lgan qism. Dalillar (evidence) LLM dan olinmaydi — ular doim bazadan. */
export const llmOutputSchema = z.object({
  title: z.string().min(3).max(200),
  severity: z.enum(['info', 'warning', 'critical']),
  explanation: z.string().min(10).max(2000),
  facts: z.array(z.string().max(400)).max(8),
  assumptions: z.array(z.string().max(400)).max(8),
  recommendations: z.array(z.string().max(400)).min(1).max(6),
  confidence: z.enum(['low', 'medium', 'high']),
});
export type LLMOutput = z.infer<typeof llmOutputSchema>;

export interface AIAnalysisResult extends LLMOutput {
  recommendation: string;
  evidence: Evidence[];
  createdAt: string;
  provider: string;
  model: string | null;
  disclaimer: string;
}

export interface AIProvider {
  readonly id: string;
  readonly model: string | null;
  isConfigured(): boolean;
  analyze(input: AIAnalysisInput): Promise<LLMOutput>;
}

export const AI_DISCLAIMER = 'AI tavsiyasi — operator qarorini almashtirmaydi. Uskunani boshqarish bo‘yicha yakuniy qarorni vakolatli xodim qabul qiladi.';
