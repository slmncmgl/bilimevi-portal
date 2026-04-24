import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

// Gemini API yapılandırması
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_KEY = "AIzaSyC4mloyXRqobdiGhZEINzPEAU8XEaBVTGY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Master sheet ID (master_index için)
const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";

// Sekme yapılandırması
const TABS = [
  { id: "courses", label: "📚 Kurslar", icon: "📚" },
  { id: "accommodation", label: "🏠 Konaklama", icon: "🏠" },
  { id: "fees", label: "💰 Ek Ücretler", icon: "💰" },
  { id: "transfers", label: "🚗 Transfer", icon: "🚗" },
];

// Boş veri yapısı
const EMPTY_DATA = {
  courses: [],
  accommodation: [],
  fees: [],
  transfers: [],
};

// Progress step'leri
const STEPS = {
  UPLOAD: "upload",
  ANALYZING: "analyzing",
  SCHOOL_SELECT: "school_select",
  PARSING: "parsing",
  PREVIEW: "preview",
  SAVING: "saving",
  DONE: "done",
};

// Validasyon sonuçları için
const VALIDATION_STATUS = {
  VALID: "valid",
  WARNING: "warning",
  ERROR: "error",
};

export default function KatalogParse() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // UI state
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [detectedBrands, setDetectedBrands] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState([]);
  
  // Parse state
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStatus, setParsingStatus] = useState("");
  const [parsedData, setParsedData] = useState(EMPTY_DATA);
  const [editableData, setEditableData] = useState(EMPTY_DATA);
  const [activeTab, setActiveTab] = useState("courses");
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});
  
  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const dropRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Session kontrolü
  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate("/");
      return;
    }
    setUser(session);
  }, []);

  // Şehir listesini çek (seçilen okula göre)
  useEffect(() => {
    if (!selectedBrand) return;
    fetchCitiesForBrand(selectedBrand);
  }, [selectedBrand]);

  async function fetchCitiesForBrand(brand) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${MASTER_ID}/gviz/tq?tqx=out:csv&sheet=master_index`;
      const res = await fetch(url);
      const csv = await res.text();
      const rows = parseCSV(csv);
      const cityList = rows
        .filter(row => row.school_brand === brand && row.is_active === "TRUE" && row.parse_status === "approved")
        .map(row => row.city)
        .filter(Boolean)
        .sort();
      setCities(cityList);
    } catch (err) {
      console.error("Şehir listesi alınamadı:", err);
    }
  }

  function parseCSV(csv) {
    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
    return lines.slice(1).map(line => {
      const values = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === "," && !inQ) {
          values.push(cur.trim());
          cur = "";
        } else cur += ch;
      }
      values.push(cur.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] || "").replace(/^"|"$/g, "");
      });
      return row;
    });
  }

  // Dosya seçimi
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Lütfen geçerli bir PDF dosyası seçin.");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Lütfen geçerli bir PDF dosyası seçin.");
    }
  }

  // PDF'i base64'e çevir
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // VALIDASYON FONKSİYONLARI
  function validateCourses(courses) {
    const errors = {};
    const warnings = {};
    const validCurrencies = ["GBP", "EUR", "USD", "CAD", "CHF"];
    
    courses.forEach((course, idx) => {
      const rowErrors = [];
      const rowWarnings = [];
      
      // Zorunlu alanlar
      if (!course.course_name || course.course_name.trim() === "") {
        rowErrors.push("Kurs adı boş olamaz");
      }
      
      // Fiyat kontrolü
      const price = parseFloat(course.price_per_week);
      if (isNaN(price) || price <= 0) {
        rowErrors.push("Geçerli bir fiyat giriniz");
      }
      
      // Para birimi kontrolü
      if (course.currency && !validCurrencies.includes(course.currency)) {
        rowErrors.push(`Geçersiz para birimi: ${course.currency}`);
      }
      
      // Tier aralığı kontrolü
      const tierMin = parseInt(course.weeks_tier_min);
      const tierMax = course.weeks_tier_max ? parseInt(course.weeks_tier_max) : null;
      
      if (isNaN(tierMin) || tierMin < 1) {
        rowErrors.push("Tier min hafta geçersiz");
      }
      
      if (tierMax !== null && tierMax < tierMin) {
        rowErrors.push("Tier max, min'den küçük olamaz");
      }
      
      // Yüksek sezon tarihleri
      if (course.high_season_start && course.high_season_end) {
        const hsStart = new Date(course.high_season_start);
        const hsEnd = new Date(course.high_season_end);
        if (isNaN(hsStart) || isNaN(hsEnd)) {
          rowErrors.push("Yüksek sezon tarihleri geçersiz");
        } else if (hsStart > hsEnd) {
          rowErrors.push("Yüksek sezon başlangıcı bitişten sonra olamaz");
        }
      }
      
      // Maksimum hafta kontrolü
      if (course.max_weeks) {
        const maxWeeks = parseInt(course.max_weeks);
        if (isNaN(maxWeeks) || maxWeeks < 1) {
          rowErrors.push("Maksimum hafta geçersiz");
        } else if (tierMin > maxWeeks) {
          rowWarnings.push(`Tier min (${tierMin}) > max_weeks (${maxWeeks})`);
        }
      }
      
      if (rowErrors.length > 0) errors[idx] = rowErrors;
      if (rowWarnings.length > 0) warnings[idx] = rowWarnings;
    });
    
    return { errors, warnings };
  }
  
  function validateAccommodation(items) {
    const errors = {};
    const warnings = {};
    const validCurrencies = ["GBP", "EUR", "USD", "CAD", "CHF"];
    
    items.forEach((item, idx) => {
      const rowErrors = [];
      const rowWarnings = [];
      
      if (!item.place_name || item.place_name.trim() === "") {
        rowErrors.push("Konaklama adı boş olamaz");
      }
      
      const price = parseFloat(item.price_per_week);
      if (isNaN(price) || price <= 0) {
        rowErrors.push("Geçerli bir fiyat giriniz");
      }
      
      if (item.currency && !validCurrencies.includes(item.currency)) {
        rowErrors.push(`Geçersiz para birimi: ${item.currency}`);
      }
      
      if (item.high_season_price) {
        const hsPrice = parseFloat(item.high_season_price);
        if (isNaN(hsPrice)) {
          rowErrors.push("Yüksek sezon fiyatı geçersiz");
        } else if (hsPrice < price) {
          rowWarnings.push("Yüksek sezon fiyatı normal fiyattan düşük");
        }
      }
      
      if (rowErrors.length > 0) errors[idx] = rowErrors;
      if (rowWarnings.length > 0) warnings[idx] = rowWarnings;
    });
    
    return { errors, warnings };
  }
  
  function validateFees(items) {
    const errors = {};
    const warnings = {};
    const validCurrencies = ["GBP", "EUR", "USD", "CAD", "CHF"];
    const validCalcTypes = ["once", "per_week"];
    const validAddonTypes = ["compulsory", "optional_service", "supplement", "upgrade", "course_addon", "post_departure"];
    
    items.forEach((item, idx) => {
      const rowErrors = [];
      
      if (!item.fee_name || item.fee_name.trim() === "") {
        rowErrors.push("Ücret adı boş olamaz");
      }
      
      const amount = parseFloat(item.amount);
      if (isNaN(amount) || amount < 0) {
        rowErrors.push("Geçerli bir tutar giriniz");
      }
      
      if (item.currency && !validCurrencies.includes(item.currency)) {
        rowErrors.push(`Geçersiz para birimi: ${item.currency}`);
      }
      
      if (item.calculation_type && !validCalcTypes.includes(item.calculation_type)) {
        rowErrors.push(`Geçersiz hesaplama tipi: ${item.calculation_type}`);
      }
      
      if (item.addon_type && !validAddonTypes.includes(item.addon_type)) {
        rowErrors.push(`Geçersiz ek tipi: ${item.addon_type}`);
      }
      
      if (rowErrors.length > 0) errors[idx] = rowErrors;
    });
    
    return { errors, warnings: {} };
  }
  
  function validateTransfers(items) {
    const errors = {};
    const warnings = {};
    const validCurrencies = ["GBP", "EUR", "USD", "CAD", "CHF"];
    
    items.forEach((item, idx) => {
      const rowErrors = [];
      
      if (!item.airport_name || item.airport_name.trim() === "") {
        rowErrors.push("Havalimanı adı boş olamaz");
      }
      
      const oneWay = parseFloat(item.price_one_way);
      if (isNaN(oneWay) || oneWay < 0) {
        rowErrors.push("Geçerli bir tek yön fiyatı giriniz");
      }
      
      if (item.price_two_way) {
        const twoWay = parseFloat(item.price_two_way);
        if (isNaN(twoWay)) {
          rowErrors.push("Geçerli bir çift yön fiyatı giriniz");
        }
      }
      
      if (item.currency && !validCurrencies.includes(item.currency)) {
        rowErrors.push(`Geçersiz para birimi: ${item.currency}`);
      }
      
      if (rowErrors.length > 0) errors[idx] = rowErrors;
    });
    
    return { errors, warnings };
  }
  
  function runAllValidations(data) {
    const courseValidation = validateCourses(data.courses);
    const accValidation = validateAccommodation(data.accommodation);
    const feesValidation = validateFees(data.fees);
    const transfersValidation = validateTransfers(data.transfers);
    
    setValidationErrors({
      courses: courseValidation.errors,
      accommodation: accValidation.errors,
      fees: feesValidation.errors,
      transfers: transfersValidation.errors,
    });
    
    setValidationWarnings({
      courses: courseValidation.warnings,
      accommodation: accValidation.warnings,
      fees: feesValidation.warnings,
      transfers: transfersValidation.warnings,
    });
    
    const totalErrors = 
      Object.keys(courseValidation.errors).length +
      Object.keys(accValidation.errors).length +
      Object.keys(feesValidation.errors).length +
      Object.keys(transfersValidation.errors).length;
    
    return totalErrors === 0;
  }

  // 1. ADIM: Okul tespiti için PDF analizi
  async function analyzeSchool() {
    if (!selectedFile) {
      setError("Lütfen bir PDF dosyası seçin.");
      return;
    }

    setStep(STEPS.ANALYZING);
    setLoading(true);
    setError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      
      const prompt = `Bu bir dil okulu katalog PDF'idir. Sayfa içeriğini analiz et ve hangi okul markasına ait olduğunu belirle.

Okul seçenekleri: EC, Kaplan, LAL, ELS, ILSC.

SADECE aşağıdaki JSON formatında cevap ver, başka hiçbir şey yazma, açıklama yapma, backtick kullanma:

{"detected":["EC"],"confidence":85,"reason":"sayfada EC logosu ve İngiltere şubeleri var"}

Eğer birden fazla okul olabilir, detected dizisine güven sırasına göre yaz.
Emin değilsen confidence düşük olur.`;

      const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.9,
          }
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || "API hatası");
      }
      
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      let clean = text.trim();
      clean = clean.replace(/```json\s*/gi, "");
      clean = clean.replace(/```\s*/g, "");
      clean = clean.trim();
      
      if (!clean.startsWith("{") && !clean.startsWith("[")) {
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          clean = jsonMatch[0];
        } else {
          throw new Error("API yanıtında JSON bulunamadı");
        }
      }
      
      const data = JSON.parse(clean);
      
      setDetectedBrands(data.detected || ["EC", "Kaplan"]);
      setSelectedBrand(data.detected?.[0] || "");
      setStep(STEPS.SCHOOL_SELECT);
      
    } catch (err) {
      console.error("Analiz hatası:", err);
      setError("Okul otomatik olarak tespit edilemedi. Lütfen manuel seçiniz.");
      setDetectedBrands(["EC", "Kaplan"]);
      setStep(STEPS.SCHOOL_SELECT);
    } finally {
      setLoading(false);
    }
  }

  // 2. ADIM: Parse et
  async function startParsing() {
    if (!selectedBrand || !selectedCity) {
      setError("Lütfen okul ve şehir seçin.");
      return;
    }

    setStep(STEPS.PARSING);
    setLoading(true);
    setParsingProgress(0);
    setParsingStatus("PDF yükleniyor...");

    try {
      const base64 = await fileToBase64(selectedFile);
      
      setParsingProgress(20);
      setParsingStatus("Kurslar parse ediliyor...");
      
      const coursesPrompt = `Bu PDF'ten kurs bilgilerini çıkar. Aşağıdaki JSON formatında döndür (başka hiçbir şey yazma, backtick kullanma):

{
  "courses": [
    {
      "course_name": "General English 20",
      "program_type": "General",
      "lessons_per_week": 20,
      "hours_per_week": 15,
      "weeks_tier_min": 1,
      "weeks_tier_max": 11,
      "price_per_week": 405,
      "currency": "GBP",
      "high_season_supplement": 20,
      "high_season_start": "2026-06-29",
      "high_season_end": "2026-08-28",
      "max_weeks": null,
      "start_day": "Monday",
      "timetable_type": "morning/afternoon",
      "morning_supplement": 40,
      "notes": ""
    }
  ]
}

ÖNEMLİ KURALLAR:
1. Her kurs için tier fiyatlandırması varsa (1-11 hafta, 12-23 hafta, 24+ hafta) her tier için AYRI satır oluştur.
2. Sadece PDF'te kesin olan bilgileri doldur. Emin değilsen boş bırak.
3. Para birimini (GBP/EUR/USD/CAD) doğru tespit et.`;

      const coursesResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: coursesPrompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, topP: 0.95 }
        })
      });

      const coursesResult = await coursesResponse.json();
      let coursesText = coursesResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      coursesText = coursesText.replace(/```json|```/g, "").trim();
      
      let coursesData = { courses: [] };
      try {
        coursesData = JSON.parse(coursesText);
      } catch (e) {
        console.error("Kurs JSON parse hatası:", e);
      }

      setParsingProgress(40);
      setParsingStatus("Konaklama bilgileri parse ediliyor...");

      const accPrompt = `Bu PDF'ten konaklama bilgilerini çıkar. JSON formatında döndür (başka hiçbir şey yazma):

{
  "accommodation": [
    {
      "place_name": "Homestay",
      "accommodation_type": "Homestay",
      "room_type": "Single",
      "bathroom_type": "Shared",
      "board_type": "Half Board",
      "price_per_week": 200,
      "currency": "GBP",
      "high_season_price": 250,
      "high_season_start": "2026-06-29",
      "high_season_end": "2026-08-28",
      "distance_to_school": "30-45 min",
      "min_weeks": null,
      "notes": ""
    }
  ]
}`;

      const accResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: accPrompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ]
          }]
        })
      });

      const accResult = await accResponse.json();
      let accText = accResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      accText = accText.replace(/```json|```/g, "").trim();
      
      let accData = { accommodation: [] };
      try {
        accData = JSON.parse(accText);
      } catch (e) {
        console.error("Konaklama JSON parse hatası:", e);
      }

      setParsingProgress(60);
      setParsingStatus("Ek ücretler parse ediliyor...");

      const feesPrompt = `Bu PDF'ten ek ücret bilgilerini çıkar JSON formatında (başka hiçbir şey yazma):

{
  "fees": [
    {
      "fee_name": "Registration Fee",
      "amount": 50,
      "currency": "GBP",
      "calculation_type": "once",
      "addon_type": "compulsory",
      "notes": ""
    }
  ]
}`;

      const feesResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: feesPrompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ]
          }]
        })
      });

      const feesResult = await feesResponse.json();
      let feesText = feesResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      feesText = feesText.replace(/```json|```/g, "").trim();
      
      let feesData = { fees: [] };
      try {
        feesData = JSON.parse(feesText);
      } catch (e) {
        console.error("Fees JSON parse hatası:", e);
      }

      setParsingProgress(80);
      setParsingStatus("Transfer bilgileri parse ediliyor...");

      const transfersPrompt = `Bu PDF'ten transfer ücreti bilgilerini çıkar JSON formatında:

{
  "transfers": [
    {
      "airport_name": "Heathrow Airport",
      "airport_code": "LHR",
      "price_one_way": 120,
      "price_two_way": 220,
      "currency": "GBP",
      "notes": ""
    }
  ]
}`;

      const transfersResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: transfersPrompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ]
          }]
        })
      });

      const transfersResult = await transfersResponse.json();
      let transfersText = transfersResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      transfersText = transfersText.replace(/```json|```/g, "").trim();
      
      let transfersData = { transfers: [] };
      try {
        transfersData = JSON.parse(transfersText);
      } catch (e) {
        console.error("Transfer JSON parse hatası:", e);
      }

      setParsingProgress(100);
      setParsingStatus("Parse tamamlandı! Veriler doğrulanıyor...");

      const fullData = {
        courses: coursesData.courses || [],
        accommodation: accData.accommodation || [],
        fees: feesData.fees || [],
        transfers: transfersData.transfers || [],
      };
      
      setParsedData(fullData);
      setEditableData(fullData);
      
      // Validasyon çalıştır
      runAllValidations(fullData);
      
      setStep(STEPS.PREVIEW);
      
    } catch (err) {
      console.error("Parse hatası:", err);
      setError("PDF parse sırasında hata oluştu: " + err.message);
      setStep(STEPS.SCHOOL_SELECT);
    } finally {
      setLoading(false);
    }
  }

  // Veri güncelleme (manuel düzenleme) - validasyonu tetikle
  function updateData(section, index, field, value) {
    const newData = { ...editableData };
    newData[section][index][field] = value;
    setEditableData(newData);
    runAllValidations(newData);
  }

  function addRow(section) {
    const newData = { ...editableData };
    let emptyRow = {};
    
    if (section === "courses") {
      emptyRow = { course_name: "", program_type: "", lessons_per_week: "", hours_per_week: "", weeks_tier_min: 1, weeks_tier_max: null, price_per_week: "", currency: "GBP", notes: "" };
    } else if (section === "accommodation") {
      emptyRow = { place_name: "", accommodation_type: "", room_type: "", board_type: "", price_per_week: "", currency: "GBP", distance_to_school: "", notes: "" };
    } else if (section === "fees") {
      emptyRow = { fee_name: "", amount: "", currency: "GBP", calculation_type: "once", addon_type: "compulsory", notes: "" };
    } else {
      emptyRow = { airport_name: "", airport_code: "", price_one_way: "", currency: "GBP", notes: "" };
    }
    
    newData[section].push(emptyRow);
    setEditableData(newData);
    runAllValidations(newData);
  }

  function deleteRow(section, index) {
    const newData = { ...editableData };
    newData[section].splice(index, 1);
    setEditableData(newData);
    runAllValidations(newData);
  }

  // Validasyon durumuna göre hücre rengi
  function getCellStyle(section, rowIdx, hasError, hasWarning) {
    let style = { ...S.cellInput };
    if (hasError) {
      style = { ...style, borderColor: "#dc2626", backgroundColor: "#fef2f2" };
    } else if (hasWarning) {
      style = { ...style, borderColor: "#f59e0b", backgroundColor: "#fffbeb" };
    }
    return style;
  }

  // Hata mesajını göster
  function getValidationMessage(section, rowIdx) {
    const errors = validationErrors[section]?.[rowIdx];
    const warnings = validationWarnings[section]?.[rowIdx];
    
    if (errors && errors.length > 0) {
      return <span style={S.errorTooltip}>⚠️ {errors.join(", ")}</span>;
    }
    if (warnings && warnings.length > 0) {
      return <span style={S.warningTooltip}>⚠️ {warnings.join(", ")}</span>;
    }
    return null;
  }

  // Toplam validasyon durumu
  function hasAnyValidationError() {
    return Object.values(validationErrors).some(section => 
      section && Object.keys(section).length > 0
    );
  }

  // Sheets'e kaydet (Apps Script çağrısı)
  async function saveToSheet() {
    if (hasAnyValidationError()) {
      setError("Lütfen tüm kırmızı hataları düzeltin.");
      return;
    }
    
    setStep(STEPS.SAVING);
    setLoading(true);
    
    // TODO: Apps Script entegrasyonu - mevcut dosyayı güncelle
    setTimeout(() => {
      setStep(STEPS.DONE);
      setLoading(false);
    }, 2000);
  }

  // Tablo render fonksiyonları (validasyonlu)
  function renderCoursesTable() {
    const courses = editableData.courses || [];
    const errors = validationErrors.courses || {};
    const warnings = validationWarnings.courses || {};
    
    if (courses.length === 0) {
      return <div style={S.emptyTable}>Kurs bulunamadı. Manuel ekleyebilirsiniz.</div>;
    }
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Kurs Adı</th>
              <th>Tip</th>
              <th>Ders/h</th>
              <th>Saat/h</th>
              <th>Min Hafta</th>
              <th>Max Hafta</th>
              <th>Fiyat/h</th>
              <th>Para Birimi</th>
              <th>HS Ek</th>
              <th>HS Başlangıç</th>
              <th>HS Bitiş</th>
              <th>Max Hafta</th>
              <th>Sabah Ücreti</th>
              <th>Notlar</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, idx) => {
              const hasError = errors[idx] && errors[idx].length > 0;
              const hasWarning = warnings[idx] && warnings[idx].length > 0;
              const msg = getValidationMessage("courses", idx);
              
              return (
                <tr key={idx} style={hasError ? S.errorRow : hasWarning ? S.warningRow : {}}>
                  <td style={S.cellIndex}>{idx + 1}{msg}</td>
                  <td><input value={course.course_name || ""} onChange={e => updateData("courses", idx, "course_name", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input value={course.program_type || ""} onChange={e => updateData("courses", idx, "program_type", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={course.lessons_per_week || ""} onChange={e => updateData("courses", idx, "lessons_per_week", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={course.hours_per_week || ""} onChange={e => updateData("courses", idx, "hours_per_week", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={course.weeks_tier_min || ""} onChange={e => updateData("courses", idx, "weeks_tier_min", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input value={course.weeks_tier_max || ""} onChange={e => updateData("courses", idx, "weeks_tier_max", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={course.price_per_week || ""} onChange={e => updateData("courses", idx, "price_per_week", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td>
                    <select value={course.currency || "GBP"} onChange={e => updateData("courses", idx, "currency", e.target.value)} style={S.cellSelect}>
                      <option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option><option value="CHF">CHF</option>
                    </select>
                  </td>
                  <td><input type="number" value={course.high_season_supplement || ""} onChange={e => updateData("courses", idx, "high_season_supplement", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="date" value={course.high_season_start || ""} onChange={e => updateData("courses", idx, "high_season_start", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="date" value={course.high_season_end || ""} onChange={e => updateData("courses", idx, "high_season_end", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={course.max_weeks || ""} onChange={e => updateData("courses", idx, "max_weeks", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={course.morning_supplement || ""} onChange={e => updateData("courses", idx, "morning_supplement", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><input value={course.notes || ""} onChange={e => updateData("courses", idx, "notes", e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} /></td>
                  <td><button onClick={() => deleteRow("courses", idx)} style={S.deleteBtn}>🗑️</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderAccommodationTable() {
    const items = editableData.accommodation || [];
    const errors = validationErrors.accommodation || {};
    const warnings = validationWarnings.accommodation || {};
    
    if (items.length === 0) return <div style={S.emptyTable}>Konaklama bulunamadı.</div>;
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr><th style={{ width: 40 }}>#</th><th>Konaklama Adı</th><th>Tip</th><th>Oda</th><th>Yemek</th><th>Fiyat/h</th><th>HS Fiyat</th><th>Para Birimi</th><th>Mesafe</th><th>Notlar</th><th></th></tr></thead>
          <tbody>
            {items.map((item, idx) => {
              const hasError = errors[idx] && errors[idx].length > 0;
              const hasWarning = warnings[idx] && warnings[idx].length > 0;
              const msg = getValidationMessage("accommodation", idx);
              
              return (
                <tr key={idx}>
                  <td style={S.cellIndex}>{idx + 1}{msg}</td>
                  <td><input value={item.place_name || ""} onChange={e => updateData("accommodation", idx, "place_name", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><input value={item.accommodation_type || ""} onChange={e => updateData("accommodation", idx, "accommodation_type", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><input value={item.room_type || ""} onChange={e => updateData("accommodation", idx, "room_type", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><input value={item.board_type || ""} onChange={e => updateData("accommodation", idx, "board_type", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={item.price_per_week || ""} onChange={e => updateData("accommodation", idx, "price_per_week", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><input type="number" value={item.high_season_price || ""} onChange={e => updateData("accommodation", idx, "high_season_price", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><select value={item.currency || "GBP"} onChange={e => updateData("accommodation", idx, "currency", e.target.value)} style={S.cellSelect}><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option><option value="CHF">CHF</option></select></td>
                  <td><input value={item.distance_to_school || ""} onChange={e => updateData("accommodation", idx, "distance_to_school", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><input value={item.notes || ""} onChange={e => updateData("accommodation", idx, "notes", e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} /></td>
                  <td><button onClick={() => deleteRow("accommodation", idx)} style={S.deleteBtn}>🗑️</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderFeesTable() {
    const items = editableData.fees || [];
    const errors = validationErrors.fees || {};
    
    if (items.length === 0) return <div style={S.emptyTable}>Ek ücret bulunamadı.</div>;
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr><th style={{ width: 40 }}>#</th><th>Ücret Adı</th><th>Tutar</th><th>Para Birimi</th><th>Hesaplama</th><th>Tip</th><th>Notlar</th><th></th></tr></thead>
          <tbody>
            {items.map((item, idx) => {
              const hasError = errors[idx] && errors[idx].length > 0;
              const msg = getValidationMessage("fees", idx);
              
              return (
                <tr key={idx}>
                  <td style={S.cellIndex}>{idx + 1}{msg}</td>
                  <td><input value={item.fee_name || ""} onChange={e => updateData("fees", idx, "fee_name", e.target.value)} style={getCellStyle("fees", idx, hasError, false)} /></td>
                  <td><input type="number" value={item.amount || ""} onChange={e => updateData("fees", idx, "amount", e.target.value)} style={getCellStyle("fees", idx, hasError, false)} /></td>
                  <td><select value={item.currency || "GBP"} onChange={e => updateData("fees", idx, "currency", e.target.value)} style={S.cellSelect}><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option><option value="CHF">CHF</option></select></td>
                  <td><select value={item.calculation_type || "once"} onChange={e => updateData("fees", idx, "calculation_type", e.target.value)} style={S.cellSelect}><option value="once">Tek sefer</option><option value="per_week">Haftalık</option></select></td>
                  <td><select value={item.addon_type || "compulsory"} onChange={e => updateData("fees", idx, "addon_type", e.target.value)} style={S.cellSelect}><option value="compulsory">Zorunlu</option><option value="optional_service">İsteğe bağlı</option><option value="supplement">Ek ücret</option><option value="upgrade">Yükseltme</option></select></td>
                  <td><input value={item.notes || ""} onChange={e => updateData("fees", idx, "notes", e.target.value)} style={getCellStyle("fees", idx, hasError, false)} /></td>
                  <td><button onClick={() => deleteRow("fees", idx)} style={S.deleteBtn}>🗑️</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTransfersTable() {
    const items = editableData.transfers || [];
    const errors = validationErrors.transfers || {};
    
    if (items.length === 0) return <div style={S.emptyTable}>Transfer bilgisi bulunamadı.</div>;
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr><th style={{ width: 40 }}>#</th><th>Havalimanı</th><th>Kodu</th><th>Tek Yön</th><th>Çift Yön</th><th>Para Birimi</th><th>Notlar</th><th></th></tr></thead>
          <tbody>
            {items.map((item, idx) => {
              const hasError = errors[idx] && errors[idx].length > 0;
              const msg = getValidationMessage("transfers", idx);
              
              return (
                <tr key={idx}>
                  <td style={S.cellIndex}>{idx + 1}{msg}</td>
                  <td><input value={item.airport_name || ""} onChange={e => updateData("transfers", idx, "airport_name", e.target.value)} style={getCellStyle("transfers", idx, hasError, false)} /></td>
                  <td><input value={item.airport_code || ""} onChange={e => updateData("transfers", idx, "airport_code", e.target.value)} style={getCellStyle("transfers", idx, hasError, false)} /></td>
                  <td><input type="number" value={item.price_one_way || ""} onChange={e => updateData("transfers", idx, "price_one_way", e.target.value)} style={getCellStyle("transfers", idx, hasError, false)} /></td>
                  <td><input type="number" value={item.price_two_way || ""} onChange={e => updateData("transfers", idx, "price_two_way", e.target.value)} style={getCellStyle("transfers", idx, hasError, false)} /></td>
                  <td><select value={item.currency || "GBP"} onChange={e => updateData("transfers", idx, "currency", e.target.value)} style={S.cellSelect}><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option><option value="CHF">CHF</option></select></td>
                  <td><input value={item.notes || ""} onChange={e => updateData("transfers", idx, "notes", e.target.value)} style={getCellStyle("transfers", idx, hasError, false)} /></td>
                  <td><button onClick={() => deleteRow("transfers", idx)} style={S.deleteBtn}>🗑️</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabContent() {
    switch (activeTab) {
      case "courses": return renderCoursesTable();
      case "accommodation": return renderAccommodationTable();
      case "fees": return renderFeesTable();
      case "transfers": return renderTransfersTable();
      default: return null;
    }
  }

  // RENDER - UPLOAD
  if (step === STEPS.UPLOAD) {
    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        <header style={S.header}>
          <div style={S.headerInner}>
            <button onClick={() => navigate("/dashboard")} style={S.backBtn}>← Dashboard</button>
            <span style={S.headerTitle}>Katalog Parse</span>
            <div style={S.userChip}>{user?.name}</div>
          </div>
        </header>
        <main style={S.main}>
          <div style={S.uploadCard}>
            <div style={S.uploadIcon}>📄</div>
            <h2 style={S.uploadTitle}>PDF Katalog Yükle</h2>
            <p style={S.uploadSub}>Dil okuluna ait katalog PDF'sini yükleyin, sistem otomatik parse edecek</p>
            <div ref={dropRef} onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} style={{ ...S.dropZone, borderColor: isDragOver ? "#2563eb" : "#e2e8f0", background: isDragOver ? "#eff6ff" : "#f8fafc" }}>
              <input type="file" accept="application/pdf" onChange={handleFileSelect} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
              {selectedFile ? (
                <div style={{ textAlign: "center" }}><span style={{ fontSize: 32 }}>📄</span><p style={{ fontWeight: 600, marginTop: 8 }}>{selectedFile.name}</p><p style={{ fontSize: 12, color: "#64748b" }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
              ) : (
                <div style={{ textAlign: "center" }}><span style={{ fontSize: 48 }}>📁</span><p style={{ fontWeight: 500, marginTop: 8 }}>PDF sürükle veya tıkla seç</p><p style={{ fontSize: 12, color: "#94a3b8" }}>Maks. 50MB</p></div>
              )}
            </div>
            {error && <div style={S.errorBox}>{error}</div>}
            <button onClick={analyzeSchool} disabled={!selectedFile || loading} style={{ ...S.primaryBtn, opacity: (!selectedFile || loading) ? 0.5 : 1 }}>{loading ? "Analiz ediliyor..." : "📊 PDF'i Analiz Et"}</button>
          </div>
        </main>
      </div>
    );
  }

  // RENDER - SCHOOL SELECT
  if (step === STEPS.SCHOOL_SELECT) {
    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        <header style={S.header}>
          <div style={S.headerInner}>
            <button onClick={() => setStep(STEPS.UPLOAD)} style={S.backBtn}>← Geri</button>
            <span style={S.headerTitle}>Okul Seçimi</span>
            <div style={S.userChip}>{user?.name}</div>
          </div>
        </header>
        <main style={S.main}>
          <div style={S.selectCard}>
            <div style={{ textAlign: "center", marginBottom: 24 }}><span style={{ fontSize: 48 }}>🎯</span><h2 style={S.uploadTitle}>Okul Tespit Edildi</h2><p style={S.uploadSub}>PDF analiz edildi, aşağıdaki okullar tespit edildi.</p></div>
            <div style={S.brandList}>
              {detectedBrands.map(brand => (
                <div key={brand} onClick={() => setSelectedBrand(brand)} style={{ ...S.brandCard, borderColor: selectedBrand === brand ? "#2563eb" : "#e2e8f0", background: selectedBrand === brand ? "#eff6ff" : "#fff" }}>
                  <span style={{ fontSize: 24 }}>{brand === "EC" ? "🇬🇧" : brand === "Kaplan" ? "🇺🇸" : "🏫"}</span>
                  <div><div style={{ fontWeight: 700 }}>{brand}</div><div style={{ fontSize: 11, color: "#64748b" }}>{brand === "EC" ? "25+ şehir" : brand === "Kaplan" ? "50+ şehir" : ""}</div></div>
                  {selectedBrand === brand && <span style={{ color: "#2563eb", marginLeft: "auto" }}>✓</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}><label style={S.label}>Şehir Seç</label><select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={S.select}><option value="">Şehir seçin</option>{cities.map(city => <option key={city} value={city}>{city}</option>)}</select></div>
            <button onClick={startParsing} disabled={!selectedBrand || !selectedCity} style={{ ...S.primaryBtn, marginTop: 24, opacity: (!selectedBrand || !selectedCity) ? 0.5 : 1 }}>Parse Et →</button>
          </div>
        </main>
      </div>
    );
  }

  // RENDER - PARSING
  if (step === STEPS.PARSING) {
    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        <header style={S.header}><div style={S.headerInner}><span style={S.headerTitle}>PDF Parse Ediliyor</span><div style={S.userChip}>{user?.name}</div></div></header>
        <main style={S.main}>
          <div style={S.parsingCard}>
            <div style={S.spinner} /><h3>{parsingStatus}</h3>
            <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${parsingProgress}%` }} /></div>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Bu işlem 1-2 dakika sürebilir...</p>
          </div>
        </main>
      </div>
    );
  }

  // RENDER - PREVIEW
  if (step === STEPS.PREVIEW) {
    const totalCourses = editableData.courses?.length || 0;
    const totalAcc = editableData.accommodation?.length || 0;
    const totalFees = editableData.fees?.length || 0;
    const totalTransfers = editableData.transfers?.length || 0;
    const hasErrors = hasAnyValidationError();

    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        <header style={S.header}>
          <div style={S.headerInner}>
            <button onClick={() => setStep(STEPS.SCHOOL_SELECT)} style={S.backBtn}>← Geri</button>
            <span style={S.headerTitle}>{selectedBrand} - {selectedCity}<span style={{ fontSize: 11, marginLeft: 8, color: "#94a3b8" }}>Parse Sonucu</span></span>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => addRow(activeTab)} style={S.addRowBtn}>+ Satır Ekle</button>
              <button onClick={saveToSheet} disabled={hasErrors} style={{ ...S.saveBtn, opacity: hasErrors ? 0.5 : 1, cursor: hasErrors ? "not-allowed" : "pointer" }}>
                {hasErrors ? "⚠️ Hataları Düzeltin" : "✓ Sheets'e Kaydet"}
              </button>
              <div style={S.userChip}>{user?.name}</div>
            </div>
          </div>
        </header>
        <main style={S.previewMain}>
          <div style={S.statsBar}>
            <div style={S.stat}><span style={S.statNum}>{totalCourses}</span><span>Kurs</span></div>
            <div style={S.stat}><span style={S.statNum}>{totalAcc}</span><span>Konaklama</span></div>
            <div style={S.stat}><span style={S.statNum}>{totalFees}</span><span>Ek Ücret</span></div>
            <div style={S.stat}><span style={S.statNum}>{totalTransfers}</span><span>Transfer</span></div>
          </div>
          {hasErrors && (
            <div style={S.errorBanner}>
              ⚠️ Kırmızı işaretli alanlarda hata var. Lütfen düzeltin.
            </div>
          )}
          <div style={S.tabBar}>{TABS.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...S.tabBtn, borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "none", color: activeTab === tab.id ? "#2563eb" : "#64748b" }}>{tab.label}</button>))}</div>
          <div style={S.tableCard}>{renderTabContent()}</div>
          <div style={S.warningBox}>⚠️ Verileri kontrol edin, yanlış olanları düzeltebilirsiniz. Kırmızı alanlar düzeltilmeden kayıt yapılamaz.</div>
        </main>
      </div>
    );
  }

  // RENDER - SAVING
  if (step === STEPS.SAVING) {
    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        <header style={S.header}><div style={S.headerInner}><span style={S.headerTitle}>Kaydediliyor...</span></div></header>
        <main style={S.main}><div style={S.parsingCard}><div style={S.spinner} /><h3>Sheets'e kaydediliyor...</h3><p style={{ fontSize: 12, color: "#94a3b8" }}>Lütfen bekleyin.</p></div></main>
      </div>
    );
  }

  // RENDER - DONE
  if (step === STEPS.DONE) {
    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        <header style={S.header}><div style={S.headerInner}><span style={S.headerTitle}>İşlem Tamamlandı</span><div style={S.userChip}>{user?.name}</div></div></header>
        <main style={S.main}>
          <div style={S.successCard}>
            <div style={S.successIcon}>✅</div>
            <h2 style={S.uploadTitle}>Başarıyla Kaydedildi!</h2>
            <p style={S.uploadSub}>{selectedBrand} - {selectedCity} için veriler güncellendi.</p>
            <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
              <button onClick={() => { setStep(STEPS.UPLOAD); setSelectedFile(null); setSelectedBrand(""); setSelectedCity(""); setParsedData(EMPTY_DATA); setEditableData(EMPTY_DATA); setValidationErrors({}); setValidationWarnings({}); }} style={S.secondaryBtn}>Yeni Parse</button>
              <button onClick={() => navigate("/fiyat-teklifi")} style={S.primaryBtn}>Fiyat Teklifi'ne Git →</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const S = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Sora', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "1200px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  userChip: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "500", color: "#374151", background: "#f1f5f9", padding: "6px 12px", borderRadius: "20px" },
  main: { maxWidth: "800px", margin: "0 auto", padding: "48px 24px", position: "relative", zIndex: 1 },
  previewMain: { maxWidth: "1400px", margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 1 },
  uploadCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "48px 32px", textAlign: "center", animation: "fadeUp 0.4s ease-out" },
  uploadIcon: { width: "80px", height: "80px", background: "#eff6ff", borderRadius: "40px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "40px" },
  uploadTitle: { fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" },
  uploadSub: { fontSize: "14px", color: "#64748b", marginBottom: "24px" },
  dropZone: { position: "relative", border: "2px dashed", borderRadius: "16px", padding: "48px 24px", cursor: "pointer", transition: "all 0.2s", marginBottom: "24px", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" },
  selectCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "32px", maxWidth: "500px", margin: "0 auto" },
  brandList: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" },
  brandCard: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", border: "1.5px solid", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" },
  label: { fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" },
  select: { width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontFamily: "'Sora', sans-serif", background: "#fff" },
  parsingCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "48px", textAlign: "center", maxWidth: "400px", margin: "0 auto" },
  spinner: { width: "48px", height: "48px", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" },
  progressBar: { width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", marginTop: "16px", overflow: "hidden" },
  progressFill: { height: "100%", background: "#2563eb", borderRadius: "3px", transition: "width 0.3s" },
  statsBar: { display: "flex", gap: "12px", marginBottom: "24px" },
  stat: { flex: 1, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "16px", textAlign: "center" },
  statNum: { fontSize: "28px", fontWeight: "700", color: "#0f172a", display: "block" },
  tabBar: { display: "flex", gap: "4px", background: "#fff", border: "1px solid #e2e8f0", borderBottom: "none", borderRadius: "12px 12px 0 0", padding: "0 8px" },
  tabBtn: { padding: "12px 20px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "'Sora', sans-serif" },
  tableCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0 0 12px 12px", padding: "20px", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  cellIndex: { padding: "6px 8px", textAlign: "center", fontWeight: "600", color: "#64748b", width: "40px" },
  cellInput: { width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", fontFamily: "'Sora', sans-serif" },
  cellInputSmall: { width: "70px", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", textAlign: "center" },
  cellSelect: { padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", background: "#fff" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "6px" },
  emptyTable: { textAlign: "center", padding: "48px", color: "#94a3b8" },
  warningBox: { marginTop: "20px", padding: "12px 16px", background: "#fef9ec", border: "1px solid #fde68a", borderRadius: "12px", fontSize: "12px", color: "#92400e" },
  errorBanner: { marginBottom: "16px", padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", fontSize: "13px", color: "#dc2626", fontWeight: "500" },
  successCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "48px 32px", textAlign: "center", maxWidth: "500px", margin: "0 auto" },
  successIcon: { fontSize: "64px", marginBottom: "16px" },
  primaryBtn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  secondaryBtn: { padding: "12px 24px", background: "#fff", color: "#2563eb", border: "1.5px solid #2563eb", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  saveBtn: { padding: "8px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  addRowBtn: { padding: "8px 16px", background: "#fff", color: "#2563eb", border: "1.5px solid #2563eb", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#dc2626", marginBottom: "20px" },
  errorTooltip: { fontSize: "10px", color: "#dc2626", display: "block", marginTop: "2px" },
  warningTooltip: { fontSize: "10px", color: "#f59e0b", display: "block", marginTop: "2px" },
  errorRow: { backgroundColor: "#fef2f2" },
  warningRow: { backgroundColor: "#fffbeb" },
};

// Global style keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
