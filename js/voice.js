/**
 * voice.js – Synteza mowy po polsku (Web Speech API)
 * Obsługa iOS bug: speechSynthesis zawiesza się po ~15s ciszy.
 */

'use strict';

let voc_voice     = null;
let voc_keepAlive = null;
let voc_lastKm    = 0;   // ostatni ogłoszony kilometr (reset przy starcie)

// ── Inicjalizacja ─────────────────────────────────────────────────────────────

function initVoice() {
  const pick = () => {
    const voices = speechSynthesis.getVoices();
    voc_voice = voices.find(v => v.lang === 'pl-PL')
             || voices.find(v => v.lang.startsWith('pl'))
             || null;
  };
  pick();
  if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
    speechSynthesis.onvoiceschanged = pick;
  }
}

// ── Mów ───────────────────────────────────────────────────────────────────────

function speak(text, priority = false) {
  if (!window.speechSynthesis) return;
  if (priority) speechSynthesis.cancel();

  const utt      = new SpeechSynthesisUtterance(text);
  utt.lang       = 'pl-PL';
  utt.rate       = 1.05;
  utt.pitch      = 1.0;
  utt.volume     = 1.0;
  if (voc_voice) utt.voice = voc_voice;

  speechSynthesis.speak(utt);
}

// ── iOS keep-alive ────────────────────────────────────────────────────────────

function startSpeechKeepAlive() {
  stopSpeechKeepAlive();
  voc_keepAlive = setInterval(() => {
    if (speechSynthesis.speaking) return;
    speechSynthesis.pause();
    speechSynthesis.resume();
  }, 10000);
}

function stopSpeechKeepAlive() {
  if (voc_keepAlive) { clearInterval(voc_keepAlive); voc_keepAlive = null; }
}

// ── Konwersja liczb na polskie słowa ─────────────────────────────────────────

const PL_NUMS = [
  'zero','jeden','dwa','trzy','cztery','pięć','sześć','siedem',
  'osiem','dziewięć','dziesięć','jedenaście','dwanaście','trzynaście',
  'czternaście','piętnaście','szesnaście','siedemnaście','osiemnaście',
  'dziewiętnaście','dwadzieścia',
];

function numberToPolish(n) {
  if (n <= 20)  return PL_NUMS[n];
  if (n < 30)   return 'dwadzieścia ' + (n % 10 ? PL_NUMS[n % 10] : '');
  if (n < 40)   return 'trzydzieści ' + (n % 10 ? PL_NUMS[n % 10] : '');
  if (n < 50)   return 'czterdzieści ' + (n % 10 ? PL_NUMS[n % 10] : '');
  if (n < 60)   return 'pięćdziesiąt ' + (n % 10 ? PL_NUMS[n % 10] : '');
  return String(n);
}

function paceToWords(paceStr) {
  // "5:12" → "pięć minut dwanaście sekund"
  if (!paceStr || paceStr === '--:--') return '';
  const [min, sec] = paceStr.split(':').map(Number);
  const minWord = numberToPolish(min);
  if (!sec) return `${minWord} minut`;
  return `${minWord} minut ${numberToPolish(sec)}`;
}

function minutesToWords(totalSec) {
  const m = Math.floor(totalSec / 60);
  if (m <= 1) return 'minutę';
  if (m <= 4) return `${numberToPolish(m)} minuty`;
  return `${numberToPolish(m)} minut`;
}

// ── Komunikaty treningowe ─────────────────────────────────────────────────────

function announceStart(workout) {
  voc_lastKm = 0;
  const warmupMin = Math.round((workout.warmup || 0) / 60);
  speak(`Trening rozpoczęty. Rozgrzewka, ${minutesToWords(workout.warmup)}.`, true);
}

function announcePhase(phase) {
  const msg = {
    warmup:   null,   // ogłaszane przez announceStart
    fast:     'Start! Szybko!',
    slow:     'Zwolnij. Odpoczynek.',
    cooldown: null,   // ogłaszane przez announceCooldown
  }[phase];
  if (msg) speak(msg, true);
}

function announceCooldown(workout) {
  const m = Math.round((workout.cooldown || 0) / 60);
  speak(`Schładzanie. ${minutesToWords(workout.cooldown)}. Świetny trening!`, true);
}

function announceCountdown(seconds) {
  if (seconds === 3) speak('Trzy... dwa... jeden...');
}

function announceHalfway(rep, total) {
  if (rep === Math.floor(total / 2) && rep > 0) {
    speak('Połowa za tobą! Trzymaj tempo!');
  }
}

function announceLastRep(rep, total) {
  if (rep === total) speak('Ostatnia seria! Dasz radę!');
}

function announceFinish(distanceKm, durationSec) {
  const km  = Math.floor(distanceKm);
  const m   = Math.round((distanceKm - km) * 1000);
  const min = Math.floor(durationSec / 60);
  const sec = durationSec % 60;

  let distText = '';
  if (distanceKm >= 0.05) {
    distText = `Dystans: ${numberToPolish(km)} kilometrów ${m > 0 ? numberToPolish(m) + ' metrów' : ''}.`;
  }

  speak(
    `Trening zakończony! ${distText} Czas: ${numberToPolish(min)} minut ${numberToPolish(sec)} sekund. Brawo!`,
    true
  );
  window.Sound?.VIBRATIONS?.finish();
}

function kmNoun(n) {
  if (n === 1)       return 'kilometr';
  if (n <= 4)        return 'kilometry';
  return 'kilometrów';
}

function announceKilometer(km, paceStr) {
  const kmWord   = numberToPolish(km);
  const paceWord = paceToWords(paceStr);
  const text = paceWord
    ? `${kmWord} ${kmNoun(km)}. Tempo: ${paceWord}.`
    : `${kmWord} ${kmNoun(km)}.`;
  speak(text);
}

// ── Eksport ───────────────────────────────────────────────────────────────────

window.Voice = {
  initVoice,
  speak,
  startSpeechKeepAlive,
  stopSpeechKeepAlive,
  announceStart,
  announcePhase,
  announceCooldown,
  announceCountdown,
  announceHalfway,
  announceLastRep,
  announceFinish,
  announceKilometer,
  numberToPolish,
  paceToWords,
};
