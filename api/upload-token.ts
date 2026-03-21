import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { pathname, type } = req.body;

        if (!pathname) {
            return res.status(400).json({ error: 'pathname is required' });
        }

        // Validate file type
        if (!pathname.endsWith('.m4a') && !pathname.endsWith('.mp3') && !pathname.endsWith('.wav')) {
            throw new Error('Invalid file type. Only audio files are allowed.');
        }

        // Generate upload URL using Vercel Blob's token-based approach
        // The client will PUT directly to this URL
        const baseUrl = process.env.BLOB_STORE_URL || 'https://blob.vercel-storage.com';
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        
        if (!token) {
            throw new Error('BLOB_READ_WRITE_TOKEN not configured');
        }

        // Generate upload URL - client will PUT to this
        const uploadUrl = `${baseUrl}/${pathname}?token=${token}`;
        
        // Generate download URL - this is what we'll use to access the file later
        const downloadUrl = `${baseUrl}/${pathname}`;

        console.log('Generated upload token for:', pathname);

        return res.status(200).json({ 
            url: uploadUrl,
            downloadUrl: downloadUrl,
        });
    } catch (error: any) {
        console.error('Upload token error:', error);
        return res.status(500).json({ 
            error: error.message || 'Failed to generate upload token' 
        });
    }
}
