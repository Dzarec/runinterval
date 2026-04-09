/**
 * storage.js – wrapper na localStorage z obsługą błędów
 */

'use strict';

const KEYS = {
  CUSTOM_WORKOUTS: 'runinterval_custom_workouts',
  HISTORY:         'runinterval_history',
};

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Błąd zapisu:', e);
    alert('Nie udało się zapisać danych. Pamięć może być pełna.');
    return false;
  }
}

function loadData(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Błąd odczytu:', e);
    return defaultValue;
  }
}

// ── Custom workouts ───────────────────────────────────────────────────────────

function getCustomWorkouts() {
  return loadData(KEYS.CUSTOM_WORKOUTS, []);
}

function saveCustomWorkout(workout) {
  const list = getCustomWorkouts();
  const existing = list.findIndex(w => w.id === workout.id);
  if (existing >= 0) {
    list[existing] = workout;
  } else {
    list.push(workout);
  }
  return saveData(KEYS.CUSTOM_WORKOUTS, list);
}

function deleteCustomWorkout(id) {
  const list = getCustomWorkouts().filter(w => w.id !== id);
  return saveData(KEYS.CUSTOM_WORKOUTS, list);
}

// ── History ───────────────────────────────────────────────────────────────────

function getHistory() {
  return loadData(KEYS.HISTORY, []);
}

function saveHistoryEntry(entry) {
  const list = getHistory();
  list.unshift(entry); // newest first
  return saveData(KEYS.HISTORY, list);
}

function deleteHistoryEntry(id) {
  const list = getHistory().filter(e => e.id !== id);
  return saveData(KEYS.HISTORY, list);
}

// ── Export / Import ───────────────────────────────────────────────────────────

function exportAllData() {
  const data = {
    version: 1,
    exported: new Date().toISOString(),
    customWorkouts: getCustomWorkouts(),
    history: getHistory(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `runinterval-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importAllData(file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.version && Array.isArray(data.customWorkouts) && Array.isArray(data.history)) {
        if (confirm('Zaimportować dane? Obecne dane zostaną nadpisane.')) {
          saveData(KEYS.CUSTOM_WORKOUTS, data.customWorkouts);
          saveData(KEYS.HISTORY, data.history);
          if (onDone) onDone();
        }
      } else {
        alert('Nieprawidłowy format pliku.');
      }
    } catch {
      alert('Błąd odczytu pliku.');
    }
  };
  reader.readAsText(file);
}

// ── UUID ──────────────────────────────────────────────────────────────────────

function generateId(prefix = 'custom') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

window.Storage = {
  KEYS,
  getCustomWorkouts,
  saveCustomWorkout,
  deleteCustomWorkout,
  getHistory,
  saveHistoryEntry,
  deleteHistoryEntry,
  exportAllData,
  importAllData,
  generateId,
};
