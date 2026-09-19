// KayitTakip.jsx — v1.1
// v1.1 — Danışman listesi sadece Bilimevi personeli; Kayıt Referansı yarım boy
// v1.0 — İlk sürüm.
//
// Kayıt Takip modülü: yeni öğrenci kaydını "Aylık Rapor" sekmesine ekler.
// Danışman listesi ve şube eşleşmesi Personel sekmesinden (gviz CSV) okunur.
// Yazma işlemi KAYIT_TAKIP_SCRIPT_URL üzerinden GET + encoded JSON ile yapılır.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";
import { KAYIT_TAKIP_SCRIPT_URL } from "../config";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const PERSONEL_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Personel`;

const HIZMET_TURLERI = [
  "DİL EĞİTİMİ",
  "AKADEMİK DANIŞMANLIK",
  "ONLİNE EĞİTİM",
  "YAZ OKULU GRUBU",
  "YAZ OKULU BİREYSEL",
  "VİZE DANIŞMANLIĞI",
  "LİSE EĞİTİMİ",
  "AİLE PROGRAMI",
  "FOUNDATION",
  "MASTER PROGRAMI",
  "YÜKSEK LİSANS",
  "KONAKLAMA HİZMETİ",
];

const ULKELER = [
  "AMERİKA", "İNGİLTERE", "ALMANYA", "KANADA", "FRANSA", "POLONYA", "MALTA",
  "İSPANYA", "İTALYA", "AVUSTRALYA", "YENİ ZELANDA", "GÜNEY AFRİKA", "İRLANDA",
  "ONLİNE", "BİRLEŞİK ARAP EMİRLİKLERİ", "İSVİÇRE", "AVRUPA", "N/A",
  "LETONYA", "İSKOÇYA", "HOLLANDA",
];

const SURE_BIRIMLERI = ["HAFTA", "YIL", "GÜN", "AY", "HAFTA + GÜN"];

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// --- Yardımcılar -----------------------------------------------------------

// Basit ama tırnak farkındalıklı CSV satır ayrıştırıcı
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(v => v.trim());
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ""; });
    return row;
  });
}

function bugununISO() {
  const d = new Date();
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${ay}-${gun}`;
}

// "2026-09-09" -> "07 - 13 Eylül"  |  ay değişiyorsa "26 Ocak - 01 Şubat"
function kayitHaftasiHesapla(iso) {
  if (!iso) return "";
  const [y, m, g] = iso.split("-").map(Number);
  if (!y || !m || !g) return "";
  const tarih = new Date(y, m - 1, g);
  const gunIndex = (tarih.getDay() + 6) % 7; // Pazartesi = 0
  const pzt = new Date(y, m - 1, g - gunIndex);
  const paz = new Date(y, m - 1, g - gunIndex + 6);

  const p1 = String(pzt.getDate()).padStart(2, "0");
  const p2 = String(paz.getDate()).padStart(2, "0");
  const a1 = AYLAR[pzt.getMonth()];
  const a2 = AYLAR[paz.getMonth()];

  return a1 === a2 ? `${p1} - ${p2} ${a2}` : `${p1} ${a1} - ${p2} ${a2}`;
}

const BOS_FORM = {
  danisman: "",
  sube: "",
  kayitTarihi: bugununISO(),
  ogrenciAdi: "",
  okulAdi: "",
  hizmetTuru: "",
  ulke: "",
  sehir: "",
  sure: "",
  sureBirimi: "HAFTA",
  baslangicTarihi: "",
  kayitReferansi: "",
};

// --- Bileşen ---------------------------------------------------------------

export default function KayitTakip() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(BOS_FORM);
  const [danismanlar, setDanismanlar] = useState([]);
  const [subeMap, setSubeMap] = useState({});
  const [listeYukleniyor, setListeYukleniyor] = useState(true);
  const [listeHata, setListeHata] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [sonuc, setSonuc] = useState(null); // { tip: "ok" | "hata", mesaj }
  const [hatalar, setHatalar] = useState({});

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
  }, []);

  // Personel sekmesinden danışman listesi + şube eşleşmesi (sadece Bilimevi)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(PERSONEL_CSV);
        if (!res.ok) throw new Error("Personel listesi okunamadı");
        const rows = parseCsv(await res.text());
        const isimler = [];
        const map = {};
        rows.forEach(r => {
          const ad = (r["Ad Soyad"] || "").trim();
          if (!ad) return;
          const sirket = (r["Şirket"] || "").trim().toLowerCase();
          if (sirket !== "bilimevi") return; // sadece Bilimevi personeli
          isimler.push(ad);
          map[ad] = (r["Şube"] || "").trim();
        });
        isimler.sort((a, b) => a.localeCompare(b, "tr"));
        setDanismanlar(isimler);
        setSubeMap(map);
      } catch (err) {
        setListeHata(err.message || "Danışman listesi yüklenemedi");
      }
      setListeYukleniyor(false);
    })();
  }, []);

  // Oturumdaki kullanıcı danışman listesindeyse formu onunla aç
  useEffect(() => {
    if (!user || !danismanlar.length || form.danisman) return;
    const eslesen = danismanlar.find(
      d => d.toLowerCase() === (user.name || "").toLowerCase()
    );
    if (eslesen) {
      setForm(f => ({ ...f, danisman: eslesen, sube: subeMap[eslesen] || "" }));
    }
  }, [user, danismanlar, subeMap]);

  function alanDegistir(alan, deger) {
    setForm(f => {
      const yeni = { ...f, [alan]: deger };
      if (alan === "danisman") yeni.sube = subeMap[deger] || "";
      return yeni;
    });
    setHatalar(h => ({ ...h, [alan]: false }));
    setSonuc(null);
  }

  function dogrula() {
    const h = {};
    if (!form.danisman) h.danisman = true;
    if (!form.kayitTarihi) h.kayitTarihi = true;
    if (!form.ogrenciAdi.trim()) h.ogrenciAdi = true;
    if (!form.hizmetTuru) h.hizmetTuru = true;
    if (form.sure && isNaN(Number(form.sure))) h.sure = true;
    setHatalar(h);
    return Object.keys(h).length === 0;
  }

  async function kaydet() {
    if (kaydediliyor) return;
    if (!dogrula()) {
      setSonuc({ tip: "hata", mesaj: "Lütfen zorunlu alanları doldurun." });
      return;
    }
    setKaydediliyor(true);
    setSonuc(null);

    const payload = {
      sube: form.sube,
      kayitHaftasi: kayitHaftasiHesapla(form.kayitTarihi),
      danisman: form.danisman,
      kayitTarihi: form.kayitTarihi,
      ogrenciAdi: form.ogrenciAdi.trim(),
      okulAdi: form.okulAdi.trim(),
      hizmetTuru: form.hizmetTuru,
      ulke: form.ulke,
      sehir: form.sehir.trim(),
      sure: form.sure,
      sureBirimi: form.sureBirimi,
      baslangicTarihi: form.baslangicTarihi,
      kayitReferansi: form.kayitReferansi.trim(),
    };

    try {
      const url = `${KAYIT_TAKIP_SCRIPT_URL}?action=kayitEkle&data=${encodeURIComponent(JSON.stringify(payload))}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.msg || "Kayıt eklenemedi");

      setSonuc({ tip: "ok", mesaj: `Kayıt eklendi. Sıra No: ${json.no}` });
      // Danışman, şube ve kayıt tarihi kalsın — arka arkaya giriş için
      setForm(f => ({
        ...BOS_FORM,
        danisman: f.danisman,
        sube: f.sube,
        kayitTarihi: f.kayitTarihi,
      }));
    } catch (err) {
      setSonuc({ tip: "hata", mesaj: err.message || "Bağlantı hatası" });
    }
    setKaydediliyor(false);
  }

  if (!user) return null;

  const hafta = kayitHaftasiHesapla(form.kayitTarihi);

  return (
    <div style={styles.root}>
      <div style={styles.bgGrid} />

      <header style={styles.header}>
        <div style={styles.headerInner} className="kt-header-inner">
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}
            onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Panel
          </button>
          <img
            src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg"
            alt="Bilimevi"
            style={styles.headerLogo}
          />
        </div>
      </header>

      <main style={styles.main} className="kt-main">
        <div style={styles.titleBlock}>
          <h1 style={styles.title} className="kt-title">Kayıt Takip</h1>
          <p style={styles.subtitle}>Yeni öğrenci kaydını takip listesine ekle</p>
        </div>

        {listeHata && (
          <div style={{ ...styles.banner, ...styles.bannerErr }}>
            Danışman listesi yüklenemedi: {listeHata}
          </div>
        )}

        <div style={styles.card} className="kt-card">
          <div style={styles.grid} className="kt-grid">

            {/* Danışman */}
            <div style={styles.field}>
              <label style={styles.label}>Kaydı Alan Danışman <span style={styles.req}>*</span></label>
              <select
                value={form.danisman}
                onChange={e => alanDegistir("danisman", e.target.value)}
                disabled={listeYukleniyor}
                style={{ ...styles.input, ...(hatalar.danisman ? styles.inputErr : {}) }}
              >
                <option value="">{listeYukleniyor ? "Yükleniyor..." : "Seçiniz"}</option>
                {danismanlar.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Şube (otomatik) */}
            <div style={styles.field}>
              <label style={styles.label}>Şube</label>
              <input
                type="text"
                value={form.sube}
                readOnly
                placeholder="Danışman seçilince dolar"
                style={{ ...styles.input, ...styles.inputReadonly }}
              />
            </div>

            {/* Kayıt tarihi */}
            <div style={styles.field}>
              <label style={styles.label}>Kayıt Tarihi <span style={styles.req}>*</span></label>
              <input
                type="date"
                value={form.kayitTarihi}
                onChange={e => alanDegistir("kayitTarihi", e.target.value)}
                style={{ ...styles.input, ...(hatalar.kayitTarihi ? styles.inputErr : {}) }}
              />
            </div>

            {/* Kayıt haftası (otomatik) */}
            <div style={styles.field}>
              <label style={styles.label}>Kayıt Haftası</label>
              <input
                type="text"
                value={hafta}
                readOnly
                placeholder="Tarihten hesaplanır"
                style={{ ...styles.input, ...styles.inputReadonly }}
              />
            </div>

            {/* Öğrenci */}
            <div style={{ ...styles.field, ...styles.fieldFull }} className="kt-full">
              <label style={styles.label}>Öğrencinin Adı Soyadı <span style={styles.req}>*</span></label>
              <input
                type="text"
                value={form.ogrenciAdi}
                onChange={e => alanDegistir("ogrenciAdi", e.target.value)}
                placeholder="Ad Soyad"
                style={{ ...styles.input, ...(hatalar.ogrenciAdi ? styles.inputErr : {}) }}
              />
            </div>

            {/* Hizmet türü */}
            <div style={styles.field}>
              <label style={styles.label}>Hizmet Türü <span style={styles.req}>*</span></label>
              <select
                value={form.hizmetTuru}
                onChange={e => alanDegistir("hizmetTuru", e.target.value)}
                style={{ ...styles.input, ...(hatalar.hizmetTuru ? styles.inputErr : {}) }}
              >
                <option value="">Seçiniz</option>
                {HIZMET_TURLERI.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            {/* Okul adı */}
            <div style={styles.field}>
              <label style={styles.label}>Okul Adı</label>
              <input
                type="text"
                value={form.okulAdi}
                onChange={e => alanDegistir("okulAdi", e.target.value)}
                placeholder="Örn. EC English"
                style={styles.input}
              />
            </div>

            {/* Ülke */}
            <div style={styles.field}>
              <label style={styles.label}>Ülke</label>
              <select
                value={form.ulke}
                onChange={e => alanDegistir("ulke", e.target.value)}
                style={styles.input}
              >
                <option value="">Seçiniz</option>
                {ULKELER.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Şehir */}
            <div style={styles.field}>
              <label style={styles.label}>Şehir</label>
              <input
                type="text"
                value={form.sehir}
                onChange={e => alanDegistir("sehir", e.target.value)}
                placeholder="Örn. Londra"
                style={styles.input}
              />
            </div>

            {/* Süre */}
            <div style={styles.field}>
              <label style={styles.label}>Süre</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.sure}
                onChange={e => alanDegistir("sure", e.target.value)}
                placeholder="Örn. 8"
                style={{ ...styles.input, ...(hatalar.sure ? styles.inputErr : {}) }}
              />
            </div>

            {/* Süre birimi */}
            <div style={styles.field}>
              <label style={styles.label}>Hafta / Yıl</label>
              <select
                value={form.sureBirimi}
                onChange={e => alanDegistir("sureBirimi", e.target.value)}
                style={styles.input}
              >
                {SURE_BIRIMLERI.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Başlangıç tarihi */}
            <div style={styles.field}>
              <label style={styles.label}>Kurs / Hizmet Başlangıç Tarihi</label>
              <input
                type="date"
                value={form.baslangicTarihi}
                onChange={e => alanDegistir("baslangicTarihi", e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Kayıt referansı */}
            <div style={styles.field}>
              <label style={styles.label}>Kayıt Referansı</label>
              <input
                type="text"
                value={form.kayitReferansi}
                onChange={e => alanDegistir("kayitReferansi", e.target.value)}
                placeholder="Örn. Bilgi İstek Formu, Arkadaş Referansı"
                style={styles.input}
              />
            </div>

          </div>

          {sonuc && (
            <div style={{
              ...styles.banner,
              ...(sonuc.tip === "ok" ? styles.bannerOk : styles.bannerErr),
              marginTop: "20px",
              marginBottom: 0,
            }}>
              {sonuc.mesaj}
            </div>
          )}
        </div>

        <div style={styles.actions} className="kt-actions">
          <button
            onClick={kaydet}
            disabled={kaydediliyor}
            style={{ ...styles.saveBtn, ...(kaydediliyor ? styles.saveBtnDisabled : {}) }}
            onMouseEnter={e => { if (!kaydediliyor) e.currentTarget.style.background = "#be123c"; }}
            onMouseLeave={e => { if (!kaydediliyor) e.currentTarget.style.background = "#e11d48"; }}
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydı Ekle"}
          </button>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 640px) {
          .kt-header-inner { padding: 12px 16px !important; }
          .kt-main { padding: 20px 12px 96px !important; }
          .kt-title { font-size: 22px !important; }
          .kt-card { padding: 16px !important; border-radius: 16px !important; }
          .kt-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .kt-full { grid-column: auto !important; }
          .kt-actions {
            position: fixed !important;
            left: 0; right: 0; bottom: 0;
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) !important;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(8px);
            border-top: 1px solid #e2e8f0;
            margin-top: 0 !important;
            z-index: 20;
          }
          .kt-actions button { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Inter', sans-serif",
    position: "relative",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    zIndex: 0,
  },
  header: {
    position: "sticky",
    top: 0,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e2e8f0",
    zIndex: 10,
  },
  headerInner: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: { height: "28px", objectFit: "contain" },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    background: "transparent",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
    fontFamily: "'Inter', sans-serif",
  },
  main: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "40px 24px 64px",
    position: "relative",
    zIndex: 1,
  },
  titleBlock: { marginBottom: "24px" },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.6px",
    marginBottom: "6px",
  },
  subtitle: { fontSize: "14px", color: "#94a3b8", fontWeight: "400" },
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "20px",
    padding: "28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "18px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  fieldFull: { gridColumn: "1 / -1" },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    letterSpacing: "-0.1px",
  },
  req: { color: "#e11d48" },
  input: {
    width: "100%",
    minHeight: "44px",
    padding: "10px 12px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#0f172a",
    background: "#fff",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
  },
  inputReadonly: { background: "#f8fafc", color: "#64748b" },
  inputErr: { borderColor: "#fca5a5", background: "#fff1f2" },
  actions: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "flex-end",
  },
  saveBtn: {
    minHeight: "46px",
    padding: "12px 28px",
    background: "#e11d48",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "background 0.2s",
  },
  saveBtnDisabled: { background: "#94a3b8", cursor: "not-allowed" },
  banner: {
    padding: "12px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "500",
    marginBottom: "16px",
  },
  bannerOk: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
  bannerErr: { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" },
};
