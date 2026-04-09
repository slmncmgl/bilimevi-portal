import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveSession } from "../utils/sheets";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";

async function findPersonel(email) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Personel`;
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.replace(/"/g, "").trim());
    const row = {};
    headers.forEach((h, j) => { row[h] = cols[j] || ""; });
    if (row["E-posta"]?.toLowerCase() === email.toLowerCase()) return row;
  }
  return null;
}

async function findModuller(name) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Mod%C3%BCller`;
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.replace(/"/g, "").trim());
    const row = {};
    headers.forEach((h, j) => { row[h] = cols[j] || ""; });
    if (row["Ad Soyad"] === name) return row;
  }
  return null;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Google hesabı doğrulanıyor...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      setMsg("Giriş iptal edildi.");
      setTimeout(() => navigate("/"), 2000);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();

        if (!data.email) {
          setMsg(data.error || "Giriş başarısız.");
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        const personel = await findPersonel(data.email);
        if (!personel) {
          setMsg("Bu Google hesabı sistemde kayıtlı değil.");
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        const moduller = await findModuller(personel["Ad Soyad"]);
        const user = {
          name:    personel["Ad Soyad"],
          email:   data.email,
          company: personel["Şirket"],
          branch:  personel["Şube"],
          title:   (personel["Title"] || "staff").toLowerCase(),
          rol:     (personel["Title"] || "staff").toLowerCase(),
          modules: {
            izin:      moduller?.["İzin Yönetimi"]?.toLowerCase() === "evet",
            instagram: moduller?.["İnstagram DM"]?.toLowerCase() === "evet",
            quiz:      moduller?.["Quiz Cevapları"]?.toLowerCase() === "evet",
            bulten:    moduller?.["Bülten Düzenleyici"]?.toLowerCase() === "evet",
            stm:       moduller?.["STM"]?.toLowerCase() === "evet",
            sozlesme:  moduller?.["Sözleşme"]?.toLowerCase() === "evet",
            kayitguncelle: moduller?.["Kayıt Güncelle"]?.toLowerCase() === "evet",
          },
        };
        saveSession(user);
        navigate("/dashboard");
      } catch (err) {
        setMsg("Bir hata oluştu. Lütfen tekrar deneyin.");
        setTimeout(() => navigate("/"), 3000);
      }
    })();
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <p style={styles.msg}>{msg}</p>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Sora', sans-serif" },
  card: { display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", background: "#fff", borderRadius: "20px", padding: "48px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  spinner: { width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  msg: { fontSize: "15px", color: "#475569", fontWeight: "500" },
};
