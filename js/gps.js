/**
 * gps.js – GPS tracking, dystans Haversine, tempo, Wake Lock
 */

'use strict';

// ── Stan (prefiks gps_ dla uniknięcia kolizji) ────────────────────────────────

let gps_watchId       = null;
let gps_points        = [];      // [{lat, lng, time}]
let gps_totalDist     = 0;       // metry
let gps_lastKm        = 0;       // ostatni ogłoszony km
let gps_kmSplits      = [];      // ["5:12", "4:58", ...]
let gps_kmStartTime   = 0;       // timestamp początku aktualnego km
let gps_updateTimer   = null;    // setInterval dla UI (co 3s)
let gps_wakeLock      = null;
let gps_isTracking    = false;

// ── Start / Stop ──────────────────────────────────────────────────────────────

function startTracking() {
  gps_points      = [];
  gps_totalDist   = 0;
  gps_lastKm      = 0;
  gps_kmSplits    = [];
  gps_kmStartTime = Date.now();
  gps_isTracking  = true;

  if (!navigator.geolocation) {
    console.warn('Geolocation niedostępna');
    return;
  }

  gps_watchId = navigator.geolocation.watchPosition(
    onPosition,
    onError,
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );

  // Aktualizuj UI co 3 sekundy (oszczędność baterii)
  gps_updateTimer = setInterval(updateUI, 3000);

  requestWakeLock();
}

function stopTracking() {
  gps_isTracking = false;
  if (gps_watchId !== null) {
    navigator.geolocation.clearWatch(gps_watchId);
    gps_watchId = null;
  }
  if (gps_updateTimer) { clearInterval(gps_updateTimer); gps_updateTimer = null; }
  releaseWakeLock();
}

// ── Obsługa pozycji ───────────────────────────────────────────────────────────

function onPosition(pos) {
  if (!gps_isTracking) return;

  const { latitude, longitude, accuracy } = pos.coords;

  // Odrzuć bardzo słabą dokładność (na desktop accuracy może być 500-1000m)
  if (accuracy > 500) return;

  const point = { lat: latitude, lng: longitude, time: Date.now() };

  if (gps_points.length > 0) {
    const prev = gps_points[gps_points.length - 1];
    const dist = haversine(prev.lat, prev.lng, latitude, longitude);

    // Odrzuć szum (< 1m) i nierealistyczne skoki (> 50 m/s)
    if (dist < 1) return;
    const dt = (point.time - prev.time) / 1000;
    if (dt > 0 && dist / dt > 50) return;

    gps_totalDist += dist;

    // Sprawdź nowy kilometr
    const currentKm = Math.floor(gps_totalDist / 1000);
    if (currentKm > gps_lastKm) {
      const elapsed = (Date.now() - gps_kmStartTime) / 1000;
      const pace    = formatPace(elapsed);
      gps_kmSplits.push(pace);
      window.Voice?.announceKilometer(currentKm, pace);
      gps_lastKm      = currentKm;
      gps_kmStartTime = Date.now();
    }
  }

  gps_points.push(point);
}

function onError(err) {
  console.warn('GPS error:', err.message);
  if (err.code === 1) {
    // PERMISSION_DENIED
    window.App?.showToast('GPS: brak uprawnień. Dystans nie będzie mierzony.');
  }
}

// ── Aktualizacja UI ───────────────────────────────────────────────────────────

function updateUI() {
  if (!gps_isTracking || !window.WorkoutModule) return;
  const distKm = gps_totalDist / 1000;
  const pace   = getCurrentPace();
  window.WorkoutModule.updateGpsDisplay(distKm, pace);
}

// ── Tempo bieżące (z ostatnich 30 sekund) ────────────────────────────────────

function getCurrentPace() {
  if (gps_points.length < 2) return '--:--';
  const now    = Date.now();
  const recent = gps_points.filter(p => now - p.time < 30000);
  if (recent.length < 2) return '--:--';

  const first = recent[0];
  const last  = recent[recent.length - 1];
  const dist  = haversine(first.lat, first.lng, last.lat, last.lng);
  if (dist < 5) return '--:--';

  const time = (last.time - first.time) / 1000;
  return formatPace(time / (dist / 1000));
}

// ── Helpery ───────────────────────────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

function formatPace(secPerKm) {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Gettery dla WorkoutModule / SummaryModule ─────────────────────────────────

function getTotalDistance() { return gps_totalDist / 1000; }  // km
function getTrackPoints()   { return [...gps_points]; }
function getKmSplits()      { return [...gps_kmSplits]; }

// ── Wake Lock ─────────────────────────────────────────────────────────────────

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    gps_wakeLock = await navigator.wakeLock.request('screen');
    gps_wakeLock.addEventListener('release', () => { gps_wakeLock = null; });
  } catch (e) {
    console.warn('Wake Lock niedostępny:', e.message);
  }
}

async function releaseWakeLock() {
  if (gps_wakeLock) {
    try { await gps_wakeLock.release(); } catch (_) {}
    gps_wakeLock = null;
  }
}

// Re-acquire po powrocie do zakładki
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && gps_isTracking && !gps_wakeLock) {
    requestWakeLock();
  }
});

// ── Eksport ───────────────────────────────────────────────────────────────────

window.GPS = {
  startTracking,
  stopTracking,
  getTotalDistance,
  getTrackPoints,
  getKmSplits,
  getCurrentPace,
  formatPace,
};
