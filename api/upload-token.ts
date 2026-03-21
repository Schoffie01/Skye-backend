
export const config = {
    runtime: "nodejs",
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405 }
        );
    }

    try {
        const { pathname, type } = await req.json();

        if (!pathname) {
            return new Response(
                JSON.stringify({ error: 'pathname is required' }),
                { status: 400 }
            );
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

        return new Response(JSON.stringify({ 
            url: uploadUrl,
            downloadUrl: downloadUrl,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Upload token error:', error);
        
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to generate upload token' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
