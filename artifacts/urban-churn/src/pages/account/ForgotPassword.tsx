import { useState } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CustomerForgotPassword() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.customerForgotPassword(email);
            setSent(true);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div
                className="min-h-screen flex items-center justify-center px-4 pt-32 pb-16"
                style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
            >
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Reset Password</h1>
                        <p className="text-white/50 mt-2">We'll send you a link to reset your password</p>
                    </div>

                    {sent ? (
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#A1AB74]/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#A1AB74]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-white text-lg font-medium mb-2">Check your email</p>
                            <p className="text-white/50 text-sm mb-6">
                                If an account exists for <strong className="text-white/70">{email}</strong>, you'll receive a password reset link shortly.
                            </p>
                            <Link href="/account/login" className="text-[#A1AB74] hover:underline text-sm">
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {loading ? "Sending…" : "Send Reset Link"}
                            </button>
                            <p className="text-center text-sm text-white/40">
                                Remember your password?{" "}
                                <Link href="/account/login" className="text-[#A1AB74] hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
