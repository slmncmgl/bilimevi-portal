import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_BORDER = "#fed7aa";

const DB = {
  languages: ["İngilizce", "Fransızca"],
  countries: {
    "İngilizce": ["İngiltere","İrlanda","Malta","Güney Afrika","Kanada","ABD","BAE"],
    "Fransızca": ["Kanada"],
  },
  cities: {
    "İngiltere": ["London","Brighton","Cambridge","Manchester","Bristol"],
    "İrlanda":   ["Dublin","Dublin 30+"],
    "Malta":     ["Malta"],
    "Güney Afrika": ["Cape Town"],
    "Kanada":    ["Montreal","Toronto","Vancouver"],
    "ABD":       ["Boston","New York","San Francisco","Los Angeles"],
    "BAE":       ["Dubai"],
  },
  brands: {
    "London":"EC","Brighton":"EC","Cambridge":"EC","Manchester":"EC","Bristol":"EC",
    "Dublin":"EC","Dublin 30+":"EC","Malta":"EC","Cape Town":"EC",
    "Montreal":"EC","Toronto":"EC","Vancouver":"EC",
    "Boston":"EC","New York":"EC","San Francisco":"EC","Los Angeles":"EC","Dubai":"EC",
  },
  courses: {
    "EC-London": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:405},{min:12,max:23,price:365},{min:24,max:null,price:330}], currency:"GBP", hs_supp:20, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495},{min:12,max:23,price:450},{min:24,max:null,price:390}], currency:"GBP", hs_supp:20, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495},{min:12,max:23,price:450}], currency:"GBP", hs_supp:20, max_weeks:12, morning:true },
      { name:"English in the City", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495}], currency:"GBP", max_weeks:4, morning:true },
      { name:"Writing with AI", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495}], currency:"GBP", max_weeks:4, morning:true },
      { name:"Exam Prep IELTS", lessons:20, hours:15, tiers:[{min:1,max:11,price:405},{min:12,max:23,price:365}], currency:"GBP", hs_supp:20, morning:false },
    ],
    "EC-Dublin": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:380},{min:12,max:23,price:365},{min:24,max:null,price:280}], currency:"EUR", hs_supp:25, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:445},{min:12,max:23,price:420},{min:24,max:null,price:325}], currency:"EUR", hs_supp:25, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:445},{min:12,max:23,price:420}], currency:"EUR", hs_supp:25, max_weeks:12, morning:true },
      { name:"Exam Prep IELTS", lessons:20, hours:15, tiers:[{min:1,max:11,price:380},{min:12,max:23,price:365}], currency:"EUR", hs_supp:25, max_weeks:12, morning:false },
    ],
    "EC-Brighton": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:385},{min:12,max:23,price:340},{min:24,max:null,price:290}], currency:"GBP", hs_supp:20, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:485},{min:12,max:23,price:405},{min:24,max:null,price:360}], currency:"GBP", hs_supp:20, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:485},{min:12,max:23,price:405}], currency:"GBP", hs_supp:20, max_weeks:12, morning:true },
      { name:"Exam Prep IELTS", lessons:20, hours:15, tiers:[{min:1,max:11,price:385},{min:12,max:23,price:340}], currency:"GBP", hs_supp:20, morning:false },
    ],
    "EC-Malta": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:300},{min:12,max:23,price:255},{min:24,max:null,price:240}], currency:"EUR", hs_supp:25, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:410},{min:12,max:23,price:320},{min:24,max:null,price:300}], currency:"EUR", hs_supp:25, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:410},{min:12,max:23,price:320}], currency:"EUR", hs_supp:25, max_weeks:12, morning:true },
      { name:"Exam Prep IELTS", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:410},{min:12,max:23,price:320}], currency:"EUR", hs_supp:25, morning:true },
    ],
    "EC-Dubai": [
      { name:"General English 20 - Sabah", lessons:20, hours:15, tiers:[{min:1,max:11,price:380},{min:12,max:23,price:335},{min:24,max:null,price:310}], currency:"USD", morning:false },
      { name:"General English 20 - Öğleden Sonra", lessons:20, hours:15, tiers:[{min:1,max:11,price:310},{min:12,max:23,price:270},{min:24,max:null,price:245}], currency:"USD", morning:false },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:520},{min:12,max:23,price:480},{min:24,max:null,price:440}], currency:"USD", morning:false },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:520},{min:12,max:23,price:480}], currency:"USD", max_weeks:12, morning:false },
    ],
    "EC-Montreal": [
      { name:"General English / French 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:420},{min:12,max:23,price:405}], currency:"CAD", morning:false },
      { name:"General English / French 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:510},{min:12,max:23,price:495}], currency:"CAD", morning:false },
      { name:"Bilingual 24", lessons:24, hours:18, tiers:[{min:1,max:11,price:435},{min:12,max:23,price:420}], currency:"CAD", morning:false },
    ],
    "EC-Boston": [
      { name:"Vacation English (GE 20)", lessons:20, hours:15, tiers:[{min:1,max:11,price:505},{min:12,max:23,price:485}], currency:"USD", hs_supp:25, morning:false },
      { name:"General English 24", lessons:24, hours:18, tiers:[{min:1,max:11,price:570},{min:12,max:23,price:510},{min:24,max:null,price:480}], currency:"USD", hs_supp:25, morning:false },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:650},{min:12,max:23,price:595},{min:24,max:null,price:525}], currency:"USD", hs_supp:25, morning:false },
    ],
  },
  accommodation: {
    "EC-London": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"60 dk", price:305, currency:"GBP" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"60 dk", price:250, currency:"GBP" },
      { type:"Student Residence", name:"iQ Highbury", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"23 dk", price:510, currency:"GBP" },
      { type:"Student Residence", name:"iQ Shoreditch", room:"Studio", bathroom:"Ensuite", board:"Self-Catering", dist:"20 dk", price:625, currency:"GBP" },
    ],
    "EC-Dublin": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"75 dk", price:275, currency:"EUR" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"75 dk", price:305, currency:"EUR" },
      { type:"Student Residence", name:"Heyday Carman's Hall", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"20-30 dk", price:450, currency:"EUR" },
    ],
    "EC-Brighton": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"60 dk", price:240, currency:"GBP" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"60 dk", price:275, currency:"GBP" },
      { type:"Student Residence", name:"Abacus House", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"20 dk", price:390, currency:"GBP" },
    ],
    "EC-Malta": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"15-45 dk", price:360, currency:"EUR" },
      { type:"Student Residence", name:"Campus Hub", room:"Single", bathroom:"Private", board:"Self-Catering", dist:"30 dk", price:390, currency:"EUR" },
    ],
    "EC-Dubai": [
      { type:"Shared Accommodation", name:"Student Apartment", room:"Single", bathroom:"Private", board:"Self-Catering", dist:"25 dk", price:450, currency:"USD" },
      { type:"Student Residence", name:"Student Residence", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"50 dk", price:425, currency:"USD" },
    ],
    "EC-Montreal": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"60 dk", price:320, currency:"CAD" },
      { type:"Shared Accommodation", name:"La Marq au 515", room:"Single", bathroom:"Shared", board:"Self-Catering", dist:"20 dk", price:495, currency:"CAD" },
    ],
    "EC-Boston": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"30-65 dk", price:370, currency:"USD" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"30-65 dk", price:440, currency:"USD" },
    ],
  },
  fees: {
    "EC-London":   { reg:60,  acc:40,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"GBP" },
    "EC-Dublin":   { reg:55,  acc:55,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"EUR" },
    "EC-Brighton": { reg:60,  acc:40,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"GBP" },
    "EC-Malta":    { reg:55,  acc:40,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"EUR" },
    "EC-Dubai":    { reg:100, acc:100, mat_pw:7,  mat_12:84,  mat_24:105, cur:"USD" },
    "EC-Montreal": { reg:140, acc:230, mat_pw:10, mat_12:120, mat_24:140, cur:"CAD" },
    "EC-Boston":   { reg:170, acc:95,  mat_pw:10, mat_12:120, mat_24:140, cur:"USD" },
  },
};

function getPrice(course, weeks) {
  if (!course) return 0;
  const tier = course.tiers.find(t => weeks >= t.min && (t.max === null || weeks <= t.max));
  return tier ? tier.price * weeks : 0;
}

function getFees(key, weeks) {
  const f = DB.fees[key];
  if (!f) return { reg:0, acc:0, mat:0, cur:"GBP" };
  const mat = weeks <= 11 ? f.mat_pw * weeks : weeks <= 23 ? f.mat_12 : f.mat_24;
  return { reg:f.reg, acc:f.acc, mat, cur:f.cur };
}

function fmt(n, cur) {
  return `${cur} ${Number(n).toLocaleString("tr-TR")}`;
}

const emptyDest = () => ({ lang:"", country:"", city:"", brand:"", course:null, weeks:4, acc:null, startDate:"" });

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"", age:"", gender:"" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
  }, []);

  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Özet"];
  const dbKey = cur.brand && cur.city ? `${cur.brand}-${cur.city}` : null;
  const courses = dbKey ? (DB.courses[dbKey] || []) : [];
  const accs = dbKey ? (DB.accommodation[dbKey] || []) : [];

  const canNext = [
    !!(student.name && student.gender),
    !!(cur.brand && cur.city),
    !!cur.course,
    !!cur.acc,
    true,
  ][step];

  function next() {
    if (step === 3) { setDestinations(p => [...p, { ...cur }]); setCur(emptyDest()); setStep(4); }
    else setStep(s => s + 1);
  }

  function addDest() {
    if (step === 3 && cur.acc) setDestinations(p => [...p, { ...cur }]);
    setCur(emptyDest());
    setStep(1);
  }

  function reset() {
    setDestinations([]); setCur(emptyDest());
    setStudent({ name:"", age:"", gender:"" }); setStep(0);
  }

  if (!user) return null;

  const sidebarDests = step < 4 && cur.city && cur.course && cur.acc
    ? [...destinations, cur]
    : destinations;

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
        <button className="ftbb" onClick={() => navigate("/dashboard")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
          Dashboard
        </button>
        <span style={S.htitle}>Fiyat Teklifi</span>
        <div style={{ width:100 }} />
      </header>

      <div style={S.steps}>
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
            <h2 style={S.ttl}>Destinasyon seç</h2>
            <p style={S.slbl}>Dil</p>
            <div style={S.g3}>
              {DB.languages.map(l => (
                <div key={l} className={`ftc${cur.lang===l?" s":""}`} onClick={()=>setCur({...emptyDest(),lang:l})}>{l}</div>
              ))}
            </div>
            {cur.lang && <>
              <p style={S.slbl}>Ülke</p>
              <div style={S.g3}>
                {(DB.countries[cur.lang]||[]).map(c => (
                  <div key={c} className={`ftc${cur.country===c?" s":""}`}
                    onClick={()=>setCur(p=>({...p,country:c,city:"",brand:"",course:null,acc:null}))}>{c}</div>
                ))}
              </div>
            </>}
            {cur.country && <>
              <p style={S.slbl}>Şehir</p>
              <div style={S.g3}>
                {(DB.cities[cur.country]||[]).map(c => (
                  <div key={c} className={`ftc${cur.city===c?" s":""}`}
                    onClick={()=>setCur(p=>({...p,city:c,brand:DB.brands[c]||"",course:null,acc:null}))}>{c}</div>
                ))}
              </div>
            </>}
            {cur.city && <div style={{ marginTop:16, padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13, color:"#64748b" }}>
              Okul markası: <strong style={{ color:"#0f172a" }}>{cur.brand}</strong>
            </div>}
          </div>}

          {/* STEP 2 */}
          {step === 2 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Kurs seç — {cur.brand} {cur.city}</h2>
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
              const f=getFees(key,d.weeks);
              const cCost=getPrice(d.course,d.weeks);
              const aCost=d.acc?d.acc.price*d.weeks:0;
              const fT=f.reg+f.acc+f.mat;
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
                    Kayıt: {fmt(f.reg,f.cur)} · Placement: {fmt(f.acc,f.cur)} · Materyaller: {fmt(f.mat,f.cur)}
                  </div>
                  <div style={{ textAlign:"right", fontSize:16, fontWeight:700, marginTop:10 }}>{fmt(tot,c)}</div>
                </div>
              );
            })}
            {destinations.length>0 && (()=>{
              const totals={};
              destinations.forEach(d=>{
                const key=`${d.brand}-${d.city}`;
                const f=getFees(key,d.weeks);
                const t=getPrice(d.course,d.weeks)+(d.acc?d.acc.price*d.weeks:0)+f.reg+f.acc+f.mat;
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
                ? <button className="ftpb" disabled={!canNext} onClick={next}>{step===3?"Özete geç →":"İleri →"}</button>
                : <button className="ftpb" onClick={reset}>Yeni Teklif</button>
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
                const f=getFees(key,d.weeks);
                const cCost=getPrice(d.course,d.weeks);
                const aCost=d.acc?d.acc.price*d.weeks:0;
                const tot=cCost+aCost+f.reg+f.acc+f.mat;
                const c=d.course?.currency||f.cur;
                return (
                  <div key={i} style={{ marginBottom:14, paddingBottom:14, borderBottom:"1px solid #f1f5f9" }}>
                    <span style={S.pill}>{d.city} · {d.weeks}h</span>
                    {d.course&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:8 }}>
                      <span style={{ color:"#64748b" }}>{d.course.name}</span>
                      <span style={{ fontWeight:600 }}>{fmt(cCost,c)}</span>
                    </div>}
                    {d.acc&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}>
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
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { position:"sticky", top:0, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", zIndex:10, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 28px" },
  htitle: { fontSize:15, fontWeight:600, color:"#0f172a" },
  steps: { display:"flex", alignItems:"center", background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"14px 32px", overflowX:"auto" },
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
