'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bot, CheckCircle2, Eye, HelpCircle, PlayCircle, RotateCcw, XCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { AlertStatusBadge, ConfidenceBadge, SeverityBadge, SourceBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatDateTime, formatEvidence, formatRelative } from '@/lib/format';
import { ALERT_STATUS_LABELS, RULE_LABELS, type AlertStatusName, type ConfidenceName, type SeverityName } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { AnalysisCard, type AnalysisRecord } from './analysis-card';

interface Evidence {
  label: string;
  value: number | string;
  unit?: string;
  at?: string;
}
interface AlertItem {
  id: string;
  title: string;
  rule: keyof typeof RULE_LABELS;
  severity: SeverityName;
  status: AlertStatusName;
  confidence: ConfidenceName;
  source: 'DEMO' | 'REAL';
  conditionActive: boolean;
  detectedAt: string;
  lastCheckedAt: string;
  windowStart: string;
  windowEnd: string;
  explanation: string;
  recommendation: string;
  equipment: { id: string; name: string; code: string };
  details: { items: Evidence[]; facts: string[]; assumptions: string[] };
}
interface AlertDetail extends AlertItem {
  reviewedByName: string | null;
  reviewedAt: string | null;
  events: { id: string; fromStatus: AlertStatusName | null; toStatus: AlertStatusName; note: string | null; createdAt: string; actorName: string }[];
  aiAnalyses: AnalysisRecord[];
}

const RULES_INFO: { rule: keyof typeof RULE_LABELS; text: string }[] = [
  { rule: 'NO_PRODUCTION_SIGNAL', text: '5 daqiqa davomida faol quvvat bor, lekin ishlab chiqarish signali kelmagan (faqat signal manbasi ulangan uskunalar uchun).' },
  { rule: 'ABOVE_BASELINE', text: 'So‘nggi 30 daqiqada o‘rtacha quvvat baseline’dan 20%+ yuqori.' },
  { rule: 'NO_DATA', text: '10 daqiqadan ortiq o‘lchov kelmagan (60+ daqiqa — jiddiy).' },
  { rule: 'SUDDEN_CHANGE', text: 'So‘nggi 10 daqiqa o‘rtachasi oldingi soatdan 1,8 barobar yuqori.' },
  { rule: 'LONG_STANDBY', text: '60 daqiqadan ortiq kutish rejimida energiya sarflanmoqda.' },
];

export function InspectorView({
  timezone,
  equipmentOptions,
  perms,
  ai,
  quota,
}: {
  timezone: string;
  equipmentOptions: { id: string; name: string }[];
  perms: { update: boolean; run: boolean; analyze: boolean; feedback: boolean };
  ai: { llmRequested: boolean; configured: boolean; model: string | null; planAllowsLlm: boolean };
  quota: { used: number; limit: number };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const [status, setStatus] = useState<string>(params.get('status') ?? 'OPEN');
  const [severity, setSeverity] = useState('');
  const [equipmentId, setEquipmentId] = useState(params.get('equipmentId') ?? '');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('alert'));
  const listUrl = useMemo(() => {
    const sp = new URLSearchParams({ status, page: String(page) });
    if (severity) sp.set('severity', severity);
    if (equipmentId) sp.set('equipmentId', equipmentId);
    return `/api/alerts?${sp}`;
  }, [status, severity, equipmentId, page]);
  const { data: list, error, reload: loadList } = useApiData<{ items: AlertItem[]; total: number; pageSize: number; countsByStatus: Record<string, number> }>(listUrl);
  const detailQ = useApiData<AlertDetail>(selectedId ? `/api/alerts/${selectedId}` : null);
  const detail = detailQ.data && detailQ.data.id === selectedId ? detailQ.data : null;
  const setDetail = (d: AlertDetail) => detailQ.setData(() => d);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [quotaUsed, setQuotaUsed] = useState(quota.used);


  async function changeStatus(next: AlertStatusName) {
    if (!detail) return;
    setBusy(next);
    try {
      setDetail(await api<AlertDetail>(`/api/alerts/${detail.id}`, { method: 'PATCH', body: { status: next, note: note || undefined } }));
      setNote('');
      push('success', `Holat: ${ALERT_STATUS_LABELS[next]}`);
      loadList();
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function runNow() {
    setBusy('run');
    try {
      const r = await api<{ created: number; updated: number; checked: number }>('/api/inspector/run', { method: 'POST' });
      push('success', `${r.checked} ta uskuna tekshirildi: ${r.created} ta yangi, ${r.updated} ta yangilangan ogohlantirish`);
      loadList();
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    if (!detail) return;
    setBusy('ai');
    try {
      const a = await api<AnalysisRecord>('/api/ai/analyze', { body: { alertId: detail.id } });
      setDetail({ ...detail, aiAnalyses: [a, ...detail.aiAnalyses] });
      setQuotaUsed((q) => q + 1);
      push('success', a.status === 'FALLBACK' ? 'LLM ishlamadi — qoidaga asoslangan tahlil qaytarildi' : 'AI tahlil tayyor');
    } catch (e) {
      push('error', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const c = list?.countsByStatus ?? {};
  return (
    <div>
      <PageHeader
        title="AI Inspector"
        description="Noodatiy sarf, bekor ishlash va aloqa uzilishini aniqlaydi. AI tavsiyasi — operator qarorini almashtirmaydi."
        actions={
          <>
            <Badge tone={ai.configured && ai.planAllowsLlm ? 'violet' : 'gray'} icon={<Bot className="h-3 w-3" aria-hidden />}>
              {ai.configured && ai.planAllowsLlm ? `LLM: ${ai.model}` : 'Qoidaga asoslangan rejim'}
            </Badge>
            <Badge tone="blue">Bugungi AI tahlil: {quotaUsed}/{quota.limit}</Badge>
            {perms.run && (
              <Button onClick={runNow} loading={busy === 'run'}>
                {busy !== 'run' && <PlayCircle className="h-4 w-4" aria-hidden />} Hozir tekshirish
              </Button>
            )}
          </>
        }
      />
      {!ai.configured && (
        <Notice tone="info" className="mb-4">
          LLM provayderi ulanmagan{ai.llmRequested ? ' (ANTHROPIC_API_KEY yo‘q)' : ''} — barcha tahlillar qoidaga asoslangan dvigatel tomonidan, faqat bazadagi o‘lchovlar asosida tuziladi.
        </Notice>
      )}
      {ai.configured && !ai.planAllowsLlm && <Notice tone="info" className="mb-4">LLM tahlil Pro tarifida. Free tarifida qoidaga asoslangan tahlil ishlaydi.</Notice>}

      <details className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
        <summary className="cursor-pointer text-sm font-semibold text-navy">Aniqlash qoidalari (5 ta)</summary>
        <ul className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-2">
          {RULES_INFO.map((r) => (
            <li key={r.rule}>
              <span className="font-semibold text-navy">{RULE_LABELS[r.rule]}:</span> {r.text}
            </li>
          ))}
        </ul>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Holat bo‘yicha filtr"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'OPEN', label: `Ochiq (${(c.NEW ?? 0) + (c.ACKNOWLEDGED ?? 0)})` },
            { value: 'NEW', label: `Yangi (${c.NEW ?? 0})` },
            { value: 'ACKNOWLEDGED', label: `Ko‘rilmoqda (${c.ACKNOWLEDGED ?? 0})` },
            { value: 'RESOLVED', label: `Hal qilingan (${c.RESOLVED ?? 0})` },
            { value: 'DISMISSED', label: `Rad etilgan (${c.DISMISSED ?? 0})` },
            { value: 'ALL', label: 'Barchasi' },
          ]}
        />
        <label className="sr-only" htmlFor="sev">Daraja</label>
        <Select id="sev" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} className="w-44">
          <option value="">Barcha darajalar</option>
          <option value="CRITICAL">Jiddiy</option>
          <option value="WARNING">Ogohlantirish</option>
          <option value="INFO">Ma’lumot</option>
        </Select>
        <label className="sr-only" htmlFor="eqf">Uskuna</label>
        <Select id="eqf" value={equipmentId} onChange={(e) => { setEquipmentId(e.target.value); setPage(1); }} className="w-56">
          <option value="">Barcha uskunalar</option>
          {equipmentOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className={cn(selectedId && 'hidden xl:block')}>
          {error ? (
            <ErrorState message={error} action={<Button onClick={loadList}>Qayta urinish</Button>} />
          ) : !list ? (
            <Spinner />
          ) : list.items.length === 0 ? (
            <EmptyState title="Ogohlantirish yo‘q" description="Tanlangan filtrlar bo‘yicha hech narsa topilmadi." />
          ) : (
            <>
              <ul className="divide-y divide-line">
                {list.items.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      aria-current={a.id === selectedId}
                      className={cn('w-full px-4 py-3 text-left hover:bg-surface', a.id === selectedId && 'bg-brand-50')}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SeverityBadge severity={a.severity} />
                        <AlertStatusBadge status={a.status} />
                        {a.source === 'DEMO' && <SourceBadge source="DEMO" compact />}
                        <span className="ml-auto text-xs text-muted">{formatRelative(a.detectedAt)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-navy">{a.title}</p>
                      <p className="text-xs text-muted">{RULE_LABELS[a.rule]}{!a.conditionActive && ' · holat hozir kuzatilmayapti'}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-4"><Pagination page={page} pageSize={list.pageSize} total={list.total} onChange={setPage} /></div>
            </>
          )}
        </Card>

        <div className={cn(!selectedId && 'hidden xl:block')}>
          {!selectedId ? (
            <Card><EmptyState title="Ogohlantirishni tanlang" icon={<Eye className="h-6 w-6" aria-hidden />} /></Card>
          ) : !detail ? (
            <Card>{detailQ.error ? <ErrorState message={detailQ.error} action={<Button onClick={() => setSelectedId(null)}>Yopish</Button>} /> : <Spinner />}</Card>
          ) : (
            <div className="space-y-5">
              <Card>
                <CardBody>
                  <button type="button" onClick={() => setSelectedId(null)} className="mb-3 text-sm font-semibold text-brand xl:hidden">← Ro‘yxatga qaytish</button>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={detail.severity} />
                    <AlertStatusBadge status={detail.status} />
                    <ConfidenceBadge confidence={detail.confidence} />
                    <SourceBadge source={detail.source} />
                    <Badge tone={detail.conditionActive ? 'orange' : 'gray'}>{detail.conditionActive ? 'Holat davom etmoqda' : 'Holat hozir kuzatilmayapti'}</Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-navy">{detail.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    <Link href={`/app/equipment/${detail.equipment.id}`} className="font-semibold text-brand hover:underline">{detail.equipment.name}</Link>
                    {' · '}Aniqlandi: {formatDateTime(detail.detectedAt, timezone)} · Oxirgi tekshiruv: {formatDateTime(detail.lastCheckedAt, timezone)}
                  </p>
                  <p className="mt-3 text-sm text-navy">{detail.explanation}</p>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <caption className="bg-surface px-3 py-2 text-left text-xs font-semibold text-muted">
                        Dalillar · oraliq {formatDateTime(detail.windowStart, timezone)} — {formatDateTime(detail.windowEnd, timezone)}
                      </caption>
                      <tbody className="divide-y divide-line">
                        {detail.details.items.map((e) => (
                          <tr key={e.label}>
                            <th scope="row" className="px-3 py-2 text-left font-normal text-muted">{e.label}</th>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-navy">
                              {formatEvidence(e, timezone)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <section className="rounded-xl bg-energy-50 p-3">
                      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-energy-600"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Aniqlangan fakt</h3>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-navy">{detail.details.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                    </section>
                    <section className="rounded-xl bg-amber-50 p-3">
                      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#9a6b00]"><HelpCircle className="h-3.5 w-3.5" aria-hidden /> Taxmin</h3>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-navy">{detail.details.assumptions.length ? detail.details.assumptions.map((f) => <li key={f}>{f}</li>) : <li>—</li>}</ul>
                    </section>
                  </div>
                  <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-brand-600">Tavsiya</h3>
                    <p className="mt-1 text-sm text-navy">{detail.recommendation}</p>
                  </div>

                  {perms.update && (
                    <div className="mt-4 space-y-2 border-t border-line pt-4">
                      <label htmlFor="alert-note" className="text-sm font-medium text-navy">Izoh (ixtiyoriy)</label>
                      <Textarea id="alert-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-[60px]" placeholder="Masalan: operator tekshirdi, sozlama tuzatildi" />
                      <div className="flex flex-wrap gap-2">
                        {detail.status === 'NEW' && <Button variant="secondary" onClick={() => changeStatus('ACKNOWLEDGED')} loading={busy === 'ACKNOWLEDGED'}><Eye className="h-4 w-4" aria-hidden /> Ko‘rib chiqilmoqda</Button>}
                        {(detail.status === 'NEW' || detail.status === 'ACKNOWLEDGED') && (
                          <>
                            <Button variant="success" onClick={() => changeStatus('RESOLVED')} loading={busy === 'RESOLVED'}><CheckCircle2 className="h-4 w-4" aria-hidden /> Hal qilindi</Button>
                            <Button variant="outline" onClick={() => changeStatus('DISMISSED')} loading={busy === 'DISMISSED'}><XCircle className="h-4 w-4" aria-hidden /> Rad etish</Button>
                          </>
                        )}
                        {(detail.status === 'RESOLVED' || detail.status === 'DISMISSED') && <Button variant="outline" onClick={() => changeStatus('NEW')} loading={busy === 'NEW'}><RotateCcw className="h-4 w-4" aria-hidden /> Qayta ochish</Button>}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="AI tahlili"
                  icon={<Bot className="h-5 w-5 text-brand" aria-hidden />}
                  description="Dalillar har doim bazadagi o‘lchovlardan olinadi; AI yangi raqam to‘qimaydi."
                  action={perms.analyze && <Button size="sm" variant="secondary" onClick={analyze} loading={busy === 'ai'}>AI tahlil so‘rash</Button>}
                />
                <CardBody className="space-y-3">
                  {detail.aiAnalyses.length === 0 ? (
                    <p className="text-sm text-muted">Bu ogohlantirish uchun hali AI tahlil so‘ralmagan.</p>
                  ) : (
                    detail.aiAnalyses.map((a) => <AnalysisCard key={a.id} analysis={a} timezone={timezone} canFeedback={perms.feedback} />)
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Tarix" description="Kim va qachon ko‘rib chiqqani (audit)" />
                <CardBody>
                  <ol className="space-y-2 text-sm">
                    {detail.events.map((e) => (
                      <li key={e.id} className="flex flex-wrap gap-x-2 border-l-2 border-brand-100 pl-3">
                        <span className="font-semibold text-navy">{e.actorName}</span>
                        <span className="text-muted">{e.fromStatus ? `${ALERT_STATUS_LABELS[e.fromStatus]} → ` : ''}{ALERT_STATUS_LABELS[e.toStatus]}</span>
                        <span className="text-xs text-muted">{formatDateTime(e.createdAt, timezone)}</span>
                        {e.note && <span className="w-full text-xs text-muted">“{e.note}”</span>}
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
