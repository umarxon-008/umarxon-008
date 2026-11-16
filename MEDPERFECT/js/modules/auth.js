/**
 * Kirish / ro'yxatdan o'tish — TAQDIMOT UCHUN DEMO OYNA.
 * Haqiqiy akkaunt yaratilmaydi, parol saqlanmaydi va serverga hech narsa yuborilmaydi.
 * Ro'yxatdan o'tishda faqat ism va rol shu qurilmadagi sozlamalarga yoziladi (salomlashish uchun).
 */
import { el, icon } from '../utils.js';
import { openModal, toast } from '../ui.js';
import { store } from '../store.js';

const ROLES = [['patient', 'Bemor'], ['doctor', 'Shifokor'], ['pharmacy', 'Dorixona / ombor xodimi'], ['clinic', 'Tibbiyot muassasasi']];

export function openAuth(mode = 'register') {
  let current = mode;
  const body = el('div', { class: 'auth' });
  const draw = () => {
    const seg = el('div', { class: 'seg seg--full', role: 'tablist' }, [['login', 'Kirish'], ['register', 'Roʻyxatdan oʻtish']].map(([id, label]) => {
      const b = el('button', { type: 'button', role: 'tab', class: `seg__btn${current === id ? ' is-active' : ''}`, 'aria-selected': String(current === id) }, [label]);
      b.addEventListener('click', () => { current = id; draw(); });
      return b;
    }));
    const fields = current === 'register'
      ? [
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Ism' }), el('input', { class: 'input', id: 'authName', maxlength: 40, autocomplete: 'given-name', placeholder: 'Masalan: Aziza', value: store.settings.name || '' })]),
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Telefon raqami' }), el('input', { class: 'input', id: 'authPhone', type: 'tel', maxlength: 17, inputmode: 'tel', placeholder: '+998 90 123 45 67' })]),
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Rol' }), el('select', { class: 'input', id: 'authRole' }, ROLES.map(([v, l]) => el('option', { value: v, text: l, selected: v === (store.settings.role || 'patient') })))]),
      ]
      : [
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Telefon raqami' }), el('input', { class: 'input', id: 'authPhone', type: 'tel', maxlength: 17, inputmode: 'tel', placeholder: '+998 90 123 45 67' })]),
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Parol' }), el('input', { class: 'input', id: 'authPass', type: 'password', maxlength: 64, autocomplete: 'off', placeholder: '••••••••' })]),
      ];
    body.replaceChildren(
      el('div', { class: 'auth__brand' }, [el('img', { src: 'public/assets/medperfect-logo-256.png', alt: '', width: 56, height: 56 }), el('div', {}, [el('strong', { text: 'MEDPERFECT' }), el('span', { class: 'muted small', text: 'Yagona tibbiyot va farmatsevtika platformasi' })])]),
      seg,
      el('div', { class: 'notice notice--warning' }, [icon('badge-info'), el('p', { text: 'Taqdimot uchun demo: haqiqiy akkaunt yaratilmaydi, parol saqlanmaydi va hech narsa serverga yuborilmaydi. Akkaunt tizimi keyingi bosqichda qoʻshiladi.' })]),
      ...fields,
      el('p', { class: 'form-error', id: 'authError', role: 'alert', hidden: true }),
    );
  };
  draw();

  openModal({
    title: 'MEDPERFECT hisobi',
    size: 'sm',
    body,
    actions: [
      { label: 'Yopish', variant: 'secondary' },
      { label: 'Davom etish (demo)', variant: 'primary', icon: 'log-in', onClick: () => {
        const err = body.querySelector('#authError');
        const phone = body.querySelector('#authPhone').value.trim();
        if (!/^\+?[\d\s()-]{9,17}$/.test(phone)) { err.textContent = 'Telefon raqamini toʻgʻri kiriting (masalan: +998 90 123 45 67).'; err.hidden = false; return false; }
        if (current === 'register') {
          const name = body.querySelector('#authName').value.trim();
          if (!/^[\p{L}\s'ʻʼ’-]{2,40}$/u.test(name)) { err.textContent = 'Ismingizni kiriting (2–40 harf).'; err.hidden = false; return false; }
          store.updateSettings({ name, role: body.querySelector('#authRole').value });
          toast(`Demo profil: ${name}. Haqiqiy akkaunt yaratilmadi — ism faqat shu qurilmada saqlandi.`, 'success', { timeout: 6000 });
        } else {
          toast('Demo: kirish tizimi taqdimot uchun koʻrsatildi. Haqiqiy tekshiruv keyingi bosqichda.', 'info', { timeout: 6000 });
        }
        return true;
      } },
    ],
  });
}

export const roleLabel = (role) => (ROLES.find(([v]) => v === role) || [null, 'Mehmon'])[1];
