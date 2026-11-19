// v1.2: isteğe bağlı Campaign Name "içerir" arama kutusu (kampanya: { deger, onChange }), pembe çerçeve; şimdilik Takip Tablosu
// v1.1: VIP Datalar ON/OFF anahtar: ON sadece VIP, OFF tüm kaynaklar; OFF soluk görünür, dönen neon her iki durumda da var
// v1.0: sekmelerin standart giriş çubuğu (Aktivite Tablosu, Danışman Özeti, Data Tablosu; Performans Tablosu hariç)
// Soldan sağa: Danışman (turkuaz çerçeve) · Veri kaynağı + ★ VIP Datalar (turuncu çerçeve) · Tümü + süre listesi (mor çerçeve).
// danisman: { liste, secili, onChange, tekli?, bosMetin?, yukleniyor? } verilmezse danışman kutusu görünmez (ör. staff).
// kaynak:   { secili, onChange, bosMetin? }
// tarih:    TarihSecici özellikleri + ipucu (mor çerçevenin üzerine gelince açıklama)
import { useState, useEffect } from "react";
import { c, Cerceve, KAYNAKLAR, TUM_KAYNAKLAR } from "./CrmRaporu";
import DanismanSecici from "./DanismanSecici";
import KaynakSecici, { VIP_KAYNAKLAR } from "./KaynakSecici";
import TarihSecici from "./TarihSecici";
import Ipucu from "./Ipucu";

const VIP_ACIKLAMA = "ON: sadece VIP kaynaklar (Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci, Setrow Marketing). OFF: tüm kaynaklar.";

export default function FiltreCubugu({ danisman, kaynak, tarih, kampanya }) {
  const vipSecili = kaynak.secili.length === VIP_KAYNAKLAR.length && VIP_KAYNAKLAR.every(id => kaynak.secili.includes(id));
  const { ipucu, ...tarihOzellik } = tarih;
  return (
    <div style={c.panel}>
      <style>{VIP_CSS}</style>
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
        {danisman && (
          <Cerceve tur="danisman">
            <DanismanSecici danismanlar={danisman.liste} secili={danisman.secili} onChange={danisman.onChange} tekli={danisman.tekli}
              bosMetin={danisman.bosMetin} yukleniyor={danisman.yukleniyor} />
          </Cerceve>
        )}
        <Cerceve tur="kaynak">
          <KaynakSecici kaynaklar={KAYNAKLAR} secili={kaynak.secili} onChange={kaynak.onChange} bosMetin={kaynak.bosMetin || "Tüm kaynaklar"} />
          <Ipucu metin={VIP_ACIKLAMA} isaret={false}>
            <button onClick={() => kaynak.onChange(vipSecili ? TUM_KAYNAKLAR : VIP_KAYNAKLAR)} role="switch" aria-checked={vipSecili}
              className={`vip-neon${vipSecili ? " vip-neon-aktif" : ""}`}>
              <span>★ VIP Datalar <b className="vip-durum">{vipSecili ? "ON" : "OFF"}</b></span>
            </button>
          </Ipucu>
        </Cerceve>
        <Cerceve tur="tarih" metin={ipucu}>
          <TarihSecici {...tarihOzellik} />
        </Cerceve>
        {kampanya && <KampanyaAra deger={kampanya.deger} onChange={kampanya.onChange} />}
      </div>
    </div>
  );
}

// Campaign Name "içerir" araması: yazmayı bırakınca (600 ms) üst bileşene gider; ✕ temizler
function KampanyaAra({ deger, onChange }) {
  const [yazi, setYazi] = useState(deger || "");
  useEffect(() => { setYazi(deger || ""); }, [deger]);
  useEffect(() => {
    if (yazi.trim() === (deger || "")) return;
    const z = setTimeout(() => onChange(yazi.trim()), 600);
    return () => clearTimeout(z);
  }, [yazi]);
  return (
    <Cerceve tur="kampanya" metin="Campaign Name bu metni içeren datalar listelenir (büyük/küçük harf fark etmez).">
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <input value={yazi} onChange={e => setYazi(e.target.value.slice(0, 100))} placeholder="Campaign Name içerir..." aria-label="Campaign Name içerir"
          style={{ height: "34px", width: "220px", padding: "0 30px 0 14px", borderRadius: "999px", border: `1.5px solid ${yazi ? "#db2777" : "#e2e8f0"}`,
            background: yazi ? "#fdf2f8" : "#fff", color: "#0f172a", fontSize: "12px", fontWeight: 600, fontFamily: "'Sora', sans-serif", outline: "none" }} />
        {yazi && (
          <button type="button" onClick={() => { setYazi(""); onChange(""); }} aria-label="Aramayı temizle"
            style={{ position: "absolute", right: "8px", border: "none", background: "transparent", color: "#9d174d", cursor: "pointer", fontSize: "12px", padding: "2px" }}>✕</button>
        )}
      </span>
    </Cerceve>
  );
}

const VIP_CSS = `
.vip-neon { position: relative; isolation: isolate; overflow: hidden; padding: 2px; border: none; border-radius: 999px;
  background: transparent; cursor: pointer; font-family: 'Sora', sans-serif; animation: vipParilti 2.4s ease-in-out infinite; }
.vip-neon::before { content: ""; position: absolute; inset: -200%; z-index: -1;
  background: conic-gradient(from 0deg, transparent 0 55%, #f59e0b 65%, #fde047 72%, #f472b6 80%, #a855f7 88%, transparent 95%);
  animation: vipDon 2.4s linear infinite; }
.vip-neon > span { display: flex; align-items: center; gap: 8px; padding: 5px 8px 5px 14px; border-radius: 999px; background: #f8fafc; color: #94a3b8;
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
