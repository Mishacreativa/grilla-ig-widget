// Serverless function (Vercel) — lee la base de "Perfil de grilla" (foto de perfil +
// historias destacadas) subidas como ARCHIVOS reales en Notion, no como links.
const NOTION_VERSION = '2022-06-28';

function extractFile(prop) {
  if (!prop || prop.type !== 'files') return '';
  const f = (prop.files || [])[0];
  if (!f) return '';
  if (f.type === 'external') return f.external.url;
  if (f.type === 'file') return f.file.url;
  return '';
}

function plainText(richTextArr) {
  if (!Array.isArray(richTextArr)) return '';
  return richTextArr.map((t) => t.plain_text || '').join('');
}

module.exports = async (req, res) => {
  try {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Falta la variable de entorno NOTION_TOKEN en Vercel.' });
      return;
    }
    const databaseId = req.query && req.query.db;
    if (!databaseId) {
      res.status(400).json({ error: 'Falta el parámetro ?db=<id de la base de perfil de Notion>.' });
      return;
    }

    const r = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 1 })
    });
    if (!r.ok) {
      res.status(r.status).json({ error: 'Notion API error: ' + (await r.text()) });
      return;
    }
    const data = await r.json();
    const page = data.results && data.results[0];
    if (!page) {
      res.status(200).json({ avatar: '', highlights: [] });
      return;
    }
    const props = page.properties;

    const avatar = extractFile(props['Foto de perfil']);

    const highlights = [];
    for (let i = 1; i <= 4; i++) {
      const img = extractFile(props['Historia ' + i + ' Imagen']);
      const nameProp = props['Historia ' + i + ' Nombre'];
      const label = nameProp ? plainText(nameProp.rich_text) : '';
      if (img || label) highlights.push({ img, label: label || ('Historia ' + i) });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ avatar, highlights });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
