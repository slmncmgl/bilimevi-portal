# Bilimevi Portal: Claude Code notları

Bu dosya koddan okunamayan şeyleri anlatır: kurallar, kararlar, tuzaklar, açık işler. Kod ile çelişirse kod doğrudur, bu dosyayı güncelle.

Son güncelleme: 6 Kasım 2026 (v122 elle indirim). Repo'daki BFT sürümü: `v122-elle-indirim-2026-11-06`.

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
- **Merge'leri Claude yönetir (kullanıcı kararı 02.11.2026).** Çözüm ve kapsam onayı kullanıcıda kalır: mimari anlatılır, onay alınır, PR test edilmiş olarak hazırlanır, merge'ü Claude yapar. main'e giden ve canlıyı değiştiren her merge'den sonra kullanıcıya `!!!` işaretli manuel kontrol listesi verilir: canlı sitede konsolda `[BFT] Build:` sürümü, gerekirse LiteSpeed cache temizliği, bir örnek teklifin tutar kontrolü.
- **Commit kimliği her zaman `Selman C. <it@bilimevi.com>`.** Başka bir ad ya da e-posta ile yapılan commit'lerin Vercel önizlemesi engellenir (Hobby plan). Commit'ten önce `git config user.name` / `user.email` değerini kontrol et ya da `git -c user.name="Selman C." -c user.email="it@bilimevi.com" commit ...` kullan.

## Versiyon kuralı

- Her kod değişikliğinde sürüm yükselir, istisna yok.
- JSX: `FiyatTeklifi.jsx` 18. satır, `const BFT_BUILD_VERSION = "vNNN-kisa-aciklama-YYYY-MM-DD";`. Numara bir artar (v117 → v118). Bu değer tarayıcı konsoluna `[BFT] Build: ...` olarak yazılır ve `window.__BFT_VERSION`'da durur. Canlıda hangi sürümün çalıştığı buradan kontrol edilir. v123'ten beri staff sayfasının en altında küçük puntoyla da görünür (`Fiyat Teklifi v123 · <commit>`, `BFT_SURUM_METNI`); kullanıcıya canlı kontrolde konsol değil bu etiket söylenir.
- Dashboard'un kendi serisi var: `src/pages/Dashboard.jsx` başındaki `// vX.Y:` notları ve aynı dosyadaki `const DASHBOARD_VERSION`. İkisi birlikte yükselir. Değer ana sayfanın en altında küçük puntoyla (Vercel commit kodu ile birlikte, ör. `Dashboard v1.8 · d19d176`) ve `window.__DASHBOARD_VERSION`'da görünür. Commit kodu `vite.config.js`'teki `__BUILD_SHA__` ile Vercel'in `VERCEL_GIT_COMMIT_SHA` değişkeninden gelir.
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
- **Sadece WordPress paketine giren dosyalar deploy eder (workflow v1.2, 1 Kasım 2026):** `paths` listesi `src/wp-main.jsx`, `src/pages/FiyatTeklifi.jsx`, `src/utils/**`, `src/config.js`, `src/assets/**`, `vite.wp.config.js`, `package.json`, `package-lock.json` ve workflow dosyasının kendisi. Bunların dışındaki değişiklikler (Dashboard, diğer sayfalar, md, api) WordPress deploy'unu tetiklemez. `workflow_dispatch` filtreden etkilenmez. v1.1'deki `paths-ignore` yüzünden her `src/` değişikliği (ör. Dashboard temaları) gereksiz FTP deploy'u yapıyordu.
  - Liste, WordPress bundle'ının import zincirine dayanıyor (esbuild metafile ile kontrol, 1 Kasım 2026: `wp-main.jsx` → `FiyatTeklifi.jsx` → `utils/sheets.js` → `config.js`, artı `assets/` logoları ve npm paketleri). **`FiyatTeklifi.jsx` ya da bu zincir listede olmayan bir dosyadan import ederse o dosya `paths`'e eklenmeli**, yoksa o dosyadaki değişiklik WordPress'e gitmez. Gerekirse Actions'tan elle `workflow_dispatch` ile deploy edilir.
- `dangerous-clean-slate: true`: hedef `assets/` klasörü her deploy'da **silinip yeniden yazılır.** O klasöre elle konan dosya bir sonraki push'ta kaybolur. Logo gibi dosyalar build'e girmeli (`copy-logos` listesinde sadece `ingilteredil_logo.png`, `Bilimevi_logo.jpg`, `bilimevi_logo.svg` var).
- ingilteredil adımında `continue-on-error: true`, maltadil son adım ve hata verirse workflow kırmızı olur. Bilinçli tercih.
- **almanyadil workflow'da yok.** Push ile güncellenmiyor. **Nasıl güncellendiğini kullanıcı da bilmiyor (20 Ekim 2026), sonra bakılacak.** Bakılana kadar almanyadil'deki sürümün repodakiyle aynı olduğunu varsayma. Elle yol: yerelde `npm run build:wp`, `dist-wp/` içeriğini almanyadil'in aynı plugin `assets/` klasörüne at.
- Matrix job denendi ve reddedildi (çift build, secret'lara dinamik erişim yok). Yeni site = workflow'a yeni bir adım + o siteye ait 3 FTP secret'ı (`FTP_SERVER_X`, `FTP_USER_X`, `FTP_PASSWORD_X`).
- **WordPress için preview/staging yok.** main'e giren her şey birkaç dakika içinde iki canlı sitede. Riskli işleri branch'te tut; merge'ü Claude yönetir ve merge sonrası `!!!` manuel kontrol listesi kullanıcıya gider (Çalışma kuralları).
- Deploy sonrası kontrol: sitede konsolda `[BFT] Build:` sürümüne bak. Eski sürüm görünüyorsa LiteSpeed cache temizlenmeli.
- PHP plugin dosyaları bu akışa dahil değil, elle atılır.

### Vercel (staff modu)

- Staff portalı Vercel'de, adres **`https://portal.bilimevi.com`** (30 Ekim 2026'dan beri; eskiden `bilimevi-portal.vercel.app`). BFT: `/fiyat-teklifi`. `vercel.json` SPA rewrite ve `api/` serverless fonksiyonları (`auth.js`, `gemini.js`, `kylas.js`).
- Env: `VITE_MASTER_ID`, `VITE_TEKLIF_ARSIV_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_REDIRECT_URI`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `KYLAS_API_KEY`, `GOOGLE_SHEETS_API_KEY` (v121, `api/sheet.js`; sadece Sheets API'ye kısıtlı key, `VITE_` ön eki yok).
- **Her dal için önizleme var:** `bilimevi-portal-git-<dal>-....vercel.app`. Staff tarafındaki değişiklikler merge'den önce bu adreste denenebilir. WordPress tarafının önizlemesi yok, o sadece main'den deploy olur.
- main'e her push'un staff portalını da canlıya çıkardığını varsay. WordPress'teki `paths-ignore` filtresi Vercel'i etkilemez; sadece md değişse de Vercel build alır. Bilerek dokunulmadı (kullanıcı kararı 20 Ekim 2026). İstenirse Vercel ayarlarındaki "Ignored Build Step" ile yapılır.
- **Hobby plan:** commit yazarı Vercel hesabının sahibi değilse deploy "Blocked" olur. Bu yüzden commit kimliği her zaman `Selman C. <it@bilimevi.com>` olmalı (bkz. Çalışma kuralları).
- `docs/claude-md` dalının commit'leri farklı kimlikle yapıldığı için önizlemesi engellendi. Sadece doküman ve test içerdiği için sorun değil.

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
- **Konaklama indirimi (v120, kullanıcı onayı 04.11.2026, LSI Portland 55 kampanyası):** `applies_to=accommodation` satırında üç yeni sütun, üçü de boşsa eski davranış birebir: `target_name` doluysa indirim sadece `place_name`'i ona eşit (_norm, tam eşitlik) konaklamaya; `exclude_start`/`exclude_end` aralığıyla kesişen konaklama haftaları indirim tabanından oransal düşer (`kesisenHafta`); `max_stay_end` doluysa ve konaklama bitişi ondan sonraysa satır uygulanmaz. Konaklama indiriminde `min_weeks`/`max_weeks` artık KONAKLAMA haftasına bakar (kurs haftasına değil; mevcut hiçbir okulda applies_to=accommodation satırı olmadığı için davranış değişikliği kimseyi etkilemiyor). Testler `tests/test_v120.mjs` (LSI a-e senaryoları + v119 regresyonu).
- **Elle indirim (v122, kullanıcı kararları 06.11.2026):** Staff Özet adımında her okul kartına bir elle indirim girebilir (`d.elleIndirim = { hedef: tuition|accommodation|total, tur: percentage|fixed, deger, not }`). `getDestinationTotals` sheet indirimlerinden sonra ekler (`elleIndirimSatiri`): yüzde seçilen kalemin tutarı üzerinden, `total` tabanı sheet indirimleri düşülmüş toplam; sabit tutar kalemi geçemez, %100 üstü kırpılır. Paket ve online tekliflerde yok. PDF/müşteri etiketi sheet indirimiyle aynı ("Kurs İndirimi (%10)", toplamda "İndirim (%10)"), staff "(elle, %10)" + not görür; not PDF'e girmez. PDF indirilince elle indirimli okullar `api/indirim-bildirim.js` → n8n "BFT Elle İndirim Bildirimi" (`Gs3D9DoYvXPcseMO`, webhook `bft-elle-indirim`, header kimliği "Portal → Sözleşme Gönder" = `N8N_PORTAL_TOKEN`, SMTP "IT Bilimevi") → it@bilimevi.com. Öğrenci kişisel verisi gönderilmez. Testler `tests/test_v122.mjs`.
- **Ücret adları (v119, kullanıcı kararları 02.11.2026):** `FEE_NAME_MAP` 7 okulun tüm fees adlarını + CAVILAM'ı kapsar (244 anahtar). Tam ad haritada yoksa yedek kural: parantez öncesi haritadaysa TR karşılığı + parantez; `(Refundable)` → `(iade edilir)`, `(Mandatory)`/`(non-EU)` atılır, bilinmeyen parantez olduğu gibi kalır (`normalizeFeeName`). **Staff ücretleri ham İngilizce görür** (birleşen satırlar `parcalar` ile açılır), müşteri modu ve PDF Türkçe görür; kurs/konaklama adlarındaki staff=orig kuralının ücret karşılığı. Muafiyet etiketi tek parantez: `indirimliAd` → "Konaklama Ayarlama Ücreti (VITA Student Residence, ücretsiz)"; staff'ta ham ad (`labelRaw`). Aynı TR ada çevrilen ücretler müşteri/PDF'te tek satırda birleşir (tutar toplamı değişmez).
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

- **gviz/tq sheet'te açık filtreyi uygular** (v121): `master_index`'te biri filtre açınca portal sadece görünen satırları alıyordu, okullar ve fiyatlar kayboluyordu. gviz ayrıca karışık tipli sütunlarda azınlık tipindeki değerleri boş döndürür (`parse_last_updated`'da görüldü). Staff `master_index` ve `city_description`'ı artık `api/sheet.js` (Sheets API v4, `FORMATTED_VALUE`) ile okur; key yoksa ya da API hata verirse gviz'e düşer ve konsola `[BFT] Sheets API okunamadı` yazar. **Okul sheet'leri bilerek gviz'de:** 29 onaylı okulun 23'ü Drive'da .xlsx dosyası, Sheets API onları okuyamıyor (6 Kasım 2026). Okul sheet'lerinde normal filtre açılmamalı. Customer modunda aynı düzeltme `data-proxy.php` v1.1'de (`BFT_SHEETS_KEY`); proxy 30 dk transient cache tuttuğu için filtreli bir okuma 30 dk boyunca kalıyordu.
- **Staff adresi değişirse `detectMode()` güncellenmeli.** `BFT_CONFIG.mode` yoksa mod `hostname`'den bulunur: `portal.bilimevi.com` (birebir), `vercel.app` ve `localhost` staff, gerisi customer. Listede olmayan bir staff adresinde portal sessizce customer moduna düşer ve veriyi `/wp-json` proxy'sinden okumaya çalışır. `.bilimevi.com` ile biten her adresi staff sayma, WordPress siteleri customer kalmalı. Aynı değişiklikte Vercel'deki `VITE_REDIRECT_URI` ve Google OAuth izinli adresleri de güncellenir (`Login.jsx`'teki yedek adres hâlâ eski Vercel adresi, env doluyken kullanılmaz).
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
- **v117 sağlamlaştırma:** `discount_type` boşsa ve `applies_to` doluysa satırı indirim satırı say mı, yoksa sadece parse kuralına "zorunlu" maddesi mi eklensin.
- **English Path Toronto placement ücretleri:** parantezler (`Dream House`, `CASA`) `place_name`'lerle (`Dream House Village`, `Dream House Yorkville`, `CASA Residence`, `CASA Student House`) birebir eşleşmiyor, Residence seçilince iki placement birden ekleniyor (200 + 280). Önerilen çözüm sheet'te: her yer için ayrı satır, parantez = tam `place_name`.
- **St Giles Q4 Platinum Group:** %30 + %5 portalda %35 olarak toplanıyor. Okulun hesabı farklıysa (sadece %5 ya da zincirleme) parse tarafı ya da yeni portal kuralı gerekecek.
- **Kampanya takip `ONCEDEN_UYAR_GUN`:** şu an 0 (sadece bitiş günü). 7 önerildi, karar bekliyor. Haftalık tarama yüzünden hafta içi eklenip aynı hafta biten kampanya kaçabilir (K4 adayı: günlük tarama, tarihi boş kampanyaları maile ekleme).

### Yapılacak
- A2 arşiv script'inin deploy ve doğrulaması (Drive API v3 servisi + New version + `/exec` kontrolü). Yapıldı mı bilinmiyor, kullanıcıya sor.
- almanyadil'in bugün nasıl güncellendiğine bakmak (sitede konsoldaki `[BFT] Build:` sürümü iyi bir başlangıç). Sonra `deploy-wp.yml`'a eklemek (secret'lar + adım) ve üç sitenin PHP plugin sürümünün aynı olduğunu doğrulamak.
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

## Durum (30 Ekim 2026)

- **v122 (6 Kasım):** elle indirim + mail bildirimi (veri sözleşmesi maddesi). Uçtan uca mail testi canlıda kullanıcıyla yapılacak.
- **v121 (6 Kasım):** staff `master_index` / `city_description` Sheets API ile (`api/sheet.js`). `GOOGLE_SHEETS_API_KEY` Vercel'e girilene kadar gviz yedeği çalışır. `data-proxy.php` v1.1 (6 Kasım) teslim edildi: `master` ve `city_description` Sheets API ile, key wp-config'de `BFT_SHEETS_KEY`, yoksa gviz. Sitelere atıldığı doğrulanmadı (ingilteredil, maltadil, almanyadil).
- **v118 push edildi (30 Ekim):** staff portalı `portal.bilimevi.com`'a taşındı, `detectMode()` bu adı staff sayar. Sadece bu satır ve sürüm değişti.
- **v117 push edildi.** Repo'daki `FiyatTeklifi.jsx`, sohbette teslim edilen v117 ile birebir aynı (commit 16 Ekim, "Update FiyatTeklifi.jsx"). Push otomatik deploy'u tetiklediği için ingilteredil ve maltadil'de v117 olmalı, almanyadil belirsiz.
- **v120 push edildi (4 Kasım):** hedefli konaklama indirimi (yukarıdaki veri sözleşmesi maddesi). Parse tarafı: `parse_common` discounts'a 3 sütun ekleyecek (koordinatörde), LSI scriptine kampanya satırlarını LSI oturumu ekleyecek.
- **v119 push edildi (2 Kasım):** Türkçe ücret adları (yukarıdaki veri sözleşmesi maddesi). Node testleri `tests/test_v119.mjs` (iki sürümle tutar regresyonu dahil); esbuild ve `npm run build:wp` temiz, customer bundle'da MASTER_ID izi main ile aynı (`void 0`).
- **Kampanya takip K3** 16 Ekim'de teslim edildi. Repoda değil. `school_registry`'deki `-` değerleri K3'ün en az bir kez çalıştığını gösteriyor, ama editördeki kopya teslim edilen dosyayla aynı olmayabilir (`SABIT_SUTUN` farkı, tuzaklar bölümü).
- **Teklif arşivi A2:** dosya hazır, canlı deploy edildi mi doğrulanmadı.
- Yarım kalmış kod değişikliği yok.
