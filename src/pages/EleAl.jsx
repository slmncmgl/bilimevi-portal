// v1.3: sayaç, "Kylas'ta aç" ve ileri düğmesi Danışman sütununun başladığı yerde (4 sütunlu ortak ızgara).
//       İleri düğmesi her durumda "Kaydet ve Sonrakine Geç" (son datada "Kaydet ve Bitir").
// v1.2: üst şerit kartla hizalı: sol kenar Telefon sütununda, sağ kenar Danışman sütununun bittiği yerde
// v1.1: Kylas kaydı gibi düzen: ortada "Ad (#ID)" başlığı ve iki sıra bilgi (telefon, e-posta, şehir, danışman, form tarihi,
//       Campaign Name, Data Kaynağı, aşama), altında not kutusu ve önceki notlar. Telefon ve e-posta islem "detay" ile alınır.
// v1.0: "Bu dataları ele al" (Takip Tablosu). Listedeki datalar tam ekranda tek tek açılır, üstte sıra (3 / 30).
// Her datada bilgiler ve son 10 not görünür; not yazılmadan sonrakine geçilmez. Not Kylas'a kaydedilir (islem "notEkle"),
// başına sunucu "[Yazan · Portal]" ekler. Önceki datalara dönülebilir. Kapatınca not girilen datalar üst bileşene bildirilir.
// EleAlDugmesi: liste başlığındaki parlayan düğme.
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { apiCagir, tarih, KYLAS_LEAD_URL, KAYNAKLAR } from "./CrmRaporu";
import { VIP_KAYNAKLAR } from "./KaynakSecici";
import OnayPenceresi from "./OnayPenceresi";

const ASAMA_ADLARI = { 217285: "Yeni", 222366: "Na1", 253357: "Na2", 253358: "Na3", 218701: "Görüşme", 218702: "İlgili" };
const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const gunOnce = v => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null);
const ENAZ = 2; // not en az bu kadar karakter

export function EleAlDugmesi({ sayi, onClick, disabled }) {
  return (
    <button type="button" className="elal-btn" onClick={onClick} disabled={disabled || !sayi}
      title={sayi ? `${sayi} Datayı sırayla aç, her birine not gir` : "Listede Data yok"}>
      <style>{DUGME_CSS}</style>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
      <span>Bu dataları ele al</span>
      <b className="elal-sayi">{sayi}</b>
    </button>
  );
}

export default function EleAl({ leadler, kisiAdi, gecikmis, onKapat }) {
  const [sira, setSira] = useState(0);
  const [notlar, setNotlar] = useState({}); // id -> { yukleniyor } | { notlar, toplam } | { hata }
  const [yazilan, setYazilan] = useState({}); // id -> eklenen not sayısı (bu oturumda)
  const [taslak, setTaslak] = useState({}); // id -> yazılan ama kaydedilmemiş metin
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [basari, setBasari] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [cikisSor, setCikisSor] = useState(false);
  const alan = useRef(null);
  const istenen = useRef(new Set());
  const [detaylar, setDetaylar] = useState({}); // id -> { yukleniyor } | detay | { hata }
  const detayIstenen = useRef(new Set());

  const toplam = leadler.length;
  const l = leadler[sira];
  const metin = taslak[l?.id] || "";
  const notVar = !!yazilan[l?.id];
  const girilen = Object.keys(yazilan).length;
  const kaydedilmemis = Object.values(taslak).some(v => v.trim());

  function notlariGetir(lead) {
    if (!lead || istenen.current.has(lead.id)) return;
    istenen.current.add(lead.id);
    setNotlar(s => ({ ...s, [lead.id]: { yukleniyor: true } }));
    apiCagir({ islem: "notlar", leadId: lead.id, ownerId: lead.ownerId, boyut: 10 })
      .then(d => setNotlar(s => ({ ...s, [lead.id]: d })))
      .catch(e => { istenen.current.delete(lead.id); setNotlar(s => ({ ...s, [lead.id]: { hata: e.message } })); });
  }
  function detayGetir(lead) {
    if (!lead || detayIstenen.current.has(lead.id)) return;
    detayIstenen.current.add(lead.id);
    setDetaylar(s => ({ ...s, [lead.id]: { yukleniyor: true } }));
    apiCagir({ islem: "detay", leadId: lead.id })
      .then(d => setDetaylar(s => ({ ...s, [lead.id]: d })))
      .catch(e => { detayIstenen.current.delete(lead.id); setDetaylar(s => ({ ...s, [lead.id]: { hata: e.message } })); });
  }
  // Açık datanın ve bir sonrakinin bilgileri ve notları önceden alınır
  useEffect(() => {
    [leadler[sira], leadler[sira + 1]].forEach(x => { detayGetir(x); notlariGetir(x); });
    setHata(null); alan.current?.focus({ preventScroll: true });
  }, [sira]);

  // Sayfa kaymasın; Esc ile çıkış (kaydedilmemiş not varsa sorar)
  useEffect(() => {
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = eski; };
  }, []);
  const kapatIste = () => { if (kaydedilmemis && !bitti) setCikisSor(true); else onKapat(Object.keys(yazilan).map(Number)); };
  useEffect(() => {
    const tus = e => { if (e.key === "Escape" && !cikisSor) kapatIste(); };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  });

  function ilerle() {
    if (sira + 1 >= toplam) setBitti(true);
    else setSira(sira + 1);
  }

  async function kaydet() {
    const m = metin.trim();
    if (kaydediliyor) return;
    if (m.length < ENAZ) { if (notVar) ilerle(); return; }
    setKaydediliyor(true);
    setHata(null);
    try {
      const d = await apiCagir({ islem: "notEkle", leadId: l.id, metin: m });
      setYazilan(s => ({ ...s, [l.id]: (s[l.id] || 0) + 1 }));
      setTaslak(s => ({ ...s, [l.id]: "" }));
      setNotlar(s => {
        const eski = s[l.id]?.notlar ? s[l.id] : { notlar: [], toplam: 0 };
        return { ...s, [l.id]: { notlar: [{ tarih: d.tarih, yazan: "Sen", metin: m, portal: true, yeni: true }, ...eski.notlar], toplam: (eski.toplam || 0) + 1 } };
      });
      setBasari(true);
      setTimeout(() => { setBasari(false); ilerle(); }, 650);
    } catch (e) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  }

  const n = l ? notlar[l.id] : null;
  const dt = l ? detaylar[l.id] : null;
  const dy = !dt || dt.yukleniyor; // detay bekleniyor
  const kampanya = dt?.kampanya ?? l?.kampanya;
  const kaynak = dt?.kaynak ?? l?.kaynak;
  const ilerleme = Math.round(((bitti ? toplam : sira) / toplam) * 100);
  const metinYeterli = metin.trim().length >= ENAZ;
  const ileriAcik = (metinYeterli || notVar) && !kaydediliyor && !basari;

  return createPortal(
    <div style={s.zemin} role="dialog" aria-modal="true" aria-label="Dataları ele al">
      <style>{EKRAN_CSS}</style>
      <header className="elal-ust" style={s.ust}>
        <div style={{ gridColumn: "1 / 4", display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <span style={s.logo}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="#fff" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>Dataları ele al</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{gecikmis ? "Gecikmiş task'lı Datalar" : "Takipsiz Datalar"} · {girilen} Data'ya not girildi</div>
          </div>
        </div>
        <div className="elal-sag" style={s.sagBlok}>
          <div style={s.sayac} aria-live="polite">
            <span style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{bitti ? toplam : sira + 1}</span>
            <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: 700 }}> / {toplam}</span>
          </div>
          <button type="button" onClick={kapatIste} style={s.kapat} aria-label="Kapat">✕</button>
        </div>
        <div style={s.cubukZemin}><div className="elal-cubuk" style={{ width: `${ilerleme}%` }} /></div>
      </header>

      {bitti ? (
        <main style={s.bitti}>
          <div className="elal-bitti-ikon">✓</div>
          <h2 style={{ margin: "18px 0 6px", fontSize: "24px", color: "#0f172a" }}>Hepsi ele alındı</h2>
          <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>{toplam} Data'nın {girilen} tanesine not girildi. Notlar Kylas'a kaydedildi.</p>
          <button type="button" onClick={() => onKapat(Object.keys(yazilan).map(Number))} style={{ ...s.ileri, marginTop: "24px" }}>Listeye dön</button>
        </main>
      ) : (
        <main key={l.id} className="elal-govde" style={s.govde}>
          <section style={s.kart}>
            <div className="elal-izgara" style={s.baslikSatir}>
              <div style={{ gridColumn: "1 / 4", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", minWidth: 0 }}>
                <h2 style={s.ad}>{dt?.ad || l.ad || <span style={{ color: "#cbd5e1" }}>İsimsiz</span>}<span style={s.idNo}>(#{l.id})</span></h2>
                {notVar && <span style={s.eklendi}>✓ Not eklendi</span>}
              </div>
              <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={s.kylas}>Kylas'ta aç ↗</a>
            </div>
            {dt?.hata && <div style={{ ...s.hata, marginTop: 0, marginBottom: "14px" }}>{dt.hata} <button type="button" onClick={() => detayGetir(l)} style={s.metinDugme}>Tekrar dene</button></div>}
            <div className="elal-alanlar" style={s.alanlar}>
              <Alan ad="Telefon" bekliyor={dy}>
                {dt?.telefonlar?.length ? <div style={s.liste}>{dt.telefonlar.map(t => <a key={t} href={`tel:${t}`} style={s.iletisim}><span style={s.ikonYesil}>☎</span>{t}</a>)}</div> : "-"}
              </Alan>
              <Alan ad="E-posta" bekliyor={dy}>
                {dt?.epostalar?.length ? <div style={s.liste}>{dt.epostalar.map(e => <a key={e} href={`mailto:${e}`} style={s.iletisim}><span style={s.ikonMavi}>@</span>{e}</a>)}</div> : "-"}
              </Alan>
              <Alan ad="Şehir" bekliyor={dy}>{dt?.sehir || "-"}</Alan>
              <Alan ad="Danışman">{kisiAdi(dt?.ownerId ?? l.ownerId)}</Alan>
              <Alan ad="Form tarihi" bekliyor={dy}>{dt?.olusturma ? tarih(dt.olusturma, true) : "-"}</Alan>
              <Alan ad="Campaign Name">{kampanya || "-"}</Alan>
              <Alan ad="Data Kaynağı">{kaynakAdi(kaynak)}{VIP_KAYNAKLAR.includes(kaynak) && <span style={s.etiketSari}>VIP</span>}</Alan>
              <Alan ad="Aşama">{ASAMA_ADLARI[l.asama] || "-"}{l.zorunlu && <span style={s.etiketKirmizi}>Task zorunlu</span>}</Alan>
            </div>
            <div style={s.altBilgi}>
              <span>Son aktivite: <b style={{ color: "#0f172a" }}>{l.sonAktivite ? `${tarih(l.sonAktivite)} · ${gunOnce(l.sonAktivite)} gün önce` : "hiç yok"}</b></span>
              {gecikmis && l.sonrakiTask && <span style={{ color: "#b45309" }}>Task tarihi: <b>{tarih(l.sonrakiTask)} · {gunOnce(l.sonrakiTask)} gün gecikti</b></span>}
            </div>
          </section>

          <section style={s.notKutusu}>
            <div style={s.yazma}>
              <div style={s.bolumBaslik}>Yeni not</div>
              <textarea ref={alan} value={metin} disabled={kaydediliyor || basari}
                onChange={e => setTaslak(t => ({ ...t, [l.id]: e.target.value.slice(0, 3000) }))}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (ileriAcik) kaydet(); } }}
                placeholder={notVar ? "İstersen bir not daha ekle..." : "Bu Data için ne yaptın? Notunu yaz..."} aria-label="Yeni not"
                style={{ ...s.alan, borderColor: metinYeterli ? "#7c3aed" : "#e2e8f0" }} />
              {hata && <div style={s.hata}>{hata}</div>}
              <div className="elal-izgara" style={s.altSatir}>
                <button type="button" onClick={() => setSira(sira - 1)} disabled={sira === 0 || kaydediliyor} style={{ ...s.geri, opacity: sira === 0 ? 0.35 : 1, justifySelf: "start" }}>‹ Önceki</button>
                <span style={{ fontSize: "11px", color: "#94a3b8", gridColumn: 3, justifySelf: "end", whiteSpace: "nowrap" }}>{notVar && !metinYeterli ? "" : "⌘/Ctrl + Enter"}</span>
                <button type="button" onClick={kaydet} disabled={!ileriAcik} className={ileriAcik ? "elal-ileri-acik" : undefined}
                  style={{ ...s.ileri, ...(ileriAcik ? {} : s.ileriKapali), ...(basari ? s.ileriBasari : {}) }}
                  title={ileriAcik ? undefined : "Sonrakine geçmek için not yaz"}>
                  {basari ? "✓ Kaydedildi" : kaydediliyor ? "Kaydediliyor..." : notVar && !metinYeterli ? (sira + 1 >= toplam ? "Bitir" : "Sonrakine Geç") : sira + 1 >= toplam ? "Kaydet ve Bitir" : "Kaydet ve Sonrakine Geç"}
                </button>
              </div>
            </div>

            <div style={{ ...s.bolumBaslik, padding: "14px 24px 0" }}>Önceki notlar{n?.toplam ? ` (${n.toplam})` : ""}</div>
            <div style={s.notListe}>
              {n?.yukleniyor && <div style={s.bilgiMetni}><span className="elal-spin" /> Notlar alınıyor...</div>}
              {n?.hata && <div style={{ ...s.bilgiMetni, color: "#991b1b" }}>{n.hata} <button type="button" onClick={() => notlariGetir(l)} style={s.metinDugme}>Tekrar dene</button></div>}
              {n?.notlar && n.notlar.length === 0 && <div style={s.bilgiMetni}>Bu Data'da henüz not yok. İlk notu sen yaz.</div>}
              {n?.notlar?.map((x, i) => (
                <div key={i} className={x.yeni ? "elal-yeni-not" : undefined} style={{ ...s.not, ...(x.yeni ? s.notYeni : {}) }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{tarih(x.tarih, true)}{x.yazan ? ` · ${x.yazan}` : ""}{x.portal ? " · Portal" : ""}</div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#0f172a", fontSize: "13px", lineHeight: 1.55 }}>{x.metin || <span style={{ color: "#cbd5e1" }}>Boş not</span>}</div>
                </div>
              ))}
              {n?.toplam > (n?.notlar?.length || 0) && <div style={{ fontSize: "11px", color: "#94a3b8" }}>Son {n.notlar.length} not gösteriliyor, hepsi Kylas'ta.</div>}
            </div>
          </section>
        </main>
      )}

      {cikisSor && (
        <OnayPenceresi ikon="!" baslik="Kaydedilmemiş not var" onayMetni="Çık" vazgecMetni="Devam et"
          onOnay={() => onKapat(Object.keys(yazilan).map(Number))} onVazgec={() => setCikisSor(false)}>
          Yazdığın ama kaydetmediğin not silinecek. Kaydedilen notlar Kylas'ta kalır.
        </OnayPenceresi>
      )}
    </div>,
    document.body,
  );
}

function Alan({ ad, bekliyor, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{ad}</div>
      <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
        {bekliyor ? <span className="elal-iskelet" /> : children}
      </div>
    </div>
  );
}

const s = {
  zemin: { position: "fixed", inset: 0, zIndex: 9500, display: "flex", flexDirection: "column", fontFamily: "'Sora', sans-serif",
    background: "radial-gradient(1200px 600px at 10% -10%, #ecfeff 0%, transparent 60%), radial-gradient(900px 500px at 110% 0%, #f5f3ff 0%, transparent 55%), #f8fafc",
    animation: "elalGir 0.22s ease-out" },
  ust: { position: "relative", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", columnGap: "24px", alignItems: "center", padding: "14px calc(max(24px, (100% - 1040px) / 2) + 25.5px) 18px", background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(8px)", borderBottom: "1px solid #e2e8f0", flexShrink: 0 },
  logo: { width: "38px", height: "38px", borderRadius: "12px", background: "linear-gradient(135deg, #0891b2, #7c3aed 60%, #db2777)",
    display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(124,58,237,0.35)", flexShrink: 0 },
  sagBlok: { gridColumn: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", minWidth: 0 },
  sayac: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  kapat: { width: "38px", height: "38px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
    fontSize: "15px", cursor: "pointer", flexShrink: 0 },
  cubukZemin: { position: "absolute", left: 0, right: 0, bottom: 0, height: "4px", background: "#e2e8f0" },
  govde: { flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px",
    padding: "24px max(24px, calc((100% - 1040px) / 2)) 32px", width: "100%", boxSizing: "border-box" },
  kart: { flexShrink: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "22px 24px",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)" },
  baslikSatir: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", columnGap: "24px", alignItems: "center", marginBottom: "20px" },
  ad: { margin: 0, fontSize: "24px", fontWeight: 600, color: "#0f172a", lineHeight: 1.25, wordBreak: "break-word" },
  idNo: { marginLeft: "6px", color: "#64748b", fontWeight: 500 },
  kylas: { gridColumn: 4, justifySelf: "start", padding: "6px 12px", borderRadius: "999px", border: "1.5px solid #a5f3fc", background: "#ecfeff", fontSize: "12px",
    fontWeight: 700, color: "#0891b2", textDecoration: "none" },
  alanlar: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "20px 24px" },
  liste: { display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" },
  iletisim: { display: "inline-flex", alignItems: "center", gap: "8px", color: "#2563eb", textDecoration: "none", fontWeight: 600 },
  ikonYesil: { width: "22px", height: "22px", borderRadius: "7px", background: "#dcfce7", color: "#16a34a", display: "inline-flex",
    alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 },
  ikonMavi: { width: "22px", height: "22px", borderRadius: "7px", background: "#dbeafe", color: "#2563eb", display: "inline-flex",
    alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0 },
  altBilgi: { display: "flex", gap: "8px 24px", flexWrap: "wrap", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #f1f5f9",
    fontSize: "12px", color: "#64748b" },
  etiketKirmizi: { marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", fontSize: "10px", fontWeight: 700 },
  etiketSari: { marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 },
  eklendi: { flexShrink: 0, padding: "4px 10px", borderRadius: "999px", background: "#f0fdf4", border: "1.5px solid #86efac", color: "#166534", fontSize: "11px", fontWeight: 700 },
  notKutusu: { flexShrink: 0, display: "flex", flexDirection: "column", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)", overflow: "hidden" },
  bolumBaslik: { fontSize: "12px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" },
  notListe: { padding: "4px 24px 20px", display: "flex", flexDirection: "column", gap: "10px" },
  not: { padding: "10px 12px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #f1f5f9" },
  notYeni: { background: "#f5f3ff", border: "1px solid #ddd6fe" },
  bilgiMetni: { display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "13px" },
  metinDugme: { border: "none", background: "none", color: "#0891b2", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" },
  yazma: { borderBottom: "1px solid #f1f5f9", padding: "18px 24px", background: "#fcfcff" },
  alan: { width: "100%", minHeight: "110px", resize: "vertical", padding: "12px 14px", borderRadius: "14px", border: "1.5px solid", outline: "none",
    fontFamily: "'Sora', sans-serif", fontSize: "14px", lineHeight: 1.5, color: "#0f172a", boxSizing: "border-box", background: "#fff", transition: "border-color 0.15s" },
  hata: { marginTop: "8px", padding: "8px 12px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "12px" },
  altSatir: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", columnGap: "24px", alignItems: "center", marginTop: "12px" },
  geri: { padding: "9px 16px", borderRadius: "999px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px",
    fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  ileri: { gridColumn: 4, width: "100%", padding: "10px 16px", whiteSpace: "nowrap", borderRadius: "999px", border: "none", color: "#fff", fontSize: "13px", fontWeight: 800, cursor: "pointer",
    fontFamily: "'Sora', sans-serif", background: "linear-gradient(135deg, #0891b2, #7c3aed)", boxShadow: "0 6px 18px rgba(124,58,237,0.35)", transition: "all 0.2s" },
  ileriKapali: { background: "#e2e8f0", color: "#94a3b8", boxShadow: "none", cursor: "not-allowed" },
  ileriBasari: { background: "linear-gradient(135deg, #16a34a, #059669)", boxShadow: "0 6px 18px rgba(22,163,74,0.35)" },
  bitti: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" },
};

const EKRAN_CSS = `
@keyframes elalGir { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: none; } }
@keyframes elalKart { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes elalAkis { to { background-position: 200% 0; } }
@keyframes elalDon { to { transform: rotate(360deg); } }
@keyframes elalYeni { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes elalPatla { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
@keyframes elalHale { 0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.35); } 50% { box-shadow: 0 0 0 10px rgba(124,58,237,0); } }
.elal-govde { animation: elalKart 0.28s ease-out; }
.elal-cubuk { height: 100%; border-radius: 0 4px 4px 0; transition: width 0.4s ease;
  background: linear-gradient(90deg, #0891b2, #7c3aed, #db2777, #0891b2); background-size: 200% 100%; animation: elalAkis 2.4s linear infinite; }
.elal-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #7c3aed; display: inline-block; animation: elalDon 0.8s linear infinite; }
.elal-yeni-not { animation: elalYeni 0.3s ease-out; }
.elal-ileri-acik { animation: elalHale 1.8s ease-in-out infinite; }
.elal-bitti-ikon { width: 88px; height: 88px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 42px; font-weight: 800;
  color: #fff; background: linear-gradient(135deg, #0891b2, #7c3aed 55%, #db2777); box-shadow: 0 16px 40px rgba(124,58,237,0.35); animation: elalPatla 0.5s ease-out; }
@keyframes elalIskelet { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.elal-iskelet { display: inline-block; width: 70%; height: 14px; border-radius: 6px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%; animation: elalIskelet 1.2s linear infinite; }
@media (max-width: 820px) { .elal-alanlar { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } .elal-govde { padding: 16px !important; } .elal-ust { padding-left: 41.5px !important; padding-right: 41.5px !important; display: flex !important; gap: 12px; }
  .elal-sag { margin-left: auto; } .elal-izgara { display: flex !important; flex-wrap: wrap; gap: 10px; } .elal-izgara > :last-child { margin-left: auto; width: auto !important; } }
@media (max-width: 480px) { .elal-alanlar { grid-template-columns: 1fr !important; } }
@media (prefers-reduced-motion: reduce) { .elal-govde, .elal-cubuk, .elal-iskelet, .elal-yeni-not, .elal-ileri-acik, .elal-bitti-ikon { animation: none !important; } }
`;

// Düğme: akan renk geçişi + üzerinden geçen parıltı; sayı rozeti beyaz
const DUGME_CSS = `
.elal-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 8px 0 14px;
  border: none; border-radius: 12px; color: #fff; font-family: 'Sora', sans-serif; font-size: 12.5px; font-weight: 800; letter-spacing: 0.2px; cursor: pointer;
  background: linear-gradient(120deg, #0891b2, #7c3aed, #db2777, #7c3aed, #0891b2); background-size: 300% 100%;
  animation: elalBtnAkis 6s ease-in-out infinite; box-shadow: 0 6px 18px rgba(124,58,237,0.32); transition: transform 0.15s, box-shadow 0.15s; }
.elal-btn::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent); transform: skewX(-20deg); animation: elalBtnParilti 3.2s ease-in-out infinite; }
.elal-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(124,58,237,0.42); }
.elal-btn:active:not(:disabled) { transform: translateY(0); }
.elal-btn:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; cursor: not-allowed; animation: none; }
.elal-btn:disabled::after { display: none; }
.elal-btn:focus-visible { outline: 3px solid #c4b5fd; outline-offset: 2px; }
.elal-sayi { min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: rgba(255,255,255,0.95); color: #6d28d9;
  font-size: 11px; display: inline-flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; }
.elal-btn:disabled .elal-sayi { background: #f1f5f9; color: #94a3b8; }
@keyframes elalBtnAkis { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes elalBtnParilti { 0%, 55% { left: -60%; } 100% { left: 130%; } }
@media (prefers-reduced-motion: reduce) { .elal-btn, .elal-btn::after { animation: none; } }
`;
