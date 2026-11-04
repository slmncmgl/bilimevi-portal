// v1.0: Performans Analizi > CRM Raporu sekmesi
// Veri kaynağı seçilir, o kaynaktaki Bilimevi pipeline lead'leri danışman x aşama tablosunda sayılır.
// Sayılar /api/crm-rapor'dan gelir. Danışman adı ve şubesi İzin Yönetimi'ndeki ID (e-posta -> Kylas ID)
// ve Personel sekmelerinden eşlenir; ID sekmesinde olmayan sahipler "Diğer" satırında toplanır.
// Rol kuralı Quiz Skorları ile aynı: admin/director/owner herkesi, manager kendi şubesini, staff kendini görür.
import { useState, useEffect } from "react";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const csvUrl = sekme => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sekme)}`;

// Kylas "Kaynak" picklist ID'leri, lead sayısına göre sıralı (Kasım 2026)
const KAYNAKLAR = [
  { id: 2675584, ad: "Instagram" },
  { id: 2650987, ad: "Fuar" },
  { id: 2753894, ad: "Imports" },
  { id: 2650986, ad: "Bilgi İstek Formu" },
  { id: 2614512, ad: "Referans" },
  { id: 2614515, ad: "Instagram DM" },
  { id: 2674021, ad: "Facebook" },
  { id: 3024131, ad: "Setrow Marketing" },
  { id: 2614513, ad: "Telefon" },
  { id: 2614514, ad: "Ofis" },
  { id: 2652456, ad: "Google" },
  { id: 3017966, ad: "Event" },
  { id: 2941507, ad: "Websitesi" },
  { id: 3005340, ad: "Eski Öğrenci" },
];

const ARALIKLAR = [
  { gun: 90, ad: "Son 90 gün" },
  { gun: null, ad: "Tümü" },
];

function parseCSV(csv) {
  return csv.trim().split("\n").map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    values.push(cur.trim());
    return values;
  });
}

function satirlariOku(csv) {
  const rows = parseCSV(csv);
  const h = rows[0] || [];
  return rows.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || ""])));
}

const kucuk = v => String(v || "").trim().toLocaleLowerCase("tr-TR");

export default function CrmRaporu({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null); // kylasId -> { ad, sube, email }
  const [kisiHata, setKisiHata] = useState(null);
  const [kaynak, setKaynak] = useState(null);
  const [gun, setGun] = useState(90);
  const [sube, setSube] = useState("Tümü");
  const [rapor, setRapor] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    Promise.all([fetch(csvUrl("ID")).then(r => r.text()), fetch(csvUrl("Personel")).then(r => r.text())])
      .then(([idCsv, personelCsv]) => {
        const personel = satirlariOku(personelCsv);
        const harita = {};
        satirlariOku(idCsv).forEach(r => {
          const email = kucuk(r.Email);
          const id = String(r.ID || "").trim();
          if (!email || !id) return;
          const p = personel.find(x => kucuk(x["E-posta"]) === email);
          harita[id] = { ad: p?.["Ad Soyad"] || email.split("@")[0], sube: p?.["Şube"] || "", email };
        });
        setKisiler(harita);
      })
      .catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  useEffect(() => {
    if (!kaynak) return;
    let iptal = false;
    setYukleniyor(true);
    setHata(null);
    fetch("/api/crm-rapor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kaynak, gun }),
    })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `Rapor alınamadı (HTTP ${r.status})`);
        return d;
      })
      .then(d => { if (!iptal) setRapor(d); })
      .catch(e => { if (!iptal) { setRapor(null); setHata(e.message); } })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [kaynak, gun]);

  // Satırları kur: tanınan danışmanlar ayrı, diğer sahipler tek "Diğer" satırında
  const satirlar = [];
  if (rapor && kisiler) {
    const diger = { ad: "Diğer", sube: "", sayilar: {}, diger: true };
    Object.entries(rapor.danismanlar).forEach(([ownerId, sayilar]) => {
      const k = kisiler[ownerId];
      if (k) satirlar.push({ ...k, sayilar });
      else Object.entries(sayilar).forEach(([st, n]) => { diger.sayilar[st] = (diger.sayilar[st] || 0) + n; });
    });
    if (Object.keys(diger.sayilar).length) satirlar.push(diger);
  }

  const kendiEmail = kucuk(user?.email);
  const gorunen = satirlar
    .filter(r => {
      if (isAdmin) return sube === "Tümü" || (!r.diger && kucuk(r.sube) === kucuk(sube));
      if (isManager) return !r.diger && kucuk(r.sube) === kucuk(user?.branch);
      return !r.diger && (r.email === kendiEmail || kucuk(r.ad) === kucuk(user?.name));
    })
    .map(r => ({ ...r, toplam: Object.values(r.sayilar).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => (a.diger ? 1 : b.diger ? -1 : b.toplam - a.toplam));

  const subeler = ["Tümü", ...[...new Set(satirlar.filter(r => !r.diger && r.sube).map(r => r.sube))].sort((a, b) => a.localeCompare(b, "tr"))];
  const asamalar = rapor?.asamalar || [];
  const sutunToplam = id => gorunen.reduce((a, r) => a + (r.sayilar[id] || 0), 0);
  const genelToplam = gorunen.reduce((a, r) => a + r.toplam, 0);

  return (
    <>
      <div style={c.panel}>
        <div style={c.etiket}>Veri kaynağı</div>
        <div style={c.chipSatir}>
          {KAYNAKLAR.map(k => (
            <button key={k.id} onClick={() => setKaynak(k.id)} style={kaynak === k.id ? c.chipAktif : c.chip}>{k.ad}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginTop: "16px" }}>
          <div>
            <div style={c.etiket}>Lead oluşturma tarihi</div>
            <div style={c.chipSatir}>
              {ARALIKLAR.map(a => (
                <button key={a.ad} onClick={() => setGun(a.gun)} style={gun === a.gun ? c.chipAktif : c.chip}>{a.ad}</button>
              ))}
            </div>
          </div>
          {isAdmin && rapor && subeler.length > 2 && (
            <div>
              <div style={c.etiket}>Şube</div>
              <div style={c.chipSatir}>
                {subeler.map(sb => (
                  <button key={sb} onClick={() => setSube(sb)} style={sube === sb ? c.chipAktif : c.chip}>{sb}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {!kaynak && <div style={c.bos}>Raporu görmek için bir veri kaynağı seçin.</div>}
      {kaynak && yukleniyor && (
        <div style={c.bos}><span style={c.spinner} /> Kylas'tan sayılar alınıyor...</div>
      )}
      {kaynak && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {kaynak && !yukleniyor && !hata && rapor && kisiler && (
        gorunen.length === 0 ? (
          <div style={c.bos}>Bu kaynakta size ait lead bulunmuyor.</div>
        ) : (
          <div style={c.tablo}>
            <div style={c.tabloBaslik}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                {KAYNAKLAR.find(k => k.id === kaynak)?.ad} · Bilimevi pipeline
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                {genelToplam.toLocaleString("tr-TR")} lead · {new Date(rapor.guncellendi).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} itibarıyla
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    <th style={{ ...c.th, textAlign: "left", position: "sticky", left: 0, background: "#fff" }}>Danışman</th>
                    {asamalar.map(a => <th key={a.id} style={c.th}>{a.ad}</th>)}
                    <th style={c.th}>Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {gorunen.map(r => (
                    <tr key={r.diger ? "diger" : r.email} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ ...c.td, textAlign: "left", position: "sticky", left: 0, background: "#fff", fontWeight: 600, color: r.diger ? "#94a3b8" : "#0f172a", whiteSpace: "nowrap" }}>
                        {r.ad}
                        {isAdmin && r.sube && <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}> · {r.sube}</span>}
                      </td>
                      {asamalar.map(a => {
                        const n = r.sayilar[a.id] || 0;
                        return <td key={a.id} style={{ ...c.td, color: n ? "#0f172a" : "#cbd5e1" }}>{n ? n.toLocaleString("tr-TR") : "·"}</td>;
                      })}
                      <td style={{ ...c.td, fontWeight: 700, color: "#0891b2" }}>{r.toplam.toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                  {gorunen.length > 1 && (
                    <tr style={{ borderTop: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                      <td style={{ ...c.td, textAlign: "left", position: "sticky", left: 0, background: "#f8fafc", fontWeight: 700, color: "#0f172a" }}>Toplam</td>
                      {asamalar.map(a => <td key={a.id} style={{ ...c.td, fontWeight: 700, color: "#0f172a" }}>{sutunToplam(a.id).toLocaleString("tr-TR")}</td>)}
                      <td style={{ ...c.td, fontWeight: 700, color: "#0891b2" }}>{genelToplam.toLocaleString("tr-TR")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </>
  );
}

const chipTemel = { padding: "7px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" };
const c = {
  panel: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "20px 24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  etiket: { fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" },
  chipSatir: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: { ...chipTemel, background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0" },
  chipAktif: { ...chipTemel, background: "#0891b2", color: "#fff", border: "1.5px solid #0891b2" },
  bos: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "48px 0", color: "#64748b", fontSize: "14px" },
  hata: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "16px 20px", color: "#991b1b", fontSize: "13px", fontWeight: 500, marginBottom: "16px" },
  spinner: { display: "inline-block", width: "18px", height: "18px", border: "2px solid #e2e8f0", borderTopColor: "#0891b2", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  tablo: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", animation: "fadeUp 0.4s ease-out" },
  tabloBaslik: { padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" },
  th: { padding: "10px 12px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" },
  td: { padding: "11px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" },
};
