// v1.0: Ele Al üst şeridinde basit pomodoro. Saat ikonu; tıklayınca 5-10-15-20-25 dk seçilir, tek tur.
// Süre bitince onBitti() çağrılır (şerit yeşil yanar), 3 sn "Mola ver" yazar, sonra sıfırlanır.
import { useState, useEffect, useRef } from "react";

const SURELER = [5, 10, 15, 20, 25];
const MOLA_MS = 3000;

function ikiHane(n) { return String(n).padStart(2, "0"); }

export default function Pomodoro({ onBitti }) {
  const [acik, setAcik] = useState(false);
  const [bitis, setBitis] = useState(null); // bitiş zamanı (ms) ya da null
  const [kalan, setKalan] = useState(0);
  const [mola, setMola] = useState(false);
  const kutu = useRef(null);

  useEffect(() => {
    if (!bitis) return;
    const tik = () => {
      const k = Math.max(0, bitis - Date.now());
      setKalan(k);
      if (k === 0) {
        setBitis(null);
        setMola(true);
        onBitti && onBitti();
      }
    };
    tik();
    const id = setInterval(tik, 250);
    return () => clearInterval(id);
  }, [bitis]);

  useEffect(() => {
    if (!mola) return;
    const id = setTimeout(() => setMola(false), MOLA_MS);
    return () => clearTimeout(id);
  }, [mola]);

  useEffect(() => {
    if (!acik) return;
    const dis = e => { if (kutu.current && !kutu.current.contains(e.target)) setAcik(false); };
    document.addEventListener("mousedown", dis);
    return () => document.removeEventListener("mousedown", dis);
  }, [acik]);

  function baslat(dk) {
    setMola(false);
    setBitis(Date.now() + dk * 60000);
    setAcik(false);
  }
  function durdur() {
    setBitis(null);
    setKalan(0);
    setAcik(false);
  }

  const calisiyor = !!bitis;
  const sn = Math.ceil(kalan / 1000);
  const metin = mola ? "Mola ver ☕" : calisiyor ? `${ikiHane(Math.floor(sn / 60))}:${ikiHane(sn % 60)}` : null;

  return (
    <div ref={kutu} style={{ position: "relative", flexShrink: 0 }}>
      <button type="button" onClick={() => setAcik(!acik)} title={calisiyor ? "Pomodoro" : "Pomodoro başlat"} aria-label="Pomodoro"
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px", height: "30px", padding: metin ? "0 10px 0 8px" : 0,
          width: metin ? "auto" : "30px", justifyContent: "center", borderRadius: "999px",
          border: `1px solid ${mola ? "#86efac" : calisiyor ? "#a5b4fc" : "#e2e8f0"}`,
          background: mola ? "#dcfce7" : calisiyor ? "#eef2ff" : "rgba(255,255,255,0.7)",
          color: mola ? "#15803d" : calisiyor ? "#4338ca" : "#64748b",
          fontSize: "13px", fontWeight: 700, fontVariantNumeric: "tabular-nums", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M10 2h4" />
        </svg>
        {metin}
      </button>
      {acik && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, display: "flex", alignItems: "center", gap: "4px", padding: "6px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}>
          {calisiyor ? (
            <button type="button" onClick={durdur}
              style={{ padding: "6px 12px", border: "none", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Durdur
            </button>
          ) : SURELER.map(dk => (
            <button key={dk} type="button" onClick={() => baslat(dk)}
              style={{ padding: "6px 10px", border: "none", borderRadius: "8px", background: "#f1f5f9", color: "#0f172a", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = "#e0e7ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>
              {dk} dk
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
