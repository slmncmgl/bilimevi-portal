import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const VERSION = "v1.0";
const SHEET_ID = "1NLK17BNqWpVncUfWG1BxD1khE-14F-N7h1JJ-yBeaio";
const API_KEY = "AIzaSyAPQlnQGlYmpJU4TajkGvrHHzRv7I5rPxE";

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
    return { question: q, counts, answered, found: idx !== -1 };
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
            <div style={styles.tabBar} className="ar-tab-bar">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...styles.tabBtn,
                    ...(activeTab === tab ? styles.tabBtnActive : {}),
                  }}
                >
                  {tab}
                </button>
              ))}
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
                              <div style={styles.barRow} className="ar-bar-row" key={cat}>
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
                            <div style={styles.barRow} className="ar-bar-row" key={label}>
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          .ar-header-inner { padding: 12px 16px !important; }
          .ar-main { padding: 20px 12px 48px !important; }
          .ar-summary-grid { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)) !important; }
          .ar-tab-bar { padding-bottom: 8px !important; }
          .ar-bar-row { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
          .ar-bar-label { min-width: 0 !important; }
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
  tabBar: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "16px", marginBottom: "24px", borderBottom: "1px solid #e2e8f0" },
  tabBtn: { flexShrink: 0, padding: "8px 16px", borderRadius: "20px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "13px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" },
  tabBtnActive: { background: "#4338ca", borderColor: "#4338ca", color: "#fff" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "32px" },
  summaryCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", textAlign: "center" },
  summaryValue: { fontSize: "24px", fontWeight: "700", color: "#0f172a" },
  summaryLabel: { fontSize: "12px", color: "#94a3b8", marginTop: "4px" },
  questionsWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  questionCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px 24px" },
  questionTitle: { fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" },
  notFoundText: { fontSize: "13px", color: "#94a3b8" },
  barList: { display: "flex", flexDirection: "column", gap: "10px" },
  barRow: { display: "flex", alignItems: "center", gap: "12px" },
  barLabel: { fontSize: "12px", color: "#475569", minWidth: "140px", flexShrink: 0 },
  barTrack: { flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: "6px", transition: "width 0.3s ease" },
  barPct: { fontSize: "12px", color: "#94a3b8", minWidth: "70px", textAlign: "right", flexShrink: 0 },
  commentsSection: { marginTop: "40px" },
  commentsTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" },
  commentsList: { display: "flex", flexDirection: "column", gap: "10px" },
  commentCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px", fontSize: "13px", color: "#334155", lineHeight: 1.6 },
};
