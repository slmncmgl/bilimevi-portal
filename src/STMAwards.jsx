import { useState, useEffect, useMemo, useCallback } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SCRIPT_URL = "BURAYA_APPS_SCRIPT_URL";
const MAIL_SUBJECT = "Vote for Bilimevi – ST Star Awards 2026";

// ─── HELPERS ───────────────────────────────────────────────────────────────
function parseEmails(raw) {
  if (!raw) return [];
  return raw
    .split(/[\s,/]+/)
    .map((e) => e.replace(/[()]/g, "").trim())
    .filter((e) => e.includes("@"));
}

function parseNames(raw) {
  if (!raw) return [];
  const cleaned = raw.replace(/\([^)]*\)/g, "").trim();
  const noPrefix = cleaned.replace(/yeni kontak\s*:/gi, ",").trim();
  return noPrefix
    .split(/[,\-]|and\s/i)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getFirstName(fullName) {
  if (!fullName) return "";
  return capitalizeFirst(fullName.trim().split(/\s+/)[0]);
}

function buildMailBody(template, firstName, countryCode, paragraphs) {
  const para = paragraphs[countryCode] || paragraphs["INT"] || "";
  return template
    .replace("[firstName]", firstName || "")
    .replace("[countryCode]", para);
}

function normalizeKategori(kat) {
  if (!kat) return "INT";
  const k = kat.trim().toUpperCase();
  if (k === "ACA") return "ACA";
  if (k === "UK") return "UK";
  if (k === "US") return "US";
  if (k === "CA") return "CA";
  if (k === "IR") return "IR";
  if (k === "AU") return "AU";
  if (k === "DE") return "DE";
  if (k === "FR") return "FR";
  if (k === "MLT" || k === "ES" || k === "ZA") return k;
  if (k === "DUBAI") return "DUBAI";
  return "INT";
}

// ─── API ───────────────────────────────────────────────────────────────────
async function apiFetch(action, postData = null) {
  const url = `${SCRIPT_URL}?action=${action}`;
  const opts = postData
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      }
    : {};
  const res = await fetch(url, opts);
  return res.json();
}

// ─── ICONS ─────────────────────────────────────────────────────────────────
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconAttach = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// ─── STYLES ────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

  :root {
    --bg: #f8fafc;
    --surface: #ffffff;
    --surface2: #f1f5f9;
    --border: #e2e8f0;
    --accent: #2563eb;
    --accent2: #7c3aed;
    --success: #059669;
    --error: #dc2626;
    --warn: #d97706;
    --text: #0f172a;
    --muted: #94a3b8;
    --font-body: 'Sora', sans-serif;
  }

  .stm-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .stm-root {
    font-family: var(--font-body); background: var(--bg); color: var(--text);
    min-height: 100vh; position: relative;
  }
  .stm-root::before {
    content: ''; position: fixed; inset: 0;
    background-image: linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px);
    background-size: 40px 40px; z-index: 0; pointer-events: none;
  }

  /* HEADER */
  .stm-header {
    position: sticky; top: 0; z-index: 10;
    background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .stm-header-left { display: flex; align-items: center; gap: 12px; }
  .stm-header-back {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border);
    background: transparent; color: var(--muted); font-size: 12px; font-weight: 500;
    cursor: pointer; font-family: var(--font-body); transition: all 0.15s;
    text-decoration: none;
  }
  .stm-header-back:hover { border-color: var(--accent); color: var(--accent); }
  .stm-header-title h1 { font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.4px; }
  .stm-header-title p { font-size: 11px; color: var(--muted); margin-top: 1px; }
  .stm-badge {
    background: linear-gradient(135deg, #fffbeb, #fef3c7);
    border: 1px solid #fde68a;
    color: var(--warn); font-size: 11px; font-weight: 700;
    padding: 4px 10px; border-radius: 20px; letter-spacing: 0.3px;
  }

  /* STATS BAR */
  .stm-stats {
    display: flex; border-bottom: 1px solid var(--border);
    background: var(--surface); position: relative; z-index: 1;
  }
  .stm-stat {
    flex: 1; padding: 12px 20px; border-right: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .stm-stat:last-child { border-right: none; }
  .stm-stat-num { font-size: 20px; font-weight: 700; color: var(--text); }
  .stm-stat-label { font-size: 11px; color: var(--muted); margin-top: 1px; }
  .stm-stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* LAYOUT */
  .stm-layout {
    display: grid; grid-template-columns: 360px 1fr;
    height: calc(100vh - 118px); position: relative; z-index: 1;
  }

  /* LEFT PANEL */
  .stm-left {
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
    background: var(--surface);
  }

  .stm-toolbar {
    padding: 14px 16px; border-bottom: 1px solid var(--border);
    background: var(--surface); display: flex; flex-direction: column; gap: 10px;
  }
  .stm-search-wrap {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 7px 12px;
    transition: border-color 0.15s;
  }
  .stm-search-wrap:focus-within { border-color: var(--accent); }
  .stm-search-wrap input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text); font-size: 13px; font-family: var(--font-body);
  }
  .stm-search-wrap input::placeholder { color: var(--muted); }

  .stm-filters { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .stm-filter-btn {
    padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--border); background: var(--surface2); color: var(--muted);
    cursor: pointer; transition: all 0.15s; font-family: var(--font-body);
  }
  .stm-filter-btn:hover { border-color: var(--accent); color: var(--accent); }
  .stm-filter-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

  .stm-tabs {
    display: flex; border-bottom: 1px solid var(--border);
    background: var(--surface2); overflow-x: auto;
  }
  .stm-tab {
    padding: 8px 14px; font-size: 12px; font-weight: 500; color: var(--muted);
    cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent;
    transition: all 0.15s; flex-shrink: 0; font-family: var(--font-body);
  }
  .stm-tab:hover { color: var(--text); }
  .stm-tab.active { color: var(--accent); border-bottom-color: var(--accent); background: var(--surface); }

  /* SCHOOL LIST */
  .stm-list { flex: 1; overflow-y: auto; background: var(--bg); }
  .stm-list::-webkit-scrollbar { width: 4px; }
  .stm-list::-webkit-scrollbar-track { background: transparent; }
  .stm-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .stm-school-item {
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.1s;
    display: flex; gap: 10px; align-items: flex-start;
    background: var(--surface);
    border-left: 3px solid transparent;
  }
  .stm-school-item:hover { background: #eff6ff; }
  .stm-school-item.selected { background: #eff6ff; border-left-color: var(--accent); }
  .stm-school-item.sent { opacity: 0.55; }

  .stm-school-check {
    width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border);
    flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; cursor: pointer; background: var(--surface);
  }
  .stm-school-check.checked { background: var(--accent); border-color: var(--accent); color: white; }

  .stm-school-info { flex: 1; min-width: 0; }
  .stm-school-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stm-school-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }
  .stm-school-recipients { margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }
  .stm-recipient-tag {
    font-size: 10px; color: var(--muted); display: flex; align-items: center; gap: 4px;
  }
  .stm-recipient-tag span { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .stm-durum {
    font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px;
    flex-shrink: 0; margin-top: 2px;
  }
  .stm-durum.gonderildi { background: #d1fae5; color: var(--success); }
  .stm-durum.hatali { background: #fee2e2; color: var(--error); }

  /* RIGHT PANEL */
  .stm-right {
    display: flex; flex-direction: column; overflow: hidden; background: var(--bg);
  }

  .stm-preview-header {
    padding: 16px 24px; border-bottom: 1px solid var(--border);
    background: var(--surface);
    display: flex; align-items: center; justify-content: space-between;
  }
  .stm-preview-header h3 { font-size: 14px; font-weight: 700; color: var(--text); }
  .stm-preview-header p { font-size: 12px; color: var(--muted); margin-top: 2px; }

  .stm-actions { display: flex; gap: 8px; align-items: center; }

  .stm-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
    cursor: pointer; border: none; font-family: var(--font-body);
    transition: all 0.15s;
  }
  .stm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .stm-btn-primary { background: var(--accent); color: white; box-shadow: 0 1px 3px rgba(37,99,235,0.3); }
  .stm-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
  .stm-btn-secondary { background: var(--surface); color: var(--text); border: 1.5px solid var(--border); }
  .stm-btn-secondary:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .stm-btn-success { background: var(--success); color: white; }
  .stm-btn-success:hover:not(:disabled) { background: #047857; }
  .stm-btn-danger { background: var(--error); color: white; }

  /* PREVIEW AREA */
  .stm-preview-area { flex: 1; overflow-y: auto; padding: 24px; }
  .stm-preview-area::-webkit-scrollbar { width: 4px; }
  .stm-preview-area::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .stm-empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; gap: 12px; color: var(--muted);
  }
  .stm-empty-state svg { opacity: 0.25; }
  .stm-empty-state p { font-size: 14px; }

  /* MAIL PREVIEW CARDS */
  .stm-mail-cards { display: flex; flex-direction: column; gap: 16px; }
  .stm-mail-card {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .stm-mail-card-header {
    padding: 12px 16px; background: var(--surface2); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .stm-mail-card-to { font-size: 12px; color: var(--muted); }
  .stm-mail-card-to strong { color: var(--text); }
  .stm-mail-card-status { font-size: 11px; }
  .stm-mail-body {
    padding: 16px; font-size: 13px; line-height: 1.8; color: var(--text);
    white-space: pre-wrap; word-break: break-word;
  }
  .stm-mail-body-edit {
    width: 100%; background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 10px; color: var(--text); font-family: var(--font-body);
    font-size: 13px; line-height: 1.8; padding: 12px; resize: vertical;
    min-height: 300px; outline: none;
  }
  .stm-mail-body-edit:focus { border-color: var(--accent); }

  /* ATTACHMENT AREA */
  .stm-attachment-area {
    padding: 14px 24px; border-top: 1px solid var(--border);
    background: var(--surface); display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  }
  .stm-attachment-label { font-size: 12px; color: var(--muted); font-weight: 500; }
  .stm-attachment-input {
    flex: 1; background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 7px 12px; color: var(--text);
    font-size: 12px; font-family: var(--font-body); outline: none;
    min-width: 200px; transition: border-color 0.15s;
  }
  .stm-attachment-input:focus { border-color: var(--accent); }
  .stm-attachment-tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .stm-attachment-tag {
    display: flex; align-items: center; gap: 5px;
    background: #eff6ff; border: 1.5px solid #bfdbfe;
    border-radius: 8px; padding: 3px 8px; font-size: 11px; color: var(--accent);
    font-weight: 600;
  }
  .stm-attachment-tag button { background: none; border: none; cursor: pointer; color: var(--accent); padding: 0; display: flex; }

  /* BULK ACTIONS BAR */
  .stm-bulk-bar {
    padding: 10px 16px; border-top: 1px solid var(--border);
    background: #eff6ff; display: flex; align-items: center; gap: 10px;
    border-left: 3px solid var(--accent);
  }
  .stm-bulk-info { font-size: 12px; color: var(--accent); font-weight: 600; flex: 1; }

  /* SENDING OVERLAY */
  .stm-overlay {
    position: fixed; inset: 0; background: rgba(15,23,42,0.5);
    display: flex; align-items: center; justify-content: center; z-index: 999;
    backdrop-filter: blur(4px);
  }
  .stm-overlay-box {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: 20px;
    padding: 32px 40px; text-align: center; min-width: 320px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }
  .stm-overlay-box h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text); }
  .stm-overlay-box p { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
  .stm-progress-bar { height: 6px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .stm-progress-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s; }

  /* LOADING */
  .stm-loading {
    display: flex; align-items: center; justify-content: center;
    height: 100%; flex-direction: column; gap: 12px; color: var(--muted);
  }
  .stm-spinner {
    width: 32px; height: 32px; border: 3px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .stm-layout { grid-template-columns: 1fr; }
    .stm-left { height: 50vh; }
  }
`;

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function STMAwards() {
  const [schools, setSchools] = useState([]);
  const [mailTemplate, setMailTemplate] = useState("");
  const [paragraphs, setParagraphs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [filterDurum, setFilterDurum] = useState("Tümü");
  const [selected, setSelected] = useState(null); // {school, recipientIdx}
  const [checked, setChecked] = useState(new Set()); // school ids

  const [editMode, setEditMode] = useState(false);
  const [editedBody, setEditedBody] = useState("");

  const [attachmentInput, setAttachmentInput] = useState("");
  const [attachments, setAttachments] = useState([]); // [{id, name}]

  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, log: [] });

  // ── LOAD DATA ──
  useEffect(() => {
    async function load() {
      try {
        const [schoolsRes, bodyRes, countryRes] = await Promise.all([
          apiFetch("getSchools"),
          apiFetch("getMailBody"),
          apiFetch("getCountryParagraphs"),
        ]);
        if (schoolsRes.error) throw new Error(schoolsRes.error);
        setSchools(schoolsRes.schools || []);
        setMailTemplate(bodyRes.body || "");
        setParagraphs(countryRes.paragraphs || {});
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── FILTER ──
  const tabs = ["Tümü", "Sayfa1", "Sayfa2", "Sayfa3", "Sayfa4", "Sayfa5", "Sayfa6"];
  const durumFilters = ["Tümü", "Bekliyor", "Gönderildi", "Hatalı"];

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      if (activeTab !== "Tümü" && s.sheetName !== activeTab) return false;
      if (filterDurum === "Bekliyor" && s.portalDurum) return false;
      if (filterDurum === "Gönderildi" && !s.portalDurum?.includes("Gönderildi")) return false;
      if (filterDurum === "Hatalı" && !s.portalDurum?.includes("Hatalı")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.okul?.toLowerCase().includes(q) && !s.temsilci?.toLowerCase().includes(q) && !s.emailRaw?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [schools, activeTab, filterDurum, search]);

  // ── STATS ──
  const stats = useMemo(() => {
    const total = schools.reduce((a, s) => a + s.recipients.length, 0);
    const sent = schools.filter((s) => s.portalDurum?.includes("Gönderildi")).length;
    const err = schools.filter((s) => s.portalDurum?.includes("Hatalı")).length;
    const pending = schools.filter((s) => !s.portalDurum).length;
    return { total, sent, err, pending, schools: schools.length };
  }, [schools]);

  // ── MAIL BODY FOR SELECTED ──
  const getBodyForRecipient = useCallback((school, recipientIdx) => {
    if (!school) return "";
    const r = school.recipients[recipientIdx] || school.recipients[0];
    const code = normalizeKategori(school.kategori);
    return buildMailBody(mailTemplate, r?.firstName || "", code, paragraphs);
  }, [mailTemplate, paragraphs]);

  // ── SELECT SCHOOL ──
  const handleSelectSchool = (school, recipIdx = 0) => {
    setSelected({ school, recipientIdx: recipIdx });
    setEditMode(false);
    setEditedBody(getBodyForRecipient(school, recipIdx));
  };

  // ── CHECK TOGGLE ──
  const toggleCheck = (e, id) => {
    e.stopPropagation();
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleCheckAll = () => {
    if (checked.size === filtered.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(filtered.map((s) => s.id)));
    }
  };

  // ── ADD ATTACHMENT ──
  const addAttachment = () => {
    const trimmed = attachmentInput.trim();
    if (!trimmed) return;
    // Drive file ID veya "id:name" formatı
    const parts = trimmed.split(":");
    const id = parts[0].trim();
    const name = parts[1]?.trim() || id;
    setAttachments((prev) => [...prev, { id, name }]);
    setAttachmentInput("");
  };

  // ── SEND SINGLE ──
  const sendSingle = async () => {
    if (!selected) return;
    const { school, recipientIdx } = selected;
    const r = school.recipients[recipientIdx];
    const body = editMode ? editedBody : getBodyForRecipient(school, recipientIdx);

    setSending(true);
    setSendProgress({ current: 0, total: 1, log: [] });

    const res = await apiFetch("sendMail", {
      to: r.email,
      firstName: r.firstName,
      schoolName: school.okul,
      mailBody: body,
      subject: MAIL_SUBJECT,
      attachmentIds: attachments.map((a) => a.id),
      sheetName: school.sheetName,
      rowIndex: school.rowIndex,
    });

    // Yerel state güncelle
    setSchools((prev) =>
      prev.map((s) =>
        s.id === school.id
          ? { ...s, portalDurum: res.success ? "Gönderildi ✓" : "Hatalı Gönderim ✗" }
          : s
      )
    );

    setSendProgress({
      current: 1,
      total: 1,
      log: [{ to: r.email, success: res.success, error: res.error }],
    });
    setSending(false);
  };

  // ── SEND BULK ──
  const sendBulk = async () => {
    const toSend = filtered.filter((s) => checked.has(s.id));
    if (toSend.length === 0) return;

    // Tüm recipient'ları düzleştir
    const mails = [];
    for (const school of toSend) {
      for (let ri = 0; ri < school.recipients.length; ri++) {
        const r = school.recipients[ri];
        mails.push({
          to: r.email,
          firstName: r.firstName,
          schoolName: school.okul,
          mailBody: getBodyForRecipient(school, ri),
          subject: MAIL_SUBJECT,
          attachmentIds: attachments.map((a) => a.id),
          sheetName: school.sheetName,
          rowIndex: school.rowIndex,
        });
      }
    }

    setSending(true);
    setSendProgress({ current: 0, total: mails.length, log: [] });

    // 10'arlı batch gönder
    const BATCH = 10;
    const log = [];
    for (let i = 0; i < mails.length; i += BATCH) {
      const batch = mails.slice(i, i + BATCH);
      const res = await apiFetch("sendBulk", { mails: batch });
      const results = res.results || [];
      log.push(...results);

      // State güncelle
      for (const r of results) {
        const school = toSend.find((s) => s.recipients.some((rec) => rec.email === r.to));
        if (school) {
          setSchools((prev) =>
            prev.map((s) =>
              s.id === school.id
                ? { ...s, portalDurum: r.success ? "Gönderildi ✓" : "Hatalı Gönderim ✗" }
                : s
            )
          );
        }
      }

      setSendProgress({ current: Math.min(i + BATCH, mails.length), total: mails.length, log });
    }

    setSending(false);
    setChecked(new Set());
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="stm-root">
      <style>{styles}</style>
      <div className="stm-loading" style={{ height: "100vh" }}>
        <div className="stm-spinner" />
        <p>Veriler yükleniyor...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="stm-root">
      <style>{styles}</style>
      <div className="stm-loading" style={{ height: "100vh", color: "#dc2626" }}>
        <p>Hata: {error}</p>
        <p style={{ fontSize: 12, color: "#94a3b8" }}>SCRIPT_URL'yi kontrol edin</p>
      </div>
    </div>
  );

  const selectedBody = selected
    ? (editMode ? editedBody : getBodyForRecipient(selected.school, selected.recipientIdx))
    : "";

  return (
    <div className="stm-root">
      <style>{styles}</style>

      {/* SENDING OVERLAY */}
      {sending && (
        <div className="stm-overlay">
          <div className="stm-overlay-box">
            <h3>Mailler Gönderiliyor</h3>
            <p>{sendProgress.current} / {sendProgress.total} tamamlandı</p>
            <div className="stm-progress-bar">
              <div
                className="stm-progress-fill"
                style={{ width: `${sendProgress.total ? (sendProgress.current / sendProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="stm-header">
        <div className="stm-header-left">
          <a href="/dashboard" className="stm-header-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Dashboard
          </a>
          <div className="stm-header-title">
            <h1>STM Star Awards 2026</h1>
            <p>Toplu E-posta Gönderim · Gönderen: Memet Can Kılıç</p>
          </div>
        </div>
        <span className="stm-badge">⭐ EASTERN EUROPE</span>
      </div>

      {/* STATS */}
      <div className="stm-stats">
        <div className="stm-stat">
          <div className="stm-stat-dot" style={{ background: "var(--accent)" }} />
          <div>
            <div className="stm-stat-num">{stats.schools}</div>
            <div className="stm-stat-label">Toplam Okul</div>
          </div>
        </div>
        <div className="stm-stat">
          <div className="stm-stat-dot" style={{ background: "var(--warn)" }} />
          <div>
            <div className="stm-stat-num">{stats.pending}</div>
            <div className="stm-stat-label">Bekliyor</div>
          </div>
        </div>
        <div className="stm-stat">
          <div className="stm-stat-dot" style={{ background: "var(--success)" }} />
          <div>
            <div className="stm-stat-num">{stats.sent}</div>
            <div className="stm-stat-label">Gönderildi</div>
          </div>
        </div>
        <div className="stm-stat">
          <div className="stm-stat-dot" style={{ background: "var(--error)" }} />
          <div>
            <div className="stm-stat-num">{stats.err}</div>
            <div className="stm-stat-label">Hatalı</div>
          </div>
        </div>
        <div className="stm-stat">
          <div className="stm-stat-dot" style={{ background: "var(--accent2)" }} />
          <div>
            <div className="stm-stat-num">{stats.total}</div>
            <div className="stm-stat-label">Toplam Alıcı</div>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="stm-layout">
        {/* ── LEFT PANEL ── */}
        <div className="stm-left">
          {/* Toolbar */}
          <div className="stm-toolbar">
            <div className="stm-search-wrap">
              <IconSearch />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Okul, temsilci veya email ara..."
              />
            </div>
            <div className="stm-filters">
              <IconFilter />
              {durumFilters.map((d) => (
                <button
                  key={d}
                  className={`stm-filter-btn ${filterDurum === d ? "active" : ""}`}
                  onClick={() => setFilterDurum(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="stm-tabs">
            {tabs.map((t) => (
              <div
                key={t}
                className={`stm-tab ${activeTab === t ? "active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </div>
            ))}
          </div>

          {/* List */}
          <div className="stm-list">
            {filtered.length === 0 && (
              <div className="stm-empty-state" style={{ height: 200 }}>
                <p>Sonuç bulunamadı</p>
              </div>
            )}
            {filtered.map((school) => {
              const isSent = school.portalDurum?.includes("Gönderildi");
              const isErr = school.portalDurum?.includes("Hatalı");
              const isSelected = selected?.school?.id === school.id;
              const isChecked = checked.has(school.id);

              return (
                <div
                  key={school.id}
                  className={`stm-school-item ${isSelected ? "selected" : ""} ${isSent ? "sent" : ""}`}
                  onClick={() => handleSelectSchool(school, 0)}
                >
                  {/* Checkbox */}
                  <div
                    className={`stm-school-check ${isChecked ? "checked" : ""}`}
                    onClick={(e) => toggleCheck(e, school.id)}
                  >
                    {isChecked && <IconCheck />}
                  </div>

                  {/* Info */}
                  <div className="stm-school-info">
                    <div className="stm-school-name">{school.okul}</div>
                    <div className="stm-school-sub">
                      <span style={{ color: "var(--accent)", fontWeight: 500 }}>{school.kategori}</span>
                      {" · "}{school.sheetName}
                    </div>
                    <div className="stm-school-recipients">
                      {school.recipients.map((r, ri) => (
                        <div
                          key={ri}
                          className="stm-recipient-tag"
                          onClick={(e) => { e.stopPropagation(); handleSelectSchool(school, ri); }}
                          style={{ cursor: "pointer" }}
                        >
                          <span style={{ color: "var(--text)" }}>{r.firstName}</span>
                          <span>·</span>
                          <span>{r.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Durum */}
                  {school.portalDurum && (
                    <div className={`stm-durum ${isSent ? "gonderildi" : isErr ? "hatali" : ""}`}>
                      {isSent ? "✓" : "✗"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bulk Bar */}
          {checked.size > 0 && (
            <div className="stm-bulk-bar">
              <span className="stm-bulk-info">{checked.size} okul seçili</span>
              <button className="stm-btn stm-btn-secondary" style={{ fontSize: 11, padding: "5px 10px" }} onClick={toggleCheckAll}>
                Tümünü Seç
              </button>
              <button className="stm-btn stm-btn-success" style={{ fontSize: 11, padding: "5px 10px" }} onClick={sendBulk}>
                <IconSend /> Seçilileri Gönder
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="stm-right">
          {!selected ? (
            <div className="stm-preview-area">
              <div className="stm-empty-state">
                <IconEye />
                <p>Önizlemek için bir okul seçin</p>
              </div>
            </div>
          ) : (
            <>
              {/* Preview Header */}
              <div className="stm-preview-header">
                <div>
                  <h3>{selected.school.okul}</h3>
                  <p>
                    {selected.school.recipients[selected.recipientIdx]?.firstName} ·{" "}
                    {selected.school.recipients[selected.recipientIdx]?.email}
                    {selected.school.recipients.length > 1 && (
                      <span style={{ color: "var(--accent)", marginLeft: 8 }}>
                        {selected.school.recipients.length} alıcı
                      </span>
                    )}
                  </p>
                </div>
                <div className="stm-actions">
                  <button
                    className={`stm-btn stm-btn-secondary`}
                    onClick={() => {
                      setEditMode(!editMode);
                      if (!editMode) setEditedBody(selectedBody);
                    }}
                  >
                    {editMode ? "Önizleme" : "Düzenle"}
                  </button>
                  <button
                    className="stm-btn stm-btn-primary"
                    onClick={sendSingle}
                    disabled={sending}
                  >
                    <IconSend />
                    Gönder
                  </button>
                </div>
              </div>

              {/* Mail Cards */}
              <div className="stm-preview-area">
                <div className="stm-mail-cards">
                  {/* Konu satırı */}
                  <div style={{
                    background: "#f1f5f9", border: "1.5px solid #e2e8f0",
                    borderRadius: 10, padding: "10px 16px",
                    fontSize: 12, color: "#94a3b8"
                  }}>
                    <strong style={{ color: "#0f172a" }}>Konu:</strong> {MAIL_SUBJECT}
                    {attachments.length > 0 && (
                      <span style={{ marginLeft: 12, color: "#2563eb", fontWeight: 600 }}>
                        📎 {attachments.length} ek
                      </span>
                    )}
                  </div>

                  {/* Her recipient için önizleme */}
                  {selected.school.recipients.map((r, ri) => (
                    <div key={ri} className="stm-mail-card">
                      <div className="stm-mail-card-header">
                        <div className="stm-mail-card-to">
                          <strong>{r.firstName}</strong> · {r.email}
                        </div>
                        <div className="stm-mail-card-status">
                          {ri === selected.recipientIdx && (
                            <span style={{ color: "#2563eb", fontSize: 11, fontWeight: 600 }}>● Aktif</span>
                          )}
                        </div>
                      </div>
                      {ri === selected.recipientIdx && editMode ? (
                        <div style={{ padding: 12 }}>
                          <textarea
                            className="stm-mail-body-edit"
                            value={editedBody}
                            onChange={(e) => setEditedBody(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="stm-mail-body">
                          {getBodyForRecipient(selected.school, ri)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachment Area */}
              <div className="stm-attachment-area">
                <IconAttach />
                <span className="stm-attachment-label">Drive Ek:</span>
                <input
                  className="stm-attachment-input"
                  value={attachmentInput}
                  onChange={(e) => setAttachmentInput(e.target.value)}
                  placeholder="Drive File ID girin (örn: 1aBcD...)"
                  onKeyDown={(e) => e.key === "Enter" && addAttachment()}
                />
                <button className="stm-btn stm-btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={addAttachment}>
                  Ekle
                </button>
                {attachments.length > 0 && (
                  <div className="stm-attachment-tags">
                    {attachments.map((a, i) => (
                      <div key={i} className="stm-attachment-tag">
                        📎 {a.name}
                        <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                          <IconX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
