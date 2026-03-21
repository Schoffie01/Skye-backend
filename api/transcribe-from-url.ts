import { get } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from "openai";

export const runtime = 'nodejs';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileUrl } = req.body;

        if (!fileUrl || typeof fileUrl !== 'string') {
            return res.status(400).json({ error: 'fileUrl is required' });
        }

        console.log('Fetching audio from private blob:', fileUrl);

        const result = await get(fileUrl, {
            access: 'private',
        });

        if (!result || result.statusCode !== 200 || !result.stream) {
            return res.status(404).json({ error: 'File not found in storage' });
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

        console.log('Transcription completed');

        return res.status(200).json({ text: transcription.text });
    } catch (error: any) {
        console.error('Transcription error:', error);
        return res.status(500).json({ 
            error: error.message || "Transcription failed" 
        });
    }
}