import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";

interface AuthUser {
    userId: number;
    username: string;
    role?: string;
    assignedLocationId?: number | null;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    loginWithToken: (token: string, user: AuthUser) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            api.me()
                .then((data) => setUser(data.user))
                .catch(() => {
                    localStorage.removeItem("admin_token");
                    setToken(null);
                    setUser(null);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [token]);

    const login = useCallback(async (username: string, password: string) => {
        const data = await api.login(username, password);
        localStorage.setItem("admin_token", data.token);
        setToken(data.token);
        setUser(data.user);
    }, []);

    const loginWithToken = useCallback((newToken: string, newUser: AuthUser) => {
        localStorage.setItem("admin_token", newToken);
        setToken(newToken);
        setUser(newUser);
    }, []);

    const logout = useCallback(async () => {
        await api.logout().catch(() => { });
        localStorage.removeItem("admin_token");
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, loginWithToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
