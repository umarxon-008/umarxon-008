/**
 * MEDAI ilovasi: ishga tushirish, marshrutlash (hash router), server holati va umumiy hodisalar.
 */
import { $, $$, el, icon, icons } from './utils.js';
import { store } from './store.js';
import { api } from './api.js';
import { t, applyTranslations, setLanguage } from './i18n.js';
import { toast, openModal, initModal, initDrawer, initMenu } from './ui.js';
import { initChat, render as renderChat, newConversation, prefill, isChatBusy } from './chat.js';
import { initAnalysis, acceptExternalFile, loadSample } from './upload.js';
import { setMaxFileMb } from './dropzone.js';
import { initMedicine } from './medicine.js';
import { initLibrary, showLibrary, loadLibrary } from './library.js';
import { initHistory, renderHistory, renderRecent } from './history.js';
import { initSettings, syncSettingsForm, renderSystemStatus, wipeAll } from './settings.js';
import { showHome } from './modules/home.js';
import { showTrace } from './modules/trace.js';
import { showConnect } from './modules/connect.js';
import { showStock } from './modules/stock.js';
import { openAuth } from './modules/auth.js';

const ROUTES = ['home', 'trace', 'connect', 'stock', 'chat', 'analysis', 'medicine', 'library', 'history', 'settings', 'about'];
let drawer;
let serverStatus = null;

/* ---------------- Router ---------------- */
function parseHash() {
  const [, route = 'home', param = null] = (location.hash || '#/home').split('/');
  return { route: ROUTES.includes(route) ? route : 'home', param };
}

function navigate() {
  const { route, param } = parseHash();
  if (route === 'chat' && param) {
    if (store.get(param)) { if (store.activeId !== param) store.setActive(param); }
    else { toast('Bu suhbat topilmadi yoki oʻchirilgan.', 'warning'); history.replaceState(null, '', '#/chat'); }
  }

  ROUTES.forEach((r) => { $(`#view-${r}`).hidden = r !== route; });
  $$('.nav__item').forEach((a) => {
    const on = a.dataset.route === route;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $('.profile-card').classList.toggle('is-active', route === 'settings');
  $('#pageTitle').textContent = t(`nav.${route}`);
  $('#pageSubtitle').textContent = t(`page.${route}.sub`);
  document.title = `${t(`nav.${route}`)} — MEDPERFECT`;
  const changed = document.body.dataset.route !== route;
  document.body.dataset.route = route;
  if (changed) $('#main').scrollTop = 0; // yangi bo'lim yuqoridan ochiladi
  drawer?.close();

  if (route === 'home') showHome();
  if (route === 'trace') showTrace(param);
  if (route === 'connect') showConnect(param);
  if (route === 'stock') showStock(param);
  if (route === 'chat') renderChat();
  if (route === 'library') showLibrary();
  if (route === 'history') renderHistory();
  if (route === 'settings') { syncSettingsForm(); renderSystemStatus(serverStatus); }
  renderRecent();
}

function go(route) {
  const target = `#/${route}`;
  if (location.hash === target) navigate(); else location.hash = target;
}

/* ---------------- Server holati ---------------- */
async function refreshStatus(showToast = false) {
  const pill = $('#statusPill');
  pill.dataset.state = 'loading';
  $('#statusText').textContent = 'Tekshirilmoqda…';
  try {
    serverStatus = await api.status();
  } catch {
    serverStatus = null;
  }
  if (serverStatus?.limits?.maxFileMb) setMaxFileMb(serverStatus.limits.maxFileMb);
  const state = !serverStatus ? 'offline' : serverStatus.mode;
  pill.dataset.state = state;
  $('#statusText').textContent = { ai: 'AI ulangan', demo: 'Demo rejim', offline: 'Server ulanmagan' }[state];
  pill.setAttribute('aria-label', `Ishlash rejimi: ${$('#statusText').textContent}. Batafsil maʼlumot`);
  const dismissed = safeSession('get', 'medai.demoBannerClosed') === '1';
  $('#demoBanner').hidden = state === 'ai' || dismissed;
  $('#demoBannerText').textContent = state === 'offline'
    ? 'Server bilan aloqa yoʻq: chat, tahlil va dori boʻlimlari ishlamaydi. Serverni ishga tushiring (README) va sahifani yangilang.'
    : 'Demo rejim: AI modeli ulanmagan. Javoblar qoidaga asoslangan va MEDAI kutubxonasidan olinadi — ular AI javobi emas.';
  $('#demoBanner').dataset.state = state;
  renderSystemStatus(serverStatus);
  if (showToast) toast(state === 'offline' ? 'Server ulanmagan.' : `Holat yangilandi: ${$('#statusText').textContent}.`, state === 'offline' ? 'error' : 'success');
}

function safeSession(op, key, value) {
  try { return op === 'get' ? sessionStorage.getItem(key) : sessionStorage.setItem(key, value); } catch { return null; }
}

/* ---------------- Ma'lumot oynalari ---------------- */
function showModesInfo() {
  const mode = serverStatus?.mode || 'offline';
  openModal({
    title: 'Ishlash rejimi',
    body: el('div', { class: 'info-modal' }, [
      el('div', { class: `notice notice--${mode === 'ai' ? 'success' : mode === 'demo' ? 'warning' : 'danger'}` }, [
        icon(mode === 'ai' ? 'sparkles' : mode === 'demo' ? 'cloud-off' : 'server'),
        el('p', {}, [el('strong', { text: 'Hozirgi holat: ' }), { ai: `AI ulangan (${serverStatus?.model})`, demo: 'Demo rejim — AI ulanmagan', offline: 'Server ulanmagan' }[mode]]),
      ]),
      serverStatus?.engine === 'browser'
        ? el('p', { class: 'muted', text: 'Server topilmadi, shuning uchun demo toʻliq brauzeringizda ishlayapti: savollar va fayllar hech qayerga yuborilmaydi.' })
        : null,
      el('h3', { text: 'Demo rejim' }),
      el('ul', { class: 'check-list' }, [
        el('li', { text: 'Chat javoblari qoidaga asoslangan: MEDAI kutubxonasidagi 26 ta atama, amaliy mavzular va siz yozgan natijani oraliq bilan solishtirish.' }),
        el('li', { text: 'Tibbiy tahlil: matnli PDF dan koʻrsatkichlar algoritm bilan ajratiladi; rasm va skanerlangan hujjatlar uchun qiymatlar qoʻlda kiritiladi.' }),
        el('li', { text: 'Dori qoʻllanmasi: yuklangan yoʻriqnoma matni sarlavhalar boʻyicha boʻlimlarga ajratiladi. Dori nomi boʻyicha qidiruv mavjud emas.' }),
      ]),
      el('h3', { text: 'AI rejimi' }),
      el('p', { text: 'Server administratori .env fayliga API kalitini qoʻshganda yoqiladi. Kalit faqat serverda saqlanadi va brauzerga hech qachon yuborilmaydi. Ishonchli hujjatlar bazasi (RAG) hali ulanmagan, shuning uchun AI javoblari ham «rasmiy manba bilan tasdiqlangan» deb koʻrsatilmaydi.' }),
    ]),
    actions: [{ label: 'Tushunarli', variant: 'primary', autofocus: true }],
  });
}

function showPrivacyInfo() {
  openModal({
    title: 'Maxfiylik va xavfsizlik',
    body: el('div', { class: 'info-modal' }, [
      el('ul', { class: 'check-list check-list--success' }, [
        el('li', { text: 'Suhbatlar faqat shu qurilmadagi brauzer xotirasida (localStorage) saqlanadi. Saqlashni Sozlamalarda oʻchirish mumkin.' }),
        el('li', { text: 'Laboratoriya va dori fayllari faqat tahlil uchun serverga yuboriladi, xotirada qayta ishlanadi va saqlanmaydi. Ular brauzer xotirasiga ham yozilmaydi.' }),
        el('li', { text: 'Server tibbiy maʼlumotlarni log fayllarga yozmaydi.' }),
        el('li', { text: 'AI rejimida savollaringiz va fayllaringiz javob olish uchun AI xizmatiga (Anthropic) yuboriladi.' }),
        el('li', { text: 'MEDAI ismingizdan boshqa shaxsiy maʼlumot soʻramaydi. Ism ixtiyoriy.' }),
      ]),
      el('div', { class: 'notice notice--danger' }, [icon('shield-alert'), el('p', { text: 'MEDAI tashxis qoʻymaydi, davolash belgilamaydi va dori dozasini tavsiya qilmaydi. Shoshilinch holatda 103 yoki 112 ga qoʻngʻiroq qiling.' })]),
    ]),
    actions: [{ label: 'Yopish', variant: 'primary', autofocus: true }],
  });
}

/* ---------------- Ishga tushirish ---------------- */
function startNewChat() {
  if (newConversation()) {
    go(`chat/${store.activeId}`);
    $('#chatInput').focus();
  }
}

function syncProfile() {
  const name = store.settings.name || 'Mehmon';
  const initial = (store.settings.name || 'M').trim().charAt(0).toUpperCase();
  ['#sidebarName', '#menuName'].forEach((s) => { $(s).textContent = name; });
  ['#sidebarAvatar', '#headerAvatar'].forEach((s) => { $(s).textContent = initial; });
}

function init() {
  applyTranslations();
  icons();
  initModal();
  drawer = initDrawer();
  initMenu($('#profileBtn'), $('#profileMenu'));

  initChat({
    onAttach: (file) => {
      go('analysis');
      acceptExternalFile(file);
      toast('Fayl «Tibbiy tahlil» boʻlimiga oʻtkazildi. «Tahlil qilish» tugmasini bosing.', 'info', { timeout: 6000 });
    },
  });
  initAnalysis();
  initMedicine();
  initLibrary({ onAsk: (q) => { go('chat'); prefill(q); } });
  initHistory({ onOpen: (id) => go(`chat/${id}`), onNew: startNewChat });
  initSettings({ onRefreshStatus: refreshStatus });

  $('#newChatBtn').addEventListener('click', startNewChat);
  $('#statusPill').addEventListener('click', showModesInfo);
  $('#demoBannerMore').addEventListener('click', showModesInfo);
  $('#demoBannerClose').addEventListener('click', () => { $('#demoBanner').hidden = true; safeSession('set', 'medai.demoBannerClosed', '1'); });
  $('#profileMenu').addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'privacy') showPrivacyInfo();
    if (action === 'about-modes') showModesInfo();
    if (action === 'clear-data') wipeAll();
    if (action === 'auth') openAuth();
  });
  $('#privacyLink').addEventListener('click', showPrivacyInfo);
  $('#view-about').addEventListener('click', (e) => {
    const action = e.target.closest('[data-about-action]')?.dataset.aboutAction;
    if (action === 'chat') { go('chat'); $('#chatInput').focus(); }
    if (action === 'home') go('home');
    if (action === 'sample') { go('analysis'); loadSample(); }
  });
  $('#langSelect').addEventListener('change', (e) => {
    if (!setLanguage(e.target.value)) {
      e.target.value = 'uz';
      toast('Bu til keyingi bosqichda qoʻshiladi. Hozircha interfeys oʻzbek tilida.', 'info');
    }
  });

  store.subscribe((reason) => {
    syncProfile();
    if (reason === 'wipe') { renderChat(); renderRecent(); navigate(); }
    if (reason === 'settings' && document.body.dataset.route === 'home') showHome();
  });
  window.addEventListener('beforeunload', (e) => { if (isChatBusy()) e.preventDefault(); });
  window.addEventListener('hashchange', navigate);

  syncProfile();
  navigate();
  refreshStatus();
  loadLibrary().catch(() => {});
  icons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
