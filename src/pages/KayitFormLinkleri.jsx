import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const VERSION = "v2.0";
// Danışman formu + 3 öğrenci formu bu kaynaktan gelir
const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const SHEET_NAME = "Aktif Linkler";
// Okul kayıt formları: Grup Yaz Okulları, Tüm Liste
const SCHOOL_SHEET_ID = "1ksxuY-FeCjkPY07W3M6XAa32BXQ5im7Tu7cuJ4vE3ws";
const SCHOOL_GID = "1534401913";

// Detay kartında gösterilecek alanlar, bu sırayla
const DETAIL_FIELDS = [
  ["Bilgi Formu", "form"],
  ["Websitesi Yazısı", "website"],
  ["Okul adı", "name"],
  ["Konum", "location"],
  ["Bulunduğu Ülke", "country"],
  ["Başlangıç Tarihi", "start"],
  ["Bitiş Tarihi", "end"],
  ["Program Seçimi (varsa)", "program"],
  ["Ders Sayısı", "lessons"],
];

const TR_MONTHS = {
  ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
  temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
};

// Öğrenci formlarına sırayla atanan pastel renk paleti (liste uzarsa başa döner)
const ROW_PALETTE = [
  { bg: "#f0fdf9", border: "#c3ece0", text: "#0f766e" }, // yeşil-teal
  { bg: "#fff8ed", border: "#fae0bd", text: "#b45309" }, // amber
  { bg: "#f4f6fd", border: "#d9dff5", text: "#4338ca" }, // indigo
];

// Danışman formu için sabit mavi
const ADVISOR_COLOR = { bg: "#eff6fc", border: "#cfe1f2", text: "#2e6da4" };

// "Öğrenci Formları" grubunda, bu sırayla üstte kalacak formlar
const STUDENT_FORM_TITLES = [
  "Grup Yaz Okulu Bilgi Formu",
  "Bireysel Yaz Okulu Bilgi Formu",
  "Yetişkin Dil Okulu Bilgi Formu",
];

function norm(s) {
  return (s || "").trim().toLocaleLowerCase("tr-TR");
}

// Tırnak içindeki virgülleri koruyan CSV ayrıştırıcı
function parseCSV(csv) {
  const rows = [];
  let row = [], field = "", inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch !== "\r") field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Fazla boşlukları teke indirir, baş/son boşluğu atar
function clean(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function isUrl(s) {
  return /^https?:\/\//i.test(s);
}

// "15 Kasım 2026" / "1 Ağustos  2027" → timestamp. Parse edilemezse listenin sonuna düşer.
function parseTrDate(s) {
  const m = clean(s).toLocaleLowerCase("tr-TR").match(/^(\d{1,2})\s(\S+)\s(\d{4})$/);
  if (!m || TR_MONTHS[m[2]] === undefined) return Infinity;
  return new Date(+m[3], TR_MONTHS[m[2]], +m[1]).getTime();
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Sheet okunamadı");
  return parseCSV(await res.text());
}

async function loadLinks() {
  const rows = await fetchCSV(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`);
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  const titleIdx = headers.findIndex(h => h.toLocaleLowerCase("tr-TR") === "başlık");
  const urlIdx = headers.findIndex(h => h.toLocaleLowerCase("tr-TR") === "url");

  if (titleIdx === -1 || urlIdx === -1) {
    throw new Error("'Başlık' veya 'URL' sütunu bulunamadı");
  }

  return rows.slice(1)
    .map(r => ({ title: (r[titleIdx] || "").trim(), url: (r[urlIdx] || "").trim() }))
    .filter(l => l.title && l.url);
}

async function loadSchools() {
  const rows = await fetchCSV(`https://docs.google.com/spreadsheets/d/${SCHOOL_SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&gid=${SCHOOL_GID}`);
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => norm(h));
  const col = name => headers.indexOf(norm(name));
  const idx = {
    form: col("Bilgi Formu"),
    name: col("OKULLAR"),
    location: col("Konum"),
    country: col("Bulunduğu Ülke"),
    start: col("Başlangıç Tarihi"),
    end: col("Bitiş Tarihi"),
    website: col("URLs"),
    program: col("Program Seçimi (varsa)"),
    duration: col("Kurs Süresi (Hafta veya Gün)"),
    lessons: col("Ders Sayısı"),
  };
  if (idx.name === -1) throw new Error("'OKULLAR' sütunu bulunamadı");

  const get = (r, i) => (i === -1 ? "" : clean(r[i]));

  return rows.slice(1)
    .map((r, i) => {
      const s = { id: i };
      Object.keys(idx).forEach(k => { s[k] = get(r, idx[k]); });
      s.url = isUrl(s.form) ? s.form : "";
      s.startTs = parseTrDate(s.start);
      const dates = s.start && s.end ? `${s.start} - ${s.end}` : s.start || s.end;
      s.label = [s.name, s.country, dates, s.duration].filter(Boolean).join(" · ");
      s.meta = [s.country, dates, s.duration].filter(Boolean).join(" · ");
      s.searchText = norm([s.label, s.location].join(" "));
      return s;
    })
    .filter(s => s.name)
    .sort((a, b) => a.startTs - b.startTs);
}

export default function KayitFormLinkleri() {
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [search, setSearch] = useState("");
  const [showUsage, setShowUsage] = useState(false);
  const [schools, setSchools] = useState([]);
  const [schoolError, setSchoolError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const comboRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }

    (async () => {
      // İki kaynak paralel; biri hata verirse diğeri yine gösterilir
      const [linkRes, schoolRes] = await Promise.allSettled([loadLinks(), loadSchools()]);
      if (linkRes.status === "fulfilled") setLinks(linkRes.value);
      else setError(linkRes.reason?.message || "Bilinmeyen hata");
      if (schoolRes.status === "fulfilled") setSchools(schoolRes.value);
      else setSchoolError(schoolRes.reason?.message || "Bilinmeyen hata");
      setLoading(false);
    })();
  }, []);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    function onOutside(e) {
      if (comboRef.current && !comboRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, []);

  // Klavyeyle gezinirken vurgulu satırı görünür tut
  useEffect(() => {
    if (!dropdownOpen || !listRef.current) return;
    const el = listRef.current.children[highlight];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlight, dropdownOpen]);

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1500);
    } catch {
      // clipboard erişimi yoksa sessizce geç
    }
  }

  const advisorLinks = links.filter(l => norm(l.title).includes("danışman"));

  const nonAdvisor = links.filter(l => !norm(l.title).includes("danışman"));

  // Sabit üç form, STUDENT_FORM_TITLES sırasıyla. Aktif Linkler'deki diğer satırlar gösterilmez.
  const studentLinks = STUDENT_FORM_TITLES
    .map(t => nonAdvisor.find(l => norm(l.title) === norm(t)))
    .filter(Boolean);

  // Okul araması: her kelime etiket veya konumda geçmeli. Seçili etiket input'tayken tüm liste görünür.
  const words = norm(search).split(" ").filter(Boolean);
  const showAll = !words.length || (selectedSchool && search === selectedSchool.label);
  const visibleSchools = showAll
    ? schools
    : schools.filter(s => words.every(w => s.searchText.includes(w)));

  function selectSchool(s) {
    setSelectedSchool(s);
    setSearch(s.label);
    setDropdownOpen(false);
  }

  function clearSchool() {
    setSelectedSchool(null);
    setSearch("");
    setHighlight(0);
    setDropdownOpen(true);
    inputRef.current?.focus();
  }

  function onComboFocus(e) {
    e.target.select();
    setDropdownOpen(true);
    // Mobilde klavye açılınca liste ekranda kalsın diye input'u üste kaydır
    if (window.innerWidth <= 640) {
      setTimeout(() => comboRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 250);
    }
  }

  function onComboKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownOpen(true);
      setHighlight(h => Math.min(h + 1, visibleSchools.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && dropdownOpen && visibleSchools[highlight]) {
      e.preventDefault();
      selectSchool(visibleSchools[highlight]);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  function renderDetailValue(s, key) {
    if (key === "form") {
      if (!s.url) return s.form || "-";
      return (
        <>
          <a href={s.url} target="_blank" rel="noopener noreferrer" style={styles.detailLink}>{s.url}</a>
          <div style={styles.btnGroup} className="kfl-btn-group">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.copyBtn, background: "#0d9488", color: "#fff", borderColor: "#0d9488", textDecoration: "none", display: "inline-block" }}
              className="kfl-copy-btn"
            >
              Formu Aç
            </a>
            <button onClick={() => copyUrl(s.url)} style={{ ...styles.copyBtn, color: "#0f766e", borderColor: "#99f6e4" }} className="kfl-copy-btn">
              {copiedUrl === s.url ? "Kopyalandı" : "Linki Kopyala"}
            </button>
          </div>
        </>
      );
    }
    if (key === "website") {
      if (!s.website) return "-";
      return (
        <>
          <span>{s.website}</span>
          <button onClick={() => copyUrl(s.website)} style={{ ...styles.copyBtn, color: "#0f766e", borderColor: "#99f6e4" }} className="kfl-copy-btn">
            {copiedUrl === s.website ? "Kopyalandı" : "Kopyala"}
          </button>
        </>
      );
    }
    return s[key] || "-";
  }

  function renderRow(link, colors, withOpenBtn) {
    return (
      <div
        style={{ ...styles.row, background: colors.bg, borderColor: colors.border }}
        className="kfl-row"
        key={link.title + link.url}
      >
        <span style={styles.title}>{link.title}</span>
        <div style={styles.btnGroup} className="kfl-btn-group">
          {withOpenBtn && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.copyBtn, background: colors.text, color: "#fff", borderColor: colors.text, textDecoration: "none", display: "inline-block" }}
              className="kfl-copy-btn"
            >
              Formu Aç
            </a>
          )}
          <button
            onClick={() => copyUrl(link.url)}
            style={{ ...styles.copyBtn, color: colors.text, borderColor: colors.border }}
            className="kfl-copy-btn"
          >
            {copiedUrl === link.url ? "Kopyalandı" : "Linki Kopyala"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerInner} className="kfl-header-inner">
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Dashboard
          </button>
          <div style={styles.headerTitleWrap}>
            <h1 style={styles.headerTitle}>Kayıt Form Linkleri</h1>
            <span style={styles.versionTag}>{VERSION}</span>
          </div>
        </div>
      </header>

      <main style={styles.main} className="kfl-main">
        {loading ? (
          <div style={styles.stateBox}>Linkler yükleniyor...</div>
        ) : (
          <>
            <button onClick={() => setShowUsage(true)} style={styles.usageBtn} className="kfl-usage-btn">
              Linklerin kullanımı
            </button>

            {error ? (
              <div style={styles.errorBox}>
                <strong>Form linkleri yüklenemedi.</strong>
                <p>{error}</p>
              </div>
            ) : advisorLinks.length === 0 && studentLinks.length === 0 ? (
              <div style={styles.stateBox}>Henüz aktif link bulunmuyor.</div>
            ) : (
              <>
                {advisorLinks.length > 0 && (
                  <div style={styles.list}>
                    {advisorLinks.map(link => renderRow(link, ADVISOR_COLOR, true))}
                  </div>
                )}

                {studentLinks.length > 0 && (
                  <>
                    <h2 style={styles.groupTitle}>Öğrenci Formları</h2>
                    <div style={styles.list}>
                      {studentLinks.map((link, i) => renderRow(link, ROW_PALETTE[i % ROW_PALETTE.length], false))}
                    </div>
                  </>
                )}
              </>
            )}

            <h2 style={styles.groupTitle}>Okul Kayıt Formları</h2>
            {schoolError ? (
              <div style={styles.errorBox}>
                <strong>Okul listesi yüklenemedi.</strong>
                <p>{schoolError}</p>
              </div>
            ) : schools.length === 0 ? (
              <div style={styles.stateBox}>Henüz okul formu bulunmuyor.</div>
            ) : (
              <>
                <div ref={comboRef} style={styles.combo}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={styles.comboIcon}>
                    <circle cx="11" cy="11" r="7"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={dropdownOpen}
                    aria-controls="kfl-school-list"
                    aria-autocomplete="list"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSelectedSchool(null); setHighlight(0); setDropdownOpen(true); }}
                    onFocus={onComboFocus}
                    onKeyDown={onComboKeyDown}
                    placeholder="Okul, ülke veya tarih yazın..."
                    style={styles.searchInput}
                    className="kfl-combo-input"
                  />
                  {search && (
                    <button onClick={clearSchool} style={styles.clearBtn} aria-label="Aramayı temizle">×</button>
                  )}

                  {dropdownOpen && (
                    <div id="kfl-school-list" role="listbox" ref={listRef} style={styles.dropdown} className="kfl-dropdown">
                      {visibleSchools.length === 0 ? (
                        <div style={styles.dropdownEmpty}>Eşleşen program bulunamadı.</div>
                      ) : visibleSchools.map((s, i) => (
                        <div
                          key={s.id}
                          role="option"
                          aria-selected={selectedSchool?.id === s.id}
                          onMouseEnter={() => setHighlight(i)}
                          onClick={() => selectSchool(s)}
                          style={{
                            ...styles.option,
                            ...(i === highlight ? styles.optionActive : {}),
                            ...(selectedSchool?.id === s.id ? styles.optionSelected : {}),
                          }}
                        >
                          <span style={styles.optionName}>{s.name}</span>
                          <span style={styles.optionMeta}>
                            {s.meta}
                            {!s.url && <span style={styles.noFormBadge}>Form yok</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedSchool && (
                  <div style={styles.detailCard}>
                    <div style={styles.detailHeader}>
                      <span style={styles.detailTitle}>{selectedSchool.name}</span>
                      {!selectedSchool.url && <span style={styles.noFormBadge}>Form yok</span>}
                    </div>
                    <dl style={styles.detailList}>
                      {DETAIL_FIELDS.map(([label, key]) => (
                        <div key={key} style={styles.detailRow} className="kfl-detail-row">
                          <dt style={styles.detailLabel}>{label}</dt>
                          <dd style={styles.detailValue}>{renderDetailValue(selectedSchool, key)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {showUsage && (
        <div onClick={() => setShowUsage(false)} style={styles.popupOverlay}>
          <div onClick={e => e.stopPropagation()} style={styles.popupCard} className="kfl-popup-card">
            <h3 style={styles.popupTitle}>Linklerin kullanım sırası</h3>

            <div style={styles.stepList}>
              <div style={styles.step}>
                <span style={styles.stepNum}>1</span>
                <div>
                  <strong style={styles.stepTitle}>Öğrenci formu</strong>
                  <p style={styles.stepText}>Öncelikle öğrenci/veli ile ilgili kayıt formu paylaşılır ve doldurması sağlanır.</p>
                </div>
              </div>

              <div style={styles.step}>
                <span style={styles.stepNum}>2</span>
                <div>
                  <strong style={styles.stepTitle}>Danışman formu</strong>
                  <p style={styles.stepText}>Öğrencinin formu tamamlandıktan sonra danışman kendi sözleşme gönderme formunu doldurur.</p>
                </div>
              </div>

              <div style={styles.step}>
                <span style={styles.stepNum}>3</span>
                <div>
                  <strong style={styles.stepTitle}>Otomatik gönderim</strong>
                  <p style={styles.stepText}>Bu iki adım tamamlandığında dijital sözleşme onay linki öğrenci/veliye e-posta ve WhatsApp üzerinden otomatik olarak iletilir.</p>
                </div>
              </div>
            </div>

            <p style={styles.popupWarning}>
              Sıralamaya dikkat edilmesi önemlidir; danışman formu, öğrenci formu doldurulmadan gönderilirse sözleşme oluşturulamaz.
            </p>

            <button onClick={() => setShowUsage(false)} style={styles.popupCloseBtn}>Tamam</button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes kflPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .kfl-usage-btn { animation: kflPulse 1.8s ease-in-out infinite; }
        .kfl-usage-btn:hover { animation: none; }
        @media (prefers-reduced-motion: reduce) {
          .kfl-usage-btn { animation: none; }
        }
        .kfl-combo-input:focus { outline: none; border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.12); }
        .kfl-detail-row:last-child { border-bottom: none !important; }
        @media (max-width: 640px) {
          .kfl-header-inner { padding: 12px 16px !important; }
          .kfl-main { padding: 20px 12px 48px !important; }
          .kfl-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .kfl-btn-group { flex-direction: column !important; }
          .kfl-copy-btn { width: 100% !important; text-align: center !important; }
          .kfl-popup-card { margin: 0 12px !important; }
          .kfl-dropdown { max-height: 55vh !important; }
          .kfl-detail-row { grid-template-columns: 1fr !important; gap: 4px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "820px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569", fontFamily: "inherit" },
  headerTitleWrap: { display: "flex", alignItems: "center", gap: "8px" },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  versionTag: { fontSize: "11px", fontWeight: "600", color: "#0d9488", background: "#f0fdfa", padding: "2px 8px", borderRadius: "6px" },
  main: { maxWidth: "820px", margin: "0 auto", padding: "32px 24px 64px" },
  stateBox: { padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" },
  errorBox: { padding: "24px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b", fontSize: "13px", lineHeight: 1.6 },
  // 16px font: iOS'ta odaklanınca sayfa zoom yapmasın
  searchInput: { width: "100%", padding: "12px 42px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", fontSize: "16px", color: "#0f172a", fontFamily: "inherit" },
  combo: { position: "relative", scrollMarginTop: "80px" },
  comboIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
  clearBtn: { position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", width: "34px", height: "34px", border: "none", background: "transparent", borderRadius: "8px", fontSize: "22px", lineHeight: 1, color: "#94a3b8", cursor: "pointer", fontFamily: "inherit" },
  dropdown: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,23,42,0.12)", maxHeight: "380px", overflowY: "auto", WebkitOverflowScrolling: "touch", zIndex: 20, padding: "6px" },
  dropdownEmpty: { padding: "14px", fontSize: "13px", color: "#94a3b8", textAlign: "center" },
  option: { display: "flex", flexDirection: "column", gap: "3px", minHeight: "44px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer" },
  optionActive: { background: "#f0fdfa" },
  optionSelected: { boxShadow: "inset 3px 0 0 #0d9488" },
  optionName: { fontSize: "14px", fontWeight: "600", color: "#0f172a", lineHeight: 1.4 },
  optionMeta: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.4 },
  noFormBadge: { fontSize: "11px", fontWeight: "700", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", padding: "1px 7px", borderRadius: "6px", whiteSpace: "nowrap" },
  detailCard: { marginTop: "14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "14px", overflow: "hidden" },
  detailHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", padding: "16px 20px", background: "#f0fdfa", borderBottom: "1px solid #ccfbf1" },
  detailTitle: { fontSize: "15px", fontWeight: "700", color: "#0f766e", lineHeight: 1.4 },
  detailList: { margin: 0, padding: "4px 20px 8px" },
  detailRow: { display: "grid", gridTemplateColumns: "170px 1fr", gap: "12px", padding: "11px 0", borderBottom: "1px solid #f1f5f9" },
  detailLabel: { fontSize: "12.5px", fontWeight: "600", color: "#64748b", lineHeight: 1.55 },
  detailValue: { margin: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px", fontSize: "13.5px", color: "#0f172a", lineHeight: 1.55, wordBreak: "break-word", minWidth: 0 },
  detailLink: { color: "#0f766e", fontWeight: "600", textDecoration: "none", wordBreak: "break-all" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", border: "1.5px solid", borderRadius: "12px", padding: "16px 20px" },
  title: { fontSize: "14px", fontWeight: "600", color: "#0f172a", lineHeight: 1.5 },
  copyBtn: { flexShrink: 0, padding: "9px 16px", borderRadius: "8px", border: "1.5px solid", background: "#fff", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  btnGroup: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  groupTitle: { fontSize: "13px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", margin: "28px 0 12px" },
  usageBtn: { width: "100%", padding: "13px", marginBottom: "18px", background: "#0d9488", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13.5px", fontWeight: "700", fontFamily: "inherit" },
  popupOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  popupCard: { background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "460px", width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  popupTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "20px" },
  stepList: { display: "flex", flexDirection: "column", gap: "18px" },
  step: { display: "flex", gap: "12px", alignItems: "flex-start" },
  stepNum: { flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", background: "#0d9488", color: "#fff", fontSize: "12.5px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: "13.5px", fontWeight: "700", color: "#0f172a", display: "block", marginBottom: "3px" },
  stepText: { fontSize: "13px", color: "#475569", lineHeight: 1.6 },
  popupWarning: { fontSize: "12.5px", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "11px 14px", margin: "20px 0", lineHeight: 1.6 },
  popupCloseBtn: { width: "100%", padding: "11px", background: "#0d9488", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "700", fontFamily: "inherit" },
};
