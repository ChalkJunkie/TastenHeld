// Kleine UI-Helfer: Elemente bauen, Bildschirme wechseln, Dialoge, Meldungen, Einstellungen.

import { AVATARS, THEMES, avatarFilter } from './rewards.js';

/**
 * Baut ein DOM-Element.  el('button', { class: 'btn', onclick: fn }, 'Text', kindElement)
 * Attribute mit on... werden als Ereignis-Listener gesetzt.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Zeigt einen neuen Bildschirm im Hauptbereich. */
export function showScreen(node, { focus = true } = {}) {
  const main = document.getElementById('screen');
  main.replaceChildren(node);
  window.scrollTo(0, 0);
  if (focus) {
    // Erste Überschrift fokussieren (für Bildschirmleser), ohne sichtbaren Rahmen
    const h = node.querySelector('h1, h2');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  }
}

/** Pixel-Symbol aus dem UI-Bausatz (assets/pixel/ui/i-<name>.png), rein dekorativ. */
export function icon(name, cls = '') {
  return el('img', { src: `assets/pixel/ui/i-${name}.png`, class: `icon pixel ${cls}`, alt: '', 'aria-hidden': 'true' });
}

/** Sterne als Pixelbilder plus Text für Bildschirmleser. cls: '' (klein) oder 'stars--big'. */
export function starsNode(count, max = 3, cls = '') {
  const big = cls.includes('stars--big');
  const wrap = el('span', { class: `stars ${cls}`, role: 'img', 'aria-label': `${count} von ${max} Sternen` });
  for (let i = 0; i < max; i++) {
    const on = i < count;
    const file = big ? (on ? 'star-big' : 'star-big-off') : (on ? 'i-star-s' : 'i-star-s-off');
    wrap.append(el('img', { src: `assets/pixel/ui/${file}.png`, class: `star pixel ${on ? 'star--on' : 'star--off'}`, alt: '', 'aria-hidden': 'true' }));
  }
  return wrap;
}

/** Level-Zahnrad als Pixelbild: 'open', 'gold' (nächstes Level) oder 'locked'. */
export function gearIcon(kind = 'open') {
  const file = kind === 'locked' ? 'gear-locked' : kind === 'gold' ? 'gear-gold' : 'gear';
  return el('img', { src: `assets/pixel/ui/${file}.png`, class: 'pixel gear-img', alt: '', 'aria-hidden': 'true' });
}

/** Knopf mit optionalem Pixel-Symbol. variant: '', 'primary', 'green', 'dark', dazu 'big', 'sm', 'icon'. */
export function button(label, { variant = '', icon: ic = null, iconEnd = null, onclick, type = 'button', ...attrs } = {}) {
  const iconOnly = variant.includes('icon');
  return el('button', { class: `btn ${variant.split(' ').filter(Boolean).map((v) => `btn--${v}`).join(' ')}`, type, onclick, ...(iconOnly ? { 'aria-label': label, title: label } : {}), ...attrs },
    ic ? icon(ic) : null, iconOnly ? null : el('span', { class: 'btn__label' }, label), iconEnd ? icon(iconEnd) : null);
}

/** Pfad zum Bild einer Welt (assets/pixel/welten/<theme>.png). */
export function worldImage(theme) {
  return `assets/pixel/welten/${encodeURIComponent(theme)}.png`;
}

/** Bild von Tipp, dem Roboter. */
export function tippImage(cls = '', alt = '') {
  return el('img', { src: 'assets/pixel/tipp.png', class: `tipp pixel ${cls}`, alt, width: 32, height: 32 });
}

/** Kurze Meldung unten am Bildschirm. */
export function toast(text, kind = 'info', ms = 4000) {
  const root = document.getElementById('toasts');
  const node = el('div', { class: `toast toast--${kind}`, role: 'status' }, icon(kind === 'ok' ? 'check' : 'info'), text);
  root.append(node);
  setTimeout(() => node.classList.add('toast--out'), ms);
  setTimeout(() => node.remove(), ms + 400);
}

/**
 * Einfacher modaler Dialog mit <dialog>. Gibt eine Funktion zum Schließen zurück.
 * content: Element, actions: [{ label, primary?, onClick? }], onClose: beim Schließen
 */
export function openDialog(title, content, { onClose, actions = [{ label: 'Fertig', primary: true }] } = {}) {
  const close = () => {
    dlg.close();
  };
  const buttons = actions.map((a) =>
    button(a.label, { variant: a.primary ? 'primary' : '', onclick: () => { close(); a.onClick?.(); } }));
  const dlg = el('dialog', { class: 'dialog frame', 'aria-labelledby': 'dlg-title' },
    el('h2', { id: 'dlg-title' }, title),
    content,
    el('div', { class: 'dialog__actions' }, buttons));
  dlg.addEventListener('close', () => {
    dlg.remove();
    onClose?.();
  });
  document.body.append(dlg);
  dlg.showModal();
  return close;
}

export const FONT_SCALES = [
  { value: 1, label: 'Normal' },
  { value: 1.2, label: 'Groß' },
  { value: 1.4, label: 'Sehr groß' },
];

/** Einstellungen (Theme, Schriftgröße) und Avatar auf die Seite anwenden. */
export function applySettings(settings, avatar = 'tipp') {
  const root = document.documentElement;
  root.dataset.theme = settings.theme ?? 'standard';
  root.style.setProperty('--font-scale', settings.fontScale ?? 1);
  root.dataset.font = String(settings.fontScale ?? 1); // für Layout-Anpassungen bei großer Schrift
  root.style.setProperty('--avatar-filter', avatarFilter(avatar));
  root.classList.toggle('reduce-motion', !!settings.reduceMotion || prefersReducedMotion());
}

/** Wünscht das Betriebssystem weniger Bewegung? */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Sollen Effekte (Funken, Konfetti) gezeigt werden? */
export function effectsOn() {
  return !document.documentElement.classList.contains('reduce-motion');
}

/**
 * Pixelbild als Hintergrund immer in GANZEN Vielfachen vergrößern (sonst werden
 * manche Pixel breiter als andere). Passt sich bei Größenänderungen an.
 */
export function pixelBackground(node, w, h) {
  const size = { w, h };
  const update = () => {
    const s = Math.max(1, Math.ceil(Math.max(node.clientWidth / size.w, node.clientHeight / size.h)));
    node.style.backgroundSize = `${size.w * s}px ${size.h * s}px`;
  };
  new ResizeObserver(update).observe(node);
  node._pixelSize = (nw, nh) => { size.w = nw; size.h = nh; update(); };
  update();
}

/**
 * Einstellungs-Dialog: Schriftgröße, Farbthema, Avatar ("Mein Tipp").
 * Gesperrte Themen/Avatare werden mit der nötigen XP-Zahl angezeigt.
 * onChange({ settings, avatar }) wird bei jeder Änderung aufgerufen.
 */
export function openSettings(state, onChange) {
  const settings = { ...state.settings };
  let avatar = state.profile.avatar;
  const changed = () => {
    applySettings(settings, avatar);
    onChange({ settings: { ...settings }, avatar });
  };
  const radio = (name, value, checked, disabled, apply) =>
    el('input', { type: 'radio', name, value, checked, disabled, onchange: () => { apply(value); changed(); } });

  const fontGroup = el('fieldset', { class: 'choice' }, el('legend', {}, 'Schriftgröße'),
    FONT_SCALES.map((o) => el('label', { class: 'choice__item' },
      radio('fontScale', o.value, o.value === settings.fontScale, false, (v) => (settings.fontScale = v)),
      el('span', {}, o.label))));

  const themeGroup = el('fieldset', { class: 'choice' }, el('legend', {}, 'Farben'),
    THEMES.map((t) => {
      const open = state.unlocked.themes.includes(t.id);
      return el('label', { class: `choice__item${open ? '' : ' is-locked'}` },
        radio('theme', t.id, t.id === settings.theme, !open, (v) => (settings.theme = v)),
        el('span', {}, t.name), open ? null : el('span', { class: 'lockinfo' }, icon('lock'), `ab ${t.xp} XP`));
    }));

  const avatarGroup = el('fieldset', { class: 'choice' }, el('legend', {}, 'Mein Tipp'),
    el('div', { class: 'avatars' }, AVATARS.map((a) => {
      const open = state.unlocked.avatars.includes(a.id);
      return el('label', { class: `avatar-choice${open ? '' : ' is-locked'}` },
        radio('avatar', a.id, a.id === avatar, !open, (v) => (avatar = v)),
        el('img', { src: 'assets/pixel/tipp.png', class: 'pixel', alt: '', style: { filter: open ? a.filter : 'grayscale(1) opacity(.45)' } }),
        el('span', {}, a.name),
        open ? null : el('span', { class: 'lockinfo' }, icon('lock'), `ab ${a.xp} XP`));
    })));

  const motionGroup = el('fieldset', { class: 'choice' }, el('legend', {}, 'Bewegung'),
    el('label', { class: 'choice__item' },
      el('input', {
        type: 'checkbox', checked: !!settings.reduceMotion,
        onchange: (e) => { settings.reduceMotion = e.target.checked; changed(); },
      }),
      el('span', {}, 'Weniger Bewegung (keine Wackel- und Hüpfeffekte)')));

  openDialog('Einstellungen', el('div', { class: 'settings' }, fontGroup, themeGroup, motionGroup, avatarGroup));
}

/** Beschriftung einer Welt ("Welt 2: Die obere Reihe I" oder eigener Text). */
export function worldLabel(world) {
  return world.label ?? `Welt ${world.id}: ${world.title}`;
}

/** Liste zufällig mischen (Kopie). */
export function shuffleList(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Zahl hübsch auf Deutsch (Komma statt Punkt). */
export function formatNumber(n, digits = 0) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
