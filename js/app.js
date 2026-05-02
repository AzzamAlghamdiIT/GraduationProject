// ============================================================
//  app.js — Thmmenha v3.0
//  Firebase Auth + Supabase + Chat + Edit/Delete + Detail Page
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

// ── Firebase ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:    "AIzaSyDf_qhKIr3-NXhzQZoxMo2RjupYSbFvs3Y",
  authDomain:"car-price-app-610fb.firebaseapp.com",
  projectId: "car-price-app-610fb",
};
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);

// ── Supabase ─────────────────────────────────────────────────
const SB_URL = 'https://cydznlbilyutnuvmzpin.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZHpubGJpbHl1dG51dm16cGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTc5NDUsImV4cCI6MjA5Mjg5Mzk0NX0.Km4bP0Sh8gCg4F0MzErN69-y-PYe2H5cS7akhJjkupA';

const SB_HEADERS = {
  'Content-Type':  'application/json',
  'apikey':         SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Prefer':        'return=representation',
};

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, ...opts });
  if (!res.ok) { const e = await res.text(); throw new Error(`SB ${res.status}: ${e}`); }
  return res.status === 204 ? null : res.json();
}

const sb = {
  getCars:     ()         => sbFetch('Cars?select=*&order=created_at.desc'),
  insertCar:   (d)        => sbFetch('Cars', { method:'POST', body:JSON.stringify(d) }),
  updateCar:   (id, d)    => sbFetch(`Cars?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(d) }),
  deleteCar:   (id)       => sbFetch(`Cars?id=eq.${id}`, { method:'DELETE' }),
  getMessages: (carId)    => sbFetch(`messages?car_id=eq.${carId}&order=created_at.asc`),
  insertMsg:   (d)        => sbFetch('messages', { method:'POST', body:JSON.stringify(d) }),
};

// ── State ─────────────────────────────────────────────────────
let currentUser = null;
let allListings = [];
let currentCarId = null;
let chatPollTimer = null;
let uploadedImages = [];

// ── i18n ─────────────────────────────────────────────────────
let LANG = localStorage.getItem('th_lang') || 'ar';

const T = {
  ar: {
    siteName:'ثمنها', tagline:'تقدير سيارتك · شراء · بيع',
    subTagline:'المملكة العربية السعودية · ذكاء أسعار السيارات',
    signIn:'تسجيل الدخول', createAccount:'إنشاء حساب',
    welcomeBack:'مرحباً بعودتك', signInSub:'سجل دخولك للوصول إلى أدوات السيارات',
    createYour:'إنشاء حسابك', createSub:'مجاني للأبد · لا يلزم بطاقة ائتمانية',
    email:'البريد الإلكتروني', password:'كلمة المرور',
    confirmPass:'تأكيد كلمة المرور', firstName:'الاسم الأول', lastName:'اسم العائلة',
    signInBtn:'دخول ←', createBtn:'إنشاء الحساب ←', signOut:'خروج',
    getStarted:'ابدأ الآن', back:'رجوع',
    landingTitle:'قيّم سيارتك\nبذكاء وسرعة',
    landingDesc:'المنصة الأذكى في المملكة لتقدير سعر السيارة والبحث حسب الميزانية والسوق.',
    feature1Title:'تقدير سعر سيارتي', feature1Desc:'احصل على تقييم دقيق لسيارتك المستعملة.',
    feature2Title:'بحث حسب الميزانية', feature2Desc:'اكتشف السيارات المتوفرة ضمن ميزانيتك.',
    feature3Title:'السوق', feature3Desc:'تصفح السيارات المعروضة.',
    addCarTitle:'أعلن عن سيارتك', addCarDesc:'أضف إعلان سيارتك وتواصل مع المشترين.',
    browseTitle:'الإعلانات النشطة', browseDesc:'تصفح السيارات المعروضة للبيع.',
    dashTitle:'الصفحة الرئيسية', dashSub:'تقدير فوري للسيارة، بحث بالميزانية، وسوق للبيع والشراء.',
    carValuation:'تقدير السعر', carValSub:'احسب القيمة السوقية الحالية لسيارتك',
    vehicleInfo:'معلومات المركبة', make:'الماركة', model:'الموديل', trim:'الفئة',
    year:'السنة', mileageKm:'عداد الكيلومترات',
    condHistory:'الحالة والتاريخ', accidentHistory:'تاريخ الحوادث',
    noAccident:'بدون حوادث', minor:'بسيط', medium:'متوسط', major:'كبير',
    calcPrice:'📊 احسب السعر التقديري', estMarketVal:'القيمة السوقية التقديرية',
    calculated:'✓ تم الحساب', sarLabel:'ريال سعودي',
    range:'النطاق', agencyPrice:'سعر الوكالة',
    disclaimer:'⚠️ هذا التقدير مبني على بيانات أسعار الوكالات وأنماط الاستهلاك في السوق السعودي.',
    notFoundTitle:'السيارة غير موجودة', notFoundMsg:'هذه السيارة غير متوفرة في قاعدة بياناتنا. للحصول على تقييم يدوي تواصل معنا خلال 3 أيام عمل.',
    contactUs:'✉️ thmmenha@gmail.com — طلب تقييم يدوي',
    budgetFinder:'البحث بالميزانية', budgetFinderSub:'ابحث عن سيارات جديدة ضمن نطاق سعرك',
    searchFilters:'معايير البحث', minBudget:'أقل ميزانية (ر.س)', maxBudget:'أعلى ميزانية (ر.س)',
    carType:'نوع السيارة', allTypes:'جميع الأنواع',
    searchCars:'🔍 ابحث عن السيارات', found:'وُجد', carsIn:'سيارة ضمن ميزانيتك',
    noResults:'لا توجد سيارات في هذا النطاق السعري.',
    marketplace:'السوق', marketplaceSub:'تصفح السيارات المعروضة للبيع في المملكة',
    listYourCar:'بيانات السيارة', sellMake:'الماركة *', sellModel:'الموديل *',
    sellYear:'السنة *', sellMileage:'الكيلومترات', askingPrice:'السعر المطلوب (ر.س) *',
    phoneWa:'الجوال / واتساب *', notes:'ملاحظات',
    photosUpTo5:'الصور (حتى 5)', clickUpload:'انقر لرفع الصور', uploadSub:'JPG أو PNG حتى 5MB',
    publishListing:'🚀 نشر الإعلان', activeListings:'الإعلانات النشطة', listings:'إعلان',
    noListings:'لا توجد إعلانات بعد. كن أول من يبيع سيارته!',
    whatsappBtn:'💬 واتساب', selectMake:'اختر الماركة', selectModel:'اختر الموديل',
    allTrims:'جميع الفئات', currency:'ر.س',
    retentionLabel:'نسبة القيمة المتبقية', agencyPriceLbl:'سعر الوكالة',
    fillRequired:'يرجى تعبئة جميع الحقول المطلوبة.',
    yearInvalid:'يجب أن تكون السنة بين 1980 و',
    selectMakeModel:'يرجى اختيار الماركة والموديل على الأقل.',
    passRule1:'8 أحرف على الأقل', passRule2:'حرف كبير واحد',
    passRule3:'رقم واحد', passRule4:'رمز خاص واحد',
    showDetails:'عرض التفاصيل', editListing:'تعديل الإعلان', deleteListing:'حذف الإعلان',
    chatBtn:'💬 تواصل مع المعلن', confirmDelete:'هل أنت متأكد من حذف هذا الإعلان؟',
    myListing:'إعلانك', editSave:'حفظ التعديل', editCancel:'إلغاء',
    chatPlaceholder:'اكتب رسالتك…', chatSend:'إرسال',
    chatTitle:'المحادثة', photoCount:'صور',
  },
  en: {
    siteName:'Thmmenha', tagline:'Valuing Your Car · Buy · Sell',
    subTagline:'Saudi Arabia · Car Price Intelligence',
    signIn:'Sign In', createAccount:'Create Account',
    welcomeBack:'Welcome back', signInSub:'Sign in to access your car tools',
    createYour:'Create your account', createSub:'Free forever',
    email:'Email Address', password:'Password',
    confirmPass:'Confirm Password', firstName:'First Name', lastName:'Last Name',
    signInBtn:'Sign In →', createBtn:'Create Account →', signOut:'Sign Out',
    getStarted:'Get Started', back:'Back',
    landingTitle:'VALUE YOUR CAR\nSMART & FAST',
    landingDesc:"Saudi Arabia's smartest platform for car valuation, budget search, and marketplace.",
    feature1Title:'Estimate My Car Price', feature1Desc:'Get an accurate market valuation.',
    feature2Title:'Find Cars by Budget', feature2Desc:'Discover cars within your budget.',
    feature3Title:'Marketplace', feature3Desc:'Browse listed cars.',
    addCarTitle:'Sell My Car', addCarDesc:'List your car and connect with buyers.',
    browseTitle:'Active Listings', browseDesc:'Browse cars for sale.',
    dashTitle:'Home', dashSub:'Car valuation, budget search, and marketplace.',
    carValuation:'CAR VALUATION', carValSub:"Estimate your car's current market value",
    vehicleInfo:'Vehicle Information', make:'Make', model:'Model', trim:'Trim',
    year:'Year', mileageKm:'Mileage (km)',
    condHistory:'Condition & History', accidentHistory:'Accident History',
    noAccident:'No Accident', minor:'Minor', medium:'Medium', major:'Major',
    calcPrice:'📊 Calculate Estimated Price', estMarketVal:'Estimated Market Value',
    calculated:'✓ Calculated', sarLabel:'Saudi Riyal (SAR)',
    range:'Range', agencyPrice:'Agency Price',
    disclaimer:'⚠️ This estimate is based on agency pricing data and Saudi market conditions.',
    notFoundTitle:'Car Not Found', notFoundMsg:"This vehicle isn't in our database. Contact us for a manual evaluation within 3 business days.",
    contactUs:'✉️ thmmenha@gmail.com — Request Evaluation',
    budgetFinder:'BUDGET FINDER', budgetFinderSub:'Find new cars within your price range',
    searchFilters:'Search Filters', minBudget:'Min Budget (SAR)', maxBudget:'Max Budget (SAR)',
    carType:'Car Type', allTypes:'All Types',
    searchCars:'🔍 Search Cars', found:'Found', carsIn:'car(s) in your budget',
    noResults:'No cars found. Try adjusting filters.',
    marketplace:'MARKETPLACE', marketplaceSub:'Buy and sell cars in Saudi Arabia',
    listYourCar:'Car Details', sellMake:'Make *', sellModel:'Model *',
    sellYear:'Year *', sellMileage:'Mileage (km)', askingPrice:'Asking Price (SAR) *',
    phoneWa:'Phone / WhatsApp *', notes:'Notes',
    photosUpTo5:'Photos (up to 5)', clickUpload:'Click to upload photos', uploadSub:'JPG, PNG up to 5MB',
    publishListing:'🚀 Publish Listing', activeListings:'Active Listings', listings:'listing(s)',
    noListings:'No listings yet. Be the first to sell!',
    whatsappBtn:'💬 WhatsApp', selectMake:'Select Make', selectModel:'Select Model',
    allTrims:'All Trims', currency:'SAR',
    retentionLabel:'Value Retention', agencyPriceLbl:'Agency Price',
    fillRequired:'Please fill in all required fields.',
    yearInvalid:'Year must be between 1980 and',
    selectMakeModel:'Please select at least Make and Model.',
    passRule1:'At least 8 characters', passRule2:'One uppercase letter',
    passRule3:'One number', passRule4:'One special character',
    showDetails:'View Details', editListing:'Edit Listing', deleteListing:'Delete Listing',
    chatBtn:'💬 Chat with Seller', confirmDelete:'Are you sure you want to delete this listing?',
    myListing:'Your Listing', editSave:'Save Changes', editCancel:'Cancel',
    chatPlaceholder:'Type your message…', chatSend:'Send',
    chatTitle:'Chat', photoCount:'photos',
  }
};

function t(k) { return T[LANG][k] || T['ar'][k] || k; }
function currency() { return t('currency'); }

function applyTranslations() {
  document.querySelectorAll('[data-t]').forEach(el => {
    const k = el.getAttribute('data-t');
    const v = t(k);
    if (el.tagName === 'INPUT') el.placeholder = v;
    else el.textContent = v;
  });
  document.querySelectorAll('[data-tp]').forEach(el => { el.placeholder = t(el.getAttribute('data-tp')); });
  const isAr = LANG === 'ar';
  document.documentElement.lang = LANG;
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', isAr);
  document.querySelectorAll('[id^="lang-btn"]').forEach(b => b.textContent = isAr ? 'EN' : 'ع');
  // Update back buttons
  document.querySelectorAll('.back-btn').forEach(b => { b.textContent = isAr ? '→' : '←'; });
}

window.toggleLang = function() {
  LANG = LANG === 'ar' ? 'en' : 'ar';
  localStorage.setItem('th_lang', LANG);
  applyTranslations();
  populateEstimatorMakes();
  populateTypeFilter();
};

// ── Theme ─────────────────────────────────────────────────────
let DARK = localStorage.getItem('th_dark') === 'true'; // default LIGHT

function applyTheme() {
  document.body.classList.toggle('light-mode', !DARK);
  const icon = DARK ? '☀️' : '🌙';
  document.querySelectorAll('[id^="theme-btn"]').forEach(b => b.textContent = icon);
}

window.toggleTheme = function() {
  DARK = !DARK;
  localStorage.setItem('th_dark', DARK);
  applyTheme();
};

// ── Boot ─────────────────────────────────────────────────────
(async function init() {
  applyTheme();
  applyTranslations();
  await loadCarData();
  populateEstimatorMakes();
  populateTypeFilter();
  document.querySelectorAll('.auth-tab').forEach(tab =>
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab))
  );
  document.getElementById('reg-password')?.addEventListener('input', window.onPasswordInput);
  onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) showApp(user);
    else      showLanding();
  });
})();

// ── Routing ───────────────────────────────────────────────────
function showLanding()   { setPage('landing-page'); }
function showAuth(tab)   { setPage('auth-page'); switchAuthTab(tab || 'login'); }

function showApp(user) {
  setPage('app-page');
  const name = user.displayName || user.email.split('@')[0];
  const initials = name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('');
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name').textContent   = name;
  showDashboard();
}

function setPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showDashboard() {
  switchSection('dashboard');
}

function switchSection(name) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  // Stop chat polling when leaving chat
  if (name !== 'chat' && chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
}

window.goToDashboard    = showDashboard;
window.goToLanding      = showLanding;
window.goToAuthLogin    = () => showAuth('login');
window.goToAuthRegister = () => showAuth('register');
window.goToFeature      = function(f) {
  switchSection(f);
  if (f === 'listings') fetchAndRenderListings();
};

// ── Auth tab ──────────────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`form-${tab}`)?.classList.add('active');
}

// ── Password rules ────────────────────────────────────────────
function validatePassword(pw) {
  return [
    { key:'passRule1', test: pw.length >= 8 },
    { key:'passRule2', test: /[A-Z]/.test(pw) },
    { key:'passRule3', test: /[0-9]/.test(pw) },
    { key:'passRule4', test: /[^A-Za-z0-9]/.test(pw) },
  ];
}
window.onPasswordInput = function() {
  const pw = document.getElementById('reg-password')?.value || '';
  validatePassword(pw).forEach(r => {
    document.getElementById(`rule-${r.key}`)?.classList.toggle('valid', r.test);
  });
};

// ── Register ──────────────────────────────────────────────────
window.doRegister = async function() {
  clearAlert('register');
  const fn = val('reg-firstname'), ln = val('reg-lastname'),
        em = val('reg-email'),     pw = val('reg-password'), cf = val('reg-confirm');
  if (!fn || !ln || !em || !pw || !cf) return showFormAlert('register','error', t('fillRequired'));
  const bad = validatePassword(pw).filter(r => !r.test);
  if (bad.length) return showFormAlert('register','error','❌ ' + t(bad[0].key));
  if (pw !== cf)  return showFormAlert('register','error','❌ كلمتا المرور غير متطابقتين.');
  setBtnLoading('btn-register', true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, em, pw);
    await updateProfile(cred.user, { displayName:`${fn} ${ln}` });
    showFormAlert('register','success','✅ تم إنشاء الحساب!');
  } catch(e) { showFormAlert('register','error', fbErr(e.code)); }
  setBtnLoading('btn-register', false);
};

// ── Login ─────────────────────────────────────────────────────
window.doLogin = async function() {
  clearAlert('login');
  const em = val('login-email'), pw = val('login-password');
  if (!em || !pw) return showFormAlert('login','error', t('fillRequired'));
  setBtnLoading('btn-login', true);
  try { await signInWithEmailAndPassword(auth, em, pw); }
  catch(e) { showFormAlert('login','error', fbErr(e.code)); }
  setBtnLoading('btn-login', false);
};

window.doLogout = () => signOut(auth);

function fbErr(code) {
  const m = {
    'auth/user-not-found':      '❌ لا يوجد حساب بهذا البريد.',
    'auth/wrong-password':      '❌ كلمة المرور غير صحيحة.',
    'auth/email-already-in-use':'❌ البريد مستخدم بالفعل.',
    'auth/invalid-email':       '❌ بريد إلكتروني غير صالح.',
    'auth/weak-password':       '❌ كلمة المرور ضعيفة جداً.',
    'auth/too-many-requests':   '⚠️ محاولات كثيرة. حاول لاحقاً.',
    'auth/invalid-credential':  '❌ البريد أو كلمة المرور غير صحيحة.',
  };
  return m[code] || '❌ حدث خطأ ما.';
}

// ── Helpers ───────────────────────────────────────────────────
function val(id)   { return (document.getElementById(id)?.value || '').trim(); }
function showFormAlert(form, type, msg) {
  const el = document.getElementById(`alert-${form}`);
  if (!el) return;
  el.className = `auth-alert show ${type}`;
  el.innerHTML = msg;
}
function clearAlert(f) { const el = document.getElementById(`alert-${f}`); if(el) el.className='auth-alert'; }
function setBtnLoading(id, s) { document.getElementById(id)?.classList.toggle('loading', s); }
function toast(msg, type='success') {
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = msg;
  tc.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; }, 3000);
  setTimeout(()=>el.remove(), 3400);
}

// ================================================================
//  ESTIMATOR
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
  modelEl.disabled = !make; trimEl.disabled = true;
  if (!make) return;
  getModels(make).forEach(m => modelEl.innerHTML += `<option value="${m}">${m}</option>`);
  modelEl.disabled = false;
};

window.onModelChange = function() {
  const make = val('est-make'), model = val('est-model');
  const trimEl = document.getElementById('est-trim');
  trimEl.innerHTML = `<option value="">${t('allTrims')}</option>`;
  if (!make || !model) return;
  getTrims(make, model).forEach(tr => trimEl.innerHTML += `<option value="${tr}">${tr}</option>`);
  trimEl.disabled = false;
};

window.runEstimation = function() {
  const make    = val('est-make'), model = val('est-model'), trim = val('est-trim');
  const year    = val('est-year') || String(new Date().getFullYear());
  const mileage = val('est-mileage') || '0';
  const accident= document.querySelector('input[name="accident"]:checked')?.value || 'none';

  document.getElementById('est-not-found').classList.remove('show');
  document.getElementById('est-result').classList.remove('show');

  if (!make || !model) { toast(t('selectMakeModel'),'error'); return; }
  const yr = parseInt(year), curY = new Date().getFullYear();
  if (yr < 1980 || yr > curY) { toast(`${t('yearInvalid')} ${curY}`,'error'); return; }

  const result = estimatePrice({ make, model, trim, year, mileage, accident });
  if (!result) { document.getElementById('est-not-found').classList.add('show'); return; }

  const curr = currency();
  document.getElementById('res-price').textContent    = formatPrice(result.estimatedPrice);
  document.getElementById('res-currency').textContent = curr;
  document.getElementById('res-agency').textContent   = `${formatPrice(result.agencyPrice)} ${curr}`;
  document.getElementById('res-low').textContent      = `${formatPrice(result.rangeLow)} ${curr}`;
  document.getElementById('res-high').textContent     = `${formatPrice(result.rangeHigh)} ${curr}`;
  document.getElementById('res-car-name').textContent = `${result.car.Make} ${result.car.Model} ${result.car.Trim||''}`;
  document.getElementById('res-retention').textContent= `${result.retentionPct}%`;

  const fe = document.getElementById('res-factors');
  fe.innerHTML = '';
  Object.values(result.factors).forEach(f => {
    fe.innerHTML += `<div class="factor-chip">
      <div class="factor-label">${f.label}</div>
      <div class="factor-value">${f.value.split(' (')[0].split(' (-')[0]}</div>
      <div class="factor-impact ${f.impact}">${f.value.match(/\(.*?\)/)?.[0]||''}</div>
    </div>`;
  });

  document.getElementById('est-result').classList.add('show');
  document.getElementById('est-result').scrollIntoView({ behavior:'smooth', block:'nearest' });
};

// ================================================================
//  BUDGET FINDER
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
  const grid = document.getElementById('budget-grid');
  grid.innerHTML = results.length === 0
    ? `<div class="empty-listings" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>${t('noResults')}</p></div>`
    : results.map(car => `
      <div class="car-card">
        <div class="car-card-make">${car.Make}</div>
        <div class="car-card-model">${car.Model}</div>
        <div class="car-card-year">${car.Year}</div>
        <div class="car-card-trim">${car.Trim}</div>
        <div class="car-card-price">${formatPrice(car.Agency_Price)}</div>
        <div class="car-card-price-unit">${curr} · ${LANG==='ar'?'سعر الوكالة':'Agency Price'}</div>
        <div class="car-card-type">${car.Type}</div>
      </div>`).join('');
  document.getElementById('budget-count').innerHTML =
    `${t('found')} <strong>${results.length}</strong> ${t('carsIn')}`;
  document.getElementById('budget-results').classList.add('show');
};

// ================================================================
//  SELL — IMAGE UPLOAD
// ================================================================
window.handleImageUpload = function(input) {
  const files = Array.from(input.files).slice(0, 5);
  const preview = document.getElementById('img-preview');
  preview.innerHTML = '';
  uploadedImages = [];
  files.forEach(file => {
    if (file.size > 5*1024*1024) { toast('⚠️ الصورة أكبر من 5MB','error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      uploadedImages.push(e.target.result);
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'img-thumb';
      img.title = 'انقر للحذف';
      img.onclick = () => { uploadedImages = uploadedImages.filter(u=>u!==e.target.result); img.remove(); };
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
};

// ================================================================
//  SUBMIT LISTING
// ================================================================
window.submitListing = async function() {
  const make=val('sell-make'), model=val('sell-model'), yearStr=val('sell-year'),
        mileage=val('sell-mileage'), price=val('sell-price'),
        phone=val('sell-phone'), notes=val('sell-notes');

  if (!make||!model||!yearStr||!price||!phone) { toast(t('fillRequired'),'error'); return; }
  const yr=parseInt(yearStr), curY=new Date().getFullYear();
  if (isNaN(yr)||yr<1980||yr>curY) {
    document.getElementById('sell-year').classList.add('input-error');
    toast(`${t('yearInvalid')} ${curY}`,'error'); return;
  }
  document.getElementById('sell-year').classList.remove('input-error');

  const btn = document.getElementById('btn-publish');
  if (btn) { btn.disabled=true; btn.textContent='⏳…'; }

  try {
    await sb.insertCar({ make, model, year:yr, mileage:parseInt(mileage)||0,
      price:parseFloat(price), phone, notes:notes||'',
      images: uploadedImages.slice(),
      owner_email: currentUser?.email || '' });
    toast('✅ ' + (LANG==='ar'?'تم نشر الإعلان بنجاح!':'Listing published!'));
    clearSellForm();
    goToFeature('listings');
  } catch(e) {
    console.error(e);
    toast('❌ ' + (LANG==='ar'?'فشل النشر. تحقق من الاتصال.':'Failed to publish.'),'error');
  }
  if (btn) { btn.disabled=false; btn.innerHTML=`<span data-t="publishListing">${t('publishListing')}</span>`; }
};

function clearSellForm() {
  ['sell-make','sell-model','sell-year','sell-mileage','sell-price','sell-phone','sell-notes']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('img-preview').innerHTML='';
  uploadedImages=[];
}

// ================================================================
//  FETCH & RENDER LISTINGS
// ================================================================
async function fetchAndRenderListings() {
  const grid = document.getElementById('listings-grid');
  const countEl = document.getElementById('listings-count');
  if (!grid) return;
  grid.innerHTML = `<div class="listing-skeleton"></div><div class="listing-skeleton"></div><div class="listing-skeleton"></div>`;
  try {
    allListings = await sb.getCars();
    renderListings(allListings);
  } catch(e) {
    grid.innerHTML = `<div class="empty-listings"><div class="empty-icon">⚠️</div><p>${LANG==='ar'?'خطأ في تحميل البيانات':'Error loading listings'}</p></div>`;
  }
}

function renderListings(listings) {
  const grid    = document.getElementById('listings-grid');
  const countEl = document.getElementById('listings-count');
  if (!grid) return;
  countEl.textContent = `${listings.length} ${t('listings')}`;

  if (!listings.length) {
    grid.innerHTML = `<div class="empty-listings"><div class="empty-icon">🚗</div><p>${t('noListings')}</p></div>`;
    return;
  }

  const curr = currency();
  const myEmail = currentUser?.email || '';

  grid.innerHTML = listings.map(l => {
    const imgs = Array.isArray(l.images) ? l.images : [];
    const isOwner = l.owner_email && l.owner_email === myEmail;
    return `
    <div class="listing-card" id="card-${l.id}">
      <div class="listing-img-wrap" onclick="openDetail('${l.id}')">
        ${imgs.length
          ? `<img src="${imgs[0]}" alt="${l.make} ${l.model}" loading="lazy">`
          : `<div class="listing-img-placeholder">🚗</div>`}
        ${imgs.length>1 ? `<div class="img-count-badge">+${imgs.length-1} ${t('photoCount')}</div>` : ''}
        ${isOwner ? `<div class="owner-badge">${t('myListing')}</div>` : ''}
      </div>
      <div class="listing-body">
        <div class="listing-price">${formatPrice(l.price)} <span class="listing-curr">${curr}</span></div>
        <div class="listing-name">${l.make} ${l.model} ${l.year}</div>
        <div class="listing-meta">
          ${l.mileage ? `<span class="meta-chip">${parseInt(l.mileage).toLocaleString()} km</span>` : ''}
          ${l.notes ? `<div class="listing-notes">${l.notes.slice(0,60)}${l.notes.length>60?'…':''}</div>` : ''}
        </div>
        <div class="listing-actions">
          <button class="btn-detail" onclick="openDetail('${l.id}')">🔍 ${t('showDetails')}</button>
          ${isOwner ? `
          <button class="btn-edit-sm" onclick="openEditModal('${l.id}')">✏️</button>
          <button class="btn-delete-sm" onclick="deleteListing('${l.id}')">🗑️</button>
          ` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ================================================================
//  DETAIL PAGE
// ================================================================
window.openDetail = function(id) {
  const l = allListings.find(x => String(x.id) === String(id));
  if (!l) return;
  currentCarId = l.id;
  const curr = currency();
  const imgs = Array.isArray(l.images) ? l.images : [];
  const myEmail = currentUser?.email || '';
  const isOwner = l.owner_email && l.owner_email === myEmail;
  const phone = (l.phone||'').replace(/^0/,'');
  const waText = encodeURIComponent(
    LANG==='ar'
      ? `بخصوص إعلانك على منصة ثمنها لسيارة ${l.make} ${l.model} ${l.year}، أرغب في الاستفسار عنها.`
      : `Regarding your listing on Thmmenha for the ${l.make} ${l.model} ${l.year}, I would like to inquire about it.`
  );

  document.getElementById('detail-title').textContent = `${l.make} ${l.model} ${l.year}`;

  document.getElementById('detail-content').innerHTML = `
    <!-- Gallery -->
    <div class="detail-gallery">
      ${imgs.length
        ? `<div class="detail-main-img" onclick="openGallery('${l.id}', ${JSON.stringify(imgs).replace(/"/g,"'")})">
             <img src="${imgs[0]}" id="gallery-main-${l.id}" alt="main">
             ${imgs.length>1?`<div class="gallery-thumb-strip">${imgs.slice(0,5).map((img,i)=>`<img src="${img}" onclick="event.stopPropagation();document.getElementById('gallery-main-${l.id}').src='${img}'" class="${i===0?'active':''}">`).join('')}</div>`:''}
           </div>`
        : `<div class="detail-no-img">🚗</div>`}
    </div>

    <!-- Info -->
    <div class="detail-info-grid">
      <div class="detail-info-card">
        <div class="detail-price">${formatPrice(l.price)} <span>${curr}</span></div>
        <div class="detail-car-name">${l.make} ${l.model} ${l.year}</div>
        ${l.mileage ? `<div class="detail-chip">🛣️ ${parseInt(l.mileage).toLocaleString()} km</div>` : ''}
        ${l.notes ? `<div class="detail-notes">${l.notes}</div>` : ''}
      </div>

      <!-- Actions -->
      <div class="detail-actions-card">
        ${!isOwner ? `
        <a class="btn-whatsapp-lg" href="https://wa.me/966${phone}?text=${waText}" target="_blank" rel="noopener">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.12 1.533 5.848L0 24l6.335-1.508A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.876 0-3.63-.49-5.15-1.348l-.37-.22-3.76.896.954-3.664-.243-.384A9.945 9.945 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
          ${t('whatsappBtn')}
        </a>
        <a class="btn-call-lg" href="tel:${l.phone}">📞 ${l.phone}</a>
        <button class="btn-chat-lg" onclick="openChat('${l.id}', '${l.make} ${l.model}', '${l.owner_email||''}')">
          💬 ${t('chatBtn')}
        </button>
        ` : `
        <div class="owner-actions">
          <button class="btn-edit-lg" onclick="openEditModal('${l.id}')">✏️ ${t('editListing')}</button>
          <button class="btn-delete-lg" onclick="deleteListing('${l.id}')">🗑️ ${t('deleteListing')}</button>
        </div>
        `}
      </div>
    </div>`;

  switchSection('detail');
};

// ================================================================
//  DELETE LISTING
// ================================================================
window.deleteListing = async function(id) {
  if (!confirm(t('confirmDelete'))) return;
  try {
    await sb.deleteCar(id);
    allListings = allListings.filter(l => String(l.id) !== String(id));
    toast('✅ ' + (LANG==='ar'?'تم حذف الإعلان.':'Listing deleted.'));
    // If on detail page, go back to listings
    const detailActive = document.getElementById('section-detail').classList.contains('active');
    if (detailActive) goToFeature('listings');
    else renderListings(allListings);
  } catch(e) {
    toast('❌ ' + (LANG==='ar'?'فشل الحذف.':'Delete failed.'),'error');
  }
};

// ================================================================
//  EDIT LISTING — modal
// ================================================================
window.openEditModal = function(id) {
  const l = allListings.find(x => String(x.id) === String(id));
  if (!l) return;

  // Remove any existing modal
  document.getElementById('edit-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'edit-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">✏️ ${t('editListing')}</div>
      <div class="form-grid" style="margin-bottom:12px">
        <div class="form-field">
          <label>${t('make')}</label>
          <input id="edit-make" value="${l.make||''}">
        </div>
        <div class="form-field">
          <label>${t('model')}</label>
          <input id="edit-model" value="${l.model||''}">
        </div>
        <div class="form-field">
          <label>${t('year')}</label>
          <input id="edit-year" type="number" value="${l.year||''}">
        </div>
        <div class="form-field">
          <label>${t('mileageKm')}</label>
          <input id="edit-mileage" type="number" value="${l.mileage||''}">
        </div>
        <div class="form-field">
          <label>${t('askingPrice')}</label>
          <input id="edit-price" type="number" value="${l.price||''}">
        </div>
        <div class="form-field">
          <label>${t('phoneWa')}</label>
          <input id="edit-phone" value="${l.phone||''}">
        </div>
      </div>
      <div class="form-field" style="margin-bottom:16px">
        <label>${t('notes')}</label>
        <textarea id="edit-notes" rows="3">${l.notes||''}</textarea>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-blue" style="flex:1" onclick="saveEdit('${l.id}')">${t('editSave')}</button>
        <button class="btn-ghost" style="flex:1" onclick="document.getElementById('edit-modal').remove()">${t('editCancel')}</button>
      </div>
    </div>`;
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  document.body.appendChild(modal);
};

window.saveEdit = async function(id) {
  const make=val('edit-make'), model=val('edit-model'), yearStr=val('edit-year'),
        mileage=val('edit-mileage'), price=val('edit-price'),
        phone=val('edit-phone'), notes=val('edit-notes');
  if (!make||!model||!yearStr||!price||!phone) { toast(t('fillRequired'),'error'); return; }
  const yr=parseInt(yearStr), curY=new Date().getFullYear();
  if (isNaN(yr)||yr<1980||yr>curY) { toast(`${t('yearInvalid')} ${curY}`,'error'); return; }

  try {
    await sb.updateCar(id, { make, model, year:yr, mileage:parseInt(mileage)||0,
      price:parseFloat(price), phone, notes:notes||'' });
    // Update local state
    const idx = allListings.findIndex(x=>String(x.id)===String(id));
    if(idx>-1) allListings[idx] = { ...allListings[idx], make, model, year:yr, mileage:parseInt(mileage)||0, price:parseFloat(price), phone, notes:notes||'' };
    document.getElementById('edit-modal').remove();
    toast('✅ '+(LANG==='ar'?'تم تحديث الإعلان.':'Listing updated.'));
    renderListings(allListings);
  } catch(e) {
    toast('❌ '+(LANG==='ar'?'فشل التحديث.':'Update failed.'),'error');
  }
};

// ================================================================
//  GALLERY LIGHTBOX
// ================================================================
window.openGallery = function(id, images) {
  if (!images||!images.length) return;
  let idx=0;
  const ov=document.createElement('div');
  ov.className='gallery-overlay';
  const render=()=>{ ov.innerHTML=`
    <div class="gallery-inner">
      <button class="gallery-close" onclick="this.closest('.gallery-overlay').remove()">✕</button>
      <button class="gallery-prev" onclick="event.stopPropagation();window._gNav(-1)" ${idx===0?'disabled':''}>‹</button>
      <img src="${images[idx]}" class="gallery-img">
      <button class="gallery-next" onclick="event.stopPropagation();window._gNav(1)" ${idx===images.length-1?'disabled':''}>›</button>
      <div class="gallery-counter">${idx+1} / ${images.length}</div>
    </div>`; };
  window._gNav=(d)=>{ idx=Math.max(0,Math.min(images.length-1,idx+d)); render(); };
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  render();
  document.body.appendChild(ov);
};

// ================================================================
//  CHAT
// ================================================================
window.openChat = function(carId, carName, ownerEmail) {
  currentCarId = carId;
  document.getElementById('chat-title').textContent    = t('chatTitle') + ' — ' + carName;
  document.getElementById('chat-subtitle').textContent = LANG==='ar'?`مع المعلن`:`With seller`;
  document.getElementById('chat-back-btn').onclick     = () => openDetail(carId);
  switchSection('chat');
  loadMessages(carId);
  // Poll every 5 seconds for new messages
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(()=>loadMessages(carId), 5000);
};

async function loadMessages(carId) {
  try {
    const msgs = await sb.getMessages(carId);
    renderMessages(msgs);
  } catch(e) { console.error('Chat load error', e); }
}

function renderMessages(msgs) {
  const box = document.getElementById('chat-messages');
  if (!box) return;
  const myEmail = currentUser?.email || '';
  box.innerHTML = msgs.length === 0
    ? `<div class="chat-empty">${LANG==='ar'?'لا توجد رسائل بعد. ابدأ المحادثة!':'No messages yet. Start the conversation!'}</div>`
    : msgs.map(m => {
        const isMine = m.sender_email === myEmail;
        return `<div class="chat-msg ${isMine?'mine':'theirs'}">
          <div class="chat-bubble">${escHtml(m.message)}</div>
          <div class="chat-meta">${isMine?'أنت':m.sender_email?.split('@')[0]||'?'} · ${new Date(m.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>`;
      }).join('');
  box.scrollTop = box.scrollHeight;
}

window.sendMessage = async function() {
  const input = document.getElementById('chat-input');
  const text  = (input?.value||'').trim();
  if (!text || !currentCarId || !currentUser) return;
  input.value = '';
  try {
    await sb.insertMsg({ car_id:currentCarId, sender_email:currentUser.email, message:text });
    await loadMessages(currentCarId);
  } catch(e) {
    toast('❌ '+(LANG==='ar'?'فشل الإرسال.':'Send failed.'),'error');
  }
};

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Enter key ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('form-login')?.classList.contains('active'))    window.doLogin();
  else if (document.getElementById('form-register')?.classList.contains('active')) window.doRegister();
});
