// v1.0: Ana sayfadaki "Etkinlik" kartının sayfası (/etkinlik). CRM > Etkinlik sekmesiyle aynı form ve sayaç (EtkinlikFormu.jsx).
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../utils/sheets";
import EtkinlikFormu, { ETKINLIK_SURUM, etkinlikFormuBul } from "./EtkinlikFormu";

// eslint-disable-next-line no-undef
const BUILD_SHA = typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "";

export const etkinlikYetkili = user => {
  const rol = user?.rol?.toLowerCase() || "staff";
  return ["admin", "director", "owner"].includes(rol) || !!etkinlikFormuBul(user?.name);
};

export default function EtkinlikSayfasi() {
  const navigate = useNavigate();
  const user = getSession();
  const yetkili = etkinlikYetkili(user);
  const isAdmin = ["admin", "director", "owner"].includes(user?.rol?.toLowerCase());

  useEffect(() => {
    if (!user) navigate("/");
    else if (!yetkili) navigate("/dashboard");
  }, [user, yetkili, navigate]);

  if (!user || !yetkili) return null;
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: 32 }}>
      <EtkinlikFormu user={user} isAdmin={isAdmin} />
      <div style={{ textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
        Etkinlik {ETKINLIK_SURUM}{BUILD_SHA ? ` · ${BUILD_SHA}` : ""}
      </div>
    </div>
  );
}
