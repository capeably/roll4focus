// ============================================================
// SETTINGS
// ============================================================
// Settings ↔ DOM mapping: [elementId, stateKey, type, default]
const SETTINGS_MAP = [
  ['baseTimeSetting',         'baseTime',               'int', 10],
  ['bossDcDefaultSetting',    'bossDcDefault',           'int', 24],
  ['minionDcDefaultSetting',  'minionDcDefault',         'int', 18],
  ['hopeFearDieSetting',      'hopeFearDie',             'int', 20],
  ['soundtrackDieSetting',    'soundtrackDie',           'int', 20],
  ['minionIntervalSetting',   'minionInterval',          'int', 10],
  ['bossDcScalingSetting',    'bossDcScaling',           'int',  3],
  ['manualBossMinutesSetting','manualBossMinutes',       'int', 20],
  ['tickingToggle',           'tickingEnabled',          'bool'],
  ['startSoundToggle',        'startSoundEnabled',       'bool'],
  ['inspirationSoundToggle',  'inspirationSoundEnabled',  'bool'],
  ['diceRollSoundToggle',     'diceRollSoundEnabled',    'bool'],
  ['battleEarnedSoundToggle', 'battleEarnedSoundEnabled', 'bool'],
  ['attackSuccessSoundToggle','attackSuccessSoundEnabled','bool'],
  ['attackFailSoundToggle',   'attackFailSoundEnabled',  'bool'],
  ['openChestSoundToggle',    'openChestSoundEnabled',   'bool'],
  ['minionAutoFightToggle',   'minionAutoFight',         'bool'],
  ['minionCountdownToggle',   'minionCountdownEnabled',  'bool'],
  ['breakStartSoundToggle',   'breakStartSoundEnabled',  'bool'],
  ['breakFinishSoundToggle',  'breakFinishSoundEnabled', 'bool'],
];

function hydrateSettings() {
  SETTINGS_MAP.forEach(([elId, key, type]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    if (type === 'bool') el.checked = state[key]; else el.value = state[key];
  });
}

function readSettings() {
  SETTINGS_MAP.forEach(([elId, key, type, def]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    if (type === 'bool') state[key] = el.checked; else state[key] = parseInt(el.value) || def;
  });
}

function saveSettings() {
  readSettings();
  if (!state.timerRunning) { state.minionCountdownSeconds = state.minionInterval * 60; updateMinionCountdownDisplay(); }
  updateDCDisplays();
  const rows = document.querySelectorAll('#soundtrackTableBody tr');
  rows.forEach((row, i) => { const input = row.querySelector('input[type="text"]'); if (input) state.soundtracks[i] = input.value; });
  markDirty();
}

function importSoundtrackCSV(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l);
    const dataLines = lines.filter(l => { const first = l.split(',')[0].replace(/"/g,'').trim(); return !isNaN(parseInt(first)); });
    if (dataLines.length === 0) { showToast('No valid rows found in CSV'); return; }
    dataLines.forEach(line => {
      const match = line.match(/^"?(\d+)"?,(.+)$/);
      if (!match) return;
      const idx = parseInt(match[1]) - 1;
      const name = match[2].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      if (idx >= 0 && idx < state.soundtracks.length) state.soundtracks[idx] = name;
    });
    buildSoundtrackTable(); markDirty();
    showToast(`Imported ${dataLines.length} soundtrack(s)`);
    event.target.value = '';
  };
  reader.readAsText(file);
}

function buildSoundtrackTable() {
  const tbody = document.getElementById('soundtrackTableBody');
  tbody.innerHTML = '';
  for (let i = 0; i < state.soundtracks.length; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td><input type="text" value="${escapeHtml(state.soundtracks[i])}" onblur="saveSettings()"></td>`;
    tbody.appendChild(tr);
  }
}


// SETTINGS IMPORT / EXPORT
// ============================================================
function exportSettings() {
  const config = { version: 1 };
  SETTINGS_MAP.forEach(([, key]) => { config[key] = state[key]; });
  config.soundtracks = state.soundtracks;
  config.diceNames = state.diceNames;
  config.currentDiceName = state.currentDiceName;
  config.notes = localStorage.getItem('r4f_notes') || '';
  config.notesTab = localStorage.getItem('r4f_notes_tab') || '';
  if (document.getElementById('exportSoundsToggle').checked) {
    const sounds = {};
    Object.keys(Sound._registry).forEach(key => {
      const stored = localStorage.getItem(Sound._registry[key].storageKey);
      if (stored) sounds[key] = JSON.parse(stored);
    });
    if (Object.keys(sounds).length) config.soundData = sounds;
  }
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `r4f-config-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Config exported!');
}

function importSettings(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const cfg = JSON.parse(e.target.result);
      SETTINGS_MAP.forEach(([, key]) => { if (cfg[key] !== undefined) state[key] = cfg[key]; });
      if (cfg.soundtracks) state.soundtracks = cfg.soundtracks;
      if (cfg.diceNames) state.diceNames = cfg.diceNames;
      if (cfg.currentDiceName !== undefined) state.currentDiceName = cfg.currentDiceName;
      if (cfg.notes !== undefined) {
        localStorage.setItem('r4f_notes', cfg.notes);
      }
      if (cfg.notesTab !== undefined) {
        localStorage.setItem('r4f_notes_tab', cfg.notesTab);
        document.getElementById('notesInputTab').value = cfg.notesTab;
      }
      if (cfg.soundData && document.getElementById('exportSoundsToggle').checked) {
        Object.keys(cfg.soundData).forEach(key => {
          const reg = Sound._registry[key];
          if (!reg) return;
          const entry = cfg.soundData[key];
          try { localStorage.setItem(reg.storageKey, JSON.stringify(entry)); } catch(e) {}
          const audioEl = document.getElementById(reg.audioId);
          const dispEl = document.getElementById(reg.displayId);
          if (audioEl && entry.data) audioEl.src = entry.data;
          if (dispEl && entry.name) dispEl.textContent = entry.name;
        });
      }
      hydrateSettings(); buildSoundtrackTable(); updateDCDisplays(); updateDiceNamesChip(); markDirty();
      showToast('Config imported!');
    } catch(err) { showToast('Invalid config file'); }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ============================================================
