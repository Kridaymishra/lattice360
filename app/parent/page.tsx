"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
    Shield, ChevronRight, AlertTriangle, CheckCircle, XCircle,
    BookOpen, BarChart3, EyeOff, RefreshCw, TrendingUp,
    MessageSquare, User, Minus,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line,
} from "recharts";

/* ═══════════ Types (exact Supabase schema) ═══════════ */
interface Profile {
    id: string; email: string; role: string;
    full_name: string; branch: string; study_year: string; phone: string;
    child_email?: string | null;
}
interface MidScore { subject: string; score: number }
interface AttRow { subject: string; total_periods: number; attended: number }
interface AcademicRecord {
    id?: string; student_id: string;
    sgpa: number; cgpa: number;
    mid_term_scores: MidScore[];
    attendance_data: AttRow[];
}
interface MentorNote {
    id: string; student_id: string; note_content: string; is_confidential: boolean;
}

/* ═══════════ Animation ═══════════ */
const cV: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const iV: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };
const tabV: Variants = { enter: { opacity: 0, x: 20 }, center: { opacity: 1, x: 0, transition: { duration: 0.22 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.14 } } };

type Tab = "trends" | "attendance" | "feedback";

/* ═══════════════════════════════════════════════════════════════
   PARENT DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function ParentDashboard() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [childProfile, setChildProfile] = useState<Profile | null>(null);
    const [record, setRecord] = useState<AcademicRecord | null>(null);
    const [notes, setNotes] = useState<MentorNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("trends");

    useEffect(() => {
        async function load() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { window.location.href = "/login"; return; }

                const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
                if (!p) { window.location.href = "/login"; return; }
                if (p.role !== "parent") { window.location.href = "/" + p.role; return; }
                setProfile(p);

                /* Dynamic child linking via child_email column */
                if (p.child_email) {
                    const { data: child } = await supabase.from("profiles").select("*").eq("email", p.child_email).single();
                    if (child) {
                        setChildProfile(child);

                        const { data: ar } = await supabase.from("academic_records").select("*").eq("student_id", child.id).single();
                        if (ar) setRecord(ar);

                        const { data: mn } = await supabase.from("mentor_notes").select("*").eq("student_id", child.id).eq("is_confidential", false).order("id", { ascending: false });
                        if (mn) {
                            /* Soften Notes for Parent Mode */
                            const softened = await Promise.all(mn.map(async (n) => {
                                try {
                                    const res = await fetch("/api/soften-note", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ note: n.note_content }),
                                    });
                                    if (res.ok) {
                                        const data = await res.json();
                                        return { ...n, note_content: data.softenedNote };
                                    }
                                } catch { /* Use original if API fails */ }
                                return n;
                            }));
                            setNotes(softened);
                        }
                    }
                }
            } catch (err) { console.error("Load error:", err); }
            setLoading(false);
        }
        load();
    }, []);

    /* ── attendance calc (identical to student dashboard) ── */
    const calcAtt = (a: AttRow) => {
        if (a.total_periods <= 0) return { pct: -1, missed: 0, canStillMiss: 0, risk: "NoData" as const };
        const pct = (a.attended / a.total_periods) * 100;
        const missed = a.total_periods - a.attended;
        const maxMissable = Math.floor(a.total_periods * 0.25);
        const canStillMiss = Math.max(0, maxMissable - missed);
        const risk: "Green" | "Yellow" | "Red" = pct >= 85 ? "Green" : pct >= 75 ? "Yellow" : "Red";
        return { pct: Math.round(pct * 10) / 10, missed, canStillMiss, risk };
    };
    const riskBadge = (r: "Green" | "Yellow" | "Red" | "NoData") => {
        if (r === "NoData") return { bg: "bg-gray-50", text: "text-gray-500", label: "No Data", Icon: Minus };
        if (r === "Green") return { bg: "bg-emerald-50", text: "text-emerald-700", label: "Stable", Icon: CheckCircle };
        if (r === "Yellow") return { bg: "bg-amber-50", text: "text-amber-700", label: "Moderate", Icon: AlertTriangle };
        return { bg: "bg-red-50", text: "text-red-700", label: "Critical", Icon: XCircle };
    };
    const isAtRisk = record?.attendance_data?.some(a => { const c = calcAtt(a); return c.risk === "Red"; }) || false;

    /* ── chart data ── */
    const midTermData = record?.mid_term_scores?.map(m => ({ name: m.subject, score: m.score })) || [];
    const gpaTrendData = midTermData.length > 1
        ? midTermData.map((m) => ({ name: m.name, gpa: m.score }))
        : record?.cgpa ? [{ name: "Current", gpa: record.cgpa }] : [];

    if (loading) return <div className="min-h-screen bg-[#FBE9D0] flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><RefreshCw size={36} className="text-[#244855]" /></motion.div></div>;

    const TABS: { label: string; icon: typeof TrendingUp; key: Tab }[] = [
        { label: "Academic Trends", icon: TrendingUp, key: "trends" },
        { label: "Attendance & Risk", icon: BookOpen, key: "attendance" },
        { label: "Feedback", icon: MessageSquare, key: "feedback" },
    ];

    return (
        <div className="min-h-screen bg-[#FBE9D0] flex flex-col md:flex-row font-sans text-[#244855]">
            {/* ░░░ SIDEBAR ░░░ */}
            <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-[#244855] text-[#FBE9D0] shadow-2xl z-20 sticky top-0 h-screen">
                <div className="p-6 pb-2">
                    <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
                        <Shield className="text-[#E64833]" size={28} /><span>Lattice<span className="text-[#E64833]">360</span></span>
                    </Link>
                    <p className="text-xs text-[#90AEAD] mt-1 ml-10">Parent Portal</p>
                </div>
                <div className="mx-4 mt-4 p-4 bg-[#90AEAD]/10 rounded-2xl border border-[#90AEAD]/15">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E64833] to-[#874F41] flex items-center justify-center text-sm font-bold text-white shadow-lg">
                            {profile?.full_name?.split(" ").map(n => n[0]).join("") || "?"}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{profile?.full_name || "—"}</p>
                            <p className="text-[11px] text-[#90AEAD] truncate">{profile?.email}</p>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-[#874F41]/20 rounded-xl">
                        <p className="text-[9px] font-bold text-[#FBE9D0]/60 uppercase tracking-wider">Linked Student</p>
                        <p className="text-sm font-bold text-[#FBE9D0] mt-0.5">{childProfile?.full_name || "Not linked"}</p>
                        {childProfile?.branch && <p className="text-[10px] text-[#90AEAD] mt-0.5">{childProfile.branch} • Year {childProfile.study_year}</p>}
                    </div>
                </div>
                <nav className="flex-1 mt-6 px-4 space-y-1">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${tab === t.key ? "bg-[#E64833]/15 text-[#E64833] font-bold shadow-sm" : "text-[#FBE9D0]/70 hover:text-[#FBE9D0] hover:bg-[#90AEAD]/10"}`}>
                            <t.icon size={18} />{t.label}
                            {tab === t.key && <ChevronRight size={14} className="ml-auto opacity-60" />}
                        </button>
                    ))}
                </nav>
                <div className="p-4 mt-auto"><div className="p-3 rounded-xl bg-[#90AEAD]/10 text-center"><p className="text-[10px] text-[#90AEAD] uppercase tracking-widest">Lattice360 v1.0</p></div></div>
            </aside>

            {/* mobile */}
            <header className="md:hidden bg-[#244855] text-[#FBE9D0] px-4 py-3 flex items-center justify-between shadow-lg z-20 sticky top-0">
                <Link href="/" className="flex items-center gap-2 text-lg font-extrabold"><Shield className="text-[#E64833]" size={22} />Lattice<span className="text-[#E64833]">360</span></Link>
                <div className="flex gap-1">{TABS.map(t => (<button key={t.key} onClick={() => setTab(t.key)} className={`p-2 rounded-lg transition ${tab === t.key ? "bg-[#E64833]/20 text-[#E64833]" : "text-[#FBE9D0]/60"}`}><t.icon size={16} /></button>))}</div>
            </header>

            {/* ░░░ MAIN ░░░ */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-5 md:p-8 lg:p-10">
                    <AnimatePresence mode="wait">
                        <motion.div key={tab} variants={tabV} initial="enter" animate="center" exit="exit">
                            <motion.div variants={cV} initial="hidden" animate="show" className="space-y-6">

                                {/* Header */}
                                <motion.header variants={iV} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#90AEAD]/20">
                                    <p className="text-[10px] font-bold text-[#874F41] uppercase tracking-widest mb-1">Parent Dashboard</p>
                                    <h1 className="text-2xl md:text-3xl font-extrabold">Welcome, {profile?.full_name?.split(" ")[0] || "Parent"}!</h1>
                                    <p className="text-sm text-[#874F41] mt-1">Monitoring: <span className="font-bold text-[#244855]">{childProfile?.full_name || "No student linked"}</span></p>
                                </motion.header>

                                {/* At-risk alert */}
                                {isAtRisk && (
                                    <motion.div variants={iV} className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-3">
                                        <AlertTriangle size={24} className="text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-bold text-red-800">Attendance Alert</h3>
                                            <p className="text-red-700 text-sm mt-1">{childProfile?.full_name}&apos;s attendance has fallen below 75% in one or more subjects. Please check the Attendance tab and consider contacting the mentor.</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* No child */}
                                {!childProfile && (
                                    <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 p-10 text-center">
                                        <User size={40} className="mx-auto text-[#90AEAD]/30 mb-3" />
                                        <p className="text-lg font-bold text-[#244855]">No student linked</p>
                                        <p className="text-sm text-[#90AEAD] mt-1">No students found in the system yet.</p>
                                    </motion.div>
                                )}
                                {childProfile && !record && (
                                    <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 p-10 text-center">
                                        <BookOpen size={40} className="mx-auto text-[#90AEAD]/30 mb-3" />
                                        <p className="text-lg font-bold text-[#244855]">No academic records found</p>
                                        <p className="text-sm text-[#90AEAD] mt-1">The mentor has not yet entered data for {childProfile.full_name}.</p>
                                    </motion.div>
                                )}

                                {/* ═══ TAB: ACADEMIC TRENDS ═══ */}
                                {tab === "trends" && record && (<>
                                    {/* GPA cards */}
                                    <motion.div variants={iV} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#90AEAD]/20 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-[#874F41] uppercase tracking-wider">CGPA</p>
                                                <p className="text-4xl font-extrabold text-[#244855] mt-1">{record.cgpa}</p>
                                            </div>
                                            <div className="p-4 bg-gradient-to-br from-[#E64833]/10 to-[#E64833]/5 rounded-2xl"><TrendingUp size={28} className="text-[#E64833]" /></div>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#90AEAD]/20 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-[#874F41] uppercase tracking-wider">SGPA</p>
                                                <p className="text-4xl font-extrabold text-[#244855] mt-1">{record.sgpa}</p>
                                            </div>
                                            <div className="p-4 bg-gradient-to-br from-[#244855]/10 to-[#244855]/5 rounded-2xl"><BarChart3 size={28} className="text-[#244855]" /></div>
                                        </div>
                                    </motion.div>

                                    {/* GPA Trend Line */}
                                    {gpaTrendData.length > 1 && (
                                        <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                                            <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><TrendingUp size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">GPA Trend</h2></div></div>
                                            <div className="p-5" style={{ height: 280 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={gpaTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#90AEAD30" />
                                                        <XAxis dataKey="name" tick={{ fill: "#244855", fontSize: 11, fontWeight: 600 }} />
                                                        <YAxis domain={[0, 10]} tick={{ fill: "#874F41", fontSize: 11 }} />
                                                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #90AEAD", fontSize: 13 }} />
                                                        <Line type="monotone" dataKey="gpa" stroke="#E64833" strokeWidth={3} dot={{ fill: "#E64833", r: 5, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 7, fill: "#874F41" }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Mid-term bar chart */}
                                    {midTermData.length > 0 && (
                                        <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                                            <div className="p-1.5"><div className="bg-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><BarChart3 size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">{childProfile?.full_name}&apos;s Mid-Term Scores</h2></div></div>
                                            <div className="p-5" style={{ height: 320 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={midTermData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#90AEAD30" />
                                                        <XAxis dataKey="name" tick={{ fill: "#244855", fontSize: 12, fontWeight: 600 }} />
                                                        <YAxis tick={{ fill: "#874F41", fontSize: 12 }} />
                                                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #90AEAD", fontSize: 13 }} />
                                                        <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                                                            {midTermData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? "#E64833" : "#244855"} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </motion.div>
                                    )}
                                </>)}

                                {/* ═══ TAB: ATTENDANCE & RISK ═══ */}
                                {tab === "attendance" && record?.attendance_data && record.attendance_data.length > 0 && (
                                    <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                                        <div className="p-1.5"><div className="bg-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><BookOpen size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">{childProfile?.full_name}&apos;s Attendance</h2></div></div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead><tr className="border-b border-[#90AEAD]/20">
                                                    <th className="p-4 text-[11px] font-bold text-[#874F41] uppercase">Subject</th>
                                                    <th className="p-4 text-[11px] font-bold text-[#874F41] uppercase">Attended</th>
                                                    <th className="p-4 text-[11px] font-bold text-[#874F41] uppercase">%</th>
                                                    <th className="p-4 text-[11px] font-bold text-[#874F41] uppercase">Missed</th>
                                                    <th className="p-4 text-[11px] font-bold text-[#874F41] uppercase">Can Still Miss</th>
                                                    <th className="p-4 text-[11px] font-bold text-[#874F41] uppercase">Risk</th>
                                                </tr></thead>
                                                <tbody>
                                                    {record.attendance_data.map((a, i) => {
                                                        const c = calcAtt(a); const rb = riskBadge(c.risk);
                                                        return (
                                                            <tr key={i} className="border-b border-[#90AEAD]/10 hover:bg-[#FBE9D0]/20 transition">
                                                                <td className="p-4 font-bold text-sm">{a.subject}</td>
                                                                <td className="p-4 text-sm">{a.attended} / {a.total_periods}</td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-16 h-2 bg-[#90AEAD]/20 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full ${c.risk === "Green" ? "bg-emerald-500" : c.risk === "Yellow" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(c.pct, 100)}%` }} />
                                                                        </div>
                                                                        <span className="text-xs font-bold">{c.pct}%</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-sm text-[#874F41]">{c.missed}</td>
                                                                <td className="p-4 text-sm font-bold">{c.canStillMiss}</td>
                                                                <td className="p-4"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${rb.bg} ${rb.text}`}><rb.Icon size={12} />{rb.label}</span></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}
                                {tab === "attendance" && (!record || !record.attendance_data || record.attendance_data.length === 0) && (
                                    <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 p-10 text-center">
                                        <BookOpen size={40} className="mx-auto text-[#90AEAD]/30 mb-3" />
                                        <p className="text-lg font-bold text-[#244855]">No attendance data available</p>
                                        <p className="text-sm text-[#90AEAD] mt-1">The mentor has not entered attendance yet.</p>
                                    </motion.div>
                                )}

                                {/* ═══ TAB: FEEDBACK ═══ */}
                                {tab === "feedback" && (
                                    <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                                        <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><MessageSquare size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">Mentor Feedback</h2><span className="ml-auto text-xs font-semibold text-[#90AEAD] flex items-center gap-1"><EyeOff size={12} />Confidential notes hidden</span></div></div>
                                        <div className="p-5 space-y-3">
                                            {notes.length === 0 ? (
                                                <div className="py-12 text-center">
                                                    <MessageSquare size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                                                    <p className="text-[#90AEAD] font-medium">No feedback yet.</p>
                                                    <p className="text-xs text-[#90AEAD]/60 mt-1">The mentor has not written any parent-visible notes for {childProfile?.full_name || "your child"}.</p>
                                                </div>
                                            ) : (
                                                notes.map(n => (
                                                    <div key={n.id} className="p-4 bg-[#FBE9D0]/30 rounded-xl border border-[#90AEAD]/10">
                                                        <p className="text-sm text-[#874F41] leading-relaxed">{n.note_content}</p>
                                                        <span className="text-[10px] text-emerald-600 font-bold mt-2 inline-flex items-center gap-1">👁 Visible to parent</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
