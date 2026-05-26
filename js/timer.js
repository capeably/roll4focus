// ============================================================
// TIMER
// ============================================================
const RING_CIRCUMFERENCE = 2 * Math.PI * 100;

function setTimer(seconds) { state.timerSeconds = seconds; state.timerTotal = seconds; updateTimerDisplay(); updateRing(); }

function updateTimerDisplay() {
  const mins = Math.floor(state.timerSeconds / 60), secs = state.timerSeconds % 60;
  const minEl = document.getElementById('mainDurMin'), secEl = document.getElementById('mainDurSec');
  // Don't clobber the fields while the user is actively editing them
  const editor = document.getElementById('mainDurEditor');
  if (editor && editor.classList.contains('is-editing')) return;
  if (minEl) minEl.value = String(mins).padStart(2, '0');
  if (secEl) secEl.value = String(secs).padStart(2, '0');
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
  // Fresh start = timer is at its initial position (hasn't ticked down).
  // Resume after pause = timerSeconds < timerTotal — skip the start sound.
  const isFreshStart = state.timerSeconds === state.timerTotal;
  state.timerRunning = true;
  setMainEditorState('is-locked');
  updateTimerDisplay();
  document.getElementById('btnStart').style.display = 'none';
  document.getElementById('btnPause').style.display = 'inline-flex';
  if (isFreshStart) playStartSound();
  startTicking(); startMinionCountdown();
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
  setMainEditorState('is-idle');
  document.getElementById('btnPause').style.display = 'none';
  document.getElementById('btnStart').style.display = 'inline-flex';
}

function resetTimer() {
  pauseTimer();
  if (state.currentSession) { setTimer(state.currentSession.totalMinutes * 60); }
  else { state.timerSeconds = 0; state.timerTotal = 0; updateTimerDisplay(); updateRing(); }
  setMainEditorState('is-idle');
}

// ============================================================
// DURATION EDITOR — chevron time-input mechanic (MM:SS)
// Five coexisting input methods: type, click chevron (±1), hold chevron
// (auto-repeat w/ acceleration), mouse-wheel (snap to nearest 5), arrow
// keys (±1). Wrap on chevron/wheel/arrows; clamp on type-blur.
// ============================================================
const DUR_INITIAL_DELAY = 400, DUR_MIN_DELAY = 80, DUR_ACCEL = 0.75;

function _durMax(input) { return input.dataset.unit === 'hours' ? 99 : 59; }

function _durAdjust(input, dir) {
  const max = _durMax(input);
  let val = (parseInt(input.value, 10) || 0) + dir;
  if (val > max) val = 0;
  if (val < 0) val = max;
  input.value = String(val).padStart(2, '0');
}

function _durSnap(input, dir) {
  const max = _durMax(input);
  let val = parseInt(input.value, 10) || 0;
  val = dir > 0 ? Math.ceil((val + 1) / 5) * 5 : Math.floor((val - 1) / 5) * 5;
  if (val > max) val = 0;
  if (val < 0) val = max;
  input.value = String(val).padStart(2, '0');
}

function _durClamp(input) {
  const max = _durMax(input);
  let val = parseInt(input.value, 10);
  if (isNaN(val)) val = 0;
  if (val > max) val = max;
  if (val < 0) val = 0;
  input.value = String(val).padStart(2, '0');
}

function _durIsEditKey(e) {
  return /^[0-9]$/.test(e.key)
    || ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key)
    || e.ctrlKey || e.metaKey;
}

function _startChevronRepeat(field, dir, commit, btn) {
  _durAdjust(field, dir);
  if (btn) btn.classList.add('is-holding');
  let delay = DUR_INITIAL_DELAY, timer;
  const tick = () => {
    _durAdjust(field, dir);
    delay = Math.max(DUR_MIN_DELAY, delay * DUR_ACCEL);
    timer = setTimeout(tick, delay);
  };
  timer = setTimeout(tick, delay);
  const stop = () => {
    clearTimeout(timer);
    if (btn) btn.classList.remove('is-holding');
    commit();
    document.removeEventListener('mouseup', stop);
    document.removeEventListener('mouseleave', stop);
    document.removeEventListener('touchend', stop);
    document.removeEventListener('touchcancel', stop);
  };
  document.addEventListener('mouseup', stop);
  document.addEventListener('mouseleave', stop);
  document.addEventListener('touchend', stop);
  document.addEventListener('touchcancel', stop);
}

// Wire one .dur-editor. opts: { editorId, minId, secId, commit, isLocked, onEnterEdit, onExitEdit }
function setupDurationEditor(opts) {
  const editor = document.getElementById(opts.editorId);
  if (!editor) return;
  const fields = [document.getElementById(opts.minId), document.getElementById(opts.secId)].filter(Boolean);
  const commit = () => opts.commit();
  const locked = () => opts.isLocked && opts.isLocked();

  fields.forEach(field => {
    const group = field.closest('.dur-group');
    group.querySelectorAll('.dur-chevron').forEach(btn => {
      const dir = btn.dataset.dir === 'up' ? 1 : -1;
      const press = (e) => {
        if (locked()) return;
        e.preventDefault();
        _startChevronRepeat(field, dir, commit, btn);
      };
      btn.addEventListener('mousedown', press);
      btn.addEventListener('touchstart', press, { passive: false });
    });

    field.addEventListener('wheel', (e) => {
      if (locked()) return;
      e.preventDefault();
      _durSnap(field, e.deltaY < 0 ? 1 : -1);
      commit();
    }, { passive: false });

    field.addEventListener('keydown', (e) => {
      if (locked()) { e.preventDefault(); return; }
      if (e.key === 'ArrowUp')        { e.preventDefault(); _durAdjust(field, 1);  commit(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); _durAdjust(field, -1); commit(); }
      else if (e.key === 'Enter' || e.key === 'Escape') { field.blur(); }
      else if (!_durIsEditKey(e))     { e.preventDefault(); }
    });

    field.addEventListener('focus', () => {
      if (locked()) return;
      if (opts.onEnterEdit) opts.onEnterEdit();
      field.select();
    });

    field.addEventListener('input', () => {
      // Keep at most 2 digits while typing
      field.value = field.value.replace(/\D/g, '').slice(0, 2);
    });

    field.addEventListener('blur', () => {
      _durClamp(field);
      commit();
      // After focus settles, if it left the editor entirely, exit edit mode
      setTimeout(() => {
        if (!editor.contains(document.activeElement) && opts.onExitEdit) opts.onExitEdit();
      }, 0);
    });
  });

  // Tap anywhere on the editor (while idle) to begin editing
  editor.addEventListener('click', (e) => {
    if (locked()) return;
    if (editor.classList.contains('is-idle')) {
      if (opts.onEnterEdit) opts.onEnterEdit();
      fields[0].focus();
    }
  });
}

// --- Main session timer editor ---
function setMainEditorState(name) {
  const editor = document.getElementById('mainDurEditor');
  if (!editor) return;
  editor.classList.remove('is-idle', 'is-editing', 'is-locked');
  editor.classList.add(name);
}

function commitMainDuration() {
  const min = parseInt(document.getElementById('mainDurMin').value, 10) || 0;
  const sec = parseInt(document.getElementById('mainDurSec').value, 10) || 0;
  const secs = min * 60 + sec;
  state.timerSeconds = secs; state.timerTotal = secs;
  updateRing();
  markDirty();
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
    if (bonus > 0) showToast('Inspiration', '+' + (1 + bonus), duration + 'm bonus', 'gain');
    else showToast('Inspiration', '+1', 'Session complete', 'gain');
  }
  // Streak tracking
  if (success) {
    state.currentStreak++;
    if (state.currentStreak > state.longestStreak) state.longestStreak = state.currentStreak;
    const milestones = [3, 5, 7, 10, 15, 20, 25, 30, 50];
    if (milestones.includes(state.currentStreak)) {
      flashStreak();
      setTimeout(() => showToast(`🔥 ${state.currentStreak}-session streak!`), 900);
    }
  } else {
    state.currentStreak = 0;
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
  markDirty(); updateAdventuringTime(); updateMetrics(); updateStreakDisplay(); updateSessionsTodayChip();
}


// ============================================================
// BREAK TIMER
// ============================================================
let breakState = { duration: 15, seconds: 900, total: 900, running: false, interval: null };

function openBreakDialog() {
  openModal('breakModal');
  setBreakEditorState(breakState.running ? 'is-locked' : 'is-editing');
  updateBreakDisplay();
}

function closeBreakDialog() { pauseBreak(); Sound.stopAll(); closeModal('breakModal'); }

function setBreakEditorState(name) {
  const editor = document.getElementById('breakDurEditor');
  if (!editor) return;
  editor.classList.remove('is-idle', 'is-editing', 'is-locked');
  editor.classList.add(name);
}

function updateBreakDisplay() {
  const m = Math.floor(breakState.seconds / 60), s = breakState.seconds % 60;
  const minEl = document.getElementById('breakDurMin'), secEl = document.getElementById('breakDurSec');
  const editor = document.getElementById('breakDurEditor');
  // Don't clobber the fields while the user is actively editing (idle/editing
  // with focus inside); always update while running (locked).
  if (editor && editor.classList.contains('is-editing') && editor.contains(document.activeElement)) return;
  if (minEl) minEl.value = String(m).padStart(2, '0');
  if (secEl) secEl.value = String(s).padStart(2, '0');
}

function commitBreakDuration() {
  const min = parseInt(document.getElementById('breakDurMin').value, 10) || 0;
  const sec = parseInt(document.getElementById('breakDurSec').value, 10) || 0;
  const secs = min * 60 + sec;
  breakState.seconds = secs; breakState.total = secs;
  breakState.duration = Math.round(secs / 60);
}

function startBreak() {
  if (breakState.seconds <= 0) return;
  breakState.running = true;
  setBreakEditorState('is-locked');
  document.getElementById('btnBreakStart').style.display = 'none';
  document.getElementById('btnBreakPause').style.display = 'inline-flex';
  Sound.stopAll();
  Sound.play('breakStart');
  breakState.interval = setInterval(() => {
    breakState.seconds--; updateBreakDisplay();
    if (breakState.seconds <= 0) {
      clearInterval(breakState.interval); breakState.running = false; breakState.interval = null;
      setBreakEditorState('is-editing');
      document.getElementById('btnBreakPause').style.display = 'none';
      document.getElementById('btnBreakStart').style.display = 'inline-flex';
      Sound.play('breakFinish'); showToast('☕ Break over — back to the adventure!');
    }
  }, 1000);
}

function pauseBreak() {
  if (breakState.interval) { clearInterval(breakState.interval); breakState.interval = null; }
  breakState.running = false;
  setBreakEditorState('is-editing');
  document.getElementById('btnBreakPause').style.display = 'none';
  document.getElementById('btnBreakStart').style.display = 'inline-flex';
}

function resetBreak() {
  pauseBreak();
  Sound.stopAll();
  breakState.seconds = breakState.duration * 60; breakState.total = breakState.duration * 60;
  updateBreakDisplay();
}
