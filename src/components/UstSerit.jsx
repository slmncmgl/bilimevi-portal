// v1.11: Giriş saatleri: haftalık yoğunluk çubuk grafiği kalktı, sadece gün × saat ızgarası
// v1.10: Giriş saatleri: yorumlar kalktı; haftalık giriş yoğunluğu (gün bazında çubuk) + gün × saat sıcaklık haritası (Pzt-Paz, son 4 hafta, ısınan renk, hover)
// v1.9: "Giriş saatleri" ortada açılan pencerede: saatlik ortalama çubuk grafiği + ısı haritası + yorum
// v1.8: yöneticiler çevrimiçi listesinin altında "Giriş saatleri" ısı haritası açabilir (son 14 gün × 24 saat + kısa yorum)
// v1.7: standart sayfa genişliği 1100px (tüm sayfalar aynı)
// v1.6: genişlik her sayfada ana sayfayla aynı (900px); kart adı ve açıklaması yazılmaz; Geri düğmesi koyu ve belirgin
// v1.5: ana sayfada kenar boşluğu %25
// v1.4: Genişlik yüzdeyle: kartlarda kenarlardan %5, ana sayfada %15 içeride. Ana sayfa tespiti sondaki "/" ve büyük harfe dayanıklı;
//   kart adı olmayan sayfada da Geri yerine Çıkış.
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
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../utils/sheets";
import { nabizGonder, cevrimiciDurum, durt, durtmeDinle, isiIste } from "../lib/cevrimici";
import { MODULE_CONFIG } from "../pages/Dashboard";

export const UST_SERIT_YUKSEKLIK = 65;
const GIZLI_ADRESLER = ["/", "/auth/callback", "/test-giris"];
const EK_ADLAR = {
  "/test-login": ["Test Login", "Test Login"],
  "/kylas-baglantilari": ["Kylas Bağlantıları", "Kylas Connections"],
};
const YONETICI = ["admin", "owner", "director", "manager"];

// Ana sayfada şerit kart ızgarasıyla aynı hizada: Dashboard main maxWidth 900 + 24px iç boşluk (v1.6)
const ANA_SAYFA_GENISLIK = "1100px";
const ANA_SAYFA_KENAR = "24px";

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

  const anaSayfa = konum.pathname.replace(/\/+$/, "").toLowerCase() === "/dashboard";
  const cikisGoster = anaSayfa || !ad;

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
      <div className="ust-serit-ic" style={{ padding: `0 ${ANA_SAYFA_KENAR}`, maxWidth: ANA_SAYFA_GENISLIK, margin: "0 auto", height: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          <img src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg" alt="Bilimevi"
            onClick={() => navigate("/dashboard")} title={isFortis ? "Home" : "Ana sayfa"}
            style={{ height: "34px", objectFit: "contain", cursor: "pointer", flexShrink: 0 }} />
        </div>
        <div className="ust-serit-sag" style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
          <CevrimiciEtiket isFortis={isFortis} yonetici={YONETICI.includes(user.rol)} />
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
          {cikisGoster ? (
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
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "8px", background: "var(--marka)", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "background 0.2s", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(8,145,178,0.35)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--marka-koyu)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--marka)"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
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

// Üst şeritteki "N kişi çevrimiçi" etiketi. Durum main.jsx'te açılan WebSocket bağlantısından anında gelir.
// Tıklayınca altında isim listesi açılır; isme gelince 👋 balonu çıkar, tıklayınca o kişiye el sallanır (dürtme).
function CevrimiciEtiket({ isFortis, yonetici }) {
  const [isiAcik, setIsiAcik] = useState(false);
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
    {isiAcik && <IsiPenceresi isFortis={isFortis} onKapat={() => setIsiAcik(false)} />}
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
                  {hal === "tamam" ? "✓" : "👋🏻"}
                </span>
              )}
            </div>
          );
        })}
        {yonetici && (
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "6px", paddingTop: "6px" }}>
            <button type="button" onClick={() => { setIsiAcik(true); setAcik(false); }}
              style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "6px 8px", border: "none", borderRadius: "8px", background: "transparent", color: "#047857", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="5" height="5" rx="1" opacity=".35"/><rect x="10" y="3" width="5" height="5" rx="1"/><rect x="17" y="3" width="4" height="5" rx="1" opacity=".6"/>
                <rect x="3" y="10" width="5" height="5" rx="1"/><rect x="10" y="10" width="5" height="5" rx="1" opacity=".6"/><rect x="17" y="10" width="4" height="5" rx="1" opacity=".35"/>
                <rect x="3" y="17" width="5" height="4" rx="1" opacity=".6"/><rect x="10" y="17" width="5" height="4" rx="1" opacity=".35"/><rect x="17" y="17" width="4" height="4" rx="1"/>
              </svg>
              <span style={{ flex: 1 }}>{isFortis ? "Login hours" : "Giriş saatleri"}</span>
              <span style={{ color: "#94a3b8" }}>›</span>
            </button>
          </div>
        )}
      </div>
    )}
      <style>{`@keyframes cevrimiciNabiz { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
        @keyframes cevrimiciEl { 0%, 60%, 100% { transform: rotate(0deg); } 10%, 30% { transform: rotate(14deg); } 20% { transform: rotate(-8deg); } 40% { transform: rotate(-4deg); } 50% { transform: rotate(10deg); } }
        @keyframes durtmeGel { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .cevrimici-nokta, .cevrimici-el { animation: none !important; } }`}</style>
    </div>
  );
}

// Gelen dürtmeler: çevrimiçi etiketinin altında balon "👋🏻 X sana el salladı"; kişi ekrana dönüp hareket edince 8 sn sonra kaybolur
// Balon kişi ekrana dönene kadar kalır: sayfa görünürken fare/klavye/dokunma hareketi gelince 8 sn sayaç başlar.
// Fare balonun üstündeyken sayaç durur, ayrılınca yeniden başlar. Tıklayınca hemen kapanır.
const DURTME_KALMA_MS = 8000;
function DurtmeBildirim({ isFortis }) {
  const [bildirimler, setBildirimler] = useState([]);
  const sayaclar = useRef({}); // id -> timeout
  const gorulen = useRef(new Set()); // kullanıcı hareketi sonrası sayacı başlamış olanlar
  const ustunde = useRef(null);
  const kaldir = id => {
    clearTimeout(sayaclar.current[id]);
    delete sayaclar.current[id];
    gorulen.current.delete(id);
    setBildirimler(b => b.filter(x => x.id !== id));
  };
  const sayacBaslat = id => {
    clearTimeout(sayaclar.current[id]);
    sayaclar.current[id] = setTimeout(() => kaldir(id), DURTME_KALMA_MS);
  };
  useEffect(() => {
    if (!bildirimler.length) return;
    const hareket = () => {
      if (document.hidden) return;
      for (const b of bildirimler) {
        if (gorulen.current.has(b.id)) continue;
        gorulen.current.add(b.id);
        if (ustunde.current !== b.id) sayacBaslat(b.id);
      }
    };
    const olaylar = ["mousemove", "keydown", "touchstart", "wheel"];
    olaylar.forEach(o => window.addEventListener(o, hareket, { passive: true }));
    return () => olaylar.forEach(o => window.removeEventListener(o, hareket));
  }, [bildirimler]);
  useEffect(() => () => Object.values(sayaclar.current).forEach(clearTimeout), []);
  useEffect(() => {
    const dinle = e => {
      const idler = e.detail.idler || [];
      const karsiliklar = e.detail.karsiliklar || [];
      const yeni = e.detail.map((kimden, i) => ({ id: Math.random().toString(36).slice(2), kimden, kimdenId: idler[i] || null, karsilik: !!karsiliklar[i], durum: null }));
      setBildirimler(b => [...b, ...yeni]);
    };
    window.addEventListener("bilimevi-durtme", dinle);
    return () => window.removeEventListener("bilimevi-durtme", dinle);
  }, []);
  async function karsilik(b, e) {
    e.stopPropagation();
    if (!b.kimdenId || b.durum) return;
    setBildirimler(x => x.map(y => (y.id === b.id ? { ...y, durum: "gidiyor" } : y)));
    const ok = await durt(b.kimdenId, true);
    setBildirimler(x => x.map(y => (y.id === b.id ? { ...y, durum: ok ? "tamam" : "olmadi" } : y)));
    clearTimeout(sayaclar.current[b.id]);
    sayaclar.current[b.id] = setTimeout(() => kaldir(b.id), 1800);
  }
  if (!bildirimler.length) return null;
  return (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60, display: "flex", flexDirection: "column", gap: "8px", width: "max-content", maxWidth: "calc(100vw - 32px)" }}>
      {bildirimler.map(b => (
        <div key={b.id} onClick={() => kaldir(b.id)}
          onMouseEnter={() => { ustunde.current = b.id; gorulen.current.add(b.id); clearTimeout(sayaclar.current[b.id]); }}
          onMouseLeave={() => { ustunde.current = null; if (!b.durum || b.durum === "olmadi") sayacBaslat(b.id); }}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "#fff", border: "1px solid #fde68a", borderRadius: "14px", boxShadow: "0 10px 30px rgba(15,23,42,0.15)", fontSize: "14px", color: "#0f172a", cursor: "pointer", animation: "durtmeGel 0.3s ease-out" }}>
          <span className="cevrimici-el" style={{ display: "inline-block", fontSize: "26px", transformOrigin: "70% 70%", animation: "cevrimiciEl 1.2s ease-in-out 3" }}>👋🏻</span>
          <span><b>{b.kimden}</b> {b.karsilik ? (isFortis ? "waved back!" : "sana geri el salladı!") : (isFortis ? "waved at you!" : "sana el salladı!")}</span>
          {b.kimdenId && !b.karsilik && (
            <button type="button" onClick={e => karsilik(b, e)} disabled={!!b.durum}
              style={{ marginLeft: "4px", padding: "6px 12px", background: b.durum === "tamam" ? "#ecfdf5" : "#fef3c7", border: `1px solid ${b.durum === "tamam" ? "#a7f3d0" : "#fcd34d"}`, borderRadius: "100px", fontSize: "13px", fontWeight: "600", color: b.durum === "tamam" ? "#047857" : "#92400e", cursor: b.durum ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {b.durum === "tamam" ? (isFortis ? "Waved ✓" : "Salladın ✓")
                : b.durum === "olmadi" ? (isFortis ? "Offline" : "Çevrimdışı")
                : b.durum === "gidiyor" ? "…"
                : (isFortis ? "👋🏻 Wave back" : "👋🏻 Sen de el salla")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Yöneticiler için: son 4 haftanın giriş yoğunluğu (İstanbul saati, servis bilimevi-cevrimici v1.4).
// Gün × saat sıcaklık haritası: X saat 00-23, Y Pazartesi-Pazar,
//    hücre = o gün ve saatte portalda bulunan farklı kişilerin 4 haftalık toplamı; renk açık maviden koyu kırmızıya ısınır.
function ikiH(n) { return String(n).padStart(2, "0"); }
const ISI_GUN = 28;
const GUN_ADLARI = { tr: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"], en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] };
// 0 → 1 arası değeri renk skalasına çevirir: açık mavi → yeşil → sarı → turuncu → koyu kırmızı
const ISI_DURAKLAR = [[224, 242, 254], [134, 239, 172], [253, 224, 71], [249, 115, 22], [153, 27, 27]];
function isiRengi(x) {
  if (!(x > 0)) return "#f1f5f9";
  const k = Math.min(1, x) * (ISI_DURAKLAR.length - 1);
  const i = Math.min(Math.floor(k), ISI_DURAKLAR.length - 2), f = k - i;
  const [a, b] = [ISI_DURAKLAR[i], ISI_DURAKLAR[i + 1]];
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * f)).join(",")})`;
}
const haftaGunu = g => (new Date(g + "T12:00:00Z").getUTCDay() + 6) % 7; // 0 = Pazartesi
function IsiPenceresi({ isFortis, onKapat }) {
  const [gunler, setGunler] = useState(undefined); // undefined: yükleniyor, null: alınamadı
  const [ipucu, setIpucu] = useState(null); // { x, y, metin }
  useEffect(() => { let iptal = false; isiIste(ISI_GUN).then(g => { if (!iptal) setGunler(g); }); return () => { iptal = true; }; }, []);
  useEffect(() => {
    const tus = e => { if (e.key === "Escape") onKapat(); };
    document.addEventListener("keydown", tus);
    const eski = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", tus); document.body.style.overflow = eski; };
  }, []);
  const T = (tr, en) => (isFortis ? en : tr);
  const adlar = GUN_ADLARI[isFortis ? "en" : "tr"];
  const goster = (e, metin) => { const r = e.currentTarget.getBoundingClientRect(); setIpucu({ x: r.left + r.width / 2, y: r.top, metin }); };
  let icerik;
  if (gunler === undefined) icerik = <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>{T("Yükleniyor…", "Loading…")}</div>;
  else if (!gunler || !gunler.length) icerik = <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>{T("Henüz veri yok. Kayıt 25.11.2026'da başladı.", "No data yet.")}</div>;
  else {
    // Gün × saat toplamları
    const matris = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const g of gunler) {
      const w = haftaGunu(g.gun);
      g.saatler.forEach((v, s) => { matris[w][s] += v || 0; });
    }
    const enFazla = Math.max(1, ...matris.flat());
    icerik = (
      <>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "10px" }}>{T("Sıcaklık haritası", "Activity heatmap")}
          <span style={{ fontWeight: 500, color: "#94a3b8" }}> · {T("gün × saat, giriş sayısı", "day × hour, logins")}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "84px repeat(24, minmax(0, 1fr))", gap: "3px", alignItems: "center", fontSize: "11px", color: "#64748b" }}
          onMouseLeave={() => setIpucu(null)}>
          <span />
          {Array.from({ length: 24 }, (_, s) => <span key={s} style={{ textAlign: "center", fontSize: "10px" }}>{s % 2 === 0 ? ikiH(s) : ""}</span>)}
          {matris.map((satir, w) => (
            <div key={w} style={{ display: "contents" }}>
              <span style={{ whiteSpace: "nowrap" }}>{adlar[w]}</span>
              {satir.map((v, s) => (
                <span key={s} onMouseEnter={e => goster(e, `${adlar[w]} ${ikiH(s)}:00–${ikiH((s + 1) % 24)}:00 · ${v} ${T("giriş", "logins")}`)}
                  style={{ height: "24px", borderRadius: "4px", background: isiRengi(v / enFazla), cursor: "default" }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "11px", color: "#94a3b8" }}>
          <span>{T("Az", "Less")}</span>
          <span style={{ width: "140px", height: "10px", borderRadius: "999px", background: `linear-gradient(90deg, ${[0.01, 0.25, 0.5, 0.75, 1].map(isiRengi).join(", ")})` }} />
          <span>{T("Çok", "More")}</span>
          <span style={{ marginLeft: "auto" }}>{T(`Son ${gunler.length} gün · İstanbul saati · giriş = o saatte portalda bulunan farklı kişi`, `Last ${gunler.length} days · Istanbul time`)}</span>
        </div>
        {ipucu && createPortal(
          <div style={{ position: "fixed", left: ipucu.x, top: ipucu.y - 8, transform: "translate(-50%, -100%)", zIndex: 9800, padding: "6px 10px", background: "#0f172a", color: "#fff", borderRadius: "8px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 6px 16px rgba(15,23,42,0.25)" }}>{ipucu.metin}</div>,
          document.body
        )}
      </>
    );
  }
  return createPortal(
    <div onClick={onKapat} style={{ position: "fixed", inset: 0, zIndex: 9700, background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Inter', 'Segoe UI', sans-serif", animation: "isiGel .2s ease-out" }}>
      <div role="dialog" aria-modal="true" aria-label={T("Giriş saatleri", "Login hours")} onClick={e => e.stopPropagation()}
        style={{ width: "min(860px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: "20px", border: "1px solid #d1fae5", boxShadow: "0 24px 60px rgba(15,23,42,0.25)", padding: "22px 26px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ width: "38px", height: "38px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981, #047857)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>{T("Giriş saatleri", "Login hours")}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{T("Portal gün içinde hangi saatlerde kullanılıyor", "When the portal is used during the day")}</div>
          </div>
          <button type="button" onClick={onKapat} aria-label={T("Kapat", "Close")}
            style={{ width: "34px", height: "34px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "18px", lineHeight: 1, cursor: "pointer" }}>×</button>
        </div>
        {icerik}
      </div>
      <style>{`@keyframes isiGel { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>,
    document.body
  );
}
