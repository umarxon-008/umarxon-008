/** "Salomatligim" modullari: ko'rsatkichlarni baholash, dorilar mosligi, chekap, belgilar bo'yicha yo'naltirish. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessVital, VITALS } from "@/lib/modules/vitals";
import { checkInteractions, identify } from "@/lib/modules/interactions";
import { scoreCheckup, QUESTIONS } from "@/lib/modules/checkup";
import { routeSymptoms } from "@/lib/modules/symptoms";

test("Qon bosimi olib tashlangan; puls va qand baholanadi", () => {
  assert.ok(!VITALS.some((v) => (v.type as string) === "bp"), "koʻrsatkichlarda bosim boʻlmasligi kerak");
  assert.ok(!QUESTIONS.some((q) => q.id === "bp"), "chekapda bosim savoli boʻlmasligi kerak");
  assert.equal(assessVital("pulse", 140, null, []).level, "danger");
  assert.equal(assessVital("pulse", 72, null, []).level, "ok");
});

test("SpO2, qand, harorat chegaralari", () => {
  assert.equal(assessVital("spo2", 88, null, []).emergency, true);
  assert.equal(assessVital("glucose", 3.5, null, []).level, "danger");
  assert.equal(assessVital("temp", 38.2, null, []).level, "warn");
  assert.equal(assessVital("weight", 60, null, [], 165).level, "ok");
});

test("Dorilar mosligi: savdo/rus nomlari, xavfli birikma va takroriy modda", () => {
  assert.equal(identify("Nurofen 200 mg"), "ibuprofen");
  assert.equal(identify("Варфарин"), "warfarin");
  const r = checkInteractions(["Varfarin", "Diklofenak", "Paracetamol 500 mg", "Panadol", "Noma'lum dori"]);
  assert.ok(r.findings.some((f) => f.severity === "high" && /Varfarin/.test(f.aLabel + f.bLabel)));
  assert.ok(r.findings.some((f) => f.severity === "duplicate"));
  assert.deepEqual(r.unknown, ["Noma'lum dori"]);
  assert.equal(checkInteractions(["Omeprazol", "Loratadin"]).findings.length, 0);
});

test("Chekap: ball 0–100, xavfli javob — shoshilinch", () => {
  const best = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options.reduce((bi, o, i, a) => (o.score > a[bi].score ? i : bi), 0)]));
  const r = scoreCheckup(best);
  assert.equal(r.score, 100);
  assert.equal(r.areas.length, 5);
  const chest = QUESTIONS.find((q) => q.id === "chest")!;
  const em = scoreCheckup({ ...best, chest: chest.options.findIndex((o) => o.flag === "emergency") });
  assert.equal(em.emergency, true);
  assert.throws(() => scoreCheckup({}));
});

test("Belgilar bo'yicha mutaxassis (bir necha tilda)", () => {
  assert.equal(routeSymptoms("Yurak tez uradi, hansirayman").specialty, "Kardiolog");
  assert.equal(routeSymptoms("Головная боль и бессонница").specialty, "Nevrolog");
  assert.equal(routeSymptoms("Қант деңгейі жоғары").specialty, "Endokrinolog");
  assert.equal(routeSymptoms("charchoq").fallback, true);
});

import { qualityOf, localAnalogs, localSummary, findProduct } from "@/lib/modules/trace";

test("№17: ishonch indeksi, sertifikatlar va mahalliy muqobil", () => {
  const good = qualityOf("MP-10009")!;
  assert.ok(good.local);
  assert.ok(good.trust.score >= 90, "tasdiqlangan mahalliy dori yuqori ball oladi");
  assert.equal(good.trust.parts.reduce((s, p) => s + p.max, 0), 100);
  const fake = qualityOf("MP-10004")!;
  assert.ok(fake.trust.score < 50, "shubhali partiya past ball oladi");
  assert.ok(fake.lab.tests.some((t) => !t.pass));
  assert.ok(fake.certificates.some((c) => c.status === "missing"));
  const analogs = localAnalogs("MP-10005");
  assert.equal(analogs[0]?.id, "MP-10009");
  assert.ok((analogs[0]?.cheaperPct ?? 0) > 0);
  assert.equal(localAnalogs("MP-10003").length, 0, "mahalliy analogi yo'q dori uchun bo'sh");
  assert.equal(findProduct("MP-10005")!.local, false);
  const s = localSummary();
  assert.ok(s.total >= 7 && (s.avgTrust ?? 0) > 50);
});
