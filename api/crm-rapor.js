// v1.1: islem "liste" (hücreye tıklanınca lead listesi) ve "notlar" (lead'in son 3 notu) eklendi
// v1.0: Performans Analizi > CRM Raporu
// Seçilen veri kaynağındaki Bilimevi pipeline lead'lerini danışman x aşama olarak sayar.
// Kylas'tan sadece ownerId ve pipelineStage çekilir (isim, telefon, mail tarayıcıya gitmez), sadece sayılar döner.
// Girdi: { kaynak: <source id>, gun: 90 | null }  (gun boşsa tüm zamanlar)
//   islem "liste": + { ownerIds: [..], asama: <stage id> | null } -> lead listesi (en fazla LISTE_SINIR)
//   islem "notlar": { leadId, ownerId } -> son 3 not (HTML temizlenmiş düz metin)
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
const LISTE_SINIR = 1000;
const LISTE_ALANLARI = ["id", "firstName", "lastName", "ownerId", "pipelineStage", "createdAt", "latestActivityCreatedAt", "taskDueOn"];
const ONBELLEK_MS = 10 * 60 * 1000;
const onbellek = new Map(); // sıcak instance içinde 10 dk

function kural(field, operator, value, type = "long") {
  return { id: field, field, type, operator, value, group: false };
}

async function kylasAra(kurallar, page, alanlar = ["id", "ownerId", "pipelineStage"], sirala = "id,asc") {
  const r = await fetch(`https://api.kylas.io/v1/search/lead?page=${page}&size=${SAYFA}&sort=${sirala}`, {
    method: "POST",
    headers: { "api-key": process.env.KYLAS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: alanlar, jsonRule: { condition: "AND", valid: true, rules: kurallar } }),
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

function metneCevir(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p|li)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

async function notlar(req, res) {
  const leadId = Number(req.body?.leadId);
  const ownerId = Number(req.body?.ownerId);
  if (!Number.isInteger(leadId) || !Number.isInteger(ownerId)) return res.status(400).json({ error: "leadId ve ownerId gerekli." });
  // targetEntityOwnerId olmadan Kylas 400 döner
  const r = await fetch(`https://api.kylas.io/v1/notes/relation?targetEntityId=${leadId}&targetEntityType=LEAD&targetEntityOwnerId=${ownerId}&sort=createdAt,desc&page=0&size=3`, {
    headers: { "api-key": process.env.KYLAS_API_KEY, Accept: "application/json" },
  });
  if (!r.ok) return res.status(502).json({ error: `Notlar alınamadı (HTTP ${r.status})` });
  const d = await r.json();
  const isimler = d.metaData?.idNameStore?.createdBy || {};
  return res.status(200).json({
    toplam: d.totalElements || 0,
    notlar: (d.content || []).map(n => ({ tarih: new Date(n.createdAt).toISOString(), yazan: isimler[n.createdBy] || "", metin: metneCevir(n.description) })),
  });
}

async function liste(req, res, kurallar) {
  const ownerIds = (Array.isArray(req.body?.ownerIds) ? req.body.ownerIds : []).map(Number).filter(Number.isInteger);
  const asama = req.body?.asama ? Number(req.body.asama) : null;
  if (!ownerIds.length) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (asama !== null && !ASAMALAR.some(a => a.id === asama)) return res.status(400).json({ error: "Geçersiz aşama." });

  const k = [...kurallar, kural("ownerId", "in", ownerIds)];
  if (asama) k.push(kural("pipelineStage", "equal", asama));
  const d = await kylasAra(k, 0, LISTE_ALANLARI, "createdAt,desc");
  const leadler = (d.content || []).slice(0, LISTE_SINIR).map(l => ({
    id: l.id,
    ad: [l.firstName, l.lastName].filter(Boolean).join(" "),
    ownerId: l.ownerId,
    asama: l.pipelineStage,
    olusturma: l.createdAt || null,
    sonAktivite: l.latestActivityCreatedAt || null,
    sonrakiTask: l.taskDueOn || null,
  }));
  return res.status(200).json({ toplam: d.totalElements || 0, leadler });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!oturumKontrol(req, res, "crm-rapor")) return;

  if (req.body?.islem === "notlar") {
    try { return await notlar(req, res); } catch (err) { return res.status(502).json({ error: err.message }); }
  }

  const kaynak = Number(req.body?.kaynak);
  const gun = req.body?.gun ? Number(req.body.gun) : null;
  if (!Number.isInteger(kaynak) || kaynak <= 0) return res.status(400).json({ error: "Geçerli bir veri kaynağı seçin." });
  if (gun !== null && (!Number.isInteger(gun) || gun < 1 || gun > 3650)) return res.status(400).json({ error: "Geçersiz gün aralığı." });

  const kurallar = [kural("source", "equal", kaynak), kural("pipeline", "equal", PIPELINE_ID)];
  if (gun) kurallar.push(kural("createdAt", "last_n_days", gun, "date"));

  if (req.body?.islem === "liste") {
    try { return await liste(req, res, kurallar); } catch (err) { return res.status(502).json({ error: err.message }); }
  }

  const anahtar = `${kaynak}:${gun || "tumu"}`;
  const kayit = onbellek.get(anahtar);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_MS) return res.status(200).json(kayit.veri);

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
