// Ergebnis einer Runde: Sterne, Genauigkeit, Tempo, Bestleistungen, Speicher-Erinnerung.

import { el, showScreen, starsNode, tippImage, formatNumber } from '../ui.js';
import { isUnlocked } from '../progress.js';
import { DEFAULT_STARS } from '../engine.js';
import { charName } from '../layout.js';

const PRAISE = ['Super gemacht!', 'Klasse!', 'Toll getippt!', 'Wunderbar!'];

export function renderResult(app, levelId, result, summary) {
  const { level, next } = app.levelById(levelId);
  const thresholds = level.stars?.accuracy ?? DEFAULT_STARS;

  let title;
  if (!result.valid) title = 'Schon ein Anfang!';
  else if (result.stars === 0) title = 'Gut geübt!';
  else title = PRAISE[Math.floor(Math.random() * PRAISE.length)];

  // Was fehlt bis zum nächsten Stern?
  let tip = null;
  if (result.story && !result.valid) {
    const left = result.story.total - result.story.done;
    tip = `Du hast ${result.story.done} von ${result.story.total} Kapiteln geschafft. Noch ${left} Kapitel bis zum Ende der Geschichte! Beim nächsten Mal geht es mit „${result.story.nextTitle}“ weiter.`;
  } else if (!result.valid) {
    tip = level.mode === 'rain'
      ? 'Diese Runde war zu kurz für Sterne. Versuch, alle Tropfen zu erwischen. Der Regen wird langsamer, wenn einer landet.'
      : 'Diese Runde war zu kurz für Sterne. Spiel sie bis zum Ende, dann klappt es!';
  } else if (result.stars < 3) {
    tip = `Für ${result.stars === 0 ? 'den ersten' : 'den nächsten'} Stern brauchst du ${thresholds[result.stars]} % Genauigkeit. Tipp: Langsam und genau ist besser als schnell.`;
  }

  // Knifflige Tasten dieser Runde
  const tricky = Object.entries(result.perChar ?? {})
    .filter(([, s]) => s.errors > 0)
    .sort((a, b) => b[1].errors - a[1].errors)
    .slice(0, 3)
    .map(([ch]) => ch);

  const badges = [];
  if (summary.newStars && result.stars > 0) badges.push('Neuer Rekord: mehr Sterne!');
  if (result.story?.done === result.story?.total && result.valid) badges.push('Du hast die goldene Taste zurückgebracht!');
  if (summary.newAccuracy) badges.push('Neue Bestleistung bei der Genauigkeit!');
  if (summary.newCpm) badges.push('So schnell warst du hier noch nie!');

  const nextOpen = next && isUnlocked(next, app.state, app.teacher);

  const actions = [];
  if (nextOpen) actions.push(el('button', { class: 'btn btn--big btn--primary', type: 'button', onclick: () => app.go.intro(next.id) }, 'Nächstes Level'));
  actions.push(el('button', { class: `btn btn--big${nextOpen ? '' : ' btn--primary'}`, type: 'button', onclick: () => app.go.play(levelId) }, 'Nochmal spielen'));
  actions.push(el('button', { class: 'btn', type: 'button', onclick: () => app.go.map() }, 'Zur Weltkarte'));

  const screen = el('section', { class: 'screen result' },
    el('div', { class: 'card result__card' },
      tippImage(result.stars > 0 ? 'tipp--small tipp--jump' : 'tipp--small tipp--wave'),
      el('h1', {}, title),
      starsNode(result.stars, 3, 'stars--big stars--animate'),
      el('dl', { class: 'result__stats' },
        el('div', {}, el('dt', {}, 'Genauigkeit'), el('dd', {}, `${formatNumber(result.accuracy, 1)} %`)),
        level.mode === 'keyhunt' ? null : el('div', {}, el('dt', {}, 'Tempo'), el('dd', {}, `${formatNumber(result.cpm)} Zeichen pro Minute`)),
        el('div', {}, el('dt', {}, 'Erfahrung'), el('dd', {}, `+${summary.xp} XP`, result.tempoBonus ? el('span', { class: 'pill pill--bonus' }, 'Tempo-Bonus!') : null))),
      badges.length ? el('ul', { class: 'result__badges' }, badges.map((b) => el('li', {}, el('span', { 'aria-hidden': 'true' }, '🏅 '), b))) : null,
      summary.firstStar && nextOpen ? el('p', { class: 'result__unlock' }, el('span', { 'aria-hidden': 'true' }, '🔓 '), `Neues Level freigeschaltet: ${next.id} ${next.title}!`) : null,
      (summary.rewards ?? []).map((r) => el('p', { class: 'result__reward' },
        el('span', { 'aria-hidden': 'true' }, r.kind === 'avatars' ? '🤖 ' : '🎨 '),
        `Neu freigeschaltet: ${r.name}! `,
        el('span', { class: 'muted' }, 'Du findest es unter Einstellungen.'))),
      tip ? el('p', { class: 'result__tip' }, tip) : null,
      tricky.length ? el('p', { class: 'result__tricky' }, 'Diese Tasten waren heute knifflig: ',
        tricky.map((ch) => el('kbd', {}, ch === ' ' ? 'Leertaste' : charName(ch)))) : null,
      app.teacher ? null : el('div', { class: 'remind' },
        el('p', {}, el('strong', {}, 'Vergiss nicht, deinen Spielstand zu speichern!')),
        app.makeSaveButton()),
      el('div', { class: 'row row--center' }, actions)));
  showScreen(screen);
}
