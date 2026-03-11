import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

export default function STM() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Calibri, sans-serif" }}>
      <div style={{ textAlign: "center", color: "#64748b" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" width="64" height="64" style={{ marginBottom: "16px" }}>
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
        </svg>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>STM Modülü</h2>
        <p style={{ fontSize: "14px" }}>Bu modül yakında aktif olacak.</p>
        <button onClick={() => navigate("/dashboard")}
          style={{ marginTop: "24px", padding: "9px 20px", background: "#0891b2", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
          ← Dashboard'a Dön
        </button>
      </div>
    </div>
  );
}
