// ============================================================
// STATS DISPLAY
// ============================================================
function updateStatsDisplay() {
  const sess = state.currentSession || {};
  document.getElementById('statHope').textContent = sess.hope !== undefined ? sess.hope : '—';
  document.getElementById('statFear').textContent = sess.fear !== undefined ? sess.fear : '—';
  document.getElementById('statSound').textContent = sess.sound !== undefined ? sess.sound : '—';
  document.getElementById('statInspiration').textContent = state.inspiration;
  document.getElementById('statPenalty').textContent = state.penalty;
}

// Boss Edit Modal
function openBossEditModal() {
  document.getElementById('bossEditAttackInput').value = '';
  document.getElementById('qbBossRoll').value = '';
  updateBossEditModal();
  openModal('bossEditModal');
  setTimeout(() => document.getElementById('bossEditAttackInput').focus(), 50);
}

function updateBossEditModal() {
  const rem = state.bossBattlesEarned - state.bossBattlesFought;
  const chRem = state.bossChestsEarned - state.bossChestsOpened;
  document.getElementById('bossEditDCVal').textContent = getBossDC();
  document.getElementById('bossEditBattlesVal').textContent = rem;
  document.getElementById('bossEditChestsVal').textContent = chRem;
}

function confirmBossEdit() {
  const raw = document.getElementById('bossEditAttackInput').value.trim();
  if (raw !== '') {
    const val = parseInt(raw);
    if (isNaN(val) || val < 1) { showToast('Enter a valid roll (1–20)'); return; }
    document.getElementById('qbBossRoll').value = val;
  }
  closeModal('bossEditModal');
  if (state.bossBattlesEarned - state.bossBattlesFought > 0) bossAttack();
}

// Minion Edit Modal
function openMinionEditModal() {
  document.getElementById('minionEditAttackInput').value = '';
  document.getElementById('qbMinionRoll').value = '';
  updateMinionEditModal();
  openModal('minionEditModal');
  setTimeout(() => document.getElementById('minionEditAttackInput').focus(), 50);
}

function updateMinionEditModal() {
  const rem = state.minionBattlesEarned - state.minionBattlesFought;
  const chRem = state.minionChestsEarned - state.minionChestsOpened;
  document.getElementById('minionEditDCVal').textContent = getMinionDC();
  document.getElementById('minionEditBattlesVal').textContent = rem;
  document.getElementById('minionEditChestsVal').textContent = chRem;
  document.getElementById('minionEditAutoFight').checked = state.minionAutoFight;
}

function confirmMinionEdit() {
  const raw = document.getElementById('minionEditAttackInput').value.trim();
  if (raw !== '') {
    const val = parseInt(raw);
    if (isNaN(val) || val < 1) { showToast('Enter a valid roll (1–20)'); return; }
    document.getElementById('qbMinionRoll').value = val;
  }
  closeModal('minionEditModal');
  if (state.minionBattlesEarned - state.minionBattlesFought > 0) minionAttack();
}

// ============================================================
// CSV LOG IMPORT
// ============================================================
function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function importBattleCSV(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    if (lines.length < 2) { showToast('No data found in file'); return; }
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 6) continue;
      let timestamp, type, rollType, diceName = '', roll, dc, success, diceSides;
      if (cols.length >= 7) {
        [timestamp, type, rollType, diceName, roll, dc, success, diceSides] = cols;
      } else {
        [timestamp, type, rollType, roll, dc, success] = cols;
      }
      const rollNum = parseInt(roll), dcNum = parseInt(dc);
      if (isNaN(rollNum) || isNaN(dcNum)) continue;
      state.battleLogs.push({
        type: type.trim(), rollType: rollType.trim(),
        diceName: diceName ? diceName.trim() : '',
        roll: rollNum, dc: dcNum,
        diceSides: parseInt(diceSides) || 20,
        won: (success || '').trim().toLowerCase().startsWith('y'),
        timestamp: timestamp.trim(),
      });
      imported++;
    }
    state.battleLogs.sort((a, b) => {
      const da = new Date(a.timestamp), db = new Date(b.timestamp);
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });
    markDirty(); renderBattleLogs(); updateMetrics();
    showToast(`Imported ${imported} battle log(s)`);
    event.target.value = '';
  };
  reader.readAsText(file);
}

function importSessionCSV(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    if (lines.length < 2) { showToast('No data found in file'); return; }
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 6) continue;
      const [timestamp, hope, fear, sound, soundtrack, duration, success,
        hfRollType, sRollType, hfDie, sDie] = cols;
      state.logs.push({
        hope: hope.trim() || '—', fear: fear.trim() || '—',
        sound: sound.trim() || '—', soundtrack: soundtrack.trim() || '—',
        duration: parseInt(duration) || 0,
        success: (success || '').trim().toLowerCase().startsWith('y'),
        hopeFearRollType: (hfRollType || '').trim() || '—',
        soundRollType: (sRollType || '').trim() || '—',
        hopeFearDie: parseInt(hfDie) || '—',
        soundtrackDie: parseInt(sDie) || '—',
        timestamp: timestamp.trim(),
      });
      imported++;
    }
    state.logs.sort((a, b) => {
      const da = new Date(a.timestamp), db = new Date(b.timestamp);
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });
    markDirty(); renderLogs(); updateAdventuringTime();
    showToast(`Imported ${imported} session(s)`);
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ============================================================
// METRICS
// ============================================================
function updateMetrics() {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // --- Battle stats (from state counters, already scoped to adventuring day) ---
  setText('metBossEarned', state.bossBattlesEarned);
  setText('metBossFought', state.bossBattlesFought);
  setText('metBossWon', state.bossBattlesWon);
  setText('metBossRemaining', state.bossBattlesEarned - state.bossBattlesFought);
  setText('metBossChEarned', state.bossChestsEarned);
  setText('metBossChOpened', state.bossChestsOpened);
  setText('metBossChRemaining', state.bossChestsEarned - state.bossChestsOpened);
  setText('metMinEarned', state.minionBattlesEarned);
  setText('metMinFought', state.minionBattlesFought);
  setText('metMinWon', state.minionBattlesWon);
  setText('metMinRemaining', state.minionBattlesEarned - state.minionBattlesFought);
  setText('metMinChEarned', state.minionChestsEarned);
  setText('metMinChOpened', state.minionChestsOpened);
  setText('metMinChRemaining', state.minionChestsEarned - state.minionChestsOpened);

  // --- Dice roll averages (filter battleLogs by lastResetTimestamp) ---
  const resetTs = state.lastResetTimestamp ? new Date(state.lastResetTimestamp) : new Date(0);
  const dayLogs = (state.battleLogs || []).filter(e => {
    const d = new Date(e.timestamp);
    return !isNaN(d) && d >= resetTs;
  });

  function avgAndCount(arr) {
    if (!arr.length) return { avg: '—', count: 0 };
    return { avg: (arr.reduce((s, e) => s + e.roll, 0) / arr.length).toFixed(1), count: arr.length };
  }

  const setMetric = (id, data) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (data.count === 0) el.textContent = '—';
    else el.innerHTML = data.avg + ' <span class="metrics-count">(\u00d7' + data.count + ')</span>';
  };

  setMetric('metricBossAuto',    avgAndCount(dayLogs.filter(e => e.type === 'boss'   && e.rollType === 'auto')));
  setMetric('metricBossManual',  avgAndCount(dayLogs.filter(e => e.type === 'boss'   && e.rollType === 'manual')));
  setMetric('metricMinionAuto',  avgAndCount(dayLogs.filter(e => e.type === 'minion' && e.rollType === 'auto')));
  setMetric('metricMinionManual',avgAndCount(dayLogs.filter(e => e.type === 'minion' && e.rollType === 'manual')));

  // --- Most-rolled Hope/Fear/Sound ---
  function mostRolled(arr) {
    if (!arr || !arr.length) return '—';
    const freq = {};
    arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    let maxVal = 0, maxKey = null;
    Object.entries(freq).forEach(([k, c]) => { if (c > maxVal) { maxVal = c; maxKey = k; } });
    return maxVal > 1 ? maxKey + ' (\u00d7' + maxVal + ')' : '' + maxKey;
  }
  setText('metMostHope', mostRolled(state.hopeRolls));
  setText('metMostFear', mostRolled(state.fearRolls));
  setText('metMostSound', mostRolled(state.soundRolls));
}

// ============================================================

// ============================================================
// DICE NAMES
// ============================================================
function renderDiceNamesList() {
  const list = document.getElementById('diceNamesList');
  if (!list) return;
  if (!state.diceNames.length) {
    list.innerHTML = '<div style="color:var(--text3);font-style:italic;padding:8px 0;text-align:center;">No dice names yet. Add one above.</div>';
    return;
  }
  list.innerHTML = state.diceNames.map((name, i) => {
    const active = name === state.currentDiceName;
    const safeName = escapeHtml(name).replace(/'/g, '&#39;');
    return `<div class="dice-name-row ${active ? 'active' : ''}">
      <span class="dice-name-label">${escapeHtml(name)}</span>
      <button class="btn-use-dice ${active ? 'active' : ''}" onclick="setCurrentDiceName('${safeName}')">
        ${active ? '✓ Active' : '◉ Use'}
      </button>
      <button class="btn-delete-dice" onclick="deleteDiceName(${i})">✕</button>
    </div>`;
  }).join('');
}

function addDiceName() {
  const input = document.getElementById('diceNameInput');
  const name = input.value.trim();
  if (!name) return;
  if (state.diceNames.includes(name)) { showToast('Name already exists'); return; }
  state.diceNames.push(name);
  input.value = '';
  markDirty(); renderDiceNamesList(); updateDiceNamesChip();
}

function deleteDiceName(i) {
  if (state.currentDiceName === state.diceNames[i]) state.currentDiceName = '';
  state.diceNames.splice(i, 1);
  markDirty(); renderDiceNamesList(); updateDiceNamesChip();
}

function setCurrentDiceName(name) {
  state.currentDiceName = name;
  markDirty(); renderDiceNamesList(); updateDiceNamesChip();
}

function updateDiceNamesChip() {
  const chip = document.getElementById('currentDiceNameChip');
  if (!chip) return;
  if (state.currentDiceName) {
    chip.textContent = state.currentDiceName;
    chip.style.color = 'var(--gold2)';
    chip.style.fontStyle = 'normal';
    chip.style.borderColor = 'var(--gold)';
  } else {
    chip.textContent = '— None —';
    chip.style.color = 'var(--text3)';
    chip.style.fontStyle = 'italic';
    chip.style.borderColor = 'var(--border2)';
  }
}

function openDiceNamesModal() {
  renderDiceNamesList();
  openModal('diceNamesModal');
  setTimeout(() => document.getElementById('diceNameInput').focus(), 50);
}

// ============================================================
// NOTES & MARKDOWN
// ============================================================
function createNotesController(cfg) {
  let mode = 'edit';
  return {
    save() { localStorage.setItem(cfg.storageKey, document.getElementById(cfg.inputId).value); },
    load() { document.getElementById(cfg.inputId).value = localStorage.getItem(cfg.storageKey) || ''; },
    toggle() {
      const btn = document.getElementById(cfg.btnId);
      if (mode === 'edit') {
        mode = 'preview';
        document.getElementById(cfg.previewId).innerHTML = parseMarkdown(document.getElementById(cfg.inputId).value);
        document.getElementById(cfg.editorId).style.display = 'none';
        document.getElementById(cfg.previewId).style.display = 'block';
        btn.textContent = '✎ Edit';
      } else {
        mode = 'edit';
        document.getElementById(cfg.editorId).style.display = 'block';
        document.getElementById(cfg.previewId).style.display = 'none';
        btn.textContent = '👁 Preview';
      }
    }
  };
}
const TabNotes  = createNotesController({ inputId:'notesInputTab', previewId:'notesPreviewTab', editorId:'notesEditorTab', btnId:'notesModeTabBtn', storageKey:'r4f_notes_tab' });

function saveNotesTab() { TabNotes.save(); }
function loadNotesTab() { TabNotes.load(); }
function toggleNotesModeTab() { TabNotes.toggle(); }

function parseMarkdown(md) {
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[-*] /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>');
  html = html.replace(/\n{2,}/g, '\n');
  return html;
}

// ============================================================
// ADVENTURING TIME & MANUAL TIME
// ============================================================
function updateAdventuringTime() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const daysFromMon = (dayOfWeek + 6) % 7;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMon);
  let todayMins = 0, weekMins = 0;
  state.logs.forEach(log => {
    if (!log.success) return;
    const logDate = new Date(log.timestamp); if (isNaN(logDate)) return;
    if (logDate >= todayStart) todayMins += (log.duration || 0);
    if (logDate >= weekStart) weekMins += (log.duration || 0);
  });
  (state.manualTimeLogs || []).forEach(entry => {
    const entryDate = new Date(entry.timestamp); if (isNaN(entryDate)) return;
    if (entryDate >= todayStart) todayMins += (entry.mins || 0);
    if (entryDate >= weekStart) weekMins += (entry.mins || 0);
  });
  const fmt = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };
  document.getElementById('advTimeToday').textContent = fmt(todayMins);
  document.getElementById('advTimeWeek').textContent = fmt(weekMins);
}

function openManualTimeDialog() {
  document.getElementById('manualTimeHours').value = '';
  document.getElementById('manualTimeMinutes').value = '';
  openModal('manualTimeModal');
  document.getElementById('manualTimeHours').focus();
}

function confirmManualTime() {
  const hours = parseInt(document.getElementById('manualTimeHours').value) || 0;
  const mins  = parseInt(document.getElementById('manualTimeMinutes').value) || 0;
  const totalMins = hours * 60 + mins;
  if (totalMins <= 0) { showToast('Enter at least 1 minute'); return; }
  state.manualTimeLogs = state.manualTimeLogs || [];
  state.manualTimeLogs.push({ mins: totalMins, timestamp: new Date().toLocaleString() });
  const minionBattlesGained = Math.floor(totalMins / state.minionInterval);
  if (minionBattlesGained > 0) { state.minionBattlesEarned += minionBattlesGained; updateMinionUI(); }
  const bossBattlesGained = Math.floor(totalMins / state.manualBossMinutes);
  if (bossBattlesGained > 0) { state.bossBattlesEarned += bossBattlesGained; updateBossUI(); }
  if (bossBattlesGained > 0) {
    adjustCounter('inspiration', bossBattlesGained);
    flashInspiration(); playInspirationSound();
  }
  markDirty(); updateAdventuringTime(); closeModal('manualTimeModal');
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0)  parts.push(`${mins}m`);
  let msg = `+${parts.join(' ')} logged`;
  if (minionBattlesGained > 0) msg += ` · +${minionBattlesGained} Minion`;
  if (bossBattlesGained > 0)   msg += ` · +${bossBattlesGained} Boss · +${bossBattlesGained} Insp`;
  showToast(msg);
}

// ============================================================
// TABS
// ============================================================
function switchTab(name, e) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  e.target.classList.add('active');
  if (name === 'logs') { renderBattleLogs(); renderLogs(); }
}

function switchSubTab(name, e) {
  document.querySelectorAll('.sub-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('subtab-' + name).classList.add('active');
  e.target.classList.add('active');
  if (name === 'battles') renderBattleLogs();
  if (name === 'sessions') renderLogs();
}

// ============================================================
// CSV EXPORT HELPER
// ============================================================
function downloadCSV(filename, headers, rows) {
  const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ============================================================
// BATTLE LOGS
// ============================================================
function logBattle(type, rollType, roll, won, dc) {
  state.battleLogs = state.battleLogs || [];
  state.battleLogs.unshift({
    type, rollType, roll, won, dc,
    diceSides: 20,
    diceName: rollType === 'manual' ? (state.currentDiceName || '') : '',
    timestamp: new Date().toLocaleString(),
  });
  markDirty();
  updateMetrics();
}

function renderBattleLogs() {
  const container = document.getElementById('battleLogsContainer');
  if (!container) return;
  if (!state.battleLogs || state.battleLogs.length === 0) {
    container.innerHTML = '<div class="logs-empty">No battles logged yet.<br>Attack a Boss or Minion to see battles here.</div>';
    return;
  }
  container.innerHTML = state.battleLogs.map((log, i) => {
    const diceTag = (log.rollType === 'manual' && log.diceName)
      ? `<span class="dice-name-badge">${escapeHtml(log.diceName)}</span>` : '';
    return `
    <div class="battle-log-entry ${log.won ? 'success' : 'fail'}">
      <div class="battle-log-roll ${log.type}">${log.roll}</div>
      <div class="battle-log-details">
        <div class="battle-log-type">
          ${log.type === 'boss' ? '⚔ Boss Battle' : '⚔ Minion Battle'}
          <span class="roll-type-badge ${log.rollType}">${log.rollType}</span>${diceTag}
        </div>
        <span class="log-result ${log.won ? 'success' : 'fail'}">${log.won ? 'Success' : 'Fail'}</span>
        <span class="battle-log-dc">DC ${log.dc} · Rolled ${log.roll}</span>
      </div>
      <div class="log-actions">
        <div class="log-timestamp">${escapeHtml(log.timestamp)}</div>
        <button class="btn-log-edit" onclick="openBattleLogEdit(${i})" title="Edit">✎</button>
      </div>
    </div>`;
  }).join('');
}

function clearBattleLogs() { if (confirm('Clear all battle logs?')) { state.battleLogs = []; markDirty(); renderBattleLogs(); updateMetrics(); } }

function exportBattleCSV() {
  if (!state.battleLogs || state.battleLogs.length === 0) { showToast('No battle logs to export'); return; }
  const headers = ['Timestamp','Battle Type','Roll Type','Dice Name','Roll','DC','Success','Dice Sides'];
  const rows = state.battleLogs.map(log => [
    `"${log.timestamp}"`, log.type, log.rollType || 'auto',
    `"${(log.diceName || '').replace(/"/g,'""')}"`,
    log.roll, log.dc, log.won ? 'Yes' : 'No', log.diceSides || ''
  ]);
  downloadCSV('roll4focus-battles', headers, rows);
  showToast('Battle logs exported!');
}


// ============================================================
// SESSION LOGS
// ============================================================
function renderLogs() {
  const container = document.getElementById('logsContainer');
  if (state.logs.length === 0) {
    container.innerHTML = '<div class="logs-empty">No sessions logged yet.<br>Complete a session to see it here.</div>';
    return;
  }
  container.innerHTML = state.logs.map((log, i) => `
    <div class="log-entry ${log.success ? 'success' : 'fail'}">
      <div class="log-dice">
        <div class="log-die hope" title="Hope">⚐ ${log.hope}</div>
        <div class="log-die fear" title="Fear">⚑ ${log.fear}</div>
        <div class="log-die sound" title="Soundtrack">♪ ${log.sound}</div>
      </div>
      <div class="log-details">
        <span class="log-result ${log.success ? 'success' : 'fail'}">${log.success ? 'Success' : 'Incomplete'}</span>
        <div class="log-soundtrack">${escapeHtml(log.soundtrack)}</div>
        <div class="log-duration">${log.duration} minutes</div>
      </div>
      <div class="log-actions">
        <div class="log-timestamp">${escapeHtml(log.timestamp)}</div>
        <button class="btn-log-edit" onclick="openSessionLogEdit(${i})" title="Edit">✎</button>
      </div>
    </div>
  `).join('');
}

function exportCSV() {
  if (state.logs.length === 0) { showToast('No logs to export'); return; }
  const headers = ['Timestamp','Hope Roll','Fear Roll','Soundtrack Roll','Soundtrack','Duration (min)','Success',
    'Hope/Fear Roll Type','Soundtrack Roll Type','Hope/Fear Die','Soundtrack Die'];
  const rows = state.logs.map(log => [
    `"${log.timestamp}"`, log.hope, log.fear, log.sound,
    `"${(log.soundtrack || '').replace(/"/g,'""')}"`, log.duration, log.success ? 'Yes' : 'No',
    log.hopeFearRollType || '', log.soundRollType || '', log.hopeFearDie || '', log.soundtrackDie || ''
  ]);
  downloadCSV('roll4focus-logs', headers, rows);
  showToast('Logs exported!');
}

function clearLogs() { if (confirm('Clear all session logs?')) { state.logs = []; markDirty(); renderLogs(); } }

// ============================================================
// LOG EDITING
// ============================================================
let _editingSessionIdx = -1;
let _editingBattleIdx = -1;

function openSessionLogEdit(idx) {
  _editingSessionIdx = idx;
  const log = state.logs[idx];
  if (!log) return;
  document.getElementById('editSessionHope').value = log.hope === '—' ? '' : log.hope;
  document.getElementById('editSessionFear').value = log.fear === '—' ? '' : log.fear;
  document.getElementById('editSessionSound').value = log.sound === '—' ? '' : log.sound;
  document.getElementById('editSessionSoundtrack').value = log.soundtrack === '—' ? '' : log.soundtrack;
  document.getElementById('editSessionDuration').value = log.duration || '';
  document.getElementById('editSessionSuccess').value = log.success ? 'yes' : 'no';
  document.getElementById('editSessionHFRollType').value = log.hopeFearRollType === 'auto' ? 'auto' : 'manual';
  document.getElementById('editSessionSRollType').value = log.soundRollType === 'auto' ? 'auto' : 'manual';
  document.getElementById('editSessionHFDie').value = log.hopeFearDie === '—' ? '' : (log.hopeFearDie || '');
  document.getElementById('editSessionSDie').value = log.soundtrackDie === '—' ? '' : (log.soundtrackDie || '');
  document.getElementById('editSessionTimestamp').value = log.timestamp || '';
  openModal('sessionLogEditModal');
}

function saveSessionLogEdit() {
  if (_editingSessionIdx < 0 || !state.logs[_editingSessionIdx]) return;
  const log = state.logs[_editingSessionIdx];
  const hopeVal = document.getElementById('editSessionHope').value.trim();
  const fearVal = document.getElementById('editSessionFear').value.trim();
  const soundVal = document.getElementById('editSessionSound').value.trim();
  log.hope = hopeVal ? parseInt(hopeVal) : '—';
  log.fear = fearVal ? parseInt(fearVal) : '—';
  log.sound = soundVal ? parseInt(soundVal) : '—';
  log.soundtrack = document.getElementById('editSessionSoundtrack').value.trim() || '—';
  log.duration = parseInt(document.getElementById('editSessionDuration').value) || 0;
  log.success = document.getElementById('editSessionSuccess').value === 'yes';
  log.hopeFearRollType = document.getElementById('editSessionHFRollType').value;
  log.soundRollType = document.getElementById('editSessionSRollType').value;
  const hfDie = document.getElementById('editSessionHFDie').value.trim();
  const sDie = document.getElementById('editSessionSDie').value.trim();
  log.hopeFearDie = hfDie ? parseInt(hfDie) : '—';
  log.soundtrackDie = sDie ? parseInt(sDie) : '—';
  log.timestamp = document.getElementById('editSessionTimestamp').value.trim() || log.timestamp;
  markDirty(); renderLogs(); closeModal('sessionLogEditModal');
  showToast('Session log updated');
}

function openBattleLogEdit(idx) {
  _editingBattleIdx = idx;
  const log = state.battleLogs[idx];
  if (!log) return;
  document.getElementById('editBattleType').value = log.type || 'boss';
  document.getElementById('editBattleRollType').value = log.rollType || 'auto';
  document.getElementById('editBattleRoll').value = log.roll || '';
  document.getElementById('editBattleDC').value = log.dc || '';
  document.getElementById('editBattleSuccess').value = log.won ? 'yes' : 'no';
  document.getElementById('editBattleDiceSides').value = log.diceSides || 20;
  document.getElementById('editBattleDiceName').value = log.diceName || '';
  document.getElementById('editBattleTimestamp').value = log.timestamp || '';
  openModal('battleLogEditModal');
}

function saveBattleLogEdit() {
  if (_editingBattleIdx < 0 || !state.battleLogs[_editingBattleIdx]) return;
  const log = state.battleLogs[_editingBattleIdx];
  log.type = document.getElementById('editBattleType').value;
  log.rollType = document.getElementById('editBattleRollType').value;
  log.roll = parseInt(document.getElementById('editBattleRoll').value) || log.roll;
  log.dc = parseInt(document.getElementById('editBattleDC').value) || log.dc;
  log.won = document.getElementById('editBattleSuccess').value === 'yes';
  log.diceSides = parseInt(document.getElementById('editBattleDiceSides').value) || 20;
  log.diceName = document.getElementById('editBattleDiceName').value.trim();
  log.timestamp = document.getElementById('editBattleTimestamp').value.trim() || log.timestamp;
  markDirty(); renderBattleLogs(); updateMetrics(); closeModal('battleLogEditModal');
  showToast('Battle log updated');
}
