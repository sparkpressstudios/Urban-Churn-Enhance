import { useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { api } from "@/lib/api";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CustomerResetPassword() {
    const search = useSearch();
    const [, navigate] = useLocation();
    const { loginWithToken } = useCustomerAuth();
    const params = new URLSearchParams(search);
    const token = params.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [returningToCheckout, setReturningToCheckout] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const result = await api.customerResetPassword(token, password);
            setSuccess(true);

            // Auto-login if the reset returned a token
            if (result.token && result.customer) {
                loginWithToken(result.token, result.customer);
            }

            // Check if user was resetting password from checkout (check both storages for cross-tab compat)
            const returnToCheckout = localStorage.getItem("uc-return-to-checkout") || sessionStorage.getItem("uc-return-to-checkout");
            if (returnToCheckout) {
                localStorage.removeItem("uc-return-to-checkout");
                sessionStorage.removeItem("uc-return-to-checkout");
                setReturningToCheckout(true);
                // Set flag so PreOrder page jumps to checkout step (localStorage for cross-tab)
                localStorage.setItem("uc-goto-checkout", "1");
                sessionStorage.setItem("uc-goto-checkout", "1");
                setTimeout(() => navigate("/pre-order"), 2000);
            }
        } catch (err: any) {
            setError(err.message || "Reset failed");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <>
                <Navbar />
                <div
                    className="min-h-screen flex items-center justify-center px-4 pt-32 pb-16"
                    style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
                >
                    <div className="text-center">
                        <p className="text-white text-lg">Invalid reset link</p>
                        <Link href="/account/forgot-password" className="text-[#A1AB74] hover:underline text-sm mt-4 inline-block">
                            Request a new link
                        </Link>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div
                className="min-h-screen flex items-center justify-center px-4 pt-32 pb-16"
                style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
            >
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Set New Password</h1>
                    </div>

                    {success ? (
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-white text-lg font-medium mb-2">Password updated!</p>
                            {returningToCheckout ? (
                                <>
                                    <p className="text-white/50 text-sm mb-2">Taking you back to your cart...</p>
                                    <div className="flex items-center justify-center gap-2 text-[#A1AB74]">
                                        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        <span className="text-sm">Redirecting...</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-white/50 text-sm mb-6">You can now sign in with your new password.</p>
                                    <button
                                        onClick={() => navigate("/account/login")}
                                        className="bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-3 px-8 rounded-xl transition-colors"
                                    >
                                        Sign In
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {loading ? "Resetting…" : "Reset Password"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
