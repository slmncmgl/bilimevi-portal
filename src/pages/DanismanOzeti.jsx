// v1.9: danışman seçimi çoklu (admin/manager). Tek kişi: eski özet. 2+ kişi: "Aktivite sayıları" çubuk grafiği
//       (son aktivitesi aralıkta olan data, son güncelleyene göre; Bugün / Dün / Son 7 gün / Son N gün). crm-rapor aktiviteSayilari.
// v1.8: VIP Datalar varsayılanda ON, "Tüm Kaynaklar" (FiltreCubugu v1.6)
// v1.7: VIP Datalar OFF VIP kaynakları seçimden çıkarır (FiltreCubugu v1.5)
// v1.6: açılışta tüm veri kaynakları seçili
// v1.5: giriş çubuğu ortak (FiltreCubugu.jsx): Danışman (tekli) · kaynak + VIP · Tümü / süre. "Danışman Özeti · Son N gün" başlığı kalktı
// v1.4: staff'ta açılışta kendisi seçili gelir
// v1.3: danışman ve gün seçimi renkli çerçevede (diğer sekmelerle aynı renkler); bölüm başlıkları sade
// v1.2: bölüm başlıkları renkli
// v1.1: kendi sekmesi "Danışman Özeti" (önce Aktivite Tablosu içinde kutuydu). Danışman seçilmeden Kylas'a istek gitmez,
//       açılışta seçim boş gelir. Seçilebilir danışmanlar rol kuralıyla: admin satış ekibi, manager kendi şubesi, staff kendisi.
// v1.0: Aktivite Tablosu > "Son N gün özeti" (tek danışman)
// Seçili danışmanın son N günde (1-90, açılışta 7) yazdığı not, not girdiği data, açtığı ve tamamladığı task sayısı;
// aynı dönemde aldığı yeni datalar: şu an hangi aşamada, kaçına not girilmiş, kaçında task var, kaçına hiç dokunulmamış.
// Sayılar crm-rapor "ozet" işleminden gelir.
// Aşama değişiklikleri Kylas'ta geçmiş olarak tutulmadığı için henüz sayılmıyor.
import { useState, useEffect } from "react";
import { apiCagir, c, TUM_KAYNAKLAR, kaynakFiltresi, KYLAS_LEAD_URL, tarih, KAYNAKLAR, kisileriYukle, kucuk } from "./CrmRaporu";
import FiltreCubugu from "./FiltreCubugu";
import Ipucu from "./Ipucu";

const ASAMALAR = [
  [217285, "Yeni"], [222366, "Na1"], [253357, "Na2"], [253358, "Na3"], [218701, "Görüşme"], [218702, "İlgili"],
  [217286, "Yeni Kayıt"], [217287, "İlgisiz"], [217288, "Olumsuz"],
];
const ASAMA_ADI = Object.fromEntries(ASAMALAR);
const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const SAYFA = 20;
export const OZET_SURUM = "v1.9"; // 1. satırdaki sürümle aynı tut (sayfanın altındaki etikette görünür)

const ACIKLAMA = {
  baslik: "Seçili danışmanın bu dönemdeki işleri ve bu dönemde aldığı yeni datalar. Kaynak seçiliyse sadece o kaynaklardaki datalar sayılır. Tümü: tüm zamanlar.",
  not: "Danışmanın bu dönemde Kylas'ta yazdığı not sayısı.",
  notluData: "Danışmanın bu dönemde en az bir not yazdığı farklı data sayısı.",
  taskAcilan: "Danışmanın bu dönemde oluşturduğu task sayısı.",
  taskTamam: "Danışmana atanmış olup bu dönemde tamamlanan task sayısı.",
  aktivite: "Aşama değişiklikleri ve aramalar Kylas'tan geçmiş olarak alınamadığı için şimdilik sayılmıyor.",
  yeni: "Bu dönemde oluşturulup danışmana atanmış Bilimevi datası. Aşamalar datanın bugünkü aşamasıdır.",
  notlu: "Yeni datalardan danışmanın not yazdıkları.",
  taskli: "Yeni datalardan task'ı olanlar (açık ya da tamamlanmış).",
  dokunulmamis: "Hâlâ Yeni aşamasında, notu ve task'ı olmayan yeni datalar.",
};

export default function DanismanOzeti({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null);
  const [kisiHata, setKisiHata] = useState(null);
  const [kisiIdler, setKisiIdler] = useState([]); // açılışta boş: danışman seçilmeden istek gitmez
  const kisiId = kisiIdler.length === 1 ? kisiIdler[0] : null;
  const coklu = kisiIdler.length > 1;
  const [gun, setGun] = useState(7); // null = Tümü
  const [kaynaklar, setKaynaklar] = useState(TUM_KAYNAKLAR); // açılışta tüm kaynaklar; boşsa da tüm kaynaklar
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [filtre, setFiltre] = useState(null); // null: liste kapalı | "hepsi" | "notlu" | "taskli" | "dokunulmamis" | aşama id
  const [gosterilen, setGosterilen] = useState(SAYFA);

  useEffect(() => {
    kisileriYukle().then(setKisiler).catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  // Rolüne göre seçilebilir danışmanlar (Takip Tablosu ile aynı kural)
  const tumu = kisiler ? Object.entries(kisiler).map(([id, k]) => ({ id, ...k })).filter(k => k.personelde) : [];
  const secilebilir = (isAdmin || isManager ? tumu.filter(k => k.satis) : tumu)
    .filter(k => {
      if (isAdmin) return true;
      if (isManager) return kucuk(k.sube) === kucuk(user?.branch);
      return k.email === kucuk(user?.email) || kucuk(k.ad) === kucuk(user?.name);
    })
    .sort((a, b) => (a.sube || "").localeCompare(b.sube || "", "tr") || a.ad.localeCompare(b.ad, "tr"));
  // Staff sadece kendini görür: açılışta doğrudan kendisi seçili gelir. Admin ve manager seçmeden istek gitmez.
  useEffect(() => {
    if (kisiler && !kisiId && !isAdmin && !isManager && secilebilir.length === 1) setKisiIdler([secilebilir[0].id]);
  }, [kisiler]);

  useEffect(() => {
    setFiltre(null);
    if (!kisiId) { setVeri(null); return; }
    let iptal = false;
    setYukleniyor(true);
    setHata(null);
    const zamanlayici = setTimeout(() => {
      apiCagir({ islem: "ozet", ownerId: Number(kisiId), gun, kaynaklar: kaynakFiltresi(kaynaklar) })
        .then(d => { if (!iptal) setVeri(d); })
        .catch(e => { if (!iptal) { setVeri(null); setHata(e.message); } })
        .finally(() => { if (!iptal) setYukleniyor(false); });
    }, 400);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [kisiId, gun, [...kaynaklar].sort((x, y) => x - y).join(",")]);

  useEffect(() => { setGosterilen(SAYFA); }, [filtre]);

  const y = veri?.yeni;
  const a = veri?.aktivite;
  const listeSuz = l => filtre === "hepsi" || (filtre === "notlu" && l.not > 0) || (filtre === "taskli" && l.task)
    || (filtre === "dokunulmamis" && l.asama === 217285 && !l.not && !l.task) || l.asama === filtre;
  const liste = y && filtre !== null ? y.liste.filter(listeSuz) : [];
  const filtreSec = f => setFiltre(s => (s === f ? null : f));
  const filtreAdi = filtre === "hepsi" ? "Tüm yeni datalar" : filtre === "notlu" ? "Notu olanlar" : filtre === "taskli" ? "Task'ı olanlar"
    : filtre === "dokunulmamis" ? "Dokunulmamış" : ASAMA_ADI[filtre];

  return (
    <>
    <FiltreCubugu
      danisman={isAdmin || isManager ? { liste: secilebilir, secili: kisiIdler, onChange: ids => setKisiIdler(ids), tekli: false,
        bosMetin: "Danışman seçin", yukleniyor: !kisiler && !kisiHata } : null}
      kaynak={{ secili: kaynaklar, onChange: setKaynaklar }}
      tarih={coklu ? null : { deger: gun, onChange: setGun, bosMetin: "Süre seçin", ipucu: ACIKLAMA.baslik }} />
    <div style={{ ...c.tablo, marginBottom: "20px" }}>
      {kisiHata && <div style={{ ...c.hata, margin: "16px 24px" }}>{kisiHata}</div>}
      {!kisiIdler.length && !kisiHata && <div style={{ ...c.bos, padding: "40px 0" }}>Özeti görmek için yukarıdan bir danışman seçin. Birden fazla seçerseniz aktivite sayıları grafiği açılır.</div>}
      {coklu && <AktiviteGrafigi kisiler={secilebilir.filter(k => kisiIdler.includes(k.id))} />}
      {kisiId && yukleniyor && veri && <div style={{ height: "3px", background: "linear-gradient(90deg, #0891b2, #7c3aed)", animation: "fadeUp 0.6s ease-in-out infinite alternate" }} />}
      {kisiId && yukleniyor && !veri && <div style={{ ...c.bos, padding: "28px 0" }}><span style={c.spinner} /> CRM'den Alınıyor...</div>}
      {kisiId && !yukleniyor && hata && <div style={{ ...c.hata, margin: "16px 24px" }}>{hata}</div>}

      {kisiId && !hata && veri && (
        <div style={{ padding: "18px 24px 20px", opacity: yukleniyor ? 0.45 : 1, pointerEvents: yukleniyor ? "none" : "auto", transition: "opacity 0.2s" }}>
          <div style={o.ikili}>
            <div>
              <div style={c.etiket}><Ipucu metin={ACIKLAMA.aktivite}>Aktivite</Ipucu></div>
              <div style={o.kartlar}>
                <Kucuk sayi={a.not} etiket="Yazdığı not" ipucu={ACIKLAMA.not} />
                <Kucuk sayi={a.notluData} etiket="Not girdiği data" ipucu={ACIKLAMA.notluData} />
                <Kucuk sayi={a.taskAcilan} etiket="Açtığı task" ipucu={ACIKLAMA.taskAcilan} />
                <Kucuk sayi={a.taskTamamlanan} etiket="Tamamladığı task" ipucu={ACIKLAMA.taskTamam} />
              </div>
            </div>
            <div>
              <div style={c.etiket}><Ipucu metin={ACIKLAMA.yeni}>Yeni gelen data</Ipucu></div>
              <div style={o.kartlar}>
                <Kucuk sayi={y.toplam} etiket="Yeni data" ipucu={ACIKLAMA.yeni} secili={filtre === "hepsi"} onClick={y.toplam ? () => filtreSec("hepsi") : null} />
                <Kucuk sayi={y.notlu} etiket="Notu var" ipucu={ACIKLAMA.notlu} secili={filtre === "notlu"} onClick={y.notlu ? () => filtreSec("notlu") : null} />
                <Kucuk sayi={y.taskli} etiket="Task'ı var" ipucu={ACIKLAMA.taskli} secili={filtre === "taskli"} onClick={y.taskli ? () => filtreSec("taskli") : null} />
                <Kucuk sayi={y.dokunulmamis} etiket="Dokunulmamış" ipucu={ACIKLAMA.dokunulmamis} renk={y.dokunulmamis ? "#991b1b" : undefined}
                  zemin={y.dokunulmamis ? "#fef2f2" : undefined} cerceve={y.dokunulmamis ? "#fca5a5" : undefined}
                  secili={filtre === "dokunulmamis"} onClick={y.dokunulmamis ? () => filtreSec("dokunulmamis") : null} />
              </div>
            </div>
          </div>

          {y.toplam > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={c.etiket}>Yeni datalar bugün hangi aşamada</div>
              <div style={o.bar}>
                {ASAMALAR.filter(([id]) => y.asamalar[id]).map(([id, ad], i) => (
                  <div key={id} title={`${ad}: ${y.asamalar[id]}`} style={{ flex: y.asamalar[id], background: RENK[i % RENK.length] }} />
                ))}
              </div>
              <div style={{ ...c.chipSatir, marginTop: "10px" }}>
                {ASAMALAR.filter(([id]) => y.asamalar[id]).map(([id, ad], i) => (
                  <button key={id} onClick={() => filtreSec(id)} style={filtre === id ? c.chipAktif : c.chip}>
                    <span style={{ ...o.nokta, background: RENK[i % RENK.length] }} />{ad} ({y.asamalar[id]})
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtre !== null && (
            <div style={{ marginTop: "16px", border: "1px solid #eef2f6", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                <span>{filtreAdi} ({liste.length})</span>
                <button onClick={() => setFiltre(null)} style={c.chip}>✕ Kapat</button>
              </div>
              {y.kesildi && <div style={{ padding: "8px 14px", fontSize: "12px", color: "#92400e" }}>Listede en yeni 300 data var.</div>}
              <div style={{ overflowX: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      {["Data ID", "Ad Soyad", "Aşama", "Kaynak"].map(b => <th key={b} style={{ ...c.th, textAlign: "left" }}>{b}</th>)}
                      <th style={c.th}>Data tarihi</th>
                      <th style={{ ...c.th, textAlign: "center" }}>Not</th>
                      <th style={{ ...c.th, textAlign: "center" }}>Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.slice(0, gosterilen).map((l, i) => (
                      <tr key={l.id} style={{ background: i % 2 ? "#fbfdff" : "#fff" }}>
                        <td style={{ ...c.td, textAlign: "left" }}><a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noreferrer" style={c.link}>{l.id}</a></td>
                        <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{l.ad || "-"}</td>
                        <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{ASAMA_ADI[l.asama] || "-"}{l.yeniBekliyor ? <span style={o.uyari}>1 günden fazla</span> : null}</td>
                        <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{kaynakAdi(l.kaynak)}</td>
                        <td style={c.td}>{tarih(l.olusturma)}</td>
                        <td style={{ ...c.td, textAlign: "center" }}>{l.not || <span style={{ color: "#cbd5e1" }}>·</span>}</td>
                        <td style={{ ...c.td, textAlign: "center", color: "#166534" }}>{l.task ? "✓" : <span style={{ color: "#cbd5e1" }}>·</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {liste.length > gosterilen && (
                <div style={{ padding: "10px", textAlign: "center" }}>
                  <button onClick={() => setGosterilen(g => g + SAYFA)} style={c.chip}>Daha fazla göster ({liste.length - gosterilen})</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

function Kucuk({ sayi, etiket, ipucu, renk = "#0f172a", zemin = "#fff", cerceve = "#e2e8f0", onClick, secili }) {
  return (
    <Ipucu metin={ipucu} blok isaret={false}>
      <div onClick={onClick || undefined} role={onClick ? "button" : undefined}
        style={{ ...o.kart, background: zemin, borderColor: secili ? "#0891b2" : cerceve, cursor: onClick ? "pointer" : "help",
          boxShadow: secili ? "0 0 0 3px #cffafe" : "none" }}>
        <div style={{ fontSize: "24px", fontWeight: 800, color: renk, fontVariantNumeric: "tabular-nums" }}>{(sayi ?? 0).toLocaleString("tr-TR")}</div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginTop: "2px" }}>{etiket}</div>
      </div>
    </Ipucu>
  );
}

// 2+ danışman seçiliyken: son aktivitesi seçilen aralıkta olan datalar, son güncelleyen kişiye göre (Kylas aktivite raporu gibi)
const ARALIKLAR = [["bugun", "Bugün"], ["dun", "Dün"], [7, "Son 7 gün"]];
const CUBUK_RENK = ["#7c5cfa", "#f07f5e", "#94e0d8", "#f0bf55", "#a85d6c", "#84b9ee", "#f4b27e", "#6ec28d", "#c084fc", "#60a5fa"];
function AktiviteGrafigi({ kisiler }) {
  const [aralik, setAralik] = useState("dun");
  const [nYazi, setNYazi] = useState("");
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const idler = kisiler.map(k => Number(k.kylasId ?? k.id)).filter(Number.isInteger);
  const anahtar = idler.slice().sort((a, b) => a - b).join(",");
  useEffect(() => {
    if (!idler.length) return;
    let iptal = false;
    setYukleniyor(true); setHata(null);
    const z = setTimeout(() => {
      apiCagir({ islem: "aktiviteSayilari", ownerIds: idler, aralik })
        .then(d => { if (!iptal) setVeri(d); })
        .catch(e => { if (!iptal) { setVeri(null); setHata(e.message); } })
        .finally(() => { if (!iptal) setYukleniyor(false); });
    }, 400);
    return () => { iptal = true; clearTimeout(z); };
  }, [anahtar, aralik]);
  const satirlar = veri ? kisiler.map(k => ({ ad: k.ad, sayi: veri.sayilar?.[Number(k.kylasId ?? k.id)] || 0 })).sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, "tr")) : [];
  const toplam = satirlar.reduce((t, s) => t + s.sayi, 0);
  const enFazla = Math.max(1, ...satirlar.map(s => s.sayi));
  const nSecili = typeof aralik === "number" && aralik !== 7;
  const fmt = iso => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  const secimStil = aktif => ({ ...(aktif ? c.chipAktif : c.chip) });
  return (
    <div style={{ padding: "18px 24px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
        <div style={{ ...c.etiket, margin: 0, marginRight: "6px" }}><Ipucu metin="Son aktivitesi seçilen aralıkta olan datalar, en son kim güncellediyse ona sayılır (Kylas'taki Yesterday's Activities raporuyla aynı mantık). Bir data aralık içinde birden fazla kez güncellense de bir kez sayılır.">Aktivite sayıları</Ipucu></div>
        {ARALIKLAR.map(([d, ad]) => <button key={d} type="button" onClick={() => { setAralik(d); setNYazi(""); }} style={secimStil(aralik === d)}>{ad}</button>)}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <button type="button" onClick={() => { const n = Number(nYazi) || 30; setNYazi(String(n)); setAralik(n === 7 ? 7 : n); }} style={secimStil(nSecili)}>Son N gün</button>
          {(nSecili || nYazi) && (
            <input type="number" min="1" max="365" value={nYazi} placeholder="N"
              onChange={e => { setNYazi(e.target.value); const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 365) setAralik(n); }}
              style={{ width: "64px", height: "30px", padding: "0 8px", borderRadius: "8px", border: "1.5px solid #c4b5fd", fontSize: "13px", fontFamily: "inherit" }} />
          )}
        </span>
      </div>
      {veri && <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>Son aktivite: {fmt(veri.bas)} – {fmt(veri.bit)}</div>}
      {hata && <div style={{ ...c.hata, margin: "0 0 12px" }}>{hata}</div>}
      {yukleniyor && !veri && <div style={{ ...c.bos, padding: "28px 0" }}><span style={c.spinner} /> CRM'den Alınıyor...</div>}
      {veri && (
        <div style={{ border: "1px solid #eef2f6", borderRadius: "14px", overflow: "hidden", opacity: yukleniyor ? 0.45 : 1, transition: "opacity 0.2s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #eef2f6", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
            <span>Güncelleyen</span><span>Data sayısı ({toplam.toLocaleString("tr-TR")})</span>
          </div>
          <div style={{ padding: "10px 16px 14px" }}>
            {satirlar.map((s, i) => (
              <div key={s.ad} style={{ display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center", gap: "0", padding: "5px 0" }}>
                <span title={s.ad} style={{ fontSize: "14px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "12px" }}>{s.ad}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderLeft: "1px solid #e2e8f0", paddingLeft: "0", minHeight: "26px" }}>
                  <div style={{ width: `${(s.sayi / enFazla) * 88}%`, minWidth: s.sayi ? "6px" : 0, height: "22px", borderRadius: "0 7px 7px 0", background: CUBUK_RENK[i % CUBUK_RENK.length], transition: "width .5s ease" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: s.sayi ? "#334155" : "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>{s.sayi}</span>
                </div>
              </div>
            ))}
          </div>
          {veri.kesildi && <div style={{ padding: "8px 16px", fontSize: "12px", color: "#92400e", background: "#fffbeb" }}>Aralıkta 10.000'den fazla data var, sayılar eksik olabilir. Daha kısa bir aralık seçin.</div>}
        </div>
      )}
    </div>
  );
}

const RENK = ["#0891b2", "#6366f1", "#8b5cf6", "#a855f7", "#f59e0b", "#16a34a", "#059669", "#94a3b8", "#ef4444"];
const o = {
  secim: { height: "34px", padding: "0 12px", borderRadius: "999px", border: "1.5px solid #0891b2", background: "#ecfeff", color: "#0f172a",
    fontSize: "12px", fontWeight: 700, fontFamily: "'Sora', sans-serif", cursor: "pointer" },
  secimBos: { borderColor: "#e2e8f0", background: "#fff", color: "#64748b" },
  ikili: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" },
  kartlar: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" },
  kart: { border: "1.5px solid", borderRadius: "14px", padding: "12px 10px", textAlign: "center", height: "100%", boxSizing: "border-box", transition: "all 0.15s" },
  bar: { display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", gap: "2px", background: "#f1f5f9" },
  nokta: { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", marginRight: "6px", verticalAlign: "middle" },
  uyari: { marginLeft: "6px", fontSize: "10px", fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "999px", padding: "1px 6px" },
};
