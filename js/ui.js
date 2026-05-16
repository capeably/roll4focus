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
  updateStreakDisplay();
}

function updateStreakDisplay() {
  const curEl = document.getElementById('statCurrentStreak');
  const bestEl = document.getElementById('statLongestStreak');
  if (curEl) {
    curEl.textContent = state.currentStreak;
    if (state.currentStreak > 0) curEl.classList.add('fire');
    else curEl.classList.remove('fire');
  }
  if (bestEl) bestEl.textContent = state.longestStreak;
}

// ============================================================
// QUIET MODE
// ============================================================
function toggleQuietMode() {
  state.quietMode = !state.quietMode;
  updateQuietModeUI();
  showToast(state.quietMode ? '🔇 Quiet Mode On' : '🔊 Quiet Mode Off');
  if (state.timerRunning) {
    stopTicking();
    if (!state.quietMode) startTicking();
  }
  markDirty();
}

function updateQuietModeUI() {
  const btn = document.getElementById('quietToggle');
  if (!btn) return;
  if (state.quietMode) { btn.textContent = '🔇'; btn.classList.add('active'); }
  else { btn.textContent = '🔊'; btn.classList.remove('active'); }
}

// ============================================================
// THEME (Classic / Arcade) — stored in r4f_theme localStorage,
// orthogonal to r4f_state so it survives config import/reset.
// ============================================================
function setTheme(name) {
  if (name !== 'classic' && name !== 'arcade') name = 'arcade';
  document.body.classList.toggle('theme-arcade', name === 'arcade');
  try { localStorage.setItem('r4f_theme', name); } catch (e) {}
  const classicBtn = document.getElementById('themeClassicBtn');
  const arcadeBtn  = document.getElementById('themeArcadeBtn');
  if (classicBtn) classicBtn.classList.toggle('active', name === 'classic');
  if (arcadeBtn)  arcadeBtn.classList.toggle('active',  name === 'arcade');
}

function loadTheme() {
  let saved = null;
  try { saved = localStorage.getItem('r4f_theme'); } catch (e) {}
  setTheme(saved === 'classic' ? 'classic' : 'arcade');
}

// Header status chip: count of successful sessions completed today (calendar day).
function updateSessionsTodayChip() {
  const el = document.getElementById('sessionsTodayCount');
  if (!el) return;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  const count = (state.logs || []).filter(l => {
    if (!l.success) return false;
    const t = new Date(l.timestamp).getTime();
    return !isNaN(t) && t >= start && t < end;
  }).length;
  // Always 2-digit pad ("S04 · TODAY")
  el.textContent = count < 10 ? '0' + count : String(count);
}

// Boss Edit Modal
function openBossEditModal() {
  document.getElementById('bossEditAttackInput').value = '';
  document.getElementById('qbBossRoll').value = '';
  updateBossEditModal();
  syncManualEntryKeepOpen();
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

function syncManualEntryKeepOpen() {
  const v = !!state.manualEntryKeepOpen;
  // Old checkbox inputs (kept as no-ops if still present somewhere)
  const b = document.getElementById('bossEditKeepOpen');
  const m = document.getElementById('minionEditKeepOpen');
  if (b) b.checked = v;
  if (m) m.checked = v;
  // New header-link buttons
  ['bossEditKeepOpenBtn', 'minionEditKeepOpenBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-pressed', v ? 'true' : 'false');
  });
}

function toggleManualEntryKeepOpen() {
  state.manualEntryKeepOpen = !state.manualEntryKeepOpen;
  markDirty();
  syncManualEntryKeepOpen();
}

// In-modal "Last Roll" status line — updates the .last-roll element inside
// whichever manual-entry modal is currently open.
function setLastRoll(payload) {
  const lr = document.querySelector('.modal-overlay.show .manual-entry .last-roll');
  if (!lr) return false;
  lr.dataset.variant = payload.variant || '';
  const v = lr.querySelector('.last-roll__value');
  const d = lr.querySelector('.last-roll__detail');
  const c = lr.querySelector('.last-roll__cause');
  if (v) v.textContent = payload.value != null ? payload.value : '—';
  if (d) d.textContent = payload.detail || '';
  if (c) c.textContent = payload.cause || '';
  // Subtle 120ms opacity bump on the value cell
  if (v) {
    v.classList.remove('bump');
    void v.offsetWidth;
    v.classList.add('bump');
  }
  return true;
}

// True if a Boss/Minion manual entry modal is currently shown
function isManualEntryOpen() {
  return !!document.querySelector('.modal-overlay.show .manual-entry');
}

function confirmBossEdit() {
  const input = document.getElementById('bossEditAttackInput');
  const raw = input.value.trim();
  if (raw === '') { closeModal('bossEditModal'); return; }
  const val = parseInt(raw);
  if (isNaN(val) || val < 1) { showToast('Enter a valid roll (1–20)'); return; }
  document.getElementById('qbBossRoll').value = val;
  if (state.manualEntryKeepOpen) {
    if (state.bossBattlesEarned - state.bossBattlesFought > 0) bossAttack();
    input.value = '';
    document.getElementById('qbBossRoll').value = '';
    updateBossEditModal();
    input.focus();
  } else {
    closeModal('bossEditModal');
    if (state.bossBattlesEarned - state.bossBattlesFought > 0) bossAttack();
  }
}

// Minion Edit Modal
function openMinionEditModal() {
  document.getElementById('minionEditAttackInput').value = '';
  document.getElementById('qbMinionRoll').value = '';
  updateMinionEditModal();
  syncManualEntryKeepOpen();
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
  const input = document.getElementById('minionEditAttackInput');
  const raw = input.value.trim();
  if (raw === '') { closeModal('minionEditModal'); return; }
  const val = parseInt(raw);
  if (isNaN(val) || val < 1) { showToast('Enter a valid roll (1–20)'); return; }
  document.getElementById('qbMinionRoll').value = val;
  if (state.manualEntryKeepOpen) {
    if (state.minionBattlesEarned - state.minionBattlesFought > 0) minionAttack();
    input.value = '';
    document.getElementById('qbMinionRoll').value = '';
    updateMinionEditModal();
    input.focus();
  } else {
    closeModal('minionEditModal');
    if (state.minionBattlesEarned - state.minionBattlesFought > 0) minionAttack();
  }
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
    else el.innerHTML = '<span class="metrics-avg">' + data.avg + '</span> <span class="metrics-plus">+' + data.count + '</span>';
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
    let html = '<span class="mr-mainval">' + maxKey + '</span>';
    if (maxVal > 1) html += '<span class="mr-count">\u00d7' + maxVal + '</span>';
    return html;
  }
  function mostRolledHTML(arr) {
    if (!arr || !arr.length) return '<span class="mr-mainval">\u2014</span>';
    return mostRolled(arr);
  }
  const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  setHTML('metMostHope', mostRolledHTML(state.hopeRolls));
  setHTML('metMostFear', mostRolledHTML(state.fearRolls));
  setHTML('metMostSound', mostRolledHTML(state.soundRolls));

  renderTopRolls();
}

// --- Top d20 Rolls (top categories, by interval + offset) ---
function setTopRollsInterval(interval) {
  state.topRollsInterval = interval;
  state.topRollsOffset = 0;
  markDirty();
  renderTopRolls();
}

function nudgeTopRollsOffset(delta) {
  if (state.topRollsInterval === 'all') return;
  const next = (state.topRollsOffset || 0) + delta;
  if (next > 0) return; // can't navigate into the future
  state.topRollsOffset = next;
  markDirty();
  renderTopRolls();
}

// Returns { start, end } in ms epoch for the given interval+offset.
// end is exclusive. For 'all', start=0, end=Infinity.
function topRollsRange(interval, offset) {
  const off = offset || 0;
  if (interval === 'all') return { start: 0, end: Infinity };
  const now = new Date();
  const today00 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (interval === 'today') {
    const start = new Date(today00); start.setDate(start.getDate() + off);
    const end = new Date(start);     end.setDate(end.getDate() + 1);
    return { start: start.getTime(), end: end.getTime() };
  }
  if (interval === '7d') {
    // offset=0: last 7 days inclusive of today
    const end = new Date(today00); end.setDate(end.getDate() + 1 + off * 7);
    const start = new Date(end);   start.setDate(start.getDate() - 7);
    return { start: start.getTime(), end: end.getTime() };
  }
  if (interval === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + off + 1, 1);
    return { start: start.getTime(), end: end.getTime() };
  }
  return { start: 0, end: Infinity };
}

function topRollsRangeLabel(interval, offset, range) {
  if (interval === 'all') return 'All time';
  const off = offset || 0;
  const dateOpts = { year: 'numeric', month: 'short', day: 'numeric' };
  if (interval === 'today') {
    if (off === 0)  return 'Today';
    if (off === -1) return 'Yesterday';
    return new Date(range.start).toLocaleDateString(undefined, dateOpts);
  }
  if (interval === '7d') {
    const startStr = new Date(range.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endStr   = new Date(range.end - 1).toLocaleDateString(undefined, dateOpts);
    return startStr + ' – ' + endStr;
  }
  if (interval === 'month') {
    return new Date(range.start).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }
  return '';
}

function renderTopRolls() {
  const interval = state.topRollsInterval || 'today';
  const offset = state.topRollsOffset || 0;
  document.querySelectorAll('#topRollsIntervalTabs .interval-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.interval === interval);
  });

  const range = topRollsRange(interval, offset);

  // Update navigation row
  const navRow = document.getElementById('topRollsNavRow');
  const navBack = document.getElementById('topRollsNavBack');
  const navFwd  = document.getElementById('topRollsNavFwd');
  const rangeLabel = document.getElementById('topRollsRangeLabel');
  if (interval === 'all') {
    navRow.classList.add('disabled');
    navBack.disabled = true;
    navFwd.disabled = true;
  } else {
    navRow.classList.remove('disabled');
    navBack.disabled = false;
    navFwd.disabled = offset >= 0;
  }
  rangeLabel.textContent = topRollsRangeLabel(interval, offset, range);

  const inRange = (state.battleLogs || []).filter(e => {
    const sides = e.diceSides || 20;
    if (sides !== 20) return false;
    const t = new Date(e.timestamp).getTime();
    if (isNaN(t)) return false;
    return t >= range.start && t < range.end;
  });

  // Group by category: 'Auto' for auto rolls, dice name for manual rolls
  // Manual rolls without a dice name fall into 'Manual'.
  const categories = {};
  inRange.forEach(r => {
    let key;
    if (r.rollType === 'auto') key = 'Auto';
    else key = (r.diceName && r.diceName.trim()) ? r.diceName.trim() : 'Manual';
    if (!categories[key]) categories[key] = { name: key, isAuto: r.rollType === 'auto', rolls: [] };
    categories[key].rolls.push(r);
  });

  // Top 2 categories by roll count (tie-break alphabetical)
  const ranked = Object.values(categories)
    .sort((a, b) => b.rolls.length - a.rolls.length || a.name.localeCompare(b.name));

  const wrap = document.getElementById('topRollsWrap');
  if (ranked.length === 0) {
    wrap.innerHTML = '<div class="top-rolls-empty" style="grid-column:1/-1;">No d20 rolls in this interval</div>';
    return;
  }

  const rowHtml = (items, total, colorClass) => {
    const maxCount = items.reduce((m, r) => Math.max(m, r.count), 1);
    return items.map(r => {
      const pct = ((r.count / total) * 100).toFixed(1);
      const barW = Math.max(4, Math.round((r.count / maxCount) * 100));
      const faceCls = r.face === 20 ? 'top-rolls-face nat20' : (r.face === 1 ? 'top-rolls-face nat1' : 'top-rolls-face');
      return '<div class="top-rolls-row">'
        + '<span class="' + faceCls + '">' + r.face + '</span>'
        + '<span class="top-rolls-count">×' + r.count + '</span>'
        + '<span class="top-rolls-bar"><span class="top-rolls-bar-fill ' + colorClass + '" style="width:' + barW + '%"></span></span>'
        + '<span class="top-rolls-pct">' + pct + '%</span>'
        + '</div>';
    }).join('');
  };

  const topFaces = (rolls, limit) => {
    const freq = {};
    rolls.forEach(r => { freq[r.roll] = (freq[r.roll] || 0) + 1; });
    return Object.entries(freq)
      .map(([face, count]) => ({ face: parseInt(face), count }))
      .sort((a, b) => b.count - a.count || a.face - b.face)
      .slice(0, limit);
  };

  // Pick a stable bar color per category — auto gets a neutral teal,
  // named dies cycle through cyan/magenta/lime/amber by hash.
  const barClassFor = (cat, indexHint) => {
    if (cat.isAuto) return 'bar-teal';
    const palette = ['bar-cyan', 'bar-lime', 'bar-magenta', 'bar-amber'];
    let h = 0;
    for (let i = 0; i < cat.name.length; i++) h = (h * 31 + cat.name.charCodeAt(i)) | 0;
    return palette[Math.abs(h + (indexHint || 0)) % palette.length];
  };

  // Single category — single header banner spanning both columns,
  // top 10 faces split across the two list columns.
  if (ranked.length === 1) {
    const cat = ranked[0];
    const total = cat.rolls.length;
    const sorted = topFaces(cat.rolls, 10);
    const half = Math.ceil(sorted.length / 2);
    const left = sorted.slice(0, half);
    const right = sorted.slice(half);
    const color = cat.isAuto ? 'var(--text3)' : 'var(--gold2)';
    const barCls = barClassFor(cat, 0);
    wrap.innerHTML =
        '<div class="top-rolls-single-header" style="color:' + color + '">'
      +   escapeHtml(cat.name) + ' <span class="top-rolls-total">(' + total + ')</span>'
      + '</div>'
      + '<div class="top-rolls-list">' + rowHtml(left, total, barCls) + '</div>'
      + '<div class="top-rolls-list">' + rowHtml(right, total, barCls) + '</div>';
    return;
  }

  // Two categories — one column each.
  wrap.innerHTML = ranked.slice(0, 2).map((cat, idx) => {
    const total = cat.rolls.length;
    const sorted = topFaces(cat.rolls, 5);
    const color = cat.isAuto ? 'var(--text3)' : 'var(--gold2)';
    const barCls = barClassFor(cat, idx);
    return '<div class="top-rolls-col">'
      + '<div class="top-rolls-col-header" style="color:' + color + '">'
      +   escapeHtml(cat.name) + ' <span class="top-rolls-total">(' + total + ')</span>'
      + '</div>'
      + '<div class="top-rolls-list">' + rowHtml(sorted, total, barCls) + '</div>'
      + '</div>';
  }).join('');
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
    if (mins < 60) return `${mins}M`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}H ${m}M` : `${h}H`;
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

function updateBattleSummaryStrip() {
  const logs = state.battleLogs || [];
  const total = logs.length;
  const win = logs.filter(b => b.won).length;
  const nat20 = logs.filter(b => b.roll === 20).length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('lssBattleTotal', total);
  set('lssBattleWin',   win);
  set('lssBattleLoss',  total - win);
  set('lssBattleNat20', nat20);
}

function renderBattleLogs() {
  updateBattleSummaryStrip();
  const container = document.getElementById('battleLogsContainer');
  if (!container) return;
  if (!state.battleLogs || state.battleLogs.length === 0) {
    container.innerHTML = '<div class="logs-empty">No battles logged yet.<br>Attack a Boss or Minion to see battles here.</div>';
    return;
  }
  container.innerHTML = state.battleLogs.map((log, i) => {
    const diceTag = (log.rollType === 'manual' && log.diceName)
      ? `<span class="dice-name-badge">◆ ${escapeHtml(log.diceName)}</span>` : '';
    const rollClass = log.roll === 20 ? 'crit' : (log.roll === 1 ? 'fumble' : '');
    return `
    <div class="battle-log-entry battle-log-${log.type} ${log.won ? 'success' : 'fail'}">
      <div class="battle-log-roll ${log.type} ${rollClass}">${log.roll}</div>
      <div class="battle-log-details">
        <div class="battle-log-type">
          <span class="battle-log-kind ${log.type}">⚔ ${log.type === 'boss' ? 'BOSS' : 'MINION'}</span>
          <span class="roll-type-badge ${log.rollType}">${log.rollType}</span>${diceTag}
        </div>
        <div class="battle-log-bottom">
          <span class="log-result ${log.won ? 'success' : 'fail'}">${log.won ? 'Success' : 'Fail'}</span>
          <span class="battle-log-dc">DC <b>${log.dc}</b> · ROLLED <b>${log.roll}</b></span>
        </div>
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
function updateSessionSummaryStrip() {
  const logs = state.logs || [];
  const total = logs.length;
  const done = logs.filter(l => l.success).length;
  const min = logs.filter(l => l.success).reduce((s, l) => s + (parseInt(l.duration) || 0), 0);
  const avg = done > 0 ? Math.round(min / done) : null;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('lssSessTotal', total);
  set('lssSessDone',  done);
  set('lssSessMin',   min);
  set('lssSessAvg',   avg === null ? '—' : avg);
}

function renderLogs() {
  updateSessionSummaryStrip();
  updateSessionsTodayChip();
  const container = document.getElementById('logsContainer');
  if (state.logs.length === 0) {
    container.innerHTML = '<div class="logs-empty">No sessions logged yet.<br>Complete a session to see it here.</div>';
    return;
  }
  container.innerHTML = state.logs.map((log, i) => `
    <div class="log-entry ${log.success ? 'success' : 'fail'}">
      <div class="log-dice">
        <div class="log-die hope" title="Hope"><span class="log-die-sym">▲</span><span class="log-die-val">${log.hope}</span></div>
        <div class="log-die fear" title="Fear"><span class="log-die-sym">▼</span><span class="log-die-val">${log.fear}</span></div>
        <div class="log-die sound" title="Soundtrack"><span class="log-die-sym">♪</span><span class="log-die-val">${log.sound}</span></div>
      </div>
      <div class="log-details">
        <div class="log-details-top">
          <span class="log-result ${log.success ? 'success' : 'fail'}">${log.success ? 'Success' : 'Incomplete'}</span>
          <div class="log-soundtrack">${escapeHtml(log.soundtrack)}</div>
        </div>
        <div class="log-duration"><span class="log-duration-num">${log.duration}</span><span class="log-duration-unit">MIN</span></div>
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

function deleteSessionLogEntry() {
  if (_editingSessionIdx < 0 || !state.logs[_editingSessionIdx]) return;
  if (!confirm('Delete this session log entry?')) return;
  state.logs.splice(_editingSessionIdx, 1);
  _editingSessionIdx = -1;
  markDirty(); closeModal('sessionLogEditModal'); renderLogs();
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

function deleteBattleLogEntry() {
  if (_editingBattleIdx < 0 || !state.battleLogs[_editingBattleIdx]) return;
  if (!confirm('Delete this battle log entry?')) return;
  state.battleLogs.splice(_editingBattleIdx, 1);
  _editingBattleIdx = -1;
  markDirty(); closeModal('battleLogEditModal'); renderBattleLogs(); updateMetrics();
}
