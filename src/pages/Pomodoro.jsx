// v1.3: bitince "Mola ver" tıklanana kadar kalır (şerit yeşil yanmaya devam eder); onMolaBitti ile söner
// v1.2: Duraklat / Devam et / Baştan başlat; sayaç başlayınca "Pomodoro" yazısı gizlenir
// v1.1: ikon 26px (sayaç puntosu), altında "Pomodoro" yazısı; süre ikonun yanında
// v1.0: Ele Al üst şeridinde basit pomodoro. Saat ikonu; tıklayınca 5-10-15-20-25 dk seçilir, tek tur.
// Süre bitince onBitti() çağrılır (şerit yeşil yanar), 3 sn "Mola ver" yazar, sonra sıfırlanır.
import { useState, useEffect, useRef } from "react";

const SURELER = [5, 10, 15, 20, 25];

const dugme = { padding: "6px 12px", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };

function ikiHane(n) { return String(n).padStart(2, "0"); }

export default function Pomodoro({ onBitti, onMolaBitti }) {
  const [acik, setAcik] = useState(false);
  const [bitis, setBitis] = useState(null); // bitiş zamanı (ms) ya da null
  const [kalan, setKalan] = useState(0);
  const [mola, setMola] = useState(false);
  const [sure, setSure] = useState(0);        // seçilen süre (dk)
  const [duraklat, setDuraklat] = useState(null); // duraklatıldıysa kalan ms
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
    if (!acik) return;
    const dis = e => { if (kutu.current && !kutu.current.contains(e.target)) setAcik(false); };
    document.addEventListener("mousedown", dis);
    return () => document.removeEventListener("mousedown", dis);
  }, [acik]);

  function baslat(dk) {
    setMola(false);
    setDuraklat(null);
    setSure(dk);
    setBitis(Date.now() + dk * 60000);
    setAcik(false);
  }
  function durakla() {
    setDuraklat(Math.max(0, bitis - Date.now()));
    setBitis(null);
    setAcik(false);
  }
  function devam() {
    setBitis(Date.now() + duraklat);
    setDuraklat(null);
    setAcik(false);
  }
  function durdur() {
    setDuraklat(null);
    setBitis(null);
    setKalan(0);
    setAcik(false);
  }

  const calisiyor = !!bitis;
  const durdu = duraklat !== null;
  const basladi = calisiyor || durdu;
  const sn = Math.ceil((durdu ? duraklat : kalan) / 1000);
  const metin = mola ? "Mola ver ☕" : basladi ? `${ikiHane(Math.floor(sn / 60))}:${ikiHane(sn % 60)}` : null;

  return (
    <div ref={kutu} style={{ position: "relative", flexShrink: 0 }}>
      <button type="button" onClick={() => { if (mola) { setMola(false); setKalan(0); onMolaBitti && onMolaBitti(); return; } setAcik(!acik); }} title={mola ? "Kapat" : calisiyor ? "Pomodoro" : "Pomodoro başlat"} aria-label="Pomodoro"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "2px 6px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
          color: mola ? "#15803d" : calisiyor ? "#4338ca" : durdu ? "#b45309" : "#475569" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M10 2h4" />
          </svg>
          {metin && <span style={{ fontSize: "20px", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{metin}</span>}
        </span>
        {!basladi && !mola && <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.2px", color: "#64748b" }}>Pomodoro</span>}
      </button>
      {acik && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: "4px", padding: "6px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}>
          {basladi ? (
            <>
              {calisiyor
                ? <button type="button" onClick={durakla} style={{ ...dugme, background: "#fef3c7", color: "#b45309" }}>Duraklat</button>
                : <button type="button" onClick={devam} style={{ ...dugme, background: "#dcfce7", color: "#15803d" }}>Devam et</button>}
              <button type="button" onClick={() => baslat(sure)} style={{ ...dugme, background: "#e0e7ff", color: "#4338ca" }}>Baştan başlat</button>
              <button type="button" onClick={durdur} style={{ ...dugme, background: "#fef2f2", color: "#dc2626" }}>Durdur</button>
            </>
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
