// Character roster: 10 unique characters. Each has a glyph, palette, and
// signature finishing move used by the round-end cinematic.

export const CHARACTERS = [
  {
    id: 'wizard',
    name: 'Wizard',
    glyph: '🧙',
    color: '#a78bfa',
    accent: '#7c3aed',
    finisher: { name: 'Arcane Collapse', type: 'arcane', color: '#c084fc', accent: '#7c3aed' },
  },
  {
    id: 'robot',
    name: 'Robot',
    glyph: '🤖',
    color: '#22d3ee',
    accent: '#0ea5e9',
    finisher: { name: 'Ion Barrage', type: 'laser', color: '#67e8f9', accent: '#0ea5e9' },
  },
  {
    id: 'ninja',
    name: 'Ninja',
    glyph: '🥷',
    color: '#94a3b8',
    accent: '#475569',
    finisher: { name: 'Shadow Cut', type: 'shadow-slash', color: '#cbd5e1', accent: '#334155' },
  },
  {
    id: 'knight',
    name: 'Knight',
    glyph: '⚔️',
    color: '#f1f5f9',
    accent: '#cbd5e1',
    finisher: { name: 'Radiant Lance', type: 'lance', color: '#f8fafc', accent: '#facc15' },
  },
  {
    id: 'fox',
    name: 'Fox',
    glyph: '🦊',
    color: '#fb923c',
    accent: '#ea580c',
    finisher: { name: 'Ember Rush', type: 'ember', color: '#fdba74', accent: '#ea580c' },
  },
  {
    id: 'witch',
    name: 'Witch',
    glyph: '🧛',
    color: '#f472b6',
    accent: '#db2777',
    finisher: { name: 'Hex Spiral', type: 'hex', color: '#f9a8d4', accent: '#db2777' },
  },
  {
    id: 'pirate',
    name: 'Pirate',
    glyph: '🏴‍☠️',
    color: '#facc15',
    accent: '#ca8a04',
    finisher: { name: 'Cannon Volley', type: 'cannon', color: '#fde68a', accent: '#92400e' },
  },
  {
    id: 'astronaut',
    name: 'Astronaut',
    glyph: '👨‍🚀',
    color: '#60a5fa',
    accent: '#2563eb',
    finisher: { name: 'Orbital Drop', type: 'orbital', color: '#bfdbfe', accent: '#2563eb' },
  },
  {
    id: 'samurai',
    name: 'Samurai',
    glyph: '🗡️',
    color: '#f87171',
    accent: '#dc2626',
    finisher: { name: 'Blade Storm', type: 'blade', color: '#fecaca', accent: '#dc2626' },
  },
  {
    id: 'dragon',
    name: 'Dragon',
    glyph: '🐉',
    color: '#34d399',
    accent: '#059669',
    finisher: { name: 'Flame Thrower', type: 'flame', color: '#fb923c', accent: '#dc2626' },
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c])
);

export const getCharacter = (id) =>
  CHARACTER_BY_ID[id] || {
    id: 'unknown',
    name: '?',
    glyph: '❓',
    color: '#818cf8',
    accent: '#4f46e5',
    finisher: { name: 'Pulse Strike', type: 'laser', color: '#818cf8', accent: '#4f46e5' },
  };
