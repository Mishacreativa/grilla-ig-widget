# 🖼️ Grilla IG — Widget para Notion

App que replica el widget de "The Content Edit": conecta una base de datos de Notion y muestra la grilla en tiempo real, con estética de perfil de Instagram (grid cuadrado, hover con caption, dark mode, pines, formato). Se hostea aparte y se inserta en Notion como bloque `/embed`.

Sirve para **cualquier cliente**: la misma app funciona con todas las bases, solo cambia el `?db=` en la URL. No hace falta re-desplegar por cliente.

## 1. Crear la integración de Notion (una sola vez)

1. Andá a https://www.notion.so/my-integrations → **New integration**.
2. Ponele un nombre (ej. "Grilla IG Mika Estudio") y creála.
3. Copiá el **Internal Integration Secret** (token) — lo vas a necesitar en el paso 3.
4. En cada base de datos de cliente que quieras mostrar en la grilla: abrila en Notion → `···` (arriba a la derecha) → **Conexiones** → conectá la integración que creaste. Sin este paso la API no puede leer esa base.

## 2. Desplegar en Vercel (gratis)

**Opción rápida sin GitHub:**

1. Instalá Vercel CLI una vez: `npm i -g vercel`
2. Desde esta carpeta (`grilla-ig-widget/`), corré: `vercel`
3. Seguí las preguntas (creá cuenta gratis si no tenés). Elegí "Link to existing project" → No, es nuevo.
4. Cuando termine te da una URL pública, algo como `https://grilla-ig-widget.vercel.app`.

**Opción con GitHub (recomendada si vas a mantenerlo):**

1. Subí esta carpeta a un repo de GitHub.
2. En https://vercel.com → **Add New → Project** → importá el repo.
3. Deploy (no hace falta tocar nada de configuración).

## 3. Configurar el token

1. En el proyecto en Vercel → **Settings → Environment Variables**.
2. Agregá: `NOTION_TOKEN` = el token que copiaste en el paso 1.
3. Volvé a desplegar (Vercel → Deployments → ⋯ → Redeploy) para que tome la variable.

## 4. Usar la grilla con un cliente

1. Abrí la base de datos del cliente en Notion → copiá el ID (los 32 caracteres al final del link, con o sin guiones).
2. Andá a `https://TU-APP.vercel.app/?db=ESE_ID&name=nombre_cliente`
   - `name` es opcional, es solo el texto que aparece como "usuario" arriba de la grilla.
3. Si se ve bien, copiá esa URL completa.

## 5. Insertarla en Notion

1. En la página de Notion donde está el calendario del cliente, escribí `/embed`.
2. Pegá la URL del paso 4.
3. Listo — la grilla queda ahí, se actualiza sola cada vez que alguien toca **↻ Actualizar** dentro del embed (Notion no auto-refresca iframes solo).

## Cómo detecta las columnas de cada base

La función `/api/grid.js` no depende de nombres exactos de propiedades — detecta por **tipo**:
- Título → nombre del post
- Primera propiedad `url` que contenga "imagen/link/canva/foto" (o si no hay, la primera de tipo `files`) → imagen
- Primera propiedad `date` → fecha
- `select`/`multi_select` que contenga "formato" → Post/Carrusel/Reel
- `select` que contenga "pilar"/"categoría" → color del Content Map
- `status` (o `select` con "estado") → punto de color de estado
- `checkbox` que contenga "fijado"/"pin" → pin arriba de la grilla
- `rich_text` → caption del hover

Por eso funciona igual para Mika Estudio, CARCASA, o cualquier base nueva sin tocar código — mientras tenga al menos Título, una imagen (URL o archivo) y Fecha.

## Límite del plan gratuito de Notion / Vercel

Ambos tienen plan gratis suficiente para este uso (pocas requests por vista). Si tenés muchos clientes con mucho tráfico, revisá los límites de tu plan de Notion API y de Vercel.
