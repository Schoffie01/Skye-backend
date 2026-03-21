import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Ensure body parsing is enabled
export const config = {
    api: {
        bodyParser: true,
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('Upload token handler called, method:', req.method);
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Request body:', req.body);
        const { audioData } = req.body;

        if (!audioData) {
            return res.status(400).json({ error: 'audioData is required' });
        }

        // Decode base64 audio data
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        const filename = `recordings/recording-${Date.now()}.m4a`;

        console.log('Uploading to Vercel Blob:', filename, 'Size:', audioBuffer.length);

        // Upload directly to Vercel Blob using put()
        const blob = await put(filename, audioBuffer, {
            access: 'public',
            contentType: 'audio/m4a',
        });

        console.log('Upload complete:', blob.url);

        return res.status(200).json({ 
            url: blob.url,
        });
    } catch (error: any) {
        console.error('Upload token error:', error);
        return res.status(500).json({ 
            error: error.message || 'Failed to upload audio' 
        });
    }
}
