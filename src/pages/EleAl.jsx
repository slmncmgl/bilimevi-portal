// v2.24: KAPANISLAR dışa açıldı (AI Önerileri Close Lead penceresi kullanıyor)
// v2.23: Close Lead → İlgisiz / Olumsuza Dönen seçilince pencerede aşamalar yok; sadece o kapanışın sebepleri alt alta (Kylas sırası, radyo)
// v2.22: aşama çubuğu ve Close Lead, CRM'de Göster ile aynı camgöbeği; seçili olmayan aşamalar gri (Kylas gibi)
// v2.21: task penceresinde Tür seçimi kalktı, her task Follow Up açılır
// v2.20: aşama çubuğunun iki ucu oval; Close Lead dolu mavi, ayrık oklu düğme
// v2.19: not bölümünün üstünde Kylas tarzı aşama çubuğu (tıkla → taşı) + Close Lead menüsü (İlgisiz / Olumsuza Dönen → sebep penceresi); kartta Değiştir kalktı
// v2.18: Aşama "Değiştir": açık aşamalar arası geçiş ya da İlgisiz / Olumsuza Dönen + sebep (crm-rapor asamaDegistir); kapanan data işaretli kalır
// v2.17: Kylas Message alanı Data bilgilerinden çıktı; Önceki notların en altında "Form mesajı" olarak (form tarihiyle, sarı zemin)
// v2.16: iletişim kartında Kylas Data Information alanları (8 alan, küçük punto); kart iç boşlukları sıkılaştı
// v2.15: pomodoro bitince şerit "Mola ver"e tıklanana kadar yeşil yanar
// v2.14: pomodoro şeridin ortasında, büyük ikon + altında "Pomodoro"
// v2.13: üst şeritte basit pomodoro (5-25 dk, tek tur); bitince şerit 3 sn yeşil yanar
// v2.12: sayaçtaki toplam (örn. / 181) tıklanınca 20'şerli isim listesi açılır, sayfalar arasında geçilir; isme tıklayınca o dataya gidilir
// v2.11: task kartı sade: Kylas'ın otomatik adı ("Task due at ... for ...") ve atanan danışman gizli, gün sayısı yok; tarih geçtiyse kırmızı,
//       gelmediyse mavi; tür (Follow Up vb.) adın üstünde küçük; "Tamamla"; Task oluştur düğmesi tam genişlik
// v2.10: "Campaign Name" alanı "Reklam Adı"
// v2.9: numaranın yanında Kylas arama ikonu (mobil bildirim) ve WhatsApp butonu (wa.me: telefonda uygulama, bilgisayarda Web)
// v2.8: arama sonucu, bildirimin gittiği Kylas hesabını ve Kylas yanıt kodunu gösterir; süre 6 sn -> 12 sn
// v2.7: numaraya tıklayınca tıklayan danışmanın Kylas mobil uygulamasına arama bildirimi gider (islem "aramaBaslat").
//       Sonuç numaranın yanında görünür; Kylas bağlantısı yoksa "CRM'de aç" seçeneği çıkar.
// v2.6: "Tamamla + Yeni" task satırlarından kalktı; Yeni task penceresinde, datanın açık task'ı varsa
//       "Eskiyi Tamamla ve Yenisini Oluştur" (birden fazla açık task'ta hangisinin tamamlanacağı seçilir).
// v2.5: Task'lar kartının yüksekliği her zaman Yeni not kadar (task'lar taşarsa kart içinde kayar);
//       Önceki notlar altta, üstteki iki kartın toplam genişliğinde.
// v2.4: "Yeni not" (3/4) ve "Task'lar" (1/4) aynı satırda; "Önceki notlar" sol sütunda Yeni not'un hemen altında. Dar task sütununda
//       task satırları alt alta (tür + ad, tarih, düğmeler). Telefon genişliğinde ikisi alt alta.
// v2.3: alt yazıda açılan listenin adı (listeAdi: Açık / Task beklenen / İleri / Gecikmiş / Takipsiz Datalar); task tarihi varsa
//       her listede gösterilir (gecikti / kaldı).
// v2.2: "Kylas'ta aç" -> "CRM'de Göster". Telefon arama bağlantısı değil: tıklanınca datanın Kylas sayfası açılır,
//       üzerine gelince "telefon uygulamasına göndermek için CRM'deki butona tıklayın" ipucu çıkar.
// v2.1: üst şerit, düğmedeki renklerin pastel ve hafif şeffaf geçişi (turkuaz, mor, pembe)
// v2.0: düğme yazısı "Dataları Ele Al"
// v1.9: sayacın iki yanında ‹ önceki ve › atla: › not girmeden sonrakine geçer, data "atlandı" sayılır. Bitiş ekranında
//       "Atlananları ele al (N)" atlananları yeni bir turda sırayla açar. Not girilen data atlananlardan çıkar.
// v1.8: task penceresi animasyonsuz açılır. Sağ sütun 120 px (Task oluştur düğmesi kadar): üst şerit ve tüm kartlar aynı sağ
//       çizgide biter; ✕, Task oluştur ve Kaydet ve Sonrakine Geç bu çizgide. İçerik en fazla 931 px (eskiden 1040).
// v1.7: ✕ sayacın hemen yanında; "Task oluştur" sağ sütunda (Kylas'ta aç ile aynı çizgi). Task oluşturma açılır pencerede
//       (düğmeden sola doğru açılır, arka plan bulanık), "Task oluştur" ile hemen Kylas'a yazılır. "Tamamla + Yeni" aynı pencereyi
//       dolu açar. Not kutusunun altındaki task formu kalktı; sonrakine geçmek için not yine zorunlu.
// v1.6: Task'lar: bilgi kartının altında datanın task'ları (açıklar önce, gecikmiş kırmızı), "Tamamlandı" ve "Tamamla + yeni"
//       düğmeleri. Not kutusunun altında isteğe bağlı "Task da oluştur" (ad, tür, tarih, saat): not ile birlikte kaydedilir,
//       datanın danışmanına atanır. Not yine zorunlu. Task değiştiyse kapanınca Takip Tablosu sessizce yenilenir.
// v1.5: üst başlık "Toplu Data Follow Up"
// v1.4: kaydırma tüm ekranda, üst şerit yapışkan: kaydırma çubuğu üst şerit ve kartları aynı kaydırır, ✕ ile ileri düğmesi aynı çizgide
// v1.3: sayaç, "Kylas'ta aç" ve ileri düğmesi Danışman sütununun başladığı yerde (4 sütunlu ortak ızgara).
//       İleri düğmesi her durumda "Kaydet ve Sonrakine Geç" (son datada "Kaydet ve Bitir").
// v1.2: üst şerit kartla hizalı: sol kenar Telefon sütununda, sağ kenar Danışman sütununun bittiği yerde
// v1.1: Kylas kaydı gibi düzen: ortada "Ad (#ID)" başlığı ve iki sıra bilgi (telefon, e-posta, şehir, danışman, form tarihi,
//       Campaign Name, Data Kaynağı, aşama), altında not kutusu ve önceki notlar. Telefon ve e-posta islem "detay" ile alınır.
// v1.0: "Bu dataları ele al" (Takip Tablosu). Listedeki datalar tam ekranda tek tek açılır, üstte sıra (3 / 30).
// Her datada bilgiler ve son 10 not görünür; not yazılmadan sonrakine geçilmez. Not Kylas'a kaydedilir (islem "notEkle"),
// başına sunucu "[Yazan · Portal]" ekler. Önceki datalara dönülebilir. Kapatınca not girilen datalar üst bileşene bildirilir.
// EleAlDugmesi: liste başlığındaki parlayan düğme.
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { apiCagir, tarih, KYLAS_LEAD_URL, KAYNAKLAR } from "./CrmRaporu";
import { VIP_KAYNAKLAR } from "./KaynakSecici";
import OnayPenceresi from "./OnayPenceresi";
import Ipucu from "./Ipucu";
import Pomodoro from "./Pomodoro";

const ASAMA_ADLARI = { 217285: "Yeni", 222366: "Na1", 253357: "Na2", 253358: "Na3", 218701: "Görüşme", 218702: "İlgili", 217287: "İlgisiz", 217288: "Olumsuza Dönen" };
// Aşama penceresi: açık aşamalar arası geçiş ve kapatma sebepleri (crm-rapor asamaDegistir ile aynı liste)
const ACIK_HEDEFLER = [222366, 253357, 253358, 218701, 218702];
export const KAPANISLAR = [
  { id: 217287, ad: "İlgisiz", alt: "Reasons for Unqualification", renk: "#b45309", zemin: "#fffbeb", cerceve: "#fde68a",
    sebepler: ["Olumsuz Profil", "Cevap Vermiyor", "Artık İlgilenmiyor", "Bütçesi Yok", "Yanlış Form", "Hatalı Telefon Numarası", "Başka Acenteyle Kaydolmuş", "Talep Edilen Program / Destinasyon Sunulmuyor", "Aynı Data Mevcut"] },
  { id: 217288, ad: "Olumsuza Dönen", alt: "Reasons for Closed Lost", renk: "#b91c1c", zemin: "#fef2f2", cerceve: "#fecaca",
    sebepler: ["Planlarını İptal Etmiş", "Ulaşılamıyor", "Bütçe Ayarlayamadı", "Başka Acenteyle Kaydolmuş"] },
];
const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const gunOnce = v => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null);
const ENAZ = 2; // not en az bu kadar karakter
// Kylas'ın otomatik task adı ("Task due at Sep 22, 2026 for Nil Ozer") bilgi taşımaz, gösterilmez
const gorunenAd = t => (/^task due at .* for /i.test(t.ad || "") ? "" : t.ad || "");

const LISTE_SAYFA = 20;

// Ortak 4 sütun: ilk üçü esnek, sağdaki sütun Task oluştur düğmesi kadar. Üst şerit ve kartlar bu ızgarayla hizalanır.
const SAG_SUTUN = 120;
const SUTUNLAR = `repeat(3, minmax(0, 1fr)) ${SAG_SUTUN}px`;
const ICERIK = 931; // en geniş içerik (kart dış kenarları): 3 x 229 + 120 + aralıklar + kart iç boşluğu
const TASK_TURLERI = [[2614523, "Follow Up"], [2614522, "Call"], [2614524, "Reminder"], [2614525, "Todo"]];
const ikiHane = n => String(n).padStart(2, "0");
const yerelGun = d => `${d.getFullYear()}-${ikiHane(d.getMonth() + 1)}-${ikiHane(d.getDate())}`;
const gunSonra = n => { const d = new Date(); d.setDate(d.getDate() + n); return yerelGun(d); };
const bosForm = (ad = "", tur = 2614523) => ({ ad, tur, tarih: gunSonra(1), saat: "10:00" });

export function EleAlDugmesi({ sayi, onClick, disabled }) {
  return (
    <button type="button" className="elal-btn" onClick={onClick} disabled={disabled || !sayi}
      title={sayi ? `${sayi} Datayı sırayla aç, her birine not gir` : "Listede Data yok"}>
      <style>{DUGME_CSS}</style>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
      <span>Dataları Ele Al</span>
      <b className="elal-sayi">{sayi}</b>
    </button>
  );
}

export const ELEAL_SURUM = "v2.24"; // 1. satırdaki sürümle aynı tut (Takip Tablosu etiketinde görünür)

export default function EleAl({ leadler: ilkListe, kisiAdi, listeAdi = "Takipsiz Datalar", onKapat }) {
  const [pomYesil, setPomYesil] = useState(false);
  const [leadler, setLeadler] = useState(ilkListe); // bu turda ele alınan datalar (atlananlar turunda sadece onlar)
  const [tur, setTur] = useState(1);
  const [atlanan, setAtlanan] = useState({}); // id -> true (not girmeden geçilen)
  const [sira, setSira] = useState(0);
  const [liste, setListe] = useState(null); // null kapalı, sayı = listede açık sayfa (0 tabanlı)
  const siraRef = useRef(0);
  siraRef.current = sira;
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
  const [tasklar, setTasklar] = useState({}); // id -> { yukleniyor } | { tasklar, toplam } | { hata }
  const taskIstenen = useRef(new Set());
  const [pencere, setPencere] = useState(null); // açık task penceresi: { leadId, ownerId, rect, ilk }
  const [taskIslem, setTaskIslem] = useState({}); // task id -> "calisiyor" | hata metni
  const [arama, setArama] = useState(null); // { leadId, telefon, durum: "gidiyor"|"tamam"|"hata", mesaj, baglantiYok }
  const aramaZaman = useRef(null);
  async function aramaGonder(leadId, telefon) {
    if (arama?.durum === "gidiyor") return;
    clearTimeout(aramaZaman.current);
    setArama({ leadId, telefon, durum: "gidiyor" });
    try {
      const d = await apiCagir({ islem: "aramaBaslat", leadId, telefon });
      setArama({ leadId, telefon, durum: "tamam", mesaj: `${d.kime || "Hesabın"} (Kylas ${d.kylasId ?? "?"}) telefonuna gönderildi · Kylas ${d.kylasDurum ?? ""}` });
    } catch (e) {
      setArama({ leadId, telefon, durum: "hata", mesaj: e.message, baglantiYok: /bağlantın yok/i.test(e.message) });
    }
    aramaZaman.current = setTimeout(() => setArama(a => (a?.telefon === telefon ? null : a)), 12000);
  }
  const taskDegisti = useRef(false);
  const [asamaPencere, setAsamaPencere] = useState(null); // açık aşama penceresinin lead'i (+ ilkHedef)
  const asamaUygula = (id, asama, sebep) => {
    taskDegisti.current = true; // Takip Tablosu kapanınca yenilensin
    setLeadler(ls => ls.map(x => (x.id === id ? { ...x, asama, sebep: sebep || null, kapandi: !ACIK_HEDEFLER.includes(asama), zorunlu: x.zorunlu && ACIK_HEDEFLER.includes(asama) } : x)));
  };

  const toplam = leadler.length;
  const l = leadler[sira];
  const metin = taslak[l?.id] || "";
  const notVar = !!yazilan[l?.id];
  const girilen = Object.keys(yazilan).length;
  const atlananSayi = Object.keys(atlanan).filter(id => !yazilan[id]).length;
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
  function tasklariGetir(lead, zorla = false) {
    if (!lead || (!zorla && taskIstenen.current.has(lead.id))) return;
    taskIstenen.current.add(lead.id);
    setTasklar(s => ({ ...s, [lead.id]: { yukleniyor: true } }));
    apiCagir({ islem: "tasklar", leadId: lead.id })
      .then(d => setTasklar(s => ({ ...s, [lead.id]: d })))
      .catch(e => { taskIstenen.current.delete(lead.id); setTasklar(s => ({ ...s, [lead.id]: { hata: e.message } })); });
  }
  // Açık datanın ve bir sonrakinin bilgileri, task'ları ve notları önceden alınır
  useEffect(() => {
    [leadler[sira], leadler[sira + 1]].forEach(x => { detayGetir(x); tasklariGetir(x); notlariGetir(x); });
    setHata(null); alan.current?.focus({ preventScroll: true });
  }, [sira, tur]);

  // Sayfa kaymasın; Esc ile çıkış (kaydedilmemiş not varsa sorar)
  useEffect(() => {
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = eski; };
  }, []);
  const kapatIste = () => { if (kaydedilmemis && !bitti) setCikisSor(true); else onKapat(Object.keys(yazilan).map(Number), taskDegisti.current); };
  useEffect(() => {
    const tus = e => { if (e.key === "Escape" && liste !== null) { setListe(null); return; }
      if (e.key === "Escape" && !cikisSor && !pencere && !asamaPencere) kapatIste(); };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  });

  function ilerle() {
    if (sira + 1 >= toplam) setBitti(true);
    else setSira(sira + 1);
  }
  // Not girmeden sonrakine geç: data sonra ele alınmak üzere atlananlara yazılır
  function atla() {
    if (kaydediliyor || basari || bitti) return;
    if (!yazilan[l.id]) setAtlanan(s => ({ ...s, [l.id]: true }));
    ilerle();
  }
  function geri() {
    if (kaydediliyor || basari) return;
    if (bitti) { setBitti(false); return; }
    if (sira > 0) setSira(sira - 1);
  }
  // Atlananlar için yeni tur
  function atlananlariAc() {
    const yeni = ilkListe.filter(x => atlanan[x.id] && !yazilan[x.id]);
    if (!yeni.length) return;
    setLeadler(yeni);
    setAtlanan({});
    setSira(0);
    setBitti(false);
    setTur(t => t + 1);
  }

  // Task listesinde bir satırı günceller ya da başa ekler
  function taskGuncelle(leadId, task, basa = false) {
    setTasklar(s => {
      const eski = s[leadId]?.tasklar ? s[leadId] : { tasklar: [], toplam: 0 };
      const liste = basa ? [task, ...eski.tasklar] : eski.tasklar.map(t => (t.id === task.id ? task : t));
      return { ...s, [leadId]: { tasklar: liste, toplam: (eski.toplam || 0) + (basa ? 1 : 0) } };
    });
    taskDegisti.current = true;
  }

  // Task penceresini tıklanan düğmenin yanında açar
  function pencereAc(dugme, ilk = null) {
    const r = dugme.getBoundingClientRect();
    setPencere({ leadId: l.id, ownerId: dt?.ownerId ?? l.ownerId, rect: { sol: r.left, sag: r.right, ust: r.top, alt: r.bottom }, ilk });
  }
  async function taskOlustur(f) {
    const leadId = pencere.leadId;
    const d = await apiCagir({ islem: "taskEkle", leadId, ad: f.ad.trim(), tur: Number(f.tur), tarih: new Date(`${f.tarih}T${f.saat || "10:00"}`).toISOString() });
    taskGuncelle(leadId, { ...d.task, yeni: true }, true);
    setPencere(null);
  }

  // Penceredeki "Eskiyi Tamamla ve Yenisini Oluştur": önce seçilen açık task tamamlanır, sonra yeni task açılır
  async function eskiyiTamamlaYeniOlustur(f, eskiId) {
    const leadId = pencere.leadId;
    const eski = (tasklar[leadId]?.tasklar || []).find(t => t.id === eskiId);
    const d = await apiCagir({ islem: "taskTamamla", taskId: eskiId });
    if (eski) taskGuncelle(leadId, { ...eski, ...d.task }); else taskDegisti.current = true;
    try { await taskOlustur(f); }
    catch (e) { throw new Error(`Eski task tamamlandı ama yenisi açılamadı: ${e.message}`); }
  }

  async function tamamla(task) {
    if (taskIslem[task.id] === "calisiyor") return;
    const leadId = l.id;
    setTaskIslem(s => ({ ...s, [task.id]: "calisiyor" }));
    try {
      const d = await apiCagir({ islem: "taskTamamla", taskId: task.id });
      taskGuncelle(leadId, { ...task, ...d.task });
      setTaskIslem(s => { const k = { ...s }; delete k[task.id]; return k; });
    } catch (e) {
      setTaskIslem(s => ({ ...s, [task.id]: e.message }));
    }
  }

  async function kaydet() {
    const m = metin.trim();
    if (kaydediliyor) return;
    if (m.length < ENAZ) { if (notVar) ilerle(); return; }
    setKaydediliyor(true);
    setHata(null);
    const leadId = l.id;
    try {
      const d = await apiCagir({ islem: "notEkle", leadId, metin: m });
      setYazilan(s => ({ ...s, [leadId]: (s[leadId] || 0) + 1 }));
      setAtlanan(s => { if (!s[leadId]) return s; const k = { ...s }; delete k[leadId]; return k; });
      setTaslak(s => ({ ...s, [leadId]: "" }));
      setNotlar(s => {
        const eski = s[leadId]?.notlar ? s[leadId] : { notlar: [], toplam: 0 };
        return { ...s, [leadId]: { notlar: [{ tarih: d.tarih, yazan: "Sen", metin: m, portal: true, yeni: true }, ...eski.notlar], toplam: (eski.toplam || 0) + 1 } };
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
  const tk = l ? tasklar[l.id] : null;
  const acikTasklar = tk?.tasklar?.filter(t => t.durum === "acik" || t.durum === "surecte") || [];
  const kapaliTasklar = tk?.tasklar?.filter(t => t.durum !== "acik" && t.durum !== "surecte") || [];

  return createPortal(
    <div style={s.zemin} role="dialog" aria-modal="true" aria-label="Toplu Data Follow Up">
      <style>{EKRAN_CSS}</style>
      <header className={`elal-ust${pomYesil ? " elal-pom-bitti" : ""}`} style={s.ust}>
        <div style={{ gridColumn: "1 / 3", display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <span style={s.logo}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="#fff" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>Toplu Data Follow Up</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{listeAdi} · {girilen} Data'ya not girildi{atlananSayi ? ` · ${atlananSayi} atlandı` : ""}{tur > 1 ? ` · Atlananlar, ${tur}. tur` : ""}</div>
          </div>
        </div>
        <div className="elal-pom" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 4 }}>
          <Pomodoro onBitti={() => setPomYesil(true)} onMolaBitti={() => setPomYesil(false)} />
        </div>
        <div className="elal-sag" style={s.sagBlok}>
          <button type="button" onClick={geri} disabled={(sira === 0 && !bitti) || kaydediliyor} style={{ ...s.ok, opacity: sira === 0 && !bitti ? 0.35 : 1 }}
            aria-label="Önceki Data" title="Önceki Data">‹</button>
          <div style={s.sayac} aria-live="polite">
            <span style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{bitti ? toplam : sira + 1}</span>
            <button type="button" onClick={() => setListe(liste === null ? Math.floor(sira / LISTE_SAYFA) : null)} disabled={kaydediliyor}
              style={s.toplamDugme} aria-haspopup="dialog" aria-expanded={liste !== null} title="Listeyi aç">/ {toplam}</button>
            {liste !== null && (() => {
              const sayfaSayisi = Math.ceil(toplam / LISTE_SAYFA);
              const bas = liste * LISTE_SAYFA;
              return (
                <>
                  <div onClick={() => setListe(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div role="dialog" aria-label="Data listesi" style={s.listePanel}>
                    {leadler.slice(bas, bas + LISTE_SAYFA).map((x, i) => {
                      const no = bas + i;
                      return (
                        <button key={x.id} type="button" onClick={() => { setSira(no); setBitti(false); setListe(null); }}
                          style={{ ...s.listeSatir, ...(no === sira && !bitti ? s.listeSatirAktif : {}) }}>
                          <span style={{ color: "#94a3b8", minWidth: "34px", textAlign: "right" }}>{no + 1}.</span>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.ad || "İsimsiz"}</span>
                          {yazilan[x.id] ? <span style={{ color: "#16a34a" }}>✓</span> : atlanan[x.id] ? <span style={{ color: "#94a3b8", fontSize: "11px" }}>atlandı</span> : null}
                        </button>
                      );
                    })}
                    {sayfaSayisi > 1 && (
                      <div style={s.listeAlt}>
                        <button type="button" onClick={() => setListe(liste - 1)} disabled={liste === 0} style={{ ...s.ok, opacity: liste === 0 ? 0.35 : 1 }} aria-label="Önceki 20">‹</button>
                        <span>{bas + 1}-{Math.min(bas + LISTE_SAYFA, toplam)} / {toplam}</span>
                        <button type="button" onClick={() => setListe(liste + 1)} disabled={liste >= sayfaSayisi - 1} style={{ ...s.ok, opacity: liste >= sayfaSayisi - 1 ? 0.35 : 1 }} aria-label="Sonraki 20">›</button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
          <button type="button" onClick={atla} disabled={bitti || kaydediliyor || basari} style={{ ...s.ok, ...s.okAtla, opacity: bitti ? 0.35 : 1 }}
            aria-label="Atla, sonra ele al" title="Not girmeden sonrakine geç (sonra ele almak için atlananlara eklenir)">›</button>
          <button type="button" onClick={kapatIste} style={{ ...s.kapat, marginLeft: "6px" }} aria-label="Kapat">✕</button>
        </div>
        <div style={s.cubukZemin}><div className="elal-cubuk" style={{ width: `${ilerleme}%` }} /></div>
      </header>

      {bitti ? (
        <main style={s.bitti}>
          <div className="elal-bitti-ikon">✓</div>
          <h2 style={{ margin: "18px 0 6px", fontSize: "24px", color: "#0f172a" }}>{atlananSayi ? "Tur bitti" : "Hepsi ele alındı"}</h2>
          <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
            {ilkListe.length} Data'nın {girilen} tanesine not girildi.{atlananSayi ? ` ${atlananSayi} Data sonraya bırakıldı.` : " Notlar Kylas'a kaydedildi."}
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap", justifyContent: "center" }}>
            {atlananSayi > 0 && (
              <button type="button" onClick={atlananlariAc} style={{ ...s.ileri, gridColumn: "auto", width: "auto", padding: "10px 22px" }}>Atlananları ele al ({atlananSayi})</button>
            )}
            <button type="button" onClick={() => onKapat(Object.keys(yazilan).map(Number), taskDegisti.current)}
              style={atlananSayi ? { ...s.geri, padding: "10px 22px" } : { ...s.ileri, gridColumn: "auto", width: "auto", padding: "10px 22px" }}>Listeye dön</button>
          </div>
        </main>
      ) : (
        <main key={l.id} className="elal-govde" style={s.govde}>
          <section style={s.kart}>
            <div className="elal-izgara" style={s.baslikSatir}>
              <div style={{ gridColumn: "1 / 4", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", minWidth: 0 }}>
                <h2 style={s.ad}>{dt?.ad || l.ad || <span style={{ color: "#cbd5e1" }}>İsimsiz</span>}<span style={s.idNo}>(#{l.id})</span></h2>
                {notVar && <span style={s.eklendi}>✓ Not eklendi</span>}
              </div>
              <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={s.kylas}>CRM'de Göster ↗</a>
            </div>
            {dt?.hata && <div style={{ ...s.hata, marginTop: 0, marginBottom: "14px" }}>{dt.hata} <button type="button" onClick={() => detayGetir(l)} style={s.metinDugme}>Tekrar dene</button></div>}
            <div className="elal-alanlar" style={s.alanlar}>
              <Alan ad="Telefon" bekliyor={dy}>
                {dt?.telefonlar?.length ? <div style={s.liste}>{dt.telefonlar.map(t => {
                  const a = arama?.leadId === l.id && arama?.telefon === t ? arama : null;
                  return (
                    <div key={t} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>{t}</span>
                        <Ipucu metin="Telefondaki Kylas uygulamasında aramayı başlat" isaret={false}>
                          <button type="button" aria-label="Kylas ile ara" onClick={() => aramaGonder(l.id, t)} disabled={a?.durum === "gidiyor"} style={s.aramaIkon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                              <path d="M15 2a7 7 0 0 1 7 7" /><path d="M15 6a3 3 0 0 1 3 3" />
                            </svg>
                          </button>
                        </Ipucu>
                        <Ipucu metin="WhatsApp'ta aç (telefonda uygulama, bilgisayarda WhatsApp Web)" isaret={false}>
                          <a href={`https://wa.me/${t.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp'ta aç" style={s.wpDugme}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                              <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 9.43 9.44c0 5.2-4.24 9.43-9.44 9.43m8.02-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.71 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.6l6.01-1.58a11.3 11.3 0 0 0 5.43 1.38h.01c6.25 0 11.34-5.08 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02" />
                            </svg>
                          </a>
                        </Ipucu>
                      </div>
                      {a && (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: a.durum === "hata" ? "#b91c1c" : a.durum === "tamam" ? "#166534" : "#64748b" }}>
                          {a.durum === "gidiyor" ? "Telefona gönderiliyor..." : a.durum === "tamam" ? `✓ ${a.mesaj}` : a.mesaj}
                          {a.baglantiYok && <> · <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--marka)" }}>CRM'de aç ↗</a></>}
                        </span>
                      )}
                    </div>
                  );
                })}</div> : "-"}
              </Alan>
              <Alan ad="E-posta" bekliyor={dy}>
                {dt?.epostalar?.length ? <div style={s.liste}>{dt.epostalar.map(e => <a key={e} href={`mailto:${e}`} style={s.iletisim}><span style={s.ikonMavi}>@</span>{e}</a>)}</div> : "-"}
              </Alan>
              <Alan ad="Şehir" bekliyor={dy}>{dt?.sehir || "-"}</Alan>
              <Alan ad="Danışman">{kisiAdi(dt?.ownerId ?? l.ownerId)}</Alan>
              <Alan ad="Form tarihi" bekliyor={dy}>{dt?.olusturma ? tarih(dt.olusturma, true) : "-"}</Alan>
              <Alan ad="Reklam Adı">{kampanya || "-"}</Alan>
              <Alan ad="Data Kaynağı">{kaynakAdi(kaynak)}{VIP_KAYNAKLAR.includes(kaynak) && <span style={s.etiketSari}>VIP</span>}</Alan>
              <Alan ad="Aşama">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={l.kapandi ? { color: KAPANISLAR.find(k => k.id === l.asama)?.renk } : undefined}>{ASAMA_ADLARI[l.asama] || "-"}</span>
                  {l.sebep && <span style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>· {l.sebep}</span>}
                  {l.zorunlu && !l.kapandi && <span style={s.etiketKirmizi}>Task zorunlu</span>}
                </span>
              </Alan>
            </div>
            <div style={s.bilgiBaslik}>Data bilgileri</div>
            <div className="elal-alanlar" style={{ ...s.alanlar, gap: "10px 24px" }}>
              <Alan ad="English Level" bekliyor={dy} kucuk>{dt?.bilgi?.ingilizce || "-"}</Alan>
              <Alan ad="Country of Application" bekliyor={dy} kucuk>{dt?.bilgi?.ulke || "-"}</Alan>
              <Alan ad="School Name" bekliyor={dy} kucuk>{dt?.bilgi?.okul || "-"}</Alan>
              <Alan ad="Planned Application Time" bekliyor={dy} kucuk>{dt?.bilgi?.planlanan || "-"}</Alan>
              <Alan ad="Çocuğun Eğitim Aldığı Okul" bekliyor={dy} kucuk>{dt?.bilgi?.cocukOkul || "-"}</Alan>
              <Alan ad="Çocuk Kaçıncı Sınıfta" bekliyor={dy} kucuk>{dt?.bilgi?.sinif || "-"}</Alan>
              <Alan ad="İlk Form Tarihi" bekliyor={dy} kucuk>{dt?.bilgi?.ilkForm ? tarih(dt.bilgi.ilkForm) : "-"}</Alan>
            </div>
            <div style={s.altBilgi}>
              <span>Son aktivite: <b style={{ color: "#0f172a" }}>{l.sonAktivite ? `${tarih(l.sonAktivite)} · ${gunOnce(l.sonAktivite)} gün önce` : "hiç yok"}</b></span>
              {l.sonrakiTask && (new Date(l.sonrakiTask).getTime() < Date.now()
                ? <span style={{ color: "#b45309" }}>Task tarihi: <b>{tarih(l.sonrakiTask)} · {gunOnce(l.sonrakiTask) > 0 ? `${gunOnce(l.sonrakiTask)} gün gecikti` : "bugün, saati geçti"}</b></span>
                : <span style={{ color: "#166534" }}>Task tarihi: <b>{tarih(l.sonrakiTask)}</b></span>)}
            </div>
          </section>


          <AsamaCubugu lead={l} onKapat={k => setAsamaPencere({ ...l, ilkHedef: k })} onDegisti={asamaUygula} />

          <div className="elal-ikili" style={s.ikili}>
          <section style={s.notKutusu}>
            <div style={{ ...s.yazma, borderBottom: "none" }}>
              <div style={s.bolumBaslik}>Yeni not</div>
              <textarea ref={alan} value={metin} disabled={kaydediliyor || basari}
                onChange={e => setTaslak(t => ({ ...t, [l.id]: e.target.value.slice(0, 3000) }))}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (ileriAcik) kaydet(); } }}
                placeholder={notVar ? "İstersen bir not daha ekle..." : "Bu Data için ne yaptın? Notunu yaz..."} aria-label="Yeni not"
                style={{ ...s.alan, borderColor: metinYeterli ? "#7c3aed" : "#e2e8f0" }} />
              {hata && <div style={s.hata}>{hata}</div>}
              <div className="elal-izgara" style={s.altSatir}>
                <button type="button" onClick={() => setSira(sira - 1)} disabled={sira === 0 || kaydediliyor} style={{ ...s.geri, opacity: sira === 0 ? 0.35 : 1, justifySelf: "start" }}>‹ Önceki</button>
                <span style={{ fontSize: "11px", color: "#94a3b8", gridColumn: 2, justifySelf: "end", whiteSpace: "nowrap" }}>{notVar && !metinYeterli ? "" : "⌘/Ctrl + Enter"}</span>
                <button type="button" onClick={kaydet} disabled={!ileriAcik} className={ileriAcik ? "elal-ileri-acik" : undefined}
                  style={{ ...s.ileri, ...(ileriAcik ? {} : s.ileriKapali), ...(basari ? s.ileriBasari : {}) }}
                  title={ileriAcik ? undefined : "Sonrakine geçmek için not yaz"}>
                  {basari ? "✓ Kaydedildi" : kaydediliyor ? "Kaydediliyor..." : notVar && !metinYeterli ? (sira + 1 >= toplam ? "Bitir" : "Sonrakine Geç") : sira + 1 >= toplam ? "Kaydet ve Bitir" : "Kaydet ve Sonrakine Geç"}
                </button>
              </div>
            </div>
          </section>
          <div className="elal-task-hucre" style={s.taskHucre}>
          <section className="elal-task-kart" style={{ ...s.taskKart, ...s.taskKartSabit }}>
            <div className="elal-izgara" style={s.taskBaslik}>
              <span style={{ ...s.bolumBaslik, marginBottom: 0 }}>Task'lar{acikTasklar.length ? ` · ${acikTasklar.length} açık` : ""}</span>
              <button type="button" onClick={e => pencereAc(e.currentTarget)} style={{ ...s.taskEkleDugme, width: "100%" }} aria-haspopup="dialog">＋ Task oluştur</button>
            </div>
            {tk?.yukleniyor && <div style={s.bilgiMetni}><span className="elal-spin" /> Task'lar alınıyor...</div>}
            {tk?.hata && <div style={{ ...s.bilgiMetni, color: "#991b1b" }}>{tk.hata} <button type="button" onClick={() => tasklariGetir(l, true)} style={s.metinDugme}>Tekrar dene</button></div>}
            {tk?.tasklar && tk.tasklar.length === 0 && <div style={s.bilgiMetni}>Bu Data'da task yok.</div>}
            {[...acikTasklar, ...kapaliTasklar.slice(0, 3)].map(t => {
              const islem = taskIslem[t.id];
              const kapali = t.durum !== "acik" && t.durum !== "surecte";
              return (
                <div key={t.id} className={`elal-task${t.yeni ? " elal-yeni-not" : ""}`} style={{ ...s.taskSatir, ...(kapali ? s.taskKapali : t.gecikmis ? s.taskGecikmis : {}) }}>
                  <div style={{ minWidth: 0 }}>
                    {!kapali && t.tur && <div style={s.taskTur}>{t.tur}</div>}
                    {gorunenAd(t) && <div style={{ fontWeight: 700, color: kapali ? "#94a3b8" : "#0f172a", textDecoration: kapali ? "line-through" : "none", wordBreak: "break-word" }}>{gorunenAd(t)}</div>}
                    {(t.portalYazan || t.durum === "iptal") && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {[t.portalYazan ? `${t.portalYazan} açtı (Portal)` : null, t.durum === "iptal" ? "İptal" : null].filter(Boolean).join(" · ")}
                    </div>}
                    <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "4px", color: kapali ? "#94a3b8" : t.gecikmis ? "#b91c1c" : "#1d4ed8" }}>
                      {kapali ? "✓ " : ""}{t.tarih ? tarih(t.tarih, true) : "-"}
                    </div>
                  </div>
                  <div className="elal-task-dugmeler" style={s.taskDugmeler}>
                    {!kapali && (
                      <>
                        <button type="button" disabled={islem === "calisiyor"} onClick={() => tamamla(t)} style={s.taskTamam}>{islem === "calisiyor" ? "..." : "✓ Tamamla"}</button>
                      </>
                    )}
                  </div>
                  {islem && islem !== "calisiyor" && <div style={{ ...s.hata, gridColumn: "1 / -1", marginTop: 0 }}>{islem}</div>}
                </div>
              );
            })}
            {kapaliTasklar.length > 3 && <div style={{ fontSize: "11px", color: "#94a3b8" }}>+{kapaliTasklar.length - 3} tamamlanmış task daha, hepsi Kylas'ta.</div>}
          </section>
          </div>
          </div>
          <section style={s.notKutusu}>
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
              {dt?.bilgi?.mesaj?.trim() && (
                <div style={{ ...s.not, background: "#fffbeb", borderColor: "#fde68a" }}>
                  <div style={{ fontSize: "11px", color: "#92400e", marginBottom: "4px", fontWeight: 700 }}>Form mesajı{dt.olusturma ? ` · ${tarih(dt.olusturma, true)}` : ""}</div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#0f172a", fontSize: "13px", lineHeight: 1.55 }}>{dt.bilgi.mesaj.trim()}</div>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {asamaPencere && (
        <AsamaPenceresi lead={asamaPencere} onKapat={() => setAsamaPencere(null)}
          ilkHedef={asamaPencere.ilkHedef} onTamam={(id, asama, sebep) => { asamaUygula(id, asama, sebep); setAsamaPencere(null); }} />
      )}
      {pencere && (
        <TaskPenceresi rect={pencere.rect} atanan={kisiAdi(pencere.ownerId)} ilk={pencere.ilk}
          acikTasklar={(tasklar[pencere.leadId]?.tasklar || []).filter(t => t.durum === "acik" || t.durum === "surecte")}
          onOlustur={taskOlustur} onTamamlaOlustur={eskiyiTamamlaYeniOlustur} onKapat={() => setPencere(null)} />
      )}
      {cikisSor && (
        <OnayPenceresi ikon="!" baslik="Kaydedilmemiş not var" onayMetni="Çık" vazgecMetni="Devam et"
          onOnay={() => onKapat(Object.keys(yazilan).map(Number), taskDegisti.current)} onVazgec={() => setCikisSor(false)}>
          Yazdığın ama kaydetmediğin not silinecek. Kaydedilen notlar Kylas'ta kalır.
        </OnayPenceresi>
      )}
    </div>,
    document.body,
  );
}

// Task oluşturma penceresi: tıklanan düğmenin sağ kenarına yaslanır, sola doğru uzanır; arka plan bulanıklaşır (animasyon yok).
// "Task oluştur" ile hemen Kylas'a yazılır (onOlustur). Esc ya da arka plana tıklama kapatır.
function TaskPenceresi({ rect, atanan, ilk, acikTasklar = [], onOlustur, onTamamlaOlustur, onKapat }) {
  const [f, setF] = useState(() => bosForm(ilk?.ad || "", 2614523)); // tür her zaman Follow Up (seçim kaldırıldı)
  const [eskiId, setEskiId] = useState(() => acikTasklar[0]?.id ?? null);
  const eskiGecerli = acikTasklar.some(t => t.id === eskiId) ? eskiId : acikTasklar[0]?.id ?? null;
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const adAlani = useRef(null);
  const degis = d => setF(x => ({ ...x, ...d }));
  useEffect(() => {
    adAlani.current?.focus();
    if (ilk?.ad) adAlani.current?.select();
    const tus = e => { if (e.key === "Escape") { e.stopPropagation(); onKapat(); } };
    document.addEventListener("keydown", tus, true);
    return () => document.removeEventListener("keydown", tus, true);
  }, []);

  const genislik = Math.min(420, window.innerWidth - 24);
  const sag = Math.max(12, Math.min(window.innerWidth - rect.sag, window.innerWidth - genislik - 12));
  // Yüksekliği ölçüp ekrana sığdır: tercihen düğmenin altına, sığmazsa yukarı kaydır (en az 12 px kenar boşluğu)
  const kutuRef = useRef(null);
  const [ust, setUst] = useState(null);
  useLayoutEffect(() => {
    const h = kutuRef.current?.offsetHeight || 0;
    const asagi = window.innerHeight - rect.alt - 22 >= h || rect.ust < h + 22;
    let t = asagi ? rect.alt + 10 : rect.ust - 10 - h;
    t = Math.max(12, Math.min(t, window.innerHeight - h - 12));
    setUst(t);
  }, [acikTasklar.length, hata]);
  const konum = { top: ust ?? 0, visibility: ust === null ? "hidden" : "visible" };
  const adOk = f.ad.trim().length >= 2;

  async function gonder() {
    if (!adOk || calisiyor) { if (!adOk) setHata("Task için bir ad yaz (ör. Tekrar ara)."); return; }
    setCalisiyor(true);
    setHata(null);
    try { await onOlustur(f); } catch (e) { setHata(e.message); setCalisiyor(false); }
  }
  async function tamamlaVeOlustur() {
    if (!adOk || calisiyor || !eskiGecerli) { if (!adOk) setHata("Yeni task için bir ad yaz (ör. Tekrar ara)."); return; }
    setCalisiyor(true);
    setHata(null);
    try { await onTamamlaOlustur(f, eskiGecerli); } catch (e) { setHata(e.message); setCalisiyor(false); }
  }

  return createPortal(
    <>
      <div style={p.arka} onMouseDown={() => !calisiyor && onKapat()} />
      <div ref={kutuRef} role="dialog" aria-modal="true" aria-label="Yeni task" 
        style={{ ...p.kutu, width: genislik, right: sag, ...konum }}>
        <div style={p.ust}>
          <span style={p.ikon}>＋</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>Yeni task</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{atanan} adına atanacak</div>
          </div>
          <button type="button" onClick={onKapat} style={p.kapat} aria-label="Kapat">✕</button>
        </div>
        <div style={p.govde}>
          <label style={p.etiket}>Task adı
            <input ref={adAlani} value={f.ad} onChange={e => degis({ ad: e.target.value.slice(0, 200) })} placeholder="ör. Tekrar ara"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); gonder(); } }} style={p.girdi} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" }}>
            <label style={p.etiket}>Tarih
              <input type="date" value={f.tarih} min={gunSonra(0)} onChange={e => degis({ tarih: e.target.value })} style={p.girdi} />
            </label>
            <label style={p.etiket}>Saat
              <input type="time" value={f.saat} onChange={e => degis({ saat: e.target.value })} style={p.girdi} />
            </label>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[[0, "Bugün"], [1, "Yarın"], [3, "3 gün"], [7, "1 hafta"], [14, "2 hafta"]].map(([g, ad]) => (
              <button key={g} type="button" onClick={() => degis({ tarih: gunSonra(g) })} style={f.tarih === gunSonra(g) ? s.cipAktif : s.cip}>{ad}</button>
            ))}
          </div>
          {acikTasklar.length > 0 && (
            <div style={p.eskiKutu}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px" }}>Tamamlanacak task</div>
              {acikTasklar.length > 1 ? (
                <select value={eskiGecerli ?? ""} onChange={e => setEskiId(Number(e.target.value))} disabled={calisiyor} style={p.girdi} aria-label="Tamamlanacak task">
                  {acikTasklar.map(t => <option key={t.id} value={t.id}>{t.ad || "İsimsiz task"}{t.tarih ? ` · ${tarih(t.tarih)}` : ""}{t.gecikmis ? " (gecikmiş)" : ""}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  {acikTasklar[0].ad || "İsimsiz task"}{acikTasklar[0].tarih ? <span style={{ fontWeight: 500, color: acikTasklar[0].gecikmis ? "#b91c1c" : "#64748b" }}> · {tarih(acikTasklar[0].tarih)}{acikTasklar[0].gecikmis ? " (gecikmiş)" : ""}</span> : null}
                </div>
              )}
              <button type="button" onClick={tamamlaVeOlustur} disabled={calisiyor} style={{ ...p.tamamlaOlustur, opacity: adOk ? 1 : 0.55 }}>
                {calisiyor ? "İşleniyor..." : "Eskiyi Tamamla ve Yenisini Oluştur"}
              </button>
            </div>
          )}
          {hata && <div style={{ ...s.hata, marginTop: 0 }}>{hata}</div>}
        </div>
        <div style={p.alt}>
          <button type="button" onClick={onKapat} disabled={calisiyor} style={p.vazgec}>Vazgeç</button>
          <button type="button" onClick={gonder} disabled={calisiyor} style={{ ...p.olustur, opacity: adOk ? 1 : 0.55 }}>{calisiyor ? "Oluşturuluyor..." : "Task oluştur"}</button>
        </div>
      </div>
    </>,
    document.body,
  );
}

const p = {
  arka: { position: "fixed", inset: 0, zIndex: 9600, background: "rgba(15, 23, 42, 0.22)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" },
  kutu: { position: "fixed", zIndex: 9601, maxHeight: "calc(100vh - 24px)", overflowY: "auto", background: "#fff", borderRadius: "20px", border: "1.5px solid #bbf7d0",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28), 0 0 0 6px rgba(34, 197, 94, 0.08)", fontFamily: "'Sora', sans-serif" },
  ust: { display: "flex", alignItems: "center", gap: "12px", padding: "16px 18px", background: "linear-gradient(135deg, #f0fdf4, var(--marka-acik))", borderBottom: "1px solid #dcfce7" },
  ikon: { width: "34px", height: "34px", borderRadius: "11px", background: "linear-gradient(135deg, #16a34a, var(--marka))", color: "#fff", display: "inline-flex",
    alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, flexShrink: 0, boxShadow: "0 6px 14px rgba(22,163,74,0.3)" },
  kapat: { marginLeft: "auto", width: "32px", height: "32px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", flexShrink: 0 },
  govde: { display: "flex", flexDirection: "column", gap: "14px", padding: "16px 18px" },
  etiket: { display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px" },
  girdi: { height: "40px", padding: "0 12px", borderRadius: "12px", border: "1.5px solid #d1fae5", background: "#fff", color: "#0f172a", fontSize: "14px",
    fontWeight: 600, fontFamily: "'Sora', sans-serif", outline: "none", boxSizing: "border-box", width: "100%", textTransform: "none", letterSpacing: 0 },
  turler: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" },
  tur: { height: "34px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "12px", fontWeight: 700,
    cursor: "pointer", fontFamily: "'Sora', sans-serif", textTransform: "none", letterSpacing: 0 },
  turAktif: { height: "34px", borderRadius: "10px", border: "1.5px solid var(--marka)", background: "var(--marka-acik)", color: "var(--marka-koyu)", fontSize: "12px", fontWeight: 800,
    cursor: "pointer", fontFamily: "'Sora', sans-serif", textTransform: "none", letterSpacing: 0 },
  alt: { display: "flex", justifyContent: "flex-end", gap: "8px", padding: "12px 18px", background: "#f8fafc", borderTop: "1px solid #f1f5f9" },
  vazgec: { padding: "9px 16px", borderRadius: "999px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  eskiKutu: { display: "flex", flexDirection: "column", gap: "8px", padding: "12px", borderRadius: "14px", border: "1.5px solid #bae6fd", background: "#f0f9ff" },
  tamamlaOlustur: { padding: "10px 16px", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, var(--marka), var(--marka-koyu))", color: "#fff", fontSize: "13px",
    fontWeight: 800, cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 6px 16px rgba(8,145,178,0.3)" },
  olustur: { padding: "9px 20px", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, #16a34a, #059669)", color: "#fff", fontSize: "13px",
    fontWeight: 800, cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 6px 16px rgba(22,163,74,0.32)" },
};


// Kylas'taki gibi aşama çubuğu (Yeni → İlgili) + sağda Close Lead. Açık bir aşamaya tıklayınca hemen kaydedilir;
// Close Lead menüsünden İlgisiz / Olumsuza Dönen seçilince sebep penceresi açılır. Kapanmış datada çubuk pasif.
const CUBUK = [217285, ...ACIK_HEDEFLER];
function AsamaCubugu({ lead, onKapat, onDegisti }) {
  const [gidiyor, setGidiyor] = useState(null); // tıklanan aşama
  const [hata, setHata] = useState(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => { setHata(null); setMenu(false); }, [lead.id]);
  useEffect(() => {
    if (!menu) return;
    const dis = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", dis);
    return () => document.removeEventListener("mousedown", dis);
  }, [menu]);
  const sira = CUBUK.indexOf(lead.asama);
  const kapali = !!lead.kapandi || sira < 0;
  async function sec(id) {
    if (kapali || gidiyor || id === lead.asama || id === 217285) return;
    setGidiyor(id); setHata(null);
    try { const d = await apiCagir({ islem: "asamaDegistir", leadId: lead.id, asama: id }); onDegisti(lead.id, d.asama || id, null); }
    catch (e) { setHata(e.message); }
    setGidiyor(null);
  }
  const kapanis = KAPANISLAR.find(k => k.id === lead.asama);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <div className="elal-cubuk" style={{ display: "flex", flex: 1, minWidth: "280px", borderRadius: "999px", overflow: "hidden", opacity: kapali ? 0.5 : 1 }}>
        {CUBUK.map((id, i) => {
          const gecti = !kapali && i < sira, simdi = !kapali && i === sira, tiklanir = !kapali && !simdi && id !== 217285;
          return (
            <button key={id} type="button" onClick={() => sec(id)} disabled={!tiklanir || !!gidiyor} title={tiklanir ? `${ASAMA_ADLARI[id]} aşamasına taşı` : undefined}
              style={{ flex: 1, minWidth: 0, height: "34px", marginLeft: i ? "-6px" : 0, border: "none", padding: "0 14px", fontSize: "12px", fontWeight: simdi ? 700 : 600, fontFamily: "'Sora', sans-serif",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: tiklanir && !gidiyor ? "pointer" : "default",
                clipPath: i === 0 ? "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)" : i === CUBUK.length - 1 ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)" : "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)",
                paddingLeft: i === 0 ? "16px" : "18px",
                background: simdi ? "var(--marka)" : gidiyor === id ? "#a5f3fc" : "#eef2f6", color: simdi ? "#fff" : "#64748b", transition: "background .15s" }}
              className={tiklanir ? "elal-cubuk-adim" : undefined}>
              {gidiyor === id ? "…" : ASAMA_ADLARI[id]}
            </button>
          );
        })}
      </div>
      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        {kapanis ? (
          <span style={{ display: "inline-flex", alignItems: "center", height: "30px", padding: "0 12px", borderRadius: "999px", background: kapanis.zemin, border: `1px solid ${kapanis.cerceve}`, color: kapanis.renk, fontSize: "12px", fontWeight: 700 }}>
            Kapandı · {kapanis.ad}{lead.sebep ? ` · ${lead.sebep}` : ""}
          </span>
        ) : (
          <button type="button" onClick={() => setMenu(m => !m)} disabled={!!gidiyor} className="elal-kapat-dugme"
            style={{ display: "inline-flex", alignItems: "stretch", height: "34px", padding: 0, borderRadius: "10px", border: "none", overflow: "hidden", background: "var(--marka)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 4px 12px rgba(8,145,178,0.3)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "0 16px" }}>Close Lead</span>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "0 11px", background: "var(--marka-koyu)", fontSize: "10px" }}>▼</span>
          </button>
        )}
        {menu && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20, minWidth: "190px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 28px rgba(15,23,42,0.14)", padding: "6px" }}>
            {KAPANISLAR.map(k => (
              <button key={k.id} type="button" onClick={() => { setMenu(false); onKapat(k.id); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 10px", border: "none", borderRadius: "8px", background: "transparent", color: "#0f172a", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif", textAlign: "left" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", border: `1.5px solid ${k.cerceve}`, color: k.renk, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>✕</span>
                {k.ad}
              </button>
            ))}
          </div>
        )}
      </div>
      {hata && <div style={{ width: "100%", fontSize: "12px", color: "#b91c1c" }}>{hata}</div>}
    </div>
  );
}

// Aşama değiştir / kapat penceresi. Kapatmada sebep zorunlu. Kaydedince Kylas'a danışmanın kendi hesabıyla yazılır.
function AsamaPenceresi({ lead, ilkHedef = null, onKapat, onTamam }) {
  const [hedef, setHedef] = useState(ilkHedef);
  const [sebep, setSebep] = useState("");
  const [durum, setDurum] = useState(null); // null | "gidiyor" | { hata }
  const kapanis = KAPANISLAR.find(k => k.id === hedef);
  const hazir = hedef && hedef !== lead.asama && (!kapanis || sebep);
  useEffect(() => {
    const tus = e => { if (e.key === "Escape" && durum !== "gidiyor") { e.stopPropagation(); onKapat(); } };
    document.addEventListener("keydown", tus, true);
    return () => document.removeEventListener("keydown", tus, true);
  }, [durum]);
  async function kaydet() {
    if (!hazir || durum === "gidiyor") return;
    setDurum("gidiyor");
    try {
      const d = await apiCagir({ islem: "asamaDegistir", leadId: lead.id, asama: hedef, ...(kapanis ? { sebep } : {}) });
      onTamam(lead.id, d.asama || hedef, kapanis ? sebep : null);
    } catch (e) { setDurum({ hata: e.message }); }
  }
  const sadeceKapanis = KAPANISLAR.find(k => k.id === ilkHedef);
  if (sadeceKapanis) {
    const k = sadeceKapanis;
    return createPortal(
      <div onClick={() => durum !== "gidiyor" && onKapat()} style={{ position: "fixed", inset: 0, zIndex: 9700, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Sora', sans-serif" }}>
        <div role="dialog" aria-modal="true" aria-label={`${k.ad} olarak kapat`} onClick={e => e.stopPropagation()}
          style={{ width: "min(480px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: "20px", padding: "22px 24px", boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>{lead.ad || `Data ${lead.id}`} · <span style={{ color: k.renk }}>{k.ad}</span></div>
          <div style={{ fontSize: "13px", color: "#475569", margin: "6px 0 14px" }}>Datayı <b>{k.ad}</b> olarak kapatmak için bir sebep seçin.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {k.sebepler.map(x => (
              <label key={x} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: sebep === x ? 700 : 500, color: sebep === x ? k.renk : "#0f172a", background: sebep === x ? k.zemin : "transparent" }}>
                <input type="radio" name="kapanisSebep" checked={sebep === x} onChange={() => setSebep(x)} style={{ accentColor: k.renk, width: "16px", height: "16px", margin: 0 }} />
                {x}
              </label>
            ))}
          </div>
          {durum?.hata && <div style={{ ...s.hata, marginTop: "10px" }}>{durum.hata}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
            <button type="button" onClick={onKapat} disabled={durum === "gidiyor"} style={s.asamaVazgec}>Vazgeç</button>
            <button type="button" onClick={kaydet} disabled={!hazir || durum === "gidiyor"}
              style={{ ...s.asamaKaydet, background: k.renk, opacity: hazir ? 1 : 0.45, cursor: hazir ? "pointer" : "default" }}>
              {durum === "gidiyor" ? "Kaydediliyor..." : `${k.ad} olarak kapat`}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }
  const sec = (id, ek = {}) => ({ ...s.asamaSecenek, ...(hedef === id ? { borderColor: "#7c3aed", background: "#f5f3ff", color: "#5b21b6" } : {}), ...ek });
  return createPortal(
    <div onClick={() => durum !== "gidiyor" && onKapat()} style={{ position: "fixed", inset: 0, zIndex: 9700, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Sora', sans-serif" }}>
      <div role="dialog" aria-modal="true" aria-label="Aşama değiştir" onClick={e => e.stopPropagation()}
        style={{ width: "min(560px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: "20px", padding: "22px 24px", boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
        <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>Aşama değiştir</div>
        <div style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 16px" }}>{lead.ad || `Data ${lead.id}`} · şu an <b>{ASAMA_ADLARI[lead.asama] || "-"}</b></div>
        <div style={s.asamaGrupBaslik}>Açık aşamalar</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
          {ACIK_HEDEFLER.map(id => (
            <button key={id} type="button" disabled={id === lead.asama} onClick={() => { setHedef(id); setSebep(""); }}
              style={sec(id, id === lead.asama ? { opacity: 0.4, cursor: "default" } : {})}>{ASAMA_ADLARI[id]}</button>
          ))}
        </div>
        {KAPANISLAR.map(k => (
          <div key={k.id} style={{ marginBottom: "14px" }}>
            <button type="button" onClick={() => { setHedef(k.id); setSebep(""); }}
              style={sec(k.id, hedef === k.id ? { borderColor: k.renk, background: k.zemin, color: k.renk } : { color: k.renk })}>Kapat → {k.ad}</button>
            <span style={{ marginLeft: "8px", fontSize: "11px", color: "#94a3b8" }}>{k.alt}</span>
            {hedef === k.id && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px", padding: "10px", border: `1px solid ${k.cerceve}`, background: k.zemin, borderRadius: "12px" }}>
                {k.sebepler.map(x => (
                  <button key={x} type="button" onClick={() => setSebep(x)}
                    style={{ ...s.asamaSebep, ...(sebep === x ? { borderColor: k.renk, background: "#fff", color: k.renk, fontWeight: 700 } : {}) }}>{sebep === x ? "✓ " : ""}{x}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {durum?.hata && <div style={{ ...s.hata, marginTop: "6px" }}>{durum.hata}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
          <button type="button" onClick={onKapat} disabled={durum === "gidiyor"} style={s.asamaVazgec}>Vazgeç</button>
          <button type="button" onClick={kaydet} disabled={!hazir || durum === "gidiyor"}
            style={{ ...s.asamaKaydet, ...(kapanis ? { background: kapanis.renk } : {}), opacity: hazir ? 1 : 0.45, cursor: hazir ? "pointer" : "default" }}>
            {durum === "gidiyor" ? "Kaydediliyor..." : kapanis ? `${kapanis.ad} olarak kapat` : "Kaydet"}
          </button>
        </div>
        {kapanis && !sebep && <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "right", marginTop: "6px" }}>Kapatmak için bir sebep seçin.</div>}
      </div>
    </div>,
    document.body
  );
}

function Alan({ ad, bekliyor, kucuk, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: kucuk ? "11px" : "12px", color: "#64748b", marginBottom: "3px" }}>{ad}</div>
      <div style={{ fontSize: kucuk ? "13px" : "14px", color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
        {bekliyor ? <span className="elal-iskelet" /> : children}
      </div>
    </div>
  );
}

const s = {
  asamaDugme: { padding: "3px 10px", borderRadius: "999px", border: "1.5px solid #ddd6fe", background: "#f5f3ff", color: "#6d28d9", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  asamaGrupBaslik: { fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  asamaSecenek: { padding: "8px 14px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  asamaSebep: { padding: "6px 10px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#ffffffaa", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  asamaVazgec: { padding: "9px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  asamaKaydet: { padding: "9px 18px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, fontFamily: "'Sora', sans-serif" },
  zemin: { position: "fixed", inset: 0, zIndex: 9500, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden", fontFamily: "'Sora', sans-serif",
    background: "radial-gradient(1200px 600px at 10% -10%, var(--marka-acik) 0%, transparent 60%), radial-gradient(900px 500px at 110% 0%, #f5f3ff 0%, transparent 55%), #f8fafc",
    animation: "elalGir 0.22s ease-out" },
  ust: { position: "sticky", top: 0, zIndex: 3, display: "grid", gridTemplateColumns: SUTUNLAR, columnGap: "24px", alignItems: "center", padding: `14px calc(max(24px, (100% - ${ICERIK}px) / 2) + 25.5px) 18px`, background: "linear-gradient(100deg, rgba(207,250,254,0.85), rgba(233,226,255,0.9) 50%, rgba(252,231,243,0.85))",
    backdropFilter: "blur(8px)", borderBottom: "1px solid #e9d5ff", flexShrink: 0 },
  logo: { width: "38px", height: "38px", borderRadius: "12px", background: "linear-gradient(135deg, var(--marka), #7c3aed 60%, #db2777)",
    display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(124,58,237,0.35)", flexShrink: 0 },
  sagBlok: { gridColumn: "3 / 5", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", minWidth: 0 },
  ok: { width: "34px", height: "34px", borderRadius: "11px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "20px",
    fontWeight: 700, lineHeight: 1, cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", paddingBottom: "2px" },
  okAtla: { borderColor: "#c4b5fd", background: "#f5f3ff", color: "#6d28d9" },
  sayac: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", position: "relative" },
  toplamDugme: { border: "none", background: "none", padding: "2px 4px", borderRadius: "6px", fontSize: "16px", color: "#64748b", fontWeight: 700,
    cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: "4px", fontFamily: "inherit", fontVariantNumeric: "tabular-nums" },
  listePanel: { position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 41, width: "300px", maxWidth: "calc(100vw - 32px)", background: "#fff",
    border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,23,42,.18)", padding: "6px", whiteSpace: "normal" },
  listeSatir: { display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "6px 8px", border: "none", background: "none", borderRadius: "8px",
    fontSize: "13px", color: "#0f172a", cursor: "pointer", textAlign: "left", fontFamily: "'Sora', sans-serif" },
  listeSatirAktif: { background: "#ecfdf5", fontWeight: 700 },
  listeAlt: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px 2px", borderTop: "1px solid #f1f5f9", marginTop: "4px",
    fontSize: "12px", color: "#64748b" },
  kapat: { width: "38px", height: "38px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
    fontSize: "15px", cursor: "pointer", flexShrink: 0 },
  cubukZemin: { position: "absolute", left: 0, right: 0, bottom: 0, height: "4px", background: "#e2e8f0" },
  govde: { flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px",
    padding: `24px max(24px, calc((100% - ${ICERIK}px) / 2)) 32px`, width: "100%", boxSizing: "border-box" },
  kart: { flexShrink: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "16px 24px 14px",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)" },
  baslikSatir: { display: "grid", gridTemplateColumns: SUTUNLAR, columnGap: "24px", alignItems: "center", marginBottom: "12px" },
  ad: { margin: 0, fontSize: "24px", fontWeight: 600, color: "#0f172a", lineHeight: 1.25, wordBreak: "break-word" },
  idNo: { marginLeft: "6px", color: "#64748b", fontWeight: 500 },
  kylas: { gridColumn: 4, justifySelf: "end", whiteSpace: "nowrap", padding: "6px 12px", borderRadius: "999px", border: "1.5px solid #a5f3fc", background: "var(--marka-acik)", fontSize: "12px",
    fontWeight: 700, color: "var(--marka)", textDecoration: "none" },
  alanlar: { display: "grid", gridTemplateColumns: SUTUNLAR, gap: "12px 24px" },
  bilgiBaslik: { margin: "14px 0 8px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" },
  liste: { display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" },
  aramaDugme: { display: "inline-flex", alignItems: "center", gap: "8px", padding: 0, border: "none", background: "none", color: "#2563eb", fontSize: "14px",
    fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  aramaIkon: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, border: "none", background: "none", color: "#1d4ed8",
    cursor: "pointer", width: "24px", height: "24px" },
  wpDugme: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%",
    background: "#25d366", textDecoration: "none", flexShrink: 0 },
  iletisim: { display: "inline-flex", alignItems: "center", gap: "8px", color: "#2563eb", textDecoration: "none", fontWeight: 600 },
  ikonYesil: { width: "22px", height: "22px", borderRadius: "7px", background: "#dcfce7", color: "#16a34a", display: "inline-flex",
    alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 },
  ikonMavi: { width: "22px", height: "22px", borderRadius: "7px", background: "#dbeafe", color: "#2563eb", display: "inline-flex",
    alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0 },
  altBilgi: { display: "flex", gap: "8px 24px", flexWrap: "wrap", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9",
    fontSize: "12px", color: "#64748b" },
  etiketKirmizi: { display: "inline-block", whiteSpace: "nowrap", marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", fontSize: "10px", fontWeight: 700 },
  etiketSari: { display: "inline-block", whiteSpace: "nowrap", marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 },
  eklendi: { flexShrink: 0, padding: "4px 10px", borderRadius: "999px", background: "#f0fdf4", border: "1.5px solid #86efac", color: "#166534", fontSize: "11px", fontWeight: 700 },
  taskKart: { flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px",
    padding: "16px", boxShadow: "0 8px 24px rgba(15,23,42,0.06)", minWidth: 0 },
  ikili: { display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)", gap: "16px", alignItems: "stretch", flexShrink: 0 },
  // Task hücresi satır yüksekliğine katkı vermez; kart hücreyi doldurur, taşan task'lar kart içinde kayar
  taskHucre: { position: "relative", minWidth: 0 },
  taskKartSabit: { position: "absolute", inset: 0, overflowY: "auto", boxSizing: "border-box" },
  taskBaslik: { display: "flex", flexDirection: "column", alignItems: "stretch", gap: "8px", marginBottom: "4px" },
  taskEkleDugme: { whiteSpace: "nowrap", padding: "6px 10px", borderRadius: "999px", border: "1.5px solid #86efac", background: "#f0fdf4", color: "#166534", fontSize: "12px",
    fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  taskSatir: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "6px 10px", alignItems: "center", padding: "10px 12px",
    borderRadius: "12px", background: "#f8fafc", border: "1px solid #f1f5f9", fontSize: "13px" },
  taskGecikmis: { background: "#fef2f2", border: "1px solid #fecaca" },
  taskKapali: { background: "#fff", border: "1px dashed #e2e8f0" },
  taskTur: { display: "inline-block", marginBottom: "3px", padding: "1px 7px", borderRadius: "999px", background: "var(--marka-acik)", color: "var(--marka-koyu)", fontSize: "10.5px", fontWeight: 600, whiteSpace: "nowrap" },
  taskDugmeler: { gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "flex-start" },
  taskTamam: { padding: "6px 10px", borderRadius: "999px", border: "1.5px solid #86efac", background: "#fff", color: "#166534", fontSize: "11.5px",
    fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap" },
  taskYeni: { padding: "6px 10px", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, #16a34a, #059669)", color: "#fff",
    fontSize: "11.5px", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap" },
  girdi: { height: "36px", padding: "0 10px", borderRadius: "10px", border: "1.5px solid #d1fae5", background: "#fff", color: "#0f172a", fontSize: "13px",
    fontFamily: "'Sora', sans-serif", outline: "none", boxSizing: "border-box", width: "100%", minWidth: 0 },
  cip: { padding: "5px 10px", borderRadius: "999px", border: "1.5px solid #d1fae5", background: "#fff", color: "#166534", fontSize: "11.5px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  cipAktif: { padding: "5px 10px", borderRadius: "999px", border: "1.5px solid #16a34a", background: "#16a34a", color: "#fff", fontSize: "11.5px", fontWeight: 700,
    cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  notKutusu: { flexShrink: 0, display: "flex", flexDirection: "column", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)", overflow: "hidden" },
  bolumBaslik: { fontSize: "12px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" },
  notListe: { padding: "4px 24px 20px", display: "flex", flexDirection: "column", gap: "10px" },
  not: { padding: "10px 12px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #f1f5f9" },
  notYeni: { background: "#f5f3ff", border: "1px solid #ddd6fe" },
  bilgiMetni: { display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "13px" },
  metinDugme: { border: "none", background: "none", color: "var(--marka)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" },
  yazma: { borderBottom: "1px solid #f1f5f9", padding: "18px 24px", background: "#fcfcff" },
  alan: { width: "100%", minHeight: "110px", resize: "vertical", padding: "12px 14px", borderRadius: "14px", border: "1.5px solid", outline: "none",
    fontFamily: "'Sora', sans-serif", fontSize: "14px", lineHeight: 1.5, color: "#0f172a", boxSizing: "border-box", background: "#fff", transition: "border-color 0.15s" },
  hata: { marginTop: "8px", padding: "8px 12px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "12px" },
  altSatir: { display: "grid", gridTemplateColumns: SUTUNLAR, columnGap: "24px", alignItems: "center", marginTop: "12px" },
  geri: { padding: "9px 16px", borderRadius: "999px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px",
    fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  ileri: { gridColumn: "3 / 5", justifySelf: "end", width: "auto", padding: "10px 22px", whiteSpace: "nowrap", borderRadius: "999px", border: "none", color: "#fff", fontSize: "13px", fontWeight: 800, cursor: "pointer",
    fontFamily: "'Sora', sans-serif", background: "linear-gradient(135deg, var(--marka), #7c3aed)", boxShadow: "0 6px 18px rgba(124,58,237,0.35)", transition: "all 0.2s" },
  ileriKapali: { background: "#e2e8f0", color: "#94a3b8", boxShadow: "none", cursor: "not-allowed" },
  ileriBasari: { background: "linear-gradient(135deg, #16a34a, #059669)", boxShadow: "0 6px 18px rgba(22,163,74,0.35)" },
  bitti: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" },
};

const EKRAN_CSS = `
.elal-kapat-dugme:hover:not(:disabled) { background: var(--marka-koyu) !important; }
.elal-cubuk-adim:hover:not(:disabled) { background: #cffafe !important; color: var(--marka-koyu) !important; }
        @keyframes elalPomYesil {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .elal-pom-bitti {
          background: linear-gradient(100deg, #bbf7d0, #4ade80, #22c55e, #86efac, #bbf7d0) !important;
          background-size: 300% 100% !important;
          animation: elalPomYesil 1.5s ease-in-out infinite alternate;
          transition: background 0.4s;
        }
@keyframes elalGir { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: none; } }
@keyframes elalKart { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes elalAkis { to { background-position: 200% 0; } }
@keyframes elalDon { to { transform: rotate(360deg); } }
@keyframes elalYeni { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes elalPatla { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
@keyframes elalHale { 0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.35); } 50% { box-shadow: 0 0 0 10px rgba(124,58,237,0); } }
.elal-govde { animation: elalKart 0.28s ease-out; }
.elal-cubuk { height: 100%; border-radius: 0 4px 4px 0; transition: width 0.4s ease;
  background: linear-gradient(90deg, var(--marka), #7c3aed, #db2777, var(--marka)); background-size: 200% 100%; animation: elalAkis 2.4s linear infinite; }
.elal-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #7c3aed; display: inline-block; animation: elalDon 0.8s linear infinite; }
.elal-yeni-not { animation: elalYeni 0.3s ease-out; }
.elal-ileri-acik { animation: elalHale 1.8s ease-in-out infinite; }
.elal-bitti-ikon { width: 88px; height: 88px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 42px; font-weight: 800;
  color: #fff; background: linear-gradient(135deg, var(--marka), #7c3aed 55%, #db2777); box-shadow: 0 16px 40px rgba(124,58,237,0.35); animation: elalPatla 0.5s ease-out; }
@keyframes elalIskelet { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.elal-iskelet { display: inline-block; width: 70%; height: 14px; border-radius: 6px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%; animation: elalIskelet 1.2s linear infinite; }
@media (max-width: 820px) { .elal-ikili { grid-template-columns: 1fr !important; } .elal-task-kart { position: static !important; overflow: visible !important; } .elal-alanlar { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } .elal-govde { padding: 16px !important; } .elal-ust { padding-left: 41.5px !important; padding-right: 41.5px !important; display: flex !important; gap: 12px; }
  .elal-sag { margin-left: auto; } .elal-pom { position: static !important; transform: none !important; } .elal-izgara { display: flex !important; flex-wrap: wrap; gap: 10px; } .elal-izgara > :last-child { margin-left: auto; width: auto !important; } }
@media (max-width: 480px) { .elal-alanlar { grid-template-columns: 1fr !important; } }
@media (max-width: 640px) { .elal-task { grid-template-columns: auto minmax(0, 1fr) !important; } .elal-task > :nth-child(3) { grid-column: 1 / -1; } .elal-task-dugmeler { grid-column: 1 / -1; justify-content: flex-start !important; }
}
@media (prefers-reduced-motion: reduce) { .elal-govde, .elal-cubuk, .elal-iskelet, .elal-yeni-not, .elal-ileri-acik, .elal-bitti-ikon { animation: none !important; } }
`;

// Düğme: akan renk geçişi + üzerinden geçen parıltı; sayı rozeti beyaz
const DUGME_CSS = `
.elal-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 8px 0 14px;
  border: none; border-radius: 12px; color: #fff; font-family: 'Sora', sans-serif; font-size: 12.5px; font-weight: 800; letter-spacing: 0.2px; cursor: pointer;
  background: linear-gradient(120deg, var(--marka), #7c3aed, #db2777, #7c3aed, var(--marka)); background-size: 300% 100%;
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
