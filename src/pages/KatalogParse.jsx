import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

// ─── SABİTLER ────────────────────────────────────────────────
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_API_KEY = "AIzaSyC4mloyXRqobdiGhZEINzPEAU8XEaBVTGY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSIKVyXM7cuKSopHaqGoOgi9LBDXse15Hl0HYZTbGTqf1hNnsbHI5jjhuGnPWN_5hi/exec";

// NOT: Okul listesi, sheet URL'leri ve parse edilecek sekmeler artık hardcode değil.
// Hepsi Apps Script üzerinden MASTER_INDEX > school_registry sekmesinden dinamik çekiliyor.
// Yeni okul eklemek için sadece school_registry'ye satır eklemek yeterli.

const STEPS = {
  MODE_SELECT:    "mode_select",      // Yeni: Fiyat mı Promosyon mu
  UPLOAD:         "upload",
  SCHOOL_CONFIRM: "school_confirm",
  PARSING:        "parsing",
  DIFF:           "diff",
  SAVING:         "saving",
  REVIEW:         "review",
  DONE:           "done",
  // Promosyon akışı
  PROMO_UPLOAD:   "promo_upload",
  PROMO_CONFIRM:  "promo_confirm",
  PROMO_PARSING:  "promo_parsing",
  PROMO_REVIEW:   "promo_review",
  PROMO_DONE:     "promo_done",
};

const MODES = {
  PRICE: "price",
  PROMO: "promo",
};

// discounts sekmesi sütun yapısı
const DISCOUNT_COLUMNS = [
  // Ortak
  "school", "city", "country",
  "campaign_id", "campaign_name",
  "discount_type",
  "reg_date_start", "reg_date_end",
  "arrival_start", "arrival_end",
  "min_weeks", "max_weeks",
  "min_age", "max_age",
  "channel",
  // Percentage satırları için
  "applies_to", "target_name",
  "discount_value", "value_type",
  "eligible_courses", "excluded_courses",
  "group_size",
  // Fixed package satırları için
  "course_name", "weeks", "package_price", "currency",
  "includes", "excludes",
  // Ortak
  "notes",
];

// ─── ANA COMPONENT ───────────────────────────────────────────
export default function KatalogParse() {
  const navigate = useNavigate();
  const [user, setUser]           = useState(null);
  const [step, setStep]           = useState(STEPS.MODE_SELECT);
  const [mode, setMode]           = useState(null);
  const [error, setError]         = useState(null);

  // Dinamik okul listesi (Apps Script > school_registry'den)
  const [knownBrands, setKnownBrands]       = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [sheetUrls, setSheetUrls]           = useState({}); // brand -> sheet url (parse sırasında doldurulur)

  // Promosyon state'leri
  const [promoInputMode, setPromoInputMode] = useState("pdf"); // "pdf" | "text"
  const [promoFile, setPromoFile]         = useState(null);
  const [promoIsDragOver, setPromoIsDragOver] = useState(false);
  const [promoText, setPromoText]         = useState("");
  const [promoBrand, setPromoBrand]       = useState("");
  const [promoDetected, setPromoDetected] = useState("");
  const [promoLoading, setPromoLoading]   = useState(false);
  const [promoData, setPromoData]         = useState([]);
  const [promoError, setPromoError]       = useState(null);
  const [promoProgress, setPromoProgress] = useState(0);
  const [promoProgressMsg, setPromoProgressMsg] = useState("");

  // PDF
  const [selectedFile, setSelectedFile]   = useState(null);
  const [isDragOver, setIsDragOver]       = useState(false);
  const dropRef = useRef(null);

  // Okul tespiti
  const [detectedBrand, setDetectedBrand] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [detectLoading, setDetectLoading] = useState(false);

  // Parse
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [sheetHeaders, setSheetHeaders] = useState({});
  const [parsedData, setParsedData]   = useState({});

  // Diff
  const [currentData, setCurrentData] = useState({});
  const [diffSummary, setDiffSummary] = useState(null);

  // Yeni sütun uyarısı
  const [unknownCols, setUnknownCols] = useState({});
  const [unknownColDecisions, setUnknownColDecisions] = useState({});

  // Kayıt
  const [backupInfo, setBackupInfo]   = useState(null);
  const [saveError, setSaveError]     = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
    loadSchoolList();
  }, []);

  // Okul listesini Apps Script'ten dinamik çek
  async function loadSchoolList() {
    setSchoolsLoading(true);
    try {
      const res = await callAppsScriptRaw("listSchools", {});
      if (res.success) setKnownBrands(res.schools || []);
      else setError("Okul listesi yüklenemedi: " + res.msg);
    } catch (err) {
      setError("Okul listesi yüklenemedi: " + err.message);
    }
    setSchoolsLoading(false);
  }

  // callAppsScript'in component fonksiyonlarından önce tanımlanmış hali gerekiyor — ham fetch
  async function callAppsScriptRaw(action, body) {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action, ...body }),
    });
    return res.json();
  }

  // ── Dosya seçimi ──────────────────────────────────────────
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") { setSelectedFile(file); setError(null); }
    else setError("Lütfen geçerli bir PDF dosyası seçin.");
  }

  function handleDrop(e) {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") { setSelectedFile(file); setError(null); }
    else setError("Lütfen geçerli bir PDF dosyası seçin.");
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ── Okul tespiti ──────────────────────────────────────────
  // Dosya adını knownBrands listesindeki her okul ismiyle (ve kısaltmalarıyla) karşılaştırır.
  // "EC" gibi kısa markalar için kelime sınırı kontrolü yapar, yanlış pozitifi önler.
  function detectBrandFromFileName(name) {
    const n = name.toLowerCase().replace(/[_\-.]/g, " ");
    for (const brand of knownBrands) {
      const b = brand.toLowerCase();
      if (b.length <= 3) {
        // Kısa marka adları (EC gibi) — kelime sınırıyla ara
        const re = new RegExp(`(^|\\s)${b}(\\s|$)`);
        if (re.test(n)) return brand;
      } else if (n.includes(b)) {
        return brand;
      }
    }
    return null;
  }

  async function detectBrandFromContent(base64) {
    const brandList = knownBrands.join(", ");
    const prompt = `Bu bir dil okulu katalog PDF'idir. İlk sayfayı analiz et, okul markasını belirle.
Seçenekler: ${brandList}
SADECE JSON döndür: {"brand":"EC","confidence":90}`;
    const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: base64 } }] }],
        generationConfig: { temperature: 0.1 }
      })
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    return json.brand;
  }

  async function analyzeFile() {
    if (!selectedFile) return;
    setDetectLoading(true); setError(null);

    // 1. Dosya adından dene
    let brand = detectBrandFromFileName(selectedFile.name);

    // 2. Gemini fallback
    if (!brand) {
      try {
        const base64 = await fileToBase64(selectedFile);
        brand = await detectBrandFromContent(base64);
      } catch {
        brand = null;
      }
    }

    setDetectedBrand(brand || "");
    setSelectedBrand(brand || "");
    setDetectLoading(false);
    setStep(STEPS.SCHOOL_CONFIRM);
  }

  // ── Parse işlemi ──────────────────────────────────────────
  async function callAppsScript(action, body) {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action, ...body }),
    });
    return res.json();
  }

  async function startParsing() {
    if (!selectedBrand) { setError("Lütfen okul seçin."); return; }
    setStep(STEPS.PARSING); setError(null);

    try {
      // Adım 1: Sheet header'larını çek
      setProgress(5); setProgressMsg("📁 Mevcut sheet sütunları okunuyor...");
      const headersResult = await callAppsScript("getSheetHeaders", { brand: selectedBrand });
      if (!headersResult.success) throw new Error("Header okunamadı: " + headersResult.msg);
      const headers = headersResult.headers;
      const dynamicTabs = headersResult.tabs || Object.keys(headers);
      setSheetHeaders(headers);
      if (headersResult.sheetUrl) {
        setSheetUrls(prev => ({ ...prev, [selectedBrand]: headersResult.sheetUrl }));
      }

      // Adım 2: Mevcut veriyi çek (diff + Gemini örnek için)
      setProgress(10); setProgressMsg("🔍 Mevcut veriler alınıyor...");
      const currentResult = await callAppsScript("getCurrentData", { brand: selectedBrand });
      if (currentResult.success) setCurrentData(currentResult.data || {});

      // Adım 3: Parse rules + ekstra referans sekmeleri çek
      setProgress(13); setProgressMsg("📋 Parse kuralları okunuyor...");
      const rulesResult = await callAppsScript("getParseRules", { brand: selectedBrand });
      const parseRules = rulesResult.success ? rulesResult.parseRules : "";
      const extraTabs  = rulesResult.success ? rulesResult.extraTabs  : {};

      // Adım 4: PDF hazırla
      setProgress(15); setProgressMsg("📄 PDF hazırlanıyor...");
      const base64 = await fileToBase64(selectedFile);

      // Adım 5: Sekme sekme parse et (parse_rules + ekstra sekmeler her çağrıda gönderilir)
      const tabs = dynamicTabs;
      const parsed = {};
      const progressPerTab = 65 / tabs.length;

      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const pct = 20 + Math.floor(i * progressPerTab);
        setProgress(pct);
        setProgressMsg(`🤖 "${tab}" parse ediliyor... (${i+1}/${tabs.length})`);
        const sampleData = currentResult.data?.[tab]?.sample || [];
        parsed[tab] = await parseSingleTab(base64, selectedBrand, headers[tab] || [], tab, parseRules, extraTabs, sampleData);
      }

      setProgress(90); setProgressMsg("✅ Veriler doğrulanıyor...");

      // Adım 5: Yeni sütun tespiti
      const unknown = detectUnknownColumns(parsed, headers, tabs);
      setUnknownCols(unknown);
      setParsedData(parsed);

      // Adım 6: Diff hesapla
      const diff = computeDiff(currentResult.data || {}, parsed, tabs);
      setDiffSummary(diff);

      setProgress(100); setProgressMsg("🎉 Parse tamamlandı!");
      await new Promise(r => setTimeout(r, 400));
      setStep(STEPS.DIFF);

    } catch (err) {
      setError("Parse hatası: " + err.message);
      setStep(STEPS.SCHOOL_CONFIRM);
    }
  }

  // Sekme bazlı parse — her sekme için ayrı Gemini çağrısı
  async function parseSingleTab(base64, brand, cols, tabName, parseRules, extraTabs, sampleData) {
    const colList = cols.length > 0
      ? cols.map(c => `"${c}": ""`).join(", ")
      : '"name": "", "value": ""';

    // Mevcut veriden örnek satırlar (Gemini format öğrenmek için)
    const sampleSection = sampleData && sampleData.length > 0
      ? `\nMEVCUT VERİDEN ÖRNEK SATIRLAR (bu formatı takip et):\n${JSON.stringify(sampleData.slice(0, 3), null, 2)}`
      : "";

    // Ekstra referans sekmeleri (junior_activities, junior_transfers vb.)
    const extraSection = extraTabs && Object.keys(extraTabs).length > 0
      ? "\n\nREFERANS BİLGİLERİ (bu sekmelerdeki verilerle tutarlı ol):\n" +
        Object.entries(extraTabs).map(([k, v]) => `[${k}]\n${v}`).join("\n\n")
      : "";

    // Parse kuralları
    const rulesSection = parseRules
      ? `\n\nPARSE KURALLARI (bunlara kesinlikle uy):\n${parseRules}`
      : "";

    const prompt = `Bu bir ${brand} dil okulu katalog PDF'idir.
Sadece "${tabName}" tablosunu çıkar. Başka hiçbir şey yazma, sadece JSON array döndür.

Örnek format:
[
  { ${colList} }
]
${sampleSection}${rulesSection}${extraSection}

GENEL KURALLAR:
1. Sadece PDF'te net olan bilgileri doldur. Emin değilsen boş bırak ("").
2. Fiyatlar sayı (tırnak olmadan), para birimleri GBP/EUR/USD/CAD/CHF metin.
3. Tarihler YYYY-MM-DD formatında.
4. Tüm şehirlerin verilerini dahil et — hiçbirini atlama.
5. Backtick veya markdown kullanma, sadece düz JSON array.`;

    const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: base64 } }] }],
        generationConfig: { temperature: 0.1, topP: 0.95, maxOutputTokens: 32768 }
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(`Gemini hatası (${tabName}): ${data.error.message}`);

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const finishReason = data.candidates?.[0]?.finishReason;
    if (!text) throw new Error(`Gemini boş yanıt döndürdü (${tabName}). finishReason: ${finishReason}`);

    text = text.replace(/```json|```/g, "").trim();

    // Array mı, obje mi?
    if (text.startsWith("{")) {
      try {
        const obj = JSON.parse(text);
        // { "courses": [...] } formatı
        const key = Object.keys(obj).find(k => k.toLowerCase() === tabName.toLowerCase()) || Object.keys(obj)[0];
        return Array.isArray(obj[key]) ? obj[key] : [];
      } catch { return []; }
    }

    try {
      const arr = JSON.parse(text);
      return Array.isArray(arr) ? arr : [];
    } catch (jsonErr) {
      throw new Error(`JSON parse hatası (${tabName}): ${jsonErr.message}\nGemini çıktısı: ${text.slice(0, 300)}`);
    }
  }

    // Yeni sütun tespiti
  function detectUnknownColumns(parsed, headers, tabs) {
    const unknown = {};
    tabs.forEach(tab => {
      const knownCols = new Set(headers[tab] || []);
      const rows = parsed[tab] || [];
      const extraCols = new Set();
      rows.forEach(row => {
        Object.keys(row).forEach(key => {
          if (!knownCols.has(key) && key.trim()) extraCols.add(key);
        });
      });
      if (extraCols.size > 0) {
        unknown[tab] = [...extraCols].map(col => ({
          col,
          count: rows.filter(r => r[col] && String(r[col]).trim()).length,
        }));
      }
    });
    return unknown;
  }

  // Diff hesaplama
  function computeDiff(current, parsed, tabs) {
    const diff = {};
    tabs.forEach(tab => {
      // getCurrentData artık { totalRows, sample } döndürüyor
      const before = current[tab]?.totalRows ?? (Array.isArray(current[tab]) ? current[tab].length : 0);
      const after  = (parsed[tab] || []).length;
      diff[tab] = { before, after, delta: after - before };
    });
    return diff;
  }

  // ── Kaydetme ──────────────────────────────────────────────
  async function saveDraft() {
    setStep(STEPS.SAVING); setSaveError(null);

    try {
      // Backup
      setProgressMsg("📦 Backup oluşturuluyor...");
      const bkp = await callAppsScript("backupSheet", { brand: selectedBrand });
      if (!bkp.success) throw new Error("Backup hatası: " + bkp.msg);
      setBackupInfo(bkp);

      // Bilinmeyen sütunları kararına göre işle
      const finalData = applyUnknownColDecisions(parsedData, unknownColDecisions, sheetHeaders);
      const finalColumns = buildFinalColumns(sheetHeaders, unknownColDecisions);

      // Draft yaz
      setProgressMsg("✏️ Taslak sekmeler yazılıyor...");
      const write = await callAppsScript("writeDraftData", {
        brand: selectedBrand,
        data: finalData,
        columns: finalColumns,
      });
      if (!write.success) throw new Error("Yazma hatası: " + write.msg);

      setStep(STEPS.REVIEW);
    } catch (err) {
      setSaveError(err.message);
      setStep(STEPS.DIFF);
    }
  }

  function applyUnknownColDecisions(data, decisions, headers) {
    const result = {};
    Object.keys(data).forEach(tab => {
      const rows = data[tab] || [];
      const tabDecisions = decisions[tab] || {};
      result[tab] = rows.map(row => {
        const newRow = {};
        // Bilinen sütunlar
        (headers[tab] || []).forEach(col => { newRow[col] = row[col] ?? ""; });
        // Bilinmeyen — "ekle" kararı verilenleri dahil et
        Object.keys(tabDecisions).forEach(col => {
          if (tabDecisions[col] === "add") newRow[col] = row[col] ?? "";
          // "ignore" ise zaten dahil edilmez
        });
        return newRow;
      });
    });
    return result;
  }

  function buildFinalColumns(headers, decisions) {
    const result = {};
    Object.keys(headers).forEach(tab => {
      const base = [...(headers[tab] || [])];
      const tabDec = decisions[tab] || {};
      Object.keys(tabDec).forEach(col => {
        if (tabDec[col] === "add" && !base.includes(col)) base.push(col);
      });
      result[tab] = base;
    });
    return result;
  }

  // ── Onayla / Reddet ───────────────────────────────────────
  async function publishDraft() {
    setStep(STEPS.SAVING);
    setProgressMsg("🚀 Taslak canlıya alınıyor...");
    try {
      const res = await callAppsScript("publishDraft", { brand: selectedBrand });
      if (!res.success) throw new Error(res.msg);
      setStep(STEPS.DONE);
    } catch (err) {
      setSaveError(err.message);
      setStep(STEPS.REVIEW);
    }
  }

  async function discardDraft() {
    await callAppsScript("discardDraft", { brand: selectedBrand });
    resetAll();
  }

  function resetAll() {
    setStep(STEPS.MODE_SELECT);
    setMode(null);
    setSelectedFile(null);
    setSelectedBrand("");
    setDetectedBrand("");
    setParsedData({});
    setCurrentData({});
    setDiffSummary(null);
    setUnknownCols({});
    setUnknownColDecisions({});
    setBackupInfo(null);
    setSaveError(null);
    setError(null);
    setProgress(0);
    setProgressMsg("");
    setPromoInputMode("pdf");
    setPromoFile(null);
    setPromoText("");
    setPromoBrand("");
    setPromoDetected("");
    setPromoData([]);
    setPromoError(null);
    setPromoProgress(0);
    setPromoProgressMsg("");
  }

  // ── Promosyon parse fonksiyonları ──────────────────────────
  function handlePromoFileSelect(e) {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") { setPromoFile(file); setPromoError(null); }
    else setPromoError("Lütfen geçerli bir PDF dosyası seçin.");
  }

  function handlePromoDrop(e) {
    e.preventDefault(); setPromoIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") { setPromoFile(file); setPromoError(null); }
    else setPromoError("Lütfen geçerli bir PDF dosyası seçin.");
  }

  async function analyzePromoFile() {
    setPromoLoading(true); setPromoError(null);
    let brand = null;

    if (promoInputMode === "pdf") {
      if (!promoFile) { setPromoLoading(false); return; }
      brand = detectBrandFromFileName(promoFile.name);
      if (!brand) {
        try {
          const base64 = await fileToBase64(promoFile);
          brand = await detectBrandFromContent(base64);
        } catch { brand = null; }
      }
    } else {
      // Metin modu — dosya adı yok, direkt metin içeriğinden Gemini ile tespit et
      if (!promoText.trim()) { setPromoLoading(false); return; }
      try {
        brand = await detectBrandFromText(promoText);
      } catch { brand = null; }
    }

    setPromoDetected(brand || "");
    setPromoBrand(brand || "");
    setPromoLoading(false);
    setStep(STEPS.PROMO_CONFIRM);
  }

  // Metinden okul tespiti (PDF'siz)
  async function detectBrandFromText(text) {
    const brandList = knownBrands.join(", ");
    const prompt = `Aşağıdaki metin bir dil okulunun promosyon/indirim açıklamasıdır. Hangi okula ait olduğunu belirle.
Seçenekler: ${brandList}
Eğer metinde okul adı geçmiyorsa veya emin değilsen "unknown" döndür.
SADECE JSON döndür: {"brand":"EC","confidence":90}

METİN:
${text}`;
    const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });
    const data = await res.json();
    const out = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const json = JSON.parse(out.replace(/```json|```/g, "").trim());
    return json.brand === "unknown" ? null : json.brand;
  }

async function startPromoParsing() {
    if (!promoBrand) { setPromoError("Lütfen okul seçin."); return; }
    setStep(STEPS.PROMO_PARSING); setPromoError(null);

    try {
      setPromoProgress(5); setPromoProgressMsg("📁 Sheet bilgisi alınıyor...");
      const headersResult = await callAppsScriptRaw("getSheetHeaders", { brand: promoBrand });
      if (headersResult.success && headersResult.sheetUrl) {
        setSheetUrls(prev => ({ ...prev, [promoBrand]: headersResult.sheetUrl }));
      }

      setPromoProgress(10); setPromoProgressMsg("💳 Referans ücret listesi alınıyor...");
      const currentDataRes = await callAppsScriptRaw("getCurrentData", { brand: promoBrand });
      let feeNamesStr = "Course Materials, Enrolment Fee, Accommodation Placement Fee";
      if (currentDataRes.success && currentDataRes.data && currentDataRes.data.fees) {
        const feesData = Array.isArray(currentDataRes.data.fees) 
          ? currentDataRes.data.fees 
          : (currentDataRes.data.fees.sample || []);
        
        const uniqueFees = [...new Set(feesData.map(f => f.fee_name).filter(Boolean))];
        if (uniqueFees.length > 0) {
          feeNamesStr = uniqueFees.join(", ");
        }
      }

      setPromoProgress(15); setPromoProgressMsg(promoInputMode === "pdf" ? "📄 PDF hazırlanıyor..." : "📝 Metin hazırlanıyor...");

      const colList = DISCOUNT_COLUMNS.map(c => `"${c}": ""`).join(", ");
      const prompt = `Bu bir ${promoBrand} dil okulu promosyon/indirim dökümanıdır.
Tüm kampanya ve indirim bilgilerini çıkar. Sadece JSON array döndür, başka hiçbir şey yazma.

Format:
[
  { ${colList} }
]

SÜTUN AÇIKLAMALARI:

[discount_type]
- "percentage" → yüzde veya sabit tutar indirimi (tuition, accommodation, fee)
- "fixed_package" → şehir+kurs+hafta kombinasyonu için paket fiyatı

[Ortak sütunlar - her satırda doldur]
- school: ${promoBrand}
- city: ilgili şehir ("all" = tüm şehirler, "UK" gibi bölge yazılabilir)
- country: ilgili ülke ("all" = tüm ülkeler)
- campaign_id: belgede varsa kodu kullan, yoksa kısa bir kod üret (örn: PROMO_UK_25)
- campaign_name: kampanyanın açıklayıcı adı
- reg_date_start / reg_date_end: kayıt/rezervasyon tarihi aralığı YYYY-MM-DD
- arrival_start / arrival_end: geliş/kurs başlangıç tarihi aralığı YYYY-MM-DD
- min_weeks / max_weeks: kaç haftalık rezervasyon için geçerli (boş = kısıt yok)
- min_age / max_age: yaş kısıtı varsa (boş = kısıt yok)
- channel: "all", "agent", "direct", "online" (belirtilmemişse "all")
- notes: özel koşullar, istisnalar, ek açıklamalar

[Sadece percentage satırları için]
- applies_to: "tuition" / "accommodation" / "fee"
- target_name: applies_to="fee" ise hangi fee (örn: "Materials Fee", "Placement Fee"). Diğerlerinde boş.
- discount_value: indirim miktarı (sayı). Yüzde için 25, sabit tutar için 80 gibi.
- value_type: "percentage" / "fixed" / "free" (tamamen bedava ise)
- eligible_courses: hangi kurslar için geçerli (boş = hepsi)
- excluded_courses: hariç tutulan kurslar
- group_size: grup indirimi ise minimum kişi sayısı (boş = kısıt yok)

[Sadece fixed_package satırları için]
- course_name: paket kurs adı
- weeks: kaç haftalık paket
- package_price: toplam paket fiyatı (sayı)
- currency: GBP / EUR / USD / CAD
- includes: pakete dahil olanlar (konaklama, aktivite vb.)
- excludes: pakete dahil olmayanlar

İşte birleştirilmiş, temiz ve APPSCRIPT için uygun prompt:

---

**PROMPT:**

ÖNEMLİ VE ÖZEL VERİ KURALLARI:

1. İsim Normalizasyonu: Ücret indirimlerinde (applies_to="fee") PDF'teki ismi olduğu gibi YAZMA. Şu referans listesinden en uygun olanını seç: [${feeNamesStr}].

2. Tarih Mantığı: Başlangıç tarihi (reg_date_start/arrival_start) PDF'te yoksa BOŞ ("") BIRAK. Teklif portalı bunu 'Süresiz' olarak işler.

3. Kapsam Kuralı: "all courses" gibi genel ifadeler varsa 'eligible_courses' alanını KESİNLİKLE BOŞ ("") BIRAK. Sadece hariç tutulanlar varsa 'excluded_courses' sütununa yaz.

4. Paket Fiyat Tabloları (Matrix Düzleştirme): Eğer PDF'te satırlarda haftalar, sütunlarda kurs tipleri olan bir matris tablo varsa, BU TABLOYU DÜZLEŞTİR. Her hücre için AYRI bir "fixed_package" satırı oluştur.

5. Rakam Temizliği: package_price/discount_value alanlarından para birimi sembollerini ($/£/€) ve binlik ayırıcıları temizle, sadece ondalıklı sayı olarak yaz (örn: 5028.20).

6. Satır Ayırma Mantığı: Her ayrı indirim/muafiyet için AYRI satır aç.
   - Örn: UK %25 tuition + UK placement fee bedava → 2 ayrı satır
   - Örn: UK %25 + USA %30 → 2 ayrı satır (city/country farklı)

7. "Bedava/Bedelsiz" Kuralı: "Bedava aktiviteler" gibi ifadeler → applies_to="fee", target_name="Activities", value_type="free"

8. "Alınmaz/Muaf" Kuralı: "X fee alınmaz" → applies_to="fee", target_name="[fee adı]", value_type="free", discount_value=100

9. Tarih Eksikliği: Tarih belirtilmemişse ilgili alanı boş bırak.

10. Backtick veya markdown kullanma, sadece düz JSON array.`;

      let contentParts;
      if (promoInputMode === "pdf") {
        const base64 = await fileToBase64(promoFile);
        contentParts = [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: base64 } }];
      } else {
        contentParts = [{ text: prompt + "\n\nDÖKÜMAN METNİ:\n" + promoText }];
      }

      setPromoProgress(30); setPromoProgressMsg("🤖 Promosyon bilgileri parse ediliyor...");

      const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          // Token limitini burada artırıyoruz:
          generationConfig: { temperature: 0.1, maxOutputTokens: 32768 }
        })
      });

      const data = await res.json();
      if (data.error) throw new Error("Gemini hatası: " + data.error.message);

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.replace(/```json|```/g, "").trim();

      let parsed = [];
      try {
        parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) parsed = [];
      } catch { parsed = []; }

      setPromoData(parsed);
      setPromoProgress(100); setPromoProgressMsg("✅ Tamamlandı!");
      await new Promise(r => setTimeout(r, 400));
      setStep(STEPS.PROMO_REVIEW);

    } catch (err) {
      setPromoError("Parse hatası: " + err.message);
      setStep(STEPS.PROMO_CONFIRM);
    }
  }

  async function savePromoData() {
    setStep(STEPS.SAVING);
    try {
      const res = await callAppsScript("writeDraftData", {
        brand: promoBrand,
        data: { discounts: promoData },
        columns: { discounts: DISCOUNT_COLUMNS },
      });
      if (!res.success) throw new Error(res.msg);
      setStep(STEPS.PROMO_DONE);
    } catch (err) {
      setPromoError(err.message);
      setStep(STEPS.PROMO_REVIEW);
    }
  }

  // ─── RENDER ───────────────────────────────────────────────
  if (!user) return null;

  // MODE SELECT — Ana seçim ekranı
  if (step === STEPS.MODE_SELECT) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Katalog Parse" user={user} onBack={() => navigate("/dashboard")}/>
      <main style={S.main}>
        <div style={{textAlign:"center", marginBottom:32, animation:"fadeUp 0.4s ease-out"}}>
          <div style={{fontSize:48, marginBottom:12}}>📚</div>
          <h2 style={S.cardTitle}>Ne yapmak istiyorsunuz?</h2>
          <p style={S.cardSub}>Parse etmek istediğiniz döküman türünü seçin</p>
        </div>
        {schoolsLoading && (
          <div style={{textAlign:"center", marginBottom:16, fontSize:13, color:"#94a3b8"}}>
            📁 Okul listesi yükleniyor...
          </div>
        )}
        {!schoolsLoading && knownBrands.length === 0 && (
          <div style={S.errorBox}>
            Okul listesi alınamadı. MASTER_INDEX'teki "school_registry" sekmesini kontrol edin veya sayfayı yenileyin.
          </div>
        )}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, opacity: schoolsLoading?0.5:1, pointerEvents: schoolsLoading?"none":"auto"}}>
          <button onClick={() => { setMode(MODES.PRICE); setStep(STEPS.UPLOAD); }}
            style={S.modeCard}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="#2563eb66"; e.currentTarget.style.boxShadow="0 20px 40px -12px #2563eb22"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.06)"; }}>
            <div style={{fontSize:48, marginBottom:16}}>💰</div>
            <h3 style={{fontSize:18, fontWeight:700, color:"#0f172a", marginBottom:8}}>Okul Fiyatlarını Yükle</h3>
            <p style={{fontSize:13, color:"#94a3b8", lineHeight:1.6}}>Okul katalog PDF'ini parse ederek kurs, konaklama, ücret ve transfer fiyatlarını güncelle</p>
          </button>
          <button onClick={() => { setMode(MODES.PROMO); setStep(STEPS.PROMO_UPLOAD); }}
            style={S.modeCard}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="#ea580c66"; e.currentTarget.style.boxShadow="0 20px 40px -12px #ea580c22"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.06)"; }}>
            <div style={{fontSize:48, marginBottom:16}}>🎁</div>
            <h3 style={{fontSize:18, fontWeight:700, color:"#0f172a", marginBottom:8}}>Promosyon Dökümanını Yükle</h3>
            <p style={{fontSize:13, color:"#94a3b8", lineHeight:1.6}}>Kampanya ve indirim dökümanını parse ederek discounts sekmesine kampanya kodları ve geçerlilik sürelerini ekle</p>
          </button>
        </div>
      </main>
      <Style/>
    </div>
  );

  // UPLOAD
  if (step === STEPS.UPLOAD) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Katalog Parse" user={user} onBack={() => setStep(STEPS.MODE_SELECT)}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={S.bigIcon}>📄</div>
          <h2 style={S.cardTitle}>PDF Katalog Yükle</h2>
          <p style={S.cardSub}>Dil okuluna ait katalog PDF'sini yükleyin</p>
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{ ...S.dropZone, borderColor: isDragOver ? "#2563eb" : "#e2e8f0", background: isDragOver ? "#eff6ff" : "#f8fafc" }}
          >
            <input type="file" accept="application/pdf" onChange={handleFileSelect}
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0, cursor:"pointer", zIndex:10 }}/>
            {selectedFile ? (
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:36}}>📄</div>
                <p style={{fontWeight:700,marginTop:8}}>{selectedFile.name}</p>
                <p style={{fontSize:12,color:"#64748b"}}>{(selectedFile.size/1024/1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:48}}>📁</div>
                <p style={{fontWeight:500,marginTop:8}}>PDF sürükle veya tıkla seç</p>
                <p style={{fontSize:12,color:"#94a3b8"}}>Maks. 100MB</p>
              </div>
            )}
          </div>
          {error && <div style={S.errorBox}>{error}</div>}
          <button onClick={analyzeFile} disabled={!selectedFile || detectLoading}
            style={{...S.primaryBtn, opacity:(!selectedFile||detectLoading)?0.5:1}}>
            {detectLoading ? "Analiz ediliyor..." : "📊 PDF'i Analiz Et"}
          </button>
        </div>
      </main>
      <Style/>
    </div>
  );

  // SCHOOL CONFIRM
  if (step === STEPS.SCHOOL_CONFIRM) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Okul Onayı" user={user} onBack={() => setStep(STEPS.UPLOAD)}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={S.bigIcon}>🎯</div>
          <h2 style={S.cardTitle}>Okul Onaylayın</h2>
          {detectedBrand
            ? <p style={S.cardSub}>PDF analizi tamamlandı. Tespit edilen okul: <strong>{detectedBrand}</strong></p>
            : <p style={S.cardSub}>Okul tespit edilemedi. Lütfen manuel seçin.</p>
          }

          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
            {knownBrands.map(brand => (
              <div key={brand} onClick={() => setSelectedBrand(brand)}
                style={{...S.brandCard, borderColor: selectedBrand===brand?"#2563eb":"#e2e8f0", background: selectedBrand===brand?"#eff6ff":"#fff"}}>
                <span style={{fontSize:22}}>{brand==="EC"?"🇬🇧":brand==="Kaplan"?"🇺🇸":"🏫"}</span>
                <div>
                  <div style={{fontWeight:700}}>{brand}</div>
                  {detectedBrand===brand && <div style={{fontSize:11,color:"#2563eb"}}>✓ Tespit edildi</div>}
                </div>
                {selectedBrand===brand && <span style={{color:"#2563eb",marginLeft:"auto",fontWeight:700}}>✓</span>}
              </div>
            ))}
          </div>

          {error && <div style={S.errorBox}>{error}</div>}
          <button onClick={startParsing} disabled={!selectedBrand}
            style={{...S.primaryBtn, opacity:!selectedBrand?0.5:1}}>
            {selectedBrand ? `${selectedBrand} olarak Parse Et →` : "Okul seçin"}
          </button>
        </div>
      </main>
      <Style/>
    </div>
  );

  // PARSING
  if (step === STEPS.PARSING) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Parse Ediliyor" user={user}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={S.spinner}/>
          <h3 style={{fontSize:16,fontWeight:600,color:"#0f172a",marginBottom:8}}>{progressMsg}</h3>
          <div style={S.progressBar}><div style={{...S.progressFill,width:`${progress}%`}}/></div>
          <p style={{fontSize:12,color:"#94a3b8",marginTop:8}}>{Math.floor(progress)}% tamamlandı</p>
        </div>
      </main>
      <Style/>
    </div>
  );

  // DIFF
  if (step === STEPS.DIFF) {
    const tabs = Object.keys(diffSummary || sheetHeaders || {});
    const hasUnknown = Object.keys(unknownCols).length > 0;
    const allDecided = !hasUnknown || Object.keys(unknownCols).every(tab =>
      unknownCols[tab].every(({col}) => unknownColDecisions[tab]?.[col])
    );

    return (
      <div style={S.root}>
        <div style={S.bgGrid}/>
        <Header title={`${selectedBrand} — Parse Sonucu`} user={user} onBack={() => setStep(STEPS.SCHOOL_CONFIRM)}/>
        <main style={{...S.main, maxWidth:700}}>

          {/* Diff özeti */}
          <div style={S.sectionCard}>
            <h3 style={S.sectionTitle}>📊 Veri Karşılaştırması</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
              {tabs.map(tab => {
                const d = diffSummary?.[tab];
                if (!d) return null;
                const delta = d.delta;
                return (
                  <div key={tab} style={S.diffCard}>
                    <div style={{fontSize:12,color:"#64748b",textTransform:"capitalize"}}>{tab}</div>
                    <div style={{fontSize:22,fontWeight:700,color:"#0f172a"}}>{d.after}</div>
                    <div style={{fontSize:11, color: delta>0?"#059669":delta<0?"#dc2626":"#94a3b8"}}>
                      {delta>0?`+${delta}`:delta===0?"değişmedi":delta} satır
                    </div>
                    <div style={{fontSize:10,color:"#cbd5e1"}}>Önce: {d.before}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bilinmeyen sütun uyarısı */}
          {hasUnknown && (
            <div style={S.sectionCard}>
              <h3 style={S.sectionTitle}>⚠️ Tanımlanmayan Sütunlar</h3>
              <p style={{fontSize:13,color:"#64748b",marginBottom:16}}>
                Gemini aşağıdaki sütunları çıkardı ancak bunlar sheet'te yok. Ne yapılsın?
              </p>
              {Object.keys(unknownCols).map(tab => (
                <div key={tab} style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#475569",textTransform:"capitalize",marginBottom:8}}>{tab}</div>
                  {unknownCols[tab].map(({col, count}) => (
                    <div key={col} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:"#f8fafc",borderRadius:8,marginBottom:6}}>
                      <span style={{flex:1,fontSize:13,fontWeight:600,color:"#0f172a"}}>{col}</span>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{count} satırda dolu</span>
                      <button
                        onClick={() => setUnknownColDecisions(p=>({...p,[tab]:{...p[tab],[col]:"add"}}))}
                        style={{...S.miniBtn, background: unknownColDecisions[tab]?.[col]==="add"?"#059669":"#f1f5f9", color: unknownColDecisions[tab]?.[col]==="add"?"#fff":"#475569"}}>
                        Sheet'e Ekle
                      </button>
                      <button
                        onClick={() => setUnknownColDecisions(p=>({...p,[tab]:{...p[tab],[col]:"ignore"}}))}
                        style={{...S.miniBtn, background: unknownColDecisions[tab]?.[col]==="ignore"?"#dc2626":"#f1f5f9", color: unknownColDecisions[tab]?.[col]==="ignore"?"#fff":"#475569"}}>
                        Yoksay
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {saveError && <div style={S.errorBox}>{saveError}</div>}

          <div style={{display:"flex",gap:12,marginTop:8}}>
            <button onClick={resetAll} style={S.secondaryBtn}>← Yeni Parse</button>
            <button onClick={saveDraft} disabled={!allDecided}
              style={{...S.primaryBtn, flex:1, opacity:!allDecided?0.5:1}}>
              {allDecided ? "📤 Taslak Olarak Kaydet" : "⚠️ Sütun kararlarını verin"}
            </button>
          </div>
        </main>
        <Style/>
      </div>
    );
  }

  // SAVING
  if (step === STEPS.SAVING) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Kaydediliyor..." user={user}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={S.spinner}/>
          <h3 style={{fontSize:16,fontWeight:600,color:"#0f172a"}}>{progressMsg || "İşlem yapılıyor..."}</h3>
        </div>
      </main>
      <Style/>
    </div>
  );

  // REVIEW (Drive'da kontrol)
  if (step === STEPS.REVIEW) {
    const sheetUrl = sheetUrls[selectedBrand];
    return (
      <div style={S.root}>
        <div style={S.bgGrid}/>
        <Header title="Drive'da Kontrol" user={user}/>
        <main style={{...S.main, maxWidth:700}}>

          <div style={S.sectionCard}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <h2 style={S.cardTitle}>Taslak Kaydedildi</h2>
            <p style={{fontSize:14,color:"#64748b",lineHeight:1.7,marginBottom:24}}>
              Parse verileri <strong>{selectedBrand}</strong> sheet'inde <strong>sarı renkli taslak sekmelere</strong> yazıldı.
              Orijinal veriler dokunulmadan korunuyor.
            </p>

            {backupInfo && (
              <div style={{padding:"10px 14px",background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:10,fontSize:12,color:"#065f46",marginBottom:20}}>
                ✅ Backup alındı: <strong>{backupInfo.backupFileName}</strong>
              </div>
            )}

            <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
              <a href={sheetUrl} target="_blank" rel="noreferrer" style={S.linkBtn}>
                📊 Sheet'i Aç (Taslak Sekmeler)
              </a>
              {selectedFile && (
                <button onClick={() => {
                  const url = URL.createObjectURL(selectedFile);
                  window.open(url, "_blank");
                }} style={S.linkBtn}>
                  📄 Orijinal PDF'i Görüntüle
                </button>
              )}
            </div>

            <div style={{padding:"12px 16px",background:"#fef9ec",border:"1px solid #fde68a",borderRadius:10,fontSize:13,color:"#92400e",marginBottom:24,lineHeight:1.6}}>
              ⚠️ Sheet'te <strong>sarı sekmeler</strong> taslak veridir. PDF ile karşılaştırarak kontrol edin.
              Onaylarsanız canlıya alın, yanlışsa reddedin.
            </div>

            {saveError && <div style={S.errorBox}>{saveError}</div>}

            <div style={{display:"flex",gap:12}}>
              <button onClick={discardDraft} style={{...S.secondaryBtn, borderColor:"#fecaca", color:"#dc2626"}}>
                ✕ Reddet & Sil
              </button>
              <button onClick={publishDraft} style={{...S.primaryBtn, flex:1, background:"#059669"}}>
                ✓ Onayla & Canlıya Al
              </button>
            </div>
          </div>
        </main>
        <Style/>
      </div>
    );
  }

  // DONE
  if (step === STEPS.DONE) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="İşlem Tamamlandı" user={user}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={{fontSize:64,marginBottom:16}}>✅</div>
          <h2 style={S.cardTitle}>Başarıyla Yayınlandı!</h2>
          <p style={S.cardSub}><strong>{selectedBrand}</strong> fiyat verileri güncellendi.</p>
          {backupInfo && (
            <p style={{fontSize:12,color:"#94a3b8",marginTop:8}}>
              Backup: {backupInfo.backupFileName} — Drive'da manuel silebilirsiniz.
            </p>
          )}
          <div style={{display:"flex",gap:12,marginTop:24}}>
            <button onClick={resetAll} style={S.secondaryBtn}>Yeni Parse</button>
            <button onClick={() => navigate("/fiyat-teklifi")} style={{...S.primaryBtn,flex:1}}>
              Fiyat Teklifi'ne Git →
            </button>
          </div>
        </div>
      </main>
      <Style/>
    </div>
  );

  // ── PROMOSYON AKIŞI ──────────────────────────────────────

  // PROMO UPLOAD
  if (step === STEPS.PROMO_UPLOAD) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Promosyon Parse" user={user} onBack={() => setStep(STEPS.MODE_SELECT)}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={S.bigIcon}>🎁</div>
          <h2 style={S.cardTitle}>Promosyon Bilgisi Ekle</h2>
          <p style={S.cardSub}>PDF döküman yükleyin veya mail/metin içeriğini yapıştırın</p>

          {/* Mod seçici */}
          <div style={{display:"flex", gap:8, marginBottom:20, background:"#f1f5f9", padding:4, borderRadius:12}}>
            <button onClick={() => setPromoInputMode("pdf")}
              style={{flex:1, padding:"8px 12px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Sora',sans-serif",
                background: promoInputMode==="pdf" ? "#fff" : "transparent",
                color: promoInputMode==="pdf" ? "#ea580c" : "#64748b",
                boxShadow: promoInputMode==="pdf" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}>
              📄 PDF Yükle
            </button>
            <button onClick={() => setPromoInputMode("text")}
              style={{flex:1, padding:"8px 12px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Sora',sans-serif",
                background: promoInputMode==="text" ? "#fff" : "transparent",
                color: promoInputMode==="text" ? "#ea580c" : "#64748b",
                boxShadow: promoInputMode==="text" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}>
              📝 Metin Yapıştır
            </button>
          </div>

          {promoInputMode === "pdf" ? (
            <div
              onDragOver={e => { e.preventDefault(); setPromoIsDragOver(true); }}
              onDragLeave={() => setPromoIsDragOver(false)}
              onDrop={handlePromoDrop}
              style={{ ...S.dropZone, borderColor: promoIsDragOver ? "#ea580c" : "#e2e8f0", background: promoIsDragOver ? "#fff7ed" : "#f8fafc" }}>
              <input type="file" accept="application/pdf" onChange={handlePromoFileSelect}
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0, cursor:"pointer", zIndex:10 }}/>
              {promoFile ? (
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:36}}>🎁</div>
                  <p style={{fontWeight:700, marginTop:8}}>{promoFile.name}</p>
                  <p style={{fontSize:12, color:"#64748b"}}>{(promoFile.size/1024/1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:48}}>📁</div>
                  <p style={{fontWeight:500, marginTop:8}}>PDF sürükle veya tıkla seç</p>
                  <p style={{fontSize:12, color:"#94a3b8"}}>Promosyon / kampanya dökümanı</p>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={promoText}
              onChange={e => setPromoText(e.target.value)}
              placeholder={`Mail veya döküman metnini buraya yapıştırın...\n\nÖrn:\nUK & Ireland – 25% tuition discount\nValid from 05/01/2026 to 30/04/2026`}
              style={{
                width:"100%", minHeight:200, padding:"14px 16px", borderRadius:14,
                border:"1.5px solid #e2e8f0", fontSize:13, fontFamily:"'Sora',sans-serif",
                resize:"vertical", marginBottom:20, color:"#0f172a", lineHeight:1.6,
                outline:"none"
              }}
              onFocus={e => e.target.style.borderColor="#ea580c"}
              onBlur={e => e.target.style.borderColor="#e2e8f0"}
            />
          )}

          {promoError && <div style={S.errorBox}>{promoError}</div>}
          <button onClick={analyzePromoFile}
            disabled={(promoInputMode==="pdf" ? !promoFile : !promoText.trim()) || promoLoading}
            style={{...S.primaryBtn, background:"#ea580c", opacity:((promoInputMode==="pdf" ? !promoFile : !promoText.trim())||promoLoading)?0.5:1}}>
            {promoLoading ? "Analiz ediliyor..." : "📊 Analiz Et"}
          </button>
        </div>
      </main>
      <Style/>
    </div>
  );

  // PROMO CONFIRM — okul seçimi
  if (step === STEPS.PROMO_CONFIRM) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Okul Seçimi" user={user} onBack={() => setStep(STEPS.PROMO_UPLOAD)}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={S.bigIcon}>🎯</div>
          <h2 style={S.cardTitle}>Okul Onaylayın</h2>
          {promoDetected
            ? <p style={S.cardSub}>Tespit edilen okul: <strong>{promoDetected}</strong></p>
            : <p style={S.cardSub}>Okul tespit edilemedi. Lütfen manuel seçin.</p>}
          <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom:24}}>
            {knownBrands.map(brand => (
              <div key={brand} onClick={() => setPromoBrand(brand)}
                style={{...S.brandCard, borderColor: promoBrand===brand?"#ea580c":"#e2e8f0", background: promoBrand===brand?"#fff7ed":"#fff"}}>
                <span style={{fontSize:22}}>{brand==="EC"?"🇬🇧":brand==="Kaplan"?"🇺🇸":"🏫"}</span>
                <div>
                  <div style={{fontWeight:700}}>{brand}</div>
                  {promoDetected===brand && <div style={{fontSize:11,color:"#ea580c"}}>✓ Tespit edildi</div>}
                </div>
                {promoBrand===brand && <span style={{color:"#ea580c",marginLeft:"auto",fontWeight:700}}>✓</span>}
              </div>
            ))}
          </div>
          {promoError && <div style={S.errorBox}>{promoError}</div>}
          <button onClick={startPromoParsing} disabled={!promoBrand}
            style={{...S.primaryBtn, background:"#ea580c", opacity:!promoBrand?0.5:1}}>
            {promoBrand ? `${promoBrand} promosyonlarını parse et →` : "Okul seçin"}
          </button>
        </div>
      </main>
      <Style/>
    </div>
  );

  // PROMO PARSING
  if (step === STEPS.PROMO_PARSING) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Parse Ediliyor..." user={user}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={S.spinner}/>
          <h3 style={{fontSize:16,fontWeight:600,color:"#0f172a",marginBottom:8}}>{promoProgressMsg}</h3>
          <div style={S.progressBar}><div style={{...S.progressFill,width:`${promoProgress}%`,background:"#ea580c"}}/></div>
          <p style={{fontSize:12,color:"#94a3b8",marginTop:8}}>{Math.floor(promoProgress)}% tamamlandı</p>
        </div>
      </main>
      <Style/>
    </div>
  );

  // PROMO REVIEW — parse sonucu önizleme
  if (step === STEPS.PROMO_REVIEW) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Promosyon Önizleme" user={user} onBack={() => setStep(STEPS.PROMO_CONFIRM)}/>
      <main style={{...S.main, maxWidth:700}}>
        <div style={S.sectionCard}>
          <h3 style={S.sectionTitle}>🎁 Parse Edilen Kampanyalar — {promoBrand}</h3>
          <p style={{fontSize:13,color:"#64748b",marginBottom:16}}>
            <strong>{promoData.length}</strong> kampanya bulundu. Kontrol edip kaydedin.
          </p>
          {promoData.length === 0 ? (
            <div style={{padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:13}}>
              Hiç kampanya bulunamadı. Dökümanı kontrol edin.
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {promoData.map((row, i) => (
                <div key={i} style={{padding:"12px 16px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontWeight:700,background:"#fff7ed",color:"#ea580c",padding:"2px 8px",borderRadius:20}}>
                      {row.campaign_id || "—"}
                    </span>
                    <span style={{fontWeight:600,fontSize:14,color:"#0f172a"}}>{row.campaign_name || "—"}</span>
                    <span style={{marginLeft:"auto",fontWeight:700,fontSize:13,
                      color: row.discount_type==="fixed_package"?"#7c3aed":"#059669"}}>
                      {row.discount_type==="fixed_package"
                        ? `📦 Paket ${row.package_price} ${row.currency}`
                        : row.discount_value
                          ? `${row.discount_value}${row.value_type==="percentage"?"%":row.value_type==="free"?" bedava":" sabit"}`
                          : "—"
                      }
                    </span>
                  </div>
                  <div style={{fontSize:12,color:"#64748b",display:"flex",gap:12,flexWrap:"wrap"}}>
                    {row.applies_to && (
                      <span>🎯 {row.applies_to}{row.target_name ? ` › ${row.target_name}` : ""}</span>
                    )}
                    {(row.city || row.country) && (
                      <span>📍 {[row.city, row.country].filter(Boolean).join(", ")}</span>
                    )}
                    {row.reg_date_start && (
                      <span>📅 Kayıt: {row.reg_date_start} → {row.reg_date_end || "?"}</span>
                    )}
                    {row.arrival_start && (
                      <span>✈️ Geliş: {row.arrival_start} → {row.arrival_end || "?"}</span>
                    )}
                    {(row.min_weeks || row.max_weeks) && (
                      <span>🗓 {row.min_weeks||"?"}-{row.max_weeks||"∞"} hafta</span>
                    )}
                    {row.eligible_courses && (
                      <span>📚 {row.eligible_courses}</span>
                    )}
                    {row.notes && <span>💬 {row.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {promoError && <div style={S.errorBox}>{promoError}</div>}
        <div style={{display:"flex",gap:12}}>
          <button onClick={() => { setPromoData([]); setStep(STEPS.PROMO_CONFIRM); }} style={S.secondaryBtn}>
            ← Yeniden Parse
          </button>
          <button onClick={savePromoData} disabled={promoData.length===0}
            style={{...S.primaryBtn, flex:1, background:"#ea580c", opacity:promoData.length===0?0.5:1}}>
            💾 discounts Sekmesine Kaydet
          </button>
        </div>
      </main>
      <Style/>
    </div>
  );

  // PROMO DONE
  if (step === STEPS.PROMO_DONE) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Tamamlandı" user={user}/>
      <main style={S.main}>
        <div style={S.card}>
          <div style={{fontSize:64,marginBottom:16}}>✅</div>
          <h2 style={S.cardTitle}>Kampanyalar Kaydedildi!</h2>
          <p style={S.cardSub}>
            <strong>{promoData.length}</strong> kampanya <strong>{promoBrand}</strong> discounts_draft sekmesine yazıldı.
          </p>
          <p style={{fontSize:13,color:"#64748b",marginTop:8,lineHeight:1.6}}>
            Sheet'i açarak kontrol edebilirsiniz. Onaylamak için discounts_draft sekmesini manuel olarak discounts ile değiştirin.
          </p>
          <a href={sheetUrls[promoBrand]} target="_blank" rel="noreferrer"
            style={{...S.linkBtn, display:"block", textAlign:"center", marginTop:16, textDecoration:"none"}}>
            📊 {promoBrand} Sheet'ini Aç
          </a>
          <div style={{display:"flex",gap:12,marginTop:16}}>
            <button onClick={resetAll} style={S.secondaryBtn}>Ana Menü</button>
            <button onClick={() => navigate("/fiyat-teklifi")} style={{...S.primaryBtn,flex:1}}>
              Fiyat Teklifi'ne Git →
            </button>
          </div>
        </div>
      </main>
      <Style/>
    </div>
  );

  return null;
}

// ─── ALT COMPONENT: Header ────────────────────────────────
function Header({ title, user, onBack }) {
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        {onBack
          ? <button onClick={onBack} style={S.backBtn}>← Geri</button>
          : <div/>
        }
        <span style={S.headerTitle}>{title}</span>
        <div style={S.userChip}>{user?.name}</div>
      </div>
    </header>
  );
}

// ─── STYLES ───────────────────────────────────────────────
function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    `}</style>
  );
}

const S = {
  root:        { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif", position:"relative" },
  bgGrid:      { position:"fixed", inset:0, backgroundImage:"linear-gradient(#e2e8f018 1px,transparent 1px),linear-gradient(90deg,#e2e8f018 1px,transparent 1px)", backgroundSize:"40px 40px", zIndex:0 },
  header:      { position:"sticky", top:0, background:"rgba(255,255,255,0.9)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", zIndex:10 },
  headerInner: { maxWidth:800, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  backBtn:     { background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Sora',sans-serif" },
  headerTitle: { fontSize:16, fontWeight:700, color:"#0f172a" },
  userChip:    { fontSize:13, fontWeight:500, color:"#374151", background:"#f1f5f9", padding:"6px 12px", borderRadius:20 },
  main:        { maxWidth:560, margin:"0 auto", padding:"48px 24px 64px", position:"relative", zIndex:1 },
  card:        { background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:24, padding:"40px 32px", textAlign:"center", animation:"fadeUp 0.4s ease-out" },
  sectionCard: { background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:20, padding:"24px", marginBottom:16, animation:"fadeUp 0.4s ease-out" },
  sectionTitle:{ fontSize:15, fontWeight:700, color:"#0f172a", marginBottom:16 },
  bigIcon:     { fontSize:56, marginBottom:16 },
  cardTitle:   { fontSize:22, fontWeight:700, color:"#0f172a", marginBottom:8 },
  cardSub:     { fontSize:14, color:"#64748b", marginBottom:24, lineHeight:1.6 },
  dropZone:    { position:"relative", border:"2px dashed", borderRadius:16, padding:"40px 24px", cursor:"pointer", transition:"all 0.2s", marginBottom:20, minHeight:160, display:"flex", alignItems:"center", justifyContent:"center" },
  brandCard:   { display:"flex", alignItems:"center", gap:12, padding:"12px 16px", border:"1.5px solid", borderRadius:12, cursor:"pointer", transition:"all 0.2s", textAlign:"left" },
  diffCard:    { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"14px", textAlign:"center" },
  miniBtn:     { padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Sora',sans-serif", transition:"all 0.15s" },
  spinner:     { width:48, height:48, border:"3px solid #e2e8f0", borderTopColor:"#2563eb", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 20px" },
  progressBar: { width:"100%", height:8, background:"#e2e8f0", borderRadius:4, marginTop:12, overflow:"hidden" },
  progressFill:{ height:"100%", background:"#2563eb", borderRadius:4, transition:"width 0.3s ease" },
  primaryBtn:  { display:"block", width:"100%", padding:"14px", background:"#2563eb", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"'Sora',sans-serif", marginTop:8 },
  secondaryBtn:{ padding:"12px 20px", background:"#fff", color:"#2563eb", border:"1.5px solid #2563eb", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'Sora',sans-serif" },
  linkBtn:     { display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px", background:"#f1f5f9", color:"#0f172a", border:"1px solid #e2e8f0", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", textDecoration:"none", fontFamily:"'Sora',sans-serif" },
  errorBox:    { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#dc2626", marginBottom:16, textAlign:"left" },
  modeCard:    { display:"flex", flexDirection:"column", alignItems:"center", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:20, padding:"32px 24px", cursor:"pointer", transition:"all 0.2s ease", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", animation:"fadeUp 0.4s ease-out both", fontFamily:"'Sora',sans-serif", width:"100%" },
};
