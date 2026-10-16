// v1.8
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwf-GAPBHK0mKd7_hOLuxuBhYhS3XctxjjHicfs3iLyBErm5m1cXECyBnb7EeRUn529aA/exec";

const APP_VERSION = "v1.8";

// Gemini çağrısı artık Vercel /api/gemini üzerinden (API key server-side, tarayıcıya gönderilmez)
const GEMINI_ENDPOINT = "/api/gemini";
const GEMINI_MODEL = "gemini-3.6-flash";

// ── Gemini yardımcıları ──────────────────────────────────────────
async function callGemini(prompt, temperature) {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: temperature ?? 0.4 }
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || ("Gemini HTTP " + res.status));
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJson(raw) {
  if (!raw) return null;
  const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch (_) {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

async function callGeminiOptions(text) {
  const prompt =
`Sen profesyonel bir e-bülten editörüsün.
Aşağıdaki metinden 3 FARKLI alternatif başlık ve özet üret.
KESİN KURALLAR:
1. BAŞLIK: 40-50 karakter.
2. İÇERİK: 140-160 karakter.
3. Cümleyi tam bitir.
4. 3 seçenek birbirinden farklı açılardan yazılsın (ör. avantaj odaklı, süreç odaklı, harekete geçirici).
5. SADECE JSON döndür: { "options": [ {"title":"...","content":"..."}, {"title":"...","content":"..."}, {"title":"...","content":"..."} ] }

METİN:
${text.substring(0, 8000)}`;
  const raw = await callGemini(prompt, 0.7);
  const parsed = parseJson(raw);
  if (parsed && Array.isArray(parsed.options) && parsed.options.length) {
    return parsed.options.slice(0, 3).map(o => ({ title: (o.title || "").trim(), content: (o.content || "").trim() }));
  }
  if (parsed && (parsed.title || parsed.content)) {
    return [{ title: parsed.title || "", content: parsed.content || "" }];
  }
  throw new Error("Gemini geçerli yanıt döndürmedi");
}

export default function BultenDuzenleyici() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [fromSheetPreview, setFromSheetPreview] = useState(false);

  // result: { options: [{title, content}, ...], urls: [...] }
  const [result, setResult] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState(null);     // hangi seçeneğin BAŞLIĞI seçili
  const [selectedContent, setSelectedContent] = useState(null); // hangi seçeneğin ÖZETİ seçili
  const [sourceText, setSourceText] = useState(""); // tekli alan yenilemede kaynak metin

  const [regenLoading, setRegenLoading] = useState({}); // key: "idx:field"
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error"|"info", msg }

  // 8 kanal hafıza (in-memory)
  const [channels, setChannels] = useState(Array(8).fill(null));
  const [showModal, setShowModal] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(null);
  const [sheetConfirm, setSheetConfirm] = useState(false); // Sheet satırını güncelleme onayı
  const [showOzet, setShowOzet] = useState(false); // en alttaki "Haberleri Özet Göster" bölümü

  // 8 haberi Haber-1'den Haber-8'e sıralı düz metin olarak hazırlar (boş slot sadece etiketle)
  function haberEtiketi(i) { return channels[i]?.label || ("Haber-" + (i + 1)); }
  function tumHaberlerMetni() {
    return channels.map((ch, i) => {
      const satirlar = [haberEtiketi(i)];
      if (ch) { if (ch.title) satirlar.push("*" + ch.title.trim() + "*"); if (ch.content) satirlar.push(ch.content); }
      return satirlar.join("\n");
    }).join("\n\n");
  }
  const [activeChannel, setActiveChannel] = useState(null);
  const [copied, setCopied] = useState({}); // key: "idx:field" veya "link"

  const rk = (idx, field) => !!regenLoading[idx + ":" + field];
  const ck = (key) => !!copied[key];

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);

    // Sheet'teki mevcut haberleri çek
    fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "bultenHaberleriGetir" })
    })
    .then(r => r.json())
    .then(json => {
      if (!json.success || !json.data) return;
      const updated = Array(8).fill(null);
      json.data.forEach(h => {
        const idx = h.row - 2;
        if (idx >= 0 && idx < 8) {
          const alts = (h.alternatifler && h.alternatifler.length) ? h.alternatifler : [{ title: h.title, content: h.content }];
          const options = alts.map(o => ({ title: o.title || "", content: o.content || "" }));
          // Önceki seçimi B/C ile eşleştirerek bul (mavi işaretli gelsin)
          let selT = options.findIndex(o => o.title === h.title);
          let selC = options.findIndex(o => o.content === h.content);
          if (selT < 0) selT = 0;
          if (selC < 0) selC = 0;
          updated[idx] = {
            title: h.title, content: h.content, urls: h.url ? [h.url] : [],
            options, selTitle: selT, selContent: selC, date: "", fromSheet: true,
            label: h.slot ? String(h.slot) : "" // Sheet A sütunu (ör. "Haber-1")
          };
        }
      });
      setChannels(updated);
    })
    .catch(() => {})
    .finally(() => setChannelsLoading(false));
  }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, [status]);

  // ── URL'den 3 alternatif üret ────────────────────────────────
  async function summarizeFromUrl() {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setStatus({ type: "info", msg: "Sayfa çekiliyor..." });
    setResult(null); setSelectedTitle(null); setSelectedContent(null); setActiveChannel(null); setFromSheetPreview(false);
    try {
      // 1. Apps Script'ten temizlenmiş sayfa metnini al
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "bultenUrlOzetle", url: urlInput.trim() })
      });
      const json = await res.json();
      if (!json.success || !json.data || !json.data.metin) throw new Error(json.msg || "Sayfa içeriği alınamadı");
      const metin = json.data.metin;

      // 2. Gemini'den 3 alternatif üret
      setStatus({ type: "info", msg: "3 alternatif üretiliyor..." });
      const options = await callGeminiOptions(metin);

      setSourceText(metin);
      setResult({ options, urls: [urlInput.trim()] });
      setSelectedTitle(null); setSelectedContent(null);
      setStatus({ type: "success", msg: options.length + " alternatif hazır" });
    } catch (err) {
      setStatus({ type: "error", msg: "Hata: " + err.message });
    } finally {
      setUrlLoading(false);
    }
  }

  // ── Tek alan yenile (idx'inci kartın başlık/özetini yeniden üret) ──
  async function regenField(idx, field) {
    if (!result || !result.options[idx]) return;
    const key = idx + ":" + field;
    setRegenLoading(r => ({ ...r, [key]: true }));
    try {
      const opt = result.options[idx];
      const source = sourceText || (opt.title + ". " + opt.content);
      const current = opt[field];
      const prompt = field === "title"
        ? `Sen profesyonel bir e-bülten editörüsün. Aşağıdaki metin için SADECE 1 yeni BAŞLIK üret. KURALLAR: 40-50 karakter, cümleyi tam bitir, mevcut başlıktan belirgin şekilde farklı olsun. Mevcut başlık: "${current}". SADECE JSON döndür: { "title": "..." }\n\nMETİN:\n${source.substring(0, 8000)}`
        : `Sen profesyonel bir e-bülten editörüsün. Aşağıdaki metin için SADECE 1 yeni ÖZET üret. KURALLAR: 140-160 karakter, cümleyi tam bitir, mevcut özetten belirgin şekilde farklı olsun. Mevcut özet: "${current}". SADECE JSON döndür: { "content": "..." }\n\nMETİN:\n${source.substring(0, 8000)}`;
      const raw = await callGemini(prompt, 0.85);
      const parsed = parseJson(raw);
      const val = parsed && parsed[field];
      if (val) editField(idx, field, val.trim());
    } catch (_) {}
    setRegenLoading(r => ({ ...r, [key]: false }));
  }

  function editField(idx, field, value) {
    setResult(r => {
      if (!r) return r;
      const opts = [...r.options];
      opts[idx] = { ...opts[idx], [field]: value };
      return { ...r, options: opts };
    });
  }

  function getSelected() {
    if (!result || selectedTitle === null || selectedContent === null) return null;
    const t = result.options[selectedTitle];
    const c = result.options[selectedContent];
    if (!t || !c) return null;
    return { title: t.title, content: c.content };
  }

  // ── Sheet'e Kaydet ────────────────────────────────────────────
  async function saveToSheet() {
    const sel = getSelected();
    if (!sel) return;
    setSaving(true);
    setStatus({ type: "info", msg: "Sheet'e kaydediliyor..." });
    try {
      const payload = {
        action: "bultenKaydet",
        baslik: sel.title,
        ozet: sel.content,
        url: result.urls?.[0] || "",
        slot: activeChannel !== null ? activeChannel : undefined,
        alternatifler: result.options.map(o => ({ title: o.title, content: o.content }))
      };
      const res = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success || json.satir === -1) throw new Error(json.msg || "Kayıt hatası");
      const guncelleme = !!channels[activeChannel]?.fromSheet;
      // Kanal hafızasını yeni seçimle güncelle → tekrar tıklayınca yeni seçim mavi gelir
      if (activeChannel !== null) {
        const updated = [...channels];
        updated[activeChannel] = {
          ...(updated[activeChannel] || {}),
          title: sel.title, content: sel.content, urls: result.urls || [],
          options: result.options.map(o => ({ title: o.title, content: o.content })),
          selTitle: selectedTitle, selContent: selectedContent,
          fromSheet: true
        };
        setChannels(updated);
      }
      setStatus({ type: "success", msg: guncelleme ? `Sheet'te güncellendi (satır ${json.satir})` : `Sheet'e kaydedildi (satır ${json.satir})` });
    } catch (err) {
      setStatus({ type: "error", msg: "Kayıt hatası: " + err.message });
    }
    setSaving(false);
  }

  function handleSheetClick() {
    const errors = karakterKontrol();
    if (errors.length > 0) { setStatus({ type: "error", msg: errors.join(" | ") }); return; }
    if (channels[activeChannel]?.fromSheet) { setSheetConfirm(true); return; } // Sheet'te kayıtlı → önce onay
    saveToSheet();
  }

  // ── Kopyala ───────────────────────────────────────────────────
  function copyField(key, text) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(c => ({ ...c, [key]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
  }

  // ── Kanal hafıza ─────────────────────────────────────────────
  function loadChannel(idx) {
    if (!channels[idx]) {
      // Boş kanal — seçili bir sonuç varsa oraya kaydet
      if (getSelected()) {
        const errors = karakterKontrol();
        if (errors.length > 0) { setStatus({ type: "error", msg: errors.join(" | ") }); return; }
        saveToChannel(idx);
      }
      return;
    }
    const ch = channels[idx];
    // Kanalı 3 alternatifle (varsa) geri yükle; önceki seçim mavi işaretli gelir
    const opts = (ch.options && ch.options.length) ? ch.options : [{ title: ch.title, content: ch.content }];
    setResult({ options: opts.map(o => ({ title: o.title, content: o.content })), urls: ch.urls || [] });
    setSelectedTitle(ch.selTitle != null ? ch.selTitle : 0);
    setSelectedContent(ch.selContent != null ? ch.selContent : 0);
    setSourceText("");
    setCopied({});
    // Sheet'te kayıtlı kanal da artık aktif olur → seçim değiştirip aynı satırı güncelleyebilirsin
    setActiveChannel(idx);
    setFromSheetPreview(!!ch.fromSheet);
  }

  function karakterKontrol() {
    const errors = [];
    const sel = getSelected();
    if (!sel) { errors.push("Önce bir başlık ve bir özet seçin."); return errors; }
    if (sel.title.length > 50)
      errors.push("Başlık 50 karakteri aşıyor (" + sel.title.length + "/50). Yenile butonunu kullanın.");
    if (sel.content.length > 200)
      errors.push("Haber Özeti 200 karakteri aşıyor (" + sel.content.length + "/200). Yenile butonunu kullanın.");
    return errors;
  }

  function handleSaveClick() {
    const errors = karakterKontrol();
    if (errors.length > 0) { setStatus({ type: "error", msg: errors.join(" | ") }); return; }
    setOverwriteConfirm(null); setShowModal(true);
  }

  function handleChannelSelect(idx) {
    if (channels[idx]?.fromSheet) return;
    if (channels[idx]) { setOverwriteConfirm(idx); return; }
    saveToChannel(idx);
  }

  function saveToChannel(idx) {
    const errors = karakterKontrol();
    if (errors.length > 0) { setStatus({ type: "error", msg: errors.join(" | ") }); setShowModal(false); setOverwriteConfirm(null); return; }
    const sel = getSelected();
    const entry = {
      title: sel.title, content: sel.content, urls: result.urls || [],
      options: result.options.map(o => ({ title: o.title, content: o.content })),
      selTitle: selectedTitle, selContent: selectedContent,
      date: new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }),
      fromSheet: false
    };
    const updated = [...channels]; updated[idx] = entry;
    setChannels(updated); setActiveChannel(idx);
    setShowModal(false); setOverwriteConfirm(null);
  }

  function clearChannel(idx, e) {
    e.stopPropagation();
    if (channels[idx]?.fromSheet) return;
    const updated = [...channels]; updated[idx] = null;
    setChannels(updated);
    if (activeChannel === idx) setActiveChannel(null);
  }

  // ── Char bar ─────────────────────────────────────────────────
  function CharBar({ value, max }) {
    const ratio = value.length / max;
    const over = value.length > max;
    const color = over ? "#dc2626" : ratio > 0.85 ? "#d97706" : "#22c55e";
    return (
      <div style={{ marginTop: "8px" }}>
        <div style={{ height: "2px", background: "#e2e8f0", borderRadius: "1px" }}>
          <div style={{ height: "100%", width: Math.min(ratio * 100, 100) + "%", background: color, borderRadius: "1px", transition: "width 0.3s, background 0.3s" }} />
        </div>
        <span style={{ fontSize: "11px", color: over ? "#dc2626" : "#94a3b8", float: "right", marginTop: "3px" }}>
          {value.length} / {max}
        </span>
      </div>
    );
  }

  const single = result && result.options.length === 1;

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner} className="bulten-header-inner">
          <div style={s.headerLeft}>
            <button onClick={() => navigate("/dashboard")} style={s.backBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <span style={s.headerSep}>·</span>
            <span style={s.headerTitle}>Bülten Düzenleyici</span>
            <span style={s.versionTag}>{APP_VERSION}</span>
          </div>
          <div style={s.headerRight} className="bulten-header-right">
            <div style={s.userChip}><div style={s.userDot} />{user?.name}</div>
            <button onClick={() => navigate("/")} style={s.logoutBtn}>Çıkış</button>
          </div>
        </div>
      </header>

      <main style={s.main} className="bulten-main">
        <div style={s.grid} className="bulten-grid">

          {/* SOL — Giriş */}
          <div style={s.leftCol}>

            {/* URL'den Özetle */}
            <div style={s.card}>
              <div style={s.sectionLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Haber Bülteni Linkini Gir
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && summarizeFromUrl()}
                  placeholder="https://..."
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "9px 12px",
                    border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "13px",
                    color: "#1e3a5f", outline: "none", fontFamily: "inherit", background: "#fff"
                  }}
                />
                <button
                  onClick={summarizeFromUrl}
                  disabled={urlLoading || !urlInput.trim()}
                  style={{
                    ...s.primaryBtn,
                    opacity: (urlLoading || !urlInput.trim()) ? 0.6 : 1,
                    cursor: (urlLoading || !urlInput.trim()) ? "not-allowed" : "pointer",
                    width: "100%"
                  }}
                >
                  {urlLoading
                    ? <><div style={s.spinner} /> İşleniyor...</>
                    : <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                        3 Alternatif Üret
                      </>
                  }
                </button>
              </div>
            </div>

            {/* 8 Kanal Hafıza */}
            <div style={s.card}>
              <div style={s.sectionLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Hafıza (8 Kanal)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }} className="bulten-channel-grid">
                {channelsLoading
                  ? Array(8).fill(null).map((_, i) => (
                      <div key={i} style={{
                        ...s.channelBtn,
                        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                        backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
                        border: "1.5px solid #e2e8f0", height: "56px"
                      }} />
                    ))
                  : channels.map((ch, i) => (
                  <button key={i} onClick={() => loadChannel(i)}
                    style={{
                      ...s.channelBtn,
                      borderColor: activeChannel === i ? "#2563eb" : ch?.fromSheet ? "#86efac" : ch ? "#bfdbfe" : "#e2e8f0",
                      background: activeChannel === i ? "#eff6ff" : ch?.fromSheet ? "#f0fdf4" : ch ? "#f8fafc" : "#fff",
                      position: "relative"
                    }}>
                    {ch && !ch.fromSheet && (
                      <span onClick={(e) => clearChannel(i, e)}
                        style={{ position: "absolute", top: "3px", right: "4px", fontSize: "9px", color: "#94a3b8", lineHeight: 1 }}>✕</span>
                    )}
                    <div style={{ fontSize: "10px", fontWeight: "700", color: ch ? "#2563eb" : "#94a3b8" }}>{i + 1}. Haber</div>
                    <div style={{ fontSize: "9px", color: ch?.fromSheet ? "#16a34a" : ch ? "#64748b" : "#cbd5e1", marginTop: "2px" }}>
                      {ch?.fromSheet ? "Kayıtlı" : ch ? "Hafızada" : "Boş"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* SAĞ — Sonuçlar */}
          <div style={s.rightCol}>

            {activeChannel !== null && (
              <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "600", textAlign: "right", marginBottom: "4px" }}>
                ← Kanal {activeChannel + 1}
              </div>
            )}

            {!result && (
              <div style={{ ...s.card, textAlign: "center", color: "#94a3b8", fontSize: "13px", padding: "36px 20px" }}>
                Bir link girip <strong style={{ color: "#475569" }}>3 Alternatif Üret</strong>'e bas.
                Alternatifler burada listelenir; birini seçip düzenleyebilirsin.
              </div>
            )}

            {result && !single && (selectedTitle === null || selectedContent === null) && (
              <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", textAlign: "center", marginBottom: "2px" }}>
                Kaydetmek için bir <strong>başlık</strong> ve bir <strong>özet</strong> seç ↓
              </div>
            )}

            {/* Alternatif kartları */}
            {result && result.options.map((opt, idx) => {
              const titleSel = selectedTitle === idx;
              const contentSel = selectedContent === idx;
              const titleOver = opt.title.length > 50;
              const contentOver = opt.content.length > 200;
              return (
                <div key={idx} style={{ ...s.optionCard }}>

                  {!single && (
                    <div style={s.optionHead}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8" }}>Seçenek {idx + 1}</div>
                    </div>
                  )}

                  {/* Başlık */}
                  <div
                    onClick={() => !single && setSelectedTitle(idx)}
                    style={{
                      ...s.fieldBlock, ...s.fieldSelectable,
                      cursor: single ? "default" : "pointer",
                      borderColor: titleSel ? "#2563eb" : titleOver ? "#fca5a5" : "#e8edf3",
                      background: titleSel ? "#eff6ff" : "#fff"
                    }}>
                    <div style={s.fieldHead}>
                      <div style={s.fieldLabelRow}>
                        {!single && (
                          <span style={{ ...s.radio, borderColor: titleSel ? "#2563eb" : "#cbd5e1", background: titleSel ? "#2563eb" : "#fff" }}>
                            {titleSel && <span style={s.radioDot} />}
                          </span>
                        )}
                        <span style={{ ...s.fieldLabel, color: titleSel ? "#2563eb" : "#475569" }}>Başlık</span>
                        {titleSel && !single && <span style={s.selBadge}>✓ Seçili</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={(e) => { e.stopPropagation(); regenField(idx, "title"); }} disabled={rk(idx, "title")} style={s.regenBtn}>
                          {rk(idx, "title") ? <div style={{ ...s.spinner, width: "11px", height: "11px", border: "1.5px solid #e2e8f0", borderTopColor: "#2563eb" }} /> : "↻ Yenile"}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); copyField(idx + ":title", opt.title); }}
                          style={{ ...s.miniCopyBtn, background: ck(idx + ":title") ? "#dcfce7" : "#eff6ff", color: ck(idx + ":title") ? "#16a34a" : "#2563eb" }}>
                          {ck(idx + ":title") ? "✓ Kopyalandı" : "Kopyala"}
                        </button>
                      </div>
                    </div>
                    <textarea value={opt.title} onClick={(e) => e.stopPropagation()} onChange={e => editField(idx, "title", e.target.value)}
                      rows={2} style={{ ...s.textarea, borderColor: titleOver ? "#fca5a5" : "#e2e8f0" }} />
                    <CharBar value={opt.title} max={50} />
                  </div>

                  {/* Haber Özeti */}
                  <div
                    onClick={() => !single && setSelectedContent(idx)}
                    style={{
                      ...s.fieldBlock, ...s.fieldSelectable, marginTop: "12px",
                      cursor: single ? "default" : "pointer",
                      borderColor: contentSel ? "#2563eb" : contentOver ? "#fca5a5" : "#e8edf3",
                      background: contentSel ? "#eff6ff" : "#fff"
                    }}>
                    <div style={s.fieldHead}>
                      <div style={s.fieldLabelRow}>
                        {!single && (
                          <span style={{ ...s.radio, borderColor: contentSel ? "#2563eb" : "#cbd5e1", background: contentSel ? "#2563eb" : "#fff" }}>
                            {contentSel && <span style={s.radioDot} />}
                          </span>
                        )}
                        <span style={{ ...s.fieldLabel, color: contentSel ? "#2563eb" : "#475569" }}>Haber Özeti</span>
                        {contentSel && !single && <span style={s.selBadge}>✓ Seçili</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={(e) => { e.stopPropagation(); regenField(idx, "content"); }} disabled={rk(idx, "content")} style={s.regenBtn}>
                          {rk(idx, "content") ? <div style={{ ...s.spinner, width: "11px", height: "11px", border: "1.5px solid #e2e8f0", borderTopColor: "#2563eb" }} /> : "↻ Yenile"}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); copyField(idx + ":content", opt.content); }}
                          style={{ ...s.miniCopyBtn, background: ck(idx + ":content") ? "#dcfce7" : "#eff6ff", color: ck(idx + ":content") ? "#16a34a" : "#2563eb" }}>
                          {ck(idx + ":content") ? "✓ Kopyalandı" : "Kopyala"}
                        </button>
                      </div>
                    </div>
                    <textarea value={opt.content} onClick={(e) => e.stopPropagation()} onChange={e => editField(idx, "content", e.target.value)}
                      rows={4} style={{ ...s.textarea, borderColor: contentOver ? "#fca5a5" : "#e2e8f0" }} />
                    <CharBar value={opt.content} max={200} />
                  </div>
                </div>
              );
            })}

            {/* Linkler */}
            {result && result.urls && result.urls.length > 0 && (
              <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={s.sectionLabel}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    Kaynak Link
                  </div>
                  <button onClick={() => copyField("link", result.urls[0])}
                    style={{ ...s.miniCopyBtn, background: ck("link") ? "#dcfce7" : "#eff6ff", color: ck("link") ? "#16a34a" : "#2563eb" }}>
                    {ck("link") ? "✓ Kopyalandı" : "Kopyala"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
                  <a href={result.urls[0]} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, fontSize: "12px", color: "#2563eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.urls[0]}</a>
                </div>
              </div>
            )}

            {/* Aksiyon butonları */}
            {result && (
              <div style={{ display: "flex", gap: "10px" }} className="bulten-action-btns">
                {getSelected() && activeChannel === null && !fromSheetPreview && (
                  <button onClick={handleSaveClick} style={{ ...s.secondaryBtn, flex: 1 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Hafızaya Kaydet
                  </button>
                )}
                <button onClick={handleSheetClick} disabled={saving || activeChannel === null || !getSelected()} style={{
                  ...s.primaryBtn, flex: 1,
                  opacity: (saving || activeChannel === null || !getSelected()) ? 0.4 : 1,
                  cursor: (saving || activeChannel === null || !getSelected()) ? "not-allowed" : "pointer"
                }}>
                  {saving
                    ? <><div style={s.spinner} /> Kaydediliyor...</>
                    : <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                        </svg>
                        {channels[activeChannel]?.fromSheet ? "Sheet'te Güncelle" : "Sheet'e Kaydet"}
                      </>
                  }
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Haberleri Özet Göster (açılır/kapanır) */}
        <div style={{ ...s.card, marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setShowOzet(v => !v)} style={{ ...s.secondaryBtn, padding: "8px 14px" }}>
              <span style={{ display: "inline-block", transition: "transform 0.2s", transform: showOzet ? "rotate(90deg)" : "none" }}>▸</span>
              {showOzet ? "Özeti Gizle" : "Haberleri Özet Göster"}
            </button>
            {showOzet && (
              <button onClick={() => copyField("tumu", tumHaberlerMetni())}
                style={{ ...s.miniCopyBtn, padding: "8px 14px", fontSize: "12px", background: ck("tumu") ? "#dcfce7" : "#eff6ff", color: ck("tumu") ? "#16a34a" : "#2563eb" }}>
                {ck("tumu") ? "✓ Kopyalandı" : "Tümünü Kopyala"}
              </button>
            )}
          </div>

          {showOzet && (
            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "22px" }}>
              {channels.map((ch, i) => (
                <div key={i} style={{ fontSize: "13px", lineHeight: 1.6, color: "#0f172a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {haberEtiketi(i)}
                    </span>
                    {ch && (
                      <button
                        onClick={() => { loadChannel(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        title="Düzenle"
                        aria-label={haberEtiketi(i) + " düzenle"}
                        style={s.editIconBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {ch?.title && <div style={{ fontWeight: "600" }}>{ch.title}</div>}
                  {ch?.content && <div style={{ color: "#475569" }}>{ch.content}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Sheet güncelleme onayı */}
      {sheetConfirm && activeChannel !== null && (
        <div onClick={() => setSheetConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "340px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <p style={{ fontSize: "12px", fontWeight: "700", color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Sheet'teki Kayıt Değişecek</p>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 18px", lineHeight: 1.6 }}>
              {activeChannel + 1}. haberin Sheet'teki satırı (satır {activeChannel + 2}) yeni seçiminle değiştirilecek. Devam edelim mi?
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setSheetConfirm(false)} style={s.modalCancelBtn}>Vazgeç</button>
              <button onClick={() => { setSheetConfirm(false); saveToSheet(); }}
                style={{ ...s.modalDangerBtn, background: "#1e3a5f" }}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanal Modal */}
      {showModal && (
        <div onClick={() => { setShowModal(false); setOverwriteConfirm(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "320px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            {overwriteConfirm !== null ? (
              <>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Üzerine Yazılacak</p>
                <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 18px", lineHeight: 1.6 }}>
                  Kanal {overwriteConfirm + 1}'de <strong style={{ color: "#0f172a" }}>{channels[overwriteConfirm].title}</strong> kayıtlı. Üzerine yazılsın mı?
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button onClick={() => setOverwriteConfirm(null)} style={s.modalCancelBtn}>Geri</button>
                  <button onClick={() => saveToChannel(overwriteConfirm)} style={s.modalDangerBtn}>Üzerine Yaz</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 14px" }}>Kanal Seç</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {channels.map((ch, i) => (
                    <button key={i} onClick={() => handleChannelSelect(i)}
                      style={{ ...s.channelBtn, borderColor: ch?.fromSheet ? "#86efac" : ch ? "#bfdbfe" : "#e2e8f0", background: ch?.fromSheet ? "#f0fdf4" : "#fff", opacity: ch?.fromSheet ? 0.5 : 1, cursor: ch?.fromSheet ? "not-allowed" : "pointer" }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: ch ? "#2563eb" : "#94a3b8" }}>{i + 1}. Haber</div>
                      <div style={{ fontSize: "9px", color: ch?.fromSheet ? "#16a34a" : ch ? "#64748b" : "#cbd5e1" }}>{ch?.fromSheet ? "Kayıtlı" : ch ? "Hafızada" : "Boş"}</div>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "10px 0 0" }}>Dolu kanala tıklarsan onay istenir.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status toast */}
      {status && (
        <div style={{
          ...s.toast,
          background: status.type === "error" ? "#fef2f2" : "#fff",
          borderColor: status.type === "error" ? "#fecaca" : "#bfdbfe",
          color: status.type === "error" ? "#dc2626" : "#1e3a5f"
        }}>
          {status.type === "success" && <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>}
          {status.type === "error"   && <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          {status.type === "info"    && <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          <span style={{ fontSize: "13px", fontWeight: "600" }}>{status.msg}</span>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        textarea:focus, input:focus { outline: none; border-color: #2563eb !important; }
        @media (max-width: 640px) {
          .bulten-header-inner { padding: 10px 14px !important; flex-wrap: wrap; gap: 6px; }
          .bulten-header-right { gap: 6px !important; flex-wrap: wrap; }
          .bulten-main { padding: 16px 12px 48px !important; max-width: 100% !important; }
          .bulten-grid { grid-template-columns: 1fr !important; display: flex !important; flex-direction: column !important; }
          .bulten-channel-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .bulten-action-btns { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },

  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "960px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  headerSep: { color: "#cbd5e1", fontSize: "14px" },
  headerTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  versionTag: { fontSize: "10px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "20px", padding: "2px 8px", letterSpacing: "0.3px" },
  userChip: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" },
  userDot: { width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" },
  logoutBtn: { padding: "7px 14px", background: "none", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },

  main: { maxWidth: "960px", margin: "0 auto", padding: "32px 24px 64px", position: "relative", zIndex: 1 },
  grid: { display: "flex", flexDirection: "column", gap: "20px" },
  leftCol: { display: "flex", flexDirection: "column", gap: "16px" },
  rightCol: { display: "flex", flexDirection: "column", gap: "16px" },

  card: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeUp 0.3s ease-out" },
  sectionLabel: { display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },

  // Alternatif kartı
  optionCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "18px", animation: "fadeUp 0.3s ease-out", transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s" },
  optionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  optionNum: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "700", color: "#0f172a" },
  radio: { width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" },
  radioDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#fff" },
  selBadge: { fontSize: "10px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", padding: "3px 8px", borderRadius: "20px" },

  fieldBlock: {},
  fieldSelectable: { border: "1.5px solid #e8edf3", borderRadius: "12px", padding: "12px", transition: "border-color 0.15s, background 0.15s" },
  fieldHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" },
  fieldLabelRow: { display: "flex", alignItems: "center", gap: "8px" },
  fieldLabel: { fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },

  textarea: { width: "100%", padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontFamily: "inherit", color: "#0f172a", resize: "vertical", boxSizing: "border-box", lineHeight: "1.6", transition: "border-color 0.2s", background: "#fff" },

  primaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px 18px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", cursor: "pointer", transition: "opacity 0.2s" },
  secondaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px 18px", background: "#fff", color: "#1e3a5f", border: "1.5px solid #bfdbfe", borderRadius: "10px", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", cursor: "pointer" },
  regenBtn: { display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", color: "#475569", cursor: "pointer", fontFamily: "inherit" },
  editIconBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", padding: 0, background: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "6px", cursor: "pointer" },
  miniCopyBtn: { padding: "4px 10px", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: "#eff6ff", color: "#2563eb" },

  channelBtn: { padding: "10px 6px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", textAlign: "center", transition: "all 0.15s" },

  spinner: { display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },

  toast: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", border: "1.5px solid", padding: "14px 24px", borderRadius: "14px", boxShadow: "0 4px 24px rgba(30,58,95,0.13)", display: "flex", alignItems: "center", gap: "10px", fontFamily: "inherit", zIndex: 9999, pointerEvents: "none", animation: "fadeUp 0.2s ease" },

  modalCancelBtn: { padding: "8px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", color: "#64748b", cursor: "pointer", fontFamily: "inherit" },
  modalDangerBtn: { padding: "8px 16px", background: "#dc2626", border: "none", borderRadius: "8px", fontSize: "12px", color: "#fff", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
};
