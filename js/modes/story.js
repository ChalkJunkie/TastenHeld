// Spielmodus "story": die Boss-Geschichte "Tipp und die verschwundene Taste".
// Jedes Kapitel wird als Laufschrift getippt. Danach gibt es Sterne für das Kapitel und
// eine passende Szene, dann "Weiter zu Kapitel X". Jedes fertige Kapitel wird sofort
// gespeichert, man kann also jederzeit aufhören und später weitermachen.

import { el, starsNode, formatNumber } from '../ui.js';
import { createTextLine } from './textline.js';
import { starsFor, DEFAULT_STARS } from '../engine.js';

/** Bild zu einem Kapitel. story.json nennt z. B. "wald.svg", das Pixelbild heißt "wald.png". */
export function storyImage(file) {
  const name = String(file).replace(/\.(svg|png)$/i, '');
  return `assets/pixel/story/${encodeURIComponent(name)}.png`;
}

export function createStory({ field, items, session, level, onProgress, onEnd, onChapter, startIndex = 0 }) {
  const chapters = items;
  const tracker = session.tracker;
  const thresholds = level.stars?.accuracy ?? DEFAULT_STARS;
  let idx = startIndex;
  let pos = 0;
  let text = '';
  let line = null;
  let phase = 'typing'; // typing | between | done
  let snap = null; // Zählerstand zu Beginn des Kapitels
  const played = [];

  const title = el('p', { class: 'story__title' });
  const lineBox = el('div', {});
  const panel = el('div', { class: 'scroll-panel story__panel' }, title, lineBox);
  const between = el('div', { class: 'overlay story__between', hidden: true });
  const scene = el('div', { class: 'scene story' }, panel, between);
  field.append(scene);

  function setScene(chapter) {
    field._pixelSize?.(200, 100); // Kapitelbilder sind 200 x 100 Pixel
    field.style.backgroundImage = `linear-gradient(rgba(251, 243, 223, 0.35), rgba(251, 243, 223, 0.35)), url(${storyImage(chapter.svg)})`;
  }

  function startChapter() {
    const chapter = chapters[idx];
    phase = 'typing';
    between.hidden = true;
    setScene(chapter);
    title.textContent = `Kapitel ${idx + 1} von ${chapters.length}: ${chapter.title}`;
    line?.destroy();
    text = chapter.text;
    pos = 0;
    line = createTextLine(lineBox, text, { ticker: true, cls: 'textline--big' });
    snap = { firstTry: tracker.firstTry, errors: tracker.errors };
    session.expect(text[0]);
  }

  function finishChapter() {
    const chapter = chapters[idx];
    const firstTry = tracker.firstTry - snap.firstTry;
    const errors = tracker.errors - snap.errors;
    const accuracy = firstTry + errors ? (firstTry / (firstTry + errors)) * 100 : 100;
    const stars = starsFor(accuracy, thresholds);
    played.push({ id: chapter.id, stars, accuracy });
    onChapter?.(chapter.id, stars, accuracy);
    session.expect(null);
    phase = 'between';
    idx++;
    onProgress(idx, chapters.length);

    const last = idx >= chapters.length;
    const go = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => (last ? end() : startChapter()) },
      last ? 'Zum Ergebnis' : `Weiter zu Kapitel ${idx + 1}`);
    between.replaceChildren(el('div', { class: 'overlay__box story__box' },
      el('img', { class: 'story__img', src: storyImage(chapter.svg), alt: `Bild zum Kapitel ${chapter.title}` }),
      el('h2', {}, last ? 'Das Abenteuer ist geschafft!' : `Kapitel ${idx} geschafft!`),
      starsNode(stars, 3, 'stars--mid stars--animate'),
      el('p', {}, `${formatNumber(accuracy, 1)} % genau`),
      el('div', { class: 'row row--center' },
        go,
        last ? null : el('button', { class: 'btn', type: 'button', onclick: end }, 'Pause machen')),
      el('p', { class: 'muted' }, last ? '' : 'Drück Enter, um weiterzulesen. Dein Fortschritt ist gespeichert.')));
    between.hidden = false;
  }

  function end() {
    if (phase === 'done') return;
    phase = 'done';
    session.expect(null);
    onEnd({ story: played });
  }

  return {
    start() {
      onProgress(idx, chapters.length);
      startChapter();
    },

    tick() {},

    onKey(ev) {
      if (phase === 'between') {
        if (ev.type === 'down' && ev.key === 'Enter') {
          if (idx >= chapters.length) end();
          else startChapter();
        }
        return;
      }
      if (phase !== 'typing') return;
      const r = session.judge(ev);
      if (r === 'wrong') {
        line.shake();
        return;
      }
      if (r !== 'correct') return;
      pos++;
      line.setPos(pos);
      if (pos >= text.length) finishChapter();
      else session.expect(text[pos]);
    },

    destroy() {
      scene.remove();
    },
  };
}
