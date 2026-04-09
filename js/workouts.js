/**
 * workouts.js – 8 gotowych planów treningowych
 */

'use strict';

const PRESET_WORKOUTS = [
  {
    id: 'preset-1',
    name: 'Pierwsze interwały',
    level: 'beginner',
    description: 'Łagodne wprowadzenie. Minuta biegu, dwie minuty marszu.',
    warmup: 300,
    intervals: [{ fast: 60, slow: 120, repeats: 8 }],
    cooldown: 180,
    isPreset: true,
  },
  {
    id: 'preset-2',
    name: 'Krótkie przyspieszenia',
    level: 'beginner',
    description: 'Szybkie 15-sekundowe przyspieszenia z odpoczynkiem.',
    warmup: 300,
    intervals: [{ fast: 15, slow: 45, repeats: 10 }],
    cooldown: 180,
    isPreset: true,
  },
  {
    id: 'preset-3',
    name: 'Marsz-bieg',
    level: 'beginner',
    description: 'Naprzemiennie 30 sekund biegu i 30 sekund marszu.',
    warmup: 300,
    intervals: [{ fast: 30, slow: 30, repeats: 12 }],
    cooldown: 180,
    isPreset: true,
  },
  {
    id: 'preset-4',
    name: 'Klasyczne interwały',
    level: 'intermediate',
    description: 'Sprawdzony schemat: 20 sekund szybko, 40 wolno.',
    warmup: 300,
    intervals: [{ fast: 20, slow: 40, repeats: 12 }],
    cooldown: 180,
    isPreset: true,
  },
  {
    id: 'preset-5',
    name: 'Piramida',
    level: 'intermediate',
    description: 'Narastające interwały: od 10s do 60s, potem w dół.',
    warmup: 300,
    intervals: [
      { fast: 10, slow: 10, repeats: 1 },
      { fast: 20, slow: 20, repeats: 1 },
      { fast: 30, slow: 30, repeats: 1 },
      { fast: 40, slow: 40, repeats: 1 },
      { fast: 50, slow: 50, repeats: 1 },
      { fast: 60, slow: 60, repeats: 1 },
      { fast: 50, slow: 50, repeats: 1 },
      { fast: 40, slow: 40, repeats: 1 },
      { fast: 30, slow: 30, repeats: 1 },
      { fast: 20, slow: 20, repeats: 1 },
      { fast: 10, slow: 10, repeats: 1 },
    ],
    cooldown: 180,
    isPreset: true,
  },
  {
    id: 'preset-6',
    name: 'Tempo run',
    level: 'intermediate',
    description: 'Dłuższe szybkie odcinki budujące wytrzymałość tempową.',
    warmup: 300,
    intervals: [{ fast: 180, slow: 60, repeats: 5 }],
    cooldown: 180,
    isPreset: true,
  },
  {
    id: 'preset-7',
    name: 'Tabata biegowa',
    level: 'advanced',
    description: 'Intensywne 20/10 w 3 blokach. Między blokami 2 min odpoczynku.',
    warmup: 300,
    intervals: [
      { fast: 20, slow: 10, repeats: 8 },
      { fast: 0,  slow: 120, repeats: 1 },
      { fast: 20, slow: 10, repeats: 8 },
      { fast: 0,  slow: 120, repeats: 1 },
      { fast: 20, slow: 10, repeats: 8 },
    ],
    cooldown: 180,
    isPreset: true,
  },
  {
    id: 'preset-8',
    name: 'Długie interwały',
    level: 'advanced',
    description: 'Dwie minuty szybkiego biegu, minuta odpoczynku. Poważne wyzwanie.',
    warmup: 300,
    intervals: [{ fast: 120, slow: 60, repeats: 8 }],
    cooldown: 180,
    isPreset: true,
  },
];

/**
 * Oblicza szacowany czas treningu w sekundach
 */
function calcWorkoutDuration(workout) {
  const intervalTime = workout.intervals.reduce((sum, block) => {
    const blockTime = (block.fast + block.slow) * block.repeats;
    return sum + blockTime;
  }, 0);
  return workout.warmup + intervalTime + workout.cooldown;
}

/**
 * Formatuje sekundy jako "X min" lub "Xh Ymin"
 */
function formatDuration(seconds) {
  const min = Math.round(seconds / 60);
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `~${h}h ${m}min`;
}

/**
 * Formatuje parametry interwałów do krótkiego opisu, np. "60s/120s × 8"
 */
function formatIntervalParams(workout) {
  if (workout.intervals.length === 1) {
    const b = workout.intervals[0];
    if (b.fast === 0) return `Odpoczynek ${b.slow}s × ${b.repeats}`;
    return `${b.fast}s/${b.slow}s × ${b.repeats}`;
  }
  return `${workout.intervals.length} bloki`;
}

/**
 * Zwraca emoji i tekst poziomu trudności
 */
function levelLabel(level) {
  const map = {
    beginner:     { icon: '🟢', text: 'Początkujący' },
    intermediate: { icon: '🟡', text: 'Średni' },
    advanced:     { icon: '🔴', text: 'Zaawansowany' },
  };
  return map[level] || { icon: '⚪', text: level };
}

window.WorkoutsData = {
  PRESET_WORKOUTS,
  calcWorkoutDuration,
  formatDuration,
  formatIntervalParams,
  levelLabel,
};
