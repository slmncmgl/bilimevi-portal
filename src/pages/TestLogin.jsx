// TestLogin.jsx v1.0: Yönetici Paneli > Kullanıcı Yönetimi > Test Login
// Admin/owner, Personel listesindeki bir kişiye tıklayınca YAN SEKMEDE o kişinin hesabıyla giriş yapılır;
// bu sekme kendi hesabında kalır (oturum her sekmenin kendi sessionStorage'ında).
// Akış: tıklamada yeni sekme hemen açılır (pop-up engeline takılmasın diye), /api/test-login sunucuda admin
// kontrolü yapıp kullanıcı bilgisini döndürür, bilgi yeni sekmeye postMessage ile aktarılır. Şifre tarayıcıya gelmez.
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const IZINLI_ROLLER = ["admin", "owner"];

// Tırnaklı alanları ve satır içi virgülleri doğru okuyan küçük CSV ayrıştırıcı
function csvOku(metin) {
  const satirlar = [];
  let satir = [], alan = "", tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const ch = metin[i];
    if (tirnak) {
      if (ch === '"' && metin[i + 1] === '"') { alan += '"'; i++; }
      else if (ch === '"') tirnak = false;
      else alan += ch;
    } else if (ch === '"') tirnak = true;
    else if (ch === ",") { satir.push(alan); alan = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && metin[i + 1] === "\n") i++;
      satir.push(alan); satirlar.push(satir); satir = []; alan = "";
    } else alan += ch;
  }
  if (alan || satir.length) { satir.push(alan); satirlar.push(satir); }
  const baslik = (satirlar.shift() || []).map(h => h.trim());
  return satirlar.filter(s => s.some(x => x.trim())).map(s => Object.fromEntries(baslik.map((h, i) => [h, (s[i] || "").trim()])));
}

const sade = v => String(v || "").trim().toLocaleLowerCase("tr-TR")
  .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");

export default function TestLogin() {
  const navigate = useNavigate();
  const user = getSession();
  const rol = String(user?.title || user?.rol || "").toLowerCase().trim();
  const izinli = IZINLI_ROLLER.includes(rol);

  const [kisiler, setKisiler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [arama, setArama] = useState("");
  const [aciliyor, setAciliyor] = useState(null); // e-posta
  const [mesaj, setMesaj] = useState(null); // { tur: "ok" | "hata", metin }

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    if (!izinli) return;
    fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Personel&_t=${Date.now()}`, { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(metin => {
        const liste = csvOku(metin)
          .filter(p => p["Ad Soyad"] && p["E-posta"])
          .map(p => ({ ad: p["Ad Soyad"], email: p["E-posta"], sube: p["Şube"] || "", sirket: p["Şirket"] || "", rol: (p.title || "staff").toLowerCase() }))
          .sort((a, b) => a.sirket.localeCompare(b.sirket, "tr") || a.sube.localeCompare(b.sube, "tr") || a.ad.localeCompare(b.ad, "tr"));
        setKisiler(liste);
      })
      .catch(() => setHata("Personel listesi okunamadı."))
      .finally(() => setYukleniyor(false));
  }, []);

  const gruplar = useMemo(() => {
    const q = sade(arama);
    const map = new Map();
    for (const k of kisiler) {
      if (q && ![k.ad, k.sube, k.sirket].some(x => sade(x).includes(q))) continue;
      const anahtar = `${k.sirket || "Şirket yok"} · ${k.sube || "Şube yok"}`;
      if (!map.has(anahtar)) map.set(anahtar, []);
      map.get(anahtar).push(k);
    }
    return [...map];
  }, [kisiler, arama]);

  function testGiris(kisi) {
    setMesaj(null);
    // Sekme tıklama anında açılmalı, yoksa tarayıcı pop-up engeline takılır
    const sekme = window.open("/test-giris", "_blank");
    if (!sekme) { setMesaj({ tur: "hata", metin: "Tarayıcı yeni sekmeyi engelledi. Bu site için pop-up iznini aç." }); return; }
    setAciliyor(kisi.email);

    let veri = null;
    let hazir = false;
    const gonder = () => { if (veri && hazir) sekme.postMessage(veri, window.location.origin); };
    const dinle = e => {
      if (e.origin !== window.location.origin || e.source !== sekme || e.data?.tur !== "test-giris-hazir") return;
      hazir = true;
      gonder();
      window.removeEventListener("message", dinle);
    };
    window.addEventListener("message", dinle);
    setTimeout(() => window.removeEventListener("message", dinle), 60000);

    fetch("/api/test-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: kisi.email }),
    })
      .then(async r => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
        veri = { tur: "test-giris", ...json };
        setMesaj({ tur: "ok", metin: `${kisi.ad} hesabı yan sekmede açıldı.` });
      })
      .catch(err => {
        veri = { tur: "test-giris-hata", mesaj: err.message };
        setMesaj({ tur: "hata", metin: `${kisi.ad}: ${err.message}` });
      })
      .finally(() => { setAciliyor(null); gonder(); });
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Calibri, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: "980px", margin: "0 auto", padding: "24px 16px" }}>
        <button onClick={() => navigate("/izin?panel=admin")}
          style={{ padding: "6px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#334155" }}>
          ← Yönetici Paneli
        </button>
        <h2 style={{ margin: "16px 0 4px", fontSize: "20px", color: "#0f172a" }}>Test Login</h2>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
          Bir kişiye tıklayınca yan sekmede onun hesabıyla giriş yapılır, bu sekmede kendi hesabında kalırsın.
          Yan sekmede yaptığın her işlem gerçekten o kişi adına yapılır.
        </p>

        {!izinli ? (
          <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b", fontSize: "14px" }}>
            Bu sayfa sadece admin ve owner içindir.
          </div>
        ) : (
          <>
            <input
              type="text" value={arama} onChange={e => setArama(e.target.value)} autoFocus
              placeholder="Ad, şube ya da şirket ara"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", marginBottom: "12px" }}
            />
            {mesaj && (
              <div style={{
                marginBottom: "12px", padding: "10px 14px", borderRadius: "10px", fontSize: "13px",
                background: mesaj.tur === "ok" ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${mesaj.tur === "ok" ? "#bbf7d0" : "#fecaca"}`,
                color: mesaj.tur === "ok" ? "#166534" : "#991b1b",
              }}>{mesaj.metin}</div>
            )}
            {yukleniyor && <div style={{ color: "#64748b", fontSize: "14px" }}>Kullanıcılar yükleniyor...</div>}
            {hata && <div style={{ color: "#991b1b", fontSize: "14px" }}>{hata}</div>}
            {gruplar.map(([baslik, liste]) => (
              <div key={baslik} style={{ marginBottom: "18px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", margin: "0 0 8px", letterSpacing: "0.3px" }}>{baslik}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
                  {liste.map(k => (
                    <button
                      key={k.email} type="button" onClick={() => testGiris(k)} disabled={!!aciliyor}
                      title={`${k.ad} olarak yan sekmede giriş yap`}
                      style={{
                        textAlign: "left", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0",
                        background: aciliyor === k.email ? "#eff6ff" : "#fff", cursor: aciliyor ? "default" : "pointer",
                        boxShadow: "0 1px 2px rgba(15,23,42,0.05)", opacity: aciliyor && aciliyor !== k.email ? 0.6 : 1,
                      }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e3a5f" }}>{k.ad}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {[k.sube, k.sirket].filter(Boolean).join(" · ")}{k.rol !== "staff" ? ` · ${k.rol}` : ""}
                      </div>
                      {aciliyor === k.email && <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "4px" }}>Açılıyor...</div>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!yukleniyor && !hata && !gruplar.length && <div style={{ color: "#64748b", fontSize: "14px" }}>Eşleşen kullanıcı yok.</div>}
          </>
        )}
      </div>
    </div>
  );
}
