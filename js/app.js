// ============================================================
// ROLLS & SESSION SETUP
// ============================================================
function rerollSoundtrack() {
  playGenericSound('diceRoll');
  const sound = Math.ceil(Math.random() * state.soundtrackDie);
  const el = document.getElementById('soundRoll');
  el.value = sound; el.dataset.userOverride = '1';
  el.style.transition = 'box-shadow 0.1s';
  el.style.boxShadow = '0 0 0 3px rgba(200,150,62,0.3)';
  setTimeout(() => el.style.boxShadow = '', 400);
  onRollInput();
}

function rollForMe() {
  playGenericSound('diceRoll');
  const hope = Math.ceil(Math.random() * state.hopeFearDie);
  const fear = Math.ceil(Math.random() * state.hopeFearDie);
  const sound = Math.ceil(Math.random() * state.soundtrackDie);
  document.getElementById('hopeRoll').value = hope;
  document.getElementById('fearRoll').value = fear;
  document.getElementById('soundRoll').removeAttribute('data-user-override');
  document.getElementById('soundRoll').value = sound;
  ['hopeRoll','fearRoll','soundRoll'].forEach(id => {
    const el = document.getElementById(id);
    el.style.transition = 'box-shadow 0.1s';
    el.style.boxShadow = '0 0 0 3px rgba(46,173,168,0.3)';
    setTimeout(() => el.style.boxShadow = '', 400);
  });
  onRollInput();
}

function onHopeInput(val) {
  const soundEl = document.getElementById('soundRoll');
  if (!soundEl.dataset.userOverride) soundEl.value = val;
  onRollInput();
}

function onSoundInput() {
  document.getElementById('soundRoll').dataset.userOverride = '1';
  onRollInput();
}

function onRollInput() {
  const hope = parseInt(document.getElementById('hopeRoll').value);
  const fear = parseInt(document.getElementById('fearRoll').value);
  const sound = parseInt(document.getElementById('soundRoll').value);
  if (hope >= 1 && hope <= 20 && fear >= 1 && fear <= 20) {
    let totalMinutes;
    const equalKey = `${hope}`;
    if (hope === fear) {
      totalMinutes = hope + state.baseTime;
      if (!state._lastEqualRoll || state._lastEqualRoll !== equalKey) {
        state._lastEqualRoll = equalKey;
        adjustCounter('inspiration', 1); playInspirationSound();
        showToast('Hope = Fear — +1 Inspiration!');
      }
    } else {
      state._lastEqualRoll = null;
      totalMinutes = hope > fear ? hope + state.baseTime : hope + fear + state.baseTime;
    }
    state.currentSession = state.currentSession || {};
    state.currentSession.hope = hope;
    state.currentSession.fear = fear;
    state.currentSession.totalMinutes = totalMinutes;
    setTimer(totalMinutes * 60);
  }
  if (sound >= 1 && sound <= 20) {
    const name = state.soundtracks[sound - 1] || `Track ${sound}`;
    state.currentSession = state.currentSession || {};
    state.currentSession.sound = sound;
    state.currentSession.soundtrackName = name;
    document.getElementById('soundtrackDisplay').textContent = '🎵 ' + name;
    document.getElementById('soundtrackDisplay').style.color = 'var(--gold3)';
  } else {
    document.getElementById('soundtrackDisplay').textContent = '🎵 —';
    document.getElementById('soundtrackDisplay').style.color = 'var(--text3)';
  }
  updateStatsDisplay();
}


// ============================================================
// STATUS RESET
// ============================================================
function resetStatus() {
  state.inspiration = 0; state.penalty = 0;
  state.bossManualAdj = 0; state.minionManualAdj = 0;
  state.minionBattlesEarned = 0; state.minionBattlesFought = 0; state.minionBattlesWon = 0;
  state.minionChestsEarned = 0; state.minionChestsOpened = 0;
  state.bossBattlesEarned = 0; state.bossBattlesFought = 0; state.bossBattlesWon = 0;
  state.bossChestsEarned = 0; state.bossChestsOpened = 0;
  state.lastResetTimestamp = new Date().toISOString();
  state.hopeRolls = []; state.fearRolls = []; state.soundRolls = [];
  document.getElementById('inspirationVal').textContent = 0;
  document.getElementById('penaltyVal').textContent = 0;
  updateDCDisplays(); updateMinionUI(); updateBossUI(); updateStatsDisplay(); updateMetrics(); markDirty();
  showToast('Status reset');
}


// ============================================================
// INIT
// ============================================================
function init() {
  loadState();
  if (!state.lastResetTimestamp) state.lastResetTimestamp = new Date().toISOString();
  if (!state.hopeRolls) state.hopeRolls = [];
  if (!state.fearRolls) state.fearRolls = [];
  if (!state.soundRolls) state.soundRolls = [];
  document.getElementById('inspirationVal').textContent = state.inspiration;
  document.getElementById('penaltyVal').textContent = state.penalty;
  hydrateSettings();
  updateMinionUI(); updateBossUI(); updateMinionCountdownDisplay(); updateDCDisplays();
  buildSoundtrackTable(); loadNotesTab(); updateAdventuringTime(); updateStatsDisplay();
  updateMetrics(); updateDiceNamesChip();
  if (state.timerSeconds > 0) { updateTimerDisplay(); updateRing(); }
  Sound.restoreAll();
}

window.addEventListener('beforeunload', saveState);

document.addEventListener('keydown', function(e) {
  if (document.getElementById('sessionModal').classList.contains('show')) {
    if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') { e.preventDefault(); sessionResult(true); }
    else if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') { e.preventDefault(); sessionResult(false); }
    return;
  }
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const noMod = !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
  if ((e.key === 'r' || e.key === 'R') && noMod) { e.preventDefault(); rollForMe(); }
  else if (e.key === ' ' && noMod) { e.preventDefault(); if (state.timerRunning) pauseTimer(); else startTimer(); }
  else if ((e.key === 'a' || e.key === 'A') && noMod) { e.preventDefault(); minionAttack(); }
  else if ((e.key === 'c' || e.key === 'C') && noMod) { e.preventDefault(); openMinionChest(); }
  else if ((e.key === 'b' || e.key === 'B') && noMod) { e.preventDefault(); openBossEditModal(); }
});

init();
