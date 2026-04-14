import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";

// --- YARDIMCI PARSE FONKSİYONLARI ---
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
  const brandsByCity = {}; // Şehirdeki markaları tutmak için
  const schoolSheets = {}; // Markaya göre sheetId tutmak için

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

      if (!brandsByCity[city]) brandsByCity[city] = new Set();
      brandsByCity[city].add(brand);
    });
  });

  return {
    languages: [...languages].sort(),
    countries: Object.fromEntries(Object.entries(countries).map(([k,v])=>[k,[...v]])),
    citiesByLang: Object.fromEntries(Object.entries(citiesByLang).map(([l,cm])=>[
      l, Object.fromEntries(Object.entries(cm).map(([c,s])=>[c,[...s].sort()]))
    ])),
    brandsByCity: Object.fromEntries(Object.entries(brandsByCity).map(([c,s])=>[c,[...s]])),
    schoolSheets,
  };
}

async function fetchCityData(sheetId, city) {
  const [courseRows, accRows, feeRows] = await Promise.all([
    fetchCSV(sheetId, "courses"),
    fetchCSV(sheetId, "accommodation"),
    fetchCSV(sheetId, "fees"),
  ]);

  const courseMap = {};
  courseRows.filter(r => r.city === city).forEach(r => {
    const key = r.course_name;
    if (!courseMap[key]) {
      courseMap[key] = {
        name: r.course_name,
        lessons: parseFloat(r.lessons_per_week) || 0,
        hours: parseFloat(r.hours_per_week) || 0,
        currency: r.currency,
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
    name: r.place_name,
    room: r.room_type,
    board: r.board_type,
    price: parseFloat(r.price_per_week) || 0,
    currency: r.currency,
  }));

  const fees = feeRows.filter(r => r.city === city).map(r => ({
    name: r.fee_name,
    amount: parseFloat(r.amount) || 0,
    currency: r.currency,
    calc_type: r.calculation_type,
    tier_min: r.tier_min_weeks ? parseInt(r.tier_min_weeks) : null,
    tier_max: r.tier_max_weeks ? parseInt(r.tier_max_weeks) : null,
  }));

  return { courses: Object.values(courseMap), acc, fees };
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
  { name:"EC Live Premium (5 gun/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR" },
  { name:"EC Live Standard (2 gun/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR" },
];

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"Selman Çamoğlu", age:"38", gender:"Erkek" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brandsByCity:{}, schoolSheets:{} });
  const [navLoading, setNavLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) return navigate("/");
    setUser(session);
    fetchNav().then(data => { setNav(data); setNavLoading(false); });
  }, []);

  // Şehir VE Marka seçildiğinde veriyi çek
  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline) return;
    const sheetInfo = nav.schoolSheets?.[cur.brand];
    if (!sheetInfo?.sheetId) return;
    setCur(p => ({ ...p, cityData:null, cityLoading:true }));
    fetchCityData(sheetInfo.sheetId, cur.city)
      .then(data => setCur(p => ({ ...p, cityData:data, cityLoading:false })))
      .catch(err => { console.error("Veri hatasi:", err); setCur(p => ({ ...p, cityLoading:false })); });
  }, [cur.city, cur.brand]);

  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Özet"];
  const courses = cur.cityData?.courses || [];
  const accs    = cur.cityData?.acc     || [];

  const canNext = [
    !!(student.name && student.gender),
    (!!(cur.brand && cur.city) || !!(cur.isOnline && cur.course)),
    (!!cur.course && !cur.cityLoading),
    (!!cur.acc || cur.isOnline),
    true,
  ][step];

  function next() {
    if (step === 3 || (step === 2 && cur.isOnline)) { 
      setDestinations(prev => [...prev, { ...cur }]); 
      setCur(emptyDest(cur.startDate)); 
      setStep(4); 
    }
    else setStep(s => s + 1);
  }

  function addDest() {
    setDestinations(prev => [...prev, { ...cur }]);
    setCur(emptyDest(cur.startDate));
    setStep(1);
  }

  function generatePDF() {
    const el = document.getElementById("pdf-export-area");
    if (!window.html2pdf) return alert("Hata: html2pdf kütüphanesi bulunamadı.");
    el.style.display = "block";
    window.html2pdf().set({
        margin: 10, filename: `${student.name || 'teklif'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(el).save().then(() => { el.style.display = "none"; });
  }

  const reset = () => { setDestinations([]); setCur(emptyDest()); setStudent({ name:"", age:"", gender:"" }); setStep(0); };

  if (!user) return null;

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
        .ftcc.s{border-color:${ORANGE};background:${ORANGE_LIGHT}}
        .ftac{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;transition:all .15s}
        .ftac.s{border-color:${ORANGE};background:${ORANGE_LIGHT}}
        .ftpb{background:${ORANGE};color:#fff;border:none;padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
        .ftob{background:transparent;color:${ORANGE};border:1.5px solid ${ORANGE};padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
        .ftbb{display:flex;align-items:center;gap:6px;background:transparent;border:1px solid #e2e8f0;padding:9px 16px;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;color:#64748b}
      `}</style>

      <header style={S.hdr}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button className="ftbb" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <span style={S.htitle}>Fiyat Teklifi</span>
          <div style={{ width:100 }} />
        </div>
      </header>

      <div style={S.steps}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", width:"100%" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700,
                  background: i <= step ? ORANGE : "#e2e8f0", color: i <= step ? "#fff" : "#94a3b8" }}>{i < step ? "✓" : i+1}</div>
                <span style={{ fontSize:12, fontWeight: i===step?600:400, color: i===step?ORANGE:i<step?"#0f172a":"#94a3b8" }}>{s}</span>
              </div>
              {i < STEPS.length-1 && <div style={{ flex:1, height:1, background:i<step?ORANGE:"#e2e8f0", margin:"0 8px" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={S.body}>
        <div style={S.main}>
          {step === 0 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Öğrenci bilgileri</h2>
            <div style={S.r2}>
              <div style={S.fld}><label style={S.lbl}>Öğrenci adı</label><input className="fti" value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))} /></div>
              <div style={S.fld}><label style={S.lbl}>Yaş</label><input className="fti" type="number" value={student.age} onChange={e=>setStudent(p=>({...p,age:e.target.value}))} /></div>
            </div>
            <div style={S.fld}>
              <label style={S.lbl}>Cinsiyet</label>
              <div style={{ display:"flex", gap:8 }}>{["Erkek","Kadın"].map(g => (<button key={g} className={`ftg${student.gender===g?" s":""}`} onClick={()=>setStudent(p=>({...p,gender:g}))}>{g}</button>))}</div>
            </div>
          </div>}

          {step === 1 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Eğitim Türü ve Destinasyon</h2>
            <p style={S.slbl}>Dil Seçimi</p>
            <div style={S.g3}>
              {nav.languages.map(l => (
                <div key={l} className={`ftc${cur.lang===l && !cur.isOnline ?" s":""}`} onClick={()=>setCur(p=>({...emptyDest(p.startDate),lang:l, isOnline:false}))}>{l}</div>
              ))}
              <div className={`ftc${cur.isOnline ? " s" : ""}`} 
                   style={{ borderColor: cur.isOnline ? ORANGE : "#3b82f6", color: cur.isOnline ? ORANGE : "#3b82f6", fontWeight: 600 }}
                   onClick={()=>setCur(p=>({...emptyDest(p.startDate), isOnline:true, brand:"EC", city:"Online", lang:"İngilizce"}))}>
                🌐 Online (EC Live)
              </div>
            </div>

            {!cur.isOnline && cur.lang && <>
              <p style={S.slbl}>Ülke</p>
              <div style={S.g3}>{(nav.countries[cur.lang]||[]).map(c => (<div key={c} className={`ftc${cur.country===c?" s":""}`} onClick={()=>setCur(p=>({...p,country:c,city:"",brand:"",course:null}))}>{c}</div>))}</div>
            </>}

            {!cur.isOnline && cur.country && <>
              <p style={S.slbl}>Şehir</p>
              <div style={S.g3}>{(nav.citiesByLang[cur.lang]?.[cur.country]||[]).map(c => (<div key={c} className={`ftc${cur.city===c?" s":""}`} onClick={()=>setCur(p=>({...p,city:c,brand:"",course:null}))}>{c}</div>))}</div>
            </>}

            {!cur.isOnline && cur.city && <>
              <p style={S.slbl}>Okul / Marka</p>
              <div style={S.g3}>{(nav.brandsByCity[cur.city]||[]).map(b => (<div key={b} className={`ftc${cur.brand===b?" s":""}`} onClick={()=>setCur(p=>({...p,brand:b,course:null}))}>{b}</div>))}</div>
            </>}

            {cur.isOnline && (
              <div style={{ marginTop: 24, animation: "fadeUp .3s" }}>
                <p style={S.slbl}>Online Paket Seçin</p>
                <div style={{ display: "grid", gap: 10 }}>
                  {EC_LIVE.map((c, i) => (
                    <div key={i} className={`ftac${cur.course?.name === c.name ? " s" : ""}`} onClick={() => setCur(p => ({ ...p, course: c }))}>
                      <div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.hours} saat/h</div></div>
                      <div style={{ fontWeight: 700 }}>{c.currency} {c.tiers[0].price}/h</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>}

          {step === 2 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>{cur.isOnline ? "Online Eğitim Süresi" : `Kurs Detayı – ${cur.brand} ${cur.city}`}</h2>
            <div style={S.r2}>
              <div style={S.fld}><label style={S.lbl}>Başlangıç tarihi</label><input className="fti" type="date" value={cur.startDate} onChange={e=>setCur(p=>({...p,startDate:e.target.value}))} /></div>
              <div style={S.fld}><label style={S.lbl}>Süre (hafta)</label><input className="fti" type="number" value={cur.weeks} onChange={e=>setCur(p=>({...p,weeks:parseInt(e.target.value)||1}))} /></div>
            </div>
            {cur.cityLoading && <div style={{ textAlign: "center", padding: 20 }}>Programlar çekiliyor...</div>}
            {!cur.isOnline && !cur.cityLoading && <div style={S.g3}>{courses.map((c,i) => (<div key={i} className={`ftcc${cur.course?.name===c.name?" s":""}`} onClick={()=>setCur(p=>({...p,course:c}))}><strong>{c.name}</strong><br/><small>{c.hours} saat/h</small></div>))}</div>}
          </div>}

          {step === 3 && <div style={{ animation: "fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>{`Konaklama Seçin – ${cur.brand} ${cur.city}`}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {accs.map((a, i) => {
                const sel = cur.acc?.name === a.name && cur.acc?.room === a.room && cur.acc?.board === a.board;
                return (
                  <div key={i} className={`ftac${sel ? " s" : ""}`} onClick={() => setCur(p => ({ ...p, acc: a }))}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{a.room} · {a.board}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{a.currency} {a.price}/h</div>
                  </div>
                );
              })}
            </div>
          </div>}

          {step === 4 && <div style={{ animation: "fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Teklif Özeti</h2>
            {destinations.map((d, i) => {
              const f = d.isOnline ? { reg: 35, mat: 30, currency: "EUR" } : calcFees(d.cityData?.fees || [], d.weeks);
              const cCost = getPrice(d.course, d.weeks);
              const aCost = d.acc ? d.acc.price * d.weeks : 0;
              const curSym = d.course?.currency || f.currency;
              return (
                <div key={i} style={{ border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "16px 20px", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: ORANGE, marginBottom: 8 }}>{d.brand} {d.city} — {d.weeks} Hafta</div>
                  <div style={{ fontSize: 13, display: "grid", gridTemplateColumns: "1fr auto", gap: 4 }}>
                    <span style={{ color: "#64748b" }}>Kurs: {d.course?.name}</span><span style={{ fontWeight: 600 }}>{fmt(cCost, curSym)}</span>
                    {d.acc && <><span style={{ color: "#64748b" }}>Konaklama: {d.acc.name}</span><span style={{ fontWeight: 600 }}>{fmt(aCost, curSym)}</span></>}
                    <span style={{ color: "#64748b" }}>Kayıt ve Materyal</span><span style={{ fontWeight: 600 }}>{fmt(f.reg + (f.mat||0), curSym)}</span>
                  </div>
                  <div style={{ textAlign: "right", borderTop: "1px solid #f1f5f9", marginTop: 10, paddingTop: 8, fontWeight: 700, fontSize: 15 }}>
                    Toplam: {fmt(cCost + aCost + f.reg + (f.mat||0) + (f.acc_placement||0), curSym)}
                  </div>
                </div>
              );
            })}
          </div>}

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:32 }}>
            {step > 0 ? <button className="ftbb" onClick={()=>setStep(s=>s-1)}>← Geri</button> : <div/>}
            <div style={{ display:"flex", gap:8 }}>
              {step === 3 && !cur.isOnline && <button className="ftob" onClick={addDest}>+ Ekle</button>}
              {step < 4 ? <button className="ftpb" disabled={!canNext} onClick={next}>İleri</button> : <><button className="ftpb" onClick={generatePDF} style={{ background:"#00C1DE" }}>PDF İndir</button><button className="ftpb" onClick={reset} style={{ background:"#64748b" }}>Sıfırla</button></>}
            </div>
          </div>
        </div>

        <div style={S.side}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Sepet</div>
          {destinations.length === 0 && <p style={{ fontSize:12, color:"#94a3b8" }}>Henüz bir seçim yapılmadı.</p>}
          {destinations.map((d, i) => (
            <div key={i} style={{ fontSize:12, paddingBottom:8, borderBottom:\"1px solid #f1f5f9\", marginBottom:8 }}>
              <strong>{d.brand} {d.city}</strong><br/>{d.weeks} hafta · {d.course?.name}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* PDF TEMPLATE */}
    <div id="pdf-export-area" style={{ display: "none", width: "210mm", padding: "20mm", background: "#fff", fontFamily: "Arial" }}>
      {destinations.map((d, i) => {
        const f = d.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
        const cCost = getPrice(d.course, d.weeks);
        const aCost = d.acc ? d.acc.price * d.weeks : 0;
        const total = cCost + aCost + f.reg + (f.mat||0) + (f.acc_placement || 0);
        const curSym = d.course?.currency || f.currency;
        const endD = (s, w) => { if(!s) return ""; const dt = new Date(s); dt.setDate(dt.getDate()+(w*7)); return dt.toLocaleDateString("tr-TR"); };
        return (
          <div key={i} style={{ pageBreakAfter: "always" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>{d.brand} Eğitim Teklifi</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{curSym}</div>
            </div>
            <div style={{ borderTop: "2px solid #000", margin: "4px 0 12px" }}></div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: "bold", padding: "12px 0", width: "25%" }}>Kurs</td>
                  <td style={{ padding: "12px 0" }}>{d.brand} - {d.course?.name} ({d.weeks} Hafta)</td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>{fmt(cCost, "")}</td>
                </tr>
                {d.acc && <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: "bold", padding: "12px 0" }}>Konaklama</td>
                  <td style={{ padding: "12px 0" }}>{d.acc.name} ({d.acc.room})</td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>{fmt(aCost, "")}</td>
                </tr>}
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: "bold", padding: "12px 0" }}>Ek Ücretler</td>
                  <td style={{ padding: "12px 0" }}>Kayıt ve Materyal Ücretleri</td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>{fmt(f.reg + (f.mat||0), "")}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ textAlign: "right", marginTop: "30px", fontSize: "22px", fontWeight: "bold", color: ORANGE }}>Toplam: {fmt(total, curSym)}</div>
          </div>
        );
      })}
    </div>
    </>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { background:\"#fff\", borderBottom:\"1px solid #e2e8f0\", position:\"sticky\", top:0, zIndex:10 },
  htitle: { fontSize:15, fontWeight:600 },
  steps: { background:\"#fff\", borderBottom:\"1px solid #e2e8f0\" },
  body: { maxWidth:1100, margin:\"0 auto\", padding:\"24px\", display:\"grid\", gridTemplateColumns:\"1fr 260px\", gap:20 },
  main: { background:\"#fff\", borderRadius:20, border:\"1.5px solid #e2e8f0\", padding:\"32px\" },
  side: { background:\"#fff\", borderRadius:20, border:\"1.5px solid #e2e8f0\", padding:\"20px\", position:\"sticky\", top:80 },
  ttl: { fontSize:18, fontWeight:700, marginBottom:20 },
  slbl: { fontSize:11, fontWeight:600, color:\"#94a3b8\", textTransform:\"uppercase\", margin:\"16px 0 8px\" },
  r2: { display:\"grid\", gridTemplateColumns:\"1fr 1fr\", gap:16 },
  fld: { display:\"flex\", flexDirection:\"column\", gap:6, marginBottom:16 },
  lbl: { fontSize:12, color:\"#64748b\" },
  g3: { display:\"grid\", gridTemplateColumns:\"repeat(auto-fill,minmax(130px,1fr))\", gap:8 }
};
