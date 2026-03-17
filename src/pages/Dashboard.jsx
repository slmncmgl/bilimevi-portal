import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../utils/sheets";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwueCJrClXEVORShyqVCJ-Qo8hA4Qv0w5VP1ub-S7nPJLEdponzpKRepdEfUEW9Nfev/exec";

const MODULE_CONFIG = [
  {
    key: "izin",
    title: "İK İzin Yönetimi",
    desc: "İzin talepleri ve personel takibi",
    path: "/izin",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
      </svg>
    ),
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  {
    key: "instagram",
    title: "Instagram DM",
    desc: "DM analizi ve CRM aktarımı",
    path: "/instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
    color: "#db2777",
    bg: "#fdf2f8",
    border: "#fbcfe8",
  },
  {
    key: "quiz",
    title: "Sınav Cevapları",
    desc: "Sınav sonuçları ve raporlama",
    path: "/sinav-cevaplari",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
  },
  {
    key: "bulten",
    title: "Bülten Düzenleyici",
    desc: "E-bülten içerik üretimi",
    path: "/bulten",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  {
    key: "stm",
    title: "STM",
    desc: "Satış ve takip modülü",
    path: "/stm",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
      </svg>
    ),
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());
  const [sozlesmeLoading, setSozlesmeLoading] = useState(false);
  const [sozlesmeHata, setSozlesmeHata] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
    const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
  }, []);

  async function sozlesmeAc() {
    setSozlesmeLoading(true);
    setSozlesmeHata(null);
    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "danismanSozlesmeBul",
          sirket: user.company,
          sube: user.branch,
          ad: user.name
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.msg || "Hata");
      window.open(json.url, "_blank");
    } catch (err) {
      setSozlesmeHata(err.message);
      // IT'ye hata maili gönder
      fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "sozlesmeHataMailAt",
          kullanici: user.name,
          sirket: user.company,
          sube: user.branch,
          hata: err.message
        })
      }).catch(() => {});
    }
    setSozlesmeLoading(false);
  }

  function logout() {
    clearSession();
    navigate("/");
  }

  const allowedModules = MODULE_CONFIG.filter(m => user?.modules?.[m.key]);
  const greeting = time.getHours() < 12 ? "Günaydın" : time.getHours() < 18 ? "İyi günler" : "İyi akşamlar";

  if (!user) return null;

  return (
    <div style={styles.root}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner} className="dash-header-inner">
          <img
            src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg"
            alt="Bilimevi"
            style={styles.headerLogo}
          />
          <div style={styles.headerRight} className="dash-header-right">
            {["admin", "owner", "director", "manager"].includes(user.rol) && (
              <button onClick={() => navigate("/izin?panel=admin")}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", whiteSpace: "nowrap" }}
                onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
                onMouseLeave={e => e.currentTarget.style.background = "#1e3a5f"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Yönetici Paneli
              </button>
            )}
            {user?.modules?.sozlesme && (
              <button onClick={sozlesmeAc} disabled={sozlesmeLoading}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: sozlesmeLoading ? "#64748b" : "#d97706", color: "#fff", border: "none", borderRadius: "8px", cursor: sozlesmeLoading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", whiteSpace: "nowrap" }}
                onMouseEnter={e => { if (!sozlesmeLoading) e.currentTarget.style.background = "#b45309"; }}
                onMouseLeave={e => { if (!sozlesmeLoading) e.currentTarget.style.background = "#d97706"; }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {sozlesmeLoading ? "Açılıyor..." : "Sözleşmem"}
              </button>
            )}
            <div style={styles.userInfo}>
              <div style={styles.avatar}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={styles.userName} className="dash-user-name">{user.name}</div>
                <div style={styles.userMeta} className="dash-user-meta">{user.company} · {user.branch}</div>
              </div>
            </div>
            <button onClick={logout} style={styles.logoutBtn}
              onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={styles.main} className="dash-main">
        <div style={styles.greeting}>
          <h1 style={styles.greetingTitle} className="dash-greeting-title">
            {greeting}, <span style={styles.greetingName}>{user.name?.split(" ")[0]}</span> 👋
          </h1>
          <p style={styles.greetingDate}>
            {time.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {allowedModules.length === 0 ? (
          <div style={styles.emptyState}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" width="48" height="48">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Henüz erişim izniniz bulunmuyor.</p>
            <span>Yöneticinizle iletişime geçin.</span>
          </div>
        ) : (
          <div className="dash-grid" style={{
            ...styles.grid,
            gridTemplateColumns: allowedModules.length === 1 ? "1fr" :
                                 allowedModules.length === 2 ? "repeat(2, 1fr)" :
                                 "repeat(2, 1fr)",
          }}>
            {allowedModules.map((mod, i) => (
              <button
                key={mod.key}
                onClick={() => navigate(mod.path)}
                className="dash-module-card" style={{
                  ...styles.moduleCard,
                  animationDelay: `${i * 0.08}s`,
                  "--hover-border": mod.color,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = mod.color + "66";
                  e.currentTarget.style.boxShadow = `0 20px 40px -12px ${mod.color}22`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                }}
              >
                <div className="dash-module-icon" style={{ ...styles.moduleIcon, background: mod.bg, color: mod.color, border: `1px solid ${mod.border}` }}>
                  {mod.icon}
                </div>
                <div style={styles.moduleContent}>
                  <h3 style={styles.moduleTitle}>{mod.title}</h3>
                  <p style={styles.moduleDesc}>{mod.desc}</p>
                </div>
                <div style={{ ...styles.moduleArrow, color: mod.color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}


      </main>


      {/* Danışman Sözleşme Popup */}
      {sozlesmeHata && (
        <div onClick={() => setSozlesmeHata(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Bir hata oluştu</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px", lineHeight: 1.6 }}>{sozlesmeHata}</p>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "20px" }}>IT ekibine bildirim gönderildi.</p>
            <button onClick={() => setSozlesmeHata(null)}
              style={{ width: "100%", padding: "10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#64748b", fontFamily: "inherit" }}>
              Kapat
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .dash-header-inner { padding: 12px 16px !important; flex-wrap: wrap; gap: 8px; }
          .dash-user-name { display: none !important; }
          .dash-user-meta { display: none !important; }
          .dash-greeting-title { font-size: 22px !important; }
          .dash-main { padding: 20px 12px 48px !important; }
          .dash-grid { grid-template-columns: 1fr !important; }
          .dash-module-card { padding: 16px !important; gap: 12px !important; }
          .dash-module-icon { width: 44px !important; height: 44px !important; border-radius: 10px !important; }
          .dash-module-icon svg { width: 22px !important; height: 22px !important; }
          .dash-header-right { gap: 6px !important; flex-wrap: wrap; }
          .dash-header-right button { padding: 6px 10px !important; font-size: 11px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Sora', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    zIndex: 0,
  },
  bgGlow: {
    position: "fixed",
    top: "-10%",
    right: "-5%",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, #dbeafe44 0%, transparent 70%)",
    zIndex: 0,
  },
  header: {
    position: "sticky",
    top: 0,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e2e8f0",
    zIndex: 10,
  },
  headerInner: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: {
    height: "32px",
    objectFit: "contain",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "700",
    flexShrink: 0,
  },
  userName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
  },
  userMeta: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    background: "transparent",
    color: "#dc2626",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
    fontFamily: "'Sora', sans-serif",
  },
  main: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "48px 24px 64px",
    position: "relative",
    zIndex: 1,
  },
  greeting: {
    marginBottom: "40px",
    animation: "fadeUp 0.5s ease-out",
  },
  greetingTitle: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.8px",
    marginBottom: "6px",
  },
  greetingName: {
    color: "#2563eb",
  },
  greetingDate: {
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "400",
  },
  grid: {
    display: "grid",
    gap: "16px",
  },
  moduleCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "20px",
    padding: "24px 28px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    animation: "fadeUp 0.5s ease-out both",
    fontFamily: "'Sora', sans-serif",
    width: "100%",
  },
  moduleIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "4px",
    letterSpacing: "-0.3px",
  },
  moduleDesc: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "400",
  },
  moduleArrow: {
    flexShrink: 0,
    opacity: 0.4,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "80px 40px",
    background: "#fff",
    borderRadius: "20px",
    border: "1.5px solid #e2e8f0",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "16px",
  },
};
