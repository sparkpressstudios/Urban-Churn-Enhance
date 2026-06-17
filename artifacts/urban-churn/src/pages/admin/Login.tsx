import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/admin/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IceCream } from "lucide-react";

export default function AdminLogin() {
    const { login } = useAuth();
    const [, navigate] = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(username, password);
            // Check JWT payload for role-based redirect
            const token = localStorage.getItem("admin_token");
            let role = "admin";
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split(".")[1]));
                    role = payload.role || "admin";
                } catch { }
            }
            // Staff and managers go to store portal, admins go to admin dashboard
            if (role === "staff" || role === "manager") {
                navigate("/store");
            } else {
                navigate("/admin");
            }
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
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
                    <CardTitle className="text-xl text-white">Urban Churn Admin</CardTitle>
                    <p className="text-sm text-gray-400">Sign in to manage your shop</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-300">Username</label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                className="bg-gray-800 border-gray-700 text-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-300">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                        <p className="text-center text-sm text-gray-400">
                            <Link href="/admin/forgot-password" className="text-[#A1AB74] hover:underline">
                                Forgot password?
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
