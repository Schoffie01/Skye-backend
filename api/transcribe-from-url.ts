import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from "openai";

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

        console.log('Fetching audio from public blob:', fileUrl);

        // Fetch from public blob URL
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            return res.status(404).json({ error: 'File not found in storage' });
        }

        const arrayBuffer = await response.arrayBuffer();
        
        // Get content-type from response or default to audio/mp4
        const contentType = response.headers.get('content-type') || 'audio/mp4';
        console.log('Content-Type from storage:', contentType);

        const audioFile = new File(
            [arrayBuffer],
            'recording.m4a',
            {
                type: contentType,
            }
        );

        console.log('Sending to OpenAI, file size:', audioFile.size, 'type:', contentType);

        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
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