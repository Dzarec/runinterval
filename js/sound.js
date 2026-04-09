/**
 * sound.js – Dźwięki bip (Web Audio API) + wibracje
 * AudioContext tworzony po pierwszej interakcji użytkownika (wymóg przeglądarek).
 */

'use strict';

let snd_ctx = null;

// ── Inicjalizacja ─────────────────────────────────────────────────────────────

function initAudio() {
  if (snd_ctx) return;
  try {
    snd_ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Odblokuj audio na iOS – zagraj ciszę
    const buf = snd_ctx.createBuffer(1, 1, 22050);
    const src = snd_ctx.createBufferSource();
    src.buffer = buf;
    src.connect(snd_ctx.destination);
    src.start(0);
  } catch (e) {
    console.warn('Web Audio API niedostępne:', e);
    snd_ctx = null;
  }
}

// ── Generator bipów ───────────────────────────────────────────────────────────

function playBeep(frequency, durationMs, times = 1, gapMs = 250) {
  if (!snd_ctx) return;
  // Wznów jeśli browser zawiesił kontekst (np. po przejściu do tła)
  if (snd_ctx.state === 'suspended') snd_ctx.resume();

  for (let i = 0; i < times; i++) {
    const osc  = snd_ctx.createOscillator();
    const gain = snd_ctx.createGain();
    osc.connect(gain);
    gain.connect(snd_ctx.destination);

    osc.type            = 'sine';
    osc.frequency.value = frequency;

    const t0 = snd_ctx.currentTime + i * (durationMs + gapMs) / 1000;
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000);

    osc.start(t0);
    osc.stop(t0 + durationMs / 1000);
  }
}

// ── Predefiniowane dźwięki ────────────────────────────────────────────────────

const SOUNDS = {
  fastStart:  () => playBeep(880, 200),          // wysoki – faza szybka
  slowStart:  () => playBeep(440, 200),           // niski  – faza wolna
  warmup:     () => playBeep(550, 150),           // średni – rozgrzewka
  cooldown:   () => playBeep(330, 200),           // niski  – schładzanie
  countdown:  () => playBeep(660, 80, 2, 150),    // podwójny – odliczanie
  finish:     () => playBeep(880, 150, 3, 120),   // potrójny – koniec
};

// ── Wibracje ──────────────────────────────────────────────────────────────────

function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch (_) {}
}

const VIBRATIONS = {
  phaseChange: () => vibrate(200),
  countdown:   () => vibrate([80, 50, 80]),
  finish:      () => vibrate([200, 100, 200, 100, 400]),
};

// ── Eksport ───────────────────────────────────────────────────────────────────

window.Sound = { initAudio, playBeep, SOUNDS, VIBRATIONS };
