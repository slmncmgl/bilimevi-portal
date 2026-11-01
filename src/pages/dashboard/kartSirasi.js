import { useEffect, useRef, useState } from "react";

// Klasik temada kart sıralaması: masaüstünde fareyle sürüklenir, sıra kullanıcı başına tarayıcıda saklanır.
// Kayıtlı sıra yoksa kartlar bugünkü düzende kalır (Fiyat Teklifi sağ üstte).
// Telefonda sürükleme yok, ama kaydedilmiş sıra orada da uygulanır.

const SURUKLEME_ESIGI = 6; // px: bundan az hareket normal tıklama sayılır

const anahtar = kullanici => `portal-klasik-kart-sirasi:${kullanici}`;

function siraOku(kullanici) {
  try {
    const s = JSON.parse(localStorage.getItem(anahtar(kullanici)));
    return Array.isArray(s) ? s : null;
  } catch (e) { return null; }
}

function siraKaydet(kullanici, sira) {
  try { localStorage.setItem(anahtar(kullanici), JSON.stringify(sira)); } catch (e) {}
}

// Bugünkü ekrandaki sıra: Fiyat Teklifi ikinci (sağ üst), gerisi MODULE_CONFIG sırasında.
function varsayilanSira(moduller) {
  const keys = moduller.map(m => m.key);
  const i = keys.indexOf("fiyatteklifi");
  if (i > 1) { keys.splice(i, 1); keys.splice(1, 0, "fiyatteklifi"); }
  return keys;
}

export function useKartSirasi(moduller, kullanici) {
  const [sira, setSira] = useState(() => siraOku(kullanici));
  const [suruklenen, setSuruklenen] = useState(null);
  // Kartlar yer değiştirince açılış animasyonu baştan oynamasın: ilk sürüklemeden sonra animasyon kapanır.
  const [animasyonKapali, setAnimasyonKapali] = useState(false);
  const durum = useRef(null);
  const tiklamaEngeli = useRef(false);

  useEffect(() => { setSira(siraOku(kullanici)); }, [kullanici]);

  // Kayıtlı sıradaki modüller önce, sonradan açılan modüller sona.
  const sirali = sira
    ? [
        ...sira.map(k => moduller.find(m => m.key === k)).filter(Boolean),
        ...varsayilanSira(moduller).filter(k => !sira.includes(k)).map(k => moduller.find(m => m.key === k)),
      ]
    : moduller;

  useEffect(() => {
    const hareket = e => {
      const d = durum.current;
      if (!d) return;
      if (!d.aktif) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < SURUKLEME_ESIGI) return;
        d.aktif = true;
        d.sira = sirali.map(m => m.key);
        setSuruklenen(d.key);
        setAnimasyonKapali(true);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      const hedef = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-kart]")?.dataset.kart;
      if (!hedef || hedef === d.key) return;
      const yeni = d.sira.filter(k => k !== d.key);
      yeni.splice(d.sira.indexOf(hedef), 0, d.key);
      d.sira = yeni;
      setSira(yeni);
    };
    const birak = () => {
      const d = durum.current;
      durum.current = null;
      if (!d?.aktif) return;
      tiklamaEngeli.current = true; // bırakmanın ardından gelen click modülü açmasın
      setTimeout(() => { tiklamaEngeli.current = false; }, 0);
      siraKaydet(kullanici, d.sira);
      setSuruklenen(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", hareket);
    window.addEventListener("pointerup", birak);
    window.addEventListener("pointercancel", birak);
    return () => {
      window.removeEventListener("pointermove", hareket);
      window.removeEventListener("pointerup", birak);
      window.removeEventListener("pointercancel", birak);
    };
  });

  return {
    sirali,
    ozelSira: !!sira,
    suruklenen,
    animasyonKapali,
    kartProps: key => ({
      "data-kart": key,
      onPointerDown: e => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        durum.current = { key, x: e.clientX, y: e.clientY, aktif: false };
      },
    }),
    tiklamaEngellendi: () => tiklamaEngeli.current,
  };
}
