// Spielmodus "race": Tipps Dampfauto fährt nur, wenn richtig getippt wird.
// Alle Wörter/Sätze bilden einen fortlaufenden Text (mit Leerzeichen dazwischen),
// der wie eine Laufschrift mitläuft. Bei einem Fehler stottert das Auto kurz,
// rollt aber nie zurück.

import { el } from '../ui.js';
import { createTextLine } from './textline.js';

// Dampfauto mit Tipp am Steuer (selbst gezeichnet). Die Räder drehen sich per CSS.
const CAR_SVG = `
<svg viewBox="0 0 170 100" aria-hidden="true">
  <circle class="car__steam" cx="34" cy="14" r="8" fill="#fff" opacity=".85"/>
  <circle class="car__steam" cx="22" cy="6" r="6" fill="#fff" opacity=".6"/>
  <rect x="30" y="22" width="14" height="30" rx="3" fill="#6b4a2a" stroke="#4a2a12" stroke-width="3"/>
  <rect x="26" y="20" width="22" height="7" rx="2" fill="#c9932f" stroke="#4a2a12" stroke-width="2.5"/>
  <line x1="106" y1="22" x2="106" y2="10" stroke="#4a2a12" stroke-width="3" stroke-linecap="round"/>
  <circle cx="106" cy="8" r="5" fill="#ffcf6b" stroke="#4a2a12" stroke-width="2.5"/>
  <rect x="86" y="22" width="40" height="30" rx="9" fill="#c4783f" stroke="#4a2a12" stroke-width="3"/>
  <rect x="92" y="30" width="28" height="16" rx="5" fill="#2a2338"/>
  <circle cx="100" cy="38" r="3" fill="#7ff3c4"/><circle cx="112" cy="38" r="3" fill="#7ff3c4"/>
  <rect x="86" y="22" width="40" height="7" rx="3" fill="#6b4a2a"/>
  <circle cx="98" cy="25" r="5" fill="#9fe3e0" stroke="#c9932f" stroke-width="2.5"/>
  <circle cx="114" cy="25" r="5" fill="#9fe3e0" stroke="#c9932f" stroke-width="2.5"/>
  <path d="M10 56 Q10 48 20 48 L150 48 Q162 48 162 58 L162 70 Q162 78 154 78 L16 78 Q8 78 8 70 Z" fill="#d9a441" stroke="#4a2a12" stroke-width="4"/>
  <rect x="18" y="54" width="132" height="8" rx="4" fill="#b8642a" opacity=".7"/>
  <g fill="#f0c27a" stroke="#4a2a12" stroke-width="1.5"><circle cx="24" cy="70" r="3"/><circle cx="84" cy="70" r="3"/><circle cx="146" cy="70" r="3"/></g>
  <circle cx="156" cy="60" r="6" fill="#ffe28a" stroke="#4a2a12" stroke-width="2"/>
  <g class="car__wheel" style="transform-origin:46px 80px"><circle cx="46" cy="80" r="16" fill="#4a2a12"/><circle cx="46" cy="80" r="11" fill="#c9932f"/><rect x="44" y="66" width="4" height="28" fill="#4a2a12"/><rect x="32" y="78" width="28" height="4" fill="#4a2a12"/><circle cx="46" cy="80" r="4" fill="#fbf3df"/></g>
  <g class="car__wheel" style="transform-origin:128px 80px"><circle cx="128" cy="80" r="16" fill="#4a2a12"/><circle cx="128" cy="80" r="11" fill="#c9932f"/><rect x="126" y="66" width="4" height="28" fill="#4a2a12"/><rect x="114" y="78" width="28" height="4" fill="#4a2a12"/><circle cx="128" cy="80" r="4" fill="#fbf3df"/></g>
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
