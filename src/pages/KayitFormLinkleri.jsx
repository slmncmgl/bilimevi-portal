import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const VERSION = "v1.3";
const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const SHEET_NAME = "Aktif Linkler";

// Öğrenci formlarına sırayla atanan pastel renk paleti (liste uzarsa başa döner)
const ROW_PALETTE = [
  { bg: "#f0fdf9", border: "#c3ece0", text: "#0f766e" }, // yeşil-teal
  { bg: "#fff8ed", border: "#fae0bd", text: "#b45309" }, // amber
  { bg: "#f4f6fd", border: "#d9dff5", text: "#4338ca" }, // indigo
];

// Danışman formu için sabit mavi
const ADVISOR_COLOR = { bg: "#eff6fc", border: "#cfe1f2", text: "#2e6da4" };

// "Öğrenci Formları" grubunda, bu sırayla üstte kalacak formlar
const STUDENT_FORM_TITLES = [
  "Grup Yaz Okulu Bilgi Formu",
  "Bireysel Yaz Okulu Bilgi Formu",
  "Yetişkin Dil Okulu Bilgi Formu",
];

function norm(s) {
  return (s || "").trim().toLocaleLowerCase("tr-TR");
}

// Tırnak içindeki virgülleri koruyan CSV ayrıştırıcı
function parseCSV(csv) {
  const rows = [];
  let row = [], field = "", inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch !== "\r") field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export default function KayitFormLinkleri() {
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [search, setSearch] = useState("");
  const [showUsage, setShowUsage] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }

    (async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Sheet okunamadı");
        const csv = await res.text();
        const rows = parseCSV(csv);
        if (rows.length === 0) { setLinks([]); return; }

        const headers = rows[0].map(h => h.trim());
        const titleIdx = headers.findIndex(h => h.toLocaleLowerCase("tr-TR") === "başlık");
        const urlIdx = headers.findIndex(h => h.toLocaleLowerCase("tr-TR") === "url");

        if (titleIdx === -1 || urlIdx === -1) {
          throw new Error("'Başlık' veya 'URL' sütunu bulunamadı");
        }

        const parsed = rows.slice(1)
          .map(r => ({ title: (r[titleIdx] || "").trim(), url: (r[urlIdx] || "").trim() }))
          .filter(l => l.title && l.url);

        setLinks(parsed);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1500);
    } catch {
      // clipboard erişimi yoksa sessizce geç
    }
  }

  const filtered = search.trim()
    ? links.filter(l => l.title.toLocaleLowerCase("tr-TR").includes(search.trim().toLocaleLowerCase("tr-TR")))
    : links;

  const advisorLinks = filtered.filter(l => norm(l.title).includes("danışman"));

  const nonAdvisor = filtered.filter(l => !norm(l.title).includes("danışman"));

  // Sabit üç form, STUDENT_FORM_TITLES sırasıyla üstte
  const studentLinks = STUDENT_FORM_TITLES
    .map(t => nonAdvisor.find(l => norm(l.title) === norm(t)))
    .filter(Boolean);

  // Geri kalan her şey okul kayıt formları
  const schoolLinks = nonAdvisor.filter(l => !studentLinks.includes(l));

  function renderRow(link, colors, withOpenBtn) {
    return (
      <div
        style={{ ...styles.row, background: colors.bg, borderColor: colors.border }}
        className="kfl-row"
        key={link.title + link.url}
      >
        <span style={styles.title}>{link.title}</span>
        <div style={styles.btnGroup} className="kfl-btn-group">
          {withOpenBtn && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.copyBtn, background: colors.text, color: "#fff", borderColor: colors.text, textDecoration: "none", display: "inline-block" }}
              className="kfl-copy-btn"
            >
              Formu Aç
            </a>
          )}
          <button
            onClick={() => copyUrl(link.url)}
            style={{ ...styles.copyBtn, color: colors.text, borderColor: colors.border }}
            className="kfl-copy-btn"
          >
            {copiedUrl === link.url ? "Kopyalandı" : "Linki Kopyala"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerInner} className="kfl-header-inner">
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Dashboard
          </button>
          <div style={styles.headerTitleWrap}>
            <h1 style={styles.headerTitle}>Kayıt Form Linkleri</h1>
            <span style={styles.versionTag}>{VERSION}</span>
          </div>
        </div>
      </header>

      <main style={styles.main} className="kfl-main">
        {loading ? (
          <div style={styles.stateBox}>Linkler yükleniyor...</div>
        ) : error ? (
          <div style={styles.errorBox}>
            <strong>Linkler yüklenemedi.</strong>
            <p>{error}</p>
          </div>
        ) : links.length === 0 ? (
          <div style={styles.stateBox}>Henüz aktif link bulunmuyor.</div>
        ) : (
          <>
            <button onClick={() => setShowUsage(true)} style={styles.usageBtn} className="kfl-usage-btn">
              Linklerin kullanımı
            </button>

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Link ara..."
              style={styles.searchInput}
            />
            <div style={styles.countText}>{filtered.length} link</div>

            {filtered.length === 0 ? (
              <div style={styles.stateBox}>Aramanıza uygun link bulunamadı.</div>
            ) : (
              <>
                {advisorLinks.length > 0 && (
                  <div style={styles.list}>
                    {advisorLinks.map(link => renderRow(link, ADVISOR_COLOR, true))}
                  </div>
                )}

                {studentLinks.length > 0 && (
                  <>
                    <h2 style={styles.groupTitle}>Öğrenci Formları</h2>
                    <div style={styles.list}>
                      {studentLinks.map((link, i) => renderRow(link, ROW_PALETTE[i % ROW_PALETTE.length], false))}
                    </div>
                  </>
                )}

                {schoolLinks.length > 0 && (
                  <>
                    <h2 style={styles.groupTitle}>Okul Kayıt Formları</h2>
                    <div style={styles.list}>
                      {schoolLinks.map((link, i) => renderRow(link, ROW_PALETTE[(i + studentLinks.length) % ROW_PALETTE.length], false))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      {showUsage && (
        <div onClick={() => setShowUsage(false)} style={styles.popupOverlay}>
          <div onClick={e => e.stopPropagation()} style={styles.popupCard} className="kfl-popup-card">
            <h3 style={styles.popupTitle}>Linklerin kullanım sırası</h3>

            <div style={styles.stepList}>
              <div style={styles.step}>
                <span style={styles.stepNum}>1</span>
                <div>
                  <strong style={styles.stepTitle}>Öğrenci formu</strong>
                  <p style={styles.stepText}>Öncelikle öğrenci/veli ile ilgili kayıt formu paylaşılır ve doldurması sağlanır.</p>
                </div>
              </div>

              <div style={styles.step}>
                <span style={styles.stepNum}>2</span>
                <div>
                  <strong style={styles.stepTitle}>Danışman formu</strong>
                  <p style={styles.stepText}>Öğrencinin formu tamamlandıktan sonra danışman kendi sözleşme gönderme formunu doldurur.</p>
                </div>
              </div>

              <div style={styles.step}>
                <span style={styles.stepNum}>3</span>
                <div>
                  <strong style={styles.stepTitle}>Otomatik gönderim</strong>
                  <p style={styles.stepText}>Bu iki adım tamamlandığında dijital sözleşme onay linki öğrenci/veliye e-posta ve WhatsApp üzerinden otomatik olarak iletilir.</p>
                </div>
              </div>
            </div>

            <p style={styles.popupWarning}>
              Sıralamaya dikkat edilmesi önemlidir; danışman formu, öğrenci formu doldurulmadan gönderilirse sözleşme oluşturulamaz.
            </p>

            <button onClick={() => setShowUsage(false)} style={styles.popupCloseBtn}>Tamam</button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes kflPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .kfl-usage-btn { animation: kflPulse 1.8s ease-in-out infinite; }
        .kfl-usage-btn:hover { animation: none; }
        @media (prefers-reduced-motion: reduce) {
          .kfl-usage-btn { animation: none; }
        }
        @media (max-width: 640px) {
          .kfl-header-inner { padding: 12px 16px !important; }
          .kfl-main { padding: 20px 12px 48px !important; }
          .kfl-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .kfl-btn-group { flex-direction: column !important; }
          .kfl-copy-btn { width: 100% !important; text-align: center !important; }
          .kfl-popup-card { margin: 0 12px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "820px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569", fontFamily: "inherit" },
  headerTitleWrap: { display: "flex", alignItems: "center", gap: "8px" },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  versionTag: { fontSize: "11px", fontWeight: "600", color: "#0d9488", background: "#f0fdfa", padding: "2px 8px", borderRadius: "6px" },
  main: { maxWidth: "820px", margin: "0 auto", padding: "32px 24px 64px" },
  stateBox: { padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" },
  errorBox: { padding: "24px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b", fontSize: "13px", lineHeight: 1.6 },
  searchInput: { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", fontSize: "14px", color: "#0f172a", fontFamily: "inherit", marginBottom: "10px" },
  countText: { fontSize: "12px", color: "#94a3b8", fontWeight: "600", marginBottom: "16px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", border: "1.5px solid", borderRadius: "12px", padding: "16px 20px" },
  title: { fontSize: "14px", fontWeight: "600", color: "#0f172a", lineHeight: 1.5 },
  copyBtn: { flexShrink: 0, padding: "9px 16px", borderRadius: "8px", border: "1.5px solid", background: "#fff", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  btnGroup: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  groupTitle: { fontSize: "13px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", margin: "28px 0 12px" },
  usageBtn: { width: "100%", padding: "13px", marginBottom: "18px", background: "#0d9488", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13.5px", fontWeight: "700", fontFamily: "inherit" },
  popupOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  popupCard: { background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "460px", width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  popupTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "20px" },
  stepList: { display: "flex", flexDirection: "column", gap: "18px" },
  step: { display: "flex", gap: "12px", alignItems: "flex-start" },
  stepNum: { flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", background: "#0d9488", color: "#fff", fontSize: "12.5px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: "13.5px", fontWeight: "700", color: "#0f172a", display: "block", marginBottom: "3px" },
  stepText: { fontSize: "13px", color: "#475569", lineHeight: 1.6 },
  popupWarning: { fontSize: "12.5px", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "11px 14px", margin: "20px 0", lineHeight: 1.6 },
  popupCloseBtn: { width: "100%", padding: "11px", background: "#0d9488", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "700", fontFamily: "inherit" },
};
