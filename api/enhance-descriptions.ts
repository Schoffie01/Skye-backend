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
        const topics = body?.topics;

        if (!Array.isArray(topics)) {
            return new Response(JSON.stringify({ error: "Missing topics array" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const cleanedTopics = topics.map((t: any) => ({
            title: String(t?.title ?? ""),
            count: Number(t?.count ?? 0),
            conversationCount: Number(t?.conversationCount ?? 0),
        }));

        const response = await client.responses.create({
            model: "gpt-4o-mini",
            input: [
                {
                    role: "system",
                    content:
                        "You write short, encouraging, natural descriptions for personal reflection app topics. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: `
Create one short description for each topic.

Rules:
- 1 sentence each
- warm, reflective, encouraging tone
- not cheesy
- do not invent hard facts beyond the topic title and counts
- return JSON in this exact shape:
{"descriptions":["desc 1","desc 2"]}

Topics:
${JSON.stringify(cleanedTopics, null, 2)}
          `,
                },
            ],
        });

        const raw = response.output_text;

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