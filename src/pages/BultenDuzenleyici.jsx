 


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFE2HP-e8qRc_01_5rKAOX8UEoUZTkBYdEnHpJyCXszLxxYqLU-qU0RNV4vu7n7Mlq/exec";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const extractUrls = (text) => text.match(URL_REGEX) || [];
const stripUrls = (text) => text.replace(URL_REGEX, "").replace(/\s{2,}/g, " ").trim();

export default function BultenDuzenleyici() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [detectedUrls, setDetectedUrls] = useState([]);
  const [result, setResult] = useState(null); // { title, content, urls }
  const [loading, setLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState({ title: false, content: false });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error"|"info", msg }

  // 8 kanal hafıza (in-memory)
  const [channels, setChannels] = useState(Array(8).fill(null));
  const [showModal, setShowModal] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [copied, setCopied] = useState({ title: false, content: false, link: false });

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);

    // requestAnimationFrame ile skeleton'ın DOM'a yansımasını bekle, sonra fetch başlat
    requestAnimationFrame(() => {
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
            updated[idx] = {
              title: h.title,
              content: h.content,
              urls: h.url ? [h.url] : [],
              date: "",
              fromSheet: true
            };
          }
        });
        setChannels(updated);
      })
      .catch(() => {})
      .finally(() => setChannelsLoading(false));
    });
  }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, [status]);

  // ── Input ──────────────────────────────────────────────────────
  function handleInput(e) {
    setInput(e.target.value);
    setDetectedUrls(extractUrls(e.target.value));
  }

  // ── URL'den Özetle ────────────────────────────────────────────
  const URL_FETCH_SCRIPT = "https://script.google.com/macros/s/AKfycbwueCJrClXEVORShyqVCJ-Qo8hA4Qv0w5VP1ub-S7nPJLEdponzpKRepdEfUEW9Nfev/exec";

  async function summarizeFromUrl() {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setStatus({ type: "info", msg: "Sayfa çekiliyor..." });
    setResult(null);
    setActiveChannel(null);
    try {
      const res = await fetch(URL_FETCH_SCRIPT, {
        method: "POST",
        body: JSON.stringify({ action: "bultenUrlOzetle", url: urlInput.trim() })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.msg || "Hata");
      if (!json.data || !json.data.title) throw new Error("Geçersiz yanıt: " + JSON.stringify(json));
      const { title, content } = json.data;
      setResult({ title, content, urls: [urlInput.trim()] });
      setStatus({ type: "success", msg: "Özet hazır" });
    } catch (err) {
      setStatus({ type: "error", msg: "Hata: " + err.message });
    } finally {
      setUrlLoading(false);
    }
  }

  // ── Özetle (Apps Script üzerinden) ────────────────────────────
  async function summarize() {
    if (!input.trim()) return;
    setLoading(true);
    setStatus({ type: "info", msg: "Özetleniyor..." });
    setResult(null);
    setActiveChannel(null);
    try {
      const textOnly = stripUrls(input) || input;
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "bultenOzetle", metin: textOnly })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.msg || "Hata");
      const { title, content } = json.data;
      setResult({ title, content, urls: extractUrls(input) });
      setStatus({ type: "success", msg: "Özet hazır" });
    } catch (err) {
      setStatus({ type: "error", msg: "Hata: " + err.message });
    }
    setLoading(false);
  }

  // ── Tek alan yenile ───────────────────────────────────────────
  async function regenField(field) {
    if (!result) return;
    setRegenLoading(r => ({ ...r, [field]: true }));
    try {
      const sourceUrl = result.urls?.[0] || "";
      let res, json;

      if (sourceUrl) {
        // URL varsa URL'den yeniden çek
        res = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "bultenUrlOzetle", url: sourceUrl })
        });
        json = await res.json();
        if (!json.success || !json.data) throw new Error(json.msg || "Hata");
      } else {
        // URL yoksa mevcut title+content'i metin olarak gönder
        const metin = result.title + " " + result.content;
        res = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "bultenOzetle", metin })
        });
        json = await res.json();
        if (!json.success) throw new Error(json.msg || "Hata");
      }

      if (field === "title" && json.data.title) setResult(r => ({ ...r, title: json.data.title }));
      if (field === "content" && json.data.content) setResult(r => ({ ...r, content: json.data.content }));
    } catch (_) {}
    setRegenLoading(r => ({ ...r, [field]: false }));
  }

  // ── Sheet'e Kaydet ────────────────────────────────────────────
  async function saveToSheet() {
    if (!result) return;
    setSaving(true);
    setStatus({ type: "info", msg: "Sheet'e kaydediliyor..." });
    try {
      const payload = {
        action: "bultenKaydet",
        baslik: result.title,
        ozet: result.content,
        url: result.urls?.[0] || "",
        slot: activeChannel !== null ? activeChannel : undefined
      };
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.msg || "Kayıt hatası");
      setStatus({ type: "success", msg: `Sheet'e kaydedildi (satır ${json.satir})` });
    } catch (err) {
      setStatus({ type: "error", msg: "Kayıt hatası: " + err.message });
    }
    setSaving(false);
  }

  // ── Kopyala ───────────────────────────────────────────────────
  function copyField(field, text) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(c => ({ ...c, [field]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [field]: false })), 2000);
  }

  // ── Temizle ───────────────────────────────────────────────────
  function clearAll() {
    setInput(""); setDetectedUrls([]); setResult(null);
    setActiveChannel(null); setStatus(null);
    setCopied({ title: false, content: false, link: false });
  }

  // ── Kanal hafıza ─────────────────────────────────────────────
  function loadChannel(idx) {
    if (!channels[idx]) {
      // Boş kanal — eğer mevcut sonuç varsa oraya kaydet
      if (result) saveToChannel(idx);
      return;
    }
    // Dolu kanal — aktif olarak işaretle, içeriği yükle
    setResult({ title: channels[idx].title, content: channels[idx].content, urls: channels[idx].urls || [] });
    setActiveChannel(idx);
    setCopied({ title: false, content: false, link: false });
  }

  function handleSaveClick() { setOverwriteConfirm(null); setShowModal(true); }

  function handleChannelSelect(idx) {
    if (channels[idx]) { setOverwriteConfirm(idx); return; }
    saveToChannel(idx);
  }

  function saveToChannel(idx) {
    const entry = {
      title: result.title, content: result.content, urls: result.urls || [],
      date: new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }),
    };
    const updated = [...channels]; updated[idx] = entry;
    setChannels(updated); setActiveChannel(idx);
    setShowModal(false); setOverwriteConfirm(null);
  }

  function clearChannel(idx, e) {
    e.stopPropagation();
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

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerLeft}>
            <button onClick={() => navigate("/dashboard")} style={s.backBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <span style={s.headerSep}>·</span>
            <span style={s.headerTitle}>Bülten Düzenleyici</span>
          </div>
          <div style={s.headerRight}>
            <div style={s.userChip}><div style={s.userDot} />{user?.name}</div>
            <button onClick={() => navigate("/")} style={s.logoutBtn}>Çıkış</button>
          </div>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.grid}>

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
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "9px 12px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#1e3a5f",
                    outline: "none",
                    fontFamily: "inherit",
                    background: "#fff"
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
                    ? <><div style={s.spinner} /> Çekiliyor...</>
                    : <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                        Özetle
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {channelsLoading
                  ? Array(8).fill(null).map((_, i) => (
                      <div key={i} style={{
                        ...s.channelBtn,
                        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.4s infinite",
                        border: "1.5px solid #e2e8f0",
                        height: "56px"
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
                    {ch && (
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

            {/* Başlık */}
            <div style={{ ...s.card, borderColor: result && result.title.length > 50 ? "#fca5a5" : "#e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={s.sectionLabel}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                        <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/>
                      </svg>
                      Başlık
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => regenField("title")} disabled={regenLoading.title || !result} style={s.regenBtn}>
                        {regenLoading.title ? <div style={{ ...s.spinner, width: "11px", height: "11px", border: "1.5px solid #e2e8f0", borderTopColor: "#2563eb" }} /> : "↻ Yenile"}
                      </button>
                      <button onClick={() => copyField("title", result?.title || "")} style={{ ...s.miniCopyBtn, background: copied.title ? "#dcfce7" : "#eff6ff", color: copied.title ? "#16a34a" : "#2563eb" }}>
                        {copied.title ? "✓ Kopyalandı" : "Kopyala"}
                      </button>
                    </div>
                  </div>
              <textarea value={result?.title || ""} onChange={e => result && setResult(r => ({ ...r, title: e.target.value }))}
                rows={2} style={{ ...s.textarea, color: result ? "#0f172a" : "#94a3b8" }} />
              {result && <CharBar value={result.title} max={50} />}
                </div>

            {/* Haber Özeti */}
            <div style={{ ...s.card, borderColor: result && result.content.length > 200 ? "#fca5a5" : "#e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={s.sectionLabel}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                        <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="14" y2="14"/>
                      </svg>
                      Haber Özeti
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => regenField("content")} disabled={regenLoading.content || !result} style={s.regenBtn}>
                        {regenLoading.content ? <div style={{ ...s.spinner, width: "11px", height: "11px", border: "1.5px solid #e2e8f0", borderTopColor: "#2563eb" }} /> : "↻ Yenile"}
                      </button>
                      <button onClick={() => copyField("content", result?.content || "")} style={{ ...s.miniCopyBtn, background: copied.content ? "#dcfce7" : "#eff6ff", color: copied.content ? "#16a34a" : "#2563eb" }}>
                        {copied.content ? "✓ Kopyalandı" : "Kopyala"}
                      </button>
                    </div>
                  </div>
              <textarea value={result?.content || ""} onChange={e => result && setResult(r => ({ ...r, content: e.target.value }))}
                rows={4} style={{ ...s.textarea, color: result ? "#0f172a" : "#94a3b8" }} />
              {result && <CharBar value={result.content} max={200} />}
                </div>

            {/* Linkler */}
            {result && result.urls && result.urls.length > 0 && (
                  <div style={s.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={s.sectionLabel}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        {result.urls.length > 1 ? `Kaynak Linkler (${result.urls.length})` : "Kaynak Link"}
                      </div>
                      {result.urls.length === 1 && (
                        <button onClick={() => copyField("link", result.urls[0])} style={{ ...s.miniCopyBtn, background: copied.link ? "#dcfce7" : "#eff6ff", color: copied.link ? "#16a34a" : "#2563eb" }}>
                          {copied.link ? "✓ Kopyalandı" : "Kopyala"}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {result.urls.map((url, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, fontSize: "12px", color: "#2563eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</a>
                          {result.urls.length > 1 && (
                            <button onClick={() => copyField("link", url)} style={{ ...s.miniCopyBtn, fontSize: "10px" }}>Kopyala</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

            {/* Aksiyon butonları */}
            <div style={{ display: "flex", gap: "10px" }}>
              {result && activeChannel === null && (
                <button onClick={handleSaveClick} style={{ ...s.secondaryBtn, flex: 1 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Hafızaya Kaydet
                </button>
              )}
              <button onClick={saveToSheet} disabled={saving || activeChannel === null} style={{
                ...s.primaryBtn, flex: 1,
                opacity: (saving || activeChannel === null) ? 0.4 : 1,
                cursor: (saving || activeChannel === null) ? "not-allowed" : "pointer"
              }}>
                {saving
                  ? <><div style={s.spinner} /> Kaydediliyor...</>
                  : <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Sheet'e Kaydet
                    </>
                }
              </button>
            </div>

          </div>
        </div>
      </main>

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
                      style={{ ...s.channelBtn, borderColor: ch?.fromSheet ? "#86efac" : ch ? "#bfdbfe" : "#e2e8f0", background: ch?.fromSheet ? "#f0fdf4" : "#fff" }}>
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
          borderColor: status.type === "error" ? "#fecaca" : status.type === "success" ? "#bfdbfe" : "#bfdbfe",
          color: status.type === "error" ? "#dc2626" : "#1e3a5f"
        }}>
          {status.type === "success" && <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>}
          {status.type === "error"   && <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          {status.type === "info"    && <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          <span style={{ fontSize: "13px", fontWeight: "600" }}>{status.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        textarea:focus, input:focus { outline: none; border-color: #2563eb !important; }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "Calibri, 'Sora', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },

  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "960px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, sans-serif" },
  headerSep: { color: "#cbd5e1", fontSize: "14px" },
  headerTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  userChip: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" },
  userDot: { width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" },
  logoutBtn: { padding: "7px 14px", background: "none", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, sans-serif" },

  main: { maxWidth: "960px", margin: "0 auto", padding: "32px 24px 64px", position: "relative", zIndex: 1 },
  grid: { display: "flex", flexDirection: "column", gap: "20px" },
  leftCol: { display: "flex", flexDirection: "column", gap: "16px" },
  rightCol: { display: "flex", flexDirection: "column", gap: "16px" },

  card: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeUp 0.3s ease-out" },
  sectionLabel: { display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },

  textarea: { width: "100%", padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontFamily: "Calibri, sans-serif", color: "#0f172a", resize: "vertical", boxSizing: "border-box", lineHeight: "1.6", transition: "border-color 0.2s", background: "#fff" },

  primaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px 18px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "600", fontFamily: "Calibri, sans-serif", cursor: "pointer", transition: "opacity 0.2s" },
  secondaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px 18px", background: "#fff", color: "#1e3a5f", border: "1.5px solid #bfdbfe", borderRadius: "10px", fontSize: "13px", fontWeight: "600", fontFamily: "Calibri, sans-serif", cursor: "pointer" },
  clearBtn: { padding: "10px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "12px", color: "#94a3b8", cursor: "pointer", fontFamily: "Calibri, sans-serif" },
  regenBtn: { display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", color: "#475569", cursor: "pointer", fontFamily: "Calibri, sans-serif" },
  miniCopyBtn: { padding: "4px 10px", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, sans-serif", background: "#eff6ff", color: "#2563eb" },

  channelBtn: { padding: "10px 6px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontFamily: "Calibri, sans-serif", textAlign: "center", transition: "all 0.15s" },

  spinner: { display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },

  toast: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", border: "1.5px solid", padding: "14px 24px", borderRadius: "14px", boxShadow: "0 4px 24px rgba(30,58,95,0.13)", display: "flex", alignItems: "center", gap: "10px", fontFamily: "Calibri, sans-serif", zIndex: 9999, pointerEvents: "none", animation: "fadeUp 0.2s ease" },

  modalCancelBtn: { padding: "8px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", color: "#64748b", cursor: "pointer", fontFamily: "Calibri, sans-serif" },
  modalDangerBtn: { padding: "8px 16px", background: "#dc2626", border: "none", borderRadius: "8px", fontSize: "12px", color: "#fff", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, sans-serif" },
};
