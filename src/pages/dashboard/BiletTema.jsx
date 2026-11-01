import { departmanlaraAyir, modulKodu } from "./tema";

// Bilet Cüzdanı teması: kişi kartı biniş kartı gibi, modüller departmanlara göre bilet kuponları.
// Bütün stiller .tb altında, klasik görünümü etkilemez.

const UCAK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21 15.5v-2l-8-5V3.6a1.6 1.6 0 0 0-3.2 0V8.5l-8 5v2l8-2.5V19l-2 1.5V22l3.6-1 3.6 1v-1.5l-2-1.5v-5.5z" transform="rotate(90 12 12)" />
  </svg>
);
const OK = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
  </svg>
);

const ROL = {
  tr: { admin: "Yönetici", owner: "Yönetici", director: "Direktör", manager: "Yönetici", staff: "Personel" },
  en: { admin: "Admin", owner: "Owner", director: "Director", manager: "Manager", staff: "Staff" },
};

const METIN = {
  tr: {
    cikis: "Çıkış", lede: "Bugün hangi işle başlıyorsun? Araçlar departmanlarına göre aşağıda.",
    alanlar: ["Personel", "Şube", "Rol", "Modül"], saat: "Saat", damga: "Yetkili",
    panel: "Yönetici Paneli", panelMetin: "Ekibinin izin talepleri tek yerde: onay bekleyenler, yaklaşanlar, geçmiş.",
    bekleyen: "Bekleyen onaylar", ac: "Paneli aç", adet: n => `${n} modül`, hepsi: "Modüllerin",
    atla: "İçeriğe geç",
    bosBaslik: "Henüz erişim izniniz yok", bosMetin: "Yöneticinizle iletişime geçin, modüller açıldığında burada görünecek.", bosDamga: "Erişim yok",
  },
  en: {
    cikis: "Logout", lede: "Where do you want to start today? Tools are grouped by department below.",
    alanlar: ["Staff", "Branch", "Role", "Modules"], saat: "Time", damga: "Authorised",
    panel: "Admin Panel", panelMetin: "Your team's leave requests in one place: pending, upcoming and past.",
    bekleyen: "Pending approvals", ac: "Open panel", adet: n => `${n} modules`, hepsi: "Your modules",
    atla: "Skip to content",
    bosBaslik: "You don't have access to any modules yet", bosMetin: "Please contact your manager. Modules will appear here once they are enabled.", bosDamga: "No access",
  },
};

export default function BiletTema({ user, moduller, isFortis, isAdmin, greeting, time, git, cikis, secici }) {
  const L = isFortis ? "en" : "tr";
  const t = METIN[L];
  const loc = isFortis ? "en-GB" : "tr-TR";
  const saat = time.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
  const gun = time.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "");
  const haftaGunu = time.toLocaleDateString(loc, { weekday: "long" });
  const ad = user.name || "";
  const kisalt = s => (s || "").slice(0, 3).toLocaleUpperCase(L);

  // Az modülü olan kullanıcıda tek kuponlu bölümler yerine tek liste.
  const gruplar = departmanlaraAyir(moduller);
  const birlesik = moduller.length > 0 && moduller.length <= 6;
  const bolumler = birlesik
    ? [{ key: "tum", tr: t.hepsi, en: t.hepsi, mods: gruplar.flatMap(g => g.mods.map(m => ({ ...m, dept: g }))) }]
    : gruplar.map(g => ({ ...g, mods: g.mods.map(m => ({ ...m, dept: g })) }));

  // Sol tık SPA içinde gezinir, orta tık / yeni sekme normal link gibi çalışır.
  const link = path => ({
    href: path,
    onClick: e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      git(path);
    },
  });

  return (
    <div className="tb" lang={L}>
      <a className="tb-skip" href="#tb-main">{t.atla}</a>
      <header className="tb-bar">
        <div className="tb-bar-in">
          <img src="https://www.bilimevi.com/assets/images/bilimevi_logo_761.svg" alt="Bilimevi" width={83} height={26} />
          <span className="tb-portal">Portal</span>
          <span className="tb-sp" />
          <div className="tb-who">
            <div><b>{ad}</b><span>{user.company} · {user.branch}</span></div>
            <span className="tb-avatar" aria-hidden="true">{ad.charAt(0).toUpperCase()}</span>
          </div>
          <button type="button" className="tb-out" onClick={cikis}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            <span>{t.cikis}</span>
          </button>
        </div>
      </header>

      <main className="tb-main" id="tb-main" tabIndex={-1}>
        <div className={"tb-top" + (isAdmin ? "" : " solo")}>
          <section className="tb-pass" aria-labelledby="tb-hello">
            <div className="tb-pass-head">
              <span className="tb-route">{UCAK}<span>{kisalt(user.company)} · {kisalt(user.branch)}</span></span>
              <span className="tb-day tb-cap">{haftaGunu}</span>
            </div>
            <div className="tb-pass-main">
              <h1 id="tb-hello">{greeting}, {ad.split(" ")[0]}</h1>
              {moduller.length > 0 && <p className="tb-lede">{t.lede}</p>}
              <dl className="tb-fields">
                <div><dt>{t.alanlar[0]}</dt><dd>{ad}</dd></div>
                <div><dt>{t.alanlar[1]}</dt><dd>{user.branch}</dd></div>
                <div><dt>{t.alanlar[2]}</dt><dd>{ROL[L][user.rol] || user.rol || "-"}</dd></div>
                <div><dt>{t.alanlar[3]}</dt><dd className="num">{moduller.length}</dd></div>
              </dl>
            </div>
            <dl className="tb-stub">
              <dt>{t.saat}</dt>
              <dd className="time">{saat}</dd>
              <dd className="date">{gun}</dd>
            </dl>
          </section>

          {isAdmin && (
            <section className="tb-admin" aria-labelledby="tb-admin-title">
              <div className="tb-admin-head"><span className="tb-stamp">{t.damga}</span></div>
              <div className="tb-admin-body">
                <h2 id="tb-admin-title">{t.panel}</h2>
                <p>{t.panelMetin}</p>
                <a className="tb-go" {...link("/izin?tab=bekleyen")}><span>{t.bekleyen}</span>{OK}</a>
                <a className="tb-tabcap" {...link("/izin?panel=admin")}>{t.ac}</a>
              </div>
            </section>
          )}
        </div>

        {bolumler.length === 0 ? (
          <section className="tb-void" role="status">
            <span className="tb-cp-stub" aria-hidden="true" />
            <div className="tb-void-body">
              <span className="tb-void-stamp">{t.bosDamga}</span>
              <h2>{t.bosBaslik}</h2>
              <p>{t.bosMetin}</p>
            </div>
          </section>
        ) : bolumler.map(d => (
          <section className="tb-dept" key={d.key} aria-labelledby={`tb-d-${d.key}`}>
            <div className="tb-dept-head">
              <h2 id={`tb-d-${d.key}`}><i aria-hidden="true">///</i>{d[L]}</h2>
              <span className="tb-rule" />
              <span className="tb-n">{t.adet(d.mods.length)}</span>
            </div>
            <div className="tb-coupons">
              {d.mods.map(m => (
                <a className="tb-cp" key={m.key} {...link(m.path)}>
                  <span className="tb-cp-stub" aria-hidden="true"><b>{modulKodu(m, isFortis)}</b></span>
                  <div className="tb-cp-body">
                    <h3>{isFortis ? (m.titleEn || m.title) : m.title}</h3>
                    <p>{isFortis ? (m.descEn || m.desc) : m.desc}</p>
                    <span className="tb-cp-foot"><span>{birlesik ? m.dept[L] : ""}</span><span className="act">{OK}</span></span>
                  </div>
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
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&family=Overpass+Mono:wght@500;600&display=swap');
html { scroll-padding-top: 80px; }
body { margin: 0; background: #EBEEF4; }
.tb {
  --navy:#001A71; --red:#E50700; --red-deep:#B80600;
  --carbon:#4B2E83; --lilac:#DCD3F2; --lilac-rule:#B9ACDD;
  --grey:#646569; --ink:#141B33;
  --ground:#EBEEF4; --coupon:#FFFFFF; --rule:#D3D8E4; --perf:#AEB6CA;
  --cond:"Barlow Condensed","Arial Narrow",sans-serif;
  --body:"Barlow",system-ui,sans-serif;
  --mono:"Overpass Mono",ui-monospace,monospace;
  --gutter:clamp(16px,3vw,40px);
  --ease:cubic-bezier(.16,1,.3,1);
  min-height:100vh; background:var(--ground); color:var(--ink); font:400 16px/1.5 var(--body); -webkit-font-smoothing:antialiased;
}
.tb *, .tb *::before, .tb *::after { box-sizing:border-box; margin:0; padding:0; }
.tb a { color:inherit; text-decoration:none; }
.tb :focus-visible { outline:2px solid var(--red); outline-offset:3px; }
.tb svg { display:block; }
.tb-cap { font-family:var(--cond); font-weight:700; text-transform:uppercase; letter-spacing:.12em; }

.tb-bar { position:sticky; top:0; z-index:20; background:var(--navy); color:#fff; }
.tb-bar-in { max-width:1320px; margin:0 auto; height:64px; padding:0 var(--gutter); display:flex; align-items:center; gap:24px; }
.tb-bar img { height:26px; filter:brightness(0) invert(1); }
.tb-portal { font:700 18px/1 var(--cond); letter-spacing:.18em; text-transform:uppercase; padding-left:20px; border-left:1px solid rgba(255,255,255,.3); color:#E6E9F5; }
.tb-sp { flex:1; }
.tb-who { display:flex; align-items:center; gap:12px; text-align:right; min-width:0; }
.tb-who div { min-width:0; max-width:280px; }
.tb-who b, .tb-who div span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tb-who b { display:block; font-weight:600; font-size:15px; line-height:1.2; }
.tb-skip { position:absolute; left:16px; top:-60px; z-index:50; background:var(--red); color:#fff !important; padding:10px 16px; font:700 15px/1 var(--cond); letter-spacing:.12em; text-transform:uppercase; }
.tb-skip:focus { top:12px; }
.tb-main:focus { outline:0; }
.tb-who div span { display:block; font-size:13px; color:#B8C1E0; }
.tb-avatar { width:36px; height:36px; border-radius:50%; background:#fff; color:var(--navy); display:grid; place-items:center; font:800 17px/1 var(--cond); }
.tb-out { display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 14px; background:none; color:#fff; cursor:pointer; border:1px solid rgba(255,255,255,.45); font:700 14px/1 var(--cond); letter-spacing:.14em; text-transform:uppercase; transition:background .16s var(--ease),border-color .16s var(--ease); }
.tb-out:hover { background:var(--red); border-color:var(--red); }

.tb-main { max-width:1320px; margin:0 auto; padding:32px var(--gutter) 96px; }
.tb-top { display:grid; grid-template-columns:repeat(12,1fr); gap:24px; align-items:stretch; }

.tb-pass { grid-column:span 8; display:grid; grid-template-columns:1fr 228px; grid-template-rows:auto 1fr; background:var(--coupon); border:1.5px solid var(--navy); position:relative; }
.tb-top.solo .tb-pass { grid-column:1/-1; }
.tb-pass-head { grid-column:1/-1; display:flex; align-items:stretch; justify-content:space-between; background:var(--navy); color:#fff; }
.tb-route { font:600 15px/1 var(--mono); letter-spacing:.1em; display:flex; align-items:center; gap:12px; padding:10px 24px; }
.tb-day { background:var(--red); padding:10px 24px; display:flex; align-items:center; font-size:15px; }
.tb-pass-main { padding:28px 32px 0; display:flex; flex-direction:column; min-width:0; }
.tb h1 { font:800 clamp(44px,5.4vw,72px)/.92 var(--cond); text-transform:uppercase; color:var(--navy); letter-spacing:-.01em; text-wrap:balance; }
.tb-lede { margin-top:14px; color:var(--grey); font-size:17px; max-width:46ch; }
.tb-fields { margin-top:auto; padding-top:28px; display:grid; grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(0,1fr)); }
.tb-fields div { padding:14px 16px 18px; border-top:1px solid var(--rule); border-left:1px solid var(--rule); }
.tb-fields div:first-child { border-left:0; padding-left:0; }
.tb-fields dt { font:700 13px/1 var(--cond); letter-spacing:.14em; text-transform:uppercase; color:var(--grey); margin-bottom:8px; }
.tb-fields dd { font:700 22px/1.1 var(--cond); text-transform:uppercase; color:var(--navy); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tb-fields dd.num { font-family:var(--mono); font-weight:600; color:var(--carbon); }
.tb-stub { background:var(--lilac); border-left:2px dashed var(--lilac-rule); padding:24px; display:flex; flex-direction:column; color:var(--carbon); position:relative; }
.tb-stub::before, .tb-stub::after { content:""; position:absolute; left:-13px; width:24px; height:24px; border-radius:50%; background:var(--ground); border:1.5px solid var(--navy); }
.tb-stub::before { top:-13px; clip-path:inset(50% 0 0 0); }
.tb-stub::after { bottom:-13px; clip-path:inset(0 0 50% 0); }
.tb-stub dt { font:700 13px/1 var(--cond); letter-spacing:.14em; text-transform:uppercase; opacity:.8; }
.tb-stub .time { font:600 64px/1 var(--mono); letter-spacing:-.04em; margin:8px 0 20px; font-variant-numeric:tabular-nums; }
.tb-stub .date { font:600 20px/1.2 var(--mono); font-variant-numeric:tabular-nums; }

.tb-admin { grid-column:span 4; background:var(--navy); color:#fff; display:flex; flex-direction:column; position:relative; overflow:hidden; }
.tb-admin-head { display:flex; justify-content:flex-end; align-items:center; padding:12px 24px; border-bottom:1px dashed rgba(255,255,255,.35); }
.tb-stamp { border:5px double #FF6A60; color:#FF8A82; padding:4px 10px; font:800 18px/1 var(--cond); letter-spacing:.16em; text-transform:uppercase; transform:rotate(-4deg); }
.tb-admin-body { padding:24px 24px 0; display:flex; flex-direction:column; gap:20px; flex:1; }
.tb-admin h2 { font:800 40px/.95 var(--cond); text-transform:uppercase; }
.tb-admin p { color:#C3CAE6; font-size:16px; max-width:34ch; }
.tb-go { display:flex; align-items:center; justify-content:space-between; gap:12px; height:52px; padding:0 20px; background:var(--red); color:#fff; font:700 18px/1 var(--cond); letter-spacing:.12em; text-transform:uppercase; transition:background .16s var(--ease); }
.tb-go:hover { background:var(--red-deep); }
.tb-go svg { transition:transform .16s var(--ease); }
.tb-go:hover svg { transform:translateX(4px); }
.tb-tabcap { align-self:flex-start; margin-top:auto; display:inline-flex; align-items:center; height:36px; padding:0 18px; border:1.5px solid rgba(255,255,255,.7); border-bottom:0; font:700 15px/1 var(--cond); letter-spacing:.14em; text-transform:uppercase; color:#fff; transition:background .16s var(--ease); }
.tb-tabcap:hover { background:rgba(255,255,255,.12); }

.tb-dept { margin-top:48px; }
.tb-dept-head { display:flex; align-items:baseline; gap:16px; margin-bottom:16px; }
.tb-dept-head h2 { font:800 24px/1 var(--cond); letter-spacing:.12em; text-transform:uppercase; color:var(--navy); display:flex; gap:10px; align-items:baseline; }
.tb-dept-head h2 i { font-style:normal; color:var(--red); letter-spacing:-.08em; }
.tb-rule { flex:1; border-top:1px solid var(--rule); transform:translateY(-5px); }
.tb-n { font:600 14px/1 var(--mono); color:var(--grey); }
.tb-coupons { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }

.tb-cp { display:grid; grid-template-columns:92px 1fr; min-height:148px; position:relative; isolation:isolate; }
.tb-cp-stub, .tb-cp-body { background:var(--coupon); border:1.5px solid var(--navy); }
.tb-cp-stub { border-right:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--carbon); position:relative; transform-origin:100% 100%; transition:transform .16s var(--ease),background .16s var(--ease); }
.tb-cp-stub b { font:600 34px/1 var(--mono); letter-spacing:-.04em; }
.tb-cp-body { border-left:2px dashed var(--perf); padding:20px 22px 0; display:flex; flex-direction:column; position:relative; }
.tb-cp-body::before, .tb-cp-body::after { content:""; position:absolute; left:-12px; width:22px; height:22px; border-radius:50%; background:var(--ground); border:1.5px solid var(--navy); }
.tb-cp-body::before { top:-12px; clip-path:inset(50% 0 0 0); }
.tb-cp-body::after { bottom:-12px; clip-path:inset(0 0 50% 0); }
.tb-cp h3 { font:700 22px/1.05 var(--cond); text-transform:uppercase; letter-spacing:.03em; color:var(--navy); text-wrap:balance; }
.tb-cp p { margin-top:6px; color:var(--grey); font-size:15px; line-height:1.4; }
.tb-cp-foot { margin:auto -22px 0; padding-top:16px; display:grid; grid-template-columns:1fr 64px; font:700 15px/1 var(--cond); letter-spacing:.14em; text-transform:uppercase; color:var(--navy); }
.tb-cp-foot > span { padding:14px 22px; display:flex; align-items:center; border-top:1px solid var(--rule); }
.tb-cp-foot .act { border-left:1px solid var(--rule); justify-content:center; padding:14px 0; }
.tb-cp-foot svg { transition:transform .16s var(--ease),color .16s var(--ease); }
.tb-cp:hover .tb-cp-stub, .tb-cp:focus-visible .tb-cp-stub { transform:translateX(-5px) rotate(-2.5deg); background:var(--lilac); }
.tb-cp:hover .tb-cp-body, .tb-cp:focus-visible .tb-cp-body { background:#F7F8FC; }
.tb-cp:hover .tb-cp-foot svg, .tb-cp:focus-visible .tb-cp-foot svg { transform:translateX(4px); color:var(--red); }
.tb-cp:focus-visible { outline-offset:6px; }

.tb-void { margin-top:48px; max-width:720px; display:grid; grid-template-columns:120px 1fr; background:var(--coupon); border:1px solid var(--rule); }
.tb-void .tb-cp-stub { border:0; border-right:2px dashed var(--perf); background:repeating-linear-gradient(-45deg,#fff 0 7px,#F7D3D1 7px 9px); }
.tb-void-body { padding:28px 220px 28px 32px; position:relative; }
.tb-void h2 { font:800 32px/1 var(--cond); text-transform:uppercase; color:var(--navy); }
.tb-void p { margin-top:8px; color:var(--grey); font-size:17px; }
.tb-void-stamp { position:absolute; right:28px; top:22px; border:3px solid var(--red); color:var(--red); padding:6px 12px; font:800 26px/1 var(--cond); letter-spacing:.14em; text-transform:uppercase; transform:rotate(-7deg); }

@media (max-width:1100px) {
  .tb-pass, .tb-admin { grid-column:1/-1; }
  .tb-coupons { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width:700px) {
  .tb-main { padding-top:20px; }
  .tb-bar-in { gap:12px; }
  .tb-portal, .tb-who div { display:none; }
  .tb-out { padding:0 10px; }
  .tb-pass { grid-template-columns:1fr; }
  .tb-route { padding:10px 16px; font-size:13px; }
  .tb-day { padding:10px 16px; }
  .tb-pass-main { padding:22px 20px 0; }
  .tb-lede { display:none; }
  .tb-fields { grid-template-columns:1fr 1fr; }
  .tb-fields div:nth-child(3) { border-left:0; padding-left:0; }
  .tb-stub { border-left:0; border-top:2px dashed var(--lilac-rule); flex-direction:row; flex-wrap:wrap; align-items:baseline; gap:4px 16px; padding:18px 20px; }
  .tb-stub::before, .tb-stub::after { display:none; }
  .tb-stub .time { font-size:44px; margin:0; }
  .tb-admin { order:-1; }
  .tb-admin-body { padding:20px 20px 0; }
  .tb-admin h2 { font-size:34px; }
  .tb-dept { margin-top:36px; }
  .tb-coupons { grid-template-columns:1fr; gap:14px; }
  .tb-cp { grid-template-columns:72px 1fr; min-height:0; }
  .tb-cp-stub b { font-size:26px; }
  .tb-cp-body { padding:18px 18px 0; }
  .tb-cp-foot { margin:0 -18px 0; }
  .tb-cp-foot > span:first-child { padding:14px 18px; }
  .tb-void { grid-template-columns:72px 1fr; }
  .tb-void-body { padding:22px 20px; }
  .tb-void-stamp { position:static; display:inline-block; margin-bottom:12px; font-size:20px; }
  .tb-main { padding-bottom:72px; }
}
@media (prefers-reduced-motion:reduce) {
  .tb * { transition:none !important; }
  .tb-cp:hover .tb-cp-stub, .tb-cp:focus-visible .tb-cp-stub { transform:none; }
}
`;
