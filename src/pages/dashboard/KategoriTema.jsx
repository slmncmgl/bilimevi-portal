// v1.1: Ortak üst şeride uyarlandı: logo, kullanıcı kutusu, Çıkış ve Yönetici Paneli düğmesi kaldırıldı (ortak şeritte var); menü ve arama şeridin altına yapışır, tema seçici ve sürüm kaldı.
import { useEffect, useRef, useState } from "react";
import { departmanlaraAyir } from "./tema";

// Menülü tema: solda departmanlara göre modül menüsü, sağda arama ve kart ızgarası.
// Bütün stiller .tk altında, klasik görünümü etkilemez.

const ARA = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" />
  </svg>
);
const EV = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11l9-8 9 8M5 10v10h14V10" />
  </svg>
);

const METIN = {
  tr: {
    ana: "Ana sayfa", ara: "Modül ara…", bulundu: n => `${n} modül bulundu`, atla: "İçeriğe geç",
    yok: "Aramana uyan modül yok.", bosBaslik: "Henüz erişim izniniz bulunmuyor.", bosMetin: "Yöneticinizle iletişime geçin.",
  },
  en: {
    ana: "Home", ara: "Search modules…", bulundu: n => `${n} modules found`, atla: "Skip to content",
    yok: "No modules match your search.", bosBaslik: "You don't have access to any modules yet.", bosMetin: "Please contact your manager.",
  },
};

// Türkçe büyük/küçük harf farkını ve aksanları yok sayan karşılaştırma.
const sade = s => (s || "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

export default function KategoriTema({ user, moduller, isFortis, greeting, time, git, secici, surum }) {
  const L = isFortis ? "en" : "tr";
  const t = METIN[L];
  const [ara, setAra] = useState("");
  const araRef = useRef(null);
  const ad = user.name || "";
  const baslik = m => (isFortis ? (m.titleEn || m.title) : m.title);
  const aciklama = m => (isFortis ? (m.descEn || m.desc) : m.desc);

  // Ctrl/⌘ + K arama kutusuna odaklanır.
  useEffect(() => {
    const k = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); araRef.current?.focus(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const gruplar = departmanlaraAyir(moduller);
  const q = sade(ara.trim());
  const gorunen = q
    ? gruplar.map(g => ({ ...g, mods: g.mods.filter(m => sade(baslik(m) + " " + aciklama(m)).includes(q)) })).filter(g => g.mods.length)
    : gruplar;

  const link = path => ({
    href: path,
    onClick: e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      git(path);
    },
  });
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || "");

  return (
    <div className="tk" lang={L}>
      <a className="tk-skip" href="#tk-main">{t.atla}</a>
      <aside className="tk-side">
        <nav aria-label={isFortis ? "Modules" : "Modüller"}>
          <a className="on" href="/dashboard" aria-current="page" onClick={e => e.preventDefault()}>{EV}{t.ana}</a>
          {gruplar.map(g => (
            <div key={g.key}>
              <p className="tk-navh">{g[L]}</p>
              {g.mods.map(m => (
                <a key={m.key} {...link(m.path)}><span className="tk-nav-ic" aria-hidden="true">{m.icon}</span>{baslik(m)}</a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="tk-main">
        {moduller.length > 0 && (
        <div className="tk-top">
            <label className="tk-search">
              {ARA}
              <input ref={araRef} type="search" value={ara} onChange={e => setAra(e.target.value)} placeholder={t.ara} aria-label={t.ara} name="modul-ara" autoComplete="off" spellCheck={false} />
              <kbd>{isMac ? "⌘K" : "Ctrl\u00A0K"}</kbd>
            </label>
        </div>
        )}

        <div className="tk-body" id="tk-main" tabIndex={-1}>
          <p className="tk-sr" aria-live="polite">{q ? t.bulundu(gorunen.reduce((n, g) => n + g.mods.length, 0)) : ""}</p>
          <h1>{greeting}, {ad.split(" ")[0]}</h1>
          <div className="tk-date">{time.toLocaleDateString(isFortis ? "en-GB" : "tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>

          {moduller.length === 0 ? (
            <div className="tk-empty" role="status"><b>{t.bosBaslik}</b><span>{t.bosMetin}</span></div>
          ) : gorunen.length === 0 ? (
            <div className="tk-empty"><b>{t.yok}</b></div>
          ) : gorunen.map(g => (
            <section key={g.key} aria-labelledby={`tk-g-${g.key}`}>
              <h2 id={`tk-g-${g.key}`}>{g[L]}</h2>
              <div className="tk-grid">
                {g.mods.map(m => (
                  <a className="tk-card" key={m.key} {...link(m.path)}>
                    <span className="tk-ic" aria-hidden="true">{m.icon}</span>
                    <span><b>{baslik(m)}</b><p>{aciklama(m)}</p></span>
                  </a>
                ))}
              </div>
            </section>
          ))}
          {surum}
        </div>
      </div>

      {secici}
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
html { scroll-padding-top: 145px; }
body { margin: 0; background: #fff; }
.tk { --ink:#0F172A; --navy:#001A71; --tint:#EEF1FA; --line:#E2E8F0; --mut:#64748B; --red:#E50700;
  display:flex; min-height:100vh; background:#fff; color:var(--ink); font:14px/1.4 'Inter',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
.tk *, .tk *::before, .tk *::after { box-sizing:border-box; margin:0; padding:0; }
.tk a { color:inherit; text-decoration:none; }
.tk :focus-visible { outline:2px solid var(--navy); outline-offset:2px; }

.tk-side { width:248px; flex:none; position:sticky; top:65px; height:calc(100vh - 65px); border-right:1px solid var(--line); display:flex; flex-direction:column; padding:0 12px; }
.tk-side nav { flex:1; overflow-y:auto; padding:16px 0; }
.tk-side nav a { display:flex; align-items:center; gap:10px; min-height:34px; padding:7px 10px; border-radius:8px; color:#334155; font-weight:500; line-height:1.25; }
.tk-side nav a:hover { background:#F8FAFC; color:var(--navy); }
.tk-side nav a.on { background:var(--tint); color:var(--navy); }
.tk-side nav a svg { width:16px; height:16px; flex:none; color:var(--mut); }
.tk-side nav a.on svg, .tk-side nav a:hover svg { color:var(--navy); }
.tk-nav-ic { display:flex; }
.tk-navh { font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--mut); padding:20px 10px 6px; }

.tk-main { flex:1; min-width:0; }
.tk-top { height:64px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:16px; padding:0 48px; position:sticky; top:65px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px); z-index:5; }
.tk-search { width:360px; height:38px; border:1px solid var(--line); border-radius:8px; display:flex; align-items:center; gap:10px; padding:0 8px 0 12px; color:var(--mut); }
.tk-search:focus-within { border-color:var(--navy); box-shadow:0 0 0 3px var(--tint); }
.tk-search input { flex:1; min-width:0; border:0; outline:0; background:none; font:14px 'Inter',system-ui,sans-serif; color:var(--ink); }
.tk-search input::placeholder { color:var(--mut); }
.tk kbd { font:500 11px 'Inter',system-ui,sans-serif; border:1px solid var(--line); border-radius:5px; padding:2px 6px; background:#F8FAFC; color:var(--mut); white-space:nowrap; }

.tk-body { padding:40px 48px 80px; max-width:1180px; }
.tk h1 { font-size:40px; line-height:48px; font-weight:600; letter-spacing:-.025em; }
.tk-date { color:var(--mut); font-size:15px; margin-top:4px; }
.tk section { margin-top:32px; }
.tk h2 { font-size:12px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--mut); margin-bottom:12px; }
.tk-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
.tk-card { border:1px solid var(--line); border-radius:12px; padding:18px; background:#fff; display:flex; flex-direction:column; gap:14px; min-height:130px; transition:border-color .15s, box-shadow .15s; }
.tk-card:hover { border-color:#B9C3E0; box-shadow:0 6px 18px -10px rgba(0,26,113,.25); }
.tk-ic { flex:none; width:36px; height:36px; border-radius:9px; background:var(--tint); color:var(--navy); display:grid; place-items:center; }
.tk-ic svg { width:18px; height:18px; }
.tk-card b { display:block; font-size:15px; font-weight:600; letter-spacing:-.01em; }
.tk-card p { color:var(--mut); font-size:13px; margin-top:2px; }
.tk-empty { margin-top:32px; border:1px dashed var(--line); border-radius:12px; padding:40px; display:flex; flex-direction:column; gap:6px; color:var(--mut); }
.tk-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.tk-skip { position:absolute; left:16px; top:-60px; z-index:50; background:var(--navy); color:#fff !important; padding:10px 16px; border-radius:8px; font-weight:600; }
.tk-skip:focus { top:12px; }
.tk-body:focus { outline:0; }
.tk-empty b { color:var(--ink); font-weight:600; font-size:15px; }

@media (max-width:1100px) { .tk-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .tk-search { width:280px; } }
@media (max-width:900px) {
  .tk-side { display:none; }
  .tk-top { padding:12px 16px; gap:12px; height:auto; flex-wrap:wrap; }
  .tk-search { order:3; width:100%; }
  html { scroll-padding-top:145px; }
  .tk kbd { display:none; }
  .tk-body { padding:24px 16px 80px; }
  .tk h1 { font-size:28px; line-height:34px; }
  .tk-grid { grid-template-columns:1fr; gap:10px; }
  .tk-card { flex-direction:row; align-items:center; min-height:0; padding:14px; }
}
`;
