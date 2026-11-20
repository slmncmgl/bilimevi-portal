// v6.13: "Günlük Aktivite" her zaman görünür; değer okunana kadar 0
// v6.12: Data arama kutusu satırdaki boşluğu doldurur, daha belirgin (mor çerçeve, büyük yazı)
// v6.11: liste başlığında danışman/kart özeti yok, sadece "Günlük Aktivite: N"
// v6.10: Data araması e-posta adresiyle de süzer (crm-rapor v3.14)
// v6.9: liste başlığında Data araması (ad, ID, telefon); liste, aşama sayıları ve Dataları Ele Al süzülmüş listeyle çalışır (crm-rapor v3.13)
// v6.8: Task tarihi ve Son aktivite sütunlarında "x gün sonra / x gün" yazısı kaldırıldı, sadece tarih
// v6.7: Ele Al ekranında numara yanında Kylas arama ikonu ve WhatsApp butonu (EleAl v2.9)
// v6.6: arama bildirimi Kylas web başlıklarıyla; sonuçta gittiği hesap görünür (EleAl v2.8, crm-rapor v3.12)
// v6.5: numaraya tıklayınca danışmanın Kylas mobil uygulamasına arama bildirimi (EleAl v2.7, crm-rapor v3.11)
// v6.4: "Eskiyi Tamamla ve Yenisini Oluştur" Yeni task penceresinde, satırlardaki "Tamamla + Yeni" kalktı (EleAl v2.6)
// v6.3: Task'lar kartı Yeni not yüksekliğinde, Önceki notlar tam genişlikte (EleAl v2.5)
// v6.2: "Son Etkinlik" büyük harf; VIP Datalar varsayılanda ON (FiltreCubugu v1.6)
// v6.1: Toplu Data Follow Up: Yeni not (3/4) ve Task'lar (1/4) aynı satırda, Önceki notlar altında (EleAl v2.4)
// v6.0: Campaign Name sütunu en fazla "Study Expo - Şubat 2026" genişliğinde (166 px); sığmayan ad kısalır, üzerine gelince balonda tam hali
// v5.9: Task beklenen kartı kaldırıldı; ileri tarihli açık task'ı olan data takipsiz sayılmaz (gerçek task listesi, crm-rapor v3.9)
// v5.8: not/task bağlı danışmanın kendi Kylas token'ıyla gider (crm-rapor v3.8); aktivite skoru kendi adına açılan notları da sayar
// v5.7: liste başlığında bugünkü portal aktivitesi: "/ N aktivite" (bugün portaldan not girilen Data sayısı, crm-rapor v3.7)
// v5.6: her karta tıklanınca altta listesi: Açık Data, Task beklenen, İleri tarihli task, Gecikmiş task, Takipsiz (Takip oranı -> Task beklenen).
//       Takipsiz dışındaki listelerde Task tarihi sütunu (gecikti / kaldı / Task yok). Sunucu tek açık liste döner (crm-rapor v3.6)
// v5.5: Kylas hız sınırı: sunucuda ortak istek sırası ve 429 tekrar denemesi, tarayıcıda yoğunlukta otomatik tekrar (crm-rapor v3.5)
// v5.4: Toplu Data Follow Up: CRM'de Göster; telefon tıklanınca CRM sayfası, üzerine gelince ipucu (EleAl v2.2)
// v5.3: Toplu Data Follow Up üst şeridi pastel mor tonlu (EleAl v2.1)
// v5.2: liste başlığındaki düğme "Dataları Ele Al" (EleAl v2.0)
// v5.1: Toplu Data Follow Up: sayacın yanında ‹ önceki / › atla, bitişte Atlananları ele al (EleAl v1.9)
// v5.0: Toplu Data Follow Up: kartlar Task oluştur hizasına daraldı, task penceresi animasyonsuz (EleAl v1.8)
// v4.9: Toplu Data Follow Up: ✕ sayacın yanında, task oluşturma açılır pencerede (EleAl v1.7)
// v4.8: Toplu Data Follow Up'ta task'lar: listele, tamamla, Tamamla + yeni, notla birlikte task aç (EleAl v1.6); task değişince liste yenilenir
// v4.7: Ele al ekranının başlığı "Toplu Data Follow Up" (EleAl v1.5)
// v4.6: Ele al: ✕ ve ileri düğmesi kaydırma çubuğu varken de aynı çizgide (EleAl v1.4)
// v4.5: Ele al: sayaç, Kylas'ta aç ve ileri düğmesi Danışman sütunu hizasında; düğme "Kaydet ve Sonrakine Geç" (EleAl v1.3)
// v4.4: Ele al üst şeridi kartla hizalı (EleAl v1.2)
// v4.3: Ele al ekranı Kylas kaydı düzeninde: ortada ad (#ID) ve iki sıra bilgi (telefon, e-posta dahil), altında notlar (EleAl v1.1)
// v4.2: liste başlığında huninin solunda "Bu dataları ele al" (EleAl.jsx): datalar tam ekranda sırayla, not girilmeden sonrakine geçilmez,
//       not Kylas'a yazılır. İşaretli data varsa sadece onlar, yoksa listedeki (aşama süzmesiyle) tüm datalar.
// v4.1: VIP Datalar OFF VIP kaynakları seçimden çıkarır (FiltreCubugu v1.5)
// v4.0: Campaign Name hunisi liste başlığının en sağında (giriş çubuğundan taşındı)
// v3.9: listede Oluşturma sütunu yerine her zaman Campaign Name
// v3.8: Campaign Name araması huni ikonlu açılır kutuda (FiltreCubugu v1.3)
// v3.7: Campaign Name "içerir" araması (giriş çubuğunda pembe kutu); arama varken listede Campaign Name sütunu
// v3.6: listede kutucuk + Danışman Ata (Data Tablosu ile aynı, DanismanAta.jsx): admin herkese, manager kendi şubesinde
// v3.5: adı Takip Tablosu (eski Aktivite Tablosu); açılışta tüm veri kaynakları seçili
// v3.4: giriş çubuğu ortak bileşende (FiltreCubugu.jsx), diğer sekmelerle aynı
// v3.3: Şube düğmeleri kalktı (şube seçimi danışman menüsünde); filtre başlıkları yerine renkli çerçeveler
// v3.2: danışman seçimi açılır çoklu menüde (DanismanSecici.jsx), şubelere göre gruplu; Veri kaynağı ve tarihle aynı satırda
// v3.1: admin/manager listede değilse açılışta danışman seçili gelmez, seçim uyarısı çıkar; filtre başlıkları renkli
// v3.0: "Son N gün özeti" kutusu ayrı sekmeye taşındı (Danışman Özeti, DanismanOzeti.jsx)
// v2.9: "Son N gün özeti" kutusu (SonGunOzeti.jsx): tek danışmanın son N gündeki notları, task'ları ve yeni dataları
// v2.8: açılışta giriş yapan kişinin kendi adı seçili (listede yoksa tüm danışmanlar)
// v2.7: "Son not" sütunu kaldırıldı (danışman son aktivitesi ileride n8n'in yazdığı alandan gelecek)
// v2.6: listede "Son not" sütunu: sayfadaki datalar için en son notun tarihi 5'erli parçalarla Kylas'tan okunur
//       (Kylas not girilince Latest Activity On'u güncellemiyor). Deneme: Son aktivite sütunu yanında duruyor.
// v2.5: kart altı yazılar, tablo altı not ve başlık ekleri kaldırıldı; açıklamalar üzerine gelince balonda (Ipucu.jsx)
// v2.4: Son Etkinlik Tarihi açılışta "Tümü"
// v2.3: Son Etkinlik Tarihi = Tümü + açılır liste (7 / 14 / 30 / N günden eski, TarihSecici.jsx). Tümü = son etkinliğe bakılmaz,
//       task'ı olmayan her açık data takipsiz.
// v2.2: yeni takipsiz kuralı (sunucu crm-rapor v2.0): İlgili ve VIP Görüşme datasında task yoksa son etkinliğe bakılmadan
//       takipsiz; diğerlerinde task yok + seçilen günden eski. Task kartları "İlgili + VIP Görüşme". Listede "Task zorunlu" etiketi.
// v2.1: ekrandaki "lead" yazıları "Data" oldu. Task sadece İlgili'de beklenir (Görüşme de çıkarıldı, sunucu crm-rapor v1.9)
// v2.0: ekran açılınca görebildiği tüm danışmanlar ve VIP Datalar seçili gelir
// v1.9: task sadece Görüşme ve İlgili'de beklenir: "Task beklenen" kartı eklendi; ileri/gecikmiş task ve takip oranı
//       bu iki aşamadan hesaplanır (sunucu crm-rapor v1.8). Açık lead ve takipsiz Na1-İlgili kapsamında kaldı.
// v1.8: danışman çoklu seçim (Tümünü seç / Temizle). Birden fazla danışman seçiliyse kartlar toplamı gösterir,
//       altta danışman karşılaştırma tablosu çıkar (satıra tıklayınca liste o danışmana süzülür), listede Danışman sütunu olur.
// v1.7: VIP Datalar'a Setrow Marketing eklendi (liste KaynakSecici.jsx'te)
// v1.6: veri kaynağı seçimi (açılır çoklu seçim, KaynakSecici.jsx) üst panelde; boşsa tüm kaynaklar.
//       Kaynak sunucuda süzülür, kartlar da seçime göre değişir. VIP Datalar neon düğmesi VIP kaynakları tek tıkla seçer/bırakır.
//       Listedeki ayrı "Kaynak" filtresi kaldırıldı.
// v1.5: "Sessizlik süresi" başlığı "Son Etkinlik Tarihi" oldu. "VIP Datalar" düğmesi öne çıkarıldı: etrafında dönen neon çerçeve ve hafif parıltı (hareket azaltma açıksa durur)
// v1.4: ekrandaki adı "Aktivite Tablosu" (dosya adı aynı kaldı)
// v1.3: "Gecikmiş task" ve "Takipsiz" kartları tıklanabilir; tıklanan kartın lead'leri aşağıda listelenir
//       (gecikmiş listede task tarihi ve kaç gün geciktiği görünür). Filtreler ve sayfalama iki listede de geçerli.
// v1.2: aşama filtresi çoklu seçim (hiçbiri seçili değilse hepsi), kaynak filtresi Tümü / VIP Datalar.
//       "İlgili" alt raporu aşama filtresine taşındı. Liste sayfalı: sayfa başına 10 / 20 / 30 / 50 (varsayılan 20).
// v1.1: danışman seçicide sadece satış ekibi (SATIS_EKIBI, CrmRaporu.jsx). Staff her durumda kendi raporunu görür.
// v1.0: Performans Analizi > Takip Raporu sekmesi
// Danışman seçilir; Bilimevi pipeline'da Na1, Na2, Na3, Görüşme, İlgili aşamalarındaki lead'lerinin takip durumu gösterilir.
// Takipsiz = açık task'ı yok ve son aktivitesi seçilen günden eski. Alt raporlar: İlgili aşaması ve VIP Datalar.
// Not: Kylas'ın "son aktivite" tarihi otomasyon güncellemeleriyle de değişir, sessizlik süresi gerçekte daha uzun olabilir.
// Rol kuralı diğer sekmelerle aynı: admin/director/owner herkesi, manager kendi şubesini, staff kendini görür.
import { useState, useEffect, useRef } from "react";
import { VIP_KAYNAKLAR } from "./KaynakSecici";
import FiltreCubugu, { KampanyaAra } from "./FiltreCubugu";
import DanismanAta from "./DanismanAta";
import EleAl, { EleAlDugmesi } from "./EleAl";
import Ipucu from "./Ipucu";
import { KAYNAKLAR, KYLAS_LEAD_URL, apiCagir, tarih, kucuk, NotBalonu, kisileriYukle, c, Cerceve, TUM_KAYNAKLAR, kaynakFiltresi } from "./CrmRaporu";

export const AKTIVITE_SURUM = "v6.13"; // 1. satırdaki sürümle aynı tut (sayfanın altındaki etikette görünür)

const ASAMA_ADLARI = { 222366: "Na1", 253357: "Na2", 253358: "Na3", 218701: "Görüşme", 218702: "İlgili" };
const ILGILI = 218702;
const ASAMA_SIRASI = [222366, 253357, 253358, 218701, 218702];
const SAYFA_BOYLARI = [10, 20, 30, 50];

// Üzerine gelince görünen açıklamalar
const ACIKLAMA = {
  acik: "Na1, Na2, Na3, Görüşme ve İlgili aşamalarındaki tüm datalar. Tıklayınca aşağıda listelenir.",
  taskBeklenen: "Task'ı zorunlu olan datalar: İlgili aşamasındaki tüm datalar ve VIP kaynaklı Görüşme datası. Tıklayınca aşağıda listelenir.",
  ileriTask: "Task zorunlu datalardan (İlgili + VIP Görüşme) ileri tarihli task'ı olanlar. Tıklayınca aşağıda listelenir.",
  gecikmisTask: "Task zorunlu datalardan (İlgili + VIP Görüşme) task tarihi geçmiş olanlar. Tıklayınca aşağıda listelenir.",
  takipOrani: "İleri tarihli task'ı olan data / task beklenen data (İlgili + VIP Görüşme). Tıklayınca task beklenen datalar listelenir.",
  takipsiz: g => (g
    ? `İlgili ve VIP Görüşme datasında task yoksa takipsiz. Na1-Na3 ve VIP olmayan Görüşme'de task yok ve son etkinlik ${g} günden eski. Tıklayınca aşağıda listelenir.`
    : "Task'ı olmayan her açık data takipsiz (son etkinliğe bakılmıyor). İlgili ve VIP Görüşme'de task zorunlu. Tıklayınca aşağıda listelenir."),
  sonEtkinlik: "Takipsiz sayılması için son etkinliğin ne kadar eski olması gerektiği. Sadece Na1-Na3 ve VIP olmayan Görüşme için geçerli. Tümü: son etkinliğe bakılmaz.",
  sonAktivite: "Kylas'taki son etkinlik tarihi (Latest Activity On). Otomasyon güncellemeleriyle de değişir, not girilince değişmez.",
  taskZorunlu: "İlgili ya da VIP Görüşme datası: task zorunlu ama task yok.",
  karsilastirma: "Satıra tıklayınca aşağıdaki liste o danışmana süzülür, tekrar tıklayınca süzme kalkar.",
  coklu: "Birden fazla seçilebilir.",
  vip: "Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci, Setrow Marketing. Tekrar tıklayınca VIP filtresi kalkar.",
};

const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const zm = v => (v ? new Date(v).getTime() : 0);
const sonEtkinlikSirasi = (a, b) => zm(a.sonAktivite) - zm(b.sonAktivite);
const taskSirasi = (a, b) => (a.sonrakiTask ? 1 : 0) - (b.sonrakiTask ? 1 : 0) || zm(a.sonrakiTask) - zm(b.sonrakiTask) || sonEtkinlikSirasi(a, b);
// Kartlara tıklanınca altta açılan listeler (sunucunun "acik" listesinden süzülür)
const GORUNUMLER = {
  acik: { ad: "Açık Datalar", suz: () => true, sirala: sonEtkinlikSirasi },
  taskBeklenen: { ad: "Task beklenen Datalar", suz: l => l.zorunlu, sirala: taskSirasi },
  ileri: { ad: "İleri tarihli task'lı Datalar", suz: l => l.zorunlu && l.taskTur === "ileri", sirala: taskSirasi },
  gecikmis: { ad: "Gecikmiş task'lı Datalar", suz: l => l.zorunlu && l.taskTur === "gecikmis", sirala: taskSirasi },
  takipsiz: { ad: "Takipsiz Datalar", suz: l => l.takipsiz, sirala: sonEtkinlikSirasi },
};
const gunOnce = v => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null);

export default function TakipRaporu({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null);
  const [kisiHata, setKisiHata] = useState(null);
  const [danismanlar, setDanismanlar] = useState([]); // seçili kylas id'leri (string)
  const [listeSahip, setListeSahip] = useState(null); // karşılaştırmada tıklanan danışman: listeyi ona süzer
  const [sessizGun, setSessizGun] = useState(0); // 0 = Tümü (son etkinliğe bakılmaz), açılışta Tümü
  const [rapor, setRapor] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [asamaSecim, setAsamaSecim] = useState([]); // boşsa tüm aşamalar
  const [kaynaklar, setKaynaklar] = useState(TUM_KAYNAKLAR); // açılışta tüm kaynaklar; boşsa da tüm kaynaklar
  const [kampanya, setKampanya] = useState(""); // Campaign Name içerir araması
  const [sayfaBoyu, setSayfaBoyu] = useState(20);
  const [sayfa, setSayfa] = useState(1);
  const [gorunum, setGorunum] = useState("takipsiz"); // GORUNUMLER anahtarı: acik | taskBeklenen | ileri | gecikmis | takipsiz
  const notOnbellek = useRef({});
  const [eleAl, setEleAl] = useState(null); // ele alınan datalar (tam ekran açıkken)
  const [dataAra, setDataAra] = useState(""); // liste içi Data araması (ad, ID, telefon)
  const [aktivite, setAktivite] = useState(null); // bugün portaldan not girilen Data sayısı
  const [aktiviteYenile, setAktiviteYenile] = useState(0);

  useEffect(() => {
    kisileriYukle().then(setKisiler).catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  // Rolüne göre seçilebilir danışmanlar
  // Admin ve manager seçicisinde sadece satış ekibi; staff kendini görür
  const tumu = kisiler ? Object.entries(kisiler).map(([id, k]) => ({ id, ...k })).filter(k => k.personelde) : [];
  const satisci = tumu.filter(k => k.satis);
  const secilebilir = (isAdmin || isManager ? satisci : tumu)
    .filter(k => {
      if (isAdmin) return true;
      if (isManager) return kucuk(k.sube) === kucuk(user?.branch);
      return k.email === kucuk(user?.email) || kucuk(k.ad) === kucuk(user?.name);
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  // Varsayılan: giriş yapan kişi listede varsa sadece kendisi seçili. Listede değilse admin ve manager'da seçim boş gelir
  // (rapor çekilmez, seçim uyarısı görünür); staff'ta seçici olmadığı için görebildiği danışman seçilir.
  useEffect(() => {
    if (!kisiler || danismanlar.length || !secilebilir.length) return;
    const kendi = secilebilir.find(k => k.email === kucuk(user?.email) || kucuk(k.ad) === kucuk(user?.name));
    if (kendi) setDanismanlar([kendi.id]);
    else if (!isAdmin && !isManager) setDanismanlar(secilebilir.map(k => k.id));
  }, [kisiler]);
  // Şube değişince görünmeyen danışmanlar seçimden düşer
  const secilebilirAnahtar = secilebilir.map(k => k.id).join(",");
  useEffect(() => {
    if (!kisiler) return;
    setDanismanlar(s => s.filter(id => secilebilir.some(k => k.id === id)));
  }, [secilebilirAnahtar]);
  const hedefler = isAdmin || isManager ? secilebilir.map(k => ({ ...k, id: Number(k.id) }))
    .sort((a, b) => (a.sube || "").localeCompare(b.sube || "", "tr") || a.ad.localeCompare(b.ad, "tr")) : null;
  const atanabilir = !!hedefler?.length;
  const subeyeGore = [...secilebilir].sort((a, b) => (a.sube || "").localeCompare(b.sube || "", "tr") || a.ad.localeCompare(b.ad, "tr"));
  const hepsiSecili = secilebilir.length > 0 && secilebilir.every(k => danismanlar.includes(k.id));

  // Danışman ve kaynak seçimi art arda değişebilir: istek 400 ms bekleyip tek seferde gider
  const danismanAnahtari = [...danismanlar].sort().join(",");
  const kaynakAnahtari = [...kaynaklar].sort((a, b) => a - b).join(",");
  // Danışman Ata: seçilen datalar, aktarım sürüyor mu, aktarım sonrası sessiz yenileme
  const [isaretli, setIsaretli] = useState([]);
  const [aktarim, setAktarim] = useState(false);
  const [yenile, setYenile] = useState(0);
  const sessiz = useRef(false); // true ise yenilemede ekran spinner'a dönmez (aktarma sonrası, Campaign Name araması)
  const [arkaYukleniyor, setArkaYukleniyor] = useState(false); // sessiz yenileme sürüyor: liste soluk
  useEffect(() => { setListeSahip(null); setIsaretli([]); }, [danismanAnahtari, sessizGun, kaynakAnahtari, kampanya]);
  useEffect(() => {
    if (!danismanlar.length) { setRapor(null); return; }
    let iptal = false;
    if (!sessiz.current) setYukleniyor(true); else setArkaYukleniyor(true);
    sessiz.current = false;
    setHata(null);
    const zamanlayici = setTimeout(() => {
      apiCagir({ islem: "takip", ownerIds: danismanlar.map(Number), sessizGun, kaynaklar: kaynakFiltresi(kaynaklar), kampanya })
        .then(d => { if (!iptal) setRapor(d); })
        .catch(e => { if (!iptal) { setRapor(null); setHata(e.message); } })
        .finally(() => { if (!iptal) { setYukleniyor(false); setArkaYukleniyor(false); } });
    }, 400);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [danismanAnahtari, sessizGun, kaynakAnahtari, kampanya, yenile]);

  // Bugünkü portal aktivitesi: başlıkta görünen danışman(lar) için
  const aktiviteSahipleri = (listeSahip ? [listeSahip] : danismanlar).map(Number);
  const aktiviteAnahtari = [...aktiviteSahipleri].sort((a, b) => a - b).join(",");
  useEffect(() => {
    if (!aktiviteSahipleri.length || !rapor) { setAktivite(null); return; }
    let iptal = false;
    apiCagir({ islem: "portalAktivite", ownerIds: aktiviteSahipleri })
      .then(d => { if (!iptal) setAktivite(d.veri); })
      .catch(() => { if (!iptal) setAktivite(null); });
    return () => { iptal = true; };
  }, [aktiviteAnahtari, !!rapor, aktiviteYenile]);

  const coklu = danismanlar.length > 1;
  const kisiAdi = id => kisiler?.[String(id)]?.ad || `#${id}`;
  const secimBasligi = !coklu ? kisiAdi(danismanlar[0])
    : hepsiSecili && danismanlar.length === secilebilir.length ? `Tüm danışmanlar (${danismanlar.length})` : `${danismanlar.length} danışman`;
  // Karşılaştırma tablosu: danışman başına özet, en çok takipsizi olan üstte
  const karsilastirma = rapor?.danismanlar
    ? Object.entries(rapor.danismanlar).map(([id, d]) => ({ id, ad: kisiAdi(id), ...d, oran: d.taskBeklenen ? Math.round((d.ileriTask / d.taskBeklenen) * 100) : 0 }))
        .sort((a, b) => b.takipsiz - a.takipsiz || b.toplam - a.toplam)
    : [];
  // Liste filtresi: aşama (çoklu). Kaynak sunucuda süzülür.
  const asamaSuz = l => (!asamaSecim.length || asamaSecim.includes(l.asama)) && (!listeSahip || String(l.ownerId) === listeSahip);
  const gorunumTanim = GORUNUMLER[gorunum] || GORUNUMLER.takipsiz;
  const taskSutunu = gorunum !== "takipsiz";
  const tumTakipsiz = (rapor?.acik || []).filter(gorunumTanim.suz).filter(dataAraSuz(dataAra)).sort(gorunumTanim.sirala);
  const liste = tumTakipsiz.filter(asamaSuz);
  const asamaSayisi = id => tumTakipsiz.filter(l => (id === null || l.asama === id) && (!listeSahip || String(l.ownerId) === listeSahip)).length;
  const asamaDegistir = id => setAsamaSecim(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  // Sayfalama: filtre, sayfa boyu ya da rapor değişince ilk sayfaya dön
  useEffect(() => { setSayfa(1); }, [asamaSecim, sayfaBoyu, rapor, gorunum, listeSahip, dataAra]);
  // Kart ya da listedeki danışman değişince Data araması sıfırlanır
  useEffect(() => { setDataAra(""); }, [gorunum, listeSahip]);
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / sayfaBoyu));
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi);
  const sayfaListesi = liste.slice((gecerliSayfa - 1) * sayfaBoyu, gecerliSayfa * sayfaBoyu);
  // Ele al: listede işaretli data varsa onlar, yoksa listedeki tümü (liste sırasıyla)
  const isaretliListede = liste.filter(x => isaretli.includes(x.id));
  const eleAlinacak = isaretliListede.length ? isaretliListede : liste;
  const sayfaTumuIsaretli = sayfaListesi.length > 0 && sayfaListesi.every(l => isaretli.includes(l.id));
  function sayfayiIsaretle() {
    const idler = sayfaListesi.map(l => l.id);
    setIsaretli(s => (sayfaTumuIsaretli ? s.filter(id => !idler.includes(id)) : [...new Set([...s, ...idler])]));
  }

  const o = rapor?.ozet;
  // Takip oranı: task zorunlu datalardan (İlgili + VIP Görüşme) ileri tarihli task'ı olanların payı
  const takipOrani = o && o.taskBeklenen ? Math.round((o.ileriTask / o.taskBeklenen) * 100) : 0;

  return (
    <>
      <FiltreCubugu
        danisman={isAdmin || isManager ? { liste: subeyeGore, secili: danismanlar, onChange: setDanismanlar, yukleniyor: !kisiler && !kisiHata } : null}
        kaynak={{ secili: kaynaklar, onChange: setKaynaklar }}
        tarih={{ deger: sessizGun || null, onChange: v => setSessizGun(v === null ? 0 : v), metin: g => `${g} günden eski`, nMetni: "N günden eski",
          bosMetin: "Son Etkinlik", ipucu: `Son Etkinlik Tarihi: ${ACIKLAMA.sonEtkinlik}` }} />

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {kisiler && !danismanlar.length && (
        <div style={t.uyari}>
          <span style={t.uyariIkon}>!</span>
          <span><b>Danışman seçin.</b> Raporu görmek için yukarıdan bir ya da birden fazla danışman seçin{isAdmin ? ", ya da önce şube seçip Tümünü seç'e basın" : ""}.</span>
        </div>
      )}
      {danismanlar.length > 0 && yukleniyor && <div style={c.bos}><span style={c.spinner} /> Kylas'tan Datalar alınıyor...</div>}
      {danismanlar.length > 0 && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {danismanlar.length > 0 && !yukleniyor && !hata && rapor && (
        <>
          <div style={t.kartlar}>
            <Kart sayi={o.toplam} etiket="Açık Data" ipucu={ACIKLAMA.acik} renk="#0e7490" cerceve="#a5f3fc"
              secili={gorunum === "acik"} onClick={() => setGorunum("acik")} />
            <Kart sayi={o.ileriTask} etiket="İleri tarihli task" ipucu={ACIKLAMA.ileriTask} renk="#166534" zemin="#f0fdf4" cerceve="#86efac"
              secili={gorunum === "ileri"} onClick={() => setGorunum("ileri")} />
            <Kart sayi={o.gecikmisTask} etiket="Gecikmiş task" ipucu={ACIKLAMA.gecikmisTask} renk="#92400e" zemin="#fffbeb" cerceve="#fde68a"
              secili={gorunum === "gecikmis"} onClick={() => setGorunum("gecikmis")} />
            <Kart sayi={o.takipsiz} etiket="Takipsiz" ipucu={ACIKLAMA.takipsiz(sessizGun)} renk="#991b1b" zemin="#fef2f2" cerceve="#fca5a5"
              secili={gorunum === "takipsiz"} onClick={() => setGorunum("takipsiz")} />
            <Kart sayi={`%${takipOrani}`} etiket="Takip oranı" ipucu={ACIKLAMA.takipOrani} onClick={() => setGorunum("taskBeklenen")} />
          </div>

          {coklu && karsilastirma.length > 0 && (
            <div style={{ ...c.tablo, marginBottom: "20px" }}>
              <div style={c.tabloBaslik}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}><Ipucu metin={ACIKLAMA.karsilastirma}>Danışman karşılaştırması</Ipucu> · {secimBasligi}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      <th style={{ ...c.th, textAlign: "left" }}>Danışman</th>
                      {[["Açık Data", ACIKLAMA.acik], ["Task beklenen", ACIKLAMA.taskBeklenen], ["İleri task", ACIKLAMA.ileriTask], ["Gecikmiş task", ACIKLAMA.gecikmisTask.split(" Tıklayınca")[0]], ["Takipsiz", ACIKLAMA.takipsiz(sessizGun).split(" Tıklayınca")[0]], ["Takip oranı", ACIKLAMA.takipOrani]].map(([b, a]) => <th key={b} style={c.th}><Ipucu metin={a.split(" Tıklayınca")[0]}>{b}</Ipucu></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {karsilastirma.map((d, i) => {
                      const aktif = listeSahip === d.id;
                      return (
                        <tr key={d.id} onClick={() => setListeSahip(aktif ? null : d.id)}
                          style={{ cursor: "pointer", background: aktif ? "#ecfeff" : i % 2 ? "#fbfdff" : "#fff" }}>
                          <td style={{ ...c.td, textAlign: "left", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{aktif ? "▸ " : ""}{d.ad}</td>
                          <td style={c.td}>{d.toplam}</td>
                          <td style={c.td}>{d.taskBeklenen}</td>
                          <td style={{ ...c.td, color: "#166534" }}>{d.ileriTask}</td>
                          <td style={{ ...c.td, color: d.gecikmisTask ? "#92400e" : undefined }}>{d.gecikmisTask}</td>
                          <td style={{ ...c.td, color: d.takipsiz ? "#991b1b" : undefined, fontWeight: 700 }}>{d.takipsiz}</td>
                          <td style={{ ...c.td, fontWeight: 600 }}>%{d.oran}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ ...c.tablo, opacity: arkaYukleniyor ? 0.55 : 1, transition: "opacity 0.2s" }}>
            <div style={c.tabloBaslik}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                {(
                  <Ipucu metin="Bugün bu danışman adına açılan not sayısı (portaldan; bağlı danışmanlarda Kylas'ta kendi adına görünür). Gece 00:00'da sıfırlanır." isaret={false}>
                    <span>Günlük Aktivite: <span style={t.aktivite}>{aktivite ?? 0}</span></span>
                  </Ipucu>
                )}
              </span>
              <span style={t.dataAra}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                <input value={dataAra} onChange={e => setDataAra(e.target.value)} placeholder="Data ara: ad, ID, telefon, e-posta" maxLength={60}
                  aria-label="Listede Data ara" style={t.dataAraGirdi} />
                {dataAra && <button type="button" onClick={() => setDataAra("")} aria-label="Aramayı temizle" style={t.dataAraSil}>✕</button>}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {listeSahip && <button onClick={() => setListeSahip(null)} style={c.chip}>✕ Tüm seçili danışmanlar</button>}
                <EleAlDugmesi sayi={eleAlinacak.length} disabled={aktarim} onClick={() => setEleAl(eleAlinacak)} />
                <KampanyaAra deger={kampanya} onChange={v => { if (rapor) sessiz.current = true; setKampanya(v); }} />
              </span>
            </div>
            <div style={t.filtreler}>
              <Cerceve tur="asama" metin="Aşama: birden fazla seçilebilir.">
                <div style={c.chipSatir}>
                  <button onClick={() => setAsamaSecim([])} style={!asamaSecim.length ? c.chipAktif : c.chip}>Tümü ({asamaSayisi(null)})</button>
                  {ASAMA_SIRASI.map(id => (
                    <button key={id} onClick={() => asamaDegistir(id)} style={asamaSecim.includes(id) ? c.chipAktif : c.chip}>
                      {asamaSecim.includes(id) ? "✓ " : ""}{ASAMA_ADLARI[id]} ({asamaSayisi(id)})
                    </button>
                  ))}
                </div>
              </Cerceve>
            </div>
            {atanabilir && (
              <DanismanAta isaretli={isaretli} setIsaretli={setIsaretli} hedefler={hedefler} onMesgul={setAktarim}
                onAktarildi={() => { sessiz.current = true; setYenile(n => n + 1); }} />
            )}
            {liste.length === 0 ? (
              <div style={c.bos}>Bu raporda Data yok.</div>
            ) : (
              <>
              <div style={{ overflowX: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      {atanabilir && (
                        <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0, width: "36px" }}>
                          <input type="checkbox" checked={sayfaTumuIsaretli} disabled={aktarim} aria-label="Bu sayfadakileri seç" onChange={sayfayiIsaretle}
                            style={{ accentColor: "#0891b2", cursor: "pointer" }} />
                        </th>
                      )}
                      {["Data ID", "Ad Soyad", ...(coklu ? ["Danışman"] : []), "Aşama", "Kaynak", "Campaign Name"].map(b => <th key={b} style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>{b}</th>)}
                      {taskSutunu && <th style={{ ...c.th, position: "sticky", top: 0 }}>Task tarihi</th>}
                      <th style={{ ...c.th, position: "sticky", top: 0 }}><Ipucu metin={ACIKLAMA.sonAktivite}>Son aktivite</Ipucu></th>
                      <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0 }}>Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sayfaListesi.map((l, i) => {
                      return (
                        <tr key={l.id} style={{ background: isaretli.includes(l.id) ? "#ecfeff" : i % 2 ? "#fbfdff" : "#fff" }}>
                          {atanabilir && (
                            <td style={{ ...c.td, textAlign: "center" }}>
                              <input type="checkbox" checked={isaretli.includes(l.id)} disabled={aktarim} aria-label={`Data ${l.id} seç`}
                                onChange={() => setIsaretli(s => (s.includes(l.id) ? s.filter(x => x !== l.id) : [...s, l.id]))}
                                style={{ accentColor: "#0891b2", cursor: "pointer" }} />
                            </td>
                          )}
                          <td style={{ ...c.td, textAlign: "left" }}>
                            <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={c.link}>{l.id}</a>
                          </td>
                          <td style={{ ...c.td, textAlign: "left", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>{l.ad || <span style={{ color: "#cbd5e1" }}>İsimsiz</span>}</td>
                          {coklu && <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{kisiAdi(l.ownerId)}</td>}
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap", fontWeight: l.asama === ILGILI ? 700 : 400, color: l.asama === ILGILI ? "#0e7490" : undefined }}>{ASAMA_ADLARI[l.asama] || ""}{l.zorunlu && <Ipucu metin={ACIKLAMA.taskZorunlu} isaret={false}><span style={t.zorunlu}>Task zorunlu</span></Ipucu>}</td>
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>
                            {kaynakAdi(l.kaynak)}
                            {VIP_KAYNAKLAR.includes(l.kaynak) && <span style={t.vip}>VIP</span>}
                          </td>
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>
                            {l.kampanya ? <KampanyaHucresi metin={l.kampanya} /> : <span style={{ color: "#cbd5e1" }}>·</span>}
                          </td>
                          {taskSutunu && <TaskHucresi l={l} />}
                          <td style={{ ...c.td, whiteSpace: "nowrap" }}>
                            {l.sonAktivite ? tarih(l.sonAktivite) :<span style={{ color: "#dc2626" }}>Hiç yok</span>}
                          </td>
                          <td style={{ ...c.td, textAlign: "center" }}><NotBalonu lead={l} onbellek={notOnbellek} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={t.sayfalama}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Sayfa başına</span>
                  {SAYFA_BOYLARI.map(n => (
                    <button key={n} onClick={() => setSayfaBoyu(n)} style={sayfaBoyu === n ? t.kucukAktif : t.kucuk}>{n}</button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
                    {(gecerliSayfa - 1) * sayfaBoyu + 1}-{Math.min(gecerliSayfa * sayfaBoyu, liste.length)} / {liste.length}
                  </span>
                  <button onClick={() => setSayfa(1)} disabled={gecerliSayfa === 1} style={{ ...t.kucuk, opacity: gecerliSayfa === 1 ? 0.4 : 1, cursor: gecerliSayfa === 1 ? "default" : "pointer" }} title="İlk sayfa">«</button>
                  <button onClick={() => setSayfa(gecerliSayfa - 1)} disabled={gecerliSayfa === 1} style={{ ...t.kucuk, opacity: gecerliSayfa === 1 ? 0.4 : 1, cursor: gecerliSayfa === 1 ? "default" : "pointer" }} title="Önceki sayfa">‹</button>
                  <span style={{ fontSize: "12px", color: "#0f172a", fontWeight: 600, minWidth: "64px", textAlign: "center" }}>Sayfa {gecerliSayfa} / {sayfaSayisi}</span>
                  <button onClick={() => setSayfa(gecerliSayfa + 1)} disabled={gecerliSayfa === sayfaSayisi} style={{ ...t.kucuk, opacity: gecerliSayfa === sayfaSayisi ? 0.4 : 1, cursor: gecerliSayfa === sayfaSayisi ? "default" : "pointer" }} title="Sonraki sayfa">›</button>
                  <button onClick={() => setSayfa(sayfaSayisi)} disabled={gecerliSayfa === sayfaSayisi} style={{ ...t.kucuk, opacity: gecerliSayfa === sayfaSayisi ? 0.4 : 1, cursor: gecerliSayfa === sayfaSayisi ? "default" : "pointer" }} title="Son sayfa">»</button>
                </div>
              </div>
              </>
            )}
          </div>
        </>
      )}
      {eleAl && (
        <EleAl leadler={eleAl} kisiAdi={kisiAdi} listeAdi={gorunumTanim.ad}
          onKapat={(idler, taskDegisti) => {
            idler.forEach(id => { delete notOnbellek.current[id]; });
            setEleAl(null);
            if (taskDegisti) { sessiz.current = true; setYenile(n => n + 1); } // takipsiz / gecikmiş listesi değişmiş olabilir
            if (idler.length) setAktiviteYenile(n => n + 1);
          }} />
      )}
    </>
  );
}

// Campaign Name hücresi: en fazla "Study Expo - Şubat 2026" genişliği (13px Sora'da 164 px). Taşarsa "…" ile kısalır
// ve üzerine gelince tam ad balonda görünür; sığıyorsa balon çıkmaz.
const KAMPANYA_EN = 166;
function KampanyaHucresi({ metin }) {
  const ref = useRef(null);
  const [tasti, setTasti] = useState(false);
  useEffect(() => { const el = ref.current; if (el) setTasti(el.scrollWidth > el.clientWidth + 1); }, [metin]);
  const icerik = (
    <span ref={ref} style={{ display: "inline-block", maxWidth: `${KAMPANYA_EN}px`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
      {metin}
    </span>
  );
  return tasti ? <Ipucu metin={metin} isaret={false}>{icerik}</Ipucu> : icerik;
}

// Liste içi Data araması: ad (Türkçe harf ve büyük/küçük duyarsız), Data ID ya da telefon (rakamlar; baştaki 0 ve +90 önemsiz)
const sade = m => String(m || "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
function dataAraSuz(aranan) {
  const q = sade(aranan);
  if (!q) return () => true;
  const rakam = /^[\d\s+()-]+$/.test(q) ? q.replace(/\D/g, "").replace(/^0+/, "") : "";
  const ham = String(aranan).trim().toLowerCase();
  return l => sade(l.ad).includes(q) || (ham.length >= 3 && (l.eposta || []).some(e => e.includes(ham))) || (rakam.length >= 3 && (String(l.id).includes(rakam) || (l.tel || []).some(x => x.includes(rakam))));
}

// Task tarihi hücresi: gecikmiş (turuncu, kaç gün gecikti), ileri (yeşil, kaç gün kaldı), yok (zorunluysa kırmızı)
function TaskHucresi({ l }) {
  if (!l.sonrakiTask) return <td style={{ ...c.td, whiteSpace: "nowrap", color: l.zorunlu ? "#dc2626" : "#94a3b8", fontWeight: l.zorunlu ? 600 : 400 }}>Task yok</td>;
  const gecikti = new Date(l.sonrakiTask).getTime() < Date.now();
  return (
    <td style={{ ...c.td, whiteSpace: "nowrap", color: gecikti ? "#b45309" : "#166534", fontWeight: 600 }}>
      {tarih(l.sonrakiTask)}
    </td>
  );
}

// Kart: açıklaması üzerine gelince balonda. Tıklanabilir kartlarda seçili olanın çerçevesi koyulaşır.
function Kart({ sayi, etiket, ipucu, renk = "#0f172a", zemin = "#fff", cerceve = "#e2e8f0", onClick, secili }) {
  const tiklanir = !!onClick;
  return (
    <Ipucu metin={ipucu} blok>
      <div onClick={onClick} role={tiklanir ? "button" : undefined}
        style={{ ...t.kart, background: zemin, borderColor: secili ? renk : cerceve, cursor: tiklanir ? "pointer" : "help",
          boxShadow: secili ? `0 0 0 3px ${cerceve}` : t.kart.boxShadow, height: "100%", boxSizing: "border-box" }}>
        <div style={{ ...t.kartSayi, color: renk }}>{typeof sayi === "number" ? sayi.toLocaleString("tr-TR") : sayi}</div>
        <div style={t.kartEtiket}>{etiket}</div>
      </div>
    </Ipucu>
  );
}

// VIP Datalar düğmesi: arkada dönen konik renk geçişi 2px'lik neon çerçeve gibi görünür, dışta altın parıltı nefes alır

const t = {
  uyari: { display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", marginBottom: "20px", borderRadius: "16px",
    background: "#fffbeb", border: "1.5px solid #fde68a", color: "#92400e", fontSize: "14px", lineHeight: 1.5, animation: "fadeUp 0.3s ease-out" },
  uyariIkon: { flex: "0 0 auto", width: "26px", height: "26px", borderRadius: "50%", background: "#f59e0b", color: "#fff", fontWeight: 800,
    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "14px" },
  kartlar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px", animation: "fadeUp 0.4s ease-out" },
  kart: { border: "1.5px solid", borderRadius: "16px", padding: "18px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  kartSayi: { fontSize: "26px", fontWeight: 700, marginBottom: "4px", fontVariantNumeric: "tabular-nums" },
  kartEtiket: { fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" },
  zorunlu: { marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", fontSize: "10px", fontWeight: 700 },
  aktivite: { marginLeft: "4px", color: "#7c3aed", fontWeight: 800 },
  dataAra: { display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px", minWidth: "220px", padding: "10px 16px", borderRadius: "999px",
    border: "2px solid #a78bfa", background: "#faf5ff", boxShadow: "0 2px 10px rgba(124,58,237,0.12)" },
  dataAraGirdi: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "none", fontSize: "14px", fontWeight: 600, color: "#0f172a", fontFamily: "'Sora', sans-serif" },
  dataAraSil: { border: "none", background: "none", color: "#7c3aed", fontSize: "14px", fontWeight: 800, cursor: "pointer", padding: 0 },
  vip: { marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 },
  filtreler: { display: "flex", gap: "24px", flexWrap: "wrap", padding: "14px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafcff" },
  sayfalama: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "12px 24px", borderTop: "1px solid #f1f5f9" },
  kucuk: { minWidth: "30px", height: "28px", padding: "0 8px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  kucukAktif: { minWidth: "30px", height: "28px", padding: "0 8px", borderRadius: "8px", border: "1.5px solid #0891b2", background: "#0891b2", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
};
