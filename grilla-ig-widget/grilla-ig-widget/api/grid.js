// Serverless function (Vercel) — corre en el servidor, así el token de Notion nunca queda expuesto al navegador.
const NOTION_VERSION = '2022-06-28';

function getProp(props, predicate) {
  for (const name of Object.keys(props)) {
    if (predicate(props[name], name)) return props[name];
  }
  return null;
}

function plainText(richTextArr) {
  if (!Array.isArray(richTextArr)) return '';
  return richTextArr.map((t) => t.plain_text || '').join('');
}

function extractImage(prop) {
  if (!prop) return '';
  if (prop.type === 'url') return prop.url || '';
  if (prop.type === 'files') {
    const f = (prop.files || [])[0];
    if (!f) return '';
    if (f.type === 'external') return f.external.url;
    if (f.type === 'file') return f.file.url;
  }
  return '';
}

module.exports = async (req, res) => {
  try {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Falta la variable de entorno NOTION_TOKEN en Vercel (Settings → Environment Variables).' });
      return;
    }
    const databaseId = (req.query && req.query.db) || process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
      res.status(400).json({ error: 'Falta el parámetro ?db=<id de la base de datos de Notion>.' });
      return;
    }

    let results = [];
    let cursor;
    do {
      const r = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 })
      });
      if (!r.ok) {
        const errBody = await r.text();
        res.status(r.status).json({ error: 'Notion API error: ' + errBody });
        return;
      }
      const data = await r.json();
      results = results.concat(data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const posts = results.map((page) => {
      const props = page.properties;

      const titleProp = getProp(props, (p) => p.type === 'title');
      const nombre = titleProp ? plainText(titleProp.title) : 'Sin título';

      // Probamos varias propiedades candidatas en orden, y usamos la primera que
      // realmente tenga una imagen cargada (así si "Link de imagen" está vacío o
      // roto, cae al archivo subido directo a Notion, o a cualquier otra URL).
      const imageCandidates = [
        getProp(props, (p, name) => p.type === 'url' && /imagen|link|image|canva|foto/i.test(name)),
        getProp(props, (p) => p.type === 'files'),
        getProp(props, (p) => p.type === 'url')
      ].filter(Boolean);
      let imagen = '';
      for (const cand of imageCandidates) {
        const val = extractImage(cand);
        if (val) { imagen = val; break; }
      }
      const esVideo = /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(imagen);

      const dateProp = getProp(props, (p) => p.type === 'date');
      const fecha = dateProp && dateProp.date ? dateProp.date.start : null;

      const formatoProp = getProp(props, (p, name) => (p.type === 'select' || p.type === 'multi_select') && /formato|format/i.test(name));
      let formato = '';
      if (formatoProp) {
        if (formatoProp.type === 'select') formato = formatoProp.select ? formatoProp.select.name : '';
        else formato = (formatoProp.multi_select || []).map((o) => o.name).join(',');
      }

      const pilarProp = getProp(props, (p, name) => p.type === 'select' && /pilar|categor|pillar/i.test(name));
      const pilar = pilarProp && pilarProp.select ? pilarProp.select.name : '';

      const estadoProp =
        getProp(props, (p) => p.type === 'status') || getProp(props, (p, name) => p.type === 'select' && /estado|status/i.test(name));
      let estado = '';
      if (estadoProp) {
        if (estadoProp.type === 'status') estado = estadoProp.status ? estadoProp.status.name : '';
        else estado = estadoProp.select ? estadoProp.select.name : '';
      }

      const pinProp = getProp(props, (p, name) => p.type === 'checkbox' && /fijad|pin/i.test(name));
      const fijado = pinProp ? !!pinProp.checkbox : false;

      const copyProp =
        getProp(props, (p, name) => p.type === 'rich_text' && /copy|caption|texto/i.test(name)) ||
        getProp(props, (p) => p.type === 'rich_text');
      const copy = copyProp ? plainText(copyProp.rich_text) : '';

      return { id: page.id, url: page.url, nombre, imagen, esVideo, fecha, formato, pilar, estado, fijado, copy };
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ posts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
