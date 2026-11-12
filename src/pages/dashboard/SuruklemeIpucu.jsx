import { useEffect, useRef, useState } from "react";

// Klasik temada sürükle-bırak özelliği için bilgi ikonu (v2: banner yerine kırmızı "i"; v2.1: üst şeritte, ismin solunda).
// Sadece fareli cihazlarda (sürükleme orada var) ve en az 2 kart varken görünür.
// Okunana kadar kalp gibi atar; tıklanınca bilgi balonu açılır ve "okundu" bilgisi kullanıcı başına tarayıcıda saklanır.
// Okunduktan (ya da kullanıcı sürüklemeye başladıktan) sonra ikon sakin durur, istenirse yine açılır.
// Yeni anahtar: eski banner'ı görmüş olanlarda da ikon bir kez atsın
const anahtar = kullanici => `portal-surukle-ipucu-okundu-v2:${kullanici}`;

const METIN = {
  tr: { baslik: "Biliyor muydunuz?", metin: "Kartları sürükleyip ekranda istediğiniz yere bırakabilir, görünümünüzü kişiselleştirebilirsiniz.", kapat: "Kapat", ikon: "Sürükle-bırak ipucu" },
  en: { baslik: "Did you know?", metin: "Drag the cards anywhere on the screen to personalise your layout.", kapat: "Close", ikon: "Drag and drop tip" },
};

export default function SuruklemeIpucu({ kullanici, isFortis, suruklendi, kartSayisi }) {
  const [gorunur, setGorunur] = useState(false);
  const [acik, setAcik] = useState(false);
  const [okundu, setOkundu] = useState(false);
  const kutuRef = useRef(null);
  const t = METIN[isFortis ? "en" : "tr"];

  useEffect(() => {
    if (!kullanici || kartSayisi < 2) return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    try { setOkundu(!!localStorage.getItem(anahtar(kullanici))); } catch (e) { /* depolama kapalı */ }
    setGorunur(true);
  }, [kullanici, kartSayisi]);

  const okunduYap = () => {
    setOkundu(true);
    try { localStorage.setItem(anahtar(kullanici), "1"); } catch (e) { /* depolama kapalı */ }
  };

  useEffect(() => { if (suruklendi) { setAcik(false); okunduYap(); } }, [suruklendi]);

  // Balon açıkken dışarı tıklayınca ya da Esc'ye basınca kapanır
  useEffect(() => {
    if (!acik) return;
    const disari = e => { if (kutuRef.current && !kutuRef.current.contains(e.target)) setAcik(false); };
    const esc = e => { if (e.key === "Escape") setAcik(false); };
    document.addEventListener("mousedown", disari);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", disari); document.removeEventListener("keydown", esc); };
  }, [acik]);

  if (!gorunur) return null;

  return (
    <div className="surukle-ipucu" ref={kutuRef}>
      <button
        type="button"
        className={`ikon${okundu ? "" : " atiyor"}`}
        onClick={() => { setAcik(v => !v); okunduYap(); }}
        aria-label={t.ikon}
        aria-expanded={acik}
        title={t.ikon}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 11v6" /><path d="M12 7.2v.1" />
        </svg>
      </button>
      {acik && (
        <div className="balon" role="dialog" aria-label={t.baslik}>
          <div className="ust">
            <strong>{t.baslik}</strong>
            <button type="button" onClick={() => setAcik(false)} aria-label={t.kapat}>×</button>
          </div>
          <div className="govde">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
            </svg>
            <p>{t.metin}</p>
          </div>
        </div>
      )}
      <style>{`
        .surukle-ipucu { position: relative; flex: none; z-index: 250; font-family: 'Inter', system-ui, sans-serif; }
        .surukle-ipucu .ikon { width: 30px; height: 30px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
          display: flex; align-items: center; justify-content: center; background: #E50700; color: #fff;
          box-shadow: 0 4px 10px -3px rgba(229,7,0,.55), 0 1px 2px rgba(0,0,0,.12); transition: transform .15s; }
        .surukle-ipucu .ikon:hover { transform: scale(1.08); }
        .surukle-ipucu .ikon:focus-visible { outline: 2px solid #E50700; outline-offset: 3px; }
        /* Kalp atışı: iki kısa vuruş + dalga halkası, okunana kadar */
        .surukle-ipucu .ikon.atiyor { animation: ipucuKalp 1.6s ease-in-out infinite; }
        .surukle-ipucu .ikon.atiyor::after { content: ""; position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid #E50700; animation: ipucuHalka 1.6s ease-out infinite; pointer-events: none; }
        .surukle-ipucu .ikon { position: relative; }
        .surukle-ipucu .balon { position: absolute; top: calc(100% + 12px); right: -8px; width: min(320px, calc(100vw - 40px));
          background: #E50700; color: #fff; border-radius: 14px; padding: 12px 14px 14px;
          box-shadow: 0 18px 40px -12px rgba(229,7,0,.55), 0 2px 6px rgba(0,0,0,.12); animation: ipucuGir .25s cubic-bezier(.16,1,.3,1) both; }
        .surukle-ipucu .balon::before { content: ""; position: absolute; top: -6px; right: 17px; width: 12px; height: 12px;
          background: #E50700; transform: rotate(45deg); border-radius: 2px; }
        .surukle-ipucu .ust { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .surukle-ipucu .ust strong { font-size: 13px; letter-spacing: .02em; text-transform: uppercase; opacity: .9; }
        .surukle-ipucu .ust button { width: 26px; height: 26px; border: 0; border-radius: 7px; background: rgba(255,255,255,.16);
          color: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
        .surukle-ipucu .ust button:hover { background: rgba(255,255,255,.28); }
        .surukle-ipucu .govde { display: flex; gap: 10px; align-items: flex-start; }
        .surukle-ipucu .govde svg { flex: none; margin-top: 2px; }
        .surukle-ipucu .govde p { margin: 0; font-size: 14px; line-height: 1.45; font-weight: 600; }
        @keyframes ipucuKalp { 0%, 40%, 100% { transform: scale(1); } 10% { transform: scale(1.16); } 20% { transform: scale(1.02); } 30% { transform: scale(1.12); } }
        @keyframes ipucuHalka { 0% { opacity: .6; transform: scale(1); } 70%, 100% { opacity: 0; transform: scale(1.8); } }
        @keyframes ipucuGir { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .surukle-ipucu .ikon.atiyor, .surukle-ipucu .ikon.atiyor::after, .surukle-ipucu .balon { animation: none; }
        }
      `}</style>
    </div>
  );
}
