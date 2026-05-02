// ============================================================
//  data.js — Car dataset + Saudi Market Price Estimation Engine
//  v2.0 — Improved KSA-specific realistic depreciation logic
// ============================================================

let CAR_DATA = [];

export async function loadCarData() {
  try {
    const res = await fetch('./data/cars.json');
    CAR_DATA = await res.json();
    CAR_DATA = CAR_DATA.map(c => ({
      ...c,
      Agency_Price: parseInt(String(c.Agency_Price).replace(/,/g, '')) || 0
    }));
    return CAR_DATA;
  } catch (e) {
    console.error('Failed to load car data:', e);
    return [];
  }
}

export function getCarData() { return CAR_DATA; }

export function getMakes() {
  return [...new Set(CAR_DATA.map(c => c.Make))].sort();
}

export function getModels(make) {
  return [...new Set(CAR_DATA.filter(c => c.Make === make).map(c => c.Model))].sort();
}

export function getTrims(make, model) {
  return [...new Set(CAR_DATA.filter(c => c.Make === make && c.Model === model).map(c => c.Trim))];
}

export function findCar(make, model, trim) {
  if (trim) {
    const exact = CAR_DATA.find(c => c.Make === make && c.Model === model && c.Trim === trim);
    if (exact) return exact;
  }
  return CAR_DATA.find(c => c.Make === make && c.Model === model) || null;
}

export function getTypes() {
  return [...new Set(CAR_DATA.map(c => c.Type))].sort();
}

export function findByBudget(minPrice, maxPrice, type = '') {
  return CAR_DATA.filter(c => {
    const price = c.Agency_Price;
    const inBudget = price >= minPrice && price <= maxPrice;
    const matchType = !type || c.Type === type || c.Type.includes(type);
    return inBudget && matchType;
  }).sort((a, b) => a.Agency_Price - b.Agency_Price);
}

// ============================================================
//  SAUDI MARKET PRICE ESTIMATION ENGINE v2
//  KSA patterns:
//  - Year 1 drop is steep (20-32%) especially Chinese brands
//  - Toyota/Lexus hold value exceptionally well
//  - American trucks (GMC/Ford) have strong demand in KSA
//  - Chinese brands depreciate fast with low floor
//  - Accidents hit harder in KSA than Western markets
//  - High-demand models (Land Cruiser, Patrol) get a premium
// ============================================================

const BRAND_PROFILES = {
  Toyota:          { firstYear: 0.14, annual: 0.09, floor: 0.38, resale: 'Excellent' },
  Lexus:           { firstYear: 0.12, annual: 0.08, floor: 0.40, resale: 'Excellent' },
  Honda:           { firstYear: 0.16, annual: 0.10, floor: 0.35, resale: 'Very Good' },
  Mazda:           { firstYear: 0.17, annual: 0.11, floor: 0.32, resale: 'Very Good' },
  Nissan:          { firstYear: 0.18, annual: 0.12, floor: 0.30, resale: 'Good' },
  Mitsubishi:      { firstYear: 0.17, annual: 0.11, floor: 0.30, resale: 'Good' },
  Suzuki:          { firstYear: 0.18, annual: 0.12, floor: 0.28, resale: 'Good' },
  Infiniti:        { firstYear: 0.17, annual: 0.11, floor: 0.30, resale: 'Good' },
  Isuzu:           { firstYear: 0.15, annual: 0.10, floor: 0.35, resale: 'Very Good' },
  Hyundai:         { firstYear: 0.18, annual: 0.12, floor: 0.28, resale: 'Good' },
  KIA:             { firstYear: 0.18, annual: 0.12, floor: 0.28, resale: 'Good' },
  Genesis:         { firstYear: 0.17, annual: 0.11, floor: 0.30, resale: 'Good' },
  GMC:             { firstYear: 0.15, annual: 0.10, floor: 0.36, resale: 'Good' },
  Ford:            { firstYear: 0.16, annual: 0.11, floor: 0.32, resale: 'Good' },
  Chevrolet:       { firstYear: 0.18, annual: 0.13, floor: 0.28, resale: 'Average' },
  Cadillac:        { firstYear: 0.20, annual: 0.14, floor: 0.25, resale: 'Average' },
  Jeep:            { firstYear: 0.19, annual: 0.13, floor: 0.26, resale: 'Average' },
  Dodge:           { firstYear: 0.21, annual: 0.14, floor: 0.24, resale: 'Below Average' },
  Chrysler:        { firstYear: 0.22, annual: 0.15, floor: 0.22, resale: 'Poor' },
  Lincoln:         { firstYear: 0.21, annual: 0.14, floor: 0.24, resale: 'Below Average' },
  'Mercedes-Benz': { firstYear: 0.16, annual: 0.11, floor: 0.32, resale: 'Good' },
  BMW:             { firstYear: 0.18, annual: 0.13, floor: 0.28, resale: 'Average' },
  Audi:            { firstYear: 0.20, annual: 0.14, floor: 0.25, resale: 'Average' },
  Volkswagen:      { firstYear: 0.19, annual: 0.13, floor: 0.26, resale: 'Average' },
  BYD:             { firstYear: 0.28, annual: 0.18, floor: 0.18, resale: 'Poor' },
  Changan:         { firstYear: 0.30, annual: 0.19, floor: 0.16, resale: 'Poor' },
  Chery:           { firstYear: 0.32, annual: 0.20, floor: 0.15, resale: 'Poor' },
  Geely:           { firstYear: 0.30, annual: 0.19, floor: 0.16, resale: 'Poor' },
  Haval:           { firstYear: 0.28, annual: 0.18, floor: 0.18, resale: 'Poor' },
  Jetour:          { firstYear: 0.32, annual: 0.21, floor: 0.14, resale: 'Poor' },
  MG:              { firstYear: 0.26, annual: 0.17, floor: 0.20, resale: 'Below Average' },
};

const DEFAULT_PROFILE = { firstYear: 0.19, annual: 0.13, floor: 0.27, resale: 'Average' };

function calcAgeFactor(make, age) {
  if (age <= 0) return { mult: 1.0, label: 'Brand New (2026)', pct: 0 };
  const p = BRAND_PROFILES[make] || DEFAULT_PROFILE;
  let mult = age === 1
    ? (1 - p.firstYear)
    : (1 - p.firstYear) * Math.pow(1 - p.annual, age - 1);
  mult = Math.max(mult, p.floor);
  const pct = Math.round((1 - mult) * 100);
  return { mult, label: `${age} year${age > 1 ? 's' : ''} old (-${pct}%)`, pct };
}

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
  return { mult: 0.95, label: 'Standard Trim (-5%)', impact: 'negative' };
}

function calcMileageFactor(km, make, age) {
  km = parseInt(km) || 0;
  if (km === 0 && age <= 0) return { mult: 1.0, label: 'Zero KM', impact: 'positive' };
  const expectedKm = Math.max(age, 1) * 22000;
  const ratio = km / Math.max(expectedKm, 1);
  const rates = {
    Toyota: 0.016, Lexus: 0.015, Honda: 0.017, Mazda: 0.018,
    Nissan: 0.019, Mitsubishi: 0.019, Isuzu: 0.017,
    Hyundai: 0.019, KIA: 0.019, Genesis: 0.018,
    GMC: 0.017, Ford: 0.018, Chevrolet: 0.020,
    Jeep: 0.020, Dodge: 0.021, Cadillac: 0.021,
    'Mercedes-Benz': 0.019, BMW: 0.020, Audi: 0.021, Volkswagen: 0.020,
    BYD: 0.027, Changan: 0.028, Chery: 0.029, Geely: 0.028,
    Haval: 0.027, Jetour: 0.029, MG: 0.025,
  };
  const rate = rates[make] || 0.020;
  const units = km / 10000;
  const mult = Math.max(0.28, 1 - (rate * Math.pow(units, 0.85)));
  let label, impact;
  if (km === 0)          { label = '0 km (Unused)';                    impact = 'positive'; }
  else if (ratio < 0.5)  { label = `Very Low KM (${km.toLocaleString()} km)`;   impact = 'positive'; }
  else if (ratio < 0.85) { label = `Low KM (${km.toLocaleString()} km)`;        impact = 'positive'; }
  else if (ratio < 1.15) { label = `Average KM (${km.toLocaleString()} km)`;    impact = 'neutral'; }
  else if (ratio < 1.6)  { label = `Above Average (${km.toLocaleString()} km)`; impact = 'negative'; }
  else if (km < 80000)   { label = `High KM (${km.toLocaleString()} km)`;       impact = 'negative'; }
  else if (km < 150000)  { label = `Very High KM (${km.toLocaleString()} km)`;  impact = 'negative'; }
  else                   { label = `Extreme KM (${km.toLocaleString()} km)`;    impact = 'negative'; }
  return { mult, label, impact };
}

function calcAccidentFactor(level) {
  const m = {
    none:   { mult: 1.00, label: 'Clean — No Accidents',  impact: 'positive' },
    minor:  { mult: 0.85, label: 'Minor Damage (-15%)',   impact: 'negative' },
    medium: { mult: 0.68, label: 'Medium Damage (-32%)',  impact: 'negative' },
    major:  { mult: 0.48, label: 'Major Damage (-52%)',   impact: 'negative' },
  };
  return m[level] || m.none;
}

function calcDemandFactor(make, model) {
  const hotModels = ['Land Cruiser','Patrol','Camry','Corolla','Fortuner','Hilux','Prado','4Runner'];
  const lowModels = ['Malibu','Impala','Captiva','Aveo'];
  if (hotModels.includes(model)) return { mult: 1.08, label: 'Very High Demand (+8%)', impact: 'positive' };
  if (lowModels.includes(model)) return { mult: 0.93, label: 'Low Market Demand (-7%)', impact: 'negative' };
  return { mult: 1.0, label: 'Normal Market Demand', impact: 'neutral' };
}

export function estimatePrice({ make, model, trim, year, mileage, accident }) {
  const car = findCar(make, model, trim || null);
  if (!car || !car.Agency_Price) return null;

  const agencyPrice = car.Agency_Price;
  const currentYear = new Date().getFullYear();
  const carYear     = parseInt(year) || currentYear;
  const age         = Math.max(0, currentYear - carYear);

  const profile       = BRAND_PROFILES[make] || DEFAULT_PROFILE;
  const ageFactor     = calcAgeFactor(make, age);
  const trimFactor    = calcTrimFactor(trim || car.Trim || '');
  const mileageFactor = calcMileageFactor(mileage, make, age);
  const accidentFactor = calcAccidentFactor(accident || 'none');
  const demandFactor  = calcDemandFactor(make, model);

  const raw = agencyPrice
    * ageFactor.mult
    * trimFactor.mult
    * mileageFactor.mult
    * accidentFactor.mult
    * demandFactor.mult;

  const margin = raw * 0.07;

  return {
    agencyPrice,
    estimatedPrice: Math.round(raw / 500) * 500,
    rangeLow:       Math.round((raw - margin) / 500) * 500,
    rangeHigh:      Math.round((raw + margin) / 500) * 500,
    retentionPct:   Math.round((raw / agencyPrice) * 100),
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

export function formatPrice(num) {
  return Math.round(num || 0).toLocaleString('en-SA');
}
