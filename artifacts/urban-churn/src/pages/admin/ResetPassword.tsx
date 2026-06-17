import { useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/components/admin/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IceCream } from "lucide-react";

export default function AdminResetPassword() {
    const search = useSearch();
    const [, navigate] = useLocation();
    const { loginWithToken } = useAuth();
    const params = new URLSearchParams(search);
    const token = params.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

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
            const result = await api.resetPassword(token, password);
            if (result.token && result.user) {
                loginWithToken(result.token, result.user);
            }
            setSuccess(true);
            const role = result.user?.role || "admin";
            setTimeout(() => {
                if (role === "staff" || role === "manager") {
                    navigate("/store");
                } else {
                    navigate("/admin");
                }
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Reset failed");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative px-4"
                style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
            >
                <div className="absolute inset-0 bg-black/65" />
                <Card className="relative w-full max-w-sm border-white/10 bg-black/40 backdrop-blur-sm">
                    <CardContent className="pt-6 text-center space-y-4">
                        <p className="text-white">Invalid reset link</p>
                        <Link href="/admin/forgot-password" className="text-[#A1AB74] hover:underline text-sm">
                            Request a new link
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                    <CardTitle className="text-xl text-white">Set New Password</CardTitle>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="text-center space-y-3">
                            <p className="text-white text-sm">Password updated! Redirecting…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300">New Password</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300">Confirm Password</label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-[#A1AB74] hover:bg-[#8a9463] text-white"
                                disabled={loading}
                            >
                                {loading ? "Resetting…" : "Reset Password"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
