/**
 * select.js – Ekran wyboru treningu (#select)
 */

'use strict';

// ── Render ────────────────────────────────────────────────────────────────────

function renderSelectScreen() {
  renderPresets();
  renderCustomWorkouts();
}

function renderPresets() {
  const container = document.getElementById('preset-list');
  if (!container) return;

  const { PRESET_WORKOUTS, levelLabel, formatIntervalParams, formatDuration, calcWorkoutDuration } = window.WorkoutsData;

  container.innerHTML = PRESET_WORKOUTS.map(w => {
    const lvl    = levelLabel(w.level);
    const dur    = formatDuration(calcWorkoutDuration(w));
    const params = formatIntervalParams(w);
    return `
      <div class="card workout-card">
        <div class="card-badge">
          <span>${lvl.icon}</span>
          <span style="color:var(--text-secondary)">${lvl.text}</span>
        </div>
        <div class="card-title">${escapeHtml(w.name)}</div>
        <div class="card-meta">${escapeHtml(w.description)}</div>
        <div class="card-meta" style="margin-top:6px;color:var(--text)">
          <strong>${params}</strong> &nbsp;·&nbsp; ${dur}
        </div>
        <button class="btn btn-primary"
                style="margin-top:12px;min-height:52px;font-size:1rem"
                onclick="SelectModule.selectWorkout('${w.id}', true)">
          ▶ Wybierz i przejdź do treningu
        </button>
      </div>`;
  }).join('');
}

function renderCustomWorkouts() {
  const container = document.getElementById('custom-workout-list');
  if (!container) return;

  const workouts = window.Storage.getCustomWorkouts();

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:16px 0">
        Brak własnych treningów.<br>
        <span style="color:var(--accent);cursor:pointer" onclick="App.goCreator()">
          Stwórz pierwszy w Kreatorze!
        </span>
      </div>`;
    return;
  }

  const { formatIntervalParams, formatDuration, calcWorkoutDuration } = window.WorkoutsData;

  container.innerHTML = workouts.map(w => {
    const dur    = formatDuration(calcWorkoutDuration(w));
    const params = formatIntervalParams(w);
    return `
      <div class="card workout-card"
           oncontextmenu="SelectModule.openCustomMenu(event,'${w.id}')"
           data-long-id="${w.id}">
        <div class="card-title">${escapeHtml(w.name)}</div>
        <div class="card-meta">${params} &nbsp;·&nbsp; ${dur}</div>
        <div class="card-meta" style="font-size:0.8rem;margin-top:4px">${formatDate(w.created)}</div>
        <button class="btn btn-primary"
                style="margin-top:12px;min-height:52px;font-size:1rem"
                onclick="SelectModule.selectWorkout('${w.id}', false)">
          ▶ Wybierz i przejdź do treningu
        </button>
      </div>`;
  }).join('');

  // Long-press → edit/delete menu
  container.querySelectorAll('[data-long-id]').forEach(el => {
    let t;
    el.addEventListener('touchstart', () => {
      t = setTimeout(() => SelectModule.openCustomMenu(null, el.dataset.longId), 600);
    }, { passive: true });
    el.addEventListener('touchend',  () => clearTimeout(t), { passive: true });
    el.addEventListener('touchmove', () => clearTimeout(t), { passive: true });
  });
}

// ── Wybór treningu → przejście do ekranu workout ──────────────────────────────

function selectWorkout(id, isPreset) {
  const workout = isPreset
    ? window.WorkoutsData.PRESET_WORKOUTS.find(w => w.id === id)
    : window.Storage.getCustomWorkouts().find(w => w.id === id);

  if (!workout) return;

  // Przekaż trening do WorkoutModule i przejdź na ekran
  window.WorkoutModule.prepareWorkout(workout);
  App.navigate('workout');
}

// ── Custom workout context menu ────────────────────────────────────────────────

function openCustomMenu(e, id) {
  if (e) e.preventDefault();
  const workout = window.Storage.getCustomWorkouts().find(w => w.id === id);
  if (!workout) return;

  const content = document.getElementById('custom-menu-content');
  content.innerHTML = `
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${escapeHtml(workout.name)}</div>
    <div style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px">Co chcesz zrobić?</div>
    <button class="btn btn-secondary" onclick="SelectModule.editWorkout('${id}')">✏️ Edytuj</button>
    <button class="btn" style="margin-top:10px;background:transparent;color:#e94560;border:1px solid #e94560"
            onclick="SelectModule.deleteWorkout('${id}')">🗑️ Usuń trening</button>
    <button class="btn btn-ghost" style="margin-top:10px"
            onclick="App.closeModal('modal-custom-menu')">Anuluj</button>
  `;
  App.openModal('modal-custom-menu');
}

function editWorkout(id) {
  App.closeModal('modal-custom-menu');
  window.CreatorModule.loadForEdit(id);
  App.navigate('creator');
}

function deleteWorkout(id) {
  App.closeModal('modal-custom-menu');
  if (confirm('Usunąć ten trening?')) {
    window.Storage.deleteCustomWorkout(id);
    renderCustomWorkouts();
    App.showToast('Trening usunięty');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('pl-PL', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return ''; }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
  );
}

window.SelectModule = {
  renderSelectScreen,
  selectWorkout,
  openCustomMenu,
  editWorkout,
  deleteWorkout,
};
