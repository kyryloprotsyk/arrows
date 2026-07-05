/* skins.ts — Skin/hat metadata (no Three.js dependency) */

export const SKIN_LIST = [
  { id: 'none',      name: 'No Hat',      emoji: '😊', rarity: 'common',    hue: 200 },
  { id: 'wizard',    name: 'Wizard Hat',  emoji: '🧙', rarity: 'rare',      hue: 270 },
  { id: 'crown',     name: 'Crown',       emoji: '👑', rarity: 'epic',      hue: 45  },
  { id: 'cat',       name: 'Cat Ears',    emoji: '🐱', rarity: 'common',    hue: 330 },
  { id: 'tophat',    name: 'Top Hat',     emoji: '🎩', rarity: 'rare',      hue: 210 },
  { id: 'chef',      name: 'Chef Hat',    emoji: '👨‍🍳', rarity: 'common',    hue: 30  },
  { id: 'propeller', name: 'Propeller',   emoji: '🪁', rarity: 'epic',      hue: 150 },
  { id: 'rainbow',   name: 'Rainbow',     emoji: '🌈', rarity: 'legendary', hue: 180 }
];

export function getSkinById(id: string) {
  return SKIN_LIST.find(s => s.id === id) ?? SKIN_LIST[0];
}
