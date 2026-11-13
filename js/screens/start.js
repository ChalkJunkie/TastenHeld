// Startseite: neues Abenteuer, Spielstand-Datei laden oder (falls vorhanden) weiterspielen.

import { el, showScreen, tippImage, button, icon, pixelBackground } from '../ui.js';
import { readFile, FILE_ERROR } from '../progress.js';

export function renderStart(app) {
  const box = el('div', { class: 'start__box frame' });
  const worlds = app.data.levels.worlds.length;
  const levels = app.allLevels.length;
  const screen = el('section', { class: 'screen start' },
    el('h1', { class: 'logo' }, 'Tasten', el('span', {}, 'Held')),
    el('p', { class: 'start__lead' }, 'Tippen lernen mit Tipp, dem kleinen Dampf-Roboter'),
    el('div', { class: 'start__main' },
      el('div', { class: 'start__tipp' }, tippImage('tipp--big tipp--wave', 'Tipp, der kleine Roboter, winkt dir zu')),
      box),
    el('ul', { class: 'start__chips' },
      el('li', {}, icon('check'), 'Ohne Anmeldung'),
      el('li', {}, icon('disk'), 'Dein Spielstand bleibt bei dir'),
      el('li', {}, icon('keys'), `${worlds} Welten · ${levels} Level`)));

  function choose() {
    const items = [
      button('Neues Abenteuer starten', { variant: 'big primary', icon: 'play', onclick: newGame }),
      button('Ich habe schon einen Spielstand', { variant: 'big', icon: 'disk', onclick: loadGame }),
    ];
    if (app.backup) {
      items.push(el('p', { class: 'start__backup' }, 'Von vorhin auf diesem Computer: ',
        el('button', { class: 'btn--link', type: 'button', onclick: () => app.loadState(app.backup) },
          `Weiterspielen als ${app.backup.profile.nickname}`)));
    }
    box.replaceChildren(el('div', { class: 'start__choices' }, items));
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
        button("Los geht's!", { variant: 'big primary', type: 'submit', iconEnd: 'play' }),
        button('Zurück', { icon: 'back', onclick: choose })));
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
      el('label', { class: 'btn btn--big btn--primary btn--file', for: 'savefile' }, icon('disk'), el('span', { class: 'btn__label' }, 'Spielstand auswählen'), file),
      error,
      el('div', { class: 'row' }, button('Zurück', { icon: 'back', onclick: choose }))));
    file.focus();
  }

  choose();
  showScreen(screen);
  pixelBackground(screen, 456, 256);
}
