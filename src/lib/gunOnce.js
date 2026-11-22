// v1.0: "N gün önce" yazısı. Takip Tablosu ve Hatırlat mesajı aynı metni kullanır.
// Takvim günüyle (İstanbul): dün akşamki etkinlik "1 gün önce"
const takvimGunu = ms => Math.floor((ms + 3 * 3600000) / 86400000);
export function gunOnceYazi(v) {
  if (!v) return "Hiç yok";
  const gun = takvimGunu(Date.now()) - takvimGunu(new Date(v).getTime());
  return gun > 0 ? `${gun} gün önce` : "Bugün";
}
