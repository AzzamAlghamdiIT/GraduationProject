// ============================================================
//  app.js — Thmmenha v2.0
//  Firebase Auth + Supabase Listings + i18n + Dark Mode + All features
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

import {
  loadCarData, getMakes, getModels, getTrims, findByBudget,
  estimatePrice, formatPrice, getTypes
} from './data.js';

// ── Firebase ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:    "AIzaSyDf_qhKIr3-NXhzQZoxMo2RjupYSbFvs3Y",
  authDomain:"car-price-app-610fb.firebaseapp.com",
  projectId: "car-price-app-610fb",
};
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);

// ── Supabase ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://cydznlbilyutnuvmzpin.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZHpubGJpbHl1dG51dm16cGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTc5NDUsImV4cCI6MjA5Mjg5Mzk0NX0.Km4bP0Sh8gCg4F0MzErN69-y-PYe2H5cS7akhJjkupA';

const supaHeaders = {
  'Content-Type':  'application/json',
  'apikey':         SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer':        'return=representation',
};

async function sbFetch(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, { headers: supaHeaders, ...opts });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${res.status} — ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

async function fetchListings() {
  return sbFetch('Cars?select=*&order=created_at.desc');
}

async function insertListing(data) {
  return sbFetch('Cars', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── i18n ──────────────────────────────────────────────────────
let LANG = localStorage.getItem('th_lang') || 'en';

const T = {
  en: {
    siteName:        'Thmmenha',
    tagline:         'Valuing Your Car · Buy · Sell',
    subTagline:      'Saudi Arabia · Car Price Intelligence',
    signIn:          'Sign In',
    createAccount:   'Create Account',
    welcomeBack:     'Welcome back',
    signInSub:       'Sign in to access your car tools',
    createYour:      'Create your account',
    createSub:       'Free forever · No credit card required',
    email:           'Email Address',
    password:        'Password',
    confirmPass:     'Confirm Password',
    firstName:       'First Name',
    lastName:        'Last Name',
    signInBtn:       'Sign In →',
    createBtn:       'Create Account →',
    signOut:         'Sign Out',
    getStarted:      'Get Started',
    landingTitle:    'VALUE YOUR CAR\nSMART & FAST',
    landingDesc:     'Saudi Arabia\'s smartest platform for car valuation, budget search, and marketplace. Powered by real agency data.',
    feature1Title:   'Estimate My Car Price',
    feature1Desc:    'Get an accurate market valuation for your used car based on real data.',
    feature2Title:   'Find Cars by Budget',
    feature2Desc:    'Discover available new cars that match your budget and preferences.',
    feature3Title:   'Marketplace',
    feature3Desc:    'Browse used cars listed by owners, or list your own car for sale.',
    carValuation:    'CAR VALUATION',
    carValSub:       "Estimate your car's current market value",
    vehicleInfo:     'Vehicle Information',
    make:            'Make',
    model:           'Model',
    trim:            'Trim',
    year:            'Year',
    mileageKm:       'Mileage (km)',
    condHistory:     'Condition & History',
    accidentHistory: 'Accident History',
    noAccident:      'No Accident',
    minor:           'Minor',
    medium:          'Medium',
    major:           'Major',
    calcPrice:       '📊 Calculate Estimated Price',
    estMarketVal:    'Estimated Market Value',
    calculated:      '✓ Calculated',
    sarLabel:        'Saudi Riyal (SAR)',
    range:           'Range',
    agencyPrice:     'Agency Price',
    disclaimer:      '⚠️ This estimate is based on agency pricing data, brand depreciation patterns, and market conditions in Saudi Arabia. Actual sale price may vary.',
    notFoundTitle:   'Car Not Found in Database',
    notFoundMsg:     'This vehicle is not currently in our database. For an accurate manual evaluation, please contact us — we\'ll respond within 3 business days.',
    contactUs:       '✉️ thmmenha@gmail.com — Request Manual Evaluation',
    budgetFinder:    'BUDGET FINDER',
    budgetFinderSub: 'Find new cars within your price range',
    searchFilters:   'Search Filters',
    minBudget:       'Min Budget (SAR)',
    maxBudget:       'Max Budget (SAR)',
    carType:         'Car Type',
    allTypes:        'All Types',
    searchCars:      '🔍 Search Available Cars',
    found:           'Found',
    carsIn:          'car(s) in your budget',
    noResults:       'No cars found in this budget range. Try adjusting your filters.',
    marketplace:     'MARKETPLACE',
    marketplaceSub:  'Buy and sell cars in Saudi Arabia',
    listYourCar:     'List Your Car',
    sellMake:        'Make *',
    sellModel:       'Model *',
    sellYear:        'Year *',
    sellMileage:     'Mileage (km)',
    askingPrice:     'Asking Price (SAR) *',
    phoneWa:         'Phone / WhatsApp *',
    notes:           'Notes',
    photosUpTo5:     'Photos (up to 5)',
    clickUpload:     'Click to upload photos',
    uploadSub:       'JPG, PNG up to 5MB each',
    publishListing:  '🚀 Publish Listing',
    activeListings:  'Active Listings',
    listings:        'listing(s)',
    noListings:      'No listings yet. Be the first to sell your car!',
    whatsappBtn:     '💬 WhatsApp',
    selectMake:      'Select Make',
    selectModel:     'Select Model',
    allTrims:        'All Trims',
    back:            '←',
    darkMode:        'Dark Mode',
    lightMode:       'Light Mode',
    dashTitle:       'WHAT DO YOU NEED?',
    dashSub:         'Instant car valuation, budget search, and a marketplace — all in one.',
    passRule1:       'At least 8 characters',
    passRule2:       'One uppercase letter',
    passRule3:       'One number',
    passRule4:       'One special character',
    currency:        'SAR',
    retentionLabel:  'Value Retention',
    agencyPriceLbl:  'Agency Price',
    fillRequired:    'Please fill in all required fields.',
    yearInvalid:     'Year must be between 1980 and',
    selectMakeModel: 'Please select at least Make and Model.',
  },
  ar: {
    siteName:        'ثمنها',
    tagline:         'تقدير سيارتك · شراء · بيع',
    subTagline:      'المملكة العربية السعودية · ذكاء أسعار السيارات',
    signIn:          'تسجيل الدخول',
    createAccount:   'إنشاء حساب',
    welcomeBack:     'مرحباً بعودتك',
    signInSub:       'سجل دخولك للوصول إلى أدوات السيارات',
    createYour:      'إنشاء حسابك',
    createSub:       'مجاني للأبد · لا يلزم بطاقة ائتمانية',
    email:           'البريد الإلكتروني',
    password:        'كلمة المرور',
    confirmPass:     'تأكيد كلمة المرور',
    firstName:       'الاسم الأول',
    lastName:        'اسم العائلة',
    signInBtn:       'دخول ←',
    createBtn:       'إنشاء الحساب ←',
    signOut:         'تسجيل الخروج',
    getStarted:      'ابدأ الآن',
    landingTitle:    'قيّم سيارتك\nبذكاء وسرعة',
    landingDesc:     'المنصة الأذكى في المملكة لتقدير سعر السيارة والبحث حسب الميزانية والسوق. مبنية على بيانات الوكالة الحقيقية.',
    feature1Title:   'تقدير سعر سيارتي',
    feature1Desc:    'احصل على تقييم دقيق لسيارتك المستعملة بناءً على بيانات حقيقية.',
    feature2Title:   'بحث حسب الميزانية',
    feature2Desc:    'اكتشف السيارات الجديدة المتوفرة ضمن ميزانيتك.',
    feature3Title:   'السوق',
    feature3Desc:    'تصفح السيارات المعروضة أو أعلن عن سيارتك.',
    carValuation:    'تقدير السعر',
    carValSub:       'احسب القيمة السوقية الحالية لسيارتك',
    vehicleInfo:     'معلومات المركبة',
    make:            'الماركة',
    model:           'الموديل',
    trim:            'الفئة',
    year:            'السنة',
    mileageKm:       'عداد الكيلومترات',
    condHistory:     'الحالة والتاريخ',
    accidentHistory: 'تاريخ الحوادث',
    noAccident:      'بدون حوادث',
    minor:           'بسيط',
    medium:          'متوسط',
    major:           'كبير',
    calcPrice:       '📊 احسب السعر التقديري',
    estMarketVal:    'القيمة السوقية التقديرية',
    calculated:      '✓ تم الحساب',
    sarLabel:        'ريال سعودي',
    range:           'النطاق',
    agencyPrice:     'سعر الوكالة',
    disclaimer:      '⚠️ هذا التقدير مبني على بيانات أسعار الوكالات وأنماط الاستهلاك في السوق السعودي. السعر الفعلي قد يختلف.',
    notFoundTitle:   'السيارة غير موجودة في قاعدة البيانات',
    notFoundMsg:     'هذه السيارة غير متوفرة حالياً في قاعدة بياناتنا. للحصول على تقييم يدوي دقيق، تواصل معنا وسنرد خلال 3 أيام عمل.',
    contactUs:       '✉️ thmmenha@gmail.com — طلب تقييم يدوي',
    budgetFinder:    'البحث بالميزانية',
    budgetFinderSub: 'ابحث عن سيارات جديدة ضمن نطاق سعرك',
    searchFilters:   'معايير البحث',
    minBudget:       'أقل ميزانية (ر.س)',
    maxBudget:       'أعلى ميزانية (ر.س)',
    carType:         'نوع السيارة',
    allTypes:        'جميع الأنواع',
    searchCars:      '🔍 ابحث عن السيارات',
    found:           'وُجد',
    carsIn:          'سيارة ضمن ميزانيتك',
    noResults:       'لا توجد سيارات في هذا النطاق السعري. حاول تغيير المعايير.',
    marketplace:     'السوق',
    marketplaceSub:  'بيع وشراء السيارات في المملكة',
    listYourCar:     'أعلن عن سيارتك',
    sellMake:        'الماركة *',
    sellModel:       'الموديل *',
    sellYear:        'السنة *',
    sellMileage:     'الكيلومترات',
    askingPrice:     'السعر المطلوب (ر.س) *',
    phoneWa:         'الجوال / واتساب *',
    notes:           'ملاحظات',
    photosUpTo5:     'صور (حتى 5 صور)',
    clickUpload:     'انقر لرفع الصور',
    uploadSub:       'JPG أو PNG حتى 5MB لكل صورة',
    publishListing:  '🚀 نشر الإعلان',
    activeListings:  'الإعلانات النشطة',
    listings:        'إعلان',
    noListings:      'لا توجد إعلانات بعد. كن أول من يبيع سيارته!',
    whatsappBtn:     '💬 واتساب',
    selectMake:      'اختر الماركة',
    selectModel:     'اختر الموديل',
    allTrims:        'جميع الفئات',
    back:            '→',
    darkMode:        'الوضع الداكن',
    lightMode:       'الوضع الفاتح',
    dashTitle:       'ماذا تريد؟',
    dashSub:         'تقدير فوري للسيارة، بحث بالميزانية، وسوق للبيع والشراء.',
    passRule1:       '8 أحرف على الأقل',
    passRule2:       'حرف كبير واحد',
    passRule3:       'رقم واحد',
    passRule4:       'رمز خاص واحد',
    currency:        'ر.س',
    retentionLabel:  'نسبة القيمة المتبقية',
    agencyPriceLbl:  'سعر الوكالة',
    fillRequired:    'يرجى تعبئة جميع الحقول المطلوبة.',
    yearInvalid:     'يجب أن تكون السنة بين 1980 و',
    selectMakeModel: 'يرجى اختيار الماركة والموديل على الأقل.',
  }
};

function t(key) { return T[LANG][key] || T['en'][key] || key; }
function currency() { return t('currency'); }

function applyTranslations() {
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.getAttribute('data-t');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-tp]').forEach(el => {
    const key = el.getAttribute('data-tp');
    el.placeholder = t(key);
  });
  // RTL
  const isAr = LANG === 'ar';
  document.documentElement.setAttribute('lang', LANG);
  document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  document.body.classList.toggle('rtl', isAr);
  // Update currency symbols
  document.querySelectorAll('[data-currency]').forEach(el => {
    el.textContent = currency();
  });
  // Re-render dynamic content if visible
  updateLangToggle();
}

function updateLangToggle() {
  const btn = document.getElementById('lang-btn');
  if (btn) btn.textContent = LANG === 'ar' ? 'EN' : 'ع';
}

window.toggleLang = function() {
  LANG = LANG === 'ar' ? 'en' : 'ar';
  localStorage.setItem('th_lang', LANG);
  applyTranslations();
  // Re-populate dropdowns
  populateEstimatorMakes();
  populateTypeFilter();
};

// ── Dark Mode ─────────────────────────────────────────────────
let DARK = localStorage.getItem('th_dark') !== 'false'; // default dark

function applyTheme() {
  document.body.classList.toggle('light-mode', !DARK);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = DARK ? '☀️' : '🌙';
  const btn2 = document.getElementById('theme-btn-topbar');
  if (btn2) btn2.textContent = DARK ? '☀️' : '🌙';
}

window.toggleTheme = function() {
  DARK = !DARK;
  localStorage.setItem('th_dark', DARK);
  applyTheme();
};

// ── Boot ──────────────────────────────────────────────────────
(async function init() {
  applyTheme();
  applyTranslations();
  await loadCarData();
  populateEstimatorMakes();
  populateTypeFilter();

  onAuthStateChanged(auth, user => {
    if (user) showApp(user);
    else      showLanding();
  });
})();

// ── Page Router ───────────────────────────────────────────────
function showLanding() {
  setPage('landing-page');
}
function showAuth(tab = 'login') {
  setPage('auth-page');
  switchAuthTab(tab);
}
function showApp(user) {
  setPage('app-page');
  const name = user.displayName || user.email.split('@')[0];
  const initials = name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('');
  document.getElementById('user-avatar').textContent   = initials;
  document.getElementById('user-name').textContent     = name;
  showDashboard();
  fetchAndRenderListings();
}

function setPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showDashboard() {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-dashboard').classList.add('active');
}

window.goToDashboard = showDashboard;
window.goToLanding   = showLanding;
window.goToAuthLogin = () => showAuth('login');
window.goToAuthRegister = () => showAuth('register');

window.goToFeature = function(feature) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${feature}`).classList.add('active');
  if (feature === 'marketplace') fetchAndRenderListings();
};

// ── Auth tab switching ────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`form-${tab}`)?.classList.add('active');
}

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
});

// ── Password validation ───────────────────────────────────────
function validatePassword(pw) {
  const rules = [
    { test: pw.length >= 8,          key: 'passRule1' },
    { test: /[A-Z]/.test(pw),        key: 'passRule2' },
    { test: /[0-9]/.test(pw),        key: 'passRule3' },
    { test: /[^A-Za-z0-9]/.test(pw), key: 'passRule4' },
  ];
  return rules;
}

window.onPasswordInput = function() {
  const pw = document.getElementById('reg-password')?.value || '';
  const rules = validatePassword(pw);
  rules.forEach(r => {
    const el = document.getElementById(`rule-${r.key}`);
    if (el) el.classList.toggle('valid', r.test);
  });
};

// ── Register ─────────────────────────────────────────────────
window.doRegister = async function() {
  clearAlert('register');
  const firstName = val('reg-firstname');
  const lastName  = val('reg-lastname');
  const email     = val('reg-email');
  const pw        = val('reg-password');
  const confirm   = val('reg-confirm');

  if (!firstName || !lastName || !email || !pw || !confirm)
    return showFormAlert('register', 'error', t('fillRequired'));

  const rules = validatePassword(pw);
  const failed = rules.filter(r => !r.test);
  if (failed.length)
    return showFormAlert('register', 'error', '❌ ' + t(failed[0].key));

  if (pw !== confirm)
    return showFormAlert('register', 'error', '❌ Passwords do not match.');

  setBtnLoading('btn-register', true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });
    showFormAlert('register', 'success', '✅ Account created!');
  } catch (e) {
    showFormAlert('register', 'error', firebaseError(e.code));
  }
  setBtnLoading('btn-register', false);
};

// ── Login ─────────────────────────────────────────────────────
window.doLogin = async function() {
  clearAlert('login');
  const email = val('login-email');
  const pw    = val('login-password');
  if (!email || !pw)
    return showFormAlert('login', 'error', '⚠️ ' + t('fillRequired'));
  setBtnLoading('btn-login', true);
  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (e) {
    showFormAlert('login', 'error', firebaseError(e.code));
  }
  setBtnLoading('btn-login', false);
};

window.doLogout = async () => signOut(auth);

function firebaseError(code) {
  const m = {
    'auth/user-not-found':       '❌ No account found with this email.',
    'auth/wrong-password':       '❌ Incorrect password.',
    'auth/email-already-in-use': '❌ Email already in use.',
    'auth/invalid-email':        '❌ Invalid email address.',
    'auth/weak-password':        '❌ Password too weak.',
    'auth/too-many-requests':    '⚠️ Too many attempts. Try again later.',
    'auth/invalid-credential':   '❌ Incorrect email or password.',
  };
  return m[code] || '❌ Something went wrong.';
}

// ── UI helpers ────────────────────────────────────────────────
function val(id) { return (document.getElementById(id)?.value || '').trim(); }

function showFormAlert(form, type, msg) {
  const el = document.getElementById(`alert-${form}`);
  if (!el) return;
  el.className = `auth-alert show ${type}`;
  el.innerHTML = msg;
}
function clearAlert(form) {
  const el = document.getElementById(`alert-${form}`);
  if (el) el.className = 'auth-alert';
}
function setBtnLoading(id, state) {
  document.getElementById(id)?.classList.toggle('loading', state);
}

function toast(msg, type = 'success') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = msg;
  tc.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 3000);
  setTimeout(() => t.remove(), 3400);
}

// ── Year validation ───────────────────────────────────────────
function validateYear(id, errId) {
  const el = document.getElementById(id);
  const errEl = document.getElementById(errId);
  const v = parseInt(el?.value);
  const curYear = new Date().getFullYear();
  if (isNaN(v) || v < 1980 || v > curYear) {
    el?.classList.add('input-error');
    if (errEl) errEl.textContent = `${t('yearInvalid')} ${curYear}`;
    if (errEl) errEl.style.display = 'block';
    return false;
  }
  el?.classList.remove('input-error');
  if (errEl) errEl.style.display = 'none';
  return true;
}

// ================================================================
//  FEATURE 1: PRICE ESTIMATOR
// ================================================================

function populateEstimatorMakes() {
  const el = document.getElementById('est-make');
  if (!el) return;
  el.innerHTML = `<option value="">${t('selectMake')}</option>`;
  getMakes().forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
}

window.onMakeChange = function() {
  const make = val('est-make');
  const modelEl = document.getElementById('est-model');
  const trimEl  = document.getElementById('est-trim');
  modelEl.innerHTML = `<option value="">${t('selectModel')}</option>`;
  trimEl.innerHTML  = `<option value="">${t('allTrims')}</option>`;
  if (!make) { modelEl.disabled = true; trimEl.disabled = true; return; }
  getModels(make).forEach(m => modelEl.innerHTML += `<option value="${m}">${m}</option>`);
  modelEl.disabled = false;
  trimEl.disabled = true;
};

window.onModelChange = function() {
  const make  = val('est-make');
  const model = val('est-model');
  const trimEl = document.getElementById('est-trim');
  trimEl.innerHTML = `<option value="">${t('allTrims')}</option>`;
  if (!make || !model) return;
  getTrims(make, model).forEach(tr => trimEl.innerHTML += `<option value="${tr}">${tr}</option>`);
  trimEl.disabled = false;
};

window.runEstimation = function() {
  const make     = val('est-make');
  const model    = val('est-model');
  const trim     = val('est-trim');
  const year     = val('est-year') || String(new Date().getFullYear());
  const mileage  = val('est-mileage') || '0';
  const accident = document.querySelector('input[name="accident"]:checked')?.value || 'none';

  document.getElementById('est-not-found').classList.remove('show');
  document.getElementById('est-result').classList.remove('show');

  if (!make || !model) { toast(t('selectMakeModel'), 'error'); return; }

  // Year validation
  const yr = parseInt(year);
  const curY = new Date().getFullYear();
  if (yr < 1980 || yr > curY) {
    toast(`${t('yearInvalid')} ${curY}`, 'error');
    return;
  }

  const result = estimatePrice({ make, model, trim, year, mileage, accident });
  if (!result) { document.getElementById('est-not-found').classList.add('show'); return; }

  // Populate result
  const curr = currency();
  document.getElementById('res-price').textContent     = formatPrice(result.estimatedPrice);
  document.getElementById('res-currency').textContent  = curr;
  document.getElementById('res-agency').textContent    = `${formatPrice(result.agencyPrice)} ${curr}`;
  document.getElementById('res-low').textContent       = `${formatPrice(result.rangeLow)} ${curr}`;
  document.getElementById('res-high').textContent      = `${formatPrice(result.rangeHigh)} ${curr}`;
  document.getElementById('res-car-name').textContent  = `${result.car.Make} ${result.car.Model} ${result.car.Trim || ''}`;
  document.getElementById('res-retention').textContent = `${result.retentionPct}%`;

  const factorsEl = document.getElementById('res-factors');
  factorsEl.innerHTML = '';
  Object.values(result.factors).forEach(f => {
    factorsEl.innerHTML += `
      <div class="factor-chip">
        <div class="factor-label">${f.label}</div>
        <div class="factor-value">${f.value.split(' (')[0].split(' (-')[0]}</div>
        <div class="factor-impact ${f.impact}">${f.value.match(/\(.*?\)/) ? f.value.match(/\(.*?\)/)[0] : ''}</div>
      </div>`;
  });

  document.getElementById('est-result').classList.add('show');
  document.getElementById('est-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ================================================================
//  FEATURE 2: BUDGET FINDER
// ================================================================

function populateTypeFilter() {
  const el = document.getElementById('budget-type');
  if (!el) return;
  el.innerHTML = `<option value="">${t('allTypes')}</option>`;
  getTypes().forEach(tp => el.innerHTML += `<option value="${tp}">${tp}</option>`);
}

window.runBudgetSearch = function() {
  const minP = parseInt(val('budget-min').replace(/,/g,'')) || 0;
  const maxP = parseInt(val('budget-max').replace(/,/g,'')) || 9999999;
  const type = val('budget-type');
  const curr = currency();

  const results = findByBudget(minP, maxP, type);
  const container = document.getElementById('budget-results');
  const countEl   = document.getElementById('budget-count');
  const grid      = document.getElementById('budget-grid');

  grid.innerHTML = results.length === 0
    ? `<div class="empty-listings" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>${t('noResults')}</p></div>`
    : results.map(car => `
        <div class="car-card">
          <div class="car-card-make">${car.Make}</div>
          <div class="car-card-model">${car.Model}</div>
          <div class="car-card-year">${car.Year}</div>
          <div class="car-card-trim">${car.Trim}</div>
          <div class="car-card-price">${formatPrice(car.Agency_Price)}</div>
          <div class="car-card-price-unit">${curr} · ${LANG === 'ar' ? 'سعر الوكالة' : 'Agency Price'}</div>
          <div class="car-card-type">${car.Type}</div>
        </div>`).join('');

  countEl.innerHTML = `${t('found')} <strong>${results.length}</strong> ${t('carsIn')}`;
  container.classList.add('show');
};

// ================================================================
//  FEATURE 3: MARKETPLACE (Supabase)
// ================================================================

let uploadedImages = [];
let allListings    = [];

window.handleImageUpload = function(input) {
  const files = Array.from(input.files).slice(0, 5);
  const preview = document.getElementById('img-preview');
  preview.innerHTML = '';
  uploadedImages = [];

  files.forEach(file => {
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast('⚠️ Image too large (max 5MB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      uploadedImages.push(e.target.result);
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'img-thumb';
      // Click thumb to remove
      img.title = 'Click to remove';
      img.onclick = () => {
        uploadedImages = uploadedImages.filter(u => u !== e.target.result);
        img.remove();
      };
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
};

window.submitListing = async function() {
  const make    = val('sell-make');
  const model   = val('sell-model');
  const yearStr = val('sell-year');
  const mileage = val('sell-mileage');
  const price   = val('sell-price');
  const phone   = val('sell-phone');
  const notes   = val('sell-notes');

  if (!make || !model || !yearStr || !price || !phone) {
    toast(t('fillRequired'), 'error');
    return;
  }

  // Year validation
  const yr = parseInt(yearStr);
  const curY = new Date().getFullYear();
  if (isNaN(yr) || yr < 1980 || yr > curY) {
    document.getElementById('sell-year').classList.add('input-error');
    toast(`${t('yearInvalid')} ${curY}`, 'error');
    return;
  }
  document.getElementById('sell-year').classList.remove('input-error');

  const btn = document.getElementById('btn-publish');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Publishing…'; }

  try {
    const payload = {
      make, model,
      year:    yr,
      mileage: parseInt(mileage) || 0,
      price:   parseFloat(price),
      phone,
      notes:   notes || '',
      images:  uploadedImages.slice(), // JSON array stored in jsonb
    };

    await insertListing(payload);
    toast('✅ ' + (LANG === 'ar' ? 'تم نشر الإعلان بنجاح!' : 'Listing published successfully!'));
    clearSellForm();
    await fetchAndRenderListings();
  } catch (e) {
    console.error('Insert error:', e);
    toast('❌ ' + (LANG === 'ar' ? 'فشل النشر. تأكد من اتصالك.' : 'Failed to publish. Check connection.'), 'error');
  }

  if (btn) { btn.disabled = false; btn.textContent = t('publishListing'); }
};

function clearSellForm() {
  ['sell-make','sell-model','sell-year','sell-mileage','sell-price','sell-phone','sell-notes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('img-preview').innerHTML = '';
  uploadedImages = [];
}

async function fetchAndRenderListings() {
  const grid  = document.getElementById('listings-grid');
  const count = document.getElementById('listings-count');
  if (!grid) return;

  // Show skeleton
  grid.innerHTML = `<div class="listing-skeleton"></div><div class="listing-skeleton"></div><div class="listing-skeleton"></div>`;

  try {
    allListings = await fetchListings();
    renderListings(allListings);
  } catch (e) {
    console.error('Fetch listings error:', e);
    grid.innerHTML = `<div class="empty-listings"><div class="empty-icon">⚠️</div><p>${LANG === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading listings'}</p></div>`;
  }
}

function renderListings(listings) {
  const grid  = document.getElementById('listings-grid');
  const count = document.getElementById('listings-count');
  if (!grid) return;

  const curr = currency();
  count.textContent = `${listings.length} ${t('listings')}`;

  if (!listings.length) {
    grid.innerHTML = `<div class="empty-listings"><div class="empty-icon">🚗</div><p>${t('noListings')}</p></div>`;
    return;
  }

  grid.innerHTML = listings.map(l => {
    const imgs = Array.isArray(l.images) ? l.images : [];
    const phone = (l.phone || '').replace(/^0/, '');
    const waText = encodeURIComponent(
      LANG === 'ar'
        ? `بخصوص إعلانك على منصة ثمنها لسيارة ${l.make} ${l.model} ${l.year}، أرغب في الاستفسار عنها.`
        : `Regarding your listing on Thmmenha for the ${l.make} ${l.model} ${l.year}, I would like to inquire about it.`
    );
    const waLink = `https://wa.me/966${phone}?text=${waText}`;

    return `
    <div class="listing-card">
      <div class="listing-img-wrap">
        ${imgs.length
          ? `<img src="${imgs[0]}" alt="${l.make} ${l.model}" loading="lazy" onclick="openGallery(${l.id}, ${JSON.stringify(imgs).replace(/"/g,"'")})">`
          : `<div class="listing-img-placeholder">🚗</div>`}
        ${imgs.length > 1 ? `<div class="img-count-badge">+${imgs.length - 1}</div>` : ''}
      </div>
      <div class="listing-body">
        <div class="listing-price">${formatPrice(l.price)} <span class="listing-curr">${curr}</span></div>
        <div class="listing-name">${l.make} ${l.model}</div>
        <div class="listing-meta">
          <span class="meta-chip">${l.year}</span>
          ${l.mileage ? `<span class="meta-chip">${parseInt(l.mileage).toLocaleString()} km</span>` : ''}
          ${l.notes ? `<div class="listing-notes">${l.notes.slice(0,70)}${l.notes.length>70?'…':''}</div>` : ''}
        </div>
        <div class="listing-contact">
          <a class="btn-whatsapp" href="${waLink}" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.12 1.533 5.848L0 24l6.335-1.508A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.876 0-3.63-.49-5.15-1.348l-.37-.22-3.76.896.954-3.664-.243-.384A9.945 9.945 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            ${t('whatsappBtn')}
          </a>
          <a class="btn-call" href="tel:${l.phone}" title="Call">📞</a>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Image gallery lightbox ────────────────────────────────────
window.openGallery = function(id, images) {
  if (!images || !images.length) return;
  let idx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'gallery-overlay';
  const render = () => {
    overlay.innerHTML = `
      <div class="gallery-inner">
        <button class="gallery-close" onclick="this.closest('.gallery-overlay').remove()">✕</button>
        <button class="gallery-prev" onclick="event.stopPropagation();window._galleryNav(-1)" ${idx===0?'disabled':''}>‹</button>
        <img src="${images[idx]}" class="gallery-img">
        <button class="gallery-next" onclick="event.stopPropagation();window._galleryNav(1)" ${idx===images.length-1?'disabled':''}>›</button>
        <div class="gallery-counter">${idx+1} / ${images.length}</div>
      </div>`;
  };
  window._galleryNav = (dir) => { idx = Math.max(0, Math.min(images.length-1, idx+dir)); render(); };
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  render();
  document.body.appendChild(overlay);
};

// ── Password rules UI ─────────────────────────────────────────
document.getElementById('reg-password')?.addEventListener('input', window.onPasswordInput);

// ── Enter key ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('form-login')?.classList.contains('active')) window.doLogin();
  else if (document.getElementById('form-register')?.classList.contains('active')) window.doRegister();
});
