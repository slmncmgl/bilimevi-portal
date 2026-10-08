// Operasyon Bildirimi v1.1 - "tarafından gönderildi" kaldırıldı, kategori başlıkları lacivert şerit
// Girdi: Webhook body { kayit: {...}, kaynak: "manuel" | "otomatik", gonderen }
// Personel CSV'sinden danışmanın şubesi ve maili bulunur, şubeye göre operasyon alıcısı seçilir.

// Şube -> operasyon alıcısı. Yeni şube eklemek için buraya satır ekle.
const OPERASYON_ALICILARI = [
  { sube: "kadikoy", alici: "Soner Bayraktar <soner@bilimevi.com>" },
];

// Düzenle ekranındaki sekmelerle aynı sıra ve alanlar (Özet hariç)
const KATEGORILER = {
  "Öğrenci": [
    "TC Kimlik No", "Öğrenci Adı Soyadı", "Öğrenci Doğum Tarihi", "Öğrencinin Cinsiyeti",
    "Öğrenci Mail Adresi", "Öğrenci Cep Telefonu",
    "Pasaportu Var Mı", "Pasaport Türü",
    "Pasaport Fotoğrafı", "TC Kimlik Fotoğrafı",
    "Türkiye'de Eğitim Aldığı Okul", "Sınıfı-Şubesi",
    "İkamet Adresi", "Yaşadığı Adres",
  ],
  "Sağlık": ["Alerji durumu", "Sürekli kullanılan ilaç", "Kronik hastalık"],
  "Ebeveyn": [
    "Anne Adı Soyadı", "Anne TC", "Anne Telefon", "Anne Mail",
    "Baba Adı Soyadı", "Baba TC", "Baba Telefon", "Baba Mail",
    "İmzalayacak Ebeveyn", "Ödeme Velisi",
    "Formu Dolduran Ebeveynin Adı", "Konsolosluğa verilecek mail kime ait",
  ],
  "Okul": [
    "Okul Adı", "Eğitim Dili", "Kalkış Şehri", "Öğrenci Hangi Gruba Kayıtlı",
    "Hedef Ülke", "Okul Lokasyonu", "Program Adı",
    "Program Başlangıç Tarihi", "Program Bitiş Tarihi",
    "Haftalık Ders Saati", "Kurs Süresi",
    "Hizmete Dahil Olacak Ek Hizmetler",
  ],
  "Konaklama": [
    "Konaklama Talebi", "Konaklama Tipi", "Oda Tipi",
    "Konaklama Süresi (Accommodation Duration)", "Yemek Planı",
    "Öğle Yemeği", "Vize Harcı Dahil Mi?",
  ],
  "Program Tercihleri": ["Hangi Ek Program", "Hangi Ek Gezi 1", "Hangi Ek Gezi 2", "Hangi Vize Hizmeti", "Hangi Konaklama"],
  "Taksit": [
    "Depozito Miktarı", "Para Birimi", "Program Ücreti", "Konaklama Ücreti",
    "Toplam Program Ücreti", "Taksit Sayısı",
    "Taksit Dönemi Tercihi", "Tercih Edilen Bankalar",
    ...Array.from({ length: 11 }, (_, i) => [`${i + 1}. Taksit Dönemi`, `${i + 1}. Taksit Tutarı`]).flat(),
  ],
  "Diğer": [
    "Şube Adı", "Danışman Adı", "Şirket Adı", "Sözleşme Türü",
    "Onay Durumu", "Tally Submission ID", "Kaynak Form Adı", "Eklenme Tarihi",
    "Miles & Smiles Üyelik Numarası", "Eklemek İstedikleriniz",
  ],
};

const ETIKETLER = {
  "Hangi Ek Program": "Program Seçimi",
  "Hangi Ek Gezi 1": "Gezi Katılımı-1",
  "Hangi Ek Gezi 2": "Gezi Katılımı-2",
  "Hangi Vize Hizmeti": "Vize Hizmeti Talebi",
  "Hangi Konaklama": "Konaklama Tercihi",
};

const SADE = v => String(v || "").toLocaleLowerCase("tr-TR")
  .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
  .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
  .replace(/\s+/g, " ").trim();

const esc = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// gviz CSV: tırnaklı alanlar, alan içinde virgül / satır sonu olabilir
function csvOku(metin) {
  const satirlar = []; let satir = [], alan = "", tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') { alan += '"'; i++; }
      else if (c === '"') tirnak = false;
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ",") { satir.push(alan); alan = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && metin[i + 1] === "\n") i++;
      satir.push(alan); satirlar.push(satir); satir = []; alan = "";
    } else alan += c;
  }
  if (alan || satir.length) { satir.push(alan); satirlar.push(satir); }
  const [baslik = [], ...veri] = satirlar;
  return veri.filter(r => r.some(Boolean))
    .map(r => Object.fromEntries(baslik.map((b, i) => [b.trim(), (r[i] || "").trim()])));
}

const body = $("Webhook").first().json.body || {};
const k = body.kayit || {};
const kaynak = body.kaynak === "otomatik" ? "otomatik" : "manuel";

const personel = csvOku(String($input.first().json.data || ""));
const danismanAdi = String(k["Danışman Adı"] || "").trim();
const danisman = personel.find(p => SADE(p["Ad Soyad"]) === SADE(danismanAdi));
const danismanMail = String(danisman?.["E-posta"] || "").trim();
const sube = danisman?.["Şube"] || k["Şube Adı"] || "";

const eslesme = OPERASYON_ALICILARI.find(o => SADE(sube).includes(o.sube));
if (!eslesme) {
  return [{ json: {
    ok: false, kaynak,
    msg: `${danismanAdi || "Danışman"} için operasyon alıcısı tanımlı değil (şube: ${sube || "bilinmiyor"})`,
  } }];
}

// Tablo
const taksitSayisi = parseInt(k["Taksit Sayısı"], 10) || 0;
const taksitNo = alan => { const m = alan.match(/^(\d+)\. Taksit/); return m ? +m[1] : 0; };
const linkMi = v => /^https?:\/\/\S+$/i.test(String(v).trim());

const hucreSol = "padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:600;width:40%;vertical-align:top;";
const hucreSag = "padding:8px 10px;border:1px solid #e2e8f0;color:#0f172a;vertical-align:top;word-break:break-word;";

let tablo = "";
for (const [kategori, alanlar] of Object.entries(KATEGORILER)) {
  const satirlar = alanlar
    .filter(a => !taksitNo(a) || taksitNo(a) <= taksitSayisi)
    .map(a => {
      const ham = k[a] == null ? "" : String(k[a]).trim();
      const deger = !ham ? "-"
        : linkMi(ham) ? `<a href="${esc(ham)}" style="color:#0891b2;">Görüntüle</a>`
        : esc(ham).replace(/\n/g, "<br>");
      return `<tr><td style="${hucreSol}">${esc(ETIKETLER[a] || a)}</td><td style="${hucreSag}">${deger}</td></tr>`;
    }).join("");
  tablo += `<tr><td colspan="2" style="height:14px;border:none;"></td></tr>`
    + `<tr><td colspan="2" style="padding:9px 12px;font-size:15px;font-weight:700;color:#ffffff;background:#1e3a5f;border:1px solid #1e3a5f;">${esc(kategori)}</td></tr>${satirlar}`;
}

const ogrenci = String(k["Öğrenci Adı Soyadı"] || "").trim() || "İsimsiz kayıt";
const okul = String(k["Okul Adı"] || "").trim();
const subject = `Kayıt Bilgileri: ${ogrenci}${okul ? " - " + okul : ""}`;

const giris = kaynak === "otomatik"
  ? `${esc(ogrenci)} için sözleşme onaylandı. Kayıt bilgileri aşağıda.`
  : `${esc(ogrenci)} için kayıt bilgileri aşağıda.`;

const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;max-width:680px;">
<p style="margin:0 0 12px;">Merhaba,</p>
<p style="margin:0 0 16px;">${giris}</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;width:100%;max-width:680px;font-size:14px;">${tablo}</table>
<p style="margin:16px 0 0;color:#64748b;font-size:12px;">Bilimevi Portal</p>
</div>`;

return [{ json: {
  ok: true, kaynak, subject, html,
  to: eslesme.alici,
  cc: danismanMail,
  msg: `Kayıt bilgileri operasyona gönderildi${danismanMail ? "" : " (danışman maili bulunamadı, CC eklenmedi)"}`,
} }];
