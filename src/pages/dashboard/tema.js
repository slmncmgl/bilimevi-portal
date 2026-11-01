// Dashboard tema seçimi: klasik (varsayılan), bilet, kategori, kimlik.
// Seçim tarayıcıda saklanır (cihaz başına). ?tema=bilet gibi bir URL parametresi seçimi değiştirir.

export const TEMALAR = [
  { key: "klasik", tr: "Klasik", en: "Classic" },
  { key: "bilet", tr: "Bilet", en: "Ticket" },
  { key: "kategori", tr: "Menülü", en: "Sidebar" },
  { key: "kimlik", tr: "Kurumsal", en: "Corporate" },
];

const TEMA_ANAHTARI = "portal-dashboard-tema";
const gecerli = k => TEMALAR.some(t => t.key === k);

export function temaOku() {
  try {
    const url = new URLSearchParams(window.location.search).get("tema");
    if (gecerli(url)) {
      localStorage.setItem(TEMA_ANAHTARI, url);
      return url;
    }
    const kayitli = localStorage.getItem(TEMA_ANAHTARI);
    if (gecerli(kayitli)) return kayitli;
  } catch (e) {}
  return "klasik";
}

export function temaKaydet(key) {
  try { localStorage.setItem(TEMA_ANAHTARI, key); } catch (e) {}
}

// Departman grupları sadece yeni temalarda kullanılır. Burada olmayan bir modül "Diğer" grubuna düşer,
// yani MODULE_CONFIG'e yeni modül eklenince yeni temalarda kaybolmaz.
export const DEPARTMANLAR = [
  { key: "yonetim", tr: "Yönetim", en: "Management", moduller: ["performansanalizi", "anketraporu", "izin"] },
  { key: "satis", tr: "Satış", en: "Sales", moduller: ["fiyatteklifi", "stm", "instagram"] },
  { key: "kayit", tr: "Kayıt", en: "Registration", moduller: ["kayittakip", "kayitguncelle", "kayitformlinkleri"] },
  { key: "icerik", tr: "İçerik ve Eğitim", en: "Content and Training", moduller: ["katalogparse", "bulten", "quiz"] },
];

export function departmanlaraAyir(moduller) {
  const kalan = new Set(moduller.map(m => m.key));
  const gruplar = DEPARTMANLAR.map(d => {
    const mods = d.moduller.map(k => moduller.find(m => m.key === k)).filter(Boolean);
    mods.forEach(m => kalan.delete(m.key));
    return { ...d, mods };
  });
  const diger = moduller.filter(m => kalan.has(m.key));
  if (diger.length) gruplar.push({ key: "diger", tr: "Diğer", en: "Other", mods: diger });
  return gruplar.filter(g => g.mods.length);
}

export const YONETICI_ROLLERI = ["admin", "owner", "director", "manager"];
