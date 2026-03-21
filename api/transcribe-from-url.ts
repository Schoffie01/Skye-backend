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
        
        console.log('File size:', arrayBuffer.byteLength);
        
        // Create a Blob with the audio data
        const blob = new Blob([arrayBuffer], { type: 'audio/mp4' });
        
        console.log('Sending to OpenAI:');
        console.log('  - Filename: recording.m4a');
        console.log('  - Size:', blob.size);
        console.log('  - Type: audio/mp4');

        // Use toFile() method which is designed for Node.js environments
        const audioFile = await OpenAI.toFile(blob, 'recording.m4a', {
            type: 'audio/mp4',
        });

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