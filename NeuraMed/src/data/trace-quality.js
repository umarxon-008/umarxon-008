/**
 * PHARMA TRACE — sifat maʼlumotlari (NAMUNAVIY / DEMO).
 * Sertifikat raqamlari, laboratoriyalar va natijalar toʻqima; real reyestrga ulanmagan.
 * Sanalar bugungi kunga nisbatan kunlarda (masalan, -400 = 400 kun oldin). Narxlar soʻmda, taxminiy.
 * Laboratoriya testlari farmakopeyadagi odatiy koʻrsatkichlar namunasida (faol modda, eruvchanlik, aralashmalar, mikrobiologiya).
 */
const GOOD_LAB = (lab, day, assay, dissolution, impurities) => ({
  lab, day,
  tests: [
    { test: 'Faol modda miqdori', spec: '95–105%', result: assay, pass: true },
    { test: 'Eruvchanlik (30 daqiqada)', spec: '≥ 80%', result: dissolution, pass: true },
    { test: 'Aralashmalar', spec: '≤ 1,0%', result: impurities, pass: true },
    { test: 'Mikrobiologik tozalik', spec: 'Meʼyorda', result: 'Meʼyorda', pass: true },
  ],
});
const CERTS = (gmpDays, conformDays, regDays, issuer = 'Farmatsevtika sohasini rivojlantirish agentligi') => ([
  { type: 'GMP sertifikati', number: 'UZ-GMP-' + Math.abs(gmpDays), issuer, validDays: gmpDays },
  { type: 'Muvofiqlik sertifikati', number: 'UZ-SC-' + Math.abs(conformDays), issuer: 'Sertifikatlash markazi', validDays: conformDays },
  { type: 'Davlat roʻyxatidan oʻtganlik guvohnomasi', number: 'UZ-REG-' + Math.abs(regDays), issuer, validDays: regDays },
]);

export const QUALITY = {
  'MP-10001': { price: 6500, certificates: CERTS(820, 410, 1300), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -130, '99,1%', '94%', '0,2%'), confirmations: { doctors: 14, pharmacists: 22 } },
  'MP-10002': { price: 23500, certificates: CERTS(640, 300, 980), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -90, '98,6%', '91%', '0,4%'), confirmations: { doctors: 9, pharmacists: 17 } },
  'MP-10003': {
    price: 98000,
    certificates: [
      { type: 'GMP sertifikati (ishlab chiqaruvchi mamlakat)', number: 'UZ-EU-GMP-5521', issuer: 'Xorijiy regulyator', validDays: 700 },
      { type: 'Davlat roʻyxatidan oʻtganlik guvohnomasi', number: 'UZ-REG-IMP-0890', issuer: 'Farmatsevtika sohasini rivojlantirish agentligi', validDays: 900 },
      { type: 'Import partiyasi muvofiqligi', number: '—', issuer: 'Sertifikatlash markazi', validDays: null, pending: true },
    ],
    lab: { lab: 'Mustaqil sinov laboratoriyasi', day: null, pending: true, tests: [] },
    confirmations: { doctors: 6, pharmacists: 4 },
  },
  'MP-10004': {
    price: 14800,
    certificates: [
      { type: 'Muvofiqlik sertifikati', number: '—', issuer: '—', validDays: null, missing: true },
      { type: 'Davlat roʻyxatidan oʻtganlik guvohnomasi', number: 'UZ-REG-1300', issuer: 'Farmatsevtika sohasini rivojlantirish agentligi', validDays: 1300 },
    ],
    lab: { lab: 'Mustaqil sinov laboratoriyasi', day: -5, tests: [
      { test: 'Faol modda miqdori', spec: '95–105%', result: '88,4%', pass: false },
      { test: 'Eruvchanlik (30 daqiqada)', spec: '≥ 80%', result: '71%', pass: false },
      { test: 'Aralashmalar', spec: '≤ 1,0%', result: '0,6%', pass: true },
      { test: 'Mikrobiologik tozalik', spec: 'Meʼyorda', result: 'Meʼyorda', pass: true },
    ] },
    confirmations: { doctors: 0, pharmacists: 1 },
  },
  'MP-10005': { price: 31000, certificates: CERTS(500, 260, 720, 'Xorijiy regulyator'), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -150, '100,3%', '93%', '0,3%'), confirmations: { doctors: 11, pharmacists: 15 } },
  'MP-10006': { price: 18900, certificates: CERTS(380, 120, 860), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -240, '98,9%', '88%', '0,5%'), confirmations: { doctors: 8, pharmacists: 19 } },
  'MP-10007': {
    price: 17200,
    certificates: [
      { type: 'GMP sertifikati (ishlab chiqaruvchi mamlakat)', number: 'UZ-TR-GMP-0128', issuer: 'Xorijiy regulyator', validDays: 600 },
      { type: 'Davlat roʻyxatidan oʻtganlik guvohnomasi', number: 'UZ-REG-IMP-0128', issuer: 'Farmatsevtika sohasini rivojlantirish agentligi', validDays: 1100 },
      { type: 'Import partiyasi muvofiqligi', number: '—', issuer: 'Sertifikatlash markazi', validDays: null, pending: true },
    ],
    lab: { lab: 'Mustaqil sinov laboratoriyasi', day: null, pending: true, tests: [] },
    confirmations: { doctors: 5, pharmacists: 7 },
  },
  'MP-10008': { price: 42000, certificates: CERTS(450, 210, 900, 'Xorijiy regulyator'), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -35, '101,2%', '—', '0,1%'), confirmations: { doctors: 7, pharmacists: 12 } },
  'MP-10009': { price: 21500, certificates: CERTS(900, 380, 1400), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -85, '99,6%', '95%', '0,2%'), confirmations: { doctors: 16, pharmacists: 24 } },
  'MP-10010': { price: 11900, certificates: CERTS(720, 330, 1250), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -50, '99,8%', '96%', '0,2%'), confirmations: { doctors: 10, pharmacists: 18 } },
  'MP-10011': { price: 27500, certificates: CERTS(860, 400, 1350), lab: GOOD_LAB('Mustaqil sinov laboratoriyasi', -30, '100,4%', '—', '0,1%'), confirmations: { doctors: 12, pharmacists: 20 } },
};
