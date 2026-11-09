// Prüft alle JSON-Dateien auf Fehler. Läuft nur im Entwicklungsmodus (index.html?debug=1).
// Fehler erscheinen in der Browser-Konsole (F12) mit Level-ID und Wort.

// Typografische Zeichen, die nicht vorkommen dürfen (nur gerade " und normales - erlaubt)
const TYPO = /[„“”‚‘’«»‹›–—…   ]/;
const TYPO_NAMES = { '„': '„', '“': '“', '”': '”', '‚': '‚', '‘': '‘', '’': '’', '–': 'Halbgeviertstrich', '—': 'Geviertstrich', '…': 'Auslassungspunkte', ' ': 'geschütztes Leerzeichen' };

// Level 5-1/5-2: Anfangsbuchstabe muss zu dieser Hand gehören
const HAND_LEVELS = { '5-1': 'L', '5-2': 'R' };
// Welt 8: diese Zeichen erst ab Level 8-3
const W8_LATE = new Set([...'+*/%&=#\'_§$@€']);
// Erlaubte Tastenkombinationen (nur mit Strg): C, V, X, Z, S, A auf der DEUTSCHEN Tastatur.
// event.code ist nach US-Position benannt, deshalb liegt das deutsche Z auf "KeyY".
const COMBO_CODES = new Set(['KeyC', 'KeyV', 'KeyX', 'KeyY', 'KeyS', 'KeyA']);
const META_CODES = new Set(['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight']);

const show = (ch) => (ch === ' ' ? 'Leerzeichen' : TYPO_NAMES[ch] ?? ch);

/** Zerlegt eine Level-ID "5-2" in [Welt, Nummer]. */
function parseId(id) {
  const m = /^(\d+)-(\d+)$/.exec(id ?? '');
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

/**
 * Prüft alle Daten. Rückgabe: Liste von { severity: 'error'|'warn', where, msg }.
 * data = { levels, words, keys, story, layout }, index = buildLayoutIndex(layout)
 */
export function validateAll(data, index) {
  const issues = [];
  const err = (where, msg) => issues.push({ severity: 'error', where, msg });
  const warn = (where, msg) => issues.push({ severity: 'warn', where, msg });

  const { levels, words, keys, story, layout } = data;
  const lists = words?.lists ?? {};

  // --- Layout ------------------------------------------------------------
  for (const section of layout.sections) {
    for (const row of section.rows) {
      for (const key of row) {
        if (key.code && !layout.fingers[key.finger]) err('layout-de.json', `Taste ${key.code}: unbekannter Finger "${key.finger}"`);
      }
    }
  }

  // --- Typografie in allen Dateien ----------------------------------------
  const scan = (value, path, file) => {
    if (typeof value === 'string') {
      const m = TYPO.exec(value);
      if (m) err(file, `${path}: typografisches Zeichen "${show(m[0])}" in "${value}" – bitte nur gerade " und normales - verwenden`);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => scan(v, `${path}[${i}]`, file));
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) scan(v, path ? `${path}.${k}` : k, file);
    }
  };
  scan(levels, '', 'levels.json');
  scan(words, '', 'words.json');
  scan(keys, '', 'keys.json');
  scan(story, '', 'story.json');

  // --- Levels: IDs und Verweise -------------------------------------------
  const all = [];
  for (const world of levels.worlds ?? []) {
    for (const level of world.levels ?? []) all.push({ world, level });
  }
  const ids = new Map();
  for (const { level } of all) {
    if (ids.has(level.id)) err(`Level ${level.id}`, 'Level-ID kommt doppelt vor');
    ids.set(level.id, level);
    const [w] = parseId(level.id);
    if (w == null) warn(`Level ${level.id}`, 'Level-ID hat nicht das Format "Welt-Nummer" (z. B. 2-3)');
  }
  const usedLists = new Set();
  const stages = new Set((keys?.keys ?? []).map((k) => k.stage));

  for (const { world, level } of all) {
    const where = `Level ${level.id}`;
    const after = level.unlock?.after;
    if (after != null && !ids.has(after)) err(where, `unlock.after "${after}" gibt es nicht`);
    if (after === level.id) err(where, 'unlock.after zeigt auf sich selbst');
    if (!['lower', 'mixed'].includes(level.caseMode)) err(where, `caseMode "${level.caseMode}" ist unbekannt (lower oder mixed)`);
    const [wNum] = parseId(level.id);
    if (wNum != null && wNum !== world.id) warn(where, `liegt in Welt ${world.id}, die ID sagt aber Welt ${wNum}`);
    if (level.stars?.accuracy && level.stars.accuracy.length !== 3) err(where, 'stars.accuracy braucht genau 3 Werte');

    // activeKeys/newKeys auflösen
    const active = new Set();
    for (const token of level.activeKeys ?? []) {
      const code = index.resolveToken(token);
      if (!code) err(where, `activeKeys: "${token}" ist keine bekannte Taste`);
      else active.add(code);
    }
    for (const token of level.newKeys ?? []) {
      const code = index.resolveToken(token);
      if (!code) err(where, `newKeys: "${token}" ist keine bekannte Taste`);
      else if (level.activeKeys && !active.has(code)) warn(where, `newKeys: "${token}" fehlt in activeKeys`);
    }

    // Inhalte einsammeln
    const content = level.content ?? {};
    let texts = [];
    if (['sequences', 'words', 'sentences'].includes(content.type)) {
      const sources = Array.isArray(content.source) ? content.source : [content.source];
      let poolSize = 0;
      for (const src of sources) {
        usedLists.add(src);
        if (!lists[src]) err(where, `content.source "${src}" gibt es in words.json nicht`);
        else {
          poolSize += lists[src].length;
          texts.push(...lists[src].map((t) => ({ text: t, src })));
        }
      }
      if (content.count != null && content.count > poolSize) warn(where, `count ${content.count} ist größer als die Listen (${poolSize} Einträge)`);
    } else if (content.type === 'keycards') {
      const sources = Array.isArray(content.source) ? content.source : [content.source];
      for (const src of sources) if (!stages.has(src)) err(where, `keycards: Stufe "${src}" gibt es in keys.json nicht`);
    } else if (content.type === 'combos') {
      if (!keys?.combos?.length) err(where, 'combos: keys.json enthält keine combos');
    } else if (content.type === 'story') {
      texts = (story?.chapters ?? []).map((c) => ({ text: c.text, src: c.id, caseMode: c.caseMode }));
    } else {
      err(where, `content.type "${content.type}" ist unbekannt`);
    }

    // Jedes Zeichen prüfen
    if (level.activeKeys) {
      for (const { text, src, caseMode } of texts) {
        checkText(text, `${where} (${src}) Wort "${text}"`, level, active, caseMode ?? level.caseMode, world.id);
      }
    }
  }

  function checkText(text, where, level, active, caseMode, worldId) {
    if (typeof text !== 'string' || text === '') {
      err(where, 'leerer Eintrag');
      return;
    }
    if (text !== text.trim() || /\s{2}/.test(text)) warn(where, 'Leerzeichen am Anfang/Ende oder doppelt');
    const reported = new Set();
    const once = (msg) => {
      if (!reported.has(msg)) { reported.add(msg); err(where, msg); }
    };
    for (const ch of text) {
      const info = index.chars.get(ch);
      if (!info) { once(`Zeichen "${show(ch)}" gibt es auf der Tastatur nicht`); continue; }
      if (info.dead) { once(`Zeichen "${ch}" ist eine Totaste und wird nie abgefragt`); continue; }
      if (!active.has(info.code)) once(`Zeichen "${show(ch)}" ist in activeKeys nicht erlaubt`);
      if (caseMode === 'lower' && info.mod === 'shift') {
        once(ch !== ch.toLowerCase()
          ? `Großbuchstabe "${ch}" in einem Kleinbuchstaben-Level`
          : `Zeichen "${ch}" braucht die Umschalttaste, das geht in einem Kleinbuchstaben-Level nicht`);
      } else if (info.mod === 'shift' && !active.has(info.shiftCode)) {
        once(`Zeichen "${ch}" braucht ${info.shiftCode === 'ShiftLeft' ? 'die linke' : 'die rechte'} Umschalttaste (${info.shiftCode} in activeKeys)`);
      }
      if (info.mod === 'altgr' && !active.has('AltRight')) once(`Zeichen "${ch}" braucht AltGr in activeKeys`);
    }

    // Welt 5: nur Buchstaben, Leerzeichen, Punkt und Komma
    if (worldId === 5) {
      for (const ch of text) {
        if (ch === 'ß') once('Welt 5: kein ß');
        else if (/\d/.test(ch)) once('Welt 5: keine Ziffern');
        else if (!/[\p{L} .,]/u.test(ch)) once(`Welt 5: Satzzeichen "${ch}" nicht erlaubt (nur . und ,)`);
      }
    }
    // Level 5-1/5-2: Anfangsbuchstabe der richtigen Hand, Rest klein
    const hand = HAND_LEVELS[level.id];
    if (hand) {
      for (const word of text.split(' ')) {
        const [first, ...rest] = [...word];
        const info = index.chars.get(first);
        if (!info || first === first.toLowerCase()) once(`Wort "${word}" muss mit einem Großbuchstaben beginnen`);
        else if (info.hand !== hand) once(`Wort "${word}": ${first} gehört nicht zur ${hand === 'L' ? 'linken' : 'rechten'} Hand`);
        if (rest.some((c) => c !== c.toLowerCase())) once(`Wort "${word}": nach dem ersten Buchstaben nur Kleinbuchstaben`);
      }
    }
    // Welt 8: Sonderzeichen erst ab 8-3
    const [w, n] = parseId(level.id);
    if (w === 8 && n < 3) {
      for (const ch of text) if (W8_LATE.has(ch)) once(`Zeichen "${ch}" erst ab Level 8-3`);
    }
  }

  // --- keys.json ----------------------------------------------------------
  for (const k of keys?.keys ?? []) {
    const where = `keys.json Karte "${k.id}"`;
    for (const f of ['id', 'code', 'label', 'name', 'answerMode', 'question', 'explanation', 'wrongHint', 'stage']) {
      if (k[f] == null || k[f] === '') err(where, `Feld "${f}" fehlt`);
    }
    if (!['press', 'click'].includes(k.answerMode)) err(where, `answerMode "${k.answerMode}" ist unbekannt`);
    const codes = [k.code, ...(k.alsoAccept ?? [])];
    if (codes.some((c) => META_CODES.has(c)) && k.answerMode !== 'click') err(where, 'Win/Cmd darf nur per Klick abgefragt werden (answerMode "click")');
  }
  for (const c of keys?.combos ?? []) {
    const where = `keys.json Kombination "${c.id}"`;
    if (c.modifier !== 'Control') err(where, 'nur Kombinationen mit Strg sind erlaubt');
    if (!COMBO_CODES.has(c.code)) err(where, `Taste ${c.code} ist nicht erlaubt (nur C, V, X, Z, S, A)`);
    // Passt der Code zur Beschriftung? (z. B. "Strg + Z" braucht auf der deutschen Tastatur "KeyY")
    const letter = /\+\s*(\S)\s*$/.exec(c.label ?? '')?.[1]?.toLowerCase();
    const base = index.keys.get(c.code)?.base;
    if (letter && base && letter !== base) {
      err(where, `"${c.label}" passt nicht zu ${c.code} – auf der deutschen Tastatur liegt dort "${base.toUpperCase()}" (richtig wäre ${index.chars.get(letter)?.code})`);
    }
  }

  // --- story.json ---------------------------------------------------------
  for (const c of story?.chapters ?? []) {
    for (const f of ['id', 'title', 'text', 'svg', 'caseMode']) if (!c[f]) err(`story.json Kapitel "${c.id}"`, `Feld "${f}" fehlt`);
  }

  // --- Unbenutzte Listen (nur Info) ---------------------------------------
  const unused = Object.keys(lists).filter((id) => !usedLists.has(id));
  if (unused.length) warn('words.json', `noch nicht benutzte Listen: ${unused.join(', ')}`);

  return issues;
}

/** Prüft und schreibt das Ergebnis in die Konsole. Gibt die Anzahl der Fehler zurück. */
export function runValidator(data, index) {
  const issues = validateAll(data, index);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');
  console.groupCollapsed(`TastenHeld-Validator: ${errors.length} Fehler, ${warnings.length} Hinweise`);
  for (const i of errors) console.error(`[${i.where}] ${i.msg}`);
  for (const i of warnings) console.warn(`[${i.where}] ${i.msg}`);
  if (!issues.length) console.info('Alles in Ordnung!');
  console.groupEnd();
  return { errors: errors.length, warnings: warnings.length };
}
