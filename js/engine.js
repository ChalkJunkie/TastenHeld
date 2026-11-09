// Spiel-Kern, der für alle Modi gleich ist:
// Inhalte ziehen, Tastendrücke bewerten, Statistik führen, Sterne berechnen.

import { charName } from './layout.js';

// Pausen zwischen zwei Tastendrücken zählen höchstens so lange (ms) für das Tempo.
// So verfälscht kurzes Nachdenken oder eine Pause das Ergebnis nicht.
const MAX_GAP_MS = 3000;

export const DEFAULT_STARS = [85, 93, 98];

// ---------------------------------------------------------------------------
// Inhalte
// ---------------------------------------------------------------------------

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Zieht `count` Elemente ohne Wiederholung aus einer oder mehreren Listen.
 * Bei mehreren Listen wird abwechselnd gezogen, damit es gut gemischt ist.
 */
export function drawItems(content, words) {
  const sources = Array.isArray(content.source) ? content.source : [content.source];
  const pools = sources.map((id) => shuffle(words.lists[id] ?? []));
  const total = pools.reduce((n, p) => n + p.length, 0);
  const count = Math.min(content.count ?? total, total);
  const seen = new Set();
  const result = [];
  let i = 0;
  while (result.length < count && pools.some((p) => p.length)) {
    const pool = pools[i++ % pools.length];
    if (!pool.length) continue;
    const item = pool.pop();
    if (seen.has(item)) continue; // gleiches Wort in zwei Listen nur einmal
    seen.add(item);
    result.push(item);
  }
  return shuffle(result);
}

// ---------------------------------------------------------------------------
// Bewertung eines Tastendrucks
// ---------------------------------------------------------------------------

export const HINTS = {
  caps: "Die Feststelltaste ist an. Drück sie einmal, dann geht's weiter.",
  shift: "Hier brauchst du nur kleine Buchstaben. Lass die Umschalttaste los, dann geht's weiter.",
  capsOff: 'Feststelltaste wieder ausschalten!',
  capsMixed: 'Die Feststelltaste ist an. Drück sie einmal, dann klappen auch die kleinen Buchstaben.',
};

const isUpperLetter = (c) => c != null && c !== c.toLowerCase() && c === c.toUpperCase();
const isLowerLetter = (c) => c != null && c !== c.toUpperCase() && c === c.toLowerCase();

/**
 * Vergleicht das getippte Zeichen mit dem erwarteten.
 * Ergebnis: { result: 'correct' | 'wrong' | 'ignore', hint? }
 * 'ignore' bedeutet: weder richtig noch Fehler, nur ein freundlicher Hinweis.
 */
export function checkInput(ev, expected, caseMode, { capsCheck = false } = {}) {
  if (caseMode === 'lower') {
    // Feststelltaste an: gar nicht werten
    if (ev.caps) return { result: 'ignore', hint: 'caps' };
    if (ev.char === expected) return { result: 'correct' };
    // Versehentlich Shift gedrückt: kein Fehler
    if (ev.shift) return { result: 'ignore', hint: 'shift' };
    return { result: 'wrong' };
  }
  if (ev.char === expected) return { result: 'correct' };
  // Level mit Feststelltaste: Großbuchstabe statt Kleinbuchstabe, weil sie noch an ist
  if (capsCheck && ev.caps && expected !== expected.toUpperCase() && ev.char === expected.toUpperCase()) {
    return { result: 'ignore', hint: 'capsOff' };
  }
  return { result: 'wrong' };
}

/** Freundlicher Hinweis mit dem richtigen Finger. */
export function fingerHint(expected, index) {
  const info = index.chars.get(expected);
  if (!info) return 'Fast! Probier es noch einmal.';
  const finger = index.fingerInfo(info.finger);
  const name = charName(expected);
  const starts = ['Fast!', 'Knapp daneben!', 'Kein Problem!'];
  const start = starts[Math.floor(Math.random() * starts.length)];
  let text = `${start} Für ${name} nimmst du ${finger?.acc ?? 'den richtigen Finger'}.`;
  if (info.mod === 'shift') {
    text += ` Halte dazu die ${info.shiftCode === 'ShiftLeft' ? 'linke' : 'rechte'} Umschalttaste gedrückt.`;
  } else if (info.mod === 'altgr') {
    text += ' Halte dazu die Taste Alt Gr gedrückt.';
  }
  return text;
}

// ---------------------------------------------------------------------------
// Statistik
// ---------------------------------------------------------------------------

/**
 * Zählt richtige Zeichen und Fehler.
 * Pro Zeichen-Position zählt höchstens EIN Fehler, egal wie oft danebengedrückt wird.
 * Genauigkeit = beim ersten Versuch richtig / alle versuchten Positionen.
 */
export class Tracker {
  constructor() {
    this.correct = 0; // richtig getippte Zeichen (auch nach einem Fehler)
    this.firstTry = 0; // beim ersten Versuch richtig
    this.errors = 0; // Positionen mit mindestens einem Fehler
    this.positionFailed = false;
    this.perChar = {}; // Zeichen -> { hits, errors }
    this.activeMs = 0;
    this.lastAt = null;
  }

  stat(ch) {
    return (this.perChar[ch] ??= { hits: 0, errors: 0 });
  }

  touch(now = performance.now()) {
    if (this.lastAt != null) this.activeMs += Math.min(now - this.lastAt, MAX_GAP_MS);
    this.lastAt = now;
  }

  hit(ch) {
    this.touch();
    this.correct++;
    this.stat(ch).hits++;
    if (!this.positionFailed) this.firstTry++;
    this.positionFailed = false;
  }

  miss(ch) {
    this.touch();
    if (this.positionFailed) return;
    this.positionFailed = true;
    this.errors++;
    this.stat(ch).errors++;
  }

  /** Position wird aufgegeben (z. B. Tropfen gelandet). Ein Fehler bleibt gezählt. */
  abandon() {
    this.positionFailed = false;
  }

  get attempts() {
    return this.firstTry + this.errors;
  }

  get accuracy() {
    return this.attempts ? (this.firstTry / this.attempts) * 100 : 0;
  }

  get cpm() {
    const minutes = this.activeMs / 60000;
    return minutes > 0 ? this.correct / minutes : 0;
  }
}

/** Anzahl Sterne (0-3) nach Genauigkeit. */
export function starsFor(accuracy, thresholds = DEFAULT_STARS) {
  return thresholds.filter((t) => accuracy >= t).length;
}

/** Ergebnis einer Runde, unabhängig vom Modus. */
export function buildResult(level, tracker, extra = {}) {
  const starsCfg = level.stars ?? {};
  const accuracy = Math.round(tracker.accuracy * 10) / 10;
  const cpm = Math.round(tracker.cpm);
  const valid = tracker.attempts >= (starsCfg.minChars ?? 0) && tracker.attempts > 0;
  const stars = valid ? starsFor(accuracy, starsCfg.accuracy ?? DEFAULT_STARS) : 0;
  const tempoBonus = valid && starsCfg.tempoBonusCpm != null && cpm >= starsCfg.tempoBonusCpm;
  return {
    levelId: level.id,
    accuracy,
    cpm,
    chars: tracker.correct,
    attempts: tracker.attempts,
    errors: tracker.errors,
    perChar: tracker.perChar,
    valid,
    stars,
    tempoBonus,
    minChars: starsCfg.minChars ?? 0,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Sitzung: verbindet Bewertung, Statistik, Tastatur und Hinweise
// ---------------------------------------------------------------------------

/**
 * Eine Spielrunde. Modi rufen expect(zeichen) für die nächste erwartete Eingabe
 * und judge(ev) für jeden Tastendruck auf.
 */
export function createSession({ level, index, keyboard, hands, onHint }) {
  const tracker = new Tracker();
  const capsCheck = !!level.params?.capsCheck;
  let expected = null;
  let hintKind = null;
  let lastChar = null; // zuletzt richtig getipptes Zeichen
  let lastCaps = false; // war dabei die Feststelltaste an?

  function hint(text, kind) {
    hintKind = kind;
    onHint?.(text, kind);
  }

  return {
    tracker,

    get expected() {
      return expected;
    },

    /** Nächstes erwartetes Zeichen festlegen (null = gerade nichts zu tippen). */
    expect(ch) {
      // Level mit Feststelltaste: Wort in Großbuchstaben fertig -> Feststelltaste wieder aus
      if (capsCheck && lastCaps && isUpperLetter(lastChar) && (ch == null || ch === ' ' || isLowerLetter(ch))) {
        hint(HINTS.capsOff, 'capsOff');
      }
      expected = ch;
      let keys = ch == null ? [] : index.keysForChar(ch);
      // Feststelltasten-Level: bei Großbuchstaben die Feststelltaste zeigen statt der Umschalttaste
      if (capsCheck && isUpperLetter(ch)) keys = lastCaps ? [keys[0]] : [keys[0], 'CapsLock'];
      keyboard?.setNext(keys);
      hands?.setFinger(ch == null ? null : index.fingerOf(ch));
    },

    /** Bewertet einen Tastendruck. Rückgabe: 'correct' | 'wrong' | 'ignore' | 'none' */
    judge(ev) {
      // Feststell-Hinweis verschwinden lassen, sobald sie aus ist
      if (hintKind === 'caps' && !ev.caps) hint(null, null);
      if (ev.type !== 'down' || !ev.char || expected == null) return 'none';

      const r = checkInput(ev, expected, level.caseMode, { capsCheck });
      if (r.result === 'ignore') {
        keyboard?.press(ev.code);
        hint(HINTS[r.hint], r.hint);
        return 'ignore';
      }
      if (r.result === 'correct') {
        keyboard?.press(ev.code, 'ok');
        tracker.hit(expected);
        lastChar = expected;
        lastCaps = ev.caps;
        if (hintKind === 'error' || hintKind === 'shift' || hintKind === 'capsMixed') hint(null, null);
        // Großbuchstabe mit der Umschalttaste der falschen Hand: kein Fehler, nur ein Tipp
        const info = index.chars.get(expected);
        const side = info?.shiftCode === 'ShiftLeft' ? 'L' : 'R';
        if (info?.mod === 'shift' && !ev.caps && ev.shiftSide && ev.shiftSide !== 'LR' && ev.shiftSide !== side) {
          hint(`Richtig! Noch besser: Für ${expected} nimmst du die ${side === 'L' ? 'linke' : 'rechte'} Umschalttaste. Immer die Hand, die gerade nicht tippt.`, 'shiftSide');
        }
        return 'correct';
      }
      keyboard?.press(ev.code, 'bad');
      tracker.miss(expected);
      // Feststelltaste an, aber Kleinbuchstabe gesucht: Fehler, aber mit passender Erklärung
      if (ev.caps && isLowerLetter(expected) && ev.char === expected.toUpperCase()) hint(HINTS.capsMixed, 'capsMixed');
      else hint(fingerHint(expected, index), 'error');
      return 'wrong';
    },

    /** Rückmeldung ohne Bewertung (z. B. Infos des Modus). */
    hint,

    result(extra) {
      return buildResult(level, tracker, extra);
    },
  };
}
