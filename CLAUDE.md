# Bilimevi Portal: Claude Code notları

Bu dosya koddan okunamayan şeyleri anlatır: kurallar, kararlar, tuzaklar, açık işler. Kod ile çelişirse kod doğrudur, bu dosyayı güncelle.

Son güncelleme: 19 Ekim 2026. Repo'daki BFT sürümü: `v117-ucret-muafiyeti-2026-10-15`.

## Kapsam

- Bu repo birden fazla staff aracı içeriyor (Dashboard, KatalogParse, KayitTakip, Anket, Bülten vb.). Bu notlar **fiyat teklifi portalı (BFT)** içindir: `src/pages/FiyatTeklifi.jsx`, `src/wp-main.jsx`, `vite.wp.config.js`, `.github/workflows/deploy-wp.yml`.
- Diğer sayfalara açık talep olmadan dokunma.
- BFT tek dosya, iki mod: staff (Vercel, login'li) ve customer (WordPress shortcode). Mod `window.BFT_CONFIG.mode` ile belirlenir.
- Canlı WordPress siteleri: ingilteredil.com, maltadil.com, almanyadil.com. 7-8 site daha planlı.

## Çalışma kuralları (kesin)

- **Önce mimariyi anlat, onay al, sonra kod yaz.** Opsiyonel bir ek için bile ayrıca sor. Kullanıcı onaysız kod istemiyor.
- Kullanıcı bir işi açıkça "yap" diye isterse kod yazılabilir, ama kapsamda karar gerektiren bir nokta varsa önce onu sor.
- Cevaplar Türkçe. Sohbette madde işaretli kısa bloklar: ana öneri kalın, alternatifler ayrı maddeler, gerekçe en sonda kısa paragraf.
- **Uzun tire (em dash) kullanma**, ne cevapta ne arayüz metninde. Virgül, iki nokta ya da ayrı cümle kullan.
- Arayüz metinleri çeviri kokmasın, gerçek bir Türkün söyleyeceği gibi yazılsın.
- Kod değişikliğini anlatırken silinen blok varsa `// SİL: [ne silindi]` ile işaretle. Yeni bir array/blok eskisinin yerine geçiyorsa eski tanım ve ona bağlı döngü birlikte silinir, ayrı ayrı değil.
- Büyük dosyayı baştan yazma, tamamını tekrar tekrar okuma. İlgili aralığı oku, hedefli değişiklik yap.
- **Geriye dönük uyumluluk her şeyden önce gelir.** Yeni bir sheet sütunu boşsa eski davranış birebir korunmalı. Her yeni özellikte "diğer okulları bozar mı" sorusunu cevapla.
- **JSX'e siteye özel kod yazılmaz.** Site farkı sadece shortcode parametreleri ve `BFT_CONFIG` ile gelir.
- Hata yaptıysan açıkça söyle. Kullanıcı geçmişte yanlış kılavuz ve yarım düzeltme yüzünden zarar gördü.
- Çalışan yapılandırmaya (özellikle `vite.wp.config.js`) gerekçesiz dokunma.

## Versiyon kuralı

- Her kod değişikliğinde sürüm yükselir, istisna yok.
- JSX: `FiyatTeklifi.jsx` 18. satır, `const BFT_BUILD_VERSION = "vNNN-kisa-aciklama-YYYY-MM-DD";`. Numara bir artar (v117 → v118). Bu değer tarayıcı konsoluna `[BFT] Build: ...` olarak yazılır ve `window.__BFT_VERSION`'da durur. Canlıda hangi sürümün çalıştığı buradan kontrol edilir.
- Bir numara tek bir işe verilir. v112'de aynı numara iki işe verilmişti, karışıklık çıktı.
- Apps Script'lerin kendi serisi var: teklif arşivi `A1, A2...` (`ARSIV_VERSION`), kampanya takip `K1, K2, K3...` (`TAKIP_VERSION`). Dosya başındaki başlık yorumunu da güncelle.
- Workflow dosyasının başında `# Workflow version: vX.Y` var, değiştirirsen yükselt.
- PHP plugin değişikliklerinde plugin sürüm numarası yükselir.

## Repo dışındaki parçalar

Bunlar GitHub'da **yok**, değişiklikleri kullanıcı elle uygular:

- **WordPress plugin `bilimevi-fiyat-teklifi`:** `bilimevi-fiyat-teklifi.php` (shortcode), `data-proxy.php` (`/wp-json/bilimevi/v1/data`), `kylas-lead.php` (`/wp-json/bilimevi/v1/lead`). Her siteye FTP/cPanel ile elle atılır.
- **Teklif arşivi Apps Script (`teklif-arsiv-appscript.gs`, A2):** ayrı, bağımsız Apps Script projesi, web app olarak deploy edilir. Portal `VITE_TEKLIF_ARSIV_URL` ile `/exec` adresine yazar. Drive'da `Oluşturulmuş Teklifler` klasörüne (ID kodda) danışman alt klasörleri açar. Drive API advanced service ekli olmalı.
- **Kampanya takip Apps Script (`kampanya-takip-appscript.gs`, K3):** `MASTER_INDEX` dosyasının (`1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8`) `school_registry` sekmesine yazar. Okul sheet'lerini `drive_link` üzerinden açıp `discounts` sekmelerini okur. Zaman tetikleyicili: tarama Pazartesi 02:00, kontrol her gün 09:00, mail `it@bilimevi.com`.
- **Login servisi:** ayrı Apps Script, staff girişi. Bu notlar kapsamında dokunulmadı.
- **Parse script'leri** (`atlas_2027.py`, `parse_common` vb.): ayrı bir sohbette yürüyor, bu repoda değil.
- Apps Script güncelleme yolu: dosyayı editöre yapıştır, kaydet.
  - Web app (arşiv): **kaydetmek canlıyı güncellemez.** Deploy → Manage deployments → kalem → Version: **New version** → Deploy. Sonra `/exec`'i aç, `{"version":"A2"}` gibi yanıtı gör.
  - Tetikleyicili script (kampanya): kaydetmek yeterli, tetikleyiciler son kaydedilen kodu çalıştırır. `kurulumTriggerlari()` sadece ilk kurulumda.
- Apps Script kodunun gerçek kaynağı editördeki kopyadır, sohbette teslim edilen dosya değil. Düzenlemeden önce kullanıcıdan editördeki güncel kodu iste.

## Deploy

### WordPress (customer modu): main'e push canlıya çıkarır

- `main`'e push (ya da Actions'ta elle `workflow_dispatch`) şunu yapar:
  1. `npm install`, sonra `npm run build:wp` (`vite.wp.config.js`, çıktı `dist-wp/`: `fiyat-teklifi.js`, `fiyat-teklifi.css`, logolar).
  2. `dist-wp/` içeriğini FTP ile ingilteredil ve maltadil'de `/public_html/wp-content/plugins/bilimevi-fiyat-teklifi/assets/` klasörüne atar.
- `dangerous-clean-slate: true`: hedef `assets/` klasörü her deploy'da **silinip yeniden yazılır.** O klasöre elle konan dosya bir sonraki push'ta kaybolur. Logo gibi dosyalar build'e girmeli (`copy-logos` listesinde sadece `ingilteredil_logo.png`, `Bilimevi_logo.jpg`, `bilimevi_logo.svg` var).
- ingilteredil adımında `continue-on-error: true`, maltadil son adım ve hata verirse workflow kırmızı olur. Bilinçli tercih.
- **almanyadil workflow'da yok.** Push ile güncellenmiyor. Şu an elle mi güncellendiği bilinmiyor, kullanıcıya sor. Elle yol: yerelde `npm run build:wp`, `dist-wp/` içeriğini almanyadil'in aynı plugin `assets/` klasörüne at.
- Matrix job denendi ve reddedildi (çift build, secret'lara dinamik erişim yok). Yeni site = workflow'a yeni bir adım + o siteye ait 3 FTP secret'ı (`FTP_SERVER_X`, `FTP_USER_X`, `FTP_PASSWORD_X`).
- **WordPress için preview/staging yok.** main'e giren her şey birkaç dakika içinde iki canlı sitede. Riskli işleri branch'te tut, main'e kullanıcı onayıyla al.
- Deploy sonrası kontrol: sitede konsolda `[BFT] Build:` sürümüne bak. Eski sürüm görünüyorsa LiteSpeed cache temizlenmeli.
- PHP plugin dosyaları bu akışa dahil değil, elle atılır.

### Vercel (staff modu)

- Staff portalı Vercel'de, `vercel.json` SPA rewrite ve `api/` serverless fonksiyonları (`auth.js`, `gemini.js`, `kylas.js`).
- Env: `VITE_MASTER_ID`, `VITE_TEKLIF_ARSIV_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_REDIRECT_URI`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `KYLAS_API_KEY`.
- **Teyit edilmedi:** Vercel'in Git entegrasyonuyla main'i otomatik production'a, diğer branch'leri preview'a çıkardığı varsayılıyor (Vercel varsayılanı). Kullanıcıdan teyit al, sonra bu satırı düzelt.

## Test

- **Her değişiklikten sonra esbuild bundle kontrolü** (syntax ve tanımsız referans yakalar):
  `npx esbuild src/pages/FiyatTeklifi.jsx --loader:.jsx=jsx --jsx=automatic --bundle --format=esm --external:react --external:react-dom --external:jspdf --external:libphonenumber-js --external:react-router-dom --external:../utils/sheets --external:../assets/Bilimevi_logo.jpg --outfile=/tmp/out.js`
- **Hesap mantığı Node'da test edilir:** JSX'ten `// Mode tespiti` ile `export default function FiyatTeklifi` arasındaki saf fonksiyonlar (artı `addWeeksToDate` ... `PdfTemplate` aralığı) `vm` ile yüklenir, örnek ya da gerçek sheet verisiyle çağrılır.
  - Gerçek veri: okul sheet'i xlsx olarak indirilir, sekmeler JSON'a çevrilir, `fetchCSVStaff` stub'lanıp portalın kendi `fetchCityData`'sı kullanılır. Böylece sheet okuma da test edilir.
  - Regresyon: aynı testi önceki sürümün dosyasında da koş, farkın sadece hedeflenen yerde olduğunu göster.
- Apps Script'ler `SpreadsheetApp`, `Utilities`, `Logger` sahte nesneleriyle Node'da test edilir, bugünün tarihi sabitlenir.
- Test script'leri `tests/` altında, kullanım `tests/README.md`'de. Okul verisi (xlsx/JSON) ve Apps Script dosyaları repoda yok, teste dışarıdan verilir.
- Sınırlar: esbuild minify/TDZ hatalarını yakalamaz. LiteSpeed gibi production'a özgü sorunlar sadece canlıda görünür. Mümkünse gerçek `npm run build:wp` de çalıştır.

## Veri sözleşmesi: kodda görünmeyen kurallar

- Veri Google Sheets'ten gelir. `master_index` tüm siteler ve Vercel için **ortak**, siteye özel master açılmaz. Ülke filtresi shortcode'daki `country` ile.
- Sadece `parse_status = approved` satırlar görünür.
- **Şema adını portal belirler.** Portal yeni sütun eklerse parse kuralları ona uyar. Parse sohbetinden gelen talepler `!!!` ile başlar, satır numaraları eski sürüme ait olabilir.
- Parse kuralı: broşürde olmayan rakam türetilmez (upgrade farkı, zincirleme indirim yüzdesi gibi). Gerekirse okula sorulur.
- **Parantez kuralı:** ücret adındaki parantez içi, o şehrin bir `place_name` ya da `accommodation_type` değerine **birebir** (normalize) eşitse ücret sadece o konaklamada eklenir. Eşleşmeyen parantez (`(Refundable)`, `(Mandatory)`) yok sayılır. Kısmi eşleşme yok, bilinçli karar: gevşetilirse kısa etiketler başka yerlere yanlışlıkla uyar.
- **`discount_type = percentage`** "indirim satırı" anlamına gelir, yüzde değil (karşılığı `fixed_package`). İndirimin türünü `value_type` belirler. Boş ya da farklı yazılırsa satır sessizce atlanır, büyük/küçük harf duyarlı.
- **Ücret muafiyeti (v117):** `applies_to = fee` satırının `target_name`'i fees sekmesindeki **ham** adla eşlenir (`_norm`), Türkçe gösterim adıyla değil. Birleşen ücretlerde (ör. Registration + Enrolment → "Kayıt Ücreti") sadece hedeflenen ham ücret düşer.
- **Aynı kursa birden fazla yüzde indirim uyarsa toplanır** (her biri tam kurs fiyatı üzerinden, %30 + %5 = %35). Zincirleme ya da "en yükseği" kuralı yok. Tek istisna: `per_week_price` promo varsa yüzdeli kurs indirimleri uygulanmaz.
- Paket dalında indirim uygulanmaz.
- Zorunlu ücret tarih filtresi yüzünden asla kaybolmaz (kesişen satır yoksa tarihsiz, o da yoksa son satır).
- Ücret adında Homestay/Residence/Apartment geçmesi o ücreti konaklama tipine bağlar. Bu yüzden adlandırma önemli (Atlas'ta "Homestay Winter Supplement", sadece "Winter Supplement" değil).

## Kodda görünmeyen kararlar

- `vite.wp.config.js`: `minify: false` ve `inlineDynamicImports: true` bilinçli. ~29 KB gzip farkı kararlılık için kabul edildi.
- jsPDF CDN'den runtime'da yüklenir, PDF native API ile koordinatlı çizilir (HTML'den PDF değil). `PdfTemplate` bileşeni büyük ihtimalle ölü kod, silmeden önce kullanıcıya sor.
- `isOnline` bayrağı ve 35/30 EUR hardcode ücretler v109'dan beri ölü kod. Online kurslar sheet'te ülke "Online" olarak gelir.
- Staff ekranı orijinal (İngilizce) kurs adlarını, PDF ve customer modu Türkçe adları gösterir.
- Konaklama haftası kursu aşamaz (vize kuralı), istisna tatil haftası.
- PHP shortcode default'ları (`sub_source`, `country`, `site_logo`) bilerek boş. Her site shortcode'da açıkça yazmalı.
- Customer bundle'ında MASTER_ID, sheet URL'si ya da VITE izi olmamalı (doğrulandı). Staff/customer ayrımı istemci tarafında, bu yüzden customer build'ine gizli bilgi girmemeli.
- Kampanya takipte `-` "kampanya yok", kırmızı yazı "bugün ya da geçmişte bitti" demek. Portal süresi geçen indirimi zaten uygulamaz, takip sadece bilgilendirme.

## Bilinen tuzaklar

- `minify: true` yapma: canlıda React #31 / "Cannot access '_' before initialization" geri gelir. Kök neden 3 tur sonra DEBUG build ile bulundu.
- LiteSpeed Cache: BFT sayfasında **Guest Optimization ve JS Combine kapalı** olmalı, açılırsa portal kırılır. Lokal testte görünmez.
- Türkçe karşılaştırmada `toLocaleLowerCase("tr")` kullanma ("Intensive" → "ıntensive" olur). `_norm()` kullan.
- `fetchCityData` hata durumunda boş obje döndürmemeli, hata fırlatmalı. Boş dönerse kurs listesi kalıcı boş kalıyordu.
- Adım listesi dinamik: `setStep`'e sabit numara verme, adımı adıyla bul.
- Otomatik eşleşen paket ile elle seçilen paketi karıştırma (`paketOtomatik`).
- Ülke adı "UK" / "United Kingdom" farkı indirimleri sessizce bozmuştu, `normCountry()` kullan.
- Yedekten kurulan site eski sitenin `sub_source`'unu taşır (almanyadil maltadil yedeğinden kuruldu, lead'ler yanlış kaynağa gitti). Yeni sitede ilk iş shortcode parametrelerini kontrol et.
- Apps Script web app'te kaydetmek yetmez, New version ile deploy et. Arşivde tekrar eden paylaşım maillerinin sebebi buydu.
- `deploy-wp.yml` `assets/` klasörünü siliyor, oraya elle dosya koyma.
- Kampanya takip script'inde `SABIT_SUTUN` ile `school_registry`'nin gerçek düzeni uyuşmalı. Teslim edilen K3 dosyasında `SABIT_SUTUN = 4` (A-D korunur) yazıyor, ama 16 Ekim'deki sheet'te dinamik sütunlar D'den başlıyor (A-C sabit). Editördeki kopya farklı olabilir, düzenlemeden önce teyit et.
- Kullanıcıya kılavuz yazarken varsayım yapma, emin olmadığın yeri "teyit et" diye işaretle.

## Açık işler

### Karar bekleyen
- **v118, parantezli ücret adlarının çevirisi:** `Accommodation Placement Fee (VITA Student Residence)` → `Konaklama Ayarlama Ücreti (VITA Student Residence)`. Önerilen: `normalizeFeeName`'de tam ad bulunmazsa parantez öncesini haritada ara, parantezi koru, her parantez için genel kural. Bekleyen kararlar: (1) kapsam genel mi sadece konaklama mı, (2) `Accommodation Security Deposit` haritaya eklensin mi, `(Refundable)` → `(İade Edilir)`, `(Mandatory)` → `(Zorunlu)` sözlüğü olsun mu, (3) v117 muafiyet etiketindeki çift parantez (`... (VITA Student Residence) (Ücretsiz)`).
- **v117 sağlamlaştırma:** `discount_type` boşsa ve `applies_to` doluysa satırı indirim satırı say mı, yoksa sadece parse kuralına "zorunlu" maddesi mi eklensin.
- **English Path Toronto placement ücretleri:** parantezler (`Dream House`, `CASA`) `place_name`'lerle (`Dream House Village`, `Dream House Yorkville`, `CASA Residence`, `CASA Student House`) birebir eşleşmiyor, Residence seçilince iki placement birden ekleniyor (200 + 280). Önerilen çözüm sheet'te: her yer için ayrı satır, parantez = tam `place_name`.
- **St Giles Q4 Platinum Group:** %30 + %5 portalda %35 olarak toplanıyor. Okulun hesabı farklıysa (sadece %5 ya da zincirleme) parse tarafı ya da yeni portal kuralı gerekecek.
- **Kampanya takip `ONCEDEN_UYAR_GUN`:** şu an 0 (sadece bitiş günü). 7 önerildi, karar bekliyor. Haftalık tarama yüzünden hafta içi eklenip aynı hafta biten kampanya kaçabilir (K4 adayı: günlük tarama, tarihi boş kampanyaları maile ekleme).

### Yapılacak
- A2 arşiv script'inin deploy ve doğrulaması (Drive API v3 servisi + New version + `/exec` kontrolü). Yapıldı mı bilinmiyor, kullanıcıya sor.
- almanyadil'i `deploy-wp.yml`'a eklemek (secret'lar + adım) ve üç sitenin PHP plugin sürümünün aynı olduğunu doğrulamak.
- `fiyat-teklifi.css`'in her sitede enqueue edildiğinin kontrolü (Network sekmesi).
- `tests/` script'leri elle çalıştırılıyor. İleride `package.json`'a bir `test` komutu ve kalıcı bir sahte veri seti (fixture) eklenebilir.
- `calculation_type = per_day` ve `percentage`: şu an ikisi de sabit tutar gibi ekleniyor. Engel: kalış başı tavan (Malta eco tax vb.), sheet'te tavan sütunu yok. Yöntem netleşmeden yazılmayacak. English Path Dubai'de "Accommodation 2027 Booking Surcharge" %10 `percentage` olarak duruyor (opsiyonel).
- Paket + fazla haftalar (paket + kalan haftalar normal fiyat). Şimdilik hafta eşit değilse paket uygulanmıyor.
- Liverpool çıkış günü: accommodation'a `checkout_day` benzeri sütun (Liverpool Pazar giriş / Cumartesi çıkış, portal Pazar gösteriyor, fiyat etkilenmiyor).
- Yüksek sezon kısmi kesişim (kurs ve konaklama zammı başlangıç tarihine göre tüm haftalara uygulanıyor, paket zammı kesişimli). Bilinen sınırlama.
- Siteye özel buton stili: CSS değişkenleri (`--bft-btn-bg` vb.) `BFT_CONFIG` ya da shortcode üzerinden. JSX'e site kodu girmez.
- `SUB_SOURCE` fallback'i JSX'te `"ingilteredil"`: shortcode'da eksikse lead yanlış kaynağa gider (almanyadil olayının JSX tarafı). Boş bırakıp uyarı vermek daha güvenli olabilir, karar kullanıcıda.
- Otomatik supplement effect'i iki yerde (`accWeeks/tatilHafta` ve `holidayWeeks`) aynı state'i yazıyor. Çalışıyor ama sadeleştirme adayı.
- U18 otomatik ekleme adında "u18" geçen ilk ücreti alıyor. Yetişkin odaklı olunduğu için ertelendi.
- n8n WhatsApp bildirimi (kampanya takibi için), PDF mini galeri (kullanıcı görsel hazırlayacak). İkisi de park edildi.

### Parse tarafında bekleyen (bilgi için)
- `parse_common` v1.2: `simulate_fees` parantez kontrolü portalın `parantezKonaklamaUyar` mantığıyla aynı olacak (eşleşmeyen parantez yok sayılır). Konaklama kelime kuralı ve konaklamasız teklifte konaklama ücretlerinin düşmesi de simülasyonda olmalı.
- Atlas Malta paketlerini v116 alanlarıyla doldurmak, Atlas "Homestay Christmas Supplement" → "Homestay Winter Supplement", Toronto placement adları, "v115 sonrası compulsory" notlu satırlar.
- Oxford International sheet'i: fee muafiyet satırları `discount_type = percentage`, `applies_to = fee`, `target_name` = fees sekmesindeki ad birebir, `value_type = free`.

## Durum (19 Ekim 2026)

- **v117 push edildi.** Repo'daki `FiyatTeklifi.jsx`, sohbette teslim edilen v117 ile birebir aynı (commit 16 Ekim, "Update FiyatTeklifi.jsx"). Push otomatik deploy'u tetiklediği için ingilteredil ve maltadil'de v117 olmalı, almanyadil belirsiz.
- **v118 başlamadı**, sadece mimari önerildi (yukarıda).
- **Kampanya takip K3** 16 Ekim'de teslim edildi. Repoda değil. `school_registry`'deki `-` değerleri K3'ün en az bir kez çalıştığını gösteriyor, ama editördeki kopya teslim edilen dosyayla aynı olmayabilir (`SABIT_SUTUN` farkı, tuzaklar bölümü).
- **Teklif arşivi A2:** dosya hazır, canlı deploy edildi mi doğrulanmadı.
- Yarım kalmış kod değişikliği yok.
