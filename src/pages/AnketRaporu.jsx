import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import groupMatchMap from "../data/groupMatchMap.json";
import { getSession } from "../utils/sheets";

const VERSION = "v1.19";
const SHEET_ID = "1NLK17BNqWpVncUfWG1BxD1khE-14F-N7h1JJ-yBeaio";
const API_KEY = "AIzaSyAPQlnQGlYmpJU4TajkGvrHHzRv7I5rPxE";

const STUDENT_NAME_COLUMN = "Öğrencinin Adı, Soyadı";

const QUESTION_COLUMNS = [
  "Dersler ve Eğitim",
  "Geziler",
  "Aktiviteler",
  "Grup lideri",
  "Konaklama",
  "Yemekler",
  "Kampüs İmkanları",
  "Uçuş Deneyimi",
  "Havaalanı Transferleri",
  "Genel Yaz Okulu Deneyiminiz",
  "Bilimevi'ndeki Eğitim Danışmanınız",
  "Vize Süreciniz",
];

const UNI_PLAN_COLUMN = "İlerde Çocuğunuz İçin Yurtdışında Üniversite Eğitimi Planlıyor Musunuz?";
const HOW_REACHED_COLUMN = "Bilimevi'ne Nasıl Ulaştınız?";
const COMMENT_COLUMN = "Yaz okulu deneyiminiz hakkında paylaşmak istediğiniz düşüncelerinizi aşağıya yazabilirsiniz.";
const GENDER_COLUMN = "Öğrencinin Cinsiyeti";

const CATEGORY_ORDER = ["Çok memnunum", "Memnunum", "Kararsızım", "Memnun Değilim", "Hiç Memnun Değilim"];
const CATEGORY_COLORS = {
  "Çok memnunum": "#2563eb",
  "Memnunum": "#059669",
  "Kararsızım": "#d97706",
  "Memnun Değilim": "#ea580c",
  "Hiç Memnun Değilim": "#dc2626",
};
const DYNAMIC_PALETTE = ["#4338ca", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0369a1"];
const EMPTY_COLOR = "#cbd5e1";

function findHeaderIndex(headers, exactName) {
  let idx = headers.findIndex(h => h.trim() === exactName);
  if (idx === -1) idx = headers.findIndex(h => h.trim().startsWith(exactName));
  return idx;
}

// Google Sheets A1 aralık gösteriminde sekme adındaki tek tırnakları kaçışlar (örn. "St George's School")
function escapeSheetName(name) {
  return (name || "").replace(/'/g, "''");
}

// --- PDF Rapor Oluşturma (jsPDF, CDN'den runtime yüklenir) ---
const JSPDF_CDNS = [
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
  "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",
];
const DEJAVU_CDNS = [
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
  "https://unpkg.com/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
];
const DEJAVU_BOLD_CDNS = [
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf",
  "https://unpkg.com/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf",
];
const SCORE_MAP = { "Çok memnunum": 5, "Memnunum": 4, "Kararsızım": 3, "Memnun Değilim": 2, "Hiç Memnun Değilim": 1 };

let jsPDFLoadPromise = null;
let dejaVuFontPromise = null;
let dejaVuBoldFontPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("script yüklenemedi: " + src));
    document.head.appendChild(s);
  });
}

async function loadJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (!jsPDFLoadPromise) {
    jsPDFLoadPromise = (async () => {
      for (const url of JSPDF_CDNS) {
        try {
          await loadScript(url);
          if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
        } catch { /* sıradaki CDN'e geç */ }
      }
      throw new Error("jsPDF hiçbir CDN'den yüklenemedi");
    })();
  }
  return jsPDFLoadPromise;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadDejaVuFont() {
  if (!dejaVuFontPromise) {
    dejaVuFontPromise = (async () => {
      for (const url of DEJAVU_CDNS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          return arrayBufferToBase64(buf);
        } catch { /* sıradaki CDN'e geç */ }
      }
      throw new Error("DejaVuSans fontu yüklenemedi");
    })();
  }
  return dejaVuFontPromise;
}

async function loadDejaVuBoldFont() {
  if (!dejaVuBoldFontPromise) {
    dejaVuBoldFontPromise = (async () => {
      for (const url of DEJAVU_BOLD_CDNS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          return arrayBufferToBase64(buf);
        } catch { /* sıradaki CDN'e geç */ }
      }
      throw new Error("DejaVuSans-Bold fontu yüklenemedi");
    })();
  }
  return dejaVuBoldFontPromise;
}

async function createPdfDoc() {
  const jsPDF = await loadJsPDF();
  const [fontBase64, boldFontBase64] = await Promise.all([loadDejaVuFont(), loadDejaVuBoldFont()]);
  const doc = new jsPDF("p", "mm", "a4");
  doc.addFileToVFS("DejaVuSans.ttf", fontBase64);
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", boldFontBase64);
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  doc.setFont("DejaVuSans", "normal");
  return doc;
}

function checkPageBreak(doc, y, needed = 12) {
  if (y + needed > 280) {
    doc.addPage();
    doc.setFont("DejaVuSans");
    return 20;
  }
  return y;
}

function drawBar(doc, x, y, width, height, fraction, color) {
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y, width, height, "F");
  doc.setFillColor(...color);
  const fw = Math.max(width * Math.min(Math.max(fraction, 0), 1), 0);
  if (fw > 0) doc.rect(x, y, fw, height, "F");
}

async function generateExternalReport(data) {
  const doc = await createPdfDoc();
  const margin = 15;
  let y = 20;

  const parts = data.groupName.split(",").map(s => s.trim()).filter(Boolean);
  const titleLine1 = parts.length >= 2 ? parts.slice(0, -1).join(", ") : parts[0] || data.groupName;
  const titleLine2 = parts.length >= 2 ? parts[parts.length - 1] : "";

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 60, 114);
  doc.text(titleLine1, margin, y);
  y += 7;
  if (titleLine2) {
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(titleLine2, margin, y);
    y += 6;
  }
  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 60, 114);
  doc.text("Yaz Okulu Memnuniyet Raporu", margin, y);
  y += 8;

  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Rapor Tarihi: ${data.reportDate}`, margin, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, 210 - margin, y);
  y += 9;

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 60, 114);
  doc.text("Katılım Oranı", margin, y);
  y += 6;
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const rateText = typeof data.rosterCount === "number" && data.rosterCount > 0
    ? `Toplam Öğrenci: ${data.rosterCount}  |  Anket Cevaplayan: ${data.total}  |  Oran: %${((data.total / data.rosterCount) * 100).toFixed(1)}`
    : `Anket Cevaplayan: ${data.total}`;
  doc.text(rateText, margin, y);
  y += 10;

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 60, 114);
  doc.text("Demografi", margin, y);
  y += 6;
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const genderText = Object.entries(data.genderCounts)
    .map(([g, c]) => `${g}: ${c} (%${((c / data.total) * 100).toFixed(1)})`)
    .join("   |   ");
  doc.text(genderText || "Cinsiyet verisi yok", margin, y);
  y += 5;
  if (data.ageRange) {
    doc.text(`Yaş: ${data.ageRange}`, margin, y);
    y += 5;
  }
  y += 5;

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 60, 114);
  doc.text("Memnuniyet Ortalamaları (5 üzerinden)", margin, y);
  y += 8;

  const labelWidth = 62;
  const barWidth = 90;
  data.questionAverages.forEach(qa => {
    y = checkPageBreak(doc, y, 9);
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 40);
    doc.text(qa.question, margin, y + 3.6);
    if (qa.avg !== null) {
      drawBar(doc, margin + labelWidth, y, barWidth, 5, qa.avg / 5, [76, 175, 80]);
      doc.setFontSize(9.5);
      doc.text(qa.avg.toFixed(2), margin + labelWidth + barWidth + 4, y + 4);
    } else {
      doc.setFontSize(9);
      doc.setTextColor(160, 160, 160);
      doc.text("Cevap yok", margin + labelWidth, y + 4);
    }
    y += 8;
  });

  y += 10;
  y = checkPageBreak(doc, y, 20);
  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 60, 114);
  doc.text("Olumlu Geribildirimler", margin, y);
  y += 7;
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  data.topCategories.forEach(tc => {
    y = checkPageBreak(doc, y, 7);
    doc.text(`•  ${tc.question} en yüksek puanlardan biri oldu (${tc.avg.toFixed(2)}/5)`, margin, y);
    y += 6;
  });

  doc.save(`${data.groupName.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]/g, "_")}_Okul_Paylasim_Raporu.pdf`);
}

async function generateInternalReport(data) {
  const doc = await createPdfDoc();
  const margin = 15;
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(30, 60, 114);
  doc.text(`${data.groupName} — Kurum İçi Anket Raporu`, margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Rapor Tarihi: ${data.reportDate}`, margin, y);
  y += 5;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, 210 - margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(30, 60, 114);
  doc.text("Özet", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const rosterText = typeof data.rosterCount === "number" ? data.rosterCount : "-";
  doc.text(`Grup Sayısı: ${rosterText}   |   Anketi Cevaplayan: ${data.total}`, margin, y);
  y += 5;
  const genderText = Object.entries(data.genderCounts).map(([g, c]) => `${g}: ${c}`).join("   |   ");
  doc.text(genderText || "Cinsiyet verisi yok", margin, y);
  y += 9;

  y = checkPageBreak(doc, y, 15);
  doc.setFontSize(11);
  doc.setTextColor(30, 60, 114);
  doc.text("Ortalama Puanlar (5 üzerinden)", margin, y);
  y += 6;
  data.questionAverages.forEach(qa => {
    y = checkPageBreak(doc, y, 6);
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`${qa.question}: ${qa.avg !== null ? qa.avg.toFixed(2) : "-"}`, margin, y);
    y += 5;
  });
  y += 5;

  y = checkPageBreak(doc, y, 15);
  doc.setFontSize(11);
  doc.setTextColor(30, 60, 114);
  doc.text("Detaylı Dağılım", margin, y);
  y += 7;

  data.questionStats.forEach(qs => {
    y = checkPageBreak(doc, y, 8 + qs.entries.length * 5);
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(qs.question, margin, y);
    y += 5;
    qs.entries.forEach(([cat, count]) => {
      const pct = qs.answered > 0 ? Math.round((count / qs.answered) * 100) : 0;
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`${cat}: ${count} (%${pct})`, margin + 4, y);
      y += 4.3;
    });
    y += 2;
  });

  [data.howReachedQ, data.uniPlanQ].forEach(dq => {
    if (!dq.found || dq.entries.length === 0) return;
    y = checkPageBreak(doc, y, 8 + dq.entries.length * 5);
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(dq.question, margin, y);
    y += 5;
    dq.entries.forEach(([label, count]) => {
      const pct = dq.answered > 0 ? Math.round((count / dq.answered) * 100) : 0;
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`${label}: ${count} (%${pct})`, margin + 4, y);
      y += 4.3;
    });
    y += 2;
  });

  if (data.comments.length > 0) {
    y = checkPageBreak(doc, y, 15);
    doc.setFontSize(11);
    doc.setTextColor(30, 60, 114);
    doc.text(`Yorumlar (${data.comments.length})`, margin, y);
    y += 7;
    data.comments.forEach(c => {
      const text = c.name ? `${c.name}: ${c.text}` : c.text;
      const lines = doc.splitTextToSize(text, 210 - margin * 2);
      y = checkPageBreak(doc, y, lines.length * 4.3 + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(lines, margin, y);
      y += lines.length * 4.3 + 3;
    });
  }

  doc.save(`${data.groupName.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]/g, "_")}_Kurum_Ici_Rapor.pdf`);
}

// --- Grup kayıt sayısı (roster) — sabit eşleştirme tablosu kullanılır ---
const ROSTER_SHEET_ID = "1Qr2OLtRhIzXtXq1FmQvYiO1QnO8pjRxCx6Rzotrhsv0";
const ROSTER_NAME_HEADER = "Başvuru Sahibi Öğrencinin Adı Soyadı";

export default function AnketRaporu() {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);
  const [groupCounts, setGroupCounts] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [tabsError, setTabsError] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [studentPopup, setStudentPopup] = useState(null); // { title, names: [] }
  const [copiedText, setCopiedText] = useState(null);
  const [rosterCount, setRosterCount] = useState(null); // number | "-" | null (yükleniyor)
  const [rosterNames, setRosterNames] = useState([]);
  const [view, setView] = useState("results"); // "results" | "compare"
  const [pdfLoading, setPdfLoading] = useState(null); // "external" | "internal" | null
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(() => {
    try {
      const session = getSession();
      const key = `anketRaporu_infoPopupSeen_v1_${session?.email || session?.name || "anon"}`;
      return !localStorage.getItem(key);
    } catch {
      return true;
    }
  });
  const [infoCountdown, setInfoCountdown] = useState(3);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!showInfoPopup) return;
    setInfoCountdown(3);
    const timer = setInterval(() => {
      setInfoCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showInfoPopup]);

  function closeInfoPopup() {
    setShowInfoPopup(false);
    try {
      const session = getSession();
      const key = `anketRaporu_infoPopupSeen_v1_${session?.email || session?.name || "anon"}`;
      localStorage.setItem(key, "1");
    } catch { /* localStorage erişilemezse sessizce geç */ }
  }

  useEffect(() => {
    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Sekmeler yüklenemedi");
        const titles = (json.sheets || []).map(s => s.properties.title).sort((a, b) => a.localeCompare(b, "tr"));
        setTabs(titles);
        if (titles.length > 0) setActiveTab(titles[0]);
      } catch (err) {
        setTabsError(err.message);
      } finally {
        setTabsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeTab) return;
    (async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        const range = `'${escapeSheetName(activeTab)}'`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Veri yüklenemedi");
        const values = json.values || [];
        if (values.length === 0) {
          setHeaders([]);
          setRows([]);
        } else {
          setHeaders(values[0]);
          setRows(values.slice(1));
        }
      } catch (err) {
        setDataError(err.message);
      } finally {
        setDataLoading(false);
      }
    })();
  }, [activeTab]);

  useEffect(() => {
    if (!activeTab) {
      setRosterCount(null);
      setRosterNames([]);
      return;
    }
    const rosterTab = groupMatchMap[activeTab];

    if (!rosterTab) {
      setRosterCount("-");
      setRosterNames([]);
      return;
    }

    (async () => {
      setRosterCount(null); // yükleniyor
      setRosterNames([]);
      try {
        const range = `'${escapeSheetName(rosterTab)}'!A1:H500`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ROSTER_SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error();
        const values = json.values || [];

        // Başlık hücresini (ve sütununu) hangi satırda olursa olsun bul — sekmeler arası sütun kayması olabiliyor
        const targetHeader = ROSTER_NAME_HEADER.toLocaleUpperCase("tr-TR");
        let headerRowIdx = -1, headerColIdx = -1;
        for (let r = 0; r < values.length; r++) {
          const c = values[r].findIndex(cell => (cell || "").trim().toLocaleUpperCase("tr-TR") === targetHeader);
          if (c !== -1) { headerRowIdx = r; headerColIdx = c; break; }
        }

        let names = [];
        if (headerRowIdx !== -1) {
          names = values.slice(headerRowIdx + 1)
            .map(r => (r[headerColIdx] || "").trim())
            .filter(Boolean);
        } else {
          // Başlık bulunamadıysa yedek plan: A ve B sütunlarından hangisi daha dolu ise onu kullan
          const colA = values.map(r => (r[0] || "").trim()).filter(Boolean);
          const colB = values.map(r => (r[1] || "").trim()).filter(Boolean);
          names = (colB.length > colA.length ? colB : colA).filter(
            n => n.toLocaleUpperCase("tr-TR") !== targetHeader
          );
        }

        names.sort((a, b) => a.localeCompare(b, "tr"));
        setRosterNames(names);
        setRosterCount(names.length);
      } catch {
        setRosterCount("-");
        setRosterNames([]);
      }
    })();
  }, [activeTab]);

  // Dropdown'da her grubun yanında göstermek için, tüm grupların cevap sayısını
  // tek seferde (parçalı toplu isteklerle) çek
  useEffect(() => {
    if (tabs.length === 0) return;
    let cancelled = false;
    (async () => {
      const CHUNK = 15;
      for (let i = 0; i < tabs.length; i += CHUNK) {
        if (cancelled) return;
        const chunk = tabs.slice(i, i + CHUNK);
        const ranges = chunk
          .map(t => `ranges=${encodeURIComponent(`'${escapeSheetName(t)}'!A2:A2000`)}`)
          .join("&");
        try {
          const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?key=${API_KEY}&${ranges}`);
          const json = await res.json();
          if (res.ok) {
            const partial = {};
            chunk.forEach((t, j) => {
              const values = json.valueRanges?.[j]?.values || [];
              partial[t] = values.filter(r => (r[0] || "").trim()).length;
            });
            if (!cancelled) setGroupCounts(prev => ({ ...prev, ...partial }));
          }
        } catch { /* bu parça alınamazsa sessizce geç, sayı gösterilmez */ }
        await new Promise(r => setTimeout(r, 250));
      }
    })();
    return () => { cancelled = true; };
  }, [tabs]);

  // --- İstatistik hesapla ---
  const genderIdx = findHeaderIndex(headers, GENDER_COLUMN);
  const commentIdx = findHeaderIndex(headers, COMMENT_COLUMN);
  const uniPlanIdx = findHeaderIndex(headers, UNI_PLAN_COLUMN);
  const howReachedIdx = findHeaderIndex(headers, HOW_REACHED_COLUMN);
  const nameIdx = findHeaderIndex(headers, STUDENT_NAME_COLUMN);

  const total = rows.length;

  const genderCounts = {};
  if (genderIdx !== -1) {
    rows.forEach(r => {
      const val = (r[genderIdx] || "").trim();
      if (val) genderCounts[val] = (genderCounts[val] || 0) + 1;
    });
  }

  // Sabit sıralı (5'li skala) sorular
  const questionStats = QUESTION_COLUMNS.map(q => {
    const idx = findHeaderIndex(headers, q);
    const counts = {};
    CATEGORY_ORDER.forEach(c => { counts[c] = 0; });
    let answered = 0;
    if (idx !== -1) {
      rows.forEach(r => {
        const val = (r[idx] || "").trim();
        if (CATEGORY_ORDER.includes(val)) {
          counts[val]++;
          answered++;
        }
      });
    }
    return { question: q, idx, entries: CATEGORY_ORDER.map(c => [c, counts[c]]), answered, found: idx !== -1, colorFor: c => CATEGORY_COLORS[c] };
  });

  // Sayıya göre azalan sıralı, dinamik kategorili sorular (Üniversite Planı + Nasıl Ulaştınız)
  function buildDynamicQuestion(idx, label) {
    const counts = {};
    let answered = 0;
    if (idx !== -1) {
      rows.forEach(r => {
        const val = (r[idx] || "").trim();
        if (val) {
          counts[val] = (counts[val] || 0) + 1;
          answered++;
        }
      });
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const colorFor = (_, i) => DYNAMIC_PALETTE[i % DYNAMIC_PALETTE.length];
    return { question: label, idx, entries, answered, found: idx !== -1, colorFor };
  }

  const uniPlanQ = buildDynamicQuestion(uniPlanIdx, UNI_PLAN_COLUMN);
  const howReachedQ = buildDynamicQuestion(howReachedIdx, HOW_REACHED_COLUMN);

  // Yorumlar: öğrenci adıyla birlikte
  const comments = commentIdx !== -1
    ? rows
        .map(r => ({ name: (r[nameIdx] || "").trim(), text: (r[commentIdx] || "").trim() }))
        .filter(c => c.text)
    : [];

  const respondentNames = nameIdx !== -1
    ? rows.map(r => (r[nameIdx] || "").trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, "tr"))
    : [];

  // --- Rapor için ek hesaplamalar ---
  const ageIdx = findHeaderIndex(headers, "Öğrencinin Yaşı");
  let ageRange = null;
  if (ageIdx !== -1) {
    const ages = rows.map(r => parseInt((r[ageIdx] || "").trim(), 10)).filter(n => !isNaN(n));
    if (ages.length > 0) ageRange = `${Math.min(...ages)}-${Math.max(...ages)} arası`;
  }

  const questionAverages = questionStats.map(qs => {
    if (qs.answered === 0) return { question: qs.question, avg: null };
    let sum = 0;
    qs.entries.forEach(([cat, count]) => { sum += (SCORE_MAP[cat] || 0) * count; });
    return { question: qs.question, avg: sum / qs.answered };
  });

  const topCategories = questionAverages
    .filter(qa => qa.avg !== null)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  const reportDate = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  async function handleExternalPdf() {
    setPdfLoading("external");
    try {
      await generateExternalReport({ groupName: activeTab, rosterCount, total, genderCounts, ageRange, questionAverages, topCategories, reportDate });
    } catch (e) {
      alert("PDF oluşturulamadı: " + e.message);
    } finally {
      setPdfLoading(null);
    }
  }

  async function handleInternalPdf() {
    setPdfLoading("internal");
    try {
      await generateInternalReport({ groupName: activeTab, rosterCount, total, genderCounts, questionAverages, questionStats, howReachedQ, uniPlanQ, comments, reportDate });
    } catch (e) {
      alert("PDF oluşturulamadı: " + e.message);
    } finally {
      setPdfLoading(null);
    }
  }

  function openStudentPopup(colIdx, category, questionLabel) {
    if (colIdx === -1 || nameIdx === -1) return;
    const names = rows
      .filter(r => (r[colIdx] || "").trim() === category)
      .map(r => (r[nameIdx] || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "tr"));
    setStudentPopup({ title: `${questionLabel} — ${category}`, names });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1500);
    } catch {
      // clipboard erişimi yoksa sessizce geç
    }
  }

  function renderQuestionCard(qs) {
    return (
      <div style={styles.questionCard} key={qs.question}>
        <h3 style={styles.questionTitle}>{qs.question}</h3>
        {!qs.found ? (
          <p style={styles.notFoundText}>Bu sütun sheet'te bulunamadı.</p>
        ) : qs.answered === 0 ? (
          <p style={styles.notFoundText}>Cevap yok.</p>
        ) : (
          <div style={styles.barList}>
            {qs.entries.map(([cat, count], i) => {
              const pct = qs.answered > 0 ? Math.round((count / qs.answered) * 100) : 0;
              const isEmpty = count === 0;
              const color = isEmpty ? EMPTY_COLOR : qs.colorFor(cat, i);
              return (
                <div
                  key={cat}
                  onClick={() => count > 0 && openStudentPopup(qs.idx, cat, qs.question)}
                  style={{
                    ...styles.barBox,
                    background: isEmpty ? "#f8fafc" : color + "14",
                    border: isEmpty ? "1px dashed #e2e8f0" : "1px solid transparent",
                    cursor: count > 0 ? "pointer" : "default",
                  }}
                >
                  <div style={{ ...styles.barBoxFill, width: `${pct}%`, background: color }} />
                  <span style={{ ...styles.barBoxLabel, color: isEmpty ? "#94a3b8" : "#1e293b" }}>{cat}</span>
                  <span style={styles.barBoxCount}>{count} · %{pct}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerInner} className="ar-header-inner">
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Dashboard
          </button>
          <div style={styles.headerTitleWrap}>
            <h1 style={styles.headerTitle}>Yaz Okulu Memnuniyet Anketi Raporu</h1>
            <span style={styles.versionTag}>{VERSION}</span>
          </div>
        </div>
      </header>

      <main style={styles.main} className="ar-main">
        {view === "compare" ? (
          <div>
            <button onClick={() => setView("results")} style={styles.backToResultsBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Anket Sonuçlarına Dön
            </button>
            <h2 style={styles.commentsTitle}>{activeTab}</h2>
            <div style={styles.questionsGrid} className="ar-questions-grid">
              <div style={styles.questionCard}>
                <h3 style={styles.questionTitle}>Grup Sayısı ({rosterNames.length})</h3>
                {rosterNames.length === 0 ? (
                  <p style={styles.notFoundText}>Kayıtlı öğrenci bulunamadı.</p>
                ) : (
                  <div style={styles.popupList}>
                    {rosterNames.map((name, i) => (
                      <div style={styles.popupNameRow} key={i}>
                        <span style={styles.popupName}>{name}</span>
                        <button onClick={() => copyText(name)} style={styles.copyBtn}>
                          {copiedText === name ? "Kopyalandı" : "İsmi Kopyala"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={styles.questionCard}>
                <h3 style={styles.questionTitle}>Anketi Cevaplayan ({respondentNames.length})</h3>
                {respondentNames.length === 0 ? (
                  <p style={styles.notFoundText}>Cevap bulunamadı.</p>
                ) : (
                  <div style={styles.popupList}>
                    {respondentNames.map((name, i) => (
                      <div style={styles.popupNameRow} key={i}>
                        <span style={styles.popupName}>{name}</span>
                        <button onClick={() => copyText(name)} style={styles.copyBtn}>
                          {copiedText === name ? "Kopyalandı" : "İsmi Kopyala"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : tabsLoading ? (
          <div style={styles.stateBox}>Sekmeler yükleniyor...</div>
        ) : tabsError ? (
          <div style={styles.errorBox}>
            <strong>Sekmeler yüklenemedi.</strong>
            <p>{tabsError}</p>
            <span>Sheet paylaşım ayarını ("Bağlantıya sahip olan görebilir") kontrol edin.</span>
          </div>
        ) : (
          <>
            <div style={styles.selectWrap}>
              <label style={styles.selectLabel}>Grup seç</label>
              <div style={styles.selectInner} className="ar-select-inner" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  style={styles.selectButton}
                  className="ar-select-btn"
                >
                  <span style={styles.selectButtonText}>{activeTab || "Grup seçin"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdownList} className="ar-dropdown-list">
                    {tabs.map(tab => (
                      <div
                        key={tab}
                        onClick={() => { setActiveTab(tab); setView("results"); setDropdownOpen(false); }}
                        style={{ ...styles.dropdownItem, ...(tab === activeTab ? styles.dropdownItemActive : {}) }}
                      >
                        {tab} {groupCounts[tab] !== undefined ? <strong>({groupCounts[tab]})</strong> : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {dataLoading ? (
              <div style={styles.stateBox}>Veri yükleniyor...</div>
            ) : dataError ? (
              <div style={styles.errorBox}>
                <strong>Veri yüklenemedi.</strong>
                <p>{dataError}</p>
              </div>
            ) : rows.length === 0 ? (
              <div style={styles.stateBox}>Bu grupta henüz veri yok.</div>
            ) : (
              <>
                <div style={styles.summaryGrid} className="ar-summary-grid">
                  <div
                    style={{ ...styles.summaryCard, cursor: "pointer" }}
                    className="ar-summary-item"
                    onClick={() => setView("compare")}
                  >
                    <div style={styles.summaryValue}>{rosterCount === null ? "..." : rosterCount}</div>
                    <div style={styles.summaryLabel}>Grupdaki Öğrenci Sayısı</div>
                  </div>
                  <div
                    style={{ ...styles.summaryCard, cursor: "pointer" }}
                    className="ar-summary-item"
                    onClick={() => setView("compare")}
                  >
                    <div style={styles.summaryValue}>{total}</div>
                    <div style={styles.summaryLabel}>Anketi Cevaplayan</div>
                  </div>
                  {Object.keys(genderCounts).length > 0 && (
                    <div style={styles.summaryCard} className="ar-summary-item">
                      <div style={styles.summaryValue}>
                        {Object.entries(genderCounts).map(([g, c]) => `${c}`).join(" / ")}
                      </div>
                      <div style={styles.summaryLabel}>
                        {Object.keys(genderCounts).join(" / ")}
                      </div>
                    </div>
                  )}
                  <button onClick={handleExternalPdf} disabled={pdfLoading !== null} className="ar-pdf-btn" style={{ ...styles.pdfBtn, opacity: pdfLoading !== null ? 0.6 : 1 }}>
                    {pdfLoading === "external" ? "Oluşturuluyor..." : "📄 Okul Paylaşım Raporu"}
                  </button>
                </div>

                <div style={styles.questionsGrid} className="ar-questions-grid">
                  {howReachedQ.found && renderQuestionCard(howReachedQ)}
                  {questionStats.map(qs => renderQuestionCard(qs))}
                  {uniPlanQ.found && renderQuestionCard(uniPlanQ)}
                </div>

                {comments.length > 0 && (
                  <div style={styles.commentsSection}>
                    <h2 style={styles.commentsTitle}>Yorumlar ({comments.length})</h2>
                    <div style={styles.commentsList}>
                      {comments.map((c, i) => (
                        <div style={styles.commentCard} key={i}>
                          <span style={styles.commentText}>
                            {c.name && <strong style={styles.commentName}>{c.name}: </strong>}
                            {c.text}
                          </span>
                          <button onClick={() => copyText(c.text)} style={styles.copyBtn}>
                            {copiedText === c.text ? "Kopyalandı" : "Yorumu Kopyala"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Bilgi Popup'ı */}
      {showInfoPopup && (
        <div style={styles.popupOverlay}>
          <div onClick={e => e.stopPropagation()} style={styles.popupCard} className="ar-popup-card">
            <div style={styles.popupHeader}>
              <h3 style={styles.popupTitle}>💡 İpuçları</h3>
            </div>
            <ul style={styles.infoList}>
              <li style={styles.infoListItem}>Skorların üzerine tıkladığınızda o kategoriye cevap veren öğrencilerin isimlerini görebilirsiniz.</li>
              <li style={styles.infoListItem}>"Okul Paylaşım Raporu"na tıkladığınızda özet istatistik sunan bir PDF çıktısı elde edebilirsiniz.</li>
            </ul>
            <button
              onClick={() => infoCountdown === 0 && closeInfoPopup()}
              disabled={infoCountdown > 0}
              style={{ ...styles.popupCloseBtnPrimary, opacity: infoCountdown > 0 ? 0.6 : 1, cursor: infoCountdown > 0 ? "default" : "pointer" }}
            >
              {infoCountdown > 0 ? `Tamam (${infoCountdown})` : "Tamam"}
            </button>
          </div>
        </div>
      )}

      {/* Öğrenci Listesi Popup */}
      {studentPopup && (
        <div onClick={() => setStudentPopup(null)} style={styles.popupOverlay}>
          <div onClick={e => e.stopPropagation()} style={styles.popupCard} className="ar-popup-card">
            <div style={styles.popupHeader}>
              <h3 style={styles.popupTitle}>{studentPopup.title}</h3>
              <span style={styles.popupCount}>{studentPopup.names.length} öğrenci</span>
            </div>
            {studentPopup.names.length === 0 ? (
              <p style={styles.notFoundText}>Öğrenci adı bulunamadı.</p>
            ) : (
              <div style={styles.popupList}>
                {studentPopup.names.map((name, i) => (
                  <div style={styles.popupNameRow} key={i}>
                    <span style={styles.popupName}>{name}</span>
                    <button onClick={() => copyText(name)} style={styles.copyBtn}>
                      {copiedText === name ? "Kopyalandı" : "İsmi Kopyala"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setStudentPopup(null)} style={styles.popupCloseBtn}>Kapat</button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          .ar-header-inner { padding: 12px 16px !important; }
          .ar-main { padding: 20px 12px 48px !important; }
          .ar-summary-grid { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)) !important; }
          .ar-summary-item { order: 0; }
          .ar-pdf-btn { order: 1; }
          .ar-select-inner { position: relative !important; left: 50% !important; width: 100vw !important; margin-left: -50vw !important; }
          .ar-select-btn { border-radius: 0 !important; border-left: none !important; border-right: none !important; padding-left: 12px !important; padding-right: 12px !important; }
          .ar-dropdown-list { left: 0 !important; right: 0 !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
          .ar-questions-grid { grid-template-columns: 1fr !important; }
          .ar-popup-card { width: 100% !important; max-width: none !important; margin: 0 12px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "1100px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569", fontFamily: "inherit" },
  headerTitleWrap: { display: "flex", alignItems: "center", gap: "8px" },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  versionTag: { fontSize: "11px", fontWeight: "600", color: "#4338ca", background: "#eef2ff", padding: "2px 8px", borderRadius: "6px" },
  main: { maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 64px" },
  stateBox: { padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" },
  errorBox: { padding: "24px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b", fontSize: "13px", lineHeight: 1.6 },
  selectWrap: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "28px", width: "100%" },
  selectLabel: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  selectInner: { position: "relative", width: "100%" },
  selectButton: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", fontSize: "14px", fontWeight: "600", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", width: "100%" },
  selectButtonText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  dropdownList: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: "60vh", overflowY: "auto", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 50 },
  dropdownItem: { padding: "12px 14px", fontSize: "13.5px", color: "#334155", cursor: "pointer", borderBottom: "1px solid #f1f5f9" },
  dropdownItemActive: { background: "#eef2ff", color: "#4338ca", fontWeight: "600" },
  backToResultsBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#eef2ff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#4338ca", fontFamily: "inherit", marginBottom: "20px" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "32px" },
  summaryCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", textAlign: "center" },
  summaryValue: { fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  summaryLabel: { fontSize: "12px", color: "#94a3b8", marginTop: "4px" },
  pdfBtn: { background: "#4338ca", color: "#fff", border: "none", borderRadius: "14px", padding: "18px 10px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", textAlign: "center" },
  pdfBtnAlt: { background: "#fff", color: "#4338ca", border: "1.5px solid #4338ca", borderRadius: "14px", padding: "18px 10px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", textAlign: "center" },
  questionsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" },
  questionCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px 24px" },
  questionTitle: { fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" },
  notFoundText: { fontSize: "13px", color: "#94a3b8" },
  barList: { display: "flex", flexDirection: "column", gap: "6px" },
  barBox: { position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", height: "34px", borderRadius: "8px", padding: "0 12px", overflow: "hidden" },
  barBoxFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: "8px", opacity: 0.28, transition: "width 0.3s ease", zIndex: 0 },
  barBoxLabel: { position: "relative", zIndex: 1, fontSize: "12.5px", fontWeight: "600" },
  barBoxCount: { position: "relative", zIndex: 1, fontSize: "12px", color: "#64748b", flexShrink: 0 },
  commentsSection: { marginTop: "40px" },
  commentsTitle: { fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" },
  commentsList: { display: "flex", flexDirection: "column", gap: "10px" },
  commentCard: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px" },
  commentText: { fontSize: "13px", color: "#334155", lineHeight: 1.6, flex: 1 },
  commentName: { color: "#0f172a" },
  copyBtn: { flexShrink: 0, padding: "5px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#4338ca", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  popupOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  popupCard: { background: "#fff", borderRadius: "20px", padding: "24px", maxWidth: "420px", width: "100%", maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  popupHeader: { marginBottom: "16px" },
  popupTitle: { fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" },
  popupCount: { fontSize: "12px", color: "#94a3b8" },
  popupList: { overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  popupNameRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" },
  popupName: { fontSize: "13px", color: "#334155", fontWeight: "500" },
  popupCloseBtn: { width: "100%", padding: "10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#64748b", fontFamily: "inherit" },
  popupCloseBtnPrimary: { width: "100%", padding: "10px", background: "#4338ca", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "700", color: "#fff", fontFamily: "inherit" },
  infoList: { margin: "0 0 18px", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "10px" },
  infoListItem: { fontSize: "13px", color: "#334155", lineHeight: 1.6 },
};
