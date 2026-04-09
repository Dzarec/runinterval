/**
 * creator.js – Kreator treningu (#creator)
 */

'use strict';

let editingId = null; // null = nowy, string = edycja istniejącego

// ── Inicjalizacja ekranu ──────────────────────────────────────────────────────

// Wywołane przez app.js przy każdym wejściu na #creator – resetuje TYLKO jeśli nie edytujemy
function initCreatorIfNew() {
  if (editingId !== null) return; // loadForEdit ustawił już formularz – nie resetuj
  initCreator();
}

function initCreator() {
  editingId = null;
  document.getElementById('creator-name').value     = '';
  document.getElementById('creator-warmup').value   = '5';
  document.getElementById('creator-cooldown').value = '3';

  const container = document.getElementById('interval-blocks-container');
  container.innerHTML = '';
  addBlock(); // domyślnie jeden blok
  updatePreview();
}

function loadForEdit(id) {
  const workout = window.Storage.getCustomWorkouts().find(w => w.id === id);
  if (!workout) { initCreator(); return; }

  editingId = id;
  document.getElementById('creator-name').value    = workout.name || '';
  document.getElementById('creator-warmup').value  = Math.round((workout.warmup || 0) / 60);
  document.getElementById('creator-cooldown').value = Math.round((workout.cooldown || 0) / 60);

  const container = document.getElementById('interval-blocks-container');
  container.innerHTML = '';

  workout.intervals.forEach(block => addBlock(block));
  updatePreview();
}

// ── Bloki interwałów ──────────────────────────────────────────────────────────

let blockCounter = 0;

function addBlock(defaults = {}) {
  blockCounter++;
  const id  = `block-${blockCounter}`;
  const fast    = defaults.fast    !== undefined ? defaults.fast    : 20;
  const slow    = defaults.slow    !== undefined ? defaults.slow    : 40;
  const repeats = defaults.repeats !== undefined ? defaults.repeats : 8;

  const container = document.getElementById('interval-blocks-container');
  const blockIndex = container.children.length + 1;

  const div = document.createElement('div');
  div.className   = 'interval-block';
  div.dataset.bid = id;
  div.innerHTML = `
    <div class="interval-block-header">
      <span class="interval-block-title">Blok ${blockIndex}</span>
      <button class="btn-remove-block" onclick="CreatorModule.removeBlock('${id}')" title="Usuń blok">✕</button>
    </div>
    <div class="form-row">
      <label class="form-label">Faza szybka (s)</label>
      <input class="form-input" type="number" min="0" max="300" value="${fast}"
             oninput="CreatorModule.updatePreview()" data-field="fast">
    </div>
    <div class="form-row">
      <label class="form-label">Faza wolna (s)</label>
      <input class="form-input" type="number" min="5" max="300" value="${slow}"
             oninput="CreatorModule.updatePreview()" data-field="slow">
    </div>
    <div class="form-row">
      <label class="form-label">Powtórzenia</label>
      <input class="form-input" type="number" min="1" max="50" value="${repeats}"
             oninput="CreatorModule.updatePreview()" data-field="repeats">
    </div>
  `;
  container.appendChild(div);
  renumberBlocks();
  updatePreview();
}

function removeBlock(bid) {
  const container = document.getElementById('interval-blocks-container');
  if (container.children.length <= 1) {
    App.showToast('Trening musi mieć co najmniej jeden blok');
    return;
  }
  const el = container.querySelector(`[data-bid="${bid}"]`);
  if (el) el.remove();
  renumberBlocks();
  updatePreview();
}

function renumberBlocks() {
  document.querySelectorAll('#interval-blocks-container .interval-block').forEach((el, i) => {
    el.querySelector('.interval-block-title').textContent = `Blok ${i + 1}`;
  });
}

// ── Podgląd wizualny ──────────────────────────────────────────────────────────

function updatePreview() {
  const warmupMin  = parseFloat(document.getElementById('creator-warmup').value)  || 0;
  const cooldownMin = parseFloat(document.getElementById('creator-cooldown').value) || 0;
  const warmup   = warmupMin * 60;
  const cooldown = cooldownMin * 60;

  const blocks = getBlockData();

  const intervalTime = blocks.reduce((s, b) => s + (b.fast + b.slow) * b.repeats, 0);
  const total = warmup + intervalTime + cooldown;

  // Szacowany czas
  const estEl = document.getElementById('estimated-time');
  if (total > 0) {
    const min = Math.round(total / 60);
    estEl.textContent = `Szacowany czas: ~${min} min`;
  } else {
    estEl.textContent = 'Szacowany czas: —';
  }

  // Timeline bar
  const preview = document.getElementById('timeline-preview');
  if (!preview || total === 0) return;

  const segments = [];
  if (warmup)   segments.push({ color: 'var(--phase-warmup)',   duration: warmup });
  blocks.forEach(b => {
    for (let i = 0; i < b.repeats; i++) {
      if (b.fast > 0) segments.push({ color: 'var(--phase-fast)', duration: b.fast });
      segments.push({ color: 'var(--phase-slow)', duration: b.slow });
    }
  });
  if (cooldown) segments.push({ color: 'var(--phase-cooldown)', duration: cooldown });

  preview.innerHTML = segments.map(s => {
    const pct = (s.duration / total * 100).toFixed(2);
    return `<div class="timeline-preview-segment" style="width:${pct}%;background:${s.color}"></div>`;
  }).join('');
}

// ── Odczyt danych z bloków ────────────────────────────────────────────────────

function getBlockData() {
  const blocks = [];
  document.querySelectorAll('#interval-blocks-container .interval-block').forEach(el => {
    const fast    = parseInt(el.querySelector('[data-field="fast"]').value)    || 0;
    const slow    = parseInt(el.querySelector('[data-field="slow"]').value)    || 0;
    const repeats = parseInt(el.querySelector('[data-field="repeats"]').value) || 1;
    blocks.push({ fast, slow, repeats });
  });
  return blocks;
}

// ── Zapis ─────────────────────────────────────────────────────────────────────

function cre_save() {
  const name = document.getElementById('creator-name').value.trim();
  if (!name) {
    App.showToast('Podaj nazwę treningu');
    document.getElementById('creator-name').focus();
    return;
  }

  const warmupMin   = parseFloat(document.getElementById('creator-warmup').value)  || 0;
  const cooldownMin = parseFloat(document.getElementById('creator-cooldown').value) || 0;
  const blocks = getBlockData();

  // Walidacja bloków
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.fast === 0 && b.slow === 0) {
      App.showToast(`Blok ${i + 1}: faza szybka lub wolna musi mieć czas > 0`);
      return;
    }
    if (b.repeats < 1) {
      App.showToast(`Blok ${i + 1}: powtórzenia muszą być ≥ 1`);
      return;
    }
  }

  const workout = {
    id:        editingId || window.Storage.generateId('custom'),
    name,
    warmup:    Math.round(warmupMin * 60),
    intervals: blocks,
    cooldown:  Math.round(cooldownMin * 60),
    created:   editingId
      ? (window.Storage.getCustomWorkouts().find(w => w.id === editingId)?.created || new Date().toISOString())
      : new Date().toISOString(),
    isPreset:  false,
  };

  window.Storage.saveCustomWorkout(workout);
  App.showToast(editingId ? 'Trening zaktualizowany!' : 'Trening zapisany!');

  editingId = null;
  App.navigate('select');
}

// ── Lifecycle: init przy każdym wejściu na ekran ──────────────────────────────

window.CreatorModule = {
  initCreator,
  initCreatorIfNew,
  loadForEdit,
  addBlock,
  removeBlock,
  updatePreview,
  save: cre_save,
};
