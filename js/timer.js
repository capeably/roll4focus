// ============================================================
// TIMER
// ============================================================
const RING_CIRCUMFERENCE = 2 * Math.PI * 100;

function setTimer(seconds) { state.timerSeconds = seconds; state.timerTotal = seconds; updateTimerDisplay(); updateRing(); }

function updateTimerDisplay() {
  const mins = Math.floor(state.timerSeconds / 60), secs = state.timerSeconds % 60;
  document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function updateRing() {
  const ring = document.getElementById('timerRing');
  if (state.timerTotal === 0) { ring.style.strokeDashoffset = 0; ring.classList.remove('low'); return; }
  const frac = state.timerSeconds / state.timerTotal;
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);
  if (frac < 0.2) ring.classList.add('low'); else ring.classList.remove('low');
}

function startTimer() {
  if (state.timerSeconds <= 0) { showToast('Set a session time first'); return; }
  state.timerRunning = true;
  document.getElementById('btnStart').style.display = 'none';
  document.getElementById('btnPause').style.display = 'inline-flex';
  playStartSound(); startTicking(); startMinionCountdown();
  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    updateTimerDisplay(); updateRing();
    if (state.timerSeconds <= 0) {
      clearInterval(state.timerInterval); stopTicking(); stopMinionCountdown();
      state.timerRunning = false; playSound();
      document.getElementById('btnPause').style.display = 'none';
      document.getElementById('btnStart').style.display = 'inline-flex';
      setTimeout(() => openModal('sessionModal'), 500);
    }
  }, 1000);
}

function pauseTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  stopTicking(); stopMinionCountdown(); state.timerRunning = false;
  document.getElementById('btnPause').style.display = 'none';
  document.getElementById('btnStart').style.display = 'inline-flex';
}

function resetTimer() {
  pauseTimer();
  if (state.currentSession) { setTimer(state.currentSession.totalMinutes * 60); }
  else { state.timerSeconds = 0; state.timerTotal = 0; document.getElementById('timerDisplay').textContent = '—:——'; updateRing(); }
}

function startEdit() {
  if (state.timerRunning) return;
  const disp = document.getElementById('timerDisplay'), edit = document.getElementById('timerEdit');
  disp.style.display = 'none'; edit.style.display = 'block';
  edit.value = disp.textContent === '—:——' ? '' : disp.textContent;
  edit.focus(); edit.select();
}

function finishEdit() {
  const disp = document.getElementById('timerDisplay'), edit = document.getElementById('timerEdit');
  const val = edit.value.trim();
  if (val) {
    let secs = 0;
    if (val.includes(':')) { const parts = val.split(':'); secs = parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0); }
    else { secs = parseInt(val) * 60; }
    if (!isNaN(secs) && secs > 0) { state.timerSeconds = secs; state.timerTotal = secs; updateRing(); }
  }
  updateTimerDisplay(); edit.style.display = 'none'; disp.style.display = 'block';
}

function editKeydown(e) {
  if (e.key === 'Enter') finishEdit();
  if (e.key === 'Escape') { document.getElementById('timerEdit').style.display = 'none'; document.getElementById('timerDisplay').style.display = 'block'; }
}

// ============================================================
// SESSION RESULT
// ============================================================
function sessionResult(success) {
  closeModal('sessionModal'); stopSound();
  if (success) {
    const duration = state.currentSession ? state.currentSession.totalMinutes : Math.round(state.timerTotal / 60);
    let bonus = 0;
    if (duration >= 40) bonus = 3; else if (duration >= 35) bonus = 2; else if (duration >= 30) bonus = 1;
    adjustCounter('inspiration', 1 + bonus); flashInspiration(); playInspirationSound();
    state.bossBattlesEarned++; updateBossUI();
    if (bonus > 0) showToast(`+${1 + bonus} Inspiration — ${duration}m session bonus!`);
    else showToast('+1 Inspiration — Session Complete!');
  }
  const session = state.currentSession || {};
  state.logs.unshift({
    hope: session.hope || '—', fear: session.fear || '—', sound: session.sound || '—',
    soundtrack: session.soundtrackName || '—',
    duration: session.totalMinutes || Math.round(state.timerTotal / 60),
    hopeFearRollType: session.hopeFearRollType || '—',
    soundRollType: session.soundRollType || '—',
    hopeFearDie: session.hopeFearDie || '—',
    soundtrackDie: session.soundtrackDie || '—',
    success, timestamp: new Date().toLocaleString(),
  });
  const sess = state.currentSession || {};
  if (sess.hope && sess.hope !== '—') state.hopeRolls.push(Number(sess.hope));
  if (sess.fear && sess.fear !== '—') state.fearRolls.push(Number(sess.fear));
  if (sess.sound && sess.sound !== '—') state.soundRolls.push(Number(sess.sound));
  markDirty(); updateAdventuringTime(); updateMetrics();
}


// ============================================================
// BREAK TIMER
// ============================================================
let breakState = { duration: 15, seconds: 900, total: 900, running: false, interval: null };

function openBreakDialog() { openModal('breakModal'); selectBreakDuration(breakState.duration); }

function closeBreakDialog() { pauseBreak(); Sound.stopAll(); closeModal('breakModal'); }

function selectBreakDuration(mins) {
  if (breakState.running) return;
  breakState.duration = mins; breakState.seconds = mins * 60; breakState.total = mins * 60;
  updateBreakDisplay();
  document.querySelectorAll('.break-dur-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.textContent) === mins);
  });
}

function updateBreakDisplay() {
  const m = Math.floor(breakState.seconds / 60), s = breakState.seconds % 60;
  document.getElementById('breakTimerDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function startBreak() {
  if (breakState.seconds <= 0) return;
  breakState.running = true;
  document.getElementById('btnBreakStart').style.display = 'none';
  document.getElementById('btnBreakPause').style.display = 'inline-flex';
  Sound.stopAll();
  Sound.play('breakStart');
  breakState.interval = setInterval(() => {
    breakState.seconds--; updateBreakDisplay();
    if (breakState.seconds <= 0) {
      clearInterval(breakState.interval); breakState.running = false; breakState.interval = null;
      document.getElementById('btnBreakPause').style.display = 'none';
      document.getElementById('btnBreakStart').style.display = 'inline-flex';
      Sound.play('breakFinish'); showToast('☕ Break over — back to the adventure!');
    }
  }, 1000);
}

function pauseBreak() {
  if (breakState.interval) { clearInterval(breakState.interval); breakState.interval = null; }
  breakState.running = false;
  document.getElementById('btnBreakPause').style.display = 'none';
  document.getElementById('btnBreakStart').style.display = 'inline-flex';
}

function resetBreak() {
  pauseBreak();
  Sound.stopAll();
  breakState.seconds = breakState.duration * 60; breakState.total = breakState.duration * 60;
  updateBreakDisplay();
}

function startBreakEdit() {
  if (breakState.running) return;
  const disp = document.getElementById('breakTimerDisplay'), edit = document.getElementById('breakTimerEdit');
  disp.style.display = 'none'; edit.style.display = 'block';
  edit.value = disp.textContent;
  edit.focus(); edit.select();
}

function finishBreakEdit() {
  const disp = document.getElementById('breakTimerDisplay'), edit = document.getElementById('breakTimerEdit');
  const val = edit.value.trim();
  if (val) {
    let secs = 0;
    if (val.includes(':')) { const parts = val.split(':'); secs = parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0); }
    else { secs = parseInt(val) * 60; }
    if (!isNaN(secs) && secs > 0) {
      breakState.seconds = secs; breakState.total = secs; breakState.duration = Math.round(secs / 60);
      document.querySelectorAll('.break-dur-btn').forEach(btn => btn.classList.remove('active'));
    }
  }
  updateBreakDisplay();
  edit.style.display = 'none'; disp.style.display = 'block';
}

function breakEditKeydown(e) {
  if (e.key === 'Enter') finishBreakEdit();
  if (e.key === 'Escape') { document.getElementById('breakTimerEdit').style.display = 'none'; document.getElementById('breakTimerDisplay').style.display = 'block'; }
}
