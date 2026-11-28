// v1.0 (24.11.2026): n8n'e aracılık eden 4 fonksiyon tek fonksiyonda (Vercel Hobby planı en fazla 12 fonksiyon kabul ediyor).
// Eski adresler vercel.json'da buraya ?hedef= ile yönlenir, sayfalar eski adresleri kullanmaya devam eder:
//   /api/sozlesme-gonder, /api/islem-log, /api/kayit-formu-talebi, /api/indirim-bildirim, /api/hata-bildirimi
// Her hedefin kodu kendi "_n8n..." dosyasında, değişmeden duruyor.
import sozlesmeGonder from "./_n8nSozlesmeGonder.js";
import islemLog from "./_n8nIslemLog.js";
import kayitFormuTalebi from "./_n8nKayitFormuTalebi.js";
import indirimBildirim from "./_n8nIndirimBildirim.js";
import hataBildirimi from "./_n8nHataBildirim.js";
import wpHat from "./_n8nWpHat.js";

const HEDEFLER = {
  "sozlesme-gonder": sozlesmeGonder,
  "islem-log": islemLog,
  "kayit-formu-talebi": kayitFormuTalebi,
  "indirim-bildirim": indirimBildirim,
  "hata-bildirimi": hataBildirimi,
  "wp-hat": wpHat,
};

export default async function handler(req, res) {
  const hedef = HEDEFLER[String(req.query?.hedef || "")];
  if (!hedef) return res.status(404).json({ ok: false, hata: "Bilinmeyen hedef." });
  return hedef(req, res);
}
