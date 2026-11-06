// v124 testleri: Ek Ücretler adımında gösterilecek bir şey yoksa adım atlanır (ekUcretBosMu).
// Kullanim: node tests/test_v124.mjs src/pages/FiyatTeklifi.jsx
import { readFileSync } from "fs"; import vm from "vm";
function yukle(p) {
  const src = readFileSync(p, "utf8");
  const a = src.indexOf("// Mode tespiti"), b = src.indexOf("export default function FiyatTeklifi");
  const ctx = { window: undefined, console, module: {}, URLSearchParams, document: undefined, bilimeviLogoAsset: "", getSession: () => null, useNavigate: () => null };
  vm.createContext(ctx);
  const ek = src.slice(src.indexOf("function addWeeksToDate"), src.indexOf("function PdfTemplate"));   // bileşenden sonra tanımlı yardımcılar
  vm.runInContext((src.slice(a, b) + "\n" + ek).replace(/^import .*$/gm, "").replace(/import\.meta\.env\.(\w+)/g, "undefined"), ctx);
  return ctx;
}
const v = yukle(process.argv[2]);
let fail = 0; const eq = (ad, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { console.log("FAIL", ad, got, "!=", want); fail++; } else console.log("ok ", ad); };
const C = (fees, ek = {}) => ({ course: { name: "General English 20" }, weeks: 4, accWeeks: 4, startDate: "2027-03-01", acc: null,
  addons: [], cityData: { fees }, cityLoading: false, ...ek });
const opsiyonel = { fee_name: "Airport Assistance", amount: 30, addon_type: "optional_service", calculation_type: "fixed" };
const zorunlu = { fee_name: "Registration Fee", amount: 80, addon_type: "compulsory", calculation_type: "fixed" };
eq("ücret yok -> atla", v.ekUcretBosMu(C([]), 25), true);
eq("opsiyonel var -> göster", v.ekUcretBosMu(C([opsiyonel]), 25), false);
eq("zorunlu var -> göster", v.ekUcretBosMu(C([zorunlu]), 25), v.ekUcretListeleri(C([zorunlu]), 25).compulsory.length === 0);
eq("otomatik supplement eklenmiş -> göster", v.ekUcretBosMu(C([], { addons: [{ name: "Christmas", auto: true }] }), 25), false);
eq("veri yüklenmedi -> atlama", v.ekUcretBosMu(C([], { cityData: null }), 25), false);
eq("yükleniyor -> atlama", v.ekUcretBosMu(C([], { cityLoading: true }), 25), false);
eq("başka kursa özel opsiyonel -> atla", v.ekUcretBosMu(C([{ ...opsiyonel, eligible_courses: "IELTS" }]), 25), true);
eq("yaş dışı opsiyonel -> atla", v.ekUcretBosMu(C([{ ...opsiyonel, min_age: 30 }]), 25), true);
eq("tarih dışı opsiyonel -> atla", v.ekUcretBosMu(C([{ ...opsiyonel, date_start: "2027-07-01", date_end: "2027-08-31" }]), 25), true);
console.log(fail ? "SONUC: " + fail + " FAIL" : "SONUC: HEPSI OK"); process.exit(fail ? 1 : 0);
