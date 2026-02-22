"use client";
import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; // Import the bridge you created

const RoleLogin: React.FC = () => {
    const [role, setRole] = useState<"student" | "parent" | "mentor">("student");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const roleColors = {
        student: "#E64833",
        parent: "#7091E6",
        mentor: "#124E66",
    };

    const color = roleColors[role];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Authenticate
            console.log('Attempting login...', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            console.log('Auth response:', { data, error });

            if (error) {
                alert('Auth Error: ' + error.message);
                setLoading(false);
                return;
            }

            if (!data?.user) {
                alert('Auth Error: No user returned from Supabase.');
                setLoading(false);
                return;
            }

            // 2. Fetch role from profiles table
            console.log('Auth successful, user ID:', data.user.id);
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            console.log('Profile data:', profile, 'Profile error:', profileError);

            if (profileError || !profile) {
                alert('Error: User exists in Auth but no Role found in Profiles table. Please check Supabase Table Editor.');
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            if (profile.role !== role) {
                alert(`Access Denied: This account is registered as "${profile.role}", not "${role}". Switching to correct dashboard.`);
                window.location.href = `/${profile.role}`;
                setLoading(false);
                return;
            }

            // 3. Redirect to correct dashboard
            console.log('Login success! Redirecting to:', `/${role}`);
            window.location.href = `/${role}`;
        } catch (err: unknown) {
            console.error('Unexpected login error:', err);
            alert('Unexpected error: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={{ ...styles.title, color: "#244855" }}>GuardianLink Login</h1>

                {/* Role Selector */}
                <div style={styles.roleSelector}>
                    {(["student", "parent", "mentor"] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            style={{
                                ...styles.roleButton,
                                backgroundColor: role === r ? roleColors[r] : "#f1f5f9",
                                color: role === r ? "#fff" : "#475569",
                            }}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleLogin}>
                    <label style={styles.label}>Email Address</label>
                    <input
                        type="email"
                        placeholder="Enter email"
                        style={styles.input}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label style={styles.label}>Password</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        style={styles.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ ...styles.submitButton, backgroundColor: color }}
                    >
                        {loading ? "Verifying..." : `Login as ${role}`}
                    </button>
                </form>

                <div style={styles.footer}>
                    <p>Don't have an account?</p>
                    <Link href={`/signup/${role}`} style={{ color: color, fontWeight: 700 }}>
                        Sign up as {role}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RoleLogin;

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
        background: `
      radial-gradient(circle at 20% 30%, #7091E633 0%, transparent 40%),
      radial-gradient(circle at 80% 70%, #E6483333 0%, transparent 40%),
      linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)
    `,
    },

    card: {
        background: "#ffffff",
        padding: "32px",
        borderRadius: "18px",
        width: "420px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        zIndex: 10,
    },

    title: {
        marginBottom: "20px",
        textAlign: "center" as const,
        fontSize: "24px",
        fontWeight: 800,
    },

    roleSelector: {
        display: "flex",
        gap: "8px",
        marginBottom: "20px",
    },

    roleButton: {
        flex: 1,
        padding: "10px",
        borderRadius: "8px",
        fontWeight: 700,
        fontSize: "13px",
        cursor: "pointer",
        border: "none",
        transition: "all 0.2s",
    },

    label: {
        fontWeight: 600,
        marginTop: "10px",
        display: "block",
        fontSize: "14px",
        color: "#244855",
    },

    input: {
        width: "100%",
        padding: "12px",
        marginTop: "6px",
        marginBottom: "14px",
        borderRadius: "8px",
        border: "2px solid #90AEAD",
        fontSize: "14px",
        color: "#244855",
        backgroundColor: "#ffffff",
        opacity: 1,
    },

    submitButton: {
        width: "100%",
        padding: "14px",
        borderRadius: "10px",
        border: "none",
        color: "#fff",
        fontWeight: 700,
        fontSize: "16px",
        marginTop: "10px",
        cursor: "pointer",
    },

    footer: {
        textAlign: "center" as const,
        marginTop: "16px",
        fontSize: "14px",
        color: "#244855",
    },
};