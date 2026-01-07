export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GOOGLE_VISION_API_KEY not configured' });

    try {
        const { image } = req.body || {};
        
        // DEBUG: Log image info
        const debugInfo = {
            hasBody: !!req.body,
            hasImage: !!image,
            imageLength: image ? image.length : 0,
            imageStart: image ? image.substring(0, 50) : null,
            hasComma: image ? image.includes(',') : false
        };
        
        if (!image) {
            return res.status(400).json({ error: 'No image provided', debug: debugInfo });
        }

        // Limpiar base64
        let cleanImage = image;
        if (image.includes(',')) {
            cleanImage = image.split(',')[1];
        }
        
        // Validar que sea base64 válido
        if (!/^[A-Za-z0-9+/=]+$/.test(cleanImage.substring(0, 100))) {
            return res.status(400).json({ 
                error: 'Invalid base64 format',
                sample: cleanImage.substring(0, 100),
                debug: debugInfo
            });
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

        const data = await response.json();
        
        // DEBUG: Include more info in response
        if (data.error) {
            return res.status(400).json({ 
                error: data.error.message,
                visionError: data.error,
                debug: debugInfo
            });
        }
        
        // Check if we got actual text
        const hasText = data.responses?.[0]?.textAnnotations?.length > 0;
        
        return res.status(200).json({
            ...data,
            _debug: {
                ...debugInfo,
                cleanImageLength: cleanImage.length,
                hasText: hasText,
                annotationsCount: data.responses?.[0]?.textAnnotations?.length || 0
            }
        });

    } catch (error) {
        return res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
}
