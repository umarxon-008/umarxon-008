/** MARIUS interfeysidagi barcha matnlar. Asosiy til: o'zbek (lotin). */
export const uz = {
  brand: 'MARIUS',
  tagline: 'Shaxsiy AI yordamchingiz',
  nav: {
    dashboard: 'Bosh sahifa',
    assistant: 'Yordamchi',
    computer: 'Kompyuter',
    memory: 'Xotira',
    tasks: 'Vazifalar',
    monitoring: 'Monitoring',
    settings: 'Sozlamalar',
  },
  greeting: {
    morning: 'Xayrli tong',
    day: 'Xayrli kun',
    evening: 'Xayrli kech',
    night: 'Xayrli tun',
  },
  status: {
    idle: 'Kutish holatida',
    notConfigured: 'AI hali sozlanmagan',
  },
  common: {
    loading: 'Yuklanmoqda…',
    retry: 'Qayta urinish',
    comingSoon: 'Tez orada',
    back: 'Orqaga',
    next: 'Keyingi',
    later: 'Keyinroq',
    finish: 'Boshlash',
    phase: (n: number) => `${n}-bosqichda qo'shiladi`,
  },
  errors: {
    title: 'Nimadir noto‘g‘ri ketdi',
    loadSettings: "Sozlamalarni yuklab bo'lmadi.",
    unexpected: "Kutilmagan xatolik yuz berdi. Ilovani qayta ishga tushirib ko'ring.",
  },
} as const;
