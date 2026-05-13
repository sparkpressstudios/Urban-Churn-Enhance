import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/admin/AuthContext";

interface StoreContextType {
    /** The currently selected location ID. null = all locations (admin/manager). */
    selectedLocationId: number | null;
    setSelectedLocationId: (id: number | null) => void;
    /** Whether the user can switch between locations (admin/manager) */
    showLocationSwitcher: boolean;
    /** The user's role */
    role: string;
    /** The user's fixed location name (for staff) */
    locationName?: string;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    const role = (user as any)?.role || "staff";
    const assignedLocationId = (user as any)?.assignedLocationId;
    const showLocationSwitcher = role === "admin" || role === "manager";

    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(() => {
        if (!showLocationSwitcher && assignedLocationId) {
            return assignedLocationId;
        }
        const saved = localStorage.getItem("store_selected_location");
        return saved ? Number(saved) : null;
    });

    // Persist selection for managers/admins
    useEffect(() => {
        if (showLocationSwitcher) {
            if (selectedLocationId) {
                localStorage.setItem("store_selected_location", String(selectedLocationId));
            } else {
                localStorage.removeItem("store_selected_location");
            }
        }
    }, [selectedLocationId, showLocationSwitcher]);

    // Staff always locked to their assigned location
    useEffect(() => {
        if (!showLocationSwitcher && assignedLocationId) {
            setSelectedLocationId(assignedLocationId);
        }
    }, [showLocationSwitcher, assignedLocationId]);

    return (
        <StoreContext.Provider
            value={{
                selectedLocationId,
                setSelectedLocationId: showLocationSwitcher ? setSelectedLocationId : () => { },
                showLocationSwitcher,
                role,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
}

export function useStoreContext() {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error("useStoreContext must be used within StoreProvider");
    return ctx;
}
