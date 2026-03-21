import OpenAI from "openai";
import { head } from '@vercel/blob';

export const config = {
    runtime: "edge",
};

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405 }
        );
    }

    try {
        const { fileUrl } = await req.json();

        if (!fileUrl) {
            return new Response(
                JSON.stringify({ error: 'fileUrl is required' }),
                { status: 400 }
            );
        }

        // Verify blob exists and get metadata
        const blobMetadata = await head(fileUrl);
        
        if (!blobMetadata) {
            return new Response(
                JSON.stringify({ error: 'File not found in storage' }),
                { status: 404 }
            );
        }

        console.log('Fetching audio from blob:', fileUrl);

        // Fetch the audio file from Vercel Blob
        const audioResponse = await fetch(fileUrl);
        
        if (!audioResponse.ok) {
            throw new Error('Failed to fetch audio file from storage');
        }

        // Get the blob data
        const audioBlob = await audioResponse.blob();

        // Create a File object for OpenAI (Edge runtime compatible)
        const audioFile = new File([audioBlob], 'recording.m4a', { 
            type: audioBlob.type || 'audio/m4a' 
        });

        console.log('Sending to OpenAI Whisper, file size:', audioFile.size);

        // Send to OpenAI for transcription
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
        });

        console.log('Transcription completed');

        return new Response(
            JSON.stringify({ text: transcription.text }),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error: any) {
        console.error('Transcription error:', error);

        return new Response(
            JSON.stringify({ 
                error: error.message || "Transcription failed" 
            }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
