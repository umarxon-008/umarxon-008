/** "Salomatligim" modullari: ko'rsatkichlarni baholash, dorilar mosligi, chekap, belgilar bo'yicha yo'naltirish. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessVital } from "@/lib/modules/vitals";
import { checkInteractions, identify } from "@/lib/modules/interactions";
import { scoreCheckup, QUESTIONS } from "@/lib/modules/checkup";
import { routeSymptoms } from "@/lib/modules/symptoms";

test("Bosim: juda yuqori — shoshilinch, shaxsiy normadan yuqori — ogohlantirish", () => {
  const crisis = assessVital("bp", 185, 121, []);
  assert.equal(crisis.level, "danger");
  assert.equal(crisis.emergency, true);
  const history = Array.from({ length: 10 }, () => ({ value: 122, value2: 79 }));
  const high = assessVital("bp", 142, 91, history);
  assert.equal(high.level, "warn");
  assert.match(high.title.text, /Odatdagidan yuqori/);
  assert.equal(assessVital("bp", 118, 76, history).level, "ok");
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
  assert.equal(routeSymptoms("Bosim koʻtariladi, yurak tez uradi").specialty, "Kardiolog");
  assert.equal(routeSymptoms("Головная боль и бессонница").specialty, "Nevrolog");
  assert.equal(routeSymptoms("Қант деңгейі жоғары").specialty, "Endokrinolog");
  assert.equal(routeSymptoms("charchoq").fallback, true);
});
