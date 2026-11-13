// Weltkarte: links die Liste der Welten, rechts das Bild der gewählten Welt mit dem Levelpfad.
// Darunter "Meine Knackpunkte" und der Knopf zum nächsten Level.

import { el, showScreen, starsNode, tippImage, openSettings, openDialog, formatNumber, gearIcon, worldImage, pixelBackground, button, icon } from '../ui.js';
import { isUnlocked, levelProgress, totalStars } from '../progress.js';
import { buildKnackpunkte, findTrickyChars } from '../knackpunkte.js';
import { nextReward } from '../rewards.js';
import { charName } from '../layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderMap(app) {
  const { state } = app;
  const worlds = app.data.levels.worlds;
  const maxStars = app.allLevels.length * 3;
  const levelIds = app.allLevels.map(({ level }) => level.id);

  // Vorschlag: erstes freies Level ohne Stern (Bonus-Level werden übersprungen)
  const suggestion = app.allLevels.find(({ level }) =>
    !level.optional && isUnlocked(level, state, app.teacher) && !(levelProgress(state, level.id)?.stars > 0));

  // Welche Welt ist aufgeschlagen? Zuletzt gewählte, sonst die mit dem nächsten Level.
  let current = worlds.find((w) => w.id === app.mapWorld) ?? suggestion?.world ?? worlds[0];

  // --- Kopfleiste -----------------------------------------------------------
  const reward = nextReward(state.xp);
  const xpPct = reward ? Math.round(((state.xp - reward.from) / (reward.xp - reward.from)) * 100) : 100;
  const header = el('header', { class: 'bar' },
    el('span', { class: 'bar__avatar', 'aria-hidden': 'true' }, tippImage()),
    el('h1', { class: 'bar__name' }, el('span', { class: 'visually-hidden' }, 'Hallo, '), state.profile.nickname),
    el('p', { class: 'stat map__stats' }, icon('star'), el('b', {}, totalStars(state, levelIds)), el('small', {}, `von ${maxStars}`, el('span', { class: 'visually-hidden' }, ' Sternen'))),
    el('p', { class: 'stat' }, icon('bolt'), el('b', {}, `${formatNumber(state.xp)} XP`),
      el('span', { class: 'xpbar', 'aria-hidden': 'true' }, el('i', { style: { width: `${xpPct}%` } })),
      el('small', {}, reward ? `noch ${formatNumber(reward.xp - state.xp)} bis zur Belohnung` : 'alle Belohnungen geholt')),
    el('span', { class: 'bar__spacer' }),
    app.teacher ? null : app.makeSaveButton('sm primary', 'Speichern'),
    button('Einstellungen', {
      variant: 'sm dark icon', icon: 'cog',
      onclick: () => openSettings(state, ({ settings, avatar }) => {
        state.settings = settings;
        state.profile.avatar = avatar;
        app.commit();
      }),
    }),
    button('Beenden', { variant: 'sm dark icon', icon: 'exit', onclick: quit }));

  // --- Weltenliste ----------------------------------------------------------
  const tabs = worlds.map((world) => {
    const ids = world.levels.map((l) => l.id);
    const open = isUnlocked(world.levels[0], state, app.teacher);
    const stars = totalStars(state, ids);
    return el('button', {
      class: `world-tab${open ? '' : ' is-locked'}`, type: 'button', role: 'tab', id: `world-tab-${world.id}`,
      dataset: { world: world.id }, 'aria-controls': 'world-stage',
      'aria-label': `Welt ${world.id}: ${world.title}. ${open ? `${stars} von ${ids.length * 3} Sternen` : 'noch gesperrt'}`,
      onclick: () => select(world),
    },
    el('span', { class: 'world-tab__pic', style: { backgroundImage: `url(${worldImage(world.theme)})` } }, open ? null : icon('lock')),
    el('span', { class: 'world-tab__text' },
      el('span', { class: 'world-tab__title' }, `${world.id} · ${world.title}`),
      el('span', { class: 'world-tab__stars' }, open ? [icon('star-s'), `${stars} von ${ids.length * 3}`] : 'gesperrt')));
  });
  const rail = el('nav', { class: 'rail', 'aria-label': 'Welten' },
    el('h2', {}, 'Welten'),
    el('div', { class: 'rail__list', role: 'tablist', 'aria-orientation': 'vertical' }, tabs));

  // --- Bühne: Weltbild mit Levelpfad ---------------------------------------
  const stage = el('section', { class: 'stage', id: 'world-stage', role: 'tabpanel' });

  function select(world) {
    current = world;
    app.mapWorld = world.id;
    tabs.forEach((t, i) => {
      const on = worlds[i] === world;
      t.classList.toggle('is-selected', on);
      t.setAttribute('aria-selected', String(on));
    });
    stage.setAttribute('aria-labelledby', `world-tab-${world.id}`);
    stage.className = `stage world--${world.theme}`;
    stage.style.backgroundImage = `url(${worldImage(world.theme)})`;

    // Pfad im Zickzack: Positionen in Prozent der Bühne
    const n = world.levels.length;
    const pos = world.levels.map((_, i) => ({
      x: n === 1 ? 50 : 12 + (i * 78) / (n - 1),
      y: i % 2 ? 59 : 72,
    }));
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'stage__path');
    svg.setAttribute('aria-hidden', 'true');
    for (const cls of ['stage__path-shadow', 'stage__path-line']) {
      const line = document.createElementNS(SVG_NS, 'polyline');
      line.setAttribute('points', pos.map((p) => `${p.x},${p.y}`).join(' '));
      line.setAttribute('class', cls);
      svg.append(line);
    }
    stage.replaceChildren(
      svg,
      el('div', { class: 'stage__plate frame' },
        el('p', { class: 'eyebrow' }, world.label ? 'Finale' : `Welt ${world.id}`),
        el('h2', {}, world.label ?? world.title),
        el('p', {}, world.intro)),
      el('ol', { class: 'stage__nodes' }, world.levels.map((level, i) => levelNode(level, pos[i]))),
      el('div', { class: 'stage__frame', 'aria-hidden': 'true' }));
  }

  function levelNode(level, pos) {
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
    isNext ? el('span', { class: 'level-node__flag' }, "Hier geht's weiter!") : null,
    el('span', { class: 'level-node__gear', 'aria-hidden': 'true' },
      gearIcon(open ? (isNext ? 'gold' : 'open') : 'locked'),
      open ? el('span', { class: 'level-node__num' }, level.id) : icon('lock')),
    el('span', { class: 'level-node__label' },
      el('span', { class: 'level-node__title' }, level.title, level.optional ? el('span', { class: 'level-node__bonus' }, ' Bonus') : null),
      open ? starsNode(prog?.stars ?? 0) : el('span', { class: 'level-node__locked' }, 'gesperrt')));
    return el('li', { style: { left: `${pos.x}%`, top: `${pos.y}%` } }, btn);
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

  // --- Unten: Knackpunkte und "Als Nächstes" -------------------------------
  const tricky = findTrickyChars(state);
  const knack = el('section', { class: 'knack frame', 'aria-labelledby': 'knack-title' },
    icon('wrench', 'knack__icon'),
    el('div', { class: 'knack__text' },
      el('h2', { id: 'knack-title' }, 'Meine Knackpunkte'),
      tricky.length
        ? el('p', {}, 'Diese Tasten wackeln noch: ', tricky.map((t) => el('kbd', {}, t.ch === ' ' ? 'Leertaste' : charName(t.ch))))
        : el('p', {}, 'Hier sammelt Tipp die Tasten, bei denen du dich oft vertippst.')),
    tricky.length
      ? button('Üben', { onclick: () => { app.knackpunkte = buildKnackpunkte(app); if (app.knackpunkte) app.go.intro('knackpunkte'); } })
      : null);

  const next = el('section', { class: 'next frame frame--dark', 'aria-label': 'Als Nächstes' },
    tippImage('next__tipp'),
    suggestion
      ? [el('p', { class: 'next__text' }, el('small', {}, 'Als Nächstes'), el('b', {}, `${suggestion.level.id} · ${suggestion.level.title}`)),
        button('Weiter', { variant: 'big green', iconEnd: 'play', onclick: () => app.go.intro(suggestion.level.id) })]
      : el('p', { class: 'next__text' }, el('small', {}, 'Alles geschafft'), el('b', {}, 'Du bist ein TastenHeld!')));

  showScreen(el('section', { class: 'screen map' }, header, rail, el('div', { class: 'map__main' }, stage, el('div', { class: 'dock' }, knack, next))));
  select(current);
  pixelBackground(stage, 444, 160);
}
