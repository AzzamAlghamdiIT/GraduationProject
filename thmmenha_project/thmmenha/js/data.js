// ============================================================
//  data.js — Car dataset + Price Estimation Engine
// ============================================================

let CAR_DATA = [];

export async function loadCarData() {
  try {
    const res = await fetch('./data/cars.json');
    CAR_DATA = await res.json();
    return CAR_DATA;
  } catch (e) {
    console.error('Failed to load car data:', e);
    return [];
  }
}

export function getCarData() { return CAR_DATA; }

// ── Unique Makes ─────────────────────────────────────────────
export function getMakes() {
  return [...new Set(CAR_DATA.map(c => c.Make))].sort();
}

// ── Models for a given Make ──────────────────────────────────
export function getModels(make) {
  return [...new Set(
    CAR_DATA.filter(c => c.Make === make).map(c => c.Model)
  )].sort();
}

// ── Trims for Make + Model ───────────────────────────────────
export function getTrims(make, model) {
  return [...new Set(
    CAR_DATA.filter(c => c.Make === make && c.Model === model).map(c => c.Trim)
  )];
}

// ── Lookup single car ────────────────────────────────────────
export function findCar(make, model, trim) {
  return CAR_DATA.find(c =>
    c.Make === make && c.Model === model && (trim ? c.Trim === trim : true)
  ) || null;
}

// ── Car Types ────────────────────────────────────────────────
export function getTypes() {
  const raw = [...new Set(CAR_DATA.map(c => c.Type))].sort();
  // Consolidate related types for UX
  return raw;
}

// ── Budget Search ────────────────────────────────────────────
export function findByBudget(minPrice, maxPrice, type = '') {
  return CAR_DATA.filter(c => {
    const price = parseInt(c.Agency_Price);
    const inBudget = price >= minPrice && price <= maxPrice;
    const matchType = !type || c.Type === type || c.Type.includes(type);
    return inBudget && matchType;
  }).sort((a, b) => parseInt(a.Agency_Price) - parseInt(b.Agency_Price));
}

// ============================================================
//  PRICE ESTIMATION ENGINE
// ============================================================

/**
 * Brand depreciation profiles (annual % of remaining value lost)
 */
const BRAND_DEPRECIATION = {
  // Japanese — strong resale
  Toyota:    { base: 0.10, label: 'Excellent' },
  Lexus:     { base: 0.09, label: 'Excellent' },
  Honda:     { base: 0.11, label: 'Very Good' },
  Mazda:     { base: 0.12, label: 'Very Good' },
  Nissan:    { base: 0.13, label: 'Good' },
  Mitsubishi:{ base: 0.13, label: 'Good' },
  Suzuki:    { base: 0.13, label: 'Good' },
  Infiniti:  { base: 0.14, label: 'Good' },
  Isuzu:     { base: 0.12, label: 'Good' },
  // Korean — moderate
  Hyundai:   { base: 0.14, label: 'Good' },
  KIA:       { base: 0.14, label: 'Good' },
  Genesis:   { base: 0.13, label: 'Good' },
  // American — medium-high
  Ford:      { base: 0.15, label: 'Average' },
  Chevrolet: { base: 0.16, label: 'Average' },
  GMC:       { base: 0.15, label: 'Average' },
  Jeep:      { base: 0.16, label: 'Average' },
  Dodge:     { base: 0.17, label: 'Average' },
  Chrysler:  { base: 0.18, label: 'Below Average' },
  Cadillac:  { base: 0.17, label: 'Average' },
  Lincoln:   { base: 0.17, label: 'Average' },
  // European
  'Mercedes-Benz': { base: 0.15, label: 'Average' },
  BMW:        { base: 0.16, label: 'Average' },
  Audi:       { base: 0.17, label: 'Average' },
  Volkswagen: { base: 0.16, label: 'Average' },
  // Chinese — high depreciation
  BYD:     { base: 0.22, label: 'Poor' },
  Changan: { base: 0.23, label: 'Poor' },
  Chery:   { base: 0.24, label: 'Poor' },
  Geely:   { base: 0.23, label: 'Poor' },
  Haval:   { base: 0.22, label: 'Poor' },
  Jetour:  { base: 0.24, label: 'Poor' },
  MG:      { base: 0.21, label: 'Below Average' },
};

const DEFAULT_DEPRECIATION = { base: 0.16, label: 'Average' };

/**
 * Trim factor — Full trims hold value better
 */
function getTrimFactor(trimStr) {
  const t = (trimStr || '').toLowerCase();
  if (t.includes('full') || t.includes('platinum') || t.includes('limited') ||
      t.includes('premium') || t.includes('sport') || t.includes('luxury') ||
      t.includes('titanium') || t.includes('ultimate') || t.includes('nismo'))
    return { mult: 1.0, label: 'Top Trim (+0%)' };
  if (t.includes('mid') || t.includes('plus') || t.includes('ex') ||
      t.includes('se') || t.includes('gt') || t.includes('touring'))
    return { mult: 0.95, label: 'Mid Trim (-5%)' };
  // Standard / base
  return { mult: 0.90, label: 'Base Trim (-10%)' };
}

/**
 * Mileage depreciation — every 10k km reduces value
 */
function getMileageFactor(mileage, make) {
  const km = parseInt(mileage) || 0;
  if (km === 0) return { mult: 1.0, label: '0 km (New)' };

  // Per-10k-km depreciation rate
  const rates = {
    Toyota: 0.018, Lexus: 0.016, Honda: 0.019, Mazda: 0.020,
    Nissan: 0.022, Mitsubishi: 0.022, Suzuki: 0.022,
    Hyundai: 0.022, KIA: 0.022, Genesis: 0.020,
    Ford: 0.024, Chevrolet: 0.025, GMC: 0.024,
    Jeep: 0.025, Dodge: 0.026, Chrysler: 0.027,
    'Mercedes-Benz': 0.022, BMW: 0.023, Audi: 0.024, Volkswagen: 0.023,
    BYD: 0.030, Changan: 0.032, Chery: 0.033, Geely: 0.031, Haval: 0.030,
    MG: 0.028, Jetour: 0.033,
  };
  const rate = rates[make] || 0.024;
  const units = km / 10000;
  // Diminishing returns — first 10k has most impact
  const mult = Math.max(0.35, 1 - (rate * units * Math.pow(0.95, units)));

  const label = km >= 100000 ? 'Very High Mileage' :
                km >= 60000  ? 'High Mileage' :
                km >= 30000  ? 'Moderate Mileage' : 'Low Mileage';

  return { mult, label: `${label} (${km.toLocaleString()} km)` };
}

/**
 * Accident factor
 */
function getAccidentFactor(level) {
  const map = {
    none:   { mult: 1.00, label: 'No Accidents', impact: 'positive' },
    minor:  { mult: 0.88, label: 'Minor Accident (-12%)', impact: 'negative' },
    medium: { mult: 0.72, label: 'Medium Accident (-28%)', impact: 'negative' },
    major:  { mult: 0.52, label: 'Major Accident (-48%)', impact: 'negative' },
  };
  return map[level] || map.none;
}

/**
 * Yearly depreciation using declining-balance method
 * age = current year - car year
 */
function getYearlyDepreciation(make, age) {
  if (age <= 0) return { mult: 1.0, label: 'New (2026)', pct: 0 };
  const profile = BRAND_DEPRECIATION[make] || DEFAULT_DEPRECIATION;
  const rate = profile.base;
  // Declining balance: value = (1 - rate)^age
  const mult = Math.pow(1 - rate, age);
  const pct = Math.round((1 - mult) * 100);
  return { mult, label: `${age} yr${age > 1 ? 's' : ''} old (-${pct}%)`, pct };
}

/**
 * Main estimation function
 */
export function estimatePrice({ make, model, trim, year, mileage, accident }) {
  const car = findCar(make, model, trim || null);
  if (!car) return null;

  const agencyPrice = parseInt(car.Agency_Price);
  const currentYear = 2026;
  const age = Math.max(0, currentYear - parseInt(year || currentYear));

  const brandProfile  = BRAND_DEPRECIATION[make] || DEFAULT_DEPRECIATION;
  const yearFactor    = getYearlyDepreciation(make, age);
  const trimFactor    = getTrimFactor(trim || car.Trim);
  const mileageFactor = getMileageFactor(mileage, make);
  const accidentFactor = getAccidentFactor(accident || 'none');

  // Composite price
  const estimated = agencyPrice
    * yearFactor.mult
    * trimFactor.mult
    * mileageFactor.mult
    * accidentFactor.mult;

  // Confidence margin ±6%
  const margin = estimated * 0.06;

  return {
    agencyPrice,
    estimatedPrice: Math.round(estimated),
    rangeLow:  Math.round(estimated - margin),
    rangeHigh: Math.round(estimated + margin),
    factors: {
      brand:    { label: 'Brand Resale', value: brandProfile.label, impact: 'neutral' },
      year:     { label: 'Age Depreciation', value: yearFactor.label, impact: yearFactor.pct > 0 ? 'negative' : 'neutral' },
      trim:     { label: 'Trim Level', value: trimFactor.label, impact: trimFactor.mult < 1 ? 'negative' : 'neutral' },
      mileage:  { label: 'Mileage', value: mileageFactor.label, impact: 'neutral' },
      accident: { label: 'Condition', value: accidentFactor.label, impact: accidentFactor.impact },
    },
    car,
  };
}

// ── Format SAR ───────────────────────────────────────────────
export function formatSAR(num) {
  return num.toLocaleString('en-SA');
}
