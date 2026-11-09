// Weltkarte: alle Welten und Level mit Sternen, Sperren und dem Knopf "Spielstand speichern".

import { el, showScreen, starsNode, tippImage, openSettings, openDialog, formatNumber, gearIcon, worldImage, worldLabel } from '../ui.js';
import { isUnlocked, levelProgress, totalStars } from '../progress.js';
import { buildKnackpunkte, findTrickyChars } from '../knackpunkte.js';
import { charName } from '../layout.js';

export function renderMap(app) {
  const { state } = app;
  const maxStars = app.allLevels.length * 3;
  const levelIds = app.allLevels.map(({ level }) => level.id);

  // Vorschlag: erstes freies Level ohne Stern (Bonus-Level werden übersprungen)
  const suggestion = app.allLevels.find(({ level }) =>
    !level.optional && isUnlocked(level, state, app.teacher) && !(levelProgress(state, level.id)?.stars > 0));

  const header = el('header', { class: 'map__header' },
    el('div', { class: 'map__hello' },
      tippImage('tipp--small'),
      el('div', {},
        el('h1', {}, `Hallo, ${state.profile.nickname}!`),
        el('p', { class: 'map__stats' },
          el('span', { class: 'pill' }, el('span', { 'aria-hidden': 'true' }, '★ '), `${totalStars(state, levelIds)} von ${maxStars} Sternen`),
          el('span', { class: 'pill' }, el('span', { 'aria-hidden': 'true' }, '⚡ '), `${formatNumber(state.xp)} XP`)))),
    el('div', { class: 'map__actions' },
      app.teacher ? null : app.makeSaveButton(),
      el('button', {
        class: 'btn', type: 'button',
        onclick: () => openSettings(state, ({ settings, avatar }) => {
          state.settings = settings;
          state.profile.avatar = avatar;
          app.commit();
        }),
      }, '⚙ Einstellungen'),
      el('button', { class: 'btn btn--quiet', type: 'button', onclick: quit }, 'Beenden')));

  const worlds = app.data.levels.worlds.map((world) => {
    const levels = world.levels.map((level, i) => levelNode(level, i));
    return el('section', { class: `world riveted world--${world.theme}`, 'aria-labelledby': `world-${world.id}` },
      el('div', { class: 'world__pic', style: { backgroundImage: `url(${worldImage(world.theme)})` } },
        el('div', { class: 'world__plate' },
          el('h2', { id: `world-${world.id}` }, worldLabel(world)),
          el('p', {}, world.intro)),
        el('ol', { class: 'world__path' }, levels)));
  });

  function levelNode(level, i) {
    const open = isUnlocked(level, state, app.teacher);
    const prog = levelProgress(state, level.id);
    const isNext = suggestion?.level === level;
    const label = `Level ${level.id}: ${level.title}. ${open ? `${prog?.stars ?? 0} von 3 Sternen` : 'noch gesperrt'}`;
    const btn = el('button', {
      class: `level-node${open ? '' : ' is-locked'}${isNext ? ' is-suggested' : ''}`,
      type: 'button',
      'aria-label': label,
      'aria-disabled': open ? null : 'true',
      onclick: () => {
        if (open) app.go.intro(level.id);
        else {
          const after = app.levelById(level.unlock.after)?.level;
          openDialog('Noch gesperrt', el('p', {}, `Schaff zuerst Level ${after?.id}: ${after?.title} mit mindestens einem Stern. Dann öffnet sich dieses Level.`));
        }
      },
    },
    el('span', { class: 'level-node__gear', 'aria-hidden': 'true' },
      gearIcon(!open),
      el('span', { class: 'level-node__num' }, open ? level.id : '🔒')),
    el('span', { class: 'level-node__title' }, level.title, level.optional ? el('span', { class: 'level-node__bonus' }, ' Bonus') : null),
    open ? starsNode(prog?.stars ?? 0) : el('span', { class: 'level-node__locked' }, 'gesperrt'),
    isNext ? el('span', { class: 'level-node__flag' }, "Hier geht's weiter!") : null);
    return el('li', { class: i % 2 ? 'is-low' : 'is-high' }, btn);
  }

  function quit() {
    if (app.dirty && !app.teacher) {
      openDialog('Noch nicht gespeichert', el('p', {}, 'Du hast deinen Spielstand noch nicht gespeichert. Möchtest du ihn jetzt speichern?'), {
        actions: [
          { label: 'Jetzt speichern', primary: true, onClick: async () => { if (await app.saveFile()) app.go.start(); } },
          { label: 'Ohne Speichern beenden', onClick: () => app.go.start() },
          { label: 'Weiterspielen' },
        ],
      });
    } else {
      app.go.start();
    }
  }

  // "Meine Knackpunkte": Übungslevel aus den Tasten mit vielen Fehlern
  const tricky = findTrickyChars(state);
  const knack = el('section', { class: 'knack riveted', 'aria-labelledby': 'knack-title' },
    el('span', { class: 'knack__icon', 'aria-hidden': 'true' }, gearIcon()),
    el('div', { class: 'knack__text' },
      el('h2', { id: 'knack-title' }, 'Meine Knackpunkte'),
      tricky.length
        ? el('p', {}, 'Diese Tasten wackeln noch: ', tricky.map((t) => el('kbd', {}, t.ch === ' ' ? 'Leertaste' : charName(t.ch))))
        : el('p', {}, 'Spiel ein paar Level. Dann sammelt Tipp hier die Tasten, bei denen du dich oft vertippst.')),
    tricky.length
      ? el('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: () => { app.knackpunkte = buildKnackpunkte(app); if (app.knackpunkte) app.go.intro('knackpunkte'); },
      }, 'Üben')
      : null);

  showScreen(el('section', { class: 'screen map' }, el('div', { class: 'pipe', 'aria-hidden': 'true' }), header, knack, el('div', { class: 'map__worlds' }, worlds)));
  // Bei langer Karte direkt zum nächsten Level scrollen (ab Welt 2)
  const next = document.querySelector('.level-node.is-suggested');
  if (next && suggestion.world.id > 1) next.scrollIntoView({ block: 'center' });
}
