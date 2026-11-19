// v1.1: ikon özelliği (varsayılan ⇄); Ele al çıkış onayında "!"
// v1.0: portal renklerinde onay penceresi (tarayıcının confirm kutusu yerine). Data Tablosu > Danışman Ata kullanır.
// Esc ya da arka plana tıklama: Vazgeç. Açılınca odak onay düğmesinde, Enter onaylar.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function OnayPenceresi({ ikon = "⇄", baslik, children, onayMetni = "Onayla", vazgecMetni = "Vazgeç", onOnay, onVazgec }) {
  const onayRef = useRef(null);

  useEffect(() => {
    onayRef.current?.focus();
    const tus = e => { if (e.key === "Escape") onVazgec(); };
    document.addEventListener("keydown", tus);
    const eskiTasma = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", tus); document.body.style.overflow = eskiTasma; };
  }, []);

  return createPortal(
    <div style={o.arka} onMouseDown={e => { if (e.target === e.currentTarget) onVazgec(); }}>
      <style>{`@keyframes onayGir { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
      <div role="dialog" aria-modal="true" aria-labelledby="onay-baslik" style={o.kutu}>
        <div style={o.ust}>
          <span style={o.ikon}>{ikon}</span>
          <h3 id="onay-baslik" style={o.baslik}>{baslik}</h3>
        </div>
        <div style={o.govde}>{children}</div>
        <div style={o.alt}>
          <button type="button" onClick={onVazgec} style={o.vazgec}>{vazgecMetni}</button>
          <button type="button" ref={onayRef} onClick={onOnay} style={o.onay}>{onayMetni}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const o = {
  arka: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(3px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" },
  kutu: { width: "min(440px, 100%)", background: "#fff", borderRadius: "20px", border: "1.5px solid #e2e8f0",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)", overflow: "hidden", fontFamily: "'Sora', sans-serif", animation: "onayGir 0.18s ease-out" },
  ust: { display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px 0" },
  ikon: { width: "36px", height: "36px", borderRadius: "12px", background: "#ecfeff", border: "1.5px solid #a5f3fc", color: "#0891b2",
    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, flexShrink: 0 },
  baslik: { margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" },
  govde: { padding: "14px 24px 20px", fontSize: "13px", lineHeight: 1.6, color: "#475569" },
  alt: { display: "flex", justifyContent: "flex-end", gap: "8px", padding: "14px 24px", background: "#f8fafc", borderTop: "1px solid #f1f5f9" },
  vazgec: { padding: "8px 18px", borderRadius: "999px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
    fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  onay: { padding: "8px 20px", borderRadius: "999px", border: "1.5px solid #0891b2", background: "#0891b2", color: "#fff",
    fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 4px 12px rgba(8, 145, 178, 0.3)" },
};
