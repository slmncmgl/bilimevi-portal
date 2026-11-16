// v126 testleri: okul dosyası okul+şehir çiftine göre seçilir (fetchNav -> schoolSheets).
// Kullanim: node tests/test_v126.mjs src/pages/FiyatTeklifi.jsx
import { readFileSync } from "fs"; import vm from "vm";
const src = readFileSync(process.argv[2], "utf8");
const a = src.indexOf("// Mode tespiti"), b = src.indexOf("export default function FiyatTeklifi");
const MASTER = [
  ["school_brand","country","city","language","drive_link","sheet_name","parse_status"],
  ["Positively Languages","France","Lyon","Fransızca","https://docs.google.com/spreadsheets/d/ESKI_DOSYA_2027_xxxxxxxx/edit","Positively","approved"],
  ["Positively Languages","UK","Cambridge","İngilizce","https://docs.google.com/spreadsheets/d/KAMPANYA_2026_xxxxxxxxx/edit","Positively","approved"],
  ["Positively Languages","UK","Londra","İngilizce","https://docs.google.com/spreadsheets/d/KAMPANYA_2026_xxxxxxxxx/edit","Positively","approved"],
  ["St Giles","UK","Brighton","İngilizce","https://docs.google.com/spreadsheets/d/STGILES_xxxxxxxxxxxxxxxx/edit","St Giles","approved"],
  ["St Giles","UK","Cambridge","İngilizce","https://docs.google.com/spreadsheets/d/STGILES_xxxxxxxxxxxxxxxx/edit","St Giles","approved"],
  ["Taslak Okul","UK","Leeds","İngilizce","https://docs.google.com/spreadsheets/d/TASLAK_xxxxxxxxxxxxxxxxx/edit","T",""],
];
const fetchStub = async (u, init) => {
  const body = init?.body ? JSON.parse(init.body) : {};
  const values = body.tab === "master_index" ? MASTER : [["school_brand","city","description"]];
  return { ok: true, status: 200, json: async () => ({ values }) };
};
const ctx = { window: { location: { hostname: "localhost", origin: "http://localhost" } }, console, module: {}, URLSearchParams,
  document: undefined, bilimeviLogoAsset: "", getSession: () => null, useNavigate: () => null, fetch: fetchStub };
vm.createContext(ctx);
vm.runInContext(src.slice(a, b).replace(/^import .*$/gm, "").replace(/import\.meta\.env\.(\w+)/g, '"MASTER"'), ctx);
let fail = 0; const eq = (ad, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { console.log("FAIL", ad, got, "!=", want); fail++; } else console.log("ok ", ad); };
const nav = await ctx.fetchNav(true);
const ss = nav.schoolSheets;
const sec = (brand, city) => (ss[`${brand}__${city}`] || ss[brand])?.sheetId;
eq("Positively Cambridge -> kampanya dosyası", sec("Positively Languages", "Cambridge"), "KAMPANYA_2026_xxxxxxxxx");
eq("Positively Londra -> kampanya dosyası", sec("Positively Languages", "Londra"), "KAMPANYA_2026_xxxxxxxxx");
eq("Positively Lyon -> eski dosya", sec("Positively Languages", "Lyon"), "ESKI_DOSYA_2027_xxxxxxxx");
eq("okul anahtarı ilk satır (yedek, eski davranış)", ss["Positively Languages"].sheetId, "ESKI_DOSYA_2027_xxxxxxxx");
eq("tek dosyalı okul değişmez", [sec("St Giles", "Brighton"), sec("St Giles", "Cambridge")], ["STGILES_xxxxxxxxxxxxxxxx", "STGILES_xxxxxxxxxxxxxxxx"]);
eq("listede olmayan şehir okul anahtarına düşer", sec("St Giles", "Oxford"), "STGILES_xxxxxxxxxxxxxxxx");
eq("onaysız satır alınmaz", ss["Taslak Okul"], undefined);
console.log(fail ? "SONUC: " + fail + " FAIL" : "SONUC: HEPSI OK"); process.exit(fail ? 1 : 0);
