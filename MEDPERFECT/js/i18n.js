/**
 * Interfeys tarjimalari uchun tuzilma.
 * Hozir faqat o'zbek tili (lotin) to'liq. Rus va ingliz tillari keyingi bosqichda shu
 * lug'atga qo'shiladi — HTML dagi data-i18n="kalit" elementlar avtomatik yangilanadi.
 */
const messages = {
  uz: {
    'nav.home': 'Bosh sahifa',
    'nav.trace': 'PHARMA TRACE',
    'nav.connect': 'MEDCONNECT',
    'nav.stock': 'MEDSTOCK AI',
    'nav.chat': 'AI yordamchi',
    'nav.analysis': 'Tibbiy tahlil',
    'nav.medicine': 'Dori qoʻllanmasi',
    'nav.library': 'Tibbiy kutubxona',
    'nav.history': 'Suhbatlar tarixi',
    'nav.settings': 'Profil va sozlamalar',
    'nav.about': 'Loyiha haqida',
    'page.home.sub': 'MEDPERFECT — yagona tibbiyot va farmatsevtika platformasi',
    'page.trace.sub': 'Dori vositalarini kuzatish va tekshirish',
    'page.connect.sub': 'Shifokorlar, muassasalar va qabulga yozilish',
    'page.stock.sub': 'Aqlli dori zaxirasi boshqaruvi',
    'page.chat.sub': 'MEDAI · Tibbiy savollaringizga sodda tilda javob',
    'page.analysis.sub': 'MEDAI · Laboratoriya natijalarini tushunish',
    'page.medicine.sub': 'MEDAI · Dori yoʻriqnomasini sodda tilda',
    'page.library.sub': 'MEDAI · Tibbiy atamalar izohi',
    'page.history.sub': 'MEDAI · Shu qurilmada saqlangan suhbatlar',
    'page.settings.sub': 'Shaxsiy sozlamalar va maxfiylik',
    'page.about.sub': 'MEDPERFECT nima qila oladi va qayerga qarab rivojlanadi',
    'brand.tagline': 'Yagona tibbiyot platformasi',
    'action.newChat': 'Yangi suhbat',
    'sidebar.recent': 'Soʻnggi suhbatlar',
  },
  // ru: { ... }  — keyingi bosqich
  // en: { ... }  — keyingi bosqich
};

export const SUPPORTED = ['uz'];
let lang = 'uz';

export function t(key) {
  return messages[lang]?.[key] ?? messages.uz[key] ?? key;
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.documentElement.lang = lang;
}

export function setLanguage(code) {
  if (!SUPPORTED.includes(code)) return false;
  lang = code;
  applyTranslations();
  return true;
}
