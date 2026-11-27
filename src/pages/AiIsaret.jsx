// v1.4: ⛔ Vakit kaybetme işaretli datada pencerenin altında "Close Lead" düğmesi (onCloseLead)
// v1.3: satır penceresi satıra bitişik (boşluk 6 → 1 px); pencerenin üzerindeyken her fare hareketi açık tutar (onMouseOver/Move)
// v1.2: kanıt cümlesinin yanında kopyala ikonu (satır penceresinin üzerine gelince pencere açık kalır)
// v1.1: AiSatirPenceresi — listede satırın üzerine gelince işaretler ve kanıtları özel pencerede
// v1.0: Haftalık Claude analizinin (notları okuyarak) koyduğu işaretler: ⛔ vakit kaybetme, 🛂 vize avantajı, 🔥 sıcak data, ⚠️ risk.
// Veri: crm-rapor "aiIsaretleri" (n8n Data Table "AI İşaretleri"). İkonun üzerine gelince kanıt cümlesi görünür.
import { useState } from "react";
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

function KopyalaIkonu({ metin, renk }) {
  const [tamam, setTamam] = useState(false);
  const kopyala = async e => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(metin); }
    catch { const t = document.createElement("textarea"); t.value = metin; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setTamam(true); setTimeout(() => setTamam(false), 1500);
  };
  return (
    <button type="button" onClick={kopyala} title={tamam ? "Kopyalandı" : "Açıklamayı kopyala"} aria-label="Açıklamayı kopyala"
      style={{ marginLeft: "auto", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px",
        border: "none", borderRadius: "7px", background: tamam ? "#dcfce7" : "rgba(255,255,255,0.7)", color: tamam ? "#16a34a" : renk, cursor: "pointer", padding: 0 }}>
      {tamam
        ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>}
    </button>
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
            {d?.kanit && <KopyalaIkonu metin={d.kanit} renk={r.renk} />}
          </div>
        );
      })}
    </div>
  );
}

// Liste satırının üzerine gelince açılan pencere; üzerine gelince açık kalır (kopyala için). onFare(true|false). konum: satırın getBoundingClientRect()
export function AiSatirPenceresi({ ai, konum, onFare, onCloseLead }) {
  if (!ai?.turler?.length || !konum) return null;
  const closeVar = onCloseLead && ai.turler.includes("vakit");
  const GEN = 380, tahminiYuk = 70 + ai.turler.length * 52 + (closeVar ? 46 : 0);
  const asagi = konum.bottom + tahminiYuk + 12 < window.innerHeight;
  const left = Math.max(8, Math.min(konum.left + 48, window.innerWidth - GEN - 8));
  const top = asagi ? konum.bottom + 1 : Math.max(8, konum.top - tahminiYuk - 1);
  return createPortal(
    <div role="tooltip" onMouseEnter={() => onFare && onFare(true)} onMouseOver={() => onFare && onFare(true)} onMouseMove={() => onFare && onFare(true)} onMouseLeave={() => onFare && onFare(false)}
      style={{ position: "fixed", left, top, width: GEN, zIndex: 9500, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px",
      boxShadow: "0 16px 40px rgba(15,23,42,0.18)", padding: "12px 14px 10px", fontFamily: "'Sora', sans-serif", animation: "aiSatirGel .12s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" /></svg>
        AI işaretleri
        {ai.analiz && <span style={{ marginLeft: "auto", fontWeight: 600, color: "#94a3b8", textTransform: "none", letterSpacing: 0 }}>analiz {tarihYaz(ai.analiz.slice(0, 10))}</span>}
      </div>
      <AiKanitlar ai={ai} />
      {closeVar && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <button type="button" onClick={onCloseLead} title="AI kapanış önerisiyle kapat"
            style={{ display: "inline-flex", alignItems: "center", height: "34px", padding: "0 16px", borderRadius: "10px", border: "none", background: "var(--marka)", color: "#fff",
              fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 4px 12px rgba(15,23,42,0.18)" }}>Close Lead</button>
        </div>
      )}
      <style>{`@keyframes aiSatirGel { from { opacity: 0; transform: translateY(${asagi ? "-4px" : "4px"}); } to { opacity: 1; transform: none; } }`}</style>
    </div>,
    document.body
  );
}
