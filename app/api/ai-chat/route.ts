import { NextRequest } from "next/server";

/* ═══════════════════════════════════════════════════════════════
   POST /api/ai-chat
   Streaming chat endpoint powered by Qwen 2.5 via Hugging Face Router.
   Body: { messages: { role: string; content: string }[] }
   Returns: ReadableStream (SSE / text-event-stream)
   ═══════════════════════════════════════════════════════════════ */

const HF_BASE = "https://router.huggingface.co/v1/chat/completions";
const MODEL = "Qwen/Qwen2.5-7B-Instruct:together";

const SYSTEM_PROMPT = `You are Lattice360 AI — a friendly, knowledgeable academic mentor assistant built into the Lattice360 student portal. Your role is to:
• Help students with study tips, time-management, and exam strategies.
• Provide clear, concise explanations of academic concepts when asked.
• Offer motivational support and constructive advice.
• Keep responses focused, practical, and under 300 words unless more detail is requested.
• Never share personal data about other students or mentors.
• If a question is outside your scope (medical, legal, etc.), politely redirect the student to speak with their mentor.`;

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        const HF_TOKEN = process.env.HF_TOKEN;
        console.log("AI Chat Request — HF_TOKEN present:", !!HF_TOKEN);
        if (!HF_TOKEN) {
            return new Response(
                JSON.stringify({ error: "AI service is not configured. Please contact your administrator." }),
                { status: 503, headers: { "Content-Type": "application/json" } }
            );
        }

        /* Build messages with system prompt */
        const fullMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...(messages || []),
        ];

        /* Call Qwen 2.5 via HF Router (streaming) */
        const llmRes = await fetch(HF_BASE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${HF_TOKEN}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: fullMessages,
                max_tokens: 1024,
                temperature: 0.7,
                stream: true,
            }),
        });

        if (!llmRes.ok) {
            const errText = await llmRes.text();
            return new Response(
                JSON.stringify({ error: `LLM API error: ${llmRes.status} — ${errText}` }),
                { status: 502, headers: { "Content-Type": "application/json" } }
            );
        }

        /* Proxy the SSE stream straight through */
        return new Response(llmRes.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
