const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
// 1. Spreadsheet ID'yi sabitlere ekle
const EXAM_RESULTS_SHEET_ID = '1LAu1ji5sr-ZHrpAEZ4jALtHg_re7KcEaKZ0IHj9IEYY';

// 2. Sınav sonuçlarını getiren fonksiyonu ekle
export const getExamResults = async (accessToken) => {
  try {
    // "Cevaplar" sekmesindeki tüm verileri çekiyoruz (A'dan Z'ye)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${EXAM_RESULTS_SHEET_ID}/values/Cevaplar!A:Z`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new Error('Sheet verisi çekilemedi');
    
    const data = await response.json();
    return data.values; // Bu bize satır satır dizi dönecek [['Zaman damgası', 'Danışman', 'Puan', ...], [...]]
  } catch (error) {
    console.error('getExamResults hatası:', error);
    return null;
  }
};


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
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwl7PcvG3pt6RFtoixFu7kBkY3UBWWPhDZgZslsF87Wz_U8x3EqVZ7d9TthTmcIoStF/exec";

  // Apps Script üzerinden login — gviz CSV sıralama sorununu aşmak için
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "loginWithKullaniciAdi", username, password })
  });
  const json = await res.json();

  if (!json.success) return { success: false, msg: json.msg || "Hatalı kullanıcı adı veya şifre." };

  // Personel ve modül bilgilerini gviz'den çek
  const personel = await fetchSheet("Personel");
  const moduller = await fetchSheet("Modüller");

  const user = personel.find(
    p => p["E-posta"]?.toLowerCase() === (json.email || "").toLowerCase()
      || p["Ad Soyad"]?.toLowerCase() === (json.userName || "").toLowerCase()
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
    kayitguncelle: modulRow?.["Kayıt Güncelle"]?.toLowerCase() === "evet",
    fiyatteklifi:  modulRow?.["Fiyat Teklifi"]?.toLowerCase() === "evet",
    katalogparse:  modulRow?.["Katalog Parse"]?.toLowerCase() === "evet",
    performansanalizi: modulRow?.["Performans Analizi"]?.toLowerCase() === "evet",
  };

  return {
    success: true,
    user: {
      name:    user["Ad Soyad"],
      email:   user["E-posta"],
      company: user["Şirket"],
      branch:  user["Şube"],
      title:   (user["title"] || user["Title"] || "staff").toLowerCase(),
      rol:     (user["title"] || user["Title"] || "staff").toLowerCase(),
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
