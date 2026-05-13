import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CustomerRegister() {
    const [, navigate] = useLocation();
    const { register } = useCustomerAuth();
    const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", firstName: "", lastName: "", phone: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            await register({
                email: form.email,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
                phone: form.phone,
            });
            navigate("/account");
        } catch (err: any) {
            setError(err.message || "Registration failed");
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
                        <h1 className="text-3xl font-bold text-white">Create Account</h1>
                        <p className="text-white/50 mt-2">Join Urban Churn to track your orders</p>
                    </div>
                    <form onSubmit={handleSubmit} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3">
                                {error}
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">First Name</label>
                                <input
                                    type="text"
                                    value={form.firstName}
                                    onChange={(e) => update("firstName", e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                    placeholder="Jane"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Last Name</label>
                                <input
                                    type="text"
                                    value={form.lastName}
                                    onChange={(e) => update("lastName", e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Email *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Phone</label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => update("phone", e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                placeholder="(717) 555-0123"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Password *</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => update("password", e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                placeholder="At least 8 characters"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm Password *</label>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => update("confirmPassword", e.target.value)}
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
                            {loading ? "Creating account…" : "Create Account"}
                        </button>
                        <p className="text-center text-sm text-white/40">
                            Already have an account?{" "}
                            <Link href="/account/login" className="text-[#A1AB74] hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
            <Footer />
        </>
    );
}
