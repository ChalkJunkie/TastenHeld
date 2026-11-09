// Spielmodus "keyhunt": Tastenkunde (Welt 7) und Tastenkombinationen (Welt 8).
// Eine Karte stellt eine Frage. Antwort per Tastendruck (answerMode "press") oder per Klick
// auf die virtuelle Tastatur (answerMode "click", z. B. Win-Taste).
// Richtig: Erklärung mit Merkhilfe. Falsch: freundlicher Hinweis, die Karte kommt am Ende noch einmal.
// Gewertet wird nur der ERSTE Versuch jeder Karte (Wissen, nicht Glück beim zweiten Mal).

import { el, shuffleList } from '../ui.js';

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'AltGraph', 'Meta', 'OS']);

/** Baut die Karten für ein Level aus keys.json (Stufen wie "7.1" oder Kombinationen). */
export function buildCards(content, keysData) {
  if (content.type === 'combos') {
    const cards = (keysData.combos ?? []).map((c) => ({
      id: `combo-${c.id}`,
      kind: 'combo',
      code: c.code,
      label: c.label,
      name: c.meaning,
      question: `Welche Tastenkombination bedeutet: ${c.meaning}?`,
      explanation: `${c.label} heißt ${c.meaning}. Merkhilfe: ${c.mnemonic}.`,
      wrongHint: 'Fast! Halte Strg gedrückt und drück dann den passenden Buchstaben.',
    }));
    return shuffleList(cards).slice(0, content.count ?? cards.length);
  }
  const stages = Array.isArray(content.source) ? content.source : [content.source];
  const cards = (keysData.keys ?? [])
    .filter((k) => stages.includes(k.stage))
    .map((k) => ({ ...k, kind: k.answerMode === 'click' ? 'click' : 'press' }));
  return shuffleList(cards).slice(0, content.count ?? cards.length);
}

/** Lesedauer für die Erklärung: lang genug zum Lesen, aber nicht ewig. */
function readingMs(text) {
  const words = text.split(/\s+/).length;
  return Math.min(7000, Math.max(2500, words * 330));
}

export function createKeyhunt({ field, items, session, level, keyboard, onProgress, onEnd }) {
  const cards = items;
  const total = cards.length;
  const repeatWrong = level.params?.repeatWrong !== false;
  const queue = cards.map((card) => ({ card, round: 0 }));
  const tracker = session.tracker;
  let current = null;
  let phase = 'ask'; // ask | explain | done
  let resolved = 0;
  let timer = null;

  const panel = el('div', { class: 'card keyhunt__card', role: 'region', 'aria-live': 'polite' });
  const scene = el('div', { class: 'scene keyhunt' }, panel);
  field.append(scene);

  function instruction(card) {
    if (card.kind === 'combo') return 'Drück die Tastenkombination auf deiner Tastatur.';
    if (card.kind === 'click') {
      const meta = [card.code, ...(card.alsoAccept ?? [])].some((c) => /^(Meta|OS)/.test(c));
      return meta
        ? 'Klick unten auf der Tastatur auf die richtige Taste. Bitte nicht drücken, sonst öffnet sich das Startmenü!'
        : 'Klick unten auf der Tastatur auf die richtige Taste.';
    }
    return 'Drück die richtige Taste auf deiner Tastatur.';
  }

  function ask() {
    clearTimeout(timer);
    current = queue.shift();
    if (!current) {
      phase = 'done';
      panel.replaceChildren(el('p', { class: 'keyhunt__done' }, 'Alle Karten geschafft!'));
      setTimeout(() => onEnd({}), 900);
      return;
    }
    phase = 'ask';
    keyboard.markNew([]);
    const { card, round } = current;
    panel.className = 'card keyhunt__card';
    panel.replaceChildren(
      el('p', { class: 'eyebrow' }, round ? 'Noch einmal: ' : `Karte ${resolved + 1} von ${total}`),
      el('p', { class: 'keyhunt__question' }, card.question),
      el('p', { class: 'muted' }, instruction(card)));
  }

  /** Erklärung zeigen, dann weiter (Knopf oder nach Lesezeit). */
  function explain(nodes, cls, ms) {
    phase = 'explain';
    const next = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => ask() }, 'Weiter');
    panel.className = `card keyhunt__card ${cls}`;
    panel.replaceChildren(...nodes, el('div', { class: 'row row--center' }, next));
    timer = setTimeout(ask, ms);
  }

  /** Taste + Name (Name nur, wenn er nicht dasselbe wie die Beschriftung ist) */
  function answerLine(card) {
    return el('p', { class: 'keyhunt__answer' }, el('kbd', { class: 'kbd-big' }, card.label),
      card.name && card.name !== card.label ? ` ${card.name}` : '');
  }

  function correct() {
    const { card, round } = current;
    if (round === 0) tracker.hit(`card:${card.id}`);
    resolved++;
    onProgress(resolved, total);
    if (card.kind !== 'combo') keyboard.markNew([card.code]);
    explain([
      el('p', { class: 'keyhunt__verdict' }, el('span', { 'aria-hidden': 'true' }, '✔ '), 'Richtig!'),
      answerLine(card),
      el('p', {}, card.explanation),
    ], 'is-right', readingMs(card.explanation));
  }

  function wrong() {
    const { card, round } = current;
    if (round === 0) {
      tracker.miss(`card:${card.id}`);
      tracker.abandon();
    }
    if (repeatWrong && round === 0) {
      // Karte kommt am Rundenende noch einmal
      queue.push({ card, round: 1 });
      explain([
        el('p', { class: 'keyhunt__verdict' }, el('span', { 'aria-hidden': 'true' }, '☝ '), 'Noch nicht ganz.'),
        el('p', {}, card.wrongHint),
        el('p', { class: 'muted' }, 'Diese Karte kommt am Ende noch einmal.'),
      ], 'is-wrong', 3500);
    } else {
      // Zweiter Fehlversuch: Lösung zeigen und weiter
      resolved++;
      onProgress(resolved, total);
      if (card.kind !== 'combo') keyboard.markNew([card.code]);
      explain([
        el('p', { class: 'keyhunt__verdict' }, 'So geht es:'),
        answerLine(card),
        el('p', {}, card.explanation),
      ], 'is-solution', readingMs(card.explanation) + 1000);
    }
  }

  function matches(card, ev) {
    const accept = [card.code, ...(card.alsoAccept ?? [])];
    return accept.includes(ev.code) || accept.includes(ev.key);
  }

  return {
    start() {
      onProgress(0, total);
      ask();
    },

    tick() {},

    onKey(ev) {
      if (phase !== 'ask' || ev.type !== 'down') return;
      const { card } = current;
      keyboard.press(ev.code);

      if (card.kind === 'combo') {
        if (MODIFIER_KEYS.has(ev.key)) return; // Strg allein ist noch keine Antwort
        if (!ev.ctrl) {
          session.hint('Bei Tastenkombinationen hältst du zuerst Strg gedrückt.', 'info');
          return;
        }
        if (ev.code === card.code) correct();
        else wrong();
        return;
      }
      if (card.kind === 'click') {
        session.hint(ev.key === 'Meta' || ev.key === 'OS'
          ? 'Gut gefunden! Klick die Taste trotzdem unten auf der Tastatur an.'
          : 'Bei dieser Karte klickst du die Taste unten auf der Tastatur an.', 'info');
        return;
      }
      if (matches(card, ev)) correct();
      else wrong();
    },

    /** Klick auf die virtuelle Tastatur */
    onClick(code) {
      if (phase !== 'ask') return;
      const { card } = current;
      if (card.kind !== 'click') {
        session.hint('Bei dieser Karte drückst du die Taste auf deiner echten Tastatur.', 'info');
        return;
      }
      keyboard.press(code);
      if (matches(card, { code, key: '' })) correct();
      else wrong();
    },

    destroy() {
      clearTimeout(timer);
      scene.remove();
    },
  };
}
