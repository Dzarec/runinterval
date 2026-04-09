/**
 * workout.js – Ekran aktywnego treningu (#workout)
 *
 * Flow:
 *   prepareWorkout(workout) → ekran z przyciskiem START
 *   startNow()              → inicjuje audio, timer rusza, głos + dźwięki
 */

'use strict';

let pendingWorkout  = null;
let isRunning       = false;
let isPaused        = false;
let totalElapsedSec = 0;
let totalTimer      = null;
let lastPhase       = null;
let workoutResult   = null;

// ── Przygotowanie ─────────────────────────────────────────────────────────────

function prepareWorkout(workout) {
  pendingWorkout  = workout;
  isRunning       = false;
  isPaused        = false;
  totalElapsedSec = 0;
  lastPhase       = null;

  document.getElementById('workout-name-label').textContent     = workout.name || 'Trening';
  document.getElementById('workout-phase-name').textContent     = 'Gotowy?';
  document.getElementById('workout-timer').textContent          = '—';
  document.getElementById('workout-series').textContent         = '';
  document.getElementById('workout-total-time').textContent     = 'Czas: 0:00';
  document.getElementById('workout-distance').textContent       = '0.00 km';
  document.getElementById('workout-pace').textContent           = '--:--';
  document.getElementById('workout-stats-row').style.visibility = 'hidden';
  document.getElementById('gps-status').style.display           = 'none';
  document.getElementById('screen-workout').style.backgroundColor = '';
  document.getElementById('btn-start').style.display            = '';
  document.getElementById('btn-pause-resume').style.display     = 'none';
  document.getElementById('btn-stop').style.display             = 'none';

  renderPreviewTimeline(workout);
}

// ── START ─────────────────────────────────────────────────────────────────────

function startNow() {
  if (!pendingWorkout) return;

  // Inicjuj audio TUTAJ – po interakcji użytkownika (wymóg przeglądarek)
  window.Sound.initAudio();
  window.Voice.initVoice();
  window.Voice.startSpeechKeepAlive();

  isRunning = true;
  isPaused  = false;

  document.getElementById('btn-start').style.display            = 'none';
  document.getElementById('btn-pause-resume').style.display     = '';
  document.getElementById('btn-stop').style.display             = '';
  document.getElementById('btn-pause-resume').innerHTML         = '⏸ Pauza';
  document.getElementById('workout-stats-row').style.visibility = 'visible';
  document.getElementById('gps-status').style.display           = 'block';
  document.getElementById('workout-preview').style.display      = 'none';

  workoutResult = {
    id:          window.Storage.generateId('history'),
    workoutName: pendingWorkout.name,
    date:        new Date().toISOString(),
    track:       [],
    kmSplits:    [],
  };

  // Start GPS
  window.GPS.startTracking();

  // Komunikat startowy
  window.Voice.announceStart(pendingWorkout);

  // Timer
  Timer.startTimer(pendingWorkout, {
    onTick:   handleTick,
    onPhase:  handlePhaseChange,
    onFinish: handleFinish,
  });

  // Licznik całkowitego czasu
  stopTotalTimer();
  totalTimer = setInterval(() => {
    if (!isPaused) {
      totalElapsedSec++;
      document.getElementById('workout-total-time').textContent =
        'Czas: ' + Timer.formatTotalTime(totalElapsedSec);
    }
  }, 1000);
}

// ── Tick ──────────────────────────────────────────────────────────────────────

function handleTick(state) {
  if (!state) return;

  const timerEl = document.getElementById('workout-timer');
  timerEl.textContent = Timer.formatCountdown(state.remaining);

  // Pulsowanie + dźwięk odliczania w ostatnich 3 sekundach
  if (state.remaining <= 3 && state.remaining > 0 && !state.isPaused) {
    timerEl.classList.add('pulse');
    if (state.remaining === 3) {
      window.Sound.SOUNDS.countdown();
      window.Sound.VIBRATIONS.countdown();
      window.Voice.announceCountdown(3);
    }
  } else {
    timerEl.classList.remove('pulse');
  }

  // Numer serii
  const seriesEl = document.getElementById('workout-series');
  const isFastOrSlow = state.phase === Timer.PHASE.FAST || state.phase === Timer.PHASE.SLOW;
  if (isFastOrSlow && state.totalReps > 0) {
    seriesEl.textContent = `Seria ${state.currentRep} / ${state.totalReps}`;

  } else {
    seriesEl.textContent = '';
  }
}

// ── Zmiana fazy ───────────────────────────────────────────────────────────────

function handlePhaseChange(phase, state) {
  lastPhase = phase;
  setPhaseUI(phase);
  flashScreen();

  // Dźwięk + głos przy zmianie fazy
  if (phase === Timer.PHASE.FAST) {
    window.Sound.SOUNDS.fastStart();
    window.Sound.VIBRATIONS.phaseChange();
    window.Voice.announcePhase('fast');
    if (state) {
      window.Voice.announceHalfway(state.currentRep, state.totalReps);
      window.Voice.announceLastRep(state.currentRep, state.totalReps);
    }
  } else if (phase === Timer.PHASE.SLOW) {
    window.Sound.SOUNDS.slowStart();
    window.Sound.VIBRATIONS.phaseChange();
    window.Voice.announcePhase('slow');
  } else if (phase === Timer.PHASE.WARMUP) {
    window.Sound.SOUNDS.warmup();
  } else if (phase === Timer.PHASE.COOLDOWN) {
    window.Sound.SOUNDS.cooldown();
    window.Voice.announceCooldown(pendingWorkout);
  }
}

function setPhaseUI(phase) {
  document.getElementById('screen-workout').style.backgroundColor =
    Timer.PHASE_COLORS[phase] || '';
  document.getElementById('workout-phase-name').textContent =
    Timer.PHASE_LABELS[phase] || '';
  document.getElementById('workout-timer').classList.remove('pulse');
}

// ── Flash ─────────────────────────────────────────────────────────────────────

function flashScreen() {
  const flash = document.getElementById('phase-flash');
  if (!flash) return;
  flash.classList.remove('flash');
  void flash.offsetWidth;
  flash.classList.add('flash');
  setTimeout(() => flash.classList.remove('flash'), 150);
}

// ── Koniec ────────────────────────────────────────────────────────────────────

function handleFinish() {
  stopTotalTimer();
  window.GPS.stopTracking();
  window.Voice.stopSpeechKeepAlive();
  isRunning = false;
  document.getElementById('screen-workout').style.backgroundColor = '';

  const dist = window.GPS ? window.GPS.getTotalDistance() : 0;
  workoutResult.duration   = totalElapsedSec;
  workoutResult.distance   = dist;
  workoutResult.avgPace    = calcAvgPace(dist, totalElapsedSec);
  workoutResult.track      = window.GPS ? window.GPS.getTrackPoints() : [];
  workoutResult.kmSplits   = window.GPS ? window.GPS.getKmSplits()    : [];
  workoutResult.bestKmPace = bestKm(workoutResult.kmSplits);

  window.Sound.SOUNDS.finish();
  window.Sound.VIBRATIONS.finish();
  window.Voice.announceFinish(dist, totalElapsedSec);

  // Krótkie opóźnienie żeby głos zdążył powiedzieć komunikat przed przejściem
  setTimeout(() => {
    window.SummaryModule.show(workoutResult);
    App.navigate('summary');
  }, 1500);
}

// ── Pauza / wznowienie ────────────────────────────────────────────────────────

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  const btn = document.getElementById('btn-pause-resume');

  if (isPaused) {
    Timer.pauseTimer();
    btn.innerHTML = '▶ Wznów';
    document.getElementById('screen-workout').style.backgroundColor =
      Timer.PHASE_COLORS.paused;
    document.getElementById('workout-phase-name').textContent = 'Pauza';
    document.getElementById('workout-timer').classList.remove('pulse');
    window.Voice.speak('Pauza.');
  } else {
    Timer.resumeTimer();
    btn.innerHTML = '⏸ Pauza';
    const st = Timer.getState();
    if (st) setPhaseUI(st.phase);
    window.Voice.speak('Wznowiono.');
  }
}

// ── Stop ──────────────────────────────────────────────────────────────────────

function stop() {
  App.openModal('modal-stop');
}

function confirmStop() {
  App.closeModal('modal-stop');
  Timer.stopTimer();
  stopTotalTimer();
  window.GPS.stopTracking();
  window.Voice.stopSpeechKeepAlive();
  isRunning = false;
  document.getElementById('screen-workout').style.backgroundColor = '';
  document.getElementById('workout-timer').classList.remove('pulse');

  const dist = window.GPS ? window.GPS.getTotalDistance() : 0;
  workoutResult.duration   = totalElapsedSec;
  workoutResult.distance   = dist;
  workoutResult.avgPace    = calcAvgPace(dist, totalElapsedSec);
  workoutResult.track      = window.GPS ? window.GPS.getTrackPoints() : [];
  workoutResult.kmSplits   = window.GPS ? window.GPS.getKmSplits()    : [];
  workoutResult.bestKmPace = bestKm(workoutResult.kmSplits);

  window.SummaryModule.show(workoutResult);
  App.navigate('summary');
}

// ── Powrót ────────────────────────────────────────────────────────────────────

function goBack() {
  if (isRunning) { stop(); return; }
  pendingWorkout = null;
  App.navigate('select');
}

// ── GPS display ───────────────────────────────────────────────────────────────

function updateGpsDisplay(distKm, pace) {
  document.getElementById('workout-distance').textContent = distKm.toFixed(2) + ' km';
  document.getElementById('workout-pace').textContent     = pace;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stopTotalTimer() {
  if (totalTimer) { clearInterval(totalTimer); totalTimer = null; }
}

function calcAvgPace(distKm, durationSec) {
  if (!distKm || distKm < 0.05) return '--:--';
  const sPerKm = durationSec / distKm;
  return `${Math.floor(sPerKm / 60)}:${String(Math.floor(sPerKm % 60)).padStart(2, '0')}`;
}

function bestKm(splits) {
  if (!splits || !splits.length) return '--:--';
  const toSec = p => { const [m, s] = p.split(':').map(Number); return m * 60 + s; };
  return [...splits].sort((a, b) => toSec(a) - toSec(b))[0];
}

function renderPreviewTimeline(workout) {
  const bar  = document.getElementById('workout-preview-bar');
  const info = document.getElementById('workout-preview-time');
  const prev = document.getElementById('workout-preview');
  if (!bar || !workout) return;

  prev.style.display = '';

  const w = workout.warmup  || 0;
  const c = workout.cooldown || 0;
  const intervalTime = (workout.intervals || []).reduce(
    (s, b) => s + (b.fast + b.slow) * b.repeats, 0
  );
  const total = w + intervalTime + c;
  if (total === 0) { prev.style.display = 'none'; return; }

  const seg = (dur, color) =>
    `<div class="workout-preview-bar-segment"
          style="width:${(dur/total*100).toFixed(2)}%;background:${color}"></div>`;

  let html = '';
  if (w) html += seg(w, 'var(--phase-warmup)');
  (workout.intervals || []).forEach(b => {
    for (let i = 0; i < b.repeats; i++) {
      if (b.fast > 0) html += seg(b.fast, 'var(--phase-fast)');
      html += seg(b.slow, 'var(--phase-slow)');
    }
  });
  if (c) html += seg(c, 'var(--phase-cooldown)');

  bar.innerHTML  = html;
  info.textContent = window.WorkoutsData
    ? window.WorkoutsData.formatDuration(total)
    : `~${Math.round(total/60)} min`;
}

function onGpsFix() {
  const el = document.getElementById('gps-status');
  if (!el) return;
  el.textContent = '📡 GPS: aktywny';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

function onScreenEnter() {
  if (isRunning || pendingWorkout) return;
  App.navigate('select');
}

// ── Eksport ───────────────────────────────────────────────────────────────────

window.WorkoutModule = {
  prepareWorkout,
  startWorkout: prepareWorkout,
  onScreenEnter,
  startNow,
  togglePause,
  stop,
  confirmStop,
  goBack,
  updateGpsDisplay,
  onGpsFix,
  hasPending() { return pendingWorkout !== null; },
};
