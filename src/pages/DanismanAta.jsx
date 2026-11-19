// v1.0: Danışman Ata çubuğu (Data Tablosu ve Takip Tablosu listeleri ortak kullanır)
// Listede kutucukla seçilen Datalar (isaretli) seçilen satış danışmanına aktarılır: crm-rapor islem "ata", 25'erli parçalar.
// Onay portal penceresinde (OnayPenceresi.jsx). Sonuç şeridi aktarım bitince görünür.
// hedefler: [{ id (Kylas ID, sayı), ad, sube }]; admin tüm satış ekibi, manager kendi şubesi. Boşsa çubuk görünmez.
// onMesgul(true/false): aktarım sürerken liste kutucukları kilitlensin diye. onAktarildi: en az bir Data aktarıldıysa (liste yenilensin).
import { useState } from "react";
import { apiCagir, c } from "./CrmRaporu";
import OnayPenceresi from "./OnayPenceresi";

export default function DanismanAta({ isaretli, setIsaretli, hedefler, onAktarildi, onMesgul }) {
  const [ataAcik, setAtaAcik] = useState(false);
  const [hedef, setHedef] = useState("");
  const [aktarim, setAktarim] = useState(null); // { yapilan, toplam } aktarım sürerken
  const [sonuc, setSonuc] = useState(null); // { tur: "tamam" | "uyari" | "hata", metin }
  const [onayAcik, setOnayAcik] = useState(false);
  if (!hedefler?.length) return null;

  const hedefKisi = hedefler.find(k => String(k.id) === hedef);
  const hedefSubeler = [...new Set(hedefler.map(k => k.sube || "Şubesiz"))];

  async function aktar() {
    if (!hedefKisi || !isaretli.length) return;
    setOnayAcik(false);
    setSonuc(null);
    const liste = [...isaretli];
    const toplam = { aktarilan: 0, zatenSahibi: 0, sorunlu: 0 };
    let hataMetni = null;
    setAktarim({ yapilan: 0, toplam: liste.length });
    onMesgul?.(true);
    for (let i = 0; i < liste.length; i += 25) {
      try {
        const d = await apiCagir({ islem: "ata", leadIds: liste.slice(i, i + 25), yeniSahip: hedefKisi.id });
        toplam.aktarilan += d.aktarilan.length;
        toplam.zatenSahibi += d.zatenSahibi.length;
        toplam.sorunlu += d.hatali.length + d.bulunamayan.length;
      } catch (e) { hataMetni = e.message; break; }
      setAktarim({ yapilan: Math.min(i + 25, liste.length), toplam: liste.length });
    }
    setAktarim(null);
    onMesgul?.(false);
    if (toplam.aktarilan || toplam.zatenSahibi || !hataMetni) { setIsaretli([]); setAtaAcik(false); setHedef(""); } // tamamen başarısızsa seçim kalır
    const parcalar = [];
    if (toplam.aktarilan) parcalar.push(`${toplam.aktarilan} Data ${hedefKisi.ad} adlı danışmana aktarıldı.`);
    if (toplam.zatenSahibi) parcalar.push(`${toplam.zatenSahibi} Data zaten onundu.`);
    if (toplam.sorunlu) parcalar.push(`${toplam.sorunlu} Data aktarılamadı, tekrar deneyin.`);
    if (hataMetni) parcalar.push(hataMetni);
    setSonuc({ tur: hataMetni && !toplam.aktarilan ? "hata" : toplam.sorunlu || hataMetni ? "uyari" : "tamam", metin: parcalar.join(" ") });
    if (toplam.aktarilan) onAktarildi?.();
  }

  return (
    <>
      {onayAcik && hedefKisi && (
        <OnayPenceresi baslik="Danışman ata" onayMetni={`${isaretli.length} Data'yı aktar`} onOnay={aktar} onVazgec={() => setOnayAcik(false)}>
          <b style={{ color: "#0f172a" }}>{isaretli.length} Data</b>, <b style={{ color: "#0891b2" }}>{hedefKisi.ad}</b>
          {hedefKisi.sube ? <span style={{ color: "#94a3b8" }}> · {hedefKisi.sube}</span> : null} adlı danışmana aktarılacak.
          <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "12px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: "12px" }}>
            Kylas'ta Data sahibi hemen değişir.
          </div>
        </OnayPenceresi>
      )}
      {sonuc && (
        <div style={{ ...c.atamaSonuc, ...(sonuc.tur === "tamam" ? c.atamaTamam : sonuc.tur === "uyari" ? c.atamaUyari : c.atamaHata) }}>
          <span>{sonuc.metin}</span>
          <button onClick={() => setSonuc(null)} style={c.kapatBtn} title="Kapat">✕</button>
        </div>
      )}
      {isaretli.length > 0 && (
        <div style={c.atamaCubugu}>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{isaretli.length} Data seçildi</span>
          {aktarim ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#475569" }}>
              <span style={{ ...c.spinner, width: "14px", height: "14px" }} /> Aktarılıyor {aktarim.yapilan}/{aktarim.toplam}
            </span>
          ) : !ataAcik ? (
            <>
              <button onClick={() => setAtaAcik(true)} style={c.chipAktif}>Danışman Ata</button>
              <button onClick={() => setIsaretli([])} style={c.chip}>Seçimi temizle</button>
            </>
          ) : (
            <>
              <select value={hedef} onChange={e => setHedef(e.target.value)} autoFocus aria-label="Atanacak danışman"
                style={{ ...c.atamaSecim, ...(hedef ? {} : { color: "#64748b", borderColor: "#e2e8f0", background: "#fff" }) }}>
                <option value="">Danışman seçin</option>
                {hedefSubeler.length > 1
                  ? hedefSubeler.map(sb => (
                    <optgroup key={sb} label={sb}>
                      {hedefler.filter(k => (k.sube || "Şubesiz") === sb).map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                    </optgroup>
                  ))
                  : hedefler.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
              </select>
              <button onClick={() => setOnayAcik(true)} disabled={!hedefKisi}
                style={{ ...c.chipAktif, opacity: hedefKisi ? 1 : 0.4, cursor: hedefKisi ? "pointer" : "default" }}>Aktar</button>
              <button onClick={() => { setAtaAcik(false); setHedef(""); }} style={c.chip}>Vazgeç</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
