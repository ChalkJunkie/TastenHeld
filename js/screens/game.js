// Spielbildschirm: verbindet Modus, Tastatur, Hände, Hinweise, Pause und Spielschleife.

import { el, showScreen, tippImage, openDialog, worldImage, pixelBackground } from '../ui.js';
import { createKeyboard } from '../keyboard.js';
import { createHands } from '../hands.js';
import { createSession, drawItems, HINTS } from '../engine.js';
import { createRain } from '../modes/rain.js';
import { createMonster } from '../modes/monster.js';
import { createRace } from '../modes/race.js';
import { createKeyhunt, buildCards } from '../modes/keyhunt.js';
import { createStory } from '../modes/story.js';
import { storyProgress } from '../progress.js';

// Verfügbare Spielmodi
const MODES = { rain: createRain, monster: createMonster, race: createRace, keyhunt: createKeyhunt, story: createStory };

/** Inhalte einer Runde: fertige Liste (Knackpunkte), Karten, Geschichte oder Wörter. */
function roundItems(app, level) {
  if (level.items) return level.items;
  const { type } = level.content;
  if (type === 'keycards' || type === 'combos') return buildCards(level.content, app.data.keys);
  if (type === 'story') return app.data.story.chapters;
  return drawItems(level.content, app.data.words);
}

export function renderGame(app, id) {
  const { world, level } = app.levelById(id);
  const { index, input } = app;
  const createMode = MODES[level.mode];
  if (!createMode) {
    // Unbekannter Modus: meist ist im Browser noch eine alte Programmversion gespeichert
    console.error(`Level ${id}: Spielmodus "${level.mode}" ist unbekannt.`);
    openDialog('Kurz neu laden, bitte!',
      el('p', {}, 'Dieses Level braucht die neueste Version von TastenHeld. Drück ',
        el('kbd', {}, 'Strg'), ' + ', el('kbd', {}, 'F5'), ', dann geht es weiter.'),
      { actions: [{ label: 'Jetzt neu laden', primary: true, onClick: () => location.reload() }, { label: 'Zur Weltkarte', onClick: () => app.go.map() }] });
    return;
  }
  const helps = { keyboard: true, hands: true, fingerColors: true, highlightNext: true, ...level.helps };
  const isKeyhunt = level.mode === 'keyhunt';
  const policy = isKeyhunt ? 'keyhunt' : 'game';

  // --- Aufbau -------------------------------------------------------------
  const progressBar = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0, 'aria-label': 'Fortschritt' },
    el('div', { class: 'progress__fill' }));
  const progressText = el('span', { class: 'hud__count' });
  const toggleKb = toggleButton('Tastatur', helps.keyboard, (on) => { helps.keyboard = on; applyHelps(); });
  const toggleHands = toggleButton('Hände', helps.hands, (on) => { helps.hands = on; applyHelps(); });
  const pauseBtn = el('button', { class: 'btn btn--small', type: 'button', onclick: () => pause() }, 'Pause');
  // Spielfeld mit dem Bild der Welt (leicht aufgehellt, damit Text gut lesbar bleibt)
  const field = el('div', {
    class: 'game__field has-scene',
    style: { backgroundImage: `linear-gradient(rgba(251, 243, 223, 0.3), rgba(251, 243, 223, 0.3)), url(${worldImage(world.theme)})` },
  });
  const hintIcon = el('span', { class: 'hint__icon', 'aria-hidden': 'true' });
  const hintText = el('span', {});
  const hintBar = el('div', { class: 'hint', role: 'status', 'aria-live': 'polite' }, hintIcon, hintText);
  const kbWrap = el('div', { class: 'game__kbwrap' });
  const handL = el('div', { class: 'game__hand' });
  const handR = el('div', { class: 'game__hand' });

  const screen = el('section', { class: `screen game world--${world.theme}` },
    el('header', { class: 'hud' },
      el('h1', { class: 'hud__title', title: `Level ${level.id}: ${level.title}` }, `Level ${level.id}: ${level.title}`),
      el('div', { class: 'hud__progress' }, progressBar, progressText),
      el('div', { class: 'hud__buttons' }, toggleKb, toggleHands, pauseBtn)),
    field,
    hintBar,
    el('div', { class: 'game__kb' }, handL, kbWrap, handR));
  showScreen(screen, { focus: false });
  pixelBackground(field, 280, 80);

  // Tastenkunde: ganze Tastatur (mit F-Tasten und Pfeilblock), Tasten anklickbar
  const keyboard = createKeyboard(kbWrap, index, isKeyhunt
    ? { sections: ['fn', 'main', 'nav'], onKeyClick: (code) => phase === 'running' && mode.onClick?.(code) }
    : {});
  const hands = createHands(handL, handR);
  if (level.activeKeys) keyboard.setActive(level.activeKeys.map((t) => index.resolveToken(t)).filter(Boolean));
  if (isKeyhunt) screen.classList.add('game--keyhunt');

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
    const icons = { error: '☝', caps: '⇪', shift: '⇧', capsOff: '⇪', capsMixed: '⇪', shiftSide: '⇧', info: '💡' };
    hintIcon.textContent = icons[kind] ?? 'i';
    hintText.textContent = text;
    hintBar.className = `hint is-visible hint--${kind}`;
    // Feststell-Hinweis bleibt, bis sie aus ist
    if (kind !== 'caps') hintTimer = setTimeout(() => hintBar.classList.remove('is-visible'), 4500);
  }

  // --- Runde --------------------------------------------------------------
  const session = createSession({ level, index, keyboard, hands, onHint: showHint });
  const items = roundItems(app, level);
  const startIndex = level.mode === 'story' ? Math.max(0, items.indexOf(storyProgress(app.state, items).next)) : 0;
  const mode = createMode({
    field, items, session, level, keyboard, startIndex,
    onChapter: (chapterId, stars, accuracy) => app.recordChapter(chapterId, stars, accuracy),
    onProgress(done, total) {
      const pct = total ? Math.round((done / total) * 100) : 0;
      progressBar.setAttribute('aria-valuenow', pct);
      progressBar.setAttribute('aria-valuetext', `${done} von ${total} geschafft`);
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
      el('p', { class: 'label-big' }, isKeyhunt
        ? 'Jede Karte stellt dir eine Frage zu einer Taste.'
        : level.mode === 'story' ? `Kapitel ${startIndex + 1}: ${items[startIndex].title}` : 'Leg deine Finger auf die Grundstellung.'),
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
    input.listen(onKey, policy);
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
    // In der Tastenkunde ist Esc eine Antwort, dort pausiert nur der Pause-Knopf
    if (ev.type === 'down' && ev.key === 'Escape' && !(isKeyhunt && phase === 'running')) {
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

  input.listen(onKey, policy);
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
