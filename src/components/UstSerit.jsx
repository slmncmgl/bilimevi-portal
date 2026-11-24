// v1.3: v1.2'de yanlışlıkla silinen kartAdi geri kondu (beyaz ekran).
// v1.2: Genişlik her sayfada sabit, Doldurulan Kayıt Formları ile aynı (SERIT_GENISLIK); ölçme kaldırıldı.
//   En sağdaki düğme: ana sayfada metin görünümlü Çıkış, kartlarda ← Geri (geçmiş varsa bir önceki sayfa, yoksa ana sayfa).
// v1.1: Şeridin içi sayfanın içerik sütunuyla hizalanır (hizaBul: ilk geniş, maxWidth'li kutu); kart adının yanında
//   isteğe bağlı açıklama (ALT_METIN).
// v1.0 (24.11.2026): Tüm sayfalarda ortak üst şerit (App.jsx). Eskiden sadece Dashboard'daydı (Dashboard v1.20'ye kadar).
// Solda logo (tıklayınca ana sayfa) ve açık kartın adı; sağda çevrimiçi etiketi + el sallama, Yönetici Paneli (yönetici rolleri),
// sayfaya özel ek alan (#ust-serit-ek: Dashboard sürükle-bırak ipucunu buraya basar), kullanıcı ve Çıkış.
// Giriş ekranında, Google dönüşünde, Test Giriş sekmesinde ve oturum yokken görünmez.
// Sayfalar kendi üst şeritlerinde logo / "Ana Sayfa" / kart adı tekrarı yapmaz; sticky başlıkları UST_SERIT_YUKSEKLIK altına yapışır.
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../utils/sheets";
import { nabizGonder, cevrimiciDurum, durt, durtmeDinle } from "../lib/cevrimici";
import { MODULE_CONFIG } from "../pages/Dashboard";

export const UST_SERIT_YUKSEKLIK = 65;
const GIZLI_ADRESLER = ["/", "/auth/callback", "/test-giris"];
const EK_ADLAR = {
  "/test-login": ["Test Login", "Test Login"],
  "/kylas-baglantilari": ["Kylas Bağlantıları", "Kylas Connections"],
};
const YONETICI = ["admin", "owner", "director", "manager"];
// Kart adının yanında soluk açıklama (sayfada ayrıca başlık satırı açmamak için)
const ALT_METIN = {
  "/crm": ["Aktivite, performans ve data tabloları, sınav sonuçları", "Activity, performance and data tables, quiz results"],
};

// KayitGuncelle.jsx'teki headerInner/main ile aynı genişlik ve iç boşluk
const SERIT_GENISLIK = "max(min(92vw, 1100px), min(100vw, 768px))";

function kartAdi(yol, arama, isFortis) {
  if (yol === "/izin" && new URLSearchParams(arama).get("panel") === "admin") return isFortis ? "Admin Panel" : "Yönetici Paneli";
  const m = MODULE_CONFIG.find(x => x.path === yol);
  if (m) return isFortis ? (m.titleEn || m.title) : m.title;
  const ek = EK_ADLAR[yol];
  return ek ? ek[isFortis ? 1 : 0] : "";
}

export default function UstSerit() {
  const konum = useLocation();
  const navigate = useNavigate();
  if (GIZLI_ADRESLER.includes(konum.pathname)) return null;
  const user = getSession();
  if (!user) return null;
  const isFortis = user.company === "Fortis";
  const ad = kartAdi(konum.pathname, konum.search, isFortis);
  const alt = ALT_METIN[konum.pathname]?.[isFortis ? 1 : 0];

  const anaSayfa = konum.pathname === "/dashboard";

  function cikis() {
    clearSession();
    navigate("/");
  }

  // Uygulama içinden gelindiyse bir önceki sayfa, doğrudan açıldıysa ana sayfa
  function geri() {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/dashboard");
  }

  return (
    <header className="ust-serit" style={{ position: "sticky", top: 0, zIndex: 900, height: `${UST_SERIT_YUKSEKLIK}px`, boxSizing: "border-box", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="ust-serit-ic" style={{ maxWidth: SERIT_GENISLIK, margin: "0 auto", padding: "0 20px", height: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          <img src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg" alt="Bilimevi"
            onClick={() => navigate("/dashboard")} title={isFortis ? "Home" : "Ana sayfa"}
            style={{ height: "32px", objectFit: "contain", cursor: "pointer", flexShrink: 0 }} />
          {ad && (
            <>
              <span style={{ width: "1px", height: "26px", background: "#e2e8f0", flexShrink: 0 }} />
              <span className="ust-serit-kart" style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ad}</span>
              {alt && <span className="ust-serit-alt" style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{alt}</span>}
            </>
          )}
        </div>
        <div className="ust-serit-sag" style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
          <CevrimiciEtiket isFortis={isFortis} />
          {YONETICI.includes(user.rol) && !(konum.pathname === "/izin" && konum.search.includes("panel=admin")) && (
            <button onClick={() => navigate("/izin?panel=admin")}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
              onMouseLeave={e => e.currentTarget.style.background = "#1e3a5f"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              {isFortis ? "Admin Panel" : "Yönetici Paneli"}
            </button>
          )}
          <div id="ust-serit-ek" style={{ display: "contents" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", flexShrink: 0 }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ust-serit-kullanici">
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{user.company} · {user.branch}</div>
            </div>
          </div>
          {anaSayfa ? (
            <button onClick={cikis} className="ust-serit-cikis"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 2px", border: "none", background: "transparent", color: "#dc2626", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {isFortis ? "Logout" : "Çıkış"}
            </button>
          ) : (
            <button onClick={geri}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", color: "#334155", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "background 0.2s", fontFamily: "inherit", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              {isFortis ? "Back" : "Geri"}
            </button>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) {
          .ust-serit-ic { padding: 0 12px !important; gap: 8px !important; }
          .ust-serit-kullanici { display: none !important; }
          .ust-serit-sag { gap: 8px !important; }
          .ust-serit-sag button { padding: 6px 10px !important; font-size: 11px !important; }
        }
        @media (max-width: 1100px) { .ust-serit-alt { display: none !important; } }
        @media (max-width: 520px) { .ust-serit-kart { display: none !important; } }
      `}</style>
    </header>
  );
}

// Üst şeritteki "N kişi çevrimiçi" etiketi. Açılışta hemen bir nabız gönderir, sonra main.jsx'teki 1 dk'lık nabzı dinler.
// Tıklayınca altında isim listesi açılır; isme gelince 👋 balonu çıkar, tıklayınca o kişiye el sallanır (dürtme).
function CevrimiciEtiket({ isFortis }) {
  const [durum, setDurum] = useState(cevrimiciDurum());
  const [acik, setAcik] = useState(false);
  const [uzerinde, setUzerinde] = useState(null);
  const [gonderilen, setGonderilen] = useState({}); // id -> "gidiyor" | "tamam"
  const kutuRef = useRef(null);
  useEffect(() => {
    const dinle = e => setDurum(e.detail);
    window.addEventListener("bilimevi-cevrimici", dinle);
    durtmeDinle(true);
    nabizGonder();
    return () => { window.removeEventListener("bilimevi-cevrimici", dinle); durtmeDinle(false); };
  }, []);
  useEffect(() => {
    if (!acik) return;
    const disari = e => { if (kutuRef.current && !kutuRef.current.contains(e.target)) setAcik(false); };
    document.addEventListener("pointerdown", disari);
    return () => document.removeEventListener("pointerdown", disari);
  }, [acik]);
  async function elSalla(id) {
    if (gonderilen[id]) return;
    setGonderilen(g => ({ ...g, [id]: "gidiyor" }));
    await durt(id);
    setGonderilen(g => ({ ...g, [id]: "tamam" }));
    setTimeout(() => setGonderilen(g => { const y = { ...g }; delete y[id]; return y; }), 2500);
  }
  const sayi = durum?.sayi;
  if (!sayi) return null;
  const liste = (durum.liste || []).map(x => (typeof x === "string" ? { id: null, ad: x } : x));
  return (
    <div ref={kutuRef} style={{ position: "relative" }}>
    <button type="button" onClick={() => setAcik(a => !a)} title={isFortis ? "Active in the last few minutes" : "Son birkaç dakikada portalda olanlar"}
      style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 11px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "100px", fontSize: "12px", fontWeight: "600", color: "#047857", whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
      <span className="cevrimici-nokta" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 0 rgba(16,185,129,0.5)", animation: "cevrimiciNabiz 2s ease-out infinite" }} />
      {isFortis ? `${sayi} online` : `${sayi} kişi çevrimiçi`}
    </button>
    <DurtmeBildirim isFortis={isFortis} />
    {acik && (
      <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, minWidth: "230px", maxHeight: "340px", overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 30px rgba(15,23,42,0.12)", padding: "8px" }}>
        {liste.map((k, i) => {
          const ben = k.id && k.id === durum.ben;
          const salla = k.id && !ben;
          const hal = gonderilen[k.id];
          return (
            <div key={`${k.id || k.ad}-${i}`}
              onMouseEnter={() => setUzerinde(k.id)} onMouseLeave={() => setUzerinde(null)}
              onClick={() => salla && elSalla(k.id)}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", fontSize: "13px", color: "#0f172a", whiteSpace: "nowrap", borderRadius: "8px", cursor: salla ? "pointer" : "default", background: salla && uzerinde === k.id ? "#f0fdf4" : "transparent" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{k.ad}{ben && <span style={{ color: "#94a3b8" }}> {isFortis ? "(you)" : "(sen)"}</span>}</span>
              {salla && (
                <span title={hal === "tamam" ? (isFortis ? "Sent!" : "Gitti!") : (isFortis ? "Wave" : "El salla")}
                  className={hal || uzerinde === k.id ? "cevrimici-el" : undefined}
                  style={{ display: "inline-block", width: "16px", height: "16px", lineHeight: "16px", fontSize: "14px", textAlign: "center", transformOrigin: "70% 70%", visibility: hal || uzerinde === k.id ? "visible" : "hidden", opacity: hal === "tamam" ? 0.45 : 1, animation: hal === "tamam" ? "none" : "cevrimiciEl 1.2s ease-in-out infinite" }}>
                  {hal === "tamam" ? "✓" : "👋"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    )}
      <style>{`@keyframes cevrimiciNabiz { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
        @keyframes cevrimiciEl { 0%, 60%, 100% { transform: rotate(0deg); } 10%, 30% { transform: rotate(14deg); } 20% { transform: rotate(-8deg); } 40% { transform: rotate(-4deg); } 50% { transform: rotate(10deg); } }
        @keyframes durtmeGel { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .cevrimici-nokta, .cevrimici-el { animation: none !important; } }`}</style>
    </div>
  );
}

// Gelen dürtmeler: çevrimiçi etiketinin altında balon "👋 X sana el salladı", 7 sn sonra kaybolur
function DurtmeBildirim({ isFortis }) {
  const [bildirimler, setBildirimler] = useState([]);
  useEffect(() => {
    const dinle = e => {
      const yeni = e.detail.map(kimden => ({ id: Math.random().toString(36).slice(2), kimden }));
      setBildirimler(b => [...b, ...yeni]);
      yeni.forEach(y => setTimeout(() => setBildirimler(b => b.filter(x => x.id !== y.id)), 7000));
    };
    window.addEventListener("bilimevi-durtme", dinle);
    return () => window.removeEventListener("bilimevi-durtme", dinle);
  }, []);
  if (!bildirimler.length) return null;
  return (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60, display: "flex", flexDirection: "column", gap: "8px", width: "max-content", maxWidth: "calc(100vw - 32px)" }}>
      {bildirimler.map(b => (
        <div key={b.id} onClick={() => setBildirimler(x => x.filter(y => y.id !== b.id))}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "#fff", border: "1px solid #fde68a", borderRadius: "14px", boxShadow: "0 10px 30px rgba(15,23,42,0.15)", fontSize: "14px", color: "#0f172a", cursor: "pointer", animation: "durtmeGel 0.3s ease-out" }}>
          <span className="cevrimici-el" style={{ display: "inline-block", fontSize: "26px", transformOrigin: "70% 70%", animation: "cevrimiciEl 1.2s ease-in-out 3" }}>👋</span>
          <span><b>{b.kimden}</b> {isFortis ? "waved at you!" : "sana el salladı!"}</span>
        </div>
      ))}
    </div>
  );
}
