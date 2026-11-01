import { TEMALAR } from "./tema";

// Her temada sağ altta duran küçük görünüm seçici. Sayfa düzenine dokunmaz (position: fixed).
export default function TemaSecici({ tema, onChange, isFortis }) {
  return (
    <div className="tema-secici" role="group" aria-label={isFortis ? "Layout" : "Görünüm"}>
      <span>{isFortis ? "Layout" : "Görünüm"}</span>
      {TEMALAR.map(t => (
        <button key={t.key} type="button" aria-pressed={tema === t.key} onClick={() => onChange(t.key)}>
          {isFortis ? t.en : t.tr}
        </button>
      ))}
      <style>{`
        .tema-secici { position: fixed; right: 16px; bottom: 16px; z-index: 200; display: flex; align-items: center; gap: 2px;
          padding: 4px; background: #fff; border: 1px solid #d3d8e4; border-radius: 10px; box-shadow: 0 8px 24px -10px rgba(0,17,77,.3);
          font-family: 'Inter', system-ui, sans-serif; }
        .tema-secici span { font-size: 11px; font-weight: 600; color: #646569; padding: 0 8px 0 6px; }
        .tema-secici button { font: 500 12px/1 'Inter', system-ui, sans-serif; color: #141b33; background: none; border: 0;
          border-radius: 7px; padding: 7px 10px; cursor: pointer; }
        .tema-secici button:hover { background: #eef1fa; }
        .tema-secici button[aria-pressed="true"] { background: #001A71; color: #fff; }
        .tema-secici button:focus-visible { outline: 2px solid #E50700; outline-offset: 1px; }
        @media (max-width: 640px) {
          .tema-secici { right: 8px; bottom: 8px; }
          .tema-secici span { display: none; }
        }
      `}</style>
    </div>
  );
}
