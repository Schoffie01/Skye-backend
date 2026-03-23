import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { text } = req.body;

        if (!text || typeof text !== "string") {
            return res.status(400).json({ error: "Missing text" });
        }

        // Truncate text to prevent timeout (match batch-analyze behavior)
        const truncatedText = text.slice(0, 1500);

        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content:
                        "You extract 2 to 4 main conversation topics from a personal transcript. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: `
Extract 2 to 4 main topics from this transcript.

Rules:
- Topics must be short
- 2 to 5 words max per topic
- No duplicates
- No quotes
- Keep them human and simple
- Return JSON in this exact shape:
{"topics":["topic 1","topic 2"]}

Transcript:
${truncatedText}
          `,
                },
            ],
            response_format: { type: "json_object" },
        });

        const raw = response.choices[0].message.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return res.status(500).json({ 
                error: "Model returned invalid JSON", 
                raw 
            });
        }

        return res.status(200).json({ topics: parsed.topics ?? [] });
    } catch (error) {
        console.error("analyze-topics error:", error);
        return res.status(500).json({ error: "Failed to analyze topics" });
    }
}