/** Tarjima tizimi testlari: kalitlar to'liqligi, joy-ushlagichlar, sana formatlari. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { makeT } from "@/i18n/translate";
import ru from "@/i18n/messages/ru";
import en from "@/i18n/messages/en";
import kk from "@/i18n/messages/kk";
import ky from "@/i18n/messages/ky";
import tg from "@/i18n/messages/tg";

const DICTS = { ru, en, kk, ky, tg } as const;
import { uzDate } from "@/lib/utils";

test("makeT: tarjima, zaxira va {o'zgaruvchi}lar", () => {
  const t = makeT({ "{n} ta qabul": "{n} appointments", "Boʻlimlar": "Sections" });
  assert.equal(t("{n} ta qabul", { n: 3 }), "3 appointments");
  assert.equal(t("Bo'limlar"), "Sections", "apostrof turlari bir xil hisoblanadi");
  assert.equal(t("Tarjimasi yo'q matn"), "Tarjimasi yo'q matn");
  assert.equal(makeT(null)("{n} kun", { n: 5 }), "5 kun");
});

test("barcha lug'atlarda joy-ushlagichlar mos", () => {
  for (const [name, dict] of Object.entries(DICTS)) {
    for (const [k, v] of Object.entries(dict)) {
      const a = (k.match(/\{\w+\}/g) || []).sort().join();
      const b = (v.match(/\{\w+\}/g) || []).sort().join();
      assert.equal(a, b, `${name}: "${k}"`);
    }
  }
});

/** Koddagi barcha t("...") matnlari har bir tilning lug'atida bo'lishi kerak. */
test("har bir t(\"...\") matnining 5 tildagi tarjimasi bor", () => {
  const files: string[] = [];
  const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p);
  });
  walk(path.join(process.cwd(), "src"));
  const norm = (s: string) => s.replace(/[ʻʼ‘’`]/g, "'");
  const has = (d: Record<string, string>, k: string) => k in d || Object.keys(d).some((x) => norm(x) === norm(k));
  const SAME = /^(NeuraMed|MEDAI|PHARMA TRACE|MEDCONNECT|MEDSTOCK AI|DEMO|AI|Email|Demo|English|O'zbek|PDF.*|in|out|pending|verified|suspicious|cancelled|Normal|image\/png|—|")$/;
  const missing: string[] = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && n.expression.getText(sf) === "t" && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
        const k = n.arguments[0].text;
        if (!k.trim() || SAME.test(k)) return;
        for (const [name, d] of Object.entries(DICTS)) if (!has(d, k)) missing.push(`${name} · ${path.relative(process.cwd(), f)}: ${k}`);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  assert.deepEqual(missing, []);
});

test("sanalar har xil tillarda", () => {
  assert.equal(uzDate("2026-11-16", { short: true }), "16-noy, 2026");
  assert.equal(uzDate("2026-11-16", { locale: "ru" }), "16 ноября 2026");
  assert.equal(uzDate("2026-11-16", { locale: "en", short: true }), "Nov 16, 2026");
  assert.equal(uzDate("2026-11-16", { locale: "kk" }), "16 қараша 2026");
  assert.equal(uzDate("2026-11-16", { locale: "tg" }), "16 ноябр 2026");
  assert.equal(uzDate("2026-11-16", { locale: "ky" }), "2026-ж. 16-ноябрь");
});
