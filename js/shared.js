// ── Shared constants & data ───────────────────────────────────────────────────
// Loaded by both index.html (game) and settings.html before their own scripts.

const VERSION = 'v0.4.0';
const VERSION_DATE = '2026-04-05';

const CHAR_STORAGE_KEY     = 'blockrunner_chars_v1';
const GAMEPLAY_STORAGE_KEY = 'blockrunner_gameplay_v1';

const GP_DEFAULTS = {
  speedStart:       320,
  speedReward:      40,
  speedPenalty:     30,
  maxGap:           2,
  dialogueFirst:    30,
  dialogueInterval: 120,
  levelLength:      50,
};

// Default characters — overridden by localStorage on boot
const CHARACTERS = [
  { name: 'Rex',    color: '#22c55e', moods: { default: '🦕', happy: '🥳', angry: '🦖', sad: '😢' }, imgs: {}, _imgData: {}, interactions: [] },
  { name: 'R0B0',   color: '#60a5fa', moods: { default: '🤖', happy: '🤩', angry: '💢', sad: '🔋' }, imgs: {}, _imgData: {}, interactions: [] },
  { name: 'Merlin', color: '#c084fc', moods: { default: '🧙', happy: '✨', angry: '🤬', sad: '😔' }, imgs: {}, _imgData: {}, interactions: [] },
];

function loadCharactersFromStorage() {
  try {
    const raw = localStorage.getItem(CHAR_STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored) || stored.length === 0) return;
    CHARACTERS.length = 0;
    stored.forEach(s => {
      const ch = {
        name:         s.name  || 'Character',
        color:        s.color || '#888888',
        moods:        s.moods || { default: '⭐', happy: '🥳', angry: '😤', sad: '😢' },
        imgs:         {},
        _imgData:     {},
        interactions: Array.isArray(s.interactions) ? s.interactions : [],
      };
      ['default','happy','angry','sad'].forEach(mood => {
        if (s.images && s.images[mood]) {
          ch._imgData[mood] = s.images[mood];
          const img = new Image();
          img.src = s.images[mood];
          ch.imgs[mood] = img;
        }
      });
      CHARACTERS.push(ch);
    });
  } catch(e) { /* corrupt storage – ignore */ }
}
