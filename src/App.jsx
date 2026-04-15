import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
