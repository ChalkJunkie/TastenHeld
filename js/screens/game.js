// Spielbildschirm: verbindet Modus, Tastatur, Hände, Hinweise, Pause und Spielschleife.

import { el, showScreen, tippImage } from '../ui.js';
import { createKeyboard } from '../keyboard.js';
import { createHands } from '../hands.js';
import { createSession, drawItems, HINTS } from '../engine.js';
import { createRain } from '../modes/rain.js';
import { createMonster } from '../modes/monster.js';
import { createRace } from '../modes/race.js';

// Verfügbare Modi (keyhunt und story folgen in Meilenstein 3)
const MODES = { rain: createRain, monster: createMonster, race: createRace };

export function renderGame(app, id) {
  const { world, level } = app.levelById(id);
  const { index, input } = app;
  const createMode = MODES[level.mode];
  if (!createMode) {
    app.go.map();
    return;
  }
  const helps = { keyboard: true, hands: true, fingerColors: true, highlightNext: true, ...level.helps };

  // --- Aufbau -------------------------------------------------------------
  const progressBar = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0, 'aria-label': 'Fortschritt' },
    el('div', { class: 'progress__fill' }));
  const progressText = el('span', { class: 'hud__count' });
  const toggleKb = toggleButton('Tastatur', helps.keyboard, (on) => { helps.keyboard = on; applyHelps(); });
  const toggleHands = toggleButton('Hände', helps.hands, (on) => { helps.hands = on; applyHelps(); });
  const pauseBtn = el('button', { class: 'btn btn--small', type: 'button', onclick: () => pause() }, 'Pause');
  const field = el('div', { class: 'game__field' });
  const hintIcon = el('span', { class: 'hint__icon', 'aria-hidden': 'true' });
  const hintText = el('span', {});
  const hintBar = el('div', { class: 'hint', role: 'status', 'aria-live': 'polite' }, hintIcon, hintText);
  const kbWrap = el('div', { class: 'game__kbwrap' });
  const handL = el('div', { class: 'game__hand' });
  const handR = el('div', { class: 'game__hand' });

  const screen = el('section', { class: `screen game world--${world.theme}` },
    el('header', { class: 'hud' },
      el('h1', { class: 'hud__title' }, `Level ${level.id}: ${level.title}`),
      el('div', { class: 'hud__progress' }, progressBar, progressText),
      el('div', { class: 'hud__buttons' }, toggleKb, toggleHands, pauseBtn)),
    field,
    hintBar,
    el('div', { class: 'game__kb' }, handL, kbWrap, handR));
  showScreen(screen, { focus: false });

  const keyboard = createKeyboard(kbWrap, index);
  const hands = createHands(handL, handR);
  keyboard.setActive((level.activeKeys ?? []).map((t) => index.resolveToken(t)).filter(Boolean));

  function applyHelps() {
    kbWrap.style.visibility = helps.keyboard ? 'visible' : 'hidden';
    hands.setVisible(helps.hands);
    keyboard.setHelps(helps);
  }
  applyHelps();

  // --- Hinweise -----------------------------------------------------------
  let hintTimer = null;
  function showHint(text, kind) {
    clearTimeout(hintTimer);
    if (!text) {
      hintBar.classList.remove('is-visible');
      return;
    }
    const icons = { error: '☝', caps: '⇪', shift: '⇧', capsOff: '⇪', info: '💡' };
    hintIcon.textContent = icons[kind] ?? 'i';
    hintText.textContent = text;
    hintBar.className = `hint is-visible hint--${kind}`;
    // Feststell-Hinweis bleibt, bis sie aus ist
    if (kind !== 'caps') hintTimer = setTimeout(() => hintBar.classList.remove('is-visible'), 4500);
  }

  // --- Runde --------------------------------------------------------------
  const session = createSession({ level, index, keyboard, hands, onHint: showHint });
  const items = drawItems(level.content, app.data.words);
  const mode = createMode({
    field, items, session, level,
    onProgress(done, total) {
      const pct = total ? Math.round((done / total) * 100) : 0;
      progressBar.setAttribute('aria-valuenow', pct);
      progressBar.firstChild.style.width = `${pct}%`;
      progressText.textContent = `${done} von ${total}`;
    },
    onEnd(extra) {
      phase = 'done';
      const result = session.result(extra);
      cleanup();
      setTimeout(() => app.finishLevel(level, result), 700);
    },
  });

  let phase = 'ready'; // ready | running | paused | done
  let raf = 0;
  let last = 0;

  const overlay = el('div', { class: 'overlay' });
  field.append(overlay);

  function showReady() {
    overlay.replaceChildren(el('div', { class: 'overlay__box' },
      tippImage('tipp--small tipp--wave'),
      el('p', { class: 'label-big' }, 'Leg deine Finger auf die Grundstellung.'),
      el('p', {}, 'Drück die ', el('kbd', {}, 'Leertaste'), ', um zu starten.')));
    overlay.hidden = false;
  }

  function begin() {
    overlay.hidden = true;
    phase = 'running';
    mode.start();
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (phase === 'running') mode.tick(dt);
    if (phase !== 'done') raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (phase !== 'running') return;
    phase = 'paused';
    input.listen(onPausedKey, 'none'); // normale Bedienung der Knöpfe
    const resumeBtn = el('button', { class: 'btn btn--big btn--primary', type: 'button', onclick: resume }, 'Weiterspielen');
    overlay.replaceChildren(el('div', { class: 'overlay__box' },
      el('h2', {}, 'Pause'),
      el('p', {}, 'Ruh dich kurz aus. Weiter geht es, wann du willst.'),
      el('div', { class: 'row' },
        resumeBtn,
        el('button', { class: 'btn', type: 'button', onclick: quit }, 'Level verlassen'))));
    overlay.hidden = false;
    resumeBtn.focus();
  }

  function resume() {
    if (phase !== 'paused') return;
    overlay.hidden = true;
    phase = 'running';
    input.listen(onKey, 'game');
    last = performance.now();
  }

  function quit() {
    phase = 'done';
    cleanup();
    app.go.map();
  }

  function onPausedKey(ev) {
    if (ev.type === 'down' && ev.key === 'Escape') resume();
  }

  function onKey(ev) {
    if (ev.type === 'down' && ev.key === 'Escape') {
      pause();
      return;
    }
    if (phase === 'ready') {
      if (level.caseMode === 'lower' && ev.caps) showHint(HINTS.caps, 'caps');
      else if (ev.type === 'down' && ev.code === 'Space') begin();
      return;
    }
    if (phase !== 'running') return;
    if (ev.dead) {
      showHint('Diese Taste brauchst du hier nicht.', 'info');
      return;
    }
    mode.onKey(ev);
  }

  const onBlur = () => pause();
  window.addEventListener('blur', onBlur);

  function cleanup() {
    cancelAnimationFrame(raf);
    clearTimeout(hintTimer);
    input.stop();
    window.removeEventListener('blur', onBlur);
  }

  // Wenn der Bildschirm verlassen wird, alles aufräumen
  app.onLeave(() => {
    if (phase !== 'done') {
      phase = 'done';
      cleanup();
    }
    mode.destroy?.();
  });

  input.listen(onKey, 'game');
  showReady();
}

function toggleButton(label, on, onChange) {
  const btn = el('button', { class: 'btn btn--small btn--toggle', type: 'button', 'aria-pressed': String(on) }, label);
  btn.addEventListener('click', () => {
    const now = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(now));
    btn.blur(); // Fokus weg, damit die Leertaste nicht den Knopf drückt
    onChange(now);
  });
  return btn;
}
