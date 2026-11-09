// Spielmodus "race": Tipps Auto fährt nur, wenn richtig getippt wird.
// Alle Wörter/Sätze bilden einen fortlaufenden Text (mit Leerzeichen dazwischen),
// der wie eine Laufschrift mitläuft. Bei einem Fehler stottert das Auto kurz,
// rollt aber nie zurück.

import { el } from '../ui.js';
import { createTextLine } from './textline.js';

// Auto mit Tipp am Steuer (selbst gezeichnet). Die Räder drehen sich per CSS.
const CAR_SVG = `
<svg viewBox="0 0 160 90" aria-hidden="true">
  <line x1="98" y1="22" x2="98" y2="8" stroke="#2b3a67" stroke-width="3" stroke-linecap="round"/>
  <circle cx="98" cy="7" r="5" fill="#ffcf4a" stroke="#2b3a67" stroke-width="2.5"/>
  <path d="M40 46 L58 22 Q62 18 68 18 L112 18 Q118 18 122 23 L136 46 Z" fill="#9fdcff" stroke="#2b3a67" stroke-width="4" stroke-linejoin="round"/>
  <rect x="80" y="22" width="36" height="26" rx="8" fill="#5cc3f0" stroke="#2b3a67" stroke-width="3"/>
  <rect x="85" y="27" width="26" height="15" rx="5" fill="#1f2b4f"/>
  <circle cx="93" cy="34" r="3" fill="#7ff3c4"/><circle cx="103" cy="34" r="3" fill="#7ff3c4"/>
  <path d="M8 50 Q8 44 16 44 L146 44 Q154 44 154 52 L154 64 Q154 70 148 70 L12 70 Q6 70 6 64 Z" fill="#e8553e" stroke="#2b3a67" stroke-width="4"/>
  <rect x="140" y="50" width="12" height="7" rx="3" fill="#ffe28a"/>
  <rect x="8" y="50" width="8" height="7" rx="3" fill="#ff8a8a"/>
  <g class="car__wheel" style="transform-origin:42px 70px"><circle cx="42" cy="70" r="15" fill="#2b3a67"/><circle cx="42" cy="70" r="6" fill="#d9dbe7"/><rect x="40" y="56" width="4" height="28" fill="#d9dbe7"/></g>
  <g class="car__wheel" style="transform-origin:120px 70px"><circle cx="120" cy="70" r="15" fill="#2b3a67"/><circle cx="120" cy="70" r="6" fill="#d9dbe7"/><rect x="118" y="56" width="4" height="28" fill="#d9dbe7"/></g>
</svg>`;

export function createRace({ field, items, session, level, onProgress, onEnd }) {
  const text = items.join(' ');
  // Wo endet jedes Element? (für "x von y")
  const ends = [];
  let acc = 0;
  for (const item of items) {
    acc += item.length;
    ends.push(acc);
    acc += 1;
  }
  let pos = 0;
  let carX = 0;
  let ended = false;

  const car = el('div', { class: 'race__car' });
  car.innerHTML = CAR_SVG;
  const lineBox = el('div', { class: 'scroll-panel race__panel' });
  const scene = el('div', { class: 'scene race' },
    el('div', { class: 'scene__ground', 'aria-hidden': 'true' }),
    el('div', { class: 'race__road', 'aria-hidden': 'true' }),
    el('div', { class: 'race__finish', 'aria-hidden': 'true' }, el('span', { class: 'race__flag' }, '🏁')),
    lineBox,
    car);
  field.append(scene);
  const line = createTextLine(lineBox, text, { ticker: true, cls: 'textline--big' });

  const target = () => pos / text.length;

  function done() {
    return ends.filter((e) => e <= pos).length;
  }

  function anim(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  return {
    start() {
      onProgress(0, items.length);
      session.expect(text[0]);
    },

    tick(dt) {
      // Auto gleitet weich zur Zielposition
      const t = target();
      carX += (t - carX) * Math.min(1, dt * 5);
      car.style.left = `calc(3% + ${carX} * 80%)`;
      car.classList.toggle('is-driving', Math.abs(t - carX) > 0.002);
      if (ended && Math.abs(t - carX) < 0.003 && !car.classList.contains('is-finished')) {
        car.classList.add('is-finished');
        setTimeout(() => onEnd({}), 1200);
      }
    },

    onKey(ev) {
      if (ended) return;
      const r = session.judge(ev);
      if (r === 'wrong') {
        line.shake();
        anim(car, 'is-stutter');
        return;
      }
      if (r !== 'correct') return;
      pos++;
      line.setPos(pos);
      onProgress(done(), items.length);
      if (pos >= text.length) {
        ended = true;
        session.expect(null);
        return;
      }
      session.expect(text[pos]);
    },

    destroy() {
      scene.remove();
    },
  };
}
