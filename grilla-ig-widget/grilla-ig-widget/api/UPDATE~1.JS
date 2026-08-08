// Serverless function (Vercel) — usada por "Plan grid" para mover un post a otra fecha
// arrastrándolo en la grilla. Requiere que la integración de Notion tenga permiso
// de "Actualizar contenido" habilitado (no solo "Leer contenido").
const NOTION_VERSION = '2022-06-28';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Falta la variable de entorno NOTION_TOKEN en Vercel.' });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const { db, pageId, date } = body || {};
    if (!db || !pageId || !date) {
      res.status(400).json({ error: 'Faltan parámetros (db, pageId, date).' });
      return;
    }

    // Buscamos cuál propiedad de la base es de tipo "date" para saber su nombre exacto.
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${db}`, {
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION }
    });
    if (!dbRes.ok) {
      res.status(dbRes.status).json({ error: 'Notion API error: ' + (await dbRes.text()) });
      return;
    }
    const dbJson = await dbRes.json();
    const dateEntry = Object.entries(dbJson.properties || {}).find(([, p]) => p.type === 'date');
    if (!dateEntry) {
      res.status(400).json({ error: 'Esta base no tiene ninguna propiedad de tipo fecha.' });
      return;
    }
    const [dateName] = dateEntry;

    const patchRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ properties: { [dateName]: { date: { start: date } } } })
    });
    if (!patchRes.ok) {
      res.status(patchRes.status).json({ error: 'Notion API error: ' + (await patchRes.text()) });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
