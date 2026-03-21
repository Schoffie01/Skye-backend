import { get } from '@vercel/blob';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            {
                status: 405,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }

    try {
        const { fileUrl } = await req.json();

        if (!fileUrl || typeof fileUrl !== 'string') {
            return new Response(
                JSON.stringify({ error: 'fileUrl is required' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        console.log('Fetching audio from private blob:', fileUrl);

        const result = await get(fileUrl, {
            access: 'private',
        });

        if (!result || result.statusCode !== 200 || !result.stream) {
            return new Response(
                JSON.stringify({ error: 'File not found in storage' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        const arrayBuffer = await new Response(result.stream).arrayBuffer();

        const audioFile = new File(
            [arrayBuffer],
            result.blob.pathname.split('/').pop() || 'recording.m4a',
            {
                type: result.blob.contentType || 'audio/m4a',
            }
        );

        console.log('Sending to OpenAI, file size:', audioFile.size);

        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'gpt-4o-mini-transcribe',
            // or 'whisper-1' if you want to keep that
        });

        return new Response(
            JSON.stringify({ text: transcription.text }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error: any) {
        console.error('Transcription error:', error);

        return new Response(
            JSON.stringify({
                error: error?.message || 'Transcription failed',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}