/**
 * MEDCONNECT — bemor, shifokor va tibbiyot muassasalari o'rtasidagi aloqa (DEMO).
 * Shifokorlar namunaviy profil; qabul real emas; chatdagi javoblar avtomatik demo javob.
 * Yozilishlar va xabarlar faqat shu qurilmada (localStorage) saqlanadi.
 */
import { $, el, icon, icons, normalize, formatTime } from '../utils.js';
import { toast, openModal, closeModal, confirmDialog, emptyState } from '../ui.js';
import { store } from '../store.js';
import { assessMessage } from '../../shared/safety.js';
import { DOCTORS, CLINICS, DEMO_REPLIES } from '../data/connect-data.js';
import { moduleHero, demoNotice, kpi, loadState, saveState, dayOffset, isoDay, fmtLongDate, weekdayShort, initials } from './common.js';

const KEY = 'connect.v1';
let state = loadState(KEY, { appointments: [], chats: {} });
let tab = 'doctors';
let filter = { q: '', specialty: 'Barchasi', clinic: null };
let activeChat = DOCTORS[0].id;

const persist = () => saveState(KEY, state);
const clinicOf = (d) => CLINICS.find((c) => c.id === d.clinicId);
const doctorOf = (id) => DOCTORS.find((d) => d.id === id);

export const connectSummary = () => {
  state = loadState(KEY, { appointments: [], chats: {} });
  const upcoming = state.appointments
    .filter((a) => a.status !== 'cancelled' && new Date(`${a.date}T${a.time}`) >= new Date())
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return { doctors: DOCTORS.length, clinics: CLINICS.length, upcoming, doctorOf, clinicOf };
};

/* ---------------- Bo'sh vaqtlar ---------------- */
function slotsFor(doc, date) {
  const day = isoDay(date);
  const taken = new Set(state.appointments.filter((a) => a.doctorId === doc.id && a.date === day && a.status !== 'cancelled').map((a) => a.time));
  const now = new Date();
  const out = [];
  for (let h = doc.hours[0]; h < doc.hours[1]; h += 1) {
    for (const m of [0, 30]) {
      const time = `${String(h).padStart(2, '0')}:${m ? '30' : '00'}`;
      const at = new Date(`${day}T${time}`);
      if (at <= now) continue;
      out.push({ time, free: !taken.has(time) });
    }
  }
  return out;
}

function workDates(doc, count = 10) {
  const out = [];
  for (let i = 0; out.length < count && i < 30; i += 1) {
    const d = dayOffset(i);
    if (doc.workDays.includes(d.getDay()) && slotsFor(doc, d).some((s) => s.free)) out.push(d);
  }
  return out;
}

function nextFree(doc) {
  const d = workDates(doc, 1)[0];
  if (!d) return 'Boʻsh vaqt yoʻq';
  const s = slotsFor(doc, d).find((x) => x.free);
  const today = isoDay(new Date()) === isoDay(d);
  return `${today ? 'Bugun' : fmtLongDate(d)}, ${s.time}`;
}

/* ---------------- Render ---------------- */
export function showConnect(param) {
  if (['doctors', 'clinics', 'appointments', 'messages'].includes(param)) tab = param;
  state = loadState(KEY, { appointments: [], chats: {} });
  render();
}

function render() {
  const root = $('#view-connect .page');
  const s = connectSummary();
  const unread = Object.values(state.chats).reduce((n, list) => n + list.filter((m) => m.from === 'doctor' && !m.read).length, 0);

  const bar = el('div', { class: 'tabs tabs--module', role: 'tablist', 'aria-label': 'MEDCONNECT boʻlimlari' },
    [['doctors', 'Shifokorlar', 'user-round'], ['clinics', 'Muassasalar', 'building-2'], ['appointments', 'Yozilishlarim', 'calendar-days', s.upcoming.length], ['messages', 'Xabarlar', 'messages-square', unread]]
      .map(([id, label, ic, count]) => {
        const b = el('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(tab === id), dataset: { tab: id } }, [icon(ic), label, count ? el('span', { class: 'tab__count', text: String(count) }) : null]);
        b.addEventListener('click', () => { tab = id; history.replaceState(null, '', `#/connect/${id}`); render(); });
        return b;
      }));

  const content = { doctors: doctorsTab, clinics: clinicsTab, appointments: appointmentsTab, messages: messagesTab }[tab]();
  root.replaceChildren(
    moduleHero({ key: 'connect', iconName: 'stethoscope', title: 'MEDCONNECT', subtitle: 'Bemorlar, shifokorlar va tibbiyot muassasalari oʻrtasidagi aloqa', badge: 'Namunaviy profillar' }),
    demoNotice('Shifokor va muassasa profillari namunaviy — ular haqiqiy shaxslar emas. Qabulga yozilish va chat taqdimot uchun demo: real qabul belgilanmaydi va xabarlar shifokorga yetkazilmaydi.'),
    el('div', { class: 'kpi-row' }, [
      kpi({ label: 'Namunaviy shifokorlar', value: s.doctors, iconName: 'stethoscope', tone: 'teal' }),
      kpi({ label: 'Tibbiyot muassasalari', value: s.clinics, iconName: 'building-2', tone: 'purple' }),
      kpi({ label: 'Rejalashtirilgan qabullar', value: s.upcoming.length, iconName: 'calendar-days', tone: 'success' }),
      kpi({ label: 'Yangi xabarlar', value: unread, iconName: 'messages-square', tone: 'warning' }),
    ]),
    bar,
    content,
  );
  icons(root);
}

function doctorCard(d) {
  const c = clinicOf(d);
  const card = el('article', { class: 'card doctor-card' }, [
    el('div', { class: 'doctor-card__head' }, [
      avatar(d),
      el('div', { class: 'doctor-card__who' }, [
        el('strong', { text: d.name }),
        el('span', { class: 'doctor-card__spec', text: d.specialty }),
        el('span', { class: 'badge badge--soft', text: 'Namunaviy profil' }),
      ]),
    ]),
    el('ul', { class: 'doctor-card__meta' }, [
      el('li', {}, [icon('building-2'), c.name]),
      el('li', {}, [icon('badge-check'), `${d.experience} yillik tajriba · ★ ${d.rating} (demo)`]),
      el('li', {}, [icon('clock'), `Eng yaqin vaqt: ${nextFree(d)}`]),
    ]),
    el('div', { class: 'btn-row' }, [
      el('button', { type: 'button', class: 'btn btn--secondary btn--sm', dataset: { act: 'profile', id: d.id } }, [icon('user-round'), 'Profil']),
      el('button', { type: 'button', class: 'btn btn--primary btn--sm', dataset: { act: 'book', id: d.id } }, [icon('calendar-days'), 'Qabulga yozilish']),
    ]),
  ]);
  return card;
}

const avatar = (d, size = '') => {
  const a = el('span', { class: `doc-avatar${size ? ` doc-avatar--${size}` : ''}`, 'aria-hidden': 'true', text: initials(d.name) });
  a.style.setProperty('--doc-color', d.color);
  return a;
};

function doctorsTab() {
  const specs = ['Barchasi', ...new Set(DOCTORS.map((d) => d.specialty))];
  const q = normalize(filter.q);
  const list = DOCTORS.filter((d) => (filter.specialty === 'Barchasi' || d.specialty === filter.specialty)
    && (!filter.clinic || d.clinicId === filter.clinic)
    && (!q || normalize(`${d.name} ${d.specialty} ${clinicOf(d).name}`).includes(q)));

  const input = el('input', { type: 'search', class: 'input', id: 'doctorSearch', value: filter.q, placeholder: 'Shifokor, mutaxassislik yoki muassasa…', 'aria-label': 'Shifokorlarni qidirish' });
  input.addEventListener('input', () => { filter.q = input.value; const pos = input.selectionStart; render(); const n = $('#doctorSearch'); n.focus(); n.setSelectionRange(pos, pos); });
  const chips = el('div', { class: 'chip-row' }, specs.map((sp) => el('button', { type: 'button', class: `chip${filter.specialty === sp ? ' is-active' : ''}`, 'aria-pressed': String(filter.specialty === sp), dataset: { spec: sp } }, [sp])));
  chips.addEventListener('click', (e) => { const c = e.target.closest('[data-spec]'); if (c) { filter.specialty = c.dataset.spec; render(); } });

  const grid = el('div', { class: 'doctor-grid' }, list.length ? list.map(doctorCard) : [emptyState({ iconName: 'search-x', title: 'Shifokor topilmadi', text: 'Qidiruv yoki filtrni oʻzgartiring.' })]);
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'profile') openProfile(doctorOf(b.dataset.id));
    if (b.dataset.act === 'book') openBooking(doctorOf(b.dataset.id));
  });

  const clinicNote = filter.clinic ? el('div', { class: 'notice notice--info' }, [icon('building-2'), el('p', { text: `Filtr: ${CLINICS.find((c) => c.id === filter.clinic).name}` }),
    el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => { filter.clinic = null; render(); } }, [icon('x'), 'Olib tashlash'])]) : null;

  return el('div', { class: 'stage' }, [el('div', { class: 'toolbar' }, [el('div', { class: 'search-box search-box--sm' }, [icon('search'), input])]), chips, clinicNote, grid].filter(Boolean));
}

function clinicsTab() {
  const grid = el('div', { class: 'clinic-grid' }, CLINICS.map((c) => {
    const count = DOCTORS.filter((d) => d.clinicId === c.id).length;
    return el('article', { class: 'card clinic-card' }, [
      el('div', { class: 'clinic-card__head' }, [el('span', { class: 'clinic-card__icon' }, [icon('building-2')]), el('div', {}, [el('strong', { text: c.name }), el('span', { class: 'muted small', text: c.type })])]),
      el('ul', { class: 'doctor-card__meta' }, [
        el('li', {}, [icon('map-pin'), `${c.city}, ${c.address}`]),
        el('li', {}, [icon('clock'), c.hours]),
        el('li', {}, [icon('stethoscope'), `${count} ta namunaviy shifokor`]),
      ]),
      el('div', { class: 'chip-row' }, c.departments.map((d) => el('span', { class: 'chip chip--static', text: d }))),
      el('button', { type: 'button', class: 'btn btn--secondary btn--sm', dataset: { clinic: c.id } }, [icon('user-round'), 'Shifokorlarni koʻrish']),
    ]);
  }));
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-clinic]');
    if (b) { filter = { q: '', specialty: 'Barchasi', clinic: b.dataset.clinic }; tab = 'doctors'; render(); }
  });
  return grid;
}

function appointmentsTab() {
  const all = [...state.appointments].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  if (!all.length) {
    return el('div', { class: 'card' }, [emptyState({
      iconName: 'calendar-days', title: 'Hali yozilishlar yoʻq',
      text: 'Shifokorni tanlab, qulay sana va vaqtga demo yozilish qiling — u shu yerda koʻrinadi.',
      action: el('button', { type: 'button', class: 'btn btn--primary', onClick: () => { tab = 'doctors'; render(); } }, [icon('stethoscope'), 'Shifokor tanlash']),
    })]);
  }
  const list = el('div', { class: 'appt-list' }, all.map((a) => {
    const d = doctorOf(a.doctorId);
    const past = new Date(`${a.date}T${a.time}`) < new Date();
    const status = a.status === 'cancelled' ? ['Bekor qilingan', 'muted'] : past ? ['Oʻtgan', 'muted'] : ['Demo · tasdiq kutilmoqda', 'warning'];
    return el('article', { class: `card appt-card${a.status === 'cancelled' ? ' appt-card--cancelled' : ''}` }, [
      el('div', { class: 'appt-card__date' }, [el('strong', { text: a.date.slice(8, 10) }), el('span', { text: weekdayShort(a.date) }), el('span', { class: 'mono', text: a.time })]),
      el('div', { class: 'appt-card__body' }, [
        el('strong', { text: `${d.name} — ${d.specialty}` }),
        el('span', { class: 'muted small', text: `${clinicOf(d).name} · ${fmtLongDate(a.date)}, ${a.time}` }),
        a.reason ? el('p', { class: 'small', text: `Sabab: ${a.reason}` }) : null,
        el('span', { class: `status-badge status-badge--${status[1]}`, text: status[0] }),
      ]),
      a.status !== 'cancelled' && !past ? el('button', { type: 'button', class: 'btn btn--ghost btn--sm btn--danger-text', dataset: { cancel: a.id } }, [icon('x'), 'Bekor qilish']) : null,
    ]);
  }));
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cancel]');
    if (!b) return;
    const ok = await confirmDialog({ title: 'Yozilishni bekor qilish', message: 'Bu demo yozilish bekor qilinadi.', confirmLabel: 'Bekor qilish', danger: true });
    if (!ok) return;
    const a = state.appointments.find((x) => x.id === b.dataset.cancel);
    a.status = 'cancelled';
    persist();
    toast('Yozilish bekor qilindi.', 'success');
    render();
  });
  return list;
}

function messagesTab() {
  const list = el('div', { class: 'chat-contacts' }, DOCTORS.map((d) => {
    const msgs = state.chats[d.id] || [];
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter((m) => m.from === 'doctor' && !m.read).length;
    return el('button', { type: 'button', class: `chat-contact${d.id === activeChat ? ' is-active' : ''}`, dataset: { chat: d.id } }, [
      avatar(d, 'sm'),
      el('span', { class: 'chat-contact__text' }, [el('strong', { text: d.name }), el('small', { text: last ? last.text.slice(0, 40) : d.specialty })]),
      unread ? el('span', { class: 'tab__count', text: String(unread) }) : null,
    ]);
  }));
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-chat]'); if (b) { activeChat = b.dataset.chat; render(); } });

  const d = doctorOf(activeChat);
  const msgs = state.chats[d.id] || [];
  msgs.forEach((m) => { m.read = true; });
  persist();
  const thread = el('div', { class: 'dm-thread', id: 'dmThread' }, msgs.length ? msgs.map((m) => el('div', { class: `dm dm--${m.from}` }, [
    el('p', { text: m.text }),
    el('span', { class: 'dm__meta', text: `${m.from === 'doctor' ? 'Avtomatik demo javob · ' : ''}${formatTime(m.at)}` }),
  ])) : [el('p', { class: 'muted small center', text: 'Xabar yozing. Bu demo chat — javoblar avtomatik va haqiqiy shifokordan emas.' })]);

  const input = el('input', { class: 'input', id: 'dmInput', maxlength: 500, placeholder: `${d.name}ga xabar…`, autocomplete: 'off', 'aria-label': 'Xabar matni' });
  const form = el('form', { class: 'dm-form', novalidate: true }, [input, el('button', { type: 'submit', class: 'send-btn', 'aria-label': 'Yuborish' }, [icon('send')])]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { toast('Xabar boʻsh.', 'warning'); return; }
    const list2 = state.chats[d.id] || (state.chats[d.id] = []);
    list2.push({ from: 'me', text, at: new Date().toISOString(), read: true });
    persist();
    const flags = assessMessage(text);
    if (flags.emergency) toast('Shoshilinch holat belgilari? Darhol 103 ga qoʻngʻiroq qiling — demo chat orqali yordam kelmaydi.', 'error', { timeout: 8000 });
    render();
    $('#dmInput')?.focus();
    const docId = d.id;
    setTimeout(() => {
      const l = state.chats[docId];
      const replyIdx = l.filter((m) => m.from === 'doctor').length % DEMO_REPLIES.length;
      l.push({ from: 'doctor', text: DEMO_REPLIES[replyIdx], at: new Date().toISOString(), read: tab === 'messages' && activeChat === docId });
      persist();
      if (tab === 'messages' && !$('#view-connect').hidden) { render(); $('#dmInput')?.focus(); }
    }, 900);
  });

  const pane = el('section', { class: 'card dm-pane' }, [
    el('div', { class: 'dm-pane__head' }, [avatar(d, 'sm'), el('div', {}, [el('strong', { text: d.name }), el('small', { class: 'muted', text: `${d.specialty} · Namunaviy profil · demo chat` })])]),
    thread,
    form,
  ]);
  requestAnimationFrame(() => { const t = $('#dmThread'); if (t) t.scrollTop = t.scrollHeight; });
  return el('div', { class: 'dm-layout' }, [el('div', { class: 'card dm-list' }, [list]), pane]);
}

/* ---------------- Modallar ---------------- */
function openProfile(d) {
  const c = clinicOf(d);
  const days = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
  openModal({
    title: d.name,
    size: 'lg',
    body: el('div', { class: 'doctor-profile' }, [
      el('div', { class: 'doctor-profile__head' }, [avatar(d, 'lg'), el('div', {}, [
        el('strong', { class: 'doctor-profile__spec', text: d.specialty }),
        el('span', { class: 'muted', text: c.name }),
        el('span', { class: 'badge badge--soft', text: 'Namunaviy profil — haqiqiy shifokor emas' }),
      ])]),
      el('p', { text: d.about }),
      el('div', { class: 'info-grid' }, [
        el('div', { class: 'info-item' }, [el('span', { class: 'info-item__label', text: 'Tajriba' }), el('strong', { text: `${d.experience} yil` })]),
        el('div', { class: 'info-item' }, [el('span', { class: 'info-item__label', text: 'Tillar' }), el('strong', { text: d.languages.join(', ') })]),
        el('div', { class: 'info-item' }, [el('span', { class: 'info-item__label', text: 'Ish kunlari' }), el('strong', { text: d.workDays.map((x) => days[x]).join(', ') })]),
        el('div', { class: 'info-item' }, [el('span', { class: 'info-item__label', text: 'Qabul vaqti' }), el('strong', { text: `${d.hours[0]}:00 – ${d.hours[1]}:00` })]),
        el('div', { class: 'info-item' }, [el('span', { class: 'info-item__label', text: 'Manzil' }), el('strong', { text: `${c.city}, ${c.address}` })]),
        el('div', { class: 'info-item' }, [el('span', { class: 'info-item__label', text: 'Eng yaqin vaqt' }), el('strong', { text: nextFree(d) })]),
      ]),
    ]),
    actions: [
      { label: 'Xabar yozish', variant: 'secondary', icon: 'messages-square', onClick: () => { activeChat = d.id; tab = 'messages'; render(); } },
      { label: 'Qabulga yozilish', variant: 'primary', icon: 'calendar-days', onClick: () => { closeModal(true); openBooking(d); return false; } },
    ],
  });
}

function openBooking(doc) {
  let selDoc = doc;
  let selDate = null;
  let selTime = null;
  const body = el('form', { class: 'form-stack booking', id: 'bookingForm', novalidate: true });

  const draw = () => {
    const dates = workDates(selDoc);
    if (!selDate || !dates.some((d) => isoDay(d) === isoDay(selDate))) selDate = dates[0] || null;
    const slots = selDate ? slotsFor(selDoc, selDate) : [];
    if (selTime && !slots.some((s) => s.time === selTime && s.free)) selTime = null;

    const docSel = el('select', { class: 'input', id: 'bookDoctor', 'aria-label': 'Shifokor' }, DOCTORS.map((d) => el('option', { value: d.id, text: `${d.name} — ${d.specialty}`, selected: d.id === selDoc.id })));
    docSel.addEventListener('change', () => { selDoc = doctorOf(docSel.value); selTime = null; draw(); });

    const dateRow = el('div', { class: 'date-chips', role: 'radiogroup', 'aria-label': 'Sana' }, dates.map((d) => {
      const on = selDate && isoDay(d) === isoDay(selDate);
      const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: `date-chip${on ? ' is-active' : ''}` }, [
        el('span', { text: weekdayShort(d) }), el('strong', { text: String(d.getDate()) }),
      ]);
      b.addEventListener('click', () => { selDate = d; selTime = null; draw(); });
      return b;
    }));

    const timeRow = el('div', { class: 'time-grid', role: 'radiogroup', 'aria-label': 'Vaqt' }, slots.map((s) => {
      const on = selTime === s.time;
      const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: `time-chip${on ? ' is-active' : ''}`, disabled: !s.free, title: s.free ? '' : 'Band' }, [s.time]);
      b.addEventListener('click', () => { selTime = s.time; draw(); });
      return b;
    }));

    const nameVal = $('#bookName')?.value ?? store.settings.name ?? '';
    const phoneVal = $('#bookPhone')?.value ?? '';
    const reasonVal = $('#bookReason')?.value ?? '';

    body.replaceChildren(
      demoNotice('Bu demo yozilish: real qabul belgilanmaydi va shifokorga xabar yuborilmaydi. Maʼlumot faqat shu qurilmada saqlanadi.'),
      el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Shifokor' }), docSel]),
      el('div', { class: 'field' }, [el('span', { class: 'field__label', text: selDate ? `Sana — ${fmtLongDate(selDate)}` : 'Sana' }), dates.length ? dateRow : el('p', { class: 'muted', text: 'Yaqin kunlarda boʻsh vaqt yoʻq.' })]),
      el('div', { class: 'field' }, [el('span', { class: 'field__label', text: 'Vaqt' }), slots.length ? timeRow : el('p', { class: 'muted', text: 'Bu kunda boʻsh vaqt yoʻq.' })]),
      el('div', { class: 'grid-2 grid-2--tight' }, [
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Ismingiz' }), el('input', { class: 'input', id: 'bookName', maxlength: 40, value: nameVal, autocomplete: 'name', placeholder: 'Masalan: Aziza' })]),
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Telefon (ixtiyoriy)' }), el('input', { class: 'input', id: 'bookPhone', type: 'tel', maxlength: 17, value: phoneVal, inputmode: 'tel', placeholder: '+998 90 123 45 67' })]),
      ]),
      el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Murojaat sababi (qisqacha)' }), el('textarea', { class: 'input textarea textarea--sm', id: 'bookReason', rows: 2, maxlength: 200, placeholder: 'Masalan: tahlil natijalarini muhokama qilish' }, [])]),
      el('p', { class: 'form-error', id: 'bookError', role: 'alert', hidden: true }),
      el('p', { class: 'muted small' }, [icon('siren', 'inline-icon'), ' Shoshilinch holatda qabul kutmang — darhol 103 ga qoʻngʻiroq qiling.']),
    );
    $('#bookReason', body).value = reasonVal;
    icons(body);
  };
  draw();

  openModal({
    title: 'Qabulga yozilish',
    size: 'lg',
    body,
    actions: [
      { label: 'Bekor qilish', variant: 'secondary' },
      { label: 'Yozilishni tasdiqlash', variant: 'primary', icon: 'check', onClick: () => {
        const name = $('#bookName').value.trim();
        const phone = $('#bookPhone').value.trim();
        const err = $('#bookError');
        const problems = [];
        if (!selDate || !selTime) problems.push('Sana va vaqtni tanlang.');
        if (!/^[\p{L}\s'ʻʼ’-]{2,40}$/u.test(name)) problems.push('Ismingizni kiriting (2–40 harf).');
        if (phone && !/^\+?[\d\s()-]{9,17}$/.test(phone)) problems.push('Telefon raqami formati notoʻgʻri.');
        if (problems.length) { err.textContent = problems.join(' '); err.hidden = false; return false; }
        state.appointments.push({
          id: `a${Date.now().toString(36)}`, doctorId: selDoc.id, date: isoDay(selDate), time: selTime, name, phone,
          reason: $('#bookReason').value.trim().slice(0, 200), status: 'pending', createdAt: new Date().toISOString(),
        });
        persist();
        toast(`Demo yozilish saqlandi: ${selDoc.name}, ${fmtLongDate(selDate)}, ${selTime}.`, 'success', { timeout: 5000 });
        tab = 'appointments';
        history.replaceState(null, '', '#/connect/appointments');
        render();
        return true;
      } },
    ],
  });
}

export function initConnect() { /* hodisalar render vaqtida ulanadi */ }
