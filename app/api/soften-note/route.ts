import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════
   POST /api/soften-note
   Takes a potentially harsh mentor note and rewrites it into a
   polite, encouraging tone for parents and students.

   Body: { note: string }
   Returns: { softenedNote: string }
   ═══════════════════════════════════════════════════════════════ */

const HF_BASE = "https://router.huggingface.co/v1/chat/completions";
const MODEL = "Qwen/Qwen2.5-7B-Instruct:together";

const SYSTEM_PROMPT = `You are a compassionate academic counselor. Your job is to take raw, potentially harsh or blunt notes from a mentor and rewrite them to be more professional, polite, and encouraging for a parent/student.
• Keep the core factual meaning intact (e.g., if the student is failing, stay honest).
• Soften the language to focus on constructive next steps rather than just criticism.
• Ensure the parent does not panic but understands the support required.
• Output ONLY the rewritten note content, no extra text.`;

export async function POST(req: NextRequest) {
    try {
        const { note } = await req.json();

        if (!note || !note.trim()) {
            return NextResponse.json({ softenedNote: "" });
        }

        const HF_TOKEN = process.env.HF_TOKEN;
        if (!HF_TOKEN) {
            return NextResponse.json({ softenedNote: note }); // Fallback to original
        }

        /* Call Qwen 2.5 via HF Router */
        const llmRes = await fetch(HF_BASE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${HF_TOKEN}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Rewrite this mentor note: "${note}"` },
                ],
                max_tokens: 500,
                temperature: 0.7,
            }),
        });

        if (!llmRes.ok) {
            console.error("Soften Note API — LLM call failed");
            return NextResponse.json({ softenedNote: note }); // Fallback
        }

        const data = await llmRes.json();
        const softenedNote = data.choices?.[0]?.message?.content || note;

        return NextResponse.json({ softenedNote: softenedNote.trim() });
    } catch (err: unknown) {
        console.error("Soften Note API — Error:", err);
        return NextResponse.json({ softenedNote: "Unable to soften note at this time." }, { status: 500 });
    }
}
