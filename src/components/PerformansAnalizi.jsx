import React, { useState, useEffect } from 'react';

const PerformansAnalizi = () => {
  const [veriler, setVeriler] = useState([]);
  const [loading, setLoading] = useState(true);

  // E-tablo URL'niz (Cevaplar sekmesinin CSV olarak yayınlanmış hali)
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/1LAu1ji5sr-ZHrpAEZ4jALtHg_re7KcEaKZ0IHj9IEYY/export?format=csv&gid=0";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();
      
      // Basit bir CSV Parser (Virgül ayrımı)
      const rows = csvText.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Sütun indekslerini dinamik bulalım (Hata payını azaltır)
      const danismanIdx = headers.findIndex(h => h.toLowerCase().includes('danışman'));
      const puanIdx = headers.findIndex(h => h.toLowerCase().includes('puan'));
      const quizIdx = headers.findIndex(h => h.toLowerCase().includes('quiz'));

      const analiz = dataRows.reduce((acc, row) => {
        const isim = row[danismanIdx]?.trim();
        const puanRaw = row[puanIdx];

        if (!isim || !puanRaw) return acc;

        // Puanı normalize et (Örn: 80 veya 8/10 formatı için)
        let puan = 0;
        if (puanRaw.includes('/')) {
          const [alinan, toplam] = puanRaw.split('/').map(Number);
          puan = (alinan / toplam) * 100;
        } else {
          puan = parseFloat(puanRaw);
        }

        if (!acc[isim]) {
          acc[isim] = { sinavSayisi: 0, toplamPuan: 0 };
        }

        acc[isim].sinavSayisi += 1;
        acc[isim].toplamPuan += puan;
        return acc;
      }, {});

      // Objekti diziye çevirip state'e atalım
      const finalData = Object.entries(analiz).map(([isim, stats]) => ({
        isim,
        sinavSayisi: stats.sinavSayisi,
        ortalama: (stats.toplamPuan / stats.sinavSayisi).toFixed(1)
      }));

      setVeriler(finalData);
      setLoading(false);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Analiz verileri hazırlanıyor...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8 border-l-4 border-blue-600 pl-4">
          Performans Analizi
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {veriler.map((item) => (
            <div key={item.isim} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{item.isim}</h3>
                  <p className="text-sm text-gray-500 font-medium">Danışman</p>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  AKTİF
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Tamamlanan Quiz:</span>
                  <span className="font-semibold text-gray-900">{item.sinavSayisi}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Başarı Ortalaması:</span>
                    <span className={`font-bold ${item.ortalama >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                      %{item.ortalama}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.ortalama >= 70 ? 'bg-green-500' : 'bg-amber-500'}`} 
                      style={{ width: `${item.ortalama}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors">
                Detaylı Raporu Gör
              </button>
            </div>
          ))}
        </div>
        
        {/* İleride CRM API'si buraya eklenecek notu */}
        <div className="mt-12 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-sm text-center italic">
          Gelecekteki CRM Entegrasyonu için Hazır Yapı: API endpoint'inizi fetchData fonksiyonuna bağlamanız yeterlidir.
        </div>
      </div>
    </div>
  );
};

export default PerformansAnalizi;
