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

const READONLY_FIELDS = ["TC Kimlik No", "Onay Durumu", "Tally Submission ID", "Kaynak Form Adı", "Eklenme Tarihi"];

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
    "Haftalık Ders Saati", "Kurs Süresi",
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

const ONLY_LETTERS = ["Öğrenci Adı Soyadı", "Anne Adı Soyadı", "Baba Adı Soyadı", "Danışman Adı"];
const ONLY_NUMBERS = ["Anne TC", "Baba TC", "Anne Telefon", "Baba Telefon", "Taksit Sayısı", "Depozito Miktarı", "Program Ücreti", "Konaklama Ücreti", "Toplam Program Ücreti"];
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
      animation: "fadeUp 0.2s ease",
    }}>
      {isSuccess ? "✓" : "✕"} {toast.msg}
    </div>
  );
}

function FieldInput({ label, value, onChange }) {
  const isDropdown = !!DROPDOWN_OPTIONS[label];
  const isReadonly = READONLY_FIELDS.includes(label);
  const isOnlyLetters = ONLY_LETTERS.includes(label);
  const isOnlyNumbers = ONLY_NUMBERS.includes(label) || TAKSIT_TUTAR.includes(label);
  const isDate = ["Doğum Tarihi", "Program Başlangıç Tarihi", "Program Bitiş Tarihi"].includes(label) || TAKSIT_DONEM.includes(label);
  const isEmail = label.includes("Mail");
  const isTextarea = label === "Adres";

  const hasMismatch = isDropdown && !isReadonly && value && !DROPDOWN_OPTIONS[label].includes(value);

  const baseStyle = {
    width: "100%", padding: "9px 12px",
    border: `1.5px solid ${isReadonly ? "#f1f5f9" : "#e2e8f0"}`,
    borderRadius: "10px", fontSize: "13px", fontFamily: "'Sora', sans-serif",
    color: isReadonly ? "#94a3b8" : "#0f172a",
    background: isReadonly ? "#f8fafc" : "#fff",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  if (isDropdown && !isReadonly) {
    return (
      <div>
        <select value={DROPDOWN_OPTIONS[label].includes(value) ? value : ""} onChange={e => onChange(e.target.value)} style={{ ...baseStyle, cursor: "pointer" }}>
          <option value="">Seçiniz</option>
          {DROPDOWN_OPTIONS[label].map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {hasMismatch && (
          <div style={{ fontSize: "11px", color: "#b45309", marginTop: "4px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 8px" }}>
            ⚠ Mevcut değer: <strong>{value}</strong> — listeden seçiniz
          </div>
        )}
      </div>
    );
  }

  if (isTextarea) {
    return (
      <textarea
        value={value || ""} onChange={e => onChange(e.target.value)}
        readOnly={isReadonly} rows={3}
        style={{ ...baseStyle, resize: "vertical", lineHeight: "1.5" }}
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
      onFocus={e => { if (!isReadonly) e.target.style.borderColor = "#0891b2"; }}
      onBlur={e => { e.target.style.borderColor = isReadonly ? "#f1f5f9" : "#e2e8f0"; }}
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
  // 3 saniye sonra toast'u tamamen null yapıyoruz
  setTimeout(() => {
    setToast(null);
  }, 3000);
}

  async function sorgula(tcParam) {
    // TC'yi her ihtimale karşı temizle ve string'e zorla
    const targetTC = String(tcParam || tc).trim().replace(/\D/g, "");
    
    if (!targetTC || targetTC.length !== 11) {
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
      showToast("Bağlantı hatası, tekrar deneyin", "error");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, val) {
    setData(prev => ({ ...prev, [key]: val }));
  }

  async function gonder() {
    if (!data) return;
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

      const fields = Object.entries(data)
        .filter(([k]) => !HIDDEN_FIELDS.includes(k) && k !== "row_number")
        .map(([label, value]) => ({ label: LABEL_MAP[label] || label, value: value ?? "" }));

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

      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Sunucu hatası");
      setSuccessModal(true);
    } catch {
      showToast("Gönderim başarısız, tekrar deneyin", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const isTaksitTab = activeTab === "Taksit";
  const taksitPairs = Array.from({ length: 11 }, (_, i) => [`${i + 1}. Taksit Dönemi`, `${i + 1}. Taksit Tutarı`]);
  const taksitTopFields = ["Depozito Miktarı", "Para Birimi", "Program Ücreti", "Konaklama Ücreti", "Toplam Program Ücreti", "Taksit Sayısı"];

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <button onClick={() => navigate("/dashboard")} style={s.backBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Geri
          </button>
          <div style={s.headerTitle}>
            <div style={s.headerIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" width="20" height="20">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <div style={s.headerTitleText}>Kayıt Güncelle</div>
              <div style={s.headerSub}>Bilimevi CRM Portalı</div>
            </div>
          </div>
          <div style={s.headerUser}>
            <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
            <span style={s.userName}>{user?.name}</span>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* Arama Alanı */}
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
              {loading ? <span style={s.spinner} /> : "Sorgula"}
            </button>
          </div>
        </div>

        {/* Liste Görünümü (Sadece Data yokken) */}
        {!data && (ogrencilerLoading || ogrencilerim.length > 0) && (
          <div style={s.listCard}>
            <div style={s.listHeader}>
               <svg viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" width="16" height="16">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Öğrencilerim ({ogrencilerim.length})
            </div>
            {ogrencilerLoading ? <div style={s.loadingText}>Yükleniyor...</div> : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr><th>Ad Soyad</th><th>TC</th><th>İşlem</th></tr>
                  </thead>
                  <tbody>
                    {ogrencilerim.map((ogr, i) => (
                      <tr key={i}>
                        <td style={{fontWeight: "600"}}>{ogr["Öğrenci Adı Soyadı"]}</td>
                        <td style={{color: "#64748b"}}>{ogr["TC Kimlik No"]}</td>
                        <td>
                          <button onClick={() => sorgula(ogr["TC Kimlik No"])} style={s.editBtn}>Düzenle</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Form Alanı */}
        {data && (
          <>
            <div style={s.infoCard}>
              <strong>{data["Öğrenci Adı Soyadı"]}</strong> ({data["TC Kimlik No"]}) düzenleniyor.
            </div>

            <div style={s.tabBar}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  ...s.tabBtn,
                  borderBottom: activeTab === tab ? "2px solid #0891b2" : "2px solid transparent",
                  color: activeTab === tab ? "#0891b2" : "#64748b",
                  fontWeight: activeTab === tab ? "700" : "500",
                }}>{tab}</button>
              ))}
            </div>

            <div style={s.formCard}>
              {isTaksitTab ? (
                <>
                  <div style={s.fieldGrid}>
                    {taksitTopFields.map(key => (
                      <div key={key} style={s.fieldGroup}>
                        <label style={s.fieldLabel}>{key}</label>
                        <FieldInput label={key} value={data[key]} onChange={val => updateField(key, val)} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "20px" }}>
                    <div style={s.taksitHeader}><span>Dönem</span><span>Tutar</span></div>
                    {taksitPairs.map(([donem, tutar], i) => (
                      <div key={i} style={s.taksitRow}>
                        <div style={s.taksitNum}>{i + 1}.</div>
                        <div style={{ flex: 1 }}><FieldInput label={donem} value={data[donem]} onChange={val => updateField(donem, val)} /></div>
                        <div style={{ flex: 1 }}><FieldInput label={tutar} value={data[tutar]} onChange={val => updateField(tutar, val)} /></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={s.fieldGrid}>
                  {TAB_FIELDS[activeTab]?.map(key => (
                    <div key={key} style={key === "Adres" ? { ...s.fieldGroup, gridColumn: "1 / -1" } : s.fieldGroup}>
                      <label style={s.fieldLabel}>{key} {READONLY_FIELDS.includes(key) && <span style={s.readonlyBadge}>Kilitli</span>}</label>
                      <FieldInput label={key} value={data[key]} onChange={val => updateField(key, val)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.submitRow}>
              <button onClick={gonder} disabled={submitting} style={s.submitBtn}>
                {submitting ? <span style={s.spinner} /> : "Güncelle ve Sözleşme Gönder"}
              </button>
            </div>
          </>
        )}
      </main>

      <Toast toast={toast} />

      {successModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={{ fontSize: "40px" }}>✅</div>
            <h3 style={{ margin: "10px 0" }}>Başarıyla Güncellendi</h3>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>Sözleşme tekrar gönderildi.</p>
            <button onClick={() => { setSuccessModal(false); setData(null); setTc(""); }} style={s.modalBtn}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Stil Nesnesi (Daha derli toplu ve responsive dostu)
const s = {
 root: { 
    minHeight: "100vh", 
    background: "#f8fafc", 
    fontFamily: "'Sora', sans-serif", 
    position: "relative",
    overflowX: "hidden" // Sayfa kaymalarını engellemek için
  },
  modalOverlay: { 
    position: "fixed", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: "rgba(15,23,42,0.6)", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 9999, // En üstte olduğundan emin olalım
    backdropFilter: "blur(4px)"
  },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px" },
  bgGlow: { position: "fixed", top: "-10%", right: "-5%", width: "500px", height: "500px", background: "radial-gradient(circle, #cffafe44 0%, transparent 70%)" },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 100 },
  headerInner: { maxWidth: "1000px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: "15px" },
  backBtn: { padding: "8px 15px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "13px" },
  headerTitle: { flex: 1, display: "flex", alignItems: "center", gap: "10px" },
  headerIcon: { width: "32px", height: "32px", background: "#ecfeff", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitleText: { fontWeight: "700", fontSize: "14px" },
  headerSub: { fontSize: "11px", color: "#94a3b8" },
  headerUser: { display: "flex", alignItems: "center", gap: "8px" },
  avatar: { width: "30px", height: "30px", borderRadius: "50%", background: "#0891b2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  userName: { fontSize: "12px", fontWeight: "600" },
  main: { maxWidth: "1000px", margin: "0 auto", padding: "20px" },
  searchCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "15px", padding: "20px", marginBottom: "20px" },
  searchLabel: { fontSize: "13px", fontWeight: "600", marginBottom: "10px" },
  searchRow: { display: "flex", gap: "10px" },
  searchInput: { flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", outline: "none" },
  searchBtn: { padding: "10px 20px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" },
  listCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "15px", padding: "20px" },
  listHeader: { display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", marginBottom: "15px", fontSize: "14px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" },
  editBtn: { padding: "5px 12px", background: "#ecfeff", color: "#0891b2", border: "1px solid #a5f3fc", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  infoCard: { background: "#ecfeff", border: "1px solid #a5f3fc", padding: "12px", borderRadius: "10px", marginBottom: "15px", fontSize: "13px" },
  tabBar: { display: "flex", background: "#fff", border: "1px solid #e2e8f0", borderBottom: "none", borderRadius: "12px 12px 0 0" },
  tabBtn: { flex: 1, padding: "12px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" },
  formCard: { background: "#fff", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "0 0 15px 15px" },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "15px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  fieldLabel: { fontSize: "12px", fontWeight: "600", color: "#475569" },
  readonlyBadge: { fontSize: "10px", background: "#f1f5f9", padding: "2px 5px", borderRadius: "4px" },
  submitRow: { marginTop: "20px", display: "flex", justifyContent: "flex-end" },
  submitBtn: { padding: "15px 30px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  spinner: { display: "inline-block", width: "15px", height: "15px", border: "2px solid #fff3", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  modal: { background: "#fff", padding: "30px", borderRadius: "20px", textAlign: "center", maxWidth: "400px", width: "90%" },
  modalBtn: { width: "100%", padding: "12px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" },
  taksitHeader: { display: "flex", padding: "5px 25px", color: "#94a3b8", fontSize: "11px", fontWeight: "700" },
  taksitRow: { display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" },
  taksitNum: { width: "20px", fontSize: "12px", color: "#94a3b8" }
};
