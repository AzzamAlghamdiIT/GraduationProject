// ════════════════════════════════════════════════════════════════════
//  data.js — مُحرّك تقدير الأسعار + مجموعة بيانات السيارات
//  Car Dataset Manager + Saudi Market Price Estimation Engine
//
//  ┌─────────────────────────────────────────────────────────────┐
//  │ المسؤوليات الرئيسية | Module Responsibilities:              │
//  │  • تحميل ملف cars.json وتجهيز البيانات للاستخدام            │
//  │    Load cars.json and normalise the dataset                  │
//  │  • توفير دوال للبحث في البيانات (ماركة، موديل، فئة)         │
//  │    Provide query helpers (make, model, trim, type)           │
//  │  • تنفيذ خوارزمية تقدير السعر معايرة للسوق السعودي           │
//  │    Run KSA-calibrated multi-factor price estimation          │
//  └─────────────────────────────────────────────────────────────┘
//
//  المؤلف   | Author      : Team LogicMinds (CPIT499 — FCIT KAU)
//  المشرف   | Supervisor  : Dr. Madini O. Alassafi
//  الإصدار  | Version     : v2.0 — calibrated against 29 real KSA listings
// ════════════════════════════════════════════════════════════════════

/**
 * مصفوفة عامة تحوي جميع سيارات قاعدة البيانات بعد التحميل.
 * Global cache for the full normalised car dataset.
 * Populated by loadCarData() at boot.
 * @type {Array<Object>}
 */
let CAR_DATA = [];


// ─────────────────────────────────────────────────────────────────────
//  SECTION 1 — تحميل البيانات | DATA LOADING
// ─────────────────────────────────────────────────────────────────────

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ الوظيفة | Function: loadCarData                              │
 * ├─────────────────────────────────────────────────────────────┤
 * │ الوصف    : تجلب ملف cars.json عبر fetch وتنظّف حقل السعر     │
 * │           من الفواصل (مثل "122,300" → 122300).               │
 * │ Purpose  : Fetches cars.json and normalises Agency_Price by  │
 * │           stripping commas and converting to integers.        │
 * │                                                              │
 * │ Parameters | المعاملات : لا توجد | None                      │
 * │                                                              │
 * │ Returns | القيمة المُعادة:                                   │
 * │   Promise<Array<Object>> — مصفوفة السيارات الجاهزة للاستخدام │
 * │   Returns the normalised car array, or [] on failure.        │
 * │                                                              │
 * │ Side Effects | الآثار الجانبية:                              │
 * │   تُعدّل المتغيّر العام CAR_DATA.                              │
 * │   Mutates the module-level CAR_DATA variable.                │
 * └─────────────────────────────────────────────────────────────┘
 */
export async function loadCarData() {
  try {
    // ─ Step 1: جلب الملف من السيرفر | Fetch JSON from server
    const res = await fetch('./data/cars.json');

    // ─ التحقق من حالة الاستجابة قبل المتابعة
    //   Check HTTP status before parsing — fetch() does NOT throw on 4xx/5xx
    if (!res.ok) {
      throw new TypeError(`HTTP ${res.status} loading cars.json`);
    }

    CAR_DATA = await res.json();

    // ─ Step 2: تطبيع حقل السعر (إزالة الفواصل وتحويلها لأرقام صحيحة)
    //   Normalise Agency_Price — original Excel export contains "122,300"
    CAR_DATA = CAR_DATA.map(c => ({
      ...c,
      Agency_Price: parseInt(String(c.Agency_Price).replace(/,/g, '')) || 0
    }));

    return CAR_DATA;

  } catch (e) {
    // ════════════════════════════════════════════════════════════
    //  معالجة الأخطاء المُحددة | SPECIFIC EXCEPTION HANDLING
    // ════════════════════════════════════════════════════════════
    //  السبب الدقيق لاصطياد هذا الخطأ بهذه الطريقة:
    //  Why we catch and discriminate by error type:
    //
    //  1. TypeError → فشل شبكة fetch أو رد HTTP ≠ 2xx (مثلاً 404)
    //                 Thrown by fetch() on network failure OR by us
    //                 above when res.ok is false (404, 500, etc.).
    //
    //  2. SyntaxError → ملف JSON معطوب أو فيه أخطاء تركيبية
    //                   Thrown by res.json() when payload is not valid JSON.
    //
    //  أثر الخطأ على بقية النظام إذا حدث:
    //  Downstream impact if this fails:
    //    • تعطل قائمة الماركات في صفحة "تقدير السعر" (Estimator)
    //      → Estimator dropdowns will be empty
    //    • تعطل البحث بالميزانية (Budget Finder)
    //      → Budget Finder returns no results
    //    • صفحة "الإعلانات" تستمر بالعمل (تعتمد على Supabase)
    //      → Marketplace listings still function (data lives in Supabase)
    //
    //  استراتيجية التعافي: إعادة مصفوفة فارغة وتسجيل سبب الفشل
    //  Recovery: return [] so app keeps running; log the cause.
    // ════════════════════════════════════════════════════════════
    if (e instanceof TypeError) {
      console.error('[data.js] Network error while loading cars.json:', e.message);
    } else if (e instanceof SyntaxError) {
      console.error('[data.js] Malformed JSON in cars.json:', e.message);
    } else {
      console.error('[data.js] Unexpected error loading car data:', e);
    }
    return [];
  }
}

/**
 * إرجاع مصفوفة السيارات المُحمّلة.
 * Returns the cached car array. No fetch is performed.
 *
 * Parameters: None
 * Returns: Array<Object> — full dataset (may be [] if loadCarData failed)
 */
export function getCarData() {
  return CAR_DATA;
}


// ─────────────────────────────────────────────────────────────────────
//  SECTION 2 — دوال الاستعلام | DATASET QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ getMakes — قائمة الماركات الفريدة مرتبة أبجدياً               │
 * │ Returns unique, alphabetically-sorted list of all car makes. │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Parameters: None                                             │
 * │ Returns:    Array<String>   e.g. ["Audi", "BMW", "Toyota"]   │
 * │ Used by:    populateEstimatorMakes(), populateSellMakes()    │
 * └─────────────────────────────────────────────────────────────┘
 */
export function getMakes() {
  return [...new Set(CAR_DATA.map(c => c.Make))].sort();
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ getModels — موديلات ماركة معيّنة، فريدة ومرتبة                │
 * │ Returns models for a specific make, deduplicated and sorted. │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Parameters:                                                  │
 * │   make: String — اسم الماركة | Brand name (e.g. "Toyota")    │
 * │ Returns:    Array<String>   e.g. ["Camry","Corolla","Hilux"] │
 * │ Edge:       Returns [] if make does not exist.               │
 * └─────────────────────────────────────────────────────────────┘
 */
export function getModels(make) {
  return [...new Set(CAR_DATA.filter(c => c.Make === make).map(c => c.Model))].sort();
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ getTrims — قائمة فئات (Trims) سيارة معيّنة                    │
 * │ Returns trim variants for a make + model pair.               │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Parameters:                                                  │
 * │   make:  String — Brand name                                 │
 * │   model: String — Model name                                 │
 * │ Returns: Array<String>   e.g. ["LE","SE","XLE","Limited"]    │
 * └─────────────────────────────────────────────────────────────┘
 */
export function getTrims(make, model) {
  return [...new Set(CAR_DATA.filter(c => c.Make === make && c.Model === model).map(c => c.Trim))];
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ findCar — البحث عن سيارة محددة بالماركة والموديل والفئة      │
 * │ Look up a single car record by make/model/trim with fallback.│
 * ├─────────────────────────────────────────────────────────────┤
 * │ Strategy | الاستراتيجية:                                     │
 * │  1) إذا أُعطيت الفئة (trim) نبحث عن تطابق دقيق.              │
 * │     If trim is given, try exact (make + model + trim) match. │
 * │  2) إذا لم نجد، نُعيد أوّل سجل يطابق الماركة + الموديل.        │
 * │     Otherwise return first row matching make + model.        │
 * │                                                              │
 * │ Parameters:                                                  │
 * │   make:  String                                              │
 * │   model: String                                              │
 * │   trim:  String|null — اختياري | Optional                    │
 * │                                                              │
 * │ Returns: Object|null — السجل الكامل أو null عند عدم العثور.   │
 * └─────────────────────────────────────────────────────────────┘
 */
export function findCar(make, model, trim) {
  if (trim) {
    const exact = CAR_DATA.find(c => c.Make === make && c.Model === model && c.Trim === trim);
    if (exact) return exact;
  }
  return CAR_DATA.find(c => c.Make === make && c.Model === model) || null;
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ getTypes — قائمة أنواع الهياكل (Sedan / SUV …) فريدة ومرتبة │
 * │ Returns unique sorted body-type list for the Budget Finder. │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Parameters: None                                             │
 * │ Returns:    Array<String>   e.g. ["Crossover","Sedan","SUV"] │
 * └─────────────────────────────────────────────────────────────┘
 */
export function getTypes() {
  return [...new Set(CAR_DATA.map(c => c.Type))].sort();
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ findByBudget — البحث عن السيارات ضمن نطاق سعري ونوع هيكل    │
 * │ Filter cars by [minPrice, maxPrice] and optional body type. │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Parameters:                                                  │
 * │   minPrice: Number — الحد الأدنى بالريال (شامل)               │
 * │   maxPrice: Number — الحد الأعلى بالريال (شامل)               │
 * │   type:     String — اختياري؛ "" تعني جميع الأنواع            │
 * │                                                              │
 * │ Returns: Array<Object> — مرتبة تصاعدياً حسب السعر.           │
 * └─────────────────────────────────────────────────────────────┘
 */
export function findByBudget(minPrice, maxPrice, type = '') {
  return CAR_DATA.filter(c => {
    const price     = c.Agency_Price;
    const inBudget  = price >= minPrice && price <= maxPrice;
    // مطابقة جزئية للنوع لتشمل "SUV (7 Seats)" تحت "SUV"
    // Partial match so "SUV" also catches "SUV (7 Seats)"
    const matchType = !type || c.Type === type || c.Type.includes(type);
    return inBudget && matchType;
  }).sort((a, b) => a.Agency_Price - b.Agency_Price);
}


// ════════════════════════════════════════════════════════════════════
//  SECTION 3 — مُحرّك تقدير الأسعار للسوق السعودي
//  SECTION 3 — Saudi Market Price Estimation Engine v2
//
//  منهجية الحساب | Methodology:
//    1) جلب سعر الوكالة من قاعدة البيانات
//       Look up agency price from dataset.
//    2) تطبيق معامل العمر (declining-balance per brand)
//       Apply age depreciation multiplier.
//    3) تعديل حسب الفئة (top trims hold value better)
//       Adjust for trim level.
//    4) تعديل حسب الكيلومترات (مقارنة بمتوسط 22,000 km/year في السعودية)
//       Adjust for mileage vs KSA average (22k km/year).
//    5) خصم بحسب تاريخ الحوادث
//       Apply accident penalty.
//    6) مكافأة/عقوبة الطلب على الموديل (Land Cruiser ↑، Malibu ↓)
//       Apply demand bonus/penalty for hot/cold models.
//    7) تقريب لأقرب 500 ر.س + هامش ثقة ±7%
//       Round to SAR 500 + attach ±7% confidence band.
// ════════════════════════════════════════════════════════════════════

/**
 * ملفّات تعريف الإهلاك لكل ماركة (مُعايَرة يدوياً وفق السوق السعودي).
 * Per-brand depreciation profiles (manually calibrated against KSA market).
 *
 * Fields:
 *   firstYear : نسبة الإهلاك في السنة الأولى | Year-1 depreciation %
 *   annual    : معدّل الإهلاك السنوي بعد السنة الأولى | Subsequent yearly rate
 *   floor     : أدنى قيمة متبقية | Lowest residual fraction allowed
 *   resale    : وصف نوعي لقدرة الماركة على الاحتفاظ بقيمتها | UI resale label
 */
const BRAND_PROFILES = {
  // ── Japanese (يحتفظون بقيمتهم بشكل ممتاز في السعودية) ────────
  Toyota:          { firstYear: 0.08, annual: 0.05, floor: 0.45, resale: 'Excellent' },
  Lexus:           { firstYear: 0.12, annual: 0.08, floor: 0.38, resale: 'Excellent' },
  Honda:           { firstYear: 0.08, annual: 0.05, floor: 0.45, resale: 'Very Good' },
  Mazda:           { firstYear: 0.09, annual: 0.06, floor: 0.38, resale: 'Very Good' },
  Nissan:          { firstYear: 0.08, annual: 0.05, floor: 0.45, resale: 'Good' },
  Mitsubishi:      { firstYear: 0.06, annual: 0.04, floor: 0.50, resale: 'Good' },
  Suzuki:          { firstYear: 0.04, annual: 0.03, floor: 0.50, resale: 'Good' },
  Infiniti:        { firstYear: 0.12, annual: 0.08, floor: 0.27, resale: 'Good' },
  Isuzu:           { firstYear: 0.08, annual: 0.05, floor: 0.45, resale: 'Very Good' },
  // ── Korean ──────────────────────────────────────────────────
  Hyundai:         { firstYear: 0.06, annual: 0.04, floor: 0.50, resale: 'Good' },
  KIA:             { firstYear: 0.04, annual: 0.03, floor: 0.50, resale: 'Good' },
  Genesis:         { firstYear: 0.08, annual: 0.05, floor: 0.45, resale: 'Good' },
  // ── American (الشاحنات الكبيرة مطلوبة في السعودية) ─────────────
  GMC:             { firstYear: 0.15, annual: 0.10, floor: 0.30, resale: 'Good' },
  Ford:            { firstYear: 0.06, annual: 0.04, floor: 0.50, resale: 'Good' },
  Chevrolet:       { firstYear: 0.09, annual: 0.06, floor: 0.38, resale: 'Average' },
  Cadillac:        { firstYear: 0.08, annual: 0.05, floor: 0.45, resale: 'Average' },
  Jeep:            { firstYear: 0.06, annual: 0.04, floor: 0.50, resale: 'Good' },
  Dodge:           { firstYear: 0.15, annual: 0.10, floor: 0.22, resale: 'Average' },
  Chrysler:        { firstYear: 0.18, annual: 0.12, floor: 0.20, resale: 'Below Average' },
  Lincoln:         { firstYear: 0.08, annual: 0.05, floor: 0.45, resale: 'Average' },
  // ── European ────────────────────────────────────────────────
  'Mercedes-Benz': { firstYear: 0.12, annual: 0.08, floor: 0.27, resale: 'Good' },
  BMW:             { firstYear: 0.11, annual: 0.07, floor: 0.32, resale: 'Average' },
  Audi:            { firstYear: 0.09, annual: 0.06, floor: 0.38, resale: 'Average' },
  Volkswagen:      { firstYear: 0.12, annual: 0.08, floor: 0.27, resale: 'Average' },
  // ── Chinese (إهلاك أعلى عموماً لكن بعض الماركات قاومت) ──────
  // ملاحظة: Changan/Haval/Geely تحتفظ بقيمتها أفضل من المتوقع.
  // Note: Changan/Haval/Geely hold value better than expected.
  BYD:             { firstYear: 0.20, annual: 0.13, floor: 0.18, resale: 'Below Average' },
  Changan:         { firstYear: 0.04, annual: 0.03, floor: 0.50, resale: 'Average' },
  Chery:           { firstYear: 0.14, annual: 0.09, floor: 0.25, resale: 'Below Average' },
  Geely:           { firstYear: 0.04, annual: 0.03, floor: 0.50, resale: 'Average' },
  Haval:           { firstYear: 0.04, annual: 0.03, floor: 0.50, resale: 'Average' },
  Jetour:          { firstYear: 0.04, annual: 0.03, floor: 0.50, resale: 'Average' },
  MG:              { firstYear: 0.04, annual: 0.03, floor: 0.50, resale: 'Average' },
};

/**
 * ملف افتراضي يُستخدم عند عدم وجود الماركة في BRAND_PROFILES.
 * Default profile used when a brand isn't listed above.
 */
const DEFAULT_PROFILE = { firstYear: 0.10, annual: 0.07, floor: 0.35, resale: 'Average' };

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ calcAgeFactor — احتساب معامل الإهلاك بسبب عمر السيارة         │
 * │ Calculate the age-based depreciation multiplier.             │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Formula:                                                     │
 * │   age = 0  → mult = 1.0  (سيارة جديدة | brand new)            │
 * │   age = 1  → mult = (1 − firstYear)                          │
 * │   age > 1  → (1 − firstYear) × (1 − annual)^(age−1)          │
 * │   ثم: clamp إلى floor الخاص بالماركة                          │
 * │                                                              │
 * │ Parameters:                                                  │
 * │   make: String — اسم الماركة لاختيار الـ profile               │
 * │   age:  Number — عمر السيارة بالسنوات                          │
 * │ Returns: { mult: Number, label: String, pct: Number }        │
 * └─────────────────────────────────────────────────────────────┘
 */
function calcAgeFactor(make, age) {
  // ─ Edge case: سيارة سنة الإنتاج الحالية → بدون إهلاك
  if (age <= 0) return { mult: 1.0, label: 'Brand New (2026)', pct: 0 };

  const p = BRAND_PROFILES[make] || DEFAULT_PROFILE;

  // ─ السنة الأولى تستخدم النسبة الأكبر (firstYear)
  let mult = age === 1
    ? (1 - p.firstYear)
    : (1 - p.firstYear) * Math.pow(1 - p.annual, age - 1);

  // ─ منع المضاعف من النزول تحت floor الماركة (واقعية السوق)
  mult = Math.max(mult, p.floor);

  const pct = Math.round((1 - mult) * 100);
  return { mult, label: `${age} year${age > 1 ? 's' : ''} old (-${pct}%)`, pct };
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ calcTrimFactor — معامل التعديل بحسب الفئة (التريم)             │
 * │ Trim-level multiplier — top trims keep value better.         │
 * ├─────────────────────────────────────────────────────────────┤
 * │ المنطق:                                                      │
 * │   Top  (Platinum/VIP/Limited)  → mult 1.05  +5%             │
 * │   Sport/Premium                → mult 1.00   0%             │
 * │   Mid  (SE/XLE/Plus)           → mult 0.95  -5%             │
 * │   Base (LE/LX/Standard)        → mult 0.88 -12%             │
 * │                                                              │
 * │ Parameters:                                                  │
 * │   trimStr: String — اسم الفئة                                 │
 * │ Returns: { mult, label, impact }                             │
 * └─────────────────────────────────────────────────────────────┘
 */
function calcTrimFactor(trimStr) {
  const t = (trimStr || '').toLowerCase();
  if (/\b(full|platinum|vip|limited|night|edition|ultimate|titanium|signature|prestige)\b/.test(t))
    return { mult: 1.05, label: 'Top Trim (+5%)', impact: 'positive' };
  if (/\b(sport|premium|luxury|ex|touring|gt|trd|nismo|rs|amg|m.sport|f.sport)\b/.test(t))
    return { mult: 1.00, label: 'Sport/Premium (±0%)', impact: 'neutral' };
  if (/\b(mid|plus|se|xle|glx|gle|sv|gl)\b/.test(t))
    return { mult: 0.95, label: 'Mid Trim (-5%)', impact: 'negative' };
  if (/\b(base|standard|lx|le)\b/.test(t) || t.length <= 2)
    return { mult: 0.88, label: 'Base Trim (-12%)', impact: 'negative' };
  // ─ غير معروف → اعتبارها متوسطة احتياطاً
  return { mult: 0.95, label: 'Standard Trim (-5%)', impact: 'negative' };
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ calcMileageFactor — معامل الإهلاك بسبب الكيلومترات             │
 * │ Mileage-based depreciation multiplier vs KSA average.        │
 * ├─────────────────────────────────────────────────────────────┤
 * │ الصيغة | Formula:                                            │
 * │   mult = max(0.28, 1 − rate × (km/10000)^0.85)               │
 * │ الأس 0.85 لإحداث "تناقص في الأثر" مع زيادة الكيلومترات        │
 * │ The 0.85 exponent gives diminishing-returns at high mileage. │
 * │                                                              │
 * │ Parameters:                                                  │
 * │   km:   Number — قراءة العداد بالكيلومتر                      │
 * │   make: String — لاختيار rate الخاص بالماركة                   │
 * │   age:  Number — عمر السيارة لتحديد المتوقع                    │
 * │ Returns: { mult, label, impact }                             │
 * └─────────────────────────────────────────────────────────────┘
 */
function calcMileageFactor(km, make, age) {
  km = parseInt(km) || 0;

  if (km === 0 && age <= 0) return { mult: 1.0, label: 'Zero KM', impact: 'positive' };

  // ─ متوسط القيادة السنوي في السعودية = 22,000 km/year
  const expectedKm = Math.max(age, 1) * 22000;
  const ratio      = km / Math.max(expectedKm, 1);

  // ─ معدّلات الإهلاك لكل ماركة (لكل 10,000 km)
  const rates = {
    Toyota: 0.016, Lexus: 0.015, Honda: 0.017, Mazda: 0.018,
    Nissan: 0.019, Mitsubishi: 0.019, Isuzu: 0.017,
    Hyundai: 0.019, KIA: 0.019, Genesis: 0.018,
    GMC: 0.017, Ford: 0.018, Chevrolet: 0.020,
    Jeep: 0.020, Dodge: 0.021, Cadillac: 0.021,
    'Mercedes-Benz': 0.019, BMW: 0.020, Audi: 0.021, Volkswagen: 0.020,
    BYD: 0.022, Changan: 0.018, Chery: 0.022, Geely: 0.016,
    Haval: 0.016, Jetour: 0.018, MG: 0.018,
  };
  const rate  = rates[make] || 0.020;
  const units = km / 10000;
  // ─ حد أدنى 0.28 لمنع التقدير من النزول لقيم سخيفة
  const mult  = Math.max(0.28, 1 - (rate * Math.pow(units, 0.85)));

  // ─ تصنيف وصفي للكيلومترات بالنسبة للمتوقع
  let label, impact;
  if (km === 0)          { label = '0 km (Unused)';                                impact = 'positive'; }
  else if (ratio < 0.5)  { label = `Very Low KM (${km.toLocaleString()} km)`;     impact = 'positive'; }
  else if (ratio < 0.85) { label = `Low KM (${km.toLocaleString()} km)`;          impact = 'positive'; }
  else if (ratio < 1.15) { label = `Average KM (${km.toLocaleString()} km)`;      impact = 'neutral';  }
  else if (ratio < 1.6)  { label = `Above Average (${km.toLocaleString()} km)`;   impact = 'negative'; }
  else if (km < 80000)   { label = `High KM (${km.toLocaleString()} km)`;         impact = 'negative'; }
  else if (km < 150000)  { label = `Very High KM (${km.toLocaleString()} km)`;    impact = 'negative'; }
  else                   { label = `Extreme KM (${km.toLocaleString()} km)`;      impact = 'negative'; }

  return { mult, label, impact };
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ calcAccidentFactor — معامل العقوبة بسبب الحوادث               │
 * │ Accident penalty multiplier — KSA market is strict on damage.│
 * ├─────────────────────────────────────────────────────────────┤
 * │ none   → 1.00  (نظيف)                                        │
 * │ minor  → 0.85  (-15%)                                        │
 * │ medium → 0.68  (-32%)                                        │
 * │ major  → 0.48  (-52%) — الحوادث الكبيرة تُخفّض السعر للنصف     │
 * │                                                              │
 * │ Parameters:                                                  │
 * │   level: String — أحد المستويات الأربعة                       │
 * │ Returns: { mult, label, impact }                             │
 * └─────────────────────────────────────────────────────────────┘
 */
function calcAccidentFactor(level) {
  const m = {
    none:   { mult: 1.00, label: 'Clean — No Accidents',  impact: 'positive' },
    minor:  { mult: 0.85, label: 'Minor Damage (-15%)',   impact: 'negative' },
    medium: { mult: 0.68, label: 'Medium Damage (-32%)',  impact: 'negative' },
    major:  { mult: 0.48, label: 'Major Damage (-52%)',   impact: 'negative' },
  };
  // ─ مستوى غير معروف → نعتبره "نظيف" (لا نُعاقب المستخدم)
  return m[level] || m.none;
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ calcDemandFactor — مكافأة الطلب المرتفع أو عقوبة الطلب الضعيف │
 * │ Apply demand bonus/penalty for specific hot/cold models.     │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Hot   models (Land Cruiser/Patrol/…)  → mult 1.08  +8%       │
 * │ Low   models (Malibu/Aveo/…)          → mult 0.93  -7%       │
 * │ Other                                  → mult 1.00            │
 * │                                                              │
 * │ Parameters:                                                  │
 * │   make:  String — الماركة (محفوظ لاستخدام مستقبلي)            │
 * │   model: String — اسم الموديل                                 │
 * │ Returns: { mult, label, impact }                             │
 * └─────────────────────────────────────────────────────────────┘
 */
function calcDemandFactor(make, model) {
  const hotModels = ['Land Cruiser','Patrol','Camry','Corolla','Fortuner','Hilux','Prado','4Runner'];
  const lowModels = ['Malibu','Impala','Captiva','Aveo'];
  if (hotModels.includes(model))
    return { mult: 1.08, label: 'Very High Demand (+8%)', impact: 'positive' };
  if (lowModels.includes(model))
    return { mult: 0.93, label: 'Low Market Demand (-7%)', impact: 'negative' };
  return { mult: 1.0, label: 'Normal Market Demand', impact: 'neutral' };
}

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ estimatePrice — الدالة الرئيسية: تجميع المعاملات وإخراج التقدير│
 * │ MAIN PIPELINE — combine factors and return estimation result.│
 * ├─────────────────────────────────────────────────────────────┤
 * │ Pipeline:                                                    │
 * │   raw = agencyPrice × ageFactor × trimFactor × mileageFactor │
 * │       × accidentFactor × demandFactor                        │
 * │   estimatedPrice = round(raw / 500) × 500                    │
 * │   rangeLow/High  = ±7% of raw, rounded to 500                │
 * │                                                              │
 * │ Parameters: params: {                                        │
 * │   make:     String   — الماركة (مطلوب)                         │
 * │   model:    String   — الموديل (مطلوب)                         │
 * │   trim:     String?  — الفئة (اختياري)                         │
 * │   year:     Number?  — سنة الصنع                              │
 * │   mileage:  Number?  — الكيلومترات                            │
 * │   accident: String?  — none|minor|medium|major                │
 * │ }                                                            │
 * │                                                              │
 * │ Returns: Object — يحوي السعر، النطاق، نسبة الاحتفاظ، التفاصيل │
 * │          null   — إذا لم تكن السيارة في قاعدة البيانات        │
 * └─────────────────────────────────────────────────────────────┘
 */
export function estimatePrice({ make, model, trim, year, mileage, accident }) {
  // ─ Step 1: البحث عن السيارة | Look up the car
  const car = findCar(make, model, trim || null);
  if (!car || !car.Agency_Price) return null;

  const agencyPrice = car.Agency_Price;
  const currentYear = new Date().getFullYear();
  const carYear     = parseInt(year) || currentYear;
  // ─ نسمح بسنة المستقبل (سنة قادمة) ونعتبرها age=0
  const age         = Math.max(0, currentYear - carYear);

  // ─ Step 2: احتساب كل المعاملات | Compute all factors
  const profile        = BRAND_PROFILES[make] || DEFAULT_PROFILE;
  const ageFactor      = calcAgeFactor(make, age);
  const trimFactor     = calcTrimFactor(trim || car.Trim || '');
  const mileageFactor  = calcMileageFactor(mileage, make, age);
  const accidentFactor = calcAccidentFactor(accident || 'none');
  const demandFactor   = calcDemandFactor(make, model);

  // ─ Step 3: تطبيق المعاملات تتابعياً | Apply factors multiplicatively
  const raw = agencyPrice
    * ageFactor.mult
    * trimFactor.mult
    * mileageFactor.mult
    * accidentFactor.mult
    * demandFactor.mult;

  // ─ Step 4: هامش ثقة ±7% للسعر التقديري | ±7% confidence margin
  const margin = raw * 0.07;

  return {
    agencyPrice,
    // التقريب لأقرب 500 ر.س (ممارسة شائعة في السوق السعودي)
    estimatedPrice: Math.round(raw / 500) * 500,
    rangeLow:       Math.round((raw - margin) / 500) * 500,
    rangeHigh:      Math.round((raw + margin) / 500) * 500,
    retentionPct:   Math.round((raw / agencyPrice) * 100),

    // تفصيل المعاملات لعرضها في بطاقة النتيجة
    factors: {
      brand:    { label: 'Brand Resale',        value: profile.resale,       impact: ['Excellent','Very Good'].includes(profile.resale) ? 'positive' : profile.resale === 'Poor' ? 'negative' : 'neutral' },
      age:      { label: 'Age Depreciation',    value: ageFactor.label,      impact: ageFactor.pct > 0 ? 'negative' : 'neutral' },
      trim:     { label: 'Trim Level',          value: trimFactor.label,     impact: trimFactor.impact },
      mileage:  { label: 'Mileage',             value: mileageFactor.label,  impact: mileageFactor.impact },
      accident: { label: 'Condition / History', value: accidentFactor.label, impact: accidentFactor.impact },
      demand:   { label: 'Market Demand',       value: demandFactor.label,   impact: demandFactor.impact },
    },
    car,
  };
}


// ─────────────────────────────────────────────────────────────────────
//  SECTION 4 — أدوات مساعدة | UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ formatPrice — تنسيق الأرقام بفواصل الآلاف                     │
 * │ Format number as locale-aware string with thousand separators.│
 * ├─────────────────────────────────────────────────────────────┤
 * │ Parameters:                                                  │
 * │   num: Number — القيمة الأصلية                                │
 * │ Returns: String — مثال: 122300 → "122,300"                   │
 * └─────────────────────────────────────────────────────────────┘
 */
export function formatPrice(num) {
  return Math.round(num || 0).toLocaleString('en-SA');
}
