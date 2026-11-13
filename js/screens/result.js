// Ergebnis einer Runde: Sterne, Genauigkeit, Tempo, Bestleistungen, Speicher-Erinnerung.

import { el, showScreen, starsNode, tippImage, formatNumber, effectsOn, button, icon, worldImage, pixelBackground } from '../ui.js';
import { isUnlocked } from '../progress.js';
import { DEFAULT_STARS } from '../engine.js';
import { charName } from '../layout.js';

const PRAISE = ['Super gemacht!', 'Klasse!', 'Toll getippt!', 'Wunderbar!'];

export function renderResult(app, levelId, result, summary) {
  const { world, level, next } = app.levelById(levelId);
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
  if (result.story && result.story.done === result.story.total && result.valid) badges.push('Du hast die goldene Taste zurückgebracht!');
  if (summary.newAccuracy) badges.push('Neue Bestleistung bei der Genauigkeit!');
  if (summary.newCpm) badges.push('So schnell warst du hier noch nie!');

  const nextOpen = next && isUnlocked(next, app.state, app.teacher);

  const actions = [];
  if (nextOpen) actions.push(button('Nächstes Level', { variant: 'big green', iconEnd: 'play', onclick: () => app.go.intro(next.id) }));
  actions.push(button('Nochmal spielen', { variant: nextOpen ? '' : 'big green', onclick: () => app.go.play(levelId) }));
  actions.push(button('Zur Weltkarte', { icon: 'back', onclick: () => app.go.map() }));

  // Balken für die Genauigkeit (50 bis 100 %) mit Marken an den drei Stern-Grenzen
  const scale = (v) => Math.max(0, Math.min(100, (v - 50) * 2));
  const meter = el('span', { class: 'meter', 'aria-hidden': 'true' },
    el('i', { style: { width: `${scale(result.accuracy)}%` } }),
    thresholds.map((t) => el('u', { style: { left: `${scale(t)}%` } })));

  const tile = (ic, label, value, extra) => el('div', { class: 'tile' }, icon(ic),
    el('div', {}, el('dt', {}, label), el('dd', {}, value), extra));

  const news = [
    ...badges.map((b) => ['medal', b]),
    ...(summary.firstStar && nextOpen ? [['lock', `Neues Level freigeschaltet: ${next.id} ${next.title}!`]] : []),
    ...(summary.rewards ?? []).map((r) => ['brush', `Neu freigeschaltet: ${r.name}! Du findest es unter Einstellungen.`]),
  ];

  const screen = el('section', { class: `screen result world--${world.theme}`, style: { backgroundImage: `url(${worldImage(world.theme)})` } },
    el('div', { class: 'frame card result__card' },
      el('p', { class: 'ribbon' }, levelId === 'knackpunkte' ? level.title : `Level ${level.id} · ${level.title}`),
      el('div', { class: 'result__head' },
        tippImage(result.stars > 0 ? 'tipp--small tipp--jump' : 'tipp--small tipp--wave'),
        el('h1', {}, title)),
      starsNode(result.stars, 3, 'stars--big stars--animate'),
      el('dl', { class: 'result__stats' },
        tile('target', 'Genauigkeit', `${formatNumber(result.accuracy, 1)} %`, meter),
        level.mode === 'keyhunt' ? null : tile('clock', 'Tempo', formatNumber(result.cpm), el('span', { class: 'tile__unit' }, 'Zeichen pro Minute')),
        tile('bolt', 'Erfahrung', `+${summary.xp} XP`, result.tempoBonus ? el('span', { class: 'pill pill--bonus' }, 'Tempo-Bonus!') : null)),
      news.length ? el('ul', { class: 'result__badges' }, news.map(([ic, text]) => el('li', {}, icon(ic), text))) : null,
      tip ? el('p', { class: 'result__tip' }, icon('bulb'), el('span', {}, tip)) : null,
      tricky.length ? el('p', { class: 'result__tricky' }, 'Diese Tasten waren heute knifflig: ',
        tricky.map((ch) => el('kbd', {}, ch === ' ' ? 'Leertaste' : charName(ch)))) : null,
      app.teacher ? null : el('div', { class: 'remind' },
        el('strong', {}, 'Vergiss nicht, deinen Spielstand zu speichern!'),
        app.makeSaveButton('sm primary')),
      el('div', { class: 'row row--center' }, actions)));
  showScreen(screen);
  pixelBackground(screen, 444, 160);
  if (result.valid && result.stars === 3) confetti();
}

/** Zahnrad-Konfetti bei drei Sternen */
function confetti() {
  if (!effectsOn()) return;
  for (let i = 0; i < 26; i++) {
    const c = el('img', { class: 'confetti', src: i % 3 ? (i % 2 ? 'assets/pixel/ui/gear-gold.png' : 'assets/pixel/ui/i-star.png') : 'assets/pixel/tipp.png', alt: '', 'aria-hidden': 'true' });
    c.style.left = `${Math.random() * 100}vw`;
    c.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 160)}px`);
    c.style.setProperty('--t', `${(2 + Math.random() * 1.6).toFixed(2)}s`);
    c.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
    if (i % 3 === 0) { c.style.width = '32px'; c.style.height = '32px'; }
    document.body.append(c);
    setTimeout(() => c.remove(), 4500);
  }
}
