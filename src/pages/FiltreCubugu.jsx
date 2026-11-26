// v1.9: VIP Datalar düğmesi kaynak/danışman seçicilerle aynı köşe (12px), renkler aynı
// v1.8: tarih verilmezse (null) süre kutusu gizlenir (Danışman Özeti çoklu seçimde kendi aralık seçicisini kullanır)
// v1.7: "Campaign Name" yazıları "Reklam Adı" oldu
// v1.6: VIP Datalar, VIP kaynakların hepsi seçimdeyse ON (renkli) görünür; varsayılanda tüm kaynaklar seçili olduğu için ON.
//       ON iken tıklayınca VIP kaynaklar çıkar (diğerleri kalır), OFF iken tıklayınca sadece VIP seçilir. "Tüm Kaynaklar" büyük harf.
// v1.5: VIP Datalar OFF: VIP kaynaklar seçimden çıkar, diğer kaynaklar seçili kalır
// v1.4: KampanyaAra dışa açıldı (Takip Tablosu liste başlığının sağında); açılır kutu body'ye çizilir, tablo kesmesin
// v1.3: Campaign Name araması çubuğun en sağında huni ikonuyla açılan küçük kutuda; aktifken kelime ikonun yanında
// v1.2: isteğe bağlı Campaign Name "içerir" arama kutusu (kampanya: { deger, onChange }), pembe çerçeve; şimdilik Takip Tablosu
// v1.1: VIP Datalar ON/OFF anahtar: ON sadece VIP, OFF tüm kaynaklar; OFF soluk görünür, dönen neon her iki durumda da var
// v1.0: sekmelerin standart giriş çubuğu (Aktivite Tablosu, Danışman Özeti, Data Tablosu; Performans Tablosu hariç)
// Soldan sağa: Danışman (turkuaz çerçeve) · Veri kaynağı + ★ VIP Datalar (turuncu çerçeve) · Tümü + süre listesi (mor çerçeve).
// danisman: { liste, secili, onChange, tekli?, bosMetin?, yukleniyor? } verilmezse danışman kutusu görünmez (ör. staff).
// kaynak:   { secili, onChange, bosMetin? }
// tarih:    TarihSecici özellikleri + ipucu (mor çerçevenin üzerine gelince açıklama)
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { c, Cerceve, KAYNAKLAR, TUM_KAYNAKLAR } from "./CrmRaporu";
import DanismanSecici from "./DanismanSecici";
import KaynakSecici, { VIP_KAYNAKLAR } from "./KaynakSecici";
import TarihSecici from "./TarihSecici";
import Ipucu from "./Ipucu";

// Not: CrmRaporu bu dosyayı import ediyor (döngü). Oradan gelen listeleri modül yüklenirken okuma, sadece bileşen içinde kullan.
const VIP_ACIKLAMA = "ON: VIP kaynaklar (Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci, Setrow Marketing) seçimde. ON iken tıklayınca VIP kaynaklar seçimden çıkar; OFF iken tıklayınca sadece VIP kaynaklar seçilir.";

export default function FiltreCubugu({ danisman, kaynak, tarih, kampanya }) {
  const vipSecili = VIP_KAYNAKLAR.every(id => kaynak.secili.includes(id)); // VIP kaynakların hepsi seçimde
  const vipDegistir = () => {
    if (!vipSecili) return kaynak.onChange(VIP_KAYNAKLAR);
    const kalan = kaynak.secili.filter(id => !VIP_KAYNAKLAR.includes(id));
    kaynak.onChange(kalan.length ? kalan : TUM_KAYNAKLAR.filter(id => !VIP_KAYNAKLAR.includes(id)));
  };
  const { ipucu, ...tarihOzellik } = tarih || {};
  return (
    <div style={c.panel}>
      <style>{VIP_CSS}</style>
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", width: "100%" }}>
        {danisman && (
          <Cerceve tur="danisman">
            <DanismanSecici danismanlar={danisman.liste} secili={danisman.secili} onChange={danisman.onChange} tekli={danisman.tekli}
              bosMetin={danisman.bosMetin} yukleniyor={danisman.yukleniyor} />
          </Cerceve>
        )}
        <Cerceve tur="kaynak">
          <KaynakSecici kaynaklar={KAYNAKLAR} secili={kaynak.secili} onChange={kaynak.onChange} bosMetin={kaynak.bosMetin || "Tüm Kaynaklar"} />
          <Ipucu metin={VIP_ACIKLAMA} isaret={false}>
            <button onClick={vipDegistir} role="switch" aria-checked={vipSecili}
              className={`vip-neon${vipSecili ? " vip-neon-aktif" : ""}`}>
              <span>★ VIP Datalar <b className="vip-durum">{vipSecili ? "ON" : "OFF"}</b></span>
            </button>
          </Ipucu>
        </Cerceve>
        {tarih && (
        <Cerceve tur="tarih" metin={ipucu}>
          <TarihSecici {...tarihOzellik} />
        </Cerceve>
        )}
        {kampanya && <KampanyaAra deger={kampanya.deger} onChange={kampanya.onChange} />}
      </div>
    </div>
  );
}

// Campaign Name "içerir" araması: çubuğun en sağında huni ikonu; tıklayınca açılır kutu.
// Yazmayı bırakınca (600 ms) üst bileşene gider. Arama varken ikon pembe dolar ve yanında kelime görünür (✕ temizler).
export function KampanyaAra({ deger, onChange }) {
  const [acik, setAcik] = useState(false); // false ya da { ust, sag } (açılır kutunun ekrandaki yeri)
  const panelRef = useRef(null);
  const [yazi, setYazi] = useState(deger || "");
  const kutu = useRef(null);
  useEffect(() => { setYazi(deger || ""); }, [deger]);
  useEffect(() => {
    if (yazi.trim() === (deger || "")) return;
    const z = setTimeout(() => onChange(yazi.trim()), 600);
    return () => clearTimeout(z);
  }, [yazi]);
  useEffect(() => {
    if (!acik) return;
    const disari = e => { if (!kutu.current?.contains(e.target) && !panelRef.current?.contains(e.target)) setAcik(false); };
    // Sayfa kayınca ya da liste kısalınca kutu huninin altında kalsın (kapanmasın, yazarken kesilmesin)
    const kapat = () => { const r = kutu.current?.getBoundingClientRect(); if (r) setAcik({ ust: r.bottom + 8, sag: Math.max(8, window.innerWidth - r.right) }); };
    window.addEventListener("scroll", kapat, true);
    window.addEventListener("resize", kapat);
    const tus = e => { if (e.key === "Escape" || e.key === "Enter") setAcik(false); };
    document.addEventListener("mousedown", disari);
    document.addEventListener("keydown", tus);
    return () => { document.removeEventListener("mousedown", disari); document.removeEventListener("keydown", tus); window.removeEventListener("scroll", kapat, true); window.removeEventListener("resize", kapat); };
  }, [!!acik]);
  function ac() {
    if (acik) { setAcik(false); return; }
    const r = kutu.current.getBoundingClientRect();
    setAcik({ ust: r.bottom + 8, sag: Math.max(8, window.innerWidth - r.right) });
  }
  const temizle = () => { setYazi(""); onChange(""); };
  const aktif = !!deger;

  return (
    <div ref={kutu} style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
      {aktif && (
        <span style={k.etiket} title={`Reklam Adı içerir: ${deger}`}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{deger}</span>
          <button type="button" onClick={temizle} aria-label="Reklam Adı aramasını temizle" style={k.etiketX}>✕</button>
        </span>
      )}
      <Ipucu metin={acik ? null : "Reklam Adı ile süz"} isaret={false}>
        <button type="button" onClick={ac} aria-expanded={!!acik} aria-label="Reklam Adı filtresi"
          style={{ ...k.huni, ...(aktif || acik ? k.huniAktif : {}) }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill={aktif ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" />
          </svg>
        </button>
      </Ipucu>
      {acik && createPortal(
        <div ref={panelRef} style={{ ...k.panel, top: acik.ust, right: acik.sag }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9d174d", marginBottom: "8px" }}>Reklam Adı içerir</div>
          <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input autoFocus value={yazi} onChange={e => setYazi(e.target.value.slice(0, 100))} placeholder="ör. yaz okulu" aria-label="Reklam Adı içerir"
              style={{ ...k.girdi, borderColor: yazi ? "#db2777" : "#e2e8f0", background: yazi ? "#fdf2f8" : "#fff" }} />
            {yazi && <button type="button" onClick={temizle} aria-label="Aramayı temizle" style={{ ...k.etiketX, position: "absolute", right: "10px" }}>✕</button>}
          </span>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>Büyük/küçük harf fark etmez. Yazmayı bırakınca liste güncellenir.</div>
        </div>,
        document.body,
      )}
    </div>
  );
}

const k = {
  huni: { width: "38px", height: "38px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b",
    display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" },
  huniAktif: { borderColor: "#db2777", background: "#fdf2f8", color: "#db2777" },
  panel: { position: "fixed", zIndex: 9000, width: "280px", background: "#fff", border: "1.5px solid #f9a8d4",
    borderRadius: "14px", boxShadow: "0 12px 32px rgba(15,23,42,0.14)", padding: "12px", fontFamily: "'Sora', sans-serif" },
  girdi: { width: "100%", height: "36px", padding: "0 30px 0 12px", borderRadius: "10px", border: "1.5px solid", color: "#0f172a",
    fontSize: "13px", fontWeight: 600, fontFamily: "'Sora', sans-serif", outline: "none", boxSizing: "border-box" },
  etiket: { display: "inline-flex", alignItems: "center", gap: "6px", height: "28px", padding: "0 6px 0 12px", borderRadius: "999px",
    background: "#fdf2f8", border: "1.5px solid #f9a8d4", color: "#9d174d", fontSize: "12px", fontWeight: 700 },
  etiketX: { border: "none", background: "transparent", color: "#9d174d", cursor: "pointer", fontSize: "11px", padding: "2px 4px" },
};

const VIP_CSS = `
.vip-neon { position: relative; isolation: isolate; overflow: hidden; padding: 2px; border: none; border-radius: 12px;
  background: transparent; cursor: pointer; font-family: 'Sora', sans-serif; animation: vipParilti 2.4s ease-in-out infinite; }
.vip-neon::before { content: ""; position: absolute; inset: -200%; z-index: -1;
  background: conic-gradient(from 0deg, transparent 0 55%, #f59e0b 65%, #fde047 72%, #f472b6 80%, #a855f7 88%, transparent 95%);
  animation: vipDon 2.4s linear infinite; }
.vip-neon > span { display: flex; align-items: center; gap: 8px; padding: 5px 8px 5px 14px; border-radius: 10px; background: #f8fafc; color: #94a3b8;
  font-size: 12px; font-weight: 700; letter-spacing: 0.2px; transition: all 0.15s; }
.vip-neon:hover > span { background: #f1f5f9; color: #64748b; }
.vip-durum { padding: 1px 7px; border-radius: 999px; font-size: 10px; letter-spacing: 0.5px; background: #e2e8f0; color: #64748b; }
.vip-neon-aktif .vip-durum { background: rgba(255,255,255,0.28); color: #fff; }
.vip-neon-aktif > span { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }
.vip-neon-aktif:hover > span { background: linear-gradient(135deg, #f59e0b, #b45309); }
@keyframes vipDon { to { transform: rotate(360deg); } }
@keyframes vipParilti { 0%, 100% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.35); } 50% { box-shadow: 0 0 16px rgba(245, 158, 11, 0.75), 0 0 28px rgba(244, 114, 182, 0.3); } }
@media (prefers-reduced-motion: reduce) { .vip-neon, .vip-neon::before { animation: none; } .vip-neon::before { background: linear-gradient(90deg, #f59e0b, #f472b6); } }
`;
