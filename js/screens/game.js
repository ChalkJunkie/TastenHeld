// Spielbildschirm: verbindet Modus, Tastatur, Hände, Hinweise, Pause und Spielschleife.

import { el, showScreen, tippImage, openDialog, worldImage, pixelBackground, button, icon } from '../ui.js';
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
  const toggleKb = toggleButton('Tastatur', 'keys', helps.keyboard, (on) => { helps.keyboard = on; applyHelps(); });
  const toggleHands = toggleButton('Hände', 'hand', helps.hands, (on) => { helps.hands = on; applyHelps(); });
  const pauseBtn = button('Pause', { variant: 'sm primary', icon: 'pause', onclick: () => pause() });
  // Spielfeld mit dem Bild der Welt (leicht aufgehellt, damit Text gut lesbar bleibt)
  const field = el('div', {
    class: 'game__field has-scene',
    style: { backgroundImage: `url(${worldImage(world.theme)})` },
  });
  // Hinweise spricht Tipp in einer Sprechblase (liegt im Spielfeld)
  const hintIcon = icon('bulb', 'hint__icon');
  const hintText = el('span', {});
  const hintBar = el('div', { class: 'hint', role: 'status', 'aria-live': 'polite' },
    el('span', { class: 'hint__tipp', 'aria-hidden': 'true' }, tippImage()),
    el('span', { class: 'hint__bubble' }, hintIcon, hintText));
  const kbWrap = el('div', { class: 'game__kbwrap' });
  const handL = el('div', { class: 'game__hand' });
  const handR = el('div', { class: 'game__hand' });

  const isLevel = level.id !== 'knackpunkte';
  const screen = el('section', { class: `screen game game--${level.mode} world--${world.theme}` },
    el('header', { class: 'bar hud' },
      el('h1', { class: 'hud__title', title: isLevel ? `Level ${level.id}: ${level.title}` : level.title },
        isLevel ? [el('span', { class: 'visually-hidden' }, 'Level '), el('span', { class: 'badge' }, level.id), ' '] : null,
        el('span', { class: 'hud__name' }, level.title)),
      el('div', { class: 'hud__progress' }, progressBar, progressText),
      el('div', { class: 'hud__buttons' }, toggleKb, toggleHands, pauseBtn)),
    el('div', { class: 'game__stage' }, field, el('div', { class: 'stage__frame', 'aria-hidden': 'true' })),
    el('div', { class: 'game__kb' }, handL, el('div', { class: 'kbcase frame frame--dark' }, kbWrap), handR));
  showScreen(screen, { focus: false });
  pixelBackground(field, 444, 160);

  // Tastenkunde: ganze Tastatur (mit F-Tasten und Pfeilblock), Tasten anklickbar
  const keyboard = createKeyboard(kbWrap, index, isKeyhunt
    ? { sections: ['fn', 'main', 'nav'], onKeyClick: (code) => phase === 'running' && mode.onClick?.(code) }
    : {});
  const hands = createHands(handL, handR);
  if (level.activeKeys) keyboard.setActive(level.activeKeys.map((t) => index.resolveToken(t)).filter(Boolean));
  if (isKeyhunt) screen.classList.add('game--keyhunt');

  function applyHelps() {
    kbWrap.parentNode.style.visibility = helps.keyboard ? 'visible' : 'hidden';
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
    const icons = { error: 'hand', caps: 'keys', shift: 'keys', capsOff: 'keys', capsMixed: 'keys', shiftSide: 'keys', info: 'bulb' };
    hintIcon.src = `assets/pixel/ui/i-${icons[kind] ?? 'bulb'}.png`;
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
  field.append(overlay, hintBar);

  function showReady() {
    overlay.replaceChildren(el('div', { class: 'overlay__box frame' },
      tippImage('tipp--small tipp--wave'),
      el('p', { class: 'label-big' }, isKeyhunt
        ? 'Jede Karte stellt dir eine Frage zu einer Taste.'
        : level.mode === 'story' ? `Kapitel ${startIndex + 1}: ${items[startIndex].title}` : 'Leg deine Finger auf die Grundstellung.'),
      el('p', {}, 'Drück die ', el('kbd', {}, 'Leertaste'), ', um zu starten.')));
    overlay.hidden = false;
  }

  function begin() {
    overlay.hidden = true;
    // Hinweis aus der Startphase nicht stehen lassen (die Runde kennt ihn nicht und könnte ihn nie ausblenden)
    if (hintBar.classList.contains('hint--caps')) showHint(null);
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
    const resumeBtn = button('Weiterspielen', { variant: 'big green', icon: 'play', onclick: resume });
    overlay.replaceChildren(el('div', { class: 'overlay__box frame' },
      el('h2', {}, 'Pause'),
      el('p', {}, 'Ruh dich kurz aus. Weiter geht es, wann du willst.'),
      el('div', { class: 'row row--center' },
        resumeBtn,
        button('Level verlassen', { icon: 'exit', onclick: quit }))));
    overlay.hidden = false;
    resumeBtn.focus();
  }

  function resume() {
    if (phase !== 'paused') return;
    overlay.hidden = true;
    // Hinweis aus der Startphase nicht stehen lassen (die Runde kennt ihn nicht und könnte ihn nie ausblenden)
    if (hintBar.classList.contains('hint--caps')) showHint(null);
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
      // Die Leertaste startet immer, auch wenn die Feststelltaste an ist.
      // Den Feststell-Hinweis zeigt dann die Runde beim ersten Buchstaben.
      if (ev.type === 'down' && ev.code === 'Space') begin();
      else if (level.caseMode === 'lower' && ev.caps) showHint(HINTS.caps, 'caps');
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

/** Umschalter für Hilfen: Symbol + Text, Zustand zusätzlich als Häkchen bzw. durchgestrichen. */
function toggleButton(label, ic, on, onChange) {
  const btn = button(label, { variant: 'sm dark toggle', icon: ic, 'aria-pressed': String(on) });
  btn.addEventListener('click', () => {
    const now = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(now));
    btn.blur(); // Fokus weg, damit die Leertaste nicht den Knopf drückt
    onChange(now);
  });
  return btn;
}
