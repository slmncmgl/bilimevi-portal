import { useEffect, useState } from "react";

// Klasik temada sürükle-bırak özelliğini duyuran tek seferlik uyarı.
// Sadece fareli cihazlarda (sürükleme orada var) ve bir kez gösterilir; 10 saniye sonra ya da kapatılınca,
// ya da kullanıcı sürüklemeye başlayınca kaybolur. Görüldü bilgisi kullanıcı başına tarayıcıda saklanır.
const SURE = 10000;
const anahtar = kullanici => `portal-surukle-ipucu-goruldu:${kullanici}`;

const METIN = {
  tr: { yeni: "Yeni", metin: "Kartları sürükleyip ekranda istediğiniz yere bırakabilir, görünümünüzü kişiselleştirebilirsiniz.", kapat: "Kapat" },
  en: { yeni: "New", metin: "Drag the cards anywhere on the screen to personalise your layout.", kapat: "Close" },
};

export default function SuruklemeIpucu({ kullanici, isFortis, suruklendi, kartSayisi }) {
  const [acik, setAcik] = useState(false);
  const t = METIN[isFortis ? "en" : "tr"];

  useEffect(() => {
    if (!kullanici || kartSayisi < 2) return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    try {
      if (localStorage.getItem(anahtar(kullanici))) return;
    } catch (e) { return; }
    // Kartların açılış animasyonu bitsin, sonra görünsün. "Görüldü" ancak ekrana gelince yazılır.
    const ac = setTimeout(() => {
      try { localStorage.setItem(anahtar(kullanici), "1"); } catch (e) {}
      setAcik(true);
    }, 900);
    const kapat = setTimeout(() => setAcik(false), 900 + SURE);
    return () => { clearTimeout(ac); clearTimeout(kapat); };
  }, [kullanici, kartSayisi]);

  useEffect(() => { if (suruklendi) setAcik(false); }, [suruklendi]);

  if (!acik) return null;

  return (
    <div className="surukle-ipucu" role="status" aria-live="polite">
      <span className="rozet">{t.yeni}</span>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
      </svg>
      <p>{t.metin}</p>
      <button type="button" onClick={() => setAcik(false)} aria-label={t.kapat}>×</button>
      <span className="sure" aria-hidden="true" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&display=swap');
        .surukle-ipucu { position: fixed; top: 84px; left: 50%; z-index: 250; transform: translateX(-50%);
          width: min(640px, calc(100vw - 32px)); display: flex; align-items: center; gap: 14px;
          padding: 16px 16px 18px 18px; background: #E50700; color: #fff; border-radius: 14px; overflow: hidden;
          box-shadow: 0 18px 40px -12px rgba(229,7,0,.55), 0 2px 6px rgba(0,0,0,.12);
          font-family: 'Inter', system-ui, sans-serif; animation: ipucuGir .45s cubic-bezier(.16,1,.3,1) both; }
        .surukle-ipucu .rozet { flex: none; background: #fff; color: #E50700; border-radius: 6px; padding: 5px 9px 4px;
          font: 700 15px/1 'Barlow Condensed', 'Arial Narrow', sans-serif; letter-spacing: .12em; text-transform: uppercase; }
        .surukle-ipucu svg { flex: none; }
        .surukle-ipucu p { flex: 1; margin: 0; font-size: 15px; line-height: 1.4; font-weight: 600; letter-spacing: -.005em; }
        .surukle-ipucu button { flex: none; width: 32px; height: 32px; border: 0; border-radius: 8px; background: rgba(255,255,255,.16);
          color: #fff; font-size: 20px; line-height: 1; cursor: pointer; }
        .surukle-ipucu button:hover { background: rgba(255,255,255,.28); }
        .surukle-ipucu button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .surukle-ipucu .sure { position: absolute; left: 0; bottom: 0; height: 4px; width: 100%; background: rgba(255,255,255,.55);
          transform-origin: left; animation: ipucuSure ${SURE}ms linear both; }
        @keyframes ipucuGir { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes ipucuSure { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @media (prefers-reduced-motion: reduce) { .surukle-ipucu { animation: none; } }
      `}</style>
    </div>
  );
}
