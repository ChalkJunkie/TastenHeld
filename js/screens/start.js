// Startseite: neues Abenteuer, Spielstand-Datei laden oder (falls vorhanden) weiterspielen.

import { el, showScreen, tippImage } from '../ui.js';
import { readFile, FILE_ERROR } from '../progress.js';

export function renderStart(app) {
  const box = el('div', { class: 'start__box' });
  const screen = el('section', { class: 'screen start' },
    el('div', { class: 'start__hero' },
      tippImage('tipp--big tipp--wave', 'Tipp, der kleine Roboter, winkt dir zu'),
      el('div', {},
        el('h1', { class: 'logo' }, 'Tasten', el('span', {}, 'Held')),
        el('p', { class: 'start__lead' }, 'Lerne mit Tipp, dem kleinen Roboter, mit zehn Fingern zu tippen!'))),
    box);

  function choose() {
    const buttons = [
      el('button', { class: 'btn btn--big btn--primary', type: 'button', onclick: newGame }, 'Neues Abenteuer starten'),
      el('button', { class: 'btn btn--big', type: 'button', onclick: loadGame }, 'Ich habe schon einen Spielstand'),
    ];
    if (app.backup) {
      buttons.push(el('button', { class: 'btn btn--link', type: 'button', onclick: () => app.loadState(app.backup) },
        `Weiterspielen als ${app.backup.profile.nickname}`));
    }
    box.replaceChildren(el('div', { class: 'start__choices' }, buttons));
  }

  function newGame() {
    const error = el('p', { class: 'form-error', role: 'alert' });
    const input = el('input', { id: 'nickname', type: 'text', maxlength: 20, autocomplete: 'off', spellcheck: 'false', class: 'input' });
    const form = el('form', { class: 'start__form', novalidate: true },
      el('label', { for: 'nickname', class: 'label-big' }, 'Wie soll Tipp dich nennen?'),
      el('p', { class: 'muted' }, 'Denk dir einen Spitznamen aus. Deinen Nachnamen brauchst du nicht.'),
      input,
      error,
      app.backup && el('p', { class: 'note' },
        `Auf diesem Computer ist noch der Spielstand von ${app.backup.profile.nickname}. Er wird durch das neue Abenteuer ersetzt. Hast du ihn als Datei gespeichert?`),
      el('div', { class: 'row' },
        el('button', { class: 'btn btn--big btn--primary', type: 'submit' }, "Los geht's!"),
        el('button', { class: 'btn', type: 'button', onclick: choose }, 'Zurück')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, ' ');
      if (!name) {
        error.textContent = 'Schreib bitte einen Spitznamen in das Feld.';
        input.focus();
        return;
      }
      app.startNew(name);
    });
    box.replaceChildren(form);
    input.focus();
  }

  function loadGame() {
    const error = el('p', { class: 'form-error', role: 'alert' });
    const file = el('input', { type: 'file', accept: '.tastenheld,.json', class: 'visually-hidden', id: 'savefile' });
    file.addEventListener('change', async () => {
      error.textContent = '';
      const chosen = file.files?.[0];
      if (!chosen) return;
      try {
        app.loadState(await readFile(chosen));
      } catch {
        error.textContent = FILE_ERROR;
      }
      file.value = '';
    });
    box.replaceChildren(el('div', { class: 'start__form' },
      el('p', { class: 'label-big' }, 'Hast du schon einen Spielstand? Dann such deine Datei aus.'),
      el('label', { class: 'btn btn--big btn--primary btn--file', for: 'savefile' }, 'Spielstand auswählen', file),
      error,
      el('div', { class: 'row' }, el('button', { class: 'btn', type: 'button', onclick: choose }, 'Zurück'))));
    file.focus();
  }

  choose();
  showScreen(screen);
}
