import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";

// --- YARDIMCI FONKSİYONLAR ---
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
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
  if (!res.ok) throw new Error(`${sheetName} okunamadi`);
  const text = await res.text();
  return parseCSV(text);
}

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name: "Selman Çamoğlu", age: "38", gender: "Erkek" });
  const [destinations, setDestinations] = useState([]);
  
  // Ana state yapısını koruyoruz
  const [cur, setCur] = useState({
    lang: "", country: "", city: "", brand: "", 
    course: null, weeks: 4, acc: null, 
    startDate: "", isOnline: false, 
    cityData: null, cityLoading: false 
  });

  const [nav, setNav] = useState({ languages: [], countries: {}, citiesByLang: {}, brandsByCity: {}, schoolSheets: {} });

  // 1. Master Veriyi Çekme
  useEffect(() => {
    const session = getSession();
    if (!session) return navigate("/");
    setUser(session);

    const fetchNav = async () => {
      const rows = await fetchCSV(MASTER_ID, "master_index");
      const countryTR = { "UK": "İngiltere", "Ireland": "İrlanda", "Malta": "Malta", "South Africa": "Güney Afrika", "Canada": "Kanada", "USA": "ABD", "UAE": "BAE" };
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
        
        if (sheetId && brand) schoolSheets[brand] = { sheetId, sheetName: row.sheet_name };
        
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

      setNav({
        languages: [...languages].sort((a, b) => (a === "İngilizce" ? -1 : 1)),
        countries: Object.fromEntries(Object.entries(countries).map(([k, v]) => [k, [...v]])),
        citiesByLang: Object.fromEntries(Object.entries(citiesByLang).map(([l, cm]) => [l, Object.fromEntries(Object.entries(cm).map(([c, s]) => [c, [...s].sort()]))])),
        brandsByCity: Object.fromEntries(Object.entries(brandsByCity).map(([c, s]) => [c, [...s]])),
        schoolSheets,
      });
    };
    fetchNav();
  }, [navigate]);

  // 2. Dinamik Okul Verisi Çekme (Geri butonu hatası burada çözüldü)
  useEffect(() => {
    if (!cur.city || !cur.brand || cur.isOnline) return;

    // Eğer cityData zaten varsa VE şu an seçili olan şehirle aynıysa, tekrar çekme
    if (cur.cityData && cur.cityData.fetchedFor === `${cur.brand}-${cur.city}`) {
      return;
    }

    const loadData = async () => {
      const sheetId = nav.schoolSheets?.[cur.brand]?.sheetId;
      if (!sheetId) return;

      setCur(p => ({ ...p, cityLoading: true }));
      try {
        const [courseRows, accRows, feeRows] = await Promise.all([
          fetchCSV(sheetId, "courses"), fetchCSV(sheetId, "accommodation"), fetchCSV(sheetId, "fees")
        ]);

        const courseMap = {};
        courseRows.filter(r => r.city === cur.city).forEach(r => {
          if (!courseMap[r.course_name]) courseMap[r.course_name] = { name: r.course_name, lessons: parseFloat(r.lessons_per_week) || 0, hours: parseFloat(r.hours_per_week) || 0, currency: r.currency, tiers: [] };
          courseMap[r.course_name].tiers.push({ min: parseInt(r.weeks_tier_min) || 1, max: r.weeks_tier_max ? parseInt(r.weeks_tier_max) : null, price: parseFloat(r.price_per_week) || 0 });
        });

        const acc = accRows.filter(r => r.city === cur.city).map(r => ({ name: r.place_name, room: r.room_type, board: r.board_type, price: parseFloat(r.price_per_week) || 0, currency: r.currency }));
        const fees = feeRows.filter(r => r.city === cur.city).map(r => ({ name: r.fee_name, amount: parseFloat(r.amount) || 0, currency: r.currency, calc_type: r.calculation_type, tier_min: r.tier_min_weeks ? parseInt(r.tier_min_weeks) : null, tier_max: r.tier_max_weeks ? parseInt(r.tier_max_weeks) : null }));

        setCur(p => ({ 
          ...p, 
          cityData: { courses: Object.values(courseMap), acc, fees, fetchedFor: `${cur.brand}-${cur.city}` }, 
          cityLoading: false 
        }));
      } catch (err) {
        setCur(p => ({ ...p, cityLoading: false }));
      }
    };
    loadData();
  }, [cur.city, cur.brand, nav.schoolSheets]);

  // 3. Hesaplama Fonksiyonları
  const getPrice = (c, w) => {
    if (!c || !w || !c.tiers) return 0;
    const tier = c.tiers.find(t => w >= t.min && (t.max === null || w <= t.max));
    return tier ? tier.price * w : 0;
  };

  const isCourseValid = (course, weeks) => {
    if (!course || !course.tiers) return false;
    return course.tiers.some(t => weeks >= t.min && (t.max === null || weeks <= t.max));
  };

  const calcFees = (fees, weeks) => {
    let reg = 0, place = 0, mat = 0, currency = fees?.[0]?.currency || "GBP";
    (fees || []).forEach(f => {
      const n = (f.name || "").toLowerCase();
      if (n.includes("registration") || n.includes("kayit")) reg += f.amount;
      else if (n.includes("placement")) place += f.amount;
      else if (n.includes("material") || n.includes("materyal")) {
        if ((!f.tier_min || weeks >= f.tier_min) && (!f.tier_max || weeks <= f.tier_max)) {
          mat += f.calc_type === "per_week" ? f.amount * weeks : f.amount;
        }
      }
    });
    return { reg, place, mat, currency };
  };

  const fmt = (n, cur) => `${cur || ""} ${Number(n || 0).toLocaleString("tr-TR")}`;

  // Navigasyon
  const next = () => {
    if (step === 3 || (step === 2 && cur.isOnline)) {
      setDestinations(p => [...p, { ...cur }]);
      setCur({ ...cur, lang: "", country: "", city: "", brand: "", course: null, acc: null, cityData: null });
      setStep(4);
    } else setStep(s => s + 1);
  };

  // Render Logic
  const feesObj = cur.isOnline ? { reg: 35, mat: 30, currency: "EUR" } : calcFees(cur.cityData?.fees, cur.weeks);
  const cCost = getPrice(cur.course, cur.weeks);
  const aCost = cur.acc ? cur.acc.price * cur.weeks : 0;
  const currentTotal = cCost + aCost + feesObj.reg + feesObj.mat + (feesObj.place || 0);

  const canNext = [
    !!(student.name && student.age),
    (cur.isOnline && cur.course) || (cur.brand && cur.city),
    !!cur.course && isCourseValid(cur.course, cur.weeks) && !cur.cityLoading,
    !!cur.acc || cur.isOnline,
    true
  ][step];

  return (
    <div style={S.root}>
      {/* Header ve Body yapısı aynı kalıyor, sadece içerik kontrolü güncellendi */}
      <header style={S.hdr}>
        <div style={S.cnt}>
          <button onClick={() => navigate("/dashboard")} style={S.backBtn}>Dashboard</button>
          <span style={S.htitle}>Fiyat Teklifi Oluştur</span>
          <div style={{ width: 100 }} />
        </div>
      </header>

      <div style={S.body}>
        <main style={S.main}>
          {step === 0 && (
            <div style={{ animation: "fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Öğrenci Bilgileri</h2>
              <div style={S.r2}>
                <div style={S.fld}><label style={S.lbl}>Ad Soyad</label><input style={S.fti} value={student.name} onChange={e => setStudent(p => ({ ...p, name: e.target.value }))} /></div>
                <div style={S.fld}><label style={S.lbl}>Yaş</label><input style={S.fti} type="number" value={student.age} onChange={e => setStudent(p => ({ ...p, age: e.target.value }))} /></div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ animation: "fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Destinasyon Seçimi</h2>
              <p style={S.slbl}>DİL SEÇİMİ</p>
              <div style={S.g3}>
                {nav.languages.map(l => <div key={l} style={cur.lang === l && !cur.isOnline ? S.ftcSelected : S.ftc} onClick={() => setCur(p => ({ ...p, isOnline: false, lang: l, country: "", city: "", brand: "", cityData: null }))}>{l}</div>)}
                <div style={cur.isOnline ? S.ftcOnlineSelected : S.ftcOnline} onClick={() => setCur(p => ({ ...p, isOnline: true, brand: "EC", city: "Online", lang: "İngilizce", country: "", cityData: null }))}>🌐 Online Kurs</div>
              </div>
              {!cur.isOnline && cur.lang && (
                <>
                  <p style={S.slbl}>ÜLKE</p>
                  <div style={S.g3}>{(nav.countries[cur.lang] || []).map(c => <div key={c} style={cur.country === c ? S.ftcSelected : S.ftc} onClick={() => setCur(p => ({ ...p, country: c, city: "", brand: "", cityData: null }))}>{c}</div>)}</div>
                </>
              )}
              {cur.country && (
                <>
                  <p style={S.slbl}>ŞEHİR</p>
                  <div style={S.g3}>{(nav.citiesByLang[cur.lang]?.[cur.country] || []).map(c => <div key={c} style={cur.city === c ? S.ftcSelected : S.ftc} onClick={() => setCur(p => ({ ...p, city: c, brand: "", cityData: null }))}>{c}</div>)}</div>
                </>
              )}
              {cur.city && (
                <>
                  <p style={S.slbl}>OKUL</p>
                  <div style={S.g3}>{(nav.brandsByCity[cur.city] || []).map(b => <div key={b} style={cur.brand === b ? S.ftcSelected : S.ftc} onClick={() => setCur(p => ({ ...p, brand: b, cityData: null }))}>{b}</div>)}</div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: "fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Kurs ve Süre Seçimi</h2>
              <div style={S.r2}>
                <div style={S.fld}><label style={S.lbl}>Süre (Hafta)</label><input style={S.fti} type="number" value={cur.weeks} onChange={e => setCur(p => ({ ...p, weeks: parseInt(e.target.value) || 1 }))} /></div>
              </div>
              <div style={S.g3}>
                {(cur.cityData?.courses || []).map((c, idx) => {
                  const valid = isCourseValid(c, cur.weeks);
                  return (
                    <div key={idx} style={cur.course?.name === c.name ? S.ftcSelected : (valid ? S.ftc : S.ftcDisabled)} onClick={() => valid && setCur(p => ({ ...p, course: c }))}>
                      <strong>{c.name}</strong><br /><small>{c.hours} saat/hafta</small>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ animation: "fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Konaklama - {cur.city}</h2>
              {cur.cityLoading ? <p>Yükleniyor...</p> : (
                <div style={{ display: "grid", gap: 10 }}>
                  {(cur.cityData?.acc || []).length > 0 ? (cur.cityData.acc).map((a, idx) => (
                    <div key={idx} style={cur.acc?.name === a.name && cur.acc?.room === a.room ? S.ftacSelected : S.ftac} onClick={() => setCur(p => ({ ...p, acc: a }))}>
                      <div><strong>{a.name}</strong><br /><small>{a.room} · {a.board}</small></div>
                      <strong>{a.currency} {a.price}/hafta</strong>
                    </div>
                  )) : <p>Bu okul için konaklama verisi bulunamadı.</p>}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ animation: "fadeUp 0.3s" }}>
              <h2 style={S.ttl}>Teklif Özeti</h2>
              {destinations.map((d, i) => <div key={i} style={S.summaryCard}><strong>{d.brand} - {d.city}</strong><br />{d.weeks} Hafta · {d.course?.name}</div>)}
            </div>
          )}

          <div style={S.navBox}>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} style={S.btnBack}>← Geri</button>}
            <button style={S.btnNext} disabled={!canNext} onClick={next}>{step === 4 ? "Yeni Ekle / Bitir" : "İleri →"}</button>
          </div>
        </main>

        <aside style={S.side}>
          <h3 style={S.sideTtl}>CANLI HESAPLAMA</h3>
          <div style={S.liveBox}>
            {cur.brand && <div style={{ marginBottom: 10 }}><strong>{cur.brand}</strong> - {cur.city}</div>}
            {cur.course && <div>📚 {cur.course.name}</div>}
            {cur.acc && <div>🏠 {cur.acc.name}</div>}
            {currentTotal > 0 && <div style={S.liveTotal}>{fmt(currentTotal, cur.course?.currency || cur.cityData?.fees?.[0]?.currency)}</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

const S = {
  // Stil objeleri (Aynen korunabilir, önceki mesajdakiyle aynıdır)
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Sora', sans-serif" },
  hdr: { background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 },
  cnt: { maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  htitle: { fontSize: 15, fontWeight: 600, color: "#0f172a" },
  backBtn: { background: "none", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13 },
  body: { maxWidth: 1100, margin: "20px auto", padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 },
  main: { background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", padding: "30px" },
  ttl: { fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#0f172a" },
  slbl: { fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: "15px 0 8px" },
  r2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 15 },
  fld: { display: "flex", flexDirection: "column", gap: 6 },
  lbl: { fontSize: 12, color: "#64748b" },
  fti: { padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none" },
  ftc: { flex: 1, padding: 12, border: "1.5px solid #e2e8f0", borderRadius: 12, textAlign: "center", cursor: "pointer", fontSize: 13, background: "#fff" },
  ftcSelected: { flex: 1, padding: 12, border: `1.5px solid #f97316`, background: "#fff7ed", color: "#f97316", borderRadius: 12, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  ftcDisabled: { flex: 1, padding: 12, border: "1.5px solid #e2e8f0", borderRadius: 12, textAlign: "center", cursor: "not-allowed", fontSize: 13, background: "#f1f5f9", opacity: 0.6, color: "#94a3b8" },
  ftcOnline: { padding: 12, border: "1.5px solid #3b82f6", color: "#3b82f6", borderRadius: 12, textAlign: "center", cursor: "pointer", fontSize: 13 },
  ftcOnlineSelected: { padding: 12, border: `1.5px solid #f97316`, background: "#fff7ed", color: "#f97316", borderRadius: 12, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  ftac: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, border: "1.5px solid #e2e8f0", borderRadius: 12, cursor: "pointer", fontSize: 13 },
  ftacSelected: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, border: `1.5px solid #f97316`, background: "#fff7ed", color: "#f97316", borderRadius: 12, cursor: "pointer", fontSize: 13 },
  g3: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 },
  navBox: { marginTop: 40, display: "flex", justifyContent: "flex-end", gap: 10 },
  btnBack: { background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14 },
  btnNext: { background: "#f97316", color: "#fff", border: "none", padding: "12px 30px", borderRadius: 10, fontWeight: 600, cursor: "pointer" },
  side: { background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", padding: 20, position: "sticky", top: 90, height: "fit-content" },
  sideTtl: { fontSize: 14, fontWeight: 700, borderBottom: "1px solid #eee", paddingBottom: 10, marginBottom: 15 },
  liveBox: { background: "#f8fafc", padding: 12, borderRadius: 10, fontSize: 12, marginBottom: 15 },
  liveTotal: { marginTop: 8, fontWeight: 700, fontSize: 14, color: "#f97316" },
  summaryCard: { border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 15, marginBottom: 10 },
};
