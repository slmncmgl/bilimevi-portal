import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets"; 

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const PERSONNEL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Personel`;
const ID_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=ID`;
const PIPELINE_CONFIG = {
  bilimevi: { id: 31227, name: "Bilimevi",       stageId: 217285, stageName: "Yeni Data",  subSource: "bilimevi"    },
  premium:  { id: 31167, name: "Premium Vize",  stageId: 216852, stageName: "Yeni Data",  subSource: "premiumvize" },
  fortis:   { id: 31228, name: "Fortis Abroad", stageId: 217289, stageName: "New Data",   subSource: "fortis"      },
};

export default function InstagramDM() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [allOwners, setAllOwners] = useState([]);

  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const dropRef = useRef(null);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+90");
  const [countryCode, setCountryCode] = useState("TR");
  const [email, setEmail] = useState("");
  const [dialogue, setDialogue] = useState("");
  const [note, setNote] = useState("");

  const [pipeline, setPipeline] = useState(null);
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [skipOwner, setSkipOwner] = useState(false);
  const [yurtdisiLise, setYurtdisiLise] = useState(false);

  const [crmLoading, setCrmLoading] = useState(false);
  const [crmDone, setCrmDone] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
    loadOwners();
  }, []);

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      const cols = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      cols.push(cur.trim());
      return cols;
    });
  }

  async function loadOwners() {
    try {
      const [persResp, idResp] = await Promise.all([fetch(PERSONNEL_URL), fetch(ID_URL)]);
      if (!persResp.ok || !idResp.ok) throw new Error("Personel listesi okunamadı");
      const persRows = parseCSV(await persResp.text()).slice(1);
      const idRows = parseCSV(await idResp.text()).slice(1);
      const emailToId = {};
      idRows.forEach(row => {
        const email = (row[0] || '').toLowerCase().trim();
        const id = parseInt((row[1] || '').trim(), 10);
        if (email && !isNaN(id)) emailToId[email] = id;
      });
      const ownerList = [];
      persRows.forEach(row => {
        const name = (row[0] || '').trim();
        const company = (row[1] || '').trim();
        const email = (row[8] || '').toLowerCase().trim();
        const ownerId = emailToId[email];
        if (name && company && ownerId) ownerList.push({ name, company, email, ownerId });
      });
      setAllOwners(ownerList);
      console.log(`✅ ${ownerList.length} danışman yüklendi`);
    } catch (err) {
      console.error("Personel yükleme hatası:", err);
      setStatus({ type: "error", msg: "⚠️ Danışman listesi yüklenemedi" });
    }
  }

  function handleFiles(newFiles) {
    const arr = Array.from(newFiles).filter(f => f.type.startsWith("image/"));
    if (!arr.length) return;
    setFiles(prev => [...prev, ...arr]);
    analyzeImages(arr);
  }

  function onFileChange(e) { handleFiles(e.target.files); e.target.value = ""; }

  function handleDrop(e) {
    e.preventDefault(); setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items || [];
    const imgs = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) imgs.push(item.getAsFile());
    }
    if (imgs.length) handleFiles(imgs);
  }

  async function analyzeImages(newFiles) {
    setAiLoading(true);
    setStatus({ type: "info", msg: "Görseller analiz ediliyor..." });

    try {
      const parts = [
        {
          text: `Instagram DM ekran görüntüsünü analiz et. Sadece MESAJLAŞMAYI ayıkla.

KURALLAR:
1. Müşteri İsmi: Profil başlığından veya mesajlardan ("Merhaba Ahmet" gibi) al
2. Telefon:
   - Ülke kodunu (dialCode) ve numarayı AYRI ver
   - Türkiye (+90): "05331234567" → dialCode: "+90", countryCode: "TR", phone: "5331234567" (başındaki 0 olmadan)
   - Yabancı (+52 vb.): dialCode: "+52", countryCode: "MX", phone: sadece ülke kodu olmadan rakamlar
   - Ülke kodu yoksa ve 0 ile başlıyorsa Türkiye say
3. Email: Mesajlarda geçen email adreslerini al
4. Mesaj Akışı: 
   - SADECE mesajları yaz, form bilgisi/zaman damgası/link ekleme
   - Her mesajı "A: [mesaj]" veya "B: [mesaj]" formatında yaz
   - Her mesaj yeni satırda
   - Konuşmacı değişince boş satır ekle

JSON formatında döndür:
{
  "customerName": "müşteri adı",
  "phone": "telefon (ülke kodu olmadan)",
  "dialCode": "+90",
  "countryCode": "TR",
  "email": "email",
  "dialogue": "A: ...\nB: ..."
}

Form bilgisi, kayıt numarası, tarih, saat, web sitesi gibi bilgileri dialogue'a EKLEME!`
        }
      ];

      for (const file of newFiles) {
        const b64 = await fileToBase64(file);
        parts.push({ inlineData: { mimeType: file.type, data: b64.split(",")[1] } });
      }

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gemini API hatası");

      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.customerName) setCustomerName(parsed.customerName);
      if (parsed.phone) setPhone(cleanPhone(parsed.phone, parsed.dialCode));
      if (parsed.dialCode) setDialCode(parsed.dialCode);
      if (parsed.countryCode) setCountryCode(parsed.countryCode);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.dialogue) setDialogue(prev => prev ? prev + "\n\n---\n\n" + parsed.dialogue : parsed.dialogue);

      setStatus({ type: "success", msg: `${newFiles.length} görsel analiz edildi` });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", msg: "Analiz başarısız: " + err.message });
    }
    setAiLoading(false);
  }

  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function cleanPhone(raw, dialCode) {
    let cleaned = raw.replace(/\D/g, "");
    if (!dialCode || dialCode === "+90") {
      if (cleaned.startsWith("90") && cleaned.length === 12) cleaned = cleaned.substring(2);
      else if (cleaned.startsWith("0") && cleaned.length === 11) cleaned = cleaned.substring(1);
      if (cleaned.length > 10) cleaned = cleaned.slice(-10);
    }
    return cleaned;
  }

  async function selectPipeline(key) {
    setPipeline(key);
    setSelectedOwner("");
    setCrmDone(false);
    setOwnersLoading(true);
    const companyMap = { bilimevi: 'bilimevi', premium: 'premium vize', fortis: 'fortis' };
    const filter = companyMap[key] || '';
    const filtered = allOwners.filter(o => o.company.toLowerCase().includes(filter));
    setOwners(filtered);
    setOwnersLoading(false);
  }

  async function sendToCRM() {
    if (!pipeline) { setStatus({ type: "error", msg: "Lütfen pipeline seçin" }); return; }
    if (!skipOwner && !selectedOwner) { setStatus({ type: "error", msg: "Lütfen danışman seçin" }); return; }
    setCrmLoading(true);
    try {
      const cfg = PIPELINE_CONFIG[pipeline];
      const cleanedPhone = cleanPhone(phone, dialCode);
      const payload = {
        firstName: customerName || "Bilinmeyen Müşteri",
        emails: email ? [{ type: "OFFICE", value: email, primary: true }] : [],
        phoneNumbers: cleanedPhone ? [{ type: "MOBILE", code: countryCode, dialCode: dialCode, value: cleanedPhone, primary: true }] : [],
        source: 2614515,
        subSource: yurtdisiLise ? "Yurtdisilise" : cfg.subSource,
        ...(skipOwner ? {} : { ownerId: Number(selectedOwner) }),
        pipeline: { id: cfg.id, name: cfg.name, stage: { id: cfg.stageId, name: cfg.stageName } }
      };

      const leadRes = await fetch("/api/kylas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "leads", method: "POST", body: payload })
      });
      const leadData = await leadRes.json();
      if (!leadRes.ok) throw new Error(leadData.message || "Lead oluşturulamadı");
      const leadId = leadData.id;

      const sendNote = async (text) => {
        if (!text.trim()) return;
        await fetch("/api/kylas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "notes/relation",
            method: "POST",
            body: {
              sourceEntity: { description: text.replace(/\n/g, "<br>") },
              targetEntityId: Number(leadId),
              targetEntityType: "LEAD"
            }
          })
        });
      };

      await sendNote(dialogue);
      await new Promise(r => setTimeout(r, 800));
      await sendNote(note);

      setStatus({ type: "success", msg: "Kylas CRM'e başarıyla aktarıldı 🎉" });
      setCrmDone(true);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", msg: "CRM hatası: " + err.message });
    }
    setCrmLoading(false);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {});
    setStatus({ type: "success", msg: "Panoya kopyalandı" });
  }

  function reset() {
    setFiles([]); setCustomerName(""); setPhone(""); setDialCode("+90"); setCountryCode("TR"); setEmail("");
    setDialogue(""); setNote(""); setPipeline(null); setOwners([]);
    setSelectedOwner(""); setSkipOwner(false); setCrmDone(false); setStatus(null);
    setYurtdisiLise(false);
  }

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div style={s.root} onPaste={handlePaste}>
      <div style={s.bgGrid} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerLeft}>
            <button onClick={() => navigate("/dashboard")} style={s.backBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <span style={s.headerSep} data-header-sep>·</span>
            <span style={s.headerTitle} data-header-title>Instagram DM Takibi</span>
          </div>
          <div style={s.headerRight}>
            <div style={s.userChip}>
              <div style={s.userDot} />
              {user?.name}
            </div>
            <button onClick={() => navigate("/")} style={s.logoutBtn}>Çıkış</button>
          </div>
        </div>
      </header>

      <main style={s.main}>
        <div data-grid style={s.grid}>

          <div style={s.leftCol}>

            <div style={s.card}>
              <div style={s.sectionLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                Ekran Görüntüleri
              </div>
              <div
                ref={dropRef}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                style={{ ...s.dropZone, borderColor: isDragOver ? "#2563eb" : "#e2e8f0", background: isDragOver ? "#eff6ff" : "#f8fafc" }}
              >
                <input type="file" accept="image/*" multiple onChange={onFileChange}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
                {aiLoading ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={s.spinner} />
                    <p style={{ fontSize: "13px", color: "#2563eb", fontWeight: "600", margin: "10px 0 0" }}>Analiz ediliyor...</p>
                  </div>
                ) : files.length > 0 ? (
                  <div style={{ width: "100%" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "10px" }}>
                      {files.slice(0, 6).map((f, i) => (
                        <div key={i} style={{ borderRadius: "8px", overflow: "hidden", aspectRatio: "1", background: "#f1f5f9" }}>
                          <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }}>{files.length} görsel yüklendi</p>
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={s.uploadIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={isDragOver ? "#2563eb" : "#94a3b8"} strokeWidth="2" width="24" height="24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#475569", margin: "0 0 4px" }}>Görsel yükle veya yapıştır</p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Ctrl+V · Sürükle · Tıkla</p>
                  </div>
                )}
              </div>
              {files.length > 0 && (
                <button onClick={reset} style={s.clearBtn}>Temizle</button>
              )}
            </div>

            <div style={s.card}>
              <div style={s.sectionLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Pipeline
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[
                  { key: "bilimevi", label: "🎓 Bilimevi" },
                  { key: "premium",  label: "✈️ Premium Vize" },
                  { key: "fortis",   label: "🌍 Fortis" },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => selectPipeline(key)}
                    style={{ ...s.pipelineBtn, ...(pipeline === key ? s.pipelineBtnActive : {}) }}>
                    {label}
                  </button>
                ))}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "12px" }}>
                <input
                  type="checkbox"
                  checked={yurtdisiLise}
                  onChange={e => setYurtdisiLise(e.target.checked)}
                  style={{ width: "15px", height: "15px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "13px", color: "#475569", fontWeight: "500" }}>🏫 Yurtdışı Lise</span>
              </label>
            </div>

            <div style={s.card}>
              <div style={s.sectionLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Danışman
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
                <input type="checkbox" checked={skipOwner} onChange={e => setSkipOwner(e.target.checked)}
                  style={{ width: "15px", height: "15px", cursor: "pointer" }} />
                <span style={{ fontSize: "13px", color: "#475569" }}>Danışman seçmeden gönder</span>
              </label>
              {!skipOwner && (
                ownersLoading ? (
                  <p style={{ fontSize: "12px", color: "#94a3b8" }}>⏳ Yükleniyor...</p>
                ) : (
                  <select value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)} style={s.select}>
                    <option value="">{pipeline ? "— Danışman seçin —" : "— Önce pipeline seçin —"}</option>
                    {owners.map((o, i) => <option key={o.ownerId || i} value={o.ownerId}>{o.name}</option>)}
                  </select>
                )
              )}
            </div>

          </div>

          <div style={s.rightCol}>

            <div style={s.card}>
              <div style={s.sectionLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Müşteri İsmi
              </div>
              <div style={{ position: "relative" }}>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="İsim ayıklanacak..." style={s.input} />
                <button onClick={() => copyText(customerName)} style={s.copyBtn} title="Kopyala">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="14" height="14">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            </div>

            <div data-contact-grid style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={s.card}>
                <div style={s.sectionLabel}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Telefon
                </div>
                <div style={{ position: "relative" }}>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xx..." style={s.input} />
                  <button onClick={() => copyText(phone)} style={s.copyBtn} title="Kopyala">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="14" height="14">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div style={s.card}>
                <div style={s.sectionLabel}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  E-posta
                </div>
                <div style={{ position: "relative" }}>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@mail.com" style={s.input} />
                  <button onClick={() => copyText(email)} style={s.copyBtn} title="Kopyala">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="14" height="14">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={s.sectionLabel}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Mesaj Akışı
                </div>
                <button onClick={() => copyText(dialogue)} style={s.miniCopyBtn}>Kopyala</button>
              </div>
              <textarea value={dialogue} onChange={e => setDialogue(e.target.value)}
                placeholder="Mesajlar burada görünecek..."
                style={{ ...s.textarea, height: "160px" }} />
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={s.sectionLabel}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="15" height="15">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Danışman Notu
                </div>
                <button onClick={() => copyText(note)} style={s.miniCopyBtn}>Kopyala</button>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="CRM için özel notlarınızı ekleyin..."
                style={{ ...s.textarea, height: "100px" }} />
            </div>

            <button onClick={sendToCRM} disabled={crmLoading || crmDone}
              style={{
                ...s.submitBtn,
                background: crmDone ? "#059669" : "#0f172a",
                opacity: (crmLoading || crmDone) ? 0.85 : 1,
                cursor: (crmLoading || crmDone) ? "not-allowed" : "pointer",
              }}
            >
              {crmLoading ? (
                <><div style={{ ...s.spinner, width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Gönderiliyor...</>
              ) : crmDone ? (
                <>✅ Gönderildi</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  CRM'e Gönder
                </>
              )}
            </button>

          </div>
        </div>
      </main>

      {status && (
        <div style={{ ...s.toast, background: status.type === "error" ? "#fef2f2" : status.type === "info" ? "#eff6ff" : "#fff", borderColor: status.type === "error" ? "#fecaca" : status.type === "info" ? "#bfdbfe" : "#bfdbfe", color: status.type === "error" ? "#dc2626" : "#1e3a5f" }}>
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
        textarea:focus, input:focus { outline: none; border-color: #2563eb !important; }
        select:focus { outline: none; border-color: #2563eb; }
        button:hover { opacity: 0.88; }
        
        [data-grid] { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 1024px) { [data-grid] { grid-template-columns: 340px 1fr; } }
        
        [data-contact-grid] { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) { [data-contact-grid] { grid-template-columns: 1fr 1fr; } }
        
        @media (max-width: 640px) {
          [data-header-title] { font-size: 12px !important; }
          [data-header-sep] { display: none; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "1000px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  headerSep: { color: "#cbd5e1", fontSize: "14px" },
  headerTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  userChip: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" },
  userDot: { width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" },
  logoutBtn: { padding: "7px 14px", background: "none", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  main: { maxWidth: "1000px", margin: "0 auto", padding: "32px 24px 64px", position: "relative", zIndex: 1 },
  grid: { gap: "20px", alignItems: "start" },
  leftCol: { display: "flex", flexDirection: "column", gap: "16px" },
  rightCol: { display: "flex", flexDirection: "column", gap: "16px" },
  card: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionLabel: { display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" },
  dropZone: { position: "relative", border: "2px dashed", borderRadius: "12px", padding: "24px 16px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "140px", transition: "all 0.2s", cursor: "pointer" },
  uploadIcon: { width: "44px", height: "44px", background: "#fff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", margin: "0 auto 10px" },
  clearBtn: { marginTop: "8px", width: "100%", padding: "7px", background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", color: "#94a3b8", cursor: "pointer", fontFamily: "inherit" },
  pipelineBtn: { padding: "10px 6px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "12px", fontWeight: "600", color: "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" },
  pipelineBtnActive: { background: "#eff6ff", border: "1.5px solid #2563eb", color: "#1d4ed8" },
  select: { width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontFamily: "inherit", color: "#0f172a", background: "#fff", cursor: "pointer" },
  input: { width: "100%", padding: "10px 38px 10px 12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit", color: "#0f172a", boxSizing: "border-box", transition: "border-color 0.2s" },
  copyBtn: { position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" },
  miniCopyBtn: { fontSize: "11px", fontWeight: "600", color: "#2563eb", background: "#eff6ff", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  textarea: { width: "100%", padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontFamily: "inherit", color: "#0f172a", resize: "vertical", boxSizing: "border-box", lineHeight: "1.6", transition: "border-color 0.2s" },
  submitBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "14px", color: "#fff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", fontFamily: "inherit", transition: "all 0.2s" },
  spinner: { display: "inline-block", width: "18px", height: "18px", border: "2px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  toast: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", border: "1.5px solid", padding: "14px 24px", borderRadius: "14px", fontSize: "13px", fontWeight: "600", boxShadow: "0 4px 24px rgba(30,58,95,0.13)", display: "flex", alignItems: "center", gap: "10px", fontFamily: "inherit", zIndex: 9999, pointerEvents: "none", animation: "fadeUp 0.2s ease" },
};
