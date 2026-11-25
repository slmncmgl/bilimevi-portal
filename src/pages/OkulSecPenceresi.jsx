// v1.0 (25.11.2026): Sunum Yapılan Okul (TR_Okul_Default) boş kayıtlar için okul seçme penceresi.
// Üstte öğrencinin yazdığı okul, altta MEB listesinden en yakın adaylar, tüm listede arama ve elle yazma.
// Okul listesi (src/data/okullar.json: Marmara, Ege, Ankara ortaokul ve liseleri, MEB 25.11.2026) pencere ilk açıldığında yüklenir.
// Satır biçimi: [ad, il, ilçe, tür (o: ortaokul, l: lise, b: belirsiz), kurum kodu]
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

let okulListesiSozu = null;
const okulListesiniYukle = () => {
  if (!okulListesiSozu) okulListesiSozu = import("../data/okullar.json").then(m => m.default || m);
  return okulListesiSozu;
};

const TR_HARF = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
const KISALTMA = {
  al: "anadolu lisesi", fl: "fen lisesi", aihl: "anadolu imam hatip lisesi", ihl: "imam hatip lisesi",
  aiho: "anadolu imam hatip ortaokulu", iho: "imam hatip ortaokulu", sbl: "sosyal bilimler lisesi",
  mtal: "mesleki ve teknik anadolu lisesi", gsl: "guzel sanatlar lisesi", oo: "ortaokulu",
  ortaokul: "ortaokulu", lise: "lisesi", kolej: "koleji", prof: "profesor", dr: "doktor",
};
// Neredeyse her okul adında geçen kelimeler; ayırt edici sayılmaz
const GENEL = new Set(["ozel", "lisesi", "anadolu", "ortaokulu", "koleji", "fen", "okulu", "okullari", "kampusu",
  "kampus", "imam", "hatip", "mesleki", "ve", "teknik", "profesor", "doktor", "sosyal", "bilimler"]);
const SUBE_IL = [["kadıköy", "İstanbul"], ["taksim", "İstanbul"], ["bahçeşehir", "İstanbul"], ["izmir", "İzmir"], ["ankara", "Ankara"]];
const TUR_AD = { o: "Ortaokul", l: "Lise", b: "Diğer" };

export function normalizeOkul(s) {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[çğıiöşüâîû]/g, h => TR_HARF[h] || h)
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  return t.split(" ").filter(Boolean).flatMap(w => (KISALTMA[w] || w).split(" ")).join(" ");
}

// İkili harf (bigram) benzerliği, 0-1
function ikiliBenzerlik(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const say = new Map();
  for (let i = 0; i < a.length - 1; i++) { const k = a.slice(i, i + 2); say.set(k, (say.get(k) || 0) + 1); }
  let ortak = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const k = b.slice(i, i + 2); const n = say.get(k);
    if (n) { ortak++; say.set(k, n - 1); }
  }
  return (2 * ortak) / (a.length + b.length - 2);
}

function puanla(girdi, girdiKelime, aday, adayKelime) {
  const ayirt = girdiKelime.filter(w => !GENEL.has(w));
  const adayAyirt = adayKelime.filter(w => !GENEL.has(w));
  let kapsam = 0;
  if (ayirt.length) {
    const tutan = ayirt.filter(w => adayAyirt.some(x => x === w || ikiliBenzerlik(w, x) >= 0.8)).length;
    kapsam = tutan / ayirt.length;
  }
  const g1 = new Set(girdiKelime.filter(w => GENEL.has(w)));
  const g2 = new Set(adayKelime.filter(w => GENEL.has(w)));
  const birlesim = new Set([...g1, ...g2]).size;
  const tur = birlesim ? [...g1].filter(w => g2.has(w)).length / birlesim : 0;
  const kar = ikiliBenzerlik(girdi, aday);
  return Math.round(100 * (0.6 * kapsam + 0.25 * kar + 0.15 * tur));
}

// Sınıf bilgisinden kademe tahmini: 5-8 ortaokul, 9-12 lise
function kademeTahmini(sinif) {
  const m = String(sinif || "").match(/\d{1,2}/);
  if (!m) return null;
  const n = Number(m[0]);
  if (n >= 5 && n <= 8) return "o";
  if (n >= 9 && n <= 12) return "l";
  return null;
}

const etiket = p => (p >= 90 ? ["Yüksek", "#047857", "#ecfdf5"] : p >= 70 ? ["Orta", "#b45309", "#fffbeb"] : ["Düşük", "#64748b", "#f1f5f9"]);

export default function OkulSecPenceresi({ ogr, onKapat, onKaydet }) {
  const yazilan = String(ogr["Türkiye'de Eğitim Aldığı Okul"] || ogr["Okulu"] || "").trim();
  const sube = String(ogr["Şube Adı"] || "").toLocaleLowerCase("tr-TR");
  const il = (SUBE_IL.find(([k]) => sube.includes(k)) || [])[1] || null;
  const kademe = kademeTahmini(ogr["Sınıfı-Şubesi"] || ogr["Sınıfı"]);

  const [liste, setListe] = useState(null);
  const [hata, setHata] = useState("");
  const [arama, setArama] = useState("");
  const [secim, setSecim] = useState(null); // { tip: "aday", ad, il, ilce } | { tip: "elle" }
  const [elleMetin, setElleMetin] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const elleRef = useRef(null);

  useEffect(() => {
    okulListesiniYukle()
      .then(rows => setListe(rows.map(r => { const n = normalizeOkul(r[0]); return { ad: r[0], il: r[1], ilce: r[2], tur: r[3], kod: r[4], n, k: n.split(" ") }; })))
      .catch(() => setHata("Okul listesi yüklenemedi."));
    const tus = e => { if (e.key === "Escape" && !kaydediliyor) onKapat(); };
    document.addEventListener("keydown", tus);
    const eskiTasma = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", tus); document.body.style.overflow = eskiTasma; };
  }, []);

  // Öğrencinin yazdığına en yakın 5 aday
  const adaylar = useMemo(() => {
    if (!liste || !yazilan) return [];
    const g = normalizeOkul(yazilan);
    const gk = g.split(" ");
    const sonuc = [];
    for (const o of liste) {
      let p = puanla(g, gk, o.n, o.k);
      if (p < 40) continue;
      if (il && o.il === il) p += 3;
      if (kademe && o.tur === kademe) p += 4;
      sonuc.push({ ...o, p: Math.min(p, 100) });
    }
    return sonuc.sort((a, b) => b.p - a.p).slice(0, 5);
  }, [liste, yazilan, il, kademe]);

  // İlk aday 70 ve üstüyse öneri olarak seçili gelsin
  useEffect(() => {
    if (!secim && adaylar[0] && adaylar[0].p >= 70) setSecim({ tip: "aday", ...adaylar[0] });
  }, [adaylar]);

  // Tüm listede arama: her kelime adda geçmeli
  const aramaSonucu = useMemo(() => {
    const a = normalizeOkul(arama);
    if (!liste || a.length < 2) return [];
    const kelimeler = a.split(" ");
    return liste.filter(o => kelimeler.every(w => o.n.includes(w)))
      .sort((x, y) => (y.il === il) - (x.il === il) || x.ad.localeCompare(y.ad, "tr")).slice(0, 30);
  }, [liste, arama, il]);

  const kaydedilecek = secim?.tip === "elle" ? elleMetin.replace(/\s+/g, " ").trim() : secim?.ad || "";

  async function kaydet() {
    if (!kaydedilecek || kaydediliyor) return;
    setKaydediliyor(true);
    try {
      await onKaydet(kaydedilecek, secim.tip === "elle" ? "elle yazıldı" : `${secim.il} / ${secim.ilce}`);
    } finally {
      setKaydediliyor(false);
    }
  }

  const secili = o => secim?.tip === "aday" && secim.ad === o.ad && secim.il === o.il && secim.ilce === o.ilce;

  const satir = (o, puanGoster) => {
    const [et, renk, zemin] = etiket(o.p || 0);
    const aktif = secili(o);
    return (
      <button key={`${o.ad}|${o.il}|${o.ilce}`} type="button" onClick={() => setSecim({ tip: "aday", ...o })}
        style={{ ...k.aday, ...(aktif ? k.adayAktif : null) }}>
        <span style={{ ...k.radyo, ...(aktif ? k.radyoAktif : null) }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={k.adayAd}>{o.ad}</span>
          <span style={k.adayAlt}>{o.il} / {o.ilce} · {TUR_AD[o.tur] || "Diğer"}</span>
        </span>
        {puanGoster && <span style={{ ...k.rozet, color: renk, background: zemin }}>{et}</span>}
      </button>
    );
  };

  return createPortal(
    <div style={k.arka} onMouseDown={e => { if (e.target === e.currentTarget && !kaydediliyor) onKapat(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="okul-sec-baslik" style={k.kutu}>
        <div style={k.ust}>
          <h3 id="okul-sec-baslik" style={k.baslik}>Okul Seç</h3>
          <div style={k.ogrenci}>{ogr["Öğrenci Adı Soyadı"]}</div>
        </div>

        <div style={k.govde}>
          <div style={k.yazilanKutu}>
            <div style={k.kucukBaslik}>Öğrencinin yazdığı okul</div>
            <div style={k.yazilan}>{yazilan || <span style={{ color: "#94a3b8", fontWeight: 500 }}>Öğrenci okul adı yazmamış</span>}</div>
          </div>

          {hata && <div style={k.hata}>{hata}</div>}
          {!liste && !hata && <div style={k.bilgi}>Okul listesi yükleniyor…</div>}

          {liste && yazilan && (
            <>
              <div style={k.kucukBaslik}>Adaylar</div>
              {adaylar.length
                ? <div style={k.adayListe}>{adaylar.map(o => satir(o, true))}</div>
                : <div style={k.bilgi}>Listede yakın bir okul bulunamadı. Aşağıdan arayın ya da elle yazın.</div>}
            </>
          )}

          {liste && (
            <>
              <div style={{ ...k.kucukBaslik, marginTop: "14px" }}>Listede ara</div>
              <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Okul adı yazın (örn. kadıköy anadolu)" style={k.girdi} />
              {aramaSonucu.length > 0 && <div style={{ ...k.adayListe, maxHeight: "200px", overflowY: "auto", marginTop: "6px" }}>{aramaSonucu.map(o => satir(o, false))}</div>}
              {normalizeOkul(arama).length >= 2 && aramaSonucu.length === 0 && <div style={k.bilgi}>Sonuç yok.</div>}
            </>
          )}

          <button type="button" onClick={() => { setSecim({ tip: "elle" }); setTimeout(() => elleRef.current?.focus(), 0); }}
            style={{ ...k.aday, marginTop: "14px", ...(secim?.tip === "elle" ? k.adayAktif : null) }}>
            <span style={{ ...k.radyo, ...(secim?.tip === "elle" ? k.radyoAktif : null) }} />
            <span style={k.adayAd}>Elle yaz</span>
          </button>
          {secim?.tip === "elle" && (
            <input ref={elleRef} value={elleMetin} onChange={e => setElleMetin(e.target.value)} placeholder="Okul adını yazın"
              onKeyDown={e => e.key === "Enter" && kaydet()} style={{ ...k.girdi, marginTop: "6px" }} />
          )}
        </div>

        <div style={k.alt}>
          <span style={k.ozet}>{kaydedilecek ? <>Kaydedilecek: <b style={{ color: "#0f172a" }}>{kaydedilecek}</b></> : "Bir okul seçin"}</span>
          <button type="button" onClick={onKapat} disabled={kaydediliyor} style={k.vazgec}>Vazgeç</button>
          <button type="button" onClick={kaydet} disabled={!kaydedilecek || kaydediliyor}
            style={!kaydedilecek || kaydediliyor ? { ...k.onay, opacity: 0.45, cursor: "default" } : k.onay}>
            {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const k = {
  arka: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(3px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" },
  kutu: { width: "min(520px, 100%)", maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", background: "#fff",
    borderRadius: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)", overflow: "hidden",
    fontFamily: "'Sora', sans-serif" },
  ust: { padding: "20px 24px 0" },
  baslik: { margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" },
  ogrenci: { fontSize: "12px", color: "#64748b", marginTop: "2px" },
  govde: { padding: "14px 24px 18px", overflowY: "auto", fontSize: "13px", color: "#475569" },
  yazilanKutu: { background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "10px 14px", marginBottom: "14px" },
  kucukBaslik: { fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" },
  yazilan: { fontSize: "14.5px", fontWeight: 700, color: "#1e3a5f" },
  adayListe: { display: "flex", flexDirection: "column", gap: "6px" },
  aday: { display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: "12px",
    border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontFamily: "inherit" },
  adayAktif: { borderColor: "#0891b2", background: "#ecfeff" },
  radyo: { width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #cbd5e1", flexShrink: 0, boxSizing: "border-box" },
  radyoAktif: { borderColor: "#0891b2", borderWidth: "4.5px" },
  adayAd: { display: "block", fontSize: "13px", fontWeight: 600, color: "#0f172a" },
  adayAlt: { display: "block", fontSize: "11.5px", color: "#64748b", marginTop: "1px" },
  rozet: { fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", flexShrink: 0 },
  girdi: { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1",
    fontSize: "13px", fontFamily: "inherit", outline: "none" },
  bilgi: { fontSize: "12.5px", color: "#64748b", padding: "4px 0" },
  hata: { fontSize: "12.5px", color: "#b91c1c", background: "#fef2f2", borderRadius: "10px", padding: "8px 12px" },
  alt: { display: "flex", alignItems: "center", gap: "8px", padding: "14px 24px", background: "#f8fafc", borderTop: "1px solid #f1f5f9" },
  ozet: { flex: 1, minWidth: 0, fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  vazgec: { padding: "8px 18px", borderRadius: "999px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
    fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  onay: { padding: "8px 20px", borderRadius: "999px", border: "1.5px solid #0891b2", background: "#0891b2", color: "#fff",
    fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(8, 145, 178, 0.3)" },
};
