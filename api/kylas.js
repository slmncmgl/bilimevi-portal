export default async function handler(req, res) {
  const KYLAS_API_KEY = process.env.KYLAS_API_KEY;
  const { path, method, body } = req.body;

  try {
    const response = await fetch(`https://api.kylas.io/v1/${path}`, {
      method: method || "GET",
      headers: { "api-key": KYLAS_API_KEY, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
