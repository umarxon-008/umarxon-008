/**
 * MEDCONNECT — NAMUNAVIY (DEMO) MA'LUMOTLAR.
 * Shifokorlar va muassasalar to'qima; haqiqiy shaxslar emas. Real qabul tizimi bilan bog'lanmagan.
 */
export const CLINICS = [
  { id: 'c1', name: 'Salomatlik oilaviy poliklinikasi', type: 'Oilaviy poliklinika', city: 'Toshkent sh.', address: 'Navoiy koʻchasi, 12', hours: 'Du–Sh, 08:00–18:00', departments: ['Terapiya', 'Pediatriya', 'Laboratoriya'] },
  { id: 'c2', name: 'Markaziy diagnostika markazi', type: 'Diagnostika markazi', city: 'Toshkent sh.', address: 'Amir Temur shoh koʻchasi, 45', hours: 'Har kuni, 07:30–20:00', departments: ['UZI', 'MRT', 'Laboratoriya', 'Kardiologiya'] },
  { id: 'c3', name: 'Yurak salomatligi markazi', type: 'Ixtisoslashgan markaz', city: 'Samarqand sh.', address: 'Registon mavzesi, 3-uy', hours: 'Du–Ju, 08:00–17:00', departments: ['Kardiologiya', 'Funksional diagnostika'] },
  { id: 'c4', name: 'Bolalar salomatligi klinikasi', type: 'Bolalar klinikasi', city: 'Buxoro sh.', address: 'Bahouddin koʻchasi, 7', hours: 'Du–Sh, 08:00–19:00', departments: ['Pediatriya', 'Nevrologiya', 'Allergologiya'] },
];

export const DOCTORS = [
  { id: 'd1', name: 'Dilnoza Rahimova', specialty: 'Terapevt', clinicId: 'c1', experience: 12, languages: ['Oʻzbek', 'Rus'], rating: 4.9, workDays: [1, 2, 3, 4, 5], hours: [9, 17], color: '#10b981',
    about: 'Kattalar terapiyasi, profilaktik koʻriklar va laboratoriya natijalarini tushuntirish boʻyicha maslahatlar.' },
  { id: 'd2', name: 'Jasur Toshmatov', specialty: 'Kardiolog', clinicId: 'c3', experience: 15, languages: ['Oʻzbek', 'Rus', 'Ingliz'], rating: 4.8, workDays: [1, 3, 5], hours: [9, 15], color: '#6d28d9',
    about: 'Yurak ritmi buzilishlari va yurak-qon tomir xavfini baholash.' },
  { id: 'd3', name: 'Malika Yusupova', specialty: 'Pediatr', clinicId: 'c4', experience: 9, languages: ['Oʻzbek', 'Rus'], rating: 4.9, workDays: [1, 2, 3, 4, 5, 6], hours: [8, 14], color: '#0e9aa0',
    about: 'Bolalar salomatligi, emlash jadvali va oʻsish-rivojlanish nazorati.' },
  { id: 'd4', name: 'Bobur Aliyev', specialty: 'Endokrinolog', clinicId: 'c2', experience: 11, languages: ['Oʻzbek', 'Rus'], rating: 4.7, workDays: [2, 4, 6], hours: [10, 18], color: '#0b5d73',
    about: 'Qandli diabet, qalqonsimon bez kasalliklari va gormonal tahlillar boʻyicha maslahat.' },
  { id: 'd5', name: 'Nodira Xasanova', specialty: 'Nevrolog', clinicId: 'c4', experience: 14, languages: ['Oʻzbek', 'Rus'], rating: 4.8, workDays: [1, 2, 4, 5], hours: [9, 16], color: '#7c3aed',
    about: 'Bosh ogʻrigʻi, uyqu buzilishlari va asab tizimi bilan bogʻliq shikoyatlar.' },
  { id: 'd6', name: 'Sardor Ergashev', specialty: 'Laborant-shifokor', clinicId: 'c2', experience: 7, languages: ['Oʻzbek', 'Rus', 'Ingliz'], rating: 4.6, workDays: [1, 2, 3, 4, 5, 6], hours: [8, 13], color: '#059669',
    about: 'Laboratoriya tahlillariga tayyorgarlik va natijalarni izohlash boʻyicha maslahat.' },
];

/** Demo chatda shifokor nomidan beriladigan avtomatik javoblar (haqiqiy shifokor emas). */
export const DEMO_REPLIES = [
  'Assalomu alaykum! Xabaringizni oldim. Ish vaqtida batafsil javob beraman.',
  'Rahmat. Aniq tavsiya berish uchun koʻrik kerak — qabulga yozilishingiz mumkin.',
  'Tahlil natijalaringiz boʻlsa, qabulga olib keling. Shoshilinch holatda 103 ga qoʻngʻiroq qiling.',
];
