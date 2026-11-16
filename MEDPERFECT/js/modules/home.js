/**
 * MEDPERFECT bosh sahifasi (dashboard): platforma haqida, 4 ta modul, umumiy statistika,
 * ogohlantirishlar va so'nggi faoliyat. Barcha raqamlar modullarning demo ma'lumotlaridan hisoblanadi.
 */
import { $, el, icon, icons, formatRelative } from '../utils.js';
import { store } from '../store.js';
import { traceSummary } from './trace.js';
import { connectSummary } from './connect.js';
import { analyze as stockAnalyze } from './stock.js';
import { fmtLongDate, fmtDate } from './common.js';
import { openAuth, roleLabel } from './auth.js';

const MODULES = [
  { key: 'medai', route: 'chat', icon: 'brain-circuit', title: 'MEDAI', subtitle: 'Tibbiy AI yordamchi',
    text: 'Tahlil natijalari, dori yoʻriqnomalari va tibbiy atamalarni sodda oʻzbek tilida tushuntiradi — tashxis qoʻymasdan.',
    features: ['AI chat', 'Tahlilni tushuntirish', 'Dori qoʻllanmasi', '26 ta atama'] },
  { key: 'trace', route: 'trace', icon: 'scan-search', title: 'PHARMA TRACE', subtitle: 'Dori vositalarini kuzatish',
    text: 'QR kod yoki partiya raqami orqali dorining kelib chiqishi va taʼminot zanjirini tekshiradi.',
    features: ['QR / ID qidiruv', 'Partiya maʼlumoti', '4 bosqichli zanjir', 'Shubhali holat'] },
  { key: 'connect', route: 'connect', icon: 'stethoscope', title: 'MEDCONNECT', subtitle: 'Tibbiy aloqa platformasi',
    text: 'Bemorlarni shifokorlar va tibbiyot muassasalari bilan bogʻlaydi: profil, qabulga yozilish va xabarlar.',
    features: ['Shifokorlar', 'Muassasalar', 'Qabulga yozilish', 'Chat'] },
  { key: 'stock', route: 'stock', icon: 'boxes', title: 'MEDSTOCK AI', subtitle: 'Aqlli dori zaxirasi',
    text: 'Dorixona zaxirasini kuzatadi: kam qolgan va muddati yaqin dorilar, kirim-chiqim va buyurtma tavsiyalari.',
    features: ['Zaxira nazorati', 'Ogohlantirishlar', 'Diagrammalar', 'Tavsiyalar'] },
];

export function showHome() {
  const root = $('#view-home .page');
  const trace = traceSummary();
  const conn = connectSummary();
  const stock = stockAnalyze();
  const name = store.settings.name;

  // Ogohlantirishlar (eng muhimlari birinchi)
  const alerts = [
    ...trace.suspicious.map((p) => ({ tone: 'danger', icon: 'shield-alert', module: 'PHARMA TRACE', title: `${p.name}: shubhali partiya ${p.batch}`, text: 'Partiya raqami mos kelmadi, zanjirda boʻshliq bor', href: `#/trace/${p.id}` })),
    ...stock.rows.filter((r) => r.st.key === 'expired').map((r) => ({ tone: 'danger', icon: 'circle-x', module: 'MEDSTOCK AI', title: `${r.it.name}: muddati oʻtgan`, text: `${r.it.qty} ${r.it.unit} sotuvdan olib qoʻyilishi kerak`, href: '#/stock/insights' })),
    ...stock.rows.filter((r) => r.st.key === 'low').map((r) => ({ tone: 'warning', icon: 'trending-down', module: 'MEDSTOCK AI', title: `${r.it.name}: kam qolgan`, text: `${r.it.qty} ${r.it.unit} (minimal ${r.it.min})`, href: '#/stock/insights' })),
    ...stock.rows.filter((r) => r.st.left >= 0 && r.st.left <= 45).map((r) => ({ tone: 'warning', icon: 'calendar-clock', module: 'MEDSTOCK AI', title: `${r.it.name}: muddati yaqin`, text: `${r.st.left} kun qoldi (${fmtDate(r.it.expiry)})`, href: '#/stock/insights' })),
  ];

  // So'nggi faoliyat
  const activity = [
    ...conn.upcoming.slice(0, 3).map((a) => {
      const d = conn.doctorOf(a.doctorId);
      return { icon: 'calendar-days', module: 'MEDCONNECT', title: `Qabul: ${d.name} (${d.specialty})`, text: `${fmtLongDate(a.date)}, ${a.time} · demo`, href: '#/connect/appointments', at: a.createdAt };
    }),
    ...store.conversations().filter((c) => c.messages.length).slice(0, 3).map((c) => ({ icon: 'message-square', module: 'MEDAI', title: c.title, text: `${c.messages.length} ta xabar`, href: `#/chat/${c.id}`, at: c.updatedAt })),
  ].sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  const feedItem = (x) => el('a', { class: `feed-item feed-item--${x.tone || 'info'}`, href: x.href }, [
    el('span', { class: 'feed-item__icon' }, [icon(x.icon)]),
    el('span', { class: 'feed-item__text' }, [el('small', { text: x.module }), el('strong', { text: x.title }), el('span', { text: x.text })]),
    x.at ? el('time', { class: 'feed-item__time', datetime: x.at, text: formatRelative(x.at) }) : icon('chevron-right', 'feed-item__chev'),
  ]);

  const authBtn = el('button', { type: 'button', class: 'btn btn--glass' }, [icon(name ? 'user-round' : 'log-in'), name ? `${name} · ${roleLabel(store.settings.role)}` : 'Kirish / Roʻyxatdan oʻtish']);
  authBtn.addEventListener('click', () => openAuth(name ? 'login' : 'register'));

  root.replaceChildren(
    el('section', { class: 'home-hero' }, [
      el('div', { class: 'home-hero__content' }, [
        el('span', { class: 'home-hero__badge' }, [icon('sparkles'), 'Hackathon MVP · demo versiya']),
        el('h2', { class: 'home-hero__title' }, [name ? `Xush kelibsiz, ${name}!` : 'Salomatlik va farmatsevtika — ', name ? null : el('span', { text: 'bitta platformada' })]),
        el('p', { class: 'home-hero__text', text: 'MEDPERFECT tibbiy maʼlumotni tushuntiruvchi AI yordamchi, dori vositalarini kuzatish, shifokor bilan aloqa va dorixona zaxirasini boshqarishni yagona tizimga birlashtiradi.' }),
        el('div', { class: 'btn-row' }, [
          el('a', { class: 'btn btn--light', href: '#/chat' }, [icon('brain-circuit'), 'MEDAI bilan boshlash']),
          authBtn,
        ]),
      ]),
      el('div', { class: 'home-hero__logo' }, [el('img', { src: 'public/assets/medperfect-logo-256.png', alt: 'MEDPERFECT logotipi', width: 200, height: 200 })]),
    ]),

    el('div', { class: 'kpi-row' }, [
      statTile('Kuzatuvdagi dorilar', trace.total, `${trace.suspicious.length} ta shubhali`, 'scan-search', 'trace', '#/trace'),
      statTile('Namunaviy shifokorlar', conn.doctors, `${conn.clinics} ta muassasa`, 'stethoscope', 'connect', '#/connect'),
      statTile('Zaxira pozitsiyalari', stock.counts.total, `${stock.counts.low + stock.counts.expired} ta ogohlantirish`, 'boxes', 'stock', '#/stock'),
      statTile('MEDAI atamalari', 26, 'tushuntirishga tayyor', 'book-open', 'medai', '#/library'),
    ]),

    el('section', { class: 'home-block' }, [
      el('div', { class: 'section-title-row' }, [el('h3', { class: 'home-block__title', text: 'Platforma modullari' }), el('span', { class: 'muted small', text: 'Istalgan modulga bir bosishda oʻting' })]),
      el('div', { class: 'module-grid' }, MODULES.map((m) => el('a', { class: `module-card module-card--${m.key}`, href: `#/${m.route}` }, [
        el('span', { class: 'module-card__icon' }, [icon(m.icon)]),
        el('div', { class: 'module-card__head' }, [el('strong', { text: m.title }), el('span', { text: m.subtitle })]),
        el('p', { text: m.text }),
        el('div', { class: 'chip-row' }, m.features.map((f) => el('span', { class: 'chip chip--static chip--xs', text: f }))),
        el('span', { class: 'module-card__go' }, ['Ochish', icon('arrow-right')]),
      ]))),
    ]),

    el('div', { class: 'home-panels' }, [
      el('section', { class: 'card' }, [
        el('div', { class: 'section-title-row' }, [el('h3', { class: 'section-title' }, [icon('bell'), 'Ogohlantirishlar']), el('span', { class: 'tab__count', text: String(alerts.length) })]),
        alerts.length ? el('div', { class: 'feed' }, alerts.slice(0, 6).map(feedItem)) : el('p', { class: 'muted', text: 'Ogohlantirishlar yoʻq.' }),
      ]),
      el('section', { class: 'card' }, [
        el('h3', { class: 'section-title' }, [icon('activity'), 'Soʻnggi faoliyat']),
        activity.length ? el('div', { class: 'feed' }, activity.slice(0, 5).map(feedItem)) : el('div', { class: 'feed-empty' }, [
          el('p', { class: 'muted', text: 'Hali faoliyat yoʻq. Quyidagilardan birini sinab koʻring:' }),
        ]),
        el('div', { class: 'quick-actions' }, [
          quick('#/analysis', 'flask-conical', 'Tahlilni tushuntirish'),
          quick('#/trace/MP-10004', 'qr-code', 'Dorini tekshirish'),
          quick('#/connect', 'calendar-days', 'Qabulga yozilish'),
          quick('#/stock/insights', 'brain-circuit', 'Zaxira tahlili'),
        ]),
      ]),
    ]),

    el('div', { class: 'notice notice--info' }, [icon('shield-check'), el('p', {}, [
      el('strong', { text: 'Xavfsizlik tamoyili: ' }),
      'MEDPERFECT shifokor oʻrnini bosmaydi — tashxis qoʻymaydi, davolash va doza belgilamaydi. Barcha modul maʼlumotlari taqdimot uchun namunaviy. Shoshilinch holatda 103 ga qoʻngʻiroq qiling.',
    ])]),
  );
  icons(root);
}

function statTile(label, value, hint, iconName, key, href) {
  return el('a', { class: `kpi kpi--link kpi--${key}`, href }, [
    el('span', { class: 'kpi__icon' }, [icon(iconName)]),
    el('div', { class: 'kpi__body' }, [el('span', { class: 'kpi__label', text: label }), el('strong', { class: 'kpi__value', text: String(value) }), el('span', { class: 'kpi__hint', text: hint })]),
  ]);
}

const quick = (href, ic, label) => el('a', { class: 'quick-action', href }, [icon(ic), el('span', { text: label })]);
