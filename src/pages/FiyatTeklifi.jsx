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

  // İngilizceyi başa al, Online'ı sona al mantığı
  const sortedLangs = [...languages].sort((a, b) => {
    if (a === "İngilizce") return -1;
    if (b === "İngilizce") return 1;
    return a.localeCompare(b);
  });

  return {
    languages: sortedLangs,
    countries: Object.fromEntries(Object.entries(countries).map(([k,v])=>[k,[...v]])),
    citiesByLang: Object.fromEntries(Object.entries(citiesByLang).map(([l,cm])=>[l, Object.fromEntries(Object.entries(cm).map(([c,s])=>[c,[...s].sort()]))])),
    brandsByCity: Object.fromEntries(Object.entries(brandsByCity).map(([c,s])=>[c,[...s]])),
    schoolSheets,
  };
}

async function fetchCityData(sheetId, city) {
  const [courseRows, accRows, feeRows] = await Promise.all([
    fetchCSV(sheetId, "courses"), fetchCSV(sheetId, "accommodation"), fetchCSV(sheetId, "fees")
  ]);
  const courseMap = {};
  courseRows.filter(r => r.city === city).forEach(r => {
    if (!courseMap[r.course_name]) courseMap[r.course_name] = { name:r.course_name, lessons:parseFloat(r.lessons_per_week)||0, hours:parseFloat(r.hours_per_week)||0, currency:r.currency, tiers:[] };
    courseMap[r.course_name].tiers.push({ min:parseInt(r.weeks_tier_min)||1, max:r.weeks_tier_max?parseInt(r.weeks_tier_max):null, price:parseFloat(r.price_per_week)||0 });
  });
  const acc = accRows.filter(r => r.city === city).map(r => ({ name:r.place_name, room:r.room_type, board:r.board_type, price:parseFloat(r.price_per_week)||0, currency:r.currency }));
  const fees = feeRows.filter(r => r.city === city).map(r => ({ name:r.fee_name, amount:parseFloat(r.amount)||0, currency:r.currency, calc_type:r.calculation_type, tier_min:r.tier_min_weeks?parseInt(r.tier_min_weeks):null, tier_max:r.tier_max_weeks?parseInt(r.tier_max_weeks):null }));
  return { courses: Object.values(courseMap), acc, fees };
}

function calcFees(fees, weeks) {
  let reg = 0, place = 0, mat = 0, currency = fees?.[0]?.currency || "GBP";
  (fees||[]).forEach(f => {
    const n = f.name.toLowerCase();
    if (n.includes("registration") || n.includes("kayit")) reg += f.amount;
    else if (n.includes("placement")) place += f.amount;
    else if (n.includes("material") || n.includes("materyal")) {
      if ((!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max)) {
        mat += f.calc_type === "per_week" ? f.amount * weeks : f.amount;
      }
    }
  });
  return { reg, place, mat, currency };
}

const getPrice = (c, w) => c?.tiers?.find(t => w >= t.min && (t.max === null || w <= t.max))?.price * w || 0;
const fmt = (n, cur) => `${cur} ${Number(n||0).toLocaleString("tr-TR")}`;
const emptyDest = (sd="") => ({ lang:"", country:"", city:"", brand:"", course:null, weeks:4, acc:null, startDate:sd, isOnline:false, cityData:null, cityLoading:false });

const ORANGE = "#f97316";
const BLUE_CYAN = "#00C1DE";

const EC_LIVE = [
  { name:"EC Live Premium (5 gun/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR" },
  { name:"EC Live Standard (2 gun/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR" },
];

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"Selman Çamoğlu", gender:"Erkek" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brandsByCity:{}, schoolSheets:{} });

  useEffect(() => {
    const session = getSession();
    if (!session) return navigate("/");
    setUser(session);
    fetchNav().then(setNav);
  }, []);

  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline) return;
    const sheetId = nav.schoolSheets?.[cur.brand]?.sheetId;
    if (sheetId) {
      setCur(p => ({ ...p, cityLoading:true }));
      fetchCityData(sheetId, cur.city).then(data => setCur(p => ({ ...p, cityData:data, cityLoading:false })));
    }
  }, [cur.city, cur.brand]);

  const canNext = [
    !!(student.name && student.gender),
    (cur.isOnline && cur.course) || (cur.brand && cur.city),
    !!cur.course && !cur.cityLoading,
    !!cur.acc || cur.isOnline,
    true
  ][step];

  const handleDateChange = (val) => {
    let d = new Date(val);
    if (d.getDay() !== 1) {
      const diff = (d.getDay() === 0 ? 1 : 8 - d.getDay());
      d.setDate(d.getDate() + diff);
    }
    setCur(p => ({ ...p, startDate: d.toISOString().split('T')[0] }));
  };

  const next = () => {
    if (step === 3 || (step === 2 && cur.isOnline)) { setDestinations(p => [...p, { ...cur }]); setCur(emptyDest(cur.startDate)); setStep(4); }
    else setStep(s => s + 1);
  };

  const reset = () => { setDestinations([]); setCur(emptyDest()); setStep(0); };

  const generatePDF = () => {
    const el = document.getElementById("pdf-area");
    el.style.display = "block";
    window.html2pdf().set({ margin:10, filename:`${student.name}.pdf`, html2canvas:{scale:2}, jsPDF:{format:'a4'} }).from(el).save().then(()=>el.style.display="none");
  };

  // Anlık Fiyat Hesaplayıcı (Sidebar için)
  const f = cur.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(cur.cityData?.fees, cur.weeks);
  const cCost = getPrice(cur.course, cur.weeks);
  const aCost = cur.acc ? cur.acc.price * cur.weeks : 0;
  const currentTotal = cCost + aCost + f.reg + f.mat + (f.place||0);

  return (
    <div style={S.root}>
      <style>{`
        .ftc{padding:12px; border:1.5px solid #e2e8f0; border-radius:12px; cursor:pointer; text-align:center; transition:0.2s; background:#fff;}
        .ftc.s{border-color:${ORANGE}; background:#fff7ed; color:${ORANGE}; font-weight:600;}
        .fti{width:100%; padding:10px; border:1.5px solid #e2e8f0; border-radius:10px; outline:none;}
        .ftpb{background:${ORANGE}; color:#fff; border:none; padding:12px 24px; border-radius:10px; cursor:pointer; font-weight:600;}
        .ftpb:disabled{opacity:0.4; cursor:not-allowed;}
      `}</style>

      <header style={S.hdr}>
        <div style={S.cnt}>
          <button onClick={()=>navigate("/dashboard")} style={{background:"none", border:"1px solid #e2e8f0", padding:"8px 15px", borderRadius:8, cursor:"pointer"}}>Geri</button>
          <span style={{fontWeight:600}}>Fiyat Teklifi Oluştur</span>
          <div style={{width:60}}/>
        </div>
      </header>

      <div style={S.body}>
        <main style={S.main}>
          {step === 0 && <div>
            <h2 style={S.ttl}>Öğrenci Bilgileri</h2>
            <div style={{marginBottom:15}}><label style={S.lbl}>Ad Soyad</label><input className="fti" value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))}/></div>
            <div style={{display:"flex", gap:10}}>{["Erkek","Kadın"].map(g=><div key={g} className={`ftc ${student.gender===g?"s":""}`} style={{flex:1}} onClick={()=>setStudent(p=>({...p,gender:g}))}>{g}</div>)}</div>
          </div>}

          {step === 1 && <div>
            <h2 style={S.ttl}>Destinasyon</h2>
            <p style={S.lbl}>Dil</p>
            <div style={S.g3}>
              {nav.languages.map(l=><div key={l} className={`ftc ${cur.lang===l && !cur.isOnline?"s":""}`} onClick={()=>setCur({...emptyDest(cur.startDate), lang:l})}>{l}</div>)}
              <div className={`ftc ${cur.isOnline?"s":""}`} style={{borderColor:"#3b82f6", color:"#3b82f6"}} onClick={()=>setCur({...emptyDest(cur.startDate), isOnline:true, brand:"EC", city:"Online", lang:"İngilizce"})}>🌐 Online Kurs</div>
            </div>
            {!cur.isOnline && cur.lang && <><p style={S.lbl}>Ülke</p><div style={S.g3}>{(nav.countries[cur.lang]||[]).map(c=><div key={c} className={`ftc ${cur.country===c?"s":""}`} onClick={()=>setCur({...p, country:c, city:"", brand:""})}>{c}</div>)}</div></>}
            {!cur.isOnline && cur.country && <><p style={S.lbl}>Şehir</p><div style={S.g3}>{(nav.citiesByLang[cur.lang]?.[cur.country]||[]).map(c=><div key={c} className={`ftc ${cur.city===c?"s":""}`} onClick={()=>setCur({...p, city:c, brand:""})}>{c}</div>)}</div></>}
            {!cur.isOnline && cur.city && <><p style={S.lbl}>Okul</p><div style={S.g3}>{(nav.brandsByCity[cur.city]||[]).map(b=><div key={b} className={`ftc ${cur.brand===b?"s":""}`} onClick={()=>setCur({...p, brand:b})}>{b}</div>)}</div></>}
            {cur.isOnline && <div style={{marginTop:20}}><p style={S.lbl}>Paket</p><div style={{display:"grid", gap:10}}>{EC_LIVE.map(c=><div key={c.name} className={`ftc ${cur.course?.name===c.name?"s":""}`} onClick={()=>setCur({...p, course:c})}>{c.name}</div>)}</div></div>}
          </div>}

          {step === 2 && <div>
            <h2 style={S.ttl}>Kurs Detayları</h2>
            <div style={{display:"flex", gap:15, marginBottom:20}}>
              <div style={{flex:1}}><label style={S.lbl}>Başlangıç (Pazartesi)</label><input type="date" className="fti" min={new Date().toISOString().split('T')[0]} value={cur.startDate} onChange={e=>handleDateChange(e.target.value)}/></div>
              <div style={{flex:1}}><label style={S.lbl}>Hafta</label><input type="number" className="fti" value={cur.weeks} onChange={e=>setCur({...p, weeks:parseInt(e.target.value)||1})}/></div>
            </div>
            {!cur.isOnline && <div style={S.g3}>{courses.map(c=><div key={c.name} className={`ftc ${cur.course?.name===c.name?"s":""}`} onClick={()=>setCur({...p, course:c})}>{c.name}</div>)}</div>}
          </div>}

          {step === 3 && <div>
            <h2 style={S.ttl}>Konaklama</h2>
            <div style={{display:"grid", gap:10}}>{accs.map(a=><div key={a.name+a.room} className={`ftc ${cur.acc?.name===a.name && cur.acc?.room===a.room?"s":""}`} onClick={()=>setCur({...p, acc:a})}>{a.name} - {a.room}</div>)}</div>
          </div>}

          {step === 4 && <div><h2 style={S.ttl}>Teklif Hazır</h2><p>Tüm destinasyonlar eklendi. PDF olarak indirebilirsiniz.</p></div>}

          <div style={{marginTop:30, display:"flex", justifyContent:"space-between"}}>
            {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{background:"none", border:"none", cursor:"pointer", color:"#64748b"}}>← Geri</button>}
            <button className="ftpb" disabled={!canNext} onClick={next}>{step === 4 ? "Bitti" : "İleri →"}</button>
          </div>
        </main>

        <aside style={S.side}>
          <h3 style={{fontSize:14, marginBottom:15, borderBottom:"1px solid #eee", paddingBottom:10}}>ÖZET</h3>
          {/* Anlık Seçim Göstergesi */}
          <div style={{fontSize:12, color:"#1e293b", background:"#f1f5f9", padding:10, borderRadius:8, marginBottom:15}}>
            <div style={{fontWeight:700, color:ORANGE, marginBottom:5}}>Şu anki seçim:</div>
            {cur.lang && <div>📍 {cur.lang} {cur.city && `/ ${cur.city}`}</div>}
            {cur.brand && <div>🏫 {cur.brand}</div>}
            {cur.course && <div>📚 {cur.course.name} ({cur.weeks} hafta)</div>}
            {cur.acc && <div>🏠 {cur.acc.name}</div>}
            {currentTotal > 0 && <div style={{marginTop:8, fontWeight:700, fontSize:14, color:ORANGE}}>Anlık: {fmt(currentTotal, cur.course?.currency || "GBP")}</div>}
          </div>

          <div style={{fontSize:12}}>
            <p style={{fontWeight:600, marginBottom:8}}>Eklenenler ({destinations.length})</p>
            {destinations.map((d,i)=><div key={i} style={{padding:8, borderBottom:"1px solid #eee"}}>{d.brand} {d.city} - {d.weeks}h</div>)}
          </div>
          {destinations.length > 0 && step === 4 && <button onClick={generatePDF} style={{width:"100%", marginTop:20, padding:10, background:BLUE_CYAN, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700}}>PDF İNDİR</button>}
        </aside>
      </div>

      {/* PDF ŞABLONU (GİZLİ) */}
      <div id="pdf-area" style={{display:"none", width:"210mm", padding:"20mm", background:"#fff", fontFamily:"Arial"}}>
        {destinations.map((d, i) => {
          const f = d.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees, d.weeks);
          const cCost = getPrice(d.course, d.weeks);
          const aCost = d.acc ? d.acc.price * d.weeks : 0;
          const curSym = d.course?.currency || f.currency;
          
          // Pazar günü girişi için tarih hesabı
          const courseDate = new Date(d.startDate);
          const sunDate = new Date(courseDate);
          sunDate.setDate(courseDate.getDate() - 1);

          return (
            <div key={i} style={{pageBreakAfter:"always"}}>
              <h1 style={{color:BLUE_CYAN}}>{d.brand} - {d.city}</h1>
              <p>Öğrenci: {student.name}</p>
              <table style={{width:"100%", borderCollapse:"collapse", marginTop:20}}>
                <tr style={{borderBottom:"2px solid #333"}}>
                  <th style={{textAlign:"left", padding:10}}>Hizmet</th>
                  <th style={{textAlign:"right", padding:10}}>Tutar</th>
                </tr>
                <tr>
                  <td style={{padding:10}}>Kurs: {d.course.name} ({d.weeks} Hafta)<br/><small>Başlangıç: {d.startDate}</small></td>
                  <td style={{textAlign:"right", padding:10}}>{fmt(cCost, curSym)}</td>
                </tr>
                {d.acc && <tr>
                  <td style={{padding:10}}>Konaklama: {d.acc.name} ({d.acc.room})<br/><small>Giriş (Pazar): {sunDate.toLocaleDateString("tr-TR")}</small></td>
                  <td style={{textAlign:"right", padding:10}}>{fmt(aCost, curSym)}</td>
                </tr>}
                <tr>
                  <td style={{padding:10}}>Kayıt ve Materyal Ücretleri</td>
                  <td style={{textAlign:"right", padding:10}}>{fmt(f.reg + f.mat, curSym)}</td>
                </tr>
                <tr style={{borderTop:"2px solid #333", fontWeight:"bold", fontSize:18}}>
                  <td style={{padding:10}}>TOPLAM</td>
                  <td style={{textAlign:"right", padding:10}}>{fmt(cCost + aCost + f.reg + f.mat + (f.place||0), curSym)}</td>
                </tr>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:10 },
  cnt: { maxWidth:1100, margin:"0 auto", padding:"15px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  body: { maxWidth:1100, margin:"20px auto", padding:"0 20px", display:"grid", gridTemplateColumns:"1fr 280px", gap:20 },
  main: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"30px" },
  side: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"20px", position:"sticky", top:90, height:"fit-content" },
  ttl: { fontSize:18, fontWeight:700, marginBottom:20 },
  lbl: { fontSize:12, color:"#64748b", marginBottom:8, display:"block", fontWeight:600 },
  g3: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, marginBottom:20 }
};
