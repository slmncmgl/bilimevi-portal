// v6.40: son etkinlik filtresi aralıklı: 7-14 gün önce, 14-30 gün önce, 30 günden eski, N günden eski
// v6.39: "Task tarihi bugün" kartı: açık datalardan sıradaki task'ı bugün olanlar (listedeki sonrakiTask'tan, İstanbul günü)
// v6.38: takip oranı = (takip edilmesi gereken - takipsiz) / takip edilmesi gereken; küme boşsa "-"; kart tıklanınca o küme listelenir
// v6.37: admin danışman listesinde "Tüm danışmanlar"; çoklu seçimde Toplu Hatırlat danışman başına ayrı mesaj (n8n kuyruğu)
// v6.36: son etkinlik filtresi tüm kartları ve listeyi süzer
// v6.35: takipsiz açıklaması: Na1-Na3'te sadece VIP kaynaklılar
// v6.34: kart açıklamaları madde madde
// v6.33: staff da seçme kutuları ve Danışman Ata ile kendi datasını tüm satış ekibinden birine aktarır (crm-rapor v3.21)
// v6.32: Takipsiz kartı tarihi geçmiş task'ı olan dataları da içerir (crm-rapor v3.20)
// v6.31: Açık Data "Yeni" aşamasındaki dataları da içerir (aşama çipi Yeni eklendi; Yeni datalar takipsiz sayılmaz)
// v6.30: Son aktivite yazısı güne göre renkli: yakın tarih turuncu, eskidikçe koyu kırmızı ve kalın (90 gün ve üstü ile "Hiç yok" en koyu)
// v6.29: Reklam Adı sadece Instagram ve Facebook datalarında; listede hiç yoksa sütun gizli
// v6.28: "Campaign Name" sütun ve filtre adı "Reklam Adı"; toplu mesaj "en kısa sürede ilgilenebilir misiniz?" (crm-rapor v3.18)
// v6.27: aşama düğmelerinin sağında Campaign Name hunisi ve mor toplu hatırlatma zili (crm-rapor v3.17); arama kutusu Dataları Ele Al'a kadar uzar
// v6.26: Berat (berat@bilimevi.com) açılışta sadece Instagram DM seçili; seçimi değiştirebilir
// v6.25: Hatırlat mesajı yeni biçimde: Data Kaynağı + Son Aktivite (crm-rapor v3.16)
// v6.24: Data ID sütunu kalktı (ad CRM'i açar, üzerine gelince ID + kopyala), Son aktivite "N gün önce", Hatırlat zil ikonu
// v6.23: admin/director/owner için satır sonunda Hatırlat: danışmana WhatsApp (Hatirlat.jsx, crm-rapor v3.15)
// v6.22: danışman seçimi tekli, tablolarda Danışman sütunu çıkmaz
// v6.21: kaynak listesinde sol sütun VIP olmayanlar, sağ sütun VIP'ler, alfabetik (KaynakSecici v1.3)
// v6.20: renkli çerçeveler 9 tuşu 2 sn basılı tutulunca kapanır/açılır (CrmRaporu Cerceve)
// v6.19: arama kutusu aşama çerçevesiyle aynı genişlikte; Günlük Aktivite, Dataları Ele Al butonunun altında (aşama satırının sağında)
// v6.18: arama kutusu veri kaynağı kutusuyla aynı genişlikte, solda; Günlük Aktivite sağında
// v6.17: diğer sekmelerdeki yükleme yazıları da "CRM'den ... Alınıyor..."
// v6.16: yükleme yazısı "CRM'den Datalar Alınıyor..."
// v6.15: rapor yüklenirken kartlar (içinde dönen halka) ve liste başlığı (Günlük Aktivite, arama, butonlar) ekranda; "alınıyor" yazısı listenin yerinde
// v6.14: arama kutusu yazısı "Data Ara: Ad / Telefon / Mail / ID"
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
import { gunOnceYazi, gunSayisi } from "../lib/gunOnce";
import Hatirlat from "./Hatirlat";
import Ipucu from "./Ipucu";
import { KAYNAKLAR, KYLAS_LEAD_URL, apiCagir, tarih, kucuk, NotBalonu, kisileriYukle, c, Cerceve, TUM_KAYNAKLAR, kaynakFiltresi } from "./CrmRaporu";

export const AKTIVITE_SURUM = "v6.38"; // 1. satırdaki sürümle aynı tut (sayfanın altındaki etikette görünür)

const ASAMA_ADLARI = { 217285: "Yeni", 222366: "Na1", 253357: "Na2", 253358: "Na3", 218701: "Görüşme", 218702: "İlgili" };
const ILGILI = 218702;
const ASAMA_SIRASI = [217285, 222366, 253357, 253358, 218701, 218702];
const SAYFA_BOYLARI = [10, 20, 30, 50];

// Üzerine gelince görünen açıklamalar
const ACIKLAMA = {
  acik: "• Yeni, Na1, Na2, Na3, Görüşme ve İlgili aşamalarındaki tüm datalar\n• Yeni datalar takipsiz sayılmaz\n• Tıklayınca aşağıda listelenir.",
  taskBeklenen: "Task'ı zorunlu olan datalar:\n• İlgili aşamasındaki tüm datalar\n• VIP kaynaklı Görüşme datası\n• Tıklayınca aşağıda listelenir.",
  bugunTask: "• Tüm açık datalardan sıradaki task'ının tarihi bugün olanlar (saati geçmiş olsa da)\n• Tıklayınca aşağıda listelenir.",
  ileriTask: "• Task zorunlu datalardan (İlgili + VIP Görüşme)\n• İleri tarihli task'ı olanlar\n• Tıklayınca aşağıda listelenir.",
  gecikmisTask: "• Task zorunlu datalardan (İlgili + VIP Görüşme)\n• Task tarihi geçmiş olanlar\n• Tıklayınca aşağıda listelenir.",
  takipOrani: "• Takip edilmesi gereken datalardan takipsiz olmayanların payı\n• Takip edilmesi gereken: Yeni ve VIP olmayan Na1-Na3 dışındaki açık datalar\n• Son etkinlik filtresi seçiliyse süzülmüş datadan hesaplanır\n• Tıklayınca takip edilmesi gereken datalar listelenir.",
  takipsiz: g => (g
    ? `Takipsiz sayılanlar:\n• Task tarihi geçmiş datalar\n• İlgili ve VIP Görüşme'de task'ı olmayanlar\n• VIP Na1-Na3 ve VIP olmayan Görüşme'de task'ı olmayan ve son etkinliği ${g} günden eski olanlar\n• Na1-Na3'te VIP olmayan kaynaklar ve Yeni aşaması sayılmaz\n• Tıklayınca aşağıda listelenir.`
    : "Takipsiz sayılanlar:\n• Task'ı olmayan her açık data (son etkinliğe bakılmaz)\n• Task tarihi geçmiş datalar\n• Na1-Na3'te VIP olmayan kaynaklar ve Yeni aşaması sayılmaz\n• Tıklayınca aşağıda listelenir."),
  sonEtkinlik: "Son etkinliği seçilen aralıkta olan datalar gösterilir (tüm kartlar ve liste):\n• 7-14 gün önce\n• 14-30 gün önce\n• 30 günden eski: 30 gün ve daha eski hepsi\n• N günden eski: N gün ve daha eski hepsi\nTümü: son etkinliğe bakılmaz.",
  sonAktivite: "Kylas'taki son etkinlik tarihi (Latest Activity On). Otomasyon güncellemeleriyle de değişir, not girilince değişmez.",
  taskZorunlu: "İlgili ya da VIP Görüşme datası: task zorunlu ama task yok.",
  karsilastirma: "Satıra tıklayınca aşağıdaki liste o danışmana süzülür, tekrar tıklayınca süzme kalkar.",
  coklu: "Birden fazla seçilebilir.",
  vip: "Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci, Setrow Marketing. Tekrar tıklayınca VIP filtresi kalkar.",
};

// Kişiye özel açılış kaynağı (e-posta -> kaynak id'leri). Sadece ilk seçim, kişi sonra değiştirebilir.
const ACILIS_KAYNAKLARI = { "berat@bilimevi.com": [2614515] }; // Instagram DM
export const acilisKaynaklari = user => ACILIS_KAYNAKLARI[kucuk(user?.email)] || TUM_KAYNAKLAR;

// Reklam Adı sadece reklamdan gelen kaynaklarda anlamlı (Instagram DM reklam değil)
const REKLAM_KAYNAKLARI = [2675584, 2674021]; // Instagram, Facebook
const reklamli = l => REKLAM_KAYNAKLARI.includes(l.kaynak);

// Son aktivite rengi: 0 gün turuncu, 90 gün ve üstü koyu kırmızı; arası doğrusal geçiş, eskidikçe kalınlaşır
const ESKI_GUN = 90;
const sonAktiviteStili = v => {
  const o = Math.min(Math.max(gunSayisi(v), 0), ESKI_GUN) / ESKI_GUN;
  return { color: `hsl(${Math.round(25 - 25 * o)}, ${Math.round(90 - 15 * o)}%, ${Math.round(45 - 15 * o)}%)`, fontWeight: o >= 0.5 ? 800 : o >= 0.15 ? 700 : 600 };
};

// Task tarihi bugün mü (İstanbul günü)
const istGun = v => new Date(new Date(v).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
const bugunTaskli = l => !!l.sonrakiTask && istGun(l.sonrakiTask) === istGun(Date.now());
const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const zm = v => (v ? new Date(v).getTime() : 0);
const sonEtkinlikSirasi = (a, b) => zm(a.sonAktivite) - zm(b.sonAktivite);
const taskSirasi = (a, b) => (a.sonrakiTask ? 1 : 0) - (b.sonrakiTask ? 1 : 0) || zm(a.sonrakiTask) - zm(b.sonrakiTask) || sonEtkinlikSirasi(a, b);
// Kartlara tıklanınca altta açılan listeler (sunucunun "acik" listesinden süzülür)
const GORUNUMLER = {
  acik: { ad: "Açık Datalar", suz: () => true, sirala: sonEtkinlikSirasi },
  taskBeklenen: { ad: "Task beklenen Datalar", suz: l => l.zorunlu, sirala: taskSirasi },
  bugun: { ad: "Task tarihi bugün olan Datalar", suz: bugunTaskli, sirala: taskSirasi },
  ileri: { ad: "İleri tarihli task'lı Datalar", suz: l => l.zorunlu && l.taskTur === "ileri", sirala: taskSirasi },
  gecikmis: { ad: "Gecikmiş task'lı Datalar", suz: l => l.zorunlu && l.taskTur === "gecikmis", sirala: taskSirasi },
  takipsiz: { ad: "Takipsiz Datalar", suz: l => l.takipsiz, sirala: sonEtkinlikSirasi },
  kapsam: { ad: "Takip edilmesi gereken Datalar", suz: l => l.kapsam, sirala: sonEtkinlikSirasi },
};
// Takip oranı: takip edilmesi gereken datalardan takipsiz olmayanların payı; küme boşsa null ("-")
const oranHesap = d => (d.kapsam ? Math.round(((d.kapsam - d.takipsiz) / d.kapsam) * 100) : null);

const TUM_DANISMANLAR = "tumu"; // sadece admin: danışman listesinde herkesi seçer

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
  const [kaynaklar, setKaynaklar] = useState(() => acilisKaynaklari(user)); // açılışta tüm kaynaklar (Berat: Instagram DM); boşsa da tüm kaynaklar
  const [kampanya, setKampanya] = useState(""); // Campaign Name içerir araması
  const [sayfaBoyu, setSayfaBoyu] = useState(20);
  const [sayfa, setSayfa] = useState(1);
  const [gorunum, setGorunum] = useState("takipsiz"); // GORUNUMLER anahtarı: acik | taskBeklenen | ileri | gecikmis | takipsiz
  const notOnbellek = useRef({});
  const [hatirlat, setHatirlat] = useState(null); // açık Hatırlat penceresi: { anahtar, govde, baslik }
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
    else if (!isAdmin && !isManager) setDanismanlar([secilebilir[0].id]);
  }, [kisiler]);
  // Şube değişince görünmeyen danışmanlar seçimden düşer
  const secilebilirAnahtar = secilebilir.map(k => k.id).join(",");
  useEffect(() => {
    if (!kisiler) return;
    setDanismanlar(s => s.filter(id => secilebilir.some(k => k.id === id)));
  }, [secilebilirAnahtar]);
  // Staff kendi datasını tüm satış ekibinden birine aktarabilir (kendisi hariç)
  const hedefler = (isAdmin || isManager ? secilebilir : satisci.filter(k => !secilebilir.some(b => b.id === k.id))).map(k => ({ ...k, id: Number(k.id) }))
    .sort((a, b) => (a.sube || "").localeCompare(b.sube || "", "tr") || a.ad.localeCompare(b.ad, "tr"));
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
    ? Object.entries(rapor.danismanlar).map(([id, d]) => ({ id, ad: kisiAdi(id), ...d, oran: oranHesap(d) }))
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

  // Toplu hatırlatma: ekrandaki liste (kart + aşama) tek mesajda. Arama sunucuda tekrarlanamadığı için arama doluyken pasif.
  const topluPasif = yukleniyor || arkaYukleniyor || aktarim || !!dataAra || !liste.length || !danismanlar.length;
  const topluAc = () => setHatirlat({ anahtar: `t${Date.now()}`, baslik: coklu ? "Danışmanlara Toplu Hatırlat" : "Danışmana Toplu Hatırlat", govde: {
    islem: "topluHatirlat", ownerId: Number(danismanlar[0]), ...(coklu ? { ownerIds: danismanlar.map(Number) } : {}), sessizGun, kaynaklar: kaynakFiltresi(kaynaklar), kampanya, gorunum, asamalar: asamaSecim } });

  // Sayfalama: filtre, sayfa boyu ya da rapor değişince ilk sayfaya dön
  useEffect(() => { setSayfa(1); }, [asamaSecim, sayfaBoyu, rapor, gorunum, listeSahip, dataAra]);
  // Kart ya da listedeki danışman değişince Data araması sıfırlanır
  useEffect(() => { setDataAra(""); }, [gorunum, listeSahip]);
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / sayfaBoyu));
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi);
  const reklamSutunu = liste.some(reklamli); // tüm listeye bakılır, sayfa değişince sütun oynamasın
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
  const takipOrani = o ? oranHesap(o) : null;

  return (
    <>
      <FiltreCubugu
        danisman={isAdmin || isManager ? {
          liste: isAdmin ? [{ id: TUM_DANISMANLAR, ad: "Tüm danışmanlar", sube: "Tümü" }, ...subeyeGore] : subeyeGore,
          secili: isAdmin && coklu ? [TUM_DANISMANLAR] : danismanlar,
          onChange: ids => setDanismanlar(ids[0] === TUM_DANISMANLAR ? secilebilir.map(k => k.id) : ids),
          tekli: true, yukleniyor: !kisiler && !kisiHata } : null}
        kaynak={{ secili: kaynaklar, onChange: setKaynaklar }}
        tarih={{ deger: sessizGun || null, onChange: v => setSessizGun(v === null ? 0 : v), metin: g => (g === 7 ? "7-14 gün önce" : g === 14 ? "14-30 gün önce" : `${g} günden eski`), nMetni: "N günden eski",
          bosMetin: "Son Etkinlik", ipucu: `Son Etkinlik Tarihi: ${ACIKLAMA.sonEtkinlik}` }} />

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {kisiler && !danismanlar.length && (
        <div style={t.uyari}>
          <span style={t.uyariIkon}>!</span>
          <span><b>Danışman seçin.</b> Raporu görmek için yukarıdan bir ya da birden fazla danışman seçin{isAdmin ? ", ya da önce şube seçip Tümünü seç'e basın" : ""}.</span>
        </div>
      )}
      {danismanlar.length > 0 && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {danismanlar.length > 0 && (yukleniyor || (!hata && rapor)) && (
        <>
          <div style={t.kartlar}>
            <Kart sayi={yukleniyor ? DONEN : o.toplam} etiket="Açık Data" ipucu={ACIKLAMA.acik} renk="#0e7490" cerceve="#a5f3fc"
              secili={gorunum === "acik"} onClick={() => setGorunum("acik")} />
            <Kart sayi={yukleniyor ? DONEN : (rapor?.acik || []).filter(bugunTaskli).length} etiket="Task tarihi bugün" ipucu={ACIKLAMA.bugunTask} renk="#1d4ed8" zemin="#eff6ff" cerceve="#93c5fd"
              secili={gorunum === "bugun"} onClick={() => setGorunum("bugun")} />
            <Kart sayi={yukleniyor ? DONEN : o.ileriTask} etiket="İleri tarihli task" ipucu={ACIKLAMA.ileriTask} renk="#166534" zemin="#f0fdf4" cerceve="#86efac"
              secili={gorunum === "ileri"} onClick={() => setGorunum("ileri")} />
            <Kart sayi={yukleniyor ? DONEN : o.gecikmisTask} etiket="Gecikmiş task" ipucu={ACIKLAMA.gecikmisTask} renk="#92400e" zemin="#fffbeb" cerceve="#fde68a"
              secili={gorunum === "gecikmis"} onClick={() => setGorunum("gecikmis")} />
            <Kart sayi={yukleniyor ? DONEN : o.takipsiz} etiket="Takipsiz" ipucu={ACIKLAMA.takipsiz(sessizGun)} renk="#991b1b" zemin="#fef2f2" cerceve="#fca5a5"
              secili={gorunum === "takipsiz"} onClick={() => setGorunum("takipsiz")} />
            <Kart sayi={yukleniyor ? DONEN : takipOrani === null ? "-" : `%${takipOrani}`} etiket="Takip oranı" ipucu={ACIKLAMA.takipOrani} onClick={() => setGorunum("kapsam")} />
          </div>

          {!yukleniyor && coklu && karsilastirma.length > 0 && (
            <div style={{ ...c.tablo, marginBottom: "20px" }}>
              <div style={c.tabloBaslik}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}><Ipucu metin={ACIKLAMA.karsilastirma}>Danışman karşılaştırması</Ipucu> · {secimBasligi}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      <th style={{ ...c.th, textAlign: "left" }}>Danışman</th>
                      {[["Açık Data", ACIKLAMA.acik], ["Task beklenen", ACIKLAMA.taskBeklenen], ["İleri task", ACIKLAMA.ileriTask], ["Gecikmiş task", ACIKLAMA.gecikmisTask.split("\n• Tıklayınca")[0]], ["Takipsiz", ACIKLAMA.takipsiz(sessizGun).split("\n• Tıklayınca")[0]], ["Takip oranı", ACIKLAMA.takipOrani]].map(([b, a]) => <th key={b} style={c.th}><Ipucu metin={a.split("\n• Tıklayınca")[0]}>{b}</Ipucu></th>)}
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
                          <td style={{ ...c.td, fontWeight: 600 }}>{d.oran === null ? "-" : `%${d.oran}`}</td>
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
              <span style={{ ...t.dataAra, flex: "1 1 auto", minWidth: 0, boxSizing: "border-box" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                <input value={dataAra} onChange={e => setDataAra(e.target.value)} placeholder="Data Ara: Ad / Telefon / Mail / ID" maxLength={60}
                  aria-label="Listede Data ara" style={t.dataAraGirdi} />
                {dataAra && <button type="button" onClick={() => setDataAra("")} aria-label="Aramayı temizle" style={t.dataAraSil}>✕</button>}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {listeSahip && <button onClick={() => setListeSahip(null)} style={c.chip}>✕ Tüm seçili danışmanlar</button>}
                <EleAlDugmesi sayi={yukleniyor ? 0 : eleAlinacak.length} disabled={aktarim || yukleniyor} onClick={() => setEleAl(eleAlinacak)} />
              </span>
            </div>
            <div style={{ ...t.filtreler, alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
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
              <KampanyaAra deger={kampanya} onChange={v => { if (rapor) sessiz.current = true; setKampanya(v); }} />
              {isAdmin && (
                <button type="button" className="hatirlat-zil" style={{ ...t.hatirlat, ...t.topluZil, ...(topluPasif ? { opacity: 0.4, cursor: "default" } : null) }}
                  disabled={topluPasif} onClick={topluAc} aria-label={`Danışmana toplu hatırlat: ${liste.length} data`}
                  title={dataAra ? "Arama doluyken toplu hatırlatma gönderilemez" : liste.length ? `Danışmana ${liste.length} data için hatırlat` : "Listede data yok"}>
                  <ZilIkonu dolgu="#ddd6fe" />
                </button>
              )}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginLeft: "auto", alignSelf: "center", whiteSpace: "nowrap" }}>
                {(
                  <Ipucu metin="Bugün bu danışman adına açılan not sayısı (portaldan; bağlı danışmanlarda Kylas'ta kendi adına görünür). Gece 00:00'da sıfırlanır." isaret={false}>
                    <span>Günlük Aktivite: <span style={t.aktivite}>{aktivite ?? 0}</span></span>
                  </Ipucu>
                )}
              </span>
            </div>
            {yukleniyor ? <div style={c.bos}><span style={c.spinner} /> CRM'den Datalar Alınıyor...</div> : <>
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
                      {["Ad Soyad", ...(coklu ? ["Danışman"] : []), "Aşama", "Kaynak", ...(reklamSutunu ? ["Reklam Adı"] : [])].map(b => <th key={b} style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>{b}</th>)}
                      {taskSutunu && <th style={{ ...c.th, position: "sticky", top: 0 }}>Task tarihi</th>}
                      <th style={{ ...c.th, position: "sticky", top: 0 }}><Ipucu metin={ACIKLAMA.sonAktivite}>Son aktivite</Ipucu></th>
                      <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0 }}>Notlar</th>
                      {isAdmin && <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0 }}>Hatırlatma</th>}
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
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}><AdHucresi lead={l} /></td>
                          {coklu && <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{kisiAdi(l.ownerId)}</td>}
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap", fontWeight: l.asama === ILGILI ? 700 : 400, color: l.asama === ILGILI ? "#0e7490" : undefined }}>{ASAMA_ADLARI[l.asama] || ""}{l.zorunlu && <Ipucu metin={ACIKLAMA.taskZorunlu} isaret={false}><span style={t.zorunlu}>Task zorunlu</span></Ipucu>}</td>
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>
                            {kaynakAdi(l.kaynak)}
                            {VIP_KAYNAKLAR.includes(l.kaynak) && <span style={t.vip}>VIP</span>}
                          </td>
                          {reklamSutunu && (
                            <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>
                              {reklamli(l) && l.kampanya ? <KampanyaHucresi metin={l.kampanya} /> : <span style={{ color: "#cbd5e1" }}>·</span>}
                            </td>
                          )}
                          {taskSutunu && <TaskHucresi l={l} />}
                          <td style={{ ...c.td, whiteSpace: "nowrap" }}>
                            {l.sonAktivite ? <Ipucu metin={tarih(l.sonAktivite, true)} isaret={false}><span style={sonAktiviteStili(l.sonAktivite)}>{gunOnceYazi(l.sonAktivite)}</span></Ipucu>  : <span style={{ color: "hsl(0, 75%, 30%)", fontWeight: 800 }}>Hiç yok</span>}
                          </td>
                          <td style={{ ...c.td, textAlign: "center" }}><NotBalonu lead={l} onbellek={notOnbellek} /></td>
                          {isAdmin && (
                            <td style={{ ...c.td, textAlign: "center" }}>
                              <button type="button" onClick={() => setHatirlat({ anahtar: `d${l.id}`, govde: { islem: "hatirlat", leadId: l.id } })} disabled={aktarim} className="hatirlat-zil"
                                aria-label={`${l.ad || "Data"}: danışmana hatırlat`} title="Danışmana hatırlat" style={t.hatirlat}><ZilIkonu /></button>
                            </td>
                          )}
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
            </>}
          </div>
        </>
      )}
      {isAdmin && <style>{`@keyframes zilSalla { 20% { transform: rotate(14deg); } 40% { transform: rotate(-12deg); } 60% { transform: rotate(8deg); } 80% { transform: rotate(-4deg); } }
        .hatirlat-zil svg { transform-origin: 50% 10%; }
        .hatirlat-zil:hover:not(:disabled) svg { animation: zilSalla 0.6s ease-in-out; }
        @media (prefers-reduced-motion: reduce) { .hatirlat-zil:hover:not(:disabled) svg { animation: none; } }`}</style>}
      {hatirlat && <Hatirlat key={hatirlat.anahtar} govde={hatirlat.govde} baslik={hatirlat.baslik} onKapat={() => setHatirlat(null)} />}
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

// Ad Soyad hücresi: tıklayınca CRM; üzerine gelince yanında Data ID + kopyala (alttaki satırı örtmesin diye sağda açılır)
function AdHucresi({ lead }) {
  const [konum, setKonum] = useState(null);
  const [kopya, setKopya] = useState(null); // ok | hata
  const ref = useRef(null);
  const zamanlayici = useRef(null);
  useEffect(() => () => clearTimeout(zamanlayici.current), []);
  useEffect(() => {
    if (!konum) return;
    const kapat = () => setKonum(null);
    window.addEventListener("scroll", kapat, true); // sabit konumlu balon kaydırınca addan kopmasın
    return () => window.removeEventListener("scroll", kapat, true);
  }, [!!konum]);

  function ac() {
    clearTimeout(zamanlayici.current);
    if (konum) return;
    const r = ref.current.getBoundingClientRect();
    setKopya(null);
    setKonum({ left: Math.max(8, Math.min(r.right + 6, window.innerWidth - 220)), top: r.top + r.height / 2 });
  }
  const kapatGecikmeli = () => { zamanlayici.current = setTimeout(() => setKonum(null), 150); };
  async function kopyala() {
    try { await navigator.clipboard.writeText(String(lead.id)); setKopya("ok"); } catch { setKopya("hata"); }
  }

  return (
    <span onMouseEnter={ac} onMouseLeave={kapatGecikmeli} onFocus={ac}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setKonum(null); }}
      onKeyDown={e => { if (e.key === "Escape") setKonum(null); }}>
      <a ref={ref} href={KYLAS_LEAD_URL(lead.id)} target="_blank" rel="noopener noreferrer" style={t.adLink}>{lead.ad || "İsimsiz"}</a>
      {konum && (
        // mousedown engellenir: Safari'de düğmeye basınca link odağı kaybedip balonu kapatmasın
        <span style={{ ...t.idBalon, left: konum.left, top: konum.top }} onMouseDown={e => e.preventDefault()}>
          <span style={{ color: "#94a3b8" }}>ID</span>
          <span style={{ userSelect: "all" }}>{lead.id}</span>
          <button type="button" onClick={kopyala} aria-label="Data ID'yi kopyala" title="Kopyala" style={t.kopyala}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
              {kopya === "ok" ? <polyline points="20 6 9 17 4 12" /> : <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>}
            </svg>
          </button>
          {kopya && <span role="status" style={{ color: kopya === "ok" ? "#86efac" : "#fca5a5" }}>{kopya === "ok" ? "Kopyalandı" : "Kopyalanamadı"}</span>}
        </span>
      )}
    </span>
  );
}

// Çalan zil (reminder): üzerine gelince sallanır
function ZilIkonu({ dolgu = "#fde68a" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" fill={dolgu} />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" /><path d="M4 2C2.8 3.7 2 5.7 2 8" /><path d="M22 8c0-2.3-.8-4.3-2-6" />
    </svg>
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

// Kart içinde sayı yerine dönen halka (rapor yüklenirken)
const DONEN = <span style={{ display: "inline-block", width: "22px", height: "22px", border: "3px solid rgba(148,163,184,0.3)", borderTopColor: "currentColor",
  borderRadius: "50%", animation: "spin 0.8s linear infinite", verticalAlign: "middle" }} />;

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
  hatirlat: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "30px", height: "28px", padding: 0, borderRadius: "8px", border: "1.5px solid #fcd34d", background: "#fffbeb", color: "#b45309", cursor: "pointer" },
  topluZil: { width: "34px", height: "32px", borderRadius: "10px", border: "1.5px solid #c4b5fd", background: "#f5f3ff", color: "#6d28d9" },
  adLink: { color: "#0e7490", fontWeight: 600, textDecoration: "none" },
  idBalon: { position: "fixed", zIndex: 9999, transform: "translateY(-50%)", display: "inline-flex", alignItems: "center", gap: "7px", padding: "5px 7px 5px 11px", borderRadius: "10px", background: "#0f172a", color: "#f8fafc", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", boxShadow: "0 10px 28px rgba(15,23,42,0.28)", fontFamily: "'Sora', sans-serif" },
  kopyala: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", padding: 0, border: "none", borderRadius: "6px", background: "rgba(255,255,255,0.14)", color: "inherit", cursor: "pointer" },
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
