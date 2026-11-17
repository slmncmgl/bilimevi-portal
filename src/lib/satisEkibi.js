// v1.0: satış danışmanları listesi. Ekran (CrmRaporu.jsx kisileriYukle) ve sunucu (api/_yetki.js) buradan okur.
// ad: Personel sekmesindeki Ad Soyad ile eşleşir. sube: raporlarda görüneceği şube (Personel'deki şubenin yerine geçer).
// kylasId: sadece ID sekmesinde satırı olmayanlar için (ör. Özgür Koç). Ekip değişince bu listeyi güncelleyin.
export const SATIS_EKIBI = [
  { ad: "Pınar Aydın", sube: "Ankara" },
  { ad: "Bahriye Günsel", sube: "Ankara" },
  { ad: "Barış Gümüşlü", sube: "Kadıköy" },
  { ad: "Nil Özer", sube: "Kadıköy" },
  { ad: "Rukiye Özdemir", sube: "Kadıköy" },
  { ad: "Özgür Koç", sube: "Kadıköy", kylasId: 86752 },
  { ad: "Nur Alpay", sube: "İzmir" },
  { ad: "Sibel Özel", sube: "İzmir" },
  { ad: "Furkan Atalı", sube: "İzmir" },
  { ad: "Zeynep Çırak", sube: "Bahçeşehir" },
  { ad: "Uğurcan Eneç", sube: "Bahçeşehir" },
  { ad: "Mina Karimzadeh", sube: "Taksim" },
  { ad: "Tevhide Döner", sube: "Taksim" },
];

const kucukHarf = v => String(v || "").trim().toLocaleLowerCase("tr-TR");
export const satisBul = ad => SATIS_EKIBI.find(s => kucukHarf(s.ad) === kucukHarf(ad)) || null;
