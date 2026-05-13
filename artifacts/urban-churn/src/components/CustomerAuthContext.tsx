import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";

interface CustomerUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    wholesaleCustomerId?: number | null;
    wooCustomerId?: number | null;
}

interface CustomerAuthContextType {
    customer: CustomerUser | null;
    isLoading: boolean;
    isWholesale: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithToken: (token: string, customer: CustomerUser) => void;
    register: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => Promise<void>;
    registerWholesale: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; inviteToken?: string }) => Promise<void>;
    logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState<CustomerUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("customer_token");
        if (token) {
            api.customerMe()
                .then((data) => setCustomer(data.customer))
                .catch(() => {
                    localStorage.removeItem("customer_token");
                    setCustomer(null);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }

        // Cross-tab sync: detect login/logout from another tab via storage event
        const onStorage = (e: StorageEvent) => {
            if (e.key !== "customer_token") return;
            if (e.newValue) {
                // Another tab logged in — validate and pick up customer
                api.customerMe()
                    .then((data) => setCustomer(data.customer))
                    .catch(() => {
                        localStorage.removeItem("customer_token");
                        setCustomer(null);
                    });
            } else {
                // Another tab logged out
                setCustomer(null);
            }
        };
        window.addEventListener("storage", onStorage);

        // Belt-and-suspenders: re-check on tab focus in case storage event was missed
        const onVisibility = () => {
            if (document.visibilityState !== "visible") return;
            const t = localStorage.getItem("customer_token");
            if (t && !customer) {
                api.customerMe()
                    .then((data) => setCustomer(data.customer))
                    .catch(() => {
                        localStorage.removeItem("customer_token");
                        setCustomer(null);
                    });
            } else if (!t && customer) {
                setCustomer(null);
            }
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            window.removeEventListener("storage", onStorage);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const data = await api.customerLogin(email, password);
        localStorage.setItem("customer_token", data.token);
        setCustomer(data.customer);
    }, []);

    const loginWithToken = useCallback((token: string, customerData: CustomerUser) => {
        localStorage.setItem("customer_token", token);
        setCustomer(customerData);
    }, []);

    const register = useCallback(async (regData: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => {
        const data = await api.customerRegister(regData);
        localStorage.setItem("customer_token", data.token);
        setCustomer(data.customer);
    }, []);

    const registerWholesale = useCallback(async (regData: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; inviteToken?: string }) => {
        const data = await api.customerRegisterWholesale(regData);
        localStorage.setItem("customer_token", data.token);
        setCustomer(data.customer);
    }, []);

    const logout = useCallback(async () => {
        await api.customerLogout().catch(() => { });
        localStorage.removeItem("customer_token");
        setCustomer(null);
    }, []);

    const isWholesale = !!customer?.wholesaleCustomerId;

    return (
        <CustomerAuthContext.Provider value={{ customer, isLoading, isWholesale, login, loginWithToken, register, registerWholesale, logout }}>
            {children}
        </CustomerAuthContext.Provider>
    );
}

export function useCustomerAuth() {
    const ctx = useContext(CustomerAuthContext);
    if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
    return ctx;
}
