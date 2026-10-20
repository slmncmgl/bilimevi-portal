// English Path gerçek sheet verisi (ep.json) portalın kendi fonksiyonlarından geçer:
// fetchCityData (CSV okuma stub'lı) -> getTotalCoursePrice / konaklama -> calcFees(ctx) -> getDestinationTotals
import fs from "fs";
import vm from "vm";

const [, , jsxYolu, veriYolu] = process.argv;
const src = fs.readFileSync(jsxYolu, "utf8");
let kod = src.slice(src.indexOf("// Mode tespiti"), src.indexOf("export default function FiyatTeklifi"));
kod += "\n" + src.slice(src.indexOf("function addWeeksToDate"), src.indexOf("function PdfTemplate"));
kod = kod.replace(/import\.meta\.env\.\w+/g, "undefined");
const veri = JSON.parse(fs.readFileSync(veriYolu, "utf8"));
const ctx = { window: { location: { hostname: "x" } }, console: { log() {}, warn() {}, error: console.error },
  Date, Math, JSON, Promise, Set, Object, Array, String, Number, parseInt, parseFloat, isNaN, Intl, setTimeout, bilimeviLogoAsset: "", __veri: veri };
vm.createContext(ctx);
vm.runInContext(kod + `
;fetchCSVStaff = async (id, tab) => __veri[tab] || [];
globalThis.__api = { fetchCityData, calcFees, feeBaglami, getDestinationTotals, getTotalCoursePrice, getTotalAccommodationPrice, konaklamaHafta, BFT_BUILD_VERSION };`, ctx);
const api = ctx.__api;

async function teklif({ sehir, kurs, hafta, konaklama, oda, baslangic = "2026-11-02", yas = 25 }) {
  const cd = await api.fetchCityData("EP", sehir, true, "English Path");
  const course = cd.courses.find(c => c.name === kurs);
  if (!course) throw new Error("kurs yok: " + kurs);
  let acc = null;
  if (konaklama) {
    acc = cd.acc.find(a => a.name === konaklama && (!oda || a.room === oda) && (!a.min_weeks || hafta >= a.min_weeks) && (!a.max_weeks || hafta <= a.max_weeks))
       || cd.acc.find(a => a.name === konaklama);
    if (!acc) throw new Error("konaklama yok: " + konaklama);
  }
  const d = { course, weeks: hafta, accWeeks: hafta, startDate: baslangic, acc, cityData: cd, addons: [], paketUpgradeler: [], selectedPackage: null, holidayWeeks: 0 };
  d.courseTotalPrice = api.getTotalCoursePrice(course, hafta, baslangic).totalPrice;
  d.accTotalPrice = acc ? api.getTotalAccommodationPrice(acc, api.konaklamaHafta(d), baslangic).totalPrice : 0;
  const f = api.calcFees(cd.fees, hafta, yas, acc?.type, hafta, !!acc, api.feeBaglami(d));
  const t = api.getDestinationTotals(d, f);
  return { d, f, t, cur: course.currency };
}

function yaz(baslik, r) {
  console.log(`\n### ${baslik}`);
  console.log(`Kurs: ${r.d.course.name} ${r.d.weeks} hf = ${r.d.courseTotalPrice} ${r.cur}`);
  console.log(`Konaklama: ${r.d.acc ? `${r.d.acc.name} / ${r.d.acc.type} / ${r.d.acc.room} = ${r.d.accTotalPrice}` : "yok"}`);
  r.f.items.forEach(i => console.log(`  ücret  ${String(i.amount).padStart(6)}  ${i.name}${i.parcalar && i.parcalar.length > 1 ? "  [" + i.parcalar.map(p => p.name).join(" + ") + "]" : ""}`));
  r.t.appliedDiscounts.forEach(x => console.log(`  indirim -${x.amount}  ${x.label}`));
  console.log(`  TOPLAM ${r.t.grandTotal} ${r.cur}`);
}

const senaryolar = [
  ["Dubai, konaklamalı (ESAW Twin up to 4)", { sehir: "Dubai", kurs: "Classic Morning", hafta: 4, konaklama: "ESAW Shared Apartments", oda: "Twin (up to 4 students)" }],
  ["Dubai, konaklamasız", { sehir: "Dubai", kurs: "Classic Morning", hafta: 4 }],
  ["Malta, konaklamalı (Campus Hub)", { sehir: "Malta", kurs: "Classic Morning", hafta: 4, konaklama: "Campus Hub Residence" }],
  ["Malta, konaklamasız", { sehir: "Malta", kurs: "Classic Morning", hafta: 4 }],
  ["Dublin, Work & Study 25 hf, konaklamalı (Homestay)", { sehir: "Dublin", kurs: "Work & Study Classic Morning (25w)", hafta: 25, konaklama: "Homestay Standard" }],
  ["Dublin, Work & Study 25 hf, konaklamasız", { sehir: "Dublin", kurs: "Work & Study Classic Morning (25w)", hafta: 25 }],
  ["Toronto, Dream House Village (eşleşen parantez kontrolü)", { sehir: "Toronto", kurs: "Classic Morning", hafta: 4, konaklama: "Dream House Village" }],
  ["Toronto, Homestay (Dream House/CASA ücreti düşmeli)", { sehir: "Toronto", kurs: "Classic Morning", hafta: 4, konaklama: "Homestay Standard" }],
];
console.log("Portal:", api.BFT_BUILD_VERSION);
for (const [b, s] of senaryolar) {
  try { yaz(b, await teklif(s)); } catch (e) { console.log(`\n### ${b}\n  HATA: ${e.message}`); }
}
