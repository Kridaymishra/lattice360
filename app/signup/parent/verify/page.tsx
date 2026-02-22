"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ParentVerify() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isVerified, setIsVerified] = useState(false);

    const handleOtpChange = (element: any, index: number) => {
        if (isNaN(element.value)) return false;
        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
        if (element.nextSibling) element.nextSibling.focus();
    };

    const handleVerify = () => {
        // In a real app, this is where you'd check the database
        setIsVerified(true);
    };

    return (
        <div className="min-h-screen bg-[#FBE9D0] flex items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border-t-8 border-[#E64833]"
            >
                {!isVerified ? (
                    <div className="text-center">
                        <div className="bg-[#90AEAD]/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck className="text-[#244855]" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-[#244855] mb-2">Verify Student Link</h1>
                        <p className="text-[#874F41] text-sm mb-8">
                            We've sent a 6-digit OTP to your child's student email to authorize this connection.
                        </p>

                        <div className="flex justify-between gap-2 mb-8">
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength={1}
                                    className="w-12 h-14 border-2 border-[#90AEAD]/30 rounded-xl text-center text-xl font-bold text-[#244855] focus:border-[#E64833] focus:outline-none bg-[#FBE9D0]/10"
                                    value={data}
                                    onChange={e => handleOtpChange(e.target, index)}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleVerify}
                            className="w-full py-4 bg-[#244855] text-[#FBE9D0] rounded-xl font-bold hover:bg-[#E64833] transition-all flex items-center justify-center gap-2 group"
                        >
                            Verify & Link Account <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
                        <CheckCircle2 className="text-green-500 w-20 h-20 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-[#244855]">Link Successful!</h2>
                        <p className="text-[#874F41] mt-2 mb-8">Your parent account is now officially linked to your ward's student ID.</p>
                        <Link href="/parent">
                            <button className="w-full py-4 bg-[#E64833] text-white rounded-xl font-bold hover:bg-[#244855] transition-all">
                                Enter Parent Portal
                            </button>
                        </Link>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}