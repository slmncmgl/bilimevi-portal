import { useEffect, useState } from "react";
import { departmanlaraAyir } from "./tema";

// Kurumsal Kimlik Kılavuzu teması: solda lacivert "İçindekiler" rayı, numaralı bölümler, 01.1 gibi kodlu kartlar.
// Bütün stiller .kk altında, klasik görünümü etkilemez.

const ROL = {
  tr: { admin: "Yönetici", owner: "Yönetici", director: "Direktör", manager: "Yönetici", staff: "Personel" },
  en: { admin: "Admin", owner: "Owner", director: "Director", manager: "Manager", staff: "Staff" },
};

const METIN = {
  tr: {
    icindekiler: "İçindekiler", cikis: "Çıkış", panel: "Yönetici Paneli", adet: n => `${n} modül`, atla: "İçeriğe geç",
    bosBaslik: "Henüz erişim izniniz bulunmuyor.", bosMetin: "Yöneticinizle iletişime geçin.",
  },
  en: {
    icindekiler: "Contents", cikis: "Logout", panel: "Admin Panel", adet: n => `${n} modules`, atla: "Skip to content",
    bosBaslik: "You don't have access to any modules yet.", bosMetin: "Please contact your manager.",
  },
};

const iki = n => String(n).padStart(2, "0");

export default function KimlikTema({ user, moduller, isFortis, isAdmin, greeting, time, git, cikis, secici }) {
  const L = isFortis ? "en" : "tr";
  const t = METIN[L];
  const ad = user.name || "";
  const gruplar = departmanlaraAyir(moduller);
  const [aktif, setAktif] = useState(gruplar[0]?.key);

  // İçindekiler rayında ekrandaki bölüm işaretlenir.
  useEffect(() => {
    const bolumler = gruplar.map(g => document.getElementById(`kk-${g.key}`)).filter(Boolean);
    if (!bolumler.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      girdiler => {
        const gorunen = girdiler.filter(g => g.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (gorunen) setAktif(gorunen.target.id.slice(3));
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    bolumler.forEach(b => io.observe(b));
    return () => io.disconnect();
  }, [gruplar.map(g => g.key).join(",")]);

  const link = path => ({
    href: path,
    onClick: e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      git(path);
    },
  });
  const baslik = m => (isFortis ? (m.titleEn || m.title) : m.title);
  const aciklama = m => (isFortis ? (m.descEn || m.desc) : m.desc);
  const tarih = time.toLocaleDateString(isFortis ? "en-GB" : "tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });

  return (
    <div className="kk" lang={L}>
      <a className="kk-skip" href="#kk-main">{t.atla}</a>
      <aside className="kk-rail">
        <img src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg" alt="Bilimevi" width={120} height={38} />
        {gruplar.length > 0 && (
          <nav aria-label={t.icindekiler}>
            <div className="kk-cap">{t.icindekiler}</div>
            <ol>
              {gruplar.map((g, i) => (
                <li key={g.key}>
                  <a href={`#kk-${g.key}`} className={aktif === g.key ? "on" : undefined}
                    aria-current={aktif === g.key ? "location" : undefined} onClick={() => setAktif(g.key)}>
                    <b>{iki(i + 1)}</b>{g[L]}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="kk-user">
          <strong>{ad}</strong>
          <span>{[user.company, user.branch, ROL[L][user.rol]].filter(Boolean).join(" · ")}</span>
          <button type="button" onClick={cikis}>{t.cikis}</button>
        </div>
      </aside>

      <main className="kk-main" id="kk-main" tabIndex={-1}>
        <div className="kk-top">
          <div>
            <div className="kk-date">{tarih}</div>
            <h1>{greeting}, {ad.split(" ")[0]}</h1>
          </div>
          {isAdmin && <a className="kk-btn" {...link("/izin?panel=admin")}>{t.panel} <i aria-hidden="true">→</i></a>}
        </div>

        {gruplar.length === 0 ? (
          <div className="kk-empty" role="status"><b>{t.bosBaslik}</b><span>{t.bosMetin}</span></div>
        ) : gruplar.map((g, i) => (
          <section className="kk-sec" id={`kk-${g.key}`} key={g.key} aria-labelledby={`kk-h-${g.key}`}>
            <div className="kk-sh">
              <span className="n" aria-hidden="true">{iki(i + 1)}</span>
              <h2 id={`kk-h-${g.key}`}>{g[L]}</h2>
              <span className="c">{t.adet(g.mods.length)}</span>
            </div>
            <div className="kk-grid">
              {g.mods.map((m, j) => (
                <a className="kk-cell" key={m.key} {...link(m.path)}>
                  <span className="ar" aria-hidden="true">→</span>
                  <span className="code" aria-hidden="true">{iki(i + 1)}.{j + 1}</span>
                  <h3>{baslik(m)}</h3>
                  <p>{aciklama(m)}</p>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>

      {secici}
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
body { margin: 0; background: #fff; }
.kk { --navy:#001A71; --red:#E50700; --grey:#646569; --pale:#EEF0F5; --rule:#D5D9E3;
  display:flex; min-height:100vh; background:#fff; color:var(--navy);
  font-family:"Archivo","Helvetica Neue",Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
.kk *, .kk *::before, .kk *::after { box-sizing:border-box; margin:0; padding:0; }
.kk a { color:inherit; text-decoration:none; }
.kk :focus-visible { outline:2px solid var(--red); outline-offset:2px; }
.kk-skip { position:absolute; left:16px; top:-60px; z-index:50; background:var(--red); color:#fff !important; padding:10px 16px; font-weight:600; }
.kk-skip:focus { top:12px; }
.kk-main:focus { outline:0; }

.kk-rail { width:280px; flex:none; position:sticky; top:0; height:100vh; overflow-y:auto; background:var(--navy); color:#fff; padding:44px 32px 36px; display:flex; flex-direction:column; }
.kk-rail img { width:120px; height:auto; display:block; filter:brightness(0) invert(1); }
.kk-cap { margin-top:56px; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.6); padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,.28); }
.kk-rail ol { list-style:none; }
.kk-rail li a { display:flex; align-items:baseline; gap:16px; padding:16px 0; border-bottom:1px solid rgba(255,255,255,.18); font-size:19px; font-weight:500; letter-spacing:-.005em; transition:background .15s, color .15s; }
.kk-rail li a b { font-size:15px; font-weight:600; width:24px; flex:none; color:rgba(255,255,255,.55); font-variant-numeric:tabular-nums; }
.kk-rail li a:hover { color:#fff; background:rgba(255,255,255,.06); margin:0 -32px; padding:16px 32px; }
.kk-rail li a.on { background:#fff; color:var(--navy); margin:0 -32px; padding:16px 32px; }
.kk-rail li a.on b { color:var(--red); }
.kk-rail li a:focus-visible { outline-color:#fff; outline-offset:-4px; }
.kk-user { margin-top:auto; border-top:1px solid rgba(255,255,255,.28); padding-top:20px; min-width:0; }
.kk-user strong { display:block; font-size:19px; font-weight:600; overflow-wrap:anywhere; }
.kk-user span { display:block; margin-top:6px; font-size:14px; color:rgba(255,255,255,.68); }
.kk-user button { margin-top:18px; background:none; border:0; border-bottom:1px solid rgba(255,255,255,.6); padding:0 0 3px; color:#fff; cursor:pointer;
  font:600 14px/1.2 "Archivo",sans-serif; letter-spacing:.08em; text-transform:uppercase; }
.kk-user button:hover { border-color:var(--red); }
.kk-user button:focus-visible { outline-color:#fff; }

.kk-main { flex:1; min-width:0; padding:44px 48px 96px; max-width:1240px; }
.kk-top { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding-bottom:28px; }
.kk-date { font-size:14px; letter-spacing:.14em; text-transform:uppercase; color:var(--grey); font-weight:500; margin-bottom:12px; }
.kk h1 { font-size:clamp(36px,4.2vw,56px); line-height:1; font-weight:600; letter-spacing:-.025em; text-wrap:balance; }
.kk-btn { display:inline-flex; align-items:center; gap:14px; flex:none; background:var(--navy); color:#fff !important; height:52px; padding:0 24px; font-size:16px; font-weight:600; border-radius:2px; transition:background .15s; }
.kk-btn:hover { background:#00114D; }
.kk-btn i { font-style:normal; font-weight:400; transition:transform .15s; }
.kk-btn:hover i { transform:translateX(3px); }

.kk-sec { margin-top:30px; scroll-margin-top:24px; }
.kk-sh { display:grid; grid-template-columns:72px 1fr auto; align-items:baseline; gap:16px; padding-bottom:12px; border-bottom:1px solid var(--navy); }
.kk-sh .n { font-size:32px; font-weight:700; color:var(--red); line-height:1; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.kk-sh h2 { font-size:22px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; line-height:1; }
.kk-sh .c { font-size:14px; color:var(--grey); letter-spacing:.06em; text-transform:uppercase; }
.kk-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px 24px; margin-top:16px; }
.kk-cell { position:relative; display:block; min-height:108px; border:1px solid var(--rule); background:#fff; border-radius:2px; padding:14px 18px 16px; transition:background .15s, border-color .15s; }
.kk-cell:hover { background:var(--pale); border-color:var(--pale); }
.kk-cell .code { display:block; font-size:13px; font-weight:600; color:var(--grey); letter-spacing:.06em; font-variant-numeric:tabular-nums; }
.kk-cell h3 { margin-top:8px; font-size:20px; line-height:1.15; font-weight:700; letter-spacing:-.01em; padding-right:30px; text-wrap:balance; }
.kk-cell p { margin-top:6px; font-size:14px; line-height:1.35; color:var(--grey); }
.kk-cell .ar { position:absolute; right:18px; top:12px; font-size:20px; line-height:1; transition:transform .15s, color .15s; }
.kk-cell:hover .ar { transform:translateX(3px); color:var(--red); }
.kk-empty { margin-top:24px; border-top:1px solid var(--navy); padding-top:20px; display:flex; flex-direction:column; gap:6px; }
.kk-empty b { font-size:20px; font-weight:700; }
.kk-empty span { color:var(--grey); }

@media (max-width:1200px) { .kk-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:900px) {
  .kk { flex-direction:column; }
  .kk-rail { width:auto; height:auto; position:static; flex-direction:row; align-items:center; padding:14px 16px; gap:16px; }
  .kk-rail img { width:84px; }
  .kk-rail nav { display:none; }
  .kk-user { margin:0 0 0 auto; border:0; padding:0; display:flex; align-items:center; gap:14px; }
  .kk-user strong, .kk-user span { display:none; }
  .kk-user button { margin:0; }
  .kk-main { padding:24px 16px 80px; }
  .kk-top { flex-direction:column; align-items:flex-start; gap:18px; padding-bottom:12px; }
  .kk-btn { height:46px; padding:0 18px; }
  .kk-sh { grid-template-columns:44px 1fr auto; gap:10px; }
  .kk-sh .n { font-size:24px; }
  .kk-sh h2 { font-size:17px; letter-spacing:.08em; }
  .kk-grid { grid-template-columns:1fr; gap:10px; }
  .kk-cell { min-height:0; }
  .kk-cell h3 { font-size:18px; }
}
@media (prefers-reduced-motion:reduce) { .kk * { transition:none !important; } }
`;
