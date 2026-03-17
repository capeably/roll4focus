// ============================================================
// STATE
// ============================================================
const DEFAULT_SOUNDTRACKS = [
  "Binaural Focus Cafe",
  "MyNoise – Pure Tones for Focus",
  "Spotify – World Music for Focus",
  "Spotify – Focus Groove",
  "Spotify – Focus Mix",
  "Launchy – Dannic Groove Cruise OR SomaFM thetrip",
  "Launchy – Lifescapes Forest OR SomaFM Thistle (Celtic)",
  "Launchy – SomaFM Suburbs of Goa",
  "Launchy – SomaFM GrooveSalad",
  "Spotify – Energico OR ADHD + Energico",
  "Spotify – Focus Groove",
  "Launchy – SomaFM GrooveSalad",
  "Launchy – SomaFM GrooveSalad",
  "Launchy – Dannic Groove Cruise OR SomaFM thetrip",
  "Podcast OR Roll Again",
  "Podcast OR Roll Again",
  "Your Choice!",
  "Your Choice!",
  "Your Choice!",
  "Your Choice!",
];

let state = {
  inspiration: 0, penalty: 0, baseTime: 10,
  bossDcDefault: 24, minionDcDefault: 18,
  hopeFearDie: 20, soundtrackDie: 20,
  tickingEnabled: false, startSoundEnabled: false,
  inspirationSoundEnabled: false, minionCountdownEnabled: true,
  minionAutoFight: false, minionInterval: 10,
  diceRollSoundEnabled: false, battleEarnedSoundEnabled: false,
  attackSuccessSoundEnabled: false, attackFailSoundEnabled: false,
  openChestSoundEnabled: false,
  breakStartSoundEnabled: false, breakFinishSoundEnabled: false,
  minionCountdownSeconds: 600, minionCountdownInterval: null,
  minionBattlesEarned: 0, minionBattlesFought: 0, minionBattlesWon: 0,
  minionChestsEarned: 0, minionChestsOpened: 0,
  bossManualAdj: 0, minionManualAdj: 0,
  bossBattlesEarned: 0, bossBattlesFought: 0, bossBattlesWon: 0,
  bossChestsEarned: 0, bossChestsOpened: 0,
  bossDcScaling: 3, manualBossMinutes: 20,
  manualTimeLogs: [], soundtracks: [...DEFAULT_SOUNDTRACKS],
  battleLogs: [], logs: [],
  diceNames: [], currentDiceName: '',
  lastResetTimestamp: new Date().toISOString(),
  hopeRolls: [], fearRolls: [], soundRolls: [],
  currentStreak: 0, longestStreak: 0,
  timerSeconds: 0, timerTotal: 0, timerRunning: false,
  timerInterval: null, tickInterval: null, currentSession: null,
};

// ============================================================
// PERSISTENCE — data-driven save/load with debounced auto-save
// ============================================================
const PERSIST_KEYS = [
  'inspiration','penalty','baseTime','bossDcDefault','minionDcDefault',
  'hopeFearDie','soundtrackDie','tickingEnabled','startSoundEnabled',
  'inspirationSoundEnabled','minionCountdownEnabled','minionAutoFight',
  'minionInterval','diceRollSoundEnabled','battleEarnedSoundEnabled',
  'attackSuccessSoundEnabled','attackFailSoundEnabled','openChestSoundEnabled',
  'breakStartSoundEnabled','breakFinishSoundEnabled',
  'minionBattlesEarned','minionBattlesFought','minionBattlesWon',
  'minionChestsEarned','minionChestsOpened','bossManualAdj','minionManualAdj',
  'bossBattlesEarned','bossBattlesFought','bossBattlesWon',
  'bossChestsEarned','bossChestsOpened','bossDcScaling','manualBossMinutes',
  'manualTimeLogs','soundtracks','battleLogs','logs',
  'timerSeconds','timerTotal','minionCountdownSeconds',
  'diceNames','currentDiceName',
  'lastResetTimestamp','hopeRolls','fearRolls','soundRolls',
  'currentStreak','longestStreak',
];

let _saveDirty = false, _saveTimer = null;

function saveState() {
  const toSave = {};
  PERSIST_KEYS.forEach(k => toSave[k] = state[k]);
  localStorage.setItem('r4f_state', JSON.stringify(toSave));
  _saveDirty = false;
}

function markDirty() {
  _saveDirty = true;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveState, 1500);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('r4f_state') || '{}');
    PERSIST_KEYS.forEach(k => { if (saved[k] !== undefined) state[k] = saved[k]; });
    // Backward compat: old key was 'dcDefault'
    if (saved.dcDefault !== undefined && saved.bossDcDefault === undefined) {
      state.bossDcDefault = saved.dcDefault;
    }
    if (state.minionCountdownSeconds > 0) {
      state.minionCountdownSeconds = Math.min(state.minionCountdownSeconds, state.minionInterval * 60);
    }
  } catch(e) {}
}
