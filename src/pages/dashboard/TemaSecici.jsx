import { useEffect, useState } from "react";
import { TEMALAR } from "./tema";

// Sağ altta duran küçük görünüm seçici. Varsayılan gizli: 1, 2, 3 ve 0 tuşlarına birlikte 3 saniye basılınca
// açılır, aynı hareket tekrar kapatır. Açık/kapalı durumu tarayıcıda saklanır. Sayfa düzenine dokunmaz (position: fixed).
const GIZLI_TUSLAR = ["1", "2", "3", "0"];
const BASILI_SURE = 3000;
const ACIK_ANAHTARI = "portal-tema-secici-acik";

function acikOku() {
  try { return localStorage.getItem(ACIK_ANAHTARI) === "1"; } catch (e) { return false; }
}

export default function TemaSecici({ tema, onChange, isFortis }) {
  const [acik, setAcik] = useState(acikOku);

  useEffect(() => {
    const basili = new Set();
    let zamanlayici = null;
    const durdur = () => { clearTimeout(zamanlayici); zamanlayici = null; };
    // Numpad tuşları da sayılır (e.key yine "1" vb. gelir).
    const asagi = e => {
      if (!GIZLI_TUSLAR.includes(e.key)) return;
      basili.add(e.key);
      if (basili.size === GIZLI_TUSLAR.length && !zamanlayici) {
        zamanlayici = setTimeout(() => {
          zamanlayici = null;
          basili.clear();
          setAcik(a => {
            try { localStorage.setItem(ACIK_ANAHTARI, a ? "0" : "1"); } catch (err) {}
            return !a;
          });
        }, BASILI_SURE);
      }
    };
    const yukari = e => { if (basili.delete(e.key)) durdur(); };
    const sifirla = () => { basili.clear(); durdur(); };
    window.addEventListener("keydown", asagi);
    window.addEventListener("keyup", yukari);
    window.addEventListener("blur", sifirla);
    return () => {
      durdur();
      window.removeEventListener("keydown", asagi);
      window.removeEventListener("keyup", yukari);
      window.removeEventListener("blur", sifirla);
    };
  }, []);

  if (!acik) return null;

  return (
    <div className="tema-secici" role="group" aria-label={isFortis ? "Layout" : "Görünüm"}>
      <span>{isFortis ? "Layout" : "Görünüm"}</span>
      {TEMALAR.map(t => (
        <button key={t.key} type="button" aria-pressed={tema === t.key} onClick={() => onChange(t.key)}>
          {isFortis ? t.en : t.tr}
        </button>
      ))}
      <style>{`
        .tema-secici { position: fixed; right: 16px; bottom: 16px; z-index: 200; display: flex; align-items: center; gap: 2px;
          padding: 4px; background: #fff; border: 1px solid #d3d8e4; border-radius: 10px; box-shadow: 0 8px 24px -10px rgba(0,17,77,.3);
          font-family: 'Inter', system-ui, sans-serif; }
        .tema-secici span { font-size: 11px; font-weight: 600; color: #646569; padding: 0 8px 0 6px; }
        .tema-secici button { font: 500 12px/1 'Inter', system-ui, sans-serif; color: #141b33; background: none; border: 0;
          border-radius: 7px; padding: 7px 10px; cursor: pointer; }
        .tema-secici button:hover { background: #eef1fa; }
        .tema-secici button[aria-pressed="true"] { background: #001A71; color: #fff; }
        .tema-secici button:focus-visible { outline: 2px solid #E50700; outline-offset: 1px; }
        @media (max-width: 640px) {
          /* Seçici sayfanın son kartını örtmesin. */
          body { padding-bottom: 56px; }
          .tema-secici { right: 8px; bottom: 8px; }
          .tema-secici span { display: none; }
        }
      `}</style>
    </div>
  );
}
