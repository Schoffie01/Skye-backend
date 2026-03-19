import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();
        const text = body?.text;

        if (!text || typeof text !== "string") {
            return new Response(JSON.stringify({ error: "Missing text" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
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
            return new Response(
                JSON.stringify({ error: "Model returned invalid JSON", raw }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response(JSON.stringify({ topics: parsed.topics ?? [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("analyze-topics error:", error);
        return new Response(JSON.stringify({ error: "Failed to analyze topics" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}