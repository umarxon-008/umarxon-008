import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLabText, parseRange, compare } from '../../server/services/labParser.js';
import { parseLeaflet } from '../../server/services/leafletParser.js';
import { assessMessage } from '../../server/services/safety.js';
import { demoReply } from '../../server/services/demo.js';
import { sanitizeMessages } from '../../server/routes/chat.js';

test('labParser: qiymat, birlik va hujjatdagi oraliqni ajratadi', () => {
  const r = parseLabText('Umumiy qon tahlili\nGemoglobin (HGB) 112 g/L 120 - 160\nGlyukoza 6,4 mmol/L 3.9 - 5.5 H\nCRP 3 mg/L < 5');
  assert.equal(r.title, 'Umumiy qon tahlili');
  assert.equal(r.items.length, 3);
  assert.deepEqual(r.items[0], { name: 'Gemoglobin (HGB)', value: 112, valueText: '112', unit: 'g/L', rangeText: '120 - 160' });
  assert.equal(r.items[1].value, 6.4);
  assert.equal(r.items[2].rangeText, '< 5');
});

test('labParser: oraliq bo\'lmasa to\'qimaydi', () => {
  const r = parseLabText('Kreatinin 80 umol/L');
  assert.equal(r.items[0].rangeText, null);
  assert.equal(compare(80, parseRange(r.items[0].rangeText)), 'unknown');
});

test('labParser: sana va shaxsiy ma\'lumot satrlarini o\'tkazib yuboradi', () => {
  const r = parseLabText('Sana: 01.11.2026\nBemor: Test 1990\nYosh: 35 yil');
  assert.equal(r.items.length, 0);
});

test('compare: past / meʼyorda / yuqori', () => {
  const range = parseRange('120 - 160');
  assert.equal(compare(110, range), 'low');
  assert.equal(compare(140, range), 'normal');
  assert.equal(compare(170, range), 'high');
  assert.equal(compare(6, parseRange('< 5')), 'high');
  assert.equal(compare(40, parseRange('> 30')), 'normal');
  assert.equal(parseRange('noaniq'), null);
});

test('leafletParser: bo\'limlarni ajratadi, dozani alohida belgilaydi', () => {
  const r = parseLeaflet("Savdo nomi: Namuna\nQarshi ko'rsatmalar:\nAllergiya.\nQo'llash usuli va dozalari\n1 tabletka.\nSaqlash sharoiti: quruq joyda.\nTasdiqlangan sana: 12.03.2026");
  assert.equal(r.name, 'Namuna');
  assert.equal(r.contraindications, 'Allergiya.');
  assert.ok(r.storage.startsWith('quruq joyda.'));
  assert.equal(r.dosageSectionFound, true);
  assert.ok(!JSON.stringify(r).includes('1 tabletka'), 'dozalash matni natijaga chiqmasligi kerak');
  assert.equal(r.documentDate, '12.03.2026');
});

test('safety: shoshilinch holat, tashxis va doza so\'rovlarini aniqlaydi', () => {
  assert.equal(assessMessage('Koʻkragim ogʻriyapti, nafas ololmayapman').emergency, true);
  assert.equal(assessMessage('Menda qanday kasallik bor?').diagnosisRequest, true);
  assert.equal(assessMessage('Dozani ikki baravar oshirsam boʻladimi?').doseRequest, true);
  const calm = assessMessage('Gemoglobin nima?');
  assert.deepEqual(calm, { emergency: false, diagnosisRequest: false, doseRequest: false });
});

test('demo: tashxis/doza/manbasiz holatlarda xavfsiz javob qaytaradi', () => {
  assert.equal(demoReply('Menga tashxis qoʻying').kind, 'diagnosis');
  assert.equal(demoReply('Necha mg ichay?').kind, 'dose');
  const none = demoReply('Futbol qoidalari qanday?');
  assert.equal(none.kind, 'no_source');
  assert.equal(none.sources.length, 0);
  const lib = demoReply('Kreatinin nima?');
  assert.equal(lib.kind, 'library');
  assert.ok(lib.sources.length > 0);
});

test('sanitizeMessages: bo\'sh, uzun va noto\'g\'ri formatni rad etadi', () => {
  assert.throws(() => sanitizeMessages([]), /Xabar yuborilmadi/);
  assert.throws(() => sanitizeMessages([{ role: 'user', content: '   ' }]), /boʻsh/);
  assert.throws(() => sanitizeMessages([{ role: 'user', content: 'a'.repeat(4001) }]), /4000/);
  assert.throws(() => sanitizeMessages([{ role: 'system', content: 'x' }]), /formati/);
  const ok = sanitizeMessages([{ role: 'assistant', content: 'salom' }, { role: 'user', content: 'a' }, { role: 'user', content: 'b' }]);
  assert.deepEqual(ok, [{ role: 'user', content: 'a\n\nb' }]);
});
