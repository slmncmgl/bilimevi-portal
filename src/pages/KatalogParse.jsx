import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

// ─── SABİTLER ────────────────────────────────────────────────
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_API_KEY = "AIzaSyC4mloyXRqobdiGhZEINzPEAU8XEaBVTGY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjXswPVqgqNc8R9LJjjUr1ZSuOOLliojYocbEpIJL0ALKgZmflosP6S_DvtsFXLPpD/exec";

const SHEET_URLS = {
  EC:     "https://docs.google.com/spreadsheets/d/1PMuw11fAUcnX1iz56OOH2HUBe1IUZUdP12VkX9-nt8Q",
  Kaplan: "https://docs.google.com/spreadsheets/d/1R72duyWM84S7CRzgpkvTVxNiUrgDWm83IQ2ShwJHqgQ",
};

// Parse edilecek sekmeler (visa/discounts hariç)
const PARSE_TABS = {
  EC:     ["courses", "accommodation", "fees", "transfers"],
  Kaplan: ["courses", "accommodation", "fees", "transfers", "junior_packages"],
};

const KNOWN_BRANDS = ["EC", "Kaplan", "LAL", "ELS", "ILSC"];

const STEPS = {
  UPLOAD:       "upload",
  SCHOOL_CONFIRM: "school_confirm",
  PARSING:      "parsing",
  DIFF:         "diff",
  SAVING:       "saving",
  REVIEW:       "review",
  DONE:         "done",
};

// ─── ANA COMPONENT ───────────────────────────────────────────
export default function KatalogParse() {
  const navigate = useNavigate();
  const [user, setUser]           = useState(null);
  const [step, setStep]           = useState(STEPS.UPLOAD);
  const [error, setError]         = useState(null);

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
  }, []);

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
  function detectBrandFromFileName(name) {
    const n = name.toLowerCase();
    if (n.includes("kaplan"))       return "Kaplan";
    if (n.includes(" ec ") || n.includes("ec_") || n.includes("ec english") || n.includes("ec-")) return "EC";
    if (n.includes("lal"))          return "LAL";
    if (n.includes("els"))          return "ELS";
    if (n.includes("ilsc"))         return "ILSC";
    return null;
  }

  async function detectBrandFromContent(base64) {
    const prompt = `Bu bir dil okulu katalog PDF'idir. İlk sayfayı analiz et, okul markasını belirle.
Seçenekler: EC, Kaplan, LAL, ELS, ILSC
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
      setSheetHeaders(headers);

      // Adım 2: Mevcut veriyi çek (diff için)
      setProgress(10); setProgressMsg("🔍 Mevcut veriler alınıyor...");
      const currentResult = await callAppsScript("getCurrentData", { brand: selectedBrand });
      if (currentResult.success) setCurrentData(currentResult.data || {});

      // Adım 3: PDF hazırla
      setProgress(15); setProgressMsg("📄 PDF hazırlanıyor...");
      const base64 = await fileToBase64(selectedFile);

      // Adım 4: Tek Gemini çağrısında tüm sekmeleri parse et
      setProgress(20); setProgressMsg("🤖 Gemini ile parse ediliyor...");
      const tabs = PARSE_TABS[selectedBrand] || ["courses", "accommodation", "fees", "transfers"];
      const parsed = await parseAllTabsAtOnce(base64, selectedBrand, headers, tabs);

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

  // Tek Gemini çağrısında tüm tablolar
  async function parseAllTabsAtOnce(base64, brand, headers, tabs) {
    const tabSections = tabs.map(tab => {
      const cols = headers[tab] || [];
      const colList = cols.length > 0
        ? cols.map(c => `"${c}": "değer"`).join(",\n      ")
        : '"name": "", "value": ""';
      return `
"${tab}": [
  {
    ${colList}
  }
]`;
    }).join(",");

    const prompt = `Bu bir ${brand} dil okulu katalog PDF'idir.
Aşağıdaki JSON formatında TÜM tabloları çıkar. Başka hiçbir şey yazma, backtick kullanma.

{
  ${tabSections}
}

KURALLAR:
1. Sadece PDF'te kesin olan bilgileri doldur. Emin değilsen boş bırak ("").
2. Fiyatlar sayı (string değil), para birimleri GBP/EUR/USD/CAD/CHF metin.
3. Tarihler YYYY-MM-DD formatında.
4. Her tablo için tüm şehirlerin verilerini dahil et.
5. Boş array döndürme — veri yoksa bile en az 1 satır dene.`;

    const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: base64 } }] }],
        generationConfig: { temperature: 0.1, topP: 0.95, maxOutputTokens: 8192 }
      })
    });

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    text = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(text);
    } catch {
      // Parse hatası — boş dön
      const empty = {};
      tabs.forEach(t => { empty[t] = []; });
      return empty;
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
      const cur = current[tab] || [];
      const nw  = parsed[tab]  || [];
      diff[tab] = { before: cur.length, after: nw.length, delta: nw.length - cur.length };
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
    setStep(STEPS.UPLOAD);
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
  }

  // ─── RENDER ───────────────────────────────────────────────
  if (!user) return null;

  // UPLOAD
  if (step === STEPS.UPLOAD) return (
    <div style={S.root}>
      <div style={S.bgGrid}/>
      <Header title="Katalog Parse" user={user} onBack={() => navigate("/dashboard")}/>
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
            {KNOWN_BRANDS.map(brand => (
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
    const tabs = PARSE_TABS[selectedBrand] || [];
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
    const sheetUrl = SHEET_URLS[selectedBrand];
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
};
