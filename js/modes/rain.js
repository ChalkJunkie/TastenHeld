// Spielmodus "rain": Buchstaben und Wörter fallen als Tropfen vom Himmel.
// Der unterste Tropfen ist immer das Ziel. Tippt man ihn ganz, zerplatzt er.
// Landet ein Tropfen, ist das KEIN Fehler: Er kommt später noch einmal,
// und der Regen wird langsamer. So geht Genauigkeit vor Tempo.

import { el } from '../ui.js';

const DEFAULTS = {
  fallSpeed: 0.05, // Anteil der Spielfeldhöhe pro Sekunde
  maxOnScreen: 1,
  spawnGap: 1.2, // Sekunden zwischen zwei Tropfen
  confirmSpace: false, // Wort mit Leertaste bestätigen
};
const LANES = 5;
const MAX_RETRIES = 1; // so oft kommt ein verpasster Tropfen zurück

export function createRain({ field, items, session, level, onProgress, onEnd }) {
  const p = { ...DEFAULTS, ...level.params };
  const queue = items.map((text) => ({ text, retries: 0 }));
  const total = items.length;
  const drops = [];
  let target = null;
  let resolved = 0; // geschafft oder endgültig verpasst
  let cleared = 0;
  let missed = 0;
  let speedFactor = 1;
  let streak = 0;
  let spawnTimer = 0;
  let ended = false;
  let height = field.clientHeight;

  const sky = el('div', { class: 'rain' });
  const ground = el('div', { class: 'rain__ground', 'aria-hidden': 'true' });
  const tipp = el('img', { class: 'rain__tipp', src: 'assets/svg/tipp.svg', alt: '' });
  ground.append(tipp);
  sky.append(ground);
  field.append(sky);

  const resizeObserver = new ResizeObserver(() => (height = sky.clientHeight));
  resizeObserver.observe(sky);

  /** Zeichenfolge, die für einen Tropfen getippt werden muss. */
  const fullText = (drop) => drop.text + (p.confirmSpace ? ' ' : '');

  function freeLane() {
    const used = new Set(drops.map((d) => d.lane));
    const free = [...Array(LANES).keys()].filter((l) => !used.has(l));
    return free[Math.floor(Math.random() * free.length)] ?? 0;
  }

  function spawn() {
    const item = queue.shift();
    if (!item) return;
    const lane = freeLane();
    const drop = { ...item, lane, y: 0, typed: 0, node: el('div', { class: 'drop' }) };
    drop.node.style.left = `${8 + lane * (80 / (LANES - 1))}%`;
    renderDrop(drop);
    sky.append(drop.node);
    drops.push(drop);
    spawnTimer = 0;
  }

  function renderDrop(drop) {
    const text = fullText(drop);
    const letters = [...text].map((ch, i) => {
      const cls = ['drop__ch'];
      if (i < drop.typed) cls.push('is-done');
      if (drop === target && i === drop.typed) cls.push('is-current');
      if (ch === ' ') cls.push('drop__ch--space');
      return el('span', { class: cls.join(' ') }, ch === ' ' ? '␣' : ch);
    });
    drop.node.replaceChildren(...letters);
    drop.node.classList.toggle('drop--target', drop === target);
    drop.node.setAttribute('aria-label', drop.text);
  }

  /** Ziel = der Tropfen, der dem Boden am nächsten ist. */
  function pickTarget() {
    if (target && drops.includes(target)) return;
    target = drops.reduce((best, d) => (!best || d.y > best.y ? d : best), null);
    if (target) renderDrop(target);
    updateExpected();
  }

  function updateExpected() {
    session.expect(target ? fullText(target)[target.typed] : null);
  }

  function removeDrop(drop, cls) {
    drops.splice(drops.indexOf(drop), 1);
    drop.node.classList.remove('drop--target');
    drop.node.querySelector('.is-current')?.classList.remove('is-current');
    drop.node.classList.add(cls);
    setTimeout(() => drop.node.remove(), 600);
    if (drop === target) target = null;
  }

  function cheer(cls) {
    tipp.classList.remove('is-happy', 'is-oops');
    void tipp.offsetWidth;
    tipp.classList.add(cls);
  }

  function land(drop) {
    if (drop === target) session.tracker.abandon();
    removeDrop(drop, 'drop--splash');
    missed++;
    streak = 0;
    speedFactor = Math.max(0.5, speedFactor * 0.85);
    if (drop.retries < MAX_RETRIES) {
      queue.push({ text: drop.text, retries: drop.retries + 1 });
      session.hint('Macht nichts! Der Tropfen kommt gleich noch einmal, diesmal langsamer.', 'info');
    } else {
      resolved++;
      session.hint('Macht nichts! Der Regen wird jetzt etwas langsamer.', 'info');
    }
    cheer('is-oops');
    onProgress(resolved, total);
    pickTarget();
  }

  function clear(drop) {
    removeDrop(drop, 'drop--pop');
    cleared++;
    resolved++;
    streak++;
    if (streak >= 3) speedFactor = Math.min(1, speedFactor * 1.05);
    cheer('is-happy');
    onProgress(resolved, total);
    // Nicht warten, wenn der Himmel leer ist
    if (!drops.length) spawnTimer = p.spawnGap;
    pickTarget();
  }

  function checkEnd() {
    if (!ended && !queue.length && !drops.length) {
      ended = true;
      session.expect(null);
      onEnd({ missed, cleared });
    }
  }

  return {
    start() {
      onProgress(0, total);
      spawn();
      pickTarget();
    },

    tick(dt) {
      if (ended) return;
      spawnTimer += dt;
      const canSpawn = drops.length < p.maxOnScreen && queue.length;
      if (canSpawn && (spawnTimer >= p.spawnGap || !drops.length)) {
        spawn();
        pickTarget();
      }
      const travel = height - 70; // bis zum Boden
      for (const drop of [...drops]) {
        drop.y += p.fallSpeed * speedFactor * dt;
        drop.node.style.transform = `translate(-50%, ${Math.round(drop.y * travel)}px)`;
        if (drop.y >= 1) land(drop);
      }
      checkEnd();
    },

    onKey(ev) {
      if (ended || !target) return;
      const r = session.judge(ev);
      if (r !== 'correct') {
        if (r === 'wrong') {
          const node = target.node;
          node.classList.add('drop--shake');
          setTimeout(() => node.classList.remove('drop--shake'), 300);
        }
        return;
      }
      target.typed++;
      if (target.typed >= fullText(target).length) clear(target);
      else {
        renderDrop(target);
        updateExpected();
      }
      checkEnd();
    },

    destroy() {
      resizeObserver.disconnect();
      sky.remove();
    },
  };
}
