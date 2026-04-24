import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";
import LOGO_ASSET from "../assets/bilimevi_logo.svg";

const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";
const CYAN = "#00C1DE";

// ─── CSV PARSE ───
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

// ─── NAV VERİSİ (MASTER_INDEX) ───
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

// ─── ŞEHİR VERİSİ (window cache ile) ───
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
          name: r.course_name,
          type: r.program_type || "General",
          lessons: parseFloat(r.lessons_per_week) || 0,
          hours: parseFloat(r.hours_per_week) || 0,
          currency: r.currency,
          hs_supp: parseFloat(r.high_season_supplement) || 0,
          hs_start: r.high_season_start || "",
          hs_end: r.high_season_end || "",
          hs_cond: r.high_season_condition || "",
          max_weeks: r.max_weeks ? parseInt(r.max_weeks) : null,
          morning: !!(r.morning_supplement && parseFloat(r.morning_supplement) > 0),
          notes: r.notes || "",
          tiers: [],
        };
      }
      courseMap[r.course_name].tiers.push({
        min: parseInt(r.weeks_tier_min) || 1,
        max: r.weeks_tier_max ? parseInt(r.weeks_tier_max) : null,
        price: parseFloat(r.price_per_week) || 0,
      });
    });

    const acc = accRows.filter(r => r.city === city).map(r => ({
      name: r.place_name,
      type: r.accommodation_type || "Standart",
      room: r.room_type || "",
      bathroom: r.bathroom_type || "",
      board: r.board_type || "",
      price: parseFloat(r.price_per_week) || 0,
      hs_price: parseFloat(r.high_season_price) || 0,
      hs_start: r.high_season_start || "",
      hs_end: r.high_season_end || "",
      currency: r.currency,
      distance: r.distance_to_school || "",
      min_weeks: r.min_weeks ? parseInt(r.min_weeks) : null,
      notes: r.notes || "",
    }));

    const fees = feeRows.filter(r => r.city === city).map(r => ({
      name: r.fee_name,
      amount: parseFloat(r.amount) || 0,
      currency: r.currency,
      calc_type: r.calculation_type,
      tier_min: r.tier_min_weeks ? parseInt(r.tier_min_weeks) : null,
      tier_max: r.tier_max_weeks ? parseInt(r.tier_max_weeks) : null,
      notes: r.notes || "",
      addon_type: r.addon_type || "",
      eligible_courses: r.eligible_courses || "",
      date_start: r.date_start || "",
      date_end: r.date_end || "",
      min_age: r.min_age ? parseInt(r.min_age) : null,
      max_age: r.max_age ? parseInt(r.max_age) : null,
    }));

    const transfers = (transferRows || []).filter(r => r.city === city).map(r => ({
      airport: r.airport_name,
      code: r.airport_code,
      one_way: parseFloat(r.price_one_way) || 0,
      two_way: parseFloat(r.price_two_way) || 0,
      currency: r.currency,
      notes: r.notes || "",
    }));
    const result = { courses: Object.values(courseMap), acc, fees, transfers };
    window._CITY_CACHE[key] = result;
    return result;
  } catch (e) {
    console.error("fetchCityData error:", e);
    return { courses: [], acc: [], fees: [] };
  }
}

// ─── HESAPLAMA FONKSİYONLARI ───
function getPrice(course, weeks) {
  if (!course?.tiers) return 0;
  const tier = course.tiers.find(t => weeks >= t.min && (t.max === null || weeks <= t.max));
  return tier ? tier.price * weeks : 0;
}

function isCourseValid(course, weeks) {
  return course?.tiers?.some(t => weeks >= t.min && (t.max === null || weeks <= t.max));
}

// High Season Supplement hesaplama
function getHighSeasonSupplement(course, weeks, startDate) {
  if (!course?.hs_supp || !course?.hs_start || !course?.hs_end) {
    return { amount: 0, isActive: false };
  }

  const start = new Date(startDate);
  const hsStart = new Date(course.hs_start);
  const hsEnd = new Date(course.hs_end);

  let isActive = start >= hsStart && start <= hsEnd;

  // weeks_less_than_12 koşulu: sadece 12 haftadan az olanlar
  if (course.hs_cond === "weeks_less_than_12" && weeks >= 12) {
    isActive = false;
  }

  // max_weeks kontrolü
  if (course.max_weeks && weeks > course.max_weeks) {
    isActive = false;
  }

  const amount = isActive ? course.hs_supp * weeks : 0;

  return {
    amount,
    isActive,
    supplementPerWeek: course.hs_supp,
    startDate: course.hs_start,
    endDate: course.hs_end,
  };
}

// Toplam kurs fiyatını hesapla
function getTotalCoursePrice(course, weeks, startDate) {
  const basePrice = getPrice(course, weeks);
  const hs = getHighSeasonSupplement(course, weeks, startDate);
  return {
    basePrice,
    hsAmount: hs.amount,
    totalPrice: basePrice + hs.amount,
    hsActive: hs.isActive,
    hsPerWeek: hs.supplementPerWeek,
    hsStart: hs.startDate,
    hsEnd: hs.endDate,
  };
}

function calcFees(fees, weeks, age, accType) {
  const currency = fees?.[0]?.currency || "GBP";
  const items = [];
  let total = 0;

  const feeGroups = {};
  (fees || []).forEach(f => {
    const n = (f.name || "").toLowerCase();
    const isCompulsory = f.addon_type
      ? f.addon_type === "compulsory"
      : (n.includes("registration") || n.includes("kayit") ||
         n.includes("placement") ||
         n.includes("material") || n.includes("materyal") ||
         n.includes("administration") || n.includes("booking") ||
         n.includes("pel protection") || n.includes("protection of enrolled"));
    if (!isCompulsory) return;

    const hasTier = f.tier_min || f.tier_max;
    if (hasTier) {
      const inRange = (!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max);
      if (!inRange) return;
    }

    const key = f.name;
    feeGroups[key] = f;
  });

  Object.values(feeGroups).forEach(f => {
    const amount = f.calc_type === "per_week" ? f.amount * weeks : f.amount;
    items.push({ name: f.name, amount, currency: f.currency || currency });
    total += amount;
  });

  const isHomestay = (accType || "").toLowerCase().includes("homestay") ||
                     (accType || "").toLowerCase().includes("aile");
  if (age && age <= 17 && isHomestay) {
    const u18 = (fees || []).find(f =>
      (f.name || "").toLowerCase().includes("u18") ||
      (f.name || "").toLowerCase().includes("under 18")
    );
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
  lang: "", country: "", city: "", brand: "",
  course: null, weeks: 4, acc: null, startDate: sd,
  isOnline: false, cityData: null, cityLoading: false,
  addons: [],
  transfer: null,
  // High season için eklenecek alanlar
  courseBasePrice: 0,
  hsAmount: 0,
  courseTotalPrice: 0,
  hsActive: false,
});

const EC_LIVE = [
  { name:"EC Live Premium (5 gün/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR" },
  { name:"EC Live Standard (2 gün/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR" },
  { name:"EC Live English for Work", hours:3, tiers:[{min:1,max:11,price:80},{min:12,max:23,price:70},{min:24,max:null,price:60}], currency:"EUR" },
];

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const fmtDate = (d) => d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "—";
const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const addWeeksToDate = (dateStr, w) => { const d = new Date(dateStr); d.setDate(d.getDate() + w * 7); return d; };

// ─── ANA COMPONENT ───
export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"Selman Çamoğlu", age:"38", gender:"Erkek" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brandsByCity:{}, schoolSheets:{} });
  const [accType, setAccType] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) return navigate("/");
    setUser(session);
    fetchNav().then(setNav).catch(console.error);
  }, []);

  // Şehir + marka seçilince ve nav yüklenince city data çek
  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline || cur.cityData) return;
    const sheetId = nav.schoolSheets?.[cur.brand]?.sheetId;
    if (!sheetId) return;
    setCur(p => ({ ...p, cityLoading: true }));
    fetchCityData(sheetId, cur.city)
      .then(data => setCur(p => ({
        ...p,
        cityData: data,
        cityLoading: false,
        transfer: data.transfers?.[0] || null,
      })));
  }, [cur.city, cur.brand, nav.schoolSheets, cur.isOnline, cur.cityData]);

  const courses = cur.cityData?.courses || [];
  const accs = cur.cityData?.acc || [];
  const feesData = cur.isOnline
    ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" }
    : calcFees(cur.cityData?.fees, cur.weeks, parseInt(student.age)||0, cur.acc?.type);
  
  // Kurs fiyatları (high season dahil)
  const coursePriceData = cur.course ? getTotalCoursePrice(cur.course, cur.weeks, cur.startDate) : { basePrice: 0, hsAmount: 0, totalPrice: 0, hsActive: false };
  const cCost = coursePriceData.basePrice;
  const hsAmount = coursePriceData.hsAmount;
  const courseTotal = coursePriceData.totalPrice;
  
  const aCost = cur.acc ? cur.acc.price * cur.weeks : 0;
  const addonsCost = (cur.addons||[]).reduce((s,a) => s+(a.totalAmount||0), 0);
  const transferCost = cur.transfer?.one_way || 0;
  const currentTotal = courseTotal + aCost + (feesData.total || 0) + addonsCost + transferCost;

  const canNext = [
    !!(student.name && student.gender && student.age),
    (cur.isOnline && cur.course) || !!(cur.brand && cur.city),
    !!cur.course && isCourseValid(cur.course, cur.weeks) && !cur.cityLoading,
    !!cur.acc || cur.isOnline,
    true,
    true,
  ][step];

  const handleDateChange = (val) => {
    if (!val) return;
    const d = new Date(val);
    if (d.getDay() !== 1) d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 8 - d.getDay()));
    setCur(p => ({ ...p, startDate: d.toISOString().split("T")[0] }));
  };

  const next = () => {
    if (step === 4 || (step === 2 && cur.isOnline)) {
      // Kurs fiyatlarını hesapla ve destinasyona ekle
      const priceData = cur.course ? getTotalCoursePrice(cur.course, cur.weeks, cur.startDate) : { basePrice: 0, hsAmount: 0, totalPrice: 0, hsActive: false };
      
      const isDup = destinations.some(d =>
        d.city === cur.city && d.course?.name === cur.course?.name && d.acc?.name === cur.acc?.name
      );
      if (!isDup) {
        setDestinations(p => [...p, { 
          ...cur, 
          courseBasePrice: priceData.basePrice,
          hsAmount: priceData.hsAmount,
          courseTotalPrice: priceData.totalPrice,
          hsActive: priceData.hsActive,
          hsPerWeek: priceData.hsPerWeek,
          hsStart: priceData.hsStart,
          hsEnd: priceData.hsEnd,
        }]);
      }
      setStep(5);
    } else {
      setStep(s => s + 1);
    }
  };

  const addNew = () => { setCur(emptyDest(cur.startDate)); setStep(1); };
  const reset = () => { setDestinations([]); setCur(emptyDest()); setStudent({ name:"Selman Çamoğlu", age:"38", gender:"Erkek" }); setStep(0); };

  const generatePDF = () => {
    const el = document.getElementById("pdf-area");
    if (!el) return;
    el.style.display = "block";
    window.html2pdf().set({
      margin: 0,
      filename: `Bilimevi_Teklif_${student.name.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type:"jpeg", quality:0.98 },
      html2canvas: { scale:2, useCORS:true, letterRendering:true },
      jsPDF: { unit:"mm", format:"a4", orientation:"portrait" },
      pagebreak: { mode:"css", avoid:".pdf-block" },
    }).from(el).save().then(() => { el.style.display = "none"; });
  };

  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Ek Hizmetler","Özet"];

  return (
    <>
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        input:focus { outline:none; border-color:${CYAN} !important; }
      `}</style>

      {/* HEADER */}
      <header style={S.hdr}>
        <div style={S.cnt}>
          <button onClick={() => navigate("/dashboard")} style={S.backBtn}>← Dashboard</button>
          <span style={S.htitle}>Fiyat Teklifi</span>
          <div style={{ width:100 }} />
        </div>
      </header>

      {/* ADIM ÇUBUĞU */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"12px 24px", display:"flex", alignItems:"center" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, background: i <= step ? CYAN : "#e2e8f0", color: i <= step ? "#fff" : "#94a3b8" }}>
                  {i < step ? "✓" : i+1}
                </div>
                <span style={{ fontSize:11, fontWeight: i===step?600:400, color: i===step?CYAN:i<step?"#0f172a":"#94a3b8", whiteSpace:"nowrap" }}>{s}</span>
              </div>
              {i < STEPS.length-1 && <div style={{ flex:1, height:1, background: i<step?CYAN:"#e2e8f0", margin:"0 8px" }} />}
            </div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={S.body}>
        <main style={S.main}>
          {/* ADIM 0: ÖĞRENCİ */}
          {step === 0 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Öğrenci Bilgileri</h2>
              <div style={S.r2}>
                <div style={S.fld}><label style={S.lbl}>Ad Soyad</label><input style={S.fti} value={student.name} onChange={e => setStudent(p => ({...p, name:e.target.value}))} /></div>
                <div style={S.fld}><label style={S.lbl}>Yaş</label><input style={S.fti} type="number" value={student.age} onChange={e => setStudent(p => ({...p, age:e.target.value}))} /></div>
              </div>
              <div style={S.fld}>
                <label style={S.lbl}>Cinsiyet</label>
                <div style={{ display:"flex", gap:10, marginTop:6 }}>
                  {["Erkek","Kadın"].map(g => (
                    <div key={g} style={student.gender===g ? S.selActive : S.sel} onClick={() => setStudent(p => ({...p, gender:g}))}>{g}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ADIM 1: DESTINASYON */}
          {step === 1 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Destinasyon Seçimi</h2>
              <p style={S.slbl}>DİL</p>
              <div style={S.g3}>
                {nav.languages.map(l => (
                  <div key={l} style={cur.lang===l && !cur.isOnline ? S.selActive : S.sel}
                    onClick={() => setCur({...emptyDest(cur.startDate), lang:l})}>
                    {l}
                  </div>
                ))}
                <div style={cur.isOnline ? S.selOnlineActive : S.selOnline}
                  onClick={() => setCur({...emptyDest(cur.startDate), isOnline:true, brand:"EC", city:"EC Live", lang:"İngilizce", course:null})}>
                  🌐 Online Kurs
                </div>
              </div>

              {!cur.isOnline && cur.lang && <>
                <p style={S.slbl}>ÜLKE</p>
                <div style={S.g3}>
                  {(nav.countries[cur.lang]||[]).map(c => (
                    <div key={c} style={cur.country===c ? S.selActive : S.sel}
                      onClick={() => setCur(p => ({...p, country:c, city:"", brand:"", course:null, acc:null, cityData:null}))}>
                      {c}
                    </div>
                  ))}
                </div>
              </>}

              {!cur.isOnline && cur.country && <>
                <p style={S.slbl}>ŞEHİR</p>
                <div style={S.g3}>
                  {(nav.citiesByLang[cur.lang]?.[cur.country]||[]).map(c => (
                    <div key={c} style={cur.city===c ? S.selActive : S.sel}
                      onClick={() => setCur(p => ({...p, city:c, brand:"", course:null, acc:null, cityData:null}))}>
                      {c}
                    </div>
                  ))}
                </div>
              </>}

              {!cur.isOnline && cur.city && <>
                <p style={S.slbl}>OKUL MARKASI</p>
                <div style={S.g3}>
                  {(nav.brandsByCity[cur.city]||[]).map(b => (
                    <div key={b} style={cur.brand===b ? S.selActive : S.sel}
                      onClick={() => setCur(p => ({...p, brand:b, course:null, acc:null, cityData:null}))}>
                      {b}
                    </div>
                  ))}
                </div>
              </>}

              {cur.isOnline && <>
                <p style={S.slbl}>PAKET SEÇİMİ</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {EC_LIVE.map((c,i) => (
                    <div key={i} style={cur.course?.name===c.name ? S.selActive : S.sel}
                      onClick={() => setCur(p => ({...p, course:c}))}>
                      <strong>{c.name}</strong>
                      <span style={{ marginLeft:8, color:"#64748b", fontSize:12 }}>{c.hours} saat/hafta · €{c.tiers[0].price}/haftadan</span>
                    </div>
                  ))}
                </div>
                {cur.course && <div style={{ marginTop:10, padding:"8px 12px", background:"#f0fdff", border:`1px solid ${CYAN}`, borderRadius:8, fontSize:12, color:CYAN }}>
                  ✓ Online kurs seçildi — konaklama adımı atlanacak
                </div>}
              </>}
            </div>
          )}

          {/* ADIM 2: KURS */}
          {step === 2 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>
                {cur.isOnline ? "Kurs Detayı — EC Live" : `Kurs Seçimi — ${cur.brand} ${cur.city}`}
                {cur.cityLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginLeft:8 }}>yükleniyor...</span>}
              </h2>
              <div style={S.r2}>
                <div style={S.fld}>
                  <label style={S.lbl}>Başlangıç Tarihi (Pazartesi)</label>
                  <input type="date" style={S.fti} value={cur.startDate} min={new Date().toISOString().split("T")[0]} onChange={e => handleDateChange(e.target.value)} />
                </div>
                <div style={S.fld}>
                  <label style={S.lbl}>Süre (Hafta)</label>
                  <input style={S.fti} type="number" min={1} max={52} value={cur.weeks} onChange={e => setCur(p => ({...p, weeks:parseInt(e.target.value)||1, course:null}))} />
                </div>
              </div>
              {!cur.isOnline && (
                <div style={S.g3}>
                  {courses.length === 0 && !cur.cityLoading && <p style={{ color:"#94a3b8", fontSize:13 }}>Bu şehir için kurs verisi bulunamadı.</p>}
                  {courses.map((c,i) => {
                    const valid = isCourseValid(c, cur.weeks);
                    const sel = cur.course?.name === c.name;
                    return (
                      <div key={i} style={sel ? S.selActive : valid ? S.sel : S.selDisabled}
                        onClick={() => valid && setCur(p => ({...p, course:c}))}>
                        <div style={{ fontWeight:600 }}>{c.name}</div>
                        <div style={{ fontSize:11, color: sel?"inherit":"#64748b", marginTop:3 }}>{c.lessons} ders · {c.hours} saat/hafta</div>
                        {c.max_weeks && <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>Maks. {c.max_weeks} hafta</div>}
                        {!valid && <div style={{ fontSize:11, color:"#ef4444", marginTop:2 }}>Bu hafta için geçersiz</div>}
                      </div>
                    );
                  })}
                </div>
              )}
              {cur.isOnline && cur.course && (
                <div style={{ padding:"14px 16px", background:"#f0fdff", border:`1.5px solid ${CYAN}`, borderRadius:12 }}>
                  <strong>{cur.course.name}</strong> — {cur.course.hours} saat/hafta<br/>
                  <span style={{ fontSize:12, color:"#64748b" }}>{cur.weeks} hafta · €{getPrice(cur.course, cur.weeks).toLocaleString("tr-TR")}</span>
                </div>
              )}
            </div>
          )}

          {/* ADIM 3: KONAKLAMA */}
          {step === 3 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>
                Konaklama — {cur.brand} {cur.city}
                {cur.cityLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginLeft:8 }}>yükleniyor...</span>}
              </h2>
              {accs.length === 0 && !cur.cityLoading && <p style={{ color:"#94a3b8", fontSize:13 }}>Konaklama verisi bulunamadı.</p>}

              {accs.length > 0 && (() => {
                const types = [...new Set(accs.map(a => a.type))];
                return (
                  <>
                    <div style={S.g3}>
                      {types.map(t => (
                        <div key={t}
                          style={accType === t ? S.selActive : S.sel}
                          onClick={() => { setAccType(t); setCur(p => ({...p, acc:null})); }}>
                          {t}
                        </div>
                      ))}
                    </div>

                    {accType && (
                      <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
                        {accs.filter(a => a.type === accType).map((a,i) => {
                          const sel = cur.acc?.name===a.name && cur.acc?.room===a.room && cur.acc?.board===a.board;
                          return (
                            <div key={i} style={sel ? S.accActive : S.acc} onClick={() => setCur(p => ({...p, acc:a}))}>
                              <div>
                                <div style={{ fontWeight:600 }}>{a.name}</div>
                                <div style={{ fontSize:12, color: sel?"inherit":"#64748b", marginTop:2 }}>{a.room} · {a.board} · {a.distance}</div>
                                {a.notes && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{a.notes}</div>}
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontWeight:700 }}>{a.currency} {a.price}/h</div>
                                <div style={{ fontSize:11, color: sel?"inherit":"#94a3b8" }}>{cur.weeks}h: {a.currency} {(a.price*cur.weeks).toLocaleString("tr-TR")}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ADIM 5: ÖZET */}
          {step === 5 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Teklif Özeti</h2>
              {destinations.length === 0 && <p style={{ color:"#94a3b8" }}>Henüz destinasyon eklenmedi.</p>}
              {destinations.map((d,i) => {
                const f = d.isOnline ?
