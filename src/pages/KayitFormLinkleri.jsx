import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const VERSION = "v1.0";
const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const SHEET_NAME = "Aktif Linkler";

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
              <div style={styles.list}>
                {filtered.map((link, i) => (
                  <div style={styles.row} className="kfl-row" key={i}>
                    <span style={styles.title}>{link.title}</span>
                    <button onClick={() => copyUrl(link.url)} style={styles.copyBtn} className="kfl-copy-btn">
                      {copiedUrl === link.url ? "Kopyalandı" : "Linki Kopyala"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          .kfl-header-inner { padding: 12px 16px !important; }
          .kfl-main { padding: 20px 12px 48px !important; }
          .kfl-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .kfl-copy-btn { width: 100% !important; }
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
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", background: "#eff6fc", border: "1.5px solid #cfe1f2", borderRadius: "12px", padding: "16px 20px" },
  title: { fontSize: "14px", fontWeight: "600", color: "#0f172a", lineHeight: 1.5 },
  copyBtn: { flexShrink: 0, padding: "9px 16px", borderRadius: "8px", border: "1.5px solid #bcd6ee", background: "#fff", color: "#2e6da4", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
};
