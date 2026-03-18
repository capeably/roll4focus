// ============================================================
// SOUND MODULE
// ============================================================
const Sound = {
  _registry: {},

  register(key, audioId, displayId, storageKey, enabledKey) {
    this._registry[key] = { audioId, displayId, storageKey, enabledKey };
  },

  _playAudio(audioId) {
    const audio = document.getElementById(audioId);
    if (audio && audio.src && audio.src !== window.location.href) {
      audio.currentTime = 0; audio.play().catch(() => {});
    }
  },

  play(key) {
    if (state.quietMode) return;
    const reg = this._registry[key];
    if (!reg) return;
    if (reg.enabledKey && !state[reg.enabledKey]) return;
    this._playAudio(reg.audioId);
  },

  playTimerEnd() {
    if (state.quietMode) {
      const quietAudio = document.getElementById('timerQuietSound');
      if (quietAudio && quietAudio.src && quietAudio.src !== window.location.href) {
        quietAudio.currentTime = 0; quietAudio.play().catch(() => {});
      }
      return;
    }
    const audio = document.getElementById('timerSound');
    if (audio.src && audio.src !== window.location.href) {
      audio.currentTime = 0; audio.play().catch(() => {});
    } else {
      try {
        const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
      } catch(e) {}
    }
  },

  stopTimer() {
    const audio = document.getElementById('timerSound');
    audio.pause(); audio.currentTime = 0;
  },

  stopAll() {
    Object.keys(this._registry).forEach(key => {
      const el = document.getElementById(this._registry[key].audioId);
      if (el) { el.pause(); el.currentTime = 0; }
    });
  },

  load(event, key) {
    const reg = this._registry[key];
    if (!reg) return;
    const file = event.target.files[0]; if (!file) return;
    document.getElementById(reg.displayId).textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target.result;
      document.getElementById(reg.audioId).src = dataURL;
      try { localStorage.setItem(reg.storageKey, JSON.stringify({ name: file.name, data: dataURL })); }
      catch(err) { showToast('File too large to persist'); }
    };
    reader.readAsDataURL(file);
  },

  restoreAll() {
    Object.keys(this._registry).forEach(key => {
      const reg = this._registry[key];
      try {
        const saved = JSON.parse(localStorage.getItem(reg.storageKey) || 'null');
        if (saved && saved.data) {
          document.getElementById(reg.audioId).src = saved.data;
          document.getElementById(reg.displayId).textContent = saved.name;
        } else {
          const audio = document.getElementById(reg.audioId);
          const disp = document.getElementById(reg.displayId);
          if (audio && audio.getAttribute('src') && disp) {
            const path = audio.getAttribute('src');
            disp.textContent = decodeURIComponent(path.split('/').pop()) + ' (default)';
          }
        }
      } catch(e) {}
    });
  },

  playAttackResult(won) {
    const soundKey = won ? 'attackSuccess' : 'attackFail';
    if (state.diceRollSoundEnabled) {
      setTimeout(() => this.play(soundKey), 200);
    } else {
      this.play(soundKey);
    }
  },

  _tickCtx: null,
  startTicking() {
    if (!state.tickingEnabled || state.quietMode) return;
    this.stopTicking();
    try { this._tickCtx = new AudioContext(); } catch(e) { return; }
    const ctx = this._tickCtx;
    state.tickInterval = setInterval(() => {
      if (!state.tickingEnabled) return;
      try {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.04);
      } catch(e) {}
    }, 250);
  },
  stopTicking() {
    if (state.tickInterval) { clearInterval(state.tickInterval); state.tickInterval = null; }
  },
};

// Register all sound channels
Sound.register('timer',       'timerSound',         'soundFileName',            'r4f_sound',               null);
Sound.register('start',       'startSound',         'startSoundFileName',       'r4f_start_sound',         'startSoundEnabled');
Sound.register('inspiration', 'inspirationSound',   'inspirationSoundFileName', 'r4f_inspiration_sound',   'inspirationSoundEnabled');
Sound.register('diceRoll',    'diceRollSound',      'diceRollSoundFileName',    'r4f_sound_diceRoll',      'diceRollSoundEnabled');
Sound.register('battleEarned','battleEarnedSound',  'battleEarnedSoundFileName','r4f_sound_battleEarned',  'battleEarnedSoundEnabled');
Sound.register('attackSuccess','attackSuccessSound', 'attackSuccessSoundFileName','r4f_sound_attackSuccess','attackSuccessSoundEnabled');
Sound.register('attackFail',  'attackFailSound',    'attackFailSoundFileName',  'r4f_sound_attackFail',    'attackFailSoundEnabled');
Sound.register('openChest',   'openChestSound',     'openChestSoundFileName',   'r4f_sound_openChest',     'openChestSoundEnabled');
Sound.register('breakStart',  'breakStartSound',    'breakStartSoundFileName',  'r4f_sound_breakStart',    'breakStartSoundEnabled');
Sound.register('breakFinish', 'breakFinishSound',   'breakFinishSoundFileName', 'r4f_sound_breakFinish',   'breakFinishSoundEnabled');
Sound.register('timerQuiet',  'timerQuietSound',    'timerQuietSoundFileName',  'r4f_sound_timerQuiet',    null);

// Global aliases for HTML onclick handlers
function loadSoundFile(event) { Sound.load(event, 'timer'); }
function loadStartSoundFile(event) { Sound.load(event, 'start'); }
function loadInspirationSoundFile(event) { Sound.load(event, 'inspiration'); }
function loadGenericSound(event, key) { Sound.load(event, key); }
function playGenericSound(key) { Sound.play(key); }
function playStartSound() { Sound.play('start'); }
function playInspirationSound() { Sound.play('inspiration'); }
function playSound() { Sound.playTimerEnd(); }
function stopSound() { Sound.stopTimer(); }
function playAttackResultSound(won) { Sound.playAttackResult(won); }
function startTicking() { Sound.startTicking(); }
function stopTicking() { Sound.stopTicking(); }

