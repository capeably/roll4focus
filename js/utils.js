// ============================================================
// UTILITIES
// ============================================================
function escapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
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
