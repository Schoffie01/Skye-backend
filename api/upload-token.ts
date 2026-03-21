import type { VercelRequest, VercelResponse } from '@vercel/node';

// This endpoint is deprecated - files are now uploaded directly to Supabase Storage from the client
// Keeping this file for backwards compatibility but returning an error
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return res.status(410).json({ 
        error: 'This endpoint is deprecated. Files are now uploaded directly to Supabase Storage.' 
    });
}
