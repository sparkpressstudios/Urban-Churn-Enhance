import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CustomerLogin() {
    const [, navigate] = useLocation();
    const { login } = useCustomerAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/account");
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div
                className="min-h-screen relative flex items-center justify-center px-4 pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
            >
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                        <p className="text-white/50 mt-2">Sign in to your Urban Churn account</p>
                    </div>
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
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50 focus:border-[#A1AB74]/50"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50 focus:border-[#A1AB74]/50"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? "Signing in…" : "Sign In"}
                        </button>
                        <div className="flex justify-between text-sm">
                            <Link href="/account/forgot-password" className="text-[#A1AB74] hover:underline">
                                Forgot password?
                            </Link>
                            <Link href="/account/register" className="text-[#A1AB74] hover:underline">
                                Create account
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </>
    );
}
