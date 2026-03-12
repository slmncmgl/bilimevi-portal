import { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../utils/sheets";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAjuJMQJyrNdwh2HuhwjFSw3c1kuIMExtHgVSeODc-D_gCtYjZS_vRy8TAp1h0m90E/exec";
const DIGER_IZINLER = ["Evlilik İzni", "Doğum İzni", "Babalık İzni", "Cenaze İzni"];
const HAKEDISTEN_DUSEN = ["Yıllık İzin", "Yarım Gün İzin"];

async function fetchRoller() {
  const csv = await fetchSheetCSV("Roller");
  const lines = csv.trim().split("\n");
  return lines.slice(0).map(l => l.replace(/^"|"$/g, "").trim()).filter(Boolean);
}

async function fetchSheetCSV(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Sheet okunamadı");
  return res.text();
}

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] || "").replace(/"/g, "").trim(); });
    return row;
  });
}

async function fetchPersonelData(name) {
  const csv = await fetchSheetCSV("Personel");
  const rows = parseCSV(csv);
  return rows.find(r => r["Ad Soyad"] === name) || null;
}

async function fetchModuller(name) {
  const csv = await fetchSheetCSV("Modüller");
  const rows = parseCSV(csv);
  return rows.find(r => r["Ad Soyad"] === name) || null;
}

async function fetchTumPersonel() {
  const csv = await fetchSheetCSV("Personel");
  return parseCSV(csv).filter(r => r["Ad Soyad"]);
}

async function fetchIslemler() {
  const csv = await fetchSheetCSV("İşlemler");
  return parseCSV(csv).filter(r => r["Personel"]);
}

async function fetchIzinSureleri() {
  const csv = await fetchSheetCSV("İzin Süreleri");
  const rows = parseCSV(csv);
  const map = {};
  rows.forEach(r => { if (r["İzinler"]) map[r["İzinler"]] = Number(r["Süre"]) || 0; });
  return map;
}

async function submitIzin(data) {
  await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(data),
  });
  return true;
}

function sonrakiHakedis(girisDateStr) {
  if (!girisDateStr) return null;
  const parts = girisDateStr.split(".");
  if (parts.length !== 3) return null;
  const gun = parseInt(parts[0]);
  const ay = parseInt(parts[1]) - 1;
  const bugun = new Date();
  const buYil = bugun.getFullYear();
  let hakedis = new Date(buYil, ay, gun);
  if (hakedis <= bugun) hakedis = new Date(buYil + 1, ay, gun);
  return hakedis.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function isGunuHesapla(baslangic, bitis) {
  if (!baslangic || !bitis) return 0;
  const start = new Date(baslangic);
  const end = new Date(bitis);
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const gun = cur.getDay();
    if (gun !== 0 && gun !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTarih(dateStr) {
  if (!dateStr) return "";
  const tarihObj = new Date(dateStr.replace(/-/g, "/"));
  if (isNaN(tarihObj.getTime())) return dateStr;
  return tarihObj.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

const ANA_IZINLER = ["Yıllık İzin", "Yarım Gün İzin", "Hastalık", "Diğer"];

export default function Izin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [personel, setPersonel] = useState(null);
  const [izinTuru, setIzinTuru] = useState("Yıllık İzin");
  const [digerAcik, setDigerAcik] = useState(false);
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [dosya, setDosya] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [rol, setRol] = useState("personel");
  const [adminView, setAdminView] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [yaklasanIzinler, setYaklasanIzinler] = useState([]);
  const [izinSureleri, setIzinSureleri] = useState({});

  const yarimGun = izinTuru === "Yarım Gün İzin";
  const digerIzin = DIGER_IZINLER.includes(izinTuru);
  const hastalık = izinTuru === "Hastalık";
  const hakedistenDusen = HAKEDISTEN_DUSEN.includes(izinTuru);

  // Gün sayısı hesapla
  let isGunu = 0;
  if (yarimGun) isGunu = 0.5;
  else if (digerIzin) isGunu = izinSureleri[izinTuru] || 0;
  else if (baslangic && bitis) isGunu = isGunuHesapla(baslangic, bitis);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
    const r = (session.rol || session.title || "personel").toLowerCase().trim();
    setRol(r);
    loadData(session.name);
    if (r === "admin") {
      loadAdminList(session);
      const params = new URLSearchParams(window.location.search);
      if (params.get("panel") === "admin") setAdminView(true);
    }
  }, []);

  async function loadData(name) {
    setDataLoading(true);
    try {
      const [data, moduller, sureler, tumPersonel, islemler] = await Promise.all([
        fetchPersonelData(name),
        fetchModuller(name),
        fetchIzinSureleri(),
        fetchTumPersonel(),
        fetchIslemler(),
      ]);
      setPersonel(data);
      setIzinSureleri(sureler);
      const currentSession = getSession();
      const gorIzni = (currentSession?.title || "staff").toLowerCase().trim();
      setRol(gorIzni);

      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0);
      const subePersonel = tumPersonel.filter(p =>
        p["Şirket"] === data?.["Şirket"] &&
        p["Şube"] === data?.["Şube"]
      );
      const subeIsimler = subePersonel.map(p => p["Ad Soyad"]);
      const gelecek = islemler.filter(row => {
        const b = new Date(row["Bitiş"]);
        const izinTipi = (row["Mazeret"] || "").toLowerCase();
        return subeIsimler.includes(row["Personel"]) && b >= bugun && !izinTipi.includes("yarım gün");
      });
      setYaklasanIzinler(gelecek);
    } catch (_) {}
    setDataLoading(false);
  }

  async function loadAdminList(sessionOverride) {
    setAdminLoading(true);
    try {
      const userTitle = (sessionOverride?.title || sessionOverride?.rol || user?.title || "staff");
      const tumPersonel = await fetchTumPersonel();
      let filtered;
      if (userTitle === "owner" || userTitle === "admin") {
        filtered = tumPersonel;
      } else if (userTitle === "director") {
        filtered = tumPersonel.filter(p => p["Şirket"] === (sessionOverride?.company || personel?.["Şirket"]));
      } else {
        filtered = tumPersonel.filter(p =>
          p["Şirket"] === (sessionOverride?.company || personel?.["Şirket"]) &&
          p["Şube"] === (sessionOverride?.branch || personel?.["Şube"])
        );
      }
      setAdminList(filtered);
    } catch (_) {}
    setAdminLoading(false);
  }

  function handleIzinTuruSec(tur) {
    if (tur === "Diğer") {
      setDigerAcik(!digerAcik);
      return;
    }
    setIzinTuru(tur);
    setDigerAcik(false);
    setBaslangic(""); setBitis(""); setDosya(null);
  }

  function handleDigerSec(tur) {
    setIzinTuru(tur);
    setDigerAcik(false);
    setBaslangic(""); setBitis("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!baslangic) return;
    if (!yarimGun && !digerIzin && !bitis) {
      setStatus({ type: "error", msg: "Bitiş tarihi seçiniz." }); return;
    }
    setLoading(true);
    setStatus(null);

    try {
      let dosyaData = null;
      let dosyaAdi = null;
      let dosyaTipi = null;

      if (hastalık && dosya) {
        dosyaData = await fileToBase64(dosya);
        dosyaAdi = dosya.name;
        dosyaTipi = dosya.type;
      }

      const formData = {
        personelAdi: user.name,
        baslangicTarihi: baslangic,
        bitisTarihi: digerIzin ? baslangic : (yarimGun ? baslangic : bitis),
        izinTuru,
        aciklama,
        userEmail: user.email,
        gunSayisi: isGunu || (DIGER_IZINLER.includes(izinTuru) ? (izinSureleri[izinTuru] || 1) : isGunu),
        hakedistenDusen: hakedistenDusen,
        dosyaData,
        dosyaAdi,
        dosyaTipi,
      };

      await submitIzin(formData);
      setStatus({ type: "success", msg: "İzin talebiniz başarıyla kaydedildi!" });
      setBaslangic(""); setBitis(""); setAciklama(""); setDosya(null);
      setIzinTuru("Yıllık İzin");
      await loadData(user.name);
    } catch (err) {
      setStatus({ type: "error", msg: "Kayıt sırasında hata oluştu." });
    } finally {
      setLoading(false);
    }
  }

  function logout() { clearSession(); navigate("/"); }
  if (!user) return null;

  return (
    <div style={styles.root}>
      <div style={styles.bgGrid} />
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingBox}>
            <div style={styles.loadingSpinner} />
            <span style={styles.loadingText}>Talep Gönderiliyor...</span>
          </div>
        </div>
      )}
      
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <span style={styles.headerSep}>·</span>
            <span style={styles.headerTitle}>İK İzin Yönetimi</span>
          </div>
          <div style={styles.headerRight}>
            {adminView && (
              <button onClick={() => setAdminView(false)} style={styles.adminBtn}>← Kendi İznim</button>
            )}
            <div style={styles.userChip}><div style={styles.userDot} />{user.name}</div>
            <button onClick={logout} style={styles.logoutBtn}>Çıkış</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {adminView ? (
          <AdminPanel list={adminList} loading={adminLoading} onRefresh={loadAdminList} scriptUrl={SCRIPT_URL} adminEmail={user?.email} isAdmin={rol === "admin"} />
        ) : (
          <div style={styles.pageLayout}>
            <div style={styles.formLayout}>
              {/* Bilgi kartı */}
              <div style={styles.infoCard}>
                <h3 style={styles.infoTitle}>İzin Durumu</h3>
                {dataLoading ? <div style={styles.infoLoading}>Yükleniyor...</div> : personel ? (
                  <>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Ad Soyad</span><span style={styles.infoValue}>{personel["Ad Soyad"]}</span></div>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Şube</span><span style={styles.infoValue}>{personel["Şube"]}</span></div>
                    <div style={styles.infoDivider} />
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Toplam Hak</span><span style={styles.infoValue}>{personel["Hakediş"]} gün</span></div>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Kullanılan</span><span style={{ ...styles.infoValue, color: "#dc2626" }}>{personel["Kullanılan İzin"] || 0} gün</span></div>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Kalan</span><span style={{ ...styles.infoValue, color: "#059669", fontWeight: "700", fontSize: "18px" }}>{personel["Kalan İzin"]} gün</span></div>
                    <div style={styles.progressWrap}>
                      <div style={styles.progressBg}>
                        <div style={{ ...styles.progressFill, width: `${Math.min((Number(personel["Kullanılan İzin"]) / Number(personel["Hakediş"])) * 100, 100)}%` }} />
                      </div>
                      <span style={styles.progressText}>{Math.round((Number(personel["Kullanılan İzin"]) / Number(personel["Hakediş"])) * 100)}% kullanıldı</span>
                    </div>
                    {personel["Giriş Tarihi"] && sonrakiHakedis(personel["Giriş Tarihi"]) && (
                      <div style={styles.hakedisBox}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>Sonraki hakediş: <strong>{sonrakiHakedis(personel["Giriş Tarihi"])}</strong></span>
                      </div>
                    )}
                  </>
                ) : <div style={styles.infoLoading}>Personel verisi bulunamadı.</div>}
              </div>

              {/* Form */}
              <div style={styles.formCard}>
                <h2 style={styles.formCardTitle}>İzin Talep Formu</h2>
                <form onSubmit={handleSubmit} style={styles.form}>

                  {/* İzin Türü */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>İzin Türü</label>
                    <div style={styles.izinGrid}>
                      {ANA_IZINLER.map(t => (
                        <button key={t} type="button"
                          onClick={() => handleIzinTuruSec(t)}
                          style={{
                            ...styles.izinBtn,
                            ...((izinTuru === t || (t === "Diğer" && DIGER_IZINLER.includes(izinTuru))) ? styles.izinBtnActive : {}),
                          }}>
                          {t === "Diğer" ? `${t} ${digerAcik ? "▲" : "▼"}` : t}
                        </button>
                      ))}
                    </div>

                    {/* Diğer alt seçenekler */}
                    {digerAcik && (
                      <div style={styles.digerGrid}>
                        {DIGER_IZINLER.map(t => (
                          <button key={t} type="button" onClick={() => handleDigerSec(t)}
                            style={{ ...styles.digerBtn, ...(izinTuru === t ? styles.digerBtnActive : {}) }}>
                            {t}
                            {izinSureleri[t] ? <span style={styles.digerSure}>{izinSureleri[t]} gün</span> : null}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Seçili diğer izin etiketi */}
                    {DIGER_IZINLER.includes(izinTuru) && (
                      <div style={styles.secilenEtiket}>
                        <span>Seçili: <strong>{izinTuru}</strong></span>
                        <button type="button" onClick={() => { setIzinTuru("Yıllık İzin"); }} style={styles.etiketKapat}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Tarihler */}
                  <div style={digerIzin || yarimGun ? {} : styles.dateGrid}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Başlangıç</label>
                      <input type="date" value={baslangic}
                        onChange={e => setBaslangic(e.target.value)}
                        required style={styles.input}
                        onFocus={e => e.target.style.borderColor = "#2563eb"}
                        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                      />
                    </div>
                    {!yarimGun && !digerIzin && (
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Bitiş</label>
                        <input type="date" value={bitis}
                          min={baslangic || undefined}
                          onChange={e => setBitis(e.target.value)}
                          required style={{ ...styles.input, borderColor: bitis && baslangic && bitis < baslangic ? "#dc2626" : "" }}
                          onFocus={e => e.target.style.borderColor = "#2563eb"}
                          onBlur={e => e.target.style.borderColor = bitis && baslangic && bitis < baslangic ? "#dc2626" : "#e2e8f0"}
                        />
                        {bitis && baslangic && bitis < baslangic && (
                          <span style={{ fontSize: "12px", color: "#dc2626", marginTop: "4px" }}>Bitiş tarihi başlangıçtan önce olamaz.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* İş günü göstergesi */}
                  {baslangic && isGunu > 0 && (
                    <div style={styles.isGunuBox}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>{isGunu === 0.5 ? "Yarım gün izin" : `${isGunu} ${digerIzin ? "takvim" : "iş"} günü`}</span>
                      {!hakedistenDusen && <span style={styles.hakedistenDusmeyen}>· hakedişten düşmez</span>}
                    </div>
                  )}

                  {/* Hastalık raporu upload */}
                  {hastalık && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Hastalık Raporu <span style={{ color: "#94a3b8", fontWeight: "400", textTransform: "none" }}>(opsiyonel)</span></label>
                      <label style={styles.uploadArea}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
                          onChange={e => setDosya(e.target.files[0] || null)} />
                        {dosya ? (
                          <div style={styles.uploadDone}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                            <span style={{ color: "#059669" }}>{dosya.name}</span>
                            <button type="button" onClick={e => { e.preventDefault(); setDosya(null); }} style={styles.dosyaKapat}>✕</button>
                          </div>
                        ) : (
                          <div style={styles.uploadPrompt}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span style={{ color: "#94a3b8", fontSize: "13px" }}>PDF, JPG veya PNG yükle</span>
                          </div>
                        )}
                      </label>
                    </div>
                  )}

                  {/* Açıklama */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Açıklama <span style={{ color: "#94a3b8", fontWeight: "400", textTransform: "none" }}>(opsiyonel)</span></label>
                    <textarea value={aciklama} onChange={e => setAciklama(e.target.value)}
                      placeholder="Varsa detay ekleyebilirsiniz..." rows={3} style={styles.textarea}
                      onFocus={e => e.target.style.borderColor = "#2563eb"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>

                  {status && (
                    <div style={{ ...styles.statusBox, ...(status.type === "success" ? styles.statusSuccess : styles.statusError) }}>
                      {status.msg}
                    </div>
                  )}

                  <button type="submit" disabled={loading || (bitis && baslangic && bitis < baslangic)}
                    style={{ ...styles.submitBtn, opacity: (loading || (bitis && baslangic && bitis < baslangic)) ? 0.5 : 1, cursor: (bitis && baslangic && bitis < baslangic) ? "not-allowed" : "pointer" }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)")}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    "İzin Talebini Gönder"
                  </button>
                </form>
              </div>
            </div>

            {/* Yaklaşan izinler */}
            {yaklasanIzinler.length > 0 && (
              <div style={styles.yaklasanCard}>
                <h3 style={styles.yaklasanTitle}>Şubenizdeki Yaklaşan İzinler</h3>
                <div style={styles.yaklasanList}>
                  {yaklasanIzinler.map((iz, i) => (
                    <div key={i} style={styles.yaklasanRow}>
                      <div>
                        <div style={styles.yaklasanIsim}>{iz["Personel"]}</div>
                        <div style={styles.yaklasanTur}>{(iz["Mazeret"] || "").split(" - ")[0]}</div>    
                        <div style={styles.yaklasanTarih}>{formatTarih(iz["Başlangıç"])} – {formatTarih(iz["Bitiş"])}</div>
                      </div>
                      <div style={styles.yaklasanBadge}>{iz["Gün Sayısı"]} gün</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Calibri, sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function AdminPanel({ list, loading, onRefresh, scriptUrl, adminEmail, isAdmin }) {
  const [roller, setRoller] = useState([]);
  useEffect(() => { fetchRoller().then(setRoller).catch(() => setRoller(["staff","manager","director","owner","admin"])); }, []);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", sirket: "", sube: "", girisTarihi: "", email: "", pass: "", title: "staff", crmId: "" });
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [subeler, setSubeler] = useState([]);
  const [showDuzenle, setShowDuzenle] = useState(false);
  const [duzenleTab, setDuzenleTab] = useState("personel");
  const [duzenleData, setDuzenleData] = useState({ personel: [], moduller: [], id: [] });
  const [duzenleLoading, setDuzenleLoading] = useState(false);
  const [showSubeler, setShowSubeler] = useState(false);
  const [subeTab, setSubeTab] = useState("ekle");
  const [subeListAll, setSubeListAll] = useState([]);
  const [subeLoading, setSubeLoading] = useState(false);
  const [yeniSube, setYeniSube] = useState({ sirket: "Bilimevi", sube: "" });
  const [subeKisiOnay, setSubeKisiOnay] = useState(null); // { sirket, sube, mod: "sil"|"duzenle" }
  const [subeEkleSaving, setSubeEkleSaving] = useState(false);
  const [subeSilSaving, setSubeSilSaving] = useState(false);
  const [saveOverlay, setSaveOverlay] = useState(false);

  async function fetchSubeListAll() {
    setSubeLoading(true);
    try {
      const csv = await fetchSheetCSV("Mail Grupları");
      const rows = parseCSV(csv);
      setSubeListAll(rows.filter(r => r["Şube"]).map(r => ({ sirket: r["Şirket"] || "", sube: r["Şube"] || "" })));
    } catch (_) { setSubeListAll([]); }
    setSubeLoading(false);
  }

  async function handleSubeEkle() {
    if (!yeniSube.sube.trim()) return;
    setSubeEkleSaving(true);
    await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "addSube", sirket: yeniSube.sirket, sube: yeniSube.sube.trim() }) });
    setYeniSube(p => ({ ...p, sube: "" }));
    setSubeEkleSaving(false);
    fetchSubeListAll();
  }

  async function handleSubeSil(sirket, sube, kisiDahil) {
    setSubeSilSaving(true);
    await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "deleteSube", sirket, sube, kisiDahil }) });
    setSubeSilSaving(false);
    setSubeKisiOnay(null);
    fetchSubeListAll();
    onRefresh();
  }

  async function fetchDuzenleData() {
    setDuzenleLoading(true);
    try {
      const [pCSV, mCSV, iCSV] = await Promise.all([
        fetchSheetCSV("Personel"),
        fetchSheetCSV("Modüller"),
        fetchSheetCSV("ID"),
      ]);
      setDuzenleData({ personel: parseCSV(pCSV), moduller: parseCSV(mCSV), id: parseCSV(iCSV) });
    } catch (_) {}
    setDuzenleLoading(false);
  }

  async function fetchSubeler(sirket) {
    try {
      const csv = await fetchSheetCSV("Mail Grupları");
      const rows = parseCSV(csv);
      const filtered = rows
        .filter(r => (r["Şirket"] || "").trim() === sirket)
        .map(r => (r["Şube"] || "").trim())
        .filter(Boolean)
        .sort();
      setSubeler(filtered);
    } catch (_) { setSubeler([]); }
  }

  async function handleYeniKullanici(e) {
    e.preventDefault();
    setFormError("");
    if (!formData.email.includes("@")) { setFormError("Geçerli bir e-posta adresi girin."); return; }
    setFormSaving(true);
    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ action: "addNewEmployee", ...formData }),
      });
      setShowModal(false);
      setFormData({ name: "", sirket: "", sube: "", girisTarihi: "", email: "", pass: "", title: "staff", crmId: "" });
      setSubeler([]);
      onRefresh();
    } catch (_) {
      setFormError("Kayıt sırasında hata oluştu.");
    }
    setFormSaving(false);
  }

  const grouped = list.reduce((acc, emp) => {
    const key = `${emp["Şirket"]} - ${emp["Şube"]}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(emp);
    return acc;
  }, {});

  return (
    <div style={styles.adminWrap}>
      {saveOverlay && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, pointerEvents: "none" }}>
          <div style={{ background: "#fff", border: "1.5px solid #bbf7d0", color: "#15803d", padding: "16px 28px", borderRadius: "14px", fontSize: "14px", fontWeight: "600", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
            Drive Güncellendi
          </div>
        </div>
      )}
      {showSubeler && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", width: "480px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", position: "relative" }}>
            <button onClick={() => setShowSubeler(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8" }}>✕</button>
            <h3 style={{ fontWeight: "700", fontSize: "16px", marginBottom: "20px", color: "#0f172a" }}>Şube Yönetimi</h3>
            <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
              {["ekle","listele"].map(t => (
                <button key={t} onClick={() => setSubeTab(t)}
                  style={{ padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: "Calibri, sans-serif", background: subeTab === t ? "#2563eb" : "#f1f5f9", color: subeTab === t ? "#fff" : "#475569" }}>
                  {t === "ekle" ? "Şube Ekle" : "Şubeleri Gör / Sil"}
                </button>
              ))}
            </div>
            {subeTab === "ekle" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>Şirket</label>
                  <select value={yeniSube.sirket} onChange={e => setYeniSube(p => ({ ...p, sirket: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", fontFamily: "Calibri, sans-serif" }}>
                    {["Bilimevi","Premium Vize","Fortis","Vagus"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>Şube Adı</label>
                  <input value={yeniSube.sube} onChange={e => setYeniSube(p => ({ ...p, sube: e.target.value }))} placeholder="Şube adını girin"
                    style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", fontFamily: "Calibri, sans-serif" }} />
                </div>
                <button onClick={handleSubeEkle} disabled={!yeniSube.sube.trim() || subeEkleSaving}
                  style={{ padding: "9px", background: yeniSube.sube.trim() && !subeEkleSaving ? "#2563eb" : "#bfdbfe", color: "#fff", border: "none", borderRadius: "8px", cursor: yeniSube.sube.trim() && !subeEkleSaving ? "pointer" : "not-allowed", fontWeight: "600", fontSize: "13px", fontFamily: "Calibri, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  {subeEkleSaving ? <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : null}
                  {subeEkleSaving ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            )}
            {subeTab === "listele" && (
              <div>
                {subeLoading ? <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>Yükleniyor...</div> : (
                  Object.entries(subeListAll.reduce((acc, r) => { if (!acc[r.sirket]) acc[r.sirket] = []; acc[r.sirket].push(r.sube); return acc; }, {})).sort().map(([sirket, subeler]) => (
                    <div key={sirket} style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>{sirket}</div>
                      {subeler.sort().map(sube => (
                        <div key={sube} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: "8px", background: "#f8fafc", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13px" }}>{sube}</span>
                          <button onClick={() => setSubeKisiOnay({ sirket, sube })}
                            style={{ padding: "4px 8px", background: "#fef2f2", border: "none", borderRadius: "6px", cursor: "pointer", color: "#dc2626", fontSize: "12px" }}>Sil</button>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
            {subeKisiOnay && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "#fff", borderRadius: "14px", padding: "28px 32px", width: "340px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                  <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "8px", color: "#0f172a" }}>Şubeyi Sil</div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>
                    <b style={{ color: "#0f172a" }}>{subeKisiOnay.sube}</b> şubesi silinecek. Bu şubedeki kişiler de silinsin mi?
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button onClick={() => handleSubeSil(subeKisiOnay.sirket, subeKisiOnay.sube, true)} disabled={subeSilSaving}
                      style={{ padding: "9px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: subeSilSaving ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "Calibri, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      {subeSilSaving ? <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : null}
                      {subeSilSaving ? "Siliniyor..." : "Evet, kişileri de sil"}
                    </button>
                    <button onClick={() => handleSubeSil(subeKisiOnay.sirket, subeKisiOnay.sube, false)} disabled={subeSilSaving}
                      style={{ padding: "9px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: subeSilSaving ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "Calibri, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      {subeSilSaving ? <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : null}
                      {subeSilSaving ? "Siliniyor..." : "Hayır, kişileri koru (şube bilgisi boşalır)"}
                    </button>
                    <button onClick={() => setSubeKisiOnay(null)} disabled={subeSilSaving}
                      style={{ padding: "9px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: subeSilSaving ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "Calibri, sans-serif" }}>
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showDuzenle && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalBox, maxWidth: "960px", width: "98vw" }}>
            {duzenleLoading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <div style={styles.loadingSpinner} /><span style={{ marginLeft: 10, fontWeight: 600 }}>Yükleniyor...</span>
              </div>
            )}
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Kullanıcıları Düzenle</h3>
              <button onClick={() => setShowDuzenle(false)} style={styles.modalClose}>✕</button>
            </div>
            {/* Sekmeler */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "0" }}>
              {[["personel","Personel"],["moduller","Modüller"],["id","ID"]].map(([key,label]) => (
                <button key={key} onClick={() => setDuzenleTab(key)} style={{
                  padding: "8px 18px", border: "none", background: "none", cursor: "pointer",
                  fontWeight: duzenleTab === key ? "700" : "500",
                  color: duzenleTab === key ? "#2563eb" : "#64748b",
                  borderBottom: duzenleTab === key ? "2px solid #2563eb" : "2px solid transparent",
                  marginBottom: "-2px", fontSize: "13px", fontFamily: "Calibri, sans-serif"
                }}>{label}</button>
              ))}
            </div>
            <div style={duzenleTab === "moduller" ? { maxHeight: "60vh", overflowY: "auto" } : { maxHeight: "60vh", overflowY: "auto" }}>
              {duzenleTab === "personel" && <DuzenlePersonel data={duzenleData.personel} scriptUrl={scriptUrl} onRefresh={fetchDuzenleData} roller={roller}
                onSaveStart={() => {}}
                onSaveDone={() => { setSaveOverlay(true); setTimeout(() => setSaveOverlay(false), 2000); }}
              />}
              {duzenleTab === "moduller" && (
                <DuzenleModuller data={duzenleData.moduller} scriptUrl={scriptUrl} onRefresh={fetchDuzenleData} />
              )}
              {duzenleTab === "id" && <DuzenleID data={duzenleData.id} personelData={duzenleData.personel} scriptUrl={scriptUrl} onRefresh={fetchDuzenleData} onSaveDone={() => { setSaveOverlay(true); setTimeout(() => setSaveOverlay(false), 2000); }} />}
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            {formSaving && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", zIndex: 10 }}>
                <div style={styles.loadingSpinner} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>Kaydediliyor...</span>
              </div>
            )}
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Yeni Kullanıcı Ekle</h3>
              <button onClick={() => setShowModal(false)} style={styles.modalClose}>✕</button>
            </div>
            <form onSubmit={handleYeniKullanici} style={styles.modalForm}>
              {/* Ad Soyad */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Ad Soyad</label>
                <input type="text" required value={formData.name}
                  onChange={e => {
                    const val = e.target.value.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ\s]/g, "");
                    setFormData(p => ({ ...p, name: val }));
                  }}
                  style={styles.modalInput} />
              </div>
              {/* Şirket dropdown */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Şirket</label>
                <select required value={formData.sirket}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(p => ({ ...p, sirket: val, sube: "" }));
                    if (val) fetchSubeler(val);
                    else setSubeler([]);
                  }}
                  style={styles.modalInput}>
                  <option value="">Seçiniz</option>
                  <option value="Bilimevi">Bilimevi</option>
                  <option value="Premium Vize">Premium Vize</option>
                  <option value="Fortis">Fortis</option>
                  <option value="Vagus">Vagus</option>
                </select>
              </div>
              {/* Şube dropdown — şirkete göre dinamik */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Şube</label>
                <select required value={formData.sube}
                  onChange={e => setFormData(p => ({ ...p, sube: e.target.value }))}
                  style={styles.modalInput}
                  disabled={!formData.sirket}>
                  <option value="">{formData.sirket ? "Seçiniz" : "Önce şirket seçin"}</option>
                  {subeler.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Giriş Tarihi */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Giriş Tarihi</label>
                <input type="date" required value={formData.girisTarihi}
                  onChange={e => {
                    const val = e.target.value;
                    const pass = val ? val.split("-").reverse().join("") : "";
                    setFormData(p => ({ ...p, girisTarihi: val, pass }));
                  }}
                  style={styles.modalInput}
                />
              </div>
              {/* E-posta */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>E-posta</label>
                <input type="email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={styles.modalInput} />
              </div>
              {/* Şifre — otomatik, pasif */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Şifre (otomatik)</label>
                <input type="text" readOnly value={formData.pass} style={{ ...styles.modalInput, background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }} />
              </div>
              {/* TITLE */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Title</label>
                <select value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} style={styles.modalInput}>
                  {roller.map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
                </select>
              </div>
              {/* CRM ID */}
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>CRM ID (opsiyonel)</label>
                <input type="number" value={formData.crmId} onChange={e => setFormData(p => ({ ...p, crmId: e.target.value }))} style={styles.modalInput} />
              </div>
              {formError && <div style={{ color: "#dc2626", fontSize: "13px" }}>{formError}</div>}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>İptal</button>
                <button type="submit" disabled={formSaving} style={styles.saveBtn}>{formSaving ? "..." : "Kaydet"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div style={styles.adminHeader}>
        <h2 style={styles.adminTitle}>Yönetici Paneli</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {isAdmin && <button onClick={() => { setShowSubeler(true); fetchSubeListAll(); }} style={{ ...styles.duzenleBtn, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Şubeler
          </button>}
          {isAdmin && <button onClick={() => { setShowDuzenle(true); fetchDuzenleData(); }} style={styles.duzenleBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Kullanıcıları Düzenle
          </button>}
          {isAdmin && <button onClick={() => setShowModal(true)} style={styles.newUserBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Yeni Kullanıcı
          </button>}
          <button onClick={onRefresh} style={styles.refreshBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Yenile
          </button>
        </div>
      </div>
      {loading ? <div style={styles.adminLoading}>Yükleniyor...</div> : (
        <div style={styles.groupList}>
          {Object.entries(grouped).sort().map(([dept, emps]) => (
            <DeptGroup key={dept} dept={dept} emps={emps} scriptUrl={scriptUrl} onRefresh={onRefresh} adminEmail={adminEmail} isAdmin={isAdmin} roller={roller} />
          ))}
        </div>
      )}
    </div>
  );
}


function groupByDept(rows) {
  return rows.reduce((acc, r) => {
    const key = (r["Şirket"] || r["sirket"] || "Diğer") + " - " + (r["Şube"] || r["sube"] || "");
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
}

function DuzenlePersonel({ data, scriptUrl, onRefresh, roller, onSaveStart, onSaveDone }) {
  const grouped = groupByDept(data);
  const [activeKey, setActiveKey] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {Object.entries(grouped).sort().map(([dept, rows]) => (
        <div key={dept}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>{dept}</div>
          <div style={{ overflowX: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "18%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Ad Soyad","Şirket","Şube","E-posta","Giriş Tarihi","Title",""].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((row, i) => {
                const rowKey = dept + "_" + i;
                return <PersonelEditRow key={rowKey} row={row} scriptUrl={scriptUrl} onRefresh={onRefresh} roller={roller}
                  isActive={activeKey === rowKey}
                  onActivate={() => setActiveKey(rowKey)}
                  onDeactivate={() => setActiveKey(null)}
                  onSaveStart={onSaveStart}
                  onSaveDone={onSaveDone}
                />;
              })}
            </tbody>
          </table></div>
        </div>
      ))}
    </div>
  );
}

function ddmmyyyyToInput(val) {
  if (!val) return "";
  const p = val.split(".");
  if (p.length === 3) return p[2] + "-" + p[1] + "-" + p[0];
  return val;
}
function inputToDdmmyyyy(val) {
  if (!val) return "";
  const p = val.split("-");
  if (p.length === 3) return p[2] + "." + p[1] + "." + p[0];
  return val;
}

function PersonelEditRow({ row, scriptUrl, onRefresh, roller, isActive, onActivate, onDeactivate, onSaveStart, onSaveDone }) {
  const editing = isActive;
  const [showSil, setShowSil] = useState(false);
  const [silOnay, setSilOnay] = useState("");
  const [silSaving, setSilSaving] = useState(false);
  const rawGiris = row["Giriş Tarihi"] || "";
  const [vals, setVals] = useState({
    sirket: row["Şirket"] || "",
    sube: row["Şube"] || "",
    email: row["E-posta"] || "",
    girisInput: ddmmyyyyToInput(rawGiris),
    title: (row["Title"] || "staff").toLowerCase()
  });
  const [subeList, setSubeList] = useState([]);
  const [saving, setSaving] = useState(false);

  async function handleSil() {
    setSilSaving(true);
    await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "deletePersonel", name: row["Ad Soyad"] }) });
    setSilSaving(false); setShowSil(false); onRefresh();
  }

  async function loadSubeler(sirket) {
    try {
      const csv = await fetchSheetCSV("Mail Grupları");
      const rows = parseCSV(csv);
      const filtered = rows
        .filter(r => (r["Şirket"] || "").trim() === sirket)
        .map(r => (r["Şube"] || "").trim())
        .filter(Boolean)
        .sort();
      setSubeList(filtered);
    } catch (_) { setSubeList([]); }
  }

  useEffect(() => { if (editing && vals.sirket) loadSubeler(vals.sirket); }, [editing]);

  async function handleSave() {
    setSaving(true);
    if (onSaveStart) onSaveStart();
    const giris = inputToDdmmyyyy(vals.girisInput);
    await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "updatePersonelRow", name: row["Ad Soyad"], sirket: vals.sirket, sube: vals.sube, email: vals.email, giris, title: vals.title }) });
    setSaving(false);
    if (onDeactivate) onDeactivate();
    if (onSaveDone) onSaveDone();
    onRefresh();
  }

  if (!editing) return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={{ padding: "8px 10px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row["Ad Soyad"]}</td>
      <td style={{ padding: "8px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vals.sirket}</td>
      <td style={{ padding: "8px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vals.sube}</td>
      <td style={{ padding: "8px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={vals.email}>{vals.email}</td>
      <td style={{ padding: "8px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inputToDdmmyyyy(vals.girisInput)}</td>
      <td style={{ padding: "8px 10px", overflow: "hidden" }}><span style={{ padding: "2px 8px", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: "700" }}>{vals.title}</span></td>
      <td style={{ padding: "8px 10px" }}>
        {showSil ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "28px 32px", width: "320px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "8px", color: "#0f172a" }}>Kullanıcıyı Sil</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Onaylamak için <b style={{ color: "#0f172a" }}>{row["Ad Soyad"]} sil</b> yazın.</div>
              <input value={silOnay} onChange={e => setSilOnay(e.target.value)} placeholder={`${row["Ad Soyad"]} sil`}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", fontFamily: "Calibri, sans-serif", marginBottom: "16px", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={() => { setShowSil(false); setSilOnay(""); }} style={{ padding: "7px 16px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>İptal</button>
                <button onClick={handleSil} disabled={silOnay !== `${row["Ad Soyad"]} sil` || silSaving}
                  style={{ padding: "7px 16px", background: silOnay === `${row["Ad Soyad"]} sil` ? "#dc2626" : "#fca5a5", color: "#fff", border: "none", borderRadius: "8px", cursor: silOnay === `${row["Ad Soyad"]} sil` ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: "600" }}>
                  {silSaving ? "..." : "Sil"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={() => onActivate && onActivate()} style={{ padding: "4px 10px", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Düzenle</button>
          <button onClick={() => setShowSil(true)} style={{ padding: "4px 8px", background: "#fef2f2", border: "none", borderRadius: "6px", cursor: "pointer", color: "#dc2626" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
      <td style={{ padding: "8px 10px", fontWeight: "600" }}>{row["Ad Soyad"]}</td>
      {/* Şirket */}
      <td style={{ padding: "2px 4px", overflow: "hidden" }}>
        <select value={vals.sirket}
          onChange={e => { const v = e.target.value; setVals(p => ({ ...p, sirket: v, sube: "" })); loadSubeler(v); }}
          style={{ width: "100%", padding: "4px 4px", border: "1.5px solid #2563eb", borderRadius: "6px", fontSize: "11px", fontFamily: "Calibri, sans-serif", boxSizing: "border-box" }}>
          {["Bilimevi","Premium Vize","Fortis","Vagus"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      {/* Şube */}
      <td style={{ padding: "2px 4px", overflow: "hidden" }}>
        <select value={vals.sube} onChange={e => setVals(p => ({ ...p, sube: e.target.value }))}
          style={{ width: "100%", padding: "4px 4px", border: "1.5px solid #2563eb", borderRadius: "6px", fontSize: "11px", fontFamily: "Calibri, sans-serif", boxSizing: "border-box" }}>
          <option value={vals.sube}>{vals.sube || "Seçiniz"}</option>
          {subeList.filter(s => s !== vals.sube).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      {/* Email */}
      <td style={{ padding: "2px 4px", overflow: "hidden" }}>
        <input value={vals.email} onChange={e => setVals(p => ({ ...p, email: e.target.value }))}
          style={{ width: "100%", padding: "4px 4px", border: "1.5px solid #2563eb", borderRadius: "6px", fontSize: "11px", fontFamily: "Calibri, sans-serif", boxSizing: "border-box" }} />
      </td>
      <td style={{ padding: "2px 4px", overflow: "hidden" }}>
        <input type="date" value={vals.girisInput} onChange={e => setVals(p => ({ ...p, girisInput: e.target.value }))}
          style={{ width: "100%", padding: "4px 2px", border: "1.5px solid #2563eb", borderRadius: "6px", fontSize: "11px", fontFamily: "Calibri, sans-serif", boxSizing: "border-box" }} />
      </td>
      <td style={{ padding: "2px 4px", overflow: "hidden" }}>
        <select value={vals.title} onChange={e => setVals(p => ({ ...p, title: e.target.value }))}
          style={{ width: "100%", padding: "4px 2px", border: "1.5px solid #2563eb", borderRadius: "6px", fontSize: "11px", fontFamily: "Calibri, sans-serif", boxSizing: "border-box" }}>
          {(roller && roller.length > 0 ? roller : ["staff","manager","director","owner"]).map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
        </select>
      </td>
      <td style={{ padding: "2px 4px", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: "2px" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "4px 8px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px", minWidth: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {saving ? <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : "✓"}
          </button>
          <button onClick={() => onDeactivate && onDeactivate()} style={{ padding: "4px 8px", background: "#e2e8f0", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>✕</button>
        </div>
      </td>
    </tr>
  );
}


const DuzenleModuller = memo(function DuzenleModuller({ data, scriptUrl, onRefresh }) {
  const [moduller, setModuller] = useState([]);
  const [globalVals, setGlobalVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSheetCSV("Modüller").then(csv => {
      const lines = csv.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      const mods = headers.filter(h => h && h !== "Ad Soyad");
      setModuller(mods);
      const init = {};
      data.forEach(row => {
        init[row["Ad Soyad"]] = {};
        mods.forEach(m => { init[row["Ad Soyad"]][m] = (row[m] || "hayır") === "evet"; });
      });
      setGlobalVals(init);
    }).catch(() => {
      const mods = ["İzin Yönetimi","İnstagram DM","Quiz Cevapları","Bülten Düzenleyici","STM"];
      setModuller(mods);
      const init = {};
      data.forEach(row => {
        init[row["Ad Soyad"]] = {};
        mods.forEach(m => { init[row["Ad Soyad"]][m] = (row[m] || "hayır") === "evet"; });
      });
      setGlobalVals(init);
    });
  }, [data]);

  function toggleVal(name, modul) {
    setGlobalVals(prev => ({
      ...prev,
      [name]: { ...prev[name], [modul]: !prev[name]?.[modul] }
    }));
  }

  function toggleAll(modul) {
    const allChecked = data.length > 0 && data.every(row => globalVals[row["Ad Soyad"]]?.[modul]);
    setGlobalVals(prev => {
      const next = { ...prev };
      data.forEach(row => {
        next[row["Ad Soyad"]] = { ...next[row["Ad Soyad"]], [modul]: !allChecked };
      });
      return next;
    });
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const rows = data.map(row => {
        const name = row["Ad Soyad"];
        const rowData = { name };
        moduller.forEach(m => { rowData[m] = globalVals[name]?.[m] ? "evet" : "hayır"; });
        return rowData;
      });
      await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "updateModullerBulk", rows }) });
    } catch(e) {
      console.error(e);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const adColW = "20%";
  const modColW = moduller.length > 0 ? (80 / moduller.length).toFixed(1) + "%" : "10%";

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px 10px 0 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: adColW }} />
            {moduller.map((_, i) => <col key={i} style={{ width: modColW }} />)}
          </colgroup>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "700", color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: "12px", position: "sticky", top: 0, background: "#f1f5f9", zIndex: 1 }}>Ad Soyad</th>
              {moduller.map((m) => (
                <th key={m} style={{ padding: "8px 4px", textAlign: "center", fontWeight: "700", color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: "11px", wordBreak: "break-word", lineHeight: "1.3", borderLeft: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#f1f5f9", zIndex: 1 }}>
                  <div style={{ marginBottom: "4px" }}>{m}</div>
                  <div>
                    <input type="checkbox"
                      checked={data.length > 0 && data.every(row => globalVals[row["Ad Soyad"]]?.[m])}
                      onChange={() => toggleAll(m)}
                      title="Tümünü seç/kaldır"
                      style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "#2563eb" }} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const name = row["Ad Soyad"];
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid #f1f5f9" : "none", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ padding: "9px 12px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1e293b" }}>{name}</td>
                  {moduller.map(m => (
                    <td key={m} style={{ padding: "9px 4px", textAlign: "center", borderLeft: "1px solid #f1f5f9" }}>
                      <input type="checkbox"
                        checked={globalVals[name]?.[m] || false}
                        onChange={() => toggleVal(name, m)}
                        style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#2563eb" }} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #e2e8f0", padding: "12px 0", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px" }}>

        <button onClick={handleSaveAll} disabled={saving}
          style={{ padding: "9px 24px", background: saving ? "#bfdbfe" : saved ? "#059669" : "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
          {saving
            ? <><span style={{ display: "inline-block", width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Kaydediliyor...</>
            : saved ? "✓ Kaydedildi" : "Tüm Değişiklikleri Kaydet"
          }
        </button>
      </div>
    </div>
  );
});

function DuzenleID({ data, personelData, scriptUrl, onRefresh, onSaveDone }) {
  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead><tr style={{ background: "#f8fafc" }}>
          {["E-posta","CRM ID",""].map(h => (
            <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {data.filter(r => r["Email"]).map((row, i) => <IDEditRow key={i} row={row} scriptUrl={scriptUrl} onRefresh={onRefresh} onSaveDone={onSaveDone} />)}
        </tbody>
      </table>
    </div>
  );
}

function IDEditRow({ row, scriptUrl, onRefresh, onSaveDone }) {
  const [editing, setEditing] = useState(false);
  const [crmId, setCrmId] = useState(row["ID"] || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "updateIdRow", email: row["Email"], id: crmId }) });
    setSaving(false); setEditing(false);
    if (onSaveDone) onSaveDone();
    onRefresh();
  }

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={{ padding: "8px 10px" }}>{row["Email"]}</td>
      <td style={{ padding: "8px 10px" }}>
        {editing
          ? <input type="text" value={crmId} onChange={e => setCrmId(e.target.value)} style={{ padding: "5px 8px", border: "1.5px solid #2563eb", borderRadius: "6px", fontSize: "13px", width: "140px" }} />
          : <span>{crmId || <span style={{ color: "#94a3b8" }}>—</span>}</span>
        }
      </td>
      <td style={{ padding: "8px 10px" }}>
        {editing
          ? <span style={{ display: "flex", gap: "4px" }}>
              <button onClick={handleSave} disabled={saving} style={{ padding: "4px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px", minWidth: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {saving ? <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : "✓"}
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: "4px 10px", background: "#e2e8f0", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          : <button onClick={() => setEditing(true)} style={{ padding: "4px 10px", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Düzenle</button>
        }
      </td>
    </tr>
  );
}

function DeptGroup({ dept, emps, scriptUrl, onRefresh, adminEmail, isAdmin, roller }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={styles.deptCard}>
      <button onClick={() => setOpen(!open)} style={styles.deptHeader}>
        <div style={styles.deptLeft}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="16" height="16">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={styles.deptName}>{dept}</span>
          <span style={styles.deptCount}>{emps.length} kişi</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="16" height="16"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={styles.empList}>
          {emps.map((emp, i) => <EmpRow key={i} emp={emp} scriptUrl={scriptUrl} onRefresh={onRefresh} adminEmail={adminEmail} isAdmin={isAdmin} roller={roller} />)}
        </div>
      )}
    </div>
  );
}

function EmpRow({ emp, scriptUrl, onRefresh, adminEmail, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [displayHakedis, setDisplayHakedis] = useState(Number(emp["Hakediş"]) || 0);
  const [displayKalan, setDisplayKalan] = useState(Number(emp["Kalan İzin"]) || 0);
  const [newHakedis, setNewHakedis] = useState(String(Number(emp["Hakediş"]) || 0));
  const [saving, setSaving] = useState(false);

  const kalan = displayKalan;
  const hakedis = displayHakedis;

  async function handleSave() {
    const yeni = Number(newHakedis);
    if (isNaN(yeni) || yeni < 0) return;
    setSaving(true);
    try {
     
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          action: "updateHakedis",
          personelAdi: emp["Ad Soyad"],
          yeniHakedis: yeni,
          adminEmail: adminEmail,
        }),
      });
      // Sadece Hakediş değişir, Kalan İzin = Hakediş - Kullanılan İzin
      const kullanilan = Number(emp["Kullanılan İzin"]) || 0;
      setDisplayHakedis(yeni);
      setDisplayKalan(yeni - kullanilan);
      setEditing(false);
      setSaving(false);
 } catch (_) {
  setSaving(false);
}
}
  return (
    <div style={styles.empRow}>
      <div>
        <div style={styles.empName}>{emp["Ad Soyad"]}</div>
        <div style={styles.empMeta}>{emp["E-posta"]} · Giriş: {emp["Giriş Tarihi"]}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {editing ? (
          <>
            <input type="text" inputMode="decimal" value={newHakedis} onChange={e => setNewHakedis(e.target.value.replace(",", "."))} style={styles.editInput} autoFocus />
            <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>{saving ? <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : "✓"}</button>
            <button onClick={() => { setEditing(false); setNewHakedis(String(hakedis)); }} style={styles.cancelBtn}>✕</button>
          </>
        ) : (
          <>
            <span style={styles.kalanLabel}>Kalan İzin</span>
            <div style={{ ...styles.kalanBadge, background: kalan <= 5 ? "#fef2f2" : "#ecfdf5", color: kalan <= 5 ? "#dc2626" : "#059669", border: `1px solid ${kalan <= 5 ? "#fecaca" : "#a7f3d0"}` }}>
              {kalan} gün
            </div>
            {isAdmin && <button onClick={() => setEditing(true)} style={styles.editBtn} title="Hakediş düzenle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {

  loadingOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" },
  loadingBox: { background: "#fff", borderRadius: "16px", padding: "32px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" },
  loadingSpinner: { width: "36px", height: "36px", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  loadingText: { fontSize: "15px", fontWeight: "600", color: "#0f172a" },
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "Calibri, 'Sora', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "960px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  headerSep: { color: "#cbd5e1", fontSize: "16px" },
  headerTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  adminBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1d4ed8", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  userChip: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" },
  userDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" },
  logoutBtn: { padding: "7px 14px", background: "none", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  main: { maxWidth: "960px", margin: "0 auto", padding: "40px 24px 64px", position: "relative", zIndex: 1 },
  pageLayout: { display: "flex", flexDirection: "column", gap: "24px" },
  formLayout: { display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", animation: "fadeUp 0.4s ease-out" },
  infoCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "28px", height: "fit-content", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  infoTitle: { fontSize: "13px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "20px" },
  infoLoading: { fontSize: "13px", color: "#94a3b8" },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  infoLabel: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  infoValue: { fontSize: "14px", color: "#0f172a", fontWeight: "600" },
  infoDivider: { height: "1px", background: "#f1f5f9", margin: "16px 0" },
  progressWrap: { marginTop: "20px" },
  progressBg: { height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #2563eb, #7c3aed)", borderRadius: "3px", transition: "width 0.6s ease" },
  progressText: { fontSize: "11px", color: "#94a3b8" },
  hakedisBox: { display: "flex", alignItems: "center", gap: "7px", marginTop: "12px", fontSize: "12px", color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", padding: "8px 12px" },
  formCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "36px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  formCardTitle: { fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "28px", letterSpacing: "-0.3px" },
  form: { display: "flex", flexDirection: "column", gap: "22px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  izinGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" },
  izinBtn: { padding: "10px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", fontSize: "13px", fontWeight: "500", color: "#475569", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif", transition: "all 0.15s" },
  izinBtnActive: { background: "#eff6ff", borderColor: "#2563eb", color: "#1d4ed8", fontWeight: "600" },
  digerGrid: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px", animation: "slideDown 0.2s ease-out" },
  digerBtn: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", fontSize: "13px", fontWeight: "500", color: "#475569", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  digerBtnActive: { background: "#f5f3ff", borderColor: "#7c3aed", color: "#6d28d9" },
  digerSure: { fontSize: "11px", color: "#94a3b8", fontWeight: "600" },
  secilenEtiket: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", fontSize: "13px", color: "#6d28d9" },
  etiketKapat: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "13px" },
  dateGrid: { display: "grid", gridTemplateColumns: "1fr", gap: "12px" },
  input: { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", color: "#0f172a", background: "#f8fafc", outline: "none", transition: "border-color 0.2s", fontFamily: "Calibri, 'Sora', sans-serif" },
  textarea: { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", color: "#0f172a", background: "#f8fafc", outline: "none", transition: "border-color 0.2s", fontFamily: "Calibri, 'Sora', sans-serif", resize: "vertical" },
  isGunuBox: { display: "flex", alignItems: "center", gap: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#1d4ed8" },
  hakedistenDusmeyen: { fontSize: "12px", color: "#94a3b8", fontWeight: "400" },
  uploadArea: { display: "block", border: "1.5px dashed #e2e8f0", borderRadius: "10px", padding: "16px", cursor: "pointer", background: "#f8fafc", transition: "border-color 0.2s" },
  uploadPrompt: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  uploadDone: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" },
  dosyaKapat: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", marginLeft: "auto" },
  statusBox: { padding: "12px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "500" },
  statusSuccess: { background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#059669" },
  statusError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" },
  submitBtn: { padding: "13px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "transform 0.15s", boxShadow: "0 4px 14px rgba(37,99,235,0.3)", fontFamily: "Calibri, 'Sora', sans-serif" },
  yaklasanCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  yaklasanTitle: { fontSize: "13px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" },
  yaklasanList: { display: "flex", flexDirection: "column", gap: "8px" },
  yaklasanRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9" },
  yaklasanIsim: { fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "3px" },
  yaklasanTur: { fontSize: "12px", color: "#2563eb", fontWeight: "500", marginBottom: "2px" },
  yaklasanTarih: { fontSize: "12px", color: "#94a3b8" },
  yaklasanBadge: { fontSize: "12px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 12px", borderRadius: "100px" },
  adminWrap: { animation: "fadeUp 0.4s ease-out" },
  adminHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  adminTitle: { fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.3px" },
  duzenleBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  newUserBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modalBox: { background: "#fff", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  modalTitle: { fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  modalClose: { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8", padding: "4px" },
  modalForm: { display: "flex", flexDirection: "column", gap: "14px" },
  modalField: { display: "flex", flexDirection: "column", gap: "6px" },
  modalLabel: { fontSize: "12px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  modalInput: { padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", color: "#0f172a", outline: "none", fontFamily: "Calibri, sans-serif" },
  refreshBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#475569", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  adminLoading: { textAlign: "center", padding: "60px", color: "#94a3b8", fontSize: "14px" },
  groupList: { display: "flex", flexDirection: "column", gap: "8px" },
  deptCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "14px", overflow: "hidden" },
  deptHeader: { width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "Calibri, 'Sora', sans-serif" },
  deptLeft: { display: "flex", alignItems: "center", gap: "10px" },
  deptName: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  deptCount: { fontSize: "11px", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "100px", fontWeight: "600" },
  empList: { borderTop: "1px solid #f1f5f9" },
  empRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f8fafc" },
  empName: { fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "3px" },
  empMeta: { fontSize: "11px", color: "#94a3b8" },
  kalanLabel: { fontSize: "11px", color: "#94a3b8", fontWeight: "500" },
  kalanBadge: { padding: "4px 12px", borderRadius: "100px", fontSize: "12px", fontWeight: "700" },
  editBtn: { display: "flex", alignItems: "center", padding: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#64748b" },
  editInput: { width: "64px", padding: "5px 8px", border: "1.5px solid #2563eb", borderRadius: "7px", fontSize: "13px", fontWeight: "600", outline: "none", fontFamily: "Calibri, 'Sora', sans-serif", textAlign: "center" },
  saveBtn: { padding: "5px 10px", background: "#059669", border: "none", borderRadius: "7px", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  cancelBtn: { padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: "7px", color: "#64748b", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
};
