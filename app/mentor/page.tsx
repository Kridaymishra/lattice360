"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Shield, Users, ChevronRight, AlertTriangle, CheckCircle, XCircle,
  BookOpen, BarChart3, Download, Plus, ClipboardList, Send, X,
  RefreshCw, Calendar, Clock, FileText, Lock, Eye, Filter,
  UserCheck, CalendarX, MessageSquare, Search, Trash2, StickyNote, CalendarPlus, Minus,
  Heart, Reply,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* ═══════════ Types (matches exact Supabase schema) ═══════════ */
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
  id?: string; student_id: string; mentor_id: string;
  title: string; description: string; is_completed: boolean;
}
interface Session {
  id: string; student_id: string; mentor_id: string;
  session_date: string; status: string; rescheduled_by: string | null;
  student_name?: string;
}
interface MentorNote {
  id?: string; student_id: string; mentor_id: string;
  note_content: string; is_confidential: boolean;
}
interface StudentUpdate {
  id: string; student_id: string; content: string;
  mentor_reply: string | null; created_at: string;
}

/* ═══════════ Animation ═══════════ */
const cV: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const iV: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };
const tabV: Variants = { enter: { opacity: 0, x: 20 }, center: { opacity: 1, x: 0, transition: { duration: 0.22 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.14 } } };

/* ═══════════ Helpers ═══════════ */
function avgAtt(att: AttRow[] | undefined): number {
  if (!att || att.length === 0) return -1;
  const valid = att.filter(r => r.total_periods > 0);
  if (valid.length === 0) return -1;
  const s = valid.reduce((a, r) => a + (r.attended / r.total_periods) * 100, 0);
  return Math.round((s / valid.length) * 10) / 10;
}
function riskLevel(attPct: number): "Red" | "Yellow" | "Green" | "NoData" {
  if (attPct < 0) return "NoData";
  if (attPct < 75) return "Red";
  if (attPct < 85) return "Yellow";
  return "Green";
}
function riskStyle(r: "Red" | "Yellow" | "Green" | "NoData") {
  if (r === "NoData") return { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "No Data", Icon: Minus };
  if (r === "Red") return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Critical", Icon: XCircle };
  if (r === "Yellow") return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "At Risk", Icon: AlertTriangle };
  return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Stable", Icon: CheckCircle };
}

type Tab = "roster" | "academic" | "tasks" | "sessions" | "notes" | "updates";

/* ═══════════════════════════════════════════════════════════════
   MENTOR DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function MentorDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [students, setStudents] = useState<Profile[]>([]);
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notes, setNotes] = useState<MentorNote[]>([]);
  const [studentUpdates, setStudentUpdates] = useState<StudentUpdate[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("roster");

  /* roster filters */
  const [filterRisk, setFilterRisk] = useState<"All" | "Red" | "Yellow" | "Green">("All");
  const [search, setSearch] = useState("");

  /* academic form */
  const [selStudent, setSelStudent] = useState("");
  const [fSgpa, setFSgpa] = useState("");
  const [fCgpa, setFCgpa] = useState("");
  const [fMid, setFMid] = useState<MidScore[]>([{ subject: "", score: 0 }]);
  const [fAtt, setFAtt] = useState<AttRow[]>([{ subject: "", total_periods: 0, attended: 0 }]);
  const [saving, setSaving] = useState(false);

  /* task form */
  const [taskStudent, setTaskStudent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [assignAll, setAssignAll] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  /* notes form */
  const [noteStudent, setNoteStudent] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteConfidential, setNoteConfidential] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  /* mentor scheduling */
  const [schedStudent, setSchedStudent] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [savingSched, setSavingSched] = useState(false);

  /* report */
  const [reportStudent, setReportStudent] = useState("");

  /* ═══════ Load ═══════ */
  const reload = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!p) { window.location.href = "/login"; return; }
      if (p.role !== "mentor") { window.location.href = "/" + p.role; return; }
      setProfile(p);

      const { data: studs } = await supabase.from("profiles").select("*").eq("role", "student");
      if (studs) setStudents(studs);

      const { data: recs } = await supabase.from("academic_records").select("*");
      if (recs) setRecords(recs);

      const { data: sess } = await supabase.from("sessions").select("*").order("session_date", { ascending: true });
      if (sess) setSessions(sess);

      const { data: n } = await supabase.from("mentor_notes").select("*").order("id", { ascending: false });
      if (n) setNotes(n);

      const { data: su } = await supabase.from("student_updates").select("*").order("created_at", { ascending: false });
      if (su) setStudentUpdates(su);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /* ── enriched roster ── */
  const enriched = useMemo(() => {
    const order: Record<string, number> = { Red: 0, Yellow: 1, Green: 2, NoData: 3 };
    return students
      .map(s => {
        const rec = records.find(r => r.student_id === s.id);
        const att = avgAtt(rec?.attendance_data);
        const r = riskLevel(att);
        return { ...s, cgpa: rec?.cgpa ?? 0, sgpa: rec?.sgpa ?? 0, att, risk: r, rec };
      })
      .filter(s => filterRisk === "All" || s.risk === filterRisk)
      .filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => order[a.risk] - order[b.risk]);
  }, [students, records, filterRisk, search]);

  /* ── student name lookup ── */
  const studentName = (id: string) => students.find(s => s.id === id)?.full_name || "Unknown";

  /* ── select student for academic edit ── */
  const pickStudent = (id: string) => {
    setSelStudent(id);
    const rec = records.find(r => r.student_id === id);
    if (rec) {
      setFCgpa(String(rec.cgpa)); setFSgpa(String(rec.sgpa));
      setFMid(rec.mid_term_scores?.length ? rec.mid_term_scores : [{ subject: "", score: 0 }]);
      setFAtt(rec.attendance_data?.length ? rec.attendance_data : [{ subject: "", total_periods: 0, attended: 0 }]);
    } else {
      setFCgpa(""); setFSgpa("");
      setFMid([{ subject: "", score: 0 }]);
      setFAtt([{ subject: "", total_periods: 0, attended: 0 }]);
    }
  };

  /* ═══════ Save academic ═══════ */
  const saveAcademic = async () => {
    if (!selStudent || !fCgpa) { alert("Select a student and enter CGPA."); return; }
    setSaving(true);
    try {
      const cleanMid = fMid
        .filter(m => m.subject.trim())
        .map(m => ({ subject: m.subject.trim(), score: Number(m.score) || 0 }));
      const cleanAtt = fAtt
        .filter(a => a.subject.trim())
        .map(a => ({ subject: a.subject.trim(), total_periods: Number(a.total_periods) || 0, attended: Number(a.attended) || 0 }));
      const payload = {
        student_id: selStudent,
        sgpa: parseFloat(fSgpa) || 0,
        cgpa: parseFloat(fCgpa) || 0,
        mid_term_scores: cleanMid,
        attendance_data: cleanAtt,
      };
      const { error } = await supabase.from("academic_records").upsert(payload, { onConflict: "student_id" });
      if (error) throw error;
      alert("✅ Academic record saved!"); await reload();
    } catch (err: unknown) { alert("Save failed: " + (err instanceof Error ? err.message : JSON.stringify(err))); }
    setSaving(false);
  };

  /* ═══════ Assign task ═══════ */
  const saveTask = async () => {
    if (!assignAll && !taskStudent) { alert("Select a student."); return; }
    if (!taskTitle) { alert("Enter a title."); return; }
    setSavingTask(true);
    try {
      if (assignAll) {
        const rows = students.map(s => ({ student_id: s.id, mentor_id: profile!.id, title: taskTitle, description: taskDesc, is_completed: false }));
        const { error } = await supabase.from("tasks").insert(rows);
        if (error) throw error;
        alert(`✅ Task assigned to all ${students.length} students!`);
      } else {
        const { error } = await supabase.from("tasks").insert({ student_id: taskStudent, mentor_id: profile!.id, title: taskTitle, description: taskDesc, is_completed: false });
        if (error) throw error;
        alert("✅ Task assigned!");
      }
      setTaskTitle(""); setTaskDesc(""); setTaskStudent(""); setAssignAll(false);
    } catch (err: unknown) { alert("Failed: " + (err instanceof Error ? err.message : JSON.stringify(err))); }
    setSavingTask(false);
  };

  /* ═══════ Session actions ═══════ */
  const updateSession = async (id: string, status: string, newDate?: string) => {
    const u: Record<string, unknown> = { status };
    if (newDate) { u.session_date = newDate; u.rescheduled_by = "mentor"; }
    await supabase.from("sessions").update(u).eq("id", id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status, ...(newDate ? { session_date: newDate, rescheduled_by: "mentor" } : {}) } : s));
  };

  /* ═══════ Mentor-initiated scheduling ═══════ */
  const scheduleMeeting = async () => {
    if (!schedStudent) { alert("Select a student."); return; }
    if (!schedDate || !schedTime) { alert("Pick a date and time."); return; }
    setSavingSched(true);
    try {
      const sessionDate = `${schedDate}T${schedTime}:00`;
      const { error } = await supabase.from("sessions").insert({
        student_id: schedStudent,
        mentor_id: profile!.id,
        session_date: sessionDate,
        status: "confirmed",
        rescheduled_by: null,
      });
      if (error) throw error;
      alert("✅ Meeting scheduled!");
      setSchedStudent(""); setSchedDate(""); setSchedTime("");
      await reload();
    } catch (err: unknown) { alert("Failed: " + (err instanceof Error ? err.message : JSON.stringify(err))); }
    setSavingSched(false);
  };

  /* ═══════ Save note ═══════ */
  const saveNote = async () => {
    if (!noteStudent || !noteContent.trim()) { alert("Select a student and enter note content."); return; }
    setSavingNote(true);
    try {
      const { error } = await supabase.from("mentor_notes").insert({
        student_id: noteStudent, mentor_id: profile!.id,
        note_content: noteContent, is_confidential: noteConfidential,
      });
      if (error) throw error;
      alert("✅ Note saved!"); setNoteContent(""); setNoteConfidential(false);
      await reload();
    } catch (err: unknown) { alert("Failed: " + (err instanceof Error ? err.message : JSON.stringify(err))); }
    setSavingNote(false);
  };

  /* ═══════ Reply to student update ═══════ */
  const replyToUpdate = async (messageId: string) => {
    const replyText = replyTexts[messageId]?.trim();
    if (!replyText) { alert("Write a reply first."); return; }
    try {
      const { error } = await supabase.from("student_updates").update({ mentor_reply: replyText }).eq("id", messageId);
      if (error) throw error;
      alert("✅ Reply sent!");
      setReplyTexts(prev => { const n = { ...prev }; delete n[messageId]; return n; });
      await reload();
    } catch (error: unknown) { alert("Reply failed: " + ((error as { message?: string }).message || JSON.stringify(error))); }
  };

  /* ═══════ PDF ═══════ */
  const generatePDF = async (studentId?: string) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const c1 = [36, 72, 85] as const;

    doc.setFontSize(22); doc.setTextColor(...c1);
    doc.text("Lattice360 — Student Report", 14, 24);
    doc.setFontSize(10); doc.setTextColor(135, 79, 65);
    doc.text(`Mentor: ${profile?.full_name || "N/A"}  |  ${new Date().toLocaleDateString()}`, 14, 34);
    doc.setDrawColor(144, 174, 173); doc.line(14, 38, 196, 38);

    const list = studentId ? enriched.filter(s => s.id === studentId) : enriched;
    let y = 48;
    for (const s of list) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setTextColor(...c1);
      doc.text(s.full_name || s.email, 14, y); y += 7;
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(`CGPA: ${s.cgpa}  |  SGPA: ${s.sgpa}  |  Attendance: ${s.att}%  |  Status: ${s.risk}`, 18, y); y += 6;
      if (s.rec?.mid_term_scores?.length) {
        const txt = s.rec.mid_term_scores.map(m => `${m.subject}: ${m.score}`).join("  |  ");
        doc.setFontSize(9); doc.text("Mid-Terms: " + txt, 18, y); y += 6;
      }
      const sNotes = notes.filter(n => n.student_id === s.id && !n.is_confidential);
      for (const n of sNotes) {
        doc.setFontSize(9); doc.setTextColor(120);
        const lines = doc.splitTextToSize("Note: " + n.note_content, 170);
        doc.text(lines, 18, y); y += lines.length * 5;
      }
      y += 6;
    }
    doc.save(studentId ? `Lattice360_${list[0]?.full_name || "report"}.pdf` : "Lattice360_All.pdf");
  };

  /* ═══════ Loading ═══════ */
  if (loading) return (
    <div className="min-h-screen bg-[#FBE9D0] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
        <RefreshCw size={36} className="text-[#244855]" />
      </motion.div>
    </div>
  );

  const TABS: { label: string; icon: typeof Users; key: Tab }[] = [
    { label: "Roster", icon: Users, key: "roster" },
    { label: "Academics", icon: BookOpen, key: "academic" },
    { label: "Tasks", icon: ClipboardList, key: "tasks" },
    { label: "Sessions", icon: Calendar, key: "sessions" },
    { label: "Notes", icon: StickyNote, key: "notes" },
    { label: "Updates", icon: Heart, key: "updates" },
  ];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#FBE9D0] flex flex-col md:flex-row font-sans text-[#244855]">
      {/* ░░░ SIDEBAR ░░░ */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-[#244855] text-[#FBE9D0] shadow-2xl z-20 sticky top-0 h-screen">
        <div className="p-6 pb-2">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
            <Shield className="text-[#E64833]" size={28} />
            <span>Lattice<span className="text-[#E64833]">360</span></span>
          </Link>
          <p className="text-xs text-[#90AEAD] mt-1 ml-10">Mentor Portal</p>
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
        </div>

        {/* risk summary */}
        <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
          {(["Red", "Yellow", "Green"] as const).map(r => {
            const rs = riskStyle(r);
            const cnt = students.filter(s => {
              const rec = records.find(rc => rc.student_id === s.id);
              return riskLevel(avgAtt(rec?.attendance_data)) === r;
            }).length;
            return (
              <div key={r} className="bg-[#90AEAD]/10 rounded-xl p-2 text-center">
                <p className="text-lg font-extrabold text-[#FBE9D0]">{cnt}</p>
                <p className="text-[9px] font-bold text-[#90AEAD] uppercase tracking-wider">{rs.label}</p>
              </div>
            );
          })}
        </div>

        <nav className="flex-1 mt-5 px-4 space-y-1 overflow-y-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${tab === t.key ? "bg-[#E64833]/15 text-[#E64833] font-bold shadow-sm" : "text-[#FBE9D0]/70 hover:text-[#FBE9D0] hover:bg-[#90AEAD]/10"}`}>
              <t.icon size={18} />{t.label}
              {tab === t.key && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-2">
          <button onClick={() => generatePDF()} className="w-full flex items-center justify-center gap-2 py-3 bg-[#E64833] hover:bg-[#c93e2b] text-white rounded-xl font-bold text-sm shadow-lg transition">
            <Download size={16} />Export All PDF
          </button>
          <div className="p-3 rounded-xl bg-[#90AEAD]/10 text-center"><p className="text-[10px] text-[#90AEAD] uppercase tracking-widest">Lattice360 v1.0</p></div>
        </div>
      </aside>

      {/* mobile bar */}
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

                {/* ══════════ TAB: ROSTER ══════════ */}
                {tab === "roster" && (<>
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5">
                      <div className="bg-[#244855] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-white/10 rounded-lg"><Users size={18} className="text-[#90AEAD]" /></div>
                          <h2 className="text-base font-bold text-[#FBE9D0]">Student Roster</h2>
                          <span className="text-xs text-[#90AEAD]/80 ml-1">{students.length} students</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <div className="relative">
                            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#90AEAD]" />
                            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value as typeof filterRisk)} className="pl-8 pr-3 py-1.5 bg-white/10 border border-white/15 rounded-lg text-xs text-[#FBE9D0] font-bold appearance-none cursor-pointer">
                              <option value="All" className="text-[#244855]">All</option>
                              <option value="Red" className="text-[#244855]">Critical</option>
                              <option value="Yellow" className="text-[#244855]">At Risk</option>
                              <option value="Green" className="text-[#244855]">Stable</option>
                            </select>
                          </div>
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#90AEAD]" />
                            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 bg-white/10 border border-white/15 rounded-lg text-xs text-[#FBE9D0] placeholder:text-[#90AEAD]/50 w-36" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Student Grid */}
                    {enriched.length === 0 ? (
                      <div className="p-10 text-center">
                        <Users size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                        <p className="text-[#90AEAD] font-medium">No students found.</p>
                      </div>
                    ) : (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {enriched.map(s => {
                          const rs = riskStyle(s.risk);
                          return (
                            <motion.div key={s.id} whileHover={{ y: -2 }}
                              className={`p-4 rounded-xl border-2 transition cursor-pointer ${selStudent === s.id ? "border-[#E64833] bg-[#E64833]/5" : "border-[#90AEAD]/15 hover:border-[#90AEAD]/30 bg-white"}`}
                              onClick={() => { pickStudent(s.id); setTab("academic"); }}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${rs.dot}`} />
                                  <div>
                                    <p className="font-bold text-sm text-[#244855]">{s.full_name || "—"}</p>
                                    <p className="text-[11px] text-[#874F41]">{s.branch || "—"} • Year {s.study_year || "—"}</p>
                                  </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rs.bg} ${rs.text}`}>{rs.label}</span>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                <div className="bg-[#FBE9D0]/40 rounded-lg p-1.5">
                                  <p className="text-[9px] text-[#874F41] font-bold uppercase">CGPA</p>
                                  <p className="text-sm font-extrabold text-[#244855]">{s.cgpa || "—"}</p>
                                </div>
                                <div className="bg-[#FBE9D0]/40 rounded-lg p-1.5">
                                  <p className="text-[9px] text-[#874F41] font-bold uppercase">SGPA</p>
                                  <p className="text-sm font-extrabold text-[#244855]">{s.sgpa || "—"}</p>
                                </div>
                                <div className="bg-[#FBE9D0]/40 rounded-lg p-1.5">
                                  <p className="text-[9px] text-[#874F41] font-bold uppercase">Att %</p>
                                  <p className={`text-sm font-extrabold ${s.risk === "Green" ? "text-emerald-600" : s.risk === "Yellow" ? "text-amber-600" : s.risk === "Red" ? "text-red-600" : "text-gray-500"}`}>{s.att < 0 ? "—" : `${s.att}%`}</p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </>)}

                {/* ══════════ TAB: ACADEMIC ENTRY ══════════ */}
                {tab === "academic" && (
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><BookOpen size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">Academic Data Entry</h2>{selStudent && <span className="ml-2 text-xs text-white/70">Editing: {studentName(selStudent)}</span>}</div></div>
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="text-sm font-bold text-[#244855] block mb-1">Select Student</label>
                        <select value={selStudent} onChange={e => pickStudent(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm text-[#244855] bg-white focus:border-[#E64833] focus:ring-1 focus:ring-[#E64833] outline-none transition">
                          <option value="">— Choose —</option>
                          {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.branch})</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-bold text-[#244855] block mb-1">CGPA</label>
                          <input type="number" step="0.01" min="0" max="10" value={fCgpa} onChange={e => setFCgpa(e.target.value)} placeholder="e.g. 8.45" className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-[#244855] block mb-1">SGPA</label>
                          <input type="number" step="0.01" min="0" max="10" value={fSgpa} onChange={e => setFSgpa(e.target.value)} placeholder="e.g. 8.80" className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" />
                        </div>
                      </div>
                      {/* Mid-terms */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-[#244855]">Mid-Term Scores</label>
                          <button onClick={() => setFMid([...fMid, { subject: "", score: 0 }])} className="text-xs font-bold text-[#E64833] flex items-center gap-1 hover:underline"><Plus size={14} />Add</button>
                        </div>
                        {fMid.map((m, i) => (
                          <div key={i} className="flex gap-2 mb-2">
                            <input placeholder="Subject" value={m.subject} onChange={e => { const n = [...fMid]; n[i] = { ...n[i], subject: e.target.value }; setFMid(n); }} className="flex-1 p-2.5 border-2 border-[#90AEAD]/40 rounded-lg text-sm focus:border-[#E64833] outline-none" />
                            <input type="number" placeholder="Score" value={m.score || ""} onChange={e => { const n = [...fMid]; n[i] = { ...n[i], score: Number(e.target.value) }; setFMid(n); }} className="w-24 p-2.5 border-2 border-[#90AEAD]/40 rounded-lg text-sm focus:border-[#E64833] outline-none" />
                            {fMid.length > 1 && <button onClick={() => setFMid(fMid.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>}
                          </div>
                        ))}
                      </div>
                      {/* Attendance */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-[#244855]">Attendance Data</label>
                          <button onClick={() => setFAtt([...fAtt, { subject: "", total_periods: 0, attended: 0 }])} className="text-xs font-bold text-[#E64833] flex items-center gap-1 hover:underline"><Plus size={14} />Add</button>
                        </div>
                        <div className="space-y-2">
                          {fAtt.map((a, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input placeholder="Subject" value={a.subject} onChange={e => { const n = [...fAtt]; n[i] = { ...n[i], subject: e.target.value }; setFAtt(n); }} className="flex-1 p-2.5 border-2 border-[#90AEAD]/40 rounded-lg text-sm focus:border-[#E64833] outline-none" />
                              <input type="number" placeholder="Total" value={a.total_periods || ""} onChange={e => { const n = [...fAtt]; n[i] = { ...n[i], total_periods: Number(e.target.value) }; setFAtt(n); }} className="w-20 p-2.5 border-2 border-[#90AEAD]/40 rounded-lg text-sm text-center focus:border-[#E64833] outline-none" />
                              <input type="number" placeholder="Attended" value={a.attended || ""} onChange={e => { const n = [...fAtt]; n[i] = { ...n[i], attended: Number(e.target.value) }; setFAtt(n); }} className="w-24 p-2.5 border-2 border-[#90AEAD]/40 rounded-lg text-sm text-center focus:border-[#E64833] outline-none" />
                              {fAtt.length > 1 && <button onClick={() => setFAtt(fAtt.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>}
                            </div>
                          ))}
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={saveAcademic} disabled={saving}
                        className="w-full py-3.5 bg-gradient-to-r from-[#E64833] to-[#874F41] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#E64833]/20">
                        <Send size={16} />{saving ? "Saving…" : "Save Academic Record"}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ══════════ TAB: TASKS ══════════ */}
                {tab === "tasks" && (
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><ClipboardList size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">Task Assignment</h2></div></div>
                    <div className="p-6 space-y-5">
                      <div className="flex items-center gap-3 p-4 bg-[#FBE9D0]/40 rounded-xl">
                        <button onClick={() => setAssignAll(!assignAll)} className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${assignAll ? "bg-[#E64833]" : "bg-[#90AEAD]/40"}`}>
                          <motion.div layout animate={{ x: assignAll ? 24 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                        </button>
                        <span className="text-sm font-bold text-[#244855]">Assign to ALL students ({students.length})</span>
                      </div>
                      {!assignAll && (
                        <div>
                          <label className="text-sm font-bold text-[#244855] block mb-1">Student</label>
                          <select value={taskStudent} onChange={e => setTaskStudent(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm bg-white focus:border-[#E64833] outline-none">
                            <option value="">— Choose —</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-bold text-[#244855] block mb-1">Task Title</label>
                        <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" placeholder="e.g. Complete Chapter 5 exercises" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#244855] block mb-1">Description / Roadmap</label>
                        <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={3} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm resize-none focus:border-[#E64833] outline-none" placeholder="Step-by-step instructions…" />
                      </div>
                      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={saveTask} disabled={savingTask}
                        className="w-full py-3.5 bg-gradient-to-r from-[#874F41] to-[#244855] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                        <Send size={16} />{savingTask ? "Assigning…" : assignAll ? `Assign to All ${students.length}` : "Assign Task"}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ══════════ TAB: SESSIONS ══════════ */}
                {tab === "sessions" && (<>
                  {/* Schedule Meeting Form */}
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><CalendarPlus size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">Schedule a Meeting</h2></div></div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="text-sm font-bold text-[#244855] block mb-1">Student</label>
                        <select value={schedStudent} onChange={e => setSchedStudent(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm bg-white focus:border-[#E64833] outline-none">
                          <option value="">— Choose —</option>
                          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-bold text-[#244855] block mb-1">Date</label>
                          <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-[#244855] block mb-1">Time</label>
                          <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm focus:border-[#E64833] outline-none" />
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={scheduleMeeting} disabled={savingSched}
                        className="w-full py-3.5 bg-gradient-to-r from-[#E64833] to-[#874F41] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#E64833]/20">
                        <CalendarPlus size={16} />{savingSched ? "Scheduling…" : "Schedule & Confirm Meeting"}
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Existing Session Requests */}
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#90AEAD] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><Calendar size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">Session Requests</h2><span className="ml-auto text-xs font-bold text-white/80 bg-white/15 px-2.5 py-1 rounded-full">{sessions.filter(s => s.status === "requested").length} pending</span></div></div>
                    <div className="p-5 space-y-3">
                      {sessions.length === 0 && (
                        <div className="py-12 text-center">
                          <Calendar size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                          <p className="text-[#90AEAD] font-medium">No session requests yet.</p>
                          <p className="text-xs text-[#90AEAD]/60 mt-1">Students will appear here when they book appointments.</p>
                        </div>
                      )}
                      {sessions.map(s => {
                        const dateStr = s.session_date ? new Date(s.session_date).toLocaleString() : "—";
                        return (
                          <motion.div key={s.id} layout className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center gap-3 transition ${s.status === "requested" ? "bg-amber-50/50 border-amber-200/60" : s.status === "confirmed" ? "bg-emerald-50/50 border-emerald-200/60" : s.status === "not_available" ? "bg-red-50/50 border-red-200/60" : "bg-blue-50/50 border-blue-200/60"}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-[#244855]">{studentName(s.student_id)}</p>
                              <p className="text-[11px] text-[#874F41] mt-0.5 flex items-center gap-1"><Clock size={11} />{dateStr}</p>
                              {s.rescheduled_by && <p className="text-[10px] text-blue-600 font-bold mt-0.5">Rescheduled by: {s.rescheduled_by}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${s.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : s.status === "not_available" ? "bg-red-100 text-red-700" : s.status === "rescheduled" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
                              {s.status === "requested" && <>
                                <button onClick={() => updateSession(s.id, "confirmed")} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"><UserCheck size={12} />Confirm</button>
                                <button onClick={() => updateSession(s.id, "not_available")} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"><X size={12} />Unavailable</button>
                                <button onClick={() => { const d = prompt("New date+time (YYYY-MM-DD HH:MM):"); if (d) updateSession(s.id, "rescheduled", d); }} className="px-3 py-1.5 bg-[#244855] hover:bg-[#1a3640] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"><CalendarX size={12} />Reschedule</button>
                              </>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </>)}

                {/* ══════════ TAB: NOTES ══════════ */}
                {tab === "notes" && (<>
                  {/* Write note */}
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><StickyNote size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">Write Note</h2></div></div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="text-sm font-bold text-[#244855] block mb-1">Student</label>
                        <select value={noteStudent} onChange={e => setNoteStudent(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm bg-white focus:border-[#E64833] outline-none">
                          <option value="">— Choose —</option>
                          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#244855] block mb-1">Note Content</label>
                        <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={4} placeholder="Write mentor notes…" className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm resize-none focus:border-[#E64833] outline-none" />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <button onClick={() => setNoteConfidential(!noteConfidential)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${noteConfidential ? "bg-red-500 border-red-500" : "border-[#90AEAD] group-hover:border-[#874F41]"}`}>
                          {noteConfidential && <Lock size={12} className="text-white" />}
                        </button>
                        <span className="text-sm text-[#874F41]">Confidential <span className="text-[#90AEAD]">— Mentor only, hidden from parent</span></span>
                      </label>
                      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={saveNote} disabled={savingNote}
                        className="w-full py-3.5 bg-gradient-to-r from-[#E64833] to-[#874F41] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#E64833]/20">
                        <Send size={16} />{savingNote ? "Saving…" : "Save Note"}
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Existing notes */}
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><MessageSquare size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">Recent Notes</h2></div></div>
                    <div className="p-5 space-y-3">
                      {notes.length === 0 && (
                        <div className="py-10 text-center">
                          <StickyNote size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                          <p className="text-[#90AEAD] font-medium">No notes yet.</p>
                        </div>
                      )}
                      {notes.map(n => (
                        <div key={n.id} className={`p-4 rounded-xl border transition ${n.is_confidential ? "bg-red-50/30 border-red-200/40" : "bg-emerald-50/30 border-emerald-200/40"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold text-sm text-[#244855]">{studentName(n.student_id)}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${n.is_confidential ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {n.is_confidential ? "🔒 Confidential" : "👁 Visible to Parent"}
                            </span>
                          </div>
                          <p className="text-sm text-[#874F41] leading-relaxed">{n.note_content}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* PDF section */}
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-[#244855] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/10 rounded-lg"><FileText size={18} className="text-[#90AEAD]" /></div><h2 className="text-base font-bold text-[#FBE9D0]">PDF Report</h2></div></div>
                    <div className="p-6 space-y-4">
                      <select value={reportStudent} onChange={e => setReportStudent(e.target.value)} className="w-full p-3 border-2 border-[#90AEAD]/40 rounded-xl text-sm bg-white focus:border-[#E64833] outline-none">
                        <option value="">— All Students —</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => generatePDF(reportStudent || undefined)}
                          className="py-3 bg-[#E64833] hover:bg-[#c93e2b] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#E64833]/20 text-sm">
                          <Download size={16} />{reportStudent ? "Export Student" : "Export All"}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => generatePDF()}
                          className="py-3 bg-[#244855] hover:bg-[#1a3640] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg text-sm">
                          <Download size={16} />Full Report
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </>)}

                {/* ══════════ TAB: STUDENT UPDATES ══════════ */}
                {tab === "updates" && (
                  <motion.div variants={iV} className="bg-white rounded-2xl shadow-sm border border-[#90AEAD]/20 overflow-hidden">
                    <div className="p-1.5"><div className="bg-gradient-to-r from-[#E64833] to-[#874F41] rounded-xl p-4 flex items-center gap-2.5"><div className="p-2 bg-white/15 rounded-lg"><Heart size={18} className="text-white" /></div><h2 className="text-base font-bold text-white">Student Wellness Updates</h2><span className="ml-auto text-xs font-bold text-white/80 bg-white/15 px-2.5 py-1 rounded-full">{studentUpdates.filter(u => !u.mentor_reply).length} unreplied</span></div></div>
                    <div className="p-5 space-y-3">
                      {studentUpdates.length === 0 ? (
                        <div className="py-12 text-center">
                          <Heart size={36} className="mx-auto text-[#90AEAD]/30 mb-3" />
                          <p className="text-[#90AEAD] font-medium">No wellness updates yet.</p>
                          <p className="text-xs text-[#90AEAD]/60 mt-1">Students will appear here when they share updates.</p>
                        </div>
                      ) : (
                        studentUpdates.map(u => (
                          <div key={u.id} className="rounded-xl border border-[#90AEAD]/15 overflow-hidden">
                            <div className="p-4 bg-[#FBE9D0]/20">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="font-bold text-sm text-[#244855]">{studentName(u.student_id)}</p>
                                <p className="text-[10px] text-[#90AEAD]">{new Date(u.created_at).toLocaleString()}</p>
                              </div>
                              <p className="text-sm text-[#874F41] leading-relaxed">{u.content}</p>
                            </div>
                            {u.mentor_reply ? (
                              <div className="p-4 bg-emerald-50/50 border-t border-emerald-200/40">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Reply size={12} className="text-emerald-600" />
                                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Your Reply</span>
                                </div>
                                <p className="text-sm text-emerald-800 leading-relaxed">{u.mentor_reply}</p>
                              </div>
                            ) : (
                              <div className="p-4 border-t border-[#90AEAD]/10 bg-white">
                                <div className="flex gap-2">
                                  <input
                                    value={replyTexts[u.id] || ""}
                                    onChange={e => setReplyTexts(prev => ({ ...prev, [u.id]: e.target.value }))}
                                    placeholder="Write your reply…"
                                    className="flex-1 p-2.5 border-2 border-[#90AEAD]/40 rounded-lg text-sm focus:border-[#E64833] outline-none"
                                  />
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => replyToUpdate(u.id)}
                                    className="px-4 py-2.5 bg-[#E64833] hover:bg-[#c93e2b] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md">
                                    <Reply size={14} />Reply
                                  </motion.button>
                                </div>
                              </div>
                            )}
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