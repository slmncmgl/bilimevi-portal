import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";
import { jsPDF } from "jspdf";

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

  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline) return;
    const sheetInfo = nav.schoolSheets?.[cur.brand];
    if (!sheetInfo?.sheetId) return;
    setCur(p => ({ ...p, cityData:null, cityLoading:true }));
    fetchCityData(sheetInfo.sheetId, cur.city)
      .then(data => setCur(p => ({ ...p, cityData:data, cityLoading:false })))
      .catch(err => { console.error("City data yuklenemedi:", err); setCur(p => ({ ...p, cityLoading:false })); });
  }, [cur.city, cur.brand, cur.isOnline]);

  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Özet"];
  const courses = cur.cityData?.courses || [];
  const accs    = cur.cityData?.acc     || [];
  const fees    = cur.cityData?.fees    || [];

  const canNext = [
    !!(student.name && student.gender),
    !!(cur.brand && cur.city) || !!(cur.isOnline && cur.course), // Step 1 check
    !!cur.course, // Step 2 check
    !!cur.acc || cur.isOnline, // Step 3 check (online ise acc gerekmez)
    true,
  ][step];

  function next() {
    if (step === 3 || (step === 2 && cur.isOnline)) { 
      setDestinations(p => [...p, { ...cur }]); 
      setCur(emptyDest(cur.startDate)); 
      setStep(4); 
    }
    else setStep(s => s + 1);
  }

  function addDest() {
    if ((step === 3 && cur.acc) || (step === 2 && cur.isOnline)) setDestinations(p => [...p, { ...cur }]);
    setCur(emptyDest(cur.startDate));
    setStep(1);
  }

  function generatePDF() {
    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const W = 210, H = 297;
    const CYAN = [0, 193, 222];
    const BLACK = [15, 15, 15];
    const GRAY = [100, 116, 139];
    const LGRAY = [210, 220, 230];
    const phone = user.phone || "905419189177";
    const MX = 24;
    
    function tr(s) {
      return (s || "")
        .replace(/ı/g, "i").replace(/İ/g, "I")
        .replace(/ğ/g, "g").replace(/Ğ/g, "G")
        .replace(/ş/g, "s").replace(/Ş/g, "S");
    }

    function trAccType(s) {
      return (s || "").replace(/Homestay/gi, "Aile Yanı Konaklama").replace(/Student Residence/gi, "Ogrenci Yurdu").replace(/Shared Accommodation/gi, "Paylasimli Daire").replace(/Summer Residence/gi, "Yaz Yurdu");
    }

    function trBoard(s) {
      return (s || "").replace(/Half Board/gi, "Yarım Pansiyon").replace(/Full Board/gi, "Tam Pansiyon").replace(/Bed & Breakfast/gi, "Kahvalti Dahil").replace(/Self-Catering/gi, "Kendi Mutfagi");
    }

    function fmtDate(dateStr) {
      if (!dateStr) return "-";
      const months = ["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
      const dt = new Date(dateStr);
      return dt.getDate() + " " + months[dt.getMonth()] + " " + dt.getFullYear();
    }

    function addWeeks(dateStr, weeks) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      d.setDate(d.getDate() + weeks * 7);
      return fmtDate(d.toISOString().slice(0, 10));
    }

    function fmtMoney(n) { return Number(n).toLocaleString("tr-TR") + ",00"; }

    const curSymbol = { "GBP": "£", "EUR": "€", "USD": "$", "CAD": "CA$" };

    destinations.forEach((d, idx) => {
      if (idx > 0) doc.addPage();
      const f = d.isOnline ? {reg:35,acc_placement:0,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
      const cCost = getPrice(d.course, d.weeks);
      const aCost = d.acc ? d.acc.price * d.weeks : 0;
      const fT = f.reg + f.acc_placement + f.mat;
      const tot = cCost + aCost + fT;
      const cur = d.course ? d.course.currency : f.currency;
      const sym = curSymbol[cur] || cur;
      const startTxt = fmtDate(d.startDate);
      const endTxt = addWeeks(d.startDate, d.weeks);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(tr("Bilimevi Eğitim Danışmanınız"), MX, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      doc.text(tr(user.name || "-"), MX, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text("E-posta: " + tr(user.email || ""), W / 2, 13, { align: "center" });
      doc.setTextColor(...CYAN);
      doc.textWithLink(tr("Bana WhatsApp'tan Ulasın →"), W - MX, 11, { align: "right", url: "https://wa.me/" + phone });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...GRAY);
      doc.text(sym, W - MX, 20, { align: "right" });
      doc.setDrawColor(...GRAY);
      doc.setLineWidth(0.25);
      doc.line(MX, 22, W - MX, 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(52);
      doc.setTextColor(...CYAN);
      doc.text(tr(d.city), MX, 60);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...BLACK);
      doc.text(tr(endTxt ? (startTxt + "  —  " + endTxt) : startTxt), MX, 73);

      let y = 86;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      doc.text(tr("Teklifinize neler dahil?"), MX, y);
      doc.setTextColor(...GRAY);
      doc.text(cur, W - MX, y, { align: "right" });

      y += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...CYAN);
      doc.text(tr("Hafta Sayısı: ") + d.weeks, MX, y);

      y += 4;
      doc.setDrawColor(...LGRAY);
      doc.setLineWidth(0.3);
      doc.line(MX, y, W - MX, y);

      const rows = [];
      rows.push({ cat: "Kurs", sub: tr(d.course ? d.course.name : "-"), detail: startTxt && endTxt ? (startTxt + " - " + endTxt) : "", price: cCost });
      if (d.acc && !d.isOnline) {
        rows.push({ cat: tr("Konaklama"), sub: tr(trAccType(d.acc.name)) + " (" + tr(trBoard(d.acc.board)) + ")", detail: startTxt && endTxt ? (startTxt + " - " + endTxt) : "", price: aCost });
      }
      if (f.reg > 0) rows.push({ cat: tr("Diger"), sub: tr("Kayıt Ücreti"), price: f.reg });
      if (f.mat > 0) rows.push({ cat: "", sub: tr("Ders Materyalleri"), price: f.mat });
      if (f.acc_placement > 0) rows.push({ cat: "", sub: tr("Konaklama Yerlestirme"), price: f.acc_placement });

      y += 6;
      rows.forEach((row) => {
        const hasDetail = row.detail && row.detail.trim();
        const rowH = hasDetail ? 14 : 9;
        if (row.cat) { doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BLACK); doc.text(row.cat, MX, y + 4.5); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BLACK); doc.text(row.sub, MX + 36, y + 4.5);
        if (hasDetail) { doc.setFontSize(8); doc.setTextColor(...CYAN); doc.text(row.detail, MX + 36, y + 9); }
        doc.text(fmtMoney(row.price), W - MX, y + 4.5, { align: "right" });
        doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2); doc.line(MX, y + rowH, W - MX, y + rowH);
        y += rowH;
      });

      y += 12;
      doc.setDrawColor(...BLACK); doc.setLineWidth(0.5); doc.line(MX, y - 5, W - MX, y - 5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(sym + "  " + tr("Toplam Tutar ") + cur, MX, y + 4);
      doc.text(cur + " " + fmtMoney(tot), W - MX, y + 4, { align: "right" });

      const btnY = H - 50;
      doc.setFillColor(...CYAN); doc.roundedRect(W / 2 - 42.5, btnY, 85, 11, 5, 5, "F");
      doc.setFontSize(9); doc.setTextColor(255, 255, 255);
      doc.textWithLink(tr("Danışmanınıza WhatsApp'tan Ulasın"), W / 2, btnY + 7.2, { align: "center", url: "https://wa.me/" + phone });
      doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(tr("Geçerlilik tarihi: ") + new Date().toLocaleDateString("tr-TR"), MX, H - 10);
      doc.text("bilimevi.com", W - MX, H - 10, { align: "right" });
    });

    doc.save(tr(student.name || "teklif") + "_" + new Date().toISOString().slice(0, 10) + ".pdf");
  }

  function reset() { setDestinations([]); setCur(emptyDest()); setStudent({ name:"", age:"", gender:"" }); setStep(0); }

  if (!user) return null;

  return (
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
        .ftpb{background:${ORANGE};color:#fff;border:none;padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s}
        .ftpb:disabled{opacity:.4;cursor:not-allowed}
        .ftob{background:transparent;color:${ORANGE};border:1.5px solid ${ORANGE};padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
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
          {/* STEP 0: Öğrenci Bilgileri */}
          {step === 0 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Öğrenci bilgileri</h2>
            <div style={S.r2}>
              <div style={S.fld}><label style={S.lbl}>Öğrenci adı</label><input className="fti" value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))} placeholder="Ad Soyad" /></div>
              <div style={S.fld}><label style={S.lbl}>Yaş</label><input className="fti" type="number" value={student.age} onChange={e=>setStudent(p=>({...p,age:e.target.value}))} /></div>
            </div>
            <div style={S.fld}>
              <label style={S.lbl}>Cinsiyet</label>
              <div style={{ display:"flex", gap:8 }}>{["Erkek","Kadın"].map(g => (<button key={g} className={`ftg${student.gender===g?" s":""}`} onClick={()=>setStudent(p=>({...p,gender:g}))}>{g}</button>))}</div>
            </div>
          </div>}

          {/* STEP 1: Destinasyon veya Online Seçimi */}
          {step === 1 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Eğitim Türü ve Destinasyon</h2>
            <p style={S.slbl}>Dil / Online</p>
            <div style={S.g3}>
              {nav.languages.map(l => (
                <div key={l} className={`ftc${cur.lang===l && !cur.isOnline ?" s":""}`} onClick={()=>setCur(p=>({...emptyDest(p.startDate),lang:l, isOnline:false}))}>{l}</div>
              ))}
              <div className={`ftc${cur.isOnline ? " s" : ""}`} 
                   style={{ borderColor: cur.isOnline ? ORANGE : "#3b82f6", color: cur.isOnline ? ORANGE : "#3b82f6", fontWeight: 600 }}
                   onClick={()=>setCur(p=>({...emptyDest(p.startDate), isOnline:true, brand:"EC", city:"EC Live", lang:"İngilizce"}))}>
                🌐 Online (EC Live)
              </div>
            </div>

            {!cur.isOnline && cur.lang && <>
              <p style={S.slbl}>Ülke</p>
              <div style={S.g3}>
                {(nav.countries[cur.lang]||[]).map(c => (
                  <div key={c} className={`ftc${cur.country===c?" s":""}`} onClick={()=>setCur(p=>({...p,country:c,city:"",brand:"",course:null}))}>{c}</div>
                ))}
              </div>
            </>}

            {!cur.isOnline && cur.country && <>
              <p style={S.slbl}>Şehir</p>
              <div style={S.g3}>
                {(nav.citiesByLang?.[cur.lang]?.[cur.country] || []).map(c => (
                  <div key={c} className={`ftc${cur.city===c?" s":""}`} onClick={()=>setCur(p=>({...p,city:c,brand:nav.brands[c]||"",course:null}))}>{c}</div>
                ))}
              </div>
            </>}

            {cur.isOnline && (
              <div style={{ marginTop: 24, animation: "fadeUp .3s" }}>
                <p style={S.slbl}>Online Paket Seçin</p>
                <div style={{ display: "grid", gap: 10 }}>
                  {EC_LIVE.map((c, i) => (
                    <div key={i} className={`ftac${cur.course?.name === c.name ? " s" : ""}`} onClick={() => setCur(p => ({ ...p, course: c }))}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{c.hours} saat/h</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{c.currency} {c.tiers[0].price}/h</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>}

          {/* STEP 2: Kurs Tarih ve Süre (veya Online Süre) */}
          {step === 2 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>{cur.isOnline ? "Online Eğitim Detayı" : "Kurs Detayı - " + cur.city}</h2>
            <div style={S.r2}>
              <div style={S.fld}><label style={S.lbl}>Başlangıç tarihi</label><input className="fti" type="date" value={cur.startDate} onChange={e=>setCur(p=>({...p,startDate:e.target.value}))} /></div>
              <div style={S.fld}><label style={S.lbl}>Süre (hafta)</label><input className="fti" type="number" value={cur.weeks} onChange={e=>setCur(p=>({...p,weeks:parseInt(e.target.value)||1}))} /></div>
            </div>
            
            {!cur.isOnline && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
                {courses.map((c,i) => {
                  const tier = c.tiers.find(t=>cur.weeks>=t.min&&(t.max===null||cur.weeks<=t.max));
                  const sel = cur.course?.name===c.name;
                  return (
                    <div key={i} className={`ftcc${sel?" s":""}`} onClick={()=>setCur(p=>({...p,course:c}))}>
                      <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{c.name}</div>
                      <div style={{ fontSize:12, color:"#94a3b8" }}>{c.lessons} ders/h</div>
                      <div style={{ fontSize:14, fontWeight:700, marginTop:10 }}>{c.currency} {tier?.price || 0}/h</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>}

          {/* STEP 3: Konaklama (Online ise atlanır) */}
          {step === 3 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Konaklama Seçin</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {accs.map((a, i) => (
                <div key={i} className={`ftac${cur.acc?.name === a.name ? " s" : ""}`} onClick={() => setCur(p => ({ ...p, acc: a }))}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{a.room} · {a.board}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{a.currency} {a.price}/h</div>
                </div>
              ))}
            </div>
          </div>}

          {/* STEP 4: Özet */}
          {step === 4 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Teklif Özeti</h2>
            {destinations.map((d, i) => {
              const f = d.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
              const cCost = getPrice(d.course, d.weeks);
              const aCost = d.acc ? d.acc.price * d.weeks : 0;
              return (
                <div key={i} style={{ padding:16, border:"1px solid #e2e8f0", borderRadius:12, marginBottom:10 }}>
                  <div style={{ fontWeight:700, color:ORANGE }}>{d.brand} {d.city} - {d.weeks} Hafta</div>
                  <div style={{ fontSize:13, marginTop:8 }}>
                    <div>Kurs: {d.course?.name} ({fmt(cCost, d.course?.currency)})</div>
                    {d.acc && <div>Konaklama: {d.acc.name} ({fmt(aCost, d.acc.currency)})</div>}
                    <div>Ek Ücretler: {fmt(f.reg + (f.acc_placement||0) + f.mat, f.currency)}</div>
                  </div>
                  <div style={{ textAlign:"right", fontWeight:700, fontSize:16, marginTop:8 }}>Toplam: {fmt(cCost + aCost + f.reg + (f.acc_placement||0) + f.mat, d.course?.currency)}</div>
                </div>
              );
            })}
          </div>}

          {/* Alt Navigasyon */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:32 }}>
            {step > 0 ? <button className="ftbb" onClick={()=>setStep(s=>s-1)}>← Geri</button> : <div/>}
            <div style={{ display:"flex", gap:8 }}>
              {step === 3 && !cur.isOnline && <button className="ftob" onClick={addDest}>+ Destinasyon Ekle</button>}
              {step < 4 ? (
                <button className="ftpb" disabled={!canNext} onClick={next}>İleri →</button>
              ) : (
                <>
                  <button className="ftpb" onClick={generatePDF} style={{ background:"#00C1DE" }}>PDF İndir</button>
                  <button className="ftpb" onClick={reset} style={{ background:"#64748b" }}>Yeni Teklif</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Özeti */}
        <div style={S.side}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Teklif Sepeti</div>
          {destinations.length === 0 && <p style={{ fontSize:12, color:"#94a3b8" }}>Henüz bir seçim yapılmadı.</p>}
          {destinations.map((d, i) => (
            <div key={i} style={{ fontSize:12, paddingBottom:8, borderBottom:"1px solid #f1f5f9", marginBottom:8 }}>
              <strong>{d.city}</strong> - {d.weeks}h<br/>
              <span style={{ color:"#64748b" }}>{d.course?.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:10 },
  htitle: { fontSize:15, fontWeight:600 },
  steps: { background:"#fff", borderBottom:"1px solid #e2e8f0" },
  body: { maxWidth:1100, margin:"0 auto", padding:"24px", display:"grid", gridTemplateColumns:"1fr 260px", gap:20 },
  main: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"32px" },
  side: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"20px", position:"sticky", top:80 },
  ttl: { fontSize:18, fontWeight:700, marginBottom:20 },
  slbl: { fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", margin:"16px 0 8px" },
  r2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  fld: { display:"flex", flexDirection:"column", gap:6, marginBottom:16 },
  lbl: { fontSize:12, color:"#64748b" },
  g3: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 },
};
