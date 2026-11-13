// Hände neben der Tastatur: Pixelbild einer Hand (rechts gespiegelt).
// Der Finger für die nächste Taste bekommt einen goldenen Ring mit dunklem Rand
// (Form UND Farbe, nicht nur Farbe).

const FINGERS = ['P', 'R', 'M', 'I', 'T'];

function makeHand(side) {
  const box = document.createElement('div');
  box.className = `hand hand--${side}`;
  box.setAttribute('aria-hidden', 'true');
  const img = (file, cls) => {
    const i = document.createElement('img');
    i.src = `assets/pixel/ui/${file}.png`;
    i.alt = '';
    i.className = `pixel ${cls}`;
    box.append(i);
    return i;
  };
  img('hand', 'hand__base');
  for (const f of FINGERS) img(`hand-${f}`, 'hand__mark').dataset.finger = `${side}${f}`;
  return box;
}

/** Erstellt beide Hände in zwei Containern (links/rechts neben der Tastatur). */
export function createHands(leftContainer, rightContainer) {
  const left = makeHand('L');
  const right = makeHand('R');
  leftContainer.append(left);
  rightContainer.append(right);

  return {
    /** finger: 'LP', 'RI', 'TH' (beide Daumen) ..., eine Liste davon oder null */
    setFinger(finger) {
      const list = (Array.isArray(finger) ? finger : [finger]).filter(Boolean);
      const ids = new Set(list.flatMap((f) => (f === 'TH' ? ['LT', 'RT'] : [f])));
      for (const hand of [left, right]) {
        for (const mark of hand.querySelectorAll('.hand__mark')) mark.classList.toggle('is-active', ids.has(mark.dataset.finger));
      }
    },
    setVisible(visible) {
      left.style.visibility = right.style.visibility = visible ? 'visible' : 'hidden';
    },
    destroy() {
      left.remove();
      right.remove();
    },
  };
}
