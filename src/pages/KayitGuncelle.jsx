import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const FETCH_URL = "https://n8n.bilimevi.cloud/webhook/ogrenci-getir";
const SUBMIT_URL = "https://n8n.bilimevi.cloud/webhook/birlesmis-form";

const TABS = ["Öğrenci", "Okul", "Konaklama", "Taksit", "Diğer"];

const DROPDOWN_OPTIONS = {
  "İmzalayacak Ebeveyn": ["Anne", "Baba"],
  "Ödeme Velisi": ["Anne", "Baba"],
  "Eğitim Dili": ["İngilizce", "Almanca", "İspanyolca"],
  "Kalkış Şehri": ["İstanbul", "Ankara", "İzmir", "Ardahan", "Bursa", "Antalya", "Adana", "Gaziantep", "Konya", "Mersin"],
  "Vize Harcı Dahil Mi?": ["Evet", "Hayır"],
  "Öğle Yemeği": ["Dahil", "Hariç"],
  "Konaklama Tipi": ["Öğrenci Yurdu", "Aile Yanı"],
};

const READONLY_FIELDS = ["TC Kimlik No", "Onay Durumu", "Tally Submission ID", "Kaynak Form Adı", "Eklenme Tarihi"];

const HIDDEN_FIELDS = [
  "row_number", "Sözleşme Onay Linki", "Öğrenci Takip URL", "Öğrenci Sheet Linki",
  "Sözleşme PDF Linki", "Sözleşme HTML Linki", "KVKK PDF Linki", "KVKK HTML Linki",
  "Sözleşme İmza Tarihi\n\n"
];

const TAB_FIELDS = {
  "Öğrenci": [
    "TC Kimlik No", "Öğrenci Adı Soyadı", "Doğum Tarihi", "Adres",
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
  "Konaklama": [
    "Konaklama Tipi", "Oda Tipi", "Öğle Yemeği", "Vize Harcı Dahil Mi?",
  ],
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

function FieldInput({ label, value, onChange, readonly }) {
  const isDropdown = !!DROPDOWN_OPTIONS[label];
  const isDate = label.includes("Tarih") || label === "Doğum Tarihi";
  const isEmail = label.includes("Mail");
  const isReadonly = readonly || READONLY_FIELDS.includes(label);

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
      <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...baseStyle, cursor: "pointer" }}>
        <option value="">Seçiniz</option>
        {DROPDOWN_OPTIONS[label].map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  if (label === "Adres") {
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
      value={value || ""} onChange={e => onChange(e.target.value)}
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

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function sorgula() {
    if (!tc || tc.length !== 11) return showToast("Geçerli bir TC Kimlik No girin (11 hane)", "error");
    setLoading(true);
    try {
      const res = await fetch(`${FETCH_URL}?tc=${tc}`);
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
      setTimeout(() => {
        setSubmitting(false);
        setSuccessModal(true);
      }, 2500);
    } catch {
      showToast("Gönderim başarısız, tekrar deneyin", "error");
      setSubmitting(false);
    } finally {
    }
  }

  const tabFields = TAB_FIELDS[activeTab] || [];

  // Taksit sekmesi için özel render (çiftli grid)
  const isTaksitTab = activeTab === "Taksit";
  const taksitPairs = Array.from({ length: 11 }, (_, i) => [
    `${i + 1}. Taksit Dönemi`, `${i + 1}. Taksit Tutarı`
  ]);
  const taksitTopFields = ["Depozito Miktarı", "Para Birimi", "Program Ücreti", "Konaklama Ücreti", "Toplam Program Ücreti", "Taksit Sayısı"];

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <button onClick={() => navigate("/dashboard")} style={s.backBtn}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#0891b2"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Geri
          </button>
          <div style={s.headerTitle}>
            <div style={s.headerIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" width="20" height="20">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <div style={s.headerTitleText}>Kayıt Güncelle</div>
              <div style={s.headerSub}>Öğrenci kaydını düzelt ve sözleşmeyi yeniden gönder</div>
            </div>
          </div>
          <div style={s.headerUser}>
            <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
            <span style={s.userName}>{user?.name}</span>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* TC Arama */}
        <div style={s.searchCard}>
          <div style={s.searchLabel}>TC Kimlik No ile Öğrenci Sorgula</div>
          <div style={s.searchRow}>
            <input
              type="text" maxLength={11} value={tc}
              onChange={e => setTc(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && sorgula()}
              placeholder="11 haneli TC Kimlik No"
              style={s.searchInput}
              onFocus={e => e.target.style.borderColor = "#0891b2"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
            <button onClick={sorgula} disabled={loading} style={{
              ...s.searchBtn,
              background: loading ? "#64748b" : "#0891b2",
              cursor: loading ? "not-allowed" : "pointer",
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#0e7490"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#0891b2"; }}>
              {loading ? (
                <span style={s.spinner} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
              {loading ? "Sorgulanıyor..." : "Sorgula"}
            </button>
          </div>
        </div>

        {/* Öğrenci Bilgi Kartı */}
        {data && (
          <>
            <div style={s.infoCard}>
              <div style={s.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div style={s.infoText}>
                <strong>{data["Öğrenci Adı Soyadı"]}</strong> adlı öğrencinin kaydı görüntüleniyor.
                {" "}Danışman: <strong>{data["Danışman Adı"]}</strong> · Şube: <strong>{data["Şube Adı"]}</strong>
              </div>
            </div>

            {/* Sekmeler */}
            <div style={s.tabBar}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  ...s.tabBtn,
                  borderBottom: activeTab === tab ? "2px solid #0891b2" : "2px solid transparent",
                  color: activeTab === tab ? "#0891b2" : "#64748b",
                  fontWeight: activeTab === tab ? "700" : "500",
                }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Form */}
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
                    <div style={s.taksitHeader}>
                      <span style={{ flex: 1 }}>Dönem</span>
                      <span style={{ flex: 1 }}>Tutar</span>
                    </div>
                    {taksitPairs.map(([donem, tutar], i) => (
                      <div key={i} style={s.taksitRow}>
                        <div style={s.taksitNum}>{i + 1}.</div>
                        <div style={{ flex: 1 }}>
                          <FieldInput label={donem} value={data[donem]} onChange={val => updateField(donem, val)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <FieldInput label={tutar} value={data[tutar]} onChange={val => updateField(tutar, val)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={s.fieldGrid}>
                  {tabFields.map(key => (
                    <div key={key} style={key === "Adres" ? { ...s.fieldGroup, gridColumn: "1 / -1" } : s.fieldGroup}>
                      <label style={s.fieldLabel}>
                        {key}
                        {READONLY_FIELDS.includes(key) && <span style={s.readonlyBadge}>salt okunur</span>}
                      </label>
                      <FieldInput label={key} value={data[key]} onChange={val => updateField(key, val)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={s.submitRow}>
              <button onClick={gonder} disabled={submitting} style={{
                ...s.submitBtn,
                background: submitting ? "#64748b" : "linear-gradient(135deg, #0891b2, #0e7490)",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                {submitting ? <span style={s.spinner} /> : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                  </svg>
                )}
                {submitting ? "Gönderiliyor..." : "Düzelt ve Sözleşmeyi Tekrar Gönder"}
              </button>
            </div>
          </>
        )}
      </main>

      <Toast toast={toast} />

      {/* Başarı Modal */}
      {successModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: "24px", padding: "40px 36px", maxWidth: "380px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center", animation: "fadeUp 0.3s ease-out" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0e7490", marginBottom: "10px", fontFamily: "'Sora', sans-serif" }}>
              Güncellenmiş Sözleşme Öğrenciye / Veliye Tekrar Gönderildi!
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "28px", fontFamily: "'Sora', sans-serif", lineHeight: 1.6 }}>
              Sözleşme yeniden oluşturuldu ve iletildi.
            </p>
            <button
              onClick={() => { setSuccessModal(false); setData(null); setTc(""); }}
              style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              Tamam
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .kg-field-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Sora', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  bgGlow: { position: "fixed", top: "-10%", right: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #cffafe44 0%, transparent 70%)", zIndex: 0 },

  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "900px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569", fontFamily: "'Sora', sans-serif", transition: "border-color 0.2s", whiteSpace: "nowrap" },
  headerTitle: { display: "flex", alignItems: "center", gap: "10px", flex: 1 },
  headerIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "#ecfeff", border: "1px solid #a5f3fc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerTitleText: { fontSize: "15px", fontWeight: "700", color: "#0f172a" },
  headerSub: { fontSize: "11px", color: "#94a3b8", marginTop: "1px" },
  headerUser: { display: "flex", alignItems: "center", gap: "8px" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700" },
  userName: { fontSize: "13px", fontWeight: "600", color: "#0f172a" },

  main: { maxWidth: "900px", margin: "0 auto", padding: "32px 24px 64px", position: "relative", zIndex: 1 },

  searchCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "24px 28px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", animation: "fadeUp 0.4s ease-out" },
  searchLabel: { fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "12px" },
  searchRow: { display: "flex", gap: "12px" },
  searchInput: { flex: 1, padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontFamily: "'Sora', sans-serif", color: "#0f172a", outline: "none", transition: "border-color 0.2s" },
  searchBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "600", fontFamily: "'Sora', sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" },

  infoCard: { background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", animation: "fadeUp 0.3s ease-out" },
  infoIcon: { flexShrink: 0 },
  infoText: { fontSize: "13px", color: "#0e7490", lineHeight: 1.5 },

  tabBar: { display: "flex", gap: "0", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "14px 14px 0 0", borderBottom: "none", overflow: "hidden", marginBottom: "0" },
  tabBtn: { flex: 1, padding: "12px 8px", background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", fontSize: "13px", fontFamily: "'Sora', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" },

  formCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 20px 20px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", animation: "fadeUp 0.3s ease-out" },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  fieldLabel: { fontSize: "12px", fontWeight: "600", color: "#475569", display: "flex", alignItems: "center", gap: "6px" },
  readonlyBadge: { fontSize: "10px", fontWeight: "500", color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" },

  taksitHeader: { display: "flex", gap: "8px", padding: "6px 0 6px 28px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" },
  taksitRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" },
  taksitNum: { width: "20px", fontSize: "12px", fontWeight: "600", color: "#94a3b8", textAlign: "right", flexShrink: 0 },

  submitRow: { marginTop: "16px", display: "flex", justifyContent: "flex-end" },
  submitBtn: { display: "flex", alignItems: "center", gap: "10px", padding: "14px 28px", color: "#fff", border: "none", borderRadius: "14px", fontSize: "14px", fontWeight: "700", fontFamily: "'Sora', sans-serif", transition: "opacity 0.2s", boxShadow: "0 4px 12px rgba(8,145,178,0.3)" },
  spinner: { display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};
