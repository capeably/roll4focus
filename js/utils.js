// ============================================================
// UTILITIES
// ============================================================
function escapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

// Toast — three-slot grid (label / value / detail) with event variant.
// Calls: showToast({ label, value, detail, variant, duration })
//   or showToast(label, value, detail, variant)     // positional shorthand
//   or showToast('legacy single string')            // back-compat
// variant: 'gain' (Inspiration +), 'loss' (Inspiration -), 'chest' (loot)
// Toasts queue if fired in quick succession.
const _toastQueue = [];
let _toastBusy = false;

function showToast(a, b, c, d) {
  let entry;
  if (typeof a === 'object' && a !== null) {
    entry = a;
  } else if (arguments.length >= 2) {
    entry = { label: a, value: b, detail: c, variant: d };
  } else {
    entry = { legacy: a };
  }
  _toastQueue.push(entry);
  if (!_toastBusy) _processToastQueue();
}

function _processToastQueue() {
  const next = _toastQueue.shift();
  if (!next) { _toastBusy = false; return; }
  _toastBusy = true;
  const el = document.getElementById('toast');
  if (!el) { _toastBusy = false; return; }
  // Reset
  el.className = 'toast';
  el.classList.remove('show');
  if (next.legacy !== undefined) {
    // Legacy single-string call — render as a centered label
    el.innerHTML = '<span class="toast__label" style="grid-column:1/-1;text-align:center;">'
      + escapeHtml(String(next.legacy)) + '</span>';
  } else {
    if (next.variant) el.classList.add('toast--' + next.variant);
    el.innerHTML =
      (next.label  ? '<span class="toast__label">'  + escapeHtml(next.label)  + '</span>' : '<span></span>')
    + (next.value  ? '<span class="toast__value">'  + escapeHtml(next.value)  + '</span>' : '<span></span>')
    + (next.detail ? '<span class="toast__detail">' + escapeHtml(next.detail) + '</span>' : '<span></span>');
  }
  // Show
  // Force reflow so the transition runs even for back-to-back queue items
  void el.offsetWidth;
  el.classList.add('show');
  const dwell = (next.duration != null)
    ? next.duration
    : (next.variant === 'chest' ? 2800 : 1800);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(_processToastQueue, 220); // wait for fade
  }, dwell);
}

function flashInspiration() {
  const el = document.getElementById('inspFlash');
  el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 600);
}

function flashChest() {
  const el = document.getElementById('chestFlash');
  if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 600); }
}

function flashStreak() {
  const el = document.getElementById('streakFlash');
  if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 700); }
}

// ============================================================
// CHEST LOOT TABLE
// ============================================================
const CHEST_LOOT_TABLE = [
  "Scroll of Deep Focus",
  "Potion of Steady Hands",
  "Cloak of Quiet Resolve",
  "Amulet of Clarity",
  "Ring of Momentum",
  "Elixir of Flow State",
  "Tome of Forgotten Lore",
  "Wand of Second Wind",
  "Boots of Swift Progress",
  "Shield of Distraction Ward",
  "Helm of Iron Will",
  "Gauntlets of Precision",
  "Orb of Time Mastery",
  "Charm of Renewed Energy",
  "Blade of Breakthrough",
];

function getChestLootText() {
  return CHEST_LOOT_TABLE[Math.floor(Math.random() * CHEST_LOOT_TABLE.length)];
}

// ============================================================
// MODAL MANAGER
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
