import { useState } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IceCream } from "lucide-react";

export default function AdminForgotPassword() {
    const [identifier, setIdentifier] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.forgotPassword(identifier);
            setSent(true);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative px-4"
            style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
        >
            <div className="absolute inset-0 bg-black/65" />
            <Card className="relative w-full max-w-sm border-white/10 bg-black/40 backdrop-blur-sm">
                <CardHeader className="text-center space-y-2">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#A1AB74]/20 flex items-center justify-center">
                            <IceCream className="w-6 h-6 text-[#A1AB74]" />
                        </div>
                    </div>
                    <CardTitle className="text-xl text-white">Reset Password</CardTitle>
                    <p className="text-sm text-gray-400">
                        Enter your email or username and we'll send a reset link if an account is on file
                    </p>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <div className="text-center space-y-4">
                            <p className="text-white text-sm">
                                If an account exists for <strong className="text-white/80">{identifier}</strong> with an email on file, you'll receive a password reset link shortly.
                            </p>
                            <p className="text-xs text-gray-400">
                                Staff without an email on file should contact an admin to resend credentials.
                            </p>
                            <Link href="/admin/login" className="text-[#A1AB74] hover:underline text-sm inline-block">
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300">Email or Username</label>
                                <Input
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="you@example.com or username"
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-[#A1AB74] hover:bg-[#8a9463] text-white"
                                disabled={loading}
                            >
                                {loading ? "Sending…" : "Send Reset Link"}
                            </Button>
                            <p className="text-center text-sm text-gray-400">
                                Remember your password?{" "}
                                <Link href="/admin/login" className="text-[#A1AB74] hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
