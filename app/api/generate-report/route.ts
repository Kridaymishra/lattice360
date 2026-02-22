import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════
   POST /api/generate-report
   Comprehensive student report — accepts all student data and
   returns a rich, multi-section demo summary.

   Body: {
     studentName, branch, studyYear, cgpa, sgpa,
     attendancePct, subjectAttendance, midTermScores,
     totalTasks, completedTasks, pendingTasks,
     totalSessions, confirmedSessions, chatHighlights
   }
   Returns: { summary: string }
   ═══════════════════════════════════════════════════════════════ */

interface SubjAtt { subject: string; pct: number; attended: number; total: number }
interface MidScore { subject: string; score: number }

export async function POST(req: NextRequest) {
    try {
        const {
            studentName, branch, studyYear,
            cgpa, sgpa, attendancePct,
            subjectAttendance, midTermScores,
            totalTasks, completedTasks, pendingTasks,
            totalSessions, confirmedSessions,
            chatHighlights,
        } = await req.json();

        const LLM_API_KEY = process.env.HF_TOKEN || process.env.LLM_API_KEY;
        const LLM_API_URL = process.env.LLM_API_URL || "https://router.huggingface.co/v1/chat/completions";

        console.log("Generate Report Request — HF_TOKEN/LLM_API_KEY present:", !!LLM_API_KEY);

        /* ── Build subject attendance summary ── */
        const attLines = (subjectAttendance as SubjAtt[] || [])
            .map((a: SubjAtt) => `  • ${a.subject}: ${a.attended}/${a.total} (${a.pct}%)`)
            .join("\n") || "  No subject-wise data available.";

        /* ── Build mid-term summary ── */
        const midLines = (midTermScores as MidScore[] || [])
            .map((m: MidScore) => `  • ${m.subject}: ${m.score}`)
            .join("\n") || "  No mid-term scores recorded.";

        /* ── Build pending tasks list ── */
        const pendingList = (pendingTasks as string[] || [])
            .slice(0, 5)
            .map((t: string) => `  ○ ${t}`)
            .join("\n") || "  All tasks completed!";

        /* ── Build the prompt ── */
        const prompt = `You are an expert academic counsellor at a university. Analyze the following comprehensive student data and write a professional, encouraging summary addressed to the parents. Cover every aspect provided.

Student Name: ${studentName}
Branch: ${branch || "N/A"}  |  Year: ${studyYear || "N/A"}
CGPA: ${cgpa}  |  SGPA: ${sgpa}

Overall Attendance: ${attendancePct}%
Subject-wise Attendance:
${attLines}

Mid-term Scores:
${midLines}

Tasks: ${totalTasks ?? 0} total, ${completedTasks ?? 0} completed, ${(totalTasks ?? 0) - (completedTasks ?? 0)} pending
Pending Tasks:
${pendingList}

Mentor Sessions: ${totalSessions ?? 0} total, ${confirmedSessions ?? 0} confirmed/completed

Recent Wellness Chat Highlights:
${chatHighlights || "No recent messages."}

Instructions:
- Paragraph 1: Academic overview — CGPA/SGPA trends, mid-term score analysis, and strengths.
- Paragraph 2: Attendance analysis — overall percentage AND subject-wise breakdown. Flag any below 75%.
- Paragraph 3: Task engagement — completion rate, notable pending tasks, and initiative.
- Paragraph 4: Mentor interaction — session attendance and communication patterns.
- Paragraph 5: Wellness & well-being — insights from chat highlights, end on an encouraging note.

Keep the tone warm, professional, and concise (about 300-400 words total).`;

        /* ── If no LLM key configured, return a comprehensive demo summary ── */
        if (!LLM_API_URL || !LLM_API_KEY) {
            const attAnalysis = Number(attendancePct) >= 85
                ? `stands at an excellent ${attendancePct}%, demonstrating strong discipline and commitment to regular class participation`
                : Number(attendancePct) >= 75
                    ? `stands at ${attendancePct}%, meeting the minimum institutional threshold but with room for improvement toward the recommended 85%`
                    : `stands at ${attendancePct}%, which falls below the recommended 75% threshold and requires immediate attention`;

            const taskRate = (totalTasks ?? 0) > 0
                ? Math.round(((completedTasks ?? 0) / (totalTasks ?? 0)) * 100)
                : 0;
            const taskAnalysis = taskRate >= 80
                ? `an impressive ${taskRate}% task completion rate, showcasing strong organizational skills`
                : taskRate >= 50
                    ? `a ${taskRate}% task completion rate, showing progress but with pending assignments that need attention`
                    : `a ${taskRate}% task completion rate, indicating that more focus on timely task completion would be beneficial`;

            const sessionAnalysis = (totalSessions ?? 0) > 0
                ? `${confirmedSessions ?? 0} out of ${totalSessions ?? 0} mentor sessions have been confirmed or completed`
                : `No mentor sessions have been scheduled yet`;

            const demoSummary = `Comprehensive Monthly Progress Report — ${studentName}

ACADEMIC PERFORMANCE
${studentName} (${branch || "N/A"}, Year ${studyYear || "N/A"}) has demonstrated consistent academic engagement this month with a CGPA of ${cgpa} and an SGPA of ${sgpa}. ${(midTermScores as MidScore[] || []).length > 0 ? `Mid-term assessments show performance across ${(midTermScores as MidScore[]).length} subject(s), with scores reflecting the student's effort and understanding of the coursework.` : "Mid-term scores have not been recorded yet."} These figures reflect a solid commitment to building a strong academic foundation.

ATTENDANCE OVERVIEW
Overall attendance ${attAnalysis}. ${(subjectAttendance as SubjAtt[] || []).length > 0 ? `Subject-wise breakdown shows attendance across ${(subjectAttendance as SubjAtt[]).length} subject(s). ${(subjectAttendance as SubjAtt[]).filter((a: SubjAtt) => a.pct < 75).length > 0 ? `Notably, ${(subjectAttendance as SubjAtt[]).filter((a: SubjAtt) => a.pct < 75).map((a: SubjAtt) => a.subject).join(", ")} require(s) immediate attention as attendance has fallen below 75%.` : "All subjects maintain healthy attendance levels."}` : "No subject-wise attendance data is available at this time."} We encourage continued focus on regular class participation.

TASK ENGAGEMENT
${studentName} shows ${taskAnalysis}. ${(totalTasks ?? 0) > 0 ? `Out of ${totalTasks} assigned tasks, ${completedTasks} have been completed.` : "No tasks have been assigned yet."} ${(pendingTasks as string[] || []).length > 0 ? `Pending items include: ${(pendingTasks as string[]).slice(0, 3).join(", ")}.` : ""} Consistent task completion is key to maintaining academic momentum.

MENTOR SESSIONS
${sessionAnalysis}. Regular mentor engagement provides valuable guidance and helps identify areas for improvement early.

OVERALL WELL-BEING
Based on recent communications, ${studentName} appears to be engaged with their academic journey. ${chatHighlights ? "The student has been proactive in sharing updates and maintaining open lines of communication with their mentor." : "We encourage more active communication through the wellness check-in feature."} We look forward to continued progress in the coming month.`;

            return NextResponse.json({ summary: demoSummary });
        }

        /* ── Generic LLM fetch (OpenAI-compatible format) ── */
        const llmRes = await fetch(LLM_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LLM_API_KEY}`,
            },
            body: JSON.stringify({
                model: process.env.LLM_MODEL || "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are an expert academic counsellor." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!llmRes.ok) {
            const errText = await llmRes.text();
            return NextResponse.json(
                { error: `LLM API error: ${llmRes.status} — ${errText}` },
                { status: 502 }
            );
        }

        const llmData = await llmRes.json();

        /* Support both OpenAI and HF response shapes */
        const summary =
            llmData.choices?.[0]?.message?.content ||
            llmData.generated_text ||
            llmData[0]?.generated_text ||
            JSON.stringify(llmData);

        return NextResponse.json({ summary });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
