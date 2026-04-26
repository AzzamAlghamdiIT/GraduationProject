// ============================================================
//  app.js — Main Application Controller
//  Firebase Auth + Feature Routing + UI Logic
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

import {
  loadCarData, getMakes, getModels, getTrims, findByBudget,
  estimatePrice, formatSAR, getTypes
} from './data.js';

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:    "AIzaSyDf_qhKIr3-NXhzQZoxMo2RjupYSbFvs3Y",
  authDomain:"car-price-app-610fb.firebaseapp.com",
  projectId: "car-price-app-610fb",
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ── State ────────────────────────────────────────────────────
let listings = JSON.parse(localStorage.getItem('thmmenha_listings') || '[]');

// ── Boot ─────────────────────────────────────────────────────
(async function init() {
  await loadCarData();
  populateAuthViews();
  populateEstimatorMakes();
  populateTypeFilter();
  renderListings();

  onAuthStateChanged(auth, user => {
    if (user) showApp(user);
    else       showAuth();
  });
})();

// ── Page Navigation ──────────────────────────────────────────
function showAuth() {
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('app-page').classList.remove('active');
}

function showApp(user) {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('app-page').classList.add('active');
  const initials = (user.displayName || user.email)
    .split(' ').slice(0,2).map(w => w[0].toUpperCase()).join('');
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name').textContent = user.displayName || user.email.split('@')[0];
  showDashboard();
}

function showDashboard() {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-dashboard').classList.add('active');
}

window.goToDashboard = showDashboard;

window.goToFeature = function(feature) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${feature}`).classList.add('active');
};

// ── Auth Tabs ────────────────────────────────────────────────
function populateAuthViews() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      document.getElementById(`form-${target}`).classList.add('active');
    });
  });
}

// ── Register ─────────────────────────────────────────────────
window.doRegister = async function() {
  clearAlert('register');
  const firstName  = val('reg-firstname');
  const lastName   = val('reg-lastname');
  const email      = val('reg-email');
  const password   = val('reg-password');
  const confirm    = val('reg-confirm');

  if (!firstName || !lastName || !email || !password || !confirm)
    return showAlert('register', 'error', '⚠️ Please fill in all fields.');

  if (password !== confirm)
    return showAlert('register', 'error', '❌ Passwords do not match.');

  if (password.length < 6)
    return showAlert('register', 'error', '❌ Password must be at least 6 characters.');

  setBtnLoading('btn-register', true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });
    showAlert('register', 'success', '✅ Account created! Logging you in…');
  } catch (e) {
    showAlert('register', 'error', firebaseError(e.code));
  }
  setBtnLoading('btn-register', false);
};

// ── Login ────────────────────────────────────────────────────
window.doLogin = async function() {
  clearAlert('login');
  const email    = val('login-email');
  const password = val('login-password');

  if (!email || !password)
    return showAlert('login', 'error', '⚠️ Please enter your email and password.');

  setBtnLoading('btn-login', true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    showAlert('login', 'error', firebaseError(e.code));
  }
  setBtnLoading('btn-login', false);
};

// ── Logout ───────────────────────────────────────────────────
window.doLogout = async function() {
  await signOut(auth);
};

// ── Firebase Error Messages ──────────────────────────────────
function firebaseError(code) {
  const map = {
    'auth/user-not-found':        '❌ No account found with this email address.',
    'auth/wrong-password':        '❌ Incorrect password. Please try again.',
    'auth/email-already-in-use':  '❌ An account with this email already exists.',
    'auth/invalid-email':         '❌ Please enter a valid email address.',
    'auth/weak-password':         '❌ Password must be at least 6 characters.',
    'auth/too-many-requests':     '⚠️ Too many failed attempts. Please wait and try again.',
    'auth/invalid-credential':    '❌ Incorrect email or password.',
  };
  return map[code] || '❌ Something went wrong. Please try again.';
}

// ── UI Helpers ───────────────────────────────────────────────
function val(id) { return (document.getElementById(id)?.value || '').trim(); }

function showAlert(form, type, msg) {
  const el = document.getElementById(`alert-${form}`);
  if (!el) return;
  el.className = `auth-alert show ${type}`;
  el.innerHTML = `${type === 'error' ? '🔴' : '✅'} ${msg}`;
}

function clearAlert(form) {
  const el = document.getElementById(`alert-${form}`);
  if (el) el.className = 'auth-alert';
}

function setBtnLoading(id, state) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.toggle('loading', state);
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ================================================================
//  FEATURE 1: PRICE ESTIMATOR
// ================================================================

function populateEstimatorMakes() {
  const makeEl = document.getElementById('est-make');
  if (!makeEl) return;
  makeEl.innerHTML = '<option value="">Select Make</option>';
  getMakes().forEach(m => {
    makeEl.innerHTML += `<option value="${m}">${m}</option>`;
  });
}

window.onMakeChange = function() {
  const make = val('est-make');
  const modelEl = document.getElementById('est-model');
  const trimEl  = document.getElementById('est-trim');
  modelEl.innerHTML = '<option value="">Select Model</option>';
  trimEl.innerHTML  = '<option value="">All Trims</option>';

  if (!make) return;
  getModels(make).forEach(m => {
    modelEl.innerHTML += `<option value="${m}">${m}</option>`;
  });
  modelEl.disabled = false;
};

window.onModelChange = function() {
  const make  = val('est-make');
  const model = val('est-model');
  const trimEl = document.getElementById('est-trim');
  trimEl.innerHTML = '<option value="">All Trims</option>';

  if (!make || !model) return;
  getTrims(make, model).forEach(t => {
    trimEl.innerHTML += `<option value="${t}">${t}</option>`;
  });
  trimEl.disabled = false;
};

window.runEstimation = function() {
  const make     = val('est-make');
  const model    = val('est-model');
  const trim     = val('est-trim');
  const year     = val('est-year') || '2026';
  const mileage  = val('est-mileage') || '0';
  const accident = document.querySelector('input[name="accident"]:checked')?.value || 'none';

  const notFound = document.getElementById('est-not-found');
  const resultCard = document.getElementById('est-result');

  notFound.classList.remove('show');
  resultCard.classList.remove('show');

  if (!make || !model) {
    toast('Please select at least Make and Model.', 'error');
    return;
  }

  const result = estimatePrice({ make, model, trim, year, mileage, accident });

  if (!result) {
    notFound.classList.add('show');
    return;
  }

  // Populate result card
  document.getElementById('res-price').textContent = formatSAR(result.estimatedPrice);
  document.getElementById('res-agency').textContent = formatSAR(result.agencyPrice);
  document.getElementById('res-low').textContent    = 'SAR ' + formatSAR(result.rangeLow);
  document.getElementById('res-high').textContent   = 'SAR ' + formatSAR(result.rangeHigh);
  document.getElementById('res-car-name').textContent = `${result.car.Make} ${result.car.Model}`;

  const factorsEl = document.getElementById('res-factors');
  factorsEl.innerHTML = '';
  Object.values(result.factors).forEach(f => {
    factorsEl.innerHTML += `
      <div class="factor-chip">
        <div class="factor-label">${f.label}</div>
        <div class="factor-value">${f.value.split(' (')[0]}</div>
        <div class="factor-impact ${f.impact}">${
          f.value.includes('(') ? f.value.match(/\(.*\)/)?.[0] || '' : ''
        }</div>
      </div>`;
  });

  resultCard.classList.add('show');
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ================================================================
//  FEATURE 2: BUDGET FINDER
// ================================================================

function populateTypeFilter() {
  const el = document.getElementById('budget-type');
  if (!el) return;
  el.innerHTML = '<option value="">All Types</option>';
  getTypes().forEach(t => {
    el.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

window.runBudgetSearch = function() {
  const minPrice = parseInt(val('budget-min').replace(/,/g,'')) || 0;
  const maxPrice = parseInt(val('budget-max').replace(/,/g,'')) || 9999999;
  const type     = val('budget-type');

  const results = findByBudget(minPrice, maxPrice, type);
  const container = document.getElementById('budget-results');
  const countEl   = document.getElementById('budget-count');
  const grid       = document.getElementById('budget-grid');

  grid.innerHTML = '';

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="empty-listings" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <p>No cars found in this budget range. Try adjusting your filters.</p>
      </div>`;
  } else {
    results.forEach(car => {
      grid.innerHTML += `
        <div class="car-card">
          <div class="car-card-make">${car.Make}</div>
          <div class="car-card-model">${car.Model}</div>
          <div class="car-card-year">${car.Year}</div>
          <div class="car-card-trim">${car.Trim}</div>
          <div class="car-card-price">${formatSAR(parseInt(car.Agency_Price))}</div>
          <div class="car-card-price-unit">SAR · Agency Price</div>
          <div class="car-card-type">${car.Type}</div>
        </div>`;
    });
  }

  countEl.innerHTML = `Found <strong>${results.length}</strong> car${results.length !== 1 ? 's' : ''} in your budget`;
  container.classList.add('show');
};

// ================================================================
//  FEATURE 3: MARKETPLACE (SELL)
// ================================================================

let uploadedImages = [];

window.handleImageUpload = function(input) {
  const files = Array.from(input.files);
  const preview = document.getElementById('img-preview');
  preview.innerHTML = '';
  uploadedImages = [];

  files.slice(0, 5).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      uploadedImages.push(e.target.result);
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'img-thumb';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
};

window.submitListing = function() {
  const make   = val('sell-make');
  const model  = val('sell-model');
  const year   = val('sell-year');
  const mileage= val('sell-mileage');
  const price  = val('sell-price');
  const phone  = val('sell-phone');
  const notes  = val('sell-notes');

  if (!make || !model || !year || !price || !phone) {
    toast('Please fill in all required fields.', 'error');
    return;
  }

  const listing = {
    id: Date.now(),
    make, model, year, mileage, price, phone, notes,
    images: uploadedImages.slice(),
    date: new Date().toLocaleDateString('en-SA'),
  };

  listings.unshift(listing);
  localStorage.setItem('thmmenha_listings', JSON.stringify(listings));
  renderListings();
  clearSellForm();
  toast('✅ Your listing has been published!');
};

function clearSellForm() {
  ['sell-make','sell-model','sell-year','sell-mileage','sell-price','sell-phone','sell-notes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('img-preview').innerHTML = '';
  uploadedImages = [];
}

function renderListings() {
  const grid = document.getElementById('listings-grid');
  const count = document.getElementById('listings-count');
  if (!grid) return;

  count.textContent = `${listings.length} listing${listings.length !== 1 ? 's' : ''}`;

  if (listings.length === 0) {
    grid.innerHTML = `
      <div class="empty-listings">
        <div class="empty-icon">🚗</div>
        <p>No listings yet. Be the first to sell your car!</p>
      </div>`;
    return;
  }

  grid.innerHTML = listings.map(l => `
    <div class="listing-card">
      <div class="listing-img">
        ${l.images && l.images[0]
          ? `<img src="${l.images[0]}" alt="${l.make} ${l.model}">`
          : `<span>🚗</span>`}
      </div>
      <div class="listing-body">
        <div class="listing-price">SAR ${formatSAR(parseInt(l.price) || 0)}</div>
        <div class="listing-name">${l.make} ${l.model}</div>
        <div class="listing-meta">
          ${l.year} · ${l.mileage ? parseInt(l.mileage).toLocaleString() + ' km' : 'Mileage N/A'}
          ${l.notes ? `<br><span style="opacity:.7">${l.notes.slice(0,60)}${l.notes.length>60?'…':''}</span>` : ''}
        </div>
        <div class="listing-contact">
          <a class="btn-whatsapp" href="https://wa.me/966${l.phone.replace(/^0/,'')}" target="_blank">
            💬 WhatsApp
          </a>
          <a class="btn-call" href="tel:${l.phone}">📞</a>
        </div>
      </div>
    </div>`).join('');
}

// Enter key support for forms
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('form-login')?.classList.contains('active')) doLogin();
    if (document.getElementById('form-register')?.classList.contains('active')) doRegister();
  }
});
