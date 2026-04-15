import React, { useState, useEffect } from 'react';
import { getExamResults } from '../services/sheets'; // sheets.js'deki fonksiyonu çağırıyoruz

const PerformansAnalizi = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        // AuthCallback veya LocalStorage üzerinden token'ı aldığını varsayıyorum
        const token = localStorage.getItem('google_access_token'); 
        
        const rows = await getExamResults(token);
        
        if (!rows || rows.length === 0) {
          setError("Veri bulunamadı.");
          setLoading(false);
          return;
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Sütun isimlerine göre indeksleri bul (E-tablo başlıklarınla eşleşmeli)
        const danismanIdx = headers.findIndex(h => h.includes("Danışman"));
        const puanIdx = headers.findIndex(h => h.includes("Puan"));

        const stats = dataRows.reduce((acc, row) => {
          const isim = row[danismanIdx]?.trim();
          const puanRaw = row[puanIdx];

          if (!isim || !puanRaw) return acc;

          // Puan formatı temizleme (Örn: "8 / 10" -> 80)
          let puan = 0;
          if (typeof puanRaw === 'string' && puanRaw.includes('/')) {
            const [alinan, toplam] = puanRaw.split('/').map(Number);
            puan = (alinan / toplam) * 100;
          } else {
            puan = parseFloat(puanRaw) || 0;
          }

          if (!acc[isim]) {
            acc[isim] = { count: 0, total: 0 };
          }

          acc[isim].count += 1;
          acc[isim].total += puan;
          return acc;
        }, {});

        const formattedData = Object.entries(stats).map(([name, s]) => ({
          name,
          quizCount: s.count,
          average: (s.total / s.count).toFixed(1)
        }));

        setData(formattedData);
      } catch (err) {
        setError("Veriler işlenirken bir hata oluştu.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Veriler analiz ediliyor...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Danışman Performans Analizi</h1>
        <p className="text-gray-500 text-sm mt-1">E-tablo verilerine göre anlık başarı takibi</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item) => (
          <div key={item.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-700">{item.name}</h3>
              <div className="px-3 py-1 bg-cyan-50 text-cyan-600 text-xs font-bold rounded-full">
                {item.quizCount} Quiz
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Başarı Ortalaması</span>
                  <span className="font-bold text-gray-800">%{item.average}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      item.average >= 80 ? 'bg-green-500' : 
                      item.average >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.average}%` }}
                  />
                </div>
              </div>
              
              <button className="w-full py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                Detaylı İncele
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformansAnalizi;
