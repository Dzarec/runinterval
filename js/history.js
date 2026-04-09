/**
 * history.js – Historia treningów: lista, szczegóły, eksport, import
 */

'use strict';

// ── Lista ─────────────────────────────────────────────────────────────────────

function renderHistoryScreen() {
  const list = document.getElementById('history-list');
  if (!list) return;

  const history = window.Storage?.getHistory() || [];

  if (history.length === 0) {
    list.innerHTML =
      '<p class="empty-state"><span class="empty-icon">📊</span>Brak treningów.<br>Czas na pierwszy bieg!</p>';
    return;
  }

  list.innerHTML = history.map(e => `
    <div class="card history-card" onclick="HistoryModule.showDetail('${escHtml(e.id)}')">
      <div class="history-card-date">${histDate(e.date)}</div>
      <div class="history-card-name">${escHtml(e.workoutName || '—')}</div>
      <div class="history-card-stats">
        <span><strong>${(e.distance || 0).toFixed(2)} km</strong></span>
        <span>${fmtDuration(e.duration || 0)}</span>
        <span>${e.avgPace || '--:--'} /km</span>
      </div>
    </div>`).join('');
}

// ── Szczegóły ─────────────────────────────────────────────────────────────────

function showDetail(id) {
  const entry = (window.Storage?.getHistory() || []).find(e => e.id === id);
  if (!entry) return;

  const hasMap    = entry.track && entry.track.length >= 2;
  const hasSplits = entry.kmSplits && entry.kmSplits.length > 0;

  const splitsHtml = hasSplits
    ? `<div class="section-label" style="margin-top:12px">Tempo na km</div>
       <div class="km-splits-list">
         ${entry.kmSplits.map((pace, i) => `
           <div class="km-split-row">
             <span class="km-label">Km ${i + 1}</span>
             <span class="km-pace">${pace} /km</span>
           </div>`).join('')}
       </div>`
    : '';

  document.getElementById('modal-detail-content').innerHTML = `
    <div class="workout-detail-header">
      <div style="font-size:0.8rem;opacity:0.8;margin-bottom:4px">${histDate(entry.date)}</div>
      <div style="font-size:1.3rem;font-weight:800;color:#fff">${escHtml(entry.workoutName || '—')}</div>
    </div>

    <div class="stats-grid" style="margin-top:16px">
      <div class="stat-box">
        <div class="stat-box-value">${(entry.distance || 0).toFixed(2)} km</div>
        <div class="stat-box-label">Dystans</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-value">${fmtDuration(entry.duration || 0)}</div>
        <div class="stat-box-label">Czas</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-value">${entry.avgPace || '--:--'}</div>
        <div class="stat-box-label">Śr. tempo /km</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-value">${entry.bestKmPace || '--:--'}</div>
        <div class="stat-box-label">Najlepszy km</div>
      </div>
    </div>

    ${hasMap ? '<div id="detail-map" class="map-container" style="margin-top:12px"></div>' : ''}

    ${splitsHtml}

    <button class="btn" style="margin-top:8px;color:var(--accent);border:1px solid var(--accent);background:transparent"
            onclick="HistoryModule.deleteEntry('${escHtml(id)}')">
      🗑️ Usuń trening
    </button>
  `;

  App.openModal('modal-detail');

  if (hasMap) {
    setTimeout(() => window.MapModule?.renderMap('detail-map', entry.track), 150);
  }
}

// ── Usuń wpis ─────────────────────────────────────────────────────────────────

function deleteEntry(id) {
  App.confirmModal(
    'Usunąć trening?',
    'Tej operacji nie można cofnąć.',
    'Tak, usuń',
    () => {
      window.Storage?.deleteHistoryEntry(id);
      App.closeModal('modal-detail');
      App.showToast('Trening usunięty.');
      renderHistoryScreen();
    }
  );
}

// ── Eksport / Import ──────────────────────────────────────────────────────────

function exportData() {
  window.Storage?.exportAllData();
  App.showToast('Eksport gotowy!');
}

function triggerImport() {
  document.getElementById('import-file-input')?.click();
}

function importData(fileInput) {
  const file = fileInput.files?.[0];
  if (!file) return;
  fileInput.value = '';

  App.confirmModal(
    'Zaimportować dane?',
    'Obecne dane zostaną nadpisane.',
    'Tak, importuj',
    () => {
      window.Storage?.importAllData(
        file,
        () => { renderHistoryScreen(); App.showToast('Import zakończony!'); },
        (msg) => App.showToast(msg)
      );
    }
  );
}

// ── Helpery ───────────────────────────────────────────────────────────────────

function histDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pl-PL', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g,
    c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// ── Eksport ───────────────────────────────────────────────────────────────────

window.HistoryModule = {
  renderHistoryScreen,
  showDetail,
  deleteEntry,
  exportData,
  triggerImport,
  importData,
};
