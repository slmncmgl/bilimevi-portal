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
      addon_type: r.addon_type || "compulsory",
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
// Her fee'yi ayri satirda dondur - isim, tutar, currency
function calcFees(fees, weeks) {
  const currency = fees?.[0]?.currency || "GBP";
  const items = [];
  let total = 0;

  (fees || []).forEach(f => {
    const n = (f.name || "").toLowerCase();
    // Sadece "standard" ucretleri goster: registration, placement, materials
    // Sigorta, courier, bank transfer vb. gosterme
    const isStd = n.includes("registration") || n.includes("kayit") ||
                  n.includes("placement") ||
                  n.includes("material") || n.includes("materyal") ||
                  n.includes("administration") || n.includes("booking") ||
                  n.includes("pel protection") || n.includes("protection of enrolled");

    if (!isStd) return;

    // Tier kontrolu (materials icin)
    const inRange = (!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max);
    if ((n.includes("material") || n.includes("materyal")) && !inRange) return;

    const amount = f.calc_type === "per_week" ? f.amount * weeks : f.amount;
    items.push({ name: f.name, amount, currency: f.currency || currency });
    total += amount;
  });

  return { items, total, currency };
}

const getPrice = (c, w) => {
  if (!c?.tiers) return 0;
  const tier = c.tiers.find(t => w >= t.min && (t.max === null || w <= t.max));
  return tier ? tier.price * w : 0;
};

const isCourseValid = (c, w) => c?.tiers?.some(t => w >= t.min && (t.max === null || w <= t.max));

const fmt = (n, cur) => `${cur || ""} ${Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;

const emptyDest = (sd = "") => ({
  lang: "", country: "", city: "", brand: "",
  course: null, weeks: 4, acc: null, startDate: sd,
  isOnline: false, cityData: null, cityLoading: false,
  addons: [], // secilen optional add-on'lar
});

const EC_LIVE = [
  { name:"EC Live Premium (5 gün/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR" },
  { name:"EC Live Standard (2 gün/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR" },
  { name:"EC Live English for Work", hours:3, tiers:[{min:1,max:11,price:80},{min:12,max:23,price:70},{min:24,max:null,price:60}], currency:"EUR" },
];

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const fmtDate = (d) => d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "—";
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
      .then(data => setCur(p => ({ ...p, cityData: data, cityLoading: false })));
  }, [cur.city, cur.brand, nav.schoolSheets, cur.isOnline, cur.cityData]);

  const courses = cur.cityData?.courses || [];
  const accs = cur.cityData?.acc || [];
  const feesData = cur.isOnline
    ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" }
    : calcFees(cur.cityData?.fees, cur.weeks);
  const cCost = getPrice(cur.course, cur.weeks);
  const aCost = cur.acc ? cur.acc.price * cur.weeks : 0;
  const addonsCost = (cur.addons||[]).reduce((s,a) => s+(a.totalAmount||0), 0);
  const currentTotal = cCost + aCost + (feesData.total || 0) + addonsCost;

  const canNext = [
    !!(student.name && student.gender && student.age),
    (cur.isOnline && cur.course) || !!(cur.brand && cur.city),
    !!cur.course && isCourseValid(cur.course, cur.weeks) && !cur.cityLoading,
    !!cur.acc || cur.isOnline,
    true, // add-ons secim zorunlu degil
    true, // ozet
  ][step];

  // Pazartesi zorlaması
  const handleDateChange = (val) => {
    if (!val) return;
    const d = new Date(val);
    if (d.getDay() !== 1) d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 8 - d.getDay()));
    setCur(p => ({ ...p, startDate: d.toISOString().split("T")[0] }));
  };

  const next = () => {
    if (step === 4 || (step === 2 && cur.isOnline)) {
      // Duplicate kontrolu
      const isDup = destinations.some(d =>
        d.city === cur.city && d.course?.name === cur.course?.name && d.acc?.name === cur.acc?.name
      );
      if (!isDup) setDestinations(p => [...p, { ...cur }]);
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
      pagebreak: { mode:"css" },
    }).from(el).save().then(() => { el.style.display = "none"; });
  };

  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Add-ons","Özet"];

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
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {accs.map((a,i) => {
                  const sel = cur.acc?.name===a.name && cur.acc?.room===a.room && cur.acc?.board===a.board;
                  return (
                    <div key={i} style={sel ? S.accActive : S.acc} onClick={() => setCur(p => ({...p, acc:a}))}>
                      <div>
                        <div style={{ fontWeight:600 }}>{a.name} <span style={{ fontWeight:400, fontSize:12 }}>({a.type})</span></div>
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
            </div>
          )}

          {/* ADIM 4: ÖZET */}
          {step === 5 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Teklif Özeti</h2>
              {destinations.length === 0 && <p style={{ color:"#94a3b8" }}>Henüz destinasyon eklenmedi.</p>}
              {destinations.map((d,i) => {
                const f = d.isOnline ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" } : calcFees(d.cityData?.fees, d.weeks);
                const cc = getPrice(d.course, d.weeks);
                const ac = d.acc ? d.acc.price * d.weeks : 0;
                const addonTotal = (d.addons||[]).reduce((s,a) => s + (a.totalAmount||0), 0);
                const tot = cc + ac + (f.total || 0) + addonTotal;
                const cur2 = d.course?.currency || f.currency;
                // Tarih hesapla
                const sD = d.startDate ? new Date(d.startDate) : null;
                const eD = sD ? (() => { const x = new Date(sD); x.setDate(sD.getDate() + d.weeks*7 - 3); return x; })() : null;
                const accSD = sD ? (() => { const x = new Date(sD); x.setDate(sD.getDate() - 1); return x; })() : null;
                const accED = eD ? (() => { const x = new Date(eD); x.setDate(eD.getDate() + 2); return x; })() : null;
                const MONTHS_TR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
                const fd = (dt) => dt ? `${dt.getDate()} ${MONTHS_TR[dt.getMonth()]} ${dt.getFullYear()}` : "—";

                // Notlar
                const destNotes = [];
                if (d.course?.morning) destNotes.push("Sabah garantisi mevcut (ek ücret uygulanabilir)");
                if (d.course?.hs_supp > 0) destNotes.push(`Yüksek sezon eki: ${cur2} ${d.course.hs_supp}/hafta (29 Haz – 28 Ağu)`);
                if (d.acc?.hs_price > 0 && d.acc.hs_price !== d.acc.price) destNotes.push(`Yüksek sezonda konaklama: ${cur2} ${d.acc.hs_price}/hafta`);
                if (d.course?.notes) destNotes.push(d.course.notes);
                if (d.acc?.notes) destNotes.push(d.acc.notes);

                return (
                  <div key={i} style={S.summaryCard}>
                    {/* Başlık */}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                      <strong style={{ fontSize:15 }}>{d.brand} {d.city}</strong>
                      <span style={{ fontSize:12, color:"#64748b" }}>{d.weeks} hafta</span>
                    </div>

                    {/* Kurs */}
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Kurs</div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                        <span style={{ fontWeight:600 }}>{d.course?.name}</span>
                        <span style={{ fontWeight:600, color:CYAN }}>{fmt(cc, cur2)}</span>
                      </div>
                      {sD && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
                        📅 {fd(sD)} — {fd(eD)}
                      </div>}
                    </div>

                    {/* Konaklama */}
                    {d.acc && !d.isOnline && (
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Konaklama</div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                          <span style={{ fontWeight:600 }}>{d.acc.name} · {d.acc.board}</span>
                          <span style={{ fontWeight:600, color:CYAN }}>{fmt(ac, cur2)}</span>
                        </div>
                        {accSD && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
                          📅 {fd(accSD)} — {fd(accED)}
                        </div>}
                      </div>
                    )}

                    {/* Diğer */}
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:10 }}>
                      <span style={{ color:"#64748b" }}>Kayıt + Materyal</span>
                      <span style={{ fontWeight:600 }}>{fmt(f.reg+f.mat+(f.place||0), cur2)}</span>
                    </div>

                    {/* Toplam */}
                    <div style={{ borderTop:`1.5px solid #0f172a`, paddingTop:8, display:"flex", justifyContent:"space-between", fontWeight:700 }}>
                      <span>Toplam</span><span style={{ color:CYAN }}>{fmt(tot, cur2)}</span>
                    </div>

                    {/* Transfer */}
                    {d.cityData?.transfers?.length > 0 && (
                      <div style={{ marginTop:8, fontSize:13 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Transfer</div>
                        {d.cityData.transfers.map((t, ti) => (
                          <div key={ti} style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ color:"#64748b" }}>{t.airport} ({t.code})</span>
                            <span style={{ fontWeight:600 }}>{t.currency} {Number(t.one_way).toLocaleString("tr-TR")}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notlar */}
                    {destNotes.length > 0 && (
                      <div style={{ marginTop:12, padding:"10px 12px", background:"#fef9ec", borderRadius:8, border:"1px solid #fde68a" }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#92400e", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Notlar</div>
                        {destNotes.map((n,ni) => (
                          <div key={ni} style={{ fontSize:12, color:"#78350f", marginBottom:3 }}>— {n}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={addNew} style={S.addBtn}>+ Yeni Destinasyon Ekle</button>
            </div>
          )}

          {/* ADIM 4: ADD-ONS */}
          {step === 4 && (
            <div style={{ animation:"fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Add-ons — {cur.brand} {cur.city}</h2>
              {(() => {
                const allFees = cur.cityData?.fees || [];
                const age = parseInt(student.age) || 0;
                const startD = cur.startDate ? new Date(cur.startDate) : null;

                // Compulsory olanlar - otomatik goster
                const compulsory = allFees.filter(f => {
                  if (f.addon_type !== "compulsory") return false;
                  if (f.eligible_courses && !f.eligible_courses.split(",").map(s=>s.trim()).includes(cur.course?.name)) return false;
                  if (f.min_age && age < f.min_age) return false;
                  if (f.max_age && age > f.max_age) return false;
                  if (f.date_start && startD && new Date(f.date_start) > startD) return false;
                  if (f.date_end && startD && new Date(f.date_end) < startD) return false;
                  return true;
                });

                // Optional olanlar - secim yapilabilir
                const optional = allFees.filter(f => {
                  if (!["optional_service","supplement","upgrade","course_addon","post_departure"].includes(f.addon_type)) return false;
                  if (f.eligible_courses && !f.eligible_courses.split(",").map(s=>s.trim()).includes(cur.course?.name)) return false;
                  if (f.min_age && age < f.min_age) return false;
                  if (f.max_age && age > f.max_age) return false;
                  if (f.date_start && startD && new Date(f.date_start) > startD) return false;
                  if (f.date_end && startD && new Date(f.date_end) < startD) return false;
                  return true;
                });

                if (compulsory.length === 0 && optional.length === 0) {
                  return <p style={{ color:"#94a3b8", fontSize:13 }}>Bu kurs ve tarih için eklenebilecek add-on bulunmuyor.</p>;
                }

                return (
                  <>
                    {compulsory.length > 0 && (
                      <div style={{ marginBottom:20 }}>
                        <p style={S.slbl}>Zorunlu Ücretler</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {compulsory.map((f,i) => (
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13 }}>
                              <div>
                                <span style={{ fontWeight:600 }}>{f.name}</span>
                                {f.notes && <span style={{ fontSize:11, color:"#94a3b8", marginLeft:8 }}>{f.notes}</span>}
                              </div>
                              <span style={{ fontWeight:600, color:"#64748b" }}>
                                {f.calc_type === "per_week" ? `${f.currency} ${f.amount}/h` : `${f.currency} ${Number(f.amount).toLocaleString("tr-TR")}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {optional.length > 0 && (
                      <div>
                        <p style={S.slbl}>İsteğe Bağlı Eklemeler</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {optional.map((f,i) => {
                            const sel = cur.addons?.some(a => a.name === f.name);
                            const amt = f.calc_type === "per_week" ? f.amount * cur.weeks : f.amount;
                            return (
                              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderRadius:12, border:`1.5px solid ${sel ? CYAN : "#e2e8f0"}`, background: sel ? "#f0fdff" : "#fff", cursor:"pointer" }}
                                onClick={() => setCur(p => ({
                                  ...p,
                                  addons: sel
                                    ? (p.addons||[]).filter(a => a.name !== f.name)
                                    : [...(p.addons||[]), { ...f, totalAmount: amt }]
                                }))}>
                                <div>
                                  <div style={{ fontWeight:600, fontSize:13, color: sel ? CYAN : "#0f172a" }}>{f.name}</div>
                                  {f.notes && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{f.notes}</div>}
                                  {f.addon_type === "supplement" && <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>Ek ücret</div>}
                                </div>
                                <div style={{ textAlign:"right", flexShrink:0 }}>
                                  <div style={{ fontWeight:700, color: sel ? CYAN : "#0f172a" }}>
                                    {f.currency} {Number(amt).toLocaleString("tr-TR")}
                                  </div>
                                  {f.calc_type === "per_week" && <div style={{ fontSize:11, color:"#94a3b8" }}>{f.amount}/h × {cur.weeks}h</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* NAVİGASYON */}
          <div style={S.navBox}>
            {step > 0 && <button onClick={() => setStep(s => s-1)} style={S.btnBack}>← Geri</button>}
            <div style={{ display:"flex", gap:10 }}>
              {step === 5 && <button onClick={reset} style={{ ...S.btnBack, border:`1px solid #e2e8f0`, padding:"10px 20px", borderRadius:10 }}>Yeni Teklif</button>}
              {step < 4 && <button style={S.btnNext} disabled={!canNext} onClick={next}>{step===4||(step===2&&cur.isOnline) ? "Özete Geç →" : "İleri →"}</button>}
            </div>
          </div>
        </main>

        {/* SIDEBAR */}
        <aside style={S.side}>
          <h3 style={S.sideTtl}>Anlık Özet</h3>
          <div style={S.liveBox}>
            {cur.lang && <div style={{ marginBottom:4 }}>📍 {cur.lang}{cur.country ? ` / ${cur.country}` : ""}{cur.city ? ` / ${cur.city}` : ""}</div>}
            {cur.course && <div style={{ marginBottom:4 }}>📚 {cur.course.name} ({cur.weeks}h)</div>}
            {cur.acc && <div style={{ marginBottom:4 }}>🏠 {cur.acc.name}</div>}
            {currentTotal > 0 && isCourseValid(cur.course, cur.weeks) && (
              <div style={S.liveTotal}>Anlık: {fmt(currentTotal, cur.course?.currency || feesData.currency)}</div>
            )}
          </div>
          {destinations.length > 0 && destinations.map((d,i) => (
            <div key={i} style={{ fontSize:12, padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}>
              <strong>{d.city}</strong> · {d.weeks}h · {d.course?.name?.slice(0,20)}
            </div>
          ))}
          {step === 5 && destinations.length > 0 && (
            <button onClick={generatePDF} style={S.pdfBtn}>📄 PDF Oluştur</button>
          )}
        </aside>
      </div>
    </div>

    {/* ─── GHOST PDF TEMPLATE ─── */}
    <PdfTemplate destinations={destinations} student={student} user={user} />
    </>
  );
}

// ─── PDF TEMPLATE ───
function PdfTemplate({ destinations, student, user }) {
  if (!destinations?.length) return null;
  const phone = user?.phone || "905419189177";
  const validUntil = (() => { const d = new Date(); d.setDate(d.getDate()+7); return fmtDate(d); })();

  return (
    <div id="pdf-area" style={{ display:"none", fontFamily:"Arial, Helvetica, sans-serif", background:"#fff" }}>
      {destinations.map((d, idx) => {
        const f = d.isOnline ? { items:[{name:"Kayıt Ücreti",amount:35,currency:"EUR"},{name:"Ders Materyalleri",amount:30,currency:"EUR"}], total:65, currency:"EUR" } : calcFees(d.cityData?.fees, d.weeks);
        const cCost = getPrice(d.course, d.weeks);
        const aCost = d.acc ? d.acc.price * d.weeks : 0;
        const addonTot = (d.addons||[]).reduce((s,a) => s+(a.totalAmount||0), 0);
        const tot = cCost + aCost + (f.total || 0) + addonTot;
        const cur = d.course?.currency || f.currency || "GBP";
        const curSym = { GBP:"£", EUR:"€", USD:"$", CAD:"CA$" }[cur] || cur;
        const startD = d.startDate ? new Date(d.startDate) : new Date();
        // Kurs bitisi: baslangic pazartesi + (hafta*7 - 3) gun = cuma
        const endD = new Date(startD);
        endD.setDate(startD.getDate() + d.weeks * 7 - 3);
        // Konaklama: giris = kurs baslangicindan 1 gun onceki pazar, cikis = kurs bitisinin ardindan gelen pazar
        const accStartD = new Date(startD); accStartD.setDate(startD.getDate() - 1);
        const accEndD = new Date(endD); accEndD.setDate(endD.getDate() + 2);

        // Notlar - sadece secili kurs ve konaklama notlari + hs/morning
        const notes = [];
        if (d.course?.morning) notes.push("Sabah garantisi mevcut (ek ücret uygulanabilir)");
        if (d.course?.hs_supp > 0) notes.push(`Yüksek sezon eki: ${cur} ${d.course.hs_supp}/hafta (29 Haziran – 28 Ağustos)`);
        if (d.acc?.hs_price > 0 && d.acc.hs_price !== d.acc.price) notes.push(`Yüksek sezonda konaklama: ${cur} ${d.acc.hs_price}/hafta`);
        if (d.course?.notes) notes.push(d.course.notes);
        if (d.acc?.notes) notes.push(d.acc.notes);

        return (
          <div key={idx} style={{ width:"210mm", padding:"12mm 18mm 10mm", boxSizing:"border-box", background:"#fff", display:"block", pageBreakBefore: idx > 0 ? "always" : "auto", pageBreakAfter: "auto", pageBreakInside: "avoid" }}>

            {/* HEADER */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingBottom:"5mm", borderBottom:"0.4px solid #aaa", marginBottom:"8mm" }}>
              <div>
                <div style={{ fontSize:"7pt", color:"#999", marginBottom:"1mm" }}>Bilimevi Eğitim Danışmanınız</div>
                <div style={{ fontSize:"11pt", fontWeight:"bold", color:"#111" }}>{user?.name || "—"}</div>
                <div style={{ fontSize:"8pt", color:"#555", marginTop:"1mm" }}>{user?.email || ""}</div>
              </div>
              <img src={LOGO_ASSET} alt="Bilimevi" style={{ height:"10mm" }} />
            </div>

            {/* ŞEHİR */}
            <div style={{ fontSize:"54pt", fontWeight:"900", color:CYAN, lineHeight:1, marginBottom:"3mm", letterSpacing:"-1px" }}>{d.city}</div>

            {/* TARİHLER */}
            <div style={{ fontSize:"20pt", fontWeight:"bold", color:"#111", marginBottom:"8mm", lineHeight:1.2 }}>
              {fmtDate(startD)}<br/>— {fmtDate(endD)}
            </div>

            {/* TABLO BAŞLIĞI */}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10pt", marginBottom:"1mm" }}>
              <span>Teklifinize neler dahil?</span>
              <span style={{ color:"#aaa" }}>{curSym}</span>
            </div>
            <div style={{ fontSize:"10pt", fontWeight:"bold", color:CYAN, marginBottom:"2mm" }}>Hafta Sayısı: {d.weeks}</div>
            <div style={{ borderTop:"2px solid #111", marginBottom:"0" }} />

            {/* TABLO */}
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"9pt" }}>
              <tbody>
                {/* KURS */}
                <tr style={{ borderBottom:"0.5px solid #ddd" }}>
                  <td style={{ padding:"4mm 2mm 4mm 0", fontWeight:"bold", verticalAlign:"top", width:"20%", color:"#111" }}>Kurs</td>
                  <td style={{ padding:"4mm 2mm", verticalAlign:"top", width:"58%" }}>
                    <div style={{ fontWeight:"bold", fontSize:"10pt" }}>{d.brand} — {d.course?.name}</div>
                    <div style={{ fontSize:"8pt", color:"#555", marginTop:"1mm" }}>
                      <strong>Başlangıç:</strong> {fmtDate(startD)} &nbsp;|&nbsp; <strong>Bitiş:</strong> {fmtDate(endD)}
                    </div>
                    {d.course?.lessons > 0 && <div style={{ fontSize:"8pt", color:"#777", marginTop:"1mm" }}>{d.course.lessons} ders/hafta · {d.course.hours} saat</div>}
                  </td>
                  <td style={{ padding:"4mm 0 4mm 2mm", textAlign:"right", fontWeight:"bold", fontSize:"10pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{fmtDate(startD) && `${Number(cCost).toLocaleString("tr-TR")},00`}</td>
                </tr>

                {/* KONAKLAMA */}
                {d.acc && !d.isOnline && (
                  <tr style={{ borderBottom:"0.5px solid #ddd" }}>
                    <td style={{ padding:"4mm 2mm 4mm 0", fontWeight:"bold", verticalAlign:"top", color:"#111" }}>Konaklama</td>
                    <td style={{ padding:"4mm 2mm", verticalAlign:"top" }}>
                      <div style={{ fontWeight:"bold", fontSize:"10pt" }}>{d.acc.name} <span style={{ fontWeight:"normal", fontSize:"9pt" }}>({d.acc.board})</span></div>
                      <div style={{ fontSize:"8pt", color:"#555", marginTop:"1mm" }}>
                        <strong>Giriş:</strong> {fmtDate(accStartD)} &nbsp;|&nbsp; <strong>Çıkış:</strong> {fmtDate(accEndD)}
                      </div>
                      <div style={{ fontSize:"8pt", color:"#777", marginTop:"1mm" }}>{d.acc.room} · {d.acc.bathroom} · Okula {d.acc.distance}</div>
                    </td>
                    <td style={{ padding:"4mm 0 4mm 2mm", textAlign:"right", fontWeight:"bold", fontSize:"10pt", verticalAlign:"top", whiteSpace:"nowrap" }}>{Number(aCost).toLocaleString("tr-TR")},00</td>
                  </tr>
                )}

                {/* DİĞER - her fee ayri satir */}
                {f.items?.length > 0 && f.items.map((fi, fii) => (
                  <tr key={fii} style={{ borderBottom:"0.5px solid #ddd" }}>
                    <td style={{ padding:"3mm 2mm 3mm 0", fontWeight: fii===0 ? "bold" : "normal", verticalAlign:"top", color:"#111", fontSize: fii===0 ? "inherit" : "9pt" }}>
                      {fii === 0 ? "Diğer" : ""}
                    </td>
                    <td style={{ padding:"3mm 2mm", verticalAlign:"top", fontSize:"9pt" }}>{fi.name}</td>
                    <td style={{ padding:"3mm 0 3mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap" }}>
                      {Number(fi.amount).toLocaleString("tr-TR")},00
                    </td>
                  </tr>
                ))}

                {/* ADD-ONS */}
                {(d.addons||[]).length > 0 && (d.addons||[]).map((a, ai) => (
                  <tr key={ai} style={{ borderBottom:"0.5px solid #ddd" }}>
                    <td style={{ padding:"3mm 2mm 3mm 0", fontWeight: ai===0 ? "bold" : "normal", verticalAlign:"top", color:"#111", fontSize: ai===0 ? "inherit" : "9pt" }}>
                      {ai === 0 ? "Add-ons" : ""}
                    </td>
                    <td style={{ padding:"3mm 2mm", verticalAlign:"top", fontSize:"9pt" }}>{a.name}{a.notes ? ` — ${a.notes}` : ""}</td>
                    <td style={{ padding:"3mm 0 3mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap" }}>
                      {Number(a.totalAmount||0).toLocaleString("tr-TR")},00
                    </td>
                  </tr>
                ))}

                {/* TRANSFER */}
                {d.cityData?.transfers?.length > 0 && (
                  <tr style={{ borderBottom:"0.5px solid #ddd" }}>
                    <td style={{ padding:"3mm 2mm 3mm 0", fontWeight:"bold", verticalAlign:"top", color:"#111" }}>Transfer</td>
                    <td style={{ padding:"3mm 2mm", verticalAlign:"top", fontSize:"9pt" }}>
                      {d.cityData.transfers.map((t, ti) => (
                        <div key={ti}>{t.airport} ({t.code}){t.notes ? ` — ${t.notes}` : ""}</div>
                      ))}
                    </td>
                    <td style={{ padding:"3mm 0 3mm 2mm", textAlign:"right", fontSize:"9pt", verticalAlign:"top", whiteSpace:"nowrap" }}>
                      {d.cityData.transfers.map((t, ti) => (
                        <div key={ti}>{t.currency} {Number(t.one_way).toLocaleString("tr-TR")},00</div>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* TOPLAM */}
            <div style={{ borderTop:"2.5px solid #111", marginTop:"3mm", padding:"3mm 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:"bold", fontSize:"12pt", textTransform:"uppercase" }}>Toplam Tutar {cur}</span>
              <span style={{ fontWeight:"bold", fontSize:"18pt" }}>{curSym} {Number(tot).toLocaleString("tr-TR")},00</span>
            </div>

            {/* NOTLAR */}
            {notes.length > 0 && (
              <div style={{ marginTop:"4mm", background:"#f9f9f9", padding:"3mm 4mm", borderRadius:"3mm", fontSize:"7.5pt", color:"#555", border:"0.5px solid #eee" }}>
                <div style={{ fontWeight:"bold", marginBottom:"2mm", textTransform:"uppercase", fontSize:"7pt", color:"#888" }}>Önemli Notlar</div>
                {notes.map((n,i) => <div key={i} style={{ marginBottom:"1mm" }}>— {n}</div>)}
              </div>
            )}

            {/* WA BUTONU */}
            <div style={{ textAlign:"center", marginTop:"6mm" }}>
              <a href={`https://wa.me/${phone}`}
                style={{ display:"inline-block", background:CYAN, color:"#fff", padding:"3mm 10mm", borderRadius:"8mm", fontSize:"10pt", fontWeight:"bold", textDecoration:"none" }}>
                Eğitim Danışmanınıza Şimdi Ulaşın
              </a>
            </div>

            {/* FOOTER */}
            <div style={{ marginTop:"16mm", paddingTop:"4mm", borderTop:"0.5px solid #eee", display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
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
  fti: { padding:"10px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, fontFamily:"inherit" },
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
};
