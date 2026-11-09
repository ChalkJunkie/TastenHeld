// Zentrale Tastatur-Eingabe.
// Ein einziger Listener für keydown/keyup. Er wandelt Browser-Ereignisse in ein einheitliches
// Objekt um, filtert Besonderheiten (AltGr unter Windows, Totasten, Tastenwiederholung) heraus
// und verhindert Browser-Kürzel, solange ein Spiel läuft.

// Tasten, die der Browser sonst selbst benutzt (Fokus springen, zurück, scrollen, Menü ...)
const PREVENT_CODES = new Set([
  'Tab', 'Backspace', 'Delete', 'Space', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown',
  'AltLeft', 'AltRight', 'ContextMenu',
  'F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9', 'F10',
]);

// Zeitfenster, in dem ein künstliches ControlLeft zu AltGr gehört (Millisekunden)
const ALTGR_WINDOW = 50;

/**
 * Erzeugt die Eingabe-Steuerung. Es ist immer höchstens ein Empfänger (handler) aktiv.
 * policy: 'none' = Browser verhält sich normal (Menüs), 'game' = Spieltasten abfangen.
 */
export function createInput() {
  let handler = null;
  let policy = 'none';
  let lastAltGrAt = -Infinity;
  let pendingCtrl = null; // ControlLeft, das noch auf ein mögliches AltGr wartet
  let phantomCtrl = false; // wurde ein künstliches ControlLeft verworfen?

  function normalize(e, type) {
    const altGr = !!(e.getModifierState?.('AltGraph')) || (e.ctrlKey && e.altKey);
    const printable = e.key.length === 1;
    const isChar = printable && !e.metaKey && (altGr || (!e.ctrlKey && !e.altKey));
    return {
      type,
      key: e.key,
      code: e.code,
      char: isChar ? e.key : null,
      shift: e.shiftKey,
      caps: !!(e.getModifierState?.('CapsLock')),
      ctrl: e.ctrlKey && !altGr,
      alt: e.altKey && !altGr,
      altGr,
      repeat: e.repeat,
      dead: e.key === 'Dead',
      time: performance.now(),
      original: e,
    };
  }

  function shouldPrevent(e) {
    if (policy !== 'game') return false;
    if (PREVENT_CODES.has(e.code)) return true;
    // Druckbare Zeichen abfangen (z. B. Schnellsuche in Firefox bei / und ')
    const altGr = e.ctrlKey && e.altKey;
    if (e.key.length === 1 && !e.metaKey && (altGr || !e.ctrlKey)) return true;
    return false;
  }

  function emit(ev) {
    if (handler) handler(ev);
  }

  function onKeyDown(e) {
    if (shouldPrevent(e)) e.preventDefault();
    if (!handler) return;

    // AltGr unter Windows: erst kommt ein künstliches ControlLeft, dann AltRight ("AltGraph").
    if (e.code === 'AltRight' || e.key === 'AltGraph') {
      lastAltGrAt = performance.now();
      if (pendingCtrl) {
        clearTimeout(pendingCtrl.timer);
        pendingCtrl = null;
        phantomCtrl = true;
      }
    }
    if (e.code === 'ControlLeft' && !e.repeat) {
      if (e.key === 'AltGraph' || performance.now() - lastAltGrAt < ALTGR_WINDOW) {
        phantomCtrl = true;
        return;
      }
      // Kurz warten, ob gleich ein AltRight folgt
      const ev = normalize(e, 'down');
      pendingCtrl = {
        timer: setTimeout(() => {
          pendingCtrl = null;
          emit(ev);
        }, ALTGR_WINDOW / 2),
      };
      return;
    }

    if (e.repeat) return; // gedrückt gehaltene Taste zählt nur einmal
    emit(normalize(e, 'down'));
  }

  function onKeyUp(e) {
    if (shouldPrevent(e)) e.preventDefault(); // z. B. Alt-Menü, Leertaste auf Knöpfen
    if (!handler) return;
    if (e.code === 'ControlLeft' && phantomCtrl) {
      phantomCtrl = false;
      return;
    }
    emit(normalize(e, 'up'));
  }

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);

  return {
    /** Empfänger setzen. Mit policy 'game' werden Browser-Kürzel abgefangen. */
    listen(fn, newPolicy = 'game') {
      handler = fn;
      policy = newPolicy;
      // Fokus von Knöpfen nehmen, damit Leertaste/Enter keinen Knopf auslösen
      if (newPolicy === 'game' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    stop() {
      handler = null;
      policy = 'none';
      if (pendingCtrl) clearTimeout(pendingCtrl.timer);
      pendingCtrl = null;
    },
  };
}
