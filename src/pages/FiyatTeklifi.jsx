import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";
import bilimeviLogoAsset from "../assets/Bilimevi_logo.jpg";

// Mode tespiti: shortcode config > domain kontrolü
function detectMode() {
  if (typeof window !== "undefined") {
    if (window.BFT_CONFIG?.mode) return window.BFT_CONFIG.mode;
    const host = window.location.hostname;
    if (host.includes("vercel.app") || host.includes("localhost")) return "staff";
  }
  return "customer";
}
const APP_MODE = detectMode();

// Versiyon etiketi — hangi build'in yüklü olduğunu anlamak için
const BFT_BUILD_VERSION = "v79-pdf-danisman-tel-2026-08-20";
if (typeof window !== "undefined") {
  console.log("%c[BFT] Build: " + BFT_BUILD_VERSION, "background:#00C1DE;color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold;");
  window.__BFT_VERSION = BFT_BUILD_VERSION;
}

// Logolar: customer modda WordPress plugin assets URL'inden yüklenir
const ASSETS_URL = (typeof window !== "undefined" && window.BFT_CONFIG?.assetsUrl) || null;
// Bilimevi logosu (her sitede sabit, sağda)
// Customer (WordPress): ASSETS_URL'den. Staff (Vercel, ASSETS_URL yok): Vite import (build'e gömülü, CORS'suz).
const BILIMEVI_LOGO = ASSETS_URL
  ? ASSETS_URL + "Bilimevi_logo.jpg"
  : bilimeviLogoAsset;
// Site logosu (siteye özel, solda) — shortcode'dan: site_logo="ingilteredil_logo.png"
const SITE_LOGO_NAME = (typeof window !== "undefined" && window.BFT_CONFIG?.siteLogo && window.BFT_CONFIG.siteLogo.trim())
  ? window.BFT_CONFIG.siteLogo.trim() : null;
const SITE_LOGO = (ASSETS_URL && SITE_LOGO_NAME) ? ASSETS_URL + SITE_LOGO_NAME : null;
// Geriye dönük uyumluluk
const LOGO_URL = BILIMEVI_LOGO;

// Customer modda sabit ülke (shortcode'dan: country="İngiltere")
const FIXED_COUNTRY = (typeof window !== "undefined" && window.BFT_CONFIG?.country && window.BFT_CONFIG.country.trim())
  ? window.BFT_CONFIG.country.trim()
  : null;

// subSource ve KVKK URL (shortcode'dan, dinamik)
const SUB_SOURCE = (typeof window !== "undefined" && window.BFT_CONFIG?.subSource && window.BFT_CONFIG.subSource.trim())
  ? window.BFT_CONFIG.subSource.trim() : "ingilteredil";
const KVKK_URL = (typeof window !== "undefined" && window.BFT_CONFIG?.kvkkUrl && window.BFT_CONFIG.kvkkUrl.trim())
  ? window.BFT_CONFIG.kvkkUrl.trim() : "";

// Dial code -> ISO ülke kodu (205 ülke). Bulunamazsa code:"" gider.
const DIAL_TO_ISO = {"+1":"US", "+7":"RU", "+20":"EG", "+27":"ZA", "+30":"GR", "+31":"NL", "+32":"BE", "+33":"FR", "+34":"ES", "+36":"HU", "+39":"IT", "+40":"RO", "+41":"CH", "+43":"AT", "+44":"GB", "+45":"DK", "+46":"SE", "+47":"NO", "+48":"PL", "+49":"DE", "+51":"PE", "+52":"MX", "+53":"CU", "+54":"AR", "+55":"BR", "+56":"CL", "+57":"CO", "+58":"VE", "+60":"MY", "+61":"AU", "+62":"ID", "+63":"PH", "+64":"NZ", "+65":"SG", "+66":"TH", "+81":"JP", "+82":"KR", "+84":"VN", "+86":"CN", "+90":"TR", "+91":"IN", "+92":"PK", "+93":"AF", "+94":"LK", "+95":"MM", "+98":"IR", "+211":"SS", "+212":"MA", "+213":"DZ", "+216":"TN", "+218":"LY", "+220":"GM", "+221":"SN", "+222":"MR", "+223":"ML", "+224":"GN", "+225":"CI", "+226":"BF", "+227":"NE", "+228":"TG", "+229":"BJ", "+230":"MU", "+231":"LR", "+232":"SL", "+233":"GH", "+234":"NG", "+235":"TD", "+236":"CF", "+237":"CM", "+238":"CV", "+239":"ST", "+240":"GQ", "+241":"GA", "+242":"CG", "+243":"CD", "+244":"AO", "+245":"GW", "+246":"IO", "+248":"SC", "+249":"SD", "+250":"RW", "+251":"ET", "+252":"SO", "+253":"DJ", "+254":"KE", "+255":"TZ", "+256":"UG", "+257":"BI", "+258":"MZ", "+260":"ZM", "+261":"MG", "+262":"RE", "+263":"ZW", "+264":"NA", "+265":"MW", "+266":"LS", "+267":"BW", "+268":"SZ", "+269":"KM", "+290":"SH", "+291":"ER", "+297":"AW", "+298":"FO", "+299":"GL", "+350":"GI", "+351":"PT", "+352":"LU", "+353":"IE", "+354":"IS", "+355":"AL", "+356":"MT", "+357":"CY", "+358":"FI", "+359":"BG", "+370":"LT", "+371":"LV", "+372":"EE", "+373":"MD", "+374":"AM", "+375":"BY", "+376":"AD", "+377":"MC", "+378":"SM", "+380":"UA", "+381":"RS", "+382":"ME", "+383":"XK", "+385":"HR", "+386":"SI", "+387":"BA", "+389":"MK", "+420":"CZ", "+421":"SK", "+423":"LI", "+500":"FK", "+501":"BZ", "+502":"GT", "+503":"SV", "+504":"HN", "+505":"NI", "+506":"CR", "+507":"PA", "+508":"PM", "+509":"HT", "+590":"GP", "+591":"BO", "+592":"GY", "+593":"EC", "+594":"GF", "+595":"PY", "+596":"MQ", "+597":"SR", "+598":"UY", "+599":"CW", "+670":"TL", "+672":"NF", "+673":"BN", "+674":"NR", "+675":"PG", "+676":"TO", "+677":"SB", "+678":"VU", "+679":"FJ", "+680":"PW", "+681":"WF", "+682":"CK", "+683":"NU", "+685":"WS", "+686":"KI", "+687":"NC", "+688":"TV", "+689":"PF", "+690":"TK", "+691":"FM", "+692":"MH", "+850":"KP", "+852":"HK", "+853":"MO", "+855":"KH", "+856":"LA", "+880":"BD", "+886":"TW", "+960":"MV", "+961":"LB", "+962":"JO", "+963":"SY", "+964":"IQ", "+965":"KW", "+966":"SA", "+967":"YE", "+968":"OM", "+970":"PS", "+971":"AE", "+972":"IL", "+973":"BH", "+974":"QA", "+975":"BT", "+976":"MN", "+977":"NP", "+992":"TJ", "+993":"TM", "+994":"AZ", "+995":"GE", "+996":"KG", "+998":"UZ"};

// libphonenumber-js — lazy yüklenir (modal açılınca), sonuç cache'lenir. DIAL_TO_ISO'dan SONRA tanımlı (TDZ'den kaçınmak için).
let _phoneLib = null;
let _phoneLibLoading = null;
function loadPhoneLib() {
  if (_phoneLib) return Promise.resolve(_phoneLib);
  if (_phoneLibLoading) return _phoneLibLoading;
  _phoneLibLoading = import("libphonenumber-js")
    .then(mod => {
      _phoneLib = mod;
      // Örnek numara metadata'sını da yükle (help text için)
      import("libphonenumber-js/mobile/examples").then(ex => { _phoneExamples = ex.default || ex.examples || ex; }).catch(() => {});
      return mod;
    })
    .catch(e => { console.warn("[BFT] libphonenumber yüklenemedi:", e); _phoneLibLoading = null; return null; });
  return _phoneLibLoading;
}
function checkPhoneValid(phone, dialCode) {
  if (!_phoneLib) return null;
  const iso = DIAL_TO_ISO[dialCode];
  if (!iso) return null;
  try {
    return _phoneLib.isValidPhoneNumber((dialCode || "") + (phone || ""), iso);
  } catch (e) { return null; }
}
// Seçili ülke için örnek numara (ulusal format, dial kodu olmadan). Lib+örnek yoksa null.
let _phoneExamples = null;
function getPhoneExample(dialCode) {
  if (!_phoneLib || !_phoneExamples) return null;
  const iso = DIAL_TO_ISO[dialCode];
  if (!iso) return null;
  try {
    const ex = _phoneLib.getExampleNumber(iso, _phoneExamples);
    if (!ex) return null;
    // nationalNumber: kütüphanenin doğru ulusal numarası. Her ülke için tutarlı —
    // TR'de baştaki 0 yok (5XX...), 0'ın numaranın parçası olduğu ülkelerde (CI/BJ/GA/CG) korunur.
    // Validasyonla %100 uyumlu (kullanıcı örneği girse geçerli sayılır).
    return ex.nationalNumber;
  } catch (e) { return null; }
}


// Türkçe ülke adı -> ISO (dropdown aramada kullanılır, ~40 popüler ülke)
const COUNTRY_ALIASES = {
  "turkiye":"TR", "turkey":"TR", "ingiltere":"GB", "birlesik krallik":"GB", "uk":"GB",
  "almanya":"DE", "amerika":"US", "abd":"US", "usa":"US", "malta":"MT", "irlanda":"IE",
  "hollanda":"NL", "fransa":"FR", "italya":"IT", "ispanya":"ES", "kanada":"CA",
  "avustralya":"AU", "rusya":"RU", "cin":"CN", "japonya":"JP", "azerbaycan":"AZ",
  "kibris":"CY", "yunanistan":"GR", "bulgaristan":"BG", "gurcistan":"GE", "bae":"AE",
  "dubai":"AE", "katar":"QA", "suudi arabistan":"SA", "misir":"EG", "fas":"MA",
  "isvicre":"CH", "avusturya":"AT", "belcika":"BE", "isvec":"SE", "norvec":"NO",
  "danimarka":"DK", "polonya":"PL", "ukrayna":"UA", "romanya":"RO", "cekya":"CZ",
  "portekiz":"PT", "brezilya":"BR", "hindistan":"IN", "guney kore":"KR", "singapur":"SG",
  "malezya":"MY", "iran":"IR", "irak":"IQ", "suriye":"SY", "lubnan":"LB",
};

// Türkçe karakterleri sadeleştirip küçük harfe çevir (arama için)
function normalizeTR(s) {
  return (s || "")
    .replace(/İ/g,"i").replace(/I/g,"i").replace(/ı/g,"i")
    .replace(/Ü/g,"u").replace(/ü/g,"u").replace(/Ö/g,"o").replace(/ö/g,"o")
    .replace(/Ş/g,"s").replace(/ş/g,"s").replace(/Ç/g,"c").replace(/ç/g,"c")
    .replace(/Ğ/g,"g").replace(/ğ/g,"g")
    .toLowerCase().trim();
}

// Dropdown listesi: [{dial, iso}] — DIAL_TO_ISO'dan üretilir, +90 en üstte
const DIAL_LIST = (() => {
  const arr = Object.entries(DIAL_TO_ISO).map(([dial, iso]) => ({ dial, iso }));
  arr.sort((a,b) => a.iso === "TR" ? -1 : b.iso === "TR" ? 1 : a.dial.localeCompare(b.dial));
  return arr;
})();

// Arama filtresi: dial, iso veya Türkçe ülke adı ile eşleştir
function filterDialList(query) {
  const q = normalizeTR(query);
  if (!q) return DIAL_LIST;
  const aliasIso = COUNTRY_ALIASES[q]; // tam ülke adı eşleşmesi
  return DIAL_LIST.filter(({ dial, iso }) => {
    if (aliasIso && iso === aliasIso) return true;
    if (dial.replace("+","").includes(q.replace("+",""))) return true;
    if (normalizeTR(iso).includes(q)) return true;
    // kısmi ülke adı eşleşmesi
    for (const [name, code] of Object.entries(COUNTRY_ALIASES)) {
      if (name.includes(q) && iso === code) return true;
    }
    return false;
  });
}


// Staff (Vercel): VITE_MASTER_ID env variable'ından gelir.
// Customer (WordPress): env yok → undefined → ama proxy kullanıldığı için MASTER_ID hiç çağrılmaz.
// Literal ID YOK — hiçbir build'de kaynak koda sızmaz.
const MASTER_ID = import.meta.env.VITE_MASTER_ID;
const CYAN = "#00C1DE";

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] || "").replace(/^"|"$/g, ""); });
    return row;
  });
}

// Staff (Vercel): doğrudan gviz. Customer (WordPress): proxy (Sheet ID gizli).
// desc: { kind:"master"|"city_description"|"school", brand?, tab? } — customer için
//       staff için ayrıca sheetId + sheetName kullanılır.
async function fetchCSVStaff(sheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Sheet okunamadi: " + sheetName);
  return parseCSV(await res.text());
}

async function fetchCSVProxy(desc) {
  const endpoint = window.location.origin + "/wp-json/bilimevi/v1/data";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(desc),
  });
  const data = await res.json().catch(() => null);
  if (res.status === 429 || (data && data.rate_limited)) {
    const err = new Error("Çok fazla istek gönderildi. Lütfen birkaç saniye sonra tekrar deneyiniz.");
    err.rateLimited = true;
    throw err;
  }
  if (!data || !data.success || typeof data.csv !== "string") {
    throw new Error("Veri yüklenemedi");
  }
  return parseCSV(data.csv);
}

async function fetchNav(isStaff) {
  // Staff: doğrudan gviz (MASTER_ID kodda). Customer: proxy (ID gizli).
  const rows = isStaff
    ? await fetchCSVStaff(MASTER_ID, "master_index")
    : await fetchCSVProxy({ sheet: "master" });
  // Okul+şehir açıklamaları (city_description sekmesi); hata olursa boş geç
  let descriptions = {};
  try {
    const descRows = isStaff
      ? await fetchCSVStaff(MASTER_ID, "city_description")
      : await fetchCSVProxy({ sheet: "city_description" });
    descRows.forEach(r => {
      const brand = (r.school_brand || "").trim();
      const city = (r.city || "").trim();
      const desc = (r.description || "").trim();
      if (brand && city && desc) descriptions[`${brand}__${city}`] = desc;
    });
  } catch (e) { console.warn("[BFT] city_description okunamadı:", e); }
  const countryTR = { "UK":"İngiltere","Ireland":"İrlanda","Malta":"Malta","South Africa":"Güney Afrika","Canada":"Kanada","USA":"ABD","UAE":"BAE" };
  const languages = new Set();
  const countries = {};
  const citiesByLang = {};
  const brandsByCity = {};
  const schoolSheets = {};
  rows.forEach(row => {
    if (row.parse_status !== "approved") return;
    const { city, school_brand: brand, drive_link = "" } = row;
    const langRaw = row.language || "İngilizce";
    const countryTRName = countryTR[row.country] || row.country;
    // Staff: sheetId'yi drive_link'ten çıkar (doğrudan gviz için).
    // Customer: sheetId React'e HİÇ gelmez; sadece brand ismi tutulur (proxy alias çözer).
    if (brand && !schoolSheets[brand]) {
      if (isStaff) {
        const match = drive_link.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        const sheetId = match ? match[1] : null;
        if (sheetId) schoolSheets[brand] = { sheetId, sheetName: row.sheet_name };
      } else {
        schoolSheets[brand] = { brand, sheetName: row.sheet_name };
      }
    }
    const langs = langRaw.split(",").map(l => l.trim()).filter(Boolean);
    langs.forEach(l => {
      languages.add(l);
      if (!countries[l]) countries[l] = new Set();
      countries[l].add(countryTRName);
      if (!citiesByLang[l]) citiesByLang[l] = {};
      if (!citiesByLang[l][countryTRName]) citiesByLang[l][countryTRName] = new Set();
      citiesByLang[l][countryTRName].add(city);
      if (!brandsByCity[city]) brandsByCity[city] = new Set();
      brandsByCity[city].add(brand);
    });
  });
  const sortedLangs = [...languages].sort((a, b) => a === "İngilizce" ? -1 : b === "İngilizce" ? 1 : a.localeCompare(b));
  return {
    languages: sortedLangs,
    countries: Object.fromEntries(Object.entries(countries).map(([k,v]) => [k,[...v]])),
    citiesByLang: Object.fromEntries(Object.entries(citiesByLang).map(([l,cm]) => [l, Object.fromEntries(Object.entries(cm).map(([c,s]) => [c,[...s].sort()]))])),
    brandsByCity: Object.fromEntries(Object.entries(brandsByCity).map(([c,s]) => [c,[...s]])),
    schoolSheets,
    descriptions,
  };
}

async function fetchCityData(sheetId, city, isStaff, brand) {
  // Staff: sheetId ile doğrudan gviz. Customer: brand ile proxy (sheetId gizli).
  const key = `${isStaff ? sheetId : brand}_${city}`;
  if (!window._CITY_CACHE) window._CITY_CACHE = {};
  if (window._CITY_CACHE[key]) return window._CITY_CACHE[key];
  const getTab = (tab) => isStaff
    ? fetchCSVStaff(sheetId, tab)
    : fetchCSVProxy({ sheet: "school", brand, tab });
  try {
    const [courseRows, accRows, feeRows, transferRows, discountRows] = await Promise.all([
      getTab("courses"),
      getTab("accommodation"),
      getTab("fees"),
      getTab("transfers").catch(() => []),
      getTab("discounts").catch(() => []),
    ]);
    const courseMap = {};
    courseRows.filter(r => r.city === city).forEach(r => {
      if (!courseMap[r.course_name]) {
        courseMap[r.course_name] = {
          name: r.course_name, turkishName: (r.turkish_name || "").trim(), language: (r.language || "").trim(), type: r.program_type || "General",
          lessons: parseFloat(r.lessons_per_week) || 0, hours: parseFloat(r.hours_per_week) || 0,
          currency: r.currency, hs_supp: parseFloat(r.high_season_supplement) || 0,
          hs_start: r.high_season_start || "", hs_end: r.high_season_end || "",
          hs_cond: r.high_season_condition || "", max_weeks: r.max_weeks ? parseInt(r.max_weeks) : null,
          morning: !!(r.morning_supplement && parseFloat(r.morning_supplement) > 0),
          notes: r.notes || "", tiers: [],
        };
      }
      courseMap[r.course_name].tiers.push({ min: parseInt(r.weeks_tier_min) || 1, max: r.weeks_tier_max ? parseInt(r.weeks_tier_max) : null, price: parseFloat(r.price_per_week) || 0 });
    });
    const acc = accRows.filter(r => r.city === city).map(r => ({
      name: r.place_name, type: r.accommodation_type || "Standart", room: r.room_type || "",
      bathroom: r.bathroom_type || "", board: r.board_type || "",
      price: parseFloat(r.price_per_week) || 0, hs_price: parseFloat(r.high_season_price) || 0,
      hs_start: r.high_season_start || "", hs_end: r.high_season_end || "",
      currency: r.currency, distance: r.distance_to_school || "",
      min_weeks: r.min_weeks ? parseInt(r.min_weeks) : null, notes: r.notes || "",
    }));
    const fees = feeRows.filter(r => r.city === city).map(r => ({
      name: r.fee_name, amount: parseFloat(r.amount) || 0, currency: r.currency,
      calc_type: r.calculation_type, tier_min: r.tier_min_weeks ? parseInt(r.tier_min_weeks) : null,
      tier_max: r.tier_max_weeks ? parseInt(r.tier_max_weeks) : null, notes: r.notes || "",
      addon_type: r.addon_type || "", eligible_courses: r.eligible_courses || "",
      date_start: r.date_start || "", date_end: r.date_end || "",
      min_age: r.min_age ? parseInt(r.min_age) : null, max_age: r.max_age ? parseInt(r.max_age) : null,
    }));
    const transfers = (transferRows || []).filter(r => r.city === city).map(r => ({
      airport: r.airport_name, code: r.airport_code,
      one_way: parseFloat(r.price_one_way) || 0, two_way: parseFloat(r.price_two_way) || 0,
      currency: r.currency, notes: r.notes || "",
    }));
    const cityCountry = (courseRows.find(r => r.city === city)?.country) || "";
    const discounts = (discountRows || []).filter(r => {
      const cityList = (r.city || "").split(",").map(s => s.trim());
      const cityMatch = !r.city || r.city === "all" || cityList.includes(city);
      if (!cityMatch) return false;
      if (r.city === "all" && r.country && r.country !== "all" && cityCountry && r.country !== cityCountry) return false;
      return true;
    }).map(r => ({
      discount_type: (r.discount_type || "").trim(),
      city: r.city || "", country: r.country || "",
      reg_date_start: r.reg_date_start || "", reg_date_end: r.reg_date_end || "",
      arrival_start: r.arrival_start || "", arrival_end: r.arrival_end || "",
      min_weeks: r.min_weeks ? parseInt(r.min_weeks) : null, max_weeks: r.max_weeks ? parseInt(r.max_weeks) : null,
      notes: r.notes || "", course_name: r.course_name || "", weeks: r.weeks ? parseInt(r.weeks) : null,
      package_price: parseFloat(r.package_price) || 0, currency: r.currency || "",
      package_type: (r.package_type || "").trim(), campaign_name: r.campaign_name || "",
      includes_tr: r.includes_tr || "", includes_eng: r.includes_eng || "", excludes: r.excludes || "",
      applies_to: (r.applies_to || "").trim(), target_name: r.target_name || "",
      discount_value: parseFloat(r.discount_value) || 0, value_type: (r.value_type || "").trim(),
      eligible_courses: r.eligible_courses || "", excluded_courses: r.excluded_courses || "",
    }));
    const result = { courses: Object.values(courseMap), acc, fees, transfers, discounts };
    window._CITY_CACHE[key] = result;
    return result;
  } catch (e) {
    console.error("fetchCityData error:", e);
    return { courses: [], acc: [], fees: [], transfers: [], discounts: [] };
  }
}

function getPrice(course, weeks) {
  if (!course?.tiers) return 0;
  const tier = course.tiers.find(t => weeks >= t.min && (t.max === null || weeks <= t.max));
  return tier ? tier.price * weeks : 0;
}
function isCourseValid(course, weeks) { return course?.tiers?.some(t => weeks >= t.min && (t.max === null || weeks <= t.max)); }

function getHighSeasonSupplement(course, weeks, startDate) {
  if (!course?.hs_supp || !course?.hs_start || !course?.hs_end) return { amount: 0, isActive: false };
  const start = new Date(startDate), hsStart = new Date(course.hs_start), hsEnd = new Date(course.hs_end);
  let isActive = start >= hsStart && start <= hsEnd;
  if (course.hs_cond === "weeks_less_than_12" && weeks >= 12) isActive = false;
  if (course.max_weeks && weeks > course.max_weeks) isActive = false;
  return { amount: isActive ? course.hs_supp * weeks : 0, isActive, supplementPerWeek: course.hs_supp, startDate: course.hs_start, endDate: course.hs_end };
}

function getAccommodationHighSeasonSupplement(acc, weeks, startDate) {
  if (!acc?.hs_price || !acc?.hs_start || !acc?.hs_end || acc.hs_price === acc.price) return { amount: 0, isActive: false, supplementPerWeek: 0 };
  const start = new Date(startDate), hsStart = new Date(acc.hs_start), hsEnd = new Date(acc.hs_end);
  let isActive = start >= hsStart && start <= hsEnd;
  if (acc.min_weeks && weeks < acc.min_weeks) isActive = false;
  const supplementPerWeek = isActive ? (acc.hs_price - acc.price) : 0;
  return { amount: supplementPerWeek * weeks, isActive, supplementPerWeek, startDate: acc.hs_start, endDate: acc.hs_end, hsPrice: acc.hs_price, basePrice: acc.price };
}

function getTotalCoursePrice(course, weeks, startDate) {
  const basePrice = getPrice(course, weeks);
  const hs = getHighSeasonSupplement(course, weeks, startDate);
  return { basePrice, hsAmount: hs.amount, totalPrice: basePrice + hs.amount, hsActive: hs.isActive, hsPerWeek: hs.supplementPerWeek, hsStart: hs.startDate, hsEnd: hs.endDate };
}

function getTotalAccommodationPrice(acc, weeks, startDate) {
  if (!acc) return { basePrice: 0, hsAmount: 0, totalPrice: 0, hsActive: false };
  const basePrice = acc.price * weeks;
  const hs = getAccommodationHighSeasonSupplement(acc, weeks, startDate);
  return { basePrice, hsAmount: hs.amount, totalPrice: basePrice + hs.amount, hsActive: hs.isActive, hsPerWeek: hs.supplementPerWeek, hsStart: hs.startDate, hsEnd: hs.endDate, hsPrice: hs.hsPrice };
}

const FEE_NAME_MAP = {
  "Registration Fee": "Kayıt Ücreti",
  "Course Registration": "Kayıt Ücreti",
  "Course Registration Fee": "Kayıt Ücreti",
  "Administration Fee": "Kayıt Ücreti",
  "Application Fee": "Kayıt Ücreti",
  "Enrolment Fee": "Kayıt Ücreti",
  "Accommodation Booking Fee": "Konaklama Ayarlama Ücreti",
  "Accommodation Placement": "Konaklama Ayarlama Ücreti",
  "Accommodation Placement Fee": "Konaklama Ayarlama Ücreti",
  "Host Family Placement Fee": "Konaklama Ayarlama Ücreti",
  "Residence Service Fee": "Konaklama Ayarlama Ücreti",
  "Course Materials": "Materyal / Kitap Ücreti",
  "Course Materials Fee": "Materyal / Kitap Ücreti",
  "Materials Fee": "Materyal / Kitap Ücreti",
  "Text Book": "Materyal / Kitap Ücreti",
  "Teaching Materials": "Materyal / Kitap Ücreti",
  "Insurance": "Sigorta Ücreti",
  "Student Insurance": "Sigorta Ücreti",
  "Medical & Travel Insurance": "Sigorta Ücreti",
  "Liability, accident & health insurance": "Sigorta Ücreti",
  "Medical Insurance (16-69)": "Sigorta Ücreti",
  "Weekly Accident/Health Insurance": "Sigorta Ücreti",
  "Courier Documents": "Evrak Kargo / Posta Ücreti",
  "Courier Service": "Evrak Kargo / Posta Ücreti",
  "Courier Fee": "Evrak Kargo / Posta Ücreti",
  "Visa Document Courier Fee": "Evrak Kargo / Posta Ücreti",
  "I-20 Document Courier Fee": "Evrak Kargo / Posta Ücreti",
  "Bank Charges": "Banka Havale Ücreti",
  "Bank Transfer Fee": "Banka Havale Ücreti",
  "Homestay U18 Supplement": "Reşit Olmayan (18 Altı) Ek Ücreti",
  "Unaccompanied Minor Fee": "Reşit Olmayan (18 Altı) Ek Ücreti",
  "Special Diet Supplement": "Özel Diyet Ek Ücreti",
  "Homestay Special Dietary Requirements": "Özel Diyet Ek Ücreti",
  "Homestay Special Diet Supplement": "Özel Diyet Ek Ücreti",
  "Specific Diet Supplement - 7/14 Meals": "Özel Diyet Ek Ücreti",
  "Homestay Christmas Supplement": "Noel Dönemi Ek Ücreti",
  "Christmas Supplement": "Noel Dönemi Ek Ücreti",
  "Homestay End of Year Supplement": "Noel Dönemi Ek Ücreti",
  "One-to-One Lessons": "Birebir Özel Ders Ücreti",
  "Private Lessons 1-4 / 5-9 / 10+ hrs": "Birebir Özel Ders Ücreti",
  "1-2-1 Private Lesson (55 min)": "Birebir Özel Ders Ücreti",
  "University Placement (8-15 / 16-23 / >23 wks)": "Üniversite Yerleştirme Ücreti",
  "University Placement Service": "Üniversite Yerleştirme Ücreti",
  "US College Preparation Course": "Üniversite Yerleştirme Ücreti",
  "Internship Placement Fee": "Staj Yerleştirme Ücreti",
  "Internship Programme Placement Fee": "Staj Yerleştirme Ücreti",
  "Tuition Summer Supplement": "Yaz Dönemi Ek Ücreti",
  "Homestay Summer Supplement": "Yaz Dönemi Ek Ücreti",
  "Residence Summer Supplement": "Yaz Dönemi Ek Ücreti",
  "Tuition Peak Season Supplement": "Yüksek Sezon Ek Ücreti",
  "Homestay Peak Season Supplement": "Yüksek Sezon Ek Ücreti",
  "Residence Peak Season Supplement": "Yüksek Sezon Ek Ücreti",
  "Residence Deposit": "Depozito / Teminat Ücreti",
  "Student Apartment Deposit": "Depozito / Teminat Ücreti",
  "Homestay Deposit": "Depozito / Teminat Ücreti",
  "Examination Deposit": "Depozito / Teminat Ücreti",
  "Residence Cleaning Fee": "Temizlik Ücreti",
  "Student Apartment Cleaning Fee": "Temizlik Ücreti",
  "Change Fee": "Değişiklik / İptal Ücreti",
  "Assisted Check-in Fee": "Değişiklik / İptal Ücreti",
  "Residence Room Move Fee": "Değişiklik / İptal Ücreti",
  "IELTS Exam Fee": "Sınav Ücreti",
  "Cambridge Exam Fee": "Sınav Ücreti",
  "180-day Visa Application Fee": "Vize Başvuru Ücreti",
  "Visa Administration Fee (in-country extension)": "Vize Başvuru Ücreti",
  "Visa Assistance Process Package": "Vize Başvuru Ücreti",
  "Certificate of Acceptance to Study": "Vize Başvuru Ücreti",
  "1-day Safari": "Aktivite / Gezi Ücreti",
  "3-day Garden Route Safari": "Aktivite / Gezi Ücreti",
  "4-day Kruger Park Safari": "Aktivite / Gezi Ücreti",
  "Gastronomy": "Aktivite / Gezi Ücreti",
  "Bartending": "Aktivite / Gezi Ücreti",
  "Professional Certificate in English for Business": "Mesleki Sertifika Ücreti",
  "Professional Certificate in English for Communication and the Arts": "Mesleki Sertifika Ücreti",
  "Professional Certificate in English for Media and Technology": "Mesleki Sertifika Ücreti",
  "Career Pathway Application Package": "Kariyer Paketi Ücreti",
  "Career Pathway Job Search Package": "Kariyer Paketi Ücreti",
  "K+ Learning Space & Extra Access 12 months": "Online / Dijital Erişim Ücreti",
  "K+ Learning Space & Extra Access 3 months": "Online / Dijital Erişim Ücreti",
  "Homestay Close to School Supplement": "Konaklama Yakınlık Ek Ücreti",
  "Close To School Supplement": "Konaklama Yakınlık Ek Ücreti",
  "Homestay Private Bathroom Supplement": "Özel Banyo Ek Ücreti",
  "Student Apartment Private Bathroom Supplement": "Özel Banyo Ek Ücreti",
  "Luggage Retainer": "Bagaj Bekletme Ücreti",
  "Luggage Storage Supplement": "Bagaj Bekletme Ücreti",
  "Eco Tax": "Devlet / Yerel Vergi",
  "Migration Office Fee": "Devlet / Yerel Vergi",
  "Home Address Registration": "Devlet / Yerel Vergi",
  "Canada Custodianship Fee": "Reşit Olmayan Vasi Ücreti",
  "Custodianship Fee": "Reşit Olmayan Vasi Ücreti",
  "PEL Protection of Enrolled Learners": "Öğrenci Koruma Ücreti",
  "Learners Protection Fee": "Öğrenci Koruma Ücreti",
  "Booking with Confidence Plus": "Yönetim / İşlem Ücreti"
};

// Ham fee ismini TR standart başlığa çevir (tam eşleşme; bulamazsa ham bırak)
function normalizeFeeName(rawName) {
  const key = (rawName || "").trim();
  return FEE_NAME_MAP[key] || key;
}
// Aynı TR-standart isme sahip fee'leri tek satırda topla (tutarları toplar)
function mergeFeeItems(items) {
  const merged = {};
  const order = [];
  (items || []).forEach(it => {
    const name = normalizeFeeName(it.name);
    if (!merged[name]) { merged[name] = { ...it, name }; order.push(name); }
    else { merged[name].amount += it.amount; merged[name].auto = merged[name].auto && it.auto; }
  });
  return order.map(n => merged[n]);
}

// Kurs GÖSTERİM ismi: Türkçe varsa Türkçe, yoksa İngilizce'ye düş. İç mantık hep name (İngilizce) kullanır.
// Sheets formül hataları (#N/A, #YOK, #REF! vb.) geçersiz sayılır → İngilizce isim gösterilir.
function courseLabel(course) {
  if (!course) return "";
  const tr = (course.turkishName || "").trim();
  const invalid = !tr || tr.startsWith("#") || /^n\/?a$/i.test(tr);
  return invalid ? (course.name || "") : tr;
}

// Dil değeri → Türkçe karşılık (sheet İngilizce/karışık gelebilir). Bilinmeyen → olduğu gibi.
const LANG_TR = {
  english: "İngilizce", german: "Almanca", french: "Fransızca", spanish: "İspanyolca",
  italian: "İtalyanca", "i̇ngilizce": "İngilizce", ingilizce: "İngilizce", almanca: "Almanca",
  fransızca: "Fransızca", "fransizca": "Fransızca", ispanyolca: "İspanyolca", italyanca: "İtalyanca",
};
function langTR(lang) {
  const k = (lang || "").trim().toLowerCase();
  return LANG_TR[k] || (lang || "").trim();
}
// course_name'de herhangi bir dil adı (İng/Tür) geçiyor mu? Geçiyorsa etiket eklenmez.
function courseNameHasLanguage(name) {
  const n = (name || "").toLowerCase();
  return /\b(english|i̇ngilizce|ingilizce|german|almanca|french|fransızca|fransizca|spanish|i̇spanyolca|ispanyolca|italian|i̇talyanca|italyanca)\b/i.test(n);
}
// Gösterilecek kurs adı + (koşullu) dil etiketi.
// mode "tr" → Türkçe kurs adı + Türkçe dil; mode "orig" → orijinal course_name + ham language.
function courseWithLang(course, mode) {
  if (!course) return "";
  const base = mode === "orig" ? (course.name || "") : courseLabel(course);
  const rawLang = (course.language || "").trim();
  if (!rawLang || courseNameHasLanguage(course.name)) return base;   // istisna: adında dil geçiyorsa ekleme
  const lang = mode === "orig" ? rawLang : langTR(rawLang);          // staff ekran: ham; diğer: Türkçe
  return `${base} - ${lang}`;
}

// Danışman telefonu: ham "905419189177" → görünen "+90 541 918 91 77", link "tel:+905419189177"
function formatAdvisorPhone(raw) {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return null;
  const tel = "+" + d;
  // TR (90 + 10 hane) okunaklı gruplama; diğer ülkelerde düz +numara
  const display = (d.length === 12 && d.startsWith("90"))
    ? `+90 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10,12)}`
    : tel;
  return { display, tel };
}

function calcFees(fees, weeks, age, accType, accWeeks) {
  const currency = fees?.[0]?.currency || "GBP";
  const items = [];
  let total = 0;
  const feeGroups = {};
  (fees || []).forEach(f => {
    const n = (f.name || "").toLowerCase();
    const isCompulsory = f.addon_type ? f.addon_type === "compulsory"
      : (n.includes("registration") || n.includes("kayit") || n.includes("placement") ||
         n.includes("material") || n.includes("materyal") || n.includes("administration") ||
         n.includes("booking") || n.includes("pel protection") || n.includes("protection of enrolled"));
    if (!isCompulsory) return;
    const hasTier = f.tier_min || f.tier_max;
    if (hasTier) {
      const inRange = (!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max);
      if (!inRange) return;
    }
    feeGroups[f.name] = f;
  });
  Object.values(feeGroups).forEach(f => {
    const amount = f.calc_type === "per_week" ? f.amount * weeks : f.amount;
    items.push({ name: f.name, amount, currency: f.currency || currency });
    total += amount;
  });
  const isHomestay = (accType || "").toLowerCase().includes("homestay") || (accType || "").toLowerCase().includes("aile");
  if (age && age <= 17 && isHomestay) {
    const u18 = (fees || []).find(f => (f.name || "").toLowerCase().includes("u18") || (f.name || "").toLowerCase().includes("under 18"));
    if (u18 && !items.find(i => i.name === u18.name)) {
      // U18 gözetim ücreti konaklamaya bağlıdır → konaklama süresi kullanılır
      const u18Weeks = (accWeeks && accWeeks > 0) ? accWeeks : weeks;
      const amt = u18.calc_type === "per_week" ? u18.amount * u18Weeks : u18.amount;
      items.push({ name: u18.name, amount: amt, currency: u18.currency || currency, auto: true });
      total += amt;
    }
  }
  return { items: mergeFeeItems(items), total, currency };
}

// ─── İNDİRİM FONKSİYONLARI ───
function inDateRange(dateStr, startStr, endStr) {
  if (!startStr && !endStr) return true; if (!dateStr) return true;
  const d = new Date(dateStr);
  if (startStr && d < new Date(startStr)) return false;
  if (endStr && d > new Date(endStr)) return false;
  return true;
}
function courseInList(courseName, listStr) {
  if (!listStr) return false;
  return listStr.split(",").map(s => s.trim()).includes(courseName);
}
function packageIncludesTransfer(pkg) {
  const inc = pkg?.includes_tr || pkg?.includes_eng || "";
  if (!inc) return false;
  const t = inc.toLowerCase();
  return t.includes("transfer") || t.includes("airport pickup") || t.includes("havalimanı") || t.includes("havaalanı");
}

function findFixedPackage(discounts, course, weeks, startDate) {
  if (!discounts?.length || !course) return null;
  const today = new Date().toISOString().split("T")[0];
  return discounts.find(d => d.discount_type === "fixed_package" && d.course_name === course.name && d.weeks === weeks
    && inDateRange(today, d.reg_date_start, d.reg_date_end) && inDateRange(startDate, d.arrival_start, d.arrival_end)) || null;
}
// Secili hafta + tarih icin gecerli TUM paketleri dondurur (Kurs adimindaki "Paket Programlar" sekmesi icin)
function getAvailablePackages(discounts, weeks, startDate) {
  if (!discounts?.length) return [];
  const today = new Date().toISOString().split("T")[0];
  return discounts.filter(d => d.discount_type === "fixed_package" && d.weeks === weeks
    && inDateRange(today, d.reg_date_start, d.reg_date_end) && inDateRange(startDate, d.arrival_start, d.arrival_end));
}
function computeDiscounts(discounts, course, weeks, startDate, targets) {
  if (!discounts?.length) return [];
  const today = new Date().toISOString().split("T")[0];
  const result = [];
  discounts.forEach(d => {
    if (d.discount_type !== "percentage") return;
    if (!inDateRange(today, d.reg_date_start, d.reg_date_end)) return;
    if (!inDateRange(startDate, d.arrival_start, d.arrival_end)) return;
    if (d.min_weeks && weeks < d.min_weeks) return;
    if (d.max_weeks && weeks > d.max_weeks) return;
    if (d.eligible_courses && !courseInList(course?.name, d.eligible_courses)) return;
    if (d.excluded_courses && courseInList(course?.name, d.excluded_courses)) return;
    let base = 0, label = "";
    if (d.applies_to === "tuition") { base = targets.tuition || 0; label = "Kurs İndirimi"; }
    else if (d.applies_to === "accommodation") { base = targets.accommodation || 0; label = "Konaklama İndirimi"; }
    else if (d.applies_to === "fee") { const fee = (targets.fees || []).find(f => f.name === d.target_name); if (!fee) return; base = fee.amount; label = d.target_name + " İndirimi"; }
    else return;
    if (base <= 0) return;
    let amount = 0;
    if (d.value_type === "free") amount = base;
    else if (d.value_type === "percentage") amount = base * (d.discount_value / 100);
    else if (d.value_type === "fixed") amount = Math.min(d.discount_value, base);
    else return;
    if (amount <= 0) return;
    result.push({ label, applies_to: d.applies_to, target_name: d.target_name || "", value_type: d.value_type, value: d.discount_value, amount });
  });
  return result;
}
// Bir destinasyon icin indirimleri + nihai toplami hesaplar (tek kaynak)
function getDestinationTotals(d, fees) {
  const courseTotal = d.courseTotalPrice || 0;
  const accTotal = d.accTotalPrice || 0;
  const feesTotal = fees?.total || 0;
  const addonsCost = (d.addons || []).reduce((s, a) => s + (a.totalAmount || 0), 0);
  const transferCost = d.transfer?.one_way || 0;
  // Paket: oncelikle dogrudan secili paket (cur.selectedPackage), yoksa otomatik eslesme
  const fixedPackage = d.isOnline ? null : (d.selectedPackage || findFixedPackage(d.cityData?.discounts, d.course, d.weeks, d.startDate));
  if (fixedPackage) {
    const withAcc = fixedPackage.package_type === "with_accommodation";
    // with_accommodation: konaklama pakete dahil, eklenmez. no_accommodation: secili konaklama eklenir.
    const accForPackage = withAcc ? 0 : accTotal;
    return { isPackage: true, packageType: fixedPackage.package_type, packageName: fixedPackage.notes || fixedPackage.campaign_name || "Sabit Paket",
      packagePrice: fixedPackage.package_price, packageIncludes: fixedPackage.includes_tr || "", packageExcludes: fixedPackage.excludes || "",
      appliedDiscounts: [], discountsTotal: 0,
      grandTotal: fixedPackage.package_price + accForPackage + addonsCost + transferCost };
  }
  const targets = { tuition: courseTotal, accommodation: accTotal, fees: fees?.items || [] };
  const appliedDiscounts = d.isOnline ? [] : computeDiscounts(d.cityData?.discounts, d.course, d.weeks, d.startDate, targets);
  const discountsTotal = appliedDiscounts.reduce((s, x) => s + x.amount, 0);
  return { isPackage: false, appliedDiscounts, discountsTotal,
    grandTotal: courseTotal + accTotal + feesTotal + addonsCost + transferCost - discountsTotal };
}

// Tutarları en yakın 50 kuruşa yuvarlar (,00 veya ,50 ile biter).
// Örn: 1.347,948 → 1.348,00 | 1.347,47 → 1.347,50 | 1.347,20 → 1.347,00
const roundHalf = (n) => Math.round((Number(n) || 0) * 2) / 2;
const fmt = (n, cur) => `${cur || ""} ${roundHalf(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const emptyDest = (sd = "2026-07-06", w = 4) => ({
  lang: "", country: "", city: "", brand: "", course: null, weeks: w, accWeeks: w, accWeeksTouched: false, acc: null, startDate: sd,
  isOnline: false, cityData: null, cityLoading: false, addons: [], transfer: null,
  selectedPackage: null, noAccommodation: false,
  courseBasePrice: 0, courseHsAmount: 0, courseTotalPrice: 0, courseHsActive: false,
  accBasePrice: 0, accHsAmount: 0, accTotalPrice: 0, accHsActive: false,
});

const EC_LIVE = [
  { name:"EC Live Premium (5 gün/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR" },
  { name:"EC Live Standard (2 gün/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR" },
  { name:"EC Live English for Work", hours:3, tiers:[{min:1,max:11,price:80},{min:12,max:23,price:70},{min:24,max:null,price:60}], currency:"EUR" },
];

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const fmtDate = (d) => d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "—";
const formatDateShort = (dateStr) => { if (!dateStr) return ""; const d = new Date(dateStr); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

export default function FiyatTeklifi() {
  const isStaff = APP_MODE === "staff";
  const navigate = isStaff ? useNavigate() : () => {};
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"", age:"", gender:"" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  // Hafta alanının ham metni. null → cur.weeks gösterilir. Kullanıcı alanı tamamen
  // silebilsin diye ayrı tutulur (aksi halde boş değer anında 1'e sıçrıyordu).
  const [weeksInput, setWeeksInput] = useState(null);
  const [accWeeksInput, setAccWeeksInput] = useState(null);
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brandsByCity:{}, schoolSheets:{} });
  const [navError, setNavError] = useState("");
  const [accType, setAccType] = useState("");
  const [leadModal, setLeadModal] = useState(false);
  const [phoneValid, setPhoneValid] = useState(null); // null=bilinmiyor/boş, true/false=validasyon
  const [phoneExample, setPhoneExample] = useState(""); // seçili ülke örnek numarası (placeholder)
  const [leadForm, setLeadForm] = useState({ name:"", phone:"", email:"", dialCode:"+90", consentKvkk:false, consentEmail:false, consentAdvisor:false });
  // Modal açılınca libphonenumber'ı yükle + numara/ülke değişince valide et.
  // NOT: leadForm'dan SONRA tanımlı olmalı (TDZ'den kaçınmak için).
  useEffect(() => {
    if (leadModal && !isStaff) loadPhoneLib().then(() => {
      setPhoneValid(checkPhoneValid(leadForm.phone, leadForm.dialCode));
      const ex = getPhoneExample(leadForm.dialCode); if (ex) setPhoneExample(ex);
    });
  }, [leadModal, isStaff]);
  useEffect(() => {
    if (!leadModal || isStaff) return;
    const ex = getPhoneExample(leadForm.dialCode); setPhoneExample(ex || "");
    if (!leadForm.phone) { setPhoneValid(null); return; }
    setPhoneValid(checkPhoneValid(leadForm.phone, leadForm.dialCode));
  }, [leadForm.phone, leadForm.dialCode, leadModal, isStaff]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const [leadLoading, setLeadLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  // Özel onay modalı: { title, message, hint, confirmLabel, danger, onConfirm } | null
  const [confirmModal, setConfirmModal] = useState(null);
  const [preselectDone, setPreselectDone] = useState(false); // URL okul+şehir bir kez işlendi mi
  const [urlWarning, setUrlWarning] = useState(""); // eşleşmezse üst banner uyarısı

  useEffect(() => {
    if (isStaff) { const session = getSession(); if (!session) return navigate("/"); setUser(session); }
    fetchNav(isStaff).then(setNav).catch(err => {
      console.error("[BFT] Nav yüklenemedi:", err);
      if (!isStaff) setNavError(err.rateLimited ? err.message : "Veri yüklenemedi, bir süre sonra tekrar deneyiniz.");
    });
  }, []);

  // Customer modunda dil varsayilan İngilizce (Almanca/Fransızca gizli); ulke FIXED_COUNTRY ile sabit
  useEffect(() => {
    if (isStaff) return;
    if (!nav.languages?.length) return;
    if (cur.lang || cur.isOnline) return;
    setCur(p => ({ ...p, lang: "İngilizce", country: FIXED_COUNTRY || "" }));
  }, [nav.languages, isStaff]);

  // URL'den gelen okul+şehir'i nav yüklenince eşleştir (ingilteredil.com karşılaştırma → teklif geçişi)
  useEffect(() => {
    if (isStaff || preselectDone) return;
    if (!nav.brandsByCity || !Object.keys(nav.brandsByCity).length) return; // nav henüz yok
    const params = new URLSearchParams(window.location.search);
    const okul = (params.get("okul") || "").trim();
    const sehir = (params.get("sehir") || "").trim();
    if (!okul && !sehir) { setPreselectDone(true); return; } // parametre yok, normal akış
    // master_index'te bu şehir + okul var mı? (brandsByCity: { "London": ["Kaplan", ...] })
    let matchedCity = null, matchedBrand = null;
    Object.entries(nav.brandsByCity).forEach(([cityKey, brands]) => {
      if (cityKey.toLowerCase() === sehir.toLowerCase()) {
        const brandList = Array.isArray(brands) ? brands : Array.from(brands);
        const b = brandList.find(x => x.toLowerCase() === okul.toLowerCase());
        if (b) { matchedCity = cityKey; matchedBrand = b; }
      }
    });
    if (matchedCity && matchedBrand) {
      // Eşleşti: dil/ülke/şehir/okul set. Genel Bilgi'den sonra Destinasyon atlanıp Kurs'a geçilecek.
      setCur(p => ({ ...p, lang: "İngilizce", country: FIXED_COUNTRY || "İngiltere", city: matchedCity, brand: matchedBrand }));
    } else {
      setUrlWarning("Şehir ve okulu tekrar seçin.");
    }
    setPreselectDone(true);
  }, [nav.brandsByCity, isStaff, preselectDone]);

  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline || cur.cityData) return;
    // Staff: sheetId gerekir. Customer: brand yeterli (proxy ID'yi çözer).
    const sheetId = nav.schoolSheets?.[cur.brand]?.sheetId;
    if (isStaff && !sheetId) return;
    if (!isStaff && !nav.schoolSheets?.[cur.brand]) return;
    setCur(p => ({ ...p, cityLoading: true }));
    fetchCityData(sheetId, cur.city, isStaff, cur.brand)
      .then(data => setCur(p => ({ ...p, cityData: data, cityLoading: false, transfer: null })))
      .catch(err => {
        console.error("[BFT] Şehir verisi yüklenemedi:", err);
        setCur(p => ({ ...p, cityLoading: false }));
        if (!isStaff) setNavError(err.rateLimited ? err.message : "Veri yüklenemedi, bir süre sonra tekrar deneyiniz.");
      });
  }, [cur.city, cur.brand, nav.schoolSheets, cur.isOnline, cur.cityData]);

  const courses = cur.cityData?.courses || [];
  const accs = cur.cityData?.acc || [];
  const feesData = cur.isOnline
    ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" }
    : calcFees(cur.cityData?.fees, cur.weeks, parseInt(student.age)||0, cur.acc?.type, cur.accWeeks || cur.weeks);
  const coursePriceData = cur.course ? getTotalCoursePrice(cur.course, cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
  const accPriceData = cur.acc ? getTotalAccommodationPrice(cur.acc, cur.accWeeks || cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
  const courseTotal = coursePriceData.totalPrice;
  const accTotal = accPriceData.totalPrice;
  const addonsCost = (cur.addons||[]).reduce((s,a) => s+(a.totalAmount||0), 0);
  const transferCost = cur.transfer?.one_way || 0;
  const currentTotal = courseTotal + accTotal + (feesData.total || 0) + addonsCost + transferCost;

  // with_accommodation paketi secildiyse Konaklama adimi cikar (pakete dahil)
  const skipAccommodation = cur.selectedPackage?.package_type === "with_accommodation" || cur.isOnline;
  // "Ek Hizmetler" adimi: pakette gizli (paket her sey dahil), online'da gizli.
  // Staff'ta zorunlu ucret/opsiyonel gosterilir; customer'da opsiyonel gizli oldugu icin genelde bos -> yine de zorunlu ucret varsa gosterilebilir ama customer'da bu adim gizlenir.
  const skipAddons = !!cur.selectedPackage || cur.isOnline || !isStaff;
  // "Transfer" adimi: transfer verisi varsa VE paket transfer icermiyorsa gosterilir
  const hasTransfers = (cur.cityData?.transfers?.length > 0) && !packageIncludesTransfer(cur.selectedPackage) && !cur.isOnline;
  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Ek Hizmetler","Transfer","Özet"].filter(s => {
    if (s === "Konaklama" && skipAccommodation) return false;
    if (s === "Ek Hizmetler" && skipAddons) return false;
    if (s === "Transfer" && !hasTransfers) return false;
    return true;
  });
  const stepName = STEPS[step];
  const lastStepIdx = STEPS.length - 1;          // Özet'in index'i
  const summaryIdx = STEPS.indexOf("Özet");
  const addonsIdx = STEPS.indexOf("Ek Hizmetler");

  const canNextMap = {
    "Genel Bilgi": !!(student.name && student.gender && student.age),
    "Destinasyon": (cur.isOnline && cur.course) || !!(cur.brand && cur.city),
    "Kurs": (!!cur.selectedPackage || (!!cur.course && isCourseValid(cur.course, cur.weeks))) && !cur.cityLoading,
    // Konaklama: secili oda VEYA "konaklama istemiyorum" VEYA online VEYA paket(with_acc)
    "Konaklama": !!cur.acc || cur.noAccommodation || cur.isOnline,
    "Ek Hizmetler": true,
    "Transfer": true,
    "Özet": true,
  };
  const canNext = canNextMap[stepName];

  const handleDateChange = (val) => {
    if (!val) return;
    const d = new Date(val);
    if (d.getDay() !== 1) d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 8 - d.getDay()));
    setCur(p => ({ ...p, startDate: d.toISOString().split("T")[0] }));
  };

  const next = () => {
    // Özet'ten hemen onceki adim her zaman ozete gecisi tetikler (Ek Hizmetler atlanmis olabilir)
    const isLastBeforeSummary = step === STEPS.indexOf("Özet") - 1;
    if (isLastBeforeSummary) {
      const coursePrice = cur.course ? getTotalCoursePrice(cur.course, cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
      const accPrice = cur.acc ? getTotalAccommodationPrice(cur.acc, cur.accWeeks || cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
      const isDup = destinations.some(d => d.city === cur.city && d.course?.name === cur.course?.name && d.acc?.name === cur.acc?.name && d.selectedPackage?.package_price === cur.selectedPackage?.package_price);
      if (!isDup) {
        const cityDesc = nav.descriptions?.[`${cur.brand}__${cur.city}`] || "";
        setDestinations(p => [...p, { ...cur,
          cityDescription: cityDesc,
          courseBasePrice: coursePrice.basePrice, courseHsAmount: coursePrice.hsAmount,
          courseTotalPrice: coursePrice.totalPrice, courseHsActive: coursePrice.hsActive,
          courseHsPerWeek: coursePrice.hsPerWeek, courseHsStart: coursePrice.hsStart, courseHsEnd: coursePrice.hsEnd,
          accBasePrice: accPrice.basePrice, accHsAmount: accPrice.hsAmount,
          accTotalPrice: accPrice.totalPrice, accHsActive: accPrice.hsActive,
          accHsPerWeek: accPrice.hsPerWeek, accHsStart: accPrice.hsStart, accHsEnd: accPrice.hsEnd,
          selectedPackage: cur.selectedPackage || null, noAccommodation: cur.noAccommodation || false,
        }]);
      }
      setStep(summaryIdx);
    } else {
      // URL'den okul+şehir preselect edildiyse: Genel Bilgi(0) sonrası Destinasyon(1) atlanır, Kurs(2)'a geçilir
      if (!isStaff && stepName === "Genel Bilgi" && cur.city && cur.brand && !cur.isOnline) {
        const kursIdx = STEPS.indexOf("Kurs");
        setStep(kursIdx >= 0 ? kursIdx : s => s + 1);
      } else {
        setStep(s => s + 1);
      }
    }
    setTimeout(() => {
      const root = document.getElementById("bft-root");
      if (root) {
        const top = root.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({ top, behavior: "smooth" });
      } else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const addNew = () => { if (destinations.length >= 3) return; setCur(emptyDest(cur.startDate, cur.weeks)); setStep(1); };
  const removeDestination = (i) => {
    const d = destinations[i];
    const ad = d ? `${d.brand || ""} ${d.city || ""}`.trim() : "bu okul";
    setConfirmModal({
      title: "Okulu Sil",
      message: `"${ad}" teklifini silmek istediğinize emin misiniz?`,
      confirmLabel: "Evet, Sil",
      danger: true,
      onConfirm: () => setDestinations(p => p.filter((_, idx) => idx !== i)),
    });
  };
  const reset = () => { setDestinations([]); setCur(emptyDest()); setStudent({ name:"", age:"", gender:"" }); setStep(0); };

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Script yüklenemedi: " + src));
    document.head.appendChild(s);
  });

  const generatePDF = async () => {
    console.log("%c[BFT] generatePDF çağrıldı — MOTOR: jsPDF native (" + BFT_BUILD_VERSION + ")", "background:#16a34a;color:#fff;padding:2px 8px;border-radius:4px;");
    setPdfLoading(true);
    // Render için kısa gecikme — spinner görünsün
    await new Promise(r => setTimeout(r, 50));
    try {
      // jsPDF yükle - birden fazla CDN dene
      if (!window.jspdf) {
        const cdns = [
          "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
          "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js",
        ];
        let loaded = false;
        for (const url of cdns) {
          try { await loadScript(url); if (window.jspdf) { loaded = true; break; } }
          catch (e) { console.warn("[BFT] CDN başarısız:", url); }
        }
        if (!loaded) throw new Error("jsPDF hiçbir CDN'den yüklenemedi");
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      // Türkçe karakter için DejaVuSans (normal + bold) fontunu yükle ve göm (CORS uyumlu CDN)
      if (!window.__bft_font_loaded) {
        const fontSet = [
          { key: "__bft_font_b64", urls: [
            "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
            "https://unpkg.com/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
          ]},
          { key: "__bft_font_bold_b64", urls: [
            "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf",
            "https://unpkg.com/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf",
          ]},
        ];
        for (const f of fontSet) {
          for (const furl of f.urls) {
            try {
              const resp = await fetch(furl);
              if (!resp.ok) continue;
              const buf = await resp.arrayBuffer();
              let binary = "";
              const bytes = new Uint8Array(buf);
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              window[f.key] = btoa(binary);
              console.log("[BFT] Font yüklendi:", furl);
              break;
            } catch (e) { console.warn("[BFT] Font CDN başarısız:", furl); }
          }
        }
        window.__bft_font_loaded = true;
      }
      if (window.__bft_font_b64) {
        try {
          doc.addFileToVFS("DejaVuSans.ttf", window.__bft_font_b64);
          doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
        } catch(e) { console.warn("[BFT] Font eklenemedi:", e); }
      }
      if (window.__bft_font_bold_b64) {
        try {
          doc.addFileToVFS("DejaVuSans-Bold.ttf", window.__bft_font_bold_b64);
          doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
        } catch(e) { console.warn("[BFT] Bold font eklenemedi:", e); }
      }

      const FONT = window.__bft_font_b64 ? "DejaVuSans" : "helvetica";

      // Logo'yu PNG data-uri'ye çevir + en-boy oranını döndür (jsPDF SVG/oran desteği zayıf)
      const loadLogo = (url, cacheKey) => new Promise((resolve) => {
        if (!url) return resolve(null);
        if (window[cacheKey]) return resolve(window[cacheKey]);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const w = img.naturalWidth || 320, h = img.naturalHeight || 110;
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const data = canvas.toDataURL("image/png");
            const result = { data, ratio: w / h };
            window[cacheKey] = result;
            resolve(result);
          } catch(e){ resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });

      const bilimeviLogo = await loadLogo(BILIMEVI_LOGO, "__bft_bilimevi_logo");
      const siteLogo = (!isStaff) ? await loadLogo(SITE_LOGO, "__bft_site_logo") : null;

      const CYAN_RGB = [0, 193, 222];
      const PAGE_W = 210, MARGIN = 18;
      const CW = PAGE_W - MARGIN * 2;
      // Her sayfa altına: önemli not (bold, büyük harf) + site adresi
      const drawFooter = () => {
        doc.setFont(FONT, "bold"); doc.setFontSize(10.5); doc.setTextColor(220, 100, 100);
        const noteTxt = "ÖNEMLİ NOT: ÖN BİLGİLENDİRME AMAÇLI BU TEKLİF, KAYIT OLACAĞINIZ TARİHTEKİ OKULLARIN DÖNEMSEL GÜNCELLEMELERİNE GÖRE DEĞİŞKENLİK GÖSTEREBİLİR; GÜNCEL TUTAR VE İNDİRİMLER İÇİN DANIŞMANINIZDAN TEYİT ALMANIZI RİCA EDERİZ.";
        const noteLines = doc.splitTextToSize(noteTxt, CW);
        doc.text(noteLines, PAGE_W / 2, 270, { align: "center" });
        doc.setFont(FONT, "normal"); doc.setFontSize(8); doc.setTextColor(51);
        doc.text("www.bilimevi.com", PAGE_W - MARGIN, 289, { align: "right" });
      };

      destinations.forEach((d, idx) => {
        if (idx > 0) doc.addPage();
        const f = d.isOnline
          ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" }
          : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type, d.accWeeks || d.weeks);
        const cur = d.course?.currency || f.currency || "GBP";
        const curSym = { GBP:"GBP", EUR:"EUR", USD:"USD", CAD:"CAD" }[cur] || cur;
        const startD = d.startDate ? new Date(d.startDate) : new Date();
        const endD = addWeeksToDate(startD, d.weeks);
        const accStartD = new Date(startD); accStartD.setDate(startD.getDate() - 1);
        // Konaklama bitişi kendi süresine göre (kurs süresinden farklı olabilir)
        const accEndBase = addWeeksToDate(startD, d.accWeeks || d.weeks);
        const accEndD = new Date(accEndBase); accEndD.setDate(accEndBase.getDate() + 2);

        let y = 20;
        const money = (n) => roundHalf(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Header
        doc.setFont(FONT, "normal");
        const LOGO_H = 11; // mm
        // Sol: site logosu (sadece customer modda)
        if (siteLogo) {
          try {
            const w = LOGO_H * siteLogo.ratio;
            doc.addImage(siteLogo.data, "PNG", MARGIN, y - 2, w, LOGO_H);
          } catch(e){ console.warn("[BFT] site logo eklenemedi", e); }
        }
        // Danışman bilgisi sadece staff modda (müşteriye gösterilmez)
        if (isStaff) {
          doc.setFontSize(7); doc.setTextColor(150);
          doc.text("Bilimevi Eğitim Danışmanınız", MARGIN, y);
          doc.setFontSize(11); doc.setTextColor(17);
          doc.text(user?.name || "—", MARGIN, y + 4);
          doc.setFontSize(8); doc.setTextColor(85);
          doc.text(user?.email || "", MARGIN, y + 8);
          const advPhone = formatAdvisorPhone(user?.phone);
          if (advPhone) {
            doc.setTextColor(0, 100, 160);
            doc.text(advPhone.display, MARGIN, y + 12);
            const pw = doc.getTextWidth(advPhone.display);
            doc.link(MARGIN, y + 9, pw, 4.5, { url: "tel:" + advPhone.tel });
            doc.setTextColor(85);
          }
        }
        // Sağ: Bilimevi logosu (her zaman)
        if (bilimeviLogo) {
          try {
            const w = LOGO_H * bilimeviLogo.ratio;
            doc.addImage(bilimeviLogo.data, "PNG", PAGE_W - MARGIN - w, y - 2, w, LOGO_H);
          } catch(e){ console.warn("[BFT] bilimevi logo eklenemedi", e); }
        }
        // Logolardan sonra boşluk, ince gri çizgi, sonra şehir başlığı
        y += LOGO_H + 5;
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 18;

        // Şehir başlığı — "Okul, Şehir" (marka 7 karakterden uzunsa şehir alt satıra)
        doc.setFontSize(40); doc.setTextColor(...CYAN_RGB);
        if (!d.isOnline && d.brand) {
          if (d.brand.length > 7) {
            // İki satır: "Okul," üstte, "Şehir" altta
            doc.text(`${d.brand},`, MARGIN, y);
            y += 14;
            doc.text(d.city || "", MARGIN, y);
          } else {
            doc.text(`${d.brand}, ${d.city}`, MARGIN, y);
          }
        } else {
          doc.text(d.city || "", MARGIN, y);
        }
        y += 9;

        // Okul/şehir açıklaması (city_description) — varsa, küçük puntoyla
        if (d.cityDescription) {
          doc.setFontSize(9); doc.setTextColor(90);
          const lines = doc.splitTextToSize(d.cityDescription, PAGE_W - MARGIN * 2);
          doc.text(lines, MARGIN, y);
          y += lines.length * 4.5 + 4;
        }

        doc.setFontSize(16); doc.setTextColor(17);
        doc.text(`${fmtDate(startD)} — ${fmtDate(endD)}`, MARGIN, y);
        y += 8;
        doc.setFontSize(10); doc.setTextColor(17);
        doc.text("Teklifinize neler dahil?", MARGIN, y);
        y += 5;
        doc.setTextColor(...CYAN_RGB);
        doc.text(`Hafta Sayısı: ${d.weeks}`, MARGIN, y);
        y += 2;
        doc.setDrawColor(17); doc.setLineWidth(0.6);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 6;

        // Satır yazıcı
        const row = (label, desc, amount, opts = {}) => {
          const { bold, color, sub, indent } = opts;
          doc.setFontSize(label ? 10 : 9);
          doc.setTextColor(...(color || [17,17,17]));
          if (label) { doc.setFont(FONT,"normal"); doc.text(label, MARGIN, y); }
          if (desc) {
            const dx = MARGIN + 32;
            doc.setFontSize(10); doc.text(desc, dx, y);
          }
          if (amount != null) {
            doc.setFontSize(10);
            doc.text(String(amount), PAGE_W - MARGIN, y, { align: "right" });
          }
          y += 6;
          if (sub) {
            doc.setFontSize(8); doc.setTextColor(120);
            doc.text(sub, MARGIN + 32, y - 2);
            y += 2;
          }
        };

        // Kurs / Paket
        doc.setFontSize(10); doc.setTextColor(17);
        if (d.selectedPackage) {
          doc.text("Paket", MARGIN, y);
          doc.text(d.course ? courseWithLang(d.course, "tr") : (d.selectedPackage.course_name || ""), MARGIN + 32, y);
          doc.text(money(d.selectedPackage.package_price), PAGE_W - MARGIN, y, { align:"right" });
          y += 5;
          doc.setFontSize(8); doc.setTextColor(85);
          doc.text(`Başlangıç: ${fmtDate(startD)}  |  Bitiş: ${fmtDate(endD)}`, MARGIN + 32, y);
          y += 4;
          doc.setTextColor(16,150,80);
          doc.text(d.selectedPackage.package_type === "with_accommodation" ? "Konaklama dahil paket" : "Konaklama hariç paket", MARGIN + 32, y);
          y += 4;
          if (d.selectedPackage.includes_tr) {
            doc.setTextColor(120); doc.setFontSize(7.5);
            const incLines = doc.splitTextToSize("Dahil: " + d.selectedPackage.includes_tr, PAGE_W - MARGIN - (MARGIN + 32));
            incLines.forEach(ln => { doc.text(ln, MARGIN + 32, y); y += 3.5; });
          }
          doc.setDrawColor(221); doc.setLineWidth(0.2);
          doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;
        } else {
        doc.text("Kurs", MARGIN, y);
        doc.text(`${d.brand} — ${courseWithLang(d.course, "tr")}`, MARGIN + 32, y);
        doc.text(money(d.courseBasePrice), PAGE_W - MARGIN, y, { align:"right" });
        y += 5;
        doc.setFontSize(8); doc.setTextColor(85);
        doc.text(`Başlangıç: ${fmtDate(startD)}  |  Bitiş: ${fmtDate(endD)}`, MARGIN + 32, y);
        y += 4;
        if (d.course?.lessons > 0) {
          doc.setTextColor(120);
          doc.text(`${d.course.lessons} ders/hafta · ${d.course.hours} saat`, MARGIN + 32, y);
          y += 4;
        }
        doc.setDrawColor(221); doc.setLineWidth(0.2);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;

        if (d.courseHsAmount > 0) {
          doc.setFont(FONT, "bold");
          doc.setFontSize(9); doc.setTextColor(146,64,14);
          const hsLabel = d.courseHsPerWeek
            ? `High Season (+${money(d.courseHsPerWeek)}/hafta, ${formatDateShort(d.courseHsStart)}-${formatDateShort(d.courseHsEnd)})`
            : `High Season (${formatDateShort(d.courseHsStart)}-${formatDateShort(d.courseHsEnd)})`;
          doc.text(hsLabel, MARGIN + 32, y);
          doc.text(`+${money(d.courseHsAmount)}`, PAGE_W - MARGIN, y, { align:"right" });
          doc.setFont(FONT, "normal");
          y += 5;
          doc.setDrawColor(221); doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;
        }
        }

        const checkPage = () => { if (y > 260) { doc.addPage(); y = 20; } };

        // Konaklama (with_accommodation paketinde gizli)
        checkPage();
        if (d.acc && !d.isOnline && d.selectedPackage?.package_type !== "with_accommodation") {
          doc.setFontSize(10); doc.setTextColor(17);
          doc.text("Konaklama", MARGIN, y);
          doc.text(`${d.acc.name} (${d.acc.board})`, MARGIN + 32, y);
          doc.text(money(d.accBasePrice), PAGE_W - MARGIN, y, { align:"right" });
          y += 5;
          doc.setFontSize(8); doc.setTextColor(85);
          doc.text(`Konaklama Süresi: ${d.accWeeks || d.weeks} hafta`, MARGIN + 32, y);
          y += 4;
          doc.text(`Giriş: ${fmtDate(accStartD)}  |  Çıkış: ${fmtDate(accEndD)}`, MARGIN + 32, y);
          y += 4;
          doc.setTextColor(120);
          doc.text([d.acc.room, d.acc.bathroom, d.acc.distance ? `Okula ${d.acc.distance}` : ""].filter(Boolean).join(" · "), MARGIN + 32, y);
          y += 4;
          doc.setDrawColor(221); doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;

          if (d.accHsAmount > 0) {
            doc.setFont(FONT, "bold");
            doc.setFontSize(9); doc.setTextColor(146,64,14);
            const accHsLabel = d.accHsPerWeek
              ? `High Season (+${money(d.accHsPerWeek)}/hafta, ${formatDateShort(d.accHsStart)}-${formatDateShort(d.accHsEnd)})`
              : `High Season (${formatDateShort(d.accHsStart)}-${formatDateShort(d.accHsEnd)})`;
            doc.text(accHsLabel, MARGIN + 32, y);
            doc.text(`+${money(d.accHsAmount)}`, PAGE_W - MARGIN, y, { align:"right" });
            doc.setFont(FONT, "normal");
            y += 5;
            doc.setDrawColor(221); doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;
          }
        }

        // Diğer ücretler (pakette gizli — paket her şey dahil)
        checkPage();
        if (!d.selectedPackage && f.items?.length > 0) {
          f.items.forEach((fi, i) => {
            doc.setFontSize(9); doc.setTextColor(17);
            if (i === 0) doc.text("Diğer", MARGIN, y);
            doc.text(fi.name, MARGIN + 32, y);
            doc.text(money(fi.amount), PAGE_W - MARGIN, y, { align:"right" });
            y += 5;
          });
        }

        // Ek hizmetler
        if ((d.addons||[]).length > 0) {
          d.addons.forEach((a, i) => {
            doc.setFontSize(9); doc.setTextColor(17);
            if (i === 0) doc.text("Ek Hizmetler", MARGIN, y);
            doc.text(a.name + (a.notes ? ` — ${a.notes}` : ""), MARGIN + 32, y);
            doc.text(money(a.totalAmount), PAGE_W - MARGIN, y, { align:"right" });
            y += 5;
          });
        }

        // Transfer
        if (d.transfer) {
          doc.setFontSize(9); doc.setTextColor(17);
          doc.text("Transfer", MARGIN, y);
          doc.text(`${d.transfer.airport}${d.transfer.code?.trim() ? ` (${d.transfer.code.trim()})` : ""}`, MARGIN + 32, y);
          doc.text(`${d.transfer.currency} ${money(d.transfer.one_way)}`, PAGE_W - MARGIN, y, { align:"right" });
          y += 5;
        }

        // İndirimler — açık yeşil ton (HS satır mantığıyla uyumlu)
        const _dt = getDestinationTotals(d, f);
        if (!_dt.isPackage && _dt.appliedDiscounts.length > 0) {
          _dt.appliedDiscounts.forEach((disc, i) => {
            checkPage();
            doc.setFont(FONT, "bold");
            doc.setFontSize(10); doc.setTextColor(22, 163, 74);
            if (i === 0) doc.text("İndirimler", MARGIN, y);
            const dLabel = `${disc.label} (${disc.value_type === "percentage" ? "%" + disc.value : disc.value_type === "free" ? "Ücretsiz" : disc.value + " Sabit"})`;
            doc.text(dLabel, MARGIN + 32, y);
            doc.text(`-${money(disc.amount)}`, PAGE_W - MARGIN, y, { align:"right" });
            y += 5;
          });
          doc.setFont(FONT, "normal");
          doc.setTextColor(17);
        }

        // Toplam
        checkPage();
        y += 2;
        doc.setDrawColor(17); doc.setLineWidth(0.8);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 6;
        const grandTotal = _dt.grandTotal;
        // Toplam tutar — siyah
        doc.setTextColor(17, 17, 17);
        const labelTxt = `TOPLAM TUTAR ${cur}`;
        const amountTxt = `${curSym} ${money(grandTotal)}`;
        doc.setFontSize(12);
        doc.text(labelTxt, MARGIN, y);
        doc.setFontSize(16);
        doc.text(amountTxt, PAGE_W - MARGIN, y, { align:"right" });
        y += 12;

        // CTA — sadece staff modda
        if (isStaff) {
          const waPhone = (user?.phone || "905419189177").replace(/\D/g, "");
          const waUrl = `https://wa.me/${waPhone}`;
          const btnX = PAGE_W/2 - 45, btnY = y, btnW = 90, btnH = 10;
          doc.setFillColor(...CYAN_RGB);
          doc.roundedRect(btnX, btnY, btnW, btnH, 5, 5, "F");
          doc.setFontSize(10); doc.setTextColor(255);
          doc.text("Eğitim Danışmanınıza Şimdi Ulaşın", PAGE_W/2, y + 6.5, { align:"center" });
          doc.link(btnX, btnY, btnW, btnH, { url: waUrl });
          y += 18;
        }

        // Footer
        drawFooter();
      });

      // --- Karşılaştırma Tablosu (sadece 2-3 destinasyon) ---
      if (destinations.length >= 2) {
        doc.addPage();
        let cy = 16;
        doc.setFont(FONT, "normal");

        // Header: logo + danışman (teklif sayfalarıyla aynı)
        const C_LOGO_H = 11;
        if (siteLogo) {
          try {
            const w = C_LOGO_H * siteLogo.ratio;
            doc.addImage(siteLogo.data, "PNG", MARGIN, cy - 2, w, C_LOGO_H);
          } catch(e){ console.warn("[BFT] tablo site logo", e); }
        }
        if (isStaff) {
          doc.setFontSize(7); doc.setTextColor(150);
          doc.text("Bilimevi Eğitim Danışmanınız", MARGIN, cy);
          doc.setFontSize(11); doc.setTextColor(17);
          doc.text(user?.name || "—", MARGIN, cy + 4);
          doc.setFontSize(8); doc.setTextColor(85);
          doc.text(user?.email || "", MARGIN, cy + 8);
          const advPhoneC = formatAdvisorPhone(user?.phone);
          if (advPhoneC) {
            doc.setTextColor(0, 100, 160);
            doc.text(advPhoneC.display, MARGIN, cy + 12);
            const pwC = doc.getTextWidth(advPhoneC.display);
            doc.link(MARGIN, cy + 9, pwC, 4.5, { url: "tel:" + advPhoneC.tel });
            doc.setTextColor(85);
          }
        }
        if (bilimeviLogo) {
          try {
            const w = C_LOGO_H * bilimeviLogo.ratio;
            doc.addImage(bilimeviLogo.data, "PNG", PAGE_W - MARGIN - w, cy - 2, w, C_LOGO_H);
          } catch(e){ console.warn("[BFT] tablo bilimevi logo", e); }
        }
        cy += C_LOGO_H + 5;
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(MARGIN, cy, PAGE_W - MARGIN, cy);
        cy += 8;
        doc.setTextColor(17);

        const n = destinations.length;
        const labelW = 42;                         // sol kalem sütunu
        const colW = (PAGE_W - MARGIN * 2 - labelW) / n;
        const colX = (i) => MARGIN + labelW + i * colW;

        // Her destinasyonun kalemlerini hesapla
        const cols = destinations.map(d => {
          const f = d.isOnline
            ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" }
            : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type, d.accWeeks || d.weeks);
          const dt = getDestinationTotals(d, f);
          const cur = d.course?.currency || f.currency || "GBP";
          return { d, f, dt, cur };
        });

        // Başlık satırı: okul adları (her kelime alt alta, büyük+turkuaz, dikey ortalı)
        doc.setFont(FONT, "bold");
        doc.setFontSize(14); doc.setTextColor(...CYAN_RGB);
        const LH = 6.5; // satır yüksekliği
        // Önce her okulun kelimelerini ve maxWords'ü hesapla
        const headWords = cols.map((c, i) => String(c.d.brand || c.d.city || `Okul ${i+1}`).split(/\s+/).filter(Boolean));
        const maxWords = Math.max(1, ...headWords.map(w => w.length));
        headWords.forEach((words, i) => {
          // Bu okulu dikey ortala: (maxWords - kendi kelime sayısı)/2 kadar aşağıdan başla
          const offset = (maxWords - words.length) / 2;
          words.forEach((w, wi) => {
            doc.text(w, colX(i) + colW/2, cy + (offset + wi) * LH, { align:"center", maxWidth: colW - 2 });
          });
        });
        doc.setTextColor(17);
        cy += maxWords * LH + 2;
        cols.forEach((c, i) => {
          doc.setFont(FONT, "bold"); doc.setFontSize(10); doc.setTextColor(120);
          doc.text(`${c.d.city} · ${c.d.weeks} hafta`, colX(i) + colW/2, cy, { align:"center", maxWidth: colW - 2 });
        });
        cy += 5;
        // Okul başlıkları altı — kalın siyah çizgi (kalemler başlamadan)
        doc.setDrawColor(17); doc.setLineWidth(0.6);
        doc.line(MARGIN, cy, PAGE_W - MARGIN, cy);
        cy += 6;

        // Satır çizici: sol etiket + her okul için değer
        const money2 = (n) => roundHalf(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const checkPageC = () => { if (cy > 270) { doc.addPage(); cy = 24; } };
        const row = (label, valueFn, opts = {}) => {
          checkPageC();
          const baseColor = opts.color || [60, 60, 60];
          // Sol kalem etiketi — her zaman bold
          doc.setFont(FONT, "bold");
          doc.setFontSize(opts.big ? 11 : opts.bold ? 9 : 8.5);
          doc.setTextColor(baseColor[0], baseColor[1], baseColor[2]);
          doc.text(label, MARGIN, cy);
          // Değerler — opts.bold ise bold, değilse normal
          doc.setFont(FONT, opts.bold ? "bold" : "normal");
          cols.forEach((c, i) => {
            const v = valueFn(c);
            if (v !== null && v !== undefined && v !== "") {
              doc.text(String(v), colX(i) + colW/2, cy, { align:"center", maxWidth: colW - 2 });
            } else {
              doc.setTextColor(200); doc.text("—", colX(i) + colW/2, cy, { align:"center" });
              doc.setTextColor(baseColor[0], baseColor[1], baseColor[2]);
            }
          });
          cy += 6;
        };

        // Kurs
        row("Kurs", c => c.dt.isPackage
          ? `${c.cur} ${money2(c.d.selectedPackage.package_price)}`
          : `${c.cur} ${money2(c.d.courseTotalPrice)}`);
        // Konaklama
        row("Konaklama", c => {
          if (c.dt.isPackage && c.d.selectedPackage?.package_type === "with_accommodation") return "Dahil";
          if (!c.d.acc) return "";
          const aw = c.d.accWeeks || c.d.weeks;
          const suffix = aw !== c.d.weeks ? ` (${aw} hf)` : "";
          return `${c.cur} ${money2(c.d.accTotalPrice)}${suffix}`;
        });
        // Diğer ücretler (kalem kalem)
        const allFeeNames = [...new Set(cols.flatMap(c => (c.f.items||[]).map(it => it.name)))];
        allFeeNames.forEach(fn => {
          row(fn, c => {
            const it = (c.f.items||[]).find(x => x.name === fn);
            return it ? `${c.f.currency||c.cur} ${money2(it.amount)}` : "";
          });
        });
        // Transfer
        if (cols.some(c => c.d.transfer)) {
          row("Transfer", c => c.d.transfer ? `${c.d.transfer.currency} ${money2(c.d.transfer.one_way)}` : "");
        }
        // İndirim
        if (cols.some(c => !c.dt.isPackage && c.dt.discountsTotal > 0)) {
          row("İndirim", c => {
            if (c.dt.isPackage || !c.dt.discountsTotal) return "";
            return `- ${c.cur} ${money2(c.dt.discountsTotal)}`;
          }, { color: [22, 163, 74], bold: true });
        }

        // Genel Toplam
        cy += 1;
        doc.setDrawColor(17); doc.setLineWidth(0.6);
        doc.line(MARGIN, cy, PAGE_W - MARGIN, cy);
        cy += 6;
        row("GENEL TOPLAM", c => `${c.cur} ${money2(c.dt.grandTotal)}`, { bold: true, big: true, color: [17,17,17] });

        // Farklı para birimi uyarısı
        const currencies = [...new Set(cols.map(c => c.cur))];
        if (currencies.length > 1) {
          cy += 4;
          doc.setFont(FONT, "normal"); doc.setFontSize(7); doc.setTextColor(120);
          doc.text("* Okullar farklı para birimlerinde fiyatlandırılmıştır; tutarlar doğrudan toplanamaz.", MARGIN, cy);
        }

        // Footer
        drawFooter();
      }

      const filename = `Bilimevi_Teklif_${(leadForm.name || student.name || "Teklif").replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      console.log("[BFT] PDF kaydedildi:", filename);
    } catch (err) {
      console.error("[BFT] PDF HATASI:", err);
      const msg = err?.message || err?.toString?.() || "Bilinmeyen hata";
      alert("PDF oluşturulamadı: " + msg);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleLeadSubmit = async () => {
    if (!leadForm.name || !leadForm.phone || !leadForm.email) return;
    const cleanPhone = (leadForm.phone || "").replace(/\D/g, "");
    // Öncelik: libphonenumber (CRM ile aynı). Yüklü değilse uzunluk kontrolüne düş.
    const libResult = checkPhoneValid(leadForm.phone, leadForm.dialCode);
    if (libResult === false) {
      alert("Geçerli bir telefon numarası giriniz (örn: 5XX XXX XX XX).");
      return;
    }
    if (libResult === null) {
      // Lib yüklenmemiş/ISO bilinmiyor → yedek uzunluk kontrolü
      if (leadForm.dialCode === "+90") {
        if (cleanPhone.length !== 10) { alert("Telefon numarasını 10 hane giriniz (başında 0 olmadan)."); return; }
      } else {
        if (cleanPhone.length < 6) { alert("Telefon numarasını eksik veya yanlış girdiniz."); return; }
      }
    }
    setLeadLoading(true);
    try {
      const endpoint = window.BFT_CONFIG?.assetsUrl
        ? window.location.origin + "/wp-json/bilimevi/v1/lead"
        : null;
      if (endpoint) {
        const isoCode = DIAL_TO_ISO[leadForm.dialCode] || "";
        const leadRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: leadForm.name,
            email: leadForm.email,
            dialCode: leadForm.dialCode || "+90",
            phone: cleanPhone,
            code: isoCode,
            consentAdvisor: !!leadForm.consentAdvisor,
            subSource: SUB_SOURCE,
            destinations: destinations.map(d => {
              const _f = d.isOnline ? { items:[], total:65 } : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type, d.accWeeks || d.weeks);
              const _dt = getDestinationTotals(d, _f);
              return { city: d.city, brand: d.brand, weeks: d.weeks,
                course: d.course?.name, total: _dt.grandTotal, currency: d.course?.currency || _f.currency || "GBP" };
            }),
            timestamp: new Date().toISOString(),
          }),
        });
        const leadJson = await leadRes.json().catch(() => null);
        console.log("[BFT] Lead sonucu:", leadJson);
      }
    } catch (e) { console.error("Lead gönderilemedi:", e); }
    setLeadLoading(false);
    setLeadModal(false);
    generatePDF();
  };

  const logoSrc = LOGO_URL || (typeof window !== "undefined" && window.__bilimevi_logo__);

  return (
    <>
    {urlWarning && !isStaff && (
      <div style={{ position:"sticky", top:0, zIndex:99999, background:"#fef3c7", borderBottom:"1px solid #fbbf24", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"center", gap:12, fontSize:14, color:"#92400e" }}>
        <span>{urlWarning}</span>
        <button onClick={() => setUrlWarning("")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#92400e", lineHeight:1, padding:"0 4px" }}>×</button>
      </div>
    )}
    {navError && !isStaff && (
      <div style={{ position:"fixed", inset:0, background:"rgba(255,255,255,0.96)", zIndex:99998, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
        <p style={{ fontSize:16, fontWeight:600, color:"#0f172a", marginBottom:8 }}>{navError}</p>
        <button onClick={() => { setNavError(""); window.location.reload(); }}
          style={{ marginTop:12, padding:"10px 24px", background:CYAN, color:"#fff", border:"none", borderRadius:10, fontWeight:600, cursor:"pointer", fontSize:14 }}>
          Yeniden Dene
        </button>
      </div>
    )}
    {confirmModal && (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={() => setConfirmModal(null)}>
        <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:20, padding:"28px 28px 24px", maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", animation:"fadeUp 0.2s" }}>
          <h3 style={{ fontSize:18, fontWeight:700, marginBottom:10, color:"#0f172a" }}>{confirmModal.title}</h3>
          <p style={{ fontSize:14, color:"#475569", marginBottom: confirmModal.hint ? 12 : 22, lineHeight:1.5 }}>{confirmModal.message}</p>
          {confirmModal.hint && (
            <div style={{ fontSize:12.5, color:"#0f766e", background:"#f0fdfa", border:"1px solid #99f6e4", borderRadius:10, padding:"10px 12px", marginBottom:22, lineHeight:1.5 }}>
              💡 {confirmModal.hint}
            </div>
          )}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setConfirmModal(null)}
              style={{ flex:1, padding:"12px 0", background:"#f1f5f9", color:"#475569", border:"none", borderRadius:12, fontWeight:600, cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>
              Vazgeç
            </button>
            <button onClick={() => { const cb = confirmModal.onConfirm; setConfirmModal(null); if (cb) cb(); }}
              style={{ flex:1, padding:"12px 0", background: confirmModal.danger ? "#dc2626" : CYAN, color:"#fff", border:"none", borderRadius:12, fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>
              {confirmModal.confirmLabel || "Onayla"}
            </button>
          </div>
        </div>
      </div>
    )}
    {pdfLoading && (
      <div style={{ position:"fixed", inset:0, background:"rgba(255,255,255,0.85)", zIndex:99999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", backdropFilter:"blur(2px)" }}>
        <div style={{ width:48, height:48, border:`4px solid #e2e8f0`, borderTopColor:CYAN, borderRadius:"50%", animation:"bftSpin 0.8s linear infinite" }} />
        <p style={{ marginTop:18, fontSize:15, fontWeight:600, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>Teklif Dosyanız Hazırlanıyor...</p>
        <style>{`@keyframes bftSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )}
    {!isStaff && leadModal && (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#fff", borderRadius:20, padding:32, maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:"#0f172a" }}>Teklifinizi İndirin</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Bilgilerinizi girin, PDF otomatik indirilecektir.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <input placeholder="Ad Soyad *" style={{...S.fti, background: student.name ? "#f8fafc" : "#fff"}} value={leadForm.name} onChange={e => setLeadForm(p => ({...p, name:e.target.value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s'-]/g, "")}))} />
              <div style={{ display:"flex", gap:8, position:"relative" }}>
                <div style={{ position:"relative", flexShrink:0 }}>
                  <button type="button" className="bft-dial-btn" onClick={() => setCountryOpen(o => !o)}
                    style={{ ...S.fti, width:78, display:"flex", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer", background:"#fff", userSelect:"none" }}>
                    {leadForm.dialCode} <span style={{ fontSize:10, color:"#94a3b8" }}>▾</span>
                  </button>
                  {countryOpen && (
                    <div style={{ position:"absolute", top:"100%", left:0, marginTop:4, width:220, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, boxShadow:"0 10px 30px rgba(0,0,0,0.12)", zIndex:100 }}>
                      <input autoFocus placeholder="Ülke ara (TR, 90, Türkiye...)" value={countrySearch}
                        onChange={e => setCountrySearch(e.target.value)}
                        style={{ ...S.fti, width:"100%", borderRadius:"10px 10px 0 0", border:"none", borderBottom:"1px solid #e2e8f0" }} />
                      <div style={{ maxHeight:240, overflowY:"auto" }}>
                        {filterDialList(countrySearch).map(({ dial, iso }) => (
                          <div key={dial + iso} onClick={() => { setLeadForm(p => ({ ...p, dialCode: dial })); setCountryOpen(false); setCountrySearch(""); }}
                            style={{ padding:"10px 14px", cursor:"pointer", fontSize:14, display:"flex", justifyContent:"space-between", background: leadForm.dialCode === dial ? "#f0fdff" : "#fff", color: leadForm.dialCode === dial ? CYAN : "#0f172a" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                            onMouseLeave={e => e.currentTarget.style.background = leadForm.dialCode === dial ? "#f0fdff" : "#fff"}>
                            <span>{dial}</span><span style={{ color:"#94a3b8" }}>{iso}</span>
                          </div>
                        ))}
                        {filterDialList(countrySearch).length === 0 && (
                          <div style={{ padding:"12px 14px", fontSize:13, color:"#94a3b8", textAlign:"center" }}>Bulunamadı</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <input className="bft-phone" placeholder={phoneExample ? `${phoneExample} *` : "5XX XXX XX XX *"} style={S.fti} type="text" inputMode="numeric" autoComplete="off" maxLength={leadForm.dialCode === "+90" ? 10 : 15} value={leadForm.phone} onChange={e => { const max = leadForm.dialCode === "+90" ? 10 : 15; setLeadForm(p => ({...p, phone:e.target.value.replace(/\D/g,"").slice(0,max)})); }} />
              </div>
              {!isStaff && phoneValid === false && leadForm.phone && (
                <p style={{ margin:"2px 2px 0", fontSize:12, color:"#dc2626" }}>Geçerli bir telefon numarası giriniz{phoneExample ? ` (örn: ${phoneExample})` : ""}.</p>
              )}
              {!isStaff && phoneValid !== false && phoneExample && (
                <p style={{ margin:"2px 2px 0", fontSize:11, color:"#94a3b8" }}>Örnek: {phoneExample}</p>
              )}
              <input placeholder="E-posta *" style={S.fti} type="email" value={leadForm.email} onChange={e => setLeadForm(p => ({...p, email:e.target.value}))} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
              <label style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, color:"#475569", cursor:"pointer", lineHeight:1.4 }}>
                <input type="checkbox" checked={leadForm.consentKvkk} onChange={e => setLeadForm(p => ({...p, consentKvkk:e.target.checked}))} style={{ width:16, height:16, marginTop:1, flexShrink:0, accentColor:CYAN }} />
                <span>{KVKK_URL ? <a href={KVKK_URL} target="_blank" rel="noopener noreferrer" style={{ color:CYAN, textDecoration:"underline" }}>KVKK Aydınlatma Metni</a> : "KVKK Aydınlatma Metni"}'ni okudum ve kabul ediyorum. *</span>
              </label>
              <label style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, color:"#475569", cursor:"pointer", lineHeight:1.4 }}>
                <input type="checkbox" checked={leadForm.consentEmail} onChange={e => setLeadForm(p => ({...p, consentEmail:e.target.checked}))} style={{ width:16, height:16, marginTop:1, flexShrink:0, accentColor:CYAN }} />
                <span>Bilgilendirme e-postaları almak istiyorum. *</span>
              </label>
              <label style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, color:"#475569", cursor:"pointer", lineHeight:1.4 }}>
                <input type="checkbox" checked={leadForm.consentAdvisor} onChange={e => setLeadForm(p => ({...p, consentAdvisor:e.target.checked}))} style={{ width:16, height:16, marginTop:1, flexShrink:0, accentColor:CYAN }} />
                <span>Uzman Eğitim Danışmanının bana ulaşmasını istiyorum.</span>
              </label>
            </div>
            <button onClick={handleLeadSubmit} disabled={!leadForm.name || !leadForm.phone || !leadForm.email || !leadForm.consentKvkk || !leadForm.consentEmail || leadLoading || phoneValid === false}
              style={{ ...S.btnNext, width:"100%", marginTop:16, padding:"13px 0", opacity: (!leadForm.name||!leadForm.phone||!leadForm.email||!leadForm.consentKvkk||!leadForm.consentEmail||leadLoading||phoneValid===false) ? 0.5 : 1 }}>
              {leadLoading ? "Gönderiliyor..." : "📄 PDF İndir"}
            </button>
            <button onClick={() => setLeadModal(false)} style={{ width:"100%", marginTop:10, background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:13 }}>İptal</button>
        </div>
      </div>
    )}
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bftSpin { to { transform: rotate(360deg); } }
        input:focus { outline:none; border-color:${CYAN} !important; }
        #bft-root input[type="text"], #bft-root input[type="number"], #bft-root input[type="date"], #bft-root input[type="tel"], #bft-root input[type="email"], #bft-root input:not([type]) {
          background:#fff !important; color:#0f172a !important; border:1.5px solid #e2e8f0 !important;
          border-radius:10px !important; padding:10px 14px !important; font-size:14px !important;
          font-family:inherit !important; box-shadow:none !important; width:100% !important;
          box-sizing:border-box !important; height:44px !important; line-height:normal !important;
          -webkit-appearance:none !important; appearance:none !important;
        }
        #bft-root input[type="checkbox"] {
          width:16px !important; height:16px !important; min-width:16px !important; flex-shrink:0 !important;
          padding:0 !important; margin:0 !important; border-radius:3px !important;
          -webkit-appearance:auto !important; appearance:auto !important; accent-color:${CYAN} !important;
        }
        #bft-root, #bft-root * { box-sizing: border-box; }
        #bft-root { overflow-x: hidden; max-width: 100vw; }
        #bft-root input.bft-phone { flex:1 1 auto !important; width:auto !important; min-width:0 !important; }
        #bft-root button { font-family:inherit !important; }
        #bft-root button.bft-dial-btn { color:#0f172a !important; -webkit-text-fill-color:#0f172a !important; text-shadow:none !important; }
        @media (max-width: 768px) {
          #bft-root .bft-body { grid-template-columns:1fr !important; max-width:100% !important; padding:0 12px !important; }
          #bft-root .bft-side { display:none !important; }
          #bft-root .bft-r2 { grid-template-columns:1fr !important; }
          #bft-root .bft-main { padding:20px 16px !important; }
          #bft-root .bft-steps-desktop { display:none !important; }
          #bft-root .bft-steps-mobile { display:block !important; }
          #bft-root .bft-pdf-btn-mobile { display:flex !important; }
          #bft-root input, #bft-root select, #bft-root textarea { font-size:16px !important; }
          #bft-root .bft-hdr-cnt { padding:12px 16px !important; }
        }
        @media (min-width: 769px) {
          #bft-root .bft-pdf-btn-mobile { display:none !important; }
          #bft-root .bft-steps-mobile { display:none !important; }
        }
      `}</style>

      <header style={S.hdr}>
        <div style={S.cnt} className="bft-hdr-cnt">
          {isStaff ? <button onClick={() => navigate("/dashboard")} style={S.backBtn}>← Dashboard</button> : <span />}
          <span style={S.htitle}>Fiyat Teklifi</span>
          <div style={{ width:100 }} />
        </div>
      </header>

      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
        {/* Masaüstü adım göstergesi */}
        <div style={{ maxWidth: isStaff ? 1100 : 800, margin:"0 auto", padding:"12px 16px", display:"flex", alignItems:"center" }} className="bft-steps-desktop">
          {STEPS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0,
                background: i < step ? "#22c55e" : i === step ? CYAN : "#e2e8f0",
                color: i <= step ? "#fff" : "#94a3b8" }}>{i+1}</div>
              {i < STEPS.length-1 && <div style={{ flex:1, height:2, background: i<step?"#22c55e":"#e2e8f0", margin:"0 8px" }} />}
            </div>
          ))}
        </div>
        {/* Mobil adım göstergesi: "Adım X/6 · Başlık" + progress bar */}
        <div style={{ padding:"12px 16px", display:"none" }} className="bft-steps-mobile">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:600, color:CYAN }}>{STEPS[step]}</span>
            <span style={{ fontSize:12, color:"#94a3b8" }}>Adım {step+1}/{STEPS.length}</span>
          </div>
          <div style={{ height:4, background:"#e2e8f0", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", background:CYAN, borderRadius:2, width:`${((step+1)/STEPS.length)*100}%`, transition:"width 0.3s" }} />
          </div>
        </div>
      </div>

      <div style={isStaff ? S.body : { maxWidth:800, margin:"20px auto", padding:"0 20px", display:"block" }} className="bft-body">
        <main style={S.main} className="bft-main">
          {stepName === "Genel Bilgi" && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Öğrenci Bilgileri</h2>
              <div style={S.r2} className="bft-r2">
                <div style={S.fld}><label style={S.lbl}>Ad Soyad</label><input style={S.fti} value={student.name} onChange={e => setStudent(p => ({...p, name:e.target.value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s'-]/g, "")}))} /></div>
                <div style={S.fld}><label style={S.lbl}>Yaş</label><input style={S.fti} type="number" value={student.age} onChange={e => setStudent(p => ({...p, age:e.target.value}))} /></div>
              </div>
              <div style={S.fld}>
                <label style={S.lbl}>Cinsiyet</label>
                <div style={{ display:"flex", gap:12, marginTop:6 }}>
                  {["Erkek","Kadın"].map(g => (<div key={g} style={{ ...S.cinsiyetBtn, ...(student.gender===g ? S.cinsiyetBtnActive : {}) }} onClick={() => setStudent(p => ({...p, gender:g}))}>{g}</div>))}
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:24 }}>
                <button onClick={next} disabled={!canNext} style={{ ...S.btnNext, opacity: !canNext ? 0.5 : 1, cursor: !canNext ? "not-allowed" : "pointer" }}>İleri →</button>
              </div>
            </div>
          )}

          {stepName === "Destinasyon" && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Destinasyon Seçimi</h2>
              <p style={S.slbl}>DİL</p>
              <div style={S.g3}>
                {nav.languages.filter(l => isStaff || l === "İngilizce").map(l => (<div key={l} style={cur.lang===l && !cur.isOnline ? S.selActive : S.sel} onClick={() => setCur({...emptyDest(cur.startDate, cur.weeks), lang:l, country: (!isStaff && FIXED_COUNTRY) ? FIXED_COUNTRY : ""})}>{l}</div>))}
                <div style={cur.isOnline ? S.selOnlineActive : S.selOnline} onClick={() => setCur({...emptyDest(cur.startDate, cur.weeks), isOnline:true, brand:"EC", city:"EC Live", lang:"İngilizce", course:null})}>🌐 Online Kurs</div>
              </div>
              {(isStaff || !FIXED_COUNTRY) && !cur.isOnline && cur.lang && <><p style={S.slbl}>ÜLKE</p><div style={S.g3}>{(nav.countries[cur.lang]||[]).map(c => (<div key={c} style={cur.country===c ? S.selActive : S.sel} onClick={() => setCur(p => ({...p, country:c, city:"", brand:"", course:null, acc:null, cityData:null}))}>{c}</div>))}</div></>}
              {!cur.isOnline && cur.country && <><p style={S.slbl}>ŞEHİR</p><div style={S.g3}>{(nav.citiesByLang[cur.lang]?.[cur.country]||[]).map(c => (<div key={c} style={cur.city===c ? S.selActive : S.sel} onClick={() => { setCur(p => ({...p, city:c, brand:"", course:null, acc:null, cityData:null})); if (window.innerWidth <= 768) { setTimeout(() => { const el = document.getElementById("bft-marka-baslik"); if (el) el.scrollIntoView({ behavior:"smooth", block:"start" }); }, 150); } }}>{c}</div>))}</div></>}
              {!cur.isOnline && cur.city && <><p style={S.slbl} id="bft-marka-baslik">OKUL ADI</p><div style={S.g3}>{(nav.brandsByCity[cur.city]||[]).map(b => (<div key={b} style={cur.brand===b ? S.selActive : S.sel} onClick={() => setCur(p => ({...p, brand:b, course:null, acc:null, cityData:null}))}>{b}</div>))}</div></>}
              {cur.isOnline && <>
                <p style={S.slbl}>PAKET SEÇİMİ</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {EC_LIVE.map((c,i) => (<div key={i} style={cur.course?.name===c.name ? S.selActive : S.sel} onClick={() => setCur(p => ({...p, course:c}))}><strong>{c.name}</strong><span style={{ marginLeft:8, color:"#64748b", fontSize:12 }}>{c.hours > 0 ? `${c.hours} saat/hafta · ` : ""}€{c.tiers[0].price}/haftadan</span></div>))}
                </div>
                {cur.course && <div style={{ marginTop:10, padding:"8px 12px", background:"#f0fdff", border:`1px solid ${CYAN}`, borderRadius:8, fontSize:12, color:CYAN }}>✓ Online kurs seçildi — konaklama adımı atlanacak</div>}
              </>}
            </div>
          )}

          {stepName === "Kurs" && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>{cur.isOnline ? "Kurs Detayı — EC Live" : `Kurs Seçimi — ${cur.brand} ${cur.city}`}{cur.cityLoading && <span style={{ display:"inline-flex", alignItems:"center", gap:8, marginLeft:12, verticalAlign:"middle" }}><span style={{ display:"inline-block", width:16, height:16, border:`2.5px solid ${CYAN}`, borderTopColor:"transparent", borderRadius:"50%", animation:"bftSpin 0.7s linear infinite" }} /><span style={{ fontSize:14, color:CYAN, fontWeight:600 }}>Programlar Yükleniyor...</span></span>}</h2>
              <div style={S.r2} className="bft-r2">
                <div style={S.fld}><label style={S.lbl}>Başlangıç Tarihi (Pazartesi)</label><input type="date" style={S.fti} value={cur.startDate} min={new Date().toISOString().split("T")[0]} onChange={e => handleDateChange(e.target.value)} /></div>
                <div style={S.fld}><label style={S.lbl}>Süre (Hafta)</label><input style={S.fti} type="number" min={1} max={52} value={weeksInput !== null ? weeksInput : cur.weeks} onChange={e => {
                  const raw = e.target.value;
                  setWeeksInput(raw);                        // boş bırakılabilsin
                  const n = parseInt(raw, 10);
                  if (raw !== "" && !isNaN(n) && n >= 1 && n !== cur.weeks) {
                    const w = Math.min(n, 52);
                    setCur(p => ({...p, weeks: w,
                      accWeeks: p.accWeeksTouched ? Math.min(p.accWeeks || w, w) : w,
                      course:null, selectedPackage:null, courseTab:null, acc:null, noAccommodation:false}));
                  }
                }} onBlur={() => setWeeksInput(null)} />
                </div>
              </div>
              {!cur.isOnline && (() => {
                const packages = getAvailablePackages(cur.cityData?.discounts, cur.weeks, cur.startDate);
                const hasPackages = packages.length > 0;
                // Aktif sekme: paket varsa ve henuz secim yoksa varsayilan "package", aksi "standard"
                const courseTab = cur.courseTab || (hasPackages ? "package" : "standard");
                return (<>
                  {hasPackages && (
                    <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                      <div onClick={() => setCur(p => ({...p, courseTab:"package"}))} style={{ flex:1, textAlign:"center", padding:"12px", borderRadius:12, cursor:"pointer", fontWeight:600, fontSize:13, border:`1.5px solid ${courseTab==="package" ? CYAN : "#e2e8f0"}`, background: courseTab==="package" ? "#f0fdff" : "#fff", color: courseTab==="package" ? CYAN : "#64748b" }}>🎁 Paket Programlar</div>
                      <div onClick={() => setCur(p => ({...p, courseTab:"standard"}))} style={{ flex:1, textAlign:"center", padding:"12px", borderRadius:12, cursor:"pointer", fontWeight:600, fontSize:13, border:`1.5px solid ${courseTab==="standard" ? CYAN : "#e2e8f0"}`, background: courseTab==="standard" ? "#f0fdff" : "#fff", color: courseTab==="standard" ? CYAN : "#64748b" }}>Kendi Programını Oluştur</div>
                    </div>
                  )}
                  {hasPackages && courseTab === "package" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {packages.map((pkg,i) => {
                        const matchCourse = courses.find(c => c.name === pkg.course_name);
                        const sel = cur.selectedPackage?.course_name === pkg.course_name && cur.selectedPackage?.weeks === pkg.weeks && cur.selectedPackage?.package_price === pkg.package_price;
                        const curSym = { GBP:"£", EUR:"€", USD:"$", CAD:"CA$" }[pkg.currency] || pkg.currency;
                        return (<div key={i} style={{ padding:"16px 18px", borderRadius:12, cursor:"pointer", border:`1.5px solid ${sel ? CYAN : "#e2e8f0"}`, background: sel ? "#f0fdff" : "#fff" }}
                          onClick={() => setCur(p => ({...p, selectedPackage: pkg, course: matchCourse || p.course, noAccommodation: false, acc: null, transfer: packageIncludesTransfer(pkg) ? null : p.transfer }))}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:14, color: sel ? CYAN : "#0f172a" }}>{matchCourse ? (isStaff ? courseWithLang(matchCourse, "orig") : courseWithLang(matchCourse, "tr")) : pkg.course_name}</div>
                              <div style={{ fontSize:11, color:"#10b981", fontWeight:600, marginTop:3 }}>{pkg.package_type === "with_accommodation" ? "✓ Konaklama Dahil Paket" : "Konaklama Hariç Paket"}</div>
                              {pkg.includes_tr && <div style={{ fontSize:11, color:"#64748b", marginTop:5, lineHeight:1.5 }}>Dahil: {pkg.includes_tr}</div>}
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                              <div style={{ fontWeight:700, fontSize:16, color: sel ? CYAN : "#0f172a" }}>{curSym}{roundHalf(pkg.package_price).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              <div style={{ fontSize:11, color:"#94a3b8" }}>{pkg.weeks} hafta</div>
                            </div>
                          </div>
                        </div>);
                      })}
                    </div>
                  )}
                  {(!hasPackages || courseTab === "standard") && (
                    <div style={S.g3}>
                      {courses.length === 0 && !cur.cityLoading && <p style={{ color:"#94a3b8", fontSize:13 }}>Bu şehir için kurs verisi bulunamadı.</p>}
                      {courses.map((c,i) => {
                        const valid = isCourseValid(c, cur.weeks), sel = !cur.selectedPackage && cur.course?.name === c.name;
                        return (<div key={i} style={sel ? S.selActive : valid ? S.sel : S.selDisabled} onClick={() => valid && setCur(p => ({...p, course:c, selectedPackage:null}))}>
                          <div style={{ fontWeight:600 }}>{isStaff ? courseWithLang(c, "orig") : courseWithLang(c, "tr")}</div>
                          {(c.lessons > 0 || c.hours > 0) && (
                            <div style={{ fontSize:11, color: sel?"inherit":"#0d9488", marginTop:3, fontWeight:500 }}>
                              {[c.lessons > 0 ? `${c.lessons} ders` : null, c.hours > 0 ? `${c.hours} saat/hafta` : null].filter(Boolean).join(" · ")}
                            </div>
                          )}
                          {c.max_weeks && <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>Maks. {c.max_weeks} hafta</div>}
                          {!valid && <div style={{ fontSize:11, color:"#ef4444", marginTop:2 }}>Bu hafta için geçersiz</div>}
                        </div>);
                      })}
                    </div>
                  )}
                </>);
              })()}
              {cur.isOnline && cur.course && (<div style={{ padding:"14px 16px", background:"#f0fdff", border:`1.5px solid ${CYAN}`, borderRadius:12 }}><strong>{isStaff ? courseWithLang(cur.course, "orig") : courseWithLang(cur.course, "tr")}</strong>{cur.course.hours > 0 ? ` — ${cur.course.hours} saat/hafta` : ""}<br/><span style={{ fontSize:12, color:"#64748b" }}>{cur.weeks} hafta · €{roundHalf(getPrice(cur.course, cur.weeks)).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>)}
            </div>
          )}

          {stepName === "Konaklama" && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Konaklama — {cur.brand} {cur.city}{cur.cityLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginLeft:8 }}>yükleniyor...</span>}</h2>
              {cur.selectedPackage?.package_type === "no_accommodation" && (
                <div style={{ marginBottom:16, padding:"12px 14px", background:"#f0fdff", border:`1px solid ${CYAN}`, borderRadius:10, fontSize:12, color:"#0f172a" }}>
                  🎁 <strong>Paket konaklamasız.</strong> İstersen aşağıdan konaklama ekle, istemezsen en alttan "Konaklama Talep Etmiyorum"u seç.
                </div>
              )}
              {accs.length === 0 && !cur.cityLoading && <p style={{ color:"#94a3b8", fontSize:13 }}>Konaklama verisi bulunamadı.</p>}
              {accs.length > 0 && (() => {
                const types = [...new Set(accs.map(a => a.type))];
                return (<>
                  <div style={S.g3}>
                    {types.map(t => (<div key={t} style={accType===t ? S.selActive : S.sel} onClick={() => { setAccType(t); setCur(p => ({...p, acc:null, noAccommodation:false, accWeeks: p.accWeeksTouched ? Math.min(p.accWeeks || p.weeks, p.weeks) : p.weeks})); }}>{t}</div>))}
                    {/* Konaklama Talep Etmiyorum — tip butonlarinin saginda, gorsel ozellikleri pastel sari */}
                    <div onClick={() => { setAccType(""); setCur(p => ({...p, acc:null, noAccommodation:true})); }}
                      style={{ padding:12, borderRadius:12, cursor:"pointer", textAlign:"center", fontWeight:600, fontSize:13,
                        border:`1.5px solid ${cur.noAccommodation ? "#94a3b8" : "#e2e8f0"}`, background: cur.noAccommodation ? "#f1f5f9" : "#f8fafc", color: cur.noAccommodation ? "#475569" : "#94a3b8" }}>
                      {cur.noAccommodation ? "✓ Konaklama Talep Etmiyorum" : "Konaklama Talep Etmiyorum"}
                    </div>
                  </div>
                  {accType && (
                    <div style={{ marginTop:16 }}>
                      <div style={{ ...S.fld, maxWidth:220, marginBottom:0 }}>
                        <label style={S.lbl}>Konaklama Süresi (Hafta)</label>
                        <input style={S.fti} type="number" min={1} max={cur.weeks}
                          value={accWeeksInput !== null ? accWeeksInput : (cur.accWeeks || cur.weeks)}
                          onChange={e => {
                            const raw = e.target.value;
                            const n = parseInt(raw, 10);
                            if (raw !== "" && !isNaN(n) && n >= 1) {
                              const v = Math.min(n, cur.weeks);   // vize kuralı: kurs süresini aşamaz
                              setAccWeeksInput(String(v));        // aşan değer ekranda da kısılır
                              setCur(p => ({...p, accWeeks: v, accWeeksTouched: true}));
                            } else {
                              setAccWeeksInput(raw);              // boş bırakılabilsin
                            }
                          }}
                          onBlur={() => setAccWeeksInput(null)} />
                      </div>
                      {cur.accWeeks && cur.accWeeks !== cur.weeks && (
                        <div style={{ marginTop:10, padding:"10px 12px", background:"#fef3c7", border:"1px solid #fbbf24", borderRadius:8, fontSize:12, color:"#92400e", fontWeight:600 }}>
                          ⚠️ Kurs süresi ile konaklama süresi farklı! (Kurs: {cur.weeks} hafta · Konaklama: {cur.accWeeks} hafta)
                        </div>
                      )}
                    </div>
                  )}
                  {accType && (
                    <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
                      {accs.filter(a => a.type === accType).map((a,i) => {
                        const sel = cur.acc?.name===a.name && cur.acc?.room===a.room && cur.acc?.board===a.board && cur.acc?.bathroom===a.bathroom && cur.acc?.price===a.price;
                        const hsActive = getAccommodationHighSeasonSupplement(a, cur.accWeeks || cur.weeks, cur.startDate).isActive;
                        return (<div key={i} style={sel ? S.accActive : S.acc} onClick={() => setCur(p => ({...p, acc:a, noAccommodation:false}))}>
                          <div>
                            <div style={{ fontWeight:600 }}>{a.name}</div>
                            <div style={{ fontSize:12, color: sel?"inherit":"#0d9488", marginTop:2, fontWeight:500 }}>{[a.room, a.bathroom, a.board, a.distance].filter(Boolean).join(" · ")}</div>
                            {hsActive && <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>⚠️ Yüksek sezon fiyatı geçerli</div>}
                            {a.notes && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{a.notes}</div>}
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontWeight:700, color: hsActive ? "#f59e0b" : "inherit" }}>{a.currency} {hsActive ? a.hs_price : a.price}/h</div>
                            <div style={{ fontSize:11, color: sel?"inherit":"#94a3b8" }}>{cur.accWeeks || cur.weeks}h: {a.currency} {roundHalf((hsActive ? a.hs_price : a.price) * (cur.accWeeks || cur.weeks)).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        </div>);
                      })}
                    </div>
                  )}
                </>);
              })()}
            </div>
          )}

          {stepName === "Ek Hizmetler" && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Ek Hizmetler — {cur.brand} {cur.city}</h2>
              {(() => {
                const allFees = cur.cityData?.fees || [];
                const age = parseInt(student.age) || 0;
                const startD = cur.startDate ? new Date(cur.startDate) : null;
                const compulsory = calcFees(allFees, cur.weeks, parseInt(student.age)||0, cur.acc?.type, cur.accWeeks || cur.weeks).items;
                const optional = allFees.filter(f => {
                  if (!["optional_service","supplement","upgrade","course_addon","post_departure"].includes(f.addon_type)) return false;
                  if (f.eligible_courses && !f.eligible_courses.split(",").map(s=>s.trim()).includes(cur.course?.name)) return false;
                  if (f.min_age && age < f.min_age) return false;
                  if (f.max_age && age > f.max_age) return false;
                  if (f.date_start && startD && new Date(f.date_start) > startD) return false;
                  if (f.date_end && startD && new Date(f.date_end) < startD) return false;
                  return true;
                });
                // Paket secildiyse zorunlu ucret + opsiyonel gizli (paket her sey dahil) — sadece Transfer gosterilir
                if (cur.selectedPackage) return <p style={{ color:"#64748b", fontSize:13 }}>🎁 Paket programında kurs ücretleri dahildir. Aşağıdan dilerseniz transfer ekleyebilirsiniz.</p>;
                if (compulsory.length === 0 && (isStaff ? optional.length === 0 : true)) return <p style={{ color:"#94a3b8", fontSize:13 }}>Bu kurs ve tarih için eklenebilecek add-on bulunmuyor.</p>;
                return (<>
                  {compulsory.length > 0 && (
                    <div style={{ marginBottom:20 }}>
                      <p style={S.slbl}>Zorunlu Ücretler</p>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {compulsory.map((f,i) => (<div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13 }}><span style={{ fontWeight:600 }}>{f.name}</span><span style={{ fontWeight:600, color:"#64748b" }}>{f.currency} {roundHalf(f.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>))}
                      </div>
                    </div>
                  )}
                  {isStaff && optional.length > 0 && (
                    <div>
                      <p style={S.slbl}>İsteğe Bağlı Eklemeler</p>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {optional.map((f,i) => {
                          const sel = cur.addons?.some(a => a.name === f.name);
                          const amt = f.calc_type === "per_week" ? f.amount * cur.weeks : f.amount;
                          return (<div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderRadius:12, border:`1.5px solid ${sel ? CYAN : "#e2e8f0"}`, background: sel ? "#f0fdff" : "#fff", cursor:"pointer" }}
                            onClick={() => setCur(p => ({ ...p, addons: sel ? (p.addons||[]).filter(a => a.name !== f.name) : [...(p.addons||[]), { ...f, totalAmount: amt }] }))}>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13, color: sel ? CYAN : "#0f172a" }}>{f.name}</div>
                              {f.notes && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{f.notes}</div>}
                              {f.addon_type === "supplement" && <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>Ek ücret</div>}
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0 }}>
                              <div style={{ fontWeight:700, color: sel ? CYAN : "#0f172a" }}>{f.currency} {roundHalf(amt).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              {f.calc_type === "per_week" && <div style={{ fontSize:11, color:"#94a3b8" }}>{f.amount}/h × {cur.weeks}h</div>}
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>
                  )}
                </>);
              })()}
            </div>
          )}

          {stepName === "Transfer" && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Transfer — {cur.brand} {cur.city}</h2>
              {cur.cityData?.transfers?.length > 0 && (
                <div>
                  <p style={S.slbl}>Havalimanı Transferi</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {cur.cityData.transfers.map((t, ti) => {
                      const sel = cur.transfer?.airport === t.airport && cur.transfer?.code === t.code;
                      return (<div key={ti} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderRadius:12, border:`1.5px solid ${sel ? CYAN : "#e2e8f0"}`, background: sel ? "#f0fdff" : "#fff", cursor:"pointer" }} onClick={() => setCur(p => ({ ...p, transfer: sel ? null : t }))}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color: sel ? CYAN : "#0f172a" }}>{t.airport}{t.code?.trim() ? ` (${t.code.trim()})` : ""}</div>
                          {t.notes && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{t.notes}</div>}
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontWeight:700, color: sel ? CYAN : "#0f172a" }}>{t.currency} {roundHalf(t.one_way).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>Tek yön</div>
                        </div>
                      </div>);
                    })}
                  </div>
                  <div onClick={() => setCur(p => ({ ...p, transfer: null }))}
                    style={{ marginTop:12, padding:"12px 14px", borderRadius:12, cursor:"pointer", textAlign:"center", fontWeight:600, fontSize:13,
                      border:`1.5px solid ${!cur.transfer ? "#94a3b8" : "#e2e8f0"}`, background: !cur.transfer ? "#f1f5f9" : "#f8fafc", color: !cur.transfer ? "#475569" : "#94a3b8" }}>
                    {!cur.transfer ? "✓ Transfer İstemiyorum" : "Transfer İstemiyorum"}
                  </div>
                </div>
              )}
            </div>
          )}

          {stepName === "Özet" && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Teklif Özeti</h2>
              {destinations.length === 0 && <p style={{ color:"#94a3b8" }}>Henüz destinasyon eklenmedi.</p>}
              {destinations.map((d,i) => {
                const f = d.isOnline ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" } : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type, d.accWeeks || d.weeks);
                const cur2 = d.course?.currency || f.currency;
                const sD = d.startDate ? new Date(d.startDate) : null;
                const eD = sD ? addWeeksToDate(sD, d.weeks) : null;
                const accSD = sD ? (() => { const x = new Date(sD); x.setDate(sD.getDate() - 1); return x; })() : null;
                const accED = eD ? (() => { const x = new Date(eD); x.setDate(eD.getDate() + 2); return x; })() : null;
                return (
                  <div key={i} style={S.summaryCard}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><strong style={{ fontSize:15 }}>{d.brand} {d.city}</strong><div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:12, color:"#64748b" }}>{d.weeks} hafta</span><button onClick={() => removeDestination(i)} title="Bu okulu sil" style={{ width:26, height:26, borderRadius:"50%", border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", cursor:"pointer", fontSize:16, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, padding:0 }}>×</button></div></div>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{d.selectedPackage ? "Paket Program" : "Kurs"}</div>
                      {d.selectedPackage ? (<>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}><span style={{ fontWeight:600 }}>{d.course ? (isStaff ? courseWithLang(d.course, "orig") : courseWithLang(d.course, "tr")) : d.selectedPackage.course_name}</span>{isStaff && <span style={{ fontWeight:600, color:CYAN }}>{fmt(d.selectedPackage.package_price, cur2)}</span>}</div>
                        <div style={{ fontSize:11, color:"#10b981", fontWeight:600, marginTop:3 }}>{d.selectedPackage.package_type === "with_accommodation" ? "✓ Konaklama Dahil" : "Konaklama Hariç"}</div>
                        {d.selectedPackage.includes_tr && <div style={{ fontSize:11, color:"#64748b", marginTop:4, lineHeight:1.5 }}>Dahil: {d.selectedPackage.includes_tr}</div>}
                      </>) : (<>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}><span style={{ fontWeight:600 }}>{isStaff ? courseWithLang(d.course, "orig") : courseWithLang(d.course, "tr")}</span>{isStaff && <span style={{ fontWeight:600, color:CYAN }}>{fmt(d.courseBasePrice, cur2)}</span>}</div>
                      {d.courseHsAmount > 0 && (<>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}><span style={{ color:"#f59e0b" }}>High Season Supplement ({formatDateShort(d.courseHsStart)} – {formatDateShort(d.courseHsEnd)})</span>{isStaff && <span style={{ color:"#f59e0b", fontWeight:500 }}>+ {fmt(d.courseHsAmount, cur2)}</span>}</div>

                      </>)}
                      </>)}
                      {sD && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📅 {fmtDate(sD)} — {fmtDate(eD)}</div>}
                    </div>
                    {d.acc && !d.isOnline && d.selectedPackage?.package_type !== "with_accommodation" && (
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Konaklama</div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}><span style={{ fontWeight:600 }}>{[d.acc.name, d.acc.bathroom, d.acc.board].filter(Boolean).join(" · ")} ({d.accWeeks || d.weeks} hafta)</span>{isStaff && <span style={{ fontWeight:600, color:CYAN }}>{fmt(d.accBasePrice, cur2)}</span>}</div>
                        {d.accHsAmount > 0 && (<>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}><span style={{ color:"#f59e0b" }}>High Season Supplement ({formatDateShort(d.accHsStart)} – {formatDateShort(d.accHsEnd)})</span>{isStaff && <span style={{ color:"#f59e0b", fontWeight:500 }}>+ {fmt(d.accHsAmount, cur2)}</span>}</div>

                        </>)}
                        {accSD && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📅 {fmtDate(accSD)} — {fmtDate(accED)}</div>}
                      </div>
                    )}
                    {!d.selectedPackage && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:10 }}><span style={{ color:"#64748b" }}>Kayıt + Materyal</span>{isStaff && <span style={{ fontWeight:600 }}>{fmt(f.total, cur2)}</span>}</div>}
                    {(d.addons||[]).map((a,ai) => (<div key={ai} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}><span style={{ color:"#64748b" }}>{a.name}</span>{isStaff && <span>{fmt(a.totalAmount, cur2)}</span>}</div>))}
                    {d.transfer && (<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}><span style={{ color:"#64748b" }}>Transfer ({d.transfer.airport})</span>{isStaff && <span>{fmt(d.transfer.one_way, d.transfer.currency)}</span>}</div>)}
                    {(() => { const _dt = getDestinationTotals(d, f); return (<>
                    {!_dt.isPackage && _dt.appliedDiscounts.map((disc, di) => (
                      <div key={di} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6, color:"#16a34a", fontWeight:500 }}>
                        <span>{disc.label} ({disc.value_type === "percentage" ? `%${disc.value}` : disc.value_type === "free" ? "Ücretsiz" : `${disc.value} Sabit`})</span>
                        {isStaff && <span>- {fmt(disc.amount, cur2)}</span>}
                      </div>
                    ))}
                    {isStaff
                      ? <div style={{ borderTop:`1.5px solid #0f172a`, paddingTop:8, display:"flex", justifyContent:"space-between", fontWeight:700 }}><span>Toplam</span><span style={{ color:CYAN }}>{fmt(_dt.grandTotal, cur2)}</span></div>
                      : <div style={{ borderTop:`1.5px solid #e2e8f0`, paddingTop:10, marginTop:4, fontSize:12, color:"#64748b", textAlign:"center" }}>Fiyat detayları PDF teklifinizde yer alacaktır.</div>
                    }
                    </>); })()}

                  </div>
                );
              })}
              {destinations.length < 3
                ? <button onClick={addNew} style={S.addBtn}>+ Yeni Destinasyon Ekle</button>
                : <button onClick={() => setConfirmModal({
                    title: "Yeni Teklif Oluştur",
                    message: "Tüm okullar silinecek, emin misiniz?",
                    hint: "İpucu: Eklediğiniz okulları tek tek silip (kartların sağ üstündeki × ile) yerlerine başka okul da ekleyebilirsiniz.",
                    confirmLabel: "Evet, Yeni Teklif",
                    danger: false,
                    onConfirm: reset,
                  })} style={{ ...S.addBtn, border:`1.5px solid ${CYAN}`, background:"#f0fdff", color:CYAN }}>+ Yeni Teklif Oluştur</button>
              }
            </div>
          )}

          <div style={S.navBox}>
            {stepName !== "Genel Bilgi" && stepName !== "Özet" && <button onClick={() => { setStep(s => s-1); setTimeout(() => { const r = document.getElementById("bft-root"); if (r) { const t = r.getBoundingClientRect().top + window.pageYOffset - 20; window.scrollTo({ top:t, behavior:"smooth" }); } else window.scrollTo({ top:0, behavior:"smooth" }); }, 100); }} style={S.btnBack}>← Geri</button>}
            {stepName !== "Özet" && stepName !== "Genel Bilgi" && (<button style={{ ...S.btnNext, opacity: !canNext ? 0.5 : 1, cursor: !canNext ? "not-allowed" : "pointer" }} disabled={!canNext} onClick={next}>{step === STEPS.indexOf("Özet") - 1 ? "Özete Geç →" : "İleri →"}</button>)}
            {stepName === "Özet" && destinations.length > 0 && (<button onClick={() => isStaff ? generatePDF() : (setLeadForm(p => ({...p, name: student.name || p.name})), setLeadModal(true))} style={{ ...S.btnNext, marginLeft:"auto" }} className={isStaff ? "bft-pdf-btn-mobile" : ""}>📄 PDF Oluştur</button>)}
          </div>
        </main>

        {isStaff && <aside style={S.side} className="bft-side">
          <h3 style={S.sideTtl}>Anlık Özet</h3>
          <div style={S.liveBox}>
            {cur.lang && <div style={{ marginBottom:4 }}>📍 {cur.lang}{cur.country ? ` / ${cur.country}` : ""}{cur.city ? ` / ${cur.city}` : ""}{cur.brand ? ` / ${cur.brand}` : ""}</div>}
            {cur.course && <div style={{ marginBottom:4 }}>📚 {courseWithLang(cur.course, "orig")} ({cur.weeks}h)</div>}
            {cur.acc && <div style={{ marginBottom:4 }}>🏠 {cur.acc.name}</div>}
            {courseTotal > 0 && isCourseValid(cur.course, cur.weeks) && (
              <div style={S.liveTotal}>
                Anlık: {fmt(currentTotal, cur.course?.currency || feesData.currency)}
                {(coursePriceData.hsAmount > 0 || accPriceData.hsAmount > 0) && (
                  <span style={{ fontSize:10, color:"#f59e0b", display:"block" }}>
                    {coursePriceData.hsAmount > 0 && `(+${fmt(coursePriceData.hsAmount, cur.course?.currency)} kurs HS)`}
                    {accPriceData.hsAmount > 0 && `(+${fmt(accPriceData.hsAmount, cur.acc?.currency)} konaklama HS)`}
                  </span>
                )}
              </div>
            )}
          </div>
          {destinations.length > 0 && destinations.map((d,i) => (<div key={i} style={{ fontSize:12, padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}><strong>{d.brand || d.city}</strong>{d.brand && d.city ? ` · ${d.city}` : ""} · {d.weeks}h · {courseWithLang(d.course, "orig")?.slice(0,24)}</div>))}
          {stepName === "Özet" && destinations.length > 0 && (<button onClick={() => isStaff ? generatePDF() : (setLeadForm(p => ({...p, name: student.name || p.name})), setLeadModal(true))} style={S.pdfBtn}>📄 PDF Oluştur</button>)}
        </aside>}
      </div>
    </div>

    <PdfTemplate destinations={destinations} student={student} user={user} logoSrc={logoSrc} />
    </>
  );
}

function addWeeksToDate(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function PdfTemplate({ destinations, student, user, logoSrc }) {
  if (!destinations?.length) return null;
  const phone = user?.phone || "905419189177";
  return (
    <div id="pdf-area" style={{ display:"none", fontFamily:"Arial, Helvetica, sans-serif", background:"#fff" }}>
      {destinations.map((d, idx) => {
        const f = d.isOnline ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" } : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type, d.accWeeks || d.weeks);
        const cur = d.course?.currency || f.currency || "GBP";
        const curSym = { GBP:"£", EUR:"€", USD:"$", CAD:"CA$" }[cur] || cur;
        const startD = d.startDate ? new Date(d.startDate) : new Date();
        const endD = addWeeksToDate(startD, d.weeks);
        const accStartD = new Date(startD); accStartD.setDate(startD.getDate() - 1);
        // Konaklama bitişi kendi süresine göre (kurs süresinden farklı olabilir)
        const accEndBase = addWeeksToDate(startD, d.accWeeks || d.weeks);
        const accEndD = new Date(accEndBase); accEndD.setDate(accEndBase.getDate() + 2);
        const notes = [];
        if (d.course?.morning) notes.push("Sabah garantisi mevcut (ek ücret uygulanabilir)");
        if (d.course?.notes && !d.courseHsActive) notes.push(d.course.notes);
        if (d.acc?.notes && !d.accHsActive) notes.push(d.acc.notes);
        if (!d.transfer && d.cityData?.transfers?.length > 0) { const t = d.cityData.transfers[0]; notes.push(`Transfer bilgisi: ${t.airport}${t.code?.trim() ? ` (${t.code.trim()})` : ""} — ${cur} ${Number(t.one_way).toLocaleString("tr-TR")} tek yön${t.notes ? " · " + t.notes : ""}`); }

        return (
          <div key={idx} className="pdf-block" style={{ width:"210mm", padding:"8mm 18mm 8mm", boxSizing:"border-box", background:"#fff", display:"block", pageBreakBefore: idx > 0 ? "always" : "auto", pageBreakAfter: "auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingBottom:"3mm", borderBottom:"0.4px solid #aaa", marginBottom:"5mm" }}>
              <div>
                <div style={{ fontSize:"7pt", color:"#999", marginBottom:"1mm" }}>Bilimevi Eğitim Danışmanınız</div>
                <div style={{ fontSize:"11pt", fontWeight:"bold", color:"#111" }}>{user?.name || "—"}</div>
                <div style={{ fontSize:"8pt", color:"#555", marginTop:"1mm" }}>{user?.email || ""}</div>
              </div>
              <img src={logoSrc} alt="Bilimevi" style={{ height:"10mm" }} />
            </div>
            <div style={{ fontSize:"54pt", fontWeight:"900", color:CYAN, lineHeight:1, marginBottom:"2mm", letterSpacing:"-1px" }}>{d.city}</div>
            <div style={{ fontSize:"20pt", fontWeight:"bold", color:"#111", marginBottom:"5mm", lineHeight:1.2 }}>{fmtDate(startD)}<br/>— {fmtDate(endD)}</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10pt", marginBottom:"0" }}><span>Teklifinize neler dahil?</span><span style={{ color:"#aaa" }}>{curSym}</span></div>
            <div style={{ fontSize:"10pt", fontWeight:"bold", color:CYAN, marginBottom:"1mm" }}>Hafta Sayısı: {d.weeks}</div>
            <div style={{ borderTop:"2px solid #111" }} />

            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"9pt" }}>
              <tbody>
                <tr style={{ borderBottom:"0.5px solid #ddd", pageBreakInside:"avoid" }}>
                  <td style={{ padding:"2.5mm 2mm 2.5mm 0", fontWeight:"bold", verticalAlign:"top", width:"20%", color:"#111" }}>Kurs</td>
                  <td style={{ padding:"2.5mm 2mm", verticalAlign:"top", width:"58%" }}>
                    <div style={{ fontWeight:"bold", fontSize:"10pt" }}>{d.brand} — {d.course?.name}</div>
                    <div style={{ fontSize:"8pt", color:"#555", marginTop:"1mm" }}><strong>Başlangıç:</strong> {fmtDate(startD)} &nbsp;|&nbsp; <strong>Bitiş:</strong> {fmtDate(endD)}</div>
                    {d.course?.lessons > 0 && <div style={{ fontSize:"8pt", color:"#777", marginTop:"1mm" }}>{d.course.lessons} ders/hafta · {d.course.hours} saat</div>}
                  </td>
                  <td style={{ padding:"2.5mm 0 2.5mm 2mm", textAlign:"right", fontWeight:"bold", fontSize:"10pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{Number(d.courseBasePrice).toLocaleString("tr-TR")},00</td>
                </tr>
                {d.courseHsAmount > 0 && (<>
                  <tr style={{ borderBottom:"0.5px solid #ddd", pageBreakInside:"avoid", background:"#fef9ec" }}>
                    <td style={{ padding:"2mm 2mm 2mm 0", verticalAlign:"top", color:"#92400e" }}></td>
                    <td style={{ padding:"2mm 2mm", verticalAlign:"top", fontSize:"9pt", color:"#92400e" }}>High Season Supplement <span style={{ fontSize:"8pt" }}>({formatDateShort(d.courseHsStart)} – {formatDateShort(d.courseHsEnd)})</span><div style={{ fontSize:"7pt", color:"#b45309", marginTop:"1mm" }}>+{d.course?.hs_supp} {cur}/hafta</div></td>
                    <td style={{ padding:"2mm 0 2mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap", color:"#92400e", fontWeight:"500" }}>+{Number(d.courseHsAmount).toLocaleString("tr-TR")},00</td>
                  </tr>
                  <tr style={{ borderBottom:"0.5px solid #ddd", pageBreakInside:"avoid" }}>
                    <td style={{ padding:"2mm 2mm 2mm 0", fontWeight:"bold", verticalAlign:"top" }}>Kurs Toplamı</td>
                    <td style={{ padding:"2mm 2mm", verticalAlign:"top" }}></td>
                    <td style={{ padding:"2mm 0 2mm 2mm", textAlign:"right", fontWeight:"bold", fontSize:"10pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{Number(d.courseTotalPrice).toLocaleString("tr-TR")},00</td>
                  </tr>
                </>)}
                {d.acc && !d.isOnline && (
                  <tr style={{ borderBottom:"0.5px solid #ddd", pageBreakInside:"avoid" }}>
                    <td style={{ padding:"2.5mm 2mm 2.5mm 0", fontWeight:"bold", verticalAlign:"top", color:"#111" }}>Konaklama</td>
                    <td style={{ padding:"2.5mm 2mm", verticalAlign:"top" }}>
                      <div style={{ fontWeight:"bold", fontSize:"10pt" }}>{d.acc.name} <span style={{ fontWeight:"normal", fontSize:"9pt" }}>({d.acc.board})</span></div>
                      <div style={{ fontSize:"8pt", color:"#555", marginTop:"1mm" }}><strong>Giriş:</strong> {fmtDate(accStartD)} &nbsp;|&nbsp; <strong>Çıkış:</strong> {fmtDate(accEndD)}</div>
                      <div style={{ fontSize:"8pt", color:"#777", marginTop:"1mm" }}>{d.acc.room} · {d.acc.bathroom} · Okula {d.acc.distance}</div>
                    </td>
                    <td style={{ padding:"2.5mm 0 2.5mm 2mm", textAlign:"right", fontWeight:"bold", fontSize:"10pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{Number(d.accBasePrice).toLocaleString("tr-TR")},00</td>
                  </tr>
                )}
                {d.acc && !d.isOnline && d.accHsAmount > 0 && (<>
                  <tr style={{ borderBottom:"0.5px solid #ddd", pageBreakInside:"avoid", background:"#fef9ec" }}>
                    <td style={{ padding:"2mm 2mm 2mm 0", verticalAlign:"top", color:"#92400e" }}></td>
                    <td style={{ padding:"2mm 2mm", verticalAlign:"top", fontSize:"9pt", color:"#92400e" }}>High Season Supplement <span style={{ fontSize:"8pt" }}>({formatDateShort(d.accHsStart)} – {formatDateShort(d.accHsEnd)})</span><div style={{ fontSize:"7pt", color:"#b45309", marginTop:"1mm" }}>+{(d.accHsPrice - d.acc.price)} {cur}/hafta</div></td>
                    <td style={{ padding:"2mm 0 2mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap", color:"#92400e", fontWeight:"500" }}>+{Number(d.accHsAmount).toLocaleString("tr-TR")},00</td>
                  </tr>
                  <tr style={{ borderBottom:"0.5px solid #ddd", pageBreakInside:"avoid" }}>
                    <td style={{ padding:"2mm 2mm 2mm 0", fontWeight:"bold", verticalAlign:"top" }}>Konaklama Toplamı</td>
                    <td style={{ padding:"2mm 2mm", verticalAlign:"top" }}></td>
                    <td style={{ padding:"2mm 0 2mm 2mm", textAlign:"right", fontWeight:"bold", fontSize:"10pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{Number(d.accTotalPrice).toLocaleString("tr-TR")},00</td>
                  </tr>
                </>)}

                {/* DİĞER — border yok, sıkı padding */}
                {f.items?.length > 0 && f.items.map((fi, fii) => (
                  <tr key={fii} style={{ pageBreakInside:"avoid" }}>
                    <td style={{ padding:"1mm 2mm 1mm 0", fontWeight: fii===0 ? "bold" : "normal", verticalAlign:"top", color:"#111", fontSize: fii===0 ? "inherit" : "9pt" }}>{fii === 0 ? "Diğer" : ""}</td>
                    <td style={{ padding:"1mm 2mm", verticalAlign:"top", fontSize:"9pt" }}>{fi.name}</td>
                    <td style={{ padding:"1mm 0 1mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{Number(fi.amount).toLocaleString("tr-TR")},00</td>
                  </tr>
                ))}

                {/* EK HİZMETLER — border yok, sıkı padding */}
                {(d.addons||[]).length > 0 && (d.addons||[]).map((a, ai) => (
                  <tr key={ai} style={{ pageBreakInside:"avoid" }}>
                    <td style={{ padding:"1mm 2mm 1mm 0", fontWeight: ai===0 ? "bold" : "normal", verticalAlign:"top", color:"#111", fontSize: ai===0 ? "inherit" : "9pt" }}>{ai === 0 ? "Ek Hizmetler" : ""}</td>
                    <td style={{ padding:"1mm 2mm", verticalAlign:"top", fontSize:"9pt" }}>{a.name}{a.notes ? ` — ${a.notes}` : ""}</td>
                    <td style={{ padding:"1mm 0 1mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{Number(a.totalAmount||0).toLocaleString("tr-TR")},00</td>
                  </tr>
                ))}

                {d.transfer && (
                  <tr style={{ borderBottom:"0.5px solid #ddd", pageBreakInside:"avoid" }}>
                    <td style={{ padding:"2mm 2mm 2mm 0", fontWeight:"bold", verticalAlign:"top", color:"#111" }}>Transfer</td>
                    <td style={{ padding:"2mm 2mm", verticalAlign:"top", fontSize:"9pt" }}>{d.transfer.airport}{d.transfer.code?.trim() ? ` (${d.transfer.code.trim()})` : ""}{d.transfer.notes ? ` — ${d.transfer.notes}` : ""}</td>
                    <td style={{ padding:"2mm 0 2mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{d.transfer.currency} {Number(d.transfer.one_way).toLocaleString("tr-TR")},00</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ borderTop:"2.5px solid #111", marginTop:"2mm", padding:"2mm 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:"bold", fontSize:"12pt", textTransform:"uppercase" }}>Toplam Tutar {cur}</span>
              <span style={{ fontWeight:"bold", fontSize:"18pt" }}>{curSym} {Number(d.courseTotalPrice + d.accTotalPrice + f.total + (d.addons?.reduce((s,a) => s + a.totalAmount, 0) || 0) + (d.transfer?.one_way || 0)).toLocaleString("tr-TR")},00</span>
            </div>

            {notes.length > 0 && (<div style={{ marginTop:"3mm", background:"#f9f9f9", padding:"3mm 4mm", borderRadius:"3mm", fontSize:"7.5pt", color:"#555", border:"0.5px solid #eee" }}><div style={{ fontWeight:"bold", marginBottom:"2mm", textTransform:"uppercase", fontSize:"7pt", color:"#888" }}>Önemli Notlar</div>{notes.map((n,i) => <div key={i} style={{ marginBottom:"1mm" }}>— {n}</div>)}</div>)}

            <div style={{ textAlign:"center", marginTop:"4mm" }}>
              <a href={`https://wa.me/${phone}`} style={{ display:"inline-block", background:CYAN, color:"#fff", padding:"3mm 10mm", borderRadius:"8mm", fontSize:"10pt", fontWeight:"bold", textDecoration:"none" }}>Eğitim Danışmanınıza Şimdi Ulaşın</a>
            </div>

            <div style={{ marginTop:"8mm", paddingTop:"4mm", borderTop:"0.5px solid #eee", display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
              <div style={{ fontSize:"8pt", color:"#333" }}>www.bilimevi.com</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:10 },
  cnt: { maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  htitle: { fontSize:15, fontWeight:600, color:"#0f172a" },
  backBtn: { background:"none", border:"1px solid #e2e8f0", padding:"8px 16px", borderRadius:10, cursor:"pointer", fontSize:13 },
  body: { maxWidth:1100, margin:"20px auto", padding:"0 20px", display:"grid", gridTemplateColumns:"1fr 280px", gap:20 },
  main: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"28px 32px" },
  ttl: { fontSize:17, fontWeight:700, marginBottom:20, color:"#0f172a" },
  slbl: { fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", margin:"16px 0 8px" },
  r2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 },
  fld: { display:"flex", flexDirection:"column", gap:6, marginBottom:12 },
  lbl: { fontSize:12, color:"#64748b" },
  fti: { padding:"10px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, fontFamily:"inherit", height:44, boxSizing:"border-box" },
  g3: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 },
  sel: { padding:12, border:"1.5px solid #e2e8f0", borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13, background:"#fff" },
  selActive: { padding:12, border:`1.5px solid ${CYAN}`, background:"#f0fdff", color:CYAN, borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13, fontWeight:600 },
  selDisabled: { padding:12, border:"1.5px solid #e2e8f0", borderRadius:12, textAlign:"center", cursor:"not-allowed", fontSize:13, background:"#f8fafc", opacity:0.5, color:"#94a3b8" },
  selOnline: { padding:12, border:"1.5px solid #3b82f6", color:"#3b82f6", borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13 },
  selOnlineActive: { padding:12, border:`1.5px solid ${CYAN}`, background:"#f0fdff", color:CYAN, borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13, fontWeight:600 },
  acc: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:14, border:"1.5px solid #e2e8f0", borderRadius:12, cursor:"pointer", fontSize:13, background:"#fff" },
  accActive: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:14, border:`1.5px solid ${CYAN}`, background:"#f0fdff", color:CYAN, borderRadius:12, cursor:"pointer", fontSize:13 },
  navBox: { marginTop:36, display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:20, borderTop:"1px solid #f1f5f9" },
  btnBack: { background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:14 },
  btnNext: { background:CYAN, color:"#fff", border:"none", padding:"11px 32px", borderRadius:10, fontWeight:600, cursor:"pointer", fontSize:14 },
  side: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:20, position:"sticky", top:80, height:"fit-content" },
  sideTtl: { fontSize:13, fontWeight:700, borderBottom:"1px solid #eee", paddingBottom:10, marginBottom:14 },
  liveBox: { background:"#f0fdff", padding:12, borderRadius:10, fontSize:12, marginBottom:14, border:`1px solid ${CYAN}` },
  liveTotal: { marginTop:8, fontWeight:700, fontSize:14, color:CYAN },
  summaryCard: { border:"1.5px solid #e2e8f0", borderRadius:14, padding:"16px 20px", marginBottom:12 },
  addBtn: { background:"none", border:`1.5px dashed ${CYAN}`, color:CYAN, width:"100%", padding:"10px 0", borderRadius:10, cursor:"pointer", fontSize:13, marginTop:10 },
  pdfBtn: { width:"100%", marginTop:16, padding:"12px 0", background:CYAN, color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:14 },
  cinsiyetBtn: { flex:1, textAlign:"center", padding:"12px", border:"1.5px solid #e2e8f0", borderRadius:"12px", cursor:"pointer", fontSize:"14px", fontWeight:"500", background:"#fff", transition:"all 0.2s" },
  cinsiyetBtnActive: { borderColor:CYAN, background:"#f0fdff", color:CYAN, fontWeight:"600" },
};
