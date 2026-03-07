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

// ============================================================
// MODAL MANAGER
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
