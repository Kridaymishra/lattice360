"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const ParentSignup: React.FC = () => {
    const [fullName, setFullName] = useState("");
    const [childEmail, setChildEmail] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { alert("Passwords do not match!"); return; }
        setLoading(true);

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { alert(error.message); setLoading(false); return; }

        if (data.user) {
            await supabase.from("profiles").upsert({
                id: data.user.id,
                email,
                role: "parent",
                institution_id: "NMIMS",
                full_name: fullName,
                child_email: childEmail,
            });
        }

        alert("Account created! Redirecting to verify your link with your child's account.");
        window.location.href = "/signup/parent/verify";
    };

    return (
        <div style={styles.page}>
            <div style={styles.backgroundContainer}>
                <div style={styles.leftImages}>
                    <div style={{ ...styles.floatingScreen, top: "12%", left: "-20%", transform: "rotate(-15deg)" }} />
                    <div style={{ ...styles.floatingScreen, top: "40%", left: "-10%", transform: "rotate(-10deg)" }} />
                    <div style={{ ...styles.floatingScreen, top: "68%", left: "-15%", transform: "rotate(-8deg)" }} />
                </div>
                <div style={styles.rightImages}>
                    <div style={{ ...styles.floatingScreen, top: "15%", right: "-15%", transform: "rotate(12deg)" }} />
                    <div style={{ ...styles.floatingScreen, top: "45%", right: "-5%", transform: "rotate(8deg)" }} />
                    <div style={{ ...styles.floatingScreen, top: "72%", right: "-10%", transform: "rotate(10deg)" }} />
                </div>
            </div>

            <div style={styles.card}>
                <h2 style={styles.title}>Signup for Parent</h2>

                <form onSubmit={handleSignup}>
                    <label style={styles.label}>Full Name</label>
                    <input type="text" placeholder="Enter full name" style={styles.input} value={fullName} onChange={e => setFullName(e.target.value)} required />

                    <label style={styles.label}>Your Email</label>
                    <input type="email" placeholder="Enter your email" style={styles.input} value={email} onChange={e => setEmail(e.target.value)} required />

                    <label style={styles.label}>Child&apos;s Email</label>
                    <input type="email" placeholder="Enter child's student email" style={styles.input} value={childEmail} onChange={e => setChildEmail(e.target.value)} required />

                    <label style={styles.label}>Password</label>
                    <input type="password" placeholder="Create password" style={styles.input} value={password} onChange={e => setPassword(e.target.value)} required />

                    <label style={styles.label}>Confirm Password</label>
                    <input type="password" placeholder="Confirm password" style={styles.input} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />

                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? "Creating Account..." : "Create Account & Verify"}
                    </button>
                </form>

                <p style={styles.footer}>
                    Already have an account?{" "}
                    <Link href="/login" style={{ color: "#874F41", fontWeight: 700 }}>Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default ParentSignup;

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center",
        fontFamily: "Arial, sans-serif", position: "relative", overflow: "hidden",
        background: `radial-gradient(circle at 20% 30%, #7091E633 0%, transparent 40%),
                     radial-gradient(circle at 80% 70%, #7091E633 0%, transparent 40%),
                     linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)`,
    },
    backgroundContainer: { position: "absolute", width: "100%", height: "100%", pointerEvents: "none" },
    leftImages: { position: "absolute", left: 0, width: "40%", height: "100%" },
    rightImages: { position: "absolute", right: 0, width: "40%", height: "100%" },
    floatingScreen: {
        position: "absolute", width: "200px", height: "300px", borderRadius: "12px",
        background: "#0f172a", boxShadow: "0 15px 35px rgba(0,0,0,0.5)", opacity: 0.8,
    },
    card: {
        background: "#ffffff", padding: "32px", borderRadius: "18px", width: "420px",
        border: "2px solid #874F41", boxShadow: "0 25px 50px rgba(0,0,0,0.4)", zIndex: 10,
        maxHeight: "90vh", overflowY: "auto" as const,
    },
    title: { marginBottom: "20px", color: "#874F41", textAlign: "center" as const, fontWeight: 800, fontSize: "22px" },
    label: { fontWeight: 600, marginTop: "10px", display: "block", color: "#244855", fontSize: "14px" },
    input: {
        width: "100%", padding: "12px", marginTop: "6px", marginBottom: "14px", borderRadius: "8px",
        border: "2px solid #90AEAD", fontSize: "14px", color: "#244855", backgroundColor: "#ffffff",
    },
    button: {
        width: "100%", padding: "14px", borderRadius: "10px", border: "none",
        backgroundColor: "#874F41", color: "#fff", fontWeight: 700, fontSize: "16px",
        marginTop: "10px", cursor: "pointer",
    },
    footer: { textAlign: "center" as const, marginTop: "16px", fontSize: "14px", color: "#244855" },
};