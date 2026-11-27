// v1.1: düğmeler "Renkli" (v1) ve "Sade" (v2)
// v1.0: Tema v1 (renkli) / v2 (kurumsal lacivert) küçük anahtarı; sayfanın altında sürüm etiketinin yanında durur. Seçim portal geneli (src/lib/tema.js).
import { useTema, temaAyarla } from "../lib/tema";

export default function TemaSecici() {
  const tema = useTema();
  return (
    <div role="radiogroup" aria-label="Tema" style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px", borderRadius: "999px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "10px", fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
      <span style={{ padding: "0 5px 0 7px", color: "#94a3b8" }}>Tema</span>
      {[["v1", "Renkli"], ["v2", "Sade"]].map(([v, ad]) => (
        <button key={v} type="button" role="radio" aria-checked={tema === v} onClick={() => temaAyarla(v)}
          style={{ padding: "2px 8px", borderRadius: "999px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", fontWeight: 700,
            background: tema === v ? (v === "v2" ? "#001A71" : "linear-gradient(90deg, #0891b2, #7c3aed)") : "transparent", color: tema === v ? "#fff" : "#64748b" }}>{ad}</button>
      ))}
    </div>
  );
}
