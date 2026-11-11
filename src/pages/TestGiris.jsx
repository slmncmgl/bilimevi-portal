// TestGiris.jsx v1.0: Test Login'in açtığı yan sekme
// Açan sekmeye "hazırım" der, /api/test-login cevabını postMessage ile alır, bu sekmenin oturumunu o kişiye çevirir.
// Kullanıcı nesnesi utils/sheets.js > loginWithCredentials ile aynı biçimde kurulur: orada modül eklenirse buraya da ekle.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveSession } from "../utils/sheets";
import { tokenKaydet, tokenSil } from "../lib/oturum.js";

export const TEST_GIRIS_ANAHTARI = "bilimevi_test_giris";

function kullaniciKur({ personel: user, modulRow, phone }) {
  const evet = ad => modulRow?.[ad]?.toLowerCase() === "evet";
  const title = (user["title"] || user["Title"] || "staff").toLowerCase();
  return {
    name: user["Ad Soyad"],
    email: user["E-posta"],
    company: user["Şirket"],
    branch: user["Şube"],
    title,
    rol: title,
    phone: phone || "",
    modules: {
      izin: evet("İzin Yönetimi"),
      instagram: evet("İnstagram DM"),
      quiz: evet("Quiz Cevapları"),
      bulten: evet("Bülten Düzenleyici"),
      stm: evet("STM"),
      sozlesme: evet("Sözleşme"),
      kayitguncelle: evet("Kayıt Güncelle"),
      fiyatteklifi: evet("Fiyat Teklifi"),
      katalogparse: evet("Katalog Parse"),
      performansanalizi: evet("Performans Analizi"),
      anketraporu: evet("Anket Raporu"),
      kayitformlinkleri: evet("Kayıt Form Linkleri"),
      kayittakip: evet("Kayıt Takip"),
    },
  };
}

export default function TestGiris() {
  const navigate = useNavigate();
  const [durum, setDurum] = useState(window.opener ? "Giriş yapılıyor..." : "Bu sayfa Test Login ekranından açılmalı.");

  useEffect(() => {
    if (!window.opener) return;
    const dinle = e => {
      if (e.origin !== window.location.origin || e.source !== window.opener) return;
      if (e.data?.tur === "test-giris-hata") { setDurum(`Giriş yapılamadı: ${e.data.mesaj}`); return; }
      if (e.data?.tur !== "test-giris" || !e.data.personel) return;
      window.removeEventListener("message", dinle);
      tokenSil();
      const kullanici = kullaniciKur(e.data);
      saveSession(kullanici);
      tokenKaydet(e.data.token);
      // Şerit sadece oturum hâlâ bu kişiyse görünür (sekmede çıkış yapıp kendi hesabınla girersen kaybolur)
      try { sessionStorage.setItem(TEST_GIRIS_ANAHTARI, JSON.stringify({ email: kullanici.email, acan: e.data.acan || "" })); } catch (_) {}
      navigate("/dashboard", { replace: true });
    };
    window.addEventListener("message", dinle);
    window.opener.postMessage({ tur: "test-giris-hazir" }, window.location.origin);
    return () => window.removeEventListener("message", dinle);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "Calibri, 'Segoe UI', sans-serif", color: "#334155", fontSize: "15px", padding: "16px", textAlign: "center" }}>
      {durum}
    </div>
  );
}
