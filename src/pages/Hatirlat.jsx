// v1.3: tekli hatırlatmada not balonunda işaretlenen notlar önizlemede ve mesajın en altında (notlar)
// v1.2: çoklu danışman: önizlemede danışman başına sayı + örnek mesaj; gönderim n8n kuyruğuna alınır
// v1.1: tekli ve toplu ortak: govde (istek) ve baslik dışarıdan; gönderimde önizlemenin "onay" değeri geri gider
// v1.0: Takip Tablosu satırında "Hatırlat": datanın danışmanına WhatsApp (crm-rapor islem "hatirlat")
// Metni ve hattı sunucu belirler; pencere önizlemeyi gösterir, isteğe bağlı kısa not alır.
import { useEffect, useRef, useState } from "react";
import OnayPenceresi from "./OnayPenceresi";
import { apiCagir } from "./CrmRaporu";
const tekSatir = v => String(v ?? "").replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();

export default function Hatirlat({ govde, baslik = "Danışmana Hatırlat", notlar = [], onGitti, onKapat }) {
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
      setSonuc(await apiCagir({ ...govde, onizleme: false, onay: onizleme.onay, not: notMetni, ...(notlar.length ? { notlar } : {}) }));
      setDurum("gitti");
      onGitti?.();
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
        {durum === "gitti" && <span style={{ color: "#166534", fontWeight: 600 }}>{sonuc.coklu
          ? `${sonuc.sirada} danışmana gönderim sıraya alındı. Mesajlar birkaç saniye arayla gidecek, bitince size WhatsApp'tan rapor gelecek.`
          : `${sonuc.alici} kişisine gönderildi (${sonuc.hat}).`}</span>}
      </div>
      {onizleme?.coklu && (durum === "hazir" || durum === "gonderiliyor") && (
        <>
          <div><b>{onizleme.liste.length}</b> danışmana ayrı ayrı mesaj gidecek (toplam {onizleme.toplam} data). Datası olmayanlara gitmez.</div>
          <div style={s.liste}>{onizleme.liste.map(x => <div key={x.danisman} style={s.satir}><span>{x.danisman}</span><b>{x.sayi}</b></div>)}</div>
          {onizleme.ornek && <>
            <div>Örnek mesaj ({onizleme.ornek.alici}, {onizleme.ornek.hat}):</div>
            <div style={s.mesaj}>{onizleme.ornek.metin}{temizNot && `\n\nNot: ${temizNot}`}</div>
          </>}
          <textarea value={notMetni} onChange={e => setNotMetni(e.target.value)} maxLength={300} rows={2}
            disabled={durum === "gonderiliyor"} placeholder="Herkese aynı not (isteğe bağlı)" aria-label="Hatırlatma notu" style={s.not} />
        </>
      )}
      {onizleme && !onizleme.coklu && (durum === "hazir" || durum === "gonderiliyor") && (
        <>
          <div>Alıcı: <b>{onizleme.alici}</b></div>
          <div>Gönderen hat: <b>{onizleme.hat}</b></div>
          <div style={s.mesaj}>{onizleme.metin}{temizNot && `\n\nNot: ${temizNot}`}{notlar.length > 0 && `\n\nNotlar:\n${notlar.map(n => `${n.baslik}\n${tekSatir(n.metin)}`).join("\n\n")}`}</div>
          <textarea value={notMetni} onChange={e => setNotMetni(e.target.value)} maxLength={300} rows={2} autoFocus
            disabled={durum === "gonderiliyor"} placeholder="Not ekle (isteğe bağlı)" aria-label="Hatırlatma notu" style={s.not} />
        </>
      )}
    </OnayPenceresi>
  );
}

const s = {
  liste: { margin: "8px 0", maxHeight: "25vh", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "4px 12px" },
  satir: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "4px 0", borderBottom: "1px solid #f1f5f9" },
  mesaj: { margin: "10px 0", padding: "10px 12px", borderRadius: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#0f172a",
    whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "40vh", overflowY: "auto" },
  not: { width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", font: "inherit", resize: "vertical" },
};
