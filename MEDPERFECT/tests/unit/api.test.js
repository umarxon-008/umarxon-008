/** API endpointlari testi: server vaqtinchalik portda demo rejimda ishga tushiriladi. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.MEDAI_FORCE_DEMO = 'true';
process.env.MEDAI_RATE_LIMIT = '1000';
const { createApp } = await import('../../server/server.js');

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');
let server;
let base;

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const postJson = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const upload = (p, name, buf, type) => {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type }), name);
  return fetch(base + p, { method: 'POST', body: fd });
};

test('GET /api/status — demo rejim', async () => {
  const j = await (await fetch(`${base}/api/status`)).json();
  assert.equal(j.mode, 'demo');
  assert.equal(j.model, null);
  assert.equal(j.rag.enabled, false);
});

test('POST /api/chat — oddiy savol', async () => {
  const res = await postJson('/api/chat', { messages: [{ role: 'user', content: 'Gemoglobin nima?' }] });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.mode, 'demo');
  assert.match(j.reply, /Gemoglobin/);
  assert.ok(j.sources.length >= 1);
});

test('POST /api/chat — bo\'sh va juda uzun xabar 400', async () => {
  assert.equal((await postJson('/api/chat', { messages: [{ role: 'user', content: '' }] })).status, 400);
  assert.equal((await postJson('/api/chat', { messages: [{ role: 'user', content: 'x'.repeat(5000) }] })).status, 400);
  const bad = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{buzuq' });
  assert.equal(bad.status, 400);
});

test('POST /api/analyze-report — namuna PDF', async () => {
  const res = await upload('/api/analyze-report', 'namuna.pdf', fs.readFileSync(path.join(fixtures, 'namuna-qon-tahlili.pdf')), 'application/pdf');
  const j = await res.json();
  assert.equal(res.status, 200);
  assert.equal(j.items.length, 8);
  const hb = j.items.find((i) => i.name.startsWith('Gemoglobin'));
  assert.deepEqual(hb, { name: 'Gemoglobin (HGB)', value: '112', unit: 'g/L', referenceRange: '120 - 160' });
  assert.equal(j.items.find((i) => i.name === 'Kreatinin').referenceRange, '');
});

test('POST /api/analyze-report — skanerlangan (matnsiz) PDF', async () => {
  const j = await (await upload('/api/analyze-report', 'skan.pdf', fs.readFileSync(path.join(fixtures, 'skan-namuna.pdf')), 'application/pdf')).json();
  assert.equal(j.ocrUnavailable, true);
  assert.equal(j.items.length, 0);
});

test('POST /api/analyze-report — noto\'g\'ri format, soxta PDF va katta fayl', async () => {
  assert.equal((await upload('/api/analyze-report', 'a.docx', Buffer.from('docx'), 'application/octet-stream')).status, 415);
  assert.equal((await upload('/api/analyze-report', 'soxta.pdf', Buffer.from('oddiy matn'), 'application/pdf')).status, 415);
  const big = await upload('/api/analyze-report', 'katta.pdf', Buffer.alloc(11 * 1024 * 1024, 0x25), 'application/pdf');
  assert.equal(big.status, 413);
  assert.match((await big.json()).error, /10 MB/);
  assert.equal((await fetch(`${base}/api/analyze-report`, { method: 'POST' })).status, 400);
});

test('POST /api/explain-medicine — yo\'riqnoma fayli, matn va nom', async () => {
  const f = await (await upload('/api/explain-medicine', 'y.txt', fs.readFileSync(path.join(fixtures, 'namuna-yoriqnoma.txt')), 'text/plain')).json();
  assert.equal(f.medicine.name, 'Namuna-dori 500');
  assert.match(f.medicine.contraindications, /sezuvchanlik/);
  assert.equal(f.dosageOmitted, true);
  const n = await (await postJson('/api/explain-medicine', { name: 'Paratsetamol' })).json();
  assert.equal(n.unavailable, true);
  assert.equal((await postJson('/api/explain-medicine', { name: '<script>' })).status, 400);
  assert.equal((await postJson('/api/explain-medicine', { text: 'qisqa' })).status, 400);
});

test('Maxfiy fayllar ochiq emas', async () => {
  for (const p of ['/server/server.js', '/.env', '/package.json', '/node_modules/express/package.json']) {
    const res = await fetch(base + p);
    const text = await res.text();
    assert.equal(res.status, 404, p);
    assert.ok(!text.includes('createApp') && !text.includes('"dependencies"'), p);
  }
});

test('Xavfsizlik sarlavhalari (CSP)', async () => {
  const res = await fetch(`${base}/`);
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(res.headers.get('x-powered-by'), null);
});
