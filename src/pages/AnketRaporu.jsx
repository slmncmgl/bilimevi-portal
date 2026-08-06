import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const VERSION = "v1.1";
const SHEET_ID = "1NLK17BNqWpVncUfWG1BxD1khE-14F-N7h1JJ-yBeaio";
const API_KEY = "AIzaSyAPQlnQGlYmpJU4TajkGvrHHzRv7I5rPxE";

const STUDENT_NAME_COLUMN = "Öğrencinin Adı, Soyadı";

const QUESTION_COLUMNS = [
  "Dersler ve Eğitim",
  "Geziler",
  "Aktiviteler",
  "Grup lideri",
  "Konaklama",
  "Yemekler",
  "Kampüs İmkanları",
  "Uçuş Deneyimi",
  "Havaalanı Transferleri",
  "Genel Yaz Okulu Deneyiminiz",
  "Bilimevi'ndeki Eğitim Danışmanınız",
  "Vize Süreciniz",
];

const UNI_PLAN_COLUMN = "İlerde Çocuğunuz İçin Yurtdışında Üniversite Eğitimi Planlıyor Musunuz?";
const COMMENT_COLUMN = "Yaz okulu deneyiminiz hakkında paylaşmak istediğiniz düşüncelerinizi aşağıya yazabilirsiniz.";
const GENDER_COLUMN = "Öğrencinin Cinsiyeti";

const CATEGORY_ORDER = ["Çok memnunum", "Memnunum", "Kararsızım", "Memnun Değilim", "Hiç Memnun Değilim"];
const CATEGORY_COLORS = {
  "Çok memnunum": "#2563eb",
  "Memnunum": "#059669",
  "Kararsızım": "#d97706",
  "Memnun Değilim": "#ea580c",
  "Hiç Memnun Değilim": "#dc2626",
};

function findHeaderIndex(headers, exactName) {
  let idx = headers.findIndex(h => h.trim() === exactName);
  if (idx === -1) idx = headers.findIndex(h => h.trim().startsWith(exactName));
  return idx;
}

export default function AnketRaporu() {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [tabsError, setTabsError] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [studentPopup, setStudentPopup] = useState(null); // { title, names: [] }
  const [copiedName, setCopiedName] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Sekmeler yüklenemedi");
        const titles = (json.sheets || []).map(s => s.properties.title);
        setTabs(titles);
        if (titles.length > 0) setActiveTab(titles[0]);
      } catch (err) {
        setTabsError(err.message);
      } finally {
        setTabsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeTab) return;
    (async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        const range = `'${activeTab}'`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Veri yüklenemedi");
        const values = json.values || [];
        if (values.length === 0) {
          setHeaders([]);
          setRows([]);
        } else {
          setHeaders(values[0]);
          setRows(values.slice(1));
        }
      } catch (err) {
        setDataError(err.message);
      } finally {
        setDataLoading(false);
      }
    })();
  }, [activeTab]);

  // --- İstatistik hesapla ---
  const genderIdx = findHeaderIndex(headers, GENDER_COLUMN);
  const commentIdx = findHeaderIndex(headers, COMMENT_COLUMN);
  const uniPlanIdx = findHeaderIndex(headers, UNI_PLAN_COLUMN);
  const nameIdx = findHeaderIndex(headers, STUDENT_NAME_COLUMN);

  const total = rows.length;

  const genderCounts = {};
  if (genderIdx !== -1) {
    rows.forEach(r => {
      const val = (r[genderIdx] || "").trim();
      if (val) genderCounts[val] = (genderCounts[val] || 0) + 1;
    });
  }

  const questionStats = QUESTION_COLUMNS.map(q => {
    const idx = findHeaderIndex(headers, q);
    const counts = {};
    CATEGORY_ORDER.forEach(c => { counts[c] = 0; });
    let answered = 0;
    if (idx !== -1) {
      rows.forEach(r => {
        const val = (r[idx] || "").trim();
        if (CATEGORY_ORDER.includes(val)) {
          counts[val]++;
          answered++;
        }
      });
    }
    return { question: q, idx, counts, answered, found: idx !== -1 };
  });

  const uniPlanCounts = {};
  if (uniPlanIdx !== -1) {
    rows.forEach(r => {
      const val = (r[uniPlanIdx] || "").trim();
      if (val) uniPlanCounts[val] = (uniPlanCounts[val] || 0) + 1;
    });
  }

  const comments = commentIdx !== -1
    ? rows.map(r => (r[commentIdx] || "").trim()).filter(Boolean)
    : [];

  function openStudentPopup(colIdx, category, questionLabel) {
    if (colIdx === -1 || nameIdx === -1) return;
    const names = rows
      .filter(r => (r[colIdx] || "").trim() === category)
      .map(r => (r[nameIdx] || "").trim())
      .filter(Boolean);
    setStudentPopup({ title: `${questionLabel} — ${category}`, names });
  }

  async function copyName(name) {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 1500);
    } catch {
      // clipboard erişimi yoksa sessizce geç
    }
  }

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerInner} className="ar-header-inner">
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Dashboard
          </button>
          <div style={styles.headerTitleWrap}>
            <h1 style={styles.headerTitle}>Anket Raporu</h1>
            <span style={styles.versionTag}>{VERSION}</span>
          </div>
        </div>
      </header>

      <main style={styles.main} className="ar-main">
        {tabsLoading ? (
          <div style={styles.stateBox}>Sekmeler yükleniyor...</div>
        ) : tabsError ? (
          <div style={styles.errorBox}>
            <strong>Sekmeler yüklenemedi.</strong>
            <p>{tabsError}</p>
            <span>Sheet paylaşım ayarını ("Bağlantıya sahip olan görebilir") kontrol edin.</span>
          </div>
        ) : (
          <>
            <div style={styles.selectWrap} className="ar-select-wrap">
              <label style={styles.selectLabel}>Grup seç</label>
              <select
                value={activeTab || ""}
                onChange={e => setActiveTab(e.target.value)}
                style={styles.select}
                className="ar-select"
              >
                {tabs.map(tab => (
                  <option key={tab} value={tab}>{tab}</option>
                ))}
              </select>
            </div>

            {dataLoading ? (
              <div style={styles.stateBox}>Veri yükleniyor...</div>
            ) : dataError ? (
              <div style={styles.errorBox}>
                <strong>Veri yüklenemedi.</strong>
                <p>{dataError}</p>
              </div>
            ) : rows.length === 0 ? (
              <div style={styles.stateBox}>Bu grupta henüz veri yok.</div>
            ) : (
              <>
                <div style={styles.summaryGrid} className="ar-summary-grid">
                  <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{total}</div>
                    <div style={styles.summaryLabel}>Toplam Katılımcı</div>
                  </div>
                  {Object.entries(genderCounts).map(([g, c]) => (
                    <div style={styles.summaryCard} key={g}>
                      <div style={styles.summaryValue}>{c}</div>
                      <div style={styles.summaryLabel}>{g}</div>
                    </div>
                  ))}
                </div>

                <div style={styles.questionsWrap}>
                  {questionStats.map(qs => (
                    <div style={styles.questionCard} key={qs.question}>
                      <h3 style={styles.questionTitle}>{qs.question}</h3>
                      {!qs.found ? (
                        <p style={styles.notFoundText}>Bu sütun sheet'te bulunamadı.</p>
                      ) : qs.answered === 0 ? (
                        <p style={styles.notFoundText}>Cevap yok.</p>
                      ) : (
                        <div style={styles.barList}>
                          {CATEGORY_ORDER.map(cat => {
                            const count = qs.counts[cat];
                            const pct = qs.answered > 0 ? Math.round((count / qs.answered) * 100) : 0;
                            return (
                              <div
                                style={{ ...styles.barRow, cursor: count > 0 ? "pointer" : "default" }}
                                className="ar-bar-row"
                                key={cat}
                                onClick={() => count > 0 && openStudentPopup(qs.idx, cat, qs.question)}
                              >
                                <span style={styles.barLabel} className="ar-bar-label">{cat}</span>
                                <div style={styles.barTrack}>
                                  <div style={{ ...styles.barFill, width: `${pct}%`, background: CATEGORY_COLORS[cat] }} />
                                </div>
                                <span style={styles.barPct}>{count} · %{pct}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {uniPlanIdx !== -1 && Object.keys(uniPlanCounts).length > 0 && (
                    <div style={styles.questionCard}>
                      <h3 style={styles.questionTitle}>{UNI_PLAN_COLUMN}</h3>
                      <div style={styles.barList}>
                        {Object.entries(uniPlanCounts).map(([label, count]) => {
                          const sum = Object.values(uniPlanCounts).reduce((a, b) => a + b, 0);
                          const pct = sum > 0 ? Math.round((count / sum) * 100) : 0;
                          return (
                            <div
                              style={{ ...styles.barRow, cursor: count > 0 ? "pointer" : "default" }}
                              className="ar-bar-row"
                              key={label}
                              onClick={() => count > 0 && openStudentPopup(uniPlanIdx, label, UNI_PLAN_COLUMN)}
                            >
                              <span style={styles.barLabel} className="ar-bar-label">{label}</span>
                              <div style={styles.barTrack}>
                                <div style={{ ...styles.barFill, width: `${pct}%`, background: "#4338ca" }} />
                              </div>
                              <span style={styles.barPct}>{count} · %{pct}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {comments.length > 0 && (
                  <div style={styles.commentsSection}>
                    <h2 style={styles.commentsTitle}>Yorumlar ({comments.length})</h2>
                    <div style={styles.commentsList}>
                      {comments.map((c, i) => (
                        <div style={styles.commentCard} key={i}>{c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Öğrenci Listesi Popup */}
      {studentPopup && (
        <div onClick={() => setStudentPopup(null)} style={styles.popupOverlay}>
          <div onClick={e => e.stopPropagation()} style={styles.popupCard} className="ar-popup-card">
            <div style={styles.popupHeader}>
              <h3 style={styles.popupTitle}>{studentPopup.title}</h3>
              <span style={styles.popupCount}>{studentPopup.names.length} öğrenci</span>
            </div>
            {studentPopup.names.length === 0 ? (
              <p style={styles.notFoundText}>Öğrenci adı bulunamadı.</p>
            ) : (
              <div style={styles.popupList}>
                {studentPopup.names.map((name, i) => (
                  <div style={styles.popupNameRow} key={i}>
                    <span style={styles.popupName}>{name}</span>
                    <button onClick={() => copyName(name)} style={styles.copyBtn}>
                      {copiedName === name ? "Kopyalandı" : "Kopyala"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setStudentPopup(null)} style={styles.popupCloseBtn}>Kapat</button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          .ar-header-inner { padding: 12px 16px !important; }
          .ar-main { padding: 20px 12px 48px !important; }
          .ar-summary-grid { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)) !important; }
          .ar-select-wrap { width: 100% !important; }
          .ar-select { width: 100% !important; }
          .ar-bar-row { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
          .ar-bar-label { min-width: 0 !important; }
          .ar-popup-card { width: 100% !important; max-width: none !important; margin: 0 12px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "900px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569", fontFamily: "inherit" },
  headerTitleWrap: { display: "flex", alignItems: "center", gap: "8px" },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  versionTag: { fontSize: "11px", fontWeight: "600", color: "#4338ca", background: "#eef2ff", padding: "2px 8px", borderRadius: "6px" },
  main: { maxWidth: "900px", margin: "0 auto", padding: "32px 24px 64px" },
  stateBox: { padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" },
  errorBox: { padding: "24px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b", fontSize: "13px", lineHeight: 1.6 },
  selectWrap: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "28px", maxWidth: "420px" },
  selectLabel: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  select: { padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", fontSize: "14px", fontWeight: "600", color: "#0f172a", fontFamily: "inherit", cursor: "pointer" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "32px" },
  summaryCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", textAlign: "center" },
  summaryValue: { fontSize: "24px", fontWeight: "700", color: "#0f172a" },
  summaryLabel: { fontSize: "12px", color: "#94a3b8", marginTop: "4px" },
  questionsWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  questionCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px 24px" },
  questionTitle: { fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" },
  notFoundText: { fontSize: "13px", color: "#94a3b8" },
  barList: { display: "flex", flexDirection: "column", gap: "10px" },
  barRow: { display: "flex", alignItems: "center", gap: "12px", borderRadius: "8px", padding: "4px", transition: "background 0.15s" },
  barLabel: { fontSize: "12px", color: "#475569", minWidth: "140px", flexShrink: 0 },
  barTrack: { flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: "6px", transition: "width 0.3s ease" },
  barPct: { fontSize: "12px", color: "#94a3b8", minWidth: "70px", textAlign: "right", flexShrink: 0 },
  commentsSection: { marginTop: "40px" },
  commentsTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" },
  commentsList: { display: "flex", flexDirection: "column", gap: "10px" },
  commentCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px", fontSize: "13px", color: "#334155", lineHeight: 1.6 },
  popupOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  popupCard: { background: "#fff", borderRadius: "20px", padding: "24px", maxWidth: "420px", width: "100%", maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  popupHeader: { marginBottom: "16px" },
  popupTitle: { fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" },
  popupCount: { fontSize: "12px", color: "#94a3b8" },
  popupList: { overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  popupNameRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" },
  popupName: { fontSize: "13px", color: "#334155", fontWeight: "500" },
  copyBtn: { flexShrink: 0, padding: "5px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#4338ca", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  popupCloseBtn: { width: "100%", padding: "10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#64748b", fontFamily: "inherit" },
};
