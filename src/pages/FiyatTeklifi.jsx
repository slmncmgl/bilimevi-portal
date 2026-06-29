import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

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
const BFT_BUILD_VERSION = "v10-pdf-temizlik-2026-06-27";
if (typeof window !== "undefined") {
  console.log("%c[BFT] Build: " + BFT_BUILD_VERSION, "background:#00C1DE;color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold;");
  window.__BFT_VERSION = BFT_BUILD_VERSION;
}

// Logo: customer modda WordPress plugin assets URL'inden yükle, staff modda import
const LOGO_URL = (typeof window !== "undefined" && window.BFT_CONFIG?.assetsUrl)
  ? window.BFT_CONFIG.assetsUrl + "bilimevi_logo.svg"
  : null;

// Customer modda sabit ülke (shortcode'dan: country="İngiltere")
const FIXED_COUNTRY = (typeof window !== "undefined" && window.BFT_CONFIG?.country && window.BFT_CONFIG.country.trim())
  ? window.BFT_CONFIG.country.trim()
  : null;

const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";
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

async function fetchCSV(sheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Sheet okunamadi: " + sheetName);
  return parseCSV(await res.text());
}

async function fetchNav() {
  const rows = await fetchCSV(MASTER_ID, "master_index");
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
    const match = drive_link.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = match ? match[1] : null;
    if (sheetId && brand && !schoolSheets[brand]) schoolSheets[brand] = { sheetId, sheetName: row.sheet_name };
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
  };
}

async function fetchCityData(sheetId, city) {
  const key = `${sheetId}_${city}`;
  if (!window._CITY_CACHE) window._CITY_CACHE = {};
  if (window._CITY_CACHE[key]) return window._CITY_CACHE[key];
  try {
    const [courseRows, accRows, feeRows, transferRows] = await Promise.all([
      fetchCSV(sheetId, "courses"),
      fetchCSV(sheetId, "accommodation"),
      fetchCSV(sheetId, "fees"),
      fetchCSV(sheetId, "transfers").catch(() => []),
    ]);
    const courseMap = {};
    courseRows.filter(r => r.city === city).forEach(r => {
      if (!courseMap[r.course_name]) {
        courseMap[r.course_name] = {
          name: r.course_name, type: r.program_type || "General",
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
    const result = { courses: Object.values(courseMap), acc, fees, transfers };
    window._CITY_CACHE[key] = result;
    return result;
  } catch (e) {
    console.error("fetchCityData error:", e);
    return { courses: [], acc: [], fees: [] };
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

function calcFees(fees, weeks, age, accType) {
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
      const amt = u18.calc_type === "per_week" ? u18.amount * weeks : u18.amount;
      items.push({ name: u18.name, amount: amt, currency: u18.currency || currency, auto: true });
      total += amt;
    }
  }
  return { items, total, currency };
}

const fmt = (n, cur) => `${cur || ""} ${Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
const emptyDest = (sd = "2026-07-06") => ({
  lang: "", country: "", city: "", brand: "", course: null, weeks: 4, acc: null, startDate: sd,
  isOnline: false, cityData: null, cityLoading: false, addons: [], transfer: null,
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
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brandsByCity:{}, schoolSheets:{} });
  const [accType, setAccType] = useState("");
  const [leadModal, setLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({ name:"", phone:"", email:"" });

  const [leadLoading, setLeadLoading] = useState(false);

  useEffect(() => {
    if (isStaff) { const session = getSession(); if (!session) return navigate("/"); setUser(session); }
    fetchNav().then(setNav).catch(console.error);
  }, []);

  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline || cur.cityData) return;
    const sheetId = nav.schoolSheets?.[cur.brand]?.sheetId;
    if (!sheetId) return;
    setCur(p => ({ ...p, cityLoading: true }));
    fetchCityData(sheetId, cur.city).then(data => setCur(p => ({ ...p, cityData: data, cityLoading: false, transfer: null })));
  }, [cur.city, cur.brand, nav.schoolSheets, cur.isOnline, cur.cityData]);

  const courses = cur.cityData?.courses || [];
  const accs = cur.cityData?.acc || [];
  const feesData = cur.isOnline
    ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" }
    : calcFees(cur.cityData?.fees, cur.weeks, parseInt(student.age)||0, cur.acc?.type);
  const coursePriceData = cur.course ? getTotalCoursePrice(cur.course, cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
  const accPriceData = cur.acc ? getTotalAccommodationPrice(cur.acc, cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
  const courseTotal = coursePriceData.totalPrice;
  const accTotal = accPriceData.totalPrice;
  const addonsCost = (cur.addons||[]).reduce((s,a) => s+(a.totalAmount||0), 0);
  const transferCost = cur.transfer?.one_way || 0;
  const currentTotal = courseTotal + accTotal + (feesData.total || 0) + addonsCost + transferCost;

  const canNext = [
    !!(student.name && student.gender && student.age),
    (cur.isOnline && cur.course) || !!(cur.brand && cur.city),
    !!cur.course && isCourseValid(cur.course, cur.weeks) && !cur.cityLoading,
    !!cur.acc || cur.isOnline,
    true, true,
  ][step];

  const handleDateChange = (val) => {
    if (!val) return;
    const d = new Date(val);
    if (d.getDay() !== 1) d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 8 - d.getDay()));
    setCur(p => ({ ...p, startDate: d.toISOString().split("T")[0] }));
  };

  const next = () => {
    if (step === 4 || (step === 2 && cur.isOnline)) {
      const coursePrice = cur.course ? getTotalCoursePrice(cur.course, cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
      const accPrice = cur.acc ? getTotalAccommodationPrice(cur.acc, cur.weeks, cur.startDate) : { basePrice:0, hsAmount:0, totalPrice:0, hsActive:false };
      const isDup = destinations.some(d => d.city === cur.city && d.course?.name === cur.course?.name && d.acc?.name === cur.acc?.name);
      if (!isDup) {
        setDestinations(p => [...p, { ...cur,
          courseBasePrice: coursePrice.basePrice, courseHsAmount: coursePrice.hsAmount,
          courseTotalPrice: coursePrice.totalPrice, courseHsActive: coursePrice.hsActive,
          courseHsPerWeek: coursePrice.hsPerWeek, courseHsStart: coursePrice.hsStart, courseHsEnd: coursePrice.hsEnd,
          accBasePrice: accPrice.basePrice, accHsAmount: accPrice.hsAmount,
          accTotalPrice: accPrice.totalPrice, accHsActive: accPrice.hsActive,
          accHsPerWeek: accPrice.hsPerWeek, accHsStart: accPrice.hsStart, accHsEnd: accPrice.hsEnd,
        }]);
      }
      setStep(5);
    } else { setStep(s => s + 1); }
    const root = document.getElementById("bft-root");
    if (root) root.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addNew = () => { setCur(emptyDest(cur.startDate)); setStep(1); };
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
    try {
      // jsPDF yükle - birden fazla CDN dene
      if (!window.jspdf) {
        const cdns = [
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",
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

      // Türkçe karakter için DejaVuSans fontunu yükle ve göm (CORS uyumlu CDN)
      if (!window.__bft_font_loaded) {
        const fontUrls = [
          "https://cdn.jsdelivr.net/gh/jspdf-customfonts/fonts/DejaVuSans.ttf",
          "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
        ];
        for (const furl of fontUrls) {
          try {
            const resp = await fetch(furl);
            if (!resp.ok) continue;
            const buf = await resp.arrayBuffer();
            let binary = "";
            const bytes = new Uint8Array(buf);
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            window.__bft_font_b64 = b64;
            window.__bft_font_loaded = true;
            console.log("[BFT] Türkçe font yüklendi:", furl);
            break;
          } catch (e) { console.warn("[BFT] Font CDN başarısız:", furl); }
        }
      }
      if (window.__bft_font_b64) {
        try {
          doc.addFileToVFS("DejaVuSans.ttf", window.__bft_font_b64);
          doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
        } catch(e) { console.warn("[BFT] Font eklenemedi:", e); }
      }

      const FONT = window.__bft_font_b64 ? "DejaVuSans" : "helvetica";

      // Logo SVG'yi PNG'ye çevir (jsPDF SVG desteklemez)
      let pdfLogo = window.__bft_logo_png || null;
      if (!pdfLogo && logoSrc) {
        try {
          pdfLogo = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || 320;
              canvas.height = img.naturalHeight || 110;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              try { resolve(canvas.toDataURL("image/png")); } catch(e){ resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = logoSrc;
          });
          if (pdfLogo) { window.__bft_logo_png = pdfLogo; console.log("[BFT] Logo PNG'ye çevrildi"); }
        } catch(e) { console.warn("[BFT] Logo dönüştürülemedi:", e); }
      }
      const CYAN_RGB = [0, 193, 222];
      const PAGE_W = 210, MARGIN = 18;
      const CW = PAGE_W - MARGIN * 2;

      destinations.forEach((d, idx) => {
        if (idx > 0) doc.addPage();
        const f = d.isOnline
          ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" }
          : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type);
        const cur = d.course?.currency || f.currency || "GBP";
        const curSym = { GBP:"GBP", EUR:"EUR", USD:"USD", CAD:"CAD" }[cur] || cur;
        const startD = d.startDate ? new Date(d.startDate) : new Date();
        const endD = addWeeksToDate(startD, d.weeks);
        const accStartD = new Date(startD); accStartD.setDate(startD.getDate() - 1);
        const accEndD = new Date(endD); accEndD.setDate(endD.getDate() + 2);

        let y = 20;
        const money = (n) => Number(n||0).toLocaleString("tr-TR") + ",00";

        // Header
        doc.setFont(FONT, "normal");
        // Danışman bilgisi sadece staff modda (müşteriye gösterilmez)
        if (isStaff) {
          doc.setFontSize(7); doc.setTextColor(150);
          doc.text("Bilimevi Eğitim Danışmanınız", MARGIN, y);
          doc.setFontSize(11); doc.setTextColor(17);
          doc.text(user?.name || "—", MARGIN, y + 4);
          doc.setFontSize(8); doc.setTextColor(85);
          doc.text(user?.email || "", MARGIN, y + 8);
        }
        // Logo (PNG data-uri olarak gömülür)
        if (pdfLogo) {
          try { doc.addImage(pdfLogo, "PNG", PAGE_W - MARGIN - 32, y - 2, 32, 11); } catch(e){ console.warn("[BFT] logo eklenemedi", e); }
        }
        y += 12;
        y += 8;

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

        // Kurs
        doc.setFontSize(10); doc.setTextColor(17);
        doc.text("Kurs", MARGIN, y);
        doc.text(`${d.brand} — ${d.course?.name || ""}`, MARGIN + 32, y);
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
          doc.setFontSize(9); doc.setTextColor(146,64,14);
          doc.text(`High Season (${formatDateShort(d.courseHsStart)}-${formatDateShort(d.courseHsEnd)})`, MARGIN + 32, y);
          doc.text(`+${money(d.courseHsAmount)}`, PAGE_W - MARGIN, y, { align:"right" });
          y += 5;
          doc.setDrawColor(221); doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;
        }

        const checkPage = () => { if (y > 260) { doc.addPage(); y = 20; } };

        // Konaklama
        checkPage();
        if (d.acc && !d.isOnline) {
          doc.setFontSize(10); doc.setTextColor(17);
          doc.text("Konaklama", MARGIN, y);
          doc.text(`${d.acc.name} (${d.acc.board})`, MARGIN + 32, y);
          doc.text(money(d.accBasePrice), PAGE_W - MARGIN, y, { align:"right" });
          y += 5;
          doc.setFontSize(8); doc.setTextColor(85);
          doc.text(`Giriş: ${fmtDate(accStartD)}  |  Çıkış: ${fmtDate(accEndD)}`, MARGIN + 32, y);
          y += 4;
          doc.setTextColor(120);
          doc.text(`${d.acc.room} · ${d.acc.bathroom} · Okula ${d.acc.distance}`, MARGIN + 32, y);
          y += 4;
          doc.setDrawColor(221); doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;

          if (d.accHsAmount > 0) {
            doc.setFontSize(9); doc.setTextColor(146,64,14);
            doc.text(`High Season (${formatDateShort(d.accHsStart)}-${formatDateShort(d.accHsEnd)})`, MARGIN + 32, y);
            doc.text(`+${money(d.accHsAmount)}`, PAGE_W - MARGIN, y, { align:"right" });
            y += 5;
            doc.setDrawColor(221); doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;
          }
        }

        // Diğer ücretler
        checkPage();
        if (f.items?.length > 0) {
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
          doc.text(`${d.transfer.airport} (${d.transfer.code})`, MARGIN + 32, y);
          doc.text(`${d.transfer.currency} ${money(d.transfer.one_way)}`, PAGE_W - MARGIN, y, { align:"right" });
          y += 5;
        }

        // Toplam
        checkPage();
        y += 2;
        doc.setDrawColor(17); doc.setLineWidth(0.8);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 6;
        const grandTotal = d.courseTotalPrice + d.accTotalPrice + f.total + (d.addons?.reduce((s,a)=>s+a.totalAmount,0)||0) + (d.transfer?.one_way||0);
        doc.setFontSize(12); doc.setTextColor(17);
        doc.text(`TOPLAM TUTAR ${cur}`, MARGIN, y);
        doc.setFontSize(16);
        doc.text(`${curSym} ${money(grandTotal)}`, PAGE_W - MARGIN, y, { align:"right" });
        y += 12;

        // CTA — sadece staff modda
        if (isStaff) {
          doc.setFillColor(...CYAN_RGB);
          doc.roundedRect(PAGE_W/2 - 45, y, 90, 10, 5, 5, "F");
          doc.setFontSize(10); doc.setTextColor(255);
          doc.text("Eğitim Danışmanınıza Şimdi Ulaşın", PAGE_W/2, y + 6.5, { align:"center" });
          y += 18;
        }

        // Footer
        doc.setFontSize(8); doc.setTextColor(51);
        doc.text("www.bilimevi.com", PAGE_W - MARGIN, 285, { align:"right" });
      });

      const filename = `Bilimevi_Teklif_${(leadForm.name || student.name || "Teklif").replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      console.log("[BFT] PDF kaydedildi:", filename);
    } catch (err) {
      console.error("[BFT] PDF HATASI:", err);
      const msg = err?.message || err?.toString?.() || "Bilinmeyen hata";
      alert("PDF oluşturulamadı: " + msg);
    }
  };

  const handleLeadSubmit = async () => {
    if (!leadForm.name || !leadForm.phone || !leadForm.email) return;
    setLeadLoading(true);
    try {
      const webhookUrl = window.BFT_CONFIG?.webhookUrl;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...leadForm,
            destinations: destinations.map(d => ({
              city: d.city, brand: d.brand, weeks: d.weeks,
              course: d.course?.name, total: d.total, currency: d.currency,
            })),
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (e) { console.error("Lead gönderilemedi:", e); }
    setLeadLoading(false);
    setLeadModal(false);
    generatePDF();
  };

  const logoSrc = LOGO_URL || (typeof window !== "undefined" && window.__bilimevi_logo__);
  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Ek Hizmetler","Özet"];

  return (
    <>
    {!isStaff && leadModal && (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#fff", borderRadius:20, padding:32, maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:"#0f172a" }}>Teklifinizi İndirin</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Bilgilerinizi girin, PDF otomatik indirilecektir.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <input placeholder="Ad Soyad *" style={{...S.fti, background: student.name ? "#f8fafc" : "#fff"}} value={leadForm.name} onChange={e => setLeadForm(p => ({...p, name:e.target.value}))} />
              <input placeholder="Telefon *" style={S.fti} type="tel" value={leadForm.phone} onChange={e => setLeadForm(p => ({...p, phone:e.target.value}))} />
              <input placeholder="E-posta *" style={S.fti} type="email" value={leadForm.email} onChange={e => setLeadForm(p => ({...p, email:e.target.value}))} />
            </div>
            <button onClick={handleLeadSubmit} disabled={!leadForm.name || !leadForm.phone || !leadForm.email || leadLoading}
              style={{ ...S.btnNext, width:"100%", marginTop:16, padding:"13px 0", opacity: (!leadForm.name||!leadForm.phone||!leadForm.email||leadLoading) ? 0.5 : 1 }}>
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
        input:focus { outline:none; border-color:${CYAN} !important; }
        #bft-root input, #bft-root input[type="text"], #bft-root input[type="number"], #bft-root input[type="date"], #bft-root input[type="tel"], #bft-root input[type="email"] {
          background:#fff !important; color:#0f172a !important; border:1.5px solid #e2e8f0 !important;
          border-radius:10px !important; padding:10px 14px !important; font-size:14px !important;
          font-family:inherit !important; box-shadow:none !important; width:100% !important;
          box-sizing:border-box !important; height:44px !important; line-height:normal !important;
          -webkit-appearance:none !important; appearance:none !important;
        }
        #bft-root button { font-family:inherit !important; }
        @media (max-width: 768px) {
          #bft-root .bft-body { grid-template-columns:1fr !important; }
          #bft-root .bft-side { display:none !important; }
          #bft-root .bft-r2 { grid-template-columns:1fr !important; }
          #bft-root .bft-steps { padding:8px 12px !important; overflow-x:auto !important; }
          #bft-root .bft-steps span { font-size:9px !important; }
          #bft-root .bft-pdf-btn-mobile { display:flex !important; }
        }
        @media (min-width: 769px) {
          #bft-root .bft-pdf-btn-mobile { display:none !important; }
        }
      `}</style>

      <header style={S.hdr}>
        <div style={S.cnt}>
          {isStaff ? <button onClick={() => navigate("/dashboard")} style={S.backBtn}>← Dashboard</button> : <img src={logoSrc} alt="Bilimevi" style={{ height:32 }} />}
          <span style={S.htitle}>Fiyat Teklifi</span>
          <div style={{ width:100 }} />
        </div>
      </header>

      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"12px 16px", display:"flex", alignItems:"center" }} className="bft-steps">
          {STEPS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, background: i <= step ? CYAN : "#e2e8f0", color: i <= step ? "#fff" : "#94a3b8" }}>{i < step ? "✓" : i+1}</div>
                <span style={{ fontSize:11, fontWeight: i===step?600:400, color: i===step?CYAN:i<step?"#0f172a":"#94a3b8", whiteSpace:"nowrap" }}>{s}</span>
              </div>
              {i < STEPS.length-1 && <div style={{ flex:1, height:1, background: i<step?CYAN:"#e2e8f0", margin:"0 8px" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={S.body} className="bft-body">
        <main style={S.main}>
          {step === 0 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Öğrenci Bilgileri</h2>
              <div style={S.r2} className="bft-r2">
                <div style={S.fld}><label style={S.lbl}>Ad Soyad</label><input style={S.fti} value={student.name} onChange={e => setStudent(p => ({...p, name:e.target.value}))} /></div>
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

          {step === 1 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Destinasyon Seçimi</h2>
              <p style={S.slbl}>DİL</p>
              <div style={S.g3}>
                {nav.languages.map(l => (<div key={l} style={cur.lang===l && !cur.isOnline ? S.selActive : S.sel} onClick={() => setCur({...emptyDest(cur.startDate), lang:l, country: (!isStaff && FIXED_COUNTRY) ? FIXED_COUNTRY : ""})}>{l}</div>))}
                <div style={cur.isOnline ? S.selOnlineActive : S.selOnline} onClick={() => setCur({...emptyDest(cur.startDate), isOnline:true, brand:"EC", city:"EC Live", lang:"İngilizce", course:null})}>🌐 Online Kurs</div>
              </div>
              {(isStaff || !FIXED_COUNTRY) && !cur.isOnline && cur.lang && <><p style={S.slbl}>ÜLKE</p><div style={S.g3}>{(nav.countries[cur.lang]||[]).map(c => (<div key={c} style={cur.country===c ? S.selActive : S.sel} onClick={() => setCur(p => ({...p, country:c, city:"", brand:"", course:null, acc:null, cityData:null}))}>{c}</div>))}</div></>}
              {!cur.isOnline && cur.country && <><p style={S.slbl}>ŞEHİR</p><div style={S.g3}>{(nav.citiesByLang[cur.lang]?.[cur.country]||[]).map(c => (<div key={c} style={cur.city===c ? S.selActive : S.sel} onClick={() => setCur(p => ({...p, city:c, brand:"", course:null, acc:null, cityData:null}))}>{c}</div>))}</div></>}
              {!cur.isOnline && cur.city && <><p style={S.slbl}>OKUL MARKASI</p><div style={S.g3}>{(nav.brandsByCity[cur.city]||[]).map(b => (<div key={b} style={cur.brand===b ? S.selActive : S.sel} onClick={() => setCur(p => ({...p, brand:b, course:null, acc:null, cityData:null}))}>{b}</div>))}</div></>}
              {cur.isOnline && <>
                <p style={S.slbl}>PAKET SEÇİMİ</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {EC_LIVE.map((c,i) => (<div key={i} style={cur.course?.name===c.name ? S.selActive : S.sel} onClick={() => setCur(p => ({...p, course:c}))}><strong>{c.name}</strong><span style={{ marginLeft:8, color:"#64748b", fontSize:12 }}>{c.hours} saat/hafta · €{c.tiers[0].price}/haftadan</span></div>))}
                </div>
                {cur.course && <div style={{ marginTop:10, padding:"8px 12px", background:"#f0fdff", border:`1px solid ${CYAN}`, borderRadius:8, fontSize:12, color:CYAN }}>✓ Online kurs seçildi — konaklama adımı atlanacak</div>}
              </>}
            </div>
          )}

          {step === 2 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>{cur.isOnline ? "Kurs Detayı — EC Live" : `Kurs Seçimi — ${cur.brand} ${cur.city}`}{cur.cityLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginLeft:8 }}>yükleniyor...</span>}</h2>
              <div style={S.r2} className="bft-r2">
                <div style={S.fld}><label style={S.lbl}>Başlangıç Tarihi (Pazartesi)</label><input type="date" style={S.fti} value={cur.startDate} min={new Date().toISOString().split("T")[0]} onChange={e => handleDateChange(e.target.value)} /></div>
                <div style={S.fld}><label style={S.lbl}>Süre (Hafta)</label><input style={S.fti} type="number" min={1} max={52} value={cur.weeks} onChange={e => setCur(p => ({...p, weeks:parseInt(e.target.value)||1, course:null}))} /></div>
              </div>
              {!cur.isOnline && (
                <div style={S.g3}>
                  {courses.length === 0 && !cur.cityLoading && <p style={{ color:"#94a3b8", fontSize:13 }}>Bu şehir için kurs verisi bulunamadı.</p>}
                  {courses.map((c,i) => {
                    const valid = isCourseValid(c, cur.weeks), sel = cur.course?.name === c.name;
                    return (<div key={i} style={sel ? S.selActive : valid ? S.sel : S.selDisabled} onClick={() => valid && setCur(p => ({...p, course:c}))}>
                      <div style={{ fontWeight:600 }}>{c.name}</div>
                      <div style={{ fontSize:11, color: sel?"inherit":"#64748b", marginTop:3 }}>{c.lessons} ders · {c.hours} saat/hafta</div>
                      {c.max_weeks && <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>Maks. {c.max_weeks} hafta</div>}
                      {!valid && <div style={{ fontSize:11, color:"#ef4444", marginTop:2 }}>Bu hafta için geçersiz</div>}
                    </div>);
                  })}
                </div>
              )}
              {cur.isOnline && cur.course && (<div style={{ padding:"14px 16px", background:"#f0fdff", border:`1.5px solid ${CYAN}`, borderRadius:12 }}><strong>{cur.course.name}</strong> — {cur.course.hours} saat/hafta<br/><span style={{ fontSize:12, color:"#64748b" }}>{cur.weeks} hafta · €{getPrice(cur.course, cur.weeks).toLocaleString("tr-TR")}</span></div>)}
            </div>
          )}

          {step === 3 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Konaklama — {cur.brand} {cur.city}{cur.cityLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginLeft:8 }}>yükleniyor...</span>}</h2>
              {accs.length === 0 && !cur.cityLoading && <p style={{ color:"#94a3b8", fontSize:13 }}>Konaklama verisi bulunamadı.</p>}
              {accs.length > 0 && (() => {
                const types = [...new Set(accs.map(a => a.type))];
                return (<>
                  <div style={S.g3}>{types.map(t => (<div key={t} style={accType===t ? S.selActive : S.sel} onClick={() => { setAccType(t); setCur(p => ({...p, acc:null})); }}>{t}</div>))}</div>
                  {accType && (
                    <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
                      {accs.filter(a => a.type === accType).map((a,i) => {
                        const sel = cur.acc?.name===a.name && cur.acc?.room===a.room && cur.acc?.board===a.board;
                        const hsActive = getAccommodationHighSeasonSupplement(a, cur.weeks, cur.startDate).isActive;
                        return (<div key={i} style={sel ? S.accActive : S.acc} onClick={() => setCur(p => ({...p, acc:a}))}>
                          <div>
                            <div style={{ fontWeight:600 }}>{a.name}</div>
                            <div style={{ fontSize:12, color: sel?"inherit":"#64748b", marginTop:2 }}>{a.room} · {a.board} · {a.distance}</div>
                            {hsActive && <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>⚠️ Yüksek sezon fiyatı geçerli</div>}
                            {a.notes && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{a.notes}</div>}
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontWeight:700, color: hsActive ? "#f59e0b" : "inherit" }}>{a.currency} {hsActive ? a.hs_price : a.price}/h</div>
                            <div style={{ fontSize:11, color: sel?"inherit":"#94a3b8" }}>{cur.weeks}h: {a.currency} {((hsActive ? a.hs_price : a.price) * cur.weeks).toLocaleString("tr-TR")}</div>
                          </div>
                        </div>);
                      })}
                    </div>
                  )}
                </>);
              })()}
            </div>
          )}

          {step === 4 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Ek Hizmetler — {cur.brand} {cur.city}</h2>
              {(() => {
                const allFees = cur.cityData?.fees || [];
                const age = parseInt(student.age) || 0;
                const startD = cur.startDate ? new Date(cur.startDate) : null;
                const compulsory = calcFees(allFees, cur.weeks, parseInt(student.age)||0, cur.acc?.type).items;
                const optional = allFees.filter(f => {
                  if (!["optional_service","supplement","upgrade","course_addon","post_departure"].includes(f.addon_type)) return false;
                  if (f.eligible_courses && !f.eligible_courses.split(",").map(s=>s.trim()).includes(cur.course?.name)) return false;
                  if (f.min_age && age < f.min_age) return false;
                  if (f.max_age && age > f.max_age) return false;
                  if (f.date_start && startD && new Date(f.date_start) > startD) return false;
                  if (f.date_end && startD && new Date(f.date_end) < startD) return false;
                  return true;
                });
                if (compulsory.length === 0 && (isStaff ? optional.length === 0 : true)) return <p style={{ color:"#94a3b8", fontSize:13 }}>Bu kurs ve tarih için eklenebilecek add-on bulunmuyor.</p>;
                return (<>
                  {compulsory.length > 0 && (
                    <div style={{ marginBottom:20 }}>
                      <p style={S.slbl}>Zorunlu Ücretler</p>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {compulsory.map((f,i) => (<div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13 }}><span style={{ fontWeight:600 }}>{f.name}</span><span style={{ fontWeight:600, color:"#64748b" }}>{f.currency} {Number(f.amount).toLocaleString("tr-TR")}</span></div>))}
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
                              <div style={{ fontWeight:700, color: sel ? CYAN : "#0f172a" }}>{f.currency} {Number(amt).toLocaleString("tr-TR")}</div>
                              {f.calc_type === "per_week" && <div style={{ fontSize:11, color:"#94a3b8" }}>{f.amount}/h × {cur.weeks}h</div>}
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>
                  )}
                </>);
              })()}
              {cur.cityData?.transfers?.length > 0 && (
                <div style={{ marginTop:20 }}>
                  <p style={S.slbl}>Transfer</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {cur.cityData.transfers.map((t, ti) => {
                      const sel = cur.transfer?.airport === t.airport && cur.transfer?.code === t.code;
                      return (<div key={ti} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderRadius:12, border:`1.5px solid ${sel ? CYAN : "#e2e8f0"}`, background: sel ? "#f0fdff" : "#fff", cursor:"pointer" }} onClick={() => setCur(p => ({ ...p, transfer: sel ? null : t }))}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color: sel ? CYAN : "#0f172a" }}>{t.airport} ({t.code})</div>
                          {t.notes && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{t.notes}</div>}
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontWeight:700, color: sel ? CYAN : "#0f172a" }}>{t.currency} {Number(t.one_way).toLocaleString("tr-TR")}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>Tek yön</div>
                        </div>
                      </div>);
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Teklif Özeti</h2>
              {destinations.length === 0 && <p style={{ color:"#94a3b8" }}>Henüz destinasyon eklenmedi.</p>}
              {destinations.map((d,i) => {
                const f = d.isOnline ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" } : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type);
                const cur2 = d.course?.currency || f.currency;
                const sD = d.startDate ? new Date(d.startDate) : null;
                const eD = sD ? addWeeksToDate(sD, d.weeks) : null;
                const accSD = sD ? (() => { const x = new Date(sD); x.setDate(sD.getDate() - 1); return x; })() : null;
                const accED = eD ? (() => { const x = new Date(eD); x.setDate(eD.getDate() + 2); return x; })() : null;
                const destNotes = [];
                if (d.course?.morning) destNotes.push("Sabah garantisi mevcut (ek ücret uygulanabilir)");
                if (d.course?.notes && !d.courseHsActive) destNotes.push(d.course.notes);
                if (d.acc?.notes && !d.accHsActive) destNotes.push(d.acc.notes);
                if (!d.transfer && d.cityData?.transfers?.length > 0) { const t = d.cityData.transfers[0]; destNotes.push(`Transfer: ${t.airport} (${t.code}) — ${cur2} ${Number(t.one_way).toLocaleString("tr-TR")} tek yön${t.notes ? " · " + t.notes : ""}`); }
                return (
                  <div key={i} style={S.summaryCard}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}><strong style={{ fontSize:15 }}>{d.brand} {d.city}</strong><span style={{ fontSize:12, color:"#64748b" }}>{d.weeks} hafta</span></div>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Kurs</div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}><span style={{ fontWeight:600 }}>{d.course?.name}</span><span style={{ fontWeight:600, color:CYAN }}>{fmt(d.courseBasePrice, cur2)}</span></div>
                      {d.courseHsAmount > 0 && (<>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}><span style={{ color:"#f59e0b" }}>High Season Supplement ({formatDateShort(d.courseHsStart)} – {formatDateShort(d.courseHsEnd)})</span><span style={{ color:"#f59e0b", fontWeight:500 }}>+ {fmt(d.courseHsAmount, cur2)}</span></div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:6, borderTop:"1px dashed #e2e8f0", paddingTop:4 }}><span style={{ fontWeight:600 }}>Kurs Toplamı</span><span style={{ fontWeight:700, color:CYAN }}>{fmt(d.courseTotalPrice, cur2)}</span></div>
                      </>)}
                      {sD && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📅 {fmtDate(sD)} — {fmtDate(eD)}</div>}
                    </div>
                    {d.acc && !d.isOnline && (
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Konaklama</div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}><span style={{ fontWeight:600 }}>{d.acc.name} · {d.acc.board}</span><span style={{ fontWeight:600, color:CYAN }}>{fmt(d.accBasePrice, cur2)}</span></div>
                        {d.accHsAmount > 0 && (<>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}><span style={{ color:"#f59e0b" }}>High Season Supplement ({formatDateShort(d.accHsStart)} – {formatDateShort(d.accHsEnd)})</span><span style={{ color:"#f59e0b", fontWeight:500 }}>+ {fmt(d.accHsAmount, cur2)}</span></div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:6, borderTop:"1px dashed #e2e8f0", paddingTop:4 }}><span style={{ fontWeight:600 }}>Konaklama Toplamı</span><span style={{ fontWeight:700, color:CYAN }}>{fmt(d.accTotalPrice, cur2)}</span></div>
                        </>)}
                        {accSD && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📅 {fmtDate(accSD)} — {fmtDate(accED)}</div>}
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:10 }}><span style={{ color:"#64748b" }}>Kayıt + Materyal</span><span style={{ fontWeight:600 }}>{fmt(f.total, cur2)}</span></div>
                    {(d.addons||[]).map((a,ai) => (<div key={ai} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}><span style={{ color:"#64748b" }}>{a.name}</span><span>{fmt(a.totalAmount, cur2)}</span></div>))}
                    {d.transfer && (<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}><span style={{ color:"#64748b" }}>Transfer ({d.transfer.airport})</span><span>{fmt(d.transfer.one_way, d.transfer.currency)}</span></div>)}
                    <div style={{ borderTop:`1.5px solid #0f172a`, paddingTop:8, display:"flex", justifyContent:"space-between", fontWeight:700 }}><span>Toplam</span><span style={{ color:CYAN }}>{fmt(d.courseTotalPrice + d.accTotalPrice + f.total + (d.addons?.reduce((s,a) => s + a.totalAmount, 0) || 0) + (d.transfer?.one_way || 0), cur2)}</span></div>
                    {destNotes.length > 0 && (<div style={{ marginTop:12, padding:"10px 12px", background:"#fef9ec", borderRadius:8, border:"1px solid #fde68a" }}><div style={{ fontSize:11, fontWeight:600, color:"#92400e", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Notlar</div>{destNotes.map((n,ni) => (<div key={ni} style={{ fontSize:12, color:"#78350f", marginBottom:3 }}>— {n}</div>))}</div>)}
                  </div>
                );
              })}
              <button onClick={addNew} style={S.addBtn}>+ Yeni Destinasyon Ekle</button>
            </div>
          )}

          <div style={S.navBox}>
            {step > 0 && step !== 5 && <button onClick={() => { setStep(s => s-1); const r = document.getElementById("bft-root"); if (r) r.scrollIntoView({ behavior:"smooth", block:"start" }); else window.scrollTo({ top:0, behavior:"smooth" }); }} style={S.btnBack}>← Geri</button>}
            {step < 5 && step !== 0 && (<button style={S.btnNext} disabled={!canNext} onClick={next}>{step === 4 || (step === 2 && cur.isOnline) ? "Özete Geç →" : "İleri →"}</button>)}
            {step === 5 && destinations.length > 0 && (<button onClick={() => isStaff ? generatePDF() : (setLeadForm(p => ({...p, name: student.name || p.name})), setLeadModal(true))} style={{ ...S.btnNext, marginLeft:"auto" }} className="bft-pdf-btn-mobile">📄 PDF Oluştur</button>)}
          </div>
        </main>

        <aside style={S.side} className="bft-side">
          <h3 style={S.sideTtl}>Anlık Özet</h3>
          <div style={S.liveBox}>
            {cur.lang && <div style={{ marginBottom:4 }}>📍 {cur.lang}{cur.country ? ` / ${cur.country}` : ""}{cur.city ? ` / ${cur.city}` : ""}</div>}
            {cur.course && <div style={{ marginBottom:4 }}>📚 {cur.course.name} ({cur.weeks}h)</div>}
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
          {destinations.length > 0 && destinations.map((d,i) => (<div key={i} style={{ fontSize:12, padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}><strong>{d.city}</strong> · {d.weeks}h · {d.course?.name?.slice(0,20)}</div>))}
          {step === 5 && destinations.length > 0 && (<button onClick={() => isStaff ? generatePDF() : (setLeadForm(p => ({...p, name: student.name || p.name})), setLeadModal(true))} style={S.pdfBtn}>📄 PDF Oluştur</button>)}
        </aside>
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
        const f = d.isOnline ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" } : calcFees(d.cityData?.fees, d.weeks, parseInt(student.age)||0, d.acc?.type);
        const cur = d.course?.currency || f.currency || "GBP";
        const curSym = { GBP:"£", EUR:"€", USD:"$", CAD:"CA$" }[cur] || cur;
        const startD = d.startDate ? new Date(d.startDate) : new Date();
        const endD = addWeeksToDate(startD, d.weeks);
        const accStartD = new Date(startD); accStartD.setDate(startD.getDate() - 1);
        const accEndD = new Date(endD); accEndD.setDate(endD.getDate() + 2);
        const notes = [];
        if (d.course?.morning) notes.push("Sabah garantisi mevcut (ek ücret uygulanabilir)");
        if (d.course?.notes && !d.courseHsActive) notes.push(d.course.notes);
        if (d.acc?.notes && !d.accHsActive) notes.push(d.acc.notes);
        if (!d.transfer && d.cityData?.transfers?.length > 0) { const t = d.cityData.transfers[0]; notes.push(`Transfer bilgisi: ${t.airport} (${t.code}) — ${cur} ${Number(t.one_way).toLocaleString("tr-TR")} tek yön${t.notes ? " · " + t.notes : ""}`); }

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
                    <td style={{ padding:"2mm 2mm", verticalAlign:"top", fontSize:"9pt" }}>{d.transfer.airport} ({d.transfer.code}){d.transfer.notes ? ` — ${d.transfer.notes}` : ""}</td>
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
