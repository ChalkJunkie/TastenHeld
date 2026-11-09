// Spielmodus "monster": Ein Wuschelmonster stapft auf Tipp zu.
// Jedes fertig getippte Wort ist ein Zauberstern, der das Monster zurückschubst.
// Fehler machen das Monster kurz schneller. Erreicht es Tipp, ist das KEIN Game Over:
// Es erschrickt selbst und hüpft zurück. Am Ende wird das Monster zum Freund.

import { el } from '../ui.js';
import { createTextLine } from './textline.js';

const DEFAULTS = {
  monsterSpeed: 0.02, // Anteil der Strecke pro Sekunde
  push: 0.2, // so weit schubst ein fertiges Wort zurück
  errorBoost: 0.25, // so viel schneller wird es pro Fehler
  maxBoost: 1.8, // höchstens so viel schneller
};
const START = 1; // 1 = ganz weit weg, 0 = bei Tipp

export function createMonster({ field, items, session, level, onProgress, onEnd }) {
  const p = { ...DEFAULTS, ...level.params };
  let idx = 0;
  let pos = 0;
  let text = '';
  let line = null;
  let dist = START;
  let boost = 1;
  let reached = 0;
  let ended = false;

  const tipp = el('img', { class: 'monster__tipp pixel', src: 'assets/pixel/tipp.png', alt: '' });
  const monster = el('img', { class: 'monster__monster pixel', src: 'assets/pixel/monster.png', alt: 'Ein Wuschelmonster' });
  const lineBox = el('div', { class: 'monster__line' });
  const next = el('p', { class: 'monster__next' });
  const panel = el('div', { class: 'scroll-panel' }, lineBox, next);
  const scene = el('div', { class: 'scene monster' },
    el('div', { class: 'scene__ground', 'aria-hidden': 'true' }),
    panel, tipp, monster);
  field.append(scene);

  function render() {
    monster.style.left = `${22 + dist * 62}%`;
  }

  function showItem() {
    line?.destroy();
    text = items[idx];
    pos = 0;
    line = createTextLine(lineBox, text, { cls: 'textline--big' });
    next.textContent = items[idx + 1] ? `Danach: ${items[idx + 1]}` : 'Das ist der letzte Zauber!';
    session.expect(text[0]);
  }

  function anim(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  /** Zauberstern fliegt von Tipp zum Monster. */
  function spell(strength) {
    const star = el('span', { class: 'spell', 'aria-hidden': 'true' }, '★');
    const from = tipp.offsetLeft + tipp.offsetWidth * 0.7;
    const to = monster.offsetLeft + monster.offsetWidth * 0.3;
    star.style.left = `${from}px`;
    star.style.setProperty('--dx', `${to - from}px`);
    if (strength < 1) star.classList.add('spell--small');
    scene.append(star);
    setTimeout(() => star.remove(), 700);
    setTimeout(() => {
      dist = Math.min(START, dist + p.push * strength);
      anim(monster, 'is-hit');
      render();
    }, 350);
  }

  function finish() {
    ended = true;
    session.expect(null);
    line?.destroy();
    next.textContent = '';
    lineBox.replaceChildren(el('p', { class: 'monster__win' }, 'Geschafft! Das Monster ist jetzt dein Freund.'));
    setTimeout(() => {
      monster.src = 'assets/pixel/monster-freund.png';
      monster.alt = 'Das Monster lächelt und ist jetzt freundlich';
      anim(monster, 'is-friend');
      anim(tipp, 'is-happy');
    }, 400);
    setTimeout(() => onEnd({ reached }), 2200);
  }

  return {
    start() {
      onProgress(0, items.length);
      render();
      showItem();
    },

    tick(dt) {
      if (ended) return;
      boost = 1 + (boost - 1) * Math.exp(-dt / 5); // beruhigt sich langsam wieder
      dist -= p.monsterSpeed * boost * dt;
      if (dist <= 0) {
        reached++;
        dist = START;
        boost = 1;
        anim(monster, 'is-bounce');
        anim(tipp, 'is-oops');
        session.hint('Huch! Das Monster hat sich selbst erschreckt und ist zurückgehüpft. Ganz ruhig weitertippen!', 'info');
      }
      render();
    },

    onKey(ev) {
      if (ended) return;
      const r = session.judge(ev);
      if (r === 'wrong') {
        boost = Math.min(p.maxBoost, boost + p.errorBoost);
        line.shake();
        anim(monster, 'is-grow');
        return;
      }
      if (r !== 'correct') return;
      pos++;
      line.setPos(pos);
      if (pos >= text.length) {
        spell(1);
        anim(tipp, 'is-happy');
        idx++;
        onProgress(idx, items.length);
        if (idx >= items.length) finish();
        else showItem();
        return;
      }
      if (text[pos - 1] === ' ') spell(0.5); // Wort in einem Satz fertig: kleiner Zauber
      session.expect(text[pos]);
    },

    destroy() {
      scene.remove();
    },
  };
}
