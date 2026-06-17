import { useState } from "react";
import { Link, useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/components/admin/AuthContext";
import { useStoreContext } from "@/components/store/StoreContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ChangePasswordForm() {
    const { user } = useAuth();
    const [, navigate] = useLocation();
    const role = user?.role || "admin";
    const isStoreUser = role === "staff" || role === "manager";

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            await api.changePassword(currentPassword, newPassword);
            setSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setError(err.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-sm text-white">
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <p className="text-sm text-gray-400">Update your account password</p>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-green-500/10 text-green-400 text-sm">
                                Password updated successfully.
                            </div>
                            <Button
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => navigate(isStoreUser ? "/store" : "/admin")}
                            >
                                Back to Dashboard
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300">Current Password</label>
                                <Input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300">New Password</label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300">Confirm New Password</label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    className="bg-[#A1AB74] hover:bg-[#8a9463] text-white"
                                    disabled={loading}
                                >
                                    {loading ? "Updating…" : "Update Password"}
                                </Button>
                                <Link href={isStoreUser ? "/store" : "/admin"}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-white/20 text-white hover:bg-white/10"
                                    >
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StoreChangePassword() {
    const { selectedLocationId, setSelectedLocationId, showLocationSwitcher } = useStoreContext();
    return (
        <StoreLayout
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            showLocationSwitcher={showLocationSwitcher}
        >
            <ChangePasswordForm />
        </StoreLayout>
    );
}

export default function AdminChangePassword() {
    const { user } = useAuth();
    const role = user?.role || "admin";
    const isStoreUser = role === "staff" || role === "manager";

    if (isStoreUser) {
        return <StoreChangePassword />;
    }

    return (
        <AdminLayout>
            <ChangePasswordForm />
        </AdminLayout>
    );
}
