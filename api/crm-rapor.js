// v1.5: birden fazla veri kaynağı: { kaynaklar: [id, ..] } (eski tek "kaynak" da kabul edilir)
// v1.4: islem "takip" gecikmiş task'lı lead'leri de döndürür (gecikmis: en eski task önce)
// v1.3: sunucu tarafı rol kontrolü (api/_yetki.js): staff sadece kendi, manager kendi şubesinin lead'lerini alabilir.
//       Şimdilik izleme modunda: kural dışı istekler "[yetki]" önekiyle loglanır, geçer. CRM_YETKI_ENFORCE=1 ile zorunlu olur.
//       Zorunlu modda özet tablo da yetkiye göre süzülür; notlarda lead'in gerçek sahibi Kylas'tan kontrol edilir.
// v1.2: islem "takip" (Takip Raporu sekmesi): bir danışmanın aşama 2-6 lead'leri, task ve sessizlik durumu
// v1.1: islem "liste" (hücreye tıklanınca lead listesi) ve "notlar" (lead'in son 3 notu) eklendi
// v1.0: Performans Analizi > CRM Raporu
// Seçilen veri kaynağındaki Bilimevi pipeline lead'lerini danışman x aşama olarak sayar.
// Kylas'tan sadece ownerId ve pipelineStage çekilir (isim, telefon, mail tarayıcıya gitmez), sadece sayılar döner.
// Girdi: { kaynak: <source id>, gun: 90 | null }  (gun boşsa tüm zamanlar)
//   islem "liste": + { ownerIds: [..], asama: <stage id> | null } -> lead listesi (en fazla LISTE_SINIR)
//   islem "takip": { ownerId, sessizGun: 14 } -> özet + takipsiz lead'ler (task yok, son aktivite sessizGun'den eski)
//   islem "notlar": { leadId, ownerId } -> son 3 not (HTML temizlenmiş düz metin)
import { oturumKontrol } from "./_oturum.js";
import { yetkiBul, yetkiKontrol, zorunluMu } from "./_yetki.js";

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
async function hepsiniCek(kurallar, alanlar) {
  const ilk = await kylasAra(kurallar, 0, alanlar);
  const toplam = ilk.totalElements || 0;
  if (toplam > KYLAS_LIMIT) return null;
  const satirlar = [...(ilk.content || [])];
  const sayfaSayisi = Math.ceil(toplam / SAYFA);
  for (let p = 1; p < sayfaSayisi; p += 4) {
    const grup = [];
    for (let q = p; q < Math.min(p + 4, sayfaSayisi); q++) grup.push(kylasAra(kurallar, q, alanlar));
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

async function notlar(req, res, yetki) {
  const leadId = Number(req.body?.leadId);
  let ownerId = Number(req.body?.ownerId);
  if (!Number.isInteger(leadId) || !Number.isInteger(ownerId)) return res.status(400).json({ error: "leadId ve ownerId gerekli." });
  // Admin değilse istekteki ownerId'ye güvenilmez, lead'in gerçek sahibi Kylas'tan okunur
  if (yetki.tur !== "admin") {
    const d = await kylasAra([kural("id", "equal", leadId)], 0, ["id", "ownerId"]);
    const lead = (d.content || [])[0];
    if (!lead) return res.status(404).json({ error: "Lead bulunamadı." });
    ownerId = Number(lead.ownerId);
    if (!yetkiKontrol(yetki, [ownerId], res, "crm-rapor notlar")) return;
  }
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

// Takip edilmesi gereken açık aşamalar: Na1, Na2, Na3, Görüşme, İlgili
const TAKIP_ASAMALARI = [222366, 253357, 253358, 218701, 218702];

async function takip(req, res, yetki) {
  const ownerId = Number(req.body?.ownerId);
  const sessizGun = req.body?.sessizGun ? Number(req.body.sessizGun) : 14;
  if (!Number.isInteger(ownerId)) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (!Number.isInteger(sessizGun) || sessizGun < 1 || sessizGun > 365) return res.status(400).json({ error: "Geçersiz gün." });
  if (!yetkiKontrol(yetki, [ownerId], res, "crm-rapor takip")) return;

  const kurallar = [kural("ownerId", "equal", ownerId), kural("pipeline", "equal", PIPELINE_ID), kural("pipelineStage", "in", TAKIP_ASAMALARI)];
  const leadler = await hepsiniCek(kurallar, [...LISTE_ALANLARI, "source"]);
  if (leadler === null) return res.status(422).json({ error: "Bu danışmanda 10.000'den fazla açık lead var." });

  const simdi = Date.now();
  const sinir = simdi - sessizGun * 24 * 60 * 60 * 1000;
  const zaman = v => (v ? new Date(v).getTime() : null);
  const ozet = { toplam: leadler.length, ileriTask: 0, gecikmisTask: 0, taskYok: 0, takipsiz: 0 };
  const takipsiz = [];
  const gecikmis = [];
  const satir = l => ({
    id: l.id, ad: [l.firstName, l.lastName].filter(Boolean).join(" "), ownerId: l.ownerId, asama: l.pipelineStage, kaynak: l.source,
    olusturma: l.createdAt || null, sonAktivite: l.latestActivityCreatedAt || null, sonrakiTask: l.taskDueOn || null,
  });
  for (const l of leadler) {
    const task = zaman(l.taskDueOn);
    if (task && task >= simdi) ozet.ileriTask++;
    else if (task) { ozet.gecikmisTask++; gecikmis.push(satir(l)); }
    else ozet.taskYok++;
    const akt = zaman(l.latestActivityCreatedAt);
    if (!task && (!akt || akt < sinir)) {
      ozet.takipsiz++;
      takipsiz.push(satir(l));
    }
  }
  takipsiz.sort((a, b) => (zaman(a.sonAktivite) || 0) - (zaman(b.sonAktivite) || 0));
  gecikmis.sort((a, b) => zaman(a.sonrakiTask) - zaman(b.sonrakiTask));
  return res.status(200).json({ ozet, sessizGun, takipsiz, gecikmis, guncellendi: new Date().toISOString() });
}

async function liste(req, res, kurallar, yetki) {
  const ownerIds = (Array.isArray(req.body?.ownerIds) ? req.body.ownerIds : []).map(Number).filter(Number.isInteger);
  const asama = req.body?.asama ? Number(req.body.asama) : null;
  if (!ownerIds.length) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (!yetkiKontrol(yetki, ownerIds, res, "crm-rapor liste")) return;
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
  const yetki = await yetkiBul(req);

  if (req.body?.islem === "takip") {
    try { return await takip(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }
  if (req.body?.islem === "notlar") {
    try { return await notlar(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }

  const hamKaynaklar = Array.isArray(req.body?.kaynaklar) ? req.body.kaynaklar : [req.body?.kaynak];
  const kaynaklar = [...new Set(hamKaynaklar.map(Number))].filter(k => Number.isInteger(k) && k > 0).sort((a, b) => a - b);
  const gun = req.body?.gun ? Number(req.body.gun) : null;
  if (!kaynaklar.length || kaynaklar.length !== hamKaynaklar.length) return res.status(400).json({ error: "Geçerli bir veri kaynağı seçin." });
  if (kaynaklar.length > 30) return res.status(400).json({ error: "En fazla 30 kaynak seçilebilir." });
  if (gun !== null && (!Number.isInteger(gun) || gun < 1 || gun > 3650)) return res.status(400).json({ error: "Geçersiz gün aralığı." });

  const kurallar = [kaynaklar.length === 1 ? kural("source", "equal", kaynaklar[0]) : kural("source", "in", kaynaklar), kural("pipeline", "equal", PIPELINE_ID)];
  if (gun) kurallar.push(kural("createdAt", "last_n_days", gun, "date"));

  if (req.body?.islem === "liste") {
    try { return await liste(req, res, kurallar, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }

  // Zorunlu modda admin olmayan sadece görebildiği danışmanların satırlarını alır
  const suz = veri => {
    if (yetki.tur === "admin" || !zorunluMu()) return veri;
    const danismanlar = Object.fromEntries(Object.entries(veri.danismanlar).filter(([o]) => yetki.idler.has(Number(o))));
    const toplam = Object.values(danismanlar).reduce((a, s) => a + Object.values(s).reduce((x, y) => x + y, 0), 0);
    return { ...veri, danismanlar, toplam };
  };
  if (yetki.tur !== "admin" && !["manager", "staff"].includes(yetki.tur) && !yetkiKontrol(yetki, [], res, "crm-rapor özet")) return;

  const anahtar = `${kaynaklar.join(",")}:${gun || "tumu"}`;
  const kayit = onbellek.get(anahtar);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_MS) return res.status(200).json(suz(kayit.veri));

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

    const veri = { kaynaklar, gun, toplam: leadler.length, asamalar: ASAMALAR, danismanlar, guncellendi: new Date().toISOString() };
    onbellek.set(anahtar, { zaman: Date.now(), veri });
    return res.status(200).json(suz(veri));
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
