import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g,"").trim());
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
    headers.forEach((h, i) => { row[h] = (cols[i]||"").replace(/^"|"$/g,""); });
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
  const countryTR = {
    "UK":"İngiltere","Ireland":"İrlanda","Malta":"Malta",
    "South Africa":"Güney Afrika","Canada":"Kanada","USA":"ABD","UAE":"BAE"
  };
  const languages = new Set();
  const countries = {};
  const citiesByLang = {};
  const brands = {};
  const schoolSheets = {};

  rows.forEach(row => {
    if (row.parse_status !== "approved") return;
    const city = row.city;
    const countryTRName = countryTR[row.country] || row.country;
    const brand = row.school_brand;
    const langRaw = row.language || "İngilizce";
    const driveLink = row.drive_link || "";
    const match = driveLink.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = match ? match[1] : null;
    if (sheetId && brand && !schoolSheets[brand]) {
      schoolSheets[brand] = { sheetId, sheetName: row.sheet_name };
    }
    const langs = langRaw.split(",").map(l => l.trim()).filter(Boolean);
    langs.forEach(l => {
      languages.add(l);
      if (!countries[l]) countries[l] = new Set();
      countries[l].add(countryTRName);
      if (!citiesByLang[l]) citiesByLang[l] = {};
      if (!citiesByLang[l][countryTRName]) citiesByLang[l][countryTRName] = new Set();
      citiesByLang[l][countryTRName].add(city);
    });
    brands[city] = brand;
  });

  return {
    languages: [...languages].sort(),
    countries: Object.fromEntries(Object.entries(countries).map(([k,v])=>[k,[...v]])),
    citiesByLang: Object.fromEntries(Object.entries(citiesByLang).map(([l,cm])=>[
      l, Object.fromEntries(Object.entries(cm).map(([c,s])=>[c,[...s].sort()]))
    ])),
    brands,
    schoolSheets,
  };
}

async function fetchCityData(sheetId, city) {
  const [courseRows, accRows, feeRows, transferRows] = await Promise.all([
    fetchCSV(sheetId, "courses"),
    fetchCSV(sheetId, "accommodation"),
    fetchCSV(sheetId, "fees"),
    fetchCSV(sheetId, "transfers"),
  ]);

  const courseMap = {};
  courseRows.filter(r => r.city === city).forEach(r => {
    const key = r.course_name;
    if (!courseMap[key]) {
      courseMap[key] = {
        name: r.course_name,
        type: r.program_type,
        lessons: parseFloat(r.lessons_per_week) || 0,
        hours: parseFloat(r.hours_per_week) || 0,
        currency: r.currency,
        hs_supp: parseFloat(r.high_season_supplement) || 0,
        hs_cond: r.high_season_condition,
        max_weeks: r.max_weeks ? parseInt(r.max_weeks) : null,
        morning: !!(r.morning_supplement && parseFloat(r.morning_supplement) > 0),
        notes: r.notes,
        tiers: [],
      };
    }
    courseMap[key].tiers.push({
      min: parseInt(r.weeks_tier_min) || 1,
      max: r.weeks_tier_max ? parseInt(r.weeks_tier_max) : null,
      price: parseFloat(r.price_per_week) || 0,
    });
  });

  const acc = accRows.filter(r => r.city === city).map(r => ({
    type: r.accommodation_type,
    name: r.place_name,
    room: r.room_type,
    bathroom: r.bathroom_type,
    board: r.board_type,
    distance: r.distance_to_school,
    price: parseFloat(r.price_per_week) || 0,
    hs_price: parseFloat(r.high_season_price) || 0,
    currency: r.currency,
    min_weeks: r.min_weeks ? parseInt(r.min_weeks) : null,
    notes: r.notes,
  }));

  const fees = feeRows.filter(r => r.city === city).map(r => ({
    name: r.fee_name,
    amount: parseFloat(r.amount) || 0,
    currency: r.currency,
    calc_type: r.calculation_type,
    tier_min: r.tier_min_weeks ? parseInt(r.tier_min_weeks) : null,
    tier_max: r.tier_max_weeks ? parseInt(r.tier_max_weeks) : null,
    notes: r.notes,
  }));

  const transfers = transferRows.filter(r => r.city === city).map(r => ({
    airport: r.airport_name,
    code: r.airport_code,
    one_way: parseFloat(r.price_one_way) || 0,
    two_way: parseFloat(r.price_two_way) || 0,
    currency: r.currency,
    notes: r.notes,
  }));

  return { courses: Object.values(courseMap), acc, fees, transfers };
}

function calcFees(fees, weeks) {
  if (!fees || !fees.length) return { reg:0, acc_placement:0, mat:0, currency:"GBP" };
  let reg = 0, acc_placement = 0, mat = 0, currency = fees[0]?.currency || "GBP";
  fees.forEach(f => {
    const n = f.name.toLowerCase();
    if (f.calc_type === "fixed") {
      if (n.includes("registration") || n.includes("kayit")) { reg += f.amount; }
      else if (n.includes("placement")) { acc_placement += f.amount; }
      else if (n.includes("material") || n.includes("materyal")) {
        const inRange = (!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max);
        if (inRange) mat += f.amount;
      }
    } else if (f.calc_type === "per_week") {
      if (n.includes("material") || n.includes("materyal")) mat += f.amount * weeks;
    }
  });
  return { reg, acc_placement, mat, currency };
}

function getPrice(course, weeks) {
  if (!course) return 0;
  const tier = course.tiers?.find(t => weeks >= t.min && (t.max === null || weeks <= t.max));
  return tier ? tier.price * weeks : 0;
}

function fmt(n, cur) {
  return `${cur} ${Number(n).toLocaleString("tr-TR")}`;
}

const emptyDest = (sd="") => ({
  lang:"", country:"", city:"", brand:"",
  course:null, weeks:4, acc:null, startDate:sd,
  isOnline:false, cityData:null, cityLoading:false
});

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_BORDER = "#fed7aa";

const EC_LIVE = [
  { name:"EC Live Premium (5 gun/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR", minWeeks:1 },
  { name:"EC Live Standard (2 gun/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR", minWeeks:2 },
  { name:"EC Live English for Work", hours:3, tiers:[{min:1,max:11,price:80},{min:12,max:23,price:70},{min:24,max:null,price:60}], currency:"EUR", minWeeks:1 },
];

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"Selman Çamoğlu", age:"38", gender:"Erkek" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brands:{}, schoolSheets:{} });
  const [navLoading, setNavLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
    fetchNav().then(data => {
      setNav(data);
      setNavLoading(false);
    }).catch(err => {
      console.error("Nav yuklenemedi:", err);
      setNavLoading(false);
    });
  }, []);

  // Sehir secilince o sehirin verilerini cek
  // nav.schoolSheets de dependency'de - nav yuklenmeden sehir secilirse tekrar tetiklenir
  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline) return;
    const sheetInfo = nav.schoolSheets?.[cur.brand];
    if (!sheetInfo?.sheetId) return; // nav henuz yuklenmediyse bekle, nav gelince tekrar tetiklenecek
    setCur(p => ({ ...p, cityData:null, cityLoading:true }));
    fetchCityData(sheetInfo.sheetId, cur.city)
      .then(data => setCur(p => ({ ...p, cityData:data, cityLoading:false })))
      .catch(err => { console.error("City data yuklenemedi:", err); setCur(p => ({ ...p, cityLoading:false })); });
  }, [cur.city, cur.brand, nav.schoolSheets]);

  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Özet"];
  const courses = cur.cityData?.courses || [];
  const accs    = cur.cityData?.acc     || [];
  const fees    = cur.cityData?.fees    || [];

  const canNext = [
    !!(student.name && student.gender),
    !!(cur.brand && cur.city) || !!(cur.isOnline && cur.course),
    !!cur.course,
    !!cur.acc,
    true,
  ][step];

  function next() {
    if (step === 3) { setDestinations(p => [...p, { ...cur }]); setCur(emptyDest(cur.startDate)); setStep(4); }
    else if (step === 2 && cur.isOnline) { setDestinations(p => [...p, { ...cur }]); setCur(emptyDest(cur.startDate)); setStep(4); }
    else setStep(s => s + 1);
  }

  function addDest() {
    if (step === 3 && cur.acc) setDestinations(p => [...p, { ...cur }]);
    setCur(emptyDest(cur.startDate));
    setStep(1);
  }

  function generatePDF() {
      function generatePDF() {
    const el = document.getElementById("pdf-export-area");
    if (!el) return;
    el.style.display = "block";

    const validUntil = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                      "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
      return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
    })();

    const safeStudentName = (student.name || "teklif").replace(/\s+/g, "_");
    const fname = safeStudentName + "_" + new Date().toISOString().slice(0,10) + ".pdf";

    window.html2pdf()
      .set({
        margin: 0,
        filename: fname,
        image: { type:"jpeg", quality:0.98 },
        html2canvas: { scale:2, useCORS:true, letterRendering:true },
        jsPDF: { unit:"mm", format:"a4", orientation:"portrait" },
        pagebreak: { mode:"css", before:".pdf-page-break" },
      })
      .from(el)
      .save()
      .then(() => { el.style.display = "none"; });
  }
stinations([]); setCur(emptyDest());
    setStudent({ name:"", age:"", gender:"" }); setStep(0);
  }

  if (!user) return null;

  const sidebarDests = destinations;

  return (
    <>
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fti{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;color:#0f172a;background:#fff;outline:none;transition:border-color .15s}
        .fti:focus{border-color:${ORANGE}}
        .ftg{flex:1;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit;background:#fff;color:#0f172a;transition:all .15s}
        .ftg.s{background:${ORANGE};border-color:${ORANGE};color:#fff;font-weight:600}
        .ftc{padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;font-size:13px;background:#fff;color:#0f172a;transition:all .15s;text-align:center}
        .ftc:hover{border-color:${ORANGE_BORDER}}
        .ftc.s{border-color:${ORANGE};background:${ORANGE_LIGHT};color:${ORANGE};font-weight:600}
        .ftcc{padding:16px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;transition:all .15s}
        .ftcc:hover:not(.dis){border-color:${ORANGE_BORDER}}
        .ftcc.s{border-color:${ORANGE};background:${ORANGE_LIGHT}}
        .ftcc.dis{opacity:.45;cursor:not-allowed}
        .ftac{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;transition:all .15s}
        .ftac:hover{border-color:${ORANGE_BORDER}}
        .ftac.s{border-color:${ORANGE};background:${ORANGE_LIGHT}}
        .ftpb{background:${ORANGE};color:#fff;border:none;padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s}
        .ftpb:disabled{opacity:.4;cursor:not-allowed}
        .ftpb:not(:disabled):hover{opacity:.88}
        .ftob{background:transparent;color:${ORANGE};border:1.5px solid ${ORANGE};padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
        .ftob:hover{background:${ORANGE_LIGHT}}
        .ftbb{display:flex;align-items:center;gap:6px;background:transparent;border:1px solid #e2e8f0;padding:9px 16px;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;color:#64748b;transition:background .15s}
        .ftbb:hover{background:#f8fafc}
      `}</style>

      <header style={S.hdr}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <button className="ftbb" onClick={() => navigate("/dashboard")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
          Dashboard
        </button>
        <span style={S.htitle}>Fiyat Teklifi</span>
        <div style={{ width:100 }} />
        </div>
      </header>

      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", overflowX:"auto" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700,
                background: i <= step ? ORANGE : "#e2e8f0", color: i <= step ? "#fff" : "#94a3b8" }}>
                {i < step ? "✓" : i+1}
              </div>
              <span style={{ fontSize:12, fontWeight: i===step?600:400, color: i===step?ORANGE:i<step?"#0f172a":"#94a3b8", whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i < STEPS.length-1 && <div style={{ flex:1, height:1, background:i<step?ORANGE:"#e2e8f0", margin:"0 8px" }} />}
          </div>
        ))}
      </div>
      </div>

      <div style={S.body}>
        <div style={S.main}>

          {destinations.length > 0 && step < 4 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
              {destinations.map((d,i) => <span key={i} style={S.pill}>{d.brand} {d.city} · {d.weeks}h</span>)}
            </div>
          )}

          {/* STEP 0 */}
          {step === 0 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Öğrenci bilgileri</h2>
            <div style={S.r2}>
              <div style={S.fld}>
                <label style={S.lbl}>Öğrenci adı</label>
                <input className="fti" value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))} placeholder="Ad Soyad" />
              </div>
              <div style={S.fld}>
                <label style={S.lbl}>Yaş</label>
                <input className="fti" type="number" value={student.age} onChange={e=>setStudent(p=>({...p,age:e.target.value}))} placeholder="25" />
              </div>
            </div>
            <div style={S.fld}>
              <label style={S.lbl}>Cinsiyet</label>
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                {["Erkek","Kadın"].map(g => (
                  <button key={g} className={`ftg${student.gender===g?" s":""}`} onClick={()=>setStudent(p=>({...p,gender:g}))}>{g}</button>
                ))}
              </div>
            </div>
          </div>}

          {/* STEP 1 */}
          {step === 1 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Destinasyon seç {navLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400 }}>yükleniyor...</span>}</h2>
            <p style={S.slbl}>Dil</p>
            <div style={S.g3}>
              {nav.languages.map(l => (
                <div key={l} className={`ftc${cur.lang===l?" s":""}`} onClick={()=>setCur(p=>({...emptyDest(p.startDate),lang:l}))}>{l}</div>
              ))}
            </div>
            {cur.lang && <>
              <p style={S.slbl}>Ülke</p>
              <div style={S.g3}>
                {(nav.countries[cur.lang]||[]).map(c => (
                  <div key={c} className={`ftc${cur.country===c?" s":""}`}
                    onClick={()=>setCur(p=>({...p,country:c,city:"",brand:"",course:null,acc:null}))}>{c}</div>
                ))}
              </div>
            </>}
            {cur.country && <>
              <p style={S.slbl}>Şehir</p>
              <div style={S.g3}>
                {((nav.citiesByLang?.[cur.lang]?.[cur.country]) || nav.cities[cur.country] || []).map(c => (
                  <div key={c} className={`ftc${cur.city===c?" s":""}`}
                    onClick={()=>setCur(p=>({...p,city:c,brand:nav.brands[c]||"",course:null,acc:null}))}>{c}</div>
                ))}
              </div>
            </>}
            {cur.city && <div style={{ marginTop:16, padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13, color:"#64748b" }}>
              Okul markası: <strong style={{ color:"#0f172a" }}>{cur.brand}</strong>
            </div>}

            {/* Online Egitim Bolumu */}
            <div style={{ marginTop:28, paddingTop:24, borderTop:"1.5px dashed #e2e8f0" }}>
              <p style={{ fontSize:12, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>Online Eğitim Seçenekleri</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                {EC_LIVE.map((c,i) => (
                  <div key={i}
                    className={"ftc" + (cur.isOnline && cur.course?.name===c.name ? " s" : "")}
                    onClick={()=>setCur(p=>({...emptyDest(p.startDate), isOnline:true, brand:"EC", city:"EC Live", lang:"İngilizce", course:c}))}
                    style={{ padding:"14px", textAlign:"left" }}>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{c.hours} saat/hafta</div>
                    <div style={{ fontSize:12, fontWeight:600, marginTop:6, color: cur.isOnline && cur.course?.name===c.name ? "inherit" : ORANGE }}>
                      €{c.tiers[0].price}/hafta'dan
                    </div>
                  </div>
                ))}
              </div>
              {cur.isOnline && (
                <div style={{ marginTop:12, padding:"10px 14px", background:"#eff6ff", borderRadius:10, border:"1px solid #bfdbfe", fontSize:13, color:"#2563eb" }}>
                  ✓ Online kurs seçildi — konaklama adımı atlanacak
                </div>
              )}
            </div>
          </div>}

          {/* STEP 2 */}
          {step === 2 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>
              {cur.isOnline ? "EC Live Kurs Detayı" : "Kurs seç — " + cur.brand + " " + cur.city}
              {cur.cityLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginLeft:8 }}>yükleniyor...</span>}
            </h2>
            {!cur.cityLoading && courses.length === 0 && !cur.isOnline && (
              <div style={{ padding:"20px", color:"#94a3b8", fontSize:13, textAlign:"center" }}>
                Bu şehir için kurs verisi bulunamadı.
              </div>
            )}
            <div style={S.r2}>
              <div style={S.fld}>
                <label style={S.lbl}>Başlangıç tarihi</label>
                <input className="fti" type="date" value={cur.startDate} onChange={e=>setCur(p=>({...p,startDate:e.target.value}))} />
              </div>
              <div style={S.fld}>
                <label style={S.lbl}>Süre (hafta)</label>
                <input className="fti" type="number" min={1} max={52} value={cur.weeks}
                  onChange={e=>setCur(p=>({...p,weeks:parseInt(e.target.value)||1,course:null}))} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
              {courses.map((c,i) => {
                const tier = c.tiers.find(t=>cur.weeks>=t.min&&(t.max===null||cur.weeks<=t.max));
                const pw = tier?.price;
                const total = pw ? pw*cur.weeks : null;
                const sel = cur.course?.name===c.name;
                const inv = !pw||(c.max_weeks&&cur.weeks>c.max_weeks);
                return (
                  <div key={i} className={`ftcc${sel?" s":""}${inv?" dis":""}`}
                    onClick={()=>{if(!inv)setCur(p=>({...p,course:c}))}}>
                    <div style={{ fontSize:14, fontWeight:600, color:sel?ORANGE:"#0f172a", marginBottom:6 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>{c.lessons} ders/h{c.hours?` · ${c.hours} saat`:""}</div>
                    {c.max_weeks && <div style={{ fontSize:12, color:"#94a3b8" }}>Maks. {c.max_weeks} hafta</div>}
                    {c.morning && <div style={{ fontSize:12, color:ORANGE, marginTop:4 }}>☀ Sabah garantisi</div>}
                    {pw ? <div style={{ fontSize:14, fontWeight:700, marginTop:10 }}>{c.currency} {pw}/h</div>
                        : <div style={{ fontSize:12, color:"#ef4444", marginTop:10 }}>Bu hafta geçersiz</div>}
                    {total && <div style={{ fontSize:12, color:"#64748b" }}>{cur.weeks}h: {fmt(total,c.currency)}</div>}
                    <button style={{ marginTop:10, width:"100%", padding:"7px", borderRadius:8,
                      border:`1.5px solid ${sel?ORANGE:"#e2e8f0"}`, background:sel?ORANGE:"transparent",
                      color:sel?"#fff":ORANGE, fontSize:13, cursor:inv?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:500 }}>
                      {sel?"Seçildi":"Seç"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>}

          {/* STEP 3 */}
          {step === 3 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Konaklama seç — {cur.brand} {cur.city}</h2>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Kurs süresi: {cur.weeks} hafta</div>
            {["Homestay","Student Residence","Shared Accommodation","Summer Residence"].map(type => {
              const list = accs.filter(a=>a.type===type);
              if (!list.length) return null;
              return (
                <div key={type} style={{ marginBottom:20 }}>
                  <p style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>{type}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {list.map((a,i) => {
                      const sel = cur.acc && cur.acc.name===a.name && cur.acc.board===a.board;
                      return (
                        <div key={i} className={`ftac${sel?" s":""}`} onClick={()=>setCur(p=>({...p,acc:a}))}>
                          <div>
                            <div style={{ fontSize:14, fontWeight:600, color:sel?ORANGE:"#0f172a" }}>{a.name}</div>
                            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{a.room} · {a.bathroom} · {a.board} · {a.dist}</div>
                            <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{cur.weeks}h: {fmt(a.price*cur.weeks,a.currency)}</div>
                          </div>
                          <div style={{ fontSize:15, fontWeight:700, color:"#0f172a", flexShrink:0 }}>{a.currency} {a.price}/h</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>}

          {/* STEP 4 */}
          {step === 4 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Teklif özeti</h2>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
              Öğrenci: <strong style={{ color:"#0f172a" }}>{student.name||"—"}</strong>
              {student.age&&` · ${student.age} yaş`}{student.gender&&` · ${student.gender}`}
            </div>
            {destinations.length===0 && <div style={{ textAlign:"center", color:"#94a3b8", padding:"40px 0" }}>Destinasyon eklenmedi.</div>}
            {destinations.map((d,i) => {
              const key=`${d.brand}-${d.city}`;
              const f=d.isOnline ? {reg:35,acc_placement:0,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
              const cCost=getPrice(d.course,d.weeks);
              const aCost=d.acc?d.acc.price*d.weeks:0;
              const fT=f.reg+f.acc_placement+f.mat;
              const tot=cCost+aCost+fT;
              const c=d.course?.currency||f.cur;
              return (
                <div key={i} style={{ border:"1.5px solid #e2e8f0", borderRadius:16, padding:"20px 24px", marginBottom:14, background:"#fff" }}>
                  <span style={S.pill}>{d.brand} {d.city} · {d.country} · {d.weeks}h</span>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"6px 24px", fontSize:13, marginTop:12 }}>
                    <span style={{ color:"#64748b" }}>Kurs</span><span style={{ fontWeight:600 }}>{d.course?.name||"—"}</span>
                    <span style={{ color:"#64748b" }}>Kurs ücreti</span><span style={{ fontWeight:600 }}>{fmt(cCost,c)}</span>
                    <span style={{ color:"#64748b" }}>Konaklama</span><span style={{ fontWeight:600 }}>{d.acc?`${d.acc.name} · ${d.acc.board}`:"—"}</span>
                    <span style={{ color:"#64748b" }}>Konaklama ücreti</span><span style={{ fontWeight:600 }}>{fmt(aCost,c)}</span>
                  </div>
                  <div style={{ borderTop:"1px solid #f1f5f9", marginTop:12, paddingTop:10, fontSize:12, color:"#94a3b8" }}>
                    Kayıt: {fmt(f.reg,f.cur)} · Placement: {fmt(f.acc_placement,f.cur)} · Materyaller: {fmt(f.mat,f.cur)}
                  </div>
                  <div style={{ textAlign:"right", fontSize:16, fontWeight:700, marginTop:10 }}>{fmt(tot,c)}</div>
                </div>
              );
            })}
            {destinations.length>0 && (()=>{
              const totals={};
              destinations.forEach(d=>{
                const key=`${d.brand}-${d.city}`;
                const f=d.isOnline ? {reg:35,acc_placement:0,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
                const t=getPrice(d.course,d.weeks)+(d.acc?d.acc.price*d.weeks:0)+f.reg+f.acc_placement+f.mat;
                const c=d.course?.currency||f.cur;
                totals[c]=(totals[c]||0)+t;
              });
              return (
                <div style={{ borderTop:"2px solid #0f172a", paddingTop:16, marginTop:4 }}>
                  {Object.entries(totals).map(([c,t])=>(
                    <div key={c} style={{ display:"flex", justifyContent:"space-between", fontSize:20, fontWeight:700, marginBottom:4 }}>
                      <span>Toplam ({c})</span>
                      <span style={{ color:ORANGE }}>{fmt(t,c)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>}

          {/* Nav */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:32 }}>
            {step>0 ? <button className="ftbb" onClick={()=>setStep(s=>s-1)}>← Geri</button> : <div/>}
            <div style={{ display:"flex", gap:8 }}>
              {step===3 && <button className="ftob" onClick={addDest}>+ Destinasyon ekle</button>}
              {step<4
                ? <button className="ftpb" disabled={!canNext} onClick={next}>{step===3?"Özete geç →":step===2&&cur.isOnline?"Özete geç →":"İleri →"}</button>
                : <>
                  <button className="ftpb" onClick={generatePDF} style={{ background:"#00C1DE" }}>PDF İndir</button>
                  <button className="ftpb" onClick={reset} style={{ background:"#64748b" }}>Yeni Teklif</button>
                </>
              }
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={S.side}>
          <div style={{ fontSize:14, fontWeight:600, color:"#0f172a", marginBottom:16 }}>Teklif Özeti</div>
          {sidebarDests.length===0
            ? <p style={{ fontSize:13, color:"#94a3b8" }}>Destinasyon henüz seçilmedi.</p>
            : sidebarDests.map((d,i)=>{
                const key=`${d.brand}-${d.city}`;
                const f=d.isOnline ? {reg:35,acc_placement:0,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
                const cCost=getPrice(d.course,d.weeks);
                const aCost=d.acc?d.acc.price*d.weeks:0;
                const tot=cCost+aCost+f.reg+f.acc_placement+f.mat;
                const c=d.course?.currency||f.cur;
                return (
                  <div key={i} style={{ marginBottom:14, paddingBottom:14, borderBottom:"1px solid #f1f5f9" }}>
                    <span style={S.pill}>{d.city} · {d.weeks}h</span>
                    {d.course&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:8 }}>
                      <span style={{ color:"#64748b" }}>{d.course.name}</span>
                      <span style={{ fontWeight:600 }}>{fmt(cCost,c)}</span>
                    </div>}
                    {d.acc && !d.isOnline &&<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}>
                      <span style={{ color:"#64748b" }}>{d.acc.name}</span>
                      <span style={{ fontWeight:600 }}>{fmt(aCost,c)}</span>
                    </div>}
                    {d.course&&d.acc&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, marginTop:8, color:ORANGE }}>
                      <span>Toplam</span><span>{fmt(tot,c)}</span>
                    </div>}
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>

    {/* ─── GHOST PDF TEMPLATE ─── */}
    <PdfTemplate
      destinations={destinations}
      student={student}
      user={user}
    />
    </>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { position:"sticky", top:0, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", zIndex:10 },
  htitle: { fontSize:15, fontWeight:600, color:"#0f172a" },
  steps: { display:"flex", alignItems:"center", background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0", overflowX:"auto" },
  body: { maxWidth:1100, margin:"0 auto", padding:"24px 24px 64px", display:"grid", gridTemplateColumns:"1fr 260px", gap:20, alignItems:"start" },
  main: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"28px 32px", animation:"fadeUp .3s ease-out" },
  side: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"20px", position:"sticky", top:80 },
  ttl: { fontSize:17, fontWeight:700, color:"#0f172a", marginBottom:20, letterSpacing:"-0.3px" },
  slbl: { fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", margin:"16px 0 8px" },
  r2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:4 },
  fld: { display:"flex", flexDirection:"column", gap:6, marginBottom:16 },
  lbl: { fontSize:12, color:"#64748b" },
  g3: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 },
  pill: { display:"inline-block", background:ORANGE_LIGHT, color:ORANGE, fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:600 },
};

// ─── PDF TEMPLATE (Ghost - kullanici gormuyor) ───
function PdfTemplate({ destinations, student, user }) {
  if (!destinations || destinations.length === 0) return null;

  const phone = user?.phone || "905419189177";
  const CYAN = "#00C1DE";

  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  function fmtDate(str) {
    if (!str) return "—";
    const d = new Date(str);
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function addWeeks(str, w) {
    if (!str) return "—";
    const d = new Date(str);
    d.setDate(d.getDate() + w * 7);
    return fmtDate(d.toISOString().slice(0,10));
  }

  function fmtMoney(n) {
    return Number(n).toLocaleString("tr-TR") + ",00";
  }

  function trAcc(s) {
    return (s||"")
      .replace(/Homestay/gi,"Aile Yanı Konaklama")
      .replace(/Student Residence/gi,"Öğrenci Yurdu")
      .replace(/Shared Accommodation/gi,"Paylaşımlı Daire")
      .replace(/Summer Residence/gi,"Yaz Yurdu");
  }

  function trBoard(s) {
    return (s||"")
      .replace(/Half Board/gi,"Yarım Pansiyon")
      .replace(/Full Board/gi,"Tam Pansiyon")
      .replace(/Bed & Breakfast/gi,"Kahvaltı Dahil")
      .replace(/Self-Catering/gi,"Kendi Mutfağı");
  }

  const validUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  })();

  const curSym = { GBP:"£", EUR:"€", USD:"$", CAD:"CA$" };

  return (
    <div id="pdf-export-area" style={{ display:"none", fontFamily:"Arial, Helvetica, sans-serif" }}>
      {destinations.map((d, idx) => {
        const f = d.isOnline
          ? { reg:35, acc_placement:0, mat:30, currency:"EUR" }
          : calcFees(d.cityData?.fees||[], d.weeks);
        const cCost = getPrice(d.course, d.weeks);
        const aCost = d.acc ? d.acc.price * d.weeks : 0;
        const fT = f.reg + f.acc_placement + f.mat;
        const tot = cCost + aCost + fT;
        const cur = d.course?.currency || f.currency || "GBP";
        const sym = curSym[cur] || cur;
        const startTxt = fmtDate(d.startDate);
        const endTxt = addWeeks(d.startDate, d.weeks);

        // Notes
        const notes = [];
        if (d.course?.morning) notes.push("Sabah garantisi mevcut (ek ücret uygulanabilir)");
        if (d.course?.hs_supp) notes.push(`Yüksek sezon eki: ${cur} ${d.course.hs_supp}/hafta (29 Haziran – 28 Ağustos)`);
        if (d.acc?.hs_price && d.acc.hs_price !== d.acc.price) notes.push(`Yüksek sezonda konaklama: ${cur} ${d.acc.hs_price}/hafta`);
        if (d.acc?.notes) notes.push(d.acc.notes);

        return (
          <div key={idx} className={idx > 0 ? "pdf-page-break" : ""}
            style={{ width:"210mm", minHeight:"297mm", padding:"14mm 16mm 12mm", boxSizing:"border-box", position:"relative", background:"#fff" }}>

            {/* HEADER */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6mm", paddingBottom:"3mm", borderBottom:"0.5px solid #aaa" }}>
              <div>
                <div style={{ fontSize:"7pt", color:"#888" }}>Bilimevi Eğitim Danışmanınız</div>
                <div style={{ fontSize:"9pt", fontWeight:"bold", color:"#111" }}>{user?.name || "—"}</div>
                <div style={{ fontSize:"7pt", color:"#555", marginTop:"1mm" }}>{user?.email || ""}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"7pt", color:"#555" }}>bilimevi.com</div>
              </div>
            </div>

            {/* ŞEHİR ADI */}
            <div style={{ fontSize:"52pt", fontWeight:"bold", color:CYAN, lineHeight:1, marginBottom:"3mm" }}>
              {d.city}
            </div>

            {/* TARİHLER */}
            <div style={{ fontSize:"20pt", fontWeight:"bold", color:"#111", marginBottom:"6mm", lineHeight:1.2 }}>
              {startTxt}<br/>— {endTxt}
            </div>

            {/* TABLO BAŞLIĞI */}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"9pt", marginBottom:"1mm" }}>
              <span style={{ color:"#333" }}>Teklifinize neler dahil?</span>
              <span style={{ color:"#999" }}>{sym}</span>
            </div>

            {/* HAFTA SAYISI */}
            <div style={{ fontSize:"9pt", fontWeight:"bold", color:CYAN, marginBottom:"2mm" }}>
              Hafta Sayısı: {d.weeks}
            </div>

            {/* TABLO */}
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"8.5pt" }}>
              <tbody>
                {/* KURS SATIRI */}
                <tr style={{ borderTop:"0.5px solid #ddd" }}>
                  <td style={{ padding:"3mm 2mm", fontWeight:"bold", color:"#111", verticalAlign:"top", width:"22%" }}>Kurs</td>
                  <td style={{ padding:"3mm 2mm", color:"#111", verticalAlign:"top" }}>
                    <div style={{ fontWeight:"bold" }}>{d.course?.name || "—"}</div>
                    <div style={{ color:CYAN, fontSize:"8pt" }}>{startTxt} – {endTxt}</div>
                    {d.course?.lessons && <div style={{ color:"#666", fontSize:"7.5pt" }}>{d.course.lessons} ders/hafta · {d.course.hours} saat</div>}
                  </td>
                  <td style={{ padding:"3mm 2mm", textAlign:"right", fontWeight:"bold", color:"#111", verticalAlign:"top", whiteSpace:"nowrap" }}>
                    {fmtMoney(cCost)}
                  </td>
                </tr>

                {/* KONAKLAMA */}
                {d.acc && !d.isOnline && (
                  <tr style={{ borderTop:"0.5px solid #ddd" }}>
                    <td style={{ padding:"3mm 2mm", fontWeight:"bold", color:"#111", verticalAlign:"top" }}>Konaklama</td>
                    <td style={{ padding:"3mm 2mm", color:"#111", verticalAlign:"top" }}>
                      <div style={{ fontWeight:"bold" }}>{trAcc(d.acc.name)} ({trBoard(d.acc.board)}) <span style={{ color:"#666", fontWeight:"normal" }}>(Ücrete dahil)</span></div>
                      <div style={{ color:CYAN, fontSize:"8pt" }}>{startTxt} – {endTxt}</div>
                      {d.acc.room && <div style={{ color:"#666", fontSize:"7.5pt" }}>{d.acc.room} · {d.acc.bathroom} · Okula {d.acc.distance}</div>}
                    </td>
                    <td style={{ padding:"3mm 2mm", textAlign:"right", fontWeight:"bold", color:"#111", verticalAlign:"top", whiteSpace:"nowrap" }}>
                      {fmtMoney(aCost)}
                    </td>
                  </tr>
                )}

                {/* DİĞER ÜCRETLER */}
                {(f.reg > 0 || f.mat > 0 || f.acc_placement > 0) && (
                  <>
                    {f.reg > 0 && (
                      <tr style={{ borderTop:"0.5px solid #ddd" }}>
                        <td style={{ padding:"3mm 2mm", fontWeight:"bold", color:"#111", verticalAlign:"top" }}>Diğer</td>
                        <td style={{ padding:"3mm 2mm", color:"#333" }}>Kayıt Ücreti</td>
                        <td style={{ padding:"3mm 2mm", textAlign:"right", color:"#111", whiteSpace:"nowrap" }}>{fmtMoney(f.reg)}</td>
                      </tr>
                    )}
                    {f.mat > 0 && (
                      <tr style={{ borderTop:"0.5px solid #eee" }}>
                        <td></td>
                        <td style={{ padding:"2mm 2mm", color:"#333" }}>Ders Materyalleri</td>
                        <td style={{ padding:"2mm 2mm", textAlign:"right", color:"#111", whiteSpace:"nowrap" }}>{fmtMoney(f.mat)}</td>
                      </tr>
                    )}
                    {f.acc_placement > 0 && (
                      <tr style={{ borderTop:"0.5px solid #eee" }}>
                        <td></td>
                        <td style={{ padding:"2mm 2mm", color:"#333" }}>Konaklama Placement</td>
                        <td style={{ padding:"2mm 2mm", textAlign:"right", color:"#111", whiteSpace:"nowrap" }}>{fmtMoney(f.acc_placement)}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>

            {/* TOPLAM */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"2px solid #111", marginTop:"3mm", paddingTop:"3mm" }}>
              <div style={{ fontSize:"13pt", fontWeight:"bold", color:"#111" }}>
                {sym} Toplam Tutar {cur}
              </div>
              <div style={{ fontSize:"14pt", fontWeight:"bold", color:"#111" }}>
                {cur} {fmtMoney(tot)}
              </div>
            </div>

            {/* NOTLAR */}
            {notes.length > 0 && (
              <div style={{ marginTop:"4mm", fontSize:"7.5pt", color:"#666" }}>
                <div style={{ fontWeight:"bold", marginBottom:"1mm" }}>Notlar:</div>
                {notes.map((n,i) => <div key={i}>— {n}</div>)}
              </div>
            )}

            {/* WA BUTONU */}
            <div style={{ textAlign:"center", marginTop:"6mm" }}>
              <a href={"https://wa.me/" + phone}
                style={{ display:"inline-block", background:CYAN, color:"#fff", padding:"3mm 8mm", borderRadius:"6mm", fontSize:"10pt", fontWeight:"bold", textDecoration:"none" }}>
                Eğitim Danışmanınıza Şimdi Ulaşın
              </a>
            </div>

            {/* FOOTER */}
            <div style={{ position:"absolute", bottom:"8mm", left:"16mm", right:"16mm", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:"7pt", color:"#999" }}>Geçerlilik tarihi: {validUntil}</div>
              <div style={{ textAlign:"center" }}>
                <img src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg"
                  alt="Bilimevi" style={{ height:"8mm" }} crossOrigin="anonymous" />
              </div>
              <div style={{ fontSize:"7pt", color:"#999" }}>bilimevi.com</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
