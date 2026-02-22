import React from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  FileText,
  CalendarCheck,
  BellRing,
  TrendingUp,
  Lock,
  ArrowRight
} from 'lucide-react';

// Exact Color Palette Provided
const colors = {
  darkTeal: "#244855",
  orange: "#E64833",
  brown: "#874F41",
  lightTeal: "#90AEAD",
  cream: "#FBE9D0",
};

const Lattice360Landing = () => {
  return (
    <div className="min-h-screen font-sans bg-gray-50">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-4 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center">
          <span className="text-2xl font-bold tracking-tight" style={{ color: colors.darkTeal }}>
            Lattice360
          </span>
        </div>
        <div className="space-x-4 hidden md:flex items-center">
          <Link href="/login">
            <button className="font-medium transition-colors hover:opacity-80" style={{ color: colors.darkTeal }}>
              Log In
            </button>
          </Link>
          <Link href="/login">
            <button
              className="px-5 py-2 rounded-lg font-medium text-white transition-transform hover:scale-105 shadow-md"
              style={{ backgroundColor: colors.orange }}
            >
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 md:px-12 text-center overflow-hidden" style={{ backgroundColor: colors.lightTeal }}>
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ backgroundColor: colors.cream }}></div>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" style={{ backgroundColor: colors.darkTeal }}></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <span className="inline-block py-1 px-3 rounded-full text-sm font-semibold mb-6 shadow-sm" style={{ backgroundColor: colors.cream, color: colors.brown }}>
            Learning & Skill Development
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight" style={{ color: colors.darkTeal }}>
            The 360° Mentorship <br /> & Parent Connect
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium" style={{ color: colors.darkTeal }}>
            Bridging the communication gap between Mentors, Students, and Parents with secure, real-time academic tracking and proactive interventions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center">
            <Link href="/login">
              <button
                className="px-8 py-4 rounded-xl font-bold text-white transition-transform hover:-translate-y-1 shadow-lg flex items-center"
                style={{ backgroundColor: colors.orange }}
              >
                Sign In <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Interfaces (The 3 Pillars) */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.darkTeal }}>Unified Core Interfaces</h2>
            <p className="max-w-2xl mx-auto text-lg" style={{ color: colors.brown }}>
              A multi-tenant system designed specifically for the unique needs of every stakeholder.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Mentor Hub */}
            <div className="p-8 rounded-2xl border transition-shadow hover:shadow-xl bg-gray-50" style={{ borderColor: colors.lightTeal }}>
              <div className="w-14 h-14 rounded-xl mb-6 flex items-center justify-center shadow-sm" style={{ backgroundColor: colors.cream }}>
                <Users className="w-7 h-7" style={{ color: colors.darkTeal }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkTeal }}>The Mentor Dashboard</h3>
              <p className="font-semibold text-sm mb-4 uppercase tracking-wider" style={{ color: colors.orange }}>The Management Hub</p>
              <ul className="space-y-3" style={{ color: colors.brown }}>
                <li className="flex items-start"><TrendingUp className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Traffic Light Status Indicators (Stable, At-Risk, Critical)</li>
                <li className="flex items-start"><FileText className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Session Logs with Confidential vs. Parent Notes</li>
                <li className="flex items-start"><BellRing className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Automated Escalation for Immediate Intervention</li>
              </ul>
            </div>

            {/* Parent Portal */}
            <div className="p-8 rounded-2xl border transition-shadow hover:shadow-xl bg-gray-50" style={{ borderColor: colors.lightTeal }}>
              <div className="w-14 h-14 rounded-xl mb-6 flex items-center justify-center shadow-sm" style={{ backgroundColor: colors.cream }}>
                <ShieldCheck className="w-7 h-7" style={{ color: colors.darkTeal }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkTeal }}>The Parent Portal</h3>
              <p className="font-semibold text-sm mb-4 uppercase tracking-wider" style={{ color: colors.orange }}>The Transparency Layer</p>
              <ul className="space-y-3" style={{ color: colors.brown }}>
                <li className="flex items-start"><TrendingUp className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> High-level Progress Snapshot (GPA & Attendance)</li>
                <li className="flex items-start"><Lock className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Secure visibility into relevant Mentor Feedback</li>
                <li className="flex items-start"><ShieldCheck className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Respects Student Privacy and Consent bounds</li>
              </ul>
            </div>

            {/* Student App */}
            <div className="p-8 rounded-2xl border transition-shadow hover:shadow-xl bg-gray-50" style={{ borderColor: colors.lightTeal }}>
              <div className="w-14 h-14 rounded-xl mb-6 flex items-center justify-center shadow-sm" style={{ backgroundColor: colors.cream }}>
                <CalendarCheck className="w-7 h-7" style={{ color: colors.darkTeal }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkTeal }}>The Student Interface</h3>
              <p className="font-semibold text-sm mb-4 uppercase tracking-wider" style={{ color: colors.orange }}>The Accountability App</p>
              <ul className="space-y-3" style={{ color: colors.brown }}>
                <li className="flex items-start"><TrendingUp className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Interactive Goal Tracker & Roadmap Tasks</li>
                <li className="flex items-start"><CalendarCheck className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Seamless Appointment Booking & Rescheduling</li>
                <li className="flex items-start"><Lock className="w-5 h-5 mr-2 shrink-0 mt-0.5" /> Consent Toggles for personal wellness data</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Engineering Features */}
      <section className="py-20 px-6 md:px-12" style={{ backgroundColor: colors.darkTeal }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Advanced Software Engineering
              </h2>
              <p className="text-lg mb-8" style={{ color: colors.lightTeal }}>
                Built with strict boundaries and automated intelligence to ensure data is always secure, relevant, and actionable.
              </p>

              <div className="space-y-6">
                <div className="flex bg-white/10 p-5 rounded-xl backdrop-blur-sm">
                  <Lock className="w-8 h-8 text-white mr-4 shrink-0" />
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Role-Based Access Control (RBAC)</h4>
                    <p style={{ color: colors.cream }}>Strict data isolation. Parents can never access data belonging to students other than their own child.</p>
                  </div>
                </div>

                <div className="flex bg-white/10 p-5 rounded-xl backdrop-blur-sm">
                  <BellRing className="w-8 h-8 text-white mr-4 shrink-0" />
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Automated Notifications</h4>
                    <p style={{ color: colors.cream }}>Instant Push or Web alerts for new messages or critical status changes to "At-Risk".</p>
                  </div>
                </div>

                <div className="flex bg-white/10 p-5 rounded-xl backdrop-blur-sm">
                  <FileText className="w-8 h-8 text-white mr-4 shrink-0" />
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">PDF Report Generator</h4>
                    <p style={{ color: colors.cream }}>One-click "Monthly Progress Reports" to summarize performance and chat highlights.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Abstract Dashboard Visual Representation */}
            <div className="md:w-1/2 w-full">
              <div className="bg-white p-6 rounded-2xl shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                  <div className="font-bold text-xl" style={{ color: colors.darkTeal }}>Cohort Overview</div>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: colors.cream }}>
                    <div className="text-sm font-semibold mb-1" style={{ color: colors.brown }}>Avg Cohort GPA</div>
                    <div className="text-3xl font-bold" style={{ color: colors.darkTeal }}>8.4<span className="text-sm text-gray-500 font-normal">/10.0</span></div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: colors.lightTeal }}>
                    <div className="text-sm font-semibold text-white mb-1">Upcoming Sessions</div>
                    <div className="text-3xl font-bold text-white">05<span className="text-sm font-normal opacity-80"> this week</span></div>
                  </div>
                </div>
                <div className="p-4 border rounded-xl" style={{ borderColor: colors.lightTeal }}>
                  <div className="text-sm font-bold mb-3" style={{ color: colors.darkTeal }}>Escalation Triggers</div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-red-500 font-bold uppercase">Needs Intervention</div>
                      <div className="text-sm font-semibold text-gray-800">Attendance Drop (65%)</div>
                    </div>
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Jane Roe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center bg-gray-900 text-gray-400">
        <p>© 2026 Lattice360. Bridging the gap in educational mentorship.</p>
      </footer>
    </div>
  );
};

export default Lattice360Landing;