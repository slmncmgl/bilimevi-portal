// Kayıt Form Linkleri > "Yeni Kayıt Formu Talebi" penceresi
// 1) Klonlanacak örnek okul var mı? (aramayla seçilir)  2) 13 alan doldurulur  3) api/kayit-formu-talebi → n8n → "Form Talepleri" sekmesi
import { useEffect, useRef, useState } from "react";

// Sheet başlıklarıyla birebir aynı ad; çok satırlılar textarea
export const TALEP_ALANLARI = [
  { ad: "Atanacak Sabit Danışman (varsa)" },
  { ad: "Tr Okulu", zorunlu: true },
  { ad: "OKULLAR", etiket: "Okul (OKULLAR)", zorunlu: true },
  { ad: "Konum" },
  // İki tarih formda tek blokta alt alta durur (Başlangıç bloğu çizer, Bitiş atlanır)
  { ad: "Başlangıç Tarihi", zorunlu: true, tarih: true },
  { ad: "Bitiş Tarihi", zorunlu: true, tarih: true },
  { ad: "Bulunduğu Ülke" },
  { ad: "Kurs Süresi (Hafta veya Gün)", ipucu: "ör. 2 hafta" },
  { ad: "Program Adı" },
  { ad: "Ders Sayısı" },
  { ad: "Form Başlığı", cokSatir: true, tamGenislik: true },
  { ad: "Program Seçimi (varsa)", cokSatir: true, tamGenislik: true },
];

// Tarih seçici ISO (2027-07-01) ile çalışır; sheet'e "1 Temmuz 2027" yazılır, klonlanan satırdaki metin ISO'ya çevrilir
const TR_AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function trToIso(metin) {
  const m = String(metin || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR").match(/^(\d{1,2}) (\S+) (\d{4})$/);
  if (!m) return "";
  const ay = TR_AYLAR.findIndex(a => a.toLocaleLowerCase("tr-TR") === m[2]);
  if (ay === -1 || +m[1] < 1 || +m[1] > 31) return "";
  return `${m[3]}-${String(ay + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function isoToTr(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${+m[3]} ${TR_AYLAR[+m[2] - 1]} ${m[1]}` : "";
}

// Kurs süresi: gün farkı ya da iki uç dahil gün sayısı 7'nin katıysa "N hafta", değilse iki uç dahil "N gün"
// (sheet'teki mevcut satırlarla uyumlu: 1-15 Temmuz = 2 hafta, 8-28 Ağustos = 3 hafta, 8-18 Temmuz = 11 gün)
function kursSuresi(basIso, bitIso) {
  if (!basIso || !bitIso) return "";
  const fark = Math.round((Date.parse(`${bitIso}T00:00:00Z`) - Date.parse(`${basIso}T00:00:00Z`)) / 86400000);
  if (!Number.isFinite(fark) || fark <= 0) return "";
  if (fark % 7 === 0) return `${fark / 7} hafta`;
  if ((fark + 1) % 7 === 0) return `${(fark + 1) / 7} hafta`;
  return `${fark + 1} gün`;
}

const bosForm = () => Object.fromEntries(TALEP_ALANLARI.map(a => [a.ad, ""]));

function norm(s) {
  return (s || "").trim().toLocaleLowerCase("tr-TR");
}

export default function YeniFormTalebi({ schools, renderTags, talepEden, onClose }) {
  // adim: "soru" | "sec" | "form" | "tamam"
  const [adim, setAdim] = useState("soru");
  const [ornek, setOrnek] = useState(null);
  const [arama, setArama] = useState("");
  const [alanlar, setAlanlar] = useState(bosForm);
  const [not, setNot] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [talepId, setTalepId] = useState("");
  const aramaRef = useRef(null);
  const kartRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape" && !gonderiliyor) onClose(); }
    document.addEventListener("keydown", onKey);
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = eski; };
  }, [gonderiliyor, onClose]);

  useEffect(() => {
    kartRef.current?.scrollTo({ top: 0 });
  }, [adim]);

  const kelimeler = norm(arama).split(" ").filter(Boolean);
  const sonuclar = kelimeler.length
    ? schools.filter(s => kelimeler.every(w => s.searchText.includes(w)))
    : schools;

  function ornekSec(s) {
    setOrnek(s);
    setAlanlar({ ...bosForm(), ...Object.fromEntries(TALEP_ALANLARI.map(a => {
      const v = s.raw?.[a.ad] || "";
      return [a.ad, a.tarih ? trToIso(v) : v];
    })) });
    setAdim("form");
  }

  function bosBasla() {
    setOrnek(null);
    setAlanlar(bosForm());
    setAdim("form");
  }

  const eksik = TALEP_ALANLARI.filter(a => a.zorunlu && !alanlar[a.ad].trim()).map(a => a.ad);

  async function gonder() {
    if (eksik.length) { setHata(`Zorunlu alanları doldurun: ${eksik.join(", ")}`); return; }
    if (alanlar["Bitiş Tarihi"] < alanlar["Başlangıç Tarihi"]) { setHata("Bitiş tarihi başlangıç tarihinden önce olamaz."); return; }
    const gonderilecek = Object.fromEntries(TALEP_ALANLARI.map(a => [a.ad, a.tarih ? isoToTr(alanlar[a.ad]) : alanlar[a.ad]]));
    setGonderiliyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/kayit-formu-talebi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          talepEden,
          ornekForm: ornek ? [ornek.name, ornek.meta, ornek.url].filter(Boolean).join(" · ") : "",
          alanlar: gonderilecek,
          not,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.hata || j.error || `HTTP ${r.status}`);
      setTalepId(j.talepId || "");
      setAdim("tamam");
    } catch (e) {
      setHata(`Talep gönderilemedi: ${e.message}`);
    } finally {
      setGonderiliyor(false);
    }
  }

  function alanCiz(a) {
    const deger = alanlar[a.ad];
    const eksikMi = a.zorunlu && hata && !deger.trim();
    const degistir = e => setAlanlar(v => {
      const yeni = { ...v, [a.ad]: e.target.value };
      // Tarihlerden biri değişince Kurs Süresi yeniden hesaplanır (geçerli bir aralık varsa)
      if (a.tarih) {
        const sure = kursSuresi(yeni["Başlangıç Tarihi"], yeni["Bitiş Tarihi"]);
        if (sure) yeni["Kurs Süresi (Hafta veya Gün)"] = sure;
      }
      return yeni;
    });
    return (
      <label key={a.ad} style={{ ...s.field, ...(a.tamGenislik ? s.fieldFull : {}) }} className={a.tamGenislik ? "yft-full" : ""}>
        <span style={s.label}>{a.etiket || a.ad}{a.zorunlu && <span style={s.req}> *</span>}</span>
        {a.cokSatir ? (
          <textarea value={deger} onChange={degistir} rows={a.ad === "Form Başlığı" ? 5 : 3} style={{ ...s.input, ...s.textarea }} className="yft-input" />
        ) : a.tarih ? (
          <input
            type="date"
            lang="tr"
            value={deger}
            onChange={degistir}
            min={a.ad === "Bitiş Tarihi" ? alanlar["Başlangıç Tarihi"] || undefined : undefined}
            style={{ ...s.input, ...s.dateInput, ...(eksikMi ? s.inputErr : {}) }}
            className="yft-input"
          />
        ) : (
          <input value={deger} onChange={degistir} placeholder={a.ipucu || ""} style={{ ...s.input, ...(eksikMi ? s.inputErr : {}) }} className="yft-input" />
        )}
      </label>
    );
  }

  return (
    <div onClick={() => !gonderiliyor && onClose()} style={s.overlay}>
      <div ref={kartRef} onClick={e => e.stopPropagation()} style={s.card} className="yft-card" role="dialog" aria-modal="true" aria-labelledby="yft-baslik">
        <div style={s.head}>
          <h3 id="yft-baslik" style={s.title}>Yeni Kayıt Formu Talebi</h3>
          <button onClick={onClose} disabled={gonderiliyor} style={s.closeX} aria-label="Kapat">×</button>
        </div>

        {adim === "soru" && (
          <div style={s.body}>
            <p style={s.question}>Klonlamak istediğiniz bir form var mı?</p>
            <p style={s.help}>Örnek bir okul seçerseniz bilgileri forma dolu gelir, sadece değişenleri düzeltirsiniz.</p>
            <div style={s.choiceGrid} className="yft-choice-grid">
              <button onClick={() => setAdim("sec")} style={{ ...s.choice, ...s.choicePrimary }}>
                <strong>Evet, örnek okul seç</strong>
                <span style={s.choiceSub}>Mevcut bir formun bilgileriyle başla</span>
              </button>
              <button onClick={bosBasla} style={s.choice}>
                <strong>Hayır, boş başla</strong>
                <span style={s.choiceSub}>Tüm alanları kendim dolduracağım</span>
              </button>
            </div>
          </div>
        )}

        {adim === "sec" && (
          <div style={s.body}>
            <button onClick={() => setAdim("soru")} style={s.back}>← Geri</button>
            <p style={s.question}>Örnek okulu seçin</p>
            <input
              ref={aramaRef}
              autoFocus
              value={arama}
              onChange={e => setArama(e.target.value)}
              placeholder="TR okulu, okul, konum veya form başlığı yazın..."
              style={s.input}
              className="yft-input"
            />
            <div style={s.pickList}>
              {sonuclar.length === 0 ? (
                <div style={s.empty}>Eşleşen program bulunamadı.</div>
              ) : sonuclar.map(sc => (
                <button key={sc.id} onClick={() => ornekSec(sc)} style={s.pickItem} className="yft-pick">
                  {renderTags(sc)}
                  <span style={s.pickMeta}>{sc.meta}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {adim === "form" && (
          <div style={s.body}>
            <div style={s.ornekBar}>
              <span style={s.ornekText}>
                {ornek ? <>Örnek: <strong>{ornek.name}</strong>{ornek.meta && <span style={s.ornekMeta}> · {ornek.meta}</span>}</> : "Boş form"}
              </span>
              <button onClick={() => setAdim(ornek ? "sec" : "soru")} style={s.linkBtn}>Değiştir</button>
            </div>

            <div style={s.grid} className="yft-grid">
              {TALEP_ALANLARI.map(a => {
                if (a.ad === "Bitiş Tarihi") return null;
                if (a.ad === "Başlangıç Tarihi") {
                  return (
                    <div key="tarihler" style={s.dateBlock}>
                      {alanCiz(a)}
                      {alanCiz(TALEP_ALANLARI.find(x => x.ad === "Bitiş Tarihi"))}
                    </div>
                  );
                }
                return alanCiz(a);
              })}
              <label style={{ ...s.field, ...s.fieldFull }} className="yft-full">
                <span style={s.label}>Not (isteğe bağlı)</span>
                <textarea value={not} onChange={e => setNot(e.target.value)} rows={2} style={{ ...s.input, ...s.textarea }} className="yft-input"
                  placeholder="Formu açacak kişiye iletmek istediğiniz bir şey varsa" />
              </label>
            </div>

            {hata && <div style={s.error}>{hata}</div>}

            <div style={s.actions} className="yft-actions">
              <button onClick={onClose} disabled={gonderiliyor} style={s.secondary}>Vazgeç</button>
              <button onClick={gonder} disabled={gonderiliyor} style={{ ...s.primary, ...(gonderiliyor ? { opacity: 0.6 } : {}) }}>
                {gonderiliyor ? "Gönderiliyor..." : "Talebi Gönder"}
              </button>
            </div>
          </div>
        )}

        {adim === "tamam" && (
          <div style={{ ...s.body, textAlign: "center" }}>
            <div style={s.okIcon}>✓</div>
            <p style={s.question}>Talebiniz alındı</p>
            <p style={s.help}>Form hazırlandığında bu sayfadaki okul listesinde görünecek.</p>
            {talepId && <p style={s.talepId}>Talep ID: <strong>{talepId}</strong></p>}
            <button onClick={onClose} style={{ ...s.primary, marginTop: 8 }}>Tamam</button>
          </div>
        )}
      </div>

      <style>{`
        .yft-input:focus { outline: none; border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.12); }
        .yft-pick:hover { background: #f0fdfa !important; border-color: #99f6e4 !important; }
        @media (max-width: 640px) {
          .yft-card { max-height: 100dvh !important; height: 100dvh; border-radius: 0 !important; }
          .yft-grid { grid-template-columns: 1fr !important; }
          .yft-choice-grid { grid-template-columns: 1fr !important; }
          .yft-actions { flex-direction: column-reverse; }
          .yft-actions button { width: 100%; }
        }
      `}</style>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 0 },
  card: { background: "#fff", width: "100%", maxWidth: "720px", maxHeight: "92vh", overflowY: "auto", borderRadius: "16px", boxShadow: "0 20px 50px rgba(15,23,42,0.25)", fontFamily: "'Inter', sans-serif" },
  head: { position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0" },
  title: { margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" },
  closeX: { border: "none", background: "transparent", fontSize: "26px", lineHeight: 1, color: "#64748b", cursor: "pointer", width: "40px", height: "40px", borderRadius: "8px" },
  body: { padding: "20px" },
  question: { margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#0f172a" },
  help: { margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 },
  choiceGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  choice: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", textAlign: "left", padding: "16px", border: "1.5px solid #e2e8f0", borderRadius: "12px", background: "#fff", color: "#0f172a", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  choicePrimary: { borderColor: "#5eead4", background: "#f0fdfa" },
  choiceSub: { fontSize: "12.5px", color: "#64748b" },
  back: { border: "none", background: "transparent", color: "#0f766e", fontWeight: 600, fontSize: "13px", cursor: "pointer", padding: "0 0 12px", fontFamily: "inherit" },
  input: { width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", color: "#0f172a", background: "#fff", fontFamily: "inherit" },
  inputErr: { borderColor: "#fca5a5", background: "#fef2f2" },
  textarea: { resize: "vertical", lineHeight: 1.45 },
  pickList: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" },
  pickItem: { display: "flex", flexDirection: "column", gap: "8px", textAlign: "left", padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#fff", cursor: "pointer", fontFamily: "inherit" },
  pickMeta: { fontSize: "12.5px", color: "#64748b" },
  empty: { padding: "16px", textAlign: "center", fontSize: "13px", color: "#64748b" },
  ornekBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 14px", background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: "10px", marginBottom: "16px" },
  ornekText: { fontSize: "13px", color: "#0f172a", minWidth: 0 },
  ornekMeta: { color: "#64748b" },
  linkBtn: { border: "none", background: "transparent", color: "#0f766e", fontWeight: 600, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  field: { display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
  fieldFull: { gridColumn: "1 / -1" },
  dateBlock: { gridRow: "span 2", display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 },
  dateInput: { minHeight: "42px", cursor: "pointer" },
  label: { fontSize: "12.5px", fontWeight: 600, color: "#475569" },
  req: { color: "#dc2626" },
  error: { marginTop: "16px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#b91c1c", fontSize: "13px" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  primary: { padding: "11px 20px", border: "none", borderRadius: "10px", background: "#0d9488", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  secondary: { padding: "11px 20px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#fff", color: "#334155", fontWeight: 600, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  okIcon: { width: "52px", height: "52px", margin: "4px auto 12px", borderRadius: "50%", background: "#ccfbf1", color: "#0f766e", fontSize: "26px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  talepId: { fontSize: "13px", color: "#475569", margin: "0 0 16px" },
};
