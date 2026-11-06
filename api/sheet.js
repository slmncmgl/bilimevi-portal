// v1.0 (BFT v121): Google Sheets API v4 ile sekme okuma (staff fiyat teklifi portalı, şimdilik sadece master_index)
// Okul sheet'leri çoğunlukla Drive'da .xlsx dosyası; Sheets API onları okuyamaz, portal onları gviz ile okumaya devam eder.
// gviz/tq sheet'te açık olan filtreyi uyguluyordu: biri sheet'te filtre açınca portal sadece görünen satırları alıyordu.
// values.get filtreleri ve gizli satırları dikkate almaz, sekmenin tamamını döndürür.
//
// İstek: POST { sheetId, tab }  →  Cevap: { values: [[başlıklar...], [satır...], ...] }
// Değerler FORMATTED_VALUE: hücrede görünen metin, gviz CSV'nin verdiğiyle aynı (tarih ve fiyat okuma değişmez).
// Key Vercel env: GOOGLE_SHEETS_API_KEY (VITE_ ön eki YOK, tarayıcıya gitmez). Sadece Sheets API'ye kısıtlı olmalı.
// Sheet'ler "linke sahip herkes görüntüleyebilir" olmalı (gviz için de bu gerekiyordu).
// Key yoksa 503 döner; portal bu durumda eski gviz yoluna düşer.
import { oturumKontrol } from "./_oturum.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "no-store");

  const { sheetId, tab } = req.body || {};
  if (typeof sheetId !== "string" || !/^[A-Za-z0-9_-]{20,80}$/.test(sheetId)) {
    return res.status(400).json({ error: "sheetId geçersiz" });
  }
  if (typeof tab !== "string" || !tab.trim() || tab.length > 100) {
    return res.status(400).json({ error: "tab geçersiz" });
  }

  if (!oturumKontrol(req, res, "sheet")) return;

  const key = process.env.GOOGLE_SHEETS_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "GOOGLE_SHEETS_API_KEY tanımlı değil", kod: "key_yok" });
  }

  // Sekme adı tırnak içinde: boşluk ve özel karakterli adlar da çalışsın. İçteki ' iki kez yazılır.
  const range = `'${tab.replace(/'/g, "''")}'`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`
    + `?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS&key=${encodeURIComponent(key)}`;

  try {
    const r = await fetch(url);
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const mesaj = data?.error?.message || `HTTP ${r.status}`;
      // Olmayan sekme: 400 "Unable to parse range". Portal bunu "sekme yok" sayar (transfers/discounts opsiyonel).
      if (r.status === 400 && /parse range/i.test(mesaj)) {
        return res.status(404).json({ error: `Sekme bulunamadı: ${tab}`, kod: "tab_yok" });
      }
      console.warn(`[sheet] ${sheetId.slice(0, 6)}… / ${tab}: ${r.status} ${mesaj}`);
      return res.status(r.status === 429 ? 429 : 502).json({ error: mesaj, kod: "google_hata" });
    }
    return res.status(200).json({ values: data?.values || [] });
  } catch (err) {
    return res.status(502).json({ error: err.message, kod: "google_hata" });
  }
}
