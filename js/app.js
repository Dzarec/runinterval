/**
 * app.js – Hash routing, nawigacja, inicjalizacja aplikacji
 */

'use strict';

// ── Routing ──────────────────────────────────────────────────────────────────

const SCREENS = ['home', 'select', 'creator', 'workout', 'summary', 'history'];

function showScreen(name) {
  if (!SCREENS.includes(name)) name = 'home';

  SCREENS.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.toggle('active', id === name);
  });

  // Lifecycle hooks
  if (name === 'workout') window.WorkoutModule?.onScreenEnter?.();
  if (name === 'select')  window.SelectModule?.renderSelectScreen();
  if (name === 'creator') window.CreatorModule?.initCreatorIfNew();
  if (name === 'history') window.HistoryModule?.renderHistoryScreen();
}

function navigate(hash) {
  const name = hash.replace(/^#/, '');
  if (window.location.hash === '#' + name) {
    // Hash nie zmieni się → hashchange nie odpali → wywołaj showScreen ręcznie
    showScreen(name);
  } else {
    window.location.hash = name;
    // hashchange odpali showScreen automatycznie
  }
}

function handleHash() {
  const raw   = window.location.hash.replace('#', '') || 'home';
  const parts = raw.split('/');
  const screen = parts[0];
  showScreen(screen);
}

window.addEventListener('hashchange', handleHash);
window.addEventListener('load', handleHash);

// ── Navigation helpers ────────────────────────────────────────────────────────

function goHome()    { navigate('home'); }
function goSelect()  { navigate('select'); }
function goCreator() { navigate('creator'); }
function goHistory() { navigate('history'); }

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function confirmModal(title, text, okLabel, onConfirm) {
  document.getElementById('modal-confirm-title').textContent = title;
  document.getElementById('modal-confirm-text').textContent  = text;
  const okBtn = document.getElementById('modal-confirm-ok');
  okBtn.textContent = okLabel;
  okBtn.onclick = () => { closeModal('modal-confirm'); onConfirm(); };
  openModal('modal-confirm');
}

// ── iOS Install Banner ────────────────────────────────────────────────────────

function maybeShowIosBanner() {
  const isIos        = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true
                    || window.matchMedia('(display-mode: standalone)').matches;
  const dismissed    = localStorage.getItem('ios_banner_dismissed');

  if (!isIos || isStandalone || dismissed) return;

  const banner = document.createElement('div');
  banner.id    = 'ios-banner';
  banner.innerHTML = `
    <span>Dodaj do ekranu głównego: kliknij
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
           style="vertical-align:middle;margin:0 2px">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
      a potem „Dodaj do ekranu głównego"
    </span>
    <button onclick="
      localStorage.setItem('ios_banner_dismissed','1');
      document.getElementById('ios-banner').remove();
    ">✕</button>`;
  document.body.appendChild(banner);
}

window.addEventListener('load', maybeShowIosBanner);

// ── Service Worker ────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

// ── Global export (used by inline handlers) ───────────────────────────────────

window.App = {
  navigate,
  goHome,
  goSelect,
  goCreator,
  goHistory,
  showToast,
  openModal,
  closeModal,
  confirmModal,
};
