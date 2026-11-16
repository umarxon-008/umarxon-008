"use client";

import * as React from "react";
import { Boxes, PackageMinus, PackagePlus, AlertTriangle, CalendarX, Wallet, TrendingDown, ShoppingCart, RotateCcw, Search, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, Chip, DemoNote, Kpi, Modal, ModuleHero, Toast, formatDay, formatSum } from "@/components/modules/common";

type Key = "ok" | "low" | "expiring" | "expired";
interface Row { id: string; name: string; category: string; unit: string; qty: number; min: number; avgDaily: number; batch: string; expiry: string; shelf: string; price: number; status: { key: Key; label: string; left: number }; cover: number | null }
interface Data {
  analysis: {
    rows: Row[]; value: number; counts: { total: number; ok: number; low: number; expiring: number; expired: number };
    declining: { id: string; name: string; qty: number; unit: string; min: number; cover: number }[];
    expiring: { id: string; name: string; qty: number; unit: string; expiry: string; left: number }[];
    reorder: { id: string; name: string; unit: string; suggest: number; cost: number }[];
    distribution: Record<Key, number>; rules: { leadTime: number; expiryWarn: number };
  };
  movements: { id: string; itemId: string; type: "in" | "out"; qty: number; note?: string; at: string }[];
  outflow: { date: string; qty: number }[];
}

const TONE: Record<Key, { cls: string; color: string }> = {
  ok: { cls: "bg-emerald-100 text-emerald-800", color: "#10B981" },
  low: { cls: "bg-amber-100 text-amber-800", color: "#F59E0B" },
  expiring: { cls: "bg-violet-100 text-violet-800", color: "#7C3AED" },
  expired: { cls: "bg-red-100 text-red-800", color: "#DC2626" },
};
const LABEL: Record<Key, string> = { ok: "Meʼyorda", low: "Kam qolgan", expiring: "Muddati yaqin", expired: "Muddati oʻtgan" };

const fmtMln = (n: number) => `${(n / 1_000_000).toFixed(1).replace(".", ",")} mln`;

export function StockClient() {
  const [data, setData] = React.useState<Data | null>(null);
  const [filter, setFilter] = React.useState<Key | "all">("all");
  const [q, setQ] = React.useState("");
  const [move, setMove] = React.useState<{ row: Row; type: "in" | "out" } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => api<Data>("/api/stock").then(setData).catch((e) => setError(e.message)), []);
  React.useEffect(() => { load(); }, [load]);

  const reset = async () => {
    if (!confirm("Demo ombor boshlangʻich holatga qaytarilsinmi?")) return;
    await api("/api/stock/reset", { method: "POST" }).catch(() => {});
    setData(null); load(); setToast("Ombor qayta tiklandi");
  };

  if (error) return <p className="m-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) return <div className="p-4 space-y-3"><LoadingCard /><LoadingCard /></div>;
  const a = data.analysis;
  const rows = a.rows.filter((r) => (filter === "all" || r.status.key === filter) && (!q || `${r.name} ${r.category} ${r.batch}`.toLowerCase().includes(q.toLowerCase())));
  const nameOf = (id: string) => a.rows.find((r) => r.id === id)?.name || "—";

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={Boxes} name="MEDSTOCK AI" title="Dorixona zaxirasi nazorat ostida" text="Qoldiq, yaroqlilik muddati va sarf tezligi asosida qaysi dori tugayotgani va nimani buyurtma qilish kerakligini koʻrsatadi."
        right={<Button variant="secondary" size="sm" onClick={reset} className="hidden sm:inline-flex"><RotateCcw className="h-4 w-4" /> Tiklash</Button>} />
      <DemoNote>Demo ombor: pozitsiyalar, narxlar va harakatlar namunaviy. “AI” tavsiyalari hozircha qoidaga asoslangan hisob-kitob (yetkazib berish {a.rules.leadTime} kun, muddat ogohlantirishi {a.rules.expiryWarn} kun).</DemoNote>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Boxes} label="Pozitsiyalar" value={a.counts.total} hint={`${a.counts.ok} tasi meʼyorda`} />
        <Kpi icon={TrendingDown} tone="amber" label="Kam qolgan" value={a.counts.low} hint="minimal zaxiradan past" />
        <Kpi icon={CalendarX} tone="violet" label="Muddati yaqin / oʻtgan" value={`${a.counts.expiring} / ${a.counts.expired}`} hint={`${a.rules.expiryWarn} kun ichida`} />
        <Kpi icon={Wallet} tone="teal" label="Zaxira qiymati" value={fmtMln(a.value)} hint="soʻm, namunaviy narxlarda" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="card-base p-4 lg:col-span-2">
          <h3 className="font-bold text-slate-900 dark:text-white">Soʻnggi 14 kunlik chiqim</h3>
          <OutflowChart data={data.outflow} />
        </section>
        <section className="card-base p-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Holat boʻyicha taqsimot</h3>
          <Donut dist={a.distribution} />
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Insight icon={TrendingDown} title="Tez tugayotganlar" empty="Hammasi yetarli">
          {a.declining.slice(0, 5).map((d) => <li key={d.id} className="flex justify-between gap-2"><span className="truncate">{d.name}</span><b className="shrink-0 text-amber-700">~{d.cover} kunga</b></li>)}
        </Insight>
        <Insight icon={AlertTriangle} title="Muddati yaqinlashganlar" empty="Yoʻq">
          {a.expiring.slice(0, 5).map((d) => <li key={d.id} className="flex justify-between gap-2"><span className="truncate">{d.name}</span><b className={cn("shrink-0", d.left < 0 ? "text-red-600" : "text-violet-700")}>{d.left < 0 ? "oʻtgan" : `${d.left} kun`}</b></li>)}
        </Insight>
        <Insight icon={ShoppingCart} title="Buyurtma tavsiyasi" empty="Buyurtma shart emas">
          {a.reorder.slice(0, 5).map((d) => <li key={d.id} className="flex justify-between gap-2"><span className="truncate">{d.name}</span><b className="shrink-0 text-teal-700">+{d.suggest} {d.unit}</b></li>)}
          {a.reorder.length > 0 && <li className="pt-1 text-[11px] text-slate-400">Jami taxminiy: {formatSum(a.reorder.reduce((s, r) => s + r.cost, 0))}</li>}
        </Insight>
      </div>

      <section className="card-base p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-slate-900 dark:text-white mr-auto">Zaxira roʻyxati</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, turkum yoki partiya" aria-label="Zaxiradan qidirish" className="input-base pl-9 py-2" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>Barchasi ({a.rows.length})</Chip>
          {(Object.keys(LABEL) as Key[]).map((k) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{LABEL[k]} ({a.distribution[k]})</Chip>)}
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-3">Dori</th><th className="pr-3">Qoldiq</th><th className="pr-3">Yetadi</th><th className="pr-3">Muddati</th><th className="pr-3">Holat</th><th className="text-right">Harakat</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3"><p className="font-semibold text-slate-800 dark:text-slate-100">{r.name}</p><p className="text-[11px] text-slate-400">{r.category} · {r.batch} · {r.shelf}</p></td>
                  <td className="pr-3"><b className={cn(r.qty < r.min && "text-amber-700")}>{r.qty}</b> <span className="text-slate-400">{r.unit}</span><p className="text-[11px] text-slate-400">min {r.min}</p></td>
                  <td className="pr-3 text-slate-600 dark:text-slate-300">{r.cover === null ? "—" : `~${r.cover} kun`}</td>
                  <td className="pr-3 text-slate-600 dark:text-slate-300">{formatDay(r.expiry)}</td>
                  <td className="pr-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[r.status.key].cls)}>{r.status.label}</span></td>
                  <td className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" aria-label={`${r.name}: kirim`} onClick={() => setMove({ row: r, type: "in" })}><PackagePlus className="h-4 w-4 text-emerald-600" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`${r.name}: chiqim`} onClick={() => setMove({ row: r, type: "out" })} disabled={r.qty === 0}><PackageMinus className="h-4 w-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Mos pozitsiya topilmadi.</p>}
        </div>
      </section>

      <section className="card-base p-4">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Soʻnggi harakatlar</h3>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {data.movements.slice(0, 10).map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", m.type === "in" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>{m.type === "in" ? <PackagePlus className="h-4 w-4" /> : <PackageMinus className="h-4 w-4" />}</span>
              <span className="flex-1 min-w-0 truncate">{nameOf(m.itemId)} <span className="text-slate-400">· {m.note}</span></span>
              <b className={m.type === "in" ? "text-emerald-600" : "text-red-500"}>{m.type === "in" ? "+" : "−"}{m.qty}</b>
              <span className="w-24 text-right text-[11px] text-slate-400">{formatDay(m.at)}</span>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-3 sm:hidden w-full" onClick={reset}><RotateCcw className="h-4 w-4" /> Demo omborni tiklash</Button>
      </section>

      {move && <MoveModal move={move} onClose={() => setMove(null)} onDone={(msg) => { setMove(null); setToast(msg); load(); }} />}
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function Insight({ icon: Icon, title, empty, children }: { icon: React.ElementType; title: string; empty: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <section className="card-base p-4">
      <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Icon className="h-4 w-4 text-teal-600" />{title}</h3>
      {items.length ? <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">{items}</ul> : <p className="mt-2 text-sm text-slate-400">{empty}</p>}
      <p className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400"><Lightbulb className="h-3 w-3" /> Qoidaga asoslangan tavsiya</p>
    </section>
  );
}

function OutflowChart({ data }: { data: { date: string; qty: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.qty));
  const W = 560, H = 180, pad = 24, bw = (W - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="mt-3 w-full h-auto" role="img" aria-label="14 kunlik chiqim grafigi">
      <defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0E9AA0" /><stop offset="100%" stopColor="#6D28D9" /></linearGradient></defs>
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={pad} x2={W - pad} y1={H - (H - 20) * f} y2={H - (H - 20) * f} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />)}
      {data.map((d, i) => {
        const h = ((H - 20) * d.qty) / max;
        const x = pad + i * bw + bw * 0.18;
        return (
          <g key={d.date}>
            <rect x={x} y={H - h} width={bw * 0.64} height={Math.max(h, 1)} rx={4} fill="url(#bar)"><title>{`${formatDay(d.date)}: ${d.qty}`}</title></rect>
            {d.qty > 0 && <text x={x + bw * 0.32} y={H - h - 4} textAnchor="middle" fontSize="10" className="fill-slate-500">{d.qty}</text>}
            {i % 2 === 0 && <text x={x + bw * 0.32} y={H + 16} textAnchor="middle" fontSize="10" className="fill-slate-400">{Number(d.date.slice(8, 10))}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ dist }: { dist: Record<Key, number> }) {
  const keys = Object.keys(LABEL) as Key[];
  const total = keys.reduce((s, k) => s + dist[k], 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="mt-3 flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label="Holat boʻyicha taqsimot">
        <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeWidth="18" className="text-slate-100 dark:text-slate-800" />
        {keys.map((k) => {
          const len = (dist[k] / total) * C;
          const el = <circle key={k} cx="70" cy="70" r={R} fill="none" stroke={TONE[k].color} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />;
          acc += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="800" className="fill-slate-800 dark:fill-white">{total}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" className="fill-slate-400">pozitsiya</text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {keys.map((k) => <li key={k} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[k].color }} />{LABEL[k]} <b className="ml-auto pl-3">{dist[k]}</b></li>)}
      </ul>
    </div>
  );
}

function MoveModal({ move, onClose, onDone }: { move: { row: Row; type: "in" | "out" }; onClose: () => void; onDone: (msg: string) => void }) {
  const [qty, setQty] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { row, type } = move;
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ status: { label: string } }>("/api/stock/movements", { method: "POST", json: { itemId: row.id, type, qty: Number(qty), note } });
      onDone(`${row.name}: ${type === "in" ? "kirim" : "chiqim"} saqlandi · holat: ${r.status.label}`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`${type === "in" ? "Kirim" : "Chiqim"} — ${row.name}`}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Hozirgi qoldiq: <b>{row.qty} {row.unit}</b> · minimal: {row.min}</p>
        <label className="block"><span className="label-base">Miqdor ({row.unit})</span>
          <input type="number" min={1} max={type === "out" ? row.qty : 10000} value={qty} onChange={(e) => setQty(e.target.value)} className="input-base" autoFocus /></label>
        <label className="block"><span className="label-base">Izoh (ixtiyoriy)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} className="input-base" placeholder={type === "in" ? "Yetkazib beruvchidan" : "Sotuv"} /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button variant="gradient" className="w-full" disabled={!qty || busy} onClick={submit}>Saqlash</Button>
      </div>
    </Modal>
  );
}
