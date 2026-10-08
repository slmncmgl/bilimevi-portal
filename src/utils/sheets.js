// v1.1 — login tek isteğe indirildi: Personel ve Modüller satırları Login Servisi (L3) cevabından geliyor, gviz istekleri kaldırıldı
// v1.0 — modules objesine "kayittakip" (Kayıt Takip) eklendi
import { LOGIN_SCRIPT_URL } from "../config";

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


export async function loginWithCredentials(username, password) {
  // Apps Script üzerinden login — gviz CSV sıralama sorununu aşmak için
  const res = await fetch(LOGIN_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "loginWithKullaniciAdi", username, password })
  });
  const json = await res.json();

  if (!json.success) return { success: false, msg: json.msg || "Hatalı kullanıcı adı veya şifre." };

  // Personel ve modül satırları artık login cevabıyla birlikte geliyor (tek istek)
  const user = json.personel;
  const modulRow = json.modulRow;

  if (!user) return { success: false, msg: "Kullanıcı personel listesinde bulunamadı." };

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
    anketraporu: modulRow?.["Anket Raporu"]?.toLowerCase() === "evet",
    kayitformlinkleri: modulRow?.["Kayıt Form Linkleri"]?.toLowerCase() === "evet",
    kayittakip: modulRow?.["Kayıt Takip"]?.toLowerCase() === "evet",
  
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
      phone:   json.phone || "",        // YENİ: Apps Script'ten gelen telefon (wa.me formatında)
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
