// v122 testleri: danışmanın Özet'te elle girdiği indirim (getDestinationTotals) + geriye uyum regresyonu.
// Kullanim: node tests/test_v122.mjs src/pages/FiyatTeklifi.jsx [eski_surum.jsx]
import { readFileSync } from "fs"; import vm from "vm";
function yukle(p) {
  const src = readFileSync(p, "utf8");
  const a = src.indexOf("// Mode tespiti"), b = src.indexOf("export default function FiyatTeklifi");
  const ctx = { window: undefined, console, module: {}, URLSearchParams, document: undefined, bilimeviLogoAsset: "", getSession: () => null, useNavigate: () => null };
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b).replace(/^import .*$/gm, "").replace(/import\.meta\.env\.(\w+)/g, "undefined"), ctx);
  return ctx;
}
const v = yukle(process.argv[2]);
const eski = process.argv[3] ? yukle(process.argv[3]) : null;
let fail = 0; const eq = (ad, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { console.log("FAIL", ad, got, "!=", want); fail++; } else console.log("ok ", ad); };
const sheetIndirim = { discount_type: "percentage", applies_to: "tuition", value_type: "percentage", discount_value: 10 };
const acc = { name: "Residence A", type: "Residence", price: 300 };
const D = (ek = {}) => ({ course: { name: "General English 20" }, weeks: 6, startDate: "2027-10-04", acc,
  courseTotalPrice: 2000, accTotalPrice: 1800, addons: [], transfer: null, isOnline: false,
  cityData: { discounts: [sheetIndirim] }, ...ek });
const fees = { items: [{ name: "Registration Fee", amount: 100 }], total: 100 };
const t = (d) => v.getDestinationTotals(d, fees);
const elle = (d) => t(d).appliedDiscounts.filter(x => x.elle).map(x => x.amount);
// a) elle indirim yok: sheet indirimi 200, toplam 2000+1800+100-200
eq("a elle yok", [t(D()).discountsTotal, t(D()).grandTotal], [200, 3700]);
// b) kursa %10: 200 daha
eq("b kurs %10", [elle(D({ elleIndirim: { hedef: "tuition", tur: "percentage", deger: 10 } })), t(D({ elleIndirim: { hedef: "tuition", tur: "percentage", deger: 10 } })).grandTotal], [[200], 3500]);
// c) konaklamaya 150 sabit
eq("c konaklama 150", elle(D({ elleIndirim: { hedef: "accommodation", tur: "fixed", deger: 150 } })), [150]);
// d) genel toplam %10: taban sheet indirimi düşülmüş toplam (3700)
eq("d toplam %10", elle(D({ elleIndirim: { hedef: "total", tur: "percentage", deger: 10 } })), [370]);
// e) sabit tutar kalemi geçemez
eq("e tavan", elle(D({ elleIndirim: { hedef: "accommodation", tur: "fixed", deger: 5000 } })), [1800]);
// f) konaklama yokken konaklama indirimi uygulanmaz
eq("f konaklama yok", elle(D({ acc: null, accTotalPrice: 0, elleIndirim: { hedef: "accommodation", tur: "fixed", deger: 100 } })), []);
// g) online kursta uygulanmaz
eq("g online", elle(D({ isOnline: true, elleIndirim: { hedef: "tuition", tur: "percentage", deger: 10 } })), []);
// h) geçersiz değer (0, negatif, %>100 kırpılır)
eq("h sifir", elle(D({ elleIndirim: { hedef: "tuition", tur: "percentage", deger: 0 } })), []);
eq("h %150 -> %100", elle(D({ elleIndirim: { hedef: "tuition", tur: "percentage", deger: 150 } })), [2000]);
// i) PDF etiketi sheet indirimiyle aynı, staff etiketi "(elle)"
const s = t(D({ elleIndirim: { hedef: "tuition", tur: "percentage", deger: 5, not: "Kasım" } })).appliedDiscounts.find(x => x.elle);
eq("i etiket", [v.indirimliAd(s.label, v.indirimEtiket(s)), v.indirimliAd(s.labelRaw, v.indirimEtiket(s)), s.not], ["Kurs İndirimi (%5)", "Kurs İndirimi (elle, %5)", "Kasım"]);
eq("i toplam etiketi", v.indirimliAd("İndirim", v.indirimEtiket({ value_type: "fixed", value: 150 })), "İndirim (150 Sabit)");
// j) paket teklifinde elle indirim yok sayılır
const paket = { discount_type: "fixed_package", course_name: "General English 20", weeks: 6, package_price: 2500, package_type: "no_accommodation" };
const pd = t(D({ selectedPackage: paket, elleIndirim: { hedef: "total", tur: "percentage", deger: 10 } }));
eq("j paket", [pd.isPackage, pd.discountsTotal], [true, 0]);
if (eski) { // k) regresyon: elle indirimsiz destinasyonda v121 ile birebir aynı sonuç
  for (const d of [D(), D({ acc: null, accTotalPrice: 0 }), D({ cityData: { discounts: [] } })]) {
    const a = eski.getDestinationTotals(d, fees), b = t(d);
    eq("k v121 regresyon", [b.grandTotal, b.discountsTotal, b.appliedDiscounts.length], [a.grandTotal, a.discountsTotal, a.appliedDiscounts.length]);
  }
}
console.log(fail ? "SONUC: " + fail + " FAIL" : "SONUC: HEPSI OK"); process.exit(fail ? 1 : 0);
