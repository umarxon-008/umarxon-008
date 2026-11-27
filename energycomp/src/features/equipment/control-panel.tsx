'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Power, PlayCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox, Field, FormError, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatDateTime } from '@/lib/format';
import { CONTROL_ACTION_LABELS, CONTROL_STATUS_LABELS } from '@/lib/labels';

interface ControlReq {
  id: string;
  action: 'STOP' | 'START';
  reason: string;
  status: keyof typeof CONTROL_STATUS_LABELS;
  requestedById: string;
  requestedByName: string;
  reviewedByName: string | null;
  reviewNote: string | null;
  result: string | null;
  createdAt: string;
}

export function ControlPanel({
  equipmentId,
  dataSource,
  simulatedState,
  canRequest,
  canReview,
  userId,
  timezone,
}: {
  equipmentId: string;
  dataSource: 'DEMO' | 'REAL';
  simulatedState: string | null;
  canRequest: boolean;
  canReview: boolean;
  userId: string;
  timezone: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const { data: state, reload: load } = useApiData<{ status: { mode: 'READ_ONLY' | 'SIMULATION'; realAdapterAvailable: boolean }; requests: ControlReq[] }>(
    `/api/control?equipmentId=${equipmentId}`,
  );
  const [modal, setModal] = useState<'STOP' | 'START' | null>(null);
  const [reason, setReason] = useState('');
  const [safety, setSafety] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);


  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api('/api/control', { body: { equipmentId, action: modal, reason, safetyConfirmed: safety } });
      push('success', 'So‘rov yuborildi. Ikkinchi vakolatli shaxs tasdig‘i kutilmoqda.');
      setModal(null);
      setReason('');
      setSafety(false);
      void load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, decision: 'APPROVE' | 'REJECT') {
    try {
      const r = await api<{ status: string; result: string | null }>(`/api/control/${id}`, { body: { decision } });
      push(r.status === 'FAILED' ? 'error' : 'success', r.result ?? (decision === 'REJECT' ? 'So‘rov rad etildi' : 'Bajarildi'));
      void load();
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    }
  }

  async function cancel(id: string) {
    try {
      await api(`/api/control/${id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      push('error', errorMessage(e));
    }
  }

  const mode = state?.status.mode;
  const pending = state?.requests.find((r) => r.status === 'PENDING');
  return (
    <Card>
      <CardHeader
        title="Smart Control"
        icon={<ShieldAlert className="h-5 w-5 text-orange" aria-hidden />}
        description="AI uskunani o‘zi boshqarmaydi"
        action={mode && <Badge tone={mode === 'READ_ONLY' ? 'gray' : 'amber'}>{mode === 'READ_ONLY' ? 'READ-ONLY' : 'Simulyatsiya'}</Badge>}
      />
      <CardBody className="space-y-3">
        {!state ? (
          <p className="text-sm text-muted">Yuklanmoqda...</p>
        ) : (
          <>
            <Notice tone="warning">
              {mode === 'SIMULATION' ? 'Simulyatsiya: real uskunaga buyruq yuborilmaydi.' : 'Faqat kuzatuv rejimi (READ-ONLY).'}
            </Notice>
            {simulatedState === 'STOPPED' && <Badge tone="amber">Simulyatsiya holati: to‘xtatilgan</Badge>}
            {mode === 'SIMULATION' && dataSource === 'DEMO' && canRequest && !pending && (
              <div className="flex flex-wrap gap-2">
                {simulatedState === 'STOPPED' ? (
                  <Button variant="success" onClick={() => setModal('START')}>
                    <PlayCircle className="h-4 w-4" aria-hidden /> Ishga tushirishni so‘rash (simulyatsiya)
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => setModal('STOP')}>
                    <Power className="h-4 w-4" aria-hidden /> To‘xtatishni so‘rash (simulyatsiya)
                  </Button>
                )}
              </div>
            )}
            {mode === 'SIMULATION' && dataSource === 'REAL' && <p className="text-sm text-muted">Real manbali uskuna uchun boshqaruv mavjud emas.</p>}
            {state.requests.length > 0 && (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {state.requests.slice(0, 5).map((r) => (
                  <li key={r.id} className="p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-navy">{CONTROL_ACTION_LABELS[r.action]}</span>
                      <Badge tone={r.status === 'PENDING' ? 'blue' : r.status === 'EXECUTED_SIMULATED' ? 'green' : r.status === 'FAILED' ? 'red' : 'gray'}>{CONTROL_STATUS_LABELS[r.status]}</Badge>
                      <span className="ml-auto text-xs text-muted">{formatDateTime(r.createdAt, timezone)}</span>
                    </div>
                    <p className="mt-1 text-muted">
                      {r.requestedByName}: “{r.reason}”{r.reviewedByName && ` · Ko‘rib chiqdi: ${r.reviewedByName}`}
                    </p>
                    {r.result && <p className="mt-1 text-xs text-muted">{r.result}</p>}
                    {r.status === 'PENDING' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {canReview && r.requestedById !== userId && (
                          <>
                            <Button size="sm" variant="success" onClick={() => review(r.id, 'APPROVE')}>Tasdiqlash (simulyatsiya)</Button>
                            <Button size="sm" variant="outline" onClick={() => review(r.id, 'REJECT')}>Rad etish</Button>
                          </>
                        )}
                        {r.requestedById === userId && <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Bekor qilish</Button>}
                        {r.requestedById === userId && <span className="text-xs text-muted">Boshqa Owner/Manager tasdiqlashi kerak.</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardBody>
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'STOP' ? 'To‘xtatishni so‘rash' : 'Ishga tushirishni so‘rash'}
        description="Simulyatsiya — real uskunaga buyruq yuborilmaydi."
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>Bekor qilish</Button>
            <Button variant={modal === 'STOP' ? 'danger' : 'success'} onClick={submit} loading={busy} disabled={reason.trim().length < 5 || !safety}>
              So‘rov yuborish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError message={error} />
          <Field label="Sabab" required>
            {(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />}
          </Field>
          <Checkbox
            checked={safety}
            onChange={(e) => setSafety(e.target.checked)}
            label="Jarayon xavfsizligini tekshirdim"
            description="Uskuna yonida odam yo‘q, jarayon xavfsiz."
          />
        </div>
      </Modal>
    </Card>
  );
}
