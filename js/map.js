/**
 * map.js – Leaflet mapa trasy
 */

'use strict';

// Aktywna instancja mapy (trzeba niszczyć przed ponownym renderem)
let map_instance = null;

function renderMap(containerId, trackPoints) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Zniszcz poprzednią instancję (Leaflet nie lubi reinicjalizacji tego samego diva)
  if (map_instance) {
    try { map_instance.remove(); } catch (_) {}
    map_instance = null;
  }
  container.innerHTML = '';

  if (!trackPoints || trackPoints.length < 2) {
    container.innerHTML =
      '<p style="text-align:center;color:var(--text-secondary);padding:90px 16px;font-size:0.9rem">Brak danych GPS do wyświetlenia mapy.</p>';
    return;
  }

  // Upewnij się że kontener ma wysokość
  if (!container.style.height) container.style.height = '240px';

  try {
    map_instance = L.map(containerId, { zoomControl: true, attributionControl: true });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map_instance);

    const latlngs  = trackPoints.map(p => [p.lat, p.lng]);
    const polyline = L.polyline(latlngs, {
      color:   '#4493f8',
      weight:  4,
      opacity: 0.85,
    }).addTo(map_instance);

    // Marker startu (zielony)
    L.circleMarker(latlngs[0], {
      radius: 9, color: '#fff', weight: 2,
      fillColor: '#2ea043', fillOpacity: 1,
    }).addTo(map_instance).bindPopup('Start');

    // Marker mety (czerwony)
    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 9, color: '#fff', weight: 2,
      fillColor: '#e94560', fillOpacity: 1,
    }).addTo(map_instance).bindPopup('Meta');

    map_instance.fitBounds(polyline.getBounds(), { padding: [30, 30] });

    // Fix: Leaflet czasem nie renderuje kafelków poprawnie gdy kontener był ukryty
    setTimeout(() => { map_instance?.invalidateSize(); }, 200);

  } catch (e) {
    console.error('Błąd renderowania mapy:', e);
    container.innerHTML =
      '<p style="text-align:center;color:var(--text-secondary);padding:90px 16px">Błąd ładowania mapy.</p>';
  }
}

window.MapModule = { renderMap };
