/** Modullar mantig'i uchun unit testlar: npm run test:unit */
import { test } from "node:test";
import assert from "node:assert/strict";
import { slotsFor, doctors } from "@/lib/modules/connect";
import { allProducts, findProduct, searchProducts, traceSummary } from "@/lib/modules/trace";
import { dayOffset, isoDay } from "@/lib/modules/dates";
import { assessMessage, demoReply, libraryTerms } from "@/lib/medai";

test("MEDCONNECT: band vaqt bo'sh emas deb ko'rsatiladi", () => {
  const doc = doctors[0];
  const days = slotsFor(doc, []);
  assert.ok(days.length > 0);
  const { date } = days[0];
  const time = days[0].slots.find((s) => s.free)!.time;
  const again = slotsFor(doc, [{ date, time }]);
  const slot = again.find((d) => d.date === date)?.slots.find((s) => s.time === time);
  assert.equal(slot?.free, false);
  for (const d of days) assert.ok(doc.workDays.includes(new Date(`${d.date}T12:00`).getDay()), "faqat ish kunlari");
});

test("PHARMA TRACE: qidiruv va holatlar", () => {
  const s = traceSummary();
  assert.equal(s.total, allProducts().length);
  assert.equal(searchProducts("QR-MP-9Z4T-1004")[0]?.status, "suspicious");
  assert.equal(searchProducts("").length, 0);
  assert.equal(findProduct("YOQ"), null);
  const p = findProduct("MP-10001")!;
  assert.equal(p.chain.length, 4);
  assert.ok(p.daysLeft > 0);
});

test("Sana yordamchilari", () => {
  assert.match(isoDay(new Date()), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(isoDay(dayOffset(1)) > isoDay(dayOffset(0)), true);
});

test("MEDAI xavfsizligi: shoshilinch holat, doza va tashxis so'rovlari", () => {
  assert.equal(assessMessage("Ko'kragim qattiq og'riyapti, nafas ololmayapman").emergency, true);
  assert.equal(assessMessage("Gemoglobin nima?").emergency, false);
  assert.equal(assessMessage("Dorimning dozasini ikki baravar oshirsam boʻladimi?").doseRequest, true);
  const r = demoReply("ALT nima?");
  assert.ok(r.reply.length > 20);
  assert.ok(r.sources.length > 0, "kutubxona atamasi manba bilan qaytishi kerak");
  assert.equal(libraryTerms.length, 26);
});
