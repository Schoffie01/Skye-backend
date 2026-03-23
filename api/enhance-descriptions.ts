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
        const { topics, conversations = [], style = "friendly-encouraging" } = req.body;

        if (!Array.isArray(topics)) {
            return res.status(400).json({ error: "Missing topics array" });
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

        // Build style-specific prompt instructions
        const styleInstructions: Record<string, string> = {
            "friendly-encouraging": "Write in a warm, supportive tone with positive reinforcement. Focus on progress and growth. Be uplifting and motivational.",
            "short-actionable": "Be concise and direct. Focus on actionable insights and next steps. Use brief, goal-oriented language. Maximum 2 sentences per topic.",
            "deep-reflective": "Write thoughtfully and introspectively. Explore deeper meaning and connections. Use contemplative language that encourages self-reflection. 3-4 sentences per topic.",
            "casual-conversational": "Write like a friend having a conversation. Use relaxed, natural language. Be personable and easy-going, like you're chatting over coffee."
        };

        const styleInstruction = styleInstructions[style] || styleInstructions["friendly-encouraging"];

        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content:
                        `You analyze recurring topics from personal voice conversations and write insightful, contextual descriptions. Be specific about what the user is actually discussing based on the conversation content. ${styleInstruction} Return only valid JSON.`,
                },
                {
                    role: "user",
                    content: `
Create one insightful description for each recurring topic based on the actual conversation content.

Style: ${style}
${styleInstruction}

Additional Rules:
- Be SPECIFIC about what the user discussed (e.g., "what" they're working on, "how" it's going, specific details)
- Use actual details from the conversation excerpts
- Make it feel like you understand their specific context, not generic
- If conversations are too short to extract details, be more general but maintain the requested style
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
            return res.status(500).json({ 
                error: "Model returned invalid JSON", 
                raw 
            });
        }

        return res.status(200).json({ descriptions: parsed.descriptions ?? [] });
    } catch (error) {
        console.error("enhance-descriptions error:", error);
        return res.status(500).json({ error: "Failed to enhance descriptions" });
    }
}