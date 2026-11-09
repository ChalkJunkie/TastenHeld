// "Meine Knackpunkte": ein Übungslevel aus den Tasten, bei denen sich das Kind oft vertippt.
// Es nutzt nur Wörter aus Listen von Leveln, die schon freigeschaltet sind,
// damit keine Tasten vorkommen, die noch gar nicht dran waren.

import { isUnlocked } from './progress.js';
import { shuffleList } from './ui.js';

const MIN_TRIES = 6; // so oft muss ein Zeichen schon getippt worden sein
const MIN_RATE = 0.08; // ab dieser Fehlerquote ist es ein Knackpunkt
const MAX_CHARS = 6;
const ITEM_COUNT = 14;

export const KNACKPUNKTE_WORLD = { id: 'K', label: 'Werkstatt-Übung', title: 'Meine Knackpunkte', theme: 'werkstatt' };

/** Zeichen mit hoher Fehlerquote, die schlimmsten zuerst. */
export function findTrickyChars(state) {
  return Object.entries(state.keyStats)
    .filter(([ch, s]) => ch !== ' ' && s.hits + s.errors >= MIN_TRIES && s.errors >= 2)
    .map(([ch, s]) => ({ ch, rate: s.errors / (s.hits + s.errors) }))
    .filter((x) => x.rate >= MIN_RATE)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, MAX_CHARS);
}

/** Baut das Knackpunkte-Level oder gibt null zurück, wenn es (noch) keine gibt. */
export function buildKnackpunkte(app) {
  const tricky = findTrickyChars(app.state);
  if (!tricky.length) return null;
  const chars = tricky.map((t) => t.ch);

  // Freigeschaltete Level mit Wortlisten
  const open = app.allLevels.filter(({ level }) =>
    ['words', 'sequences', 'sentences'].includes(level.content?.type) && isUnlocked(level, app.state, app.teacher));
  const listIds = new Set(open.flatMap(({ level }) => [].concat(level.content.source)));
  const activeKeys = [...new Set(open.flatMap(({ level }) => level.activeKeys ?? []))];

  // Wörter mit möglichst vielen Knackpunkt-Zeichen
  const score = (w) => [...w].filter((c) => chars.includes(c)).length;
  const words = [...new Set([...listIds].flatMap((id) => app.data.words.lists[id] ?? []))]
    .filter((w) => score(w) > 0 && w.length <= 30);
  let items = shuffleList(words).sort((a, b) => score(b) - score(a)).slice(0, ITEM_COUNT);

  // Zu wenige Wörter? Dann kurze Übungsfolgen aus den Zeichen selbst
  for (const ch of chars) {
    if (items.length >= 8) break;
    items.push(`${ch}${ch}${ch}`, `${ch} ${ch}`);
  }
  items = shuffleList(items);

  const anyShift = items.some((w) => [...w].some((c) => app.index.chars.get(c)?.mod !== 'none'));
  const level = {
    id: 'knackpunkte',
    title: 'Meine Knackpunkte',
    intro: 'Tipp hat die Tasten gesammelt, bei denen du dich am öftesten vertippst. Langsam und genau üben!',
    mode: 'race',
    caseMode: anyShift ? 'mixed' : 'lower',
    newKeys: [],
    activeKeys,
    tricky: chars,
    content: { type: 'words', source: [...listIds] },
    items,
    helps: { keyboard: true, hands: true, fingerColors: true, highlightNext: true },
    params: {},
    stars: { accuracy: [85, 93, 98], minChars: 30 },
    unlock: { after: null },
  };
  return { world: KNACKPUNKTE_WORLD, level, next: null };
}
