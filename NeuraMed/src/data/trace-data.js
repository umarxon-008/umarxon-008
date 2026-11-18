/**
 * PHARMA TRACE — NAMUNAVIY (DEMO) MA'LUMOTLAR.
 * Barcha ishlab chiqaruvchi, ombor, distribyutor va dorixona nomlari to'qima.
 * Davlat reestri yoki real sertifikatlash tizimi bilan integratsiya YO'Q.
 * Sanalar bugungi kunga nisbatan kunlarda berilgan (masalan, -120 = 120 kun oldin).
 */
export const STAGES = {
  manufacturer: { label: 'Ishlab chiqaruvchi', icon: 'factory' },
  warehouse: { label: 'Ombor', icon: 'warehouse' },
  distributor: { label: 'Distribyutor', icon: 'truck' },
  pharmacy: { label: 'Dorixona', icon: 'store' },
};

export const TRACE_PRODUCTS = [
  {
    id: 'MP-10001', qr: 'QR-MP-7F3K-1001', name: 'Paratsetamol', form: 'Tabletka, 500 mg, №20', substance: 'Paratsetamol', category: 'Ogʻriq qoldiruvchi',
    manufacturer: { name: 'NurFarm MChJ', country: 'Oʻzbekiston', license: 'UZ-LIC-2024-0117' },
    batch: 'NF-2405-118', mfg: -142, expiry: 588, status: 'verified',
    statusNote: 'Partiya maʼlumotlari ishlab chiqaruvchi yozuvlari bilan mos keldi. Taʼminot zanjirining barcha bosqichlari qayd etilgan.',
    chain: [
      { stage: 'manufacturer', org: 'NurFarm MChJ', place: 'Toshkent viloyati', day: -142, temp: '18–22 °C', state: 'done', note: 'Partiya ishlab chiqarildi va sifat nazoratidan oʻtdi' },
      { stage: 'warehouse', org: 'Markaziy farm-ombor', place: 'Toshkent sh.', day: -120, temp: '15–25 °C', state: 'done', note: 'Qabul qilindi, saqlash sharoiti meʼyorda' },
      { stage: 'distributor', org: 'MedLogistik', place: 'Samarqand', day: -64, temp: '15–25 °C', state: 'done', note: 'Viloyat distribyutoriga yetkazildi' },
      { stage: 'pharmacy', org: 'Shifo dorixonasi №12', place: 'Samarqand sh.', day: -21, temp: '18–24 °C', state: 'done', note: 'Dorixonaga qabul qilindi, sotuvda' },
    ],
  },
  {
    id: 'MP-10002', qr: 'QR-MP-2B9X-1002', name: 'Amoksitsillin', form: 'Kapsula, 500 mg, №16', substance: 'Amoksitsillin', category: 'Antibiotik',
    manufacturer: { name: 'Sharq Farm', country: 'Oʻzbekiston', license: 'UZ-LIC-2023-0452' },
    batch: 'SF-2407-031', mfg: -98, expiry: 632, status: 'verified',
    statusNote: 'Partiya raqami va ishlab chiqarish sanasi mos. Retsept boʻyicha beriladigan dori.',
    chain: [
      { stage: 'manufacturer', org: 'Sharq Farm', place: 'Andijon viloyati', day: -98, temp: '18–22 °C', state: 'done', note: 'Ishlab chiqarildi, laboratoriya nazorati oʻtkazildi' },
      { stage: 'warehouse', org: 'Fargʻona vodiysi ombori', place: 'Andijon sh.', day: -85, temp: '15–25 °C', state: 'done', note: 'Omborga qabul qilindi' },
      { stage: 'distributor', org: 'VodiyMed Distribyutsiya', place: 'Fargʻona', day: -40, temp: '15–25 °C', state: 'done', note: 'Distribyutorga topshirildi' },
      { stage: 'pharmacy', org: 'Salomatlik dorixonasi', place: 'Fargʻona sh.', day: -12, temp: '18–24 °C', state: 'done', note: 'Dorixonaga yetkazildi' },
    ],
  },
  {
    id: 'MP-10003', qr: 'QR-MP-5H1Q-1003', name: 'Insulin', form: 'Inyeksiya eritmasi, 100 TB/ml, 10 ml', substance: 'Insulin', category: 'Gormonal',
    manufacturer: { name: 'Alpen Biopharm GmbH', country: 'Germaniya', license: 'UZ-IMP-2024-0890' },
    batch: 'DB-24K-552', mfg: -75, expiry: 290, status: 'pending',
    statusNote: 'Dorixona bosqichi maʼlumotlari hali kelmagan. Sovuq zanjir (2–8 °C) talab qilinadi — oxirgi bosqich tasdiqlanishi kutilmoqda.',
    chain: [
      { stage: 'manufacturer', org: 'Alpen Biopharm GmbH', place: 'Import', day: -75, temp: '2–8 °C', state: 'done', note: 'Ishlab chiqarildi, eksport hujjatlari rasmiylashtirildi' },
      { stage: 'warehouse', org: 'Sovuq zanjir ombori', place: 'Toshkent sh.', day: -30, temp: '2–8 °C', state: 'done', note: 'Bojxonadan oʻtdi, sovutgichli omborga joylandi' },
      { stage: 'distributor', org: 'ColdLine', place: 'Toshkent sh.', day: -6, temp: '2–8 °C', state: 'current', note: 'Yetkazib berilmoqda' },
      { stage: 'pharmacy', org: 'Maʼlumot kutilmoqda', place: '—', day: null, temp: '—', state: 'pending', note: 'Dorixona qabul qilganini tasdiqlashi kutilmoqda' },
    ],
  },
  {
    id: 'MP-10004', qr: 'QR-MP-9Z4T-1004', name: 'Ibuprofen', form: 'Tabletka, 400 mg, №30', substance: 'Ibuprofen', category: 'Yalligʻlanishga qarshi',
    manufacturer: { name: 'NurFarm MChJ', country: 'Oʻzbekiston', license: 'UZ-LIC-2024-0117' },
    batch: 'NF-2311-907', mfg: -310, expiry: 420, status: 'suspicious',
    statusNote: 'Diqqat: partiya raqami ishlab chiqaruvchining roʻyxatida topilmadi, zanjirda distribyutor bosqichi qayd etilmagan va saqlash haroratida ogʻish bor. Bunday mahsulotni dorixona va nazorat organiga xabar qilish tavsiya etiladi.',
    chain: [
      { stage: 'manufacturer', org: 'NurFarm MChJ', place: 'Toshkent viloyati', day: -310, temp: '18–22 °C', state: 'issue', note: 'Partiya raqami ishlab chiqaruvchi roʻyxatida topilmadi' },
      { stage: 'warehouse', org: 'Nomaʼlum ombor', place: 'Aniqlanmagan', day: -200, temp: '31 °C (meʼyordan yuqori)', state: 'issue', note: 'Saqlash harorati meʼyordan oshgan' },
      { stage: 'distributor', org: 'Qayd etilmagan', place: '—', day: null, temp: '—', state: 'issue', note: 'Bu bosqich haqida maʼlumot yoʻq' },
      { stage: 'pharmacy', org: 'Bozor savdo nuqtasi', place: 'Toshkent sh.', day: -15, temp: '—', state: 'done', note: 'Savdo nuqtasida aniqlangan' },
    ],
  },
  {
    id: 'MP-10005', qr: 'QR-MP-3C7M-1005', name: 'Metformin', form: 'Tabletka, 850 mg, №60', substance: 'Metformin gidroxlorid', category: 'Qand miqdorini pasaytiruvchi',
    manufacturer: { name: 'Medisun Labs', country: 'Hindiston', license: 'UZ-IMP-2023-0333' },
    batch: 'SM-2406-210', mfg: -160, expiry: 570, status: 'verified',
    statusNote: 'Import hujjatlari va partiya maʼlumotlari mos keldi.',
    chain: [
      { stage: 'manufacturer', org: 'Medisun Labs', place: 'Import', day: -160, temp: '18–25 °C', state: 'done', note: 'Ishlab chiqarildi' },
      { stage: 'warehouse', org: 'Markaziy farm-ombor', place: 'Toshkent sh.', day: -110, temp: '15–25 °C', state: 'done', note: 'Omborga qabul qilindi' },
      { stage: 'distributor', org: 'MedLogistik', place: 'Buxoro', day: -55, temp: '15–25 °C', state: 'done', note: 'Viloyatga yetkazildi' },
      { stage: 'pharmacy', org: 'Buxoro dorixonasi №3', place: 'Buxoro sh.', day: -18, temp: '18–24 °C', state: 'done', note: 'Sotuvda' },
    ],
  },
  {
    id: 'MP-10006', qr: 'QR-MP-8D2L-1006', name: 'Omeprazol', form: 'Kapsula, 20 mg, №30', substance: 'Omeprazol', category: 'Oshqozon-ichak',
    manufacturer: { name: 'Sharq Farm', country: 'Oʻzbekiston', license: 'UZ-LIC-2023-0452' },
    batch: 'SF-2402-077', mfg: -260, expiry: 75, status: 'verified',
    statusNote: 'Mahsulot haqiqiy, ammo yaroqlilik muddati yaqinlashmoqda (3 oydan kam).',
    chain: [
      { stage: 'manufacturer', org: 'Sharq Farm', place: 'Andijon viloyati', day: -260, temp: '18–22 °C', state: 'done', note: 'Ishlab chiqarildi' },
      { stage: 'warehouse', org: 'Fargʻona vodiysi ombori', place: 'Andijon sh.', day: -240, temp: '15–25 °C', state: 'done', note: 'Omborga qabul qilindi' },
      { stage: 'distributor', org: 'VodiyMed Distribyutsiya', place: 'Namangan', day: -150, temp: '15–25 °C', state: 'done', note: 'Distribyutorga topshirildi' },
      { stage: 'pharmacy', org: 'Namangan dorixonasi', place: 'Namangan sh.', day: -90, temp: '18–24 °C', state: 'done', note: 'Sotuvda' },
    ],
  },
  {
    id: 'MP-10007', qr: 'QR-MP-6K8R-1007', name: 'Loratadin', form: 'Tabletka, 10 mg, №10', substance: 'Loratadin', category: 'Allergiyaga qarshi',
    manufacturer: { name: 'Anatolia Pharma', country: 'Turkiya', license: 'UZ-IMP-2024-0128' },
    batch: 'DP-2408-014', mfg: -60, expiry: 1035, status: 'pending',
    statusNote: 'Import hujjatlari tekshiruvda. Ombor bosqichi tasdiqlanishi kutilmoqda.',
    chain: [
      { stage: 'manufacturer', org: 'Anatolia Pharma', place: 'Import', day: -60, temp: '18–25 °C', state: 'done', note: 'Ishlab chiqarildi va joʻnatildi' },
      { stage: 'warehouse', org: 'Markaziy farm-ombor', place: 'Toshkent sh.', day: -4, temp: '15–25 °C', state: 'current', note: 'Hujjatlar tekshirilmoqda' },
      { stage: 'distributor', org: 'Maʼlumot kutilmoqda', place: '—', day: null, temp: '—', state: 'pending', note: '' },
      { stage: 'pharmacy', org: 'Maʼlumot kutilmoqda', place: '—', day: null, temp: '—', state: 'pending', note: '' },
    ],
  },
  {
    id: 'MP-10008', qr: 'QR-MP-1A5W-1008', name: 'Vitamin D3', form: 'Tomchi, 2000 XB, 10 ml', substance: 'Xolekalsiferol', category: 'Vitamin',
    manufacturer: { name: 'Medisun Labs', country: 'Hindiston', license: 'UZ-IMP-2023-0333' },
    batch: 'SM-2409-505', mfg: -40, expiry: 690, status: 'verified',
    statusNote: 'Partiya maʼlumotlari mos keldi.',
    chain: [
      { stage: 'manufacturer', org: 'Medisun Labs', place: 'Import', day: -40, temp: '15–25 °C', state: 'done', note: 'Ishlab chiqarildi' },
      { stage: 'warehouse', org: 'Markaziy farm-ombor', place: 'Toshkent sh.', day: -25, temp: '15–25 °C', state: 'done', note: 'Omborga qabul qilindi' },
      { stage: 'distributor', org: 'MedLogistik', place: 'Toshkent sh.', day: -14, temp: '15–25 °C', state: 'done', note: 'Shahar distribyutoriga yetkazildi' },
      { stage: 'pharmacy', org: 'Shifo dorixonasi №5', place: 'Toshkent sh.', day: -7, temp: '18–24 °C', state: 'done', note: 'Sotuvda' },
    ],
  },
  // ── Mahalliy analoglar — import dorilar uchun "O'zbekistonda ishlab chiqarilgan" muqobil ──
  {
    id: 'MP-10009', qr: 'QR-MP-4M9B-1009', name: 'Metformin', form: 'Tabletka, 850 mg, №60', substance: 'Metformin gidroxlorid', category: 'Qand miqdorini pasaytiruvchi',
    manufacturer: { name: 'Toshkent Farm', country: 'Oʻzbekiston', license: 'UZ-LIC-2022-0311' },
    batch: 'TF-2408-064', mfg: -90, expiry: 640, status: 'verified',
    statusNote: 'Mahalliy ishlab chiqarilgan. Partiya maʼlumotlari, sertifikatlar va mustaqil laboratoriya natijalari mos keldi.',
    chain: [
      { stage: 'manufacturer', org: 'Toshkent Farm', place: 'Toshkent viloyati', day: -90, temp: '18–22 °C', state: 'done', note: 'Partiya ishlab chiqarildi va sifat nazoratidan oʻtdi' },
      { stage: 'warehouse', org: 'Markaziy farm-ombor', place: 'Toshkent sh.', day: -80, temp: '15–25 °C', state: 'done', note: 'Qabul qilindi, saqlash sharoiti meʼyorda' },
      { stage: 'distributor', org: 'MedLogistik', place: 'Toshkent sh.', day: -70, temp: '15–25 °C', state: 'done', note: 'Shahar distribyutoriga yetkazildi' },
      { stage: 'pharmacy', org: 'Shifo dorixonasi №5', place: 'Toshkent sh.', day: -60, temp: '18–24 °C', state: 'done', note: 'Sotuvda' },
    ],
  },
  {
    id: 'MP-10010', qr: 'QR-MP-7L2R-1010', name: 'Loratadin', form: 'Tabletka, 10 mg, №10', substance: 'Loratadin', category: 'Allergiyaga qarshi',
    manufacturer: { name: 'Sharq Farm', country: 'Oʻzbekiston', license: 'UZ-LIC-2023-0452' },
    batch: 'SF-2409-118', mfg: -55, expiry: 1040, status: 'verified',
    statusNote: 'Mahalliy ishlab chiqarilgan. Partiya maʼlumotlari, sertifikatlar va mustaqil laboratoriya natijalari mos keldi.',
    chain: [
      { stage: 'manufacturer', org: 'Sharq Farm', place: 'Andijon viloyati', day: -55, temp: '18–22 °C', state: 'done', note: 'Partiya ishlab chiqarildi va sifat nazoratidan oʻtdi' },
      { stage: 'warehouse', org: 'Fargʻona vodiysi ombori', place: 'Andijon sh.', day: -48, temp: '15–25 °C', state: 'done', note: 'Omborga qabul qilindi' },
      { stage: 'distributor', org: 'VodiyMed Distribyutsiya', place: 'Fargʻona', day: -40, temp: '15–25 °C', state: 'done', note: 'Distribyutorga topshirildi' },
      { stage: 'pharmacy', org: 'Salomatlik dorixonasi', place: 'Fargʻona sh.', day: -33, temp: '18–24 °C', state: 'done', note: 'Dorixonaga yetkazildi' },
    ],
  },
  {
    id: 'MP-10011', qr: 'QR-MP-2D3V-1011', name: 'Vitamin D3', form: 'Tomchi, 2000 XB, 10 ml', substance: 'Xolekalsiferol', category: 'Vitamin',
    manufacturer: { name: 'NurFarm MChJ', country: 'Oʻzbekiston', license: 'UZ-LIC-2024-0117' },
    batch: 'NF-2409-722', mfg: -35, expiry: 700, status: 'verified',
    statusNote: 'Mahalliy ishlab chiqarilgan. Partiya maʼlumotlari, sertifikatlar va mustaqil laboratoriya natijalari mos keldi.',
    chain: [
      { stage: 'manufacturer', org: 'NurFarm MChJ', place: 'Toshkent viloyati', day: -35, temp: '18–22 °C', state: 'done', note: 'Partiya ishlab chiqarildi va sifat nazoratidan oʻtdi' },
      { stage: 'warehouse', org: 'Markaziy farm-ombor', place: 'Toshkent sh.', day: -28, temp: '15–25 °C', state: 'done', note: 'Qabul qilindi, saqlash sharoiti meʼyorda' },
      { stage: 'distributor', org: 'MedLogistik', place: 'Samarqand', day: -20, temp: '15–25 °C', state: 'done', note: 'Viloyat distribyutoriga yetkazildi' },
      { stage: 'pharmacy', org: 'Shifo dorixonasi №12', place: 'Samarqand sh.', day: -12, temp: '18–24 °C', state: 'done', note: 'Dorixonaga qabul qilindi, sotuvda' },
    ],
  },
];
