import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

// Gemini API yapılandırması
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_KEY = "AIzaSyC4mloyXRqobdiGhZEINzPEAU8XEaBVTGY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Master sheet ID (master_index için)
const MASTER_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";

// Sekme yapılandırması
const TABS = [
  { id: "courses", label: "📚 Kurslar", sheetName: "courses" },
  { id: "accommodation", label: "🏠 Konaklama", sheetName: "accommodation" },
  { id: "fees", label: "💰 Ek Ücretler", sheetName: "fees" },
  { id: "transfers", label: "🚗 Transfer", sheetName: "transfers" },
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

// Validasyon durumları
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
  
  // Referans veri (sheet'ten okunan sütun yapısı)
  const [referenceColumns, setReferenceColumns] = useState({});
  const [referenceLoading, setReferenceLoading] = useState(false);
  
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
  const [restoreMessage, setRestoreMessage] = useState(null);
  
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

  // Şehir listesini çek (master_index'ten)
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

  // master_index'ten okulun drive_link'ini bul ve sütun yapısını oku
  async function loadReferenceData(brand, city) {
    setReferenceLoading(true);
    setParsingProgress(5);
    setParsingStatus("📁 Mevcut Okul Fiyat Dosyası Okunuyor...");
    
    try {
      // 1. master_index'ten drive_link'i bul
      const masterUrl = `https://docs.google.com/spreadsheets/d/${MASTER_ID}/gviz/tq?tqx=out:csv&sheet=master_index`;
      const masterRes = await fetch(masterUrl);
      const masterCsv = await masterRes.text();
      const masterRows = parseCSV(masterCsv);
      
      // İlgili okul+şehir satırını bul (veya ilgili okulun herhangi bir aktif satırını)
      let targetRow = masterRows.find(row => 
        row.school_brand === brand && 
        row.city === city &&
        row.is_active === "TRUE" && 
        row.parse_status === "approved"
      );
      
      // Şehir bazlı bulunamazsa, okulun herhangi bir aktif şehrini al
      if (!targetRow) {
        targetRow = masterRows.find(row => 
          row.school_brand === brand && 
          row.is_active === "TRUE" && 
          row.parse_status === "approved"
        );
      }
      
      if (!targetRow || !targetRow.drive_link) {
        console.warn("Drive link bulunamadı, varsayılan sütunlar kullanılacak");
        // Varsayılan sütunlar
        setReferenceColumns({
          courses: ["course_name", "program_type", "lessons_per_week", "hours_per_week", "weeks_tier_min", "weeks_tier_max", "price_per_week", "currency", "high_season_supplement", "high_season_start", "high_season_end", "max_weeks", "morning_supplement", "notes"],
          accommodation: ["place_name", "accommodation_type", "room_type", "board_type", "price_per_week", "currency", "distance_to_school", "notes"],
          fees: ["fee_name", "amount", "currency", "calculation_type", "addon_type", "notes"],
          transfers: ["airport_name", "airport_code", "price_one_way", "price_two_way", "currency", "notes"],
        });
        return;
      }
      
      const match = targetRow.drive_link.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      const sheetId = match ? match[1] : null;
      
      if (!sheetId) {
        console.warn("Sheet ID bulunamadı");
        return;
      }
      
      // 2. Her tablo için sütun başlıklarını oku
      setParsingProgress(10);
      setParsingStatus("🔍 Parse Kuralları İnceleniyor...");
      
      const columns = {};
      for (const tab of TABS) {
        try {
          const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${tab.sheetName}`;
          const res = await fetch(sheetUrl);
          const csv = await res.text();
          const firstLine = csv.split("\n")[0];
          const headers = firstLine.split(",").map(h => h.replace(/"/g, "").trim());
          columns[tab.id] = headers.filter(h => h && h.length > 0);
        } catch (err) {
          console.error(`${tab.id} sütunları okunamadı:`, err);
          columns[tab.id] = [];
        }
      }
      
      setReferenceColumns(columns);
      console.log("Referans sütunlar yüklendi:", columns);
      
    } catch (err) {
      console.error("Referans veri yüklenemedi:", err);
    } finally {
      setReferenceLoading(false);
    }
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

  // Dinamik prompt oluştur (referans sütunlara göre)
  function buildPromptForSection(section, columns) {
    const colNames = columns[section] || [];
    if (colNames.length === 0) {
      return `Bu PDF'ten ${section} bilgilerini çıkar. JSON formatında döndür.`;
    }
    
    const colList = colNames.map(col => `"${col}": "değer"`).join(",\n      ");
    
    return `Bu PDF'ten ${section} bilgilerini çıkar. Aşağıdaki JSON formatında döndür (başka hiçbir şey yazma, backtick kullanma):

{
  "${section}": [
    {
      ${colList}
    }
  ]
}

ÖNEMLİ KURALLAR:
1. Sadece PDF'te kesin olan bilgileri doldur. Emin değilsen boş bırak.
2. Fiyatlar sayı, para birimleri (GBP/EUR/USD/CAD/CHF) metin olmalı.
3. Tarihler YYYY-MM-DD formatında olmalı.
4. ${section} için yukarıdaki sütunların tamamını kullan.`;
  }

  // 1. ADIM: Okul tespiti
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

SADECE JSON formatında cevap ver: {"detected":["EC"],"confidence":85}`;

      const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: base64 } }]
          }],
          generationConfig: { temperature: 0.1, topP: 0.9 }
        })
      });

      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      let clean = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      
      setDetectedBrands(data.detected || ["EC", "Kaplan"]);
      setSelectedBrand(data.detected?.[0] || "");
      setStep(STEPS.SCHOOL_SELECT);
      
    } catch (err) {
      console.error("Analiz hatası:", err);
      setError("Okul tespit edilemedi. Lütfen manuel seçin.");
      setDetectedBrands(["EC", "Kaplan"]);
      setStep(STEPS.SCHOOL_SELECT);
    } finally {
      setLoading(false);
    }
  }

  // 2. ADIM: Parse et (aşamalı gösterimli)
  async function startParsing() {
    if (!selectedBrand || !selectedCity) {
      setError("Lütfen okul ve şehir seçin.");
      return;
    }

    setStep(STEPS.PARSING);
    setLoading(true);
    
    try {
      // Aşama 1-2: Mevcut dosyayı oku ve kuralları incele
      setParsingProgress(5);
      setParsingStatus("📁 Mevcut Okul Fiyat Dosyası Okunuyor...");
      
      await loadReferenceData(selectedBrand, selectedCity);
      
      setParsingProgress(10);
      setParsingStatus("🔍 Parse Kuralları İnceleniyor...");
      await new Promise(r => setTimeout(r, 300));
      
      // Aşama 3: PDF hazırlanıyor
      setParsingProgress(15);
      setParsingStatus("📄 PDF Dosyası Hazırlanıyor...");
      
      const base64 = await fileToBase64(selectedFile);
      const fullData = { courses: [], accommodation: [], fees: [], transfers: [] };
      
      // Aşama 4-7: Her tablo için parse
      const tabSteps = [
        { id: "courses", label: "Kurslar", progressStart: 20, progressEnd: 35 },
        { id: "accommodation", label: "Konaklama", progressStart: 35, progressEnd: 50 },
        { id: "fees", label: "Ek Ücretler", progressStart: 50, progressEnd: 65 },
        { id: "transfers", label: "Transfer", progressStart: 65, progressEnd: 80 }
      ];
      
      let stepIndex = 0;
      for (const tab of tabSteps) {
        stepIndex++;
        setParsingProgress(tab.progressStart);
        setParsingStatus(`📚 ${tab.label} Parse Ediliyor (${stepIndex}/4)...`);
        
        const prompt = buildPromptForSection(tab.id, referenceColumns);
        
        const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: base64 } }]
            }],
            generationConfig: { temperature: 0.1, topP: 0.95 }
          })
        });
        
        const result = await response.json();
        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        text = text.replace(/```json|```/g, "").trim();
        
        try {
          const parsed = JSON.parse(text);
          fullData[tab.id] = parsed[tab.id] || [];
        } catch (e) {
          console.error(`${tab.id} parse hatası:`, e);
          fullData[tab.id] = [];
        }
        
        setParsingProgress(tab.progressEnd);
      }
      
      // Aşama 8: Doğrulama
      setParsingProgress(90);
      setParsingStatus("✅ Veriler Doğrulanıyor...");
      
      setParsedData(fullData);
      setEditableData(fullData);
      runAllValidations(fullData);
      
      // Aşama 9: Tamam
      setParsingProgress(100);
      setParsingStatus("🎉 Parse Tamamlandı!");
      
      await new Promise(r => setTimeout(r, 500));
      setStep(STEPS.PREVIEW);
      
    } catch (err) {
      console.error("Parse hatası:", err);
      setError("PDF parse sırasında hata oluştu: " + err.message);
      setStep(STEPS.SCHOOL_SELECT);
    } finally {
      setLoading(false);
    }
  }

  // VALIDASYON FONKSİYONLARI
  function validateCourses(courses) {
    const errors = {};
    const warnings = {};
    const validCurrencies = ["GBP", "EUR", "USD", "CAD", "CHF"];
    
    courses.forEach((course, idx) => {
      const rowErrors = [];
      const rowWarnings = [];
      
      if (!course.course_name || course.course_name.trim() === "") {
        rowErrors.push("Kurs adı boş olamaz");
      }
      
      const price = parseFloat(course.price_per_week);
      if (isNaN(price) || price <= 0) {
        rowErrors.push("Geçerli bir fiyat giriniz");
      }
      
      if (course.currency && !validCurrencies.includes(course.currency)) {
        rowErrors.push(`Geçersiz para birimi: ${course.currency}`);
      }
      
      const tierMin = parseInt(course.weeks_tier_min);
      if (isNaN(tierMin) || tierMin < 1) {
        rowErrors.push("Tier min hafta geçersiz");
      }
      
      if (course.high_season_start && course.high_season_end) {
        const hsStart = new Date(course.high_season_start);
        const hsEnd = new Date(course.high_season_end);
        if (isNaN(hsStart) || isNaN(hsEnd)) {
          rowErrors.push("Yüksek sezon tarihleri geçersiz");
        } else if (hsStart > hsEnd) {
          rowErrors.push("Yüksek sezon başlangıcı bitişten sonra olamaz");
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
      
      if (rowErrors.length > 0) errors[idx] = rowErrors;
      if (rowWarnings.length > 0) warnings[idx] = rowWarnings;
    });
    
    return { errors, warnings };
  }
  
  function validateFees(items) {
    const errors = {};
    const validCurrencies = ["GBP", "EUR", "USD", "CAD", "CHF"];
    
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
      
      if (rowErrors.length > 0) errors[idx] = rowErrors;
    });
    
    return { errors, warnings: {} };
  }
  
  function validateTransfers(items) {
    const errors = {};
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
      
      if (item.currency && !validCurrencies.includes(item.currency)) {
        rowErrors.push(`Geçersiz para birimi: ${item.currency}`);
      }
      
      if (rowErrors.length > 0) errors[idx] = rowErrors;
    });
    
    return { errors, warnings: {} };
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

  // Veri güncelleme
  function updateData(section, index, field, value) {
    const newData = { ...editableData };
    newData[section][index][field] = value;
    setEditableData(newData);
    runAllValidations(newData);
  }

  function addRow(section) {
    const newData = { ...editableData };
    const columns = referenceColumns[section] || [];
    const emptyRow = {};
    columns.forEach(col => { emptyRow[col] = ""; });
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

  function getCellStyle(section, rowIdx, hasError, hasWarning) {
    let style = { ...S.cellInput };
    if (hasError) {
      style = { ...style, borderColor: "#dc2626", backgroundColor: "#fef2f2" };
    } else if (hasWarning) {
      style = { ...style, borderColor: "#f59e0b", backgroundColor: "#fffbeb" };
    }
    return style;
  }

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

  function hasAnyValidationError() {
    return Object.values(validationErrors).some(section => 
      section && Object.keys(section).length > 0
    );
  }

  // Backup oluştur ve kaydet
  async function saveToSheet() {
    if (hasAnyValidationError()) {
      setError("Lütfen tüm kırmızı hataları düzeltin.");
      return;
    }
    
    setStep(STEPS.SAVING);
    setLoading(true);
    setError(null);
    setRestoreMessage(null);
    
    try {
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwl7PcvG3pt6RFtoixFu7kBkY3UBWWPhDZgZslsF87Wz_U8x3EqVZ7d9TthTmcIoStF/exec";
      
      // 1. Backup oluştur
      setParsingStatus("Backup oluşturuluyor...");
      const backupRes = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "backupSheet",
          brand: selectedBrand,
          city: selectedCity,
        })
      });
      const backupResult = await backupRes.json();
      
      if (!backupResult.success) {
        throw new Error("Backup oluşturulamadı: " + backupResult.msg);
      }
      
      // 2. Yeni veriyi yaz
      setParsingStatus("Veriler yazılıyor...");
      const saveRes = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "writeSheetData",
          brand: selectedBrand,
          city: selectedCity,
          data: editableData,
          columns: referenceColumns,
        })
      });
      const saveResult = await saveRes.json();
      
      if (!saveResult.success) {
        await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "restoreBackup",
            brand: selectedBrand,
            city: selectedCity,
          })
        });
        throw new Error(saveResult.msg || "Veri yazılamadı");
      }
      
      // 3. Başarılı, backup'ı sil
      await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "deleteBackup",
          brand: selectedBrand,
          city: selectedCity,
        })
      });
      
      setStep(STEPS.DONE);
      
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setError("Kayıt sırasında hata oluştu: " + err.message);
      setRestoreMessage("Önceki veri geri yüklendi.");
      setStep(STEPS.PREVIEW);
    } finally {
      setLoading(false);
    }
  }

  // Tablo render fonksiyonları
  function renderCoursesTable() {
    const courses = editableData.courses || [];
    const errors = validationErrors.courses || {};
    const warnings = validationWarnings.courses || {};
    const columns = referenceColumns.courses || ["course_name", "program_type", "lessons_per_week", "hours_per_week", "weeks_tier_min", "weeks_tier_max", "price_per_week", "currency", "high_season_supplement", "high_season_start", "high_season_end", "max_weeks", "morning_supplement", "notes"];
    
    if (courses.length === 0) {
      return <div style={S.emptyTable}>Kurs bulunamadı. Manuel ekleyebilirsiniz.</div>;
    }
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              {columns.map(col => <th key={col}>{col}</th>)}
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, idx) => {
              const hasError = errors[idx] && errors[idx].length > 0;
              const hasWarning = warnings[idx] && warnings[idx].length > 0;
              const msg = getValidationMessage("courses", idx);
              
              return (
                <tr key={idx}>
                  <td style={S.cellIndex}>{idx + 1}{msg}</td>
                  {columns.map(col => (
                    <td key={col}>
                      {col === "currency" ? (
                        <select value={course[col] || "GBP"} onChange={e => updateData("courses", idx, col, e.target.value)} style={S.cellSelect}>
                          <option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option><option value="CHF">CHF</option>
                        </select>
                      ) : col.includes("date") || col.includes("start") || col.includes("end") ? (
                        <input type="date" value={course[col] || ""} onChange={e => updateData("courses", idx, col, e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} />
                      ) : col.includes("price") || col.includes("supplement") || col.includes("weeks") ? (
                        <input type="number" value={course[col] || ""} onChange={e => updateData("courses", idx, col, e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} />
                      ) : (
                        <input value={course[col] || ""} onChange={e => updateData("courses", idx, col, e.target.value)} style={getCellStyle("courses", idx, hasError, hasWarning)} />
                      )}
                    </td>
                  ))}
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
    const columns = referenceColumns.accommodation || ["place_name", "accommodation_type", "room_type", "board_type", "price_per_week", "currency", "distance_to_school", "notes"];
    
    if (items.length === 0) return <div style={S.emptyTable}>Konaklama bulunamadı.</div>;
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr><th style={{ width: 40 }}>#</th>{columns.map(col => <th key={col}>{col}</th>)}<th></th></tr></thead>
          <tbody>
            {items.map((item, idx) => {
              const hasError = errors[idx] && errors[idx].length > 0;
              const hasWarning = warnings[idx] && warnings[idx].length > 0;
              const msg = getValidationMessage("accommodation", idx);
              
              return (
                <tr key={idx}>
                  <td style={S.cellIndex}>{idx + 1}{msg}</td>
                  {columns.map(col => (
                    <td key={col}>
                      {col === "currency" ? (
                        <select value={item[col] || "GBP"} onChange={e => updateData("accommodation", idx, col, e.target.value)} style={S.cellSelect}>
                          <option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option><option value="CHF">CHF</option>
                        </select>
                      ) : col.includes("price") ? (
                        <input type="number" value={item[col] || ""} onChange={e => updateData("accommodation", idx, col, e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} />
                      ) : (
                        <input value={item[col] || ""} onChange={e => updateData("accommodation", idx, col, e.target.value)} style={getCellStyle("accommodation", idx, hasError, hasWarning)} />
                      )}
                    </td>
                  ))}
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
  const columns = referenceColumns.fees || ["fee_name", "amount", "currency", "calculation_type", "addon_type", "notes"];
  
  if (items.length === 0) return <div style={S.emptyTable}>Ek ücret bulunamadı.</div>;
  
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            {columns.map(col => <th key={col}>{col}</th>)}
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const hasError = errors[idx] && errors[idx].length > 0;
            const msg = getValidationMessage("fees", idx);
            
            return (
              <tr key={idx}>
                <td style={S.cellIndex}>{idx + 1}{msg}</td>
                {columns.map(col => (
                  <td key={col}>
                    {col === "currency" ? (
                      <select value={item[col] || "GBP"} onChange={e => updateData("fees", idx, col, e.target.value)} style={S.cellSelect}>
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="CAD">CAD</option>
                        <option value="CHF">CHF</option>
                      </select>
                    ) : col === "calculation_type" ? (
                      <select value={item[col] || "once"} onChange={e => updateData("fees", idx, col, e.target.value)} style={S.cellSelect}>
                        <option value="once">Tek sefer</option>
                        <option value="per_week">Haftalık</option>
                      </select>
                    ) : col === "addon_type" ? (
                      <select value={item[col] || "compulsory"} onChange={e => updateData("fees", idx, col, e.target.value)} style={S.cellSelect}>
                        <option value="compulsory">Zorunlu</option>
                        <option value="optional_service">İsteğe bağlı</option>
                        <option value="supplement">Ek ücret</option>
                        <option value="upgrade">Yükseltme</option>
                      </select>
                    ) : col === "amount" ? (
                      <input type="number" value={item[col] || ""} onChange={e => updateData("fees", idx, col, e.target.value)} style={getCellStyle("fees", idx, hasError, false)} />
                    ) : (
                      <input value={item[col] || ""} onChange={e => updateData("fees", idx, col, e.target.value)} style={getCellStyle("fees", idx, hasError, false)} />
                    )}
                  </td>
                ))}
                <td><button onClick={() => deleteRow("fees", idx)} style={S.deleteBtn}>🗑️</button></td>
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
            <p style={S.uploadSub}>Dil okuluna ait katalog PDF'sini yükleyin</p>
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
            <div style={{ textAlign: "center", marginBottom: 24 }}><span style={{ fontSize: 48 }}>🎯</span><h2 style={S.uploadTitle}>Okul Seçin</h2><p style={S.uploadSub}>PDF analiz edildi, okul seçin ve şehri belirleyin.</p></div>
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
            <button onClick={startParsing} disabled={!selectedBrand || !selectedCity} style={{ ...S.primaryBtn, marginTop: 24 }}>Parse Et →</button>
          </div>
        </main>
      </div>
    );
  }

  // RENDER - PARSING (aşamalı gösterim)
  if (step === STEPS.PARSING) {
    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        <header style={S.header}><div style={S.headerInner}><span style={S.headerTitle}>PDF Parse Ediliyor</span><div style={S.userChip}>{user?.name}</div></div></header>
        <main style={S.main}>
          <div style={S.parsingCard}>
            <div style={S.spinner} />
            <h3>{parsingStatus}</h3>
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${parsingProgress}%` }} />
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>{Math.floor(parsingProgress)}% tamamlandı...</p>
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
          {restoreMessage && <div style={S.restoreBanner}>↺ {restoreMessage}</div>}
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
          <div style={S.warningBox}>⚠️ Verileri kontrol edin. Kırmızı alanlar düzeltilmeden kayıt yapılamaz.</div>
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
        <main style={S.main}>
          <div style={S.parsingCard}>
            <div style={S.spinner} />
            <h3>{parsingStatus || "Sheets'e kaydediliyor..."}</h3>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Lütfen bekleyin...</p>
          </div>
        </main>
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
              <button onClick={() => { setStep(STEPS.UPLOAD); setSelectedFile(null); setSelectedBrand(""); setSelectedCity(""); setParsedData(EMPTY_DATA); setEditableData(EMPTY_DATA); setValidationErrors({}); setValidationWarnings({}); setRestoreMessage(null); }} style={S.secondaryBtn}>Yeni Parse</button>
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
  headerInner: { maxWidth: "1400px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
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
  parsingCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "48px", textAlign: "center", maxWidth: "500px", margin: "0 auto" },
  spinner: { width: "48px", height: "48px", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" },
  progressBar: { width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", marginTop: "16px", overflow: "hidden" },
  progressFill: { height: "100%", background: "#2563eb", borderRadius: "4px", transition: "width 0.3s ease" },
  statsBar: { display: "flex", gap: "12px", marginBottom: "24px" },
  stat: { flex: 1, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "16px", textAlign: "center" },
  statNum: { fontSize: "28px", fontWeight: "700", color: "#0f172a", display: "block" },
  tabBar: { display: "flex", gap: "4px", background: "#fff", border: "1px solid #e2e8f0", borderBottom: "none", borderRadius: "12px 12px 0 0", padding: "0 8px" },
  tabBtn: { padding: "12px 20px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "'Sora', sans-serif" },
  tableCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0 0 12px 12px", padding: "20px", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  cellIndex: { padding: "6px 8px", textAlign: "center", fontWeight: "600", color: "#64748b", width: "40px" },
  cellInput: { width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", fontFamily: "'Sora', sans-serif" },
  cellSelect: { padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", background: "#fff" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "6px" },
  emptyTable: { textAlign: "center", padding: "48px", color: "#94a3b8" },
  warningBox: { marginTop: "20px", padding: "12px 16px", background: "#fef9ec", border: "1px solid #fde68a", borderRadius: "12px", fontSize: "12px", color: "#92400e" },
  errorBanner: { marginBottom: "16px", padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", fontSize: "13px", color: "#dc2626", fontWeight: "500" },
  restoreBanner: { marginBottom: "16px", padding: "12px 16px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px", fontSize: "13px", color: "#059669", fontWeight: "500" },
  successCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "48px 32px", textAlign: "center", maxWidth: "500px", margin: "0 auto" },
  successIcon: { fontSize: "64px", marginBottom: "16px" },
  primaryBtn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  secondaryBtn: { padding: "12px 24px", background: "#fff", color: "#2563eb", border: "1.5px solid #2563eb", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  saveBtn: { padding: "8px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  addRowBtn: { padding: "8px 16px", background: "#fff", color: "#2563eb", border: "1.5px solid #2563eb", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#dc2626", marginBottom: "20px" },
  errorTooltip: { fontSize: "10px", color: "#dc2626", display: "block", marginTop: "2px" },
  warningTooltip: { fontSize: "10px", color: "#f59e0b", display: "block", marginTop: "2px" },
};

// Global style keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
