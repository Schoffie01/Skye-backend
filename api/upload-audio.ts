import { put } from '@vercel/blob';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405 }
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file provided' }),
                { status: 400 }
            );
        }

        console.log('Uploading file to Vercel Blob:', file.name, file.size);

        // Upload to Vercel Blob
        const blob = await put(`recordings/${Date.now()}-${file.name}`, file, {
            access: 'public',
        });

        console.log('Upload complete:', blob.url);

        return new Response(
            JSON.stringify({ url: blob.url }),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error: any) {
        console.error('Upload error:', error);
        
        return new Response(
            JSON.stringify({ error: error.message || 'Upload failed' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
