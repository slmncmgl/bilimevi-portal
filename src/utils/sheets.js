const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;

async function fetchSheet(sheetName) {
  const res = await fetch(`${BASE_URL}${encodeURIComponent(sheetName)}`);
  if (!res.ok) throw new Error("Sheet okunamadı: " + sheetName);
  const csv = await res.text();
  return parseCSV(csv);
}

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || "").replace(/"/g, "").trim();
    });
    return row;
  });
}

export async function loginWithCredentials(username, password) {
  // Login sekmesi: A=E-posta, B=Kullanıcı Adı, C=Şifre
  // Header satırı bozuk olabileceğinden raw CSV ile index bazlı okuyoruz
  const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
  const csv = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Login`)
    .then(r => r.text());

  const lines = csv.trim().split("\n");
  // Satır 1 (index 0) header — atla, index 1'den itibaren veri
  const loginRow = lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return { mail: cols[0] || "", kullaniciAdi: cols[1] || "", sifre: cols[2] || "" };
  }).find(
    r => r.kullaniciAdi.toLowerCase() === username.toLowerCase() &&
         r.sifre === password.toString()
  );

  if (!loginRow) return { success: false, msg: "Hatalı kullanıcı adı veya şifre." };

  const personel = await fetchSheet("Personel");
  const moduller = await fetchSheet("Modüller");

  // Login satırındaki e-posta ile Personel'den bilgileri bul
  const user = personel.find(
    p => p["E-posta"]?.toLowerCase() === loginRow.mail.toLowerCase()
  );

  if (!user) return { success: false, msg: "Kullanıcı personel listesinde bulunamadı." };

  const modulRow = moduller.find(
    m => m["Ad Soyad"]?.toLowerCase() === user["Ad Soyad"]?.toLowerCase()
  );

  const modules = {
    izin:      modulRow?.["İzin Yönetimi"]?.toLowerCase() === "evet",
    instagram: modulRow?.["İnstagram DM"]?.toLowerCase() === "evet",
    quiz:      modulRow?.["Quiz Cevapları"]?.toLowerCase() === "evet",
    bulten:    modulRow?.["Bülten Düzenleyici"]?.toLowerCase() === "evet",
    stm:       modulRow?.["STM"]?.toLowerCase() === "evet",
    sozlesme:  modulRow?.["Sözleşme"]?.toLowerCase() === "evet",
  };

  return {
    success: true,
    user: {
      name:    user["Ad Soyad"],
      email:   user["E-posta"],
      company: user["Şirket"],
      branch:  user["Şube"],
      title:   (user["Title"] || "staff").toLowerCase(),
      rol:     (user["Title"] || "staff").toLowerCase(),
      modules,
    }
  };
}

export function saveSession(user) {
  sessionStorage.setItem("bilimevi_user", JSON.stringify(user));
}

export function getSession() {
  const data = sessionStorage.getItem("bilimevi_user");
  return data ? JSON.parse(data) : null;
}

export function clearSession() {
  sessionStorage.removeItem("bilimevi_user");
}
