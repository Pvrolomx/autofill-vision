// Configuración para aumentar límite de body
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ 
            error: 'GOOGLE_VISION_API_KEY not configured',
            hint: 'Add environment variable in Vercel dashboard'
        });
    }

    try {
        // Verificar que llegó el body
        if (!req.body) {
            return res.status(400).json({ error: 'No body received' });
        }

        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ 
                error: 'No image in body',
                received: Object.keys(req.body || {})
            });
        }

        // Limpiar base64 si tiene prefix
        let cleanImage = image;
        if (image.includes(',')) {
            cleanImage = image.split(',')[1];
        }

        const visionRequest = {
            requests: [{
                image: { content: cleanImage },
                features: [
                    { type: 'TEXT_DETECTION' },
                    { type: 'DOCUMENT_TEXT_DETECTION' }
                ]
            }]
        };

        const response = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(visionRequest)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
                error: 'Google Vision API error',
                status: response.status,
                details: errorText
            });
        }

        const data = await response.json();
        
        if (data.error) {
            return res.status(400).json({ 
                error: data.error.message || 'Vision API error',
                code: data.error.code
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ 
            error: error.message || 'Internal server error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
