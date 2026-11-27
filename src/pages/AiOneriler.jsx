// v1.4: başlıkta analiz kapsamı (kart + aşama)
// v1.3: tema sınıfları (tema-kart vb.), Takip Tablosu Tema v2'de kurumsal lacivert
// v1.2: önerilen kapanış sütunu; Close Lead penceresi İlgisiz + Olumsuza Dönen'in tüm sebeplerini gösterir, önerilen seçili gelir
// v1.1: aksiyon filtreleri, "önerisi olmayanlar" kutusu ve Yeniden analiz kalktı; Tümünü Ele Al; satırda Close Lead (Neden + "AI Önerisi ile inceledim ve iptale çektim." notu, İlgisiz · Artık İlgilenmiyor)
// v1.0: Takip Tablosu "AI Önerileri" kartı. Karta tıklanınca seçili danışman(lar)ın açık datalarının notları okunur
// (Kylas'a yazılmaz), src/lib/notAnalizi.js kurallarıyla bayraklanır. Analiz sürerken kart soldan sağa dolar;
// bitince "AI önerileri hazır" penceresi çıkar, sonuçlar kartların altındaki listede görünür.
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { apiCagir } from "./CrmRaporu";
import { KAPANISLAR } from "./EleAl";
import { leadAnaliz } from "../lib/notAnalizi";

export const AI_UST_SINIR = 300;
const PARALEL = 2;
const RISK = { Yüksek: { renk: "#b91c1c", zemin: "#fef2f2", puan: 3 }, Orta: { renk: "#b45309", zemin: "#fffbeb", puan: 2 }, Düşük: { renk: "#047857", zemin: "#ecfdf5", puan: 1 } };
const BAYRAK_AD = {
  KOVALAMA: "Kovalama", TERCIH_SAATI_DINLENMEDI: "Tercih saati dinlenmedi", TEK_SAAT_DILIMI: "Hep aynı saat", RED_SINYALI_SONRASI_DEVAM: "Red sonrası devam",
  SAGLIKSIZ_ILISKI: "Sağlıksız ilişki", KOPYALA_YAPISTIR_TAKIP: "Kopyala-yapıştır not", DUZENSIZ_TAKIP: "Düzensiz takip",
};
const MOR = "#7c3aed";

// Analiz durumu: { durum: null|"calisiyor"|"bitti", bitti, toplam, hatali, sonuclar: { [leadId]: sonuç } }
export function useAiAnaliz(kisiAdi) {
  const [ai, setAi] = useState({ durum: null, bitti: 0, toplam: 0, hatali: 0, sonuclar: {} });
  const nesil = useRef(0);
  const sifirla = useCallback(() => { nesil.current++; setAi({ durum: null, bitti: 0, toplam: 0, hatali: 0, sonuclar: {} }); }, []);
  useEffect(() => () => { nesil.current++; }, []);
  async function baslat(leadler, onBitti) {
    const benim = ++nesil.current;
    const hedef = leadler.slice(0, AI_UST_SINIR);
    setAi({ durum: "calisiyor", bitti: 0, toplam: hedef.length, hatali: 0, sonuclar: {}, kesildi: leadler.length > AI_UST_SINIR });
    const kuyruk = [...hedef];
    const sonuclar = {};
    let hatali = 0;
    const isci = async () => {
      while (kuyruk.length && nesil.current === benim) {
        const l = kuyruk.shift();
        try {
          const d = await apiCagir({ islem: "notlar", leadId: l.id, ownerId: l.ownerId, boyut: 100 });
          sonuclar[l.id] = leadAnaliz(l.id, kisiAdi(l.ownerId), d.notlar || []);
        } catch { hatali++; }
        if (nesil.current === benim) setAi(a => ({ ...a, bitti: a.bitti + 1, hatali }));
      }
    };
    await Promise.all(Array.from({ length: PARALEL }, isci));
    if (nesil.current !== benim) return;
    setAi(a => ({ ...a, durum: "bitti", sonuclar: { ...sonuclar } }));
    onBitti && onBitti(Object.values(sonuclar).filter(s => s.bayraklar.length).length, hedef.length);
  }
  return { ai, baslat, sifirla };
}

// Kart: analiz sürerken arkası soldan sağa dolar, üstünde parıltı kayar
export function AiKart({ ai, secili, onClick, yukleniyor }) {
  const yuzde = ai.toplam ? Math.round((ai.bitti / ai.toplam) * 100) : 0;
  const calisiyor = ai.durum === "calisiyor";
  const oneri = ai.durum === "bitti" ? Object.values(ai.sonuclar).filter(s => s.bayraklar.length).length : null;
  return (
    <div onClick={yukleniyor ? undefined : onClick} role="button" tabIndex={0} aria-busy={calisiyor}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !yukleniyor) { e.preventDefault(); onClick(); } }}
      title={calisiyor ? "Notlar analiz ediliyor…" : ai.durum === "bitti" ? "Önerileri göster" : "Tıklayınca seçili danışmanların açık datalarının notları analiz edilir"}
      className={`ai-kart tema-kart${secili ? " secili" : ""}`}
      style={{ position: "relative", overflow: "hidden", border: "1.5px solid", borderColor: secili ? MOR : "#ddd6fe", borderRadius: "16px", padding: "18px", textAlign: "center",
        background: "#faf5ff", cursor: yukleniyor ? "default" : "pointer", height: "100%", boxSizing: "border-box",
        boxShadow: secili ? "0 0 0 3px #ede9fe" : "0 1px 3px rgba(0,0,0,0.06)", outline: "none" }}>
      {calisiyor && (
        <div aria-hidden="true" className="tema-dolum" style={{ position: "absolute", inset: 0, width: `${Math.max(yuzde, 3)}%`, background: "linear-gradient(90deg, #ede9fe, #ddd6fe)", transition: "width .35s ease-out" }}>
          <div className="ai-kart-parilti" />
        </div>
      )}
      <div style={{ position: "relative" }}>
        <div className="tema-kart-sayi" style={{ fontSize: "26px", fontWeight: 700, marginBottom: "4px", fontVariantNumeric: "tabular-nums", color: MOR, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          {calisiyor ? `%${yuzde}` : oneri !== null ? oneri.toLocaleString("tr-TR") : <YildizIkonu boyut={26} />}
        </div>
        <div className="tema-kart-etiket" style={{ fontSize: "11px", color: "#6d28d9", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>
          {calisiyor ? `Analiz · ${ai.bitti}/${ai.toplam}` : "AI Önerileri"}
        </div>
      </div>
      <style>{`
        .ai-kart:hover { box-shadow: 0 0 0 3px #ede9fe !important; }
        .ai-kart-parilti { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent); animation: aiParilti 1.3s linear infinite; }
        @keyframes aiParilti { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        @media (prefers-reduced-motion: reduce) { .ai-kart-parilti { animation: none; } }
      `}</style>
    </div>
  );
}

function YildizIkonu({ boyut = 18, renk = "currentColor" }) {
  return (
    <svg viewBox="0 0 24 24" width={boyut} height={boyut} fill={renk} aria-hidden="true">
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" />
      <path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" opacity="0.7" />
    </svg>
  );
}

// "AI önerileri hazır" penceresi
export function AiHazirPopup({ oneri, toplam, onGoster, onKapat }) {
  useEffect(() => {
    const tus = e => { if (e.key === "Escape") onKapat(); };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  }, []);
  return createPortal(
    <div onClick={onKapat} style={{ position: "fixed", inset: 0, zIndex: 9650, background: "rgba(15,23,42,0.3)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Sora', sans-serif", animation: "aiSolma .2s ease-out" }}>
      <div role="dialog" aria-modal="true" aria-label="AI önerileri hazır" onClick={e => e.stopPropagation()}
        style={{ width: "min(400px, 100%)", background: "#fff", borderRadius: "24px", padding: "28px 26px 22px", textAlign: "center", boxShadow: "0 30px 70px rgba(76,29,149,0.28)", animation: "aiGel .35s cubic-bezier(.2,.9,.3,1.2)" }}>
        <div style={{ width: "64px", height: "64px", margin: "0 auto 14px", borderRadius: "20px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(109,40,217,0.35)" }}>
          <YildizIkonu boyut={32} />
        </div>
        <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>AI önerileri hazır</div>
        <div style={{ fontSize: "14px", color: "#475569", margin: "8px 0 20px", lineHeight: 1.5 }}>
          {toplam} data analiz edildi. {oneri ? <><b style={{ color: MOR }}>{oneri} datada</b> öneri var.</> : "Öneri gerektiren data bulunmadı."}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button type="button" onClick={onKapat} style={{ padding: "10px 18px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>Kapat</button>
          <button type="button" onClick={onGoster} autoFocus style={{ padding: "10px 20px", borderRadius: "12px", border: "none", background: MOR, color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 16px rgba(124,58,237,0.3)" }}>Önerileri gör</button>
        </div>
      </div>
      <style>{`@keyframes aiGel { from { opacity: 0; transform: scale(.9) translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes aiSolma { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>,
    document.body
  );
}

// Sonuç listesi (kartların altında, normal listenin yerinde)
export const AI_KAPAT_NOTU = "AI Önerisi ile inceledim ve iptale çektim.";

export function AiOneriListesi({ ai, kapsamAdi, leadler, kisiAdi, coklu, asamaAdi, onEleAl, onKapandi, AdHucre }) {
  const [kapat, setKapat] = useState({}); // leadId -> "gidiyor" | "tamam" | { hata }
  const [pencere, setPencere] = useState(null); // { s, l }
  const leadMap = useMemo(() => Object.fromEntries(leadler.map(l => [l.id, l])), [leadler]);
  const tum = Object.values(ai.sonuclar);
  const satirlar = tum
    .filter(s => s.bayraklar.length && (leadMap[s.lead_id] || kapat[s.lead_id] === "tamam"))
    .sort((a, b) => RISK[b.risk_skoru].puan - RISK[a.risk_skoru].puan || b.bayraklar.length - a.bayraklar.length || b.toplam_temas - a.toplam_temas);

  const acikSatirlar = satirlar.filter(s => kapat[s.lead_id] !== "tamam" && leadMap[s.lead_id]);
  const kapatilan = useRef({});
  async function kapatUygula(s, l, asama, sebep) {
    setPencere(null);
    setKapat(x => ({ ...x, [s.lead_id]: "gidiyor" }));
    try {
      const metin = [s.kisa_gerekce, AI_KAPAT_NOTU].filter(Boolean).join("\n");
      await apiCagir({ islem: "notEkle", leadId: l.id, metin });
      await apiCagir({ islem: "asamaDegistir", leadId: l.id, asama, sebep });
      kapatilan.current[s.lead_id] = { l, ad: `${KAPANISLAR.find(k => k.id === asama)?.ad || ""} · ${sebep}` };
      setKapat(x => ({ ...x, [s.lead_id]: "tamam" }));
      onKapandi && onKapandi(l.id);
    } catch (e) { setKapat(x => ({ ...x, [s.lead_id]: { hata: e.message } })); }
  }

  return (
    <div style={{ background: "#fff", border: "1.5px solid #ddd6fe", borderRadius: "20px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", animation: "fadeUp 0.4s ease-out", scrollMarginTop: "80px" }} id="ai-oneri-listesi">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "#faf5ff" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 800, color: "#4c1d95" }}><YildizIkonu boyut={18} renk={MOR} /> AI Önerileri</span>
        {kapsamAdi && <span style={{ fontSize: "12px", fontWeight: 700, color: "#4c1d95", background: "#ede9fe", padding: "3px 10px", borderRadius: "999px" }}>{kapsamAdi}</span>}
        {ai.durum === "bitti" && <span style={{ fontSize: "12px", color: "#64748b" }}>{ai.toplam} data analiz edildi{ai.hatali ? ` · ${ai.hatali} okunamadı` : ""}{ai.kesildi ? ` (ilk ${AI_UST_SINIR})` : ""}</span>}
        {ai.durum === "bitti" && acikSatirlar.length > 0 && (
          <button type="button" onClick={() => onEleAl(acikSatirlar.map(s => leadMap[s.lead_id]))}
            style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: "12px", border: "none", background: "#0891b2", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(8,145,178,0.25)" }}>
            Tümünü Ele Al ({acikSatirlar.length})
          </button>
        )}
      </div>

      {ai.durum === "calisiyor" && (
        <div style={{ padding: "36px 20px", textAlign: "center", color: "#6d28d9", fontSize: "14px", fontWeight: 600 }}>
          Notlar analiz ediliyor… {ai.bitti}/{ai.toplam}
          <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500, marginTop: "6px" }}>Bitince haber vereceğiz; bu sırada sayfada gezinmeye devam edebilirsin.</div>
        </div>
      )}

      {ai.durum === "bitti" && (
        <>
          {satirlar.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>{["Ad Soyad", ...(coklu ? ["Danışman"] : []), "Aşama", "Risk", "Neden", "Önerilen aksiyon", "Önerilen kapanış", ""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {satirlar.map(s => {
                    const l = leadMap[s.lead_id] || kapatilan.current[s.lead_id]?.l;
                    const r = RISK[s.risk_skoru];
                    const k = kapat[s.lead_id];
                    return (
                      <tr key={s.lead_id} style={{ opacity: k === "tamam" ? 0.45 : 1, transition: "opacity .3s" }}>
                        <td style={{ ...td, whiteSpace: "nowrap" }}><AdHucre lead={l} /></td>
                        {coklu && <td style={{ ...td, whiteSpace: "nowrap", color: "#475569" }}>{kisiAdi(l.ownerId)}</td>}
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{asamaAdi(l.asama)}</td>
                        <td style={td}><span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "999px", background: r.zemin, color: r.renk, fontSize: "12px", fontWeight: 700 }}>{s.risk_skoru}</span></td>
                        <td style={{ ...td, minWidth: "240px" }}>
                          <div style={{ color: "#334155", lineHeight: 1.45 }}>{s.kisa_gerekce || "Belirgin bir sorun yok."}</div>
                          {!!s.bayraklar.length && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "5px" }}>
                              {s.bayraklar.map(b => <span key={b} style={{ padding: "1px 7px", borderRadius: "999px", background: "#f5f3ff", color: "#6d28d9", fontSize: "10.5px", fontWeight: 700 }}>{BAYRAK_AD[b]}</span>)}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, minWidth: "170px", fontWeight: 700, color: "#0f172a" }}>{s.onerilen_aksiyon || "-"}</td>
                        <td style={{ ...td, minWidth: "150px" }}>{s.kapanis && <KapanisRozet kapanis={s.kapanis} />}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {k === "tamam" ? (
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#b45309", whiteSpace: "nowrap" }}>Kapatıldı · {kapatilan.current[s.lead_id]?.ad} ✓</span>
                          ) : (
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button type="button" onClick={() => onEleAl([l])} disabled={k === "gidiyor"} style={{ ...satirDugme, background: "#0891b2", color: "#fff", border: "1.5px solid #0891b2" }}>Ele Al</button>
                              <button type="button" onClick={() => setPencere({ s, l })} disabled={k === "gidiyor"}
                                style={{ ...satirDugme, background: "#fff", color: "#b45309", border: "1.5px solid #fcd34d" }}>
                                {k === "gidiyor" ? "Kapatılıyor…" : "Close Lead"}
                              </button>
                            </div>
                          )}
                          {k?.hata && <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px", maxWidth: "220px", marginLeft: "auto" }}>{k.hata}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Bu seçimde öneri gerektiren data yok. 🎉</div>
          )}
          <div style={{ padding: "10px 20px 14px", fontSize: "11px", color: "#94a3b8" }}>Öneriler notların içeriğine, sayısına ve yazıldığı saate (İstanbul) göre kurallarla çıkarılır; Kylas'ta hiçbir şey değişmez.</div>
        </>
      )}
      {pencere && <KapanisPenceresi s={pencere.s} l={pencere.l} onKapat={() => setPencere(null)} onTamam={(asama, sebep) => kapatUygula(pencere.s, pencere.l, asama, sebep)} />}
    </div>
  );
}

function KapanisRozet({ kapanis }) {
  const k = KAPANISLAR.find(x => x.id === kapanis.asama);
  if (!k) return null;
  return (
    <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: "10px", background: k.zemin, border: `1px solid ${k.cerceve}`, color: k.renk, fontSize: "11.5px", fontWeight: 700, lineHeight: 1.4 }}>
      {k.ad} · {kapanis.sebep}
    </span>
  );
}

// Close Lead penceresi: iki kapanış türü ve tüm sebepleri, AI'nın önerdiği seçili gelir
function KapanisPenceresi({ s, l, onKapat, onTamam }) {
  const [secim, setSecim] = useState(s.kapanis ? { asama: s.kapanis.asama, sebep: s.kapanis.sebep } : null);
  useEffect(() => {
    const tus = e => { if (e.key === "Escape") { e.stopPropagation(); onKapat(); } };
    document.addEventListener("keydown", tus, true);
    return () => document.removeEventListener("keydown", tus, true);
  }, []);
  const secili = KAPANISLAR.find(k => k.id === secim?.asama);
  const notMetni = [s.kisa_gerekce, AI_KAPAT_NOTU].filter(Boolean).join("\n");
  return createPortal(
    <div onClick={onKapat} style={{ position: "fixed", inset: 0, zIndex: 9700, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Sora', sans-serif" }}>
      <div role="dialog" aria-modal="true" aria-label="Close Lead" onClick={e => e.stopPropagation()}
        style={{ width: "min(640px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: "20px", padding: "22px 24px", boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
        <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>{l.ad || `Data ${l.id}`} · Close Lead</div>
        <div style={{ fontSize: "13px", color: "#475569", margin: "6px 0 16px" }}>Kapanış sebebini seçin. <span style={{ color: MOR, fontWeight: 700 }}>AI önerisi</span> seçili geldi.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
          {KAPANISLAR.map(k => (
            <div key={k.id} style={{ border: `1.5px solid ${secim?.asama === k.id ? k.renk : k.cerceve}`, borderRadius: "14px", padding: "12px 10px 8px", background: secim?.asama === k.id ? k.zemin : "#fff" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: k.renk, padding: "0 6px 6px" }}>{k.ad}</div>
              {k.sebepler.map(x => {
                const sec = secim?.asama === k.id && secim.sebep === x;
                const oneri = s.kapanis?.asama === k.id && s.kapanis.sebep === x;
                return (
                  <label key={x} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "7px 6px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: sec ? 700 : 500, color: sec ? k.renk : "#0f172a", background: sec ? "#fff" : "transparent" }}>
                    <input type="radio" name="aiKapanis" checked={sec} onChange={() => setSecim({ asama: k.id, sebep: x })} style={{ accentColor: k.renk, width: "15px", height: "15px", margin: 0, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{x}</span>
                    {oneri && <span style={{ padding: "1px 7px", borderRadius: "999px", background: "#f5f3ff", color: MOR, fontSize: "10px", fontWeight: 800, whiteSpace: "nowrap" }}>AI önerisi</span>}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "14px", padding: "10px 12px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #eef2f6" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Eklenecek not</div>
          <div style={{ fontSize: "12.5px", color: "#334155", whiteSpace: "pre-line", lineHeight: 1.5 }}>{notMetni}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <button type="button" onClick={onKapat} style={{ padding: "9px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Vazgeç</button>
          <button type="button" disabled={!secim} onClick={() => onTamam(secim.asama, secim.sebep)}
            style={{ padding: "9px 18px", borderRadius: "12px", border: "none", background: secili?.renk || "#94a3b8", color: "#fff", fontWeight: 700, cursor: secim ? "pointer" : "default", opacity: secim ? 1 : 0.5, fontFamily: "inherit" }}>
            {secili ? `${secili.ad} olarak kapat` : "Sebep seçin"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const satirDugme = { padding: "6px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap" };
const th = { textAlign: "left", padding: "10px 14px", background: "#f8fafc", color: "#64748b", fontWeight: 700, fontSize: "12px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td = { padding: "10px 14px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", verticalAlign: "top" };
