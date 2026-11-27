// v1.0 (26.11.2026): sayfada beklenmeyen bir hata olunca beyaz ekran yerine hata mesajı + Yenile/Geri düğmeleri.
// Hata metni ve hangi bileşende olduğu ekranda görünür, Selman'a iletilip düzeltilebilsin diye kopyalanabilir.
import { Component } from "react";

export default class HataYakalayici extends Component {
  constructor(p) { super(p); this.state = { hata: null, yer: "" }; }
  static getDerivedStateFromError(hata) { return { hata }; }
  componentDidCatch(hata, bilgi) {
    const yer = String(bilgi?.componentStack || "").trim().split("\n").slice(0, 4).map(s => s.trim()).join(" ← ");
    this.setState({ yer });
    console.error("[portal hata]", hata, bilgi?.componentStack);
  }
  render() {
    if (!this.state.hata) return this.props.children;
    const metin = `${this.state.hata?.message || String(this.state.hata)}\n${this.state.yer}\n${location.pathname} · ${new Date().toLocaleString("tr-TR")}`;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div style={{ width: "min(620px, 100%)", background: "#fff", border: "1.5px solid #fecaca", borderRadius: "18px", padding: "24px", boxShadow: "0 12px 32px rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#991b1b", marginBottom: "6px" }}>Sayfada bir hata oluştu</div>
          <div style={{ fontSize: "14px", color: "#475569", marginBottom: "14px" }}>Aşağıdaki metni Selman'a iletin. Sayfayı yenileyerek devam edebilirsiniz.</div>
          <pre style={{ margin: 0, padding: "12px", background: "#fef2f2", borderRadius: "10px", fontSize: "12px", color: "#7f1d1d", whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "40vh", overflowY: "auto" }}>{metin}</pre>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => location.reload()} style={{ padding: "9px 18px", border: "none", borderRadius: "10px", background: "var(--marka)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sayfayı yenile</button>
            <button type="button" onClick={() => navigator.clipboard?.writeText(metin)} style={{ padding: "9px 18px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#fff", color: "#334155", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Hatayı kopyala</button>
            <button type="button" onClick={() => { location.href = "/dashboard"; }} style={{ padding: "9px 18px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#fff", color: "#334155", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Ana sayfa</button>
          </div>
        </div>
      </div>
    );
  }
}
