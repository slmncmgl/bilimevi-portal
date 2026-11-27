// v1.1: AiSatirPenceresi — listede satırın üzerine gelince işaretler ve kanıtları özel pencerede
// v1.0: Haftalık Claude analizinin (notları okuyarak) koyduğu işaretler: ⛔ vakit kaybetme, 🛂 vize avantajı, 🔥 sıcak data, ⚠️ risk.
// Veri: crm-rapor "aiIsaretleri" (n8n Data Table "AI İşaretleri"). İkonun üzerine gelince kanıt cümlesi görünür.
import { createPortal } from "react-dom";

export const AI_TURLER = {
  sicak: { ikon: "🔥", ad: "Sıcak data", renk: "#b91c1c", zemin: "#fef2f2" },
  vize: { ikon: "🛂", ad: "Vize avantajı", renk: "#1d4ed8", zemin: "#eff6ff" },
  risk: { ikon: "⚠️", ad: "Risk notu", renk: "#b45309", zemin: "#fffbeb" },
  vakit: { ikon: "⛔", ad: "Vakit kaybetme", renk: "#475569", zemin: "#f1f5f9" },
};
export const AI_SIRA = ["sicak", "vize", "risk", "vakit"];

const tarihYaz = t => (t && /^\d{4}-\d{2}-\d{2}/.test(t) ? `${t.slice(8, 10)}.${t.slice(5, 7)}` : "");

// Listede ismin yanında küçük ikonlar
export function AiIkonlar({ ai }) {
  if (!ai?.turler?.length) return null;
  const turler = AI_SIRA.filter(t => ai.turler.includes(t));
  // Kanıtlar satırın üzerine gelince AiSatirPenceresi'nde görünür
  return (
    <span aria-label={`AI işaretleri: ${turler.map(t => AI_TURLER[t].ad).join(", ")}`}
      style={{ display: "inline-flex", gap: "2px", marginLeft: "6px", verticalAlign: "middle", fontSize: "14px", lineHeight: 1 }}>
      {turler.map(t => <span key={t}>{AI_TURLER[t].ikon}</span>)}
    </span>
  );
}

// Ele Al kartında: işaretler kanıtıyla açık yazılır
export function AiKanitlar({ ai }) {
  if (!ai?.turler?.length) return null;
  const turler = AI_SIRA.filter(t => ai.turler.includes(t));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "10px 0 4px" }}>
      {turler.map(t => {
        const d = (ai.detay || []).find(x => x.tur === t);
        const r = AI_TURLER[t];
        return (
          <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "7px 10px", borderRadius: "10px", background: r.zemin, color: r.renk, fontSize: "12.5px", lineHeight: 1.45 }}>
            <span style={{ fontSize: "15px", lineHeight: 1.2 }}>{r.ikon}</span>
            <span><b>{r.ad}</b>{d?.kanit ? ` · ${d.kanit}` : ""}{d?.tarih ? <span style={{ opacity: 0.7 }}> ({tarihYaz(d.tarih)} notu)</span> : null}</span>
          </div>
        );
      })}
    </div>
  );
}

// Liste satırının üzerine gelince açılan pencere (fare olaylarını engellemez). konum: satırın getBoundingClientRect()
export function AiSatirPenceresi({ ai, konum }) {
  if (!ai?.turler?.length || !konum) return null;
  const GEN = 380, tahminiYuk = 70 + ai.turler.length * 52;
  const asagi = konum.bottom + tahminiYuk + 12 < window.innerHeight;
  const left = Math.max(8, Math.min(konum.left + 48, window.innerWidth - GEN - 8));
  const top = asagi ? konum.bottom + 6 : Math.max(8, konum.top - tahminiYuk - 6);
  return createPortal(
    <div role="tooltip" style={{ position: "fixed", left, top, width: GEN, zIndex: 9500, pointerEvents: "none", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px",
      boxShadow: "0 16px 40px rgba(15,23,42,0.18)", padding: "12px 14px 10px", fontFamily: "'Sora', sans-serif", animation: "aiSatirGel .12s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" /></svg>
        AI işaretleri
        {ai.analiz && <span style={{ marginLeft: "auto", fontWeight: 600, color: "#94a3b8", textTransform: "none", letterSpacing: 0 }}>analiz {tarihYaz(ai.analiz.slice(0, 10))}</span>}
      </div>
      <AiKanitlar ai={ai} />
      <style>{`@keyframes aiSatirGel { from { opacity: 0; transform: translateY(${asagi ? "-4px" : "4px"}); } to { opacity: 1; transform: none; } }`}</style>
    </div>,
    document.body
  );
}
