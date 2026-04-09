/**
 * summary.js – Ekran podsumowania treningu (#summary)
 */

'use strict';

let sum_result = null;

// ── Pokaż podsumowanie ────────────────────────────────────────────────────────

function show(result) {
  sum_result = result;

  // Dystans
  document.getElementById('summary-distance').textContent =
    result.distance && result.distance >= 0.01
      ? result.distance.toFixed(2) + ' km'
      : '— km';

  // Czas
  document.getElementById('summary-duration').textContent =
    Timer.formatTotalTime(result.duration || 0);

  // Tempo średnie
  document.getElementById('summary-avg-pace').textContent =
    result.avgPace || '--:--';

  // Najlepszy km
  document.getElementById('summary-best-km').textContent =
    result.bestKmPace || '--:--';

  // Splits per km
  const splitsEl = document.getElementById('summary-splits');
  if (result.kmSplits && result.kmSplits.length > 0) {
    splitsEl.innerHTML = result.kmSplits.map((pace, i) => `
      <div class="km-split-row">
        <span class="km-label">Km ${i + 1}</span>
        <span class="km-pace">${pace} /km</span>
      </div>`).join('');
  } else {
    splitsEl.innerHTML =
      '<p class="text-muted" style="font-size:0.9rem;padding:8px 0">Brak danych GPS</p>';
  }

  // Mapa
  if (window.MapModule && result.track && result.track.length >= 2) {
    window.MapModule.renderMap('summary-map', result.track);
  } else {
    document.getElementById('summary-map').innerHTML =
      '<p style="text-align:center;color:var(--text-secondary);padding:90px 16px;font-size:0.9rem">Brak danych GPS do mapy.</p>';
  }
}

// ── Zapisz ────────────────────────────────────────────────────────────────────

function sum_save() {
  if (!sum_result) return;
  window.Storage.saveHistoryEntry(sum_result);
  App.showToast('Trening zapisany! 🎉');
  App.navigate('history');
}

// ── Odrzuć ────────────────────────────────────────────────────────────────────

function discard() {
  App.openModal('modal-discard');
}

function confirmDiscard() {
  App.closeModal('modal-discard');
  sum_result = null;
  App.goHome();
}

// ── Eksport ───────────────────────────────────────────────────────────────────

window.SummaryModule = { show, save: sum_save, discard, confirmDiscard };
