// Level-Vorschau und Mini-Tutorial für neue Tasten.

import { el, showScreen, starsNode, formatNumber, worldLabel, button, icon, worldImage, pixelBackground } from '../ui.js';
import { levelProgress, storyProgress } from '../progress.js';
import { DEFAULT_STARS, HINTS } from '../engine.js';
import { tokenLabel } from '../layout.js';
import { createKeyboard } from '../keyboard.js';
import { createHands } from '../hands.js';

export function renderLevelIntro(app, id) {
  const { world, level } = app.levelById(id);
  const prog = levelProgress(app.state, id);
  const thresholds = level.stars?.accuracy ?? DEFAULT_STARS;
  const hasNew = (level.newKeys ?? []).length > 0;
  const seen = app.state.tutorialsSeen.includes(id);

  const start = () => {
    if (hasNew && !seen) renderTutorial(app, level, () => app.go.play(id));
    else app.go.play(id);
  };

  const isKeyhunt = level.mode === 'keyhunt';
  const isStory = level.mode === 'story';

  const best = prog
    ? el('p', { class: 'intro__best' }, 'Dein Rekord: ', starsNode(prog.stars ?? 0, 3),
      ` ${formatNumber(prog.bestAccuracy ?? 0, 1)} % genau`)
    : null;

  // Grafik: Wo liegen die Finger? (Tastatur mit Fingerfarben + Hände)
  const kbWrap = el('div', { class: 'game__kbwrap' });
  const handL = el('div', { class: 'game__hand' });
  const handR = el('div', { class: 'game__hand' });
  let figure = el('figure', { class: 'intro__fig' },
    el('div', { class: 'game__kb intro__kb' }, handL, el('div', { class: 'kbcase frame frame--dark' }, kbWrap), handR),
    el('figcaption', {},
      el('span', { class: 'legend-swatch', 'aria-hidden': 'true' }),
      'Gleiche Farbe = gleicher Finger.',
      hasNew ? ' Neue Tasten sind umrandet.' : ''));

  // Tastenkunde: keine Tastatur zeigen (das würde die Antworten verraten)
  if (isKeyhunt) {
    figure = el('div', { class: 'intro__keyhunt' },
      el('p', {}, level.content.type === 'combos'
        ? 'Tipp fragt dich nach Tastenkombinationen. Halte Strg gedrückt und drück dazu einen Buchstaben.'
        : 'Tipp zeigt dir Fragekarten zu besonderen Tasten. Drück die passende Taste oder klick sie an, wenn die Karte das sagt.'),
      el('p', { class: 'muted' }, 'Falsche Antworten sind nicht schlimm: Die Karte kommt am Ende noch einmal.'));
  }
  // Boss-Geschichte: Kapitel mit Fortschritt
  if (isStory) {
    const chapters = app.data.story.chapters;
    const sp = storyProgress(app.state, chapters);
    figure = el('div', { class: 'intro__story' },
      el('ol', { class: 'chapters' }, chapters.map((c) => {
        const done = app.state.story.chapters[c.id];
        return el('li', { class: done ? 'is-done' : sp.next === c ? 'is-next' : '' },
          el('span', { class: 'chapters__mark', 'aria-hidden': 'true' }, done ? icon('check') : sp.next === c ? icon('play') : null),
          el('span', { class: 'chapters__title' }, c.title),
          done ? starsNode(done.stars ?? 0) : sp.next === c ? el('span', { class: 'muted' }, 'geht hier weiter') : null);
      })),
      el('p', { class: 'muted' }, 'Dein Fortschritt wird nach jedem Kapitel gespeichert. Du kannst jederzeit eine Pause machen.'));
  }
  // Knackpunkte: die gesammelten Tasten zeigen
  const trickyNote = level.tricky
    ? el('p', { class: 'intro__new' }, 'Deine Knackpunkte: ', level.tricky.map((ch) => el('kbd', {}, ch)))
    : null;

  const rule = (n, pct) => el('span', { class: 'rule' }, starsNode(n, n), ` ${pct} %`);
  const screen = el('section', { class: `screen intro world--${world.theme}`, style: { backgroundImage: `url(${worldImage(world.theme)})` } },
    el('div', { class: 'frame card intro__card' },
      el('p', { class: 'ribbon' }, worldLabel(world)),
      el('h1', {}, level.id === 'knackpunkte' ? level.title : [el('span', { class: 'badge' }, level.id), ' ', level.title]),
      level.intro ? el('p', { class: 'intro__text' }, level.intro) : null,
      trickyNote,
      figure,
      el('div', { class: 'intro__info' },
        el('p', { class: 'intro__rules' },
          isKeyhunt ? 'Sterne für richtige Antworten: ' : 'Sterne fürs genaue Tippen: ',
          rule(1, thresholds[0]), rule(2, thresholds[1]), rule(3, thresholds[2])),
        best),
      el('div', { class: 'row row--center' },
        button("Los geht's!", { variant: 'big green', iconEnd: 'play', onclick: start }),
        hasNew && seen ? button('Neue Tasten noch mal üben', { icon: 'keys', onclick: () => renderTutorial(app, level, () => app.go.intro(id)) }) : null,
        button('Zur Weltkarte', { icon: 'back', onclick: () => app.go.map() }))));
  showScreen(screen);
  pixelBackground(screen, 444, 160);

  if (isKeyhunt || isStory) return;

  // Tastatur und Hände erst zeichnen, wenn der Bildschirm steht
  const { index } = app;
  const keyboard = createKeyboard(kbWrap, index);
  const hands = createHands(handL, handR);
  keyboard.setActive((level.activeKeys ?? []).map((t) => index.resolveToken(t)).filter(Boolean));
  const newCodes = (level.newKeys ?? []).map((t) => index.resolveToken(t)).filter(Boolean);
  keyboard.markNew(newCodes);
  hands.setFinger(newCodes.map((c) => index.keys.get(c)?.finger));
}

/** Mini-Tutorial: jede neue Taste einmal drücken. */
export function renderTutorial(app, level, onDone) {
  const { index, input } = app;
  // Jede physische Taste nur einmal (z. B. "+" und "*" liegen auf derselben Taste)
  const seenCodes = new Set();
  const steps = level.newKeys.map((token) => {
    const code = index.resolveToken(token);
    const finger = index.keys.get(code)?.finger;
    return { token, code, finger, done: false };
  }).filter((s) => s.code && !seenCodes.has(s.code) && seenCodes.add(s.code));
  let current = 0;

  const cards = steps.map((s) =>
    el('li', { class: 'tut__card' },
      el('kbd', { class: 'kbd-big' }, tokenLabel(s.token, index)),
      el('span', {}, index.fingerInfo(s.finger)?.name ?? ''),
      el('span', { class: 'tut__check' }, icon('check'), 'geschafft')));
  const hint = el('p', { class: 'tut__hint', role: 'status' });
  const kbWrap = el('div', { class: 'game__kbwrap' });
  const handL = el('div', { class: 'game__hand' });
  const handR = el('div', { class: 'game__hand' });
  const actions = el('div', { class: 'row' },
    button('Überspringen', { onclick: () => finish(false) }));

  const screen = el('section', { class: 'screen tut' },
    el('div', { class: 'frame card tut__card-main' },
      el('h1', {}, 'Neue Tasten!'),
      el('p', {}, 'Leg deine Finger auf die Grundstellung: links auf A S D F, rechts auf J K L Ö. Spürst du die kleinen Huckel auf F und J?'),
      el('p', { class: 'label-big' }, 'Drück jetzt jede neue Taste einmal.'),
      el('ol', { class: 'tut__cards' }, cards),
      hint,
      actions),
    el('div', { class: 'game__kb' }, handL, el('div', { class: 'kbcase frame frame--dark' }, kbWrap), handR));
  showScreen(screen);

  const keyboard = createKeyboard(kbWrap, index);
  const hands = createHands(handL, handR);
  keyboard.markNew(steps.map((s) => s.code));

  function show() {
    cards.forEach((c, i) => {
      c.classList.toggle('is-current', i === current);
      c.classList.toggle('is-done', steps[i].done);
    });
    const step = steps[current];
    keyboard.setNext(step ? [step.code] : []);
    hands.setFinger(step?.finger ?? null);
  }

  function finish(completed) {
    input.stop();
    if (completed && !app.state.tutorialsSeen.includes(level.id)) {
      app.state.tutorialsSeen.push(level.id);
      app.commit();
    }
    onDone();
  }

  input.listen((ev) => {
    if (ev.type !== 'down') return;
    if (ev.key === 'Escape') { input.stop(); app.go.intro(level.id); return; }
    const step = steps[current];
    if (!step) return;
    keyboard.press(ev.code, ev.code === step.code ? 'ok' : 'bad');
    if (ev.code === step.code) {
      step.done = true;
      current++;
      hint.textContent = level.caseMode === 'lower' && ev.caps ? HINTS.caps : '';
      show();
      if (current >= steps.length) {
        input.stop();
        hint.textContent = 'Super! Du kennst jetzt alle neuen Tasten.';
        const go = button("Jetzt geht's los!", { variant: 'big green', iconEnd: 'play', onclick: () => finish(true) });
        actions.replaceChildren(go);
        go.focus();
      }
    } else {
      const name = tokenLabel(step.token, index);
      const what = name === 'Leertaste' ? 'die Leertaste' : `die Taste ${name}`;
      hint.textContent = `Fast! Gesucht ist ${what}. Du drückst sie mit ${index.fingerInfo(step.finger)?.dat ?? 'dem richtigen Finger'}.`;
    }
  });
  show();
}
