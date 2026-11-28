// v1.0 (28.11.2026): Yönetici Paneli > WhatsApp hattı. Durum, yeniden bağlama (QR) ve çıkış.
// İstekler /api/n8n?hedef=wp-hat → n8n "Portal WP Hat Yönetimi" → Evolution API. Şimdilik sadece Selman-Personel-ToDo.
import { useState, useEffect, useRef } from "react";

const HAT = "Selman-Personel-ToDo";
const DURUM_ETIKET = {
  open: { yazi: "Bağlı", renk: "#16a34a", zemin: "#f0fdf4" },
  connecting: { yazi: "Bağlanıyor / QR bekleniyor", renk: "#d97706", zemin: "#fffbeb" },
  close: { yazi: "Bağlı değil", renk: "#dc2626", zemin: "#fef2f2" },
};

async function istek(islem) {
  const r = await fetch("/api/n8n?hedef=wp-hat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hat: HAT, islem }),
  });
  const d = await r.json().catch(() => null);
  if (!d) throw new Error(`Cevap alınamadı (HTTP ${r.status})`);
  if (!d.ok) throw new Error(d.hata || "İşlem başarısız");
  return d;
}

export default function WpHatKutusu() {
  const [durum, setDurum] = useState(null);
  const [qr, setQr] = useState(null);
  const [kod, setKod] = useState(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState("");
  const zamanlayici = useRef(null);

  const durumuGetir = async () => {
    try {
      const d = await istek("durum");
      setDurum(d.durum);
      setHata("");
      if (d.durum === "open") { setQr(null); setKod(null); }
      return d.durum;
    } catch (e) { setHata(e.message); return null; }
  };

  useEffect(() => { durumuGetir(); return () => clearInterval(zamanlayici.current); }, []);

  // QR gösterilirken 3 sn'de bir durumu kontrol et; bağlanınca dur
  useEffect(() => {
    clearInterval(zamanlayici.current);
    if (!qr && !kod) return;
    zamanlayici.current = setInterval(async () => {
      const s = await durumuGetir();
      if (s === "open") clearInterval(zamanlayici.current);
    }, 3000);
    return () => clearInterval(zamanlayici.current);
  }, [qr, kod]);

  const baglan = async () => {
    setMesgul(true); setHata("");
    try {
      const d = await istek("baglan");
      if (d.durum === "open") { setDurum("open"); setQr(null); }
      else { setQr(d.qr); setKod(d.eslestirmeKodu); setDurum("connecting"); }
      if (!d.qr && !d.eslestirmeKodu && d.durum !== "open") setHata("Evolution QR göndermedi. Birkaç saniye sonra tekrar deneyin.");
    } catch (e) { setHata(e.message); }
    setMesgul(false);
  };

  const cikis = async () => {
    if (!window.confirm(`${HAT} hattının WhatsApp bağlantısı kesilecek. Yeniden bağlanana kadar bu hattan mesaj gitmez. Devam edilsin mi?`)) return;
    setMesgul(true); setHata("");
    try { await istek("cikis"); setQr(null); setKod(null); await durumuGetir(); }
    catch (e) { setHata(e.message); }
    setMesgul(false);
  };

  const e = DURUM_ETIKET[durum] || { yazi: durum ? durum : "Kontrol ediliyor…", renk: "#64748b", zemin: "#f8fafc" };
  const btn = { padding: "8px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: mesgul ? "wait" : "pointer", fontFamily: "inherit" };

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px 18px", marginBottom: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>WhatsApp hattı</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{HAT}</div>
        </div>
        <span style={{ background: e.zemin, color: e.renk, fontSize: "12px", fontWeight: 700, padding: "5px 10px", borderRadius: "999px" }}>{e.yazi}</span>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
        <button style={btn} disabled={mesgul} onClick={durumuGetir}>Durumu yenile</button>
        {durum !== "open" && <button style={{ ...btn, background: "var(--marka, #0891b2)", color: "#fff", border: "none" }} disabled={mesgul} onClick={baglan}>{mesgul ? "Bekleyin…" : "Yeniden bağla (QR)"}</button>}
        {durum === "open" && <button style={{ ...btn, color: "#dc2626", borderColor: "#fecaca" }} disabled={mesgul} onClick={cikis}>Bağlantıyı kes</button>}
      </div>
      {(qr || kod) && durum !== "open" && (
        <div style={{ marginTop: "14px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          {qr && <img src={qr} alt="WhatsApp QR" style={{ width: "220px", height: "220px", border: "1px solid #e2e8f0", borderRadius: "10px" }} />}
          <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.7, maxWidth: "320px" }}>
            Telefonda WhatsApp &gt; <strong>Bağlı cihazlar</strong> &gt; <strong>Cihaz bağla</strong> deyip QR'ı okutun.
            {kod && <div style={{ marginTop: "6px" }}>Eşleştirme kodu: <strong style={{ letterSpacing: "2px" }}>{kod}</strong></div>}
            <div style={{ marginTop: "6px" }}>QR yaklaşık 40 sn geçerli; süresi dolarsa "Yeniden bağla"ya tekrar basın. Bağlanınca kutu kendiliğinden yeşile döner.</div>
          </div>
        </div>
      )}
      {hata && <div style={{ marginTop: "10px", fontSize: "12px", color: "#dc2626" }}>{hata}</div>}
    </div>
  );
}
