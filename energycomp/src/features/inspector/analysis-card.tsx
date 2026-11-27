'use client';

import { useState } from 'react';
import { CheckCircle2, HelpCircle, Lightbulb, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api-client';
import { formatDateTime, formatEvidence } from '@/lib/format';

export interface AnalysisRecord {
  id: string;
  provider: string;
  model: string | null;
  status: 'SUCCESS' | 'FALLBACK' | 'FAILED';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  errorMessage: string | null;
  feedback: 'HELPFUL' | 'NOT_HELPFUL' | null;
  createdAt: string;
  output: {
    title: string;
    explanation: string;
    facts: string[];
    assumptions: string[];
    recommendations: string[];
    evidence: { label: string; value: number | string; unit?: string; at?: string }[];
    disclaimer: string;
  };
}

export function AnalysisCard({ analysis, timezone, canFeedback }: { analysis: AnalysisRecord; timezone: string; canFeedback: boolean }) {
  const { push } = useToast();
  const [feedback, setFeedback] = useState(analysis.feedback);
  const o = analysis.output;
  async function send(f: 'HELPFUL' | 'NOT_HELPFUL') {
    try {
      await api(`/api/ai/analyses/${analysis.id}/feedback`, { body: { feedback: f } });
      setFeedback(f);
      push('success', 'Bahoingiz uchun rahmat');
    } catch (e) {
      push('error', errorMessage(e));
    }
  }
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={analysis.provider === 'rule-based' ? 'gray' : 'violet'}>
          {analysis.provider === 'rule-based' ? 'Qoidaga asoslangan tahlil' : `LLM: ${analysis.model ?? analysis.provider}`}
        </Badge>
        {analysis.status === 'FALLBACK' && (
          <Badge tone="amber" title={analysis.errorMessage ?? undefined}>
            LLM ishlamadi — fallback
          </Badge>
        )}
        <Badge tone={analysis.confidence === 'HIGH' ? 'green' : analysis.confidence === 'MEDIUM' ? 'amber' : 'gray'}>
          Ishonchlilik: {analysis.confidence === 'HIGH' ? 'yuqori' : analysis.confidence === 'MEDIUM' ? 'o‘rta' : 'past'}
        </Badge>
        <span className="ml-auto text-xs text-muted">{formatDateTime(analysis.createdAt, timezone)}</span>
      </div>
      <h3 className="mt-2 font-semibold text-navy">{o.title}</h3>
      <p className="mt-1 text-sm text-muted">{o.explanation}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <section className="rounded-lg bg-energy-50 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-energy-600">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Aniqlangan faktlar
          </h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-navy">{o.facts.length ? o.facts.map((f) => <li key={f}>{f}</li>) : <li>—</li>}</ul>
        </section>
        <section className="rounded-lg bg-amber-50 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#9a6b00]">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden /> Taxminlar
          </h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-navy">{o.assumptions.length ? o.assumptions.map((f) => <li key={f}>{f}</li>) : <li>—</li>}</ul>
        </section>
        <section className="rounded-lg bg-brand-50 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Tavsiyalar
          </h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-navy">{o.recommendations.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      </div>
      {o.evidence.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          <span className="font-semibold text-navy">Dalillar:</span>{' '}
          {o.evidence.map((e) => `${e.label}: ${formatEvidence(e, timezone)}`).join(' · ')}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">AI tavsiyasi operator qarorini almashtirmaydi.</p>
      {canFeedback && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          Foydali bo‘ldimi?
          <Button size="sm" variant={feedback === 'HELPFUL' ? 'success' : 'outline'} onClick={() => send('HELPFUL')} aria-pressed={feedback === 'HELPFUL'}>
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> Foydali
          </Button>
          <Button size="sm" variant={feedback === 'NOT_HELPFUL' ? 'danger' : 'outline'} onClick={() => send('NOT_HELPFUL')} aria-pressed={feedback === 'NOT_HELPFUL'}>
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden /> Foydasiz
          </Button>
        </div>
      )}
    </article>
  );
}
