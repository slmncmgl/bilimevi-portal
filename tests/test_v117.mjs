// v117 ücret muafiyeti testi: JSX'ten saf fonksiyonları çekip sahte Oxford verisiyle çalıştırır.
import fs from "fs";
import vm from "vm";

function yukle(dosya) {
  const src = fs.readFileSync(dosya, "utf8");
  const bas = src.indexOf("// Mode tespiti");
  const son = src.indexOf("export default function FiyatTeklifi");
  const addW = src.slice(src.indexOf("function addWeeksToDate"), src.indexOf("function PdfTemplate"));
  let kod = src.slice(bas, son) + "\n" + addW;
  kod = kod.replace(/import\.meta\.env\.\w+/g, "undefined");
  const ctx = { window: { location: { hostname: "x" } }, console: { log() {}, warn() {}, error: console.error }, Date, Math, JSON, Promise, Set, Object, Array, String, Number, parseInt, parseFloat, isNaN, Intl, bilimeviLogoAsset: "" };
  vm.createContext(ctx);
  vm.runInContext(kod + "\n;globalThis.__api = { calcFees, feeBaglami, getDestinationTotals, getTotalCoursePrice, getTotalAccommodationPrice, konaklamaHafta, indirimEtiket, BFT_BUILD_VERSION };", ctx);
  return ctx.__api;
}

const course = { name: "Morning 20", turkishName: "", language: "English", currency: "GBP", hs_supp: 0, tiers: [{ min: 4, max: 7, price: 300 }] };
const vita = { name: "VITA Student Residence", type: "Residence", room: "", bathroom: "", board: "", price: 365, hs_price: 0, currency: "GBP" };
const fee = (name, amount) => ({ name, amount, currency: "GBP", calc_type: "per_booking", addon_type: "compulsory", eligible_courses: "", date_start: "", date_end: "", min_age: null, max_age: null, tier_min: null, tier_max: null });
const disc = (o) => ({ discount_type: "percentage", city: "Londra", country: "", reg_date_start: "", reg_date_end: "2026-12-31", arrival_start: "", arrival_end: "", min_weeks: null, max_weeks: null, eligible_courses: "", excluded_courses: "", applies_to: "", target_name: "", discount_value: 0, value_type: "", ...o });

function cityData(ekFees = []) {
  return {
    courses: [course], acc: [vita], transfers: [],
    fees: [fee("Enrolment Fee", 80), fee("Course Materials", 80), fee("Accommodation Placement Fee (VITA Student Residence)", 70), fee("Residence Security Deposit (Refundable)", 100), ...ekFees],
    discounts: [
      disc({ applies_to: "tuition", discount_value: 35, value_type: "percentage", eligible_courses: "Morning 20" }),
      disc({ applies_to: "fee", target_name: "Course Materials", value_type: "free" }),
      disc({ applies_to: "fee", target_name: "Accommodation Placement Fee (VITA Student Residence)", value_type: "free" }),
    ],
  };
}

function senaryo(api, { acc = vita, ekFees = [], ekDisc = [] } = {}) {
  const cd = cityData(ekFees); cd.discounts.push(...ekDisc);
  const d = { course, weeks: 4, accWeeks: 4, startDate: "2026-11-02", acc, cityData: cd, addons: [], paketUpgradeler: [], selectedPackage: null, holidayWeeks: 0 };
  d.courseTotalPrice = api.getTotalCoursePrice(course, 4, d.startDate).totalPrice;
  d.accTotalPrice = acc ? api.getTotalAccommodationPrice(acc, api.konaklamaHafta(d), d.startDate).totalPrice : 0;
  const f = api.calcFees(cd.fees, 4, 25, acc?.type, 4, !!acc, api.feeBaglami(d));
  const t = api.getDestinationTotals(d, f);
  return { d, f, t };
}

let hata = 0;
const esit = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) hata++; console.log(`${ok ? "OK  " : "HATA"} ${ad}: ${JSON.stringify(a)}${ok ? "" : "  beklenen " + JSON.stringify(b)}`); };
const yaz = ({ d, f, t }, api) => {
  console.log(`  Kurs ${d.courseTotalPrice} | Konaklama ${d.accTotalPrice}`);
  f.items.forEach(i => console.log(`  Ücret: ${i.name} ${i.amount}`));
  t.appliedDiscounts.forEach(x => console.log(`  İndirim: ${x.label} (${api.indirimEtiket(x)}) -${x.amount}`));
  console.log(`  TOPLAM ${t.grandTotal}`);
};

const dosya = process.argv[2];
const api = yukle(dosya);
console.log("== Sürüm:", api.BFT_BUILD_VERSION, "==\n");

console.log("1) Oxford Londra, Morning 20, 4 hafta, VITA");
const s1 = senaryo(api); yaz(s1, api);
esit("ücretler tam tutar", s1.f.items.map(i => [i.name, i.amount]), [["Kayıt Ücreti", 80], ["Materyal / Kitap Ücreti", 80], ["Accommodation Placement Fee (VITA Student Residence)", 70], ["Residence Security Deposit (Refundable)", 100]]);
esit("indirimler", s1.t.appliedDiscounts.map(x => [x.label, api.indirimEtiket(x), x.amount]), [["Kurs İndirimi", "%35", 420], ["Materyal / Kitap Ücreti", "Ücretsiz", 80], ["Accommodation Placement Fee (VITA Student Residence)", "Ücretsiz", 70]]);
esit("toplam", s1.t.grandTotal, 1200 + 1460 + 330 - 570);

console.log("\n2) Konaklamasız");
const s2 = senaryo(api, { acc: null }); yaz(s2, api);
esit("ücretler", s2.f.items.map(i => i.name), ["Kayıt Ücreti", "Materyal / Kitap Ücreti"]);
esit("indirimler", s2.t.appliedDiscounts.map(x => [x.label, x.amount]), [["Kurs İndirimi", 420], ["Materyal / Kitap Ücreti", 80]]);

console.log("\n3) Birleşen kayıt ücreti: Registration Fee 50 + Enrolment Fee 80 aynı satırda, sadece Registration muaf");
const s3 = senaryo(api, { ekFees: [fee("Registration Fee", 50)], ekDisc: [disc({ applies_to: "fee", target_name: "registration fee ", value_type: "free" })] }); yaz(s3, api);
esit("Kayıt Ücreti satırı tam (130)", s3.f.items.find(i => i.name === "Kayıt Ücreti").amount, 130);
esit("sadece 50 düşer", s3.t.appliedDiscounts.find(x => x.label === "Kayıt Ücreti")?.amount, 50);

console.log("\n4) Var olmayan hedef ücret: indirim çıkmaz");
const s4 = senaryo(api, { ekDisc: [disc({ applies_to: "fee", target_name: "Airport Pickup", value_type: "free" })] });
esit("ekstra indirim yok", s4.t.appliedDiscounts.length, 3);

console.log(`\n${hata ? hata + " HATA" : "TÜM TESTLER GEÇTİ"}`);
process.exitCode = hata ? 1 : 0;
