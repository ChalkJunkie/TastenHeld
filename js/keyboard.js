// Virtuelle Tastatur, gezeichnet aus data/layout-de.json.
// Jede Taste ist ein <div>, absolut positioniert in Tasteneinheiten (CSS-Variable --u).

const GAP = 0.08; // Abstand zwischen den Tasten in Tasteneinheiten

/** Ist das eine Buchstabentaste (Beschriftung nur mit Großbuchstaben)? */
function isLetterKey(key) {
  return key.base && key.shift && key.base.toUpperCase() === key.shift && key.base !== key.shift;
}

function buildKeyElement(key, x, y, w, h) {
  const el = document.createElement('div');
  el.className = `key finger-${key.finger}`;
  el.dataset.code = key.code;
  el.style.left = `calc(var(--u) * ${x})`;
  el.style.top = `calc(var(--u) * ${y})`;
  el.style.width = `calc(var(--u) * ${w - GAP})`;
  el.style.height = `calc(var(--u) * ${h - GAP})`;

  if (key.part) {
    el.classList.add('key--part');
    return el;
  }
  if (key.label != null) {
    el.classList.add('key--special');
    el.append(span('key__main', key.label));
  } else if (isLetterKey(key)) {
    el.append(span('key__main', key.shift));
  } else {
    // Zeichen-Taste: oben Shift-Zeichen, unten Grundzeichen, rechts unten AltGr
    if (key.shift) el.append(span('key__shift', key.shift));
    el.append(span('key__base', key.base));
  }
  if (key.altgr) el.append(span('key__altgr', key.altgr));
  if (key.bump) el.append(span('key__bump', ''));
  if (key.dead) el.classList.add('key--dead');
  return el;
}

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

/**
 * Erstellt die Tastatur im Container.
 * options.sections: welche Teile gezeichnet werden ('fn', 'main', 'nav')
 */
export function createKeyboard(container, index, { sections = ['main'] } = {}) {
  const root = document.createElement('div');
  root.className = 'kb kb--colors';
  root.setAttribute('aria-hidden', 'true'); // rein visuelle Hilfe, Hinweise gibt es auch als Text
  const byCode = new Map();

  // 1. Durchgang: Positionen berechnen
  const placed = [];
  for (const section of index.layout.sections) {
    if (!sections.includes(section.id)) continue;
    section.rows.forEach((row, r) => {
      let x = section.x;
      const y = section.y + r;
      for (const key of row) {
        if (key.gap) { x += key.gap; continue; }
        const w = key.w ?? 1;
        placed.push({ key, x, y, w, h: key.h ?? 1 });
        x += w;
      }
    });
  }
  const minX = Math.min(...placed.map((p) => p.x));
  const minY = Math.min(...placed.map((p) => p.y));
  const maxX = Math.max(...placed.map((p) => p.x + p.w));
  const maxY = Math.max(...placed.map((p) => p.y + p.h));

  // 2. Durchgang: Tasten zeichnen (relativ zur linken oberen Ecke)
  for (const { key, x, y, w, h } of placed) {
    // Das untere Enter-Stück schließt nahtlos an das obere an
    const ky = key.part ? y - GAP : y;
    const kh = key.part ? h + GAP : h;
    const el = buildKeyElement(key, x - minX, ky - minY, w, kh);
    root.append(el);
    if (!byCode.has(key.code)) byCode.set(key.code, []);
    byCode.get(key.code).push(el);
  }
  root.style.width = `calc(var(--u) * ${maxX - minX - GAP})`;
  root.style.height = `calc(var(--u) * ${maxY - minY - GAP})`;
  container.append(root);

  const each = (codes, fn) => {
    for (const code of codes) for (const el of byCode.get(code) ?? []) fn(el);
  };
  let highlightNext = true;
  let nextCodes = [];

  return {
    element: root,

    /** Hilfen ein-/ausschalten: { fingerColors, highlightNext } */
    setHelps({ fingerColors = true, highlightNext: hn = true } = {}) {
      root.classList.toggle('kb--colors', !!fingerColors);
      highlightNext = !!hn;
      this.setNext(nextCodes);
    },

    /** Tasten, die im Level noch nicht dran sind, werden blass gezeichnet. */
    setActive(codes) {
      const active = codes ? new Set(codes) : null;
      for (const [code, els] of byCode) {
        for (const el of els) el.classList.toggle('is-inactive', !!active && !active.has(code));
      }
    },

    /** Nächste Taste(n) pulsieren lassen. codes: Liste von event.codes */
    setNext(codes = []) {
      nextCodes = codes;
      for (const el of root.querySelectorAll('.is-next')) el.classList.remove('is-next');
      if (highlightNext) each(codes, (el) => el.classList.add('is-next'));
    },

    /** Neue Tasten (Mini-Tutorial) dauerhaft markieren. */
    markNew(codes = []) {
      for (const el of root.querySelectorAll('.is-new')) el.classList.remove('is-new');
      each(codes, (el) => el.classList.add('is-new'));
    },

    /** Kurzes Aufleuchten beim Drücken: kind 'ok' | 'bad' | null */
    press(code, kind = null) {
      each([code], (el) => {
        el.classList.remove('is-pressed', 'is-ok', 'is-bad');
        void el.offsetWidth; // Animation neu starten
        el.classList.add('is-pressed');
        if (kind) el.classList.add(`is-${kind}`);
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove('is-pressed', 'is-ok', 'is-bad'), 280);
      });
    },

    destroy() {
      root.remove();
    },
  };
}
