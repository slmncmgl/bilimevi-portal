import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

export default function KatalogParse() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
  }, []);

  if (!user) return null;

  return (
    <div style={S.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <button onClick={() => navigate("/dashboard")} style={S.backBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <img src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg" alt="Bilimevi" style={{ height:"28px" }} />
          </div>
          <span style={{ fontSize:"14px", fontWeight:"600", color:"#0f172a" }}>Katalog Parse</span>
          <div style={{ fontSize:"12px", color:"#94a3b8" }}>{user.name}</div>
        </div>
      </header>

      <div style={{ maxWidth:"700px", margin:"80px auto", padding:"0 24px", textAlign:"center" }}>
        <div style={{ width:"72px", height:"72px", borderRadius:"20px", background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" width="36" height="36">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <h1 style={{ fontSize:"24px", fontWeight:"700", color:"#0f172a", marginBottom:"12px", letterSpacing:"-0.5px" }}>Katalog Parse</h1>
        <p style={{ fontSize:"14px", color:"#64748b", lineHeight:"1.7", marginBottom:"32px" }}>
          Bu modül, okul katalog PDF'lerini parse edip veritabanına aktarmak için kullanilacak. Su an gelistirme asamasindadir.
        </p>

        <div style={{ background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:"20px", padding:"28px", textAlign:"left" }}>
          <div style={{ fontSize:"13px", fontWeight:"600", color:"#0f172a", marginBottom:"16px" }}>Yol Haritasi</div>
          {[
            { done:true,  label:"Standart veritabani semasi tasarlandi (6 sekme)" },
            { done:true,  label:"EC katalog parse kurallari belgelendi (108 kural)" },
            { done:true,  label:"11 sehir parse edildi: London, Dublin, Brighton, Cambridge, Manchester, Malta, Cape Town, Dubai, Montreal, Boston, Dublin 30+" },
            { done:false, label:"PDF yukleme ve okul profili secimi arayuzu" },
            { done:false, label:"Otomatik parse + onay ekrani" },
            { done:false, label:"Google Sheets'e yazma entegrasyonu" },
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"10px 0", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ width:"20px", height:"20px", borderRadius:"50%", background: item.done?"#dcfce7":"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                {item.done
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
                  : <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#cbd5e1" }} />
                }
              </div>
              <span style={{ fontSize:"13px", color: item.done?"#0f172a":"#94a3b8", lineHeight:"1.5" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#f8fafc", fontFamily:"'Sora',sans-serif" },
  header: { position:"sticky", top:0, background:"rgba(255,255,255,0.9)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", zIndex:10 },
  headerInner: { maxWidth:"1100px", margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  backBtn: { display:"flex", alignItems:"center", justifyContent:"center", width:"32px", height:"32px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"#fff", cursor:"pointer", color:"#64748b" },
};
