// v1.0: üzerine gelince açılan açıklama balonu (Aktivite, Performans ve Data Tablosu ortak kullanır)
// Açıklamalar sayfada yazı olarak durmaz; ilgili başlığın, kartın ya da etiketin üzerine gelince balonda görünür.
// Balon document.body'ye çizilir (kartlardaki animasyon ve taşma kesmesi etkilemesin); ekranın altına yakınsa yukarı açılır.
// Kullanım: <Ipucu metin="...">Başlık</Ipucu>   blok: kartlar gibi tüm alanı saran div   isaret: metnin altına noktalı çizgi
import { useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function Ipucu({ metin, children, blok = false, isaret = true, style }) {
  const [konum, setKonum] = useState(null);
  const ref = useRef(null);
  if (!metin) return children;

  function ac() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const genislik = 280;
    const sol = Math.max(8, Math.min(r.left + r.width / 2 - genislik / 2, window.innerWidth - genislik - 8));
    const asagi = r.bottom + 160 < window.innerHeight;
    setKonum({ sol, ust: asagi ? r.bottom + 8 : r.top - 8, asagi, genislik });
  }

  const Kap = blok ? "div" : "span";
  return (
    <Kap ref={ref} onMouseEnter={ac} onMouseLeave={() => setKonum(null)} onFocus={ac} onBlur={() => setKonum(null)}
      style={{ ...(blok ? {} : { display: "inline-flex", alignItems: "center" }), ...(isaret && !blok ? i.isaret : {}), ...style }}>
      {children}
      {konum && createPortal(
        <span role="tooltip" style={{ ...i.balon, left: konum.sol, top: konum.ust, width: konum.genislik, transform: konum.asagi ? "none" : "translateY(-100%)" }}>
          {metin}
        </span>,
        document.body,
      )}
    </Kap>
  );
}

const i = {
  isaret: { cursor: "help", textDecoration: "underline dotted", textDecorationColor: "#94a3b8", textDecorationThickness: "1.5px", textUnderlineOffset: "3px" },
  balon: { position: "fixed", zIndex: 9999, padding: "9px 12px", borderRadius: "10px", background: "#0f172a", color: "#f8fafc",
    fontSize: "12px", fontWeight: 500, lineHeight: 1.45, letterSpacing: 0, textTransform: "none", textAlign: "left", whiteSpace: "normal",
    boxShadow: "0 10px 28px rgba(15,23,42,0.28)", pointerEvents: "none", fontFamily: "'Sora', sans-serif" },
};
