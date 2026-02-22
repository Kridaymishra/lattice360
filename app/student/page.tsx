"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Shield, ChevronRight, AlertTriangle, CheckCircle, XCircle,
  BookOpen, BarChart3, Eye, EyeOff, ClipboardList, RefreshCw, X,
  Calendar, Clock, CalendarPlus, User, MessageSquareText, TrendingUp,
  CheckSquare, Square, Minus, Heart, Send, Reply, Bot, Sparkles,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ═══════════ Types (exact Supabase schema) ═══════════ */
interface Profile {
  id: string; email: string; role: string;
  full_name: string; branch: string; study_year: string; phone: string;
}
interface MidScore { subject: string; score: number }
interface AttRow { subject: string; total_periods: number; attended: number }
interface AcademicRecord {
  id?: string; student_id: string;
  sgpa: number; cgpa: number;
  mid_term_scores: MidScore[];
  attendance_data: AttRow[];
}
interface TaskItem {
  id: string; student_id: string; mentor_id: string;
  title: string; description: string; is_completed: boolean;
}
interface Session {
  id: string; student_id: string; mentor_id: string;
  session_date: string; status: string; rescheduled_by: string | null;
}
interface MentorNote {
  id: string; student_id: string; note_content: string; is_confidential: boolean;
}
interface StudentUpdate {
  id: string; student_id: string; content: string;
  mentor_reply: string | null; created_at: string;
}

/* ═══════════ Animation ═══════════ */
const cV: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const iV: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };
const tabV: Variants = { enter: { opacity: 0, x: 20 }, center: { opacity: 1, x: 0, transition: { duration: 0.22 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.14 } } };

type Tab = "profile" | "academics" | "tasks" | "appointments" | "ai" | "wellness";

/* ═══════════════════════════════════════════════════════════════
   STUDENT DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [record, setRecord] = useState<AcademicRecord | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedback, setFeedback] = useState<MentorNote[]>([]);
  const [updates, setUpdates] = useState<StudentUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");

  /* wellness update form */
  const [updateContent, setUpdateContent] = useState("");
  const [savingUpdate, setSavingUpdate] = useState(false);

  /* AI chat */
  interface ChatMsg { role: "user" | "assistant"; content: string }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* consent (local toggle — stored in localStorage for demo) */
  const [hideWellness, setHideWellness] = useState(false);

  /* booking modal */
  const [showBook, setShowBook] = useState(false);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");

  /* reschedule modal */
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");

  /* ═══════ Load ═══════ */
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/login"; return; }

        const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!p) { window.location.href = "/login"; return; }
        if (p.role !== "student") { window.location.href = "/" + p.role; return; }
        setProfile(p);

        const { data: ar } = await supabase.from("academic_records").select("*").eq("student_id", user.id).single();
        if (ar) setRecord(ar);

        const { data: t } = await supabase.from("tasks").select("*").eq("student_id", user.id);
        if (t) setTasks(t);

        const { data: s } = await supabase.from("sessions").select("*").eq("student_id", user.id).order("session_date", { ascending: true });
        if (s) setSessions(s);

        const { data: n } = await supabase.from("mentor_notes").select("*").eq("student_id", user.id).eq("is_confidential", false);
        if (n) setFeedback(n);

        const { data: upd } = await supabase.from("student_updates").select("*").eq("student_id", user.id).order("created_at", { ascending: false });
        if (upd) setUpdates(upd);

        /* read consent from localStorage */
        const stored = localStorage.getItem("lattice360_hideWellness");
        if (stored === "true") setHideWellness(true);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  /* ── attendance calculator ── */
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

  /* ── task ops ── */
  const toggleTask = async (id: string, current: boolean) => {
    const next = !current;
    await supabase.from("tasks").update({ is_completed: next }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: next } : t));
  };
  const taskProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100);
  }, [tasks]);

  /* ── consent toggle ── */
  const toggleWellness = () => {
    const next = !hideWellness;
    setHideWellness(next);
    localStorage.setItem("lattice360_hideWellness", String(next));
  };

  /* ── booking ── */
  const bookSession = async () => {
    if (!bookDate || !bookTime) { alert("Pick a date and time."); return; }
    try {
      const sessionDate = `${bookDate}T${bookTime}:00`;
      const { data: mentors } = await supabase.from("profiles").select("id").eq("role", "mentor").limit(1);
      const { error } = await supabase.from("sessions").insert({
        student_id: profile!.id,
        mentor_id: mentors?.[0]?.id || null,
        session_date: sessionDate,
        status: "requested",
        rescheduled_by: null,
      });
      if (error) throw error;
      alert("✅ Session requested!");
      setShowBook(false); setBookDate(""); setBookTime("");
      const { data: s } = await supabase.from("sessions").select("*").eq("student_id", profile!.id).order("session_date", { ascending: true });
      if (s) setSessions(s);
    } catch (err: unknown) { console.error(err); alert("Failed to book session: " + (err instanceof Error ? err.message : JSON.stringify(err))); }
  };

  /* ── reschedule ── */
  const rescheduleSession = async () => {
    if (!reschedId || !reschedDate || !reschedTime) { alert("Fill date & time."); return; }
    const sessionDate = `${reschedDate}T${reschedTime}:00`;
    await supabase.from("sessions").update({ session_date: sessionDate, status: "requested", rescheduled_by: "student" }).eq("id", reschedId);
    setSessions(prev => prev.map(s => s.id === reschedId ? { ...s, session_date: sessionDate, status: "requested", rescheduled_by: "student" } : s));
    setReschedId(null);
  };

  /* ── submit wellness update ── */
  const submitUpdate = async () => {
    if (!updateContent.trim()) { alert("Write something first."); return; }
    setSavingUpdate(true);
    try {
      const { error } = await supabase.from("student_updates").insert({
        student_id: profile!.id,
        content: updateContent.trim(),
      });
      if (error) throw error;
      alert("✅ Update sent!");
      setUpdateContent("");
      const { data: upd } = await supabase.from("student_updates").select("*").eq("student_id", profile!.id).order("created_at", { ascending: false });
      if (upd) setUpdates(upd);
    } catch (err: unknown) { alert("Failed: " + (err instanceof Error ? err.message : JSON.stringify(err))); }
    setSavingUpdate(false);
  };

  /* ── AI chat ── */
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      /* Stream SSE response */
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              assistantContent += delta;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            } catch { /* skip malformed chunks */ }
          }
        }
      }

      /* If streaming produced nothing, treat as non-streaming response */
      if (!assistantContent) {
        setChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "I'm sorry, I couldn't generate a response. Please try again." };
          return updated;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setChatMessages(prev => [...prev, { role: "assistant", content: `⚠️ Error: ${msg}` }]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, chatMessages]);

  /* auto-scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (loading) return <div className="min-h-screen bg-[#FBE9D0] flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><RefreshCw size={36} className="text-[#244855]" /></motion.div></div>;

  const TABS: { label: string; icon: typeof User; key: Tab }[] = [
    { label: "Profile", icon: User, key: "profile" },
    { label: "Academics", icon: BarChart3, key: "academics" },
    { label: "Tasks", icon: ClipboardList, key: "tasks" },
    { label: "Appointments", icon: Calendar, key: "appointments" },
    { label: "AI Assistant", icon: Bot, key: "ai" },
    { label: "Wellness", icon: Heart, key: "wellness" },
  ];
  const midTermData = record?.mid_term_scores?.map(m => ({ name: m.subject, score: m.score })) || [];

  return (
    <div className="min-h-screen bg-[#FBE9D0] flex flex-col md:flex-row font-sans text-[#244855]">
      {/* ░░░ SIDEBAR ░░░ */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-[#244855] text-[#FBE9D0] shadow-2xl z-20 sticky top-0 h-screen">
        <div className="p-6 pb-2">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
            <Shield className="text-[#E64833]" size={28} /><span>Lattice<span className="text-[#E64833]">360</span></span>
          </Link>
          <p className="text-xs text-[#90AEAD] mt-1 ml-10">Student Portal</p>
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
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="bg-[#874F41]/20 rounded-lg px-2 py-1.5"><p className="text-[9px] font-bold text-[#FBE9D0]/60 uppercase">Branch</p><p className="text-[11px] font-bold text-[#FBE9D0]">{profile?.branch || "—"}</p></div>
            <div className="bg-[#874F41]/20 rounded-lg px-2 py-1.5"><p className="text-[9px] font-bold text-[#FBE9D0]/60 uppercase">Year</p><p className="text-[11px] font-bold text-[#FBE9D0]">{profile?.study_year || "—"}</p></div>
          </div>
        </div>
        <nav className="flex-1 mt-6 px-4 space-y-1 overflow-y-auto">
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

                {/* ═══ PROFILE ═══ */}
                {tab === "profile" && (<>
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><User size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">My Profile</h2></div></div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { label: "Full Name", val: profile?.full_name },
                          { label: "Email", val: profile?.email },
                          { label: "Phone", val: profile?.phone },
                          { label: "Branch", val: profile?.branch },
                          { label: "Year", val: profile?.study_year },
                          { label: "Role", val: profile?.role },
                        ].map(f => (
                          <div key={f.label} className="p-4 bg-[#FBE9D0]/30 rounded-xl">
                            <p className="text-[10px] font-bold text-[#874F41] uppercase tracking-wider">{f.label}</p>
                            <p className="text-sm font-bold text-[#244855] mt-1">{f.val || "—"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><Shield size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">Privacy & Consent</h2></div></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between p-4 bg-[#FBE9D0]/30 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          {hideWellness ? <EyeOff size={16} className="text-[#90AEAD]" /> : <Eye size={16} className="text-[#E64833]" />}
                          <div>
                            <span className="font-medium text-sm text-[#244855]">Hide wellness notes from parents</span>
                            <p className="text-[10px] text-[#90AEAD]">{hideWellness ? "Parents cannot see wellness notes" : "Parents can see wellness notes"}</p>
                          </div>
                        </div>
                        <button onClick={toggleWellness}
                          className={`w-12 h-6 rounded-full relative shadow-inner transition-colors duration-200 ${hideWellness ? "bg-[#E64833]" : "bg-[#90AEAD]/40"}`}>
                          <motion.div layout animate={{ x: hideWellness ? 24 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                  {/* Mentor feedback */}
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 p-5">
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><MessageSquareText size={16} className="text-[#874F41]" />Mentor Feedback</h3>
                    {feedback.length === 0 ? (
                      <p className="text-sm text-[#90AEAD] text-center py-4">No feedback from your mentor yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {feedback.map(n => (
                          <div key={n.id} className="p-3 bg-[#FBE9D0]/30 rounded-xl">
                            <p className="text-sm text-[#874F41] leading-relaxed">{n.note_content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>)}

                {/* ═══ ACADEMICS ═══ */}
                {tab === "academics" && (<>
                  {!record ? (
                    <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 p-10 text-center">
                      <BookOpen size={40} className="mx-auto text-[#90AEAD]/30 mb-3" />
                      <p className="text-lg font-bold text-[#244855]">No academic records found</p>
                      <p className="text-sm text-[#90AEAD] mt-1">Your mentor has not entered any academic data yet.</p>
                    </motion.div>
                  ) : (<>
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

                    {midTermData.length > 0 && (
                      <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                        <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><BarChart3 size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">Mid-Term Scores</h2></div></div>
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

                    {record.attendance_data && record.attendance_data.length > 0 && (
                      <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                        <div className="p-1.5"><div className="bg-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><BookOpen size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">Attendance Calculator</h2></div></div>
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
                  </>)}
                </>)}

                {/* ═══ TASKS ═══ */}
                {tab === "tasks" && (
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5">
                      <div className="bg-[#244855] rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><ClipboardList size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">My Tasks</h2></div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#FBE9D0]/80">{tasks.filter(t => t.is_completed).length}/{tasks.length}</span>
                          <div className="w-24 h-2.5 bg-white/15 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-[#E64833] to-[#874F41] rounded-full" initial={{ width: 0 }} animate={{ width: `${taskProgress}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                          </div>
                          <span className="text-xs font-bold text-[#E64833]">{taskProgress}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 space-y-2.5">
                      {tasks.length === 0 && (
                        <div className="py-12 text-center">
                          <ClipboardList size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                          <p className="text-[#90AEAD] font-medium">No tasks assigned yet.</p>
                          <p className="text-xs text-[#90AEAD]/60 mt-1">Your mentor will assign tasks that appear here.</p>
                        </div>
                      )}
                      {tasks.map(t => (
                        <motion.div key={t.id} layout
                          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${t.is_completed ? "bg-emerald-50/50 border-emerald-200/40" : "bg-[#FBE9D0]/20 border-[#90AEAD]/15 hover:border-[#90AEAD]/30"}`}>
                          <button onClick={() => toggleTask(t.id, t.is_completed)} className="mt-0.5 shrink-0">
                            {t.is_completed ? <CheckSquare size={20} className="text-emerald-500" /> : <Square size={20} className="text-[#90AEAD] hover:text-[#E64833] transition" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm transition ${t.is_completed ? "line-through text-[#90AEAD]" : "text-[#244855]"}`}>{t.title}</p>
                            {t.description && <p className="text-xs text-[#874F41] mt-1 line-clamp-2">{t.description}</p>}
                          </div>
                          {t.is_completed && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0">Done</span>}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ═══ APPOINTMENTS ═══ */}
                {tab === "appointments" && (
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5">
                      <div className="bg-[#90AEAD] rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><Calendar size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">My Appointments</h2></div>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowBook(true)}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 transition">
                          <CalendarPlus size={14} />Book Session
                        </motion.button>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {sessions.length === 0 && (
                        <div className="py-12 text-center">
                          <Calendar size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                          <p className="text-[#90AEAD] font-medium">No appointments yet.</p>
                          <p className="text-xs text-[#90AEAD]/60 mt-1">Click &quot;Book Session&quot; to request a meeting.</p>
                        </div>
                      )}
                      {sessions.map(s => {
                        const dateStr = s.session_date ? new Date(s.session_date).toLocaleString() : "—";
                        return (
                          <motion.div key={s.id} layout className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3 transition ${s.status === "confirmed" ? "bg-emerald-50/50 border-emerald-200/50" : s.status === "rescheduled" ? "bg-blue-50/50 border-blue-200/50" : s.status === "not_available" ? "bg-red-50/50 border-red-200/50" : "bg-[#FBE9D0]/20 border-[#90AEAD]/15"}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-[#874F41] flex items-center gap-1"><Clock size={11} />{dateStr}</p>
                              {s.rescheduled_by && <p className="text-[10px] text-blue-600 font-bold mt-0.5">Rescheduled by: {s.rescheduled_by}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${s.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : s.status === "not_available" ? "bg-red-100 text-red-700" : s.status === "rescheduled" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
                              {(s.status === "rescheduled") && (
                                <button onClick={() => { setReschedId(s.id); setReschedDate(""); setReschedTime(""); }} className="px-3 py-1.5 bg-[#244855] hover:bg-[#1a3640] text-white rounded-lg text-[11px] font-bold transition">Pick New Date</button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ═══ AI ASSISTANT ═══ */}
                {tab === "ai" && (
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 140px)", minHeight: 500 }}>
                    {/* Header */}
                    <div className="p-1.5 shrink-0">
                      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#244855] rounded-xl p-4 flex items-center gap-2.5">
                        <div className="p-2 bg-gradient-to-br from-[#E64833] to-[#874F41] rounded-xl shadow-lg shadow-[#E64833]/25">
                          <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-[#FBE9D0]">AI Assistant</h2>
                          <p className="text-[10px] text-[#90AEAD] font-medium uppercase tracking-widest">Powered by Qwen 2.5</p>
                        </div>
                        {chatMessages.length > 0 && (
                          <button onClick={() => setChatMessages([])} className="ml-auto px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-[#FBE9D0]/70 transition">Clear Chat</button>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {chatMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <div className="p-4 bg-gradient-to-br from-[#E64833]/10 to-[#874F41]/10 rounded-2xl mb-4">
                            <Bot size={40} className="text-[#E64833]" />
                          </div>
                          <h3 className="text-lg font-bold text-[#244855] mb-2">How can I help you today?</h3>
                          <p className="text-sm text-[#90AEAD] max-w-sm">Ask me about study tips, exam strategies, time management, or any academic questions.</p>
                          <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {["Study tips for exams", "How to improve my GPA?", "Time management advice"].map(q => (
                              <button key={q} onClick={() => { setChatInput(q); }} className="px-3 py-1.5 bg-[#FBE9D0]/50 border border-[#90AEAD]/20 rounded-full text-xs font-medium text-[#874F41] hover:bg-[#FBE9D0] hover:border-[#E64833]/30 transition">
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                            ? "bg-gradient-to-r from-[#E64833] to-[#874F41] text-white rounded-br-md"
                            : "bg-[#FBE9D0]/40 border border-[#90AEAD]/15 text-[#244855] rounded-bl-md"
                            }`}>
                            {msg.role === "assistant" && (
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Bot size={12} className="text-[#E64833]" />
                                <span className="text-[10px] font-bold text-[#874F41] uppercase tracking-wider">Lattice360 AI</span>
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content || (chatLoading && i === chatMessages.length - 1 ? "" : "")}</p>
                            {chatLoading && i === chatMessages.length - 1 && msg.role === "assistant" && !msg.content && (
                              <div className="flex gap-1 mt-1">
                                {[0, 1, 2].map(d => (
                                  <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-[#E64833]/50"
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                    transition={{ duration: 1.2, delay: d * 0.2, repeat: Infinity }} />
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="shrink-0 p-4 border-t border-[#90AEAD]/15 bg-white">
                      <div className="flex gap-2">
                        <input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                          placeholder="Ask anything about academics, study tips, or career advice…"
                          className="flex-1 p-3 border-2 border-[#90AEAD]/30 rounded-xl text-sm focus:border-[#E64833] outline-none bg-[#FBE9D0]/10 placeholder:text-[#90AEAD]/50"
                          disabled={chatLoading}
                        />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                          className="px-5 py-3 bg-gradient-to-r from-[#E64833] to-[#874F41] text-white rounded-xl font-bold disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-[#E64833]/20 transition">
                          {chatLoading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                              <RefreshCw size={16} />
                            </motion.div>
                          ) : (
                            <Send size={16} />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ░░░ BOOKING MODAL ░░░ */}
      <AnimatePresence>
        {showBook && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#90AEAD]/20">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#244855]">Request a Session</h3>
                <button onClick={() => setShowBook(false)} className="p-1.5 hover:bg-[#FBE9D0] rounded-lg transition"><X size={20} className="text-[#874F41]" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-sm font-bold text-[#244855] block mb-1">Date</label><input type="date" value={bookDate} onChange={e => setBookDate(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" /></div>
                <div><label className="text-sm font-bold text-[#244855] block mb-1">Time</label><input type="time" value={bookTime} onChange={e => setBookTime(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" /></div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={bookSession}
                  className="w-full py-3.5 bg-gradient-to-r from-[#E64833] to-[#874F41] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#E64833]/20 mt-2">
                  <CalendarPlus size={16} />Request Session
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ TAB: WELLNESS UPDATES ══════════ */}
      {tab === "wellness" && (<>
        {/* Submit form */}
        <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
          <div className="p-1.5"><div className="bg-gradient-to-r from-[#E64833] to-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><Heart size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">Share a Wellness Update</h2></div></div>
          <div className="p-6 space-y-4">
            <textarea
              value={updateContent} onChange={e => setUpdateContent(e.target.value)}
              rows={4} placeholder="How are you feeling? Share any concerns, progress, or thoughts with your mentor…"
              className="w-full p-4 border-2 border-[#90AEAD]/40 rounded-xl text-sm resize-none focus:border-[#E64833] outline-none bg-[#FBE9D0]/20 placeholder:text-[#90AEAD]/60"
            />
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={submitUpdate} disabled={savingUpdate}
              className="w-full py-3.5 bg-gradient-to-r from-[#E64833] to-[#874F41] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#E64833]/20">
              <Send size={16} />{savingUpdate ? "Sending…" : "Send Update"}
            </motion.button>
          </div>
        </motion.div>

        {/* History */}
        <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
          <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><MessageSquareText size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">Your Updates</h2><span className="ml-auto text-xs text-[#90AEAD] font-bold">{updates.length} total</span></div></div>
          <div className="p-5 space-y-3">
            {updates.length === 0 ? (
              <div className="py-12 text-center">
                <Heart size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                <p className="text-[#90AEAD] font-medium">No updates yet.</p>
                <p className="text-xs text-[#90AEAD]/60 mt-1">Share your first wellness update above.</p>
              </div>
            ) : (
              updates.map(u => (
                <div key={u.id} className="rounded-xl border border-[#90AEAD]/15 overflow-hidden">
                  <div className="p-4 bg-[#FBE9D0]/20">
                    <p className="text-sm text-[#244855] leading-relaxed">{u.content}</p>
                    <p className="text-[10px] text-[#90AEAD] mt-2">{new Date(u.created_at).toLocaleString()}</p>
                  </div>
                  {u.mentor_reply && (
                    <div className="p-4 bg-emerald-50/50 border-t border-emerald-200/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Reply size={12} className="text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Mentor Reply</span>
                      </div>
                      <p className="text-sm text-emerald-800 leading-relaxed">{u.mentor_reply}</p>
                    </div>
                  )}
                  {!u.mentor_reply && (
                    <div className="px-4 py-2.5 bg-amber-50/50 border-t border-amber-200/30">
                      <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1"><Clock size={11} />Awaiting mentor reply…</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </>)}

      {/* ░░░ RESCHEDULE MODAL ░░░ */}
      <AnimatePresence>
        {reschedId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#90AEAD]/20">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#244855]">Pick New Date</h3>
                <button onClick={() => setReschedId(null)} className="p-1.5 hover:bg-[#FBE9D0] rounded-lg transition"><X size={20} className="text-[#874F41]" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-sm font-bold text-[#244855] block mb-1">New Date</label><input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" /></div>
                <div><label className="text-sm font-bold text-[#244855] block mb-1">New Time</label><input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" /></div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={rescheduleSession}
                  className="w-full py-3.5 bg-[#244855] hover:bg-[#1a3640] text-white rounded-xl font-bold mt-2 transition">
                  Update Appointment
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
