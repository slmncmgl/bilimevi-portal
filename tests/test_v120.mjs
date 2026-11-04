// v120 testleri: hedefli konaklama indirimi (LSI Portland 55 senaryolari a-e) + geriye uyum regresyonu.
// Kullanim: node tests/test_v120.mjs src/pages/FiyatTeklifi.jsx [eski_surum.jsx]
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
const D = (s) => new Date(s);
const row = (ek = {}) => ({ discount_type: "percentage", applies_to: "accommodation", target_name: "Portland 55",
  value_type: "percentage", discount_value: 50, min_weeks: 4, reg_date_start: "2026-09-02", reg_date_end: "2026-12-31",
  exclude_start: "2027-06-13", exclude_end: "2027-08-22", max_stay_end: "2027-12-31", ...ek });
const T = (ek = {}) => ({ tuition: 2000, accommodation: 1860, fees: [], accPlace: "Portland 55", accWeeks: 6,
  accStart: D("2027-10-03"), accEnd: D("2027-11-14"), ...ek });
const kurs = { name: "General English 20" };
const run = (r, t, w = 6) => v.computeDiscounts([r], kurs, w, "2027-10-04", t);
// a) sezon disi 6 hafta: -930
eq("a tam indirim", run(row(), T()).map(x => x.amount), [930]);
// b) 01.08 varis, 3 hafta yuksek sezonda: -465
eq("b exclude orani", run(row(), T({ accStart: D("2027-08-01"), accEnd: D("2027-09-12") })).map(x => x.amount), [465]);
// c) homestay secili: indirim yok
eq("c hedef disi", run(row(), T({ accPlace: "Homestay Standard" })).length, 0);
// d) konaklama 3 hafta (kurs 6): min_weeks konaklamaya bakar, indirim yok
eq("d min hafta", run(row(), T({ accWeeks: 3, accommodation: 930, accEnd: D("2027-10-24") }), 6).length, 0);
// e) 2028'e sarkan kalis: indirim yok
eq("e max_stay_end", run(row(), T({ accStart: D("2027-11-28"), accEnd: D("2028-01-09") })).length, 0);
// f) eski tip satir (yeni alanlar bos, target yok): tum konaklamaya tam uygulanir
const eskiTip = row({ target_name: "", exclude_start: "", exclude_end: "", max_stay_end: "", min_weeks: null });
eq("f eski tip", run(eskiTip, T({ accPlace: "Homestay Standard" })).map(x => x.amount), [930]);
if (eski) { // g) regresyon: eski tip satirda v119 ile ayni tutar (acc alanlari olmadan cagri)
  const tEski = { tuition: 2000, accommodation: 1860, fees: [] };
  eq("g v119 regresyon", eski.computeDiscounts([eskiTip], kurs, 6, "2027-10-04", tEski).map(x => x.amount),
    run(eskiTip, tEski).map(x => x.amount));
}
console.log(fail ? "SONUC: " + fail + " FAIL" : "SONUC: HEPSI OK"); process.exit(fail ? 1 : 0);
