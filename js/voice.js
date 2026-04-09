/**
 * voice.js – Synteza mowy po polsku (Web Speech API)
 * Obsługa iOS bug: speechSynthesis zawiesza się po ~15s ciszy.
 */

'use strict';

let voc_voice     = null;
let voc_keepAlive = null;

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

// ── Konwersja liczb na polskie słowa (0–999) ──────────────────────────────────

const PL_NUMS = [
  'zero','jeden','dwa','trzy','cztery','pięć','sześć','siedem',
  'osiem','dziewięć','dziesięć','jedenaście','dwanaście','trzynaście',
  'czternaście','piętnaście','szesnaście','siedemnaście','osiemnaście',
  'dziewiętnaście','dwadzieścia',
];

const PL_TENS = [
  '','','dwadzieścia','trzydzieści','czterdzieści',
  'pięćdziesiąt','sześćdziesiąt','siedemdziesiąt','osiemdziesiąt','dziewięćdziesiąt',
];

const PL_HUNDREDS = [
  '','sto','dwieście','trzysta','czterysta',
  'pięćset','sześćset','siedemset','osiemset','dziewięćset',
];

function numberToPolish(n) {
  n = Math.floor(n);
  if (n < 0)   return String(n);
  if (n <= 20) return PL_NUMS[n];
  if (n < 100) {
    const parts = [PL_TENS[Math.floor(n / 10)]];
    if (n % 10) parts.push(PL_NUMS[n % 10]);
    return parts.join(' ');
  }
  if (n < 1000) {
    const parts = [PL_HUNDREDS[Math.floor(n / 100)]];
    if (n % 100) parts.push(numberToPolish(n % 100));
    return parts.join(' ');
  }
  return String(n);
}

function paceToWords(paceStr) {
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

// ── Rzeczowniki ───────────────────────────────────────────────────────────────

function kmNoun(n) {
  if (n === 1)  return 'kilometr';
  if (n <= 4)   return 'kilometry';
  return 'kilometrów';
}

function mNoun(n) {
  if (n === 1)  return 'metr';
  if (n <= 4)   return 'metry';
  return 'metrów';
}

// ── Komunikaty treningowe ─────────────────────────────────────────────────────

function announceStart(workout) {
  const warmupPart = workout.warmup > 0
    ? ` Rozgrzewka, ${minutesToWords(workout.warmup)}.`
    : '';
  speak(`Trening rozpoczęty.${warmupPart}`, true);
}

function announcePhase(phase) {
  const msg = {
    warmup:   null,
    fast:     'Start! Szybko!',
    slow:     'Zwolnij. Odpoczynek.',
    cooldown: null,
  }[phase];
  if (msg) speak(msg, true);
}

function announceCooldown(workout) {
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
  const sec = Math.floor(durationSec % 60);

  let distText = '';
  if (distanceKm >= 0.05) {
    const kmText = `${numberToPolish(km)} ${kmNoun(km)}`;
    const mText  = m > 0 ? ` ${numberToPolish(m)} ${mNoun(m)}` : '';
    distText = `Dystans: ${kmText}${mText}. `;
  }

  const secPart = sec > 0 ? ` ${numberToPolish(sec)} sekund` : '';
  speak(
    `Trening zakończony! ${distText}Czas: ${numberToPolish(min)} minut${secPart}. Brawo!`,
    true
  );
  window.Sound?.VIBRATIONS?.finish();
}

function announceKilometer(km, paceStr) {
  const paceWord = paceToWords(paceStr);
  const text = paceWord
    ? `${numberToPolish(km)} ${kmNoun(km)}. Tempo: ${paceWord}.`
    : `${numberToPolish(km)} ${kmNoun(km)}.`;
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
