// ============================================================
// DC & COUNTER HELPERS
// ============================================================
function getBossDC() { return state.bossDcDefault - state.inspiration + state.penalty + state.bossManualAdj; }
function getMinionDC() { return state.minionDcDefault - state.inspiration + state.penalty + state.minionManualAdj; }

function updateDCDisplays() {
  const bossDC = getBossDC(), minionDC = getMinionDC();
  ['bossEditDCVal'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = bossDC; });
  const qbBossEl = document.getElementById('qbBossDCDisplay');
  if (qbBossEl) qbBossEl.innerHTML = '<span class="dc-prefix">DC</span> ' + bossDC;
  ['minionEditDCVal'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = minionDC; });
  const qbMinionEl = document.getElementById('qbMinionDCDisplay');
  if (qbMinionEl) qbMinionEl.innerHTML = '<span class="dc-prefix">DC</span> ' + minionDC;
}

function adjustDC(which, delta) {
  if (which === 'boss') state.bossManualAdj += delta; else state.minionManualAdj += delta;
  updateDCDisplays(); updateStatsDisplay(); markDirty();
}

function adjustCounter(which, delta) {
  if (which === 'inspiration') {
    state.inspiration = Math.max(0, state.inspiration + delta);
    document.getElementById('inspirationVal').textContent = state.inspiration;
  } else if (which === 'penalty') {
    state.penalty = Math.max(0, state.penalty + delta);
    document.getElementById('penaltyVal').textContent = state.penalty;
  }
  updateDCDisplays(); updateStatsDisplay(); markDirty();
}

function adjustBattleStat(key, delta, type) {
  state[key] = Math.max(0, state[key] + delta);
  if (type === 'boss') updateBossUI(); else updateMinionUI();
  markDirty();
}

// ============================================================
// BATTLE SYSTEM — shared engine for Boss & Minion
// ============================================================
function createBattleSystem(c) {
  function getRem() { return state[c.prefix+'BattlesEarned'] - state[c.prefix+'BattlesFought']; }
  function getChRem() { return state[c.prefix+'ChestsEarned'] - state[c.prefix+'ChestsOpened']; }

  const $ = (id) => document.getElementById(id);
  function updateUI() {
    const rem = getRem(), chRem = getChRem();
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    const dis = (id, val) => { const el = $(id); if (el) el.disabled = val; };
    set(c.earnedId, state[c.prefix+'BattlesEarned']);
    set(c.foughtId, state[c.prefix+'BattlesFought']);
    set(c.wonId, state[c.prefix+'BattlesWon']);
    set(c.remainingId, rem);
    set(c.chestsEarnedId, state[c.prefix+'ChestsEarned']);
    set(c.chestsOpenedId, state[c.prefix+'ChestsOpened']);
    set(c.chestsRemainingId, chRem);
    dis(c.btnAttackId, rem <= 0);
    dis(c.btnChestId, chRem <= 0);
    dis(c.qbBtnAttackId, rem <= 0);
    dis(c.qbBtnChestId, chRem <= 0);
    set(c.qbRemainingId, rem);
    set(c.qbChestsRemainingId, chRem);
  }

  function attack(roll, rollType) {
    if (getRem() <= 0) return;
    rollType = rollType || 'auto';
    if (roll === undefined) roll = Math.ceil(Math.random() * 20);
    playGenericSound('diceRoll');
    const dc = c.dcFn();
    const isCrit = roll === 20;
    const won = isCrit || roll >= dc;
    state[c.prefix+'BattlesFought']++;
    if (won) {
      state[c.prefix+'BattlesWon']++;
      state[c.prefix+'ChestsEarned']++;
      c.onWin();
      playAttackResultSound(true);
      if (isCrit) {
        adjustCounter('inspiration', 1); flashInspiration(); playInspirationSound();
        showToast(`⚔ ${c.label}Critical Hit! Rolled ${roll} vs DC ${dc} — +1 Inspiration!`);
      } else {
        showToast(`⚔ ${c.label}Hit! Rolled ${roll} vs DC ${dc} — Chest Earned!`);
      }
    } else {
      playAttackResultSound(false);
      showToast(`💨 ${c.label}Miss! Rolled ${roll} vs DC ${dc}`);
    }
    const mainEl = document.getElementById(c.resultId);
    if (mainEl) { mainEl.textContent = roll; mainEl.className = `attack-result ${won ? 'win' : 'fail'}`; }
    const qbEl = document.getElementById(c.qbResultId);
    if (qbEl) { qbEl.textContent = roll; qbEl.className = c.qbCls(won); }
    logBattle(c.type, rollType, roll, won, dc);
    if (c.type === 'boss') updateDCDisplays();
    updateUI(); markDirty();
  }

  function openChest() {
    if (getChRem() <= 0) return;
    state[c.prefix+'ChestsOpened']++;
    playGenericSound('openChest');
    showToast(`🎁 ${c.label}Chest Opened!`);
    updateUI(); markDirty();
  }

  return { updateUI, attack, openChest, getRemaining: getRem };
}

const BossBattle = createBattleSystem({
  type: 'boss', prefix: 'boss', label: 'Boss ',
  dcFn: getBossDC,
  onWin: () => { state.bossManualAdj += state.bossDcScaling; },
  resultId: 'bossAttackResult', qbResultId: 'qbBossResult',
  qbCls: (won) => `qb-result ${won ? 'win' : 'fail'} qb-editable tip`,
  earnedId: 'bossBattlesEarned', foughtId: 'bossBattlesFought',
  wonId: 'bossBattlesWon', remainingId: 'bossBattlesRemaining',
  chestsEarnedId: 'bossChestsEarned', chestsOpenedId: 'bossChestsOpened',
  chestsRemainingId: 'bossChestsRemaining',
  btnAttackId: 'btnBossAttack', btnChestId: 'btnOpenBossChest',
  qbBtnAttackId: 'qbBtnBossAttack', qbBtnChestId: 'qbBtnBossChest',
  qbRemainingId: 'qbBossRemaining', qbChestsRemainingId: 'qbBossChestsRemaining',
});

const MinionBattle = createBattleSystem({
  type: 'minion', prefix: 'minion', label: '',
  dcFn: getMinionDC,
  onWin: () => { adjustDC('minion', 1); },
  resultId: 'attackResult', qbResultId: 'qbMinionResult',
  qbCls: (won) => `qb-result ${won ? 'win' : 'fail'} qb-editable tip`,
  earnedId: 'minionBattlesEarned', foughtId: 'minionBattlesFought',
  wonId: 'minionBattlesWon', remainingId: 'minionBattlesRemaining',
  chestsEarnedId: 'minionChestsEarned', chestsOpenedId: 'minionChestsOpened',
  chestsRemainingId: 'minionChestsRemaining',
  btnAttackId: 'btnAttack', btnChestId: 'btnOpenChest',
  qbBtnAttackId: 'qbBtnMinionAttack', qbBtnChestId: 'qbBtnMinionChest',
  qbRemainingId: 'qbMinionRemaining', qbChestsRemainingId: 'qbMinionChestsRemaining',
});

// Global aliases (HTML onclick)
function bossAttack() {
  if (BossBattle.getRemaining() <= 0) return;
  const qbInput = document.getElementById('qbBossRoll');
  let roll, rollType = 'auto';
  if (qbInput) {
    const qbVal = qbInput.value.trim();
    if (qbVal !== '' && !isNaN(parseInt(qbVal))) {
      roll = Math.max(1, parseInt(qbVal)); rollType = 'manual';
      qbInput.value = '';
    }
  }
  BossBattle.attack(roll, rollType);
}
function openBossChest() { BossBattle.openChest(); }
function updateBossUI() { BossBattle.updateUI(); }
function minionAttack() {
  if (MinionBattle.getRemaining() <= 0) return;
  const qbInput = document.getElementById('qbMinionRoll');
  let roll, rollType = 'auto';
  if (qbInput) {
    const qbVal = qbInput.value.trim();
    if (qbVal !== '' && !isNaN(parseInt(qbVal))) {
      roll = Math.max(1, parseInt(qbVal)); rollType = 'manual';
      qbInput.value = '';
    }
  }
  MinionBattle.attack(roll, rollType);
}
function openMinionChest() { MinionBattle.openChest(); }
function updateMinionUI() { MinionBattle.updateUI(); }

// ============================================================
// MINION COUNTDOWN
// ============================================================
function onMinionToggleChange(enabled) {
  if (typeof enabled === 'boolean') state.minionCountdownEnabled = enabled;
  else {
    const el = document.getElementById('minionCountdownToggle');
    state.minionCountdownEnabled = el ? el.checked : state.minionCountdownEnabled;
  }
  if (!state.minionCountdownEnabled) { stopMinionCountdown(); updateMinionCountdownDisplay(); }
  else if (state.timerRunning) { startMinionCountdown(); }
  else { updateMinionCountdownDisplay(); }
  markDirty();
}

function startMinionCountdown() {
  if (!state.minionCountdownEnabled) return;
  stopMinionCountdown();
  state.minionCountdownInterval = setInterval(() => {
    state.minionCountdownSeconds--;
    updateMinionCountdownDisplay();
    if (state.minionCountdownSeconds <= 0) {
      state.minionBattlesEarned++;
      updateMinionUI(); playGenericSound('battleEarned');
      showToast('⚔ Minion Battle Earned!');
      state.minionCountdownSeconds = state.minionInterval * 60;
      updateMinionCountdownDisplay(); markDirty();
      if (state.minionAutoFight) setTimeout(() => minionAttack(), 300);
    }
  }, 1000);
}

function stopMinionCountdown() {
  if (state.minionCountdownInterval) { clearInterval(state.minionCountdownInterval); state.minionCountdownInterval = null; }
}

function updateMinionCountdownDisplay() {
  const els = [document.getElementById('minionCountdown')];
  els.forEach(el => {
    if (!el) return;
    if (!state.minionCountdownEnabled) {
      el.textContent = 'Off';
      el.className = el.className.replace(/\bminion-countdown\b/, '') + ' minion-countdown inactive';
      return;
    }
    const mins = Math.floor(state.minionCountdownSeconds / 60);
    const secs = state.minionCountdownSeconds % 60;
    el.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    el.className = el.className.replace(/\binactive\b/, '');
    if (!el.className.includes('minion-countdown')) el.className += ' minion-countdown';
  });
}
