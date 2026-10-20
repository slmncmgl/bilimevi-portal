// K3 testi: SpreadsheetApp/Utilities sahte, bugün 2026-10-16 sabit.
const fs = require("fs"), vm = require("vm");
const kod = fs.readFileSync(process.argv[2], "utf8");

function sheet(grid) {
  const colors = grid.map(r => r.map(() => "#000000"));
  const sh = {
    grid, colors, name: "",
    getDataRange() { return sh.getRange(1, 1, grid.length, grid[0].length); },
    getMaxColumns() { return grid[0].length; }, getMaxRows() { return grid.length; },
    getLastColumn() { let m = 0; grid.forEach(r => r.forEach((v, i) => { if (v !== "") m = Math.max(m, i + 1); })); return m; },
    getLastRow() { let m = 0; grid.forEach((r, i) => { if (r.some(v => v !== "")) m = i + 1; }); return m; },
    insertColumnsAfter(_, n) { grid.forEach((r, i) => { for (let k = 0; k < n; k++) { r.push(""); colors[i].push("#000000"); } }); },
    getRange(row, col, nr = 1, nc = 1) {
      const it = (f) => { for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) f(row - 1 + r, col - 1 + c, r, c); };
      const rg = {
        getValues() { const o = []; for (let r = 0; r < nr; r++) o.push(grid[row - 1 + r].slice(col - 1, col - 1 + nc)); return o; },
        getFontColors() { const o = []; for (let r = 0; r < nr; r++) o.push(colors[row - 1 + r].slice(col - 1, col - 1 + nc)); return o; },
        setValues(v) { it((R, C, r, c) => grid[R][C] = v[r][c]); return rg; },
        setFontColors(v) { it((R, C, r, c) => colors[R][C] = v[r][c]); return rg; },
        setFontColor(x) { it((R, C) => colors[R][C] = x); return rg; },
        clearContent() { it((R, C) => grid[R][C] = ""); return rg; },
        setNumberFormat() { return rg; }, setFontWeight() { return rg; },
      };
      return rg;
    },
  };
  return sh;
}

const registry = sheet([
  ["school_brand", "drive_link", "last_updated", "addon_type", "eski1", "eski2"],
  ["Oxford", "https://docs.google.com/spreadsheets/d/OX/edit", "", "", "x", "y"],
  ["Kaplan", "https://docs.google.com/spreadsheets/d/KP/edit", "", "", "", ""],
  ["", "", "", "", "", ""],
]);
registry.colors[1][4] = "#dc2626";   // eski taramadan kalmış kırmızı
const disc = (rows) => sheet([["discount_type", "applies_to", "campaign_name", "reg_date_end"], ...rows]);
const files = {
  REG: { getSheetByName: () => registry },
  OX: { getSheetByName: () => disc([["percentage", "tuition", "a", "2026-10-16"], ["percentage", "tuition", "b", "2026-12-31"], ["percentage", "fee", "c", "2026-09-01"]]) },
  KP: { getSheetByName: () => disc([["percentage", "tuition", "d", "2026-10-17"], ["percentage", "accommodation", "e", "15.10.2026"]]) },
};
const logs = [];
const ctx = {
  SpreadsheetApp: { openById: (id) => files[id] || files.REG },
  Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
  Logger: { log: (s) => logs.push(s) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
  GmailApp: { sendEmail: (...a) => logs.push("MAIL " + a[1]) },
  Date: class extends Date { constructor(...a) { a.length ? super(...a) : super("2026-10-16T09:00:00Z"); } },
  Math, JSON, String, Object, Error,
};
vm.createContext(ctx);
vm.runInContext(kod.replace('"1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8"', '"REG"'), ctx);
vm.runInContext("tarayiciCalistir()", ctx);

const yaz = () => registry.grid.forEach((r, i) => console.log(r.slice(4).map((v, c) => (v === "" ? "''" : v) + (registry.colors[i][c + 4] === "#dc2626" ? "[K]" : "")).join(" | ")));
yaz();
let hata = 0;
const ok = (ad, a, b) => { const g = JSON.stringify(a) === JSON.stringify(b); if (!g) hata++; console.log((g ? "OK   " : "HATA ") + ad + ": " + JSON.stringify(a) + (g ? "" : " beklenen " + JSON.stringify(b))); };
const satir = (i) => registry.grid[i].slice(4, 4 + registry.grid[0].slice(4).filter(Boolean).length);
const renk = (i) => registry.colors[i].slice(4, 4 + satir(i).length).map(c => c === "#dc2626");
ok("başlıklar", satir(0), ["reg_end_tuition_1", "reg_end_tuition_2", "reg_end_accommodation_1", "reg_end_fee_1"]);
ok("Oxford değerleri", satir(1), ["2026-10-16", "2026-12-31", "-", "2026-09-01"]);
ok("Oxford kırmızı (bugün + geçmiş)", renk(1), [true, false, false, true]);
ok("Kaplan değerleri", satir(2), ["2026-10-17", "-", "2026-10-15", "-"]);
ok("Kaplan kırmızı (yarın değil, dün evet)", renk(2), [false, false, true, false]);
ok("boş satır boş kalır", satir(3), ["", "", "", ""]);
ok("başlık satırı kırmızı değil", renk(0), [false, false, false, false]);

// Günlük kontrol: renk tazeleme + bugün biten için mail
logs.length = 0;
vm.runInContext("kontrolcuCalistir()", ctx);
ok("günlük kontrol maili", logs.filter(l => l.startsWith("MAIL")), ["MAIL Bugun biten kampanya (1)"]);
console.log(hata ? hata + " HATA" : "TÜM TESTLER GEÇTİ");
