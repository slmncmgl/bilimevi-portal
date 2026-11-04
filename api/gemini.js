// v1.1 (Güvenlik Faz 1): oturum kontrolü eklendi (AUTH_ENFORCE=1 olana kadar sadece loglanır)
import { oturumKontrol } from "./_oturum.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!oturumKontrol(req, res, "gemini")) return;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const DEFAULT_MODEL = "gemini-3.6-flash";
  const { model, contents, generationConfig } = req.body;
  const useModel = model || DEFAULT_MODEL;

  if (!contents) {
    return res.status(400).json({ error: "contents parametresi gerekli" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, ...(generationConfig ? { generationConfig } : {}) })
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
