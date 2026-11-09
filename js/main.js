// Startpunkt von TastenHeld: lädt Daten und Spielstand und steuert die Bildschirme.

import { buildLayoutIndex } from './layout.js';
import { createInput } from './input.js';
import { el, applySettings, toast } from './ui.js';
import {
  createState, saveBackup, loadBackup, saveToFile, recordResult, fileName,
} from './progress.js';
import { renderStart } from './screens/start.js';
import { renderMap } from './screens/map.js';
import { renderLevelIntro } from './screens/levelintro.js';
import { renderGame } from './screens/game.js';
import { renderResult } from './screens/result.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';
const TEACHER = params.get('lehrkraft') === '1';

async function loadJson(name) {
  const res = await fetch(`data/${name}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  try {
    return await res.json();
  } catch (e) {
    throw new Error(`${name}: kein gültiges JSON (${e.message})`);
  }
}

async function boot() {
  let data;
  try {
    const [levels, words, keys, story, layout] = await Promise.all(
      ['levels.json', 'words.json', 'keys.json', 'story.json', 'layout-de.json'].map(loadJson));
    data = { levels, words, keys, story, layout };
  } catch (err) {
    console.error(err);
    document.getElementById('screen').replaceChildren(el('section', { class: 'screen card' },
      el('h1', {}, 'Hoppla!'),
      el('p', {}, 'TastenHeld konnte nicht starten. Bitte sag deiner Lehrkraft Bescheid.'),
      el('p', { class: 'muted' }, `Für die Lehrkraft: ${err.message}. Lokal braucht TastenHeld einen kleinen Webserver (siehe README).`)));
    return;
  }

  const index = buildLayoutIndex(data.layout);

  if (DEBUG) {
    const { runValidator } = await import('./validator.js');
    const { errors, warnings } = runValidator(data, index);
    document.body.append(el('div', { class: `debug-badge${errors ? ' debug-badge--bad' : ''}` },
      `Validator: ${errors} Fehler, ${warnings} Hinweise (Konsole F12)`));
  }

  // Alle Level als flache Liste (für Vorgänger/Nachfolger und Sterne-Summe)
  const allLevels = [];
  for (const world of data.levels.worlds) for (const level of world.levels) allLevels.push({ world, level });

  let leaveHandlers = [];
  const leave = () => {
    const hs = leaveHandlers;
    leaveHandlers = [];
    hs.forEach((h) => h());
  };

  const saveButtons = new Set();
  const updateSaveButtons = () => {
    for (const b of saveButtons) {
      if (!b.isConnected) { saveButtons.delete(b); continue; }
      b.classList.toggle('is-dirty', app.dirty);
      b.querySelector('.save-btn__state').textContent = app.dirty ? 'nicht gespeichert' : 'gespeichert';
    }
  };

  const app = {
    data,
    index,
    allLevels,
    input: createInput(),
    teacher: TEACHER,
    debug: DEBUG,
    state: null,
    dirty: false,
    backup: TEACHER ? null : loadBackup(),

    levelById(id) {
      const i = allLevels.findIndex((x) => x.level.id === id);
      if (i < 0) return null;
      return { ...allLevels[i], next: allLevels[i + 1]?.level ?? null };
    },

    onLeave(fn) {
      leaveHandlers.push(fn);
    },

    /** Spielstand wurde verändert: Sicherung im Browser, Knopf "nicht gespeichert". */
    commit() {
      applySettings(app.state.settings);
      if (TEACHER) return;
      app.dirty = true;
      saveBackup(app.state);
      updateSaveButtons();
    },

    startNew(nickname) {
      app.state = createState(nickname);
      app.commit();
      app.go.map();
    },

    loadState(state) {
      app.state = state;
      applySettings(state.settings);
      saveBackup(state);
      app.dirty = false;
      app.backup = null;
      toast(`Willkommen zurück, ${state.profile.nickname}!`, 'ok');
      app.go.map();
    },

    /** Speichert als Datei. Rückgabe: true, wenn gespeichert. */
    async saveFile() {
      const name = fileName(app.state);
      const how = await saveToFile(app.state);
      if (how === 'cancelled') return false;
      app.dirty = false;
      updateSaveButtons();
      toast(how === 'saved' ? `Gespeichert! Deine Datei heißt ${name}` : `Deine Datei ${name} wird heruntergeladen.`, 'ok', 6000);
      return true;
    },

    makeSaveButton() {
      const btn = el('button', { class: 'btn btn--save', type: 'button', onclick: () => app.saveFile() },
        el('span', { 'aria-hidden': 'true' }, '💾 '),
        'Spielstand speichern',
        el('span', { class: 'save-btn__state' }));
      saveButtons.add(btn);
      queueMicrotask(updateSaveButtons);
      return btn;
    },

    finishLevel(level, result) {
      const summary = recordResult(app.state, result);
      app.commit();
      app.go.result(level.id, result, summary);
    },

    go: {
      start() { leave(); app.state = null; app.backup = TEACHER ? null : loadBackup(); applySettings({}); renderStart(app); },
      map() { leave(); renderMap(app); },
      intro(id) { leave(); renderLevelIntro(app, id); },
      play(id) { leave(); renderGame(app, id); },
      result(id, result, summary) { leave(); renderResult(app, id, result, summary); },
    },
  };

  // Warnung beim Schließen, wenn noch nicht als Datei gespeichert
  window.addEventListener('beforeunload', (e) => {
    if (app.dirty && !TEACHER) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  if (TEACHER) {
    document.documentElement.classList.add('is-teacher');
    document.body.prepend(el('div', { class: 'teacher-banner', role: 'note' },
      'Lehrkraft-Ansicht: Alle Level sind offen. Es wird nichts gespeichert.'));
    app.state = createState('Lehrkraft');
    applySettings(app.state.settings);
    app.go.map();
  } else {
    app.go.start();
  }

  // Für die Fehlersuche in der Konsole
  if (DEBUG) window.tastenheld = app;
}

boot();
