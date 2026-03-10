import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Izin from "./pages/Izin";
import AuthCallback from "./pages/AuthCallback";
import SinavCevaplari from "./pages/SinavCevaplari";

export default function App() {https://github.com/slmncmgl/bilimevi-portal/tree/main
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/izin" element={<Izin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Diğer modüller eklenecek */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
