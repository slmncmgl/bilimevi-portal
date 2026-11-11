// v1.1 — Test Login: /test-login ve /test-giris route'ları, test sekmesinde turuncu uyarı şeridi
// v1.0 — /kayit-takip route'u ve KayitTakip import'u eklendi
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getSession } from "./utils/sheets";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Izin from "./pages/Izin";
import AuthCallback from "./pages/AuthCallback";
import SinavCevaplari from "./pages/SinavCevaplari";
import STMAwards from "./STMAwards";
import InstagramDM from "./pages/InstagramDM";
import BultenDuzenleyici from "./pages/BultenDuzenleyici";
import KayitGuncelle from "./pages/KayitGuncelle";
import FiyatTeklifi from "./pages/FiyatTeklifi";
import KatalogParse from "./pages/KatalogParse";
import PerformansAnalizi from './pages/PerformansAnalizi';
import AnketRaporu from './pages/AnketRaporu';
import KayitFormLinkleri from './pages/KayitFormLinkleri';
import KayitTakip from './pages/KayitTakip';
import TestLogin from './pages/TestLogin';
import TestGiris, { TEST_GIRIS_ANAHTARI } from './pages/TestGiris';

// Test Login ile açılan sekmede her sayfanın üstünde: kimin hesabında olunduğunu unutturmamak için
function TestGirisSeridi() {
  useLocation(); // sayfa değişince yeniden kontrol et
  let bilgi = null;
  try { bilgi = JSON.parse(sessionStorage.getItem(TEST_GIRIS_ANAHTARI) || "null"); } catch (_) {}
  const oturum = getSession();
  if (!bilgi || !oturum || String(oturum.email || "").toLowerCase() !== String(bilgi.email || "").toLowerCase()) return null;
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
      gap: "12px", flexWrap: "wrap", padding: "8px 16px", background: "#ea580c", color: "#fff",
      fontSize: "13px", fontWeight: 600, fontFamily: "Calibri, 'Segoe UI', sans-serif", boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    }}>
      <span>Test girişi: {oturum.name} olarak görüyorsun{bilgi.acan ? ` (${bilgi.acan} açtı)` : ""}. Yaptığın işlemler bu kişi adına kaydedilir.</span>
      <button onClick={() => window.close()}
        style={{ padding: "4px 10px", background: "#fff", color: "#c2410c", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
        Sekmeyi kapat
      </button>
    </div>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <TestGirisSeridi />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/izin" element={<Izin />} />
        <Route path="/sinav-cevaplari" element={<SinavCevaplari />} />
        <Route path="/stm" element={<STMAwards />} />
        <Route path="/instagram" element={<InstagramDM />} />
        <Route path="/bulten" element={<BultenDuzenleyici />} />
        <Route path="/kayit-guncelle" element={<KayitGuncelle />} />
        <Route path="/fiyat-teklifi" element={<FiyatTeklifi />} />
        <Route path="/katalog-parse" element={<KatalogParse />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/performans-analizi" element={<PerformansAnalizi />} />
        <Route path="/anket-raporu" element={<AnketRaporu />} />
        <Route path="/kayit-form-linkleri" element={<KayitFormLinkleri />} />
        <Route path="/kayit-takip" element={<KayitTakip />} />
        <Route path="/test-login" element={<TestLogin />} />
        <Route path="/test-giris" element={<TestGiris />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
