// Hilfsfunktionen rund um das Tastaturlayout (data/layout-de.json).
// Hier wird nachgeschlagen, welche Taste und welcher Finger zu einem Zeichen gehört.

/**
 * Baut aus dem Layout zwei Nachschlage-Tabellen:
 *  keys:  event.code -> Tasten-Objekt aus dem Layout
 *  chars: Zeichen    -> { code, mod: 'none'|'shift'|'altgr', shiftCode, finger, hand, dead }
 */
export function buildLayoutIndex(layout) {
  const keys = new Map();
  const chars = new Map();
  const dead = new Set(layout.deadChars || []);

  const fingerHand = (finger) => layout.fingers[finger]?.hand ?? null;

  function addChar(ch, mod, key) {
    if (ch == null || chars.has(ch)) return;
    const hand = fingerHand(key.finger);
    chars.set(ch, {
      char: ch,
      code: key.code,
      mod,
      // Großbuchstaben: Umschalttaste der ANDEREN Hand
      shiftCode: mod === 'shift' ? (hand === 'L' ? 'ShiftRight' : 'ShiftLeft') : null,
      finger: key.finger,
      hand,
      dead: dead.has(ch),
    });
  }

  for (const section of layout.sections) {
    for (const row of section.rows) {
      for (const key of row) {
        if (!key.code || key.part) continue; // Lücken und das zweite Enter-Stück überspringen
        if (!keys.has(key.code)) keys.set(key.code, key);
        addChar(key.base, 'none', key);
        addChar(key.shift, 'shift', key);
        addChar(key.altgr, 'altgr', key);
      }
    }
  }

  return {
    layout,
    keys,
    chars,

    /** Kurzschreibweise aus levels.json ("a", "Space", "AltGr" ...) -> event.code */
    resolveToken(token) {
      if (typeof token !== 'string' || token === '') return null;
      if (token === 'AltGr') return 'AltRight';
      if (keys.has(token)) return token;
      if ([...token].length === 1) return chars.get(token)?.code ?? null;
      return null;
    },

    /** Welche Tasten braucht man für ein Zeichen? Liste von event.codes (Haupttaste zuerst). */
    keysForChar(ch) {
      const info = chars.get(ch);
      if (!info) return [];
      const list = [info.code];
      if (info.mod === 'shift') list.push(info.shiftCode);
      if (info.mod === 'altgr') list.push('AltRight');
      return list;
    },

    fingerOf(ch) {
      return chars.get(ch)?.finger ?? null;
    },

    fingerInfo(finger) {
      return layout.fingers[finger] ?? null;
    },
  };
}

/** Lesbarer Name eines Zeichens für Hinweise (Leerzeichen -> "die Leertaste"). */
export function charName(ch) {
  if (ch === ' ') return 'die Leertaste';
  return ch;
}

/** Lesbarer Name eines Tokens für das Mini-Tutorial. */
export function tokenLabel(token, index) {
  const names = {
    Space: 'Leertaste',
    ShiftLeft: 'linke Umschalttaste',
    ShiftRight: 'rechte Umschalttaste',
    CapsLock: 'Feststelltaste',
    AltGr: 'Alt Gr',
  };
  if (names[token]) return names[token];
  // Großbuchstabe als Beschriftung (wie auf der Taste), aber ß bleibt ß (nicht "SS")
  if ([...token].length === 1) return token.toUpperCase().length === 1 ? token.toUpperCase() : token;
  return index.keys.get(token)?.label ?? token;
}
