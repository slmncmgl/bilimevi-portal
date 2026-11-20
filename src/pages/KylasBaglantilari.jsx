// v1.0: Admin-only "Kylas Bağlantıları". Danışmanların Kylas e-posta+şifresi buradan girilir; sunucu Kylas'ta doğrulayıp
// şifreyi şifreli saklar (api/kylas-baglanti). Şifreler yalnızca bu ekrandan sunucuya gider, geri dönmez, tarayıcıda tutulmaz.
// Her satır: "e-posta <tab/virgül/boşluk> şifre". Kaydet'e basınca Kylas'ta denenir; doğruysa o danışman bağlanır.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const YONETICI = ["admin", "owner", "director"];

function satirAyikla(metin) {
  return metin.split("\n").map(s => s.trim()).filter(Boolean).map(s => {
    const ilk = s.search(/[\t,; ]/);
    if (ilk < 0) return { email: s.toLowerCase(), sifre: "" };
    return { email: s.slice(0, ilk).trim().toLowerCase(), sifre: s.slice(ilk + 1).trim() };
  }).filter(g => g.email);
}

export default function KylasBaglantilari() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [metin, setMetin] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { navigate("/"); return; }
    setUser(s);
  }, [navigate]);

  const girdiler = satirAyikla(metin);
  const eksikSifre = girdiler.filter(g => !g.sifre).length;

  async function kaydet() {
    if (!girdiler.length || calisiyor) return;
    if (eksikSifre) { setHata(`${eksikSifre} satırda şifre eksik. Her satır: e-posta<TAB/virgül>şifre`); return; }
    setCalisiyor(true); setHata(null); setSonuc(null);
    try {
      const r = await fetch("/api/kylas-baglanti", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ islem: "kaydet", girdiler }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `İstek başarısız (HTTP ${r.status})`);
      setSonuc(d.sonuc || []);
      setMetin(""); // şifreler ekranda kalmasın
    } catch (e) { setHata(e.message); }
    finally { setCalisiyor(false); }
  }

  if (!user) return null;
  if (!YONETICI.includes(user.rol)) {
    return <div style={s.sayfa}><div style={s.kart}><h2 style={s.h2}>Kylas Bağlantıları</h2><p style={{ color: "#991b1b" }}>Bu ekran sadece yöneticilere açık.</p><button style={s.geri} onClick={() => navigate("/dashboard")}>Panele dön</button></div></div>;
  }
  const basarili = (sonuc || []).filter(x => x.ok).length;
  const ornek = "ad.soyad@bilimevi.com   (tab)   (sifre)";

  return (
    <div style={s.sayfa}>
      <div style={s.kart}>
        <button style={s.geri} onClick={() => navigate("/dashboard")}>‹ Panel</button>
        <h2 style={s.h2}>Kylas Bağlantıları</h2>
        <p style={s.aciklama}>
          Danışmanların Kylas e-posta ve şifresini gir; portaldaki not/task'lar Kylas'ta <b>o danışmanın</b> adına yazılsın.
          Şifreler sunucuda şifreli saklanır, buraya geri gelmez. Her satıra bir kişi: <code>e-posta ⇥ şifre</code> (arada Tab, virgül ya da boşluk).
        </p>
        <textarea value={metin} onChange={e => setMetin(e.target.value)} disabled={calisiyor} spellCheck={false} autoComplete="off"
          placeholder={ornek} style={s.alan} />
        <div style={s.alt}>
          <span style={{ fontSize: "13px", color: "#64748b" }}>{girdiler.length} satır{eksikSifre ? ` · ${eksikSifre} şifresiz` : ""}</span>
          <button onClick={kaydet} disabled={!girdiler.length || calisiyor} style={{ ...s.kaydet, opacity: !girdiler.length || calisiyor ? 0.5 : 1 }}>
            {calisiyor ? "Doğrulanıyor..." : "Kaydet ve Doğrula"}
          </button>
        </div>
        {hata && <div style={s.hata}>{hata}</div>}

        {sonuc && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "10px" }}>
              Sonuç: {basarili}/{sonuc.length} bağlandı
            </div>
            <div style={s.liste}>
              {sonuc.map((x, i) => (
                <div key={i} style={{ ...s.satir, background: x.ok ? "#f0fdf4" : "#fef2f2", borderColor: x.ok ? "#bbf7d0" : "#fecaca" }}>
                  <span style={{ fontWeight: 700, color: x.ok ? "#166534" : "#991b1b" }}>{x.ok ? "✓" : "✗"}</span>
                  <span style={{ color: "#0f172a" }}>{x.email}</span>
                  <span style={{ marginLeft: "auto", fontSize: "12px", color: x.ok ? "#166534" : "#991b1b" }}>{x.ok ? `${x.ad} (ID ${x.kylasId})` : x.hata}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  sayfa: { minHeight: "100vh", background: "#f1f5f9", padding: "32px 16px", fontFamily: "'Sora', sans-serif" },
  kart: { maxWidth: "720px", margin: "0 auto", background: "#fff", borderRadius: "20px", border: "1.5px solid #e2e8f0", padding: "28px", boxShadow: "0 8px 24px rgba(15,23,42,0.06)" },
  geri: { border: "none", background: "none", color: "#64748b", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif", padding: 0, marginBottom: "10px" },
  h2: { margin: "0 0 8px", fontSize: "22px", color: "#0f172a" },
  aciklama: { fontSize: "13px", color: "#475569", lineHeight: 1.6, marginBottom: "16px" },
  alan: { width: "100%", minHeight: "160px", resize: "vertical", padding: "14px", borderRadius: "14px", border: "1.5px solid #e2e8f0", fontSize: "13px",
    fontFamily: "ui-monospace, monospace", lineHeight: 1.6, color: "#0f172a", outline: "none", boxSizing: "border-box" },
  alt: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "12px" },
  kaydet: { padding: "10px 22px", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", fontSize: "13px", fontWeight: 800, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  hata: { marginTop: "12px", padding: "10px 14px", borderRadius: "12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "13px" },
  liste: { display: "flex", flexDirection: "column", gap: "6px" },
  satir: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", border: "1px solid", fontSize: "13px" },
};
