import { useState, useEffect } from "react";

const SYSTEM_PROMPT = `Sen profesyonel bir e-bülten editörüsün. Görevin, sana iletilen uzun metinleri e-bülten formatına uygun şekilde "öz bilgi" olarak özetlemektir.

HEDEF TON: Okuyucuya seslenen, hafif çekim gücü olan ama abartısız ve sade bir dil. Tamamen robotik/soğuk değil; kısa ve öz ama ilgi çekici. Orijinal metinde fırsat, indirim veya avantaj varsa bunu öne çıkar. Hafif davet tonu veya soru cümlesi kabul edilebilir.

ÖRNEK ÇIKTI TARZI:
"2026'da İngilizce eğitiminizi Bayswater ile planlayın ve %25 indirim fırsatını kaçırmayın! Yurtdışında eğitim hayalinize daha ekonomik bir başlangıç için şimdi tam zamanı."
(Bu örnek biraz uzun — sen bunun daha kısa ve özlü halini üret.)

KESİN KURALLAR:
1. BAŞLIK: Boşluklar dahil en fazla 50 karakter. Net, ilgi çekici, ana konuyu yansıtan.
2. İÇERİK: Boşluklar dahil en fazla 200 karakter. Doldurmak zorunda değilsin; doğru ve çekici olan yeterli.
3. SADAKAT: Orijinal metinde bulunmayan hiçbir bilgi, rakam, tarih, kod, isim ASLA eklenmez. Her cümle orijinal metinden desteklenebilir olmalı.
4. FORMAT: Yanıtını SADECE şu JSON yapısında döndür, başka hiçbir şey yazma: { "title": "Başlık", "content": "İçerik" }`;

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const extractUrls = (text) => text.match(URL_REGEX) || [];
const stripUrls = (text) => text.replace(URL_REGEX, "").replace(/\s{2,}/g, " ").trim();

async function callClaude(userContent, systemPrompt, maxTokens) {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens || 1000,
    messages: [{ role: "user", content: userContent }],
  };
  if (systemPrompt) body.system = systemPrompt;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const text = (data.content && data.content[0] && data.content[0].text) || "";
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [detectedUrls, setDetectedUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState({ title: false, content: false });
  const [error, setError] = useState("");
  const [copied, setCopied] = useState({ title: false, content: false, link: false });
  const [channels, setChannels] = useState(Array(8).fill(null));
  const [showModal, setShowModal] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);

  useEffect(() => {
    (async () => {
      const loaded = Array(8).fill(null);
      for (let i = 0; i < 8; i++) {
        try {
          const res = await window.storage.get("channel:" + (i + 1));
          if (res) loaded[i] = JSON.parse(res.value);
        } catch (_) {}
      }
      setChannels(loaded);
    })();
  }, []);

  const handleInput = (e) => {
    setInput(e.target.value);
    setDetectedUrls(extractUrls(e.target.value));
  };

  const summarize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setActiveChannel(null);
    try {
      const textOnly = stripUrls(input) || input;
      const parsed = await callClaude(textOnly, SYSTEM_PROMPT, 1000);
      setResult({ title: parsed.title, content: parsed.content, urls: extractUrls(input) });
    } catch (e) {
      setError("Bir hata oluştu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const regenField = async (field) => {
    if (!input.trim()) return;
    setRegenLoading(r => ({ ...r, [field]: true }));
    const textOnly = stripUrls(input) || input;
    const prompt = field === "title"
      ? "Aşağıdaki metin için SADECE başlık üret. En fazla 50 karakter. Yanıtını SADECE şu JSON ile döndür: { \"title\": \"...\" }\n\n" + textOnly
      : "Aşağıdaki metin için SADECE öz bilgi içeriği üret. En fazla 200 karakter. Okuyucuya seslenen, hafif çekici ama abartısız. Orijinal metinde olmayan bilgi ekleme. Yanıtını SADECE şu JSON ile döndür: { \"content\": \"...\" }\n\n" + textOnly;
    try {
      const parsed = await callClaude(prompt, null, 300);
      if (field === "title" && parsed.title) setResult(r => ({ ...r, title: parsed.title }));
      if (field === "content" && parsed.content) setResult(r => ({ ...r, content: parsed.content }));
    } catch (_) {}
    setRegenLoading(r => ({ ...r, [field]: false }));
  };

  const clearAll = () => {
    setInput(""); setDetectedUrls([]); setResult(null);
    setActiveChannel(null); setError("");
    setCopied({ title: false, content: false, link: false });
  };

  const loadChannel = (idx) => {
    if (!channels[idx]) return;
    setResult({ title: channels[idx].title, content: channels[idx].content, urls: channels[idx].urls || [] });
    setActiveChannel(idx);
    setCopied({ title: false, content: false, link: false });
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
  };

  const handleSaveClick = () => { setOverwriteConfirm(null); setShowModal(true); };

  const handleChannelSelect = async (idx) => {
    if (channels[idx]) { setOverwriteConfirm(idx); return; }
    await saveToChannel(idx);
  };

  const saveToChannel = async (idx) => {
    const entry = {
      title: result.title, content: result.content, urls: result.urls || [],
      date: new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }),
    };
    try {
      await window.storage.set("channel:" + (idx + 1), JSON.stringify(entry));
      const updated = [...channels]; updated[idx] = entry;
      setChannels(updated); setActiveChannel(idx);
    } catch (_) {}
    setShowModal(false); setOverwriteConfirm(null);
  };

  const clearChannel = async (idx, e) => {
    e.stopPropagation();
    try {
      await window.storage.delete("channel:" + (idx + 1));
      const updated = [...channels]; updated[idx] = null; setChannels(updated);
      if (activeChannel === idx) { setResult(null); setActiveChannel(null); }
    } catch (_) {}
  };

  const copyField = (field, value) => {
    navigator.clipboard.writeText(value);
    setCopied(c => ({ ...c, [field]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [field]: false })), 1800);
  };

  const C = {
    bg: "#f2ece0", surface: "#ede6d8", surfaceHigh: "#e6ddd0",
    border: "#d4c9b8", borderLight: "#ccc3b0",
    gold: "#9a7840", text: "#1c1814", textMid: "#3a332a",
    textDim: "#7a6e60", textFaint: "#a09080",
    green: "#4a8c5c", red: "#b85050", amber: "#b07828", link: "#4a6a9a",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Mono','Courier New',monospace", display: "flex", flexDirection: "column", alignItems: "center", padding: "44px 20px 80px", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus { outline: none; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        .pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.35} }
        .fade-in { animation: fadeIn 0.35s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .ch-card { transition: all 0.15s; }
        .ch-card.filled:hover { border-color: #9a784088 !important; background: #e8e0d0 !important; cursor: pointer; }
        .overlay { position:fixed;inset:0;background:#00000033;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px; }
        a.src-link { color: #4a6a9a; text-decoration: none; word-break: break-all; font-size: 13px; line-height: 1.6; }
        a.src-link:hover { text-decoration: underline; }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <p style={{ fontSize: "10px", letterSpacing: "4px", color: C.gold, textTransform: "uppercase", margin: "0 0 10px" }}>E-Bülten Araçları</p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(26px,5vw,40px)", fontWeight: 700, margin: 0, color: C.text }}>
          Öz Bilgi Üretici
        </h1>
        <div style={{ width: "40px", height: "2px", background: C.gold, margin: "14px auto 0" }} />
      </div>

      {/* Hafıza Paneli */}
      <div style={{ width: "100%", maxWidth: "660px", marginBottom: "20px" }}>
        <p style={{ fontSize: "10px", letterSpacing: "3px", color: C.textFaint, textTransform: "uppercase", margin: "0 0 10px" }}>
          Hafıza Kanalları — <span style={{ color: C.textDim }}>tıkla, aşağıda görüntüle</span>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
          {channels.map((ch, i) => (
            <div key={i} className={"ch-card" + (ch ? " filled" : "")} onClick={() => ch && loadChannel(i)}
              style={{ background: activeChannel === i ? "#e8dfc8" : C.surface, border: "1px solid " + (activeChannel === i ? C.gold : ch ? C.borderLight : C.border), borderRadius: "4px", padding: "10px 12px", minHeight: "62px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ch ? "5px" : 0 }}>
                <span style={{ fontSize: "9px", letterSpacing: "2px", color: ch ? C.gold : C.textFaint, textTransform: "uppercase" }}>K{i + 1}</span>
                {ch && <button onClick={e => clearChannel(i, e)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", fontSize: "13px", padding: 0 }}
                  onMouseEnter={e => e.target.style.color = C.red} onMouseLeave={e => e.target.style.color = C.textFaint}>×</button>}
              </div>
              {ch ? (
                <>
                  <p style={{ margin: 0, fontSize: "10px", color: C.textMid, lineHeight: 1.4, wordBreak: "break-word" }}>
                    {ch.title.slice(0, 22)}{ch.title.length > 22 ? "…" : ""}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "9px", color: C.textFaint }}>{ch.date}</p>
                  {ch.urls && ch.urls.length > 0 && <div style={{ marginTop: "3px", width: "6px", height: "6px", borderRadius: "50%", background: C.link }} />}
                </>
              ) : (
                <p style={{ margin: "2px 0 0", fontSize: "10px", color: C.textFaint }}>Boş</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Giriş */}
      <div style={{ width: "100%", maxWidth: "660px", background: C.surface, border: "1px solid " + C.border, borderRadius: "4px" }}>
        <div style={{ padding: "22px 26px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <label style={{ fontSize: "10px", letterSpacing: "3px", color: C.textDim, textTransform: "uppercase" }}>Kaynak Metin</label>
            {detectedUrls.length > 0 && (
              <span style={{ fontSize: "9px", color: C.link, background: C.link + "18", border: "1px solid " + C.link + "44", borderRadius: "2px", padding: "2px 8px" }}>
                {detectedUrls.length} link tespit edildi
              </span>
            )}
          </div>
          <textarea value={input} onChange={handleInput}
            placeholder="Özetlenecek metni buraya yapıştırın… (link varsa otomatik ayrıştırılır)"
            rows={7}
            style={{ width: "100%", background: C.bg, border: "1px solid " + C.borderLight, borderRadius: "3px", color: C.textMid, fontSize: "13px", lineHeight: "1.7", padding: "12px 14px", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.2s" }}
            onFocus={e => e.target.style.borderColor = C.gold + "88"}
            onBlur={e => e.target.style.borderColor = C.borderLight}
          />
        </div>
        <div style={{ height: "1px", background: C.border }} />
        <div style={{ padding: "14px 26px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "11px", color: C.textFaint }}>{input.length > 0 ? input.length + " karakter" : "—"}</span>
            {(input || result) && (
              <button onClick={clearAll} style={{ background: "transparent", border: "none", color: C.textFaint, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                onMouseEnter={e => e.target.style.color = C.red} onMouseLeave={e => e.target.style.color = C.textFaint}>
                Temizle
              </button>
            )}
          </div>
          <button onClick={summarize} disabled={!input.trim() || loading}
            style={{ background: loading ? C.surfaceHigh : C.gold, color: loading ? C.textFaint : "#fff8f0", border: "none", borderRadius: "2px", padding: "9px 26px", fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", fontFamily: "inherit", fontWeight: 500, cursor: input.trim() && !loading ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
            {loading ? <span className="pulse">İşleniyor…</span> : "Özetle"}
          </button>
        </div>
      </div>

      {error && <div style={{ marginTop: "14px", color: C.red, fontSize: "12px" }}>{error}</div>}

      {result && (
        <div className="fade-in" style={{ width: "100%", maxWidth: "660px", marginTop: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {activeChannel !== null && (
            <div style={{ fontSize: "10px", letterSpacing: "2px", color: C.gold, textTransform: "uppercase", textAlign: "right" }}>← Kanal {activeChannel + 1}</div>
          )}

          <ResultBlock label="Başlık" value={result.title} maxChars={50}
            copied={copied.title} onCopy={() => copyField("title", result.title)}
            onChange={v => setResult(r => ({ ...r, title: v }))}
            onRegen={() => regenField("title")} regenLoading={regenLoading.title} C={C} />

          <ResultBlock label="Öz Bilgi" value={result.content} maxChars={200}
            copied={copied.content} onCopy={() => copyField("content", result.content)}
            onChange={v => setResult(r => ({ ...r, content: v }))}
            onRegen={() => regenField("content")} regenLoading={regenLoading.content} C={C} />

          {result.urls && result.urls.length > 0 && (
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: "4px", padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "3px", color: C.textDim, textTransform: "uppercase" }}>
                  {"Kaynak " + (result.urls.length > 1 ? "Linkler (" + result.urls.length + ")" : "Link")}
                </span>
                {result.urls.length === 1 && (
                  <button onClick={() => copyField("link", result.urls[0])} style={{ background: copied.link ? C.green + "22" : "transparent", border: "1px solid " + (copied.link ? C.green : C.border), color: copied.link ? C.green : C.textFaint, borderRadius: "2px", padding: "4px 12px", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}>
                    {copied.link ? "Kopyalandı" : "Kopyala"}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {result.urls.map((url, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: C.link, marginTop: "8px", flexShrink: 0 }} />
                    <a href={url} target="_blank" rel="noopener noreferrer" className="src-link" style={{ flex: 1 }}>{url}</a>
                    {result.urls.length > 1 && (
                      <button onClick={() => copyField("link", url)} style={{ background: "transparent", border: "1px solid " + C.border, color: C.textFaint, borderRadius: "2px", padding: "3px 10px", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", flexShrink: 0 }}>Kopyala</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeChannel === null && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSaveClick}
                style={{ background: "transparent", border: "1px solid " + C.gold + "88", color: C.gold, borderRadius: "2px", padding: "8px 20px", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => e.target.style.background = C.gold + "18"}
                onMouseLeave={e => e.target.style.background = "transparent"}>
                Hafızaya Kaydet
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="overlay" onClick={() => { setShowModal(false); setOverwriteConfirm(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: "4px", padding: "26px", width: "100%", maxWidth: "380px" }}>
            {overwriteConfirm !== null ? (
              <>
                <p style={{ fontSize: "10px", letterSpacing: "3px", color: C.red, textTransform: "uppercase", margin: "0 0 10px" }}>Üzerine Yazılacak</p>
                <p style={{ fontSize: "13px", color: C.textMid, margin: "0 0 20px", lineHeight: 1.6 }}>
                  Kanal {overwriteConfirm + 1}'de "<strong style={{ color: C.text }}>{channels[overwriteConfirm].title}</strong>" kayıtlı. Üzerine yazılsın mı?
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <Btn onClick={() => setOverwriteConfirm(null)} color={C.textDim} border={C.border}>Geri</Btn>
                  <Btn onClick={() => saveToChannel(overwriteConfirm)} color={C.red} border={C.red + "88"}>Üzerine Yaz</Btn>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: "10px", letterSpacing: "3px", color: C.textDim, textTransform: "uppercase", margin: "0 0 14px" }}>Kanal Seç</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
                  {channels.map((ch, i) => (
                    <button key={i} onClick={() => handleChannelSelect(i)}
                      style={{ background: C.bg, border: "1px solid " + (ch ? C.gold + "66" : C.border), borderRadius: "3px", padding: "12px 6px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", textAlign: "center" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
                      onMouseLeave={e => e.currentTarget.style.borderColor = ch ? C.gold + "66" : C.border}>
                      <div style={{ fontSize: "9px", letterSpacing: "2px", color: ch ? C.gold : C.textFaint, textTransform: "uppercase", marginBottom: "3px" }}>K{i + 1}</div>
                      <div style={{ fontSize: "9px", color: ch ? C.textDim : C.textFaint }}>{ch ? ch.title.slice(0, 14) + (ch.title.length > 14 ? "…" : "") : "Boş"}</div>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "10px", color: C.textFaint, margin: "12px 0 0" }}>Dolu kanala tıklarsan onay istenir.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBlock({ label, value, maxChars, copied, onCopy, onChange, onRegen, regenLoading, C }) {
  const charCount = value.length;
  const over = charCount > maxChars;
  const ratio = charCount / maxChars;
  const barColor = over ? C.red : ratio > 0.85 ? C.amber : C.green;
  return (
    <div style={{ background: C.surface, border: "1px solid " + (over ? C.red + "66" : C.border), borderRadius: "4px", padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "10px", letterSpacing: "3px", color: C.textDim, textTransform: "uppercase" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={onRegen} disabled={regenLoading}
            style={{ background: "transparent", border: "1px solid " + C.border, color: regenLoading ? C.textFaint : C.textDim, borderRadius: "2px", padding: "4px 10px", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "inherit", cursor: regenLoading ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { if (!regenLoading) e.target.style.borderColor = C.gold; }}
            onMouseLeave={e => e.target.style.borderColor = C.border}>
            {regenLoading ? <span className="pulse">↻</span> : "↻ Yenile"}
          </button>
          <span style={{ fontSize: "11px", color: over ? C.red : C.textFaint, fontFeatureSettings: "'tnum'" }}>{charCount} / {maxChars}</span>
          <button onClick={onCopy}
            style={{ background: copied ? C.green + "22" : "transparent", border: "1px solid " + (copied ? C.green : C.border), color: copied ? C.green : C.textFaint, borderRadius: "2px", padding: "4px 12px", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}>
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={label === "Başlık" ? 2 : 4}
        style={{ width: "100%", background: C.bg, border: "1px solid " + (over ? C.red + "88" : C.borderLight), borderRadius: "3px", color: C.text, fontSize: "14px", lineHeight: "1.65", padding: "10px 12px", resize: "vertical", fontFamily: "inherit", marginBottom: "10px", transition: "border-color 0.2s" }}
        onFocus={e => e.target.style.borderColor = C.gold + "88"}
        onBlur={e => e.target.style.borderColor = over ? C.red + "88" : C.borderLight}
      />
      <div style={{ height: "2px", background: C.border, borderRadius: "1px" }}>
        <div style={{ height: "100%", width: Math.min(ratio * 100, 100) + "%", background: barColor, borderRadius: "1px", transition: "width 0.4s,background 0.3s" }} />
      </div>
    </div>
  );
}

function Btn({ onClick, color, border, children }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", border: "1px solid " + border, color, borderRadius: "2px", padding: "8px 16px", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
      {children}
    </button>
  );
}
