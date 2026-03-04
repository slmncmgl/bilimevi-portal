import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../utils/sheets";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const SCRIPT_URL = ""; // Apps Script deploy URL buraya

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

async function fetchTumPersonel() {
  const csv = await fetchSheetCSV("Personel");
  return parseCSV(csv).filter(r => r["Ad Soyad"]);
}

async function fetchIslemler() {
  const csv = await fetchSheetCSV("İşlemler");
  return parseCSV(csv).filter(r => r["Personel"]);
}

async function submitIzin(data) {
  await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(data),
  });
  return true;
}

async function updateHakedis(personelAdi, yeniHakedis, eskiHakedis) {
  const fark = yeniHakedis - eskiHakedis;
  const data = {
    action: "updateHakedis",
    personelAdi,
    yeniHakedis,
    fark,
  };
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

const IZIN_TURLERI = ["Yıllık İzin", "Yarım Gün İzin", "Sağlık", "Diğer"];

export default function Izin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [personel, setPersonel] = useState(null);
  const [izinTuru, setIzinTuru] = useState("Yıllık İzin");
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [rol, setRol] = useState("personel"); // personel | evet | admin
  const [adminView, setAdminView] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [yaklasanIzinler, setYaklasanIzinler] = useState([]);

  const yarimGun = izinTuru === "Yarım Gün İzin";
  const isGunu = yarimGun ? 0.5 : isGunuHesapla(baslangic, bitis);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/"); return; }
    setUser(session);
    loadPersonelData(session.name);
  }, []);

  async function loadPersonelData(name) {
    setDataLoading(true);
    try {
      const data = await fetchPersonelData(name);
      setPersonel(data);
      const goruntulemeIzni = (data?.["Görüntüleme İzni"] || "personel").toLowerCase().trim();
      setRol(goruntulemeIzni);

      // Yaklaşan izinleri yükle
      const tumPersonel = await fetchTumPersonel();
      const islemler = await fetchIslemler();
      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0);

      // Aynı şubedeki personel (müdür olmayanlar)
      const subePersonel = tumPersonel.filter(p =>
        p["Şirket"] === data?.["Şirket"] &&
        p["Şube"] === data?.["Şube"] &&
        (p["Görüntüleme İzni"] || "personel").toLowerCase().trim() === "personel"
      );
      const subeIsimler = subePersonel.map(p => p["Ad Soyad"]);

      const gelecekIzinler = islemler.filter(row => {
        const bitis = new Date(row["Bitiş"]);
        return subeIsimler.includes(row["Personel"]) && bitis >= bugun;
      });

      setYaklasanIzinler(gelecekIzinler);
    } catch (_) {}
    setDataLoading(false);
  }

  async function loadAdminList() {
    setAdminLoading(true);
    try {
      const tumPersonel = await fetchTumPersonel();
      const filtered = rol === "admin"
        ? tumPersonel
        : tumPersonel.filter(p =>
            p["Şirket"] === personel?.["Şirket"] &&
            p["Şube"] === personel?.["Şube"]
          );
      setAdminList(filtered);
    } catch (_) {}
    setAdminLoading(false);
  }

  function handleAdminView() {
    setAdminView(true);
    loadAdminList();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!baslangic) return;
    if (!yarimGun && !bitis) { setStatus({ type: "error", msg: "Bitiş tarihi seçiniz." }); return; }
    setLoading(true);
    setStatus(null);
    const formData = {
      personelAdi: user.name,
      baslangicTarihi: baslangic,
      bitisTarihi: yarimGun ? baslangic : bitis,
      izinTuru,
      aciklama,
      userEmail: user.email,
    };
    try {
      await submitIzin(formData);
      setStatus({ type: "success", msg: "İzin talebiniz başarıyla kaydedildi!" });
      setBaslangic(""); setBitis(""); setAciklama("");
      setIzinTuru("Yıllık İzin");
      await loadPersonelData(user.name);
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
            {(rol === "evet" || rol === "admin") && !adminView && (
              <button onClick={handleAdminView} style={styles.adminBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Yönetici Paneli
              </button>
            )}
            {adminView && (
              <button onClick={() => setAdminView(false)} style={styles.adminBtn}>← Kendi İznim</button>
            )}
            <div style={styles.userChip}>
              <div style={styles.userDot} />
              {user.name}
            </div>
            <button onClick={logout} style={styles.logoutBtn}>Çıkış</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {adminView ? (
          <AdminPanel list={adminList} loading={adminLoading} onRefresh={loadAdminList} scriptUrl={SCRIPT_URL} />
        ) : (
          <div style={styles.pageLayout}>
            <div style={styles.formLayout}>
              {/* Bilgi kartı */}
              <div style={styles.infoCard}>
                <h3 style={styles.infoTitle}>İzin Durumu</h3>
                {dataLoading ? (
                  <div style={styles.infoLoading}>Yükleniyor...</div>
                ) : personel ? (
                  <>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Ad Soyad</span>
                      <span style={styles.infoValue}>{personel["Ad Soyad"]}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Şube</span>
                      <span style={styles.infoValue}>{personel["Şube"]}</span>
                    </div>
                    <div style={styles.infoDivider} />
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Toplam Hak</span>
                      <span style={styles.infoValue}>{personel["Hakediş"]} gün</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Kullanılan</span>
                      <span style={{ ...styles.infoValue, color: "#dc2626" }}>{personel["Kullanılan İzin"] || 0} gün</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Kalan</span>
                      <span style={{ ...styles.infoValue, color: "#059669", fontWeight: "700", fontSize: "18px" }}>
                        {personel["Kalan İzin"]} gün
                      </span>
                    </div>
                    <div style={styles.progressWrap}>
                      <div style={styles.progressBg}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${Math.min((Number(personel["Kullanılan İzin"]) / Number(personel["Hakediş"])) * 100, 100)}%`
                        }} />
                      </div>
                      <span style={styles.progressText}>
                        {Math.round((Number(personel["Kullanılan İzin"]) / Number(personel["Hakediş"])) * 100)}% kullanıldı
                      </span>
                    </div>
                    {personel["Giriş Tarihi"] && sonrakiHakedis(personel["Giriş Tarihi"]) && (
                      <div style={styles.hakedisBox}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>Sonraki hakediş: <strong>{sonrakiHakedis(personel["Giriş Tarihi"])}</strong></span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={styles.infoLoading}>Personel verisi bulunamadı.</div>
                )}
              </div>

              {/* Form */}
              <div style={styles.formCard}>
                <h2 style={styles.formCardTitle}>İzin Talep Formu</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>İzin Türü</label>
                    <div style={styles.izinGrid}>
                      {IZIN_TURLERI.map(t => (
                        <button key={t} type="button" onClick={() => setIzinTuru(t)}
                          style={{ ...styles.izinBtn, ...(izinTuru === t ? styles.izinBtnActive : {}) }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.dateGrid}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Başlangıç</label>
                      <input type="date" value={baslangic}
                        onChange={e => setBaslangic(e.target.value)}
                        required style={styles.input}
                        onFocus={e => e.target.style.borderColor = "#2563eb"}
                        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                      />
                    </div>
                    {!yarimGun && (
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Bitiş</label>
                        <input type="date" value={bitis}
                          onChange={e => setBitis(e.target.value)}
                          required={!yarimGun} style={styles.input}
                          onFocus={e => e.target.style.borderColor = "#2563eb"}
                          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                        />
                      </div>
                    )}
                  </div>

                  {(baslangic && (yarimGun || bitis)) && (
                    <div style={styles.isGunuBox}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>{yarimGun ? "Yarım gün izin" : `${isGunu} iş günü`}</span>
                    </div>
                  )}

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                      Açıklama <span style={{ color: "#94a3b8", fontWeight: "400", textTransform: "none" }}>(opsiyonel)</span>
                    </label>
                    <textarea value={aciklama} onChange={e => setAciklama(e.target.value)}
                      placeholder="Varsa detay ekleyebilirsiniz..."
                      rows={3} style={styles.textarea}
                      onFocus={e => e.target.style.borderColor = "#2563eb"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>

                  {status && (
                    <div style={{ ...styles.statusBox, ...(status.type === "success" ? styles.statusSuccess : styles.statusError) }}>
                      {status.msg}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)")}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    {loading ? "Kaydediliyor..." : "İzin Talebini Gönder"}
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
                        <div style={styles.yaklasanTarih}>{iz["Başlangıç"]} – {iz["Bitiş"]}</div>
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
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sora', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function AdminPanel({ list, loading, onRefresh, scriptUrl }) {
  const grouped = list.reduce((acc, emp) => {
    const key = `${emp["Şirket"]} - ${emp["Şube"]}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(emp);
    return acc;
  }, {});

  return (
    <div style={styles.adminWrap}>
      <div style={styles.adminHeader}>
        <h2 style={styles.adminTitle}>Yönetici Paneli</h2>
        <button onClick={onRefresh} style={styles.refreshBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Yenile
        </button>
      </div>
      {loading ? (
        <div style={styles.adminLoading}>Yükleniyor...</div>
      ) : (
        <div style={styles.groupList}>
          {Object.entries(grouped).sort().map(([dept, emps]) => (
            <DeptGroup key={dept} dept={dept} emps={emps} scriptUrl={scriptUrl} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeptGroup({ dept, emps, scriptUrl, onRefresh }) {
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
          {emps.map((emp, i) => (
            <EmpRow key={i} emp={emp} scriptUrl={scriptUrl} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmpRow({ emp, scriptUrl, onRefresh }) {
  const kalan = Number(emp["Kalan İzin"]) || 0;
  const hakedis = Number(emp["Hakediş"]) || 0;
  const [editing, setEditing] = useState(false);
  const [newHakedis, setNewHakedis] = useState(String(hakedis));
  const [saving, setSaving] = useState(false);

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
          fark: yeni - hakedis,
        }),
      });
      setEditing(false);
      onRefresh();
    } catch (_) {}
    setSaving(false);
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
            <input
              type="number" value={newHakedis}
              onChange={e => setNewHakedis(e.target.value)}
              style={styles.editInput}
              autoFocus
            />
            <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
              {saving ? "..." : "✓"}
            </button>
            <button onClick={() => { setEditing(false); setNewHakedis(String(hakedis)); }} style={styles.cancelBtn}>✕</button>
          </>
        ) : (
          <>
            <div style={{ ...styles.kalanBadge, background: kalan <= 5 ? "#fef2f2" : "#ecfdf5", color: kalan <= 5 ? "#dc2626" : "#059669", border: `1px solid ${kalan <= 5 ? "#fecaca" : "#a7f3d0"}` }}>
              {kalan} gün
            </div>
            <button onClick={() => setEditing(true)} style={styles.editBtn} title="Hakediş düzenle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Sora', sans-serif", position: "relative" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#e2e8f018 1px, transparent 1px), linear-gradient(90deg, #e2e8f018 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  header: { position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 10 },
  headerInner: { maxWidth: "960px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  headerSep: { color: "#cbd5e1", fontSize: "16px" },
  headerTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  adminBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1d4ed8", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  userChip: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" },
  userDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" },
  logoutBtn: { padding: "7px 14px", background: "none", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
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
  izinBtn: { padding: "10px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", fontSize: "13px", fontWeight: "500", color: "#475569", cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" },
  izinBtnActive: { background: "#eff6ff", borderColor: "#2563eb", color: "#1d4ed8", fontWeight: "600" },
  dateGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  input: { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", color: "#0f172a", background: "#f8fafc", outline: "none", transition: "border-color 0.2s", fontFamily: "'Sora', sans-serif" },
  textarea: { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", color: "#0f172a", background: "#f8fafc", outline: "none", transition: "border-color 0.2s", fontFamily: "'Sora', sans-serif", resize: "vertical" },
  isGunuBox: { display: "flex", alignItems: "center", gap: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#1d4ed8" },
  statusBox: { padding: "12px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "500" },
  statusSuccess: { background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#059669" },
  statusError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" },
  submitBtn: { padding: "13px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "transform 0.15s", boxShadow: "0 4px 14px rgba(37,99,235,0.3)", fontFamily: "'Sora', sans-serif" },
  yaklasanCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  yaklasanTitle: { fontSize: "13px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" },
  yaklasanList: { display: "flex", flexDirection: "column", gap: "8px" },
  yaklasanRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9" },
  yaklasanIsim: { fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "3px" },
  yaklasanTarih: { fontSize: "12px", color: "#94a3b8" },
  yaklasanBadge: { fontSize: "12px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 12px", borderRadius: "100px" },
  adminWrap: { animation: "fadeUp 0.4s ease-out" },
  adminHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  adminTitle: { fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.3px" },
  refreshBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#475569", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  adminLoading: { textAlign: "center", padding: "60px", color: "#94a3b8", fontSize: "14px" },
  groupList: { display: "flex", flexDirection: "column", gap: "8px" },
  deptCard: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "14px", overflow: "hidden" },
  deptHeader: { width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  deptLeft: { display: "flex", alignItems: "center", gap: "10px" },
  deptName: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  deptCount: { fontSize: "11px", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "100px", fontWeight: "600" },
  empList: { borderTop: "1px solid #f1f5f9" },
  empRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f8fafc" },
  empName: { fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "3px" },
  empMeta: { fontSize: "11px", color: "#94a3b8" },
  kalanBadge: { padding: "4px 12px", borderRadius: "100px", fontSize: "12px", fontWeight: "700" },
  editBtn: { display: "flex", alignItems: "center", padding: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#64748b" },
  editInput: { width: "64px", padding: "5px 8px", border: "1.5px solid #2563eb", borderRadius: "7px", fontSize: "13px", fontWeight: "600", outline: "none", fontFamily: "'Sora', sans-serif", textAlign: "center" },
  saveBtn: { padding: "5px 10px", background: "#059669", border: "none", borderRadius: "7px", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  cancelBtn: { padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: "7px", color: "#64748b", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
};
