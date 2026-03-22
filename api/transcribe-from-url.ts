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
        const buffer = Buffer.from(arrayBuffer);
        
        console.log('File size:', buffer.length);
        console.log('First 8 bytes (hex):', buffer.slice(0, 8).toString('hex'));
        
        // Create FormData with proper content-type
        const formData = new FormData() as any;
        formData.append('file', buffer, {
            filename: 'recording.m4a',
            contentType: 'audio/m4a',
        });
        formData.append('model', 'whisper-1');
        
        console.log('Sending to OpenAI with FormData');
        console.log('  - Filename: recording.m4a');
        console.log('  - Size:', buffer.length);
        console.log('  - Content-Type: audio/m4a');

        // Make direct fetch request to OpenAI with FormData
        const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                ...(formData.getHeaders() as Record<string, string>),
            },
            body: formData as any,
        });

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('OpenAI error:', errorText);
            throw new Error(`OpenAI transcription failed: ${errorText}`);
        }

        const transcription = await openaiResponse.json();

        console.log('Transcription completed:', transcription);

        return res.status(200).json({ text: transcription.text });
    } catch (error: any) {
        console.error('Transcription error:', error);
        return res.status(500).json({ 
            error: error.message || "Transcription failed" 
        });
    }
}