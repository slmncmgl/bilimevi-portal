import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const VERSION = "v1.5";
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
const HOW_REACHED_COLUMN = "Bilimevi'ne Nasıl Ulaştınız?";
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
const DYNAMIC_PALETTE = ["#4338ca", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0369a1"];
const EMPTY_COLOR = "#cbd5e1";

function findHeaderIndex(headers, exactName) {
  let idx = headers.findIndex(h => h.trim() === exactName);
  if (idx === -1) idx = headers.findIndex(h => h.trim().startsWith(exactName));
  return idx;
}

// --- Grup kayıt sayısı (roster) eşleştirme ---
const ROSTER_SHEET_ID = "1Qr2OLtRhIzXtXq1FmQvYiO1QnO8pjRxCx6Rzotrhsv0";

function normalizeTr(str) {
  return (str || "")
    .toUpperCase()
    .replace(/İ/g, "I").replace(/Ş/g, "S").replace(/Ğ/g, "G")
    .replace(/Ü/g, "U").replace(/Ö/g, "O").replace(/Ç/g, "C")
    .replace(/[^A-Z0-9 ]/g, " ")
    .trim();
}

function firstKeyword(groupName) {
  const cleaned = normalizeTr(groupName.split(",")[0].split("-")[0]);
  return cleaned.split(" ").filter(Boolean)[0] || "";
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
  const [copiedText, setCopiedText] = useState(null);
  const [rosterTabs, setRosterTabs] = useState([]);
  const [rosterCount, setRosterCount] = useState(null); // number | "-" | null (yükleniyor)

  useEffect(() => {
    (async () => {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Sekmeler yüklenemedi");
        const titles = (json.sheets || []).map(s => s.properties.title).sort((a, b) => a.localeCompare(b, "tr"));
        setTabs(titles);
        if (titles.length > 0) setActiveTab(titles[0]);
      } catch (err) {
        setTabsError(err.message);
      } finally {
        setTabsLoading(false);
      }
    })();

    (async () => {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ROSTER_SHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
        const res = await fetch(url);
        const json = await res.json();
        if (res.ok) {
          setRosterTabs((json.sheets || []).map(s => s.properties.title));
        }
      } catch {
        // roster listesi alınamazsa sessizce geç, kartlarda "-" gösterilir
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

  useEffect(() => {
    if (!activeTab || rosterTabs.length === 0) {
      setRosterCount(null);
      return;
    }
    const keyword = firstKeyword(activeTab);
    const matches = keyword
      ? rosterTabs.filter(t => normalizeTr(t).includes(keyword))
      : [];

    if (matches.length !== 1) {
      setRosterCount("-");
      return;
    }

    (async () => {
      setRosterCount(null); // yükleniyor
      try {
        const range = `'${matches[0]}'`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ROSTER_SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error();
        const values = json.values || [];
        setRosterCount(Math.max(values.length - 1, 0));
      } catch {
        setRosterCount("-");
      }
    })();
  }, [activeTab, rosterTabs]);

  // --- İstatistik hesapla ---
  const genderIdx = findHeaderIndex(headers, GENDER_COLUMN);
  const commentIdx = findHeaderIndex(headers, COMMENT_COLUMN);
  const uniPlanIdx = findHeaderIndex(headers, UNI_PLAN_COLUMN);
  const howReachedIdx = findHeaderIndex(headers, HOW_REACHED_COLUMN);
  const nameIdx = findHeaderIndex(headers, STUDENT_NAME_COLUMN);

  const total = rows.length;

  const genderCounts = {};
  if (genderIdx !== -1) {
    rows.forEach(r => {
      const val = (r[genderIdx] || "").trim();
      if (val) genderCounts[val] = (genderCounts[val] || 0) + 1;
    });
  }

  // Sabit sıralı (5'li skala) sorular
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
    return { question: q, idx, entries: CATEGORY_ORDER.map(c => [c, counts[c]]), answered, found: idx !== -1, colorFor: c => CATEGORY_COLORS[c] };
  });

  // Sayıya göre azalan sıralı, dinamik kategorili sorular (Üniversite Planı + Nasıl Ulaştınız)
  function buildDynamicQuestion(idx, label) {
    const counts = {};
    let answered = 0;
    if (idx !== -1) {
      rows.forEach(r => {
        const val = (r[idx] || "").trim();
        if (val) {
          counts[val] = (counts[val] || 0) + 1;
          answered++;
        }
      });
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const colorFor = (_, i) => DYNAMIC_PALETTE[i % DYNAMIC_PALETTE.length];
    return { question: label, idx, entries, answered, found: idx !== -1, colorFor };
  }

  const uniPlanQ = buildDynamicQuestion(uniPlanIdx, UNI_PLAN_COLUMN);
  const howReachedQ = buildDynamicQuestion(howReachedIdx, HOW_REACHED_COLUMN);

  // Yorumlar: öğrenci adıyla birlikte
  const comments = commentIdx !== -1
    ? rows
        .map(r => ({ name: (r[nameIdx] || "").trim(), text: (r[commentIdx] || "").trim() }))
        .filter(c => c.text)
    : [];

  function openStudentPopup(colIdx, category, questionLabel) {
    if (colIdx === -1 || nameIdx === -1) return;
    const names = rows
      .filter(r => (r[colIdx] || "").trim() === category)
      .map(r => (r[nameIdx] || "").trim())
      .filter(Boolean);
    setStudentPopup({ title: `${questionLabel} — ${category}`, names });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1500);
    } catch {
      // clipboard erişimi yoksa sessizce geç
    }
  }

  function renderQuestionCard(qs) {
    return (
      <div style={styles.questionCard} key={qs.question}>
        <h3 style={styles.questionTitle}>{qs.question}</h3>
        {!qs.found ? (
          <p style={styles.notFoundText}>Bu sütun sheet'te bulunamadı.</p>
        ) : qs.answered === 0 ? (
          <p style={styles.notFoundText}>Cevap yok.</p>
        ) : (
          <div style={styles.barList}>
            {qs.entries.map(([cat, count], i) => {
              const pct = qs.answered > 0 ? Math.round((count / qs.answered) * 100) : 0;
              const isEmpty = count === 0;
              const color = isEmpty ? EMPTY_COLOR : qs.colorFor(cat, i);
              return (
                <div
                  key={cat}
                  onClick={() => count > 0 && openStudentPopup(qs.idx, cat, qs.question)}
                  style={{
                    ...styles.barBox,
                    background: isEmpty ? "#f8fafc" : color + "14",
                    border: isEmpty ? "1px dashed #e2e8f0" : "1px solid transparent",
                    cursor: count > 0 ? "pointer" : "default",
                  }}
                >
                  <div style={{ ...styles.barBoxFill, width: `${pct}%`, background: color }} />
                  <span style={{ ...styles.barBoxLabel, color: isEmpty ? "#94a3b8" : "#1e293b" }}>{cat}</span>
                  <span style={styles.barBoxCount}>{count} · %{pct}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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
            <div style={styles.selectWrap}>
              <label style={styles.selectLabel}>Grup seç</label>
              <select
                value={activeTab || ""}
                onChange={e => setActiveTab(e.target.value)}
                style={styles.select}
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
                    <div style={styles.summaryValue}>{rosterCount === null ? "..." : rosterCount}</div>
                    <div style={styles.summaryLabel}>Grup Sayısı</div>
                  </div>
                  <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{total}</div>
                    <div style={styles.summaryLabel}>Anketi Cevaplayan</div>
                  </div>
                  {Object.entries(genderCounts).map(([g, c]) => (
                    <div style={styles.summaryCard} key={g}>
                      <div style={styles.summaryValue}>{c}</div>
                      <div style={styles.summaryLabel}>{g}</div>
                    </div>
                  ))}
                </div>

                <div style={styles.questionsGrid} className="ar-questions-grid">
                  {howReachedQ.found && renderQuestionCard(howReachedQ)}
                  {questionStats.map(qs => renderQuestionCard(qs))}
                  {uniPlanQ.found && renderQuestionCard(uniPlanQ)}
                </div>

                {comments.length > 0 && (
                  <div style={styles.commentsSection}>
                    <h2 style={styles.commentsTitle}>Yorumlar ({comments.length})</h2>
                    <div style={styles.commentsList}>
                      {comments.map((c, i) => (
                        <div style={styles.commentCard} key={i}>
                          <span style={styles.commentText}>
                            {c.name && <strong style={styles.commentName}>{c.name}: </strong>}
                            {c.text}
                          </span>
                          <button onClick={() => copyText(c.text)} style={styles.copyBtn}>
                            {copiedText === c.text ? "Kopyalandı" : "Kopyala"}
                          </button>
                        </div>
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
                    <button onClick={() => copyText(name)} style={styles.copyBtn}>
                      {copiedText === name ? "Kopyalandı" : "Kopyala"}
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
          .ar-questions-grid { grid-template-columns: 1fr !important; }
          .ar-popup-card { width: 100% !important; max-width: none !important; margin: 0 12px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "1100px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569", fontFamily: "inherit" },
  headerTitleWrap: { display: "flex", alignItems: "center", gap: "8px" },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  versionTag: { fontSize: "11px", fontWeight: "600", color: "#4338ca", background: "#eef2ff", padding: "2px 8px", borderRadius: "6px" },
  main: { maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 64px" },
  stateBox: { padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" },
  errorBox: { padding: "24px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b", fontSize: "13px", lineHeight: 1.6 },
  selectWrap: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "28px", width: "100%" },
  selectLabel: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  select: { padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", fontSize: "14px", fontWeight: "600", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", width: "100%" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "32px" },
  summaryCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", textAlign: "center" },
  summaryValue: { fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  summaryLabel: { fontSize: "12px", color: "#94a3b8", marginTop: "4px" },
  questionsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" },
  questionCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px 24px" },
  questionTitle: { fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" },
  notFoundText: { fontSize: "13px", color: "#94a3b8" },
  barList: { display: "flex", flexDirection: "column", gap: "6px" },
  barBox: { position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", height: "34px", borderRadius: "8px", padding: "0 12px", overflow: "hidden" },
  barBoxFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: "8px", opacity: 0.28, transition: "width 0.3s ease", zIndex: 0 },
  barBoxLabel: { position: "relative", zIndex: 1, fontSize: "12.5px", fontWeight: "600" },
  barBoxCount: { position: "relative", zIndex: 1, fontSize: "12px", color: "#64748b", flexShrink: 0 },
  commentsSection: { marginTop: "40px" },
  commentsTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" },
  commentsList: { display: "flex", flexDirection: "column", gap: "10px" },
  commentCard: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px" },
  commentText: { fontSize: "13px", color: "#334155", lineHeight: 1.6, flex: 1 },
  commentName: { color: "#0f172a" },
  copyBtn: { flexShrink: 0, padding: "5px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#4338ca", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  popupOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  popupCard: { background: "#fff", borderRadius: "20px", padding: "24px", maxWidth: "420px", width: "100%", maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  popupHeader: { marginBottom: "16px" },
  popupTitle: { fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" },
  popupCount: { fontSize: "12px", color: "#94a3b8" },
  popupList: { overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  popupNameRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" },
  popupName: { fontSize: "13px", color: "#334155", fontWeight: "500" },
  popupCloseBtn: { width: "100%", padding: "10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#64748b", fontFamily: "inherit" },
};
