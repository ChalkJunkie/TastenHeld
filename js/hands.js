// Hände-Overlay: zwei selbst gezeichnete SVG-Hände.
// Der Finger für die nächste Taste wird hervorgehoben (Farbe UND Umriss/Größe, nicht nur Farbe).

const SVG_NS = 'http://www.w3.org/2000/svg';

// Finger der linken Hand (die rechte Hand ist gespiegelt): [id-Endung, x, y, Breite, Höhe]
const FINGERS = [
  ['P', 6, 46, 17, 52],
  ['R', 27, 24, 18, 72],
  ['M', 49, 14, 18, 82],
  ['I', 71, 26, 18, 70],
];

function makeHand(side) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 140 150');
  svg.setAttribute('class', `hand hand--${side}`);
  svg.setAttribute('aria-hidden', 'true');
  const g = document.createElementNS(SVG_NS, 'g');
  if (side === 'R') g.setAttribute('transform', 'translate(140 0) scale(-1 1)');
  svg.append(g);

  const rect = (attrs) => {
    const r = document.createElementNS(SVG_NS, 'rect');
    for (const [k, v] of Object.entries(attrs)) r.setAttribute(k, v);
    g.append(r);
    return r;
  };
  // Daumen: wächst unten seitlich aus dem Handballen und zeigt schräg nach außen.
  // Er wird VOR der Handfläche gezeichnet, damit sein Ansatz unter dem Ballen verschwindet.
  // Die Drehung sitzt in einer eigenen Gruppe, damit CSS-Effekte am Finger sie nicht stören.
  const thumbGroup = document.createElementNS(SVG_NS, 'g');
  thumbGroup.setAttribute('transform', 'rotate(50 88 132)');
  g.append(thumbGroup);
  const thumb = rect({ x: 79, y: 82, width: 18, height: 54, rx: 9, class: `hand__finger finger-${side}T`, 'data-finger': `${side}T` });
  thumbGroup.append(thumb);
  // Handfläche
  rect({ x: 4, y: 78, width: 88, height: 66, rx: 26, class: 'hand__palm' });
  for (const [f, x, y, w, h] of FINGERS) {
    rect({ x, y, width: w, height: h, rx: 9, class: `hand__finger finger-${side}${f}`, 'data-finger': `${side}${f}` });
  }
  return svg;
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
      for (const svg of [left, right]) {
        for (const el of svg.querySelectorAll('.is-active')) el.classList.remove('is-active');
      }
      const list = (Array.isArray(finger) ? finger : [finger]).filter(Boolean);
      const ids = list.flatMap((f) => (f === 'TH' ? ['LT', 'RT'] : [f]));
      for (const id of ids) {
        for (const svg of [left, right]) {
          svg.querySelector(`[data-finger="${id}"]`)?.classList.add('is-active');
        }
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
