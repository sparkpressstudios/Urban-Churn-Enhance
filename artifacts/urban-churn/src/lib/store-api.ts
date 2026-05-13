const API_BASE = "/api";

async function storeFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("admin_token");
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
    if (res.status === 401) {
        localStorage.removeItem("admin_token");
        if (!window.location.pathname.includes("/admin/login")) {
            window.location.href = import.meta.env.BASE_URL.replace(/\/$/, "") + "/admin/login";
        }
        throw new Error("Unauthorized");
    }
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: undefined }));
        throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

export const storeApi = {
    // Dashboard
    getDashboard: (locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/dashboard${qs}`);
    },

    // Orders
    getOrders: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return storeFetch(`/store/orders${qs}`);
    },

    getOrder: (id: number, locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/orders/${id}${qs}`);
    },

    updateOrderStatus: (id: number, status: string, locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/orders/${id}/status${qs}`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        });
    },

    markItemPickedUp: (orderId: number, itemId: number, quantity?: number, locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/orders/${orderId}/items/${itemId}/pickup${qs}`, {
            method: "PUT",
            body: JSON.stringify({ quantity }),
        });
    },

    undoItemPickup: (orderId: number, itemId: number, locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/orders/${orderId}/items/${itemId}/undo-pickup${qs}`, {
            method: "PUT",
        });
    },

    pickupAll: (orderId: number, locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/orders/${orderId}/pickup-all${qs}`, {
            method: "PUT",
        });
    },

    addNote: (orderId: number, content: string, locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/orders/${orderId}/notes${qs}`, {
            method: "POST",
            body: JSON.stringify({ content }),
        });
    },

    refundOrder: (orderId: number, locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return storeFetch(`/store/orders/${orderId}/refund${qs}`, {
            method: "POST",
        });
    },

    // Locations (for manager location switcher)
    getLocations: () => storeFetch("/store/locations"),
};
