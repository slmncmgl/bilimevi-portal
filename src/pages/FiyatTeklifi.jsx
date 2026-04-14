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
    let inQ = false, cur = "";
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
  const languages = new Set(), countries = {}, citiesByLang = {}, brands = {}, schoolSheets = {};

  rows.forEach(row => {
    if (row.parse_status !== "approved") return;
    const { city, country, school_brand: brand, language: langRaw = "İngilizce", drive_link = "" } = row;
    const countryTRName = countryTR[country] || country;
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
    });
    brands[city] = brand;
  });

  return {
    languages: [...languages].sort(),
    countries: Object.fromEntries(Object.entries(countries).map(([k,v])=>[k,[...v]])),
    citiesByLang: Object.fromEntries(Object.entries(citiesByLang).map(([l,cm])=>[l, Object.fromEntries(Object.entries(cm).map(([c,s])=>[c,[...s].sort()]))])),
    brands, schoolSheets
  };
}

async function fetchCityData(sheetId, city) {
  const [courseRows, accRows, feeRows, transferRows] = await Promise.all([
    fetchCSV(sheetId, "courses"), fetchCSV(sheetId, "accommodation"), fetchCSV(sheetId, "fees"), fetchCSV(sheetId, "transfers")
  ]);

  const courseMap = {};
  courseRows.filter(r => r.city === city).forEach(r => {
    if (!courseMap[r.course_name]) courseMap[r.course_name] = { name: r.course_name, hours: r.hours_per_week, currency: r.currency, tiers: [] };
    courseMap[r.course_name].tiers.push({ min: parseInt(r.weeks_tier_min)||1, max: r.weeks_tier_max ? parseInt(r.weeks_tier_max) : null, price: parseFloat(r.price_per_week)||0 });
  });

  return {
    courses: Object.values(courseMap),
    acc: accRows.filter(r => r.city === city).map(r => ({ name: r.place_name, room: r.room_type, board: r.board_type, price: parseFloat(r.price_per_week)||0, currency: r.currency })),
    fees: feeRows.filter(r => r.city === city).map(r => ({ name: r.fee_name, amount: parseFloat(r.amount)||0, currency: r.currency, calc_type: r.calculation_type, tier_min: r.tier_min_weeks ? parseInt(r.tier_min_weeks) : null, tier_max: r.tier_max_weeks ? parseInt(r.tier_max_weeks) : null })),
  };
}

function calcFees(fees, weeks) {
  let reg = 0, mat = 0, place = 0, currency = fees[0]?.currency || "GBP";
  fees.forEach(f => {
    const n = f.name.toLowerCase();
    if (n.includes("registration") || n.includes("kayit")) reg += f.amount;
    else if (n.includes("placement")) place += f.amount;
    else if (n.includes("material") || n.includes("materyal")) {
        if ((!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max)) {
            mat += f.calc_type === "per_week" ? f.amount * weeks : f.amount;
        }
    }
  });
  return { reg, mat, place, currency };
}

const getPrice = (c, w) => c?.tiers.find(t => w >= t.min && (t.max === null || w <= t.max))?.price * w || 0;
const fmt = (n, cur) => `${cur} ${Number(n).toLocaleString("tr-TR")}`;
const emptyDest = (sd="") => ({ lang:"", country:"", city:"", brand:"", course:null, weeks:4, acc:null, startDate:sd, isOnline:false, cityData:null });

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const BLUE_LIGHT = "#4fb0e8";

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
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brands:{}, schoolSheets:{} });
  const [navLoading, setNavLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) return navigate("/");
    setUser(session);
    fetchNav().then(data => { setNav(data); setNavLoading(false); });
  }, []);

  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline) return;
    const sheetId = nav.schoolSheets?.[cur.brand]?.sheetId;
    if (sheetId) fetchCityData(sheetId, cur.city).then(data => setCur(p => ({ ...p, cityData:data })));
  }, [cur.city, cur.brand]);

  const next = () => {
    if (step === 3 || (step === 2 && cur.isOnline)) { setDestinations(p => [...p, cur]); setStep(4); }
    else setStep(s => s + 1);
  };

  const generatePDF = () => {
    const element = document.getElementById("pdf-export-area");
    if (!window.html2pdf) return alert("Kütüphane yükleniyor, lütfen bekleyin...");
    window.html2pdf().set({
        margin: 10,
        filename: `${student.name}_teklif.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
  };

  const getEndDate = (start, weeks) => {
    if(!start) return "";
    const d = new Date(start);
    d.setDate(d.getDate() + (weeks * 7));
    return d.toLocaleDateString("tr-TR", { day:'numeric', month:'long', year:'numeric' });
  };

  if (!user) return null;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .fti{width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;outline:none}
        .ftc{padding:12px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;text-align:center;background:#fff}
        .ftc.s{border-color:${ORANGE};background:${ORANGE_LIGHT};color:${ORANGE};font-weight:600}
        .ftcc{padding:16px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff}
        .ftcc.s{border-color:${ORANGE};background:${ORANGE_LIGHT}}
        .ftpb{background:${ORANGE};color:#fff;border:none;padding:10px 28px;border-radius:10px;cursor:pointer;font-weight:600}
        .ftbb{border:1px solid #e2e8f0;padding:8px 16px;border-radius:10px;cursor:pointer;background:none}
        /* PDF Template Styles */
        #pdf-export-area { font-family: 'Helvetica', Arial, sans-serif; color: #000; background: #fff; width: 210mm; padding: 20mm; }
        .pdf-row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 12px 0; }
        .pdf-cat { font-weight: bold; width: 25%; font-size: 13px; }
        .pdf-desc { width: 55%; font-size: 13px; }
        .pdf-price { width: 20%; text-align: right; font-weight: bold; font-size: 13px; }
      `}</style>

      {/* HEADER & STEPS */}
      <header style={S.hdr}><div style={S.cnt}><button className="ftbb" onClick={() => navigate("/dashboard")}>Geri</button><span style={S.htitle}>Fiyat Teklifi</span><div/></div></header>

      <div style={S.body}>
        <div style={S.main}>
          {step === 0 && <div>
            <h2 style={S.ttl}>Öğrenci Bilgileri</h2>
            <div style={S.fld}><label style={S.lbl}>Öğrenci Adı</label><input className="fti" value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))}/></div>
            <div style={S.fld}><label style={S.lbl}>Cinsiyet</label><div style={{display:"flex",gap:8}}>{["Erkek","Kadın"].map(g=>(<button key={g} className={`ftc${student.gender===g?" s":""}`} style={{flex:1}} onClick={()=>setStudent(p=>({...p,gender:g}))}>{g}</button>))}</div></div>
          </div>}

          {step === 1 && <div>
            <h2 style={S.ttl}>Destinasyon Seçimi</h2>
            <div style={S.g3}>
                {nav.languages.map(l=>(<div key={l} className={`ftc${cur.lang===l?" s":""}`} onClick={()=>setCur(p=>({...emptyDest(),lang:l}))}>{l}</div>))}
                <div className={`ftc${cur.isOnline?" s":""}`} onClick={()=>setCur(p=>({...emptyDest(),isOnline:true,brand:"EC",city:"Online"}))}>🌐 Online</div>
            </div>
            {!cur.isOnline && cur.lang && <div style={{marginTop:20}}><p style={S.lbl}>Şehir</p><div style={S.g3}>{(nav.citiesByLang[cur.lang]?.["İngiltere"]||[]).map(c=>(<div key={c} className={`ftc${cur.city===c?" s":""}`} onClick={()=>setCur(p=>({...p,city:c,brand:nav.brands[c]}))}>{c}</div>))}</div></div>}
          </div>}

          {step === 2 && <div>
            <h2 style={S.ttl}>Kurs Detayları</h2>
            <div style={{display:"flex",gap:16,marginBottom:20}}><div style={{flex:1}}><label style={S.lbl}>Başlangıç</label><input type="date" className="fti" value={cur.startDate} onChange={e=>setCur(p=>({...p,startDate:e.target.value}))}/></div><div style={{flex:1}}><label style={S.lbl}>Hafta</label><input type="number" className="fti" value={cur.weeks} onChange={e=>setCur(p=>({...p,weeks:parseInt(e.target.value)||1}))}/></div></div>
            <div style={S.g3}>{(cur.isOnline?EC_LIVE:cur.cityData?.courses||[]).map((c,i)=>(<div key={i} className={`ftcc${cur.course?.name===c.name?" s":""}`} onClick={()=>setCur(p=>({...p,course:c}))}><strong>{c.name}</strong><br/><small>{c.hours} saat/h</small></div>))}</div>
          </div>}

          {step === 3 && <div>
            <h2 style={S.ttl}>Konaklama</h2>
            <div style={{display:"grid",gap:10}}>{(cur.cityData?.acc||[]).map((a,i)=>(<div key={i} className={`ftcc${cur.acc?.name===a.name?" s":""}`} onClick={()=>setCur(p=>({...p,acc:a}))}><strong>{a.name}</strong><br/><small>{a.board} · {fmt(a.price,a.currency)}</small></div>))}</div>
          </div>}

          {step === 4 && <div><h2 style={S.ttl}>Özet</h2><p>Teklif hazırlandı, PDF indirebilirsiniz.</p></div>}

          <div style={{marginTop:30, display:"flex", justifyContent:"space-between"}}>
            {step > 0 && <button className="ftbb" onClick={()=>setStep(s=>s-1)}>Geri</button>}
            {step < 4 ? <button className="ftpb" onClick={next}>İleri</button> : <button className="ftpb" onClick={generatePDF} style={{background:"#00C1DE"}}>PDF İndir</button>}
          </div>
        </div>
      </div>

      {/* --- GİZLİ PDF İHRACAT ALANI (SADECE PDF İÇİN) --- */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div id="pdf-export-area">
          {destinations.map((d, i) => {
            const f = d.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
            const cCost = getPrice(d.course, d.weeks);
            const aCost = d.acc ? d.acc.price * d.weeks : 0;
            const total = cCost + aCost + f.reg + f.mat + (f.place||0);
            const curSym = d.course?.currency || f.currency;
            
            return (
              <div key={i} style={{ pageBreakAfter: "always" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>Teklifinize neler dahil?</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{curSym}</div>
                </div>
                <div style={{ borderTop: "2px solid #000", margin: "4px 0 12px" }}></div>
                
                <div style={{ color: BLUE_LIGHT, fontWeight: "bold", fontSize: "17px", marginBottom: "15px" }}>Hafta sayısı: {d.weeks}</div>

                <div className="pdf-row">
                  <div className="pdf-cat">Kurs</div>
                  <div className="pdf-desc">{d.course?.name}<br/><span style={{color:"#777", fontSize:"11px"}}>{new Date(d.startDate).toLocaleDateString("tr-TR")} – {getEndDate(d.startDate, d.weeks)}</span></div>
                  <div className="pdf-price">{fmt(cCost, "")}</div>
                </div>

                {d.acc && <div className="pdf-row">
                  <div className="pdf-cat">Konaklama</div>
                  <div className="pdf-desc">{d.acc.name} ({d.acc.board})<br/><span style={{color:"#777", fontSize:"11px"}}>{new Date(d.startDate).toLocaleDateString("tr-TR")} – {getEndDate(d.startDate, d.weeks)}</span></div>
                  <div className="pdf-price">{fmt(aCost, "")}</div>
                </div>}

                <div className="pdf-row">
                  <div className="pdf-cat">Diğer</div>
                  <div className="pdf-desc">Kayıt Ücreti ve Materyal Bedeli</div>
                  <div className="pdf-price">{fmt(f.reg + f.mat, "")}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", borderTop: "3px solid #000", paddingTop: "15px" }}>
                  <div style={{ fontSize: "22px", fontWeight: "bold" }}>Toplam Tutar {curSym}</div>
                  <div style={{ fontSize: "22px", fontWeight: "bold" }}>{fmt(total, curSym)}</div>
                </div>

                <div style={{ marginTop: "50px", textAlign: "right" }}>
                  <div style={{ background: BLUE_LIGHT, color: "#fff", padding: "12px 25px", borderRadius: "30px", display: "inline-block", fontWeight: "bold", fontSize: "14px" }}>Şimdi rezervasyon yapın</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"15px 0" },
  cnt: { maxWidth:1100, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 20px" },
  htitle: { fontWeight:600 },
  body: { maxWidth:1100, margin:"20px auto", padding:"0 20px" },
  main: { background:"#fff", borderRadius:20, padding:30, border:"1px solid #e2e8f0" },
  ttl: { fontSize:18, marginBottom:20 },
  fld: { marginBottom:15 },
  lbl: { fontSize:12, color:"#64748b", marginBottom:5, display:"block" },
  g3: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }
};
