// v1.0 (BFT v133): TCMB günlük döviz kurları (today.xml), teklif PDF'indeki "TL karşılığı" satırı için.
// Tarayıcı TCMB'yi doğrudan okuyamaz (CORS), bu fonksiyon aracı olur. Herkese açık veri, oturum gerekmez.
// Kur: Döviz Satış (ForexSelling) / Unit. TCMB listesinde olmayan birimler (ör. NZD) dönmez; portal o sütunda TL yazmaz.
// Cevap: { tarih: "23.11.2026", bulten: "2026/220", kurlar: { USD: 50.6026, GBP: ..., ... } }
// Önbellek: Vercel CDN 1 saat (TCMB günde bir kez, 15:30'da yayınlar).

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");   // WordPress müşteri sayfaları da okur
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const r = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", { headers: { "User-Agent": "bilimevi-portal" } });
    if (!r.ok) throw new Error("TCMB " + r.status);
    const xml = await r.text();
    const tarih = (xml.match(/Tarih="([^"]+)"/) || [])[1] || "";
    const bulten = (xml.match(/Bulten_No="([^"]+)"/) || [])[1] || "";
    const kurlar = {};
    const blokRe = /<Currency[^>]*Kod="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/g;
    let m;
    while ((m = blokRe.exec(xml))) {
      const unit = parseFloat((m[2].match(/<Unit>([\d.]+)<\/Unit>/) || [])[1] || "1");
      const satis = parseFloat((m[2].match(/<ForexSelling>([\d.]+)<\/ForexSelling>/) || [])[1] || "");
      if (satis > 0 && unit > 0) kurlar[m[1]] = satis / unit;
    }
    if (!tarih || !Object.keys(kurlar).length) throw new Error("TCMB cevabı okunamadı");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ tarih, bulten, kurlar });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: String(e.message || e) });
  }
}
