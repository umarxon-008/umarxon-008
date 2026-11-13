/**
 * Interfeys tarjimalari uchun tuzilma.
 * Hozir faqat o'zbek tili (lotin) to'liq. Rus va ingliz tillari keyingi bosqichda shu
 * lug'atga qo'shiladi — HTML dagi data-i18n="kalit" elementlar avtomatik yangilanadi.
 */
const messages = {
  uz: {
    'nav.chat': 'AI yordamchi',
    'nav.analysis': 'Tibbiy tahlil',
    'nav.medicine': 'Dori qoʻllanmasi',
    'nav.library': 'Tibbiy kutubxona',
    'nav.history': 'Suhbatlar tarixi',
    'nav.settings': 'Profil va sozlamalar',
    'nav.about': 'Loyiha haqida',
    'page.chat.sub': 'Tibbiy savollaringizga sodda tilda javob',
    'page.analysis.sub': 'Laboratoriya natijalarini tushunish',
    'page.medicine.sub': 'Dori yoʻriqnomasini sodda tilda',
    'page.library.sub': 'Tibbiy atamalar izohi',
    'page.history.sub': 'Shu qurilmada saqlangan suhbatlar',
    'page.settings.sub': 'Shaxsiy sozlamalar va maxfiylik',
    'page.about.sub': 'MEDAI nima qila oladi va qayerga qarab rivojlanadi',
    'brand.tagline': 'Tibbiy maʼlumot yordamchisi',
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
