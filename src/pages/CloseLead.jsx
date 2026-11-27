// v1.0: Takip Tablosu satırında (Notlar sütunu, not ikonunun yanında) "Close / Lead" düğmesi.
// Tıklayınca datanın notları okunur, kural motoru (notAnalizi) kapanış kodu önerir; haftalık AI işareti (⛔ / ⚠️) varsa kanıtı,
// yoksa kural gerekçesi nota peşinen yazılır, danışman altına ekleyip düzenleyebilir. Kaydet: önce not, sonra aşama (crm-rapor notEkle + asamaDegistir).
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { apiCagir } from "./CrmRaporu";
import { KAPANISLAR } from "./EleAl";
import { leadAnaliz } from "../lib/notAnalizi";

const MOR = "#7c3aed";
export const AI_KAPAT_NOTU = "AI Önerisi ile inceledim ve kapattım.";
const ENAZ = 2;

export function CloseLeadDugmesi({ onClick }) {
  return (
    <button type="button" className="kapat-lead-btn" onClick={onClick} title="Close Lead: AI kapanış önerisiyle kapat">
      <span>Close</span><span>Lead</span>
      <style>{`.kapat-lead-btn { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; height: 30px; padding: 0 7px;
        border: 1.5px solid #fecaca; border-radius: 8px; background: #fff; color: #b91c1c; font-family: 'Sora', sans-serif; font-size: 9.5px; font-weight: 800;
        line-height: 1; letter-spacing: 0.2px; cursor: pointer; transition: background .15s, border-color .15s; }
        .kapat-lead-btn:hover { background: #fef2f2; border-color: #f87171; }
        .kapat-lead-btn:focus-visible { outline: 3px solid #fecaca; outline-offset: 2px; }`}</style>
    </button>
  );
}

// lead: { id, ad, ownerId }, ai: aiIsaret[lead.id], kisiAdi(ownerId)
export function CloseLeadPenceresi({ lead, ai, kisiAdi, onKapat, onTamam }) {
  const [durum, setDurum] = useState("yukleniyor"); // yukleniyor | hazir | gidiyor | hata
  const [hata, setHata] = useState("");
  const [oneri, setOneri] = useState(null); // { asama, sebep }
  const [secim, setSecim] = useState(null);
  const [metin, setMetin] = useState("");
  const alan = useRef(null);

  useEffect(() => {
    let iptal = false;
    apiCagir({ islem: "notlar", leadId: lead.id, ownerId: lead.ownerId, boyut: 100 })
      .then(d => {
        if (iptal) return;
        const a = leadAnaliz(lead.id, kisiAdi ? kisiAdi(lead.ownerId) : "", d.notlar || []);
        const aiKanit = ["vakit", "risk"].map(t => (ai?.detay || []).find(x => x.tur === t)?.kanit).find(Boolean);
        const gerekce = aiKanit || a.kisa_gerekce || "";
        setOneri(a.kapanis);
        setSecim(a.kapanis);
        setMetin([gerekce, AI_KAPAT_NOTU].filter(Boolean).join("\n") + "\n\n");
        setDurum("hazir");
      })
      .catch(e => { if (!iptal) { setHata(e.message); setDurum("hata"); } });
    return () => { iptal = true; };
  }, [lead.id]);

  useEffect(() => {
    if (durum !== "hazir" || !alan.current) return;
    const el = alan.current; el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  }, [durum === "hazir"]);

  useEffect(() => {
    const tus = e => { if (e.key === "Escape" && durum !== "gidiyor") { e.stopPropagation(); onKapat(); } };
    document.addEventListener("keydown", tus, true);
    return () => document.removeEventListener("keydown", tus, true);
  }, [durum]);

  async function kaydet() {
    setDurum("gidiyor"); setHata("");
    try {
      await apiCagir({ islem: "notEkle", leadId: lead.id, metin: metin.trim() });
      await apiCagir({ islem: "asamaDegistir", leadId: lead.id, asama: secim.asama, sebep: secim.sebep });
      onTamam(lead.id);
    } catch (e) { setHata(e.message); setDurum("hazir"); }
  }

  const secili = KAPANISLAR.find(k => k.id === secim?.asama);
  const gidiyor = durum === "gidiyor";
  const hazir = secim && metin.trim().length >= ENAZ && !gidiyor;
  return createPortal(
    <div onClick={() => !gidiyor && onKapat()} style={{ position: "fixed", inset: 0, zIndex: 9700, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Sora', sans-serif" }}>
      <div role="dialog" aria-modal="true" aria-label="Close Lead" onClick={e => e.stopPropagation()}
        style={{ width: "min(660px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: "20px", padding: "22px 24px", boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
        <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>{lead.ad || `Data ${lead.id}`} · Close Lead</div>
        {durum === "yukleniyor" && <div style={{ padding: "28px 0", textAlign: "center", color: "#64748b", fontSize: "13px" }}>Notlar okunuyor, AI kapanış önerisi hazırlanıyor…</div>}
        {durum === "hata" && !oneri && <div style={{ padding: "18px 0", color: "#991b1b", fontSize: "13px" }}>{hata || "Notlar alınamadı."}</div>}
        {(durum === "hazir" || gidiyor) && (<>
          <div style={{ fontSize: "13px", color: "#475569", margin: "6px 0 16px" }}>Kapanış sebebini seçin. <span style={{ color: MOR, fontWeight: 700 }}>AI önerisi</span> seçili geldi.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
            {KAPANISLAR.map(k => (
              <div key={k.id} style={{ border: `1.5px solid ${secim?.asama === k.id ? k.renk : k.cerceve}`, borderRadius: "14px", padding: "12px 10px 8px", background: secim?.asama === k.id ? k.zemin : "#fff" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: k.renk, padding: "0 6px 6px" }}>{k.ad}</div>
                {k.sebepler.map(x => {
                  const sec = secim?.asama === k.id && secim.sebep === x;
                  const ai = oneri?.asama === k.id && oneri.sebep === x;
                  return (
                    <label key={x} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "7px 6px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: sec ? 700 : 500, color: sec ? k.renk : "#0f172a", background: sec ? "#fff" : "transparent" }}>
                      <input type="radio" name="closeLead" checked={sec} disabled={gidiyor} onChange={() => setSecim({ asama: k.id, sebep: x })} style={{ accentColor: k.renk, width: "15px", height: "15px", margin: 0, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{x}</span>
                      {ai && <span style={{ padding: "1px 7px", borderRadius: "999px", background: "#f5f3ff", color: MOR, fontSize: "10px", fontWeight: 800, whiteSpace: "nowrap" }}>AI önerisi</span>}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>CRM'e yazılacak not</div>
            <textarea ref={alan} value={metin} onChange={e => setMetin(e.target.value)} disabled={gidiyor} rows={5}
              placeholder="Kapanış notu"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontFamily: "inherit", fontSize: "13px", lineHeight: 1.5, color: "#0f172a", resize: "vertical", outline: "none" }} />
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>AI notu yazıldı; altına kendi notunu ekleyebilir ya da düzenleyebilirsin.</div>
          </div>
          {hata && <div style={{ marginTop: "10px", color: "#991b1b", fontSize: "12.5px" }}>{hata}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
            <button type="button" onClick={onKapat} disabled={gidiyor} style={{ padding: "9px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Vazgeç</button>
            <button type="button" disabled={!hazir} onClick={kaydet}
              style={{ padding: "9px 18px", borderRadius: "12px", border: "none", background: secili?.renk || "#94a3b8", color: "#fff", fontWeight: 700, cursor: hazir ? "pointer" : "default", opacity: hazir ? 1 : 0.5, fontFamily: "inherit" }}>
              {gidiyor ? "CRM'e yazılıyor…" : secili ? `${secili.ad} olarak kapat` : "Sebep seçin"}
            </button>
          </div>
        </>)}
      </div>
    </div>,
    document.body
  );
}
