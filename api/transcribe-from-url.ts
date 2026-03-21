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
        console.log('First 20 bytes:', buffer.slice(0, 20).toString('hex'));
        
        // Check file signature to determine actual format
        const signature = buffer.slice(0, 12).toString('hex');
        console.log('File signature:', signature);
        
        // M4A files start with ftyp box, typically: 00 00 00 XX 66 74 79 70
        // Use audio/mp4 for .m4a files (MPEG-4 audio)
        const audioFile = new File(
            [buffer],
            'recording.m4a',
            {
                type: 'audio/mp4', // M4A is MPEG-4 audio, use audio/mp4
            }
        );

        console.log('Sending to OpenAI:');
        console.log('  - Filename: recording.m4a');
        console.log('  - Size:', audioFile.size);
        console.log('  - Type: audio/mp4');

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