// Textzeile zum Abtippen: erledigte Zeichen, aktuelles Zeichen, Rest.
// Mit ticker: true läuft die Zeile wie eine Laufschrift mit (für lange Texte).

import { el } from '../ui.js';

export function createTextLine(container, text, { ticker = false, cls = '' } = {}) {
  const inner = el('div', { class: 'textline__inner' });
  const root = el('div', { class: `textline${ticker ? ' textline--ticker' : ''} ${cls}`, 'aria-label': text }, inner);
  const spans = [...text].map((ch) =>
    el('span', { class: `tl__ch${ch === ' ' ? ' tl__ch--space' : ''}`, 'aria-hidden': 'true' }, ch === ' ' ? '␣' : ch));
  inner.append(...spans);
  container.append(root);
  let pos = 0;

  function scroll() {
    if (!ticker) return;
    const cur = spans[Math.min(pos, spans.length - 1)];
    if (!cur) return;
    // Aktuelles Zeichen bei etwa einem Drittel der Breite halten
    const x = Math.max(0, cur.offsetLeft - root.clientWidth * 0.33);
    inner.style.transform = `translateX(${-x}px)`;
  }

  function setPos(i) {
    spans[pos]?.classList.remove('is-current');
    for (let j = Math.min(pos, i); j < Math.max(pos, i); j++) spans[j]?.classList.toggle('is-done', j < i);
    pos = i;
    spans[pos]?.classList.add('is-current');
    scroll();
  }

  setPos(0);
  requestAnimationFrame(scroll); // nach dem ersten Zeichnen stimmen die Breiten

  return {
    element: root,
    setPos,
    /** Aktuelles Zeichen kurz wackeln lassen (Fehler). */
    shake() {
      const s = spans[pos];
      if (!s) return;
      s.classList.remove('is-wrong');
      void s.offsetWidth;
      s.classList.add('is-wrong');
    },
    destroy() {
      root.remove();
    },
  };
}
