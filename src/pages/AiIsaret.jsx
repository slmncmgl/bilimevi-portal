// v1.0: Haftalık Claude analizinin (notları okuyarak) koyduğu işaretler: ⛔ vakit kaybetme, 🛂 vize avantajı, 🔥 sıcak data, ⚠️ risk.
// Veri: crm-rapor "aiIsaretleri" (n8n Data Table "AI İşaretleri"). İkonun üzerine gelince kanıt cümlesi görünür.
import Ipucu from "./Ipucu";

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
  const metin = turler.map(t => {
    const d = (ai.detay || []).find(x => x.tur === t);
    return `${AI_TURLER[t].ikon} ${AI_TURLER[t].ad}: ${d?.kanit || ""}${d?.tarih ? ` (${tarihYaz(d.tarih)} notu)` : ""}`;
  }).join("\n") + (ai.analiz ? `\n\nAI analizi: ${tarihYaz(ai.analiz.slice(0, 10))}` : "");
  return (
    <Ipucu metin={metin} isaret={false}>
      <span aria-label={`AI işaretleri: ${turler.map(t => AI_TURLER[t].ad).join(", ")}`}
        style={{ display: "inline-flex", gap: "2px", marginLeft: "6px", verticalAlign: "middle", cursor: "help", fontSize: "14px", lineHeight: 1 }}>
        {turler.map(t => <span key={t}>{AI_TURLER[t].ikon}</span>)}
      </span>
    </Ipucu>
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
