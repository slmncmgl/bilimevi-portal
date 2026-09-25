import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const FETCH_URL = "https://n8n.bilimevi.cloud/webhook/ogrenci-getir";
const SUBMIT_URL = "https://n8n.bilimevi.cloud/webhook/birlesmis-form";
const DANISMAN_FORM_URL = "https://form.bilimevi.com/danisman-sozlesme-formu";
const NOT_URL = "https://n8n.bilimevi.cloud/webhook/not-guncelle";
// Bu süre içinde eklenen kayıtlar listede YENİ olarak işaretlenir
const YENI_SURE_SAAT = 48;

// Portal giriş logları (Kullanıcı adı | Tarih)
const GIRISLER_URL = "https://docs.google.com/spreadsheets/d/1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA/gviz/tq?tqx=out:csv&sheet=" +
  encodeURIComponent("Girişler") + "&tq=" + encodeURIComponent("select A, B");

// Büyük/küçük harf ve Türkçe karakter duyarsız karşılaştırma için
function sadelestir(str) {
  return String(str || "").trim().toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");
}

// "25.09.2026 14:15:13" -> zaman damgası
function girisTarihi(str) {
  const m = String(str || "").trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return 0;
  const [, g, a, y, sa = 0, dk = 0, sn = 0] = m;
  return new Date(+y, +a - 1, +g, +sa, +dk, +sn).getTime();
}

// Not satırlarını ayırıp gösterim için temizler
function notSatirlari(metin) {
  return String(metin || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

// Minimal not ikonu: dolu = not var, çizgi = not yok
function NotIkonu({ dolu }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 4h10l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill={dolu ? "#fde68a" : "none"} stroke={dolu ? "#b45309" : "#94a3b8"}
        strokeWidth="1.8" strokeLinejoin="round"
      />
      <path d="M15 4v4h4" stroke={dolu ? "#b45309" : "#94a3b8"} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 12h7M8 15.5h5" stroke={dolu ? "#b45309" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const TABS = ["Özet", "Öğrenci", "Sağlık", "Ebeveyn", "Okul", "Konaklama", "Taksit", "Diğer"];

const DROPDOWN_OPTIONS = {
  "İmzalayacak Ebeveyn": ["Anne", "Baba"],
  "Ödeme Velisi": ["Anne", "Baba"],
  "Eğitim Dili": ["İngilizce", "Almanca", "İspanyolca"],
  "Vize Harcı Dahil Mi?": ["Evet", "Hayır"],
  "Öğle Yemeği": ["Dahil", "Hariç"],
  "Konaklama Tipi": ["Öğrenci Yurdu", "Aile Yanı"],
  "Para Birimi": ["USD", "GBP", "EUR", "TL", "CAD", "AUD"],
  "Öğrencinin Cinsiyeti": ["Kız", "Erkek"],
  "Pasaportu Var Mı": ["Evet", "Hayır"],
  "Konaklama Talebi": ["Evet", "Hayır"],
  "Konsolosluğa verilecek mail kime ait": ["Anne", "Baba", "Öğrenci"],
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
  "Öğrenci": [
    "TC Kimlik No", "Öğrenci Adı Soyadı", "Öğrenci Doğum Tarihi", "Öğrencinin Cinsiyeti",
    "Öğrenci Mail Adresi", "Öğrenci Cep Telefonu",
    "Pasaportu Var Mı", "Pasaport Türü",
    "Pasaport Fotoğrafı", "TC Kimlik Fotoğrafı",
    "Türkiye'de Eğitim Aldığı Okul", "Sınıfı-Şubesi",
    "İkamet Adresi", "Yaşadığı Adres",
  ],
  "Sağlık": ["Alerji durumu", "Sürekli kullanılan ilaç", "Kronik hastalık"],
  "Ebeveyn": [
    "Anne Adı Soyadı", "Anne TC", "Anne Telefon", "Anne Mail",
    "Baba Adı Soyadı", "Baba TC", "Baba Telefon", "Baba Mail",
    "İmzalayacak Ebeveyn", "Ödeme Velisi",
    "Formu Dolduran Ebeveynin Adı", "Konsolosluğa verilecek mail kime ait",
  ],
  "Okul": [
    "Okul Adı", "Eğitim Dili", "Kalkış Şehri", "Öğrenci Hangi Gruba Kayıtlı",
    "Hedef Ülke", "Okul Lokasyonu", "Program Adı",
    "Program Başlangıç Tarihi", "Program Bitiş Tarihi",
    "Haftalık Ders Saati", "Kurs Süresi", "Hangi Ek Program",
    "Hizmete Dahil Olacak Ek Hizmetler",
  ],
  "Konaklama": [
    "Konaklama Talebi", "Konaklama Tipi", "Oda Tipi",
    "Konaklama Süresi (Accommodation Duration)", "Yemek Planı",
    "Öğle Yemeği", "Vize Harcı Dahil Mi?",
  ],
  "Taksit": [
    "Depozito Miktarı", "Para Birimi", "Program Ücreti", "Konaklama Ücreti",
    "Toplam Program Ücreti", "Taksit Sayısı",
    "Taksit Dönemi Tercihi", "Tercih Edilen Bankalar",
    ...Array.from({ length: 11 }, (_, i) => [`${i + 1}. Taksit Dönemi`, `${i + 1}. Taksit Tutarı`]).flat(),
  ],
  "Diğer": [
    "Şube Adı", "Danışman Adı", "Şirket Adı", "Sözleşme Türü",
    "Onay Durumu", "Tally Submission ID", "Kaynak Form Adı", "Eklenme Tarihi",
    "Miles & Smiles Üyelik Numarası", "Eklemek İstedikleriniz",
  ],
};

const ONLY_LETTERS = ["Öğrenci Adı Soyadı", "Anne Adı Soyadı", "Baba Adı Soyadı", "Danışman Adı", "Okul Lokasyonu", "Formu Dolduran Ebeveynin Adı"];
const ONLY_NUMBERS = ["Anne TC", "Baba TC", "Anne Telefon", "Baba Telefon", "Taksit Sayısı", "Depozito Miktarı", "Program Ücreti", "Konaklama Ücreti", "Toplam Program Ücreti", "Kurs Süresi", "Haftalık Ders Saati", "Öğrenci Cep Telefonu", "Konaklama Süresi (Accommodation Duration)"];
const FOTO_FIELDS = ["Pasaport Fotoğrafı", "TC Kimlik Fotoğrafı"];

// Kopyala butonu: tıklayınca değeri panoya alır, kısa süre ✓ gösterir
function KopyalaButonu({ deger, style, yerTut }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const metin = String(deger ?? "").trim();
  // yerTut: değer boşken de aynı genişlikte boşluk bırakır, yan yana dizilimde kayma olmaz
  if (!metin) return yerTut ? <span style={{ width: "30px", flexShrink: 0 }} /> : null;

  const kopyala = async e => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(metin);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = metin;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={kopyala}
      title={kopyalandi ? "Kopyalandı" : "Kopyala"}
      style={{
        width: "30px", height: "30px", padding: 0, border: "none", borderRadius: "7px",
        background: kopyalandi ? "#dcfce7" : "transparent", cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: kopyalandi ? "#16a34a" : "#94a3b8", transition: "background 0.2s, color 0.2s",
        flexShrink: 0, ...style,
      }}
    >
      {kopyalandi ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="8.5" y="8.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
}

// Boş, "-", "yok" gibi doldurulmamış değerleri link saymaz
function gecerliLink(deger) {
  const v = String(deger || "").trim();
  if (!v || v === "-" || v === "—") return "";
  if (v.toLocaleLowerCase("tr-TR") === "yok") return "";
  return /^https?:\/\//i.test(v) ? v : "";
}
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

function FieldInput({ label, value, onChange, taksitSayisi, vurgulu, saltOkunur }) {
  const isDropdown = !!DROPDOWN_OPTIONS[label];

  const taksitIndex = (() => {
    const m = label.match(/^(\d+)\. Taksit (Dönemi|Tutarı)$/);
    return m ? parseInt(m[1], 10) : null;
  })();
  const isTaksitField = taksitIndex !== null;
  const taksitPasif = isTaksitField && taksitIndex > (parseInt(taksitSayisi, 10) || 0);

  const isReadonly = saltOkunur || READONLY_FIELDS.includes(label) || taksitPasif;
  const isOnlyLetters = ONLY_LETTERS.includes(label);
  const isOnlyNumbers = ONLY_NUMBERS.includes(label) || TAKSIT_TUTAR.includes(label);
  const isDate = ["Öğrenci Doğum Tarihi", "Program Başlangıç Tarihi", "Program Bitiş Tarihi"].includes(label) || TAKSIT_DONEM.includes(label);
  const isEmail = label.includes("Mail");
  const isTextarea = ["İkamet Adresi", "Yaşadığı Adres", "Alerji durumu", "Sürekli kullanılan ilaç", "Kronik hastalık", "Hizmete Dahil Olacak Ek Hizmetler", "Eklemek İstedikleriniz"].includes(label);

  const baseStyle = {
    width: "100%", padding: "9px 12px",
    border: vurgulu ? "2px solid #ef4444" : `1.5px solid ${isReadonly ? "#e8edf3" : "#e2e8f0"}`,
    borderRadius: "10px", fontSize: "13px", fontFamily: "'Sora', sans-serif",
    color: "#0f172a",
    background: vurgulu ? "#fef2f2" : (isReadonly ? "#f8fafc" : "#fff"),
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.3s, background 0.3s",
  };

  // Fotoğraf alanları: değer bir dosya linki, metin kutusu yerine açma butonu
  if (FOTO_FIELDS.includes(label)) {
    const link = gecerliLink(value);
    if (!link) {
      return (
        <div style={{ ...baseStyle, color: "#94a3b8", background: "#f8fafc" }}>Yüklenmemiş</div>
      );
    }
    return (
      <a
        href={link} target="_blank" rel="noreferrer"
        style={{
          ...baseStyle, display: "flex", alignItems: "center", justifyContent: "center",
          gap: "8px", textDecoration: "none", fontWeight: "600",
          color: "#0e7490", background: "#ecfeff", border: "1.5px solid #a5f3fc", cursor: "pointer",
        }}
      >Fotoğrafı Aç</a>
    );
  }

  if (isDropdown && !isReadonly) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <select value={DROPDOWN_OPTIONS[label].includes(value) ? value : ""} onChange={e => onChange(e.target.value)} style={{ ...baseStyle, cursor: "pointer", flex: 1, minWidth: 0 }}>
          <option value="">Seçiniz</option>
          {DROPDOWN_OPTIONS[label].map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <KopyalaButonu deger={DROPDOWN_OPTIONS[label].includes(value) ? value : ""} yerTut />
      </div>
    );
  }

  if (isTextarea) {
    return (
      <div style={{ position: "relative" }}>
        <textarea
          value={value || ""} onChange={e => onChange(e.target.value)}
          readOnly={isReadonly} rows={3}
          style={{ ...baseStyle, resize: "vertical", paddingRight: "42px" }}
        />
        <KopyalaButonu deger={value} style={{ position: "absolute", right: "6px", top: "6px" }} />
      </div>
    );
  }

  const girdi = (
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
      style={isDate ? baseStyle : { ...baseStyle, paddingRight: "42px" }}
    />
  );

  // Tarih alanlarında takvim ikonu sağda olduğu için kopyala butonu inputun dışında durur
  if (isDate) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{girdi}</div>
        <KopyalaButonu deger={value} yerTut />
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {girdi}
      <KopyalaButonu deger={value} style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)" }} />
    </div>
  );
}

// Özet sekmesi: salt okunur, hızlı bakış için düzenlenmiş bilgi kartları
function OzetSatir({ etiket, deger, tip }) {
  const bos = !String(deger || "").trim();
  const govde = bos
    ? <span style={{ color: "#cbd5e1" }}>—</span>
    : tip === "tel"
      ? <a href={`tel:${String(deger).replace(/[^\d+]/g, "")}`} style={{ color: "#0e7490", textDecoration: "none" }}>{deger}</a>
      : tip === "mail"
        ? <a href={`mailto:${deger}`} style={{ color: "#0e7490", textDecoration: "none", wordBreak: "break-all" }}>{deger}</a>
        : deger;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ minWidth: "130px", flexShrink: 0, fontSize: "12px", color: "#64748b" }}>{etiket}</div>
      <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{govde}</span>
        {!bos && <KopyalaButonu deger={deger} />}
      </div>
    </div>
  );
}

function OzetKart({ baslik, children }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px",
      padding: "14px 16px",
    }}>
      <div style={{
        fontSize: "12px", fontWeight: "700", color: "#1e3a5f",
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px",
      }}>{baslik}</div>
      {children}
    </div>
  );
}

function BelgeButonu({ etiket, link }) {
  const url = gecerliLink(link);
  const ortak = {
    padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600",
    fontFamily: "'Sora', sans-serif", textDecoration: "none", display: "inline-block",
  };
  if (!url) {
    return (
      <span style={{ ...ortak, background: "#f8fafc", color: "#cbd5e1", border: "1px solid #e8edf3" }}>
        {etiket} · Yok
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ ...ortak, background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc", cursor: "pointer" }}>
      {etiket} · Aç
    </a>
  );
}

function OzetPaneli({ data }) {
  // Sözleşmede kullanılan adres alanı
  const adres = data["Adres"] || data["İkamet Adresi"] || data["Yaşadığı Adres"];
  const okul = data["Türkiye'de Eğitim Aldığı Okul"] || data["Okulu"];
  const sinif = data["Sınıfı-Şubesi"] || data["Sınıfı"];

  return (
    <div style={{
      display: "grid", gap: "14px",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    }}>
      <OzetKart baslik="Öğrenci">
        <OzetSatir etiket="Ad Soyad" deger={data["Öğrenci Adı Soyadı"]} />
        <OzetSatir etiket="Telefon" deger={data["Öğrenci Cep Telefonu"] || data["Cep Telefonu"]} tip="tel" />
        <OzetSatir etiket="Mail" deger={data["Öğrenci Mail Adresi"] || data["Mail Adresi"]} tip="mail" />
        {okul && <OzetSatir etiket="Okuduğu Okul" deger={okul} />}
        {sinif && <OzetSatir etiket="Sınıfı" deger={sinif} />}
      </OzetKart>

      <OzetKart baslik="Belgeler">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
          <BelgeButonu etiket="TC Kimlik" link={data["TC Kimlik Fotoğrafı"]} />
          <BelgeButonu etiket="Pasaport" link={data["Pasaport Fotoğrafı"]} />
        </div>
      </OzetKart>

      <OzetKart baslik="Baba">
        <OzetSatir etiket="Ad Soyad" deger={data["Baba Adı Soyadı"]} />
        <OzetSatir etiket="Telefon" deger={data["Baba Telefon"]} tip="tel" />
      </OzetKart>

      <OzetKart baslik="Anne">
        <OzetSatir etiket="Ad Soyad" deger={data["Anne Adı Soyadı"]} />
        <OzetSatir etiket="Telefon" deger={data["Anne Telefon"]} tip="tel" />
      </OzetKart>

      <div style={{ gridColumn: "1 / -1" }}>
        <OzetKart baslik="Ödeme Tercihleri">
          <OzetSatir etiket="Taksit Dönemi Tercihi" deger={data["Taksit Dönemi Tercihi"]} />
          <OzetSatir etiket="Tercih Edilen Bankalar" deger={data["Tercih Edilen Bankalar"]} />
        </OzetKart>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <OzetKart baslik="Adres">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: "13px", color: adres ? "#0f172a" : "#cbd5e1", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
              {adres || "—"}
            </div>
            <KopyalaButonu deger={adres} />
          </div>
        </OzetKart>
      </div>
    </div>
  );
}

export default function KayitGuncelle() {
  const navigate = useNavigate();
  const user = getSession();

  const [tc, setTc] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Özet");
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
  const [saltOkunur, setSaltOkunur] = useState(false);
  const [formFiltre, setFormFiltre] = useState("");
  const [kopyaModal, setKopyaModal] = useState(null);
  const [notModal, setNotModal] = useState(null); // { ogr, mevcut, yeni }
  const [notKaydediliyor, setNotKaydediliyor] = useState(false);
  const [notHover, setNotHover] = useState(null); // hover edilen satırın anahtarı

  // Satırı benzersiz tanımlayan anahtar (not eşleştirmesi ve hover için)
  const satirAnahtari = k => String(k["Tally Submission ID"] || "").trim() ||
    `${String(k["TC Kimlik No"] || "").trim()}|${String(k["Öğrenci Adı Soyadı"] || "").trim()}`;

  async function notKaydet() {
    if (!notModal) return;
    const { ogr, satirlar, yeni } = notModal;
    // Silinmek üzere işaretlenen notlar hariç, düzenlenmiş haliyle kalan notlar
    const mevcut = satirlar.filter(x => !x.silindi).map(x => x.metin.trim()).filter(Boolean).join("\n");
    const bugun = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const eklenecek = yeni.trim() ? `${user?.name || "Bilinmeyen"}: ${yeni.trim().replace(/\s*\n\s*/g, " ")}, ${bugun}` : "";
    const sonNot = [mevcut.trim(), eklenecek].filter(Boolean).join("\n");

    setNotKaydediliyor(true);
    try {
      const res = await fetch(NOT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tallySubmissionId: String(ogr["Tally Submission ID"] || "").trim(),
          tc: String(ogr["TC Kimlik No"] || "").trim(),
          ogrenciAdi: String(ogr["Öğrenci Adı Soyadı"] || "").trim(),
          not: sonNot,
        }),
      });
      if (!res.ok) throw new Error("Hata");

      // Listeyi yeniden çekmeden, aynı kayda ait tüm satırlarda notu güncelle
      const anahtar = satirAnahtari(ogr);
      setOgrencilerim(prev => prev.map(o => satirAnahtari(o) === anahtar ? { ...o, Notlar: sonNot } : o));
      setData(prev => prev && satirAnahtari(prev) === anahtar ? { ...prev, Notlar: sonNot } : prev);
      setNotModal(null);
      showToast("Not kaydedildi");
    } catch {
      showToast("Not kaydedilemedi", "error");
    } finally {
      setNotKaydediliyor(false);
    }
  }
  // Tüm kayıtları yalnızca yönetici rolleri görebilir
  // İngilizce rol adları: tr-TR locale "ADMIN" -> "admın" yaptığı için düz toLowerCase
  const rol = String(user?.title || user?.rol || "").toLowerCase().trim();
  // GEÇİCİ: rol bilgisi oturuma düzgün gelmediği için yetki kontrolü kapalı.
  // Düzeldiğinde alttaki satırı sil, üstteki yorumu kaldır.
  // const tumunuGorebilir = ["manager", "admin", "owner", "director"].includes(rol);
  const tumunuGorebilir = true;
  const [sadeceBenim, setSadeceBenim] = useState(false);

  // Girişler sekmesinden kullanıcının bir önceki giriş zamanı.
  // En son kayıt şu anki oturumun girişi olduğu için sondan ikinci kayıt alınır.
  const [oncekiGiris, setOncekiGiris] = useState(null);

  useEffect(() => {
    const kullanici = sadelestir(String(user?.name || "").split(/\s+/)[0]);
    if (!kullanici) return;
    fetch(`${GIRISLER_URL}&_t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.text())
      .then(csv => {
        const zamanlar = csv.split(/\r?\n/).slice(1)
          .map(satir => [...satir.matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1].replace(/""/g, '"')))
          .filter(([ad]) => sadelestir(ad) === kullanici)
          .map(([, tarih]) => girisTarihi(tarih))
          .filter(Boolean)
          .sort((a, b) => b - a);
        setOncekiGiris(zamanlar[1] || null);
      })
      .catch(() => {});
  }, [user?.name]);

  // Liste varsayılan olarak bu tarihten sonrasını gösterir
  const [tarihFiltre, setTarihFiltre] = useState("2026-08-01");
  const [onayliGizle, setOnayliGizle] = useState(false);
  const [listeFlash, setListeFlash] = useState(false);
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

  async function sorgula(tcParam, viewOnly = false) {
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
      setSaltOkunur(viewOnly);
      setData(json.data);
      setActiveTab("Özet");
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
        setSaltOkunur(false);
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

  // Kaynak Form Adı seçenekleri (veriden türetilir)
  // Eklenme tarihini parse et - farklı formatları destekler
  const eklenmeZamani = k => {
    const ham = String(k["Eklenme Tarihi"] || "").trim();
    if (!ham) return 0;

    // Önce GG.AA.YYYY / GG-AA-YYYY / GG/AA/YYYY, opsiyonel SS:dd(:ss)
    // (Date.parse bunu Amerikan formatı sanıp yanlış okuyor, o yüzden önce burada yakalıyoruz)
    const m = ham.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const [, g, a, y, sa = 0, dk = 0, sn = 0] = m;
      return new Date(+y, +a - 1, +g, +sa, +dk, +sn).getTime();
    }

    // YYYY.AA.GG / YYYY/AA/GG (tire hali ISO olduğu için aşağıda yakalanır)
    const m2 = ham.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m2) {
      const [, y, a, g, sa = 0, dk = 0, sn = 0] = m2;
      return new Date(+y, +a - 1, +g, +sa, +dk, +sn).getTime();
    }

    // ISO: 2026-08-31T11:00:36.740Z veya 2026-08-31
    const iso = Date.parse(ham);
    if (!isNaN(iso)) return iso;

    return 0;
  };

  const tarihSiniri = tarihFiltre ? new Date(`${tarihFiltre}T00:00:00`).getTime() : null;

  const onayliMi = k => String(k["Onay Durumu"] || "").toLocaleLowerCase("tr-TR").indexOf("onayland") > -1;

  // Liste rozeti için tek tip durum: Onaylı > Gönderilmedi (danışman yok) > Beklemede
  const sozlesmeDurumu = k => {
    if (onayliMi(k)) return { metin: k["Onay Durumu"], arka: "#f0fdf4", renk: "#166534" };
    if (!String(k["Danışman Adı"] || "").trim()) return { metin: "Gönderilmedi", arka: "#f1f5f9", renk: "#64748b" };
    return { metin: "Beklemede", arka: "#fef9c3", renk: "#854d0e" };
  };

  // Şimdilik listede gösterilmeyen sözleşme türleri
  const GIZLI_SOZLESME_TURLERI = ["BİREYSEL YAZ OKULU", "YETİŞKİN DİL OKULU"];
  const gizliTurMu = k => GIZLI_SOZLESME_TURLERI.includes(
    String(k["Sözleşme Türü"] || "").trim().toLocaleUpperCase("tr-TR")
  );

  // Bu formlarda dropdown değeri olarak form adı yerine okul adı kullanılır
  const OKUL_BAZLI_FORMLAR = ["Junior Kayıt Formu", "Grup Yaz Okulu Bilgi Formu"];
  const formEtiketi = k => {
    const form = String(k["Kaynak Form Adı"] || "").trim();
    if (OKUL_BAZLI_FORMLAR.includes(form)) {
      const okul = String(k["Okul Adı"] || "").trim();
      if (okul) return okul;
    }
    return form;
  };

  const aramaTerimi = normalize(tc).trim();

  // Form filtresi dışındaki tüm filtreler
  const onFiltreli = ogrencilerim.filter(o => {
    if (gizliTurMu(o)) return false;
    if (onayliGizle && onayliMi(o)) return false;
    if (tarihSiniri !== null && eklenmeZamani(o) < tarihSiniri) return false;
    if ((sadeceBenim || !tumunuGorebilir) && normalize(o["Danışman Adı"]).trim() !== normalize(user?.name).trim()) return false;
    if (!aramaTerimi) return true;
    return normalize(o["Öğrenci Adı Soyadı"]).includes(aramaTerimi) ||
           String(o["TC Kimlik No"] || "").includes(aramaTerimi);
  });

  // YENİ: önceki girişten sonra eklenmiş VE son 48 saat içinde olan kayıtlar.
  // Önceki giriş bulunamazsa sadece 48 saat kuralı uygulanır.
  const yeniSinir = Math.max(Date.now() - YENI_SURE_SAAT * 60 * 60 * 1000, oncekiGiris || 0);
  const yeniMi = k => eklenmeZamani(k) > yeniSinir;

  // Dropdown seçenekleri yalnızca görünür kayıtlardan türetilir:
  // kayıt sayısı, en son kayıt zamanı ve son girişten beri yeni kayıt var mı
  const formBilgi = onFiltreli.reduce((acc, o) => {
    const ad = formEtiketi(o);
    if (!ad) return acc;
    const b = acc[ad] || (acc[ad] = { sayi: 0, sonKayit: 0, yeniVar: false });
    b.sayi += 1;
    b.sonKayit = Math.max(b.sonKayit, eklenmeZamani(o));
    if (yeniMi(o)) b.yeniVar = true;
    return acc;
  }, {});
  const formSayaci = Object.fromEntries(Object.entries(formBilgi).map(([k, v]) => [k, v.sayi]));
  // En son form alınan liste en üstte, eşitlikte alfabetik
  const formSecenekleri = Object.keys(formBilgi).sort((a, b) =>
    (formBilgi[b].sonKayit - formBilgi[a].sonKayit) || a.localeCompare(b, "tr")
  );

  const filtreliOgrenciler = formFiltre
    ? onFiltreli.filter(o => formEtiketi(o) === formFiltre)
    : onFiltreli;

  // Seçili form yeni filtrelerde kalmadıysa seçimi bırak
  useEffect(() => {
    if (formFiltre && !formSecenekleri.includes(formFiltre)) {
      setFormFiltre("");
      setSayfa(1);
    }
  }, [formFiltre, formSecenekleri.join("|")]);

  // En yeni kayıt en üstte
  // Önce "Beklemede" olanlar, sonra diğerleri; her grup kendi içinde en yeni üstte
  const beklemedeMi = k => sozlesmeDurumu(k).metin === "Beklemede";
  const siraliOgrenciler = [...filtreliOgrenciler].sort((a, b) =>
    (beklemedeMi(b) - beklemedeMi(a)) || (eklenmeZamani(b) - eklenmeZamani(a))
  );

  return (
    <div style={s.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes notBalonGiris {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes yeniParilti {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50%      { transform: scale(1.18) rotate(12deg); opacity: 0.75; }
        }
        @keyframes listFlash {
          0%   { background: #cffafe; transform: scale(1); }
          12%  { background: #a5f3fc; transform: scale(1.03); }
          30%  { background: #cffafe; transform: scale(1); }
          100% { background: transparent; transform: scale(1); }
        }
      `}</style>
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <button onClick={() => data ? (setData(null), setTc(""), setSaltOkunur(false)) : navigate("/dashboard")} style={s.backBtn}>
            {data ? "← Listeye Dön" : "Geri"}
          </button>
          <div style={s.headerTitle}>
            <div style={s.headerTitleText}>Doldurulan Kayıt Formları</div>
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
          {!data && (
            <div style={{
              display: "flex", gap: "18px", marginTop: "14px",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center", flexWrap: "wrap",
            }}>
              <label
                style={{
                  ...s.filtreLabel,
                  opacity: tumunuGorebilir ? 1 : 0.55,
                  cursor: tumunuGorebilir ? "pointer" : "not-allowed",
                }}
                title={tumunuGorebilir ? "" : "Tüm kayıtları görüntüleme yetkiniz yok"}
              >
                <input
                  type="checkbox"
                  checked={sadeceBenim || !tumunuGorebilir}
                  disabled={!tumunuGorebilir}
                  onChange={e => { setSadeceBenim(e.target.checked); setSayfa(1); }}
                  style={{ ...s.checkbox, cursor: tumunuGorebilir ? "pointer" : "not-allowed" }}
                />
                Sadece Kendi Öğrencilerimi Göster
              </label>

              <label style={s.filtreLabel}>
                <input
                  type="checkbox"
                  checked={onayliGizle}
                  onChange={e => { setOnayliGizle(e.target.checked); setSayfa(1); }}
                  style={s.checkbox}
                />
                Onaylı Sözleşmeleri Gizle
              </label>

              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                marginLeft: isMobile ? 0 : "auto",
              }}>
                <span style={s.filtreMetin}>Şu Tarihten Sonrası:</span>
                <input
                  type="date"
                  value={tarihFiltre}
                  onChange={e => {
                    setTarihFiltre(e.target.value);
                    setSayfa(1);
                    setListeFlash(true);
                    setTimeout(() => setListeFlash(false), 2000);
                  }}
                  style={{
                    padding: "7px 10px", borderRadius: "8px", border: "1px solid #e2e8f0",
                    outline: "none", fontSize: "13px", fontFamily: "'Sora', sans-serif",
                    color: "#1e3a5f", background: "#fff", cursor: "pointer", fontWeight: "600",
                  }}
                />
                {tarihFiltre && (
                  <button
                    onClick={() => {
                      setTarihFiltre("");
                      setSayfa(1);
                      setListeFlash(true);
                      setTimeout(() => setListeFlash(false), 2000);
                    }}
                    title="Tarih filtresini temizle"
                    style={{
                      padding: "6px 10px", borderRadius: "8px", border: "1px solid #e2e8f0",
                      background: "#f8fafc", color: "#64748b", cursor: "pointer", fontSize: "12px",
                    }}
                  >Temizle</button>
                )}
              </div>
            </div>
          )}
          {!data && formSecenekleri.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ ...s.filtreMetin, marginBottom: "6px" }}>Form / Okul</div>
              <select
                value={formFiltre}
                onChange={e => { setFormFiltre(e.target.value); setSayfa(1); }}
                style={{
                  width: "100%", padding: "10px", borderRadius: "10px",
                  border: "1px solid #e2e8f0", outline: "none", cursor: "pointer",
                  fontSize: "13px", fontFamily: "'Sora', sans-serif",
                  background: "#fff", color: "#0f172a", boxSizing: "border-box",
                }}
              >
                <option value="">({onFiltreli.length}) Tümü</option>
                {formSecenekleri.map(f => (
                  <option key={f} value={f}>
                    ({formSayaci[f]}) {f}{formBilgi[f].yeniVar ? "  ✨" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            <div style={{
              ...s.listHeader,
              display: "flex", alignItems: "center", gap: "10px",
              animation: listeFlash ? "listFlash 2s ease-out" : "none",
              borderRadius: "8px", padding: "6px 10px", margin: "-6px -10px 12px",
            }}>
              Kayıt Formları
              <span style={{
                background: listeFlash ? "#0891b2" : "#f1f5f9",
                color: listeFlash ? "#fff" : "#475569",
                padding: "2px 10px", borderRadius: "20px", fontSize: "12px",
                transition: "background 0.4s, color 0.4s",
              }}>{siraliOgrenciler.length}</span>
            </div>
            <table style={s.table}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={s.th}>Öğrenci Adı Soyadı</th>
                  <th style={s.th}>Danışman</th>
                  <th style={s.th}>Sözleşme Durumu</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {siraliOgrenciler.slice((sayfa - 1) * SAYFA_BOYUTU, sayfa * SAYFA_BOYUTU).map((ogr, i) => (
                  <tr
                    key={i}
                    onMouseEnter={() => !isMobile && notSatirlari(ogr["Notlar"]).length && setNotHover(satirAnahtari(ogr))}
                    onMouseLeave={() => setNotHover(null)}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ ...s.td, position: "relative" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {yeniMi(ogr) && (
                          <span title="Yeni kayıt" aria-label="Yeni kayıt" style={s.yeniIkon}>
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 2.5c.5 4.6 2.4 6.5 7 7-4.6.5-6.5 2.4-7 7-.5-4.6-2.4-6.5-7-7 4.6-.5 6.5-2.4 7-7z" fill="#16a34a" />
                              <path d="M19 15.5c.2 1.8.9 2.5 2.7 2.7-1.8.2-2.5.9-2.7 2.7-.2-1.8-.9-2.5-2.7-2.7 1.8-.2 2.5-.9 2.7-2.7z" fill="#4ade80" />
                            </svg>
                          </span>
                        )}
                        {ogr["Öğrenci Adı Soyadı"]}
                      </span>
                      {notHover === satirAnahtari(ogr) && (
                        <div style={s.notBalon}>
                          <div style={s.notBalonOk} />
                          {notSatirlari(ogr["Notlar"]).map((satir, j) => (
                            <div key={j} style={{ padding: "3px 0", borderTop: j ? "1px dashed #fcd34d" : "none" }}>{satir}</div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ ...s.td, color: ogr["Danışman Adı"] ? "#0f172a" : "#94a3b8" }}>
                      {ogr["Danışman Adı"] || "Atanmamış"}
                    </td>
                    <td style={s.td}>
                      {(() => {
                        const d = sozlesmeDurumu(ogr);
                        return (
                          <span style={{
                            padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
                            whiteSpace: "nowrap", background: d.arka, color: d.renk,
                          }}>{d.metin}</span>
                        );
                      })()}
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>
                      <div style={{
                        display: "flex", gap: "6px", justifyContent: "flex-end",
                        flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center",
                      }}>
                        <button
                          onClick={() => setNotModal({
                            ogr,
                            satirlar: notSatirlari(ogr["Notlar"]).map(metin => ({ metin, silindi: false })),
                            yeni: "",
                          })}
                          title={notSatirlari(ogr["Notlar"]).length ? "Notları gör / düzenle" : "Not ekle"}
                          style={{
                            ...s.notBtn,
                            background: notSatirlari(ogr["Notlar"]).length ? "#fffbeb" : "#fff",
                            borderColor: notSatirlari(ogr["Notlar"]).length ? "#fcd34d" : "#e2e8f0",
                          }}
                        >
                          <NotIkonu dolu={notSatirlari(ogr["Notlar"]).length > 0} />
                          {isMobile && <span style={{ marginLeft: "6px" }}>{notSatirlari(ogr["Notlar"]).length ? "Notlar" : "Not Ekle"}</span>}
                        </button>
                        <button
                          onClick={() => sorgula(ogr["TC Kimlik No"], !ogr["Danışman Adı"])}
                          style={{ ...s.editBtn, minWidth: "88px", textAlign: "center" }}
                        >{ogr["Danışman Adı"] ? "Düzenle" : "Görüntüle"}</button>
                        <button
                          onClick={async () => {
                            const tcNo = String(ogr["TC Kimlik No"] || "");
                            try {
                              await navigator.clipboard.writeText(tcNo);
                            } catch {
                              const ta = document.createElement("textarea");
                              ta.value = tcNo;
                              document.body.appendChild(ta);
                              ta.select();
                              document.execCommand("copy");
                              document.body.removeChild(ta);
                            }
                            setKopyaModal({ tc: tcNo, ad: ogr["Öğrenci Adı Soyadı"] });
                          }}
                          style={s.formBtn}
                        >Danışman Formuna Git</button>
                        {taksitFarki(ogr) && (
                          <button
                            onClick={() => setTaksitOneri({ ...taksitFarki(ogr), kayit: ogr })}
                            title="Taksit toplamı program ücreti ile eşleşmiyor"
                            style={s.warnBtn}
                          >⚠️</button>
                        )}
                        {(() => {
                          // Sözleşme önce görülmeli, gönderim modalın içinden yapılır
                          const link = gecerliLink(ogr["Sözleşme Onay Linki"]);
                          return (
                            <button
                              onClick={() => setSozlesmeModal(ogr)}
                              disabled={!link}
                              title={link ? "Sözleşmeyi gör ve gönder" : "Sözleşme henüz oluşturulmamış"}
                              style={{
                                ...s.sendBtn, minWidth: "96px", textAlign: "center",
                                opacity: link ? 1 : 0.4, cursor: link ? "pointer" : "not-allowed",
                              }}
                            >{gonderilenTC === ogr["TC Kimlik No"] ? "Gönderildi ✓" : "Sözleşme"}</button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {siraliOgrenciler.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "13px" }}>
                Filtrelerinizle eşleşen kayıt bulunamadı.
              </div>
            )}
            {siraliOgrenciler.length > SAYFA_BOYUTU && (() => {
              const toplamSayfa = Math.ceil(siraliOgrenciler.length / SAYFA_BOYUTU);
              // Aktif sayfanın etrafında pencere, başta ve sonda kısayol
              const pencere = new Set([1, toplamSayfa, sayfa]);
              for (let i = sayfa - 1; i <= sayfa + 1; i++) {
                if (i > 1 && i < toplamSayfa) pencere.add(i);
              }
              const sayfalar = [...pencere].sort((a, b) => a - b);
              const parcalar = [];
              sayfalar.forEach((p, i) => {
                if (i > 0 && p - sayfalar[i - 1] > 1) parcalar.push("...");
                parcalar.push(p);
              });

              return (
                <div style={s.pagination}>
                  <button
                    onClick={() => setSayfa(sayfa - 1)}
                    disabled={sayfa === 1}
                    style={{ ...s.pageNav, opacity: sayfa === 1 ? 0.35 : 1, cursor: sayfa === 1 ? "default" : "pointer" }}
                  >‹ Önceki</button>

                  {parcalar.map((p, i) => p === "..." ? (
                    <span key={`e${i}`} style={s.pageDots}>…</span>
                  ) : (
                    <button key={p} onClick={() => setSayfa(p)} style={{
                      ...s.pageBtn,
                      background: sayfa === p ? "#1e3a5f" : "transparent",
                      color: sayfa === p ? "#fff" : "#1e3a5f",
                      fontWeight: sayfa === p ? "700" : "500",
                      border: sayfa === p ? "none" : "1px solid #e2e8f0",
                    }}>{p}</button>
                  ))}

                  <button
                    onClick={() => setSayfa(sayfa + 1)}
                    disabled={sayfa === toplamSayfa}
                    style={{ ...s.pageNav, opacity: sayfa === toplamSayfa ? 0.35 : 1, cursor: sayfa === toplamSayfa ? "default" : "pointer" }}
                  >Sonraki ›</button>
                </div>
              );
            })()}
          </div>
        )}

        {data && (
          <>
            <div style={{ ...s.infoCard, ...(saltOkunur ? { background: "#f8fafc", borderColor: "#e2e8f0" } : {}) }}>
              <strong>{data["Öğrenci Adı Soyadı"]}</strong> {saltOkunur ? "kaydı görüntüleniyor (salt okunur)" : "kaydı düzenleniyor"}.
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
              {activeTab === "Özet" ? <OzetPaneli data={data} /> : (
              <div style={s.fieldGrid}>
                {TAB_FIELDS[activeTab]?.map(key => (
                  <div key={key} style={["İkamet Adresi", "Yaşadığı Adres", "Alerji durumu", "Sürekli kullanılan ilaç", "Kronik hastalık", "Hizmete Dahil Olacak Ek Hizmetler", "Eklemek İstedikleriniz"].includes(key) ? { gridColumn: "1 / -1" } : {}}>
                    <label style={s.fieldLabel}>{key}</label>
                    <FieldInput label={key} value={data[key]} onChange={val => updateField(key, val)} taksitSayisi={data["Taksit Sayısı"]} vurgulu={vurgulananAlan === key} saltOkunur={saltOkunur} />
                  </div>
                ))}
              </div>
              )}
            </div>
            {!saltOkunur && (
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
            )}
          </>
        )}
      </main>

      <Toast toast={toast} />

      {notModal && (() => {
        const bugun = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const orijinal = notSatirlari(notModal.ogr["Notlar"]).join("\n");
        const kalan = notModal.satirlar.filter(x => !x.silindi).map(x => x.metin.trim()).filter(Boolean).join("\n");
        const degisti = !!notModal.yeni.trim() || kalan !== orijinal;
        const hepsiSilindi = notModal.satirlar.length > 0 && notModal.satirlar.every(x => x.silindi);
        const satirGuncelle = (idx, degisim) => setNotModal(m => ({
          ...m, satirlar: m.satirlar.map((x, j) => j === idx ? { ...x, ...degisim } : x),
        }));
        return (
          <div style={s.modalOverlay} onClick={() => !notKaydediliyor && setNotModal(null)}>
            <div style={{ ...s.modal, textAlign: "left", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <NotIkonu dolu />
                <h3 style={{ margin: 0, fontSize: "16px", color: "#1e3a5f" }}>Notlar</h3>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
                {notModal.ogr["Öğrenci Adı Soyadı"]}
              </div>

              {notModal.satirlar.length > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <label style={{ ...s.fieldLabel, marginBottom: 0 }}>Mevcut notlar</label>
                    <button
                      onClick={() => setNotModal(m => ({ ...m, satirlar: m.satirlar.map(x => ({ ...x, silindi: !hepsiSilindi })) }))}
                      style={s.notLinkBtn}
                    >{hepsiSilindi ? "Tümünü geri al" : "Tüm notları sil"}</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto" }}>
                    {notModal.satirlar.map((x, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                        <textarea
                          value={x.metin}
                          onChange={e => satirGuncelle(idx, { metin: e.target.value })}
                          readOnly={x.silindi}
                          rows={Math.min(3, Math.max(1, Math.ceil(x.metin.length / 48)))}
                          style={{
                            ...s.notAlan, flex: 1, padding: "7px 10px", resize: "none",
                            textDecoration: x.silindi ? "line-through" : "none",
                            color: x.silindi ? "#94a3b8" : "#0f172a",
                            background: x.silindi ? "#f8fafc" : "#fffbeb",
                            borderColor: x.silindi ? "#e2e8f0" : "#fde68a",
                          }}
                        />
                        {x.silindi ? (
                          <button onClick={() => satirGuncelle(idx, { silindi: false })} title="Geri al" style={s.notGeriAlBtn}>Geri al</button>
                        ) : (
                          <button onClick={() => satirGuncelle(idx, { silindi: true })} title="Bu notu sil" style={s.notSilBtn}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <label style={{ ...s.fieldLabel, marginTop: "10px" }}>Yeni not ekle</label>
              <textarea
                autoFocus
                value={notModal.yeni}
                onChange={e => setNotModal(m => ({ ...m, yeni: e.target.value }))}
                placeholder="Örn: Veli yarın arayacak"
                rows={3}
                style={s.notAlan}
              />
              {notModal.yeni.trim() && (
                <div style={{ fontSize: "11px", color: "#92400e", background: "#fffbeb", borderRadius: "8px", padding: "6px 10px", marginTop: "6px" }}>
                  Eklenecek: <strong>{user?.name}: {notModal.yeni.trim().replace(/\s*\n\s*/g, " ")}, {bugun}</strong>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  onClick={() => setNotModal(null)}
                  disabled={notKaydediliyor}
                  style={{ ...s.modalBtn, background: "#f1f5f9", color: "#475569", marginTop: 0 }}
                >Vazgeç</button>
                <button
                  onClick={notKaydet}
                  disabled={notKaydediliyor || !degisti}
                  style={{ ...s.modalBtn, marginTop: 0, opacity: degisti ? 1 : 0.5, cursor: degisti ? "pointer" : "not-allowed" }}
                >
                  {notKaydediliyor ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)",
                        borderTop: "2px solid #fff", borderRadius: "50%",
                        animation: "spin 0.8s linear infinite", display: "inline-block",
                      }} />
                      Kaydediliyor...
                    </span>
                  ) : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {kopyaModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, maxWidth: "420px" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
            <h3 style={{ margin: "0 0 10px" }}>TC Kimlik No Kopyalandı</h3>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 12px" }}>
              <strong>{kopyaModal.ad}</strong> için TC numarası panoya kopyalandı.
              Formda ilgili alana yapıştırabilirsin.
            </p>
            <div style={{
              background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "10px",
              padding: "12px", fontSize: "16px", fontWeight: "700",
              color: "#0e7490", letterSpacing: "1px",
            }}>{kopyaModal.tc}</div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setKopyaModal(null)} style={{ ...s.modalBtn, background: "#f1f5f9", color: "#475569", marginTop: 0 }}>Kapat</button>
              <a
                href={DANISMAN_FORM_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => setKopyaModal(null)}
                style={{ ...s.modalBtn, marginTop: 0, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
              >Formu Aç</a>
            </div>
          </div>
        </div>
      )}

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
            {(() => {
              const ogr = sozlesmeModal;
              const link = gecerliLink(ogr["Sözleşme Onay Linki"]);
              const danismanVar = !!String(ogr["Danışman Adı"] || "").trim();
              const gonderildi = gonderilenTC === ogr["TC Kimlik No"];
              return (
                <>
                  <div style={{
                    padding: "12px 16px", borderBottom: "1px solid #e2e8f0",
                    display: "grid", alignItems: "center", gap: "10px",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr auto 1fr",
                  }}>
                    {/* Sol: başlık */}
                    <div style={{ minWidth: 0, textAlign: isMobile ? "center" : "left" }}>
                      <strong style={{ fontSize: "14px", color: "#1e3a5f" }}>Sözleşme</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{ogr["Öğrenci Adı Soyadı"]}</div>
                    </div>

                    {/* Orta: gönder butonu */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {danismanVar && !gonderildi ? (
                        <div style={s.donenCerceve}>
                          <div style={s.donenIsik} />
                          <button
                            onClick={() => { setSozlesmeModal(null); setGonderOnay(ogr); }}
                            disabled={submitting}
                            style={s.donenBtn}
                          >Sözleşmeyi Gönder</button>
                        </div>
                      ) : (
                        <span
                          title={gonderildi ? "" : "Danışman atanmamış kayıtlar için sözleşme gönderilemez"}
                          style={{
                            fontSize: "14px", fontWeight: "700", padding: "10px 20px", borderRadius: "10px",
                            background: gonderildi ? "#f0fdf4" : "#f1f5f9", color: gonderildi ? "#166534" : "#64748b",
                          }}
                        >{gonderildi ? "Gönderildi ✓" : "Gönderilemez"}</span>
                      )}
                    </div>

                    {/* Sağ: diğer aksiyonlar */}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: isMobile ? "center" : "flex-end", flexWrap: "wrap" }}>
                      <a href={link} target="_blank" rel="noreferrer" style={{ ...s.editBtn, textDecoration: "none" }}>Yeni Sekmede Aç</a>
                      <button onClick={() => setSozlesmeModal(null)} style={s.editBtn}>Kapat</button>
                    </div>
                  </div>

                  <iframe src={link} style={{ flex: 1, border: "none", width: "100%" }} title="Sözleşme" />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {gonderOnay && (() => {
        const isYetiskin = String(gonderOnay["Sözleşme Türü"] || "").toLowerCase().indexOf("yetişkin") > -1;
        const mail = isYetiskin
          ? gonderOnay["Öğrenci Mail Adresi"]
          : (gonderOnay["İmzalayacak Ebeveyn"] === "Baba" ? gonderOnay["Baba Mail"] : gonderOnay["Anne Mail"]) || gonderOnay["Öğrenci Mail Adresi"];
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
  pagination: { display: "flex", gap: "6px", justifyContent: "center", alignItems: "center", marginTop: "18px", flexWrap: "wrap" },
  pageBtn: { minWidth: "34px", height: "34px", padding: "0 8px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "'Sora', sans-serif", background: "transparent" },
  pageNav: { height: "34px", padding: "0 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#1e3a5f", fontSize: "13px", fontWeight: "600", fontFamily: "'Sora', sans-serif" },
  pageDots: { minWidth: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px", userSelect: "none" },
  filtreLabel: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#1e3a5f", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" },
  filtreMetin: { fontSize: "13px", fontWeight: "600", color: "#1e3a5f", whiteSpace: "nowrap" },
  checkbox: { width: "16px", height: "16px", accentColor: "#1e3a5f", cursor: "pointer" },
  editBtn: { padding: "5px 12px", background: "#ecfeff", color: "#0891b2", border: "1px solid #a5f3fc", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" },
  yeniIkon: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    animation: "yeniParilti 2.4s ease-in-out infinite",
  },
  // Sözleşmeyi Gönder: etrafında dönen ışık çizgisi
  donenCerceve: {
    position: "relative", display: "inline-flex", padding: "3px", borderRadius: "13px",
    overflow: "hidden", boxShadow: "0 6px 18px rgba(30,58,95,0.3)",
  },
  donenIsik: {
    position: "absolute", top: "50%", left: "50%",
    width: "420px", height: "420px", marginTop: "-210px", marginLeft: "-210px",
    background: "conic-gradient(from 0deg, transparent 0deg, transparent 220deg, #93c5fd 290deg, #3b82f6 330deg, transparent 360deg)",
    animation: "spin 2.2s linear infinite",
  },
  donenBtn: {
    position: "relative", zIndex: 1, padding: "12px 32px", borderRadius: "10px", border: "none",
    background: "#1e3a5f", color: "#fff", fontSize: "16px", fontWeight: "700", letterSpacing: "0.2px",
    fontFamily: "'Sora', sans-serif", cursor: "pointer", whiteSpace: "nowrap",
  },
  notBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: "6px",
    cursor: "pointer", fontSize: "12px", color: "#92400e", lineHeight: 1,
  },
  notBalon: {
    position: "absolute", top: "calc(100% - 4px)", left: "12px", zIndex: 30,
    minWidth: "220px", maxWidth: "420px", padding: "8px 12px",
    background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px",
    boxShadow: "0 6px 18px rgba(146,64,14,0.12)", fontSize: "12px", color: "#78350f",
    lineHeight: "1.5", pointerEvents: "none", whiteSpace: "normal",
    animation: "notBalonGiris 0.15s ease-out",
  },
  notBalonOk: {
    position: "absolute", top: "-6px", left: "18px", width: "10px", height: "10px",
    background: "#fffbeb", borderLeft: "1px solid #fcd34d", borderTop: "1px solid #fcd34d",
    transform: "rotate(45deg)",
  },
  notSilBtn: {
    flexShrink: 0, width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid #fecaca", background: "#fff", color: "#dc2626", borderRadius: "8px", cursor: "pointer",
  },
  notGeriAlBtn: {
    flexShrink: 0, height: "34px", padding: "0 10px", border: "1px solid #e2e8f0", background: "#fff",
    color: "#475569", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600",
    fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap",
  },
  notLinkBtn: {
    border: "none", background: "none", padding: 0, cursor: "pointer",
    fontSize: "12px", fontWeight: "600", color: "#dc2626", fontFamily: "'Sora', sans-serif",
  },
  notAlan: {
    width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: "10px",
    fontSize: "13px", fontFamily: "'Sora', sans-serif", color: "#0f172a", outline: "none",
    boxSizing: "border-box", resize: "vertical", lineHeight: "1.5",
  },
  formBtn: { padding: "5px 12px", background: "#fffbeb", color: "#92400e", border: "1px solid #fcd34d", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" },
  warnBtn: { padding: "5px 8px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "12px", lineHeight: 1 },
  viewBtn: { padding: "5px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", whiteSpace: "nowrap" },
  sendBtn: { padding: "5px 12px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" },
  infoCard: { background: "#ecfeff", border: "1px solid #a5f3fc", padding: "12px", borderRadius: "10px", marginBottom: "15px", fontSize: "13px" },
  tabBar: { display: "flex", background: "#fff", border: "1px solid #e2e8f0", borderBottom: "none", borderRadius: "12px 12px 0 0", overflowX: "auto", WebkitOverflowScrolling: "touch" },
  tabBtn: { flex: "1 0 auto", padding: "12px 14px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" },
  formCard: { background: "#fff", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "0 0 15px 15px" },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "15px" },
  fieldLabel: { fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "5px" },
  submitRow: { marginTop: "20px", display: "flex", justifyContent: "flex-end" },
  submitBtn: { padding: "15px 30px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "30px", borderRadius: "20px", textAlign: "center", maxWidth: "400px", width: "90%" },
  modalBtn: { width: "100%", marginTop: "15px", padding: "12px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" },
};
