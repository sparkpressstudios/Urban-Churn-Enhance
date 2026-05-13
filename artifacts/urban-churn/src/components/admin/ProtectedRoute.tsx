import { useAuth } from "./AuthContext";
import { Redirect } from "wouter";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/admin/login" />;
    }

    return <>{children}</>;
}
