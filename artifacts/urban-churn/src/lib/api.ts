const API_BASE = "/api";

class ApiError extends Error {
    code?: string;
    detail?: string;
    constructor(message: string, code?: string, detail?: string) {
        super(message);
        this.code = code;
        this.detail = detail;
    }
}

async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("admin_token");
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };
    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
    if (res.status === 401) {
        localStorage.removeItem("admin_token");
        if ((window.location.pathname.includes("/admin") || window.location.pathname.includes("/store")) && !window.location.pathname.includes("/admin/login")) {
            window.location.href = import.meta.env.BASE_URL.replace(/\/$/, "") + "/admin/login";
        }
        throw new Error("Unauthorized");
    }
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: undefined }));
        throw new ApiError(data.error || `Request failed: ${res.status}`, data.code, data.detail);
    }
    return res.json();
}

async function customerFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("customer_token");
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: undefined }));
        throw new ApiError(data.error || `Request failed: ${res.status}`, data.code, data.detail);
    }
    return res.json();
}

export const api = {
    // Auth
    login: (username: string, password: string) =>
        apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        }),
    logout: () => apiFetch("/auth/logout", { method: "POST" }),
    me: () => apiFetch("/auth/me"),

    // Admin Flavours
    getFlavours: () => apiFetch("/admin/flavours"),
    getFlavour: (id: number) => apiFetch(`/admin/flavours/${id}`),
    createFlavour: (data: any) =>
        apiFetch("/admin/flavours", { method: "POST", body: JSON.stringify(data) }),
    updateFlavour: (id: number, data: any) =>
        apiFetch(`/admin/flavours/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteFlavour: (id: number) =>
        apiFetch(`/admin/flavours/${id}`, { method: "DELETE" }),
    duplicateFlavour: (id: number) =>
        apiFetch(`/admin/flavours/${id}/duplicate`, { method: "POST" }),
    bulkUpdateFlavours: (flavourIds: number[], updates: any) =>
        apiFetch("/admin/flavours/bulk/update", {
            method: "PUT",
            body: JSON.stringify({ flavourIds, updates }),
        }),

    // Admin Sizes
    getSizes: () => apiFetch("/admin/sizes"),
    createSize: (data: any) =>
        apiFetch("/admin/sizes", { method: "POST", body: JSON.stringify(data) }),
    updateSize: (id: number, data: any) =>
        apiFetch(`/admin/sizes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteSize: (id: number) =>
        apiFetch(`/admin/sizes/${id}`, { method: "DELETE" }),

    // Admin Products
    getProducts: () => apiFetch("/admin/products"),
    getProductsByFlavour: (flavourId: number) => apiFetch(`/admin/products/by-flavour/${flavourId}`),
    createProduct: (data: any) =>
        apiFetch("/admin/products", { method: "POST", body: JSON.stringify(data) }),
    updateProduct: (id: number, data: any) =>
        apiFetch(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteProduct: (id: number) =>
        apiFetch(`/admin/products/${id}`, { method: "DELETE" }),
    generateProducts: () =>
        apiFetch("/admin/products/generate", { method: "POST" }),
    generateProductsForFlavour: (flavourId: number) =>
        apiFetch(`/admin/products/generate/${flavourId}`, { method: "POST" }),

    // Admin Locations
    getLocations: () => apiFetch("/admin/locations"),
    getLocation: (id: number) => apiFetch(`/admin/locations/${id}`),
    createLocation: (data: any) =>
        apiFetch("/admin/locations", { method: "POST", body: JSON.stringify(data) }),
    updateLocation: (id: number, data: any) =>
        apiFetch(`/admin/locations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteLocation: (id: number) =>
        apiFetch(`/admin/locations/${id}`, { method: "DELETE" }),
    bulkImportLocations: (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        return apiFetch("/admin/locations/bulk", { method: "POST", body: fd });
    },

    // Admin Orders  
    getOrderStats: () => apiFetch("/admin/orders/stats"),
    getOrders: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/orders${qs}`);
    },
    getOrder: (id: number) => apiFetch(`/admin/orders/${id}`),
    updateOrderStatus: (id: number, status: string) =>
        apiFetch(`/admin/orders/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        }),
    getOrderNotes: (id: number) => apiFetch(`/admin/orders/${id}/notes`),
    addOrderNote: (id: number, content: string, type?: string) =>
        apiFetch(`/admin/orders/${id}/notes`, {
            method: "POST",
            body: JSON.stringify({ content, type }),
        }),
    bulkUpdateOrderStatus: (orderIds: number[], status: string) =>
        apiFetch("/admin/orders/bulk/status", {
            method: "PUT",
            body: JSON.stringify({ orderIds, status }),
        }),
    retrySquareSync: (id: number) =>
        apiFetch(`/admin/orders/${id}/retry-square-sync`, { method: "POST" }),
    refundOrder: (id: number) =>
        apiFetch(`/admin/orders/${id}/refund`, { method: "POST" }),
    bulkUpdateProducts: (productIds: number[], updates: any) =>
        apiFetch("/admin/products/bulk/update", {
            method: "PUT",
            body: JSON.stringify({ productIds, updates }),
        }),

    // Public
    getPublicFlavours: () => apiFetch("/flavours"),
    getPublicSizes: () => apiFetch("/sizes"),
    getPublicLocations: () => apiFetch("/locations"),
    getPreOrderLocations: (flavourIds: number[]) => {
        const qs = flavourIds.length > 0 ? `?flavourIds=${flavourIds.join(",")}` : "";
        return apiFetch(`/pre-order-locations${qs}`);
    },
    getPublicProducts: () => apiFetch("/products"),
    createOrder: (data: any) =>
        apiFetch("/orders", { method: "POST", body: JSON.stringify(data) }),

    // Admin Customers
    getCustomers: (search?: string) => {
        const qs = search ? `?search=${encodeURIComponent(search)}` : "";
        return apiFetch(`/admin/customers${qs}`);
    },
    createCustomer: (data: { email: string; firstName?: string; lastName?: string; phone?: string; address?: string; city?: string; state?: string; zip?: string; country?: string }) =>
        apiFetch("/admin/customers", { method: "POST", body: JSON.stringify(data) }),
    getCustomer: (id: number) => apiFetch(`/admin/customers/${id}`),
    updateCustomer: (id: number, data: any) =>
        apiFetch(`/admin/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCustomer: (id: number) =>
        apiFetch(`/admin/customers/${id}`, { method: "DELETE" }),

    // Admin Import (WooCommerce)
    importPreview: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiFetch("/admin/import/preview", { method: "POST", body: formData });
    },
    importExecute: (file: File, type?: string) => {
        const formData = new FormData();
        formData.append("file", file);
        if (type) formData.append("type", type);
        return apiFetch("/admin/import/execute", { method: "POST", body: formData });
    },
    importHistory: () => apiFetch("/admin/import/history"),

    // Admin Users
    getUsers: () => apiFetch("/admin/users"),
    getAdminLoginLogs: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/users/login-logs${qs}`);
    },
    getUser: (id: number) => apiFetch(`/admin/users/${id}`),
    getUsersByLocation: (locationId: number) =>
        apiFetch(`/admin/users/by-location/${locationId}`),
    createUser: (data: any) =>
        apiFetch("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    updateUser: (id: number, data: any) =>
        apiFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteUser: (id: number) =>
        apiFetch(`/admin/users/${id}`, { method: "DELETE" }),
    sendUserCredentials: (id: number) =>
        apiFetch(`/admin/users/${id}/send-credentials`, { method: "POST" }),

    // Uploads
    uploadImage: (file: File) => {
        const formData = new FormData();
        formData.append("image", file);
        return apiFetch("/admin/uploads", { method: "POST", body: formData });
    },

    // Admin Coupons
    getCoupons: () => apiFetch("/admin/coupons"),
    getCoupon: (id: number) => apiFetch(`/admin/coupons/${id}`),
    createCoupon: (data: any) =>
        apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(data) }),
    updateCoupon: (id: number, data: any) =>
        apiFetch(`/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCoupon: (id: number) =>
        apiFetch(`/admin/coupons/${id}`, { method: "DELETE" }),

    // Public Coupon Validation
    validateCoupon: (code: string, orderTotalCents: number) =>
        apiFetch("/coupons/validate", {
            method: "POST",
            body: JSON.stringify({ code, orderTotalCents }),
        }),

    // Public Events
    getPublicEvents: () => apiFetch("/events"),
    getPublicEvent: (slug: string) => apiFetch(`/events/${encodeURIComponent(slug)}`),
    purchaseTickets: (eventId: number, data: any) =>
        apiFetch(`/events/${eventId}/purchase`, {
            method: "POST",
            body: JSON.stringify(data),
        }),
    submitEventQuestion: (eventId: number, data: { name: string; email: string; message: string }) =>
        apiFetch(`/events/${eventId}/questions`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    // Admin Events
    getEvents: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/events${qs}`);
    },
    getEventStats: () => apiFetch("/admin/events/stats"),
    getEvent: (id: number) => apiFetch(`/admin/events/${id}`),
    createEvent: (data: any) =>
        apiFetch("/admin/events", { method: "POST", body: JSON.stringify(data) }),
    updateEvent: (id: number, data: any) =>
        apiFetch(`/admin/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteEvent: (id: number) =>
        apiFetch(`/admin/events/${id}`, { method: "DELETE" }),
    duplicateEvent: (id: number, data: any) =>
        apiFetch(`/admin/events/${id}/duplicate`, {
            method: "POST",
            body: JSON.stringify(data),
        }),
    createRecurringEvents: (data: any) =>
        apiFetch("/admin/events/recurring", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    getEventAttendees: (id: number, search?: string) => {
        const qs = search ? `?search=${encodeURIComponent(search)}` : "";
        return apiFetch(`/admin/events/${id}/attendees${qs}`);
    },
    getEventOrders: (id: number) => apiFetch(`/admin/events/${id}/orders`),
    checkInTicket: (ticketId: number) =>
        apiFetch(`/admin/events/tickets/${ticketId}/check-in`, { method: "PUT" }),
    cancelTicket: (ticketId: number) =>
        apiFetch(`/admin/events/tickets/${ticketId}/cancel`, { method: "PUT" }),
    refundTicket: (ticketId: number) =>
        apiFetch(`/admin/events/tickets/${ticketId}/refund`, { method: "PUT" }),
    emailEventAttendees: (id: number, subject: string, message: string) =>
        apiFetch(`/admin/events/${id}/email`, {
            method: "POST",
            body: JSON.stringify({ subject, message }),
        }),
    getEventQuestions: (id: number) => apiFetch(`/admin/events/${id}/questions`),
    markQuestionRead: (questionId: number) =>
        apiFetch(`/admin/events/questions/${questionId}/read`, { method: "PUT" }),
    deleteQuestion: (questionId: number) =>
        apiFetch(`/admin/events/questions/${questionId}`, { method: "DELETE" }),

    // Admin Event Orders
    getEventOrdersAll: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/events/orders/all${qs}`);
    },
    getEventOrderDetail: (orderId: number) => apiFetch(`/admin/events/orders/${orderId}`),
    updateEventOrderStatus: (orderId: number, status: string) =>
        apiFetch(`/admin/events/orders/${orderId}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    refundEventOrder: (orderId: number) =>
        apiFetch(`/admin/events/orders/${orderId}/refund`, { method: "POST" }),

    // Analytics
    getAnalyticsSummary: (days?: number) =>
        apiFetch(`/admin/analytics/summary${days ? `?days=${days}` : ""}`),
    getRevenueTimeSeries: (days?: number) =>
        apiFetch(`/admin/analytics/revenue${days ? `?days=${days}` : ""}`),
    getTopProducts: (days?: number) =>
        apiFetch(`/admin/analytics/top-products${days ? `?days=${days}` : ""}`),
    getOrdersByLocation: (days?: number) =>
        apiFetch(`/admin/analytics/by-location${days ? `?days=${days}` : ""}`),
    exportOrdersCsv: (from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        return `${API_BASE}/admin/analytics/export/orders${qs ? `?${qs}` : ""}`;
    },

    // Fulfillment
    getFulfillmentSummary: (params?: { locationId?: number; from?: string; to?: string; flavourName?: string }) => {
        const qs = params ? "?" + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : "";
        return apiFetch(`/admin/fulfillment/summary${qs}`);
    },
    getFulfillmentOrders: (params?: { search?: string; locationId?: number; from?: string; to?: string; flavourName?: string }) => {
        const qs = params ? "?" + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : "";
        return apiFetch(`/admin/fulfillment/orders${qs}`);
    },
    markOrderPickup: (id: number) =>
        apiFetch(`/admin/fulfillment/orders/${id}/pickup`, { method: "PUT" }),
    markOrderReady: (id: number) =>
        apiFetch(`/admin/fulfillment/orders/${id}/ready`, { method: "PUT" }),

    // Admin Careers
    getCareerJobs: () => apiFetch("/admin/careers/jobs"),
    createCareerJob: (data: any) =>
        apiFetch("/admin/careers/jobs", { method: "POST", body: JSON.stringify(data) }),
    updateCareerJob: (id: number, data: any) =>
        apiFetch(`/admin/careers/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCareerJob: (id: number) =>
        apiFetch(`/admin/careers/jobs/${id}`, { method: "DELETE" }),
    getCareerBenefits: () => apiFetch("/admin/careers/benefits"),
    createCareerBenefit: (data: any) =>
        apiFetch("/admin/careers/benefits", { method: "POST", body: JSON.stringify(data) }),
    updateCareerBenefit: (id: number, data: any) =>
        apiFetch(`/admin/careers/benefits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCareerBenefit: (id: number) =>
        apiFetch(`/admin/careers/benefits/${id}`, { method: "DELETE" }),

    // Public Careers
    getPublicCareers: () => apiFetch("/careers"),
    submitCareerApplication: (data: any) =>
        apiFetch("/careers/apply", { method: "POST", body: JSON.stringify(data) }),

    // Public Rotating Flavours
    getPublicRotatingFlavours: () => apiFetch("/rotating-flavours"),

    // Admin Rotating Flavours
    getRotatingFlavours: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/rotating-flavours${qs}`);
    },
    createRotatingFlavour: (data: any) =>
        apiFetch("/admin/rotating-flavours", { method: "POST", body: JSON.stringify(data) }),
    updateRotatingFlavour: (id: number, data: any) =>
        apiFetch(`/admin/rotating-flavours/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteRotatingFlavour: (id: number) =>
        apiFetch(`/admin/rotating-flavours/${id}`, { method: "DELETE" }),

    // Settings
    getSettings: () => apiFetch("/admin/settings"),
    updateSettings: (data: Record<string, string>) =>
        apiFetch("/admin/settings", { method: "PUT", body: JSON.stringify(data) }),
    getSquareStatus: () => apiFetch("/admin/settings/square/status"),
    getSquareLocations: () => apiFetch("/admin/settings/square/locations"),
    getSquareMappings: () => apiFetch("/admin/settings/square/mappings"),
    updateSquareMapping: (id: number, squareLocationId: string) =>
        apiFetch(`/admin/settings/square/mappings/${id}`, {
            method: "PUT",
            body: JSON.stringify({ squareLocationId }),
        }),
    getSquareAppId: (locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return apiFetch(`/square/app-id${qs}`);
    },

    // Announcement Bar
    getPublicAnnouncement: () => apiFetch("/announcement"),
    getAnnouncementSettings: () => apiFetch("/admin/settings/announcement"),
    updateAnnouncementSettings: (data: { text?: string; link?: string; linkText?: string; enabled?: boolean }) =>
        apiFetch("/admin/settings/announcement", { method: "PUT", body: JSON.stringify(data) }),

    // Public Form Submissions
    submitContactForm: (data: { name: string; email: string; subject: string; message: string }) =>
        apiFetch("/contact", { method: "POST", body: JSON.stringify(data) }),
    submitWholesaleForm: (data: {
        businessName: string;
        contactName: string;
        email: string;
        phone: string;
        businessType: string;
        location: string;
        interest: string;
        message: string;
    }) => apiFetch("/wholesale", { method: "POST", body: JSON.stringify(data) }),
    submitCateringForm: (data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        eventType: string;
        date: string;
        guestCount: string;
        message: string;
    }) => apiFetch("/catering", { method: "POST", body: JSON.stringify(data) }),
    submitFundraisingForm: (data: {
        orgName: string;
        contactName: string;
        email: string;
        phone: string;
        orgType: string;
        message: string;
    }) => apiFetch("/fundraising", { method: "POST", body: JSON.stringify(data) }),

    // Bakery Orders (public)
    submitBakeryOrder: (data: FormData) =>
        apiFetch("/bakery-orders", { method: "POST", body: data }),

    // Admin Bakery Orders
    getBakeryOrderStats: () => apiFetch("/admin/bakery-orders/stats"),
    getBakeryOrders: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/bakery-orders${qs}`);
    },
    getBakeryOrder: (id: number) => apiFetch(`/admin/bakery-orders/${id}`),
    updateBakeryOrderStatus: (id: number, status: string) =>
        apiFetch(`/admin/bakery-orders/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        }),
    updateBakeryOrderNotes: (id: number, adminNotes: string) =>
        apiFetch(`/admin/bakery-orders/${id}/notes`, {
            method: "PUT",
            body: JSON.stringify({ adminNotes }),
        }),
    exportBakeryOrdersCsv: (from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        return `${API_BASE}/admin/bakery-orders/export/csv${qs ? `?${qs}` : ""}`;
    },
    sendBakeryInvoice: (id: number, message: string, amountCents?: number) =>
        apiFetch(`/admin/bakery-orders/${id}/send-invoice`, {
            method: "POST",
            body: JSON.stringify({ message, amountCents }),
        }),

    // Pre-Orders (per-product)
    getPreOrders: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/pre-order-windows${qs}`);
    },
    getPreOrder: (id: number) => apiFetch(`/admin/pre-order-windows/${id}`),
    createPreOrders: (data: any) =>
        apiFetch("/admin/pre-order-windows", { method: "POST", body: JSON.stringify(data) }),
    updatePreOrder: (id: number, data: any) =>
        apiFetch(`/admin/pre-order-windows/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    batchUpdatePreOrders: (ids: number[], data: any) =>
        apiFetch("/admin/pre-order-windows/batch/update", { method: "PUT", body: JSON.stringify({ ids, ...data }) }),
    deletePreOrder: (id: number) =>
        apiFetch(`/admin/pre-order-windows/${id}`, { method: "DELETE" }),
    triggerPreOrderPickup: (id: number) =>
        apiFetch(`/admin/pre-order-windows/${id}/trigger-pickup`, { method: "POST" }),
    getEmailLog: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/pre-order-windows/email-log${qs}`);
    },
    getSentEmailsLog: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/sent-emails${qs}`);
    },

    // Public: Active pre-orders
    getActivePreOrders: (locationId?: number) => {
        const qs = locationId ? `?locationId=${locationId}` : "";
        return apiFetch(`/bakery-orders/windows/active${qs}`);
    },

    // ── Admin Wholesale ──
    getWholesaleOrderStats: () => apiFetch("/admin/wholesale/orders/stats"),
    getWholesaleOrders: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/wholesale/orders${qs}`);
    },
    createWholesaleOrder: (data: any) =>
        apiFetch("/admin/wholesale/orders", { method: "POST", body: JSON.stringify(data) }),
    getWholesaleOrder: (id: number) => apiFetch(`/admin/wholesale/orders/${id}`),
    updateWholesaleOrder: (id: number, data: any) =>
        apiFetch(`/admin/wholesale/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    confirmWholesaleOrder: (id: number, confirmedDeliveryDate?: string) =>
        apiFetch(`/admin/wholesale/orders/${id}/confirm`, {
            method: "PUT",
            body: JSON.stringify({ confirmedDeliveryDate }),
        }),
    updateWholesaleOrderStatus: (id: number, status: string) =>
        apiFetch(`/admin/wholesale/orders/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        }),
    updateWholesaleOrderPayment: (id: number, data: { paymentStatus: string; paymentMethod?: string; paymentNotes?: string }) =>
        apiFetch(`/admin/wholesale/orders/${id}/payment`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    getWholesaleCustomers: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/wholesale/customers${qs}`);
    },
    createWholesaleCustomer: (data: any) =>
        apiFetch("/admin/wholesale/customers", { method: "POST", body: JSON.stringify(data) }),
    getWholesaleCustomer: (id: number) => apiFetch(`/admin/wholesale/customers/${id}`),
    updateWholesaleCustomer: (id: number, data: any) =>
        apiFetch(`/admin/wholesale/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    getWholesaleFlavours: () => apiFetch("/admin/wholesale/flavours"),
    createWholesaleFlavour: (data: any) =>
        apiFetch("/admin/wholesale/flavours", { method: "POST", body: JSON.stringify(data) }),
    updateWholesaleFlavour: (id: number, data: any) =>
        apiFetch(`/admin/wholesale/flavours/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteWholesaleFlavour: (id: number) =>
        apiFetch(`/admin/wholesale/flavours/${id}`, { method: "DELETE" }),
    getWholesaleSizes: () => apiFetch("/admin/wholesale/sizes"),
    createWholesaleSize: (data: any) =>
        apiFetch("/admin/wholesale/sizes", { method: "POST", body: JSON.stringify(data) }),
    updateWholesaleSize: (id: number, data: any) =>
        apiFetch(`/admin/wholesale/sizes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteWholesaleSize: (id: number) =>
        apiFetch(`/admin/wholesale/sizes/${id}`, { method: "DELETE" }),
    getWholesaleProducts: () => apiFetch("/admin/wholesale/products"),
    createWholesaleProduct: (data: any) =>
        apiFetch("/admin/wholesale/products", { method: "POST", body: JSON.stringify(data) }),
    updateWholesaleProduct: (id: number, data: any) =>
        apiFetch(`/admin/wholesale/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteWholesaleProduct: (id: number) =>
        apiFetch(`/admin/wholesale/products/${id}`, { method: "DELETE" }),
    bulkCreateWholesaleProducts: (products: { flavourId: number; wholesaleSizeId?: number; name: string; unitDescription?: string; priceCents: number }[]) =>
        apiFetch("/admin/wholesale/products/bulk", { method: "POST", body: JSON.stringify({ products }) }),
    getWholesaleEmailLog: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/wholesale/email-log${qs}`);
    },
    getWholesaleProductionReport: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/wholesale/production-report${qs}`);
    },
    getWholesaleDeliverySchedule: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/wholesale/delivery-schedule${qs}`);
    },
    getWholesaleDashboard: () => apiFetch("/admin/wholesale/dashboard"),
    getWholesaleDeliveryRuns: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/wholesale/delivery-runs${qs}`);
    },
    createWholesaleDeliveryRun: (data: any) =>
        apiFetch("/admin/wholesale/delivery-runs", { method: "POST", body: JSON.stringify(data) }),
    getWholesaleDeliveryRun: (id: number) =>
        apiFetch(`/admin/wholesale/delivery-runs/${id}`),
    updateWholesaleDeliveryRun: (id: number, data: any) =>
        apiFetch(`/admin/wholesale/delivery-runs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteWholesaleDeliveryRun: (id: number) =>
        apiFetch(`/admin/wholesale/delivery-runs/${id}`, { method: "DELETE" }),
    addDeliveryRunStop: (runId: number, data: any) =>
        apiFetch(`/admin/wholesale/delivery-runs/${runId}/stops`, { method: "POST", body: JSON.stringify(data) }),
    reorderDeliveryRunStops: (runId: number, stopIds: number[]) =>
        apiFetch(`/admin/wholesale/delivery-runs/${runId}/stops/reorder`, { method: "PUT", body: JSON.stringify({ stopIds }) }),
    updateDeliveryRunStop: (runId: number, stopId: number, data: any) =>
        apiFetch(`/admin/wholesale/delivery-runs/${runId}/stops/${stopId}`, { method: "PUT", body: JSON.stringify(data) }),
    removeDeliveryRunStop: (runId: number, stopId: number) =>
        apiFetch(`/admin/wholesale/delivery-runs/${runId}/stops/${stopId}`, { method: "DELETE" }),
    sendWholesaleDriverLink: (runId: number) =>
        apiFetch(`/admin/wholesale/delivery-runs/${runId}/send-driver-link`, { method: "POST" }),
    sendWholesaleInvoice: (id: number) =>
        apiFetch(`/admin/wholesale/orders/${id}/send-invoice`, { method: "POST" }),
    startWholesaleProduction: (id: number) =>
        apiFetch(`/admin/wholesale/orders/${id}/production/start`, { method: "PUT" }),
    completeWholesaleProduction: (id: number) =>
        apiFetch(`/admin/wholesale/orders/${id}/production/complete`, { method: "PUT" }),

    // ── Wholesale Partner Staff ──
    getWholesaleCustomerStaff: (customerId: number) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/staff`),
    createWholesaleCustomerStaff: (customerId: number, data: { username: string; password: string; locationId: number }) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/staff`, { method: "POST", body: JSON.stringify(data) }),
    deleteWholesaleCustomerStaff: (customerId: number, staffId: number) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/staff/${staffId}`, { method: "DELETE" }),

    // ── Wholesale Vendor Delivery Locations ──
    getWholesaleVendorLocations: (customerId: number) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/vendor-locations`),
    createWholesaleVendorLocation: (customerId: number, data: { name: string; address?: string; city?: string; state?: string; zip?: string; phone?: string; notes?: string; isDefault?: boolean }) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/vendor-locations`, { method: "POST", body: JSON.stringify(data) }),
    updateWholesaleVendorLocation: (customerId: number, locId: number, data: any) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/vendor-locations/${locId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteWholesaleVendorLocation: (customerId: number, locId: number) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/vendor-locations/${locId}`, { method: "DELETE" }),
    resendWholesaleWelcomeEmail: (customerId: number) =>
        apiFetch(`/admin/wholesale/customers/${customerId}/invite`, { method: "POST" }),

    // ── Admin Inquiries (CRM) ──
    getInquiries: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return apiFetch(`/admin/inquiries${qs}`);
    },
    getInquiryStats: () => apiFetch("/admin/inquiries/stats"),
    getInquiry: (id: number) => apiFetch(`/admin/inquiries/${id}`),
    updateInquiry: (id: number, data: { status?: string; assignedTo?: string | null }) =>
        apiFetch(`/admin/inquiries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateInquiryStatus: (id: number, status: string) =>
        apiFetch(`/admin/inquiries/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    addInquiryNote: (id: number, content: string) =>
        apiFetch(`/admin/inquiries/${id}/notes`, { method: "POST", body: JSON.stringify({ content }) }),
    deleteInquiry: (id: number) =>
        apiFetch(`/admin/inquiries/${id}`, { method: "DELETE" }),
    getInquiryAdmins: () => apiFetch("/admin/inquiries/meta/admins"),

    // ── Customer Auth ──
    customerRegister: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) =>
        customerFetch("/customer/register", { method: "POST", body: JSON.stringify(data) }),
    customerLogin: (email: string, password: string) =>
        customerFetch("/customer/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    customerLogout: () => customerFetch("/customer/logout", { method: "POST" }),
    customerMe: () => customerFetch("/customer/me"),
    customerRewards: () => customerFetch("/customer/rewards"),
    customerUpdateProfile: (data: any) =>
        customerFetch("/customer/profile", { method: "PUT", body: JSON.stringify(data) }),
    customerOrders: () => customerFetch("/customer/orders"),
    customerEventOrders: () => customerFetch("/customer/event-orders"),
    customerIceCreamOrders: () => customerFetch("/customer/ice-cream-orders"),
    customerWooOrders: () => customerFetch("/customer/woo-orders"),
    customerForgotPassword: (email: string) =>
        customerFetch("/customer/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    customerResetPassword: (token: string, password: string) =>
        customerFetch("/customer/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
    customerCheckEmail: (email: string) =>
        customerFetch("/customer/check-email", { method: "POST", body: JSON.stringify({ email }) }),
    customerChangePassword: (currentPassword: string, newPassword: string) =>
        customerFetch("/customer/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),

    // ── Customer Wholesale Registration ──
    customerRegisterWholesale: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; inviteToken?: string }) =>
        customerFetch("/customer/register-wholesale", { method: "POST", body: JSON.stringify(data) }),

    // ── Wholesale Portal (Customer) ──
    wholesalePortalProfile: () => customerFetch("/customer/wholesale/profile"),
    wholesalePortalProducts: () => customerFetch("/customer/wholesale/products"),
    wholesalePortalOrders: () => customerFetch("/customer/wholesale/orders"),
    wholesalePortalOrder: (id: number) => customerFetch(`/customer/wholesale/orders/${id}`),
    wholesalePortalCreateOrder: (data: {
        items: { wholesaleProductId?: number; customDescription?: string; quantity: number; notes?: string }[];
        requestedDeliveryDate?: string;
        deliveryMethod?: string;
        notes?: string;
    }) => customerFetch("/customer/wholesale/orders", { method: "POST", body: JSON.stringify(data) }),

    // ── Admin Wholesale Invite/Approve ──
    sendWholesaleInvite: (id: number) =>
        apiFetch(`/admin/wholesale/customers/${id}/invite`, { method: "POST" }),
    approveWholesaleCustomer: (id: number) =>
        apiFetch(`/admin/wholesale/customers/${id}/approve`, { method: "PUT" }),

    // ── Gift Cards ──
    purchaseGiftCard: (data: {
        sourceId: string;
        amountCents: number;
        buyerName: string;
        buyerEmail: string;
        buyerPhone?: string;
        recipientName: string;
        recipientEmail: string;
        personalMessage?: string;
    }) => apiFetch("/gift-cards/purchase", { method: "POST", body: JSON.stringify(data) }),
};
