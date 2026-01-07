export default async function handler(req, res) {
    // Enable CORS
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
        console.error('GOOGLE_VISION_API_KEY not configured');
        return res.status(500).json({ error: 'API Key not configured in server. Please add GOOGLE_VISION_API_KEY to Vercel Environment Variables.' });
    }

    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        console.log('Calling Google Vision API...');
        console.log('Image size:', image.length, 'bytes');

        const response = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [{
                        image: { content: image },
                        features: [
                            { type: 'TEXT_DETECTION' },
                            { type: 'DOCUMENT_TEXT_DETECTION' }
                        ]
                    }]
                })
            }
        );

        const data = await response.json();
        
        console.log('Google Vision response status:', response.status);
        
        if (data.error) {
            console.error('Google Vision error:', data.error);
            return res.status(400).json({ error: data.error.message || 'Google Vision API error' });
        }

        if (!data.responses || data.responses.length === 0) {
            console.error('Empty response from Google Vision');
            return res.status(400).json({ error: 'Empty response from Google Vision' });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Vision API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
