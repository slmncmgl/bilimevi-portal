// v1.0 (Güvenlik Faz 1): portal oturum token'ı (istemci tarafı)
// Token sunucudan (api/login, api/auth) gelir, sessionStorage'da oturumla birlikte durur.
// fetchTokenEkle() ana uygulamada bir kez çağrılır: "/api/" ile başlayan her isteğe token'ı otomatik ekler,
// böylece sayfalardaki fetch çağrılarına tek tek dokunmak gerekmez.
// Bilerek utils/ dışında: utils/** değişince WordPress deploy'u tetikleniyor, bu dosya WordPress'e girmez.

const TOKEN_KEY = "bilimevi_token";
const SESSION_KEY = "bilimevi_user"; // utils/sheets.js saveSession ile aynı anahtar

export function tokenKaydet(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}

export function tokenSil() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
}

function tokenOku() {
  try {
    // Çıkış yapılmışsa (oturum yok) eski token gönderilmez
    if (!sessionStorage.getItem(SESSION_KEY)) return null;
    return sessionStorage.getItem(TOKEN_KEY);
  } catch (_) {
    return null;
  }
}

// Şifreli girişten sonra arka planda çağrılır. Hata olursa sessizce geçer, giriş etkilenmez.
export function tokenIste(username, password) {
  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then(r => (r.ok ? r.json() : null))
    .then(data => { if (data?.token) tokenKaydet(data.token); })
    .catch(() => {});
}

export function fetchTokenEkle() {
  if (typeof window === "undefined" || window.__bilimeviFetchSarili) return;
  window.__bilimeviFetchSarili = true;
  const asilFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : null;
    const token = url && (url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`)) ? tokenOku() : null;
    if (!token) return asilFetch(input, init);

    const headers = new Headers(init.headers || {});
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    return asilFetch(input, { ...init, headers });
  };
}
