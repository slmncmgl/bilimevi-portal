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

const READONLY_FIELDS = ["Onay Durumu", "Tally Submission ID", "Kaynak Form Adı", "Eklenme Tarihi", "Danışman Adı", "Şirket Adı", "Sözleşme Türü", "Toplam Program Ücreti"];

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

function FieldInput({ label, value, onChange, taksitSayisi }) {
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
    border: `1.5px solid ${isReadonly ? "#f1f5f9" : "#e2e8f0"}`,
    borderRadius: "10px", fontSize: "13px", fontFamily: "'Sora', sans-serif",
    color: isReadonly ? "#94a3b8" : "#0f172a",
    background: isReadonly ? "#f8fafc" : "#fff",
    outline: "none", boxSizing: "border-box",
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
  const SAYFA_BOYUTU = 10;

  useEffect(() => {
    if (!user?.name) return;
    setOgrencilerLoading(true);
    fetch(`${FETCH_URL}?danisman=${encodeURIComponent(user.name)}`)
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
    const targetTC = String(tcParam || tc).trim().replace(/\D/g, "");
    if (targetTC.length !== 11) {
      return showToast("Geçerli bir TC Kimlik No girin (11 hane)", "error");
    }
    if (tcParam) setTc(targetTC);
    setLoading(true);
    try {
      const res = await fetch(`${FETCH_URL}?tc=${targetTC}`);
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

  async function gonder() {
    if (!data) return;

    // Aktif taksit satırlarında boş alan kontrolü
    const taksitSayisi = parseInt(data["Taksit Sayısı"], 10) || 0;
    for (let i = 1; i <= taksitSayisi; i++) {
      const donem = data[`${i}. Taksit Dönemi`];
      const tutar = data[`${i}. Taksit Tutarı`];
      if (!donem || !tutar) {
        return showToast(`${i}. taksit için eksik alan var, lütfen doldurun`, "error");
      }
    }

    // Taksit toplamı kontrolü
    const toplamUcret = parseFloat(data["Toplam Program Ücreti"]) || 0;
    if (toplamUcret > 0 && taksitSayisi > 0) {
      const taksitToplam = Array.from({ length: taksitSayisi }, (_, i) =>
        parseFloat(data[`${i + 1}. Taksit Tutarı`]) || 0
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
        { label: "Öğrenci Kayıt Formu Otomatik Gönderilsin Mi?", value: "evet" },
        ...Object.entries(data)
          .filter(([k]) => !HIDDEN_FIELDS.includes(k) && k !== "row_number")
          .map(([label, value]) => ({ label: LABEL_MAP[label] || label, value: value ?? "" })),
      ];

      const payload = {
        eventType: "FORM_RESPONSE",
        createdAt: new Date().toISOString(),
        data: {
          formId: "RGRV0p",
          submissionId: data["Tally Submission ID"] || "",
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
      setSuccessModal(true);
    } catch {
      showToast("Gönderim başarısız", "error");
    } finally {
      setSubmitting(false);
    }
  }

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
          <div style={s.searchLabel}>TC Kimlik No ile Sorgula</div>
          <div style={s.searchRow}>
            <input
              type="text" maxLength={11} value={tc}
              onChange={e => setTc(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && sorgula()}
              placeholder="11 haneli TC No"
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
            <div style={s.listHeader}>Öğrencilerim ({ogrencilerim.length})</div>
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
                {ogrencilerim.slice((sayfa - 1) * SAYFA_BOYUTU, sayfa * SAYFA_BOYUTU).map((ogr, i) => (
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
                      <button onClick={() => sorgula(ogr["TC Kimlik No"])} style={s.editBtn}>Düzenle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ogrencilerim.length > SAYFA_BOYUTU && (
              <div style={s.pagination}>
                {Array.from({ length: Math.ceil(ogrencilerim.length / SAYFA_BOYUTU) }, (_, i) => i + 1).map(p => (
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
            <div style={s.infoCard}><strong>{data["Öğrenci Adı Soyadı"]}</strong> kaydı düzenleniyor.</div>
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
                    <FieldInput label={key} value={data[key]} onChange={val => updateField(key, val)} taksitSayisi={data["Taksit Sayısı"]} />
                  </div>
                ))}
              </div>
            </div>
            <div style={s.submitRow}>
              <button onClick={gonder} disabled={submitting} style={s.submitBtn}>
                {submitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)",
                      borderTop: "2px solid #fff", borderRadius: "50%",
                      animation: "spin 0.8s linear infinite", display: "inline-block"
                    }} />
                    Gönderiliyor...
                  </span>
                ) : "Düzelt ve Sözleşmeyi Gönder"}
              </button>
            </div>
          </>
        )}
      </main>

      <Toast toast={toast} />

      {successModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h3>Başarılı!</h3>
            <p>Sözleşme tekrar gönderildi.</p>
            <button onClick={() => { setSuccessModal(false); setData(null); setTc(""); }} style={s.modalBtn}>Tamam</button>
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
  editBtn: { padding: "5px 12px", background: "#ecfeff", color: "#0891b2", border: "1px solid #a5f3fc", borderRadius: "6px", cursor: "pointer" },
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
