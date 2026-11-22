// v1.1: tekli ve toplu ortak: govde (istek) ve baslik dışarıdan; gönderimde önizlemenin "onay" değeri geri gider
// v1.0: Takip Tablosu satırında "Hatırlat": datanın danışmanına WhatsApp (crm-rapor islem "hatirlat")
// Metni ve hattı sunucu belirler; pencere önizlemeyi gösterir, isteğe bağlı kısa not alır.
import { useEffect, useRef, useState } from "react";
import OnayPenceresi from "./OnayPenceresi";
import { apiCagir } from "./CrmRaporu";

export default function Hatirlat({ govde, baslik = "Danışmana Hatırlat", onKapat }) {
  const [onizleme, setOnizleme] = useState(null);
  const [notMetni, setNotMetni] = useState("");
  const [hata, setHata] = useState(null);
  const [durum, setDurum] = useState("yukleniyor"); // yukleniyor | hazir | gonderiliyor | gitti | hata
  const [sonuc, setSonuc] = useState(null);
  const kilit = useRef(false); // gönderim sürüyor: çift tıklama ve Esc kapalı

  useEffect(() => {
    let iptal = false;
    apiCagir({ ...govde, onizleme: true })
      .then(d => { if (!iptal) { setOnizleme(d); setDurum("hazir"); } })
      .catch(e => { if (!iptal) { setHata(e.message); setDurum("hata"); } });
    return () => { iptal = true; };
  }, []); // pencere her açılışta yeniden kurulur (key)

  const kapat = () => { if (!kilit.current) onKapat(); }; // Esc dinleyicisi ilk render'dan kalır, durum yerine ref okunur

  async function gonder() {
    if (durum === "gitti" || durum === "hata") return kapat();
    if (durum !== "hazir" || kilit.current) return;
    kilit.current = true;
    setDurum("gonderiliyor");
    try {
      setSonuc(await apiCagir({ ...govde, onizleme: false, onay: onizleme.onay, not: notMetni }));
      setDurum("gitti");
    } catch (e) {
      setHata(e.message);
      setDurum("hata");
    }
    kilit.current = false;
  }

  const temizNot = notMetni.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
  const bekliyor = durum === "yukleniyor" || durum === "gonderiliyor";
  const onayMetni = { yukleniyor: "Gönder", hazir: "Gönder", gonderiliyor: "Gönderiliyor...", gitti: "Tamam", hata: "Kapat" }[durum];

  return (
    <OnayPenceresi ikon="!" baslik={baslik} onayMetni={onayMetni} onayPasif={bekliyor} onOnay={gonder} onVazgec={kapat}>
      <div role="status">
        {durum === "yukleniyor" && "Mesaj hazırlanıyor..."}
        {durum === "hata" && <span style={{ color: "#b91c1c" }}>{hata}</span>}
        {durum === "gitti" && <span style={{ color: "#166534", fontWeight: 600 }}>{sonuc.alici} kişisine gönderildi ({sonuc.hat}).</span>}
      </div>
      {onizleme && (durum === "hazir" || durum === "gonderiliyor") && (
        <>
          <div>Alıcı: <b>{onizleme.alici}</b></div>
          <div>Gönderen hat: <b>{onizleme.hat}</b></div>
          <div style={s.mesaj}>{onizleme.metin}{temizNot && `\n\nNot: ${temizNot}`}</div>
          <textarea value={notMetni} onChange={e => setNotMetni(e.target.value)} maxLength={300} rows={2} autoFocus
            disabled={durum === "gonderiliyor"} placeholder="Not ekle (isteğe bağlı)" aria-label="Hatırlatma notu" style={s.not} />
        </>
      )}
    </OnayPenceresi>
  );
}

const s = {
  mesaj: { margin: "10px 0", padding: "10px 12px", borderRadius: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#0f172a",
    whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "40vh", overflowY: "auto" },
  not: { width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", font: "inherit", resize: "vertical" },
};
