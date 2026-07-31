import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithCredentials, saveSession, getSession } from "../utils/sheets";
import logo from "../assets/Bilimevi_study_abroad.png";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "931368494993-gahav7fg7ss663e3v82enk2e6au6onfa.apps.googleusercontent.com";
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || "https://bilimevi-portal.vercel.app/auth/callback";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxseCtKe77TrSuQRmWE635YMGHgeRiWNxXcusertZo62sjA_9aBC400e7mHsJUZ6UfJ/exec";

const translations = {
  tr: {
    title: "Hoş Geldiniz",
    sub: "Bilimevi Personel Portalı'na erişmek için giriş yapın.",
    formTitle: "Giriş Yap",
    formSub: "Kullanıcı Adınızla Giriş Yapın",
    username: "Kullanıcı Adı",
    password: "Şifre",
    remember: "Beni Hatırla",
    forgot: "Kayıtlı Şifremi Gönder",
    loginBtn: "Giriş Yap →",
    loginLoading: "Giriş yapılıyor...",
    googleText: "Şirket Mail Adresinizle Giriş Yapın",
    googleBtn: "Google ile Giriş Yap",
    errorConn: "Bağlantı hatası. Lütfen tekrar deneyin.",
    popupTitle: "Şifreni Hatırlat",
    popupSub: "Şirket mail adresinizi girdiğinizde \"Şifreniz\" mail adresinize gönderilecektir.",
    popupCancel: "İptal",
    popupSend: "Gönder",
    popupSending: "Gönderiliyor...",
    popupSuccess: "Şifreniz kayıtlı mail adresinize gönderildi.",
    retryOverlay: "Giriş Yapılıyor..."
  },
  en: {
    title: "Welcome",
    sub: "Log in to access the Bilimevi Staff Portal.",
    formTitle: "Sign In",
    formSub: "Sign in with your Username",
    username: "Username",
    password: "Password",
    remember: "Remember Me",
    forgot: "Send My Registered Password",
    loginBtn: "Sign In →",
    loginLoading: "Signing in...",
    googleText: "Sign In with Your Company Email",
    googleBtn: "Sign In with Google",
    errorConn: "Connection error. Please try again.",
    popupTitle: "Remind Password",
    popupSub: "When you enter your company email address, your password will be sent to your email.",
    popupCancel: "Cancel",
    popupSend: "Send",
    popupSending: "Sending...",
    popupSuccess: "Your password has been sent to your registered email address.",
    retryOverlay: "Signing in..."
  }
};

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

  const [lang] = useState(() => {
    const browserLang = navigator.language || navigator.userLanguage || "tr";
    return browserLang.startsWith("tr") ? "tr" : "en";
  });

  const t = translations[lang];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [sifrePopup, setSifrePopup] = useState(false);
  const [sifreUsername, setSifreUsername] = useState("");
  const [sifreLoading, setSifreLoading] = useState(false);
  const [sifreMesaj, setSifreMesaj] = useState(null);
  const sifreInputRef = useRef(null);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef(null);

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
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  async function sifreyiGonder() {
    if (!sifreUsername.trim()) return;
    setSifreLoading(true);
    setSifreMesaj(null);

    try {
      let res;
      try {
        res = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "sifreyiGonder", email: sifreUsername.trim() })
        });
      } catch (networkErr) {
        setSifreMesaj({ type: "error", msg: t.errorConn });
        setSifreLoading(false);
        return;
      }

      let json;
      try {
        json = await res.json();
      } catch (parseErr) {
        setSifreMesaj({ type: "error", msg: t.errorConn });
        setSifreLoading(false);
        return;
      }

      if (!json.success) {
        setSifreMesaj({ type: "error", msg: json.msg || (lang === "tr" ? "Kullanıcı bulunamadı" : "User not found") });
        setSifreLoading(false);
        return;
      }

      setSifreMesaj({ type: "success", msg: t.popupSuccess });
      setSifreLoading(false);
    } catch (beklenmedikErr) {
      setSifreMesaj({ type: "error", msg: t.errorConn });
      setSifreLoading(false);
    }
  }

  function baslatYenidenDenemeSayaci(isRetryAttempt) {
    setRetrying(true);
    setCountdown(5);
    let kalan = 5;
    countdownIntervalRef.current = setInterval(() => {
      kalan -= 1;
      setCountdown(kalan);
      if (kalan <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setRetrying(false);
        setRetryCount(1);
        attemptLogin(true);
      }
    }, 1000);
  }

  async function attemptLogin(isRetryAttempt) {
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
        setLoading(false);
      }
    } catch (err) {
      if (!isRetryAttempt) {
        setLoading(false);
        baslatYenidenDenemeSayaci(true);
      } else {
        setError(t.errorConn);
        setLoading(false);
        setRetryCount(0);
      }
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!username || !password) return;
    setRetryCount(0);
    attemptLogin(false);
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
            <img src={logo} alt="Bilimevi" style={styles.logoImg} />
          </div>
          
          <div style={styles.leftText} className="login-left-text">
            <h2 style={styles.leftTitle}>{t.title}</h2>
            <p style={styles.leftSub}>{t.sub}</p>
          </div>
          <p style={styles.leftFooter} className="login-left-footer">© {new Date().getFullYear()} Bilimevi Eğitim</p>
        </div>

        {/* Sağ panel */}
        <div style={styles.rightPanel} className="login-right">
          <div style={styles.formWrap}>
            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t.username}</label>
                <div style={styles.inputWrap}>
                  <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    type="text" value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t.username.toLowerCase()} required
                    style={styles.input}
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t.password}</label>
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
                <span style={styles.rememberText}>{t.remember}</span>
              </label>

              {/* Şifremi Gönder */}
              <button
                type="button"
                onClick={() => {
                  setSifrePopup(true);
                  setSifreUsername("@bilimevi.com");
                  setSifreMesaj(null);
                  setTimeout(() => {
                    if (sifreInputRef.current) {
                      sifreInputRef.current.focus();
                      sifreInputRef.current.setSelectionRange(0, 0);
                    }
                  }, 0);
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: "0", fontFamily: "'Inter', sans-serif", textDecoration: "underline", marginBottom: "8px" }}
              >
                {t.forgot}
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
                    {t.loginLoading}
                  </span>
                ) : t.loginBtn}
              </button>

              <div style={styles.divider}>
                <span style={styles.dividerLine} />
                <span style={styles.dividerText}>{t.googleText}</span>
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
                {t.googleBtn}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Yeniden Deneme Overlay (Glassmorphism) */}
      {retrying && (
        <div style={styles.retryScrim}>
          <div style={styles.retryCard}>
            <div style={styles.retrySpinnerWrap}>
              <span style={styles.retrySpinner} />
              <span style={styles.retryCountdown}>{countdown}</span>
            </div>
            <p style={styles.retryText}>{t.retryOverlay}</p>
          </div>
        </div>
      )}

      {/* Şifre Gönder Popup */}
      {sifrePopup && (
        <div onClick={() => { setSifrePopup(false); setSifreMesaj(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "360px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>{t.popupTitle}</h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", lineHeight: 1.6 }}>{t.popupSub}</p>
            <input
              ref={sifreInputRef}
              type="text"
              value={sifreUsername}
              onChange={e => setSifreUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sifreyiGonder()}
              placeholder="...@bilimevi.com"
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontFamily: "'Inter', sans-serif", outline: "none", marginBottom: "12px", boxSizing: "border-box" }}
            />
            {sifreMesaj && (
              <div style={{ padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "500", marginBottom: "12px", background: sifreMesaj.type === "success" ? "#ecfdf5" : "#fef2f2", border: `1px solid ${sifreMesaj.type === "success" ? "#a7f3d0" : "#fecaca"}`, color: sifreMesaj.type === "success" ? "#059669" : "#dc2626" }}>
                {sifreMesaj.msg}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              {sifreMesaj && sifreMesaj.type === "success" ? (
                <button onClick={() => { setSifrePopup(false); setSifreMesaj(null); }}
                  style={{ width: "100%", padding: "10px", background: "#2563eb", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
                  Kapat
                </button>
              ) : (
                <>
                  <button onClick={() => { setSifrePopup(false); setSifreMesaj(null); }}
                    style={{ flex: 1, padding: "10px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#64748b", fontFamily: "'Inter', sans-serif" }}>
                    {t.popupCancel}
                  </button>
                  <button onClick={sifreyiGonder} disabled={sifreLoading || !sifreUsername.trim()}
                    style={{ flex: 2, padding: "10px", background: sifreLoading || !sifreUsername.trim() ? "#bfdbfe" : "#2563eb", border: "none", borderRadius: "10px", cursor: sifreUsername.trim() && !sifreLoading ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: "600", color: "#fff", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    {sifreLoading ? <><span style={{ display: "inline-block", width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> {t.popupSending}</> : t.popupSend}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      @media (max-width: 640px) {
          body > div > div { padding: 0 !important; } 
          .login-card { 
            flex-direction: column !important; 
            min-height: 100vh !important; 
            width: 100vw !important;
            max-width: 100vw !important;
            border-radius: 0 !important; 
            margin: 0 !important;
            box-shadow: none !important;
          }
          .login-left { 
            width: 100% !important; 
            padding: 40px 24px 24px !important; 
            flex-direction: column !important; 
            align-items: flex-start !important; 
            justify-content: center !important; 
            gap: 16px !important; 
            min-height: unset !important; 
            border-radius: 0 !important;
          }
          .login-left-text { display: block !important; padding: 0 !important; }
          .login-left-footer { display: block !important; color: rgba(255,255,255,0.5) !important; }
          .login-logo-wrap { padding: 0 !important; width: 100% !important; max-width: 240px !important; }
          .login-right { padding: 40px 24px 48px !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden", padding: "20px" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f022 1px, transparent 1px), linear-gradient(90deg, #e2e8f022 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  bgGlow1: { position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, #dbeafe88 0%, transparent 70%)", zIndex: 0 },
  bgGlow2: { position: "fixed", bottom: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #ede9fe66 0%, transparent 70%)", zIndex: 0 },
  card: { display: "flex", width: "100%", maxWidth: "860px", minHeight: "540px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)", position: "relative", zIndex: 1, animation: "fadeUp 0.5s ease-out" },
  leftPanel: { width: "40%", background: "linear-gradient(180deg, #ffffff 0%, #f0f5ff 30%, #dbeafe 60%, #1e3a8a 100%)", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" },
  logoWrap: { alignSelf: "flex-start", width: "100%", maxWidth: "260px", marginBottom: "20px" },
  logoImg: { width: "100%", height: "auto", display: "block" },
  leftText: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 0" },
  leftTitle: { fontSize: "26px", fontWeight: "700", color: "#1e3a8a", marginBottom: "12px", letterSpacing: "-0.5px" },
  leftSub: { fontSize: "14px", color: "#475569", lineHeight: "1.7" },
  leftFooter: { fontSize: "11px", color: "#94a3b8", letterSpacing: "0.5px" },
  rightPanel: { flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" },
  formWrap: { width: "100%", maxWidth: "360px" },
  formTitle: { fontSize: "26px", fontWeight: "700", color: "#0f172a", marginBottom: "6px", letterSpacing: "-0.5px" },
  formSub: { fontSize: "13px", color: "#94a3b8", marginBottom: "32px" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: "14px", width: "16px", height: "16px", color: "#94a3b8", pointerEvents: "none" },
  input: { width: "100%", padding: "12px 14px 12px 42px", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontSize: "14px", color: "#0f172a", background: "#f8fafc", outline: "none", transition: "border-color 0.2s", fontFamily: "'Inter', sans-serif" },
  eyeBtn: { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: "4px" },
  rememberWrap: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" },
  checkbox: { width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" },
  rememberText: { fontSize: "13px", color: "#64748b", fontWeight: "500" },
  errorBox: { display: "flex", alignItems: "center", gap: "8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", fontWeight: "500" },
  submitBtn: { width: "100%", padding: "13px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 4px 14px rgba(37,99,235,0.35)", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.2px" },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  spinner: { display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  divider: { display: "flex", alignItems: "center", gap: "12px", margin: "2px 0" },
  dividerLine: { flex: 1, height: "1px", background: "#e2e8f0" },
  dividerText: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  googleBtn: { width: "100%", padding: "12px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontSize: "14px", fontWeight: "500", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "border-color 0.2s", fontFamily: "'Inter', sans-serif" },
  retryScrim: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  retryCard: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "20px", padding: "36px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  retrySpinnerWrap: { position: "relative", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" },
  retrySpinner: { position: "absolute", inset: 0, border: "3px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  retryCountdown: { fontSize: "20px", fontWeight: "700", color: "#fff", fontFamily: "'Inter', sans-serif" },
  retryText: { fontSize: "14px", fontWeight: "600", color: "#fff", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.2px" },
};
