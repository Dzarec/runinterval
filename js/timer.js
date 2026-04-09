/**
 * timer.js – Logika timera interwałowego
 * Nazwy zmiennych prywatnych mają prefiks "tmr_" żeby uniknąć kolizji
 * z innymi plikami ładowanymi jako zwykłe skrypty (wspólny scope).
 */

'use strict';

// ── Stałe ─────────────────────────────────────────────────────────────────────

const PHASE = {
  WARMUP:   'warmup',
  FAST:     'fast',
  SLOW:     'slow',
  COOLDOWN: 'cooldown',
  DONE:     'done',
  PAUSED:   'paused',
};

const PHASE_COLORS = {
  warmup:   '#c47a2a',
  fast:     '#c73652',
  slow:     '#1e7a35',
  cooldown: '#005f8e',
  paused:   '#161b22',
};

const PHASE_LABELS = {
  warmup:   'Rozgrzewka',
  fast:     'Szybko!',
  slow:     'Wolno',
  cooldown: 'Schładzanie',
  paused:   'Pauza',
};

// ── Stan (prywatny) ───────────────────────────────────────────────────────────

let tmr_state    = null;
let tmr_interval = null;
let tmr_elapsed  = 0;
let tmr_onTick   = null;
let tmr_onPhase  = null;
let tmr_onFinish = null;

// ── API ───────────────────────────────────────────────────────────────────────

function startTimer(workout, callbacks) {
  tmr_onTick   = callbacks.onTick;
  tmr_onPhase  = callbacks.onPhase;
  tmr_onFinish = callbacks.onFinish;

  const queue = buildQueue(workout);

  tmr_state = {
    workout,
    queue,
    queueIndex: 0,
    phase:      queue[0].phase,
    remaining:  queue[0].duration,
    currentRep: queue[0].rep   || 0,
    totalReps:  queue[0].total || 0,
    blockIndex: queue[0].block || 0,
    isRunning:  true,
    isPaused:   false,
  };

  tmr_elapsed = 0;
  startTicking();
  tmr_onPhase?.(tmr_state.phase, tmr_state);
  tmr_onTick?.(tmr_state);
}

function pauseTimer() {
  if (!tmr_state || tmr_state.isPaused) return;
  tmr_state.isPaused  = true;
  tmr_state.isRunning = false;
  stopTicking();
  tmr_onTick?.(tmr_state);
}

function resumeTimer() {
  if (!tmr_state || !tmr_state.isPaused) return;
  tmr_state.isPaused  = false;
  tmr_state.isRunning = true;
  startTicking();
  tmr_onTick?.(tmr_state);
}

function stopTimer() {
  stopTicking();
  tmr_state   = null;
  tmr_elapsed = 0;
}

function getState()        { return tmr_state; }
function getTotalElapsed() { return tmr_elapsed; }

// ── Budowanie kolejki faz ─────────────────────────────────────────────────────

function buildQueue(workout) {
  const queue = [];

  if (workout.warmup > 0) {
    queue.push({ phase: PHASE.WARMUP, duration: workout.warmup });
  }

  workout.intervals.forEach((block, blockIdx) => {
    for (let rep = 1; rep <= block.repeats; rep++) {
      if (block.fast > 0) {
        queue.push({ phase: PHASE.FAST, duration: block.fast, rep, total: block.repeats, block: blockIdx });
      }
      queue.push({ phase: PHASE.SLOW, duration: block.slow, rep, total: block.repeats, block: blockIdx });
    }
  });

  if (workout.cooldown > 0) {
    queue.push({ phase: PHASE.COOLDOWN, duration: workout.cooldown });
  }

  queue.push({ phase: PHASE.DONE, duration: 0 });
  return queue;
}

// ── Tick ──────────────────────────────────────────────────────────────────────

function startTicking() {
  stopTicking();
  tmr_interval = setInterval(tick, 1000);
}

function stopTicking() {
  if (tmr_interval) { clearInterval(tmr_interval); tmr_interval = null; }
}

function tick() {
  if (!tmr_state || !tmr_state.isRunning) return;

  tmr_elapsed++;
  tmr_state.remaining--;

  tmr_onTick?.(tmr_state);

  if (tmr_state.remaining <= 0) advancePhase();
}

function advancePhase() {
  tmr_state.queueIndex++;
  const next = tmr_state.queue[tmr_state.queueIndex];

  if (!next || next.phase === PHASE.DONE) {
    stopTicking();
    tmr_state.phase     = PHASE.DONE;
    tmr_state.isRunning = false;
    tmr_onFinish?.({ totalElapsed: tmr_elapsed });
    return;
  }

  tmr_state.phase      = next.phase;
  tmr_state.remaining  = next.duration;
  tmr_state.currentRep = next.rep   || 0;
  tmr_state.totalReps  = next.total || 0;
  tmr_state.blockIndex = next.block || 0;

  tmr_onPhase?.(tmr_state.phase, tmr_state);
  tmr_onTick?.(tmr_state);
}

// ── Helpery ───────────────────────────────────────────────────────────────────

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTotalTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Eksport ───────────────────────────────────────────────────────────────────

window.Timer = {
  PHASE,
  PHASE_COLORS,
  PHASE_LABELS,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  getState,
  getTotalElapsed,
  formatCountdown,
  formatTotalTime,
};
