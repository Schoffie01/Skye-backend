import OpenAI from "openai";

export const config = {
    runtime: "nodejs",
};

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new Response(
                JSON.stringify({ error: "No file uploaded" }),
                { status: 400 }
            );
        }

        const transcription = await client.audio.transcriptions.create({
            file,
            model: "whisper-1",
        });

        return new Response(
            JSON.stringify({ text: transcription.text }),
            { status: 200 }
        );
    } catch (error) {
        console.error(error);

        return new Response(
            JSON.stringify({ error: "Transcription failed" }),
            { status: 500 }
        );
    }
}