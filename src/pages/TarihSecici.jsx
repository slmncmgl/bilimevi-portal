// v1.4: Tümü ve süre listesi kaynak/danışman seçicilerle aynı köşe (12px), renkler aynı
// v1.3: açılır liste oku tek parça SVG, seçiliyken arka plan rengi ayrı yazılır (garip üçgen görünümü düzeldi)
// v1.2: bosMetin: listede seçim yokken görünen yazı (başlık kalktığı için "Son etkinlik" / "Data tarihi" yazar)
// v1.1: tumu={false} ile "Tümü" düğmesi gizlenir, enFazla ile N kutusunun üst sınırı (Aktivite Tablosu özet kutusu: 90)
// v1.0: tabloların tarih seçimi (Aktivite, Performans ve Data Tablosu ortak kullanır)
// "Tümü" düğmesi + yanında açılır liste: 7 / 14 / 30 gün ve "N gün". N seçilince yanda sadece rakam girilen bir kutu açılır.
// deger: null = Tümü, sayı = gün. Kutuya yazılan sayı geçerliyse (1-3650) hemen üst bileşene gider; istekleri üst bileşen biriktirir.
// metin: seçeneklerin yazılışı, ör. g => `Son ${g} gün` ya da g => `${g} günden eski`.
import { useState, useEffect } from "react";

const HAZIR = [7, 14, 30];
const EN_FAZLA = 3650;

export default function TarihSecici({ deger, onChange, metin = g => `Son ${g} gün`, nMetni = "Son N gün", tumu = true, enFazla = EN_FAZLA, bosMetin = "Süre seçin" }) {
  const hazirMi = HAZIR.includes(deger);
  const [nAcik, setNAcik] = useState(deger !== null && !hazirMi);
  const [yazi, setYazi] = useState(deger !== null && !hazirMi ? String(deger) : "");

  // Dışarıdan hazır bir değere ya da Tümü'ye dönülürse N kutusu kapanır
  useEffect(() => {
    if (deger === null || HAZIR.includes(deger)) setNAcik(false);
  }, [deger]);

  const secim = deger === null ? "" : nAcik ? "N" : hazirMi ? String(deger) : "N";

  function listeDegisti(v) {
    if (v === "N") {
      setNAcik(true);
      const n = Number(yazi);
      if (Number.isInteger(n) && n >= 1 && n <= enFazla) onChange(n);
      return;
    }
    setNAcik(false);
    onChange(Number(v));
  }

  function yaziDegisti(v) {
    const temiz = v.replace(/\D/g, "").slice(0, 4);
    setYazi(temiz);
    const n = Number(temiz);
    if (temiz && n >= 1 && n <= enFazla) onChange(n);
  }

  const aktifTumu = deger === null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      {tumu && <button type="button" onClick={() => { setNAcik(false); onChange(null); }} style={{ ...t.dugme, ...(aktifTumu ? t.aktif : {}) }}>Tümü</button>}
      <select value={secim} onChange={e => listeDegisti(e.target.value)} style={{ ...t.liste, ...(!aktifTumu ? t.listeAktif : {}) }} aria-label="Süre seçin">
        <option value="" disabled>{bosMetin}</option>
        {HAZIR.map(g => <option key={g} value={String(g)}>{metin(g)}</option>)}
        <option value="N">{nMetni}</option>
      </select>
      {nAcik && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <input type="text" inputMode="numeric" pattern="[0-9]*" autoFocus value={yazi} onChange={e => yaziDegisti(e.target.value)}
            placeholder="N" aria-label="Gün sayısı" style={{ ...t.kutu, borderColor: yazi ? "#0891b2" : "#e2e8f0" }} />
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>gün</span>
        </span>
      )}
    </div>
  );
}

// Açılır liste oku: tek parça SVG (iki gradyanlı eski ok bazı durumlarda kocaman üçgen gibi görünüyordu)
const ok = renk => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='${renk}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>`)}")`;

const temel = { height: "34px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, fontFamily: "'Sora', sans-serif", cursor: "pointer", transition: "all 0.15s" };
const t = {
  dugme: { ...temel, padding: "0 14px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569" },
  aktif: { background: "#0891b2", color: "#fff", borderColor: "#0891b2" },
  liste: { ...temel, padding: "0 30px 0 14px", border: "1.5px solid #e2e8f0", backgroundColor: "#fff", color: "#475569", appearance: "none",
    WebkitAppearance: "none", backgroundImage: ok("#64748b"), backgroundPosition: "right 11px center", backgroundSize: "10px 6px", backgroundRepeat: "no-repeat" },
  listeAktif: { borderColor: "#0891b2", color: "#0f172a", backgroundColor: "#ecfeff", backgroundImage: ok("#0891b2") },
  kutu: { width: "64px", height: "34px", padding: "0 10px", borderRadius: "10px", border: "1.5px solid", fontSize: "13px", fontWeight: 700,
    fontFamily: "'Sora', sans-serif", color: "#0f172a", textAlign: "center", outline: "none", fontVariantNumeric: "tabular-nums" },
};
