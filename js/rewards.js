// Freischaltbare Belohnungen: Tipp-Avatare und Farbthemen, je nach gesammelten XP.
// "Hoher Kontrast" ist immer verfügbar (Barrierefreiheit ist keine Belohnung).

export const AVATARS = [
  { id: 'tipp', name: 'Kupfer-Tipp', xp: 0, filter: 'none' },
  { id: 'ozean', name: 'Ozean-Tipp', xp: 150, filter: 'hue-rotate(175deg)' },
  { id: 'moos', name: 'Moos-Tipp', xp: 400, filter: 'hue-rotate(65deg) saturate(1.1)' },
  { id: 'pflaume', name: 'Pflaumen-Tipp', xp: 800, filter: 'hue-rotate(255deg)' },
  { id: 'gold', name: 'Gold-Tipp', xp: 1500, filter: 'saturate(1.7) brightness(1.12)' },
];

export const THEMES = [
  { id: 'standard', name: 'Kupfer & Pergament', xp: 0 },
  { id: 'kontrast', name: 'Hoher Kontrast', xp: 0 },
  { id: 'messing', name: 'Messing & Holz', xp: 300 },
  { id: 'werkstatt', name: 'Bunte Werkstatt', xp: 1000 },
];

/** Prüft, ob durch die XP etwas Neues freigeschaltet wurde. Rückgabe: Liste der neuen Belohnungen. */
export function unlockRewards(state) {
  const fresh = [];
  for (const [kind, list] of [['avatars', AVATARS], ['themes', THEMES]]) {
    for (const r of list) {
      if (r.xp <= state.xp && !state.unlocked[kind].includes(r.id)) {
        state.unlocked[kind].push(r.id);
        fresh.push({ kind, ...r });
      }
    }
  }
  return fresh;
}

export function avatarFilter(id) {
  return AVATARS.find((a) => a.id === id)?.filter ?? 'none';
}
