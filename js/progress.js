// Spielstand: Aufbau, Sicherung im Browser, Speichern/Laden als Datei, Prüfsumme, Migration.
// Es verlässt nie etwas den Browser – kein Server, keine Cloud.

export const SAVE_FORMAT = 'tastenheld-spielstand';
export const SAVE_VERSION = 1;
const BACKUP_KEY = 'tastenheld.sicherung';
const FILE_EXT = '.tastenheld';

export const FILE_ERROR = 'Mit dieser Datei stimmt etwas nicht. Hast du die richtige ausgewählt?';

export class SaveError extends Error {}

// ---------------------------------------------------------------------------
// Aufbau
// ---------------------------------------------------------------------------

/** Heutiges Datum als JJJJ-MM-TT (lokale Zeit, nicht UTC). */
export function today(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Neuer, leerer Spielstand. */
export function createState(nickname) {
  return {
    profile: { nickname, avatar: 'tipp', createdAt: today() },
    settings: { theme: 'standard', fontScale: 1 },
    levels: {}, // Level-ID -> { stars, bestAccuracy, bestCpm, plays, lastPlayed }
    story: { chapters: {} }, // Kapitel-ID -> { stars }
    keyStats: {}, // Zeichen -> { hits, errors }
    xp: 0,
    unlocked: { avatars: ['tipp'], themes: ['standard', 'kontrast'] },
    tutorialsSeen: [],
  };
}

/** Fehlende Felder mit Standardwerten auffüllen (macht geladene Stände robust). */
function normalizeState(data) {
  const base = createState(data?.profile?.nickname || 'Held');
  const out = { ...base, ...data };
  out.profile = { ...base.profile, ...data.profile };
  out.settings = { ...base.settings, ...data.settings };
  out.story = { ...base.story, ...data.story };
  out.unlocked = { ...base.unlocked, ...data.unlocked };
  for (const key of ['levels', 'keyStats']) {
    if (typeof out[key] !== 'object' || out[key] === null || Array.isArray(out[key])) out[key] = {};
  }
  if (!Array.isArray(out.tutorialsSeen)) out.tutorialsSeen = [];
  if (typeof out.xp !== 'number' || !isFinite(out.xp)) out.xp = 0;
  return out;
}

// ---------------------------------------------------------------------------
// Prüfsumme und Hülle
// ---------------------------------------------------------------------------

/** FNV-1a (32 Bit). Nur gegen versehentliche Beschädigung, kein Schummelschutz. */
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function wrap(state) {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    name: state.profile.nickname,
    savedAt: new Date().toISOString(),
    data: state,
    checksum: checksum(JSON.stringify(state)),
  };
}

// Migrationen: MIGRATIONS[n] macht aus Version n die Version n+1.
// Beispiel für später:  1: (data) => { data.neuesFeld = []; return data; },
const MIGRATIONS = {};

/** Prüft eine geladene Hülle und gibt den (migrierten) Spielstand zurück. */
export function unwrap(env) {
  if (!env || typeof env !== 'object' || env.format !== SAVE_FORMAT) throw new SaveError('Format');
  if (!Number.isInteger(env.version) || env.version < 1 || env.version > SAVE_VERSION) throw new SaveError('Version');
  if (!env.data || typeof env.data !== 'object') throw new SaveError('Daten');
  if (checksum(JSON.stringify(env.data)) !== env.checksum) throw new SaveError('Prüfsumme');
  let data = env.data;
  for (let v = env.version; v < SAVE_VERSION; v++) {
    if (!MIGRATIONS[v]) throw new SaveError(`Migration ${v}`);
    data = MIGRATIONS[v](data);
  }
  return normalizeState(data);
}

// ---------------------------------------------------------------------------
// Sicherung im Browser (localStorage)
// ---------------------------------------------------------------------------

export function saveBackup(state) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(wrap(state)));
  } catch {
    // Speicher voll oder gesperrt: dann eben nur Datei-Speichern
  }
}

export function loadBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? unwrap(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearBackup() {
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* egal */
  }
}

// ---------------------------------------------------------------------------
// Datei
// ---------------------------------------------------------------------------

/** Spitzname für den Dateinamen bereinigen (ä->ae, Leerzeichen->_, nur A-Z a-z 0-9 _ -). */
export function sanitizeName(name) {
  const map = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };
  const clean = String(name ?? '')
    .trim()
    .replace(/[äöüÄÖÜß]/g, (c) => map[c])
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '');
  return clean || 'Held';
}

export function fileName(state, date = new Date()) {
  return `Spielstand_Tastenheld_${sanitizeName(state.profile.nickname)}_${today(date)}${FILE_EXT}`;
}

/**
 * Speichert den Spielstand als Datei.
 * Wenn der Browser es kann (Chrome/Edge), darf das Kind den Speicherort selbst wählen.
 * Rückgabe: 'saved' | 'downloaded' | 'cancelled'
 */
export async function saveToFile(state) {
  const name = fileName(state);
  const text = JSON.stringify(wrap(state), null, 2);
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'TastenHeld-Spielstand', accept: { 'application/json': [FILE_EXT] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return 'saved';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // Sonst (z. B. gesperrt): normaler Download
    }
  }
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

/** Liest eine ausgewählte Datei. Wirft SaveError bei Problemen. */
export async function readFile(file) {
  if (!file || file.size > 2_000_000) throw new SaveError('Datei');
  let env;
  try {
    env = JSON.parse(await file.text());
  } catch {
    throw new SaveError('JSON');
  }
  return unwrap(env);
}

// ---------------------------------------------------------------------------
// Fortschritt
// ---------------------------------------------------------------------------

export function levelProgress(state, id) {
  return state.levels[id] ?? null;
}

export function isUnlocked(level, state, teacher = false) {
  if (teacher) return true;
  const after = level.unlock?.after;
  if (!after) return true;
  return (state.levels[after]?.stars ?? 0) >= 1;
}

export function totalStars(state) {
  return Object.values(state.levels).reduce((n, l) => n + (l.stars ?? 0), 0);
}

/** XP einer Runde: fürs Üben, für Sterne und als Bonus fürs Tempo. */
export function xpFor(result) {
  if (!result.valid) return Math.floor(result.chars / 10);
  return Math.floor(result.chars / 5) + 10 * result.stars + (result.tempoBonus ? 15 : 0);
}

/**
 * Trägt ein Rundenergebnis in den Spielstand ein.
 * Rückgabe: Zusammenfassung für den Ergebnis-Bildschirm.
 */
export function recordResult(state, result) {
  const prev = state.levels[result.levelId] ?? { stars: 0, bestAccuracy: 0, bestCpm: 0, plays: 0 };
  const entry = { ...prev, plays: (prev.plays ?? 0) + 1, lastPlayed: today() };
  const summary = { newStars: false, newAccuracy: false, newCpm: false, firstStar: false, xp: xpFor(result) };

  if (result.valid) {
    if (result.stars > prev.stars) {
      summary.newStars = true;
      summary.firstStar = prev.stars === 0;
      entry.stars = result.stars;
    }
    if (result.accuracy > prev.bestAccuracy) {
      summary.newAccuracy = prev.plays > 0;
      entry.bestAccuracy = result.accuracy;
    }
    if (result.cpm > prev.bestCpm) {
      summary.newCpm = prev.plays > 0;
      entry.bestCpm = result.cpm;
    }
  }
  state.levels[result.levelId] = entry;

  for (const [ch, s] of Object.entries(result.perChar ?? {})) {
    const k = (state.keyStats[ch] ??= { hits: 0, errors: 0 });
    k.hits += s.hits;
    k.errors += s.errors;
  }
  state.xp += summary.xp;
  return summary;
}
