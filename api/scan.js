export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Headers CORS para que el browser pueda llamar a este endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { b64, mimeType } = req.body;
  if (!b64 || !mimeType) {
    return res.status(400).json({ error: 'Faltan parámetros: b64 y mimeType requeridos' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada en el servidor' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: b64 }
            },
            {
              type: 'text',
              text: 'Eres un extractor de datos de comprobantes fiscales mexicanos. Analiza esta imagen y responde SOLO con JSON válido sin markdown con estos campos: {"proveedor":"string","rfc":"string|null","monto":number,"moneda":"MXN|USD|EUR","fecha":"YYYY-MM-DD|null","folio":"string|null","tipo":"ticket|factura|nota|otro","iva":number|null,"categoria_sugerida":"hospedaje|transporte|avion|taxi|autobus|peajes|kilometraje|viaticos|propina|honorarios|otros","descripcion":"string"}'
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const text = data.content?.find(c => c.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

