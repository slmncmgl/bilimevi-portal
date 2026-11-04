// v1.0: Performans Analizi > CRM Raporu
// Seçilen veri kaynağındaki Bilimevi pipeline lead'lerini danışman x aşama olarak sayar.
// Kylas'tan sadece ownerId ve pipelineStage çekilir (isim, telefon, mail tarayıcıya gitmez), sadece sayılar döner.
// Girdi: { kaynak: <source id>, gun: 90 | null }  (gun boşsa tüm zamanlar)
import { oturumKontrol } from "./_oturum.js";

const PIPELINE_ID = 31227; // Bilimevi
const ASAMALAR = [
  { id: 217285, ad: "Yeni" },
  { id: 222366, ad: "Na1" },
  { id: 253357, ad: "Na2" },
  { id: 253358, ad: "Na3" },
  { id: 218701, ad: "Görüşme" },
  { id: 218702, ad: "İlgili" },
  { id: 217286, ad: "Yeni Kayıt" },
  { id: 217287, ad: "İlgisiz" },
  { id: 217288, ad: "Olumsuza Dönen" },
];
const SAYFA = 1000;
const KYLAS_LIMIT = 10000; // Kylas bir aramada en fazla 10.000 satır döndürür
const ONBELLEK_MS = 10 * 60 * 1000;
const onbellek = new Map(); // sıcak instance içinde 10 dk

function kural(field, operator, value, type = "long") {
  return { id: field, field, type, operator, value, group: false };
}

async function kylasAra(kurallar, page) {
  const r = await fetch(`https://api.kylas.io/v1/search/lead?page=${page}&size=${SAYFA}&sort=id,asc`, {
    method: "POST",
    headers: { "api-key": process.env.KYLAS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: ["id", "ownerId", "pipelineStage"], jsonRule: { condition: "AND", valid: true, rules: kurallar } }),
  });
  if (!r.ok) throw new Error(`Kylas araması başarısız (HTTP ${r.status})`);
  return r.json();
}

// Tüm sayfaları çeker (4'erli paralel). Toplam 10.000'i aşarsa null döner, çağıran parçalar.
async function hepsiniCek(kurallar) {
  const ilk = await kylasAra(kurallar, 0);
  const toplam = ilk.totalElements || 0;
  if (toplam > KYLAS_LIMIT) return null;
  const satirlar = [...(ilk.content || [])];
  const sayfaSayisi = Math.ceil(toplam / SAYFA);
  for (let p = 1; p < sayfaSayisi; p += 4) {
    const grup = [];
    for (let q = p; q < Math.min(p + 4, sayfaSayisi); q++) grup.push(kylasAra(kurallar, q));
    (await Promise.all(grup)).forEach(d => satirlar.push(...(d.content || [])));
  }
  return satirlar;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!oturumKontrol(req, res, "crm-rapor")) return;

  const kaynak = Number(req.body?.kaynak);
  const gun = req.body?.gun ? Number(req.body.gun) : null;
  if (!Number.isInteger(kaynak) || kaynak <= 0) return res.status(400).json({ error: "Geçerli bir veri kaynağı seçin." });
  if (gun !== null && (!Number.isInteger(gun) || gun < 1 || gun > 3650)) return res.status(400).json({ error: "Geçersiz gün aralığı." });

  const anahtar = `${kaynak}:${gun || "tumu"}`;
  const kayit = onbellek.get(anahtar);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_MS) return res.status(200).json(kayit.veri);

  const kurallar = [kural("source", "equal", kaynak), kural("pipeline", "equal", PIPELINE_ID)];
  if (gun) kurallar.push(kural("createdAt", "last_n_days", gun, "date"));

  try {
    let leadler = await hepsiniCek(kurallar);
    if (leadler === null) {
      // 10.000'i aşan kaynaklar aşama aşama çekilir
      leadler = [];
      for (const a of ASAMALAR) {
        const parca = await hepsiniCek([...kurallar, kural("pipelineStage", "equal", a.id)]);
        if (parca === null) return res.status(422).json({ error: `"${a.ad}" aşamasında 10.000'den fazla lead var, daha kısa bir tarih aralığı seçin.` });
        leadler.push(...parca);
      }
    }

    const danismanlar = {}; // ownerId -> { stageId: sayı }
    for (const l of leadler) {
      const o = String(l.ownerId ?? "yok");
      const st = String(l.pipelineStage ?? "yok");
      danismanlar[o] = danismanlar[o] || {};
      danismanlar[o][st] = (danismanlar[o][st] || 0) + 1;
    }

    const veri = { kaynak, gun, toplam: leadler.length, asamalar: ASAMALAR, danismanlar, guncellendi: new Date().toISOString() };
    onbellek.set(anahtar, { zaman: Date.now(), veri });
    return res.status(200).json(veri);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
