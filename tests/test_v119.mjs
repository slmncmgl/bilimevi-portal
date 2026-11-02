import { readFileSync } from "fs"; import vm from "vm";
function yukle(p) {
  const src = readFileSync(p, "utf8");
  const a = src.indexOf("// Mode tespiti"), b = src.indexOf("export default function FiyatTeklifi");
  const ctx = { window: undefined, console, module: {}, URLSearchParams, document: undefined, bilimeviLogoAsset: "", getSession: () => null, useNavigate: () => null };
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b).replace(/^import .*$/gm, "").replace(/import\.meta\.env\.(\w+)/g, "undefined"), ctx);
  return ctx;
}
const v9 = yukle(process.argv[2]), v8 = yukle(process.argv[3]);
let fail = 0; const eq = (ad, got, want) => { if (got !== want) { console.log("FAIL", ad, JSON.stringify(got), "!=", JSON.stringify(want)); fail++; } else console.log("ok ", ad); };
// 1) tam eşleşme (yeni harita)
eq("eco tax", v9.normalizeFeeName("Accommodation Eco Tax"), "Devlet / Yerel Vergi");
eq("depozito", v9.normalizeFeeName("Accommodation Security Deposit (Refundable)"), "Depozito / Teminat Ücreti (iade edilir)");
eq("vita", v9.normalizeFeeName("Accommodation Placement Fee (VITA Student Residence)"), "Konaklama Ayarlama Ücreti (VITA Student Residence)");
eq("cavilam delf", v9.normalizeFeeName("DELF B2 Exam"), "Sınav Ücreti (DELF B2)");
// 2) yedek kural
eq("yedek-yer", v9.normalizeFeeName("Accommodation Placement Fee (Kensington Residence)"), "Konaklama Ayarlama Ücreti (Kensington Residence)");
eq("yedek-drop", v9.normalizeFeeName("Accommodation Placement Fee (Mandatory)"), "Konaklama Ayarlama Ücreti");
eq("yedek-ceviri", v9.normalizeFeeName("Homestay Deposit (Refundable)"), "Depozito / Teminat Ücreti (iade edilir)");
eq("yedek-yok", v9.normalizeFeeName("Mystery Fee (Whatever)"), "Mystery Fee (Whatever)");
// 3) eski davranış korunumu: v118'de haritada olan 93 ad v119'da aynı karşılığı veriyor
const eskiMap = Object.entries(vm.runInContext("FEE_NAME_MAP", v8));
let bozuk = 0;
for (const [k, tr] of eskiMap) if (v9.normalizeFeeName(k) !== tr) { console.log("FAIL eski ad degisti:", k); bozuk++; }
eq("eski 93 ad ayni", bozuk, 0);
// 4) indirimliAd
eq("tek parantez", v9.indirimliAd("Konaklama Ayarlama Ücreti (VITA Student Residence)", "Ücretsiz"), "Konaklama Ayarlama Ücreti (VITA Student Residence, ücretsiz)");
eq("parantezsiz", v9.indirimliAd("Materyal / Kitap Ücreti", "Ücretsiz"), "Materyal / Kitap Ücreti (Ücretsiz)");
eq("yuzde", v9.indirimliAd("Kurs İndirimi", "%10"), "Kurs İndirimi (%10)");
// 5) mergeFeeItems + computeDiscounts tutar regresyonu (sentetik veri, iki sürümde aynı tutar)
const fees = [
  { name: "Registration Fee", amount: 98, currency: "EUR", auto: false },
  { name: "Enrolment Fee", amount: 50, currency: "EUR", auto: false },
  { name: "Accommodation Placement Fee (VITA Student Residence)", amount: 60, currency: "EUR", auto: false },
];
const m9 = v9.mergeFeeItems(fees), m8 = v8.mergeFeeItems(fees);
eq("merge toplam", m9.reduce((t,f)=>t+f.amount,0), m8.reduce((t,f)=>t+f.amount,0));
eq("merge kayit birlesti", m9[0].amount, 148);
const disc = [{ discount_type: "percentage", applies_to: "fee", target_name: "Accommodation Placement Fee (VITA Student Residence)", value_type: "free", discount_value: 0, country: "UK" }];
const course = { name: "General English" };
const r9 = v9.computeDiscounts(disc, course, 4, "2027-01-11", { tuition: 1000, accommodation: 500, fees: m9 });
const r8 = v8.computeDiscounts(disc, course, 4, "2027-01-11", { tuition: 1000, accommodation: 500, fees: m8 });
eq("muafiyet tutar", r9[0]?.amount, r8[0]?.amount);
eq("muafiyet tutar 60", r9[0]?.amount, 60);
eq("muafiyet TR etiket", r9[0]?.label, m9.find(f=>f.parcalar.length===1 && f.parcalar[0].name.startsWith("Accommodation"))?.name);
eq("muafiyet ham etiket", r9[0]?.labelRaw, "Accommodation Placement Fee (VITA Student Residence)");
console.log(fail ? "SONUC: " + fail + " FAIL" : "SONUC: HEPSI OK");
process.exit(fail ? 1 : 0);
