# Testler

Hepsi Node ile, bağımlılık kurmadan çalışır. JSX'teki saf hesap fonksiyonları `vm` ile yüklenir, React ya da tarayıcı gerekmez.

- `test_v117.mjs`: v117 ücret muafiyeti (Oxford sahte verisi). Konaklamalı/konaklamasız, birleşen kayıt ücreti, olmayan hedef ad.
  `node tests/test_v117.mjs src/pages/FiyatTeklifi.jsx`
- `stgiles.mjs`: aynı kursa iki yüzde indirim (%30 + %5) toplanıyor mu.
  `node tests/stgiles.mjs src/pages/FiyatTeklifi.jsx`
- `ep_portal.mjs`: English Path gerçek sheet verisiyle teklif (Dubai, Malta, Dublin, Toronto). Portalın kendi `fetchCityData`'sını kullanır, CSV okuması stub'lanır.
  `node tests/ep_portal.mjs src/pages/FiyatTeklifi.jsx /yol/ep.json`
  `ep.json` repoda yok: okul sheet'ini xlsx indir, `courses`, `accommodation`, `fees`, `transfers`, `discounts` sekmelerini satır listesi olarak JSON'a çevir (tarihler `YYYY-MM-DD`, değerler string).
- `test_k3.cjs`: kampanya takip script'i (K3), sahte `SpreadsheetApp` ile, bugün 2026-10-16 sabit. Kırmızı boyama, "-" yazımı, günlük mail.
  `node tests/test_k3.cjs /yol/kampanya-takip-appscript.gs`
  `.gs` dosyası repoda yok, Apps Script editöründen kopyala.

Regresyon için aynı testi önceki sürümün dosyasıyla da çalıştır, farkın sadece hedeflenen yerde olduğunu gör.
