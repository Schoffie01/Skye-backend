import OpenAI from "openai";

export const config = {
    runtime: "edge",
};

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
        const topics = body?.topics;
        const conversations = body?.conversations || [];

        if (!Array.isArray(topics)) {
            return new Response(JSON.stringify({ error: "Missing topics array" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const cleanedTopics = topics.map((t: any) => ({
            title: String(t?.title ?? ""),
            count: Number(t?.count ?? 0),
        }));

        // Prepare conversation context for each topic
        const conversationContext = conversations
            .map((c: any) => ({
                title: c.title || "Untitled",
                text: (c.text || "").slice(0, 500), // First 500 chars for context
                topics: c.topics || [],
            }))
            .slice(0, 10); // Limit to 10 conversations max

        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content:
                        "You analyze recurring topics from personal voice conversations and write insightful, contextual descriptions. Be specific about what the user is actually discussing based on the conversation content. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: `
Create one insightful description for each recurring topic based on the actual conversation content.

Rules:
- 2-3 sentences each
- Be SPECIFIC about what the user discussed (e.g., "what" they're working on, "how" it's going, specific details)
- Use actual details from the conversation excerpts
- Warm, encouraging, personal tone
- Make it feel like you understand their specific context, not generic
- If conversations are too short to extract details, be more general but still warm
- Return JSON in this exact shape:
{"descriptions":["desc 1","desc 2"]}

Recurring Topics to Describe:
${JSON.stringify(cleanedTopics, null, 2)}

Conversation Excerpts (for context):
${JSON.stringify(conversationContext, null, 2)}
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

        return new Response(
            JSON.stringify({ descriptions: parsed.descriptions ?? [] }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("enhance-descriptions error:", error);
        return new Response(
            JSON.stringify({ error: "Failed to enhance descriptions" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}