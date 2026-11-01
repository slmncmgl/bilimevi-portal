// Dashboard'un en altında çok küçük sürüm satırı: "Dashboard v1.8 · d19d176". Her temada sayfanın sonunda durur.
export default function SurumEtiketi({ surum }) {
  return (
    <>
      <p className="surum-etiketi" translate="no">{surum}</p>
      <style>{`
        .surum-etiketi { margin: 40px 0 0; font: 400 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: .04em; color: inherit; opacity: .5; text-align: center; }
      `}</style>
    </>
  );
}
