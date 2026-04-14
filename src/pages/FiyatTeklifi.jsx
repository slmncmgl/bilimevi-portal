import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";

// --- YARDIMCI FONKSİYONLAR ---
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
  if (!res.ok) throw new Error("Sheet okunamadi");
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
    const { city, school_brand: brand, language: langRaw = "İngilizce", drive_link = "" } = row;
    const countryTRName = countryTR[row.country] || row.country;
    const match = drive_link.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = match ? match[1] : null;
    if (sheetId && brand && !schoolSheets[brand]) schoolSheets[brand] = { sheetId, sheetName: row.sheet_name };
    const langs = langRaw.split(",").map(l => l.trim()).filter(Boolean);
    langs.forEach(l => {
      languages.add(l);
      if (!countries[l]) countries[l] = new Set(); countries[l].add(countryTRName);
      if (!citiesByLang[l]) citiesByLang[l] = {};
      if (!citiesByLang[l][countryTRName]) citiesByLang[l][countryTRName] = new Set();
      citiesByLang[l][countryTRName].add(city);
      if (!brandsByCity[city]) brandsByCity[city] = new Set();
      brandsByCity[city].add(brand);
    });
  });
  const sortedLangs = [...languages].sort((a, b) => {
    if (a === "İngilizce") return -1;
    if (b === "İngilizce") return 1;
    return a.localeCompare(b);
  });
  return { languages: sortedLangs, countries: Object.fromEntries(Object.entries(countries).map(([k,v])=>[k,[...v]])), citiesByLang: Object.fromEntries(Object.entries(citiesByLang).map(([l,cm])=>[l, Object.fromEntries(Object.entries(cm).map(([c,s])=>[c,[...s].sort()]))])), brandsByCity: Object.fromEntries(Object.entries(brandsByCity).map(([c,s])=>[c,[...s]])), schoolSheets };
}

async function fetchCityData(sheetId, city) {
  const cacheKey = `${sheetId}_${city}`;
  if (window._SCHOOL_CACHE && window._SCHOOL_CACHE[cacheKey]) return window._SCHOOL_CACHE[cacheKey];
  try {
    const [courseRows, accRows, feeRows] = await Promise.all([ fetchCSV(sheetId, "courses"), fetchCSV(sheetId, "accommodation"), fetchCSV(sheetId, "fees") ]);
    const courseMap = {};
    courseRows.filter(r => r.city === city).forEach(r => {
      if (!courseMap[r.course_name]) courseMap[r.course_name] = { name:r.course_name, lessons:parseFloat(r.lessons_per_week)||0, hours:parseFloat(r.hours_per_week)||0, currency:r.currency, notes: r.notes || "", tiers:[] };
      courseMap[r.course_name].tiers.push({ min:parseInt(r.weeks_tier_min)||1, max:r.weeks_tier_max?parseInt(r.weeks_tier_max):null, price:parseFloat(r.price_per_week)||0 });
    });
    const acc = accRows.filter(r => r.city === city).map(r => ({ 
        name:r.place_name, 
        type: r.accommodation_type || "Standard",
        room:r.room_type, 
        bathroom: r.bathroom_type || "Shared",
        board:r.board_type, 
        price:parseFloat(r.price_per_week)||0, 
        currency:r.currency, 
        distance: r.distance_to_school || "",
        notes: r.notes || "",
        hsStart: r.high_season_start || "",
        hsEnd: r.high_season_end || "",
        hsPrice: parseFloat(r.high_season_price) || 0
    }));
    const fees = feeRows.filter(r => r.city === city).map(r => ({ name:r.fee_name, amount:parseFloat(r.amount)||0, currency:r.currency, calc_type:r.calculation_type, tier_min:r.tier_min_weeks?parseInt(r.tier_min_weeks):null, tier_max:r.tier_max_weeks?parseInt(r.tier_max_weeks):null }));
    const res = { courses: Object.values(courseMap), acc, fees };
    if (!window._SCHOOL_CACHE) window._SCHOOL_CACHE = {}; window._SCHOOL_CACHE[cacheKey] = res;
    return res;
  } catch (err) { return { courses: [], acc: [], fees: [] }; }
}

function calcFees(fees, weeks) {
  let reg = 0, place = 0, mat = 0, currency = fees?.[0]?.currency || "GBP";
  (fees||[]).forEach(f => {
    const n = (f.name || "").toLowerCase();
    if (n.includes("registration") || n.includes("kayit")) reg += f.amount;
    else if (n.includes("placement")) place += f.amount;
    else if (n.includes("material") || n.includes("materyal")) {
      if ((!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max)) { mat += f.calc_type === "per_week" ? f.amount * weeks : f.amount; }
    }
  });
  return { reg, place, mat, currency };
}

const getPrice = (c, w) => c?.tiers?.find(t => w >= t.min && (t.max === null || w <= t.max))?.price * w || 0;
const fmt = (n, cur) => `${cur || ""} ${Number(n||0).toLocaleString("tr-TR")}`;
const emptyDest = (sd="") => ({ lang:"", country:"", city:"", brand:"", course:null, weeks:4, acc:null, startDate:sd, isOnline:false, cityData:null, cityLoading:false });

const ORANGE = "#f97316";
const BLUE_CYAN = "#00C1DE";

const EC_LIVE = [
  { name:"EC Live Premium (5 gun/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR", notes: "Canlı online dersler, dijital materyaller dahil." },
  { name:"EC Live Standard (2 gun/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR", notes: "Haftada 2 gün yoğunlaştırılmış online eğitim." },
];

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"Selman Çamoğlu", age: "38", gender:"Erkek" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brandsByCity:{}, schoolSheets:{} });

  useEffect(() => {
    const session = getSession(); if (!session) return navigate("/");
    setUser(session); fetchNav().then(setNav);
  }, []);

  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline || cur.cityData) return;
    const sheetId = nav.schoolSheets?.[cur.brand]?.sheetId;
    if (sheetId) {
      setCur(p => ({ ...p, cityLoading:true }));
      fetchCityData(sheetId, cur.city).then(data => setCur(p => ({ ...p, cityData:data, cityLoading:false })));
    }
  }, [cur.city, cur.brand, nav.schoolSheets]);

  const isCourseValid = (course, weeks) => course?.tiers?.some(t => weeks >= t.min && (t.max === null || weeks <= t.max));
  const handleDateChange = (val) => {
    if(!val) return; let d = new Date(val);
    if (d.getDay() !== 1) d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 8 - d.getDay()));
    setCur(p => ({ ...p, startDate: d.toISOString().split('T')[0] }));
  };

  const next = () => {
    if (step === 3 || (step === 2 && cur.isOnline)) {
      if (!destinations.find(d => d.city === cur.city && d.course?.name === cur.course?.name)) {
         setDestinations(prev => [...prev, { ...cur }]);
      }
      setStep(4);
    }
    else setStep(s => s + 1);
  };

  const back = () => setStep(s => s - 1);
  const addNew = () => { setCur(emptyDest(cur.startDate)); setStep(1); };

  const generatePDF = () => {
    const el = document.getElementById("pdf-area"); if(!el) return;
    el.style.display = "block";
    window.html2pdf().set({ margin:10, filename:`Teklif_${student.name}.pdf`, html2canvas:{scale:2, useCORS:true}, jsPDF:{format:'a4'} }).from(el).save().then(() => {
      el.style.display="none"; setDestinations([]); setCur(emptyDest()); setStep(0); if (window._SCHOOL_CACHE) window._SCHOOL_CACHE = {};
    });
  };

  const fFees = cur.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(cur.cityData?.fees, cur.weeks);
  const cCost = getPrice(cur.course, cur.weeks);
  const aCost = cur.acc ? cur.acc.price * cur.weeks : 0;
  const currentTotal = cCost + aCost + fFees.reg + fFees.mat + (fFees.place||0);

  const canNext = [
    !!(student.name && student.gender && student.age),
    (cur.isOnline && cur.course) || (cur.brand && cur.city),
    !!cur.course && isCourseValid(cur.course, cur.weeks) && !cur.cityLoading,
    !!cur.acc || cur.isOnline,
    true
  ][step];

  return (
    <div style={S.root}>
      <header style={S.hdr}>
        <div style={S.cnt}><button onClick={()=>navigate("/dashboard")} style={S.backBtn}>Dashboard</button><span style={S.htitle}>Fiyat Teklifi</span><div style={{width:100}}/></div>
      </header>
      <div style={S.body}>
        <main style={S.main}>
          {step === 0 && <div style={{animation:"fadeUp 0.3s"}}><h2 style={S.ttl}>Öğrenci Bilgileri</h2><div style={S.r2}><div style={S.fld}><label style={S.lbl}>Ad Soyad</label><input style={S.fti} value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))}/></div><div style={S.fld}><label style={S.lbl}>Yaş</label><input style={S.fti} type="number" value={student.age} onChange={e=>setStudent(p=>({...p,age:e.target.value}))}/></div></div><div style={S.fld}><label style={S.lbl}>Cinsiyet</label><div style={{display:"flex", gap:10}}>{["Erkek","Kadın"].map(g=><div key={g} style={student.gender===g?S.ftcSelected:S.ftc} onClick={()=>setStudent(p=>({...p,gender:g}))}>{g}</div>)}</div></div></div>}
          {step === 1 && <div style={{animation:"fadeUp 0.3s"}}><h2 style={S.ttl}>Destinasyon Seçimi</h2><p style={S.slbl}>DİL SEÇİMİ</p><div style={S.g3}>{nav.languages.map(l=><div key={l} style={cur.lang===l && !cur.isOnline?S.ftcSelected:S.ftc} onClick={()=>setCur({...cur, isOnline:false, lang:l, country:"", city:"", brand:"", course:null, acc:null, cityData:null})}>{l}</div>)}<div style={cur.isOnline?S.ftcOnlineSelected:S.ftcOnline} onClick={()=>setCur({...cur, isOnline:true, brand:"EC", city:"Online", lang:"İngilizce", country:"", course:null, acc:null, cityData:null})}>🌐 Online Kurs</div></div>{!cur.isOnline && cur.lang && <><p style={S.slbl}>ÜLKE</p><div style={S.g3}>{(nav.countries[cur.lang]||[]).map(c=><div key={c} style={cur.country===c?S.ftcSelected:S.ftc} onClick={()=>setCur({...cur, country:c, city:"", brand:"", course:null, acc:null, cityData:null})}>{c}</div>)}</div></>}{!cur.isOnline && cur.country && <><p style={S.slbl}>ŞEHİR</p><div style={S.g3}>{(nav.citiesByLang[cur.lang]?.[cur.country]||[]).map(c=><div key={c} style={cur.city===c?S.ftcSelected:S.ftc} onClick={()=>setCur({...cur, city:c, brand:"", course:null, acc:null, cityData:null})}>{c}</div>)}</div></>}{!cur.isOnline && cur.city && <><p style={S.slbl}>OKUL</p><div style={S.g3}>{(nav.brandsByCity[cur.city]||[]).map(b=><div key={b} style={cur.brand===b?S.ftcSelected:S.ftc} onClick={()=>setCur({...cur, brand:b, course:null, acc:null, cityData:null})}>{b}</div>)}</div></>}</div>}
          {step === 2 && <div style={{animation:"fadeUp 0.3s"}}><h2 style={S.ttl}>{cur.isOnline ? "Paket Seçimi" : `Kurs Detayı - ${cur.brand} ${cur.city}`}</h2><div style={S.r2}><div style={S.fld}><label style={S.lbl}>Başlangıç (Pazartesi)</label><input type="date" style={S.fti} min={new Date().toISOString().split('T')[0]} value={cur.startDate} onChange={e=>handleDateChange(e.target.value)}/></div><div style={S.fld}><label style={S.lbl}>Süre (Hafta)</label><input style={S.fti} type="number" value={cur.weeks} onChange={e=>setCur({...cur, weeks:parseInt(e.target.value)||1})}/></div></div><div style={S.g3}>{(cur.isOnline ? EC_LIVE : (cur.cityData?.courses || [])).map((c, idx) => { const valid = isCourseValid(c, cur.weeks); return (<div key={idx} style={cur.course?.name===c.name?S.ftcSelected:(valid?S.ftc:S.ftcDisabled)} onClick={()=>valid && setCur({...cur, course:c})}><strong>{c.name}</strong><br/><small>{c.hours} saat/h</small></div>); })}</div></div>}
          {step === 3 && <div style={{animation:"fadeUp 0.3s"}}><h2 style={S.ttl}>Konaklama - {cur.brand} {cur.city}</h2><div style={{display:"grid", gap:10}}>{(cur.cityData?.acc || []).length > 0 ? (cur.cityData.acc).map((a, idx)=><div key={idx} style={cur.acc?.name===a.name && cur.acc?.room===a.room && cur.acc?.board===a.board?S.ftacSelected:S.ftac} onClick={()=>setCur({...p, acc:a})}><div><strong>{a.name}</strong><br/><small>{a.room} · {a.board} · {a.bathroom} Banyo</small></div><strong>{a.currency} {a.price}/h</strong></div>) : <p>{cur.cityLoading ? "Yükleniyor..." : "Konaklama seçeneği bulunamadı."}</p>}</div></div>}
          
          {step === 4 && <div style={{animation:"fadeUp 0.3s"}}>
            <h2 style={S.ttl}>Teklif Detayları</h2>
            {destinations.map((d,i)=>{
              const f = d.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees, d.weeks);
              const cPrice = getPrice(d.course, d.weeks);
              const aPrice = d.acc ? d.acc.price * d.weeks : 0;
              return (
                <div key={i} style={S.summaryCard}>
                  <div style={{display:"flex", justifyContent:"space-between", borderBottom:"1px solid #eee", paddingBottom:10, marginBottom:10}}>
                    <strong style={{color:ORANGE, fontSize:16}}>{d.brand} - {d.city}</strong>
                    <span style={{fontWeight:700}}>{fmt(cPrice + aPrice + f.reg + f.mat + (f.place||0), d.course?.currency)}</span>
                  </div>
                  <div style={{fontSize:13, lineHeight:"1.6"}}>
                    <div style={{marginBottom:10}}><strong>📚 Kurs:</strong> {d.course?.name} ({d.weeks} Hafta) <br/> <i>{d.course?.notes}</i></div>
                    {d.acc && (
                      <div style={{background:"#f8fafc", padding:10, borderRadius:8, marginBottom:10}}>
                        <strong>🏠 Konaklama:</strong> {d.acc.name} <br/>
                        <span style={{fontSize:12, color:"#64748b"}}>
                            Oda: {d.acc.room} / Banyo: {d.acc.bathroom} / Yemek: {d.acc.board} <br/>
                            Okula Uzaklık: {d.acc.distance} <br/>
                            {d.acc.hsPrice > 0 && <span>Sezon Farkı: {d.acc.currency} {d.acc.hsPrice} ({d.acc.hsStart} - {d.acc.hsEnd})</span>}
                        </span>
                        {d.acc.notes && <div style={{marginTop:5, color:"#0f172a"}}><i>Not: {d.acc.notes}</i></div>}
                      </div>
                    )}
                    <div style={{marginTop:5, paddingTop:5, borderTop:"1px dashed #eee"}}><strong>💰 Ücretler:</strong> Kayıt ({fmt(f.reg, f.currency)}) + Materyal ({fmt(f.mat, f.currency)})</div>
                  </div>
                </div>
              )
            })}
            <button onClick={addNew} style={{marginTop:15, background:"none", border:`1px solid ${ORANGE}`, color:ORANGE, padding:"10px 20px", borderRadius:10, cursor:"pointer", fontWeight:600}}>+ Başka Destinasyon Ekle</button>
          </div>}

          <div style={S.navBox}>
            {step > 0 && <button onClick={back} style={S.btnBack}>← Geri</button>}
            <button style={S.btnNext} disabled={!canNext} onClick={next}>{step === 4 ? "Bitti" : "İleri →"}</button>
          </div>
        </main>

        <aside style={S.side}>
          <h3 style={S.sideTtl}>ÖZET</h3>
          <div style={S.liveBox}>
            <div style={{fontWeight:700, color:ORANGE, marginBottom:5}}>Anlık Seçim:</div>
            {cur.lang && <div>📍 {cur.lang} / {cur.country} / {cur.city}</div>}
            {cur.brand && <div>🏫 {cur.brand}</div>}
            {cur.course && <div>📚 {cur.course.name} ({cur.weeks}h)</div>}
            {cur.acc && (
                <div style={{marginTop:5, borderTop:"1px solid #e2e8f0", paddingTop:5, fontSize:11}}>
                    🏠 <strong>{cur.acc.name}</strong> <br/>
                    {cur.acc.room} / {cur.acc.board} <br/>
                    🚶 {cur.acc.distance}
                </div>
            )}
            {currentTotal > 0 && isCourseValid(cur.course, cur.weeks) && <div style={S.liveTotal}>Anlık: {fmt(currentTotal, cur.course?.currency || "GBP")}</div>}
          </div>
          <p style={{fontWeight:600, fontSize:12, marginBottom:5}}>Eklenenler ({destinations.length})</p>
          {destinations.map((d,i)=><div key={i} style={S.sideItem}>{d.brand} {d.city}</div>)}
          {destinations.length > 0 && step === 4 && <button onClick={generatePDF} style={S.pdfBtn}>PDF İNDİR VE SIFIRLA</button>}
        </aside>
      </div>

      <div id="pdf-area" style={{display:"none", width:"210mm", padding:"20mm", background:"#fff", fontFamily:"Arial"}}>
        {destinations.map((d, i) => {
          const fees = d.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees, d.weeks);
          const sunDate = d.startDate ? new Date(d.startDate) : new Date(); if(d.startDate) sunDate.setDate(sunDate.getDate()-1);
          const totalVal = getPrice(d.course, d.weeks) + (d.acc?d.acc.price*d.weeks:0) + fees.reg + fees.mat + (fees.place||0);

          return (
            <div key={i} style={{pageBreakAfter:"always", borderBottom:"2px solid #eee", paddingBottom:30, marginBottom:30}}>
              <h1 style={{color:BLUE_CYAN, margin:"0 0 10px 0"}}>{d.brand} Eğitim Teklifi</h1>
              <p style={{fontSize:14, color:"#444"}}>Öğrenci: <strong>{student.name}</strong> | Destinasyon: <strong>{d.city}, {d.country}</strong></p>
              
              <table style={{width:"100%", borderCollapse:"collapse", marginTop:20}}>
                <tr style={{background:BLUE_CYAN, color:"#fff"}}><th style={{textAlign:"left", padding:12}}>Hizmet Detayları</th><th style={{textAlign:"right", padding:12}}>Tutar</th></tr>
                <tr>
                    <td style={{padding:12, borderBottom:"1px solid #eee"}}>
                        <strong>Kurs:</strong> {d.course?.name} ({d.weeks} Hafta)<br/>
                        <small style={{color:"#666"}}>{d.course?.notes}</small><br/>
                        <small>Başlangıç: {d.startDate}</small>
                    </td>
                    <td style={{textAlign:"right", padding:12, borderBottom:"1px solid #eee"}}>{fmt(getPrice(d.course, d.weeks), d.course?.currency)}</td>
                </tr>
                {d.acc && <tr>
                    <td style={{padding:12, borderBottom:"1px solid #eee"}}>
                        <strong>Konaklama:</strong> {d.acc.name} ({d.acc.room})<br/>
                        <small style={{color:"#666"}}>Tip: {d.acc.type} / Banyo: {d.acc.bathroom} / Yemek: {d.acc.board}</small><br/>
                        <small style={{color:"#666"}}>Uzaklık: {d.acc.distance}</small><br/>
                        <small>Giriş: {sunDate.toLocaleDateString("tr-TR")}</small>
                        {d.acc.notes && <div style={{marginTop:5, fontSize:11}}><i>* {d.acc.notes}</i></div>}
                        {d.acc.hsPrice > 0 && <div style={{color:ORANGE, fontSize:11}}>* Yüksek Sezon Farkı Uygulanmıştır ({d.acc.hsStart} - {d.acc.hsEnd})</div>}
                    </td>
                    <td style={{textAlign:"right", padding:12, borderBottom:"1px solid #eee"}}>{fmt(d.acc.price*d.weeks, d.acc.currency)}</td>
                </tr>}
                <tr>
                    <td style={{padding:12, borderBottom:"1px solid #eee"}}>
                        <strong>Kayıt & Materyal Ücretleri:</strong><br/>
                        <small style={{color:"#666"}}>Okul kayıt ve zorunlu eğitim materyalleri.</small>
                    </td>
                    <td style={{textAlign:"right", padding:12, borderBottom:"1px solid #eee"}}>{fmt(fees.reg+fees.mat, fees.currency)}</td>
                </tr>
                <tr style={{fontSize:20, fontWeight:"bold"}}><td style={{padding:12, textAlign:"right"}}>TOPLAM:</td><td style={{padding:12, textAlign:"right", color:ORANGE}}>{fmt(totalVal, d.course?.currency)}</td></tr>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora', sans-serif" },
  hdr: { background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:10 },
  cnt: { maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  htitle: { fontSize:15, fontWeight:600, color:"#0f172a" },
  backBtn: { background:"none", border:"1px solid #e2e8f0", padding:"8px 16px", borderRadius:10, cursor:"pointer", fontSize:13 },
  body: { maxWidth:1100, margin:"20px auto", padding:"0 20px", display:"grid", gridTemplateColumns:"1fr 280px", gap:20 },
  main: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"30px" },
  ttl: { fontSize:18, fontWeight:700, marginBottom:20, color:"#0f172a" },
  slbl: { fontSize:11, fontWeight:600, color:"#94a3b8", margin:"15px 0 8px" },
  r2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:15 },
  fld: { display:"flex", flexDirection:"column", gap:6 },
  lbl: { fontSize:12, color:"#64748b" },
  fti: { padding:"10px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none" },
  ftc: { flex:1, padding:12, border:"1.5px solid #e2e8f0", borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13, background:"#fff" },
  ftcSelected: { flex:1, padding:12, border:`1.5px solid ${ORANGE}`, background:"#fff7ed", color:ORANGE, borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13, fontWeight:600 },
  ftcDisabled: { flex:1, padding:12, border:"1.5px solid #e2e8f0", borderRadius:12, textAlign:"center", cursor:"not-allowed", fontSize:13, background:"#f1f5f9", opacity:0.6, color:"#94a3b8" },
  ftcOnline: { padding:12, border:"1.5px solid #3b82f6", color:"#3b82f6", borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13 },
  ftcOnlineSelected: { padding:12, border:`1.5px solid ${ORANGE}`, background:"#fff7ed", color:ORANGE, borderRadius:12, textAlign:"center", cursor:"pointer", fontSize:13, fontWeight:600 },
  ftac: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:14, border:"1.5px solid #e2e8f0", borderRadius:12, cursor:"pointer", fontSize:13 },
  ftacSelected: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:14, border:`1.5px solid ${ORANGE}`, background:"#fff7ed", color:ORANGE, borderRadius:12, cursor:"pointer", fontSize:13 },
  g3: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:10 },
  navBox: { marginTop:40, display:"flex", justifyContent:"flex-end", gap:10 },
  btnBack: { background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:14 },
  btnNext: { background:ORANGE, color:"#fff", border:"none", padding:"12px 30px", borderRadius:10, fontWeight:600, cursor:"pointer" },
  side: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:20, position:"sticky", top:90, height:"fit-content" },
  sideTtl: { fontSize:14, fontWeight:700, borderBottom:"1px solid #eee", paddingBottom:10, marginBottom:15 },
  liveBox: { background:"#f8fafc", padding:12, borderRadius:10, fontSize:12, marginBottom:15 },
  liveTotal: { marginTop:8, fontWeight:700, fontSize:14, color:ORANGE },
  sideItem: { fontSize:12, padding:"6px 0", borderBottom:"1px solid #f1f5f9" },
  summaryCard: { border:"1.5px solid #e2e8f0", borderRadius:12, padding:15, marginBottom:10 },
  pdfBtn: { width:"100%", marginTop:20, padding:12, background:BLUE_CYAN, color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer" }
};
