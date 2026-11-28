// v1.4: üst boşluk margin yerine padding (margin dış kutudan taşıp başlığın altında beyaz şerit bırakıyordu).
// v1.3: Sora yazı tipi bileşenin kendisinde yüklenir ve tüm sayfaya uygulanır (ana sayfa kartından açılan /etkinlik serif görünüyordu).
// v1.2: Kylas formunun içi de portal yazı tipinde (Sora).
// v1.1: Form gönderilince 1 sn sonra boş form yeniden yüklenir; sayaç her gönderimde 1 artar (tarayıcıda form başına saklanır).
// v1.0: CRM > Etkinlik sekmesi. Danışman kendi Kylas Lead Capture formunu görür, admin hepsini seçebilir.
// Formların danışman, okul, kaynak (Event) ve kampanya değerleri Kylas'ta formun gizli alanlarında durur.
// Yeni etkinlikte sadece ETKINLIK_FORMLARI listesini güncelleyin.
import { useEffect, useRef, useState } from "react";

export const ETKINLIK_SURUM = "v1.4";
export const ETKINLIK_ADI = "BBSE İzmir Kasım 2026";

// ad: Personel sekmesindeki Ad Soyad ile eşleşir.
export const ETKINLIK_FORMLARI = [
  { ad: "Sibel Özel", okul: "Institut Montana Switzerland", formId: "64840035-c411-4c41-af7c-bc446e336119" },
  { ad: "Rukiye Özdemir", okul: "ACS International School Cobham", formId: "afce4010-d43f-467e-ad57-8dcf5141cb23" },
  { ad: "Hüdan Şen", okul: "Taunton School", formId: "edcd1f77-f70b-49cd-b6e7-c40721d395c5" },
  { ad: "Uğurcan Eneç", okul: "Westbourne School", formId: "c44632a9-93d8-413d-bca7-73607c4541ec" },
  { ad: "Tevhide Döner", okul: "Kent College Canterbury", formId: "fe4f026c-8968-4fb2-9f54-f6d61b398507" },
  { ad: "Barış Gümüşlü", okul: "Inspired Education", formId: "4e6e8176-6f92-4513-ad6c-22b3e68af94d" },
  { ad: "Zeynep Çırak", okul: "CATS Global Schools", formId: "185edae8-961c-4eba-8d36-1b267798ae53" },
  { ad: "Nil Özer", okul: "Cowichan Valley School District", formId: "b06b61d1-77f9-43bd-85c3-de6af443e5d0" },
  { ad: "Evren Yılmaz", okul: "Dukes Education", formId: "433ca56b-bcf9-45fa-a968-1aa8ce360567" },
  { ad: "Nur Alpay", okul: "Nord Anglia Education", formId: "a1338267-6faa-4b9f-813e-ba655a0e19e0" },
];

const kucukHarf = v => String(v || "").trim().toLocaleLowerCase("tr-TR");
export const etkinlikFormuBul = ad => ETKINLIK_FORMLARI.find(f => kucukHarf(f.ad) === kucukHarf(ad)) || null;

// Kylas scripti yüklendiği anda #kl__form-container kutusunu arıyor.
// Bu yüzden kutu her form değişiminde sıfırdan kurulur, script de arkasından eklenir.
function KylasFormu({ formId }) {
  const kutu = useRef(null);
  useEffect(() => {
    const yer = kutu.current;
    if (!yer) return;
    yer.innerHTML = '<div id="kl__form-container"></div>';
    const s = document.createElement("script");
    s.src = "https://assets.kylas.io/lead-capture-forms/lcf.min.js";
    s.setAttribute("form-id", formId);
    yer.appendChild(s);
    return () => { yer.innerHTML = ""; };
  }, [formId]);
  return <div ref={kutu} />;
}

// Kylas scripti başarılı gönderimde document'a "onKylasFormSubmit" olayı yayınlar (lcf.min.js).
const sayacAnahtari = formId => `etkinlik-sayac-${formId}`;
const sayacOku = formId => Number(localStorage.getItem(sayacAnahtari(formId))) || 0;

export default function EtkinlikFormu({ user, isAdmin }) {
  const kendi = etkinlikFormuBul(user?.name);
  const [secili, setSecili] = useState(kendi?.formId || (isAdmin ? ETKINLIK_FORMLARI[0].formId : null));
  const form = ETKINLIK_FORMLARI.find(f => f.formId === secili);
  const [yenile, setYenile] = useState(0);
  const [sayac, setSayac] = useState(() => (secili ? sayacOku(secili) : 0));

  useEffect(() => { if (secili) setSayac(sayacOku(secili)); }, [secili]);

  useEffect(() => {
    if (!secili) return;
    let zamanlayici;
    const gonderildi = () => {
      const yeni = sayacOku(secili) + 1;
      localStorage.setItem(sayacAnahtari(secili), String(yeni));
      setSayac(yeni);
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => setYenile(n => n + 1), 1000);
    };
    document.addEventListener("onKylasFormSubmit", gonderildi);
    return () => { document.removeEventListener("onKylasFormSubmit", gonderildi); clearTimeout(zamanlayici); };
  }, [secili]);

  if (!form) return <div style={s.bos}>Bu etkinlikte sana atanmış bir form yok.</div>;

  return (
    <div style={s.sayfa}>
      <div style={s.ust}>
        <div>
          <div style={s.baslik}>{ETKINLIK_ADI}</div>
          <div style={s.alt}>{form.okul} · {form.ad}</div>
        </div>
        <div style={s.sayac} title="Bu tarayıcıdan bu formla gönderilen kayıt sayısı">
          <span style={s.sayacSayi}>{sayac}</span> kayıt gönderildi
        </div>
        {isAdmin && (
          <select value={secili} onChange={e => setSecili(e.target.value)} style={s.secim}>
            {ETKINLIK_FORMLARI.map(f => <option key={f.formId} value={f.formId}>{f.okul} ({f.ad})</option>)}
          </select>
        )}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap'); .etkinlik-kylas, .etkinlik-kylas * { font-family: 'Sora', sans-serif !important; }`}</style>
      <div style={s.kart} className="etkinlik-kylas">
        <KylasFormu key={`${form.formId}-${yenile}`} formId={form.formId} />
      </div>
    </div>
  );
}

const s = {
  sayfa: { fontFamily: "'Sora', sans-serif", maxWidth: 640, margin: "0 auto", padding: "24px 16px" },
  ust: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  baslik: { fontSize: 18, fontWeight: 700, color: "#0f172a" },
  alt: { fontSize: 13, color: "#64748b", marginTop: 2 },
  secim: { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, maxWidth: "100%" },
  sayac: { fontSize: 13, color: "#0f766e", background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 999, padding: "6px 12px" },
  sayacSayi: { fontWeight: 700, fontSize: 15 },
  kart: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 },
  bos: { textAlign: "center", color: "#64748b", padding: 40 },
};
