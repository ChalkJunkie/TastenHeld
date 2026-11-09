// Spielmodus "race": Tipps Dampfauto fährt nur, wenn richtig getippt wird.
// Alle Wörter/Sätze bilden einen fortlaufenden Text (mit Leerzeichen dazwischen),
// der wie eine Laufschrift mitläuft. Bei einem Fehler stottert das Auto kurz,
// rollt aber nie zurück.

import { el } from '../ui.js';
import { createTextLine } from './textline.js';

// Dampfauto mit Tipp am Steuer: Pixelbild mit zwei Bildern nebeneinander
// (assets/pixel/auto.png). Beim Fahren wechseln sie sich ab, so drehen sich die Räder.

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

  const car = el('div', { class: 'race__car' }, el('div', { class: 'race__carsprite pixel', 'aria-hidden': 'true' }));
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
