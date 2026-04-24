import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

// Gemini API yapılandırması
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Master sheet ID (master_index için)
const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";

// Okul listesi (master_index'ten çekilecek)
const SCHOOL_BRANDS = ["EC", "Kaplan", "LAL", "ELS", "ILSC"];

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

export default function KatalogParse() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState("");
  
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
  
  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Session kontrolü ve API key alma
  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate("/");
      return;
    }
    setUser(session);
    fetchApiKey();
  }, []);

  // API key'i sheets'ten çek
  async function fetchApiKey() {
    try {
      const KEYS_SHEET_URL = "https://docs.google.com/spreadsheets/d/1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA/export?format=csv&gid=1926186097";
      const res = await fetch(KEYS_SHEET_URL);
      const text = await res.text();
      const key = text.split("\n")[0].split(",")[0].trim();
      setApiKey(key);
    } catch (err) {
      console.error("API key alınamadı:", err);
    }
  }

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

  // PDF'i sayfalara böl (büyük dosyalar için)
  async function splitPDFPages(base64, totalPages) {
    // Bu fonksiyon sayfa sayfa işlemek için
    // PDF.js ile sayfa sayfa ayırmak gerek
    // Şimdilik tüm PDF'i tek seferde gönderiyoruz
    return base64;
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
      
      const prompt = `Bu PDF dosyası bir dil okulu kataloğudur. Sayfaları incele ve hangi okul markasına ait olduğunu belirle.
      
Olası okullar: EC, Kaplan, LAL, ELS, ILSC, diğer.

Sadece JSON formatında cevap ver:
{
  "detected": ["okul1", "okul2"],  // birden fazla olabilir, güven sırasına göre
  "confidence": 85,  // yüzde olarak güven seviyesi
  "reason": "tespit nedeni"
}

Eğer emin değilsen "detected" içine olası okulları yaz.`;

      const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ]
          }]
        })
      });

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      
      setDetectedBrands(data.detected || []);
      setSelectedBrand(data.detected?.[0] || "");
      setStep(STEPS.SCHOOL_SELECT);
      
    } catch (err) {
      console.error("Analiz hatası:", err);
      setError("Okul analizi sırasında hata oluştu: " + err.message);
      setStep(STEPS.UPLOAD);
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
      
      // Kurslar için prompt
      const coursesPrompt = `Bu PDF'ten kurs bilgilerini çıkar. Aşağıdaki JSON formatında döndür (başka hiçbir şey yazma):

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
3. Kurs adı aynı kalır, sadece weeks_tier_min/max ve price_per_week değişir.
4. Para birimini (GBP/EUR/USD/CAD) doğru tespit et.
5. Sabah garantisi varsa morning_supplement'e ekle.`;

      const coursesResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: coursesPrompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
          }
        })
      });

      const coursesResult = await coursesResponse.json();
      const coursesText = coursesResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const coursesClean = coursesText.replace(/```json|```/g, "").trim();
      let coursesData = { courses: [] };
      try {
        coursesData = JSON.parse(coursesClean);
      } catch (e) {
        console.error("Kurs JSON parse hatası:", e);
      }

      setParsingProgress(40);
      setParsingStatus("Konaklama bilgileri parse ediliyor...");

      // Konaklama için prompt
      const accPrompt = `Bu PDF'ten konaklama bilgilerini çıkar. JSON formatında döndür:

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

      const accResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
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
      const accText = accResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const accClean = accText.replace(/```json|```/g, "").trim();
      let accData = { accommodation: [] };
      try {
        accData = JSON.parse(accClean);
      } catch (e) {
        console.error("Konaklama JSON parse hatası:", e);
      }

      setParsingProgress(60);
      setParsingStatus("Ek ücretler parse ediliyor...");

      // Fees için prompt
      const feesPrompt = `Bu PDF'ten ek ücret bilgilerini çıkar (kayıt ücreti, materyal ücreti, vize ücreti, vb.) JSON formatında:

{
  "fees": [
    {
      "fee_name": "Registration Fee",
      "amount": 50,
      "currency": "GBP",
      "calculation_type": "once",  // once veya per_week
      "addon_type": "compulsory",  // compulsory veya optional_service
      "notes": ""
    }
  ]
}`;

      const feesResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
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
      const feesText = feesResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const feesClean = feesText.replace(/```json|```/g, "").trim();
      let feesData = { fees: [] };
      try {
        feesData = JSON.parse(feesClean);
      } catch (e) {
        console.error("Fees JSON parse hatası:", e);
      }

      setParsingProgress(80);
      setParsingStatus("Transfer bilgileri parse ediliyor...");

      // Transfers için prompt
      const transfersPrompt = `Bu PDF'ten transfer/transfer ücreti bilgilerini çıkar JSON formatında:

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

      const transfersResponse = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
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
      const transfersText = transfersResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const transfersClean = transfersText.replace(/```json|```/g, "").trim();
      let transfersData = { transfers: [] };
      try {
        transfersData = JSON.parse(transfersClean);
      } catch (e) {
        console.error("Transfer JSON parse hatası:", e);
      }

      setParsingProgress(100);
      setParsingStatus("Parse tamamlandı!");

      // Tüm verileri birleştir
      const fullData = {
        courses: coursesData.courses || [],
        accommodation: accData.accommodation || [],
        fees: feesData.fees || [],
        transfers: transfersData.transfers || [],
      };
      
      setParsedData(fullData);
      setEditableData(fullData);
      setStep(STEPS.PREVIEW);
      
    } catch (err) {
      console.error("Parse hatası:", err);
      setError("PDF parse sırasında hata oluştu: " + err.message);
      setStep(STEPS.SCHOOL_SELECT);
    } finally {
      setLoading(false);
    }
  }

  // Veri güncelleme (manuel düzenleme)
  function updateData(section, index, field, value) {
    const newData = { ...editableData };
    newData[section][index][field] = value;
    setEditableData(newData);
  }

  // Yeni satır ekle
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
  }

  // Satır sil
  function deleteRow(section, index) {
    const newData = { ...editableData };
    newData[section].splice(index, 1);
    setEditableData(newData);
  }

  // Sheets'e kaydet
  async function saveToSheet() {
    setStep(STEPS.SAVING);
    setLoading(true);
    
    try {
      // Önce master_index'ten drive_link'i bul veya oluştur
      const sheetName = `${selectedBrand}_${selectedCity}_${new Date().getFullYear()}`;
      
      const payload = {
        action: "createCatalogSheet",
        schoolBrand: selectedBrand,
        city: selectedCity,
        sheetName: sheetName,
        data: editableData,
        user: user?.email,
      };
      
      // Apps Script'e gönder
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwl7PcvG3pt6RFtoixFu7kBkY3UBWWPhDZgZslsF87Wz_U8x3EqVZ7d9TthTmcIoStF/exec";
      
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStep(STEPS.DONE);
      } else {
        throw new Error(result.msg || "Kayıt hatası");
      }
      
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setError("Sheets'e kaydedilirken hata oluştu: " + err.message);
      setStep(STEPS.PREVIEW);
    } finally {
      setLoading(false);
    }
  }

  // Tablo render fonksiyonları
  function renderCoursesTable() {
    const courses = editableData.courses || [];
    if (courses.length === 0) {
      return <div style={S.emptyTable}>Kurs bulunamadı. Manuel ekleyebilirsiniz.</div>;
    }
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th>Kurs Adı</th>
              <th>Tip</th>
              <th>Ders/h</th>
              <th>Saat/h</th>
              <th>Min Hafta</th>
              <th>Max Hafta</th>
              <th>Fiyat/h</th>
              <th>Para Birimi</th>
              <th>Notlar</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, idx) => (
              <tr key={idx}>
                <td><input value={course.course_name || ""} onChange={e => updateData("courses", idx, "course_name", e.target.value)} style={S.cellInput} /></td>
                <td><input value={course.program_type || ""} onChange={e => updateData("courses", idx, "program_type", e.target.value)} style={S.cellInput} /></td>
                <td><input type="number" value={course.lessons_per_week || ""} onChange={e => updateData("courses", idx, "lessons_per_week", e.target.value)} style={S.cellInputSmall} /></td>
                <td><input type="number" value={course.hours_per_week || ""} onChange={e => updateData("courses", idx, "hours_per_week", e.target.value)} style={S.cellInputSmall} /></td>
                <td><input type="number" value={course.weeks_tier_min || ""} onChange={e => updateData("courses", idx, "weeks_tier_min", e.target.value)} style={S.cellInputSmall} /></td>
                <td><input value={course.weeks_tier_max || ""} onChange={e => updateData("courses", idx, "weeks_tier_max", e.target.value)} style={S.cellInputSmall} /></td>
                <td><input type="number" value={course.price_per_week || ""} onChange={e => updateData("courses", idx, "price_per_week", e.target.value)} style={S.cellInputSmall} /></td>
                <td>
                  <select value={course.currency || "GBP"} onChange={e => updateData("courses", idx, "currency", e.target.value)} style={S.cellSelect}>
                    <option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option>
                  </select>
                </td>
                <td><input value={course.notes || ""} onChange={e => updateData("courses", idx, "notes", e.target.value)} style={S.cellInput} /></td>
                <td><button onClick={() => deleteRow("courses", idx)} style={S.deleteBtn}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderAccommodationTable() {
    const items = editableData.accommodation || [];
    if (items.length === 0) {
      return <div style={S.emptyTable}>Konaklama bulunamadı.</div>;
    }
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th>Konaklama Adı</th>
              <th>Tip</th>
              <th>Oda</th>
              <th>Yemek</th>
              <th>Fiyat/h</th>
              <th>HS Fiyat</th>
              <th>Para Birimi</th>
              <th>Mesafe</th>
              <th>Notlar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td><input value={item.place_name || ""} onChange={e => updateData("accommodation", idx, "place_name", e.target.value)} style={S.cellInput} /></td>
                <td><input value={item.accommodation_type || ""} onChange={e => updateData("accommodation", idx, "accommodation_type", e.target.value)} style={S.cellInput} /></td>
                <td><input value={item.room_type || ""} onChange={e => updateData("accommodation", idx, "room_type", e.target.value)} style={S.cellInput} /></td>
                <td><input value={item.board_type || ""} onChange={e => updateData("accommodation", idx, "board_type", e.target.value)} style={S.cellInput} /></td>
                <td><input type="number" value={item.price_per_week || ""} onChange={e => updateData("accommodation", idx, "price_per_week", e.target.value)} style={S.cellInputSmall} /></td>
                <td><input type="number" value={item.high_season_price || ""} onChange={e => updateData("accommodation", idx, "high_season_price", e.target.value)} style={S.cellInputSmall} /></td>
                <td>
                  <select value={item.currency || "GBP"} onChange={e => updateData("accommodation", idx, "currency", e.target.value)} style={S.cellSelect}>
                    <option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option>
                  </select>
                </td>
                <td><input value={item.distance_to_school || ""} onChange={e => updateData("accommodation", idx, "distance_to_school", e.target.value)} style={S.cellInput} /></td>
                <td><input value={item.notes || ""} onChange={e => updateData("accommodation", idx, "notes", e.target.value)} style={S.cellInput} /></td>
                <td><button onClick={() => deleteRow("accommodation", idx)} style={S.deleteBtn}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderFeesTable() {
    const items = editableData.fees || [];
    if (items.length === 0) {
      return <div style={S.emptyTable}>Ek ücret bulunamadı.</div>;
    }
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th>Ücret Adı</th>
              <th>Tutar</th>
              <th>Para Birimi</th>
              <th>Hesaplama</th>
              <th>Tip</th>
              <th>Notlar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td><input value={item.fee_name || ""} onChange={e => updateData("fees", idx, "fee_name", e.target.value)} style={S.cellInput} /></td>
                <td><input type="number" value={item.amount || ""} onChange={e => updateData("fees", idx, "amount", e.target.value)} style={S.cellInputSmall} /></td>
                <td>
                  <select value={item.currency || "GBP"} onChange={e => updateData("fees", idx, "currency", e.target.value)} style={S.cellSelect}>
                    <option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option>
                  </select>
                </td>
                <td>
                  <select value={item.calculation_type || "once"} onChange={e => updateData("fees", idx, "calculation_type", e.target.value)} style={S.cellSelect}>
                    <option value="once">Tek sefer</option><option value="per_week">Haftalık</option>
                  </select>
                </td>
                <td>
                  <select value={item.addon_type || "compulsory"} onChange={e => updateData("fees", idx, "addon_type", e.target.value)} style={S.cellSelect}>
                    <option value="compulsory">Zorunlu</option><option value="optional_service">İsteğe bağlı</option>
                  </select>
                </td>
                <td><input value={item.notes || ""} onChange={e => updateData("fees", idx, "notes", e.target.value)} style={S.cellInput} /></td>
                <td><button onClick={() => deleteRow("fees", idx)} style={S.deleteBtn}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTransfersTable() {
    const items = editableData.transfers || [];
    if (items.length === 0) {
      return <div style={S.emptyTable}>Transfer bilgisi bulunamadı.</div>;
    }
    
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th>Havalimanı</th>
              <th>Kodu</th>
              <th>Tek Yön</th>
              <th>Çift Yön</th>
              <th>Para Birimi</th>
              <th>Notlar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td><input value={item.airport_name || ""} onChange={e => updateData("transfers", idx, "airport_name", e.target.value)} style={S.cellInput} /></td>
                <td><input value={item.airport_code || ""} onChange={e => updateData("transfers", idx, "airport_code", e.target.value)} style={S.cellInputSmall} /></td>
                <td><input type="number" value={item.price_one_way || ""} onChange={e => updateData("transfers", idx, "price_one_way", e.target.value)} style={S.cellInputSmall} /></td>
                <td><input type="number" value={item.price_two_way || ""} onChange={e => updateData("transfers", idx, "price_two_way", e.target.value)} style={S.cellInputSmall} /></td>
                <td>
                  <select value={item.currency || "GBP"} onChange={e => updateData("transfers", idx, "currency", e.target.value)} style={S.cellSelect}>
                    <option value="GBP">GBP</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="CAD">CAD</option>
                  </select>
                </td>
                <td><input value={item.notes || ""} onChange={e => updateData("transfers", idx, "notes", e.target.value)} style={S.cellInput} /></td>
                <td><button onClick={() => deleteRow("transfers", idx)} style={S.deleteBtn}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render sekmeli içerik
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
            <button onClick={() => navigate("/dashboard")} style={S.backBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <span style={S.headerTitle}>Katalog Parse</span>
            <div style={S.userChip}>{user?.name}</div>
          </div>
        </header>

        <main style={S.main}>
          <div style={S.uploadCard}>
            <div style={S.uploadIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" width="48" height="48">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M12 18v-4M9 15l3-3 3 3"/>
              </svg>
            </div>
            <h2 style={S.uploadTitle}>PDF Katalog Yükle</h2>
            <p style={S.uploadSub}>Dil okuluna ait katalog PDF'sini yükleyin, sistem otomatik parse edecek</p>
            
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                ...S.dropZone,
                borderColor: isDragOver ? "#2563eb" : "#e2e8f0",
                background: isDragOver ? "#eff6ff" : "#f8fafc"
              }}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }}
              />
              {selectedFile ? (
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 32 }}>📄</span>
                  <p style={{ fontWeight: 600, marginTop: 8 }}>{selectedFile.name}</p>
                  <p style={{ fontSize: 12, color: "#64748b" }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 48 }}>📁</span>
                  <p style={{ fontWeight: 500, marginTop: 8 }}>PDF sürükle veya tıkla seç</p>
                  <p style={{ fontSize: 12, color: "#94a3b8" }}>Maks. 50MB</p>
                </div>
              )}
            </div>

            {error && <div style={S.errorBox}>{error}</div>}

            <button onClick={analyzeSchool} disabled={!selectedFile || loading} style={{ ...S.primaryBtn, opacity: (!selectedFile || loading) ? 0.5 : 1 }}>
              {loading ? "Analiz ediliyor..." : "📊 PDF'i Analiz Et"}
            </button>
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
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: 48 }}>🎯</span>
              <h2 style={S.uploadTitle}>Okul Tespit Edildi</h2>
              <p style={S.uploadSub}>PDF analiz edildi, aşağıdaki okullar tespit edildi.</p>
            </div>

            <div style={S.brandList}>
              {detectedBrands.map(brand => (
                <div
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  style={{
                    ...S.brandCard,
                    borderColor: selectedBrand === brand ? "#2563eb" : "#e2e8f0",
                    background: selectedBrand === brand ? "#eff6ff" : "#fff"
                  }}
                >
                  <span style={{ fontSize: 24 }}>{brand === "EC" ? "🇬🇧" : brand === "Kaplan" ? "🇺🇸" : "🏫"}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{brand}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {brand === "EC" ? "25+ şehir" : brand === "Kaplan" ? "50+ şehir" : ""}
                    </div>
                  </div>
                  {selectedBrand === brand && <span style={{ color: "#2563eb", marginLeft: "auto" }}>✓</span>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24 }}>
              <label style={S.label}>Şehir Seç</label>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                style={S.select}
              >
                <option value="">Şehir seçin</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <button
              onClick={startParsing}
              disabled={!selectedBrand || !selectedCity}
              style={{ ...S.primaryBtn, marginTop: 24, opacity: (!selectedBrand || !selectedCity) ? 0.5 : 1 }}
            >
              Parse Et →
            </button>
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
        
        <header style={S.header}>
          <div style={S.headerInner}>
            <span style={S.headerTitle}>PDF Parse Ediliyor</span>
            <div style={S.userChip}>{user?.name}</div>
          </div>
        </header>

        <main style={S.main}>
          <div style={S.parsingCard}>
            <div style={S.spinner} />
            <h3>{parsingStatus}</h3>
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${parsingProgress}%` }} />
            </div>
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

    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        
        <header style={S.header}>
          <div style={S.headerInner}>
            <button onClick={() => setStep(STEPS.SCHOOL_SELECT)} style={S.backBtn}>← Geri</button>
            <span style={S.headerTitle}>
              {selectedBrand} - {selectedCity}
              <span style={{ fontSize: 11, marginLeft: 8, color: "#94a3b8" }}>Parse Sonucu</span>
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => addRow(activeTab)} style={S.addRowBtn}>+ Satır Ekle</button>
              <button onClick={saveToSheet} style={S.saveBtn}>✓ Sheets'e Kaydet</button>
              <div style={S.userChip}>{user?.name}</div>
            </div>
          </div>
        </header>

        <main style={S.previewMain}>
          {/* Stats */}
          <div style={S.statsBar}>
            <div style={S.stat}><span style={S.statNum}>{totalCourses}</span><span>Kurs</span></div>
            <div style={S.stat}><span style={S.statNum}>{totalAcc}</span><span>Konaklama</span></div>
            <div style={S.stat}><span style={S.statNum}>{totalFees}</span><span>Ek Ücret</span></div>
            <div style={S.stat}><span style={S.statNum}>{totalTransfers}</span><span>Transfer</span></div>
          </div>

          {/* Tabs */}
          <div style={S.tabBar}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...S.tabBtn,
                  borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "none",
                  color: activeTab === tab.id ? "#2563eb" : "#64748b"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={S.tableCard}>
            {renderTabContent()}
          </div>

          <div style={S.warningBox}>
            ⚠️ Verileri kontrol edin, yanlış olanları düzeltebilirsiniz. Onaylayınca {selectedBrand}_{selectedCity}_2026.xlsx oluşturulacak.
          </div>
        </main>
      </div>
    );
  }

  // RENDER - SAVING
  if (step === STEPS.SAVING) {
    return (
      <div style={S.root}>
        <div style={S.bgGrid} />
        
        <header style={S.header}>
          <div style={S.headerInner}>
            <span style={S.headerTitle}>Kaydediliyor...</span>
          </div>
        </header>

        <main style={S.main}>
          <div style={S.parsingCard}>
            <div style={S.spinner} />
            <h3>Sheets'e kaydediliyor...</h3>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Lütfen bekleyin.</p>
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
        
        <header style={S.header}>
          <div style={S.headerInner}>
            <span style={S.headerTitle}>İşlem Tamamlandı</span>
            <div style={S.userChip}>{user?.name}</div>
          </div>
        </header>

        <main style={S.main}>
          <div style={S.successCard}>
            <div style={S.successIcon}>✅</div>
            <h2 style={S.uploadTitle}>Başarıyla Kaydedildi!</h2>
            <p style={S.uploadSub}>
              {selectedBrand}_{selectedCity}_{new Date().getFullYear()}.xlsx oluşturuldu.
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
              <button onClick={() => {
                setStep(STEPS.UPLOAD);
                setSelectedFile(null);
                setSelectedBrand("");
                setSelectedCity("");
                setParsedData(EMPTY_DATA);
                setEditableData(EMPTY_DATA);
              }} style={S.secondaryBtn}>Yeni Parse</button>
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
  previewMain: { maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 1 },
  
  uploadCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "48px 32px", textAlign: "center", animation: "fadeUp 0.4s ease-out" },
  uploadIcon: { width: "80px", height: "80px", background: "#eff6ff", borderRadius: "40px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
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
  cellInput: { width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", fontFamily: "'Sora', sans-serif" },
  cellInputSmall: { width: "70px", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", textAlign: "center" },
  cellSelect: { padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", background: "#fff" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "6px", "&:hover": { background: "#fef2f2" } },
  emptyTable: { textAlign: "center", padding: "48px", color: "#94a3b8" },
  
  warningBox: { marginTop: "20px", padding: "12px 16px", background: "#fef9ec", border: "1px solid #fde68a", borderRadius: "12px", fontSize: "12px", color: "#92400e" },
  
  successCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "24px", padding: "48px 32px", textAlign: "center", maxWidth: "500px", margin: "0 auto" },
  successIcon: { fontSize: "64px", marginBottom: "16px" },
  
  primaryBtn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  secondaryBtn: { padding: "12px 24px", background: "#fff", color: "#2563eb", border: "1.5px solid #2563eb", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  saveBtn: { padding: "8px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  addRowBtn: { padding: "8px 16px", background: "#fff", color: "#2563eb", border: "1.5px solid #2563eb", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#dc2626", marginBottom: "20px" },
};

// Global style için keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(styleSheet);
