// v1.4: birden fazla veri kaynağı seçilebilir (✓ ile işaretlenir, "Tümü" hepsini seçer, "Temizle" boşaltır).
//       Seçim değişince istek 400 ms bekleyip gider, art arda tıklamalar tek istek olur.
// v1.3: satış ekibi listesi (SATIS_EKIBI). Tabloda sadece satış danışmanları ayrı satır, diğer sahipler "Diğer" satırında.
//       Staff her durumda kendi satırını görür. Sunucu da artık rolü kontrol ediyor (api/_yetki.js).
// v1.2: kişi yükleme, NotBalonu ve yardımcılar TakipRaporu.jsx için dışa açıldı (davranış aynı)
// v1.1: grid görünüm; sayılar tıklanabilir, tıklanınca o danışman + aşama için lead listesi (LeadPaneli) açılır.
//       Lead ID Kylas'ta yeni sekmede açılır, not ikonunun üzerine gelince son 3 not görünür (NotBalonu).
// v1.0: Performans Analizi > CRM Raporu sekmesi
// Veri kaynağı seçilir, o kaynaktaki Bilimevi pipeline lead'leri danışman x aşama tablosunda sayılır.
// Sayılar /api/crm-rapor'dan gelir. Danışman adı ve şubesi İzin Yönetimi'ndeki ID (e-posta -> Kylas ID)
// ve Personel sekmelerinden eşlenir; ID sekmesinde olmayan sahipler "Diğer" satırında toplanır.
// Rol kuralı Quiz Skorları ile aynı: admin/director/owner herkesi, manager kendi şubesini, staff kendini görür.
import { useState, useEffect, useRef } from "react";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const csvUrl = sekme => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sekme)}`;

// Kylas "Kaynak" picklist ID'leri, lead sayısına göre sıralı (Kasım 2026)
export const KAYNAKLAR = [
  { id: 2675584, ad: "Instagram" },
  { id: 2650987, ad: "Fuar" },
  { id: 2753894, ad: "Imports" },
  { id: 2650986, ad: "Bilgi İstek Formu" },
  { id: 2614512, ad: "Referans" },
  { id: 2614515, ad: "Instagram DM" },
  { id: 2674021, ad: "Facebook" },
  { id: 3024131, ad: "Setrow Marketing" },
  { id: 2614513, ad: "Telefon" },
  { id: 2614514, ad: "Ofis" },
  { id: 2652456, ad: "Google" },
  { id: 3017966, ad: "Event" },
  { id: 2941507, ad: "Websitesi" },
  { id: 3005340, ad: "Eski Öğrenci" },
];

export const KYLAS_LEAD_URL = id => `https://app.kylas.io/sales/leads/details/${id}`;

export async function apiCagir(govde) {
  const r = await fetch("/api/crm-rapor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(govde) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `İstek başarısız (HTTP ${r.status})`);
  return d;
}

export function tarih(v, saatli = false) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", ...(saatli ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

const ARALIKLAR = [
  { gun: 90, ad: "Son 90 gün" },
  { gun: null, ad: "Tümü" },
];

function parseCSV(csv) {
  return csv.trim().split("\n").map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    values.push(cur.trim());
    return values;
  });
}

function satirlariOku(csv) {
  const rows = parseCSV(csv);
  const h = rows[0] || [];
  return rows.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || ""])));
}

export const kucuk = v => String(v || "").trim().toLocaleLowerCase("tr-TR");

// Satış danışmanları (Kasım 2026, Selman'ın listesi). Ad Soyad Personel sekmesiyle eşleşmeli.
// Ekip değişince bu listeyi güncelleyin.
export const SATIS_EKIBI = [
  "Pınar Aydın", "Bahriye Günsel",                                        // Ankara
  "Barış Gümüşlü", "Nil Özer", "Rukiye Özdemir", "Özgür Koç",             // Kadıköy
  "Nur Alpay", "Sibel Özel",                                              // İzmir
  "Zeynep Çırak", "Uğurcan Eneç",                                         // Bahçeşehir
  "Mina Karimzadeh", "Tevhide Döner",                                     // Taksim
];
const SATIS_SET = new Set(SATIS_EKIBI.map(kucuk));

// Kylas ID -> { ad, sube, email }: İzin Yönetimi ID sekmesi (e-posta -> Kylas ID) + Personel sekmesi
export async function kisileriYukle() {
  const [idCsv, personelCsv] = await Promise.all([fetch(csvUrl("ID")).then(r => r.text()), fetch(csvUrl("Personel")).then(r => r.text())]);
  const personel = satirlariOku(personelCsv);
  const harita = {};
  satirlariOku(idCsv).forEach(r => {
    const email = kucuk(r.Email);
    const id = String(r.ID || "").trim();
    if (!email || !id) return;
    const p = personel.find(x => kucuk(x["E-posta"]) === email);
    harita[id] = { ad: p?.["Ad Soyad"] || email.split("@")[0], sube: p?.["Şube"] || "", email, personelde: !!p, satis: !!p && SATIS_SET.has(kucuk(p["Ad Soyad"])) };
  });
  return harita;
}

export default function CrmRaporu({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null); // kylasId -> { ad, sube, email }
  const [kisiHata, setKisiHata] = useState(null);
  const [kaynaklar, setKaynaklar] = useState([]); // seçili kaynak id'leri
  const [gun, setGun] = useState(90);
  const [sube, setSube] = useState("Tümü");
  const [rapor, setRapor] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [secim, setSecim] = useState(null); // { baslik, ownerIds, asama, asamaAd }

  const kaynakAnahtari = [...kaynaklar].sort((a, b) => a - b).join(",");
  const kaynakDegistir = id => setKaynaklar(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const seciliAdlar = KAYNAKLAR.filter(k => kaynaklar.includes(k.id)).map(k => k.ad);
  const kaynakAdlari = seciliAdlar.length === KAYNAKLAR.length ? "Tüm kaynaklar"
    : seciliAdlar.length > 3 ? `${seciliAdlar.slice(0, 3).join(", ")} +${seciliAdlar.length - 3}` : seciliAdlar.join(", ");

  useEffect(() => {
    kisileriYukle()
      .then(setKisiler)
      .catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  useEffect(() => {
    setSecim(null);
    if (!kaynaklar.length) { setRapor(null); return; }
    let iptal = false;
    setYukleniyor(true);
    setHata(null);
    const zamanlayici = setTimeout(() => {
      apiCagir({ kaynaklar, gun })
        .then(d => { if (!iptal) setRapor(d); })
        .catch(e => { if (!iptal) { setRapor(null); setHata(e.message); } })
        .finally(() => { if (!iptal) setYukleniyor(false); });
    }, 400);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [kaynakAnahtari, gun]);

  // Satırları kur: tanınan danışmanlar ayrı, diğer sahipler tek "Diğer" satırında
  const satirlar = [];
  const kendiEmail = kucuk(user?.email);
  const kendisiMi = k => k.email === kendiEmail || kucuk(k.ad) === kucuk(user?.name);
  if (rapor && kisiler) {
    const diger = { ad: "Diğer", sube: "", sayilar: {}, diger: true, ownerIds: [] };
    Object.entries(rapor.danismanlar).forEach(([ownerId, sayilar]) => {
      const k = kisiler[ownerId];
      if (k && (k.satis || kendisiMi(k))) { satirlar.push({ ...k, sayilar, ownerIds: [Number(ownerId)] }); return; }
      if (Number.isInteger(Number(ownerId))) diger.ownerIds.push(Number(ownerId));
      Object.entries(sayilar).forEach(([st, n]) => { diger.sayilar[st] = (diger.sayilar[st] || 0) + n; });
    });
    if (Object.keys(diger.sayilar).length) satirlar.push(diger);
  }

  const gorunen = satirlar
    .filter(r => {
      if (isAdmin) return sube === "Tümü" || (!r.diger && kucuk(r.sube) === kucuk(sube));
      if (isManager) return !r.diger && kucuk(r.sube) === kucuk(user?.branch);
      return !r.diger && kendisiMi(r);
    })
    .map(r => ({ ...r, toplam: Object.values(r.sayilar).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => (a.diger ? 1 : b.diger ? -1 : b.toplam - a.toplam));

  const subeler = ["Tümü", ...[...new Set(satirlar.filter(r => !r.diger && r.sube).map(r => r.sube))].sort((a, b) => a.localeCompare(b, "tr"))];
  const asamalar = rapor?.asamalar || [];
  const sutunToplam = id => gorunen.reduce((a, r) => a + (r.sayilar[id] || 0), 0);
  const genelToplam = gorunen.reduce((a, r) => a + r.toplam, 0);

  function hucreSec(r, asama) {
    if (!r.ownerIds.length) return;
    setSecim({ anahtar: `${r.ad}:${asama?.id || "tumu"}`, baslik: r.ad, ownerIds: r.ownerIds, asama: asama?.id || null, asamaAd: asama?.ad || "Tüm aşamalar" });
  }
  const seciliMi = (r, asama) => secim?.anahtar === `${r.ad}:${asama?.id || "tumu"}`;
  const sayiHucresi = (r, asama, n, ekStil = {}) => (
    n ? (
      <button onClick={() => hucreSec(r, asama)} title="Lead listesini aç"
        style={{ ...c.sayiBtn, ...ekStil, ...(seciliMi(r, asama) ? c.sayiBtnSecili : {}) }}>
        {n.toLocaleString("tr-TR")}
      </button>
    ) : <span style={{ color: "#cbd5e1" }}>·</span>
  );

  return (
    <>
      <div style={c.panel}>
        <div style={c.etiket}>Veri kaynağı (birden fazla seçilebilir)</div>
        <div style={c.chipSatir}>
          <button onClick={() => setKaynaklar(KAYNAKLAR.map(k => k.id))} style={kaynaklar.length === KAYNAKLAR.length ? c.chipAktif : c.chip}>Tümü</button>
          {kaynaklar.length > 0 && <button onClick={() => setKaynaklar([])} style={{ ...c.chip, color: "#dc2626", borderColor: "#fecaca" }}>Temizle</button>}
          {KAYNAKLAR.map(k => (
            <button key={k.id} onClick={() => kaynakDegistir(k.id)} style={kaynaklar.includes(k.id) ? c.chipAktif : c.chip}>
              {kaynaklar.includes(k.id) ? "✓ " : ""}{k.ad}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginTop: "16px" }}>
          <div>
            <div style={c.etiket}>Lead oluşturma tarihi</div>
            <div style={c.chipSatir}>
              {ARALIKLAR.map(a => (
                <button key={a.ad} onClick={() => setGun(a.gun)} style={gun === a.gun ? c.chipAktif : c.chip}>{a.ad}</button>
              ))}
            </div>
          </div>
          {isAdmin && rapor && subeler.length > 2 && (
            <div>
              <div style={c.etiket}>Şube</div>
              <div style={c.chipSatir}>
                {subeler.map(sb => (
                  <button key={sb} onClick={() => setSube(sb)} style={sube === sb ? c.chipAktif : c.chip}>{sb}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {!kaynaklar.length && <div style={c.bos}>Raporu görmek için bir ya da birden fazla veri kaynağı seçin.</div>}
      {kaynaklar.length > 0 && yukleniyor && (
        <div style={c.bos}><span style={c.spinner} /> Kylas'tan sayılar alınıyor...</div>
      )}
      {kaynaklar.length > 0 && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {kaynaklar.length > 0 && !yukleniyor && !hata && rapor && kisiler && (
        gorunen.length === 0 ? (
          <div style={c.bos}>Bu kaynakta size ait lead bulunmuyor.</div>
        ) : (
          <div style={c.tablo}>
            <div style={c.tabloBaslik}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                {kaynakAdlari} · Bilimevi pipeline
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                {genelToplam.toLocaleString("tr-TR")} lead · {new Date(rapor.guncellendi).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} itibarıyla
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={c.grid}>
                <thead>
                  <tr>
                    <th style={{ ...c.th, ...c.ilkSutun, textAlign: "left", background: "#f8fafc", zIndex: 2 }}>Danışman</th>
                    {asamalar.map(a => <th key={a.id} style={c.th}>{a.ad}</th>)}
                    <th style={{ ...c.th, background: "#ecfeff", color: "#0e7490" }}>Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {gorunen.map((r, i) => {
                    const zemin = i % 2 ? "#fbfdff" : "#fff";
                    return (
                      <tr key={r.diger ? "diger" : r.email} style={{ background: zemin }}>
                        <td style={{ ...c.td, ...c.ilkSutun, textAlign: "left", background: zemin, fontWeight: 600, color: r.diger ? "#94a3b8" : "#0f172a", whiteSpace: "nowrap" }}>
                          {r.ad}
                          {isAdmin && r.sube && <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}> · {r.sube}</span>}
                        </td>
                        {asamalar.map(a => <td key={a.id} style={c.td}>{sayiHucresi(r, a, r.sayilar[a.id] || 0)}</td>)}
                        <td style={{ ...c.td, background: "#f0fdff" }}>{sayiHucresi(r, null, r.toplam, { fontWeight: 700, color: "#0891b2" })}</td>
                      </tr>
                    );
                  })}
                  {gorunen.length > 1 && (
                    <tr style={{ background: "#f8fafc" }}>
                      <td style={{ ...c.td, ...c.ilkSutun, textAlign: "left", background: "#f8fafc", fontWeight: 700, color: "#0f172a" }}>Toplam</td>
                      {asamalar.map(a => <td key={a.id} style={{ ...c.td, fontWeight: 700, color: "#0f172a" }}>{sutunToplam(a.id).toLocaleString("tr-TR")}</td>)}
                      <td style={{ ...c.td, fontWeight: 700, color: "#0891b2", background: "#ecfeff" }}>{genelToplam.toLocaleString("tr-TR")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {secim && kaynaklar.length > 0 && (
        <LeadPaneli key={`${secim.anahtar}:${kaynakAnahtari}:${gun}`} secim={secim} kaynaklar={kaynaklar} gun={gun}
          kaynakAd={kaynakAdlari} asamalar={asamalar} onKapat={() => setSecim(null)} />
      )}
    </>
  );
}

// Tıklanan hücrenin lead listesi. Sadece açılınca çekilir.
function LeadPaneli({ secim, kaynaklar, gun, kaynakAd, asamalar, onKapat }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(null);
  const ref = useRef(null);
  const notOnbellek = useRef({});

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    apiCagir({ islem: "liste", kaynaklar, gun, ownerIds: secim.ownerIds, asama: secim.asama })
      .then(setVeri)
      .catch(e => setHata(e.message));
  }, []);

  const asamaAdi = id => asamalar.find(a => a.id === id)?.ad || "";

  return (
    <div ref={ref} style={{ ...c.tablo, marginTop: "20px", scrollMarginTop: "80px" }}>
      <div style={c.tabloBaslik}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
          {secim.baslik} · {secim.asamaAd} <span style={{ color: "#94a3b8", fontWeight: 500 }}>· {kaynakAd}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {veri && <span style={{ fontSize: "12px", color: "#94a3b8" }}>{veri.toplam.toLocaleString("tr-TR")} lead{veri.toplam > veri.leadler.length ? `, ilk ${veri.leadler.length} gösteriliyor` : ""}</span>}
          <button onClick={onKapat} style={c.kapatBtn} title="Kapat">✕</button>
        </span>
      </div>
      {!veri && !hata && <div style={c.bos}><span style={c.spinner} /> Lead'ler alınıyor...</div>}
      {hata && <div style={{ ...c.hata, margin: "16px" }}>{hata}</div>}
      {veri && (
        <div style={{ overflowX: "auto", maxHeight: "560px", overflowY: "auto" }}>
          <table style={c.grid}>
            <thead>
              <tr>
                <th style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>Lead ID</th>
                <th style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>Ad Soyad</th>
                {!secim.asama && <th style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>Aşama</th>}
                <th style={{ ...c.th, position: "sticky", top: 0 }}>Oluşturma</th>
                <th style={{ ...c.th, position: "sticky", top: 0 }}>Son aktivite</th>
                <th style={{ ...c.th, position: "sticky", top: 0 }}>Sonraki task</th>
                <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0 }}>Notlar</th>
              </tr>
            </thead>
            <tbody>
              {veri.leadler.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 ? "#fbfdff" : "#fff" }}>
                  <td style={{ ...c.td, textAlign: "left" }}>
                    <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={c.link}>{l.id}</a>
                  </td>
                  <td style={{ ...c.td, textAlign: "left", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>{l.ad || <span style={{ color: "#cbd5e1" }}>İsimsiz</span>}</td>
                  {!secim.asama && <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{asamaAdi(l.asama)}</td>}
                  <td style={c.td}>{tarih(l.olusturma)}</td>
                  <td style={c.td}>{tarih(l.sonAktivite) || <span style={{ color: "#cbd5e1" }}>·</span>}</td>
                  <td style={{ ...c.td, color: l.sonrakiTask && new Date(l.sonrakiTask) < new Date() ? "#dc2626" : undefined }}>
                    {tarih(l.sonrakiTask) || <span style={{ color: "#cbd5e1" }}>·</span>}
                  </td>
                  <td style={{ ...c.td, textAlign: "center" }}><NotBalonu lead={l} onbellek={notOnbellek} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Not ikonu: üzerine gelince lead'in son 3 notu çekilir (bir kez) ve balonda gösterilir.
export function NotBalonu({ lead, onbellek }) {
  const [konum, setKonum] = useState(null);
  const [durum, setDurum] = useState(onbellek.current[lead.id] || null);
  const zamanlayici = useRef(null);

  function ac(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const genislik = 360;
    setKonum({ left: Math.max(12, Math.min(r.right - genislik, window.innerWidth - genislik - 12)), top: r.bottom + 6, alttan: window.innerHeight - r.top + 6, yukari: r.bottom > window.innerHeight - 260 });
    if (onbellek.current[lead.id]) { setDurum(onbellek.current[lead.id]); return; }
    setDurum({ yukleniyor: true });
    apiCagir({ islem: "notlar", leadId: lead.id, ownerId: lead.ownerId })
      .then(d => { onbellek.current[lead.id] = d; setDurum(d); })
      .catch(err => setDurum({ hata: err.message }));
  }

  return (
    <span style={{ display: "inline-block" }}
      onMouseEnter={e => { clearTimeout(zamanlayici.current); ac(e); }}
      onMouseLeave={() => { zamanlayici.current = setTimeout(() => setKonum(null), 150); }}>
      <span style={c.notIkon} aria-label="Son notlar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
        </svg>
      </span>
      {konum && (
        <div style={{ ...c.balon, left: konum.left, ...(konum.yukari ? { bottom: konum.alttan } : { top: konum.top }) }}
          onMouseEnter={() => clearTimeout(zamanlayici.current)}
          onMouseLeave={() => setKonum(null)}>
          {durum?.yukleniyor && <div style={{ color: "#64748b" }}>Notlar alınıyor...</div>}
          {durum?.hata && <div style={{ color: "#991b1b" }}>{durum.hata}</div>}
          {durum?.notlar && durum.notlar.length === 0 && <div style={{ color: "#64748b" }}>Bu lead'de not yok.</div>}
          {durum?.notlar?.map((n, i) => (
            <div key={i} style={{ paddingBottom: "10px", marginBottom: "10px", borderBottom: i < durum.notlar.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{tarih(n.tarih, true)}{n.yazan ? ` · ${n.yazan}` : ""}</div>
              <div style={{ whiteSpace: "pre-wrap", color: "#0f172a" }}>{n.metin || <span style={{ color: "#cbd5e1" }}>Boş not</span>}</div>
            </div>
          ))}
          {durum?.toplam > (durum?.notlar?.length || 0) && (
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Toplam {durum.toplam} not, son {durum.notlar.length} tanesi gösteriliyor.</div>
          )}
        </div>
      )}
    </span>
  );
}

const chipTemel = { padding: "7px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" };
export const c = {
  panel: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "20px 24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  etiket: { fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" },
  chipSatir: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: { ...chipTemel, background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0" },
  chipAktif: { ...chipTemel, background: "#0891b2", color: "#fff", border: "1.5px solid #0891b2" },
  bos: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "48px 0", color: "#64748b", fontSize: "14px" },
  hata: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "16px 20px", color: "#991b1b", fontSize: "13px", fontWeight: 500, marginBottom: "16px" },
  spinner: { display: "inline-block", width: "18px", height: "18px", border: "2px solid #e2e8f0", borderTopColor: "#0891b2", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  tablo: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", animation: "fadeUp 0.4s ease-out" },
  tabloBaslik: { padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" },
  grid: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "13px" },
  th: { padding: "10px 12px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap", background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", borderRight: "1px solid #e2e8f0", zIndex: 1 },
  td: { padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#334155", borderBottom: "1px solid #eef2f6", borderRight: "1px solid #eef2f6" },
  ilkSutun: { position: "sticky", left: 0, borderRight: "1.5px solid #e2e8f0" },
  sayiBtn: { background: "none", border: "none", padding: "3px 6px", margin: "-3px -6px", borderRadius: "6px", cursor: "pointer", font: "inherit", color: "#0f172a", fontVariantNumeric: "tabular-nums", textDecoration: "underline", textDecorationColor: "#cbd5e1", textUnderlineOffset: "3px" },
  sayiBtnSecili: { background: "#0891b2", color: "#fff", textDecoration: "none" },
  kapatBtn: { width: "28px", height: "28px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: "12px" },
  link: { color: "#0891b2", fontWeight: 600, textDecoration: "none", fontVariantNumeric: "tabular-nums" },
  notIkon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "8px", color: "#64748b", cursor: "default", background: "#f1f5f9" },
  balon: { position: "fixed", width: "360px", maxHeight: "320px", overflowY: "auto", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,23,42,0.16)", padding: "14px 16px", fontSize: "13px", lineHeight: 1.5, textAlign: "left", zIndex: 50 },
};
