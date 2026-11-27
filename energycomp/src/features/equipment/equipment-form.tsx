'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { equipmentInputSchema, type EquipmentInput } from '@/schemas/equipment';

export interface EquipmentFormValues {
  id?: string;
  name: string;
  code: string;
  factoryId: string;
  categoryId: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  nominalPowerKw: number;
  idleThresholdKw: number | null;
  standbyThresholdKw: number | null;
  baselinePowerKw: number | null;
  sensorId: string | null;
  dataSource: 'DEMO' | 'REAL';
  hasProductionSignal: boolean;
  mapX?: number;
  mapY?: number;
}

export function EquipmentFormModal({
  open,
  onClose,
  onSaved,
  initial,
  factories,
  categories,
  defaultFactoryId,
  position,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (eq: { id: string }) => void;
  initial?: EquipmentFormValues | null;
  factories: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  defaultFactoryId?: string;
  position?: { mapX: number; mapY: number };
}) {
  const editing = Boolean(initial?.id);
  const [error, setError] = useState<string | null>(null);
  const toNum = (v: number | null | undefined) => (v === null || v === undefined ? (NaN as unknown as number) : v);
  const { register, handleSubmit, formState, control, setError: setFieldError } = useForm<EquipmentInput>({
    resolver: zodResolver(equipmentInputSchema),
    defaultValues: initial
      ? {
          ...initial,
          categoryId: initial.categoryId ?? '',
          manufacturer: initial.manufacturer ?? '',
          model: initial.model ?? '',
          location: initial.location ?? '',
          sensorId: initial.sensorId ?? '',
          idleThresholdKw: toNum(initial.idleThresholdKw),
          standbyThresholdKw: toNum(initial.standbyThresholdKw),
          baselinePowerKw: toNum(initial.baselinePowerKw),
        }
      : {
          name: '',
          code: '',
          factoryId: defaultFactoryId ?? factories[0]?.id ?? '',
          categoryId: '',
          dataSource: 'DEMO',
          hasProductionSignal: false,
          nominalPowerKw: NaN,
          ...(position ?? {}),
        },
  });
  const dataSource = useWatch({ control, name: 'dataSource' });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const body = { ...values, categoryId: values.categoryId || null };
      const res = editing
        ? await api<{ id: string }>(`/api/equipment/${initial!.id}`, { method: 'PATCH', body })
        : await api<{ id: string }>('/api/equipment', { body });
      onSaved(res);
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiClientError) {
        for (const [k, v] of Object.entries(e.fieldErrors())) setFieldError(k as keyof EquipmentInput, { message: v });
      }
    }
  });
  const err = formState.errors;
  const numOpts = { setValueAs: (v: string) => (v === '' ? NaN : Number(v)) };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Uskunani tahrirlash' : 'Yangi uskuna'}
      description="Nominal quvvat — uskuna pasportidagi maksimal quvvat (kW)."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form="equipment-form" loading={formState.isSubmitting}>
            {editing ? 'Saqlash' : 'Qo‘shish'}
          </Button>
        </>
      }
    >
      <form id="equipment-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nomi" required error={err.name?.message}>
            {(p) => <Input {...p} {...register('name')} placeholder="Masalan: CNC frezer #1" />}
          </Field>
          <Field label="Kod" required error={err.code?.message} hint="Tashkilot ichida yagona, masalan CNC-05">
            {(p) => <Input {...p} {...register('code')} />}
          </Field>
          <Field label="Zavod" required error={err.factoryId?.message}>
            {(p) => (
              <Select {...p} {...register('factoryId')}>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Turi / kategoriya" error={err.categoryId?.message}>
            {(p) => (
              <Select {...p} {...register('categoryId')}>
                <option value="">Kategoriyasiz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Joylashuv" error={err.location?.message}>
            {(p) => <Input {...p} {...register('location')} placeholder="Sex A, 2-qator" />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ishlab chiqaruvchi">{(p) => <Input {...p} {...register('manufacturer')} />}</Field>
            <Field label="Model">{(p) => <Input {...p} {...register('model')} />}</Field>
          </div>
        </div>
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-navy">Quvvat parametrlari (kW)</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nominal quvvat" required error={err.nominalPowerKw?.message}>
              {(p) => <Input type="number" step="0.1" min="0" inputMode="decimal" {...p} {...register('nominalPowerKw', numOpts)} />}
            </Field>
            <Field label="Baseline (odatiy)" error={err.baselinePowerKw?.message} hint="Ishlayotgandagi o‘rtacha">
              {(p) => <Input type="number" step="0.1" min="0" inputMode="decimal" {...p} {...register('baselinePowerKw', numOpts)} />}
            </Field>
            <Field label="Kutish chegarasi" error={err.standbyThresholdKw?.message} hint="Standart: nominalning 20%">
              {(p) => <Input type="number" step="0.1" min="0" inputMode="decimal" {...p} {...register('standbyThresholdKw', numOpts)} />}
            </Field>
            <Field label="To‘xtash chegarasi" error={err.idleThresholdKw?.message} hint="Standart: nominalning 3%">
              {(p) => <Input type="number" step="0.1" min="0" inputMode="decimal" {...p} {...register('idleThresholdKw', numOpts)} />}
            </Field>
          </div>
        </fieldset>
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-navy">Ma’lumot manbasi</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Manba" error={err.dataSource?.message}>
              {(p) => (
                <Select {...p} {...register('dataSource')}>
                  <option value="DEMO">Demo (simulyatsiya)</option>
                  <option value="REAL">Real (sensor / gateway)</option>
                </Select>
              )}
            </Field>
            <Field label="Sensor yoki gateway identifikatori" error={err.sensorId?.message} hint={dataSource === 'REAL' ? 'HTTP ingest’dagi sensorId bilan bir xil bo‘lsin' : undefined}>
              {(p) => <Input {...p} {...register('sensorId')} placeholder="GW-01-CNC05" />}
            </Field>
          </div>
          <Checkbox
            className="mt-4"
            label="Ishlab chiqarish signali manbasi bor"
            description="Uskuna yoki PLC “ishlab chiqaryapti / yo‘q” signalini yuboradi. Bu bo‘lmasa AI “ishlab chiqarmayapti” degan xulosa chiqarmaydi."
            {...register('hasProductionSignal')}
          />
          {dataSource === 'REAL' && (
            <Notice tone="info" className="mt-4">
              Real manbali uskuna uchun ma’lumot faqat HTTP ingest API orqali keladi (Sozlamalar → Integratsiyalar). Ma’lumot kelmaguncha holati “Aloqa yo‘q” bo‘ladi.
            </Notice>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
