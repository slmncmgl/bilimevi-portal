import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const QUIZ_SHEET_ID = "1LAu1ji5sr-ZHrpAEZ4jALtHg_re7KcEaKZ0IHj9IEYY";
const PERSONEL_SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const CEVAPLAR_URL = `https://docs.google.com/spreadsheets/d/${QUIZ_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Cevaplar`;
const PERSONEL_URL = `https://docs.google.com/spreadsheets/d/${PERSONEL_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Personel`;

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  return lines.map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    return values;
  });
}

function parseYuzde(val) {
  if (!val) return null;
  const m = val.match(/\(%([\d.]+)\)/);
  if (m) return parseFloat(m[1]);
  return null;
}

function DanismanDetay({ danisman, sonuclar, onGeri }) {
  const girilmisler = sonuclar.filter(s => s.yuzde !== null);
  const toplamYuzde = girilmisler.reduce((acc, s) => acc + s.yuzde, 0);
  const genelOrtalama = girilmisler.length > 0 ? (toplamYuzde / girilmisler.length).toFixed(1) : null;
  const ortNum = genelOrtalama ? parseFloat(genelOrtalama) : null;

  return (
    <>
      {onGeri && (
        <button onClick={onGeri} style={{ ...s.backBtn, marginBottom: "20px", display: "inline-flex" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#0891b2"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Listeye Dön
        </button>
      )}

      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <div style={s.summaryNum}>{sonuclar.length}</div>
          <div style={s.summaryLabel}>Toplam Sınav</div>
        </div>
        <div style={s.summaryCard}>
          <div style={{ ...s.summaryNum, color: "#0891b2" }}>{girilmisler.length}</div>
          <div style={s.summaryLabel}>Tamamlanan</div>
        </div>
        <div style={{ ...s.summaryCard, background: ortNum >= 80 ? "#f0fdf4" : ortNum >= 50 ? "#fffbeb" : "#fef2f2", border: `1px solid ${ortNum >= 80 ? "#86efac" : ortNum >= 50 ? "#fde68a" : "#fca5a5"}` }}>
            <div style={{ ...s.summaryNum, color: ortNum >= 80 ? "#166534" : ortNum >= 50 ? "#92400e" : "#991b1b" }}>%{genelOrtalama}</div>
            <div style={s.summaryLabel}>Genel Ortalama</div>
          </div>
      </div>

      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>{danisman} — Sınav Sonuçları</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={s.th}>Okul / Kurs Adı</th>
                <th style={s.th}>Sonuç</th>
                <th style={s.th}>Başarı %</th>
                <th style={s.th}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {sonuclar.map((item, i) => {
                const pct = item.yuzde;
                const renk = pct === null ? "#94a3b8" : pct >= 80 ? "#166534" : pct >= 50 ? "#92400e" : "#991b1b";
                const bg = pct >= 80 ? "#f0fdf4" : pct >= 50 ? "#fffbeb" : "#fef2f2";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...s.td, fontWeight: "600", color: "#0f172a" }}>{item.okul}</td>
                    <td style={{ ...s.td, fontFamily: "monospace", color: "#0f172a" }}>{item.sonuc}</td>
                    <td style={s.td}>
                      {item.yuzde !== null ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
                            <div style={{ width: `${item.yuzde}%`, height: "100%", background: item.yuzde >= 80 ? "#22c55e" : item.yuzde >= 50 ? "#f59e0b" : "#ef4444", borderRadius: "99px" }} />
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: renk, minWidth: "40px" }}>%{item.yuzde}</span>
                        </div>
                      ) : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={s.td}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", background: bg, color: renk }}>
                        ✓ Tamamlandı
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function PerformansAnalizi() {
  const navigate = useNavigate();
  const user = getSession();
  const rol = user?.rol?.toLowerCase() || "staff";
  const isAdmin = ["admin", "director", "owner"].includes(rol);
  const isManager = rol === "manager";

  const [cevaplar, setCevaplar] = useState([]);
  const [personelList, setPersonelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seciliDanisman, setSeciliDanisman] = useState(null);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    Promise.all([
      fetch(CEVAPLAR_URL).then(r => r.text()),
      fetch(PERSONEL_URL).then(r => r.text()),
    ]).then(([cevaplarCsv, personelCsv]) => {
      const cRows = parseCSV(cevaplarCsv);
      if (cRows.length < 2) throw new Error("Sınav verisi bulunamadı");
      // Header: Tarih, Danışman, Quiz Başlığı, Doğru, Yanlış, Atlanan, Toplam Soru, Doğruluk (%)
      const dataRows = cRows.slice(1).map(r => ({
        danisman: r[1]?.trim(),
        okul: r[2]?.trim(),
        yuzde: parseFloat(r[7]) || null,
        sonuc: r[7] ? `%${parseFloat(r[7]).toFixed(2)}` : null,
      })).filter(r => r.danisman && r.okul);
      setCevaplar(dataRows);

      const pRows = parseCSV(personelCsv);
      const pHeaders = pRows[0];
      const adIdx = pHeaders.indexOf("Ad Soyad");
      const subeIdx = pHeaders.indexOf("Şube");
      setPersonelList(pRows.slice(1).map(r => ({
        ad: r[adIdx] || "",
        sube: r[subeIdx] || "",
      })));
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const danismanlar = [...new Set(cevaplar.map(r => r.danisman))].filter(Boolean);

  let gorunecekler = [];
  if (isAdmin) {
    gorunecekler = danismanlar;
  } else if (isManager) {
    const subePersonel = personelList
      .filter(p => p.sube?.toLowerCase() === user?.branch?.toLowerCase())
      .map(p => p.ad?.toLowerCase());
    gorunecekler = danismanlar.filter(d => subePersonel.includes(d.toLowerCase()));
  } else {
    const kendi = danismanlar.find(d => d.toLowerCase() === user?.name?.toLowerCase());
    if (kendi) gorunecekler = [kendi];
  }

  const tekKisi = gorunecekler.length === 1;

  function getSonuclar(danisman) {
    return cevaplar.filter(r => r.danisman.toLowerCase() === danisman.toLowerCase());
  }

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <button onClick={() => navigate("/dashboard")} style={s.backBtn}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#0891b2"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Geri
          </button>
          <div style={s.headerTitle}>
            <div style={s.headerIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" width="20" height="20">
                <path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 20h18" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={s.headerTitleText}>Performans Analizi</div>
              <div style={s.headerSub}>Sınav sonuçları ve başarı takibi</div>
            </div>
          </div>
          <div style={s.headerUser}>
            <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
            <span style={s.userName}>{user?.name}</span>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {loading && (
          <div style={s.loadingWrap}>
            <span style={s.spinner} />
            <span style={{ color: "#64748b", fontSize: "14px" }}>Veriler yükleniyor...</span>
          </div>
        )}

        {error && (
          <div style={s.errorCard}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="20" height="20">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {!loading && !error && gorunecekler.length === 0 && (
          <div style={s.errorCard}>
            Sisteme kayıtlı sınav verisi bulunamadı. ({user?.name})
          </div>
        )}

        {!loading && !error && gorunecekler.length > 0 && (
          tekKisi || seciliDanisman ? (
            <DanismanDetay
              danisman={seciliDanisman || gorunecekler[0]}
              sonuclar={getSonuclar(seciliDanisman || gorunecekler[0])}
              onGeri={!tekKisi ? () => setSeciliDanisman(null) : null}
            />
          ) : (
            <div style={s.tableCard}>
              <div style={s.tableHeader}>
                <span style={s.tableTitle}>Danışman Listesi</span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{gorunecekler.length} danışman</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                      <th style={s.th}>Danışman</th>
                      <th style={s.th}>Tamamlanan</th>
                      <th style={s.th}>Genel Ortalama</th>
                      <th style={s.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gorunecekler.map((d, i) => {
                      const dSonuclar = getSonuclar(d);
                      const ort = dSonuclar.length > 0
                        ? (dSonuclar.reduce((acc, v) => acc + (v.yuzde || 0), 0) / dSonuclar.length).toFixed(1)
                        : null;
                      const ortNum = ort ? parseFloat(ort) : null;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...s.td, fontWeight: "600", color: "#0f172a" }}>{d}</td>
                          <td style={s.td}>
                            <span style={{ color: "#0891b2", fontWeight: "600" }}>{dSonuclar.length}</span>
                            <span style={{ color: "#94a3b8" }}> sınav</span>
                          </td>
                          <td style={s.td}>
                            {ort ? (
                              <span style={{ fontWeight: "700", color: ortNum >= 80 ? "#166534" : ortNum >= 50 ? "#92400e" : "#991b1b" }}>%{ort}</span>
                            ) : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>
                          <td style={{ ...s.td, textAlign: "right" }}>
                            <button onClick={() => setSeciliDanisman(d)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#ecfeff", color: "#0891b2", border: "1px solid #a5f3fc", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "'Sora', sans-serif" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#0891b2"; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#ecfeff"; e.currentTarget.style.color = "#0891b2"; }}>
                              Detay
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Sora', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  bgGlow: { position: "fixed", top: "-10%", right: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #cffafe44 0%, transparent 70%)", zIndex: 0 },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "900px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569", fontFamily: "'Sora', sans-serif", transition: "border-color 0.2s", whiteSpace: "nowrap" },
  headerTitle: { display: "flex", alignItems: "center", gap: "10px", flex: 1 },
  headerIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "#ecfeff", border: "1px solid #a5f3fc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerTitleText: { fontSize: "15px", fontWeight: "700", color: "#0f172a" },
  headerSub: { fontSize: "11px", color: "#94a3b8", marginTop: "1px" },
  headerUser: { display: "flex", alignItems: "center", gap: "8px" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700" },
  userName: { fontSize: "13px", fontWeight: "600", color: "#0f172a" },
  main: { maxWidth: "900px", margin: "0 auto", padding: "32px 24px 64px", position: "relative", zIndex: 1 },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px 0" },
  spinner: { display: "inline-block", width: "20px", height: "20px", border: "2px solid #e2e8f0", borderTopColor: "#0891b2", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorCard: { display: "flex", alignItems: "center", gap: "10px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "16px 20px", color: "#991b1b", fontSize: "13px", fontWeight: "500" },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px", animation: "fadeUp 0.4s ease-out" },
  summaryCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "20px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  summaryNum: { fontSize: "28px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" },
  summaryLabel: { fontSize: "11px", color: "#94a3b8", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" },
  tableCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", animation: "fadeUp 0.5s ease-out" },
  tableHeader: { padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" },
  tableTitle: { fontSize: "14px", fontWeight: "700", color: "#0f172a" },
  th: { padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" },
  td: { padding: "12px 16px", verticalAlign: "middle" },
};
