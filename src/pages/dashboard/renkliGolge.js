// Klasik temada kartın üstüne gelince modül renginde güçlü bir gölge kartın arkasında rastgele gezinir.
// Gölge her ADIM_MS'de yeni bir konuma geçer, geçişi kartın box-shadow transition'ı yumuşatır (Dashboard.jsx, moduleCard).

const ADIM_MS = 1200;

// İki katman: biri yakın ve yoğun, diğeri ters yönde daha geniş ve soluk. Böylece renk tek bir leke gibi değil, akar gibi görünür.
function rastgeleGolge(renk) {
  const x = Math.round(Math.random() * 48 - 24);
  const y = Math.round(Math.random() * 28 + 10);
  return `${x}px ${y}px 48px -8px ${renk}88, ${-x}px ${Math.round(y / 2)}px 72px -14px ${renk}55`;
}

export function golgeBaslat(el, renk) {
  golgeDurdur(el);
  el.style.boxShadow = rastgeleGolge(renk);
  el._golgeZamanlayici = setInterval(() => {
    // Karta tıklanıp sayfa değişince mouseleave gelmez, zamanlayıcı burada durur.
    if (!el.isConnected) return golgeDurdur(el);
    el.style.boxShadow = rastgeleGolge(renk);
  }, ADIM_MS);
}

export function golgeDurdur(el) {
  clearInterval(el._golgeZamanlayici);
  el._golgeZamanlayici = null;
}
