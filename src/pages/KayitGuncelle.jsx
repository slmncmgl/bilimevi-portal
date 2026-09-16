import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const FETCH_URL = "https://n8n.bilimevi.cloud/webhook/ogrenci-getir";
const SUBMIT_URL = "https://n8n.bilimevi.cloud/webhook/birlesmis-form";

const TABS = ["Öğrenci", "Ebeveyn", "Okul", "Konaklama", "Taksit", "Diğer"];

const DROPDOWN_OPTIONS = {
  "İmzalayacak Ebeveyn": ["Anne", "Baba"],
  "Ödeme Velisi": ["Anne", "Baba"],
  "Eğitim Dili": ["İngilizce", "Almanca", "İspanyolca"],
  "Vize Harcı Dahil Mi?": ["Evet", "Hayır"],
  "Öğle Yemeği": ["Dahil", "Hariç"],
  "Konaklama Tipi": ["Öğrenci Yurdu", "Aile Yanı"],
  "Para Birimi": ["USD", "GBP", "EUR", "TL", "CAD", "AUD"],
  "Şube Adı": [
    "Bilimevi - Taksim", "Bilimevi - Ankara", "Bilimevi - Kadıköy",
    "Bilimevi - İzmir", "Bilimevi - Bahçeşehir",
    "Premium Vize - Taksim", "Premium Vize - Kadıköy", "Fortis - Ireland",
  ],
};

const READONLY_FIELDS = ["TC Kimlik No", "Onay Durumu", "Tally Submission ID", "Kaynak Form Adı", "Eklenme Tarihi", "Danışman Adı", "Şirket Adı", "Sözleşme Türü", "Toplam Program Ücreti"];

const HIDDEN_FIELDS = [
  "row_number", "Sözleşme Onay Linki", "Öğrenci Takip URL", "Öğrenci Sheet Linki",
  "Sözleşme PDF Linki", "Sözleşme HTML Linki", "KVKK PDF Linki", "KVKK HTML Linki",
  "Sözleşme İmza Tarihi\n\n"
];

const TAB_FIELDS = {
  "Öğrenci": ["TC Kimlik No", "Öğrenci Adı Soyadı", "Doğum Tarihi", "Adres"],
  "Ebeveyn": [
    "Anne Adı Soyadı", "Anne TC", "Anne Telefon", "Anne Mail",
    "Baba Adı Soyadı", "Baba TC", "Baba Telefon", "Baba Mail",
    "İmzalayacak Ebeveyn", "Ödeme Velisi",
  ],
  "Okul": [
    "Okul Adı", "Eğitim Dili", "Kalkış Şehri", "Öğrenci Hangi Gruba Kayıtlı",
    "Hedef Ülke", "Okul Lokasyonu", "Program Adı",
    "Program Başlangıç Tarihi", "Program Bitiş Tarihi",
    "Haftalık Ders Saati",
  ],
  "Konaklama": ["Konaklama Tipi", "Oda Tipi", "Öğle Yemeği", "Vize Harcı Dahil Mi?"],
  "Taksit": [
    "Depozito Miktarı", "Para Birimi", "Program Ücreti", "Konaklama Ücreti",
    "Toplam Program Ücreti", "Taksit Sayısı",
    ...Array.from({ length: 11 }, (_, i) => [`${i + 1}. Taksit Dönemi`, `${i + 1}. Taksit Tutarı`]).flat(),
  ],
  "Diğer": [
    "Şube Adı", "Danışman Adı", "Şirket Adı", "Sözleşme Türü",
    "Onay Durumu", "Tally Submission ID", "Kaynak Form Adı", "Eklenme Tarihi",
  ],
};

const ONLY_LETTERS = ["Öğrenci Adı Soyadı", "Anne Adı Soyadı", "Baba Adı Soyadı", "Danışman Adı", "Okul Lokasyonu"];
const ONLY_NUMBERS = ["Anne TC", "Baba TC", "Anne Telefon", "Baba Telefon", "Taksit Sayısı", "Depozito Miktarı", "Program Ücreti", "Konaklama Ücreti", "Toplam Program Ücreti", "Kurs Süresi", "Haftalık Ders Saati"];
const TAKSIT_TUTAR = Array.from({ length: 11 }, (_, i) => `${i + 1}. Taksit Tutarı`);
const TAKSIT_DONEM = Array.from({ length: 11 }, (_, i) => `${i + 1}. Taksit Dönemi`);

function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      background: isSuccess ? "#f0fdf4" : "#fef2f2",
      border: `1.5px solid ${isSuccess ? "#86efac" : "#fca5a5"}`,
      color: isSuccess ? "#166534" : "#991b1b",
      padding: "14px 24px", borderRadius: "14px", fontSize: "13px", fontWeight: "600",
      boxShadow: "0 4px 24px rgba(30,58,95,0.13)", display: "flex", alignItems: "center",
      gap: "10px", fontFamily: "'Sora', sans-serif", zIndex: 9999, pointerEvents: "none",
    }}>
      {isSuccess ? "✓" : "✕"} {toast.msg}
    </div>
  );
}

function FieldInput({ label, value, onChange, taksitSayisi, vurgulu }) {
  const isDropdown = !!DROPDOWN_OPTIONS[label];

  const taksitIndex = (() => {
    const m = label.match(/^(\d+)\. Taksit (Dönemi|Tutarı)$/);
    return m ? parseInt(m[1], 10) : null;
  })();
  const isTaksitField = taksitIndex !== null;
  const taksitPasif = isTaksitField && taksitIndex > (parseInt(taksitSayisi, 10) || 0);

  const isReadonly = READONLY_FIELDS.includes(label) || taksitPasif;
  const isOnlyLetters = ONLY_LETTERS.includes(label);
  const isOnlyNumbers = ONLY_NUMBERS.includes(label) || TAKSIT_TUTAR.includes(label);
  const isDate = ["Doğum Tarihi", "Program Başlangıç Tarihi", "Program Bitiş Tarihi"].includes(label) || TAKSIT_DONEM.includes(label);
  const isEmail = label.includes("Mail");
  const isTextarea = label === "Adres";

  const baseStyle = {
    width: "100%", padding: "9px 12px",
    border: vurgulu ? "2px solid #ef4444" : `1.5px solid ${isReadonly ? "#f1f5f9" : "#e2e8f0"}`,
    borderRadius: "10px", fontSize: "13px", fontFamily: "'Sora', sans-serif",
    color: isReadonly ? "#94a3b8" : "#0f172a",
    background: vurgulu ? "#fef2f2" : (isReadonly ? "#f8fafc" : "#fff"),
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.3s, background 0.3s",
  };

  if (isDropdown && !isReadonly) {
    return (
      <select value={DROPDOWN_OPTIONS[label].includes(value) ? value : ""} onChange={e => onChange(e.target.value)} style={{ ...baseStyle, cursor: "pointer" }}>
        <option value="">Seçiniz</option>
        {DROPDOWN_OPTIONS[label].map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  if (isTextarea) {
    return (
      <textarea
        value={value || ""} onChange={e => onChange(e.target.value)}
        readOnly={isReadonly} rows={3}
        style={{ ...baseStyle, resize: "vertical" }}
      />
    );
  }

  return (
    <input
      ref={el => { if (el && vurgulu) { el.focus(); el.select(); } }}
      type={isDate ? "date" : isEmail ? "email" : "text"}
      value={value || ""}
      onChange={e => {
        let val = e.target.value;
        if (isOnlyLetters) val = val.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, "");
        if (isOnlyNumbers) val = val.replace(/\D/g, "");
        onChange(val);
      }}
      readOnly={isReadonly}
      style={baseStyle}
    />
  );
}

export default function KayitGuncelle() {
  const navigate = useNavigate();
  const user = getSession();

  const [tc, setTc] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Öğrenci");
  const [toast, setToast] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [ogrencilerim, setOgrencilerim] = useState([]);
  const [ogrencilerLoading, setOgrencilerLoading] = useState(false);
  const [sayfa, setSayfa] = useState(1);
  const [sozlesmeModal, setSozlesmeModal] = useState(null);
  const [gonderOnay, setGonderOnay] = useState(null);
  const [gonderilenTC, setGonderilenTC] = useState(null);
  const [taksitOneri, setTaksitOneri] = useState(null);
  const [vurgulananAlan, setVurgulananAlan] = useState(null);
  const SAYFA_BOYUTU = 10;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Bir kaydın taksit toplamı ile program ücreti uyuşuyor mu?
  function taksitFarki(kayit) {
    const adet = parseInt(kayit["Taksit Sayısı"], 10) || 0;
    const toplamUcret = parseFloat(kayit["Toplam Program Ücreti"]) || 0;
    if (!adet || !toplamUcret) return null;
    const toplam = Array.from({ length: adet }, (_, i) =>
      parseFloat(kayit[`${i + 1}. Taksit Tutarı`]) || 0
    ).reduce((a, b) => a + b, 0);
    const fark = toplam - toplamUcret;
    if (Math.abs(fark) < 0.01) return null;
    const sonTaksit = parseFloat(kayit[`${adet}. Taksit Tutarı`]) || 0;
    const programUcreti = parseFloat(kayit["Program Ücreti"]) || 0;
    const konaklamaUcreti = parseFloat(kayit["Konaklama Ücreti"]) || 0;
    return {
      adet, toplam, toplamUcret, fark, sonTaksit,
      yeniSonTaksit: sonTaksit - fark,
      programUcreti,
      yeniProgramUcreti: toplam - konaklamaUcreti,
    };
  }

  useEffect(() => {
    if (!user?.name) return;
    setOgrencilerLoading(true);
    fetch(`${FETCH_URL}?danisman=${encodeURIComponent(user.name)}&_t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(json => { if (json.found && json.list) setOgrencilerim(json.list); })
      .catch(() => {})
      .finally(() => setOgrencilerLoading(false));
  }, [user?.name]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function sorgula(tcParam) {
    const ham = String(tcParam || tc).trim();
    const targetTC = ham.replace(/\D/g, "");
    if (!ham) {
      return showToast("Ad Soyad veya TC Kimlik No girin", "error");
    }
    // Harf içeriyorsa listede filtreleme yapılır, sorgu atılmaz
    if (!tcParam && /[^\d\s]/.test(ham)) return;
    if (!targetTC) return;
    if (tcParam) setTc(targetTC);
    setLoading(true);
    try {
      const res = await fetch(`${FETCH_URL}?tc=${targetTC}&_t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.found) return showToast("Bu TC ile kayıt bulunamadı", "error");
      setData(json.data);
      setActiveTab("Öğrenci");
    } catch {
      showToast("Bağlantı hatası", "error");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, val) {
    setData(prev => {
      const updated = { ...prev, [key]: val };
      if (key === "Program Ücreti" || key === "Konaklama Ücreti") {
        const program = parseFloat(key === "Program Ücreti" ? val : prev["Program Ücreti"]) || 0;
        const konaklama = parseFloat(key === "Konaklama Ücreti" ? val : prev["Konaklama Ücreti"]) || 0;
        updated["Toplam Program Ücreti"] = String(program + konaklama);
      }
      return updated;
    });
  }

  async function gonder(kayit, sozlesmeGonder = true) {
    const kayitData = kayit || data;
    if (!kayitData) return;

    // Aktif taksit satırlarında boş alan kontrolü
    const taksitSayisi = parseInt(kayitData["Taksit Sayısı"], 10) || 0;
    for (let i = 1; i <= taksitSayisi; i++) {
      const donem = kayitData[`${i}. Taksit Dönemi`];
      const tutar = kayitData[`${i}. Taksit Tutarı`];
      if (!donem || !tutar) {
        return showToast(`${i}. taksit için eksik alan var, lütfen doldurun`, "error");
      }
    }

    // Taksit toplamı kontrolü
    const toplamUcret = parseFloat(kayitData["Toplam Program Ücreti"]) || 0;
    if (toplamUcret > 0 && taksitSayisi > 0) {
      const taksitToplam = Array.from({ length: taksitSayisi }, (_, i) =>
        parseFloat(kayitData[`${i + 1}. Taksit Tutarı`]) || 0
      ).reduce((a, b) => a + b, 0);
      if (Math.abs(taksitToplam - toplamUcret) > 0.01) {
        return showToast(`Taksit toplamı (${taksitToplam}) Toplam Program Ücreti (${toplamUcret}) ile eşleşmiyor`, "error");
      }
    }

    setSubmitting(true);
    try {
      const LABEL_MAP = {
        "Danışman Adı": "Kayıt Danışmanı",
        "TC Kimlik No": "Öğrenci TC Kimlik No",
        "Okul Adı": "Seçtiği Okul Adı (The School Name)",
        "Hedef Ülke": "Okulun Bulunduğu Ülke (Country)",
        "Okul Lokasyonu": "Okul Lokasyonu (Location)",
        "Program Adı": "Program Adı (Name of the course)",
        "Haftalık Ders Saati": "Haftalık Ders Saati (Hours per week)",
        "Kurs Süresi": "Kurs Süresi (Duration)",
        "Program Başlangıç Tarihi": "Kurs Başlangıç Tarihi (Start date)",
        "Program Bitiş Tarihi": "Kurs Bitiş Tarihi (End date)",
        "Konaklama Tipi": "Konaklama Tipi (Accommodation type)",
        "Oda Tipi": "Oda Tipi (Room Type)",
        "Depozito Miktarı": "Depozito Tutarı",
      };

      const fields = [
        { label: "Öğrenci Kayıt Formu Otomatik Gönderilsin Mi?", value: sozlesmeGonder ? "evet" : "hayır" },
        { label: "Sözleşme İmza Tarihi", value: new Date().toISOString().split("T")[0] },
        ...Object.entries(kayitData)
          .filter(([k]) => !HIDDEN_FIELDS.includes(k) && k !== "row_number")
          .map(([label, value]) => ({ label: LABEL_MAP[label] || label, value: value ?? "" })),
      ];

      const payload = {
        eventType: "FORM_RESPONSE",
        createdAt: new Date().toISOString(),
        data: {
          formId: "RGRV0p",
          submissionId: kayitData["Tally Submission ID"] || "",
          formName: "Kayıt Güncelle",
          fields,
        },
      };

      const [res] = await Promise.all([
        fetch(SUBMIT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        new Promise(r => setTimeout(r, 2000)),
      ]);

      if (!res.ok) throw new Error("Hata");
      if (sozlesmeGonder) {
        setSuccessModal(true);
      } else {
        setData(null);
        setTc("");
        showToast("Kayıt güncellendi");
      }
    } catch {
      showToast("Gönderim başarısız", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Türkçe karakterleri normalize ederek arama
  const normalize = str => String(str || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");

  const aramaTerimi = normalize(tc).trim();
  const filtreliOgrenciler = aramaTerimi
    ? ogrencilerim.filter(o =>
        normalize(o["Öğrenci Adı Soyadı"]).includes(aramaTerimi) ||
        String(o["TC Kimlik No"] || "").includes(aramaTerimi)
      )
    : ogrencilerim;

  // Sıralama: önce taksit uyarısı olanlar, sonra onay bekleyenler
  const siraliOgrenciler = [...filtreliOgrenciler].sort((a, b) => {
    const uyariA = taksitFarki(a) ? 0 : 1;
    const uyariB = taksitFarki(b) ? 0 : 1;
    if (uyariA !== uyariB) return uyariA - uyariB;
    const bekliyor = k => {
      const d = String(k["Onay Durumu"] || "").toLocaleLowerCase("tr-TR");
      return (!d || d.indexOf("bekl") > -1) ? 0 : 1;
    };
    return bekliyor(a) - bekliyor(b);
  });

  return (
    <div style={s.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <button onClick={() => data ? (setData(null), setTc("")) : navigate("/dashboard")} style={s.backBtn}>
            {data ? "← Listeye Dön" : "Geri"}
          </button>
          <div style={s.headerTitle}>
            <div style={s.headerTitleText}>Kayıt Güncelle</div>
            <div style={s.headerSub}>{user?.name} | Bilimevi</div>
          </div>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.searchCard}>
          <div style={s.searchLabel}>Ad Soyad / TC Kimlik No ile Sorgula</div>
          <div style={s.searchRow}>
            <input
              type="text" value={tc}
              onChange={e => { setTc(e.target.value); setSayfa(1); }}
              onKeyDown={e => e.key === "Enter" && sorgula()}
              placeholder="Ad Soyad veya TC Kimlik No"
              style={s.searchInput}
            />
            <button onClick={() => sorgula()} disabled={loading} style={s.searchBtn}>
              {loading ? "..." : "Sorgula"}
            </button>
          </div>
        </div>

        {!data && ogrencilerLoading && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <span style={{
              width: "28px", height: "28px", border: "3px solid #e2e8f0",
              borderTop: "3px solid #0891b2", borderRadius: "50%",
              display: "inline-block", animation: "spin 0.8s linear infinite"
            }} />
          </div>
        )}

        {!data && !ogrencilerLoading && ogrencilerim.length > 0 && (
          <div style={s.listCard}>
            <div style={s.listHeader}>Öğrencilerim ({siraliOgrenciler.length}{aramaTerimi ? ` / ${ogrencilerim.length}` : ""})</div>
            <table style={s.table}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={s.th}>Öğrenci Adı Soyadı</th>
                  <th style={s.th}>TC Kimlik No</th>
                  <th style={s.th}>Sözleşme Durumu</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {siraliOgrenciler.slice((sayfa - 1) * SAYFA_BOYUTU, sayfa * SAYFA_BOYUTU).map((ogr, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={s.td}>{ogr["Öğrenci Adı Soyadı"]}</td>
                    <td style={s.td}>{ogr["TC Kimlik No"]}</td>
                    <td style={s.td}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
                        background: ogr["Onay Durumu"] === "Sözleşme ve KVKK Onaylandı" ? "#f0fdf4" : "#fef9c3",
                        color: ogr["Onay Durumu"] === "Sözleşme ve KVKK Onaylandı" ? "#166534" : "#854d0e",
                      }}>{ogr["Onay Durumu"] || "Bekliyor"}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>
                      <div style={{
                        display: "flex", gap: "6px", justifyContent: "flex-end",
                        flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center",
                      }}>
                        <button
                          onClick={() => sorgula(ogr["TC Kimlik No"])}
                          disabled={!ogr["Danışman Adı"]}
                          title={!ogr["Danışman Adı"] ? "Danışman atanmamış kayıtlar düzenlenemez" : ""}
                          style={{
                            ...s.editBtn,
                            opacity: ogr["Danışman Adı"] ? 1 : 0.4,
                            cursor: ogr["Danışman Adı"] ? "pointer" : "not-allowed",
                          }}
                        >Düzenle</button>
                        {taksitFarki(ogr) && (
                          <button
                            onClick={() => setTaksitOneri({ ...taksitFarki(ogr), kayit: ogr })}
                            title="Taksit toplamı program ücreti ile eşleşmiyor"
                            style={s.warnBtn}
                          >⚠️</button>
                        )}
                        <button
                          onClick={() => setSozlesmeModal(ogr["Sözleşme Onay Linki"])}
                          disabled={!ogr["Sözleşme Onay Linki"]}
                          style={{ ...s.viewBtn, opacity: ogr["Sözleşme Onay Linki"] ? 1 : 0.4, cursor: ogr["Sözleşme Onay Linki"] ? "pointer" : "not-allowed" }}
                        >Sözleşmeyi Gör</button>
                        <button
                          onClick={() => setGonderOnay(ogr)}
                          disabled={submitting || !ogr["Danışman Adı"]}
                          title={!ogr["Danışman Adı"] ? "Danışman atanmamış kayıtlar için sözleşme gönderilemez" : ""}
                          style={{
                            ...s.sendBtn,
                            opacity: ogr["Danışman Adı"] ? 1 : 0.4,
                            cursor: ogr["Danışman Adı"] ? "pointer" : "not-allowed",
                          }}
                        >{gonderilenTC === ogr["TC Kimlik No"] ? "Gönderildi ✓" : "Sözleşmeyi Gönder"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {siraliOgrenciler.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "13px" }}>
                Aramanızla eşleşen kayıt bulunamadı.
              </div>
            )}
            {siraliOgrenciler.length > SAYFA_BOYUTU && (
              <div style={s.pagination}>
                {Array.from({ length: Math.ceil(siraliOgrenciler.length / SAYFA_BOYUTU) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setSayfa(p)} style={{
                    ...s.pageBtn,
                    background: sayfa === p ? "#0891b2" : "#f1f5f9",
                    color: sayfa === p ? "#fff" : "#475569",
                    fontWeight: sayfa === p ? "700" : "400",
                  }}>{p}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {data && (
          <>
            <div style={s.infoCard}>
              <strong>{data["Öğrenci Adı Soyadı"]}</strong> kaydı düzenleniyor.
              {data["Okul Adı"] && <span style={{ color: "#0e7490" }}> — {data["Okul Adı"]}</span>}
            </div>
            <div style={s.tabBar}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  ...s.tabBtn,
                  borderBottom: activeTab === tab ? "2px solid #0891b2" : "none",
                  color: activeTab === tab ? "#0891b2" : "#64748b"
                }}>{tab}</button>
              ))}
            </div>
            <div style={s.formCard}>
              <div style={s.fieldGrid}>
                {TAB_FIELDS[activeTab]?.map(key => (
                  <div key={key} style={key === "Adres" ? { gridColumn: "1 / -1" } : {}}>
                    <label style={s.fieldLabel}>{key}</label>
                    <FieldInput label={key} value={data[key]} onChange={val => updateField(key, val)} taksitSayisi={data["Taksit Sayısı"]} vurgulu={vurgulananAlan === key} />
                  </div>
                ))}
              </div>
            </div>
            <div style={s.submitRow}>
              <button onClick={() => gonder(null, false)} disabled={submitting} style={s.submitBtn}>
                {submitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)",
                      borderTop: "2px solid #fff", borderRadius: "50%",
                      animation: "spin 0.8s linear infinite", display: "inline-block"
                    }} />
                    Güncelleniyor...
                  </span>
                ) : "Güncelle"}
              </button>
            </div>
          </>
        )}
      </main>

      <Toast toast={toast} />

      {taksitOneri && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, textAlign: "left", maxWidth: "440px" }}>
            <h3 style={{ margin: "0 0 12px", textAlign: "center" }}>Taksit Tutarı Uyuşmuyor</h3>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.9" }}>
              <div>Taksitler toplamı: <strong>{taksitOneri.toplam}</strong></div>
              <div>Toplam Program Ücreti: <strong>{taksitOneri.toplamUcret}</strong></div>
              <div style={{ color: "#dc2626" }}>
                Fark: <strong>{taksitOneri.fark > 0 ? "+" : ""}{Math.round(taksitOneri.fark * 100) / 100}</strong>
              </div>
            </div>
            <div style={{
              background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px",
              padding: "12px", marginTop: "12px", fontSize: "13px", color: "#334155",
            }}>
              <strong style={{ color: "#0e7490" }}>Öneri 1 — Program Ücretini Düzelt</strong>
              <div style={{ marginTop: "5px" }}>
                Program Ücreti <strong>{taksitOneri.programUcreti}</strong> yerine{" "}
                <strong>{Math.round(taksitOneri.yeniProgramUcreti * 100) / 100}</strong> olsun.
                Toplam <strong>{taksitOneri.toplam}</strong> olur, taksitlerle eşitlenir.
              </div>
              <button
                onClick={async () => {
                  const o = taksitOneri;
                  setTaksitOneri(null);
                  await sorgula(o.kayit["TC Kimlik No"]);
                  setData(prev => prev ? {
                    ...prev,
                    "Program Ücreti": String(Math.round(o.yeniProgramUcreti * 100) / 100),
                    "Toplam Program Ücreti": String(Math.round(o.toplam * 100) / 100),
                  } : prev);
                  setActiveTab("Taksit");
                  setVurgulananAlan("Program Ücreti");
                  setTimeout(() => setVurgulananAlan(null), 4000);
                }}
                style={{ ...s.modalBtn, marginTop: "10px", padding: "9px" }}
              >Öneri 1'i Uygula</button>
            </div>

            <div style={{
              background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px",
              padding: "12px", marginTop: "10px", fontSize: "13px", color: "#334155",
            }}>
              <strong style={{ color: "#0e7490" }}>Öneri 2 — Son Taksiti Düzelt</strong>
              <div style={{ marginTop: "5px" }}>
                {taksitOneri.adet}. taksit <strong>{taksitOneri.sonTaksit}</strong> yerine{" "}
                <strong>{Math.round(taksitOneri.yeniSonTaksit * 100) / 100}</strong> olsun.
              </div>
              <button
                onClick={async () => {
                  const o = taksitOneri;
                  setTaksitOneri(null);
                  await sorgula(o.kayit["TC Kimlik No"]);
                  const alan = `${o.adet}. Taksit Tutarı`;
                  setData(prev => prev ? { ...prev, [alan]: String(Math.round(o.yeniSonTaksit * 100) / 100) } : prev);
                  setActiveTab("Taksit");
                  setVurgulananAlan(alan);
                  setTimeout(() => setVurgulananAlan(null), 4000);
                }}
                style={{ ...s.modalBtn, marginTop: "10px", padding: "9px" }}
              >Öneri 2'yi Uygula</button>
            </div>

            <button onClick={() => setTaksitOneri(null)} style={{ ...s.modalBtn, background: "#f1f5f9", color: "#475569", marginTop: "12px" }}>İptal</button>
          </div>
        </div>
      )}

      {sozlesmeModal && (
        <div style={s.modalOverlay} onClick={() => setSozlesmeModal(null)}>
          <div style={{
            background: "#fff", borderRadius: "16px", width: "95%", maxWidth: "900px",
            height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #e2e8f0",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <strong style={{ fontSize: "14px" }}>Sözleşme</strong>
              <div style={{ display: "flex", gap: "8px" }}>
                <a href={sozlesmeModal} target="_blank" rel="noreferrer" style={{ ...s.editBtn, textDecoration: "none" }}>Yeni Sekmede Aç</a>
                <button onClick={() => setSozlesmeModal(null)} style={s.editBtn}>Kapat</button>
              </div>
            </div>
            <iframe src={sozlesmeModal} style={{ flex: 1, border: "none", width: "100%" }} title="Sözleşme" />
          </div>
        </div>
      )}

      {gonderOnay && (() => {
        const isYetiskin = String(gonderOnay["Sözleşme Türü"] || "").toLowerCase().indexOf("yetişkin") > -1;
        const mail = isYetiskin
          ? gonderOnay["Mail Adresi"]
          : (gonderOnay["İmzalayacak Ebeveyn"] === "Baba" ? gonderOnay["Baba Mail"] : gonderOnay["Anne Mail"]) || gonderOnay["Mail Adresi"];
        return (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h3 style={{ margin: "0 0 10px" }}>Sözleşme Gönderilsin mi?</h3>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 10px" }}>
              <strong>{gonderOnay["Öğrenci Adı Soyadı"]}</strong> için sözleşme e-postası gönderilecek.
            </p>
            <div style={{
              background: mail ? "#ecfeff" : "#fef2f2",
              border: `1px solid ${mail ? "#a5f3fc" : "#fca5a5"}`,
              borderRadius: "10px", padding: "10px", fontSize: "13px",
              color: mail ? "#0e7490" : "#991b1b", wordBreak: "break-all",
            }}>
              {mail || "Mail adresi bulunamadı"}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button onClick={() => setGonderOnay(null)} style={{ ...s.modalBtn, background: "#f1f5f9", color: "#475569", marginTop: 0 }}>Vazgeç</button>
              <button
                onClick={async () => {
                  const kayit = gonderOnay;
                  setGonderOnay(null);
                  await gonder(kayit);
                  setGonderilenTC(kayit["TC Kimlik No"]);
                }}
                disabled={submitting}
                style={{ ...s.modalBtn, marginTop: 0 }}
              >{submitting ? "Gönderiliyor..." : "Gönder"}</button>
            </div>
          </div>
        </div>
        );
      })()}

      {successModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h3>Başarılı!</h3>
            <p>Sözleşme tekrar gönderildi.</p>
            <button onClick={() => { setSuccessModal(false); if (data) { setData(null); setTc(""); } }} style={s.modalBtn}>Tamam</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Sora', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: -1, pointerEvents: "none" },
  bgGlow: { position: "fixed", top: "-10%", right: "-5%", width: "500px", height: "500px", background: "radial-gradient(circle, #cffafe44 0%, transparent 70%)", zIndex: -1, pointerEvents: "none" },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 100 },
  headerInner: { maxWidth: "1000px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: "15px" },
  backBtn: { padding: "8px 15px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  headerTitle: { flex: 1 },
  headerTitleText: { fontWeight: "700", fontSize: "14px" },
  headerSub: { fontSize: "11px", color: "#94a3b8" },
  main: { maxWidth: "1000px", margin: "0 auto", padding: "20px", position: "relative", zIndex: 10 },
  searchCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "15px", padding: "20px", marginBottom: "20px" },
  searchLabel: { fontSize: "13px", fontWeight: "600", marginBottom: "10px" },
  searchRow: { display: "flex", gap: "10px" },
  searchInput: { flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", outline: "none", position: "relative", zIndex: 20 },
  searchBtn: { padding: "10px 20px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", position: "relative", zIndex: 20 },
  listCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "15px", padding: "20px", marginBottom: "20px" },
  listHeader: { fontWeight: "700", marginBottom: "15px", fontSize: "14px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { padding: "10px 12px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#64748b" },
  td: { padding: "12px 12px", fontSize: "13px", color: "#0f172a" },
  pagination: { display: "flex", gap: "6px", justifyContent: "center", marginTop: "16px" },
  pageBtn: { width: "32px", height: "32px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px" },
  editBtn: { padding: "5px 12px", background: "#ecfeff", color: "#0891b2", border: "1px solid #a5f3fc", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" },
  warnBtn: { padding: "5px 8px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "12px", lineHeight: 1 },
  viewBtn: { padding: "5px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", whiteSpace: "nowrap" },
  sendBtn: { padding: "5px 12px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" },
  infoCard: { background: "#ecfeff", border: "1px solid #a5f3fc", padding: "12px", borderRadius: "10px", marginBottom: "15px", fontSize: "13px" },
  tabBar: { display: "flex", background: "#fff", border: "1px solid #e2e8f0", borderBottom: "none", borderRadius: "12px 12px 0 0" },
  tabBtn: { flex: 1, padding: "12px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" },
  formCard: { background: "#fff", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "0 0 15px 15px" },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" },
  fieldLabel: { fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "5px" },
  submitRow: { marginTop: "20px", display: "flex", justifyContent: "flex-end" },
  submitBtn: { padding: "15px 30px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "30px", borderRadius: "20px", textAlign: "center", maxWidth: "400px", width: "90%" },
  modalBtn: { width: "100%", marginTop: "15px", padding: "12px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" },
};
