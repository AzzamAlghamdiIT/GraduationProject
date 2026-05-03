// ============================================================
//  app.js — Thmmenha v4.0
//  Firebase Auth + Supabase + Profile + Private Chat + Notifications
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, updateProfile, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { loadCarData, getMakes, getModels, getTrims, findByBudget,
         estimatePrice, formatPrice, getTypes }
  from './data.js';

// ── Firebase ─────────────────────────────────────────────────
const auth = getAuth(initializeApp({
  apiKey:"AIzaSyDf_qhKIr3-NXhzQZoxMo2RjupYSbFvs3Y",
  authDomain:"car-price-app-610fb.firebaseapp.com",
  projectId:"car-price-app-610fb"
}));

// ── Supabase ─────────────────────────────────────────────────
const SB  = 'https://cydznlbilyutnuvmzpin.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZHpubGJpbHl1dG51dm16cGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTc5NDUsImV4cCI6MjA5Mjg5Mzk0NX0.Km4bP0Sh8gCg4F0MzErN69-y-PYe2H5cS7akhJjkupA';
const H   = { 'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'Prefer':'return=representation' };

async function sb(path, opts={}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers:H, ...opts });
  if (!r.ok) { const e=await r.text(); throw new Error(e); }
  return r.status===204 ? null : r.json();
}

const db = {
  getCars:          ()       => sb('Cars?select=*&order=created_at.desc'),
  insertCar:        d        => sb('Cars',{method:'POST',body:JSON.stringify(d)}),
  updateCar:        (id,d)   => sb(`Cars?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(d)}),
  deleteCar:        id       => sb(`Cars?id=eq.${id}`,{method:'DELETE'}),
  getMyCars:        email    => sb(`Cars?owner_email=eq.${encodeURIComponent(email)}&order=created_at.desc`),
  getProfile:       email    => sb(`profiles?email=eq.${encodeURIComponent(email)}&limit=1`),
  upsertProfile:    d        => sb(`profiles?email=eq.${encodeURIComponent(d.email)}`,{method:'PATCH',body:JSON.stringify({username:d.username,avatar:d.avatar}),headers:{...H,'Prefer':'return=representation'}}).then(async res=>{
    // If no rows updated (new user), do INSERT
    if(!res||!res.length){ return sb('profiles',{method:'POST',body:JSON.stringify(d),headers:{...H,'Prefer':'return=representation'}}); }
    return res;
  }),
  getPublicMsgs:    carId    => sb(`messages?car_id=eq.${carId}&order=created_at.asc`),
  insertPublicMsg:  d        => sb('messages',{method:'POST',body:JSON.stringify(d)}),
  getPrivateMsgs:   (carId,a,b) => sb(`private_chats?car_id=eq.${carId}&or=(and(sender_email.eq.${encodeURIComponent(a)},receiver_email.eq.${encodeURIComponent(b)}),and(sender_email.eq.${encodeURIComponent(b)},receiver_email.eq.${encodeURIComponent(a)}))&order=created_at.asc`),
  insertPrivateMsg: d        => sb('private_chats',{method:'POST',body:JSON.stringify(d)}),
  getNotifs:        email    => sb(`notifications?user_email=eq.${encodeURIComponent(email)}&order=created_at.desc`),
  markNotifRead:    id       => sb(`notifications?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({is_read:true})}),
  markAllNotifsRead:email    => sb(`notifications?user_email=eq.${encodeURIComponent(email)}`,{method:'PATCH',body:JSON.stringify({is_read:true})}),
  insertNotif:      d        => sb('notifications',{method:'POST',body:JSON.stringify(d)}),
  getMyPrivateChats: email   => sb(`private_chats?or=(sender_email.eq.${encodeURIComponent(email)},receiver_email.eq.${encodeURIComponent(email)})&order=created_at.desc`),
};

// ── Make→Models data ─────────────────────────────────────────
let MAKE_MODELS = {};
async function loadMakeModels() {
  try { const r=await fetch('./data/make_models.json'); MAKE_MODELS=await r.json(); } catch(e){}
}

// ── Saudi cities ─────────────────────────────────────────────
const CITIES = ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران','القطيف','الأحساء','الطائف','تبوك','أبها','خميس مشيط','حائل','نجران','جيزان','ينبع','القصيم','بريدة','عنيزة','الجوف','سكاكا','عرعر','الباحة','بيشة','وادي الدواسر','القنفذة','محايل عسير','صبيا','صامطة'];

// ── State ─────────────────────────────────────────────────────
let currentUser = null;
let currentProfile = null;
let allListings = [];
let currentCarId = null;
let currentCarOwner = '';
let chatTimer = null;
let pchatTimer = null;
let uploadedImages = [];
let currentEditId = null;
const ADMIN_EMAIL = 'azzamalradef5@gmail.com';

// ── i18n ─────────────────────────────────────────────────────
let LANG = localStorage.getItem('th_lang') || 'ar';
const T = {
  ar:{ siteName:'ثمنها',tagline:'تقدير سيارتك · شراء · بيع',subTagline:'المملكة العربية السعودية · ذكاء أسعار السيارات',
    signIn:'تسجيل الدخول',createAccount:'إنشاء حساب',welcomeBack:'مرحباً بعودتك',
    signInSub:'سجل دخولك للوصول إلى أدوات السيارات',createYour:'إنشاء حسابك',createSub:'مجاني للأبد',
    email:'البريد الإلكتروني',password:'كلمة المرور',confirmPass:'تأكيد كلمة المرور',
    firstName:'الاسم الأول',lastName:'اسم العائلة',signInBtn:'دخول ←',createBtn:'إنشاء الحساب ←',
    signOut:'تسجيل الخروج',getStarted:'ابدأ الآن',back:'رجوع',
    landingTitle:'قيّم سيارتك\nبذكاء وسرعة',
    landingDesc:'المنصة الأذكى في المملكة لتقدير سعر السيارة والبحث حسب الميزانية والسوق.',
    feature1Title:'تقدير سعر سيارتي',feature1Desc:'احصل على تقييم دقيق لسيارتك المستعملة.',
    feature2Title:'بحث حسب الميزانية',feature2Desc:'اكتشف السيارات المتوفرة ضمن ميزانيتك.',
    feature3Title:'السوق',feature3Desc:'تصفح وبيع السيارات.',
    addCarTitle:'أعلن عن سيارتك',addCarDesc:'أضف إعلان سيارتك وتواصل مع المشترين.',
    browseTitle:'الإعلانات النشطة',browseDesc:'تصفح السيارات المعروضة للبيع.',
    dashTitle:'الصفحة الرئيسية',dashSub:'تقدير فوري للسيارة، بحث بالميزانية، وسوق للبيع والشراء.',
    carValuation:'تقدير السعر',carValSub:'احسب القيمة السوقية الحالية لسيارتك',
    vehicleInfo:'معلومات المركبة',make:'الماركة',model:'الموديل',trim:'الفئة',
    year:'السنة',mileageKm:'عداد الكيلومترات',condHistory:'الحالة والتاريخ',
    accidentHistory:'تاريخ الحوادث',noAccident:'بدون حوادث',minor:'بسيط',medium:'متوسط',major:'كبير',
    calcPrice:'📊 احسب السعر التقديري',estMarketVal:'القيمة السوقية التقديرية',
    calculated:'✓ تم الحساب',range:'النطاق',agencyPrice:'سعر الوكالة',
    disclaimer:'⚠️ هذا التقدير مبني على بيانات أسعار الوكالات وأنماط الاستهلاك في السوق السعودي.',
    notFoundTitle:'السيارة غير موجودة',notFoundMsg:'تواصل معنا للحصول على تقييم يدوي خلال 3 أيام عمل.',
    contactUs:'✉️ thmmenha@gmail.com',
    budgetFinder:'البحث بالميزانية',budgetFinderSub:'ابحث عن سيارات جديدة ضمن نطاق سعرك',
    searchFilters:'معايير البحث',minBudget:'أقل ميزانية (ر.س)',maxBudget:'أعلى ميزانية (ر.س)',
    carType:'نوع السيارة',allTypes:'جميع الأنواع',searchCars:'🔍 ابحث عن السيارات',
    found:'وُجد',carsIn:'سيارة ضمن ميزانيتك',noResults:'لا توجد سيارات في هذا النطاق السعري.',
    marketplace:'السوق',marketplaceSub:'تصفح السيارات المعروضة للبيع في المملكة',
    listYourCar:'بيانات السيارة',sellMake:'الماركة *',sellModel:'الموديل *',
    sellYear:'السنة *',sellMileage:'الكيلومترات',askingPrice:'السعر المطلوب (ر.س) *',
    phoneWa:'الجوال / واتساب *',notes:'ملاحظات',
    photosUpTo5:'الصور (حتى 5)',clickUpload:'انقر لرفع الصور',uploadSub:'JPG أو PNG حتى 5MB',
    publishListing:'🚀 نشر الإعلان',activeListings:'الإعلانات النشطة',listings:'إعلان',
    noListings:'لا توجد إعلانات بعد. كن أول من يبيع سيارته!',
    whatsappBtn:'💬 واتساب',selectMake:'اختر الماركة',selectModel:'اختر الموديل',
    allTrims:'جميع الفئات',currency:'ر.س',
    retentionLabel:'نسبة القيمة المتبقية',agencyPriceLbl:'سعر الوكالة',
    fillRequired:'يرجى تعبئة جميع الحقول المطلوبة.',yearInvalid:'يجب أن تكون السنة بين 1980 و',
    selectMakeModel:'يرجى اختيار الماركة والموديل على الأقل.',
    passRule1:'8 أحرف على الأقل',passRule2:'حرف كبير واحد',
    passRule3:'رقم واحد',passRule4:'رمز خاص واحد',
    showDetails:'عرض التفاصيل',editListing:'تعديل',deleteListing:'حذف',
    chatBtn:'💬 التعليقات العامة',privateChatBtn:'🔒 محادثة خاصة',
    confirmDelete:'هل أنت متأكد من حذف هذا الإعلان؟',myListing:'إعلانك',
    myProfile:'ملفي الشخصي',myListings:'إعلاناتي',myNotifs:'إشعاراتي',
    photoCount:'صور',unreadNotif:'إشعار جديد',
  },
  en:{ siteName:'Thmmenha',tagline:'Valuing Your Car · Buy · Sell',subTagline:'Saudi Arabia · Car Price Intelligence',
    signIn:'Sign In',createAccount:'Create Account',welcomeBack:'Welcome back',
    signInSub:'Sign in to access your car tools',createYour:'Create your account',createSub:'Free forever',
    email:'Email Address',password:'Password',confirmPass:'Confirm Password',
    firstName:'First Name',lastName:'Last Name',signInBtn:'Sign In →',createBtn:'Create Account →',
    signOut:'Sign Out',getStarted:'Get Started',back:'Back',
    landingTitle:'VALUE YOUR CAR\nSMART & FAST',
    landingDesc:"Saudi Arabia's smartest platform for car valuation, budget search, and marketplace.",
    feature1Title:'Estimate My Car Price',feature1Desc:'Get an accurate market valuation.',
    feature2Title:'Find Cars by Budget',feature2Desc:'Discover cars within your budget.',
    feature3Title:'Marketplace',feature3Desc:'Browse and sell cars.',
    addCarTitle:'Sell My Car',addCarDesc:'List your car and connect with buyers.',
    browseTitle:'Active Listings',browseDesc:'Browse cars for sale.',
    dashTitle:'Home',dashSub:'Car valuation, budget search, and marketplace.',
    carValuation:'CAR VALUATION',carValSub:"Estimate your car's current market value",
    vehicleInfo:'Vehicle Information',make:'Make',model:'Model',trim:'Trim',
    year:'Year',mileageKm:'Mileage (km)',condHistory:'Condition & History',
    accidentHistory:'Accident History',noAccident:'No Accident',minor:'Minor',medium:'Medium',major:'Major',
    calcPrice:'📊 Calculate Price',estMarketVal:'Estimated Market Value',
    calculated:'✓ Calculated',range:'Range',agencyPrice:'Agency Price',
    disclaimer:'⚠️ Estimate based on agency pricing and Saudi market conditions.',
    notFoundTitle:'Car Not Found',notFoundMsg:'Contact us for a manual evaluation within 3 business days.',
    contactUs:'✉️ thmmenha@gmail.com',
    budgetFinder:'BUDGET FINDER',budgetFinderSub:'Find new cars within your price range',
    searchFilters:'Search Filters',minBudget:'Min Budget (SAR)',maxBudget:'Max Budget (SAR)',
    carType:'Car Type',allTypes:'All Types',searchCars:'🔍 Search Cars',
    found:'Found',carsIn:'car(s) in your budget',noResults:'No cars found. Try adjusting filters.',
    marketplace:'MARKETPLACE',marketplaceSub:'Buy and sell cars in Saudi Arabia',
    listYourCar:'Car Details',sellMake:'Make *',sellModel:'Model *',
    sellYear:'Year *',sellMileage:'Mileage (km)',askingPrice:'Asking Price (SAR) *',
    phoneWa:'Phone / WhatsApp *',notes:'Notes',
    photosUpTo5:'Photos (up to 5)',clickUpload:'Click to upload',uploadSub:'JPG, PNG up to 5MB',
    publishListing:'🚀 Publish Listing',activeListings:'Active Listings',listings:'listing(s)',
    noListings:'No listings yet.',whatsappBtn:'💬 WhatsApp',selectMake:'Select Make',
    selectModel:'Select Model',allTrims:'All Trims',currency:'SAR',
    retentionLabel:'Value Retention',agencyPriceLbl:'Agency Price',
    fillRequired:'Please fill in all required fields.',yearInvalid:'Year must be between 1980 and',
    selectMakeModel:'Please select Make and Model.',
    passRule1:'At least 8 characters',passRule2:'One uppercase letter',
    passRule3:'One number',passRule4:'One special character',
    showDetails:'View Details',editListing:'Edit',deleteListing:'Delete',
    chatBtn:'💬 Public Comments',privateChatBtn:'🔒 Private Message',
    confirmDelete:'Delete this listing?',myListing:'Your Listing',
    myProfile:'My Profile',myListings:'My Listings',myNotifs:'Notifications',
    photoCount:'photos',unreadNotif:'New notification',
  }
};
function t(k){ return T[LANG][k]||T.ar[k]||k; }
function currency(){ return t('currency'); }

function applyTranslations(){
  document.querySelectorAll('[data-t]').forEach(el=>{
    const k=el.getAttribute('data-t'),v=t(k);
    if(el.tagName==='INPUT') el.placeholder=v; else el.textContent=v;
  });
  const ar=LANG==='ar';
  document.documentElement.lang=LANG;
  document.documentElement.dir=ar?'rtl':'ltr';
  document.body.classList.toggle('rtl',ar);
  document.querySelectorAll('[id^="lang-btn"]').forEach(b=>b.textContent=ar?'EN':'ع');
  document.querySelectorAll('.back-btn').forEach(b=>b.textContent=ar?'→':'←');
  document.querySelectorAll('.card-arrow').forEach(a=>a.textContent=ar?'←':'→');
}
window.toggleLang=()=>{ LANG=LANG==='ar'?'en':'ar'; localStorage.setItem('th_lang',LANG); applyTranslations(); populateEstimatorMakes(); populateTypeFilter(); populateSellMakes(); populateSellCities(); };

// ── Theme ─────────────────────────────────────────────────────
let DARK = localStorage.getItem('th_dark')==='true';
function applyTheme(){
  document.body.classList.toggle('light-mode',!DARK);
  const ic=DARK?'☀️':'🌙';
  document.querySelectorAll('[id^="theme-btn"]').forEach(b=>b.textContent=ic);
}
window.toggleTheme=()=>{ DARK=!DARK; localStorage.setItem('th_dark',DARK); applyTheme(); };

// ── Boot ─────────────────────────────────────────────────────
(async function init(){
  applyTheme(); applyTranslations();
  await Promise.all([loadCarData(), loadMakeModels()]);
  populateEstimatorMakes();
  populateTypeFilter();
  populateSellMakes();
  populateSellCities();
  document.querySelectorAll('.auth-tab').forEach(tab=>
    tab.addEventListener('click',()=>switchAuthTab(tab.dataset.tab)));
  document.getElementById('reg-password')?.addEventListener('input', window.onPasswordInput);
  onAuthStateChanged(auth, user=>{ currentUser=user; user?showApp(user):showLanding(); });
})();

// ── Routing ───────────────────────────────────────────────────
function showLanding(){ setPage('landing-page'); }
function showAuth(tab){ setPage('auth-page'); switchAuthTab(tab||'login'); }
async function showApp(user){
  setPage('app-page');
  await loadProfile(user.email);
  updateTopbarUser();
  // Show admin tab only for owner
  const adminTab = document.getElementById('admin-nav-tab');
  if(adminTab) adminTab.style.display = user.email===ADMIN_EMAIL ? 'block' : 'none';
  goToSection('dashboard');
  fetchNotifCount();
}
function setPage(id){ document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); document.getElementById(id).classList.add('active'); }

window.goToSection = function(name){
  document.querySelectorAll('.app-section').forEach(s=>s.classList.remove('active'));
  document.getElementById(`section-${name}`)?.classList.add('active');
  // Update topnav active tab
  document.querySelectorAll('.topnav-tab').forEach(t=>t.classList.toggle('active',t.dataset.section===name));
  // Stop polling when leaving chat
  if(name!=='chat' && chatTimer){ clearInterval(chatTimer); chatTimer=null; }
  if(name!=='private-chat' && pchatTimer){ clearInterval(pchatTimer); pchatTimer=null; }
  if(name==='listings') fetchAndRenderListings();
  if(name==='my-listings') fetchMyListings();
  if(name==='notifications') loadNotifications();
  if(name==='profile') loadProfileForm();
  if(name==='dashboard') loadDashboard();
  if(name==='inbox') loadInbox();
  if(name==='admin'){ if(currentUser?.email!==ADMIN_EMAIL){goToSection('dashboard');return;} loadAdminDashboard(); }
};
window.goToDashboard=()=>goToSection('dashboard');
window.goToLanding=showLanding;
window.goToAuthLogin=()=>showAuth('login');
window.goToAuthRegister=()=>showAuth('register');

// ── Profile Dropdown ──────────────────────────────────────────
window.toggleProfileMenu=()=>{ document.getElementById('profile-dropdown').classList.toggle('open'); };
window.closeProfileMenu=()=>{ document.getElementById('profile-dropdown').classList.remove('open'); };
document.addEventListener('click', e=>{ if(!e.target.closest('.profile-menu-wrap')) closeProfileMenu(); });

// ── Auth Tabs ─────────────────────────────────────────────────
function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
  document.getElementById(`form-${tab}`)?.classList.add('active');
}

// ── Password Validation ───────────────────────────────────────
function validatePw(pw){
  return [{key:'passRule1',ok:pw.length>=8},{key:'passRule2',ok:/[A-Z]/.test(pw)},
          {key:'passRule3',ok:/[0-9]/.test(pw)},{key:'passRule4',ok:/[^A-Za-z0-9]/.test(pw)}];
}
window.onPasswordInput=()=>{
  const pw=document.getElementById('reg-password')?.value||'';
  validatePw(pw).forEach(r=>document.getElementById(`rule-${r.key}`)?.classList.toggle('valid',r.ok));
};

// ── Register ─────────────────────────────────────────────────
window.doRegister=async()=>{
  clearAlert('register');
  const fn=val('reg-firstname'),ln=val('reg-lastname'),un=val('reg-username'),
        em=val('reg-email'),pw=val('reg-password'),cf=val('reg-confirm');
  if(!fn||!ln||!un||!em||!pw||!cf) return showAlert('register','error',t('fillRequired'));
  if(!/^[a-zA-Z0-9_.]{3,20}$/.test(un)) return showAlert('register','error','❌ اسم المستخدم يجب أن يكون 3-20 حرف (أرقام وحروف إنجليزية فقط)');
  const bad=validatePw(pw).filter(r=>!r.ok);
  if(bad.length) return showAlert('register','error','❌ '+t(bad[0].key));
  if(pw!==cf) return showAlert('register','error','❌ كلمتا المرور غير متطابقتين');
  setBtnLoading('btn-register',true);
  try{
    const c=await createUserWithEmailAndPassword(auth,em,pw);
    await updateProfile(c.user,{displayName:`${fn} ${ln}`});
    // Create profile in Supabase
    await db.upsertProfile({email:em,username:un,avatar:''});
    showAlert('register','success','✅ تم إنشاء الحساب!');
  }catch(e){ showAlert('register','error',fbErr(e.code)); }
  setBtnLoading('btn-register',false);
};

// ── Login ─────────────────────────────────────────────────────
window.doLogin=async()=>{
  clearAlert('login');
  const em=val('login-email'),pw=val('login-password');
  if(!em||!pw) return showAlert('login','error',t('fillRequired'));
  setBtnLoading('btn-login',true);
  try{ await signInWithEmailAndPassword(auth,em,pw); }
  catch(e){ showAlert('login','error',fbErr(e.code)); }
  setBtnLoading('btn-login',false);
};
window.doLogout=function(){
  // Show confirm dialog
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon">👋</div>
      <div class="confirm-title">تسجيل الخروج</div>
      <div class="confirm-msg">هل أنت متأكد أنك تريد تسجيل الخروج؟</div>
      <div class="confirm-btns">
        <button class="btn-blue" onclick="signOut(window._fbAuth);this.closest('.confirm-overlay').remove()">نعم، خروج</button>
        <button class="btn-ghost" onclick="this.closest('.confirm-overlay').remove()">إلغاء</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
};
window._fbAuth = auth;

function fbErr(c){
  const m={'auth/user-not-found':'❌ لا يوجد حساب بهذا البريد.','auth/wrong-password':'❌ كلمة المرور غير صحيحة.',
    'auth/email-already-in-use':'❌ البريد مستخدم بالفعل.','auth/invalid-email':'❌ بريد إلكتروني غير صالح.',
    'auth/weak-password':'❌ كلمة المرور ضعيفة.','auth/too-many-requests':'⚠️ محاولات كثيرة. حاول لاحقاً.',
    'auth/invalid-credential':'❌ البريد أو كلمة المرور غير صحيحة.'};
  return m[c]||'❌ حدث خطأ ما.';
}

// ── Profile ───────────────────────────────────────────────────
async function loadProfile(email){
  try{
    const rows = await db.getProfile(email);
    currentProfile = rows && rows.length ? rows[0] : { email, username:'', avatar:'' };
  }catch(e){ currentProfile = { email, username:'', avatar:'' }; }
}

function updateTopbarUser(){
  if(!currentUser) return;
  const name = currentUser.displayName || currentUser.email.split('@')[0];
  const initials = name.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('');
  // Topbar avatar button
  const img = document.getElementById('topbar-avatar-img');
  const ini = document.getElementById('topbar-avatar-initials');
  if(currentProfile?.avatar){ img.src=currentProfile.avatar; img.style.display='block'; ini.style.display='none'; }
  else { img.style.display='none'; ini.style.display='block'; ini.textContent=initials; }
  // Dropdown
  const ddImg=document.getElementById('dd-avatar-img'), ddIni=document.getElementById('dd-avatar-initials');
  if(currentProfile?.avatar){ ddImg.src=currentProfile.avatar; ddImg.style.display='block'; ddIni.style.display='none'; }
  else{ ddImg.style.display='none'; ddIni.style.display='block'; ddIni.textContent=initials; }
  document.getElementById('dd-name').textContent = name;
  document.getElementById('dd-username').textContent = currentProfile?.username ? '@'+currentProfile.username : currentUser.email;
}

function loadProfileForm(){
  if(!currentUser) return;
  const name = (currentUser.displayName||'').split(' ');
  document.getElementById('profile-firstname').value = name[0]||'';
  document.getElementById('profile-lastname').value  = name.slice(1).join(' ')||'';
  const unEl = document.getElementById('profile-username');
  unEl.value = currentProfile?.username||'';
  // Lock username if already set
  if(currentProfile?.username){
    unEl.disabled = true;
    unEl.style.opacity = '0.6';
    unEl.style.cursor = 'not-allowed';
    const hint = document.getElementById('username-lock-hint');
    if(hint) hint.style.display = 'block';
  } else {
    unEl.disabled = false;
    unEl.style.opacity = '';
    unEl.style.cursor = '';
    const hint = document.getElementById('username-lock-hint');
    if(hint) hint.style.display = 'none';
  }
  document.getElementById('profile-email').value     = currentUser.email||'';
  // Avatar
  const img=document.getElementById('profile-avatar-img'),ini=document.getElementById('profile-avatar-initials');
  const initials=(currentUser.displayName||currentUser.email).split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('');
  if(currentProfile?.avatar){ img.src=currentProfile.avatar; img.style.display='block'; ini.style.display='none'; }
  else{ img.style.display='none'; ini.style.display='block'; ini.textContent=initials; }
  // Set avatar background
  document.getElementById('profile-avatar-large').style.background = 'linear-gradient(135deg, var(--blue), var(--blue-mid))';
}

window.handleAvatarUpload=function(input){
  const file=input.files[0]; if(!file) return;
  if(file.size>2*1024*1024){ toast('⚠️ الصورة أكبر من 2MB','error'); return; }
  const reader=new FileReader();
  reader.onload=async e=>{
    const b64=e.target.result;
    const img=document.getElementById('profile-avatar-img'),ini=document.getElementById('profile-avatar-initials');
    img.src=b64; img.style.display='block'; ini.style.display='none';
    if(!currentProfile) currentProfile={};
    currentProfile.avatar=b64;
    toast('✅ تم تحديث الصورة. اضغط "حفظ التغييرات" لحفظها.');
  };
  reader.readAsDataURL(file);
};

window.saveProfile=async function(){
  const fn=val('profile-firstname'),ln=val('profile-lastname'),un=val('profile-username');
  if(!fn||!un) return toast(t('fillRequired'),'error');
  if(!/^[a-zA-Z0-9_.]{3,20}$/.test(un)) return toast('❌ اسم المستخدم يجب 3-20 حرف إنجليزي','error');
  try{
    await updateProfile(currentUser,{displayName:`${fn} ${ln}`.trim()});
    await db.upsertProfile({email:currentUser.email, username:un, avatar:currentProfile?.avatar||''});
    currentProfile = {...(currentProfile||{}), username:un, avatar:currentProfile?.avatar||''};
    updateTopbarUser();
    toast('✅ تم حفظ الملف الشخصي.');
  }catch(e){ toast('❌ فشل الحفظ: '+e.message,'error'); }
};

// ── Notifications ─────────────────────────────────────────────
async function fetchNotifCount(){
  if(!currentUser) return;
  try{
    const notifs=await db.getNotifs(currentUser.email);
    const unread=notifs.filter(n=>!n.is_read).length;
    const badge=document.getElementById('notif-count');
    if(unread>0){ badge.textContent=unread>9?'9+':unread; badge.style.display='flex'; }
    else{ badge.style.display='none'; }
  }catch(e){}
}

async function loadNotifications(){
  if(!currentUser) return;
  const list=document.getElementById('notif-list');
  list.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-muted)">جاري التحميل…</div>';
  try{
    const notifs=await db.getNotifs(currentUser.email);
    if(!notifs.length){ list.innerHTML='<div class="empty-listings"><div class="empty-icon">🔔</div><p>لا توجد إشعارات.</p></div>'; return; }
    list.innerHTML=notifs.map(n=>`
      <div class="notif-item ${n.is_read?'':'unread'}" onclick="handleNotifClick('${n.id}','${n.car_id||''}')">
        <div class="notif-icon">${n.type==='comment'?'💬':n.type==='private'?'🔒':'🔔'}</div>
        <div class="notif-body">
          <div class="notif-msg">${escHtml(n.message)}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
        ${!n.is_read?'<div class="notif-dot"></div>':''}
      </div>`).join('');
  }catch(e){ list.innerHTML='<div class="empty-listings"><p>خطأ في التحميل</p></div>'; }
}

window.handleNotifClick=async function(id,carId){
  try{ await db.markNotifRead(id); } catch(e){}
  if(carId && carId!=='null' && carId!=='undefined'){
    const listing=allListings.find(l=>String(l.id)===String(carId));
    if(listing) openDetail(String(carId));
    else{ await fetchAndRenderListings(); setTimeout(()=>openDetail(String(carId)),500); }
  }
  fetchNotifCount();
};

window.markAllRead=async function(){
  if(!currentUser) return;
  try{ await db.markAllNotifsRead(currentUser.email); loadNotifications(); fetchNotifCount(); toast('✅ تم تعليم الكل كمقروء'); }
  catch(e){}
};

// ── Sell form: Make/Model dropdowns ──────────────────────────
function populateSellMakes(){
  const el=document.getElementById('sell-make'); if(!el) return;
  el.innerHTML=`<option value="">${t('selectMake')}</option>`;
  Object.keys(MAKE_MODELS).sort().forEach(m=>el.innerHTML+=`<option value="${m}">${m}</option>`);
}
window.onSellMakeChange=function(){
  const make=val('sell-make'), modelEl=document.getElementById('sell-model');
  modelEl.innerHTML=`<option value="">${t('selectModel')}</option>`;
  modelEl.disabled=!make;
  if(!make) return;
  (MAKE_MODELS[make]||[]).forEach(m=>modelEl.innerHTML+=`<option value="${m}">${m}</option>`);
  modelEl.disabled=false;
};

function populateSellCities(){
  const el=document.getElementById('sell-city'); if(!el) return;
  el.innerHTML='<option value="">اختر المدينة</option>';
  CITIES.forEach(c=>el.innerHTML+=`<option value="${c}">${c}</option>`);
}

// ── Estimator dropdowns ───────────────────────────────────────
function populateEstimatorMakes(){
  const el=document.getElementById('est-make'); if(!el) return;
  el.innerHTML=`<option value="">${t('selectMake')}</option>`;
  getMakes().forEach(m=>el.innerHTML+=`<option value="${m}">${m}</option>`);
}
window.onMakeChange=function(){
  const make=val('est-make'),modelEl=document.getElementById('est-model'),trimEl=document.getElementById('est-trim');
  modelEl.innerHTML=`<option value="">${t('selectModel')}</option>`;
  trimEl.innerHTML=`<option value="">${t('allTrims')}</option>`;
  modelEl.disabled=!make; trimEl.disabled=true;
  if(!make) return;
  getModels(make).forEach(m=>modelEl.innerHTML+=`<option value="${m}">${m}</option>`);
  modelEl.disabled=false;
};
window.onModelChange=function(){
  const make=val('est-make'),model=val('est-model'),trimEl=document.getElementById('est-trim');
  trimEl.innerHTML=`<option value="">${t('allTrims')}</option>`;
  if(!make||!model) return;
  getTrims(make,model).forEach(tr=>trimEl.innerHTML+=`<option value="${tr}">${tr}</option>`);
  trimEl.disabled=false;
};
function populateTypeFilter(){
  const el=document.getElementById('budget-type'); if(!el) return;
  el.innerHTML=`<option value="">${t('allTypes')}</option>`;
  getTypes().forEach(tp=>el.innerHTML+=`<option value="${tp}">${tp}</option>`);
}

// ── Estimation ────────────────────────────────────────────────
window.runEstimation=function(){
  const make=val('est-make'),model=val('est-model'),trim=val('est-trim'),
        year=val('est-year')||String(new Date().getFullYear()),
        mileage=val('est-mileage')||'0',
        accident=document.querySelector('input[name="accident"]:checked')?.value||'none';
  document.getElementById('est-not-found').classList.remove('show');
  document.getElementById('est-result').classList.remove('show');
  if(!make||!model){ toast(t('selectMakeModel'),'error'); return; }
  const yr=parseInt(year),cy=new Date().getFullYear();
  if(yr<1980||yr>cy){ toast(`${t('yearInvalid')} ${cy}`,'error'); return; }
  const result=estimatePrice({make,model,trim,year,mileage,accident});
  if(!result){ document.getElementById('est-not-found').classList.add('show'); return; }
  const curr=currency();
  document.getElementById('res-price').textContent=formatPrice(result.estimatedPrice);
  document.getElementById('res-currency').textContent=curr;
  document.getElementById('res-agency').textContent=`${formatPrice(result.agencyPrice)} ${curr}`;
  document.getElementById('res-low').textContent=`${formatPrice(result.rangeLow)} ${curr}`;
  document.getElementById('res-high').textContent=`${formatPrice(result.rangeHigh)} ${curr}`;
  document.getElementById('res-car-name').textContent=`${result.car.Make} ${result.car.Model} ${result.car.Trim||''}`;
  document.getElementById('res-retention').textContent=`${result.retentionPct}%`;
  const fe=document.getElementById('res-factors'); fe.innerHTML='';
  Object.values(result.factors).forEach(f=>{
    fe.innerHTML+=`<div class="factor-chip"><div class="factor-label">${f.label}</div><div class="factor-value">${f.value.split(' (')[0].split(' (-')[0]}</div><div class="factor-impact ${f.impact}">${f.value.match(/\(.*?\)/)?.[0]||''}</div></div>`;
  });
  document.getElementById('est-result').classList.add('show');
  document.getElementById('est-result').scrollIntoView({behavior:'smooth',block:'nearest'});
};

// ── Budget Search ─────────────────────────────────────────────
window.runBudgetSearch=function(){
  const minP=parseInt(val('budget-min').replace(/,/g,''))||0,
        maxP=parseInt(val('budget-max').replace(/,/g,''))||9999999,
        type=val('budget-type'),curr=currency();
  const results=findByBudget(minP,maxP,type);
  const grid=document.getElementById('budget-grid');
  grid.innerHTML=results.length===0
    ?`<div class="empty-listings" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>${t('noResults')}</p></div>`
    :results.map(car=>`<div class="car-card">
        <div class="car-card-make">${car.Make}</div><div class="car-card-model">${car.Model}</div>
        <div class="car-card-year">${car.Year}</div><div class="car-card-trim">${car.Trim}</div>
        <div class="car-card-price">${formatPrice(car.Agency_Price)}</div>
        <div class="car-card-price-unit">${curr} · ${LANG==='ar'?'سعر الوكالة':'Agency Price'}</div>
        <div class="car-card-type">${car.Type}</div></div>`).join('');
  document.getElementById('budget-count').innerHTML=`${t('found')} <strong>${results.length}</strong> ${t('carsIn')}`;
  document.getElementById('budget-results').classList.add('show');
};

// ── Image Upload ──────────────────────────────────────────────
window.handleImageUpload=function(input){
  const files=Array.from(input.files).slice(0,5);
  const preview=document.getElementById('img-preview');
  preview.innerHTML=''; uploadedImages=[];
  files.forEach(file=>{
    if(file.size>5*1024*1024){ toast('⚠️ الصورة أكبر من 5MB','error'); return; }
    const reader=new FileReader();
    reader.onload=e=>{
      uploadedImages.push(e.target.result);
      const img=document.createElement('img');
      img.src=e.target.result; img.className='img-thumb'; img.title='انقر للحذف';
      img.onclick=()=>{ uploadedImages=uploadedImages.filter(u=>u!==e.target.result); img.remove(); };
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
};

// ── Submit Listing ────────────────────────────────────────────
window.submitListing=async function(){
  const make=val('sell-make'),model=val('sell-model'),yearStr=val('sell-year'),
        mileage=val('sell-mileage'),price=val('sell-price'),
        phone=val('sell-phone'),notes=val('sell-notes'),city=val('sell-city');
  if(!make||!model||!yearStr||!price||!phone) return toast(t('fillRequired'),'error');
  const yr=parseInt(yearStr),cy=new Date().getFullYear();
  if(isNaN(yr)||yr<1980||yr>cy){ document.getElementById('sell-year').classList.add('input-error'); return toast(`${t('yearInvalid')} ${cy}`,'error'); }
  document.getElementById('sell-year').classList.remove('input-error');
  const btn=document.getElementById('btn-publish');
  if(btn){ btn.disabled=true; btn.textContent='⏳…'; }
  try{
    await db.insertCar({make,model,year:yr,mileage:parseInt(mileage)||0,price:parseFloat(price),
      phone,notes:notes||'',city:city||'',images:uploadedImages.slice(),
      owner_email:currentUser?.email||'',
      owner_username:currentProfile?.username||'',
      owner_avatar:currentProfile?.avatar||''});
    toast('✅ '+(LANG==='ar'?'تم نشر الإعلان بنجاح!':'Listing published!'));
    clearSellForm();
    goToSection('listings');
  }catch(e){
    console.error(e);
    toast('❌ فشل النشر: '+e.message,'error');
  }
  if(btn){ btn.disabled=false; btn.innerHTML=`<span>${t('publishListing')}</span>`; }
};

function clearSellForm(){
  ['sell-make','sell-model','sell-year','sell-mileage','sell-price','sell-phone','sell-notes','sell-city']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const sel=document.getElementById('sell-model'); if(sel){sel.innerHTML=`<option value="">${t('selectModel')}</option>`;sel.disabled=true;}
  document.getElementById('img-preview').innerHTML=''; uploadedImages=[];
}

// ── Fetch Listings ────────────────────────────────────────────
async function fetchAndRenderListings(){
  const grid=document.getElementById('listings-grid'); if(!grid) return;
  grid.innerHTML='<div class="listing-skeleton"></div><div class="listing-skeleton"></div><div class="listing-skeleton"></div>';
  try{ allListings=await db.getCars(); renderListings(allListings,'listings-grid'); }
  catch(e){ grid.innerHTML='<div class="empty-listings"><p>خطأ في التحميل</p></div>'; }
}

async function fetchMyListings(){
  if(!currentUser) return;
  const grid=document.getElementById('my-listings-grid'); if(!grid) return;
  grid.innerHTML='<div class="listing-skeleton"></div><div class="listing-skeleton"></div>';
  try{
    const mine=await db.getMyCars(currentUser.email);
    renderListings(mine,'my-listings-grid',true);
  }catch(e){ grid.innerHTML='<div class="empty-listings"><p>خطأ في التحميل</p></div>'; }
}

function renderListings(listings, gridId='listings-grid', forceOwner=false){
  const grid=document.getElementById(gridId); if(!grid) return;
  const countEl=document.getElementById('listings-count');
  if(countEl && gridId==='listings-grid') countEl.textContent=`${listings.length} ${t('listings')}`;
  if(!listings.length){ grid.innerHTML=`<div class="empty-listings"><div class="empty-icon">🚗</div><p>${t('noListings')}</p></div>`; return; }
  const curr=currency(), myEmail=currentUser?.email||'';
  grid.innerHTML=listings.map(l=>{
    const imgs=Array.isArray(l.images)?l.images:[];
    const isOwner=forceOwner||(l.owner_email&&l.owner_email===myEmail);
    const ownerDisplay=l.owner_username?'@'+l.owner_username:(l.owner_email||'').split('@')[0];
    return `<div class="listing-card" id="card-${l.id}">
      <div class="listing-img-wrap" onclick="openDetail('${l.id}')">
        ${imgs.length?`<img src="${imgs[0]}" alt="${l.make} ${l.model}" loading="lazy">`:'<div class="listing-img-placeholder">🚗</div>'}
        ${imgs.length>1?`<div class="img-count-badge">+${imgs.length-1} ${t('photoCount')}</div>`:''}
        ${isOwner?`<div class="owner-badge">${t('myListing')}</div>`:''}
      </div>
      <div class="listing-body">
        <div class="listing-price">${formatPrice(l.price)} <span class="listing-curr">${curr}</span></div>
        <div class="listing-name">${l.make} ${l.model} ${l.year}</div>
        <div class="listing-meta">
          ${l.mileage?`<span class="meta-chip">🛣️ ${parseInt(l.mileage).toLocaleString()} km</span>`:''}
          ${l.city?`<span class="meta-chip">📍 ${l.city}</span>`:''}
          <div class="listing-owner"><span class="owner-avatar-sm">${l.owner_avatar?`<img src="${l.owner_avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:(l.owner_username||'?')[0]?.toUpperCase()}</span>${ownerDisplay}</div>
        </div>
        <div class="listing-actions">
          <button class="btn-detail" onclick="openDetail('${l.id}')">🔍 ${t('showDetails')}</button>
          ${isOwner?`<button class="btn-edit-sm" onclick="openEditModal('${l.id}')">✏️</button><button class="btn-delete-sm" onclick="deleteListing('${l.id}')">🗑️</button>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Detail Page ───────────────────────────────────────────────
window.openDetail=function(id){
  const l=allListings.find(x=>String(x.id)===String(id));
  if(!l){ fetchAndRenderListings().then(()=>{ const l2=allListings.find(x=>String(x.id)===String(id)); if(l2) openDetail(id); }); return; }
  currentCarId=l.id; currentCarOwner=l.owner_email||'';
  const curr=currency(), imgs=Array.isArray(l.images)?l.images:[];
  const myEmail=currentUser?.email||'', isOwner=l.owner_email===myEmail;
  const phone=(l.phone||'').replace(/^0/,'');
  const waText=encodeURIComponent(LANG==='ar'?`بخصوص إعلانك على منصة ثمنها لسيارة ${l.make} ${l.model} ${l.year}، أرغب في الاستفسار.`:`Regarding your listing on Thmmenha for the ${l.make} ${l.model} ${l.year}, I'd like to inquire.`);
  document.getElementById('detail-title').textContent=`${l.make} ${l.model} ${l.year}`;
  document.getElementById('detail-content').innerHTML=`
    <div class="detail-gallery">
      ${imgs.length?`<div class="detail-main-img" onclick="openGallery('${l.id}',${JSON.stringify(imgs).replace(/"/g,"'")})">
        <img src="${imgs[0]}" id="gmain-${l.id}" alt="main">
        ${imgs.length>1?`<div class="gallery-thumb-strip">${imgs.slice(0,5).map((img,i)=>`<img src="${img}" onclick="event.stopPropagation();document.getElementById('gmain-${l.id}').src='${img}'" class="${i===0?'active':''}">`).join('')}</div>`:''}
      </div>`:'<div class="detail-no-img">🚗</div>'}
    </div>
    <div class="detail-info-grid">
      <div class="detail-info-card">
        <div class="detail-price">${formatPrice(l.price)} <span>${curr}</span></div>
        <div class="detail-car-name">${l.make} ${l.model} ${l.year}</div>
        ${l.city?`<div class="detail-chip">📍 ${l.city}</div>`:''}
        ${l.mileage?`<div class="detail-chip">🛣️ ${parseInt(l.mileage).toLocaleString()} km</div>`:''}
        ${l.notes?`<div class="detail-notes">${escHtml(l.notes)}</div>`:''}
        <div class="detail-seller">
          <div class="detail-seller-avatar">${l.owner_avatar?`<img src="${l.owner_avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:(l.owner_username||'?')[0]?.toUpperCase()}</div>
          <span>${l.owner_username?'@'+l.owner_username:(l.owner_email||'').split('@')[0]}</span>
        </div>
      </div>
      <div class="detail-actions-card">
        ${!isOwner?`
          <a class="btn-whatsapp-lg" href="https://wa.me/966${phone}?text=${waText}" target="_blank" rel="noopener">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.12 1.533 5.848L0 24l6.335-1.508A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.876 0-3.63-.49-5.15-1.348l-.37-.22-3.76.896.954-3.664-.243-.384A9.945 9.945 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            ${t('whatsappBtn')}
          </a>
          <a class="btn-call-lg" href="tel:${l.phone}">📞 ${l.phone}</a>
          <button class="btn-chat-lg" onclick="openPublicChat('${l.id}','${escAttr(l.make+' '+l.model)}')">💬 ${t('chatBtn')}</button>
          <button class="btn-private-lg" onclick="openPrivateChat('${l.id}','${escAttr(l.make+' '+l.model)}','${l.owner_email||''}')">🔒 ${t('privateChatBtn')}</button>
        `:`<div class="owner-actions">
          <button class="btn-edit-lg" onclick="openEditModal('${l.id}')">✏️ ${t('editListing')}</button>
          <button class="btn-delete-lg" onclick="deleteListing('${l.id}')">🗑️ ${t('deleteListing')}</button>
          <button class="btn-chat-lg" onclick="openPublicChat('${l.id}','${escAttr(l.make+' '+l.model)}')">💬 ${t('chatBtn')}</button>
        </div>`}
      </div>
    </div>`;
  goToSection('detail');
};

// ── Delete ────────────────────────────────────────────────────
window.deleteListing=async function(id){
  if(!confirm(t('confirmDelete'))) return;
  try{
    await db.deleteCar(id);
    allListings=allListings.filter(l=>String(l.id)!==String(id));
    toast('✅ '+(LANG==='ar'?'تم حذف الإعلان.':'Deleted.'));
    const onDetail=document.getElementById('section-detail').classList.contains('active');
    if(onDetail) goToSection('listings'); else renderListings(allListings);
  }catch(e){ toast('❌ فشل الحذف.','error'); }
};

// ── Edit ──────────────────────────────────────────────────────
window.openEditModal=function(id){
  const l=allListings.find(x=>String(x.id)===String(id)); if(!l) return;
  window._editId=id;
  document.getElementById('edit-make').value=l.make||'';
  document.getElementById('edit-model').value=l.model||'';
  document.getElementById('edit-year').value=l.year||'';
  document.getElementById('edit-mileage').value=l.mileage||'';
  document.getElementById('edit-price').value=l.price||'';
  document.getElementById('edit-phone').value=l.phone||'';
  document.getElementById('edit-notes').value=l.notes||'';
  document.getElementById('edit-modal').style.display='flex';
};
window.saveEdit=async function(id){
  const make=val('edit-make'),model=val('edit-model'),yearStr=val('edit-year'),
        mileage=val('edit-mileage'),price=val('edit-price'),phone=val('edit-phone'),notes=val('edit-notes');
  if(!make||!model||!yearStr||!price||!phone) return toast(t('fillRequired'),'error');
  const yr=parseInt(yearStr),cy=new Date().getFullYear();
  if(isNaN(yr)||yr<1980||yr>cy) return toast(`${t('yearInvalid')} ${cy}`,'error');
  try{
    await db.updateCar(id,{make,model,year:yr,mileage:parseInt(mileage)||0,price:parseFloat(price),phone,notes:notes||''});
    const idx=allListings.findIndex(x=>String(x.id)===String(id));
    if(idx>-1) allListings[idx]={...allListings[idx],make,model,year:yr,mileage:parseInt(mileage)||0,price:parseFloat(price),phone,notes:notes||''};
    document.getElementById('edit-modal').style.display='none';
    toast('✅ '+(LANG==='ar'?'تم التحديث.':'Updated.'));
    renderListings(allListings);
  }catch(e){ toast('❌ فشل التحديث.','error'); }
};

// ── Public Chat (Comments) ────────────────────────────────────
window.openPublicChat=function(carId,carName){
  currentCarId=carId;
  document.getElementById('chat-title').textContent='💬 تعليقات — '+carName;
  document.getElementById('chat-back-btn').onclick=()=>openDetail(carId);
  goToSection('chat');
  loadPublicMessages(carId);
  if(chatTimer) clearInterval(chatTimer);
  chatTimer=setInterval(()=>loadPublicMessages(carId),5000);
};

async function loadPublicMessages(carId){
  try{
    const msgs=await db.getPublicMsgs(carId);
    const box=document.getElementById('chat-messages'); if(!box) return;
    const myEmail=currentUser?.email||'';
    box.innerHTML=msgs.length===0
      ?`<div class="chat-empty">لا توجد تعليقات بعد. كن أول من يعلّق!</div>`
      :msgs.map(m=>{
          const isMine=m.sender_email===myEmail;
          const uname=m.sender_username?'@'+m.sender_username:m.sender_email?.split('@')[0]||'?';
          const avLetter=(m.sender_username||m.sender_email||'?')[0]?.toUpperCase();
          const msgTime=new Date(m.created_at).toLocaleTimeString(LANG==='ar'?'ar-SA':'en-US',{hour:'2-digit',minute:'2-digit'});
          const msgDate=new Date(m.created_at).toLocaleDateString(LANG==='ar'?'ar-SA':'en-US',{month:'short',day:'numeric'});
          return `<div class="chat-msg ${isMine?'mine':'theirs'}">
            ${!isMine?`<div class="chat-av">${avLetter}</div>`:''}
            <div>
              ${!isMine?`<div class="chat-uname">${uname}</div>`:''}
              <div class="chat-bubble">${escHtml(m.message)}</div>
              <div class="chat-meta">${isMine?(LANG==='ar'?'أنت':'You'):uname} · ${msgTime} · ${msgDate}</div>
            </div>
          </div>`;
        }).join('');
    box.scrollTop=box.scrollHeight;
  }catch(e){}
}

window.sendPublicMessage=async function(){
  const input=document.getElementById('chat-input');
  const text=(input?.value||'').trim();
  if(!text||!currentCarId||!currentUser) return;
  input.value='';
  try{
    await db.insertPublicMsg({car_id:currentCarId, sender_email:currentUser.email,
      sender_username:currentProfile?.username||'', message:text});
    // Notify car owner (if not self)
    if(currentCarOwner && currentCarOwner!==currentUser.email){
      const uname=currentProfile?.username?'@'+currentProfile.username:currentUser.email.split('@')[0];
      await db.insertNotif({user_email:currentCarOwner,type:'comment',car_id:currentCarId,
        message:`${uname} علّق على إعلانك: "${text.slice(0,50)}${text.length>50?'…':''}"`});
    }
    await loadPublicMessages(currentCarId);
  }catch(e){ toast('❌ فشل الإرسال.','error'); }
};

// ── Private Chat ──────────────────────────────────────────────
window.openPrivateChat=function(carId,carName,ownerEmail){
  if(!ownerEmail||ownerEmail===currentUser?.email){ toast('لا يمكنك إرسال رسالة خاصة لنفسك.','error'); return; }
  currentCarId=carId; currentCarOwner=ownerEmail;
  document.getElementById('pchat-title').textContent='🔒 محادثة خاصة — '+carName;
  document.getElementById('pchat-subtitle').textContent=LANG==='ar'?'محادثة خاصة مع المعلن':'Private chat with seller';
  document.getElementById('pchat-back-btn').onclick=()=>openDetail(carId);
  goToSection('private-chat');
  loadPrivateMessages(carId, currentUser.email, ownerEmail);
  if(pchatTimer) clearInterval(pchatTimer);
  pchatTimer=setInterval(()=>loadPrivateMessages(carId,currentUser.email,ownerEmail),5000);
};

async function loadPrivateMessages(carId, me, other){
  try{
    const msgs=await db.getPrivateMsgs(carId,me,other);
    const box=document.getElementById('pchat-messages'); if(!box) return;
    box.innerHTML=msgs.length===0
      ?`<div class="chat-empty">لا توجد رسائل بعد. ابدأ المحادثة!</div>`
      :msgs.map(m=>{
          const isMine=m.sender_email===me;
          return `<div class="chat-msg ${isMine?'mine':'theirs'}">
            <div class="chat-bubble">${escHtml(m.message)}</div>
            <div class="chat-meta">${isMine?'أنت':m.sender_email?.split('@')[0]} · ${timeAgo(m.created_at)}</div>
          </div>`;
        }).join('');
    box.scrollTop=box.scrollHeight;
  }catch(e){}
}

window.sendPrivateMessage=async function(){
  const input=document.getElementById('pchat-input');
  const text=(input?.value||'').trim();
  if(!text||!currentCarId||!currentUser||!currentCarOwner) return;
  input.value='';
  try{
    await db.insertPrivateMsg({car_id:currentCarId, sender_email:currentUser.email,
      receiver_email:currentCarOwner, message:text});
    // Notify receiver
    const uname=currentProfile?.username?'@'+currentProfile.username:currentUser.email.split('@')[0];
    await db.insertNotif({user_email:currentCarOwner,type:'private',car_id:currentCarId,
      message:`${uname} أرسل لك رسالة خاصة: "${text.slice(0,50)}${text.length>50?'…':''}"`});
    await loadPrivateMessages(currentCarId,currentUser.email,currentCarOwner);
  }catch(e){ toast('❌ فشل الإرسال.','error'); }
};


// ================================================================
//  INBOX — All private chat threads
// ================================================================
async function loadInbox(){
  if(!currentUser) return;
  const list = document.getElementById('inbox-list');
  if(!list) return;
  list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">جاري التحميل…</div>';
  try{
    const all = await db.getMyPrivateChats(currentUser.email);
    if(!all || !all.length){
      list.innerHTML = '<div class="empty-listings"><div class="empty-icon">💬</div><p>لا توجد محادثات خاصة بعد.</p></div>';
      return;
    }
    // Group by conversation: car_id + other party
    const threads = {};
    all.forEach(m=>{
      const other = m.sender_email===currentUser.email ? m.receiver_email : m.sender_email;
      const key = m.car_id+'__'+other;
      if(!threads[key]){
        threads[key] = { carId: m.car_id, otherEmail: other, messages: [], lastMsg: m };
      }
      threads[key].messages.push(m);
      if(new Date(m.created_at) > new Date(threads[key].lastMsg.created_at)) threads[key].lastMsg = m;
    });

    // Load car info for each thread
    const carIds = [...new Set(Object.values(threads).map(th=>th.carId))];
    let carsMap = {};
    try{
      const cars = await sb('Cars?id=in.('+carIds.join(',')+')&select=id,make,model,year,owner_email');
      (cars||[]).forEach(c=>{ carsMap[c.id]=c; });
    }catch(e){}

    list.innerHTML = Object.values(threads).sort((a,b)=>
      new Date(b.lastMsg.created_at)-new Date(a.lastMsg.created_at)
    ).map(th=>{
      const car = carsMap[th.carId];
      const carName = car ? `${car.make} ${car.model} ${car.year}` : 'إعلان';
      const otherName = th.otherEmail.split('@')[0];
      const lastText = escHtml(th.lastMsg.message.slice(0,60))+(th.lastMsg.message.length>60?'…':'');
      const isMine = th.lastMsg.sender_email===currentUser.email;
      const timeStr = timeAgo(th.lastMsg.created_at);
      return `<div class="inbox-thread" onclick="openInboxChat('${th.carId}','${escAttr(carName)}','${escAttr(th.otherEmail)}')">
        <div class="inbox-avatar">${th.otherEmail[0]?.toUpperCase()}</div>
        <div class="inbox-body">
          <div class="inbox-header">
            <span class="inbox-name">${otherName}</span>
            <span class="inbox-time">${timeStr}</span>
          </div>
          <div class="inbox-car">🚗 ${carName}</div>
          <div class="inbox-preview">${isMine?'أنت: ':''} ${lastText}</div>
        </div>
      </div>`;
    }).join('');
  }catch(e){
    list.innerHTML = '<div class="empty-listings"><p>خطأ في التحميل.</p></div>';
    console.error(e);
  }
}

window.openInboxChat = function(carId, carName, otherEmail){
  currentCarId = carId;
  currentCarOwner = otherEmail;
  document.getElementById('pchat-title').textContent = '🔒 ' + carName;
  document.getElementById('pchat-subtitle').textContent = otherEmail.split('@')[0];
  document.getElementById('pchat-back-btn').onclick = ()=>goToSection('inbox');
  goToSection('private-chat');
  loadPrivateMessages(carId, currentUser.email, otherEmail);
  if(pchatTimer) clearInterval(pchatTimer);
  pchatTimer = setInterval(()=>loadPrivateMessages(carId,currentUser.email,otherEmail),5000);
};

// ── Gallery ───────────────────────────────────────────────────
window.openGallery=function(id,images){
  if(!images||!images.length) return;
  let idx=0;
  const ov=document.createElement('div'); ov.className='gallery-overlay';
  const render=()=>{ ov.innerHTML=`<div class="gallery-inner">
    <button class="gallery-close" onclick="this.closest('.gallery-overlay').remove()">✕</button>
    <button class="gallery-prev" onclick="event.stopPropagation();window._gNav(-1)" ${idx===0?'disabled':''}>‹</button>
    <img src="${images[idx]}" class="gallery-img">
    <button class="gallery-next" onclick="event.stopPropagation();window._gNav(1)" ${idx===images.length-1?'disabled':''}>›</button>
    <div class="gallery-counter">${idx+1} / ${images.length}</div>
  </div>`; };
  window._gNav=d=>{ idx=Math.max(0,Math.min(images.length-1,idx+d)); render(); };
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  render(); document.body.appendChild(ov);
};

// ── Helpers ───────────────────────────────────────────────────
function val(id){ return (document.getElementById(id)?.value||'').trim(); }
function showAlert(f,type,msg){ const el=document.getElementById(`alert-${f}`); if(!el) return; el.className=`auth-alert show ${type}`; el.innerHTML=msg; }
function clearAlert(f){ const el=document.getElementById(`alert-${f}`); if(el) el.className='auth-alert'; }
function setBtnLoading(id,s){ document.getElementById(id)?.classList.toggle('loading',s); }
function toast(msg,type='success'){
  const tc=document.getElementById('toast-container'), el=document.createElement('div');
  el.className=`toast ${type}`; el.innerHTML=msg; tc.appendChild(el);
  setTimeout(()=>el.style.opacity='0',3000); setTimeout(()=>el.remove(),3400);
}
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s){ return String(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }
function timeAgo(ts){
  const diff=Math.floor((Date.now()-new Date(ts))/1000);
  if(diff<60) return LANG==='ar'?'الآن':'just now';
  if(diff<3600) return LANG==='ar'?`${Math.floor(diff/60)} دقيقة`:`${Math.floor(diff/60)}m`;
  if(diff<86400) return LANG==='ar'?`${Math.floor(diff/3600)} ساعة`:`${Math.floor(diff/3600)}h`;
  return new Date(ts).toLocaleDateString(LANG==='ar'?'ar-SA':'en-US',{month:'short',day:'numeric'});
}

document.addEventListener('keydown',e=>{
  if(e.key!=='Enter') return;
  if(document.getElementById('form-login')?.classList.contains('active')) window.doLogin();
  else if(document.getElementById('form-register')?.classList.contains('active')) window.doRegister();
});

// ================================================================
//  HOMEPAGE DASHBOARD — Last 3 listings + stats
// ================================================================
async function loadDashboard(){
  try{
    // Load last 3 listings for homepage preview
    const recent = await sb('Cars?select=*&order=created_at.desc&limit=3');
    renderHomepageListings(recent);
    // Load stats
    const [allCars, allProfiles, allMsgs] = await Promise.all([
      sb('Cars?select=id'),
      sb('profiles?select=id'),
      sb('messages?select=id').catch(()=>[]),
    ]);
    document.getElementById('home-stat-cars').textContent    = (allCars||[]).length;
    document.getElementById('home-stat-users').textContent   = (allProfiles||[]).length;
    document.getElementById('home-stat-msgs').textContent    = (allMsgs||[]).length;
  }catch(e){ console.error('Dashboard load error',e); }
}

function renderHomepageListings(listings){
  const grid = document.getElementById('home-recent-grid');
  if(!grid) return;
  const curr = currency();
  if(!listings||!listings.length){
    grid.innerHTML='<div class="empty-listings" style="grid-column:1/-1"><div class="empty-icon">🚗</div><p>لا توجد إعلانات بعد.</p></div>';
    return;
  }
  grid.innerHTML = listings.map(l=>{
    const imgs = Array.isArray(l.images)?l.images:[];
    return `<div class="listing-card home-preview-card" onclick="goToSection('listings')">
      <div class="listing-img-wrap">
        ${imgs.length?`<img src="${imgs[0]}" alt="${l.make} ${l.model}" loading="lazy">`:'<div class="listing-img-placeholder">🚗</div>'}
      </div>
      <div class="listing-body">
        <div class="listing-price">${formatPrice(l.price)} <span class="listing-curr">${curr}</span></div>
        <div class="listing-name">${l.make} ${l.model} ${l.year}</div>
        <div class="listing-meta">
          ${l.city?`<span class="meta-chip">📍 ${l.city}</span>`:''}
          ${l.mileage?`<span class="meta-chip">🛣️ ${parseInt(l.mileage).toLocaleString()} km</span>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ================================================================
//  ADMIN DASHBOARD
// ================================================================
async function loadAdminDashboard(){
  const el = id => document.getElementById(id);
  // Show loading
  ['admin-total-users','admin-total-cars','admin-total-msgs','admin-total-notifs',
   'admin-total-private','admin-total-revenue'].forEach(id=>{ if(el(id)) el(id).textContent='…'; });

  try{
    const [cars, profiles, msgs, notifs, privates] = await Promise.all([
      sb('Cars?select=*&order=created_at.desc'),
      sb('profiles?select=*&order=created_at.desc'),
      sb('messages?select=*&order=created_at.desc').catch(()=>[]),
      sb('notifications?select=id,is_read').catch(()=>[]),
      sb('private_chats?select=id').catch(()=>[]),
    ]);

    // Stats
    el('admin-total-users').textContent  = (profiles||[]).length;
    el('admin-total-cars').textContent   = (cars||[]).length;
    el('admin-total-msgs').textContent   = (msgs||[]).length;
    el('admin-total-notifs').textContent = (notifs||[]).filter(n=>!n.is_read).length + ' غير مقروء';
    el('admin-total-private').textContent= (privates||[]).length;

    // Total value of listings
    const totalVal = (cars||[]).reduce((s,c)=>s+(parseFloat(c.price)||0),0);
    el('admin-total-revenue').textContent = formatPrice(totalVal) + ' ر.س';

    // Top cities
    const cityCount = {};
    (cars||[]).forEach(c=>{ if(c.city){ cityCount[c.city]=(cityCount[c.city]||0)+1; } });
    const topCities = Object.entries(cityCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const citiesEl = el('admin-top-cities');
    if(citiesEl) citiesEl.innerHTML = topCities.length
      ? topCities.map(([city,count])=>`<div class="admin-city-row"><span class="admin-city-name">${city}</span><span class="admin-city-bar"><span style="width:${Math.round(count/((cars||[]).length)*100)}%"></span></span><span class="admin-city-count">${count}</span></div>`).join('')
      : '<p style="color:var(--text-muted)">لا توجد بيانات.</p>';

    // Top makes
    const makeCount = {};
    (cars||[]).forEach(c=>{ if(c.make){ makeCount[c.make]=(makeCount[c.make]||0)+1; } });
    const topMakes = Object.entries(makeCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const makesEl = el('admin-top-makes');
    if(makesEl) makesEl.innerHTML = topMakes.map(([make,count])=>`<div class="admin-city-row"><span class="admin-city-name">${make}</span><span class="admin-city-bar"><span style="width:${Math.round(count/((cars||[]).length)*100)}%"></span></span><span class="admin-city-count">${count}</span></div>`).join('');

    // Recent listings table
    const tbl = el('admin-recent-listings');
    if(tbl) tbl.innerHTML = (cars||[]).slice(0,10).map(c=>`
      <tr>
        <td>${c.make} ${c.model} ${c.year}</td>
        <td>${formatPrice(c.price)} ر.س</td>
        <td>${c.city||'—'}</td>
        <td>${c.owner_username?'@'+c.owner_username:c.owner_email?.split('@')[0]||'—'}</td>
        <td>${new Date(c.created_at).toLocaleDateString('ar-SA')}</td>
        <td><button class="admin-del-btn" onclick="adminDeleteCar('${c.id}')">🗑️ حذف</button></td>
      </tr>`).join('');

    // Recent users table
    const utbl = el('admin-recent-users');
    if(utbl) utbl.innerHTML = (profiles||[]).slice(0,10).map(p=>`
      <tr>
        <td>${p.username?'@'+p.username:'—'}</td>
        <td>${p.email}</td>
        <td>${new Date(p.created_at).toLocaleDateString('ar-SA')}</td>
      </tr>`).join('');

  }catch(e){ console.error('Admin load error',e); }
}

window.adminDeleteCar = async function(id){
  if(!confirm('حذف هذا الإعلان نهائياً؟')) return;
  try{
    await db.deleteCar(id);
    toast('✅ تم حذف الإعلان.');
    loadAdminDashboard();
  }catch(e){ toast('❌ فشل الحذف.','error'); }
};
