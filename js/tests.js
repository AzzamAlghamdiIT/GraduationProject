// ════════════════════════════════════════════════════════════════════
//  tests.js — ملف الاختبارات الشامل لمشروع ثمنها
//  Comprehensive Unit Test Suite for Thmmenha
//
//  ┌─────────────────────────────────────────────────────────────┐
//  │ المسؤولية | Responsibility:                                  │
//  │  • اختبار جميع الدوال النقية (Pure Functions) في data.js     │
//  │    Test all pure functions in data.js                        │
//  │  • اختبار دوال المساعدة في app.js                            │
//  │    Test utility helpers from app.js                          │
//  └─────────────────────────────────────────────────────────────┘
//
//  طريقة التشغيل | How to run:
//    1) في المتصفح | In browser console (after loading the site):
//         import('./js/tests.js')
//    2) في Node.js (للتطوير | for development):
//         node --experimental-vm-modules js/tests.js
//
//  المؤلف   | Author     : Team LogicMinds (CPIT499 — FCIT KAU)
// ════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
//  SECTION 1 — مُشغّل الاختبارات | MINI TEST RUNNER
// ─────────────────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;
const _results = [];

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ test — التحقق من أن النتيجة تطابق المتوقع تماماً (===)         │
 * │ Strict equality assertion.                                   │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Parameters:                                                  │
 * │   name:     String — اسم الاختبار                             │
 * │   actual:   Any    — القيمة الناتجة من الدالة                  │
 * │   expected: Any    — القيمة المتوقعة                          │
 * └─────────────────────────────────────────────────────────────┘
 */
function test(name, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    _passed++;
    console.log(`  ✅  ${name}`);
  } else {
    _failed++;
    console.error(`  ❌  ${name}`);
    console.error(`       got:      ${JSON.stringify(actual)}`);
    console.error(`       expected: ${JSON.stringify(expected)}`);
  }
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ testTrue — التأكد من أن الشرط صحيح (truthy)                   │
 * │ Assert a condition is truthy.                                │
 * └─────────────────────────────────────────────────────────────┘
 */
function testTrue(name, condition) {
  test(name, !!condition, true);
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ testRange — التأكد من أن القيمة ضمن نطاق رقمي [min, max]      │
 * │ Assert a numeric value lies within [min, max] inclusive.     │
 * └─────────────────────────────────────────────────────────────┘
 */
function testRange(name, actual, min, max) {
  const ok = typeof actual === 'number' && actual >= min && actual <= max;
  if (ok) {
    _passed++;
    console.log(`  ✅  ${name}  (${actual} in [${min}, ${max}])`);
  } else {
    _failed++;
    console.error(`  ❌  ${name}  — ${actual} not in [${min}, ${max}]`);
  }
}

/** طباعة فاصل قسم | Print a section divider. */
function describe(title) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);
}

/** طباعة الملخص النهائي | Print final pass/fail summary. */
function summary() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESULTS: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) console.log('  🎉 جميع الاختبارات نجحت! All tests passed!');
  else               console.error(`  ⚠️  ${_failed} test(s) failed — see above`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ─────────────────────────────────────────────────────────────────────
//  SECTION 2 — بيانات اختبار وهمية | MOCK DATASET
//  مجموعة سيارات صغيرة محكومة لاستخدامها في الاختبارات بدون
//  الحاجة لتحميل cars.json الفعلي.
//  Small controlled dataset injected so tests don't depend on
//  the real cars.json file changing.
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA = [
  { Make:'Toyota',  Model:'Camry',       Type:'Sedan',  Trim:'LE',       Year:2026, Agency_Price: 111000 },
  { Make:'Toyota',  Model:'Camry',       Type:'Sedan',  Trim:'XLE',      Year:2026, Agency_Price: 135000 },
  { Make:'Toyota',  Model:'Land Cruiser',Type:'SUV',    Trim:'VXR',      Year:2026, Agency_Price: 340000 },
  { Make:'Toyota',  Model:'Corolla',     Type:'Sedan',  Trim:'XLI',      Year:2026, Agency_Price:  79000 },
  { Make:'Hyundai', Model:'Elantra',     Type:'Sedan',  Trim:'Smart',    Year:2026, Agency_Price:  72000 },
  { Make:'BMW',     Model:'3 Series',    Type:'Sedan',  Trim:'Sport',    Year:2026, Agency_Price: 189750 },
  { Make:'BYD',     Model:'Seal',        Type:'Sedan',  Trim:'Standard', Year:2026, Agency_Price:  99000 },
  { Make:'GMC',     Model:'Yukon',       Type:'SUV',    Trim:'SLT',      Year:2026, Agency_Price: 280000 },
  { Make:'Chevrolet',Model:'Malibu',     Type:'Sedan',  Trim:'LS',       Year:2026, Agency_Price:  75000 },
];

// ─────────────────────────────────────────────────────────────────────
//  SECTION 3 — نسخ من الدوال النقية للاختبار المستقل
//  Inline copies of pure functions under test
//  (نسخها هنا يجعل ملف الاختبارات قابل للتشغيل بدون bundler)
//  (Inlining avoids needing a bundler in the test environment)
// ─────────────────────────────────────────────────────────────────────

let CAR_DATA = MOCK_DATA;

function getMakes_()                       { return [...new Set(CAR_DATA.map(c => c.Make))].sort(); }
function getModels_(make)                  { return [...new Set(CAR_DATA.filter(c => c.Make===make).map(c=>c.Model))].sort(); }
function getTrims_(make, model)            { return [...new Set(CAR_DATA.filter(c => c.Make===make && c.Model===model).map(c=>c.Trim))]; }
function findCar_(make, model, trim) {
  if (trim) {
    const e = CAR_DATA.find(c => c.Make===make && c.Model===model && c.Trim===trim);
    if (e) return e;
  }
  return CAR_DATA.find(c => c.Make===make && c.Model===model) || null;
}
function getTypes_()                       { return [...new Set(CAR_DATA.map(c => c.Type))].sort(); }
function findByBudget_(min, max, type='') {
  return CAR_DATA.filter(c => {
    const inBudget  = c.Agency_Price >= min && c.Agency_Price <= max;
    const matchType = !type || c.Type===type || c.Type.includes(type);
    return inBudget && matchType;
  }).sort((a,b) => a.Agency_Price - b.Agency_Price);
}
function formatPrice_(num) { return Math.round(num||0).toLocaleString('en-SA'); }

const BRAND_PROFILES_ = {
  Toyota:    { firstYear:0.08, annual:0.05, floor:0.45, resale:'Excellent' },
  Hyundai:   { firstYear:0.06, annual:0.04, floor:0.50, resale:'Good' },
  BMW:       { firstYear:0.11, annual:0.07, floor:0.32, resale:'Average' },
  BYD:       { firstYear:0.20, annual:0.13, floor:0.18, resale:'Below Average' },
  GMC:       { firstYear:0.15, annual:0.10, floor:0.30, resale:'Good' },
  Chevrolet: { firstYear:0.09, annual:0.06, floor:0.38, resale:'Average' },
};
const DEFAULT_PROFILE_ = { firstYear:0.10, annual:0.07, floor:0.35, resale:'Average' };

function calcAgeFactor_(make, age) {
  if (age <= 0) return { mult:1.0, pct:0 };
  const p = BRAND_PROFILES_[make] || DEFAULT_PROFILE_;
  let mult = age===1 ? (1-p.firstYear) : (1-p.firstYear) * Math.pow(1-p.annual, age-1);
  mult = Math.max(mult, p.floor);
  return { mult, pct: Math.round((1-mult)*100) };
}
function calcTrimFactor_(trimStr) {
  const t = (trimStr||'').toLowerCase();
  if (/\b(full|platinum|vip|limited)\b/.test(t))   return { mult:1.05 };
  if (/\b(sport|premium|luxury|ex)\b/.test(t))     return { mult:1.00 };
  if (/\b(mid|plus|se|xle|sv|gl)\b/.test(t))       return { mult:0.95 };
  if (/\b(base|standard|lx|le)\b/.test(t) || t.length<=2) return { mult:0.88 };
  return { mult:0.95 };
}
function calcMileageFactor_(km, make, age) {
  km = parseInt(km)||0;
  if (km===0 && age<=0) return { mult:1.0 };
  const rates = { Toyota:0.016, Hyundai:0.019, BMW:0.020, BYD:0.022, GMC:0.017, Chevrolet:0.020 };
  const rate = rates[make] || 0.020;
  return { mult: Math.max(0.28, 1 - (rate * Math.pow(km/10000, 0.85))) };
}
function calcAccidentFactor_(level) {
  return ({ none:1.00, minor:0.85, medium:0.68, major:0.48 })[level] ?? 1.00;
}
function calcDemandFactor_(model) {
  const hot = ['Land Cruiser','Patrol','Camry','Corolla','Fortuner','Hilux','Prado','4Runner'];
  const low = ['Malibu','Impala','Captiva','Aveo'];
  if (hot.includes(model)) return { mult:1.08 };
  if (low.includes(model)) return { mult:0.93 };
  return { mult:1.00 };
}
function estimatePrice_({ make, model, trim, year, mileage, accident }) {
  const car = findCar_(make, model, trim||null);
  if (!car || !car.Agency_Price) return null;
  const age = Math.max(0, 2026 - (parseInt(year)||2026));
  const raw = car.Agency_Price
    * calcAgeFactor_(make, age).mult
    * calcTrimFactor_(trim||car.Trim||'').mult
    * calcMileageFactor_(mileage, make, age).mult
    * calcAccidentFactor_(accident||'none')
    * calcDemandFactor_(model).mult;
  const margin = raw * 0.07;
  return {
    agencyPrice: car.Agency_Price,
    estimatedPrice: Math.round(raw/500)*500,
    rangeLow:       Math.round((raw-margin)/500)*500,
    rangeHigh:      Math.round((raw+margin)/500)*500,
    retentionPct:   Math.round((raw/car.Agency_Price)*100),
  };
}
function validatePassword_(pw) {
  return [
    { key:'length',    ok: pw.length >= 8 },
    { key:'uppercase', ok: /[A-Z]/.test(pw) },
    { key:'number',    ok: /[0-9]/.test(pw) },
    { key:'special',   ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}
function escHtml_(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function validateYear_(yr, curY) {
  return Number.isInteger(yr) && yr >= 1980 && yr <= curY;
}

// ════════════════════════════════════════════════════════════════════
//  SECTION 4 — مجموعات الاختبارات | TEST SUITES
// ════════════════════════════════════════════════════════════════════

console.log('\n🚗  THMMENHA — Unit Test Suite\n');

// ──────────────────────────────────────────────────────────────────
describe('getMakes() — قائمة الماركات الفريدة المرتبة');
// ──────────────────────────────────────────────────────────────────
const makes = getMakes_();
testTrue('returns an array',              Array.isArray(makes));
testTrue('contains Toyota',               makes.includes('Toyota'));
testTrue('contains Hyundai',              makes.includes('Hyundai'));
testTrue('contains BYD',                  makes.includes('BYD'));
testTrue('is sorted ascending',           makes.join(',') === [...makes].sort().join(','));
testTrue('no duplicates',                 makes.length === new Set(makes).size);
test    ('correct count of makes',        makes.length, 6);

// ──────────────────────────────────────────────────────────────────
describe('getModels(make) — موديلات ماركة معينة');
// ──────────────────────────────────────────────────────────────────
const toyotaModels = getModels_('Toyota');
testTrue('Toyota has models',             toyotaModels.length > 0);
testTrue('Toyota has Camry',              toyotaModels.includes('Camry'));
testTrue('Toyota has Land Cruiser',       toyotaModels.includes('Land Cruiser'));
testTrue('models are sorted',             toyotaModels.join(',') === [...toyotaModels].sort().join(','));
test    ('unknown make returns []',       getModels_('UnknownBrand').length, 0);
test    ('Toyota model count',            getModels_('Toyota').length, 3);

// ──────────────────────────────────────────────────────────────────
describe('getTrims(make, model) — فئات سيارة معينة');
// ──────────────────────────────────────────────────────────────────
const camryTrims = getTrims_('Toyota','Camry');
testTrue('Camry has trims',               camryTrims.length > 0);
testTrue('Camry has LE trim',             camryTrims.includes('LE'));
testTrue('Camry has XLE trim',            camryTrims.includes('XLE'));
test    ('Camry trim count',              camryTrims.length, 2);
test    ('unknown model returns []',      getTrims_('Toyota','Unknown').length, 0);

// ──────────────────────────────────────────────────────────────────
describe('findCar(make, model, trim) — البحث عن سيارة محددة');
// ──────────────────────────────────────────────────────────────────
const exactCar    = findCar_('Toyota','Camry','LE');
const fallbackCar = findCar_('Toyota','Camry');
const missingCar  = findCar_('Toyota','Supra');
testTrue('exact match returns object',    exactCar !== null);
test    ('exact match price correct',     exactCar?.Agency_Price, 111000);
testTrue('fallback returns object',       fallbackCar !== null);
testTrue('missing returns null',          missingCar === null);
testTrue('wrong make returns null',       findCar_('Ford','Camry') === null);

// ──────────────────────────────────────────────────────────────────
describe('getTypes() — أنواع هياكل السيارات');
// ──────────────────────────────────────────────────────────────────
const types = getTypes_();
testTrue('returns array',                 Array.isArray(types));
testTrue('contains Sedan',                types.includes('Sedan'));
testTrue('contains SUV',                  types.includes('SUV'));
testTrue('no duplicates',                 types.length === new Set(types).size);
testTrue('is sorted',                     types.join(',') === [...types].sort().join(','));

// ──────────────────────────────────────────────────────────────────
describe('findByBudget(min, max, type) — البحث بالميزانية');
// ──────────────────────────────────────────────────────────────────
const under100k = findByBudget_(0, 100000);
const sedansOnly= findByBudget_(0, 9999999, 'Sedan');
const narrow    = findByBudget_(110000, 115000);
const empty     = findByBudget_(0, 1000);
testTrue('returns array',                 Array.isArray(under100k));
testTrue('all results ≤ max budget',      under100k.every(c => c.Agency_Price <= 100000));
testTrue('results sorted ascending',      under100k.every((c,i)=>i===0||c.Agency_Price>=under100k[i-1].Agency_Price));
testTrue('sedan filter: all Sedans',      sedansOnly.every(c => c.Type==='Sedan'));
testTrue('narrow range finds Camry LE',   narrow.some(c => c.Model==='Camry'&&c.Trim==='LE'));
test    ('empty range returns []',        empty.length, 0);

// ──────────────────────────────────────────────────────────────────
describe('formatPrice(num) — تنسيق الأرقام');
// ──────────────────────────────────────────────────────────────────
test('formats 111000',                    formatPrice_(111000), '111,000');
test('formats 0',                         formatPrice_(0),      '0');
test('formats null safely',               formatPrice_(null),   '0');
test('rounds floats',                     formatPrice_(1234.9), '1,235');
test('formats large number',              formatPrice_(340000), '340,000');

// ──────────────────────────────────────────────────────────────────
describe('calcAgeFactor — معامل الإهلاك حسب العمر');
// ──────────────────────────────────────────────────────────────────
const toyotaAge0 = calcAgeFactor_('Toyota', 0);
const toyotaAge1 = calcAgeFactor_('Toyota', 1);
const toyotaAge5 = calcAgeFactor_('Toyota', 5);
const bydAge1    = calcAgeFactor_('BYD',    1);
test    ('brand new → mult = 1.0',                toyotaAge0.mult,  1.0);
test    ('brand new → pct = 0',                   toyotaAge0.pct,   0);
testRange('Toyota year 1 mult ~0.92',             toyotaAge1.mult,  0.91, 0.93);
testTrue('Toyota year 5 stays above floor',       toyotaAge5.mult >= 0.45);
testRange('BYD year 1 ~0.80',                     bydAge1.mult,     0.78, 0.82);
testTrue('Toyota retains more than BYD',          toyotaAge5.mult > calcAgeFactor_('BYD', 5).mult);

// ──────────────────────────────────────────────────────────────────
describe('calcTrimFactor — معامل الفئة (التريم)');
// ──────────────────────────────────────────────────────────────────
test('Platinum → 1.05',                   calcTrimFactor_('Platinum').mult,     1.05);
test('VIP → 1.05',                        calcTrimFactor_('VIP').mult,          1.05);
test('Sport → 1.00',                      calcTrimFactor_('Sport').mult,        1.00);
test('XLE → 0.95',                        calcTrimFactor_('XLE').mult,          0.95);
test('LE → 0.88',                         calcTrimFactor_('LE').mult,           0.88);
test('Base → 0.88',                       calcTrimFactor_('Base').mult,         0.88);
test('empty → triggers base (0.88)',      calcTrimFactor_('').mult,             0.88);
test('Full Option → 1.05',                calcTrimFactor_('Full Option').mult,  1.05);

// ──────────────────────────────────────────────────────────────────
describe('calcMileageFactor — معامل الكيلومترات');
// ──────────────────────────────────────────────────────────────────
test    ('zero km new car → 1.0',         calcMileageFactor_(0,'Toyota',0).mult, 1.0);
testRange('10k km Toyota > 0.95',         calcMileageFactor_(10000,'Toyota',3).mult, 0.95, 1.0);
testTrue('200k km near floor',            calcMileageFactor_(200000,'Toyota',10).mult <= 0.80);
testTrue('BYD higher km depreciation than BMW', calcMileageFactor_(100000,'BYD',4).mult < calcMileageFactor_(100000,'BMW',4).mult);
testTrue('floor never below 0.28',        calcMileageFactor_(999999,'BYD',30).mult >= 0.28);

// ──────────────────────────────────────────────────────────────────
describe('calcAccidentFactor — معامل الحوادث');
// ──────────────────────────────────────────────────────────────────
test('none → 1.00',                       calcAccidentFactor_('none'),   1.00);
test('minor → 0.85',                      calcAccidentFactor_('minor'),  0.85);
test('medium → 0.68',                     calcAccidentFactor_('medium'), 0.68);
test('major → 0.48',                      calcAccidentFactor_('major'),  0.48);
test('unknown safely → 1.00',             calcAccidentFactor_('flood'),  1.00);

// ──────────────────────────────────────────────────────────────────
describe('calcDemandFactor — معامل الطلب');
// ──────────────────────────────────────────────────────────────────
test('Land Cruiser → +8%',                calcDemandFactor_('Land Cruiser').mult, 1.08);
test('Patrol → +8%',                      calcDemandFactor_('Patrol').mult,       1.08);
test('Camry → +8%',                       calcDemandFactor_('Camry').mult,        1.08);
test('Malibu → -7%',                      calcDemandFactor_('Malibu').mult,       0.93);
test('Aveo → -7%',                        calcDemandFactor_('Aveo').mult,         0.93);
test('Elantra → neutral',                 calcDemandFactor_('Elantra').mult,      1.00);
test('3 Series → neutral',                calcDemandFactor_('3 Series').mult,     1.00);

// ──────────────────────────────────────────────────────────────────
describe('estimatePrice() — التكامل الكامل لخوارزمية التقدير');
// ──────────────────────────────────────────────────────────────────
const newCamry = estimatePrice_({ make:'Toyota', model:'Camry', trim:'LE', year:2026, mileage:0, accident:'none' });
testTrue('new Camry returns result',       newCamry !== null);
testRange('new Camry estimatedPrice valid', newCamry.estimatedPrice, 100000, 130000);
test    ('agency price correct',           newCamry.agencyPrice, 111000);
testTrue('range low ≤ estimated',          newCamry.rangeLow <= newCamry.estimatedPrice);
testTrue('range high ≥ estimated',         newCamry.rangeHigh >= newCamry.estimatedPrice);
testTrue('estimated rounds to 500',        newCamry.estimatedPrice % 500 === 0);

const usedCamry = estimatePrice_({ make:'Toyota', model:'Camry', trim:'LE', year:2020, mileage:100000, accident:'none' });
testTrue('used Camry returns result',      usedCamry !== null);
testTrue('used < new price',               usedCamry.estimatedPrice < newCamry.estimatedPrice);
testRange('used Camry retention 60-90%',   usedCamry.retentionPct, 60, 90);

const damagedCamry = estimatePrice_({ make:'Toyota', model:'Camry', trim:'LE', year:2022, mileage:50000, accident:'major' });
const cleanCamry   = estimatePrice_({ make:'Toyota', model:'Camry', trim:'LE', year:2022, mileage:50000, accident:'none'  });
testTrue('damaged < clean price',          damagedCamry.estimatedPrice < cleanCamry.estimatedPrice);

const bydNew  = estimatePrice_({ make:'BYD',    model:'Seal',  trim:'Standard', year:2023, mileage:30000, accident:'none' });
const toyoNew = estimatePrice_({ make:'Toyota', model:'Camry', trim:'LE',       year:2023, mileage:30000, accident:'none' });
testTrue('BYD retention < Toyota at 3 years', bydNew.retentionPct < toyoNew.retentionPct);

const missing = estimatePrice_({ make:'Pontiac', model:'Firebird', year:2020, mileage:0, accident:'none' });
test('unknown car → null',                 missing, null);

// ──────────────────────────────────────────────────────────────────
describe('validatePassword() — قوة كلمة المرور');
// ──────────────────────────────────────────────────────────────────
const strong   = validatePassword_('Secure@99');
const noUpper  = validatePassword_('secure@99');
const noNum    = validatePassword_('Secure@@!');
const noSpec   = validatePassword_('Secure99A');
const tooShort = validatePassword_('Ab@1');
test('strong: length passes',              strong[0].ok,   true);
test('strong: uppercase passes',           strong[1].ok,   true);
test('strong: number passes',              strong[2].ok,   true);
test('strong: special passes',             strong[3].ok,   true);
test('no uppercase fails rule 2',          noUpper[1].ok,  false);
test('no number fails rule 3',             noNum[2].ok,    false);
test('no special fails rule 4',            noSpec[3].ok,   false);
test('too short fails rule 1',             tooShort[0].ok, false);

// ──────────────────────────────────────────────────────────────────
describe('escHtml() — حماية من هجمات XSS');
// ──────────────────────────────────────────────────────────────────
test('escapes <script>',                   escHtml_('<script>'),          '&lt;script&gt;');
test('escapes >',                          escHtml_('a > b'),             'a &gt; b');
test('escapes &',                          escHtml_('AT&T'),              'AT&amp;T');
test('escapes "',                          escHtml_('"quoted"'),          '&quot;quoted&quot;');
test('safe string unchanged',              escHtml_('Hello World'),       'Hello World');

// ──────────────────────────────────────────────────────────────────
describe('validateYear() — التحقق من سنة الإنتاج');
// ──────────────────────────────────────────────────────────────────
test('valid year 2020',                    validateYear_(2020, 2026), true);
test('valid year 1990',                    validateYear_(1990, 2026), true);
test('boundary 1980',                      validateYear_(1980, 2026), true);
test('boundary current year',              validateYear_(2026, 2026), true);
test('year 1979 rejected',                 validateYear_(1979, 2026), false);
test('year 2027 rejected',                 validateYear_(2027, 2026), false);
test('year 20229 rejected (typo)',         validateYear_(20229,2026), false);
test('negative rejected',                  validateYear_(-1,   2026), false);
test('zero rejected',                      validateYear_(0,    2026), false);
test('non-integer rejected',               validateYear_(2022.5,2026),false);

// ════════════════════════════════════════════════════════════════════
//  SUMMARY — الملخص النهائي
// ════════════════════════════════════════════════════════════════════
summary();
