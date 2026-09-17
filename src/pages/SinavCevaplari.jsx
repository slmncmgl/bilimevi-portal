// v1.1 — Eğitim Kayıtları sekmesi eklendi (iki sekmeli yapı, yıl seçici, video linkleri)
// v1.0 — Gemini çağrısı /api/gemini proxy'sine taşındı, key ve model artık backend'de yönetiliyor
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQ2X2Vh9vxF1RO3D5o3UVWj0DHgxDdWHyYdLThI32i6kwcR0MUKswcfeVjpOXL6bZC/exec";
// v1.1 — Okul Eğitimleri sheet'ine gömülü script'in web app URL'i (deploy sonrası buraya yapıştır)
const EGITIM_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyy-3jnGux0jLVaKpc4R5WHjxyvTgvXFBwh2xlmRlnuh-XFiCDHBmGS2wfCZjLx3YoH/exec";

export default function SinavCevaplari() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [quizTitle, setQuizTitle] = useState("");
  const [right, setRight] = useState("");
  const [wrong, setWrong] = useState("");
  const [skipped, setSkipped] = useState("");
  const [total, setTotal] = useState("");
  const [accuracy, setAccuracy] = useState("");

  const [imageBase64, setImageBase64] = useState(null);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const isMouseOverRef = useRef(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // v1.1 — Eğitim Kayıtları sekmesi state'leri
  const [activeTab, setActiveTab] = useState("giris");
  const [egLoading, setEgLoading] = useState(false);
  const [egLoaded, setEgLoaded] = useState(false);
  const [egError, setEgError] = useState(null);
  const [years, setYears] = useState([]);
  const [rowsByYear, setRowsByYear] = useState({});
  const [year, setYear] = useState("");
  const [q, setQ] = useState("");

  const dropRef = useRef(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
  }, []);

  // v1.1 — Eğitim sekmesine ilk girişte veriyi çek
  useEffect(() => {
    if (activeTab === "egitimler" && !egLoaded && !egLoading) loadEgitimler();
  }, [activeTab]);

  async function loadEgitimler() {
    setEgLoading(true); setEgError(null);
    try {
      const res = await fetch(`${EGITIM_SCRIPT_URL}?action=okulEgitimleri`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "hata");
      const ys = data.years || [];
      setYears(ys);
      setRowsByYear(data.rows || {});
      const now = String(new Date().getFullYear());
      setYear(ys.includes(now) ? now : (ys[0] || ""));
      setEgLoaded(true);
    } catch (_) {
      setEgError("Eğitim kayıtları yüklenemedi. Lütfen tekrar deneyin.");
    }
    setEgLoading(false);
  }

  const egList = useMemo(() => {
    const src = rowsByYear[year] || [];
    const term = q.trim().toLocaleLowerCase("tr");
    const filtered = term ? src.filter(r => r.kurum.toLocaleLowerCase("tr").includes(term)) : src;
    return [...filtered].sort((a, b) => {
      if (a.iso && b.iso) return b.iso.localeCompare(a.iso);
      if (a.iso) return -1;
      if (b.iso) return 1;
      return 0;
    });
  }, [rowsByYear, year, q]);

  function handlePaste(e) {
    if (activeTab !== "giris") return; // v1.1 — Ctrl+V sadece Sınav Girişi sekmesinde
    const items = (e.nativeEvent || e).clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        const mimeType = blob.type || "image/png";
        const reader = new FileReader();
        reader.onload = (ev) => processImage(ev.target.result, mimeType);
        reader.readAsDataURL(blob);
      }
    }
  }

  function calcAccuracy(r, t) {
    const rv = Number(r), tv = Number(t);
    if (tv > 0) {
      const acc = (rv / tv) * 100;
      return acc % 1 === 0 ? String(acc) : acc.toFixed(2);
    }
    return "";
  }

  function handleRight(v) { setRight(v); setAccuracy(calcAccuracy(v, total)); }
  function handleTotal(v) { setTotal(v); setAccuracy(calcAccuracy(right, v)); }

  function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const mimeType = file.type || "image/png";
    const reader = new FileReader();
    reader.onload = () => processImage(reader.result, mimeType);
    reader.readAsDataURL(file);
  }

  async function processImage(base64, mimeType = "image/png") {
    setImageBase64(base64);
    setAiLoading(true);
    setStatus({ type: "info", msg: "AI verileri analiz ediyor..." });
    try {
      const cleanBase64 = base64.split(",")[1];
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Analyze this quiz screenshot. Extract JSON: {"quizTitle": "", "right": 0, "wrong": 0, "skipped": 0, "totalQuestions": 0, "accuracy": ""}' },
              { inlineData: { mimeType: mimeType, data: cleanBase64 } }
            ]
          }]
        })
      });
      const result = await res.json();
      const text = result.candidates[0].content.parts[0].text;
      const data = JSON.parse(text.replace(/```json|```/g, "").trim());
      setQuizTitle(data.quizTitle || "");
      setRight(String(data.right || ""));
      setWrong(String(data.wrong || ""));
      setSkipped(String(data.skipped || ""));
      setTotal(String(data.totalQuestions || ""));
      setAccuracy(calcAccuracy(data.right, data.totalQuestions));
      setStatus({ type: "success", msg: "Analiz tamamlandı!" });
    } catch (_) {
      setStatus({ type: "error", msg: "Sınav sonuçlarını manuel olarak giriniz." });
    }
    setAiLoading(false);
  }

  async function handleSubmit() {
    if (!quizTitle || !right || !total) {
      setStatus({ type: "error", msg: "Eksik alanları doldurun." }); return;
    }
    const totalInputs = Number(right) + Number(wrong) + Number(skipped);
    if (totalInputs !== Number(total)) {
      setStatus({ type: "error", msg: `Hata: Toplam (${totalInputs}) soru sayısına (${total}) eşit değil!` }); return;
    }
    setSubmitting(true);
    setStatus({ type: "info", msg: "Veriler kaydediliyor..." });
    try {
      await fetch(SCRIPT_URL, {
        method: "POST", mode: "no-cors", cache: "no-cache",
        body: JSON.stringify({
          user: user?.name,
          quizTitle, right, wrong, skipped,
          totalQuestions: total, accuracy,
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString("tr-TR")
        })
      });
      setStatus({ type: "success", msg: "Sonuç başarıyla tabloya kaydedildi!" });
      setQuizTitle(""); setRight(""); setWrong(""); setSkipped(""); setTotal(""); setAccuracy(""); setImageBase64(null);
    } catch (_) {
      setStatus({ type: "error", msg: "Kayıt hatası." });
    }
    setSubmitting(false);
  }

  const statusColors = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
    error:   { bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
    info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" },
  };

  return (
    <div style={s.root} onPaste={handlePaste}>
      <div style={s.bgGrid} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerLeft}>
            <button onClick={() => navigate("/dashboard")} style={s.backBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <span style={s.headerSep}>·</span>
            <span style={s.headerTitle}>Sınav Cevapları</span>
          </div>
          <div style={s.headerRight}>
            <div style={s.userChip}>
              <div style={s.userDot} />
              {user?.name}
            </div>
            <button onClick={() => { navigate("/"); }} style={s.logoutBtn}>Çıkış</button>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* v1.1 — Sekme barı */}
        <div className="sc-tabs">
          <button onClick={() => setActiveTab("giris")}
            className={activeTab === "giris" ? "sc-tab sc-tab-on" : "sc-tab"}>
            Sınav Girişi
          </button>
          <button onClick={() => setActiveTab("egitimler")}
            className={activeTab === "egitimler" ? "sc-tab sc-tab-on" : "sc-tab"}>
            Eğitim Kayıtları
          </button>
        </div>

        <div style={s.card}>

          {activeTab === "giris" && (<>

          {/* AI Görsel Yükleme */}
          <div style={s.section}>
            <div style={s.sectionLabel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              AI Skor Analizi
            </div>
            <div
              ref={dropRef}
              onMouseEnter={() => { isMouseOverRef.current = true; setIsMouseOver(true); }}
              onMouseLeave={() => { isMouseOverRef.current = false; setIsMouseOver(false); }}
              style={{ ...s.dropZone, borderColor: isMouseOver ? "#2563eb" : "#e2e8f0", background: isMouseOver ? "#eff6ff" : "#f8fafc" }}
            >
              <input type="file" accept="image/*" onChange={onFileChange}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
              {imageBase64 ? (
                <img src={imageBase64} alt="önizleme"
                  style={{ maxHeight: "200px", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={s.uploadIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={isMouseOver ? "#2563eb" : "#94a3b8"} strokeWidth="2" width="24" height="24">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#475569", margin: "0 0 4px" }}>Görsel yükle veya yapıştır</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Ctrl+V ile direkt yapıştırabilirsiniz</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Alanları */}
          <div style={s.section}>
            <div style={s.sectionLabel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Sınav Bilgileri
            </div>
            <div style={s.formGrid}>
              <div style={s.fieldFull}>
                <label style={s.label}>Quiz Başlığı</label>
                <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                  placeholder="Örn: Hafta 1 - Matematik"
                  style={s.input} />
              </div>

              <div style={s.scoreGrid}>
                <div style={s.fieldScore}>
                  <label style={{ ...s.label, color: "#15803d" }}>Doğru</label>
                  <input type="number" value={right} onChange={e => handleRight(e.target.value)}
                    style={{ ...s.scoreInput, borderColor: "#bbf7d0", color: "#15803d" }} />
                </div>
                <div style={s.fieldScore}>
                  <label style={{ ...s.label, color: "#dc2626" }}>Yanlış</label>
                  <input type="number" value={wrong} onChange={e => setWrong(e.target.value)}
                    style={{ ...s.scoreInput, borderColor: "#fecaca", color: "#dc2626" }} />
                </div>
                <div style={s.fieldScore}>
                  <label style={s.label}>Boş</label>
                  <input type="number" value={skipped} onChange={e => setSkipped(e.target.value)}
                    style={{ ...s.scoreInput, borderColor: "#e2e8f0", color: "#475569" }} />
                </div>
              </div>

              <div style={s.bottomGrid}>
                <div>
                  <label style={s.label}>Toplam Soru</label>
                  <input type="number" value={total} onChange={e => handleTotal(e.target.value)}
                    style={s.input} />
                </div>
                <div>
                  <label style={{ ...s.label, color: "#2563eb" }}>Doğruluk (%)</label>
                  <input value={accuracy} readOnly
                    style={{ ...s.input, background: "#eff6ff", color: "#2563eb", fontWeight: "700", textAlign: "center", cursor: "default" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Durum */}
          {status && (
            <div style={{
              ...s.statusBox,
              background: statusColors[status.type].bg,
              border: `1.5px solid ${statusColors[status.type].border}`,
              color: statusColors[status.type].color
            }}>
              {status.type === "info" && (
                <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              )}
              {status.type === "success" && <span>✓</span>}
              {status.type === "error" && <span>✕</span>}
              <span style={{ fontSize: "13px", fontWeight: "600" }}>{status.msg}</span>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting}
            style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
            {submitting
              ? <><span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Kaydediliyor...</>
              : <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Sisteme Kaydet
                </>
            }
          </button>

          </>)}

          {/* v1.1 — Eğitim Kayıtları sekmesi */}
          {activeTab === "egitimler" && (<>
            <div className="sc-filters">
              <select value={year} onChange={e => setYear(e.target.value)} style={s.select}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Kurum ara..." style={s.input} />
            </div>

            <div style={s.countRow}>
              {egLoading ? "Yükleniyor..." : `${egList.length} eğitim kaydı`}
            </div>

            {egLoading && (
              <div style={s.listWrap}>
                {[0,1,2,3,4].map(i => <div key={i} style={s.skeleton} />)}
              </div>
            )}

            {!egLoading && egError && (
              <div style={{ ...s.statusBox, background: "#fef2f2", border: "1.5px solid #fecaca", color: "#dc2626" }}>
                <span>✕</span>
                <span style={{ fontSize: "13px", fontWeight: "600" }}>{egError}</span>
              </div>
            )}

            {!egLoading && !egError && egList.length === 0 && (
              <div style={s.emptyBox}>
                {q ? "Aramanla eşleşen kayıt bulunamadı." : "Bu yıl için kayıtlı eğitim videosu bulunamadı."}
              </div>
            )}

            {!egLoading && !egError && egList.length > 0 && (
              <div style={s.listWrap}>
                {egList.map((r, i) => (
                  <div key={i} className="sc-row">
                    <div className="sc-info">
                      <span className="sc-date">{r.tarih || "—"}</span>
                      <span className="sc-kurum">{r.kurum}</span>
                    </div>
                    <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="sc-watch">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Eğitim Kaydını İzle
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>)}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }

        /* v1.1 — Sekme barı */
        .sc-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .sc-tab {
          flex: 1; padding: 11px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px;
          background: #fff; color: #64748b; font-size: 13px; font-weight: 700;
          font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.2s;
        }
        .sc-tab:hover { border-color: #cbd5e1; color: #475569; }
        .sc-tab-on { background: #0f172a; border-color: #0f172a; color: #fff; }
        .sc-tab-on:hover { background: #1e293b; border-color: #1e293b; color: #fff; }

        .sc-filters { display: flex; gap: 12px; align-items: center; }

        .sc-row {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 14px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px;
          background: #fff; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sc-row:hover { border-color: #bfdbfe; box-shadow: 0 2px 10px rgba(37,99,235,0.07); }
        .sc-info { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .sc-date {
          flex-shrink: 0; font-size: 12px; font-weight: 700; color: #64748b;
          background: #f1f5f9; padding: 5px 10px; border-radius: 7px;
          font-variant-numeric: tabular-nums;
        }
        .sc-kurum { font-size: 14px; font-weight: 600; color: #0f172a; word-break: break-word; }
        .sc-watch {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          flex-shrink: 0; padding: 9px 16px; background: #0f172a; color: #fff;
          border-radius: 10px; font-size: 13px; font-weight: 700;
          text-decoration: none; font-family: 'Inter', sans-serif; transition: background 0.2s;
        }
        .sc-watch:hover { background: #1e293b; }

        @media (max-width: 640px) {
          .sc-filters { flex-direction: column; align-items: stretch; }
          .sc-row { flex-direction: column; align-items: stretch; gap: 12px; padding: 14px; }
          .sc-info { flex-direction: column; align-items: flex-start; gap: 6px; }
          .sc-watch { width: 100%; padding: 13px 16px; min-height: 46px; font-size: 14px; }
          .sc-tab { padding: 12px 10px; min-height: 46px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "680px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  headerSep: { color: "#cbd5e1", fontSize: "14px" },
  headerTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  userChip: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" },
  userDot: { width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" },
  logoutBtn: { padding: "7px 14px", background: "none", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  main: { maxWidth: "680px", margin: "0 auto", padding: "40px 24px 64px", position: "relative", zIndex: 1 },
  card: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "36px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "28px", animation: "fadeUp 0.4s ease-out" },
  section: { display: "flex", flexDirection: "column", gap: "10px" },
  sectionLabel: { display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  dropZone: { position: "relative", border: "2px dashed", borderRadius: "14px", padding: "32px 24px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "130px", transition: "all 0.2s" },
  uploadIcon: { width: "48px", height: "48px", background: "#fff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", margin: "0 auto 12px" },
  formGrid: { display: "flex", flexDirection: "column", gap: "16px" },
  fieldFull: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontFamily: "'Inter', sans-serif", color: "#0f172a", outline: "none", transition: "border-color 0.2s" },
  scoreGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" },
  fieldScore: { display: "flex", flexDirection: "column", gap: "6px" },
  scoreInput: { width: "100%", padding: "12px 8px", border: "1.5px solid", borderRadius: "10px", fontSize: "18px", fontWeight: "700", textAlign: "center", fontFamily: "'Inter', sans-serif", outline: "none", background: "#fff" },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  statusBox: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px" },
  submitBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "13px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" },
  // v1.1 — Eğitim Kayıtları sekmesi
  select: { padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontWeight: "700", color: "#0f172a", background: "#fff", fontFamily: "'Inter', sans-serif", outline: "none", cursor: "pointer", minWidth: "110px" },
  countRow: { fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" },
  listWrap: { display: "flex", flexDirection: "column", gap: "10px" },
  skeleton: { height: "62px", borderRadius: "12px", background: "#f1f5f9", animation: "pulse 1.2s ease-in-out infinite" },
  emptyBox: { padding: "32px 16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#94a3b8", background: "#f8fafc", border: "1.5px dashed #e2e8f0", borderRadius: "12px" },
};
