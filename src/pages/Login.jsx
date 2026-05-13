import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithCredentials, saveSession, getSession } from "../utils/sheets";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "931368494993-gahav7fg7ss663e3v82enk2e6au6onfa.apps.googleusercontent.com";
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || "https://bilimevi-portal.vercel.app/auth/callback";

function handleGoogleLogin() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  const oauthParams = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    ...(redirect ? { state: encodeURIComponent(redirect) } : {}),
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${oauthParams}`;
}

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [sifrePopup, setSifrePopup] = useState(false);
  const [sifreUsername, setSifreUsername] = useState("");
  const [sifreLoading, setSifreLoading] = useState(false);
  const [sifreMesaj, setSifreMesaj] = useState(null); // { type, msg }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (getSession()) {
      navigate(redirect ? decodeURIComponent(redirect) : "/dashboard");
      return;
    }
    const saved = localStorage.getItem("bilimevi_remember");
    if (saved) {
      try {
        const { username: u, password: p } = JSON.parse(saved);
        setUsername(u); setPassword(p); setRemember(true);
      } catch (_) {}
    }
  }, []);

  async function sifreyiGonder() {
    if (!sifreUsername.trim()) return;
    setSifreLoading(true);
    setSifreMesaj(null);
    try {
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzHwgMijahCSnV1Z0it_zN291S5XfIHPs6cJb13e_NEuuE9T90uw_b4bEu-nrmgo8QS/exec";

      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "sifreyiGonder", email: sifreUsername.trim() })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.msg || "Kullanıcı bulunamadı");
      setSifreMesaj({ type: "success", msg: "Şifreniz kayıtlı mail adresinize gönderildi." });
    } catch (err) {
      setSifreMesaj({ type: "error", msg: err.message });
    }
    setSifreLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await loginWithCredentials(username, password);
      if (res.success) {
        if (remember) {
          localStorage.setItem("bilimevi_remember", JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem("bilimevi_remember");
        }
        saveSession(res.user);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        navigate(redirect ? decodeURIComponent(redirect) : "/dashboard");
      } else {
        setError(res.msg);
      }
    } catch (err) {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <div style={styles.card} className="login-card">
        {/* Sol panel */}
        <div style={styles.leftPanel} className="login-left">
          <div style={styles.logoWrap} className="login-logo-wrap">
            <img
              src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg"
              alt="Bilimevi"
              style={styles.logo}
            />
          </div>
          <div style={styles.leftText} className="login-left-text">
            <h2 style={styles.leftTitle}>Hoş Geldiniz</h2>
            <p style={styles.leftSub}>
              Bilimevi Personel Portalı'na erişmek için giriş yapın.
            </p>
          </div>
          <p style={styles.leftFooter} className="login-left-footer">© {new Date().getFullYear()} Bilimevi Eğitim</p>
        </div>

        {/* Sağ panel */}
        <div style={styles.rightPanel} className="login-right">
          <div style={styles.formWrap}>
            <h1 style={styles.formTitle}>Giriş Yap</h1>
            <p style={styles.formSub}>Kullanıcı Adınızla Giriş Yapın</p>

            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Kullanıcı Adı</label>
                <div style={styles.inputWrap}>
                  <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    type="text" value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="kullanıcı adı" required
                    style={styles.input}
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Şifre</label>
                <div style={styles.inputWrap}>
                  <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type={showPass ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={styles.input}
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    {showPass ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Beni Hatırla */}
              <label style={styles.rememberWrap}>
                <input
                  type="checkbox" checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={styles.rememberText}>Beni Hatırla</span>
              </label>

              {/* Şifremi Gönder */}
              <button
                type="button"
                onClick={() => { setSifrePopup(true); setSifreUsername(username); setSifreMesaj(null); }}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: "0", fontFamily: "'Sora', sans-serif", textDecoration: "underline" }}
              >
                Kayıtlı Şifremi Gönder
              </button>

              {error && (
                <div style={styles.errorBox}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
                onMouseEnter={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                {loading ? (
                  <span style={styles.loadingWrap}>
                    <span style={styles.spinner} />
                    Giriş yapılıyor...
                  </span>
                ) : "Giriş Yap →"}
              </button>

              <div style={styles.divider}>
                <span style={styles.dividerLine} />
                <span style={styles.dividerText}>Şirket Mail Adresinizle Giriş Yapın</span>
                <span style={styles.dividerLine} />
              </div>

              <button
                type="button" style={styles.googleBtn}
                onClick={handleGoogleLogin}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile Giriş Yap
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Şifre Gönder Popup */}
      {sifrePopup && (
        <div onClick={() => { setSifrePopup(false); setSifreMesaj(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "360px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Şifreni Hatırlat</h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", lineHeight: 1.6 }}>
              Şirket mail adresinizi girdiğinizde "Şifreniz" mail adresinize gönderilecektir.
            </p>
            <input
              type="text"
              value={sifreUsername}
              onChange={e => setSifreUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sifreyiGonder()}
              placeholder="...@bilimevi.com"
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontFamily: "'Sora', sans-serif", outline: "none", marginBottom: "12px", boxSizing: "border-box" }}
            />
            {sifreMesaj && (
              <div style={{ padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "500", marginBottom: "12px", background: sifreMesaj.type === "success" ? "#ecfdf5" : "#fef2f2", border: `1px solid ${sifreMesaj.type === "success" ? "#a7f3d0" : "#fecaca"}`, color: sifreMesaj.type === "success" ? "#059669" : "#dc2626" }}>
                {sifreMesaj.msg}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setSifrePopup(false); setSifreMesaj(null); }}
                style={{ flex: 1, padding: "10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#64748b", fontFamily: "'Sora', sans-serif" }}>
                İptal
              </button>
              <button onClick={sifreyiGonder} disabled={sifreLoading || !sifreUsername.trim()}
                style={{ flex: 2, padding: "10px", background: sifreLoading || !sifreUsername.trim() ? "#bfdbfe" : "#2563eb", border: "none", borderRadius: "10px", cursor: sifreUsername.trim() && !sifreLoading ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: "600", color: "#fff", fontFamily: "'Sora', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {sifreLoading ? <><span style={{ display: "inline-block", width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Gönderiliyor...</> : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sora', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .login-card { flex-direction: column !important; min-height: unset !important; }
          .login-left { width: 100% !important; padding: 24px 20px !important; flex-direction: row !important; align-items: center !important; justify-content: center !important; gap: 0 !important; min-height: unset !important; }
          .login-left-text { display: none !important; }
          .login-left-footer { display: none !important; }
          .login-logo-wrap { padding: 14px 24px !important; }
          .login-right { padding: 28px 20px 36px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Sora', sans-serif", position: "relative", overflow: "hidden", padding: "20px" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f022 1px, transparent 1px), linear-gradient(90deg, #e2e8f022 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  bgGlow1: { position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, #dbeafe88 0%, transparent 70%)", zIndex: 0 },
  bgGlow2: { position: "fixed", bottom: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #ede9fe66 0%, transparent 70%)", zIndex: 0 },
  card: { display: "flex", width: "100%", maxWidth: "860px", minHeight: "540px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)", position: "relative", zIndex: 1, animation: "fadeUp 0.5s ease-out" },
  leftPanel: { width: "40%", background: "linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" },
  logoWrap: { background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.2)", alignSelf: "center" },
  logo: { width: "100%", height: "53px", objectFit: "contain", filter: "brightness(0) invert(1)" },
  leftText: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 0" },
  leftTitle: { fontSize: "26px", fontWeight: "700", color: "#fff", marginBottom: "12px", letterSpacing: "-0.5px" },
  leftSub: { fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: "1.7" },
  leftFooter: { fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.5px" },
  rightPanel: { flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" },
  formWrap: { width: "100%", maxWidth: "360px" },
  formTitle: { fontSize: "26px", fontWeight: "700", color: "#0f172a", marginBottom: "6px", letterSpacing: "-0.5px" },
  formSub: { fontSize: "13px", color: "#94a3b8", marginBottom: "32px" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: "14px", width: "16px", height: "16px", color: "#94a3b8", pointerEvents: "none" },
  input: { width: "100%", padding: "12px 14px 12px 42px", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontSize: "14px", color: "#0f172a", background: "#f8fafc", outline: "none", transition: "border-color 0.2s", fontFamily: "'Sora', sans-serif" },
  eyeBtn: { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: "4px" },
  rememberWrap: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" },
  checkbox: { width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" },
  rememberText: { fontSize: "13px", color: "#64748b", fontWeight: "500" },
  errorBox: { display: "flex", alignItems: "center", gap: "8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", fontWeight: "500" },
  submitBtn: { width: "100%", padding: "13px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 4px 14px rgba(37,99,235,0.35)", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.2px" },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  spinner: { display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  divider: { display: "flex", alignItems: "center", gap: "12px", margin: "2px 0" },
  dividerLine: { flex: 1, height: "1px", background: "#e2e8f0" },
  dividerText: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  googleBtn: { width: "100%", padding: "12px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontSize: "14px", fontWeight: "500", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "border-color 0.2s", fontFamily: "'Sora', sans-serif" },
};
