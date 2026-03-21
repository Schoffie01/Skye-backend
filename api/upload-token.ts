import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const config = {
    runtime: "edge",
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405 }
        );
    }

    try {
        const body = await req.json() as HandleUploadBody;

        const jsonResponse = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async (pathname) => {
                // Validate file type
                if (!pathname.endsWith('.m4a') && !pathname.endsWith('.mp3') && !pathname.endsWith('.wav')) {
                    throw new Error('Invalid file type. Only audio files are allowed.');
                }

                return {
                    allowedContentTypes: ['audio/m4a', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'],
                    maximumSizeInBytes: 25 * 1024 * 1024, // 25MB limit
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.log('Upload completed:', blob.url);
            },
        });

        return new Response(JSON.stringify(jsonResponse), {
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
