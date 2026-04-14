import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_BORDER = "#fed7aa";

// Navigasyon verisi sheet'ten dinamik yuklenecek
// courses, accommodation, fees hard-code kalir (kompleks yapilar)
const SHEET_ID = "1PMuw11fAUcnX1iz56OOH2HUBe1IUZUdP12VkX9-nt8Q";

async function fetchNav() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=courses`;
  const res = await fetch(url);
  const csv = await res.text();
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g,"").trim());
  const cityIdx = headers.indexOf("city");
  const countryIdx = headers.indexOf("country");
  const schoolIdx = headers.indexOf("school");
  const langIdx = headers.indexOf("language");

  const languages = new Set();
  const countries = {};   // lang -> [country]
  const cities = {};      // country -> [city]
  const brands = {};      // city -> brand

  // Ulke-dil eslesmesi icin yardimci map
  const countryLangMap = {
    "UK": "İngiltere", "Ireland": "İrlanda", "Malta": "Malta",
    "South Africa": "Güney Afrika", "Canada": "Kanada",
    "USA": "ABD", "UAE": "BAE"
  };
  const countryTR = {
    "UK": "İngiltere", "Ireland": "İrlanda", "Malta": "Malta",
    "South Africa": "Güney Afrika", "Canada": "Kanada",
    "USA": "ABD", "UAE": "BAE"
  };

  lines.slice(1).forEach(line => {
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];
    const clean = i => (cols[i]||"").replace(/"/g,"").trim();
    const city = clean(cityIdx);
    const countryEn = clean(countryIdx);
    const brand = clean(schoolIdx);
    const lang = clean(langIdx) || "İngilizce";
    const countryTRName = countryTR[countryEn] || countryEn;

    if (!city || !countryEn) return;

    // Dil
    const langs = lang.includes("/") ? lang.split("/").map(l=>l.trim()) : [lang];
    langs.forEach(l => {
      languages.add(l);
      if (!countries[l]) countries[l] = new Set();
      countries[l].add(countryTRName);
    });

    // Sehir
    if (!cities[countryTRName]) cities[countryTRName] = new Set();
    cities[countryTRName].add(city);

    // Marka
    brands[city] = brand;
  });

  return {
    languages: [...languages].sort(),
    countries: Object.fromEntries(Object.entries(countries).map(([k,v])=>[k,[...v]])),
    cities: Object.fromEntries(Object.entries(cities).map(([k,v])=>[k,[...v].sort()])),
    brands,
  };
}

const DB = {
  languages: ["İngilizce", "Fransızca"],
  countries: {
    "İngilizce": ["İngiltere","İrlanda","Malta","Güney Afrika","Kanada","ABD","BAE"],
    "Fransızca": ["Kanada"],
  },
  cities: {
    "İngiltere": ["London","Brighton","Cambridge","Manchester","Bristol"],
    "İrlanda":   ["Dublin","Dublin 30+"],
    "Malta":     ["Malta","Malta 30+"],
    "Güney Afrika": ["Cape Town","Cape Town 30+"],
    "Kanada":    ["Montreal","Toronto","Toronto 30+","Vancouver","Vancouver 30+"],
    "ABD":       ["Boston","New York","New York 30+","San Francisco","Los Angeles"],
    "BAE":       ["Dubai"],
  },
  brands: {
    "London":"EC","Brighton":"EC","Cambridge":"EC","Manchester":"EC","Bristol":"EC",
    "Dublin":"EC","Dublin 30+":"EC","Malta":"EC","Malta 30+":"EC",
    "Cape Town":"EC","Cape Town 30+":"EC",
    "Montreal":"EC","Toronto":"EC","Toronto 30+":"EC","Vancouver":"EC","Vancouver 30+":"EC",
    "Boston":"EC","New York":"EC","New York 30+":"EC","San Francisco":"EC","Los Angeles":"EC",
    "Dubai":"EC","London 30+":"EC","Brighton 30+":"EC",
  },
  courses: {
    "EC-London": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:405},{min:12,max:23,price:365},{min:24,max:null,price:330}], currency:"GBP", hs_supp:20, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495},{min:12,max:23,price:450},{min:24,max:null,price:390}], currency:"GBP", hs_supp:20, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495},{min:12,max:23,price:450}], currency:"GBP", hs_supp:20, max_weeks:12, morning:true },
      { name:"English in the City", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495}], currency:"GBP", max_weeks:4, morning:true },
      { name:"Writing with AI", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:495}], currency:"GBP", max_weeks:4, morning:true },
      { name:"Exam Prep IELTS", lessons:20, hours:15, tiers:[{min:1,max:11,price:405},{min:12,max:23,price:365}], currency:"GBP", hs_supp:20, morning:false },
    ],
    "EC-Dublin": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:380},{min:12,max:23,price:365},{min:24,max:null,price:280}], currency:"EUR", hs_supp:25, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:445},{min:12,max:23,price:420},{min:24,max:null,price:325}], currency:"EUR", hs_supp:25, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:445},{min:12,max:23,price:420}], currency:"EUR", hs_supp:25, max_weeks:12, morning:true },
      { name:"Exam Prep IELTS", lessons:20, hours:15, tiers:[{min:1,max:11,price:380},{min:12,max:23,price:365}], currency:"EUR", hs_supp:25, max_weeks:12, morning:false },
    ],
    "EC-Brighton": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:385},{min:12,max:23,price:340},{min:24,max:null,price:290}], currency:"GBP", hs_supp:20, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:485},{min:12,max:23,price:405},{min:24,max:null,price:360}], currency:"GBP", hs_supp:20, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:485},{min:12,max:23,price:405}], currency:"GBP", hs_supp:20, max_weeks:12, morning:true },
      { name:"Exam Prep IELTS", lessons:20, hours:15, tiers:[{min:1,max:11,price:385},{min:12,max:23,price:340}], currency:"GBP", hs_supp:20, morning:false },
    ],
    "EC-Malta": [
      { name:"General English 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:300},{min:12,max:23,price:255},{min:24,max:null,price:240}], currency:"EUR", hs_supp:25, morning:true },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:410},{min:12,max:23,price:320},{min:24,max:null,price:300}], currency:"EUR", hs_supp:25, morning:true },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:410},{min:12,max:23,price:320}], currency:"EUR", hs_supp:25, max_weeks:12, morning:true },
      { name:"Exam Prep IELTS", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:410},{min:12,max:23,price:320}], currency:"EUR", hs_supp:25, morning:true },
    ],
    "EC-Dubai": [
      { name:"General English 20 - Sabah", lessons:20, hours:15, tiers:[{min:1,max:11,price:380},{min:12,max:23,price:335},{min:24,max:null,price:310}], currency:"USD", morning:false },
      { name:"General English 20 - Öğleden Sonra", lessons:20, hours:15, tiers:[{min:1,max:11,price:310},{min:12,max:23,price:270},{min:24,max:null,price:245}], currency:"USD", morning:false },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:520},{min:12,max:23,price:480},{min:24,max:null,price:440}], currency:"USD", morning:false },
      { name:"English for Work", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:520},{min:12,max:23,price:480}], currency:"USD", max_weeks:12, morning:false },
    ],
    "EC-Montreal": [
      { name:"General English / French 20", lessons:20, hours:15, tiers:[{min:1,max:11,price:420},{min:12,max:23,price:405}], currency:"CAD", morning:false },
      { name:"General English / French 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:510},{min:12,max:23,price:495}], currency:"CAD", morning:false },
      { name:"Bilingual 24", lessons:24, hours:18, tiers:[{min:1,max:11,price:435},{min:12,max:23,price:420}], currency:"CAD", morning:false },
    ],
    "EC-Boston": [
      { name:"Vacation English (GE 20)", lessons:20, hours:15, tiers:[{min:1,max:11,price:505},{min:12,max:23,price:485}], currency:"USD", hs_supp:25, morning:false },
      { name:"General English 24", lessons:24, hours:18, tiers:[{min:1,max:11,price:570},{min:12,max:23,price:510},{min:24,max:null,price:480}], currency:"USD", hs_supp:25, morning:false },
      { name:"General English 30", lessons:30, hours:22.5, tiers:[{min:1,max:11,price:650},{min:12,max:23,price:595},{min:24,max:null,price:525}], currency:"USD", hs_supp:25, morning:false },
    ],
  },
  accommodation: {
    "EC-London": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"60 dk", price:305, currency:"GBP" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"60 dk", price:250, currency:"GBP" },
      { type:"Student Residence", name:"iQ Highbury", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"23 dk", price:510, currency:"GBP" },
      { type:"Student Residence", name:"iQ Shoreditch", room:"Studio", bathroom:"Ensuite", board:"Self-Catering", dist:"20 dk", price:625, currency:"GBP" },
    ],
    "EC-Dublin": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"75 dk", price:275, currency:"EUR" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"75 dk", price:305, currency:"EUR" },
      { type:"Student Residence", name:"Heyday Carman's Hall", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"20-30 dk", price:450, currency:"EUR" },
    ],
    "EC-Brighton": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"60 dk", price:240, currency:"GBP" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"60 dk", price:275, currency:"GBP" },
      { type:"Student Residence", name:"Abacus House", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"20 dk", price:390, currency:"GBP" },
    ],
    "EC-Malta": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"15-45 dk", price:360, currency:"EUR" },
      { type:"Student Residence", name:"Campus Hub", room:"Single", bathroom:"Private", board:"Self-Catering", dist:"30 dk", price:390, currency:"EUR" },
    ],
    "EC-Dubai": [
      { type:"Shared Accommodation", name:"Student Apartment", room:"Single", bathroom:"Private", board:"Self-Catering", dist:"25 dk", price:450, currency:"USD" },
      { type:"Student Residence", name:"Student Residence", room:"Single", bathroom:"Ensuite", board:"Self-Catering", dist:"50 dk", price:425, currency:"USD" },
    ],
    "EC-Montreal": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"60 dk", price:320, currency:"CAD" },
      { type:"Shared Accommodation", name:"La Marq au 515", room:"Single", bathroom:"Shared", board:"Self-Catering", dist:"20 dk", price:495, currency:"CAD" },
    ],
    "EC-Boston": [
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Bed & Breakfast", dist:"30-65 dk", price:370, currency:"USD" },
      { type:"Homestay", name:"Homestay", room:"Single", bathroom:"Shared", board:"Half Board", dist:"30-65 dk", price:440, currency:"USD" },
    ],
  },
  ecLive: [
    { name:"EC Live Premium (5 gun/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR", minWeeks:1 },
    { name:"EC Live Standard (2 gun/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR", minWeeks:2 },
    { name:"EC Live English for Work", hours:3, tiers:[{min:1,max:11,price:80},{min:12,max:23,price:70},{min:24,max:null,price:60}], currency:"EUR", minWeeks:1 },
  ],
  fees: {
    "EC-London":   { reg:60,  acc:40,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"GBP" },
    "EC-Dublin":   { reg:55,  acc:55,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"EUR" },
    "EC-Brighton": { reg:60,  acc:40,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"GBP" },
    "EC-Malta":    { reg:55,  acc:40,  mat_pw:7,  mat_12:84,  mat_24:105, cur:"EUR" },
    "EC-Dubai":    { reg:100, acc:100, mat_pw:7,  mat_12:84,  mat_24:105, cur:"USD" },
    "EC-Montreal": { reg:140, acc:230, mat_pw:10, mat_12:120, mat_24:140, cur:"CAD" },
    "EC-Boston":   { reg:170, acc:95,  mat_pw:10, mat_12:120, mat_24:140, cur:"USD" },
  },
};

function getPrice(course, weeks) {
  if (!course) return 0;
  const tier = course.tiers.find(t => weeks >= t.min && (t.max === null || weeks <= t.max));
  return tier ? tier.price * weeks : 0;
}

function getFees(key, weeks) {
  const f = DB.fees[key];
  if (!f) return { reg:0, acc:0, mat:0, cur:"GBP" };
  const mat = weeks <= 11 ? f.mat_pw * weeks : weeks <= 23 ? f.mat_12 : f.mat_24;
  return { reg:f.reg, acc:f.acc, mat, cur:f.cur };
}

function fmt(n, cur) {
  return `${cur} ${Number(n).toLocaleString("tr-TR")}`;
}

const emptyDest = (sd="") => ({ lang:"", country:"", city:"", brand:"", course:null, weeks:4, acc:null, startDate:sd, isOnline:false });

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"Selman Çamoğlu", age:"38", gender:"Erkek" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  const [nav, setNav] = useState({
    languages: DB.languages,
    countries: DB.countries,
    cities: DB.cities,
    brands: DB.brands,
  });
  const [navLoading, setNavLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
    // Sheet'ten navigasyon verisini cek
    fetchNav().then(data => {
      setNav(data);
      setNavLoading(false);
    }).catch(() => {
      // Hata olursa hard-code kullan
      setNavLoading(false);
    });
  }, []);

  const STEPS = ["Genel Bilgi","Destinasyon","Kurs","Konaklama","Özet"];
  const dbKey = cur.brand && cur.city ? `${cur.brand}-${cur.city}` : null;
  const courses = dbKey ? (DB.courses[dbKey] || []) : [];
  const accs = dbKey ? (DB.accommodation[dbKey] || []) : [];

  const canNext = [
    !!(student.name && student.gender),
    !!(cur.brand && cur.city) || !!(cur.isOnline && cur.course),
    !!cur.course,
    !!cur.acc,
    true,
  ][step];

  function next() {
    if (step === 3) { setDestinations(p => [...p, { ...cur }]); setCur(emptyDest(cur.startDate)); setStep(4); }
    else if (step === 2 && cur.isOnline) { setDestinations(p => [...p, { ...cur }]); setCur(emptyDest(cur.startDate)); setStep(4); }
    else setStep(s => s + 1);
  }

  function addDest() {
    if (step === 3 && cur.acc) setDestinations(p => [...p, { ...cur }]);
    setCur(emptyDest(cur.startDate));
    setStep(1);
  }

  function generatePDF() {
    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const W = 210, H = 297;
    const CYAN = [0, 193, 222];
    const BLACK = [15, 15, 15];
    const GRAY = [100, 116, 139];
    const LGRAY = [210, 220, 230];
    const phone = user.phone || "905419189177";
    const MX = 24;
    const CW = W - MX * 2;

    // jsPDF Latin-1: c,o,u-umlaut calisiyor; dotless-i(i), g-breve(g), s-cedilla(s) calismiyor
    // Cozum: sadece sorunlu karakterleri degistir, gerisi aynen birak
    function tr(s) {
      return (s || "")
        .replace(/ı/g, "i")   // dotless i -> i
        .replace(/İ/g, "I")   // dotted I -> I
        .replace(/ğ/g, "g")   // g-breve -> g
        .replace(/Ğ/g, "G")   // G-breve -> G
        .replace(/ş/g, "s")   // s-cedilla -> s (NOT in Latin-1)
        .replace(/Ş/g, "S");  // S-cedilla -> S
      // c-cedilla (c), o-umlaut (o), u-umlaut (u) Latin-1'de var, degistirme
    }

    // Konaklama tip cevirileri
    function trAccType(s) {
      return (s || "")
        .replace(/Homestay/gi, "Aile Yanı Konaklama")
        .replace(/Student Residence/gi, "Ogrenci Yurdu")
        .replace(/Shared Accommodation/gi, "Paylasimli Daire")
        .replace(/Summer Residence/gi, "Yaz Yurdu");
    }

    // Board type cevirileri
    function trBoard(s) {
      return (s || "")
        .replace(/Half Board/gi, "Yarım Pansiyon")
        .replace(/Full Board/gi, "Tam Pansiyon")
        .replace(/Bed & Breakfast/gi, "Kahvalti Dahil")
        .replace(/Self-Catering/gi, "Kendi Mutfagi")
        .replace(/Bed and Breakfast/gi, "Kahvalti Dahil");
    }

    function fmtDate(dateStr) {
      if (!dateStr) return "-";
      const months = ["Ocak","Subat","Mart","Nisan","Mayis","Haziran",
                      "Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
      const dt = new Date(dateStr);
      return dt.getDate() + " " + months[dt.getMonth()] + " " + dt.getFullYear();
    }

    function addWeeks(dateStr, weeks) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      d.setDate(d.getDate() + weeks * 7);
      return fmtDate(d.toISOString().slice(0, 10));
    }

    function fmtMoney(n) {
      return Number(n).toLocaleString("tr-TR") + ",00";
    }

    // Para birimi sembol map
    const curSymbol = { "GBP": "£", "EUR": "€", "USD": "$", "CAD": "CA$" };

    destinations.forEach((d, idx) => {
      if (idx > 0) doc.addPage();

      const key = d.brand + "-" + d.city;
      const f = getFees(key, d.weeks, d.isOnline);
      const cCost = getPrice(d.course, d.weeks);
      const aCost = d.acc ? d.acc.price * d.weeks : 0;
      const fT = f.reg + f.acc + f.mat;
      const tot = cCost + aCost + fT;
      const cur = d.course ? d.course.currency : f.cur;
      const sym = curSymbol[cur] || cur;
      const startTxt = fmtDate(d.startDate);
      const endTxt = addWeeks(d.startDate, d.weeks);

      // ─── HEADER ───
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(tr("Bilimevi Eğitim Danışmanınız"), MX, 11);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      doc.text(tr(user.name || "-"), MX, 16);

      // Orta: email
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text("E-posta: " + tr(user.email || ""), W / 2, 13, { align: "center" });

      // Sag: WA linki - tam saga yasla
      doc.setTextColor(...CYAN);
      doc.setFontSize(8);
      doc.textWithLink(tr("Bana WhatsApp'tan Ulasın →"), W - MX, 11, {
        align: "right", url: "https://wa.me/" + phone
      });

      // Para birimi logosu - sag ust
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...GRAY);
      doc.text(sym, W - MX, 20, { align: "right" });

      // Header alt cizgisi
      doc.setDrawColor(...GRAY);
      doc.setLineWidth(0.25);
      doc.line(MX, 22, W - MX, 22);

      // ─── SEHİR (CYAN, buyuk) ───
      doc.setFont("helvetica", "bold");
      doc.setFontSize(52);
      doc.setTextColor(...CYAN);
      doc.text(tr(d.city), MX, 60);

      // ─── TARİHLER (tek satir, siyah) ───
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...BLACK);
      const dateLine = endTxt ? (startTxt + "  —  " + endTxt) : startTxt;
      doc.text(tr(dateLine), MX, 73);

      // ─── TABLO BASLIK ───
      let y = 86;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      doc.text(tr("Teklifinize neler dahil?"), MX, y);
      doc.setTextColor(...GRAY);
      doc.text(cur, W - MX, y, { align: "right" });

      // Hafta Sayisi (CYAN, duzgun buyuk harf)
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...CYAN);
      doc.text(tr("Hafta Sayısı: ") + d.weeks, MX, y);

      // Ince cizgi
      y += 4;
      doc.setDrawColor(...LGRAY);
      doc.setLineWidth(0.3);
      doc.line(MX, y, W - MX, y);

      // ─── SATIRLAR ───
      const COL1 = MX;
      const COL2 = MX + 36;
      const COL3 = W - MX;

      const rows = [];

      // Kurs
      rows.push({
        cat: "Kurs",
        sub: tr(d.course ? d.course.name : "-"),
        detail: startTxt && endTxt ? (startTxt + " - " + endTxt) : "",
        price: cCost
      });

      // Konaklama
      if (d.acc && !d.isOnline) {
        const accName = tr(trAccType(d.acc.name));
        const boardName = tr(trBoard(d.acc.board));
        rows.push({
          cat: tr("Konaklama"),
          sub: accName + " (" + boardName + ") (" + tr("Ücrete dahil") + ")",
          detail: startTxt && endTxt ? (startTxt + " - " + endTxt) : "",
          price: aCost
        });
      }

      // Diger ucretler
      const extras = [];
      if (f.reg > 0) extras.push({ sub: tr("Kayıt Ücreti"), price: f.reg });
      if (f.mat > 0) extras.push({ sub: tr("Ders Materyalleri"), price: f.mat });
      if (f.acc > 0) extras.push({ sub: tr("Konaklama Placement"), price: f.acc });

      if (extras.length > 0) {
        extras.forEach((ex, ei) => {
          rows.push({
            cat: ei === 0 ? tr("Diğer") : "",
            sub: ex.sub,
            detail: "",
            price: ex.price
          });
        });
      }

      y += 6;
      rows.forEach((row) => {
        const hasDetail = row.detail && row.detail.trim();
        const rowH = hasDetail ? 14 : 9;

        if (row.cat) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text(row.cat, COL1, y + 4.5);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        doc.text(row.sub, COL2, y + 4.5);

        if (hasDetail) {
          doc.setFontSize(8);
          doc.setTextColor(...CYAN);
          doc.text(row.detail, COL2, y + 9);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        doc.text(fmtMoney(row.price), COL3, y + 4.5, { align: "right" });

        doc.setDrawColor(...LGRAY);
        doc.setLineWidth(0.2);
        doc.line(MX, y + rowH, W - MX, y + rowH);
        y += rowH;
      });

      // ─── TOPLAM ───
      y += 12; // cizgi oncesi bosluk arttirildi
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.5);
      doc.line(MX, y - 5, W - MX, y - 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...BLACK);
      // Toplam solunda para birimi logosu
      doc.text(sym + "  " + tr("Toplam Tutar ") + cur, MX, y + 4);
      doc.text(cur + " " + fmtMoney(tot), COL3, y + 4, { align: "right" });

      // ─── NOTLAR (toplam disinda) ───
      const noteItems = [];
      if (d.course && d.course.morning) {
        noteItems.push(tr("Sabah garantisi mevcut (ek ücret uygulanabilir)"));
      }
      if (d.course && d.course.hs_supp) {
        noteItems.push(tr("Yüksek sezon eki: " + cur + " " + d.course.hs_supp + "/hafta (29 Haziran - 28 Ağustos için geçerli)"));
      }
      if (d.acc && d.acc.hs_price && d.acc.hs_price !== d.acc.price) {
        noteItems.push(tr("Yüksek sezonda konaklama fiyatı değişebilir: " + cur + " " + d.acc.hs_price + "/hafta"));
      }
      // Konaklama notu
      if (d.acc && d.acc.distance) {
        noteItems.push(tr("Konaklamadan okula mesafe: ") + d.acc.distance);
      }

      if (noteItems.length > 0) {
        y += 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text(tr("Notlar:"), MX, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        noteItems.forEach(note => {
          doc.text("- " + note, MX + 2, y);
          y += 5;
        });
      }

      // ─── WA BUTONU (sayfanin altina sabitlenmis) ───
      const btnY = H - 50;
      const btnW = 85, btnH = 11;
      const btnX = W / 2 - btnW / 2;
      doc.setFillColor(...CYAN);
      doc.roundedRect(btnX, btnY, btnW, btnH, 5, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.textWithLink(
        tr("Danışmanınıza WhatsApp'tan Ulasın"),
        W / 2, btnY + 7.2,
        { align: "center", url: "https://wa.me/" + phone }
      );

      // ─── FOOTER ───
      const today = new Date().toLocaleDateString("tr-TR");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(tr("Geçerlilik tarihi: ") + today, MX, H - 10);
      doc.text("bilimevi.com", W - MX, H - 10, { align: "right" });
    });

    const safeStudentName = tr(student.name || "teklif").replace(/\s+/g, "_");
    const fname = safeStudentName + "_" + new Date().toISOString().slice(0, 10) + ".pdf";
    doc.save(fname);
  }
  function reset() {
    setDestinations([]); setCur(emptyDest());
    setStudent({ name:"", age:"", gender:"" }); setStep(0);
  }

  if (!user) return null;

  const sidebarDests = destinations;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fti{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;color:#0f172a;background:#fff;outline:none;transition:border-color .15s}
        .fti:focus{border-color:${ORANGE}}
        .ftg{flex:1;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit;background:#fff;color:#0f172a;transition:all .15s}
        .ftg.s{background:${ORANGE};border-color:${ORANGE};color:#fff;font-weight:600}
        .ftc{padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;font-size:13px;background:#fff;color:#0f172a;transition:all .15s;text-align:center}
        .ftc:hover{border-color:${ORANGE_BORDER}}
        .ftc.s{border-color:${ORANGE};background:${ORANGE_LIGHT};color:${ORANGE};font-weight:600}
        .ftcc{padding:16px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;transition:all .15s}
        .ftcc:hover:not(.dis){border-color:${ORANGE_BORDER}}
        .ftcc.s{border-color:${ORANGE};background:${ORANGE_LIGHT}}
        .ftcc.dis{opacity:.45;cursor:not-allowed}
        .ftac{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;transition:all .15s}
        .ftac:hover{border-color:${ORANGE_BORDER}}
        .ftac.s{border-color:${ORANGE};background:${ORANGE_LIGHT}}
        .ftpb{background:${ORANGE};color:#fff;border:none;padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s}
        .ftpb:disabled{opacity:.4;cursor:not-allowed}
        .ftpb:not(:disabled):hover{opacity:.88}
        .ftob{background:transparent;color:${ORANGE};border:1.5px solid ${ORANGE};padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
        .ftob:hover{background:${ORANGE_LIGHT}}
        .ftbb{display:flex;align-items:center;gap:6px;background:transparent;border:1px solid #e2e8f0;padding:9px 16px;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;color:#64748b;transition:background .15s}
        .ftbb:hover{background:#f8fafc}
      `}</style>

      <header style={S.hdr}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <button className="ftbb" onClick={() => navigate("/dashboard")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
          Dashboard
        </button>
        <span style={S.htitle}>Fiyat Teklifi</span>
        <div style={{ width:100 }} />
        </div>
      </header>

      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", overflowX:"auto" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700,
                background: i <= step ? ORANGE : "#e2e8f0", color: i <= step ? "#fff" : "#94a3b8" }}>
                {i < step ? "✓" : i+1}
              </div>
              <span style={{ fontSize:12, fontWeight: i===step?600:400, color: i===step?ORANGE:i<step?"#0f172a":"#94a3b8", whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i < STEPS.length-1 && <div style={{ flex:1, height:1, background:i<step?ORANGE:"#e2e8f0", margin:"0 8px" }} />}
          </div>
        ))}
      </div>
      </div>

      <div style={S.body}>
        <div style={S.main}>

          {destinations.length > 0 && step < 4 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
              {destinations.map((d,i) => <span key={i} style={S.pill}>{d.brand} {d.city} · {d.weeks}h</span>)}
            </div>
          )}

          {/* STEP 0 */}
          {step === 0 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Öğrenci bilgileri</h2>
            <div style={S.r2}>
              <div style={S.fld}>
                <label style={S.lbl}>Öğrenci adı</label>
                <input className="fti" value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))} placeholder="Ad Soyad" />
              </div>
              <div style={S.fld}>
                <label style={S.lbl}>Yaş</label>
                <input className="fti" type="number" value={student.age} onChange={e=>setStudent(p=>({...p,age:e.target.value}))} placeholder="25" />
              </div>
            </div>
            <div style={S.fld}>
              <label style={S.lbl}>Cinsiyet</label>
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                {["Erkek","Kadın"].map(g => (
                  <button key={g} className={`ftg${student.gender===g?" s":""}`} onClick={()=>setStudent(p=>({...p,gender:g}))}>{g}</button>
                ))}
              </div>
            </div>
          </div>}

          {/* STEP 1 */}
          {step === 1 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Destinasyon seç {navLoading && <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400 }}>yükleniyor...</span>}</h2>
            <p style={S.slbl}>Dil</p>
            <div style={S.g3}>
              {nav.languages.map(l => (
                <div key={l} className={`ftc${cur.lang===l?" s":""}`} onClick={()=>setCur(p=>({...emptyDest(p.startDate),lang:l}))}>{l}</div>
              ))}
            </div>
            {cur.lang && <>
              <p style={S.slbl}>Ülke</p>
              <div style={S.g3}>
                {(nav.countries[cur.lang]||[]).map(c => (
                  <div key={c} className={`ftc${cur.country===c?" s":""}`}
                    onClick={()=>setCur(p=>({...p,country:c,city:"",brand:"",course:null,acc:null}))}>{c}</div>
                ))}
              </div>
            </>}
            {cur.country && <>
              <p style={S.slbl}>Şehir</p>
              <div style={S.g3}>
                {(nav.cities[cur.country]||[]).map(c => (
                  <div key={c} className={`ftc${cur.city===c?" s":""}`}
                    onClick={()=>setCur(p=>({...p,city:c,brand:nav.brands[c]||"",course:null,acc:null}))}>{c}</div>
                ))}
              </div>
            </>}
            {cur.city && <div style={{ marginTop:16, padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13, color:"#64748b" }}>
              Okul markası: <strong style={{ color:"#0f172a" }}>{cur.brand}</strong>
            </div>}

            {/* Online Egitim Bolumu */}
            <div style={{ marginTop:28, paddingTop:24, borderTop:"1.5px dashed #e2e8f0" }}>
              <p style={{ fontSize:12, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>Online Eğitim Seçenekleri</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                {DB.ecLive.map((c,i) => (
                  <div key={i}
                    className={"ftc" + (cur.isOnline && cur.course?.name===c.name ? " s" : "")}
                    onClick={()=>setCur(p=>({...emptyDest(p.startDate), isOnline:true, brand:"EC", city:"EC Live", lang:"İngilizce", course:c}))}
                    style={{ padding:"14px", textAlign:"left" }}>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{c.hours} saat/hafta</div>
                    <div style={{ fontSize:12, fontWeight:600, marginTop:6, color: cur.isOnline && cur.course?.name===c.name ? "inherit" : ORANGE }}>
                      €{c.tiers[0].price}/hafta'dan
                    </div>
                  </div>
                ))}
              </div>
              {cur.isOnline && (
                <div style={{ marginTop:12, padding:"10px 14px", background:"#eff6ff", borderRadius:10, border:"1px solid #bfdbfe", fontSize:13, color:"#2563eb" }}>
                  ✓ Online kurs seçildi — konaklama adımı atlanacak
                </div>
              )}
            </div>
          </div>}

          {/* STEP 2 */}
          {step === 2 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>{cur.isOnline ? "EC Live Kurs Detayı" : "Kurs seç — " + cur.brand + " " + cur.city}</h2>
            <div style={S.r2}>
              <div style={S.fld}>
                <label style={S.lbl}>Başlangıç tarihi</label>
                <input className="fti" type="date" value={cur.startDate} onChange={e=>setCur(p=>({...p,startDate:e.target.value}))} />
              </div>
              <div style={S.fld}>
                <label style={S.lbl}>Süre (hafta)</label>
                <input className="fti" type="number" min={1} max={52} value={cur.weeks}
                  onChange={e=>setCur(p=>({...p,weeks:parseInt(e.target.value)||1,course:null}))} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
              {courses.map((c,i) => {
                const tier = c.tiers.find(t=>cur.weeks>=t.min&&(t.max===null||cur.weeks<=t.max));
                const pw = tier?.price;
                const total = pw ? pw*cur.weeks : null;
                const sel = cur.course?.name===c.name;
                const inv = !pw||(c.max_weeks&&cur.weeks>c.max_weeks);
                return (
                  <div key={i} className={`ftcc${sel?" s":""}${inv?" dis":""}`}
                    onClick={()=>{if(!inv)setCur(p=>({...p,course:c}))}}>
                    <div style={{ fontSize:14, fontWeight:600, color:sel?ORANGE:"#0f172a", marginBottom:6 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>{c.lessons} ders/h{c.hours?` · ${c.hours} saat`:""}</div>
                    {c.max_weeks && <div style={{ fontSize:12, color:"#94a3b8" }}>Maks. {c.max_weeks} hafta</div>}
                    {c.morning && <div style={{ fontSize:12, color:ORANGE, marginTop:4 }}>☀ Sabah garantisi</div>}
                    {pw ? <div style={{ fontSize:14, fontWeight:700, marginTop:10 }}>{c.currency} {pw}/h</div>
                        : <div style={{ fontSize:12, color:"#ef4444", marginTop:10 }}>Bu hafta geçersiz</div>}
                    {total && <div style={{ fontSize:12, color:"#64748b" }}>{cur.weeks}h: {fmt(total,c.currency)}</div>}
                    <button style={{ marginTop:10, width:"100%", padding:"7px", borderRadius:8,
                      border:`1.5px solid ${sel?ORANGE:"#e2e8f0"}`, background:sel?ORANGE:"transparent",
                      color:sel?"#fff":ORANGE, fontSize:13, cursor:inv?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:500 }}>
                      {sel?"Seçildi":"Seç"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>}

          {/* STEP 3 */}
          {step === 3 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Konaklama seç — {cur.brand} {cur.city}</h2>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Kurs süresi: {cur.weeks} hafta</div>
            {["Homestay","Student Residence","Shared Accommodation","Summer Residence"].map(type => {
              const list = accs.filter(a=>a.type===type);
              if (!list.length) return null;
              return (
                <div key={type} style={{ marginBottom:20 }}>
                  <p style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>{type}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {list.map((a,i) => {
                      const sel = cur.acc && cur.acc.name===a.name && cur.acc.board===a.board;
                      return (
                        <div key={i} className={`ftac${sel?" s":""}`} onClick={()=>setCur(p=>({...p,acc:a}))}>
                          <div>
                            <div style={{ fontSize:14, fontWeight:600, color:sel?ORANGE:"#0f172a" }}>{a.name}</div>
                            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{a.room} · {a.bathroom} · {a.board} · {a.dist}</div>
                            <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{cur.weeks}h: {fmt(a.price*cur.weeks,a.currency)}</div>
                          </div>
                          <div style={{ fontSize:15, fontWeight:700, color:"#0f172a", flexShrink:0 }}>{a.currency} {a.price}/h</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>}

          {/* STEP 4 */}
          {step === 4 && <div style={{ animation:"fadeUp .3s ease-out" }}>
            <h2 style={S.ttl}>Teklif özeti</h2>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
              Öğrenci: <strong style={{ color:"#0f172a" }}>{student.name||"—"}</strong>
              {student.age&&` · ${student.age} yaş`}{student.gender&&` · ${student.gender}`}
            </div>
            {destinations.length===0 && <div style={{ textAlign:"center", color:"#94a3b8", padding:"40px 0" }}>Destinasyon eklenmedi.</div>}
            {destinations.map((d,i) => {
              const key=`${d.brand}-${d.city}`;
              const f=getFees(key,d.weeks,d.isOnline);
              const cCost=getPrice(d.course,d.weeks);
              const aCost=d.acc?d.acc.price*d.weeks:0;
              const fT=f.reg+f.acc+f.mat;
              const tot=cCost+aCost+fT;
              const c=d.course?.currency||f.cur;
              return (
                <div key={i} style={{ border:"1.5px solid #e2e8f0", borderRadius:16, padding:"20px 24px", marginBottom:14, background:"#fff" }}>
                  <span style={S.pill}>{d.brand} {d.city} · {d.country} · {d.weeks}h</span>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"6px 24px", fontSize:13, marginTop:12 }}>
                    <span style={{ color:"#64748b" }}>Kurs</span><span style={{ fontWeight:600 }}>{d.course?.name||"—"}</span>
                    <span style={{ color:"#64748b" }}>Kurs ücreti</span><span style={{ fontWeight:600 }}>{fmt(cCost,c)}</span>
                    <span style={{ color:"#64748b" }}>Konaklama</span><span style={{ fontWeight:600 }}>{d.acc?`${d.acc.name} · ${d.acc.board}`:"—"}</span>
                    <span style={{ color:"#64748b" }}>Konaklama ücreti</span><span style={{ fontWeight:600 }}>{fmt(aCost,c)}</span>
                  </div>
                  <div style={{ borderTop:"1px solid #f1f5f9", marginTop:12, paddingTop:10, fontSize:12, color:"#94a3b8" }}>
                    Kayıt: {fmt(f.reg,f.cur)} · Placement: {fmt(f.acc,f.cur)} · Materyaller: {fmt(f.mat,f.cur)}
                  </div>
                  <div style={{ textAlign:"right", fontSize:16, fontWeight:700, marginTop:10 }}>{fmt(tot,c)}</div>
                </div>
              );
            })}
            {destinations.length>0 && (()=>{
              const totals={};
              destinations.forEach(d=>{
                const key=`${d.brand}-${d.city}`;
                const f=getFees(key,d.weeks,d.isOnline);
                const t=getPrice(d.course,d.weeks)+(d.acc?d.acc.price*d.weeks:0)+f.reg+f.acc+f.mat;
                const c=d.course?.currency||f.cur;
                totals[c]=(totals[c]||0)+t;
              });
              return (
                <div style={{ borderTop:"2px solid #0f172a", paddingTop:16, marginTop:4 }}>
                  {Object.entries(totals).map(([c,t])=>(
                    <div key={c} style={{ display:"flex", justifyContent:"space-between", fontSize:20, fontWeight:700, marginBottom:4 }}>
                      <span>Toplam ({c})</span>
                      <span style={{ color:ORANGE }}>{fmt(t,c)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>}

          {/* Nav */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:32 }}>
            {step>0 ? <button className="ftbb" onClick={()=>setStep(s=>s-1)}>← Geri</button> : <div/>}
            <div style={{ display:"flex", gap:8 }}>
              {step===3 && <button className="ftob" onClick={addDest}>+ Destinasyon ekle</button>}
              {step<4
                ? <button className="ftpb" disabled={!canNext} onClick={next}>{step===3?"Özete geç →":step===2&&cur.isOnline?"Özete geç →":"İleri →"}</button>
                : <>
                  <button className="ftpb" onClick={generatePDF} style={{ background:"#00C1DE" }}>PDF İndir</button>
                  <button className="ftpb" onClick={reset} style={{ background:"#64748b" }}>Yeni Teklif</button>
                </>
              }
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={S.side}>
          <div style={{ fontSize:14, fontWeight:600, color:"#0f172a", marginBottom:16 }}>Teklif Özeti</div>
          {sidebarDests.length===0
            ? <p style={{ fontSize:13, color:"#94a3b8" }}>Destinasyon henüz seçilmedi.</p>
            : sidebarDests.map((d,i)=>{
                const key=`${d.brand}-${d.city}`;
                const f=getFees(key,d.weeks,d.isOnline);
                const cCost=getPrice(d.course,d.weeks);
                const aCost=d.acc?d.acc.price*d.weeks:0;
                const tot=cCost+aCost+f.reg+f.acc+f.mat;
                const c=d.course?.currency||f.cur;
                return (
                  <div key={i} style={{ marginBottom:14, paddingBottom:14, borderBottom:"1px solid #f1f5f9" }}>
                    <span style={S.pill}>{d.city} · {d.weeks}h</span>
                    {d.course&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:8 }}>
                      <span style={{ color:"#64748b" }}>{d.course.name}</span>
                      <span style={{ fontWeight:600 }}>{fmt(cCost,c)}</span>
                    </div>}
                    {d.acc && !d.isOnline &&<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}>
                      <span style={{ color:"#64748b" }}>{d.acc.name}</span>
                      <span style={{ fontWeight:600 }}>{fmt(aCost,c)}</span>
                    </div>}
                    {d.course&&d.acc&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, marginTop:8, color:ORANGE }}>
                      <span>Toplam</span><span>{fmt(tot,c)}</span>
                    </div>}
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  hdr: { position:"sticky", top:0, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", zIndex:10 },
  htitle: { fontSize:15, fontWeight:600, color:"#0f172a" },
  steps: { display:"flex", alignItems:"center", background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0", overflowX:"auto" },
  body: { maxWidth:1100, margin:"0 auto", padding:"24px 24px 64px", display:"grid", gridTemplateColumns:"1fr 260px", gap:20, alignItems:"start" },
  main: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"28px 32px", animation:"fadeUp .3s ease-out" },
  side: { background:"#fff", borderRadius:20, border:"1.5px solid #e2e8f0", padding:"20px", position:"sticky", top:80 },
  ttl: { fontSize:17, fontWeight:700, color:"#0f172a", marginBottom:20, letterSpacing:"-0.3px" },
  slbl: { fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", margin:"16px 0 8px" },
  r2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:4 },
  fld: { display:"flex", flexDirection:"column", gap:6, marginBottom:16 },
  lbl: { fontSize:12, color:"#64748b" },
  g3: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 },
  pill: { display:"inline-block", background:ORANGE_LIGHT, color:ORANGE, fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:600 },
};
