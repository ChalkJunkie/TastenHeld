// Kleine UI-Helfer: Elemente bauen, Bildschirme wechseln, Dialoge, Meldungen, Einstellungen.

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

/** Sterne als Symbole (★ voll, ☆ leer) plus Text für Bildschirmleser. */
export function starsNode(count, max = 3, cls = '') {
  const wrap = el('span', { class: `stars ${cls}`, role: 'img', 'aria-label': `${count} von ${max} Sternen` });
  for (let i = 0; i < max; i++) {
    wrap.append(el('span', { class: i < count ? 'star star--on' : 'star star--off', 'aria-hidden': 'true' }, i < count ? '★' : '☆'));
  }
  return wrap;
}

/** Pfad eines Zahnrads (Mitte 50/50 in einer 100er-Box). */
function gearPath(teeth = 12, rOut = 48, rIn = 39, hole = 0) {
  const pts = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (2 * Math.PI * i) / (teeth * 4);
    const r = i % 4 === 1 || i % 4 === 2 ? rOut : rIn;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  let d = `M${pts.join(' L')} Z`;
  if (hole) d += ` M${50 + hole},50 A${hole},${hole} 0 1,0 ${50 - hole},50 A${hole},${hole} 0 1,0 ${50 + hole},50 Z`;
  return d;
}

/** Zahnrad als SVG (Farbe über currentColor). */
export function gearIcon(teeth = 12) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', gearPath(teeth));
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

/** Pfad zum Bild einer Welt (assets/svg/welten/<theme>.svg). */
export function worldImage(theme) {
  return `assets/svg/welten/${encodeURIComponent(theme)}.svg`;
}

/** Bild von Tipp, dem Roboter. */
export function tippImage(cls = '', alt = '') {
  return el('img', { src: 'assets/svg/tipp.svg', class: `tipp ${cls}`, alt, width: 160, height: 160 });
}

/** Kurze Meldung unten am Bildschirm. */
export function toast(text, kind = 'info', ms = 4000) {
  const root = document.getElementById('toasts');
  const icon = kind === 'ok' ? '✔' : kind === 'warn' ? '!' : 'i';
  const node = el('div', { class: `toast toast--${kind}`, role: 'status' }, el('span', { class: 'toast__icon', 'aria-hidden': 'true' }, icon), text);
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
    el('button', {
      class: a.primary ? 'btn btn--primary' : 'btn',
      type: 'button',
      onclick: () => { close(); a.onClick?.(); },
    }, a.label));
  const dlg = el('dialog', { class: 'dialog', 'aria-labelledby': 'dlg-title' },
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

export const THEMES = [
  { id: 'standard', label: 'Bunt' },
  { id: 'kontrast', label: 'Hoher Kontrast' },
];

/** Einstellungen (Theme, Schriftgröße) auf die Seite anwenden. */
export function applySettings(settings) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme ?? 'standard';
  root.style.setProperty('--font-scale', settings.fontScale ?? 1);
}

/** Einstellungs-Dialog. onChange(neueSettings) wird bei jeder Änderung aufgerufen. */
export function openSettings(settings, unlockedThemes, onChange) {
  const current = { ...settings };
  const group = (legend, name, options, value, apply) =>
    el('fieldset', { class: 'choice' },
      el('legend', {}, legend),
      options.map((o) =>
        el('label', { class: 'choice__item' },
          el('input', {
            type: 'radio', name, value: o.value ?? o.id, checked: (o.value ?? o.id) === value,
            onchange: () => { apply(o.value ?? o.id); applySettings(current); onChange({ ...current }); },
          }),
          el('span', {}, o.label))));

  const content = el('div', { class: 'settings' },
    group('Schriftgröße', 'fontScale', FONT_SCALES, current.fontScale, (v) => (current.fontScale = v)),
    group('Farben', 'theme', THEMES.filter((t) => unlockedThemes.includes(t.id)), current.theme, (v) => (current.theme = v)));
  openDialog('Einstellungen', content);
}

/** Zahl hübsch auf Deutsch (Komma statt Punkt). */
export function formatNumber(n, digits = 0) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
