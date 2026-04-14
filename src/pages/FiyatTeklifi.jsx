import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";

// NOT: index.html dosyanıza şu scripti eklemeyi unutmayın:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

const MASTER_ID = "1eDm6Fw2Z7OeagUXNj2dv63FJx1al8d-4ePXK8D3D2n8";

// ... (Buradaki parseCSV, fetchCSV, fetchNav, fetchCityData, calcFees, getPrice ve fmt fonksiyonlarını aynen koru) ...
// (Kodun kısalması için burayı geçiyorum, mevcut fonksiyonların kalsın)

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_BORDER = "#fed7aa";

const EC_LIVE = [
  { name:"EC Live Premium (5 gun/hafta)", hours:7.5, tiers:[{min:1,max:11,price:115},{min:12,max:23,price:100},{min:24,max:null,price:85}], currency:"EUR", minWeeks:1 },
  { name:"EC Live Standard (2 gun/hafta)", hours:3, tiers:[{min:1,max:11,price:55},{min:12,max:23,price:45},{min:24,max:null,price:35}], currency:"EUR", minWeeks:2 },
  { name:"EC Live English for Work", hours:3, tiers:[{min:1,max:11,price:80},{min:12,max:23,price:70},{min:24,max:null,price:60}], currency:"EUR", minWeeks:1 },
];

export default function FiyatTeklifi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState({ name:"Selman Çamoğlu", age:"38", gender:"Erkek" });
  const [destinations, setDestinations] = useState([]);
  const [cur, setCur] = useState(emptyDest());
  const [nav, setNav] = useState({ languages:[], countries:{}, citiesByLang:{}, brands:{}, schoolSheets:{} });
  const [navLoading, setNavLoading] = useState(true);

  // PDF OLUŞTURMA FONKSİYONU (YENİ SİSTEM)
  function generatePDF() {
    const element = document.getElementById('pdf-template');
    const html2pdf = window.html2pdf;

    if (!html2pdf) {
      alert("PDF kütüphanesi yüklenemedi. Lütfen index.html'e scripti eklediğinizden emin olun.");
      return;
    }

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `${student.name || 'teklif'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  }

  // Tarih formatlama yardımcıları (Şablon için)
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("tr-TR") : "-";

  // ... (Geri kalan useEffect ve Next/AddDest fonksiyonlarını aynen koru) ...

  return (
    <div style={S.root}>
      {/* MEVCUT UI KODLARI (Header, Steps, Main Body vb.) BURAYA GELECEK */}
      
      {/* ... (Senin mevcut return içindeki tüm görsel kısımlar) ... */}

      {/* --- GİZLİ PDF ŞABLONU (Sayfanın en altına ekle) --- */}
      <div style={{ display: 'none' }}>
        <div id="pdf-template" style={{ width: '210mm', color: '#0f172a', padding: '20px' }}>
          {destinations.map((d, i) => {
             const f = d.isOnline ? {reg:35,mat:30,currency:"EUR"} : calcFees(d.cityData?.fees||[], d.weeks);
             const cCost = getPrice(d.course, d.weeks);
             const aCost = d.acc ? d.acc.price * d.weeks : 0;
             const total = cCost + aCost + f.reg + (f.acc_placement || 0) + f.mat;
             const curSym = d.course?.currency || f.currency;

             return (
               <div key={i} style={{ pageBreakAfter: 'always', paddingBottom: '40px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Teklifinize neler dahil?</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{curSym}</div>
                  </div>
                  <div style={{ borderTop: '2px solid #000', marginBottom: '8px' }}></div>

                  {/* Hafta Vurgusu */}
                  <div style={{ color: '#4fb0e8', fontWeight: 'bold', fontSize: '18px', marginBottom: '20px' }}>
                    Hafta sayısı: {d.weeks}
                  </div>

                  {/* Tablo */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {/* Kurs Satırı */}
                      <tr>
                        <td style={{ fontWeight: 'bold', padding: '12px 0', borderBottom: '1px solid #e2e8f0', width: '30%' }}>Kurs</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                          {d.course?.name}
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{fmtDate(d.startDate)} tarihinde başlıyor</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                          {fmt(cCost, curSym)}
                        </td>
                      </tr>

                      {/* Konaklama Satırı */}
                      {d.acc && (
                        <tr>
                          <td style={{ fontWeight: 'bold', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>Konaklama</td>
                          <td style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                            {d.acc.name} ({d.acc.board})
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                            {fmt(aCost, curSym)}
                          </td>
                        </tr>
                      )}

                      {/* Ücretler (Kayıt, Materyal vb) */}
                      <tr>
                        <td style={{ fontWeight: 'bold', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>Diğer</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>Kayıt ve Materyal Ücretleri</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                          {fmt(f.reg + f.mat, curSym)}
                        </td>
                      </tr>

                      {/* Toplam Satırı */}
                      <tr>
                        <td colSpan="2" style={{ fontSize: '24px', fontWeight: 'bold', paddingTop: '20px' }}>Toplam Tutar {curSym}</td>
                        <td style={{ textAlign: 'right', fontSize: '24px', fontWeight: 'bold', paddingTop: '20px', color: ORANGE }}>
                          {fmt(total, curSym)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Buton (PDF Görseli İçin) */}
                  <div style={{ marginTop: '40px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', backgroundColor: '#4fb0e8', color: '#fff', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold' }}>
                      Şimdi rezervasyon yapın
                    </div>
                  </div>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}
