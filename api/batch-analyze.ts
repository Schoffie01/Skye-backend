import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

type ConversationInput = {
    id: string;
    text: string;
    title?: string;
};

type RequestBody = {
    conversations: ConversationInput[];
};

export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    try {
        const body = (await req.json()) as RequestBody;
        const conversations = Array.isArray(body?.conversations) ? body.conversations : [];

        if (conversations.length === 0) {
            return jsonResponse({ error: "Missing conversations array" }, 400);
        }

        const cleanedConversations = conversations
            .filter((c) => c && typeof c.id === "string" && typeof c.text === "string")
            .slice(0, 4)
            .map((c) => ({
                id: c.id,
                title: typeof c.title === "string" ? c.title : "",
                text: c.text.slice(0, 1500),
            }));

        if (cleanedConversations.length === 0) {
            return jsonResponse({ error: "No valid conversations provided" }, 400);
        }

        const prompt = `
You are analyzing personal app conversations for recurring themes.

Your task:
1. For each conversation, extract 2 to 4 short topics.
2. Then find recurring topics that appear across multiple conversations.
3. Return ONLY valid JSON matching the schema.

Rules for conversation topics:
- 2 to 4 topics per conversation
- each topic should be 1 to 3 words
- lowercase
- simple, human, broad enough to repeat
- no punctuation unless needed for hyphenated terms
- avoid duplicates inside the same conversation

Rules for recurringTopics:
- only include topics that clearly recur across conversations
- title should be Title Case
- description should be 1 sentence, warm and natural
- count should be the number of conversations where that topic appeared
- sort recurringTopics by count descending
- max 8 recurring topics

Conversations:
${JSON.stringify(cleanedConversations, null, 2)}
`;

        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "batch_insights_result",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            conversations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        id: { type: "string" },
                                        topics: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
                                    },
                                    required: ["id", "topics"],
                                },
                            },
                            recurringTopics: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        count: { type: "number" },
                                    },
                                    required: ["title", "description", "count"],
                                },
                            },
                        },
                        required: ["conversations", "recurringTopics"],
                    },
                },
            },
        });

        const raw = response.choices[0].message.content;
        const parsed = JSON.parse(raw || "{}");

        return jsonResponse(parsed, 200);
    } catch (error) {
        console.error("batch-analyze-insights error:", error);
        return jsonResponse({ error: "Failed to analyze insights" }, 500);
    }
}

function jsonResponse(data: unknown, status: number) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}