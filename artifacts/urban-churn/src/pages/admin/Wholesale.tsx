import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminWholesaleSteps } from "@/lib/tour/tour-steps";
import {
    WHOLESALE_ORDER_FILTERS,
    WHOLESALE_ORDER_STATUS_LABELS,
    WHOLESALE_PAYMENT_STATUS_LABELS,
    formatWholesaleOrderStatus,
    parseWholesaleOrderFilter,
    WHOLESALE_CANONICAL_SIZES,
} from "@/lib/wholesale-constants";
import { invalidateWholesaleSummaries } from "@/lib/wholesale-queries";
import {
    WholesaleDashboardTab,
    type WholesaleNavigateTarget,
} from "@/components/admin/wholesale/WholesaleDashboardTab";
import { Label } from "@/components/ui/label";
import { WholesaleProductMatrix } from "@/components/admin/WholesaleProductMatrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    Eye,
    EyeOff,
    Search,
    Plus,
    Check,
    X,
    Package,
    Users,
    ShoppingCart,
    Mail,
    TrendingUp,
    Truck,
    ChevronDown,
    ChevronUp,
    Calendar,
    BarChart3,
    Inbox,
    Info,
    ArrowRight,
    Pencil,
    Download,
    Trash2,
    Save,
    AlertTriangle,
    PackagePlus,
    LayoutDashboard,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Route,
    Play,
    CheckCircle2,
    SkipForward,
    List,
    CalendarDays,
    Receipt,
    Factory,
    ExternalLink,
} from "lucide-react";

// ── Constants ──

const orderStatusColors: Record<string, string> = {
    pending_review: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_production: "bg-purple-100 text-purple-800",
    ready: "bg-emerald-100 text-emerald-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

function formatCents(c: number) {
    return `$${(c / 100).toFixed(2)}`;
}

function confidenceColor(c: number | null) {
    if (c === null) return "bg-slate-100 text-slate-800";
    if (c >= 0.9) return "bg-green-100 text-green-800";
    if (c >= 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
}

const CHART_COLORS = ["#A1AB74", "#6B8E23", "#DAA520", "#CD853F", "#8FBC8F", "#BDB76B", "#556B2F", "#DEB887"];

const runStatusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

// ═══════════════════════════════════════
// ── Main Component ──
// ═══════════════════════════════════════

type TabKey = "dashboard" | "orders" | "customers" | "products" | "production" | "deliveries" | "email-log";

export default function AdminWholesale() {
    const [tab, setTab] = useState<TabKey>("dashboard");
    const [ordersNav, setOrdersNav] = useState<{ filter?: string; selectedOrderId?: number }>({});
    const [showHelp, setShowHelp] = useState(false);

    useTour("admin-wholesale", adminWholesaleSteps);

    const navigateWholesale = useCallback((target: WholesaleNavigateTarget) => {
        setTab(target.tab);
        if (target.tab === "orders") {
            setOrdersNav({
                filter: target.ordersFilter,
                selectedOrderId: target.selectedOrderId,
            });
        }
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between" data-tour="admin-wholesale-header">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Wholesale</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHelp(!showHelp)}
                        className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                        <Info className="h-4 w-4" />
                        How It Works
                        {showHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                </div>

                {/* How It Works explainer */}
                {showHelp && <HowItWorks />}

                {/* Tab bar */}
                <div className="flex flex-wrap gap-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 p-1" data-tour="admin-wholesale-tabs">
                    {(
                        [
                            { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                            { key: "orders", label: "Orders", icon: ShoppingCart },
                            { key: "customers", label: "Customers", icon: Users },
                            { key: "products", label: "Products", icon: Package },
                            { key: "production", label: "Production", icon: BarChart3 },
                            { key: "deliveries", label: "Deliveries", icon: CalendarDays },
                            { key: "email-log", label: "Email Log", icon: Inbox },
                        ] as const
                    ).map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-white/25 text-white shadow-sm" : "text-white/80 hover:text-white"}`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white text-slate-900 shadow-xl p-4 md:p-6">
                    {tab === "dashboard" && <WholesaleDashboardTab onNavigate={navigateWholesale} />}
                    {tab === "orders" && (
                        <OrdersTab
                            initialFilter={ordersNav.filter}
                            initialSelectedId={ordersNav.selectedOrderId}
                            onNavConsumed={() => setOrdersNav({})}
                        />
                    )}
                    {tab === "customers" && <CustomersTab />}
                    {tab === "products" && <ProductsTab />}
                    {tab === "production" && <ProductionTab />}
                    {tab === "deliveries" && <DeliveriesTab />}
                    {tab === "email-log" && <EmailLogTab />}
                </div>
            </div>
        </AdminLayout>
    );
}

// ═══════════════════════════════════════
// ── How It Works Explainer ──
// ═══════════════════════════════════════

function HowItWorks() {
    return (
        <Card className="border-slate-200 bg-white text-slate-900 shadow-xl" data-tour="admin-wholesale-flow">
            <CardContent className="pt-5 pb-4">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Wholesale Order System</h3>
                    <p className="text-sm text-slate-700">
                        Wholesale customers email their orders to your Resend inbound address.
                        Orders are automatically parsed by AI and appear here for review.
                    </p>

                    {/* Flow diagram */}
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                        {[
                            { icon: Mail, label: "Customer emails order" },
                            { icon: ArrowRight, label: "" },
                            { icon: Inbox, label: "Resend receives it" },
                            { icon: ArrowRight, label: "" },
                            { icon: TrendingUp, label: "AI parses items" },
                            { icon: ArrowRight, label: "" },
                            { icon: Eye, label: "Admin reviews" },
                            { icon: ArrowRight, label: "" },
                            { icon: Check, label: "Confirm & schedule" },
                        ].map((step, i) =>
                            step.label === "" ? (
                                <step.icon key={i} className="h-4 w-4 text-slate-500 flex-shrink-0" />
                            ) : (
                                <div key={i} className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 shadow-sm">
                                    <step.icon className="h-4 w-4 text-[#A1AB74]" />
                                    <span>{step.label}</span>
                                </div>
                            ),
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <InfoCard
                            title="AI Confidence Scores"
                            items={[
                                "Green (90%+): High confidence, safe to confirm",
                                "Yellow (70-89%): Review items, some ambiguity",
                                "Red (<70%): Needs manual review / correction",
                            ]}
                        />
                        <InfoCard
                            title="Setup Checklist"
                            items={[
                                "1. Add wholesale customers (Customers tab)",
                                "2. Define products & sizes (Products tab)",
                                "3. Share order email with customers",
                                "4. Orders appear here automatically",
                            ]}
                        />
                        <InfoCard
                            title="Order Workflow"
                            items={[
                                "Pending Review → Confirmed → In Production → Ready → Delivered",
                                "Confirming sends the customer a confirmation email",
                                "Use Production tab for batch planning",
                                "Use Deliveries tab for route scheduling",
                            ]}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-lg border bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold">{title}</p>
            <ul className="space-y-1">
                {items.map((item, i) => (
                    <li key={i} className="text-xs text-slate-700">{item}</li>
                ))}
            </ul>
        </div>
    );
}

// ═══════════════════════════════════════
// ── Orders Tab ──
// ═══════════════════════════════════════

function OrdersTab({
    initialFilter,
    initialSelectedId,
    onNavConsumed,
}: {
    initialFilter?: string;
    initialSelectedId?: number;
    onNavConsumed?: () => void;
}) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [filterStatus, setFilterStatus] = useState(initialFilter || "all");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId ?? null);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (initialFilter) setFilterStatus(initialFilter);
        if (initialSelectedId) setSelectedId(initialSelectedId);
        if (initialFilter || initialSelectedId) onNavConsumed?.();
    }, [initialFilter, initialSelectedId, onNavConsumed]);

    const statsQ = useQuery({
        queryKey: ["wholesale-order-stats"],
        queryFn: api.getWholesaleOrderStats,
    });

    const ordersQ = useQuery({
        queryKey: ["wholesale-orders", filterStatus, debouncedSearch],
        queryFn: () => {
            const params: Record<string, string> = {};
            const parsed = parseWholesaleOrderFilter(filterStatus);
            if (parsed.status) params.status = parsed.status;
            if (parsed.filter) params.filter = parsed.filter;
            if (debouncedSearch) params.search = debouncedSearch;
            return api.getWholesaleOrders(params);
        },
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.updateWholesaleOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            invalidateWholesaleSummaries(queryClient);
            toast({ title: "Status updated" });
        },
    });

    const confirmMutation = useMutation({
        mutationFn: ({ id, date }: { id: number; date?: string }) =>
            api.confirmWholesaleOrder(id, date),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            invalidateWholesaleSummaries(queryClient);
            setSelectedId(null);
            toast({ title: "Order confirmed & customer notified" });
        },
    });

    const stats = statsQ.data;
    const orders = ordersQ.data || [];

    return (
        <div className="space-y-4">
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {[
                        { label: "Total Orders", value: stats.totalOrders },
                        { label: "Pending Review", value: stats.pendingReview },
                        { label: "Today", value: stats.todayOrders },
                        { label: "Awaiting Delivery", value: stats.awaitingDelivery ?? 0 },
                        { label: "Unpaid (Fulfillment)", value: stats.unpaidAwaitingDelivery ?? 0 },
                    ].map((s) => (
                        <Card key={s.label}>
                            <CardContent className="pt-4">
                                <p className="text-sm text-slate-600">{s.label}</p>
                                <p className="text-2xl font-bold">{s.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                    <Input
                        placeholder="Search orders…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {WHOLESALE_ORDER_FILTERS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                                {s.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Order
                </Button>
            </div>

            {/* Orders table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left">
                                    <th className="px-4 py-3 font-medium">Order</th>
                                    <th className="px-4 py-3 font-medium">Customer</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Delivery</th>
                                    <th className="px-4 py-3 font-medium">Confidence</th>
                                    <th className="px-4 py-3 font-medium">Payment</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o: any) => (
                                    <tr key={o.id} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-xs">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {o.orderNumber}
                                                {o.isRushOrder && (
                                                    <Badge className="bg-amber-100 text-amber-800 text-[10px]">RUSH</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {o.customerName}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                className={
                                                    orderStatusColors[o.status] ||
                                                    "bg-gray-100"
                                                }
                                            >
                                                {formatWholesaleOrderStatus(o.status)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {o.confirmedDeliveryDate ||
                                                o.requestedDeliveryDate ||
                                                "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {o.aiParseConfidence !== null && (
                                                <Badge
                                                    className={confidenceColor(
                                                        o.aiParseConfidence,
                                                    )}
                                                >
                                                    {Math.round(
                                                        o.aiParseConfidence * 100,
                                                    )}
                                                    %
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge className={
                                                o.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                                                    o.paymentStatus === "invoiced" ? "bg-blue-100 text-blue-800" :
                                                        o.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-800" :
                                                            "bg-gray-100 text-slate-700"
                                            }>
                                                {WHOLESALE_PAYMENT_STATUS_LABELS[o.paymentStatus] || o.paymentStatus || "Unpaid"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">
                                            {new Date(o.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setSelectedId(o.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {o.status === "pending_review" && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-green-600"
                                                        onClick={() =>
                                                            confirmMutation.mutate({
                                                                id: o.id,
                                                            })
                                                        }
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-8 text-center text-slate-600"
                                        >
                                            No wholesale orders yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Order detail dialog */}
            {selectedId && (
                <OrderDetailDialog
                    orderId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onStatusChange={(status) => {
                        statusMutation.mutate({ id: selectedId, status });
                    }}
                    onConfirm={(date) => {
                        confirmMutation.mutate({ id: selectedId, date });
                    }}
                />
            )}

            {showCreate && (
                <CreateOrderDialog
                    onClose={() => setShowCreate(false)}
                    onCreated={() => {
                        setShowCreate(false);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
                        invalidateWholesaleSummaries(queryClient);
                    }}
                />
            )}
        </div>
    );
}

// ── Create Order Dialog ──

function CreateOrderDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const { toast } = useToast();
    const [customerId, setCustomerId] = useState("");
    const [deliveryMethod, setDeliveryMethod] = useState("delivery");
    const [requestedDate, setRequestedDate] = useState("");
    const [adminNotes, setAdminNotes] = useState("");
    const [items, setItems] = useState<{ wholesaleProductId: string; quantity: number; unitPriceCents: number; productDescription: string; notes: string }[]>([]);

    const customersQ = useQuery({
        queryKey: ["wholesale-customers-list"],
        queryFn: () => api.getWholesaleCustomers({ status: "active" }),
    });

    const productsQ = useQuery({
        queryKey: ["wholesale-products-list"],
        queryFn: () => api.getWholesaleProducts(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createWholesaleOrder(data),
        onSuccess: () => {
            toast({ title: "Order created" });
            onCreated();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message || "Failed to create order", variant: "destructive" });
        },
    });

    const addItem = () => {
        setItems([...items, { wholesaleProductId: "", quantity: 1, unitPriceCents: 0, productDescription: "", notes: "" }]);
    };

    const updateItem = (idx: number, field: string, value: any) => {
        const updated = [...items];
        (updated[idx] as any)[field] = value;
        // Auto-fill price & description when product selected
        if (field === "wholesaleProductId" && value) {
            const prod = (productsQ.data || []).find((p: any) => p.id === Number(value));
            if (prod) {
                updated[idx].unitPriceCents = prod.priceCents;
                updated[idx].productDescription = `${prod.flavourName || ""} — ${prod.name}`;
            }
        }
        setItems(updated);
    };

    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const submit = () => {
        if (!customerId) { toast({ title: "Select a customer", variant: "destructive" }); return; }
        if (items.length === 0) { toast({ title: "Add at least one item", variant: "destructive" }); return; }
        createMutation.mutate({
            wholesaleCustomerId: Number(customerId),
            deliveryMethod,
            requestedDeliveryDate: requestedDate || undefined,
            adminNotes,
            items: items.map((it) => ({
                wholesaleProductId: it.wholesaleProductId ? Number(it.wholesaleProductId) : null,
                quantity: it.quantity,
                unitPriceCents: it.unitPriceCents,
                productDescription: it.productDescription,
                notes: it.notes,
            })),
        });
    };

    const customers = customersQ.data || [];
    const products = productsQ.data || [];
    const subtotal = items.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0);

    return (
        <Dialog open onOpenChange={() => onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Wholesale Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Customer */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Customer *</label>
                        <Select value={customerId} onValueChange={setCustomerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select customer…" />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((c: any) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.businessName} ({c.contactName})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Delivery Method</label>
                            <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                    <SelectItem value="pickup">Pickup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Requested Delivery Date</label>
                            <Input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Line Items *</label>
                            <Button size="sm" variant="outline" onClick={addItem}>
                                <Plus className="h-3 w-3 mr-1" /> Add Item
                            </Button>
                        </div>
                        {items.length === 0 && (
                            <p className="text-sm text-slate-600 text-center py-4 border rounded-lg">No items yet. Click "Add Item" to start.</p>
                        )}
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select value={item.wholesaleProductId} onValueChange={(v) => updateItem(idx, "wholesaleProductId", v)}>
                                                <SelectTrigger className="text-xs">
                                                    <SelectValue placeholder="Select product…" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map((p: any) => (
                                                        <SelectItem key={p.id} value={String(p.id)}>
                                                            {p.flavourName} — {p.name} (${(p.priceCents / 100).toFixed(2)})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-20">
                                            <Input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                                                className="text-xs"
                                                placeholder="Qty"
                                            />
                                        </div>
                                        <div className="w-28">
                                            <Input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={item.unitPriceCents}
                                                onChange={(e) => updateItem(idx, "unitPriceCents", parseInt(e.target.value) || 0)}
                                                className="text-xs"
                                                placeholder="Price (cents)"
                                            />
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => removeItem(idx)} className="text-red-500">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Input
                                        value={item.productDescription}
                                        onChange={(e) => updateItem(idx, "productDescription", e.target.value)}
                                        placeholder="Description (auto-filled from product)"
                                        className="text-xs"
                                    />
                                </div>
                            ))}
                        </div>
                        {items.length > 0 && (
                            <p className="text-sm font-medium text-right mt-2">Subtotal: ${(subtotal / 100).toFixed(2)}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Admin Notes</label>
                        <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} placeholder="Internal notes…" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={submit} disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Creating…" : "Create Order"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Order Detail Dialog (with inline line-item editing) ──

function OrderDetailDialog({
    orderId,
    onClose,
    onStatusChange,
    onConfirm,
}: {
    orderId: number;
    onClose: () => void;
    onStatusChange: (status: string) => void;
    onConfirm: (date?: string) => void;
}) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [confirmDate, setConfirmDate] = useState("");
    const [editing, setEditing] = useState(false);
    const [editItems, setEditItems] = useState<any[]>([]);
    const [addToCatalogIdx, setAddToCatalogIdx] = useState<number | null>(null);
    const [catalogForm, setCatalogForm] = useState({ flavourId: "", wholesaleSizeId: "", priceDollars: "" });
    const [catalogSaving, setCatalogSaving] = useState(false);
    const [paymentEdit, setPaymentEdit] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ paymentStatus: "", paymentMethod: "", paymentNotes: "" });

    const orderQ = useQuery({
        queryKey: ["wholesale-order", orderId],
        queryFn: () => api.getWholesaleOrder(orderId),
    });

    const productsQ = useQuery({
        queryKey: ["wholesale-products"],
        queryFn: () => api.getWholesaleProducts(),
    });

    const flavoursQ = useQuery({
        queryKey: ["flavours"],
        queryFn: () => api.getFlavours(),
    });

    const sizesQ = useQuery({
        queryKey: ["wholesale-sizes"],
        queryFn: api.getWholesaleSizes,
    });

    const saveMutation = useMutation({
        mutationFn: (data: any) => api.updateWholesaleOrder(orderId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-order", orderId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            invalidateWholesaleSummaries(queryClient);
            setEditing(false);
            toast({ title: "Order updated" });
        },
    });

    const paymentMutation = useMutation({
        mutationFn: (data: { paymentStatus: string; paymentMethod?: string; paymentNotes?: string }) =>
            api.updateWholesaleOrderPayment(orderId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-order", orderId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            invalidateWholesaleSummaries(queryClient);
            setPaymentEdit(false);
            toast({ title: "Payment updated" });
        },
    });

    const invoiceMutation = useMutation({
        mutationFn: () => api.sendWholesaleInvoice(orderId),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-order", orderId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            invalidateWholesaleSummaries(queryClient);
            toast({ title: "Invoice sent", description: "Square invoice emailed to customer." });
            if (data?.publicUrl) window.open(data.publicUrl, "_blank");
        },
        onError: (err: any) => {
            toast({ title: "Invoice failed", description: err?.message || "Could not create Square invoice", variant: "destructive" });
        },
    });

    const voidInvoiceMutation = useMutation({
        mutationFn: () => api.voidWholesaleInvoice(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-order", orderId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            toast({ title: "Invoice voided", description: "You can now send a new invoice." });
        },
        onError: (err: any) => {
            toast({ title: "Void failed", description: err?.message || "Could not void invoice", variant: "destructive" });
        },
    });

    const productionStartMutation = useMutation({
        mutationFn: () => api.startWholesaleProduction(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-order", orderId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            invalidateWholesaleSummaries(queryClient);
            toast({ title: "Production started" });
        },
    });

    const productionCompleteMutation = useMutation({
        mutationFn: () => api.completeWholesaleProduction(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-order", orderId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-orders"] });
            invalidateWholesaleSummaries(queryClient);
            toast({ title: "Production complete — order marked ready" });
        },
    });

    const order = orderQ.data;
    if (!order) return null;

    const startEditing = () => {
        setEditItems(
            (order.items || []).map((item: any) => ({
                ...item,
                unitPriceDollars: (item.unitPriceCents / 100).toFixed(2),
            })),
        );
        setEditing(true);
    };

    const updateItem = (idx: number, field: string, value: any) => {
        setEditItems((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
        );
    };

    const removeItem = (idx: number) => {
        setEditItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const addItem = () => {
        setEditItems((prev) => [
            ...prev,
            {
                productDescription: "",
                quantity: 1,
                unitPriceDollars: "0.00",
                unitPriceCents: 0,
                wholesaleProductId: null,
                flavourId: null,
                matched: false,
                notes: "",
            },
        ]);
    };

    const matchProduct = (idx: number, productId: string) => {
        const product = (productsQ.data || []).find(
            (p: any) => String(p.id) === productId,
        );
        if (product) {
            updateItem(idx, "wholesaleProductId", product.id);
            updateItem(idx, "flavourId", product.flavourId);
            updateItem(idx, "productDescription", `${product.flavourName} — ${product.name}`);
            updateItem(idx, "unitPriceDollars", (product.priceCents / 100).toFixed(2));
            updateItem(idx, "matched", true);
        }
    };

    const openAddToCatalog = (idx: number) => {
        const item = editing ? editItems[idx] : (order?.items || [])[idx];
        setCatalogForm({
            flavourId: "",
            wholesaleSizeId: "",
            priceDollars: editing
                ? (item?.unitPriceDollars || "0.00")
                : ((item?.unitPriceCents || 0) / 100).toFixed(2),
        });
        setAddToCatalogIdx(idx);
    };

    const handleCatalogSave = async () => {
        if (!catalogForm.flavourId || !catalogForm.wholesaleSizeId || !catalogForm.priceDollars) return;
        setCatalogSaving(true);
        try {
            const newProduct = await api.createWholesaleProduct({
                flavourId: parseInt(catalogForm.flavourId),
                wholesaleSizeId: parseInt(catalogForm.wholesaleSizeId),
                priceCents: Math.round(parseFloat(catalogForm.priceDollars) * 100),
            });
            await queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            const refreshed = await api.getWholesaleProducts();
            const created = (refreshed || []).find((p: any) => p.id === newProduct.id);
            const flavourName = created?.flavourName || (flavoursQ.data || []).find((f: any) => String(f.id) === catalogForm.flavourId)?.name || "";
            const productLabel = created
                ? `${created.flavourName} — ${created.sizeName || created.name}`
                : flavourName;
            if (addToCatalogIdx !== null) {
                if (editing) {
                    setEditItems((prev) =>
                        prev.map((item, i) =>
                            i === addToCatalogIdx
                                ? {
                                    ...item,
                                    wholesaleProductId: newProduct.id,
                                    flavourId: parseInt(catalogForm.flavourId),
                                    productDescription: productLabel,
                                    unitPriceDollars: catalogForm.priceDollars,
                                    matched: true,
                                }
                                : item,
                        ),
                    );
                } else {
                    // Switch to edit mode with the item auto-matched
                    const items = (order?.items || []).map((item: any, i: number) => ({
                        ...item,
                        unitPriceDollars: (item.unitPriceCents / 100).toFixed(2),
                        ...(i === addToCatalogIdx
                            ? {
                                wholesaleProductId: newProduct.id,
                                flavourId: parseInt(catalogForm.flavourId),
                                productDescription: productLabel,
                                unitPriceDollars: catalogForm.priceDollars,
                                matched: true,
                            }
                            : {}),
                    }));
                    setEditItems(items);
                    setEditing(true);
                }
            }
            toast({ title: "Product added to catalog & matched" });
            setAddToCatalogIdx(null);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setCatalogSaving(false);
        }
    };

    const handleSave = () => {
        const items = editItems.map((item) => ({
            wholesaleProductId: item.wholesaleProductId || null,
            flavourId: item.flavourId || null,
            productDescription: item.productDescription,
            quantity: parseInt(item.quantity) || 1,
            unitPriceCents: Math.round(parseFloat(item.unitPriceDollars || "0") * 100),
            matched: !!item.wholesaleProductId,
            notes: item.notes || "",
        }));
        saveMutation.mutate({ items });
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 flex-wrap">
                        Order {order.orderNumber}
                        {order.isRushOrder && (
                            <Badge className="bg-amber-100 text-amber-800">RUSH</Badge>
                        )}
                        <Badge className={orderStatusColors[order.status] || "bg-gray-100"}>
                            {formatWholesaleOrderStatus(order.status)}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Customer info */}
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                        <div>
                            <p className="text-xs text-slate-600">Customer</p>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-slate-700">{order.customerContactName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Delivery</p>
                            <p className="font-medium capitalize">{order.deliveryMethod}</p>
                            <p className="text-sm text-slate-700">
                                Requested: {order.requestedDeliveryDate || "—"}
                            </p>
                            {order.isRushOrder && order.rushNotes && (
                                <p className="text-sm text-amber-700 mt-1">Rush: {order.rushNotes}</p>
                            )}
                            {order.confirmedDeliveryDate && (
                                <p className="text-sm text-green-600">
                                    Confirmed: {order.confirmedDeliveryDate}
                                </p>
                            )}
                        </div>
                        {(order.productionStartedAt || order.productionCompletedAt) && (
                            <div>
                                <p className="text-xs text-slate-600">Production</p>
                                {order.productionStartedAt && (
                                    <p className="text-sm text-purple-700">
                                        Started: {new Date(order.productionStartedAt).toLocaleString()}
                                    </p>
                                )}
                                {order.productionCompletedAt && (
                                    <p className="text-sm text-green-700">
                                        Completed: {new Date(order.productionCompletedAt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* AI Confidence */}
                    {order.aiParseConfidence !== null && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600">AI Confidence:</span>
                            <Badge className={confidenceColor(order.aiParseConfidence)}>
                                {Math.round(order.aiParseConfidence * 100)}%
                            </Badge>
                            {order.aiParseNotes && (
                                <span className="text-sm text-yellow-600">
                                    {order.aiParseNotes}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Line items — view / edit mode */}
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold">Line Items</h3>
                            {!editing && order.status !== "delivered" && order.status !== "cancelled" && (
                                <Button size="sm" variant="outline" onClick={startEditing}>
                                    <Pencil className="mr-1 h-3 w-3" />
                                    Edit Items
                                </Button>
                            )}
                        </div>

                        {editing ? (
                            /* ── Edit Mode ── */
                            <div className="space-y-3">
                                {editItems.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-1 sm:grid-cols-12 items-start gap-2 rounded-lg border bg-white p-3"
                                    >
                                        <div className="col-span-5">
                                            <Input
                                                placeholder="Description"
                                                value={item.productDescription}
                                                onChange={(e) =>
                                                    updateItem(idx, "productDescription", e.target.value)
                                                }
                                                className="text-sm"
                                            />
                                            <div className="mt-1 flex gap-1">
                                                <Select
                                                    value={item.wholesaleProductId ? String(item.wholesaleProductId) : ""}
                                                    onValueChange={(v) => matchProduct(idx, v)}
                                                >
                                                    <SelectTrigger className="text-xs h-8 flex-1">
                                                        <SelectValue placeholder="Match to product…" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(productsQ.data || []).map((p: any) => (
                                                            <SelectItem key={p.id} value={String(p.id)}>
                                                                {p.flavourName} — {p.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {!item.matched && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                                                        onClick={() => openAddToCatalog(idx)}
                                                        title="Add to catalog"
                                                    >
                                                        <PackagePlus className="h-3.5 w-3.5" />
                                                        New
                                                    </Button>
                                                )}
                                            </div>
                                            {addToCatalogIdx === idx && (
                                                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                                                    <p className="text-xs font-medium text-amber-800">Quick Add to Catalog</p>
                                                    <Select
                                                        value={catalogForm.flavourId}
                                                        onValueChange={(v) => setCatalogForm({ ...catalogForm, flavourId: v })}
                                                    >
                                                        <SelectTrigger className="text-xs h-8">
                                                            <SelectValue placeholder="Select flavor *" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(flavoursQ.data || []).map((f: any) => (
                                                                <SelectItem key={f.id} value={String(f.id)}>
                                                                    {f.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={catalogForm.wholesaleSizeId}
                                                        onValueChange={(v) => setCatalogForm({ ...catalogForm, wholesaleSizeId: v })}
                                                    >
                                                        <SelectTrigger className="text-xs h-8">
                                                            <SelectValue placeholder="Select wholesale size *" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(sizesQ.data || []).filter((s: any) => s.active).map((size: any) => (
                                                                <SelectItem key={size.id} value={String(size.id)}>
                                                                    {size.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        placeholder="Price ($) *"
                                                        type="number"
                                                        step="0.01"
                                                        value={catalogForm.priceDollars}
                                                        onChange={(e) => setCatalogForm({ ...catalogForm, priceDollars: e.target.value })}
                                                        className="text-xs h-8"
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddToCatalogIdx(null)}>Cancel</Button>
                                                        <Button size="sm" className="h-7 text-xs" onClick={handleCatalogSave} disabled={catalogSaving}>
                                                            {catalogSaving ? "Adding…" : "Add & Match"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(idx, "quantity", e.target.value)
                                                }
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="Price $"
                                                value={item.unitPriceDollars}
                                                onChange={(e) =>
                                                    updateItem(idx, "unitPriceDollars", e.target.value)
                                                }
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end gap-1 pt-1">
                                            {item.matched && (
                                                <Check className="h-4 w-4 text-green-500" />
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-400 h-8 w-8 p-0"
                                                onClick={() => removeItem(idx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={addItem}>
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Item
                                    </Button>
                                    <div className="flex-1" />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={saveMutation.isPending}
                                    >
                                        <Save className="mr-1 h-3 w-3" />
                                        {saveMutation.isPending ? "Saving…" : "Save Items"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* ── View Mode ── */
                            <>
                                {(order.items || []).some((i: any) => !i.matched) && (
                                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                        <p className="text-sm text-amber-700">
                                            {(order.items || []).filter((i: any) => !i.matched).length} item(s) not matched to catalog — click to add or edit.
                                        </p>
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-slate-50">
                                            <th className="px-3 py-2 text-left font-medium">Item</th>
                                            <th className="px-3 py-2 text-center font-medium">Qty</th>
                                            <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                                            <th className="px-3 py-2 text-center font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(order.items || []).map((item: any, idx: number) => (
                                            <tr key={item.id} className={`border-b ${!item.matched ? "bg-amber-50/50" : ""}`}>
                                                <td className="px-3 py-2">
                                                    {item.productDescription}
                                                    {item.notes && (
                                                        <p className="text-xs text-yellow-600">{item.notes}</p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right">
                                                    {item.unitPriceCents > 0
                                                        ? formatCents(item.unitPriceCents)
                                                        : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {item.matched ? (
                                                        <Check className="mx-auto h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                                                                onClick={() => openAddToCatalog(idx)}
                                                            >
                                                                <PackagePlus className="h-3 w-3" />
                                                                Add to Catalog
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {addToCatalogIdx !== null && !editing && (
                                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-amber-800">
                                                Add "{(order.items || [])[addToCatalogIdx]?.productDescription}" to Catalog
                                            </p>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddToCatalogIdx(null)}>
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <Select
                                                value={catalogForm.flavourId}
                                                onValueChange={(v) => setCatalogForm({ ...catalogForm, flavourId: v })}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="Select flavor *" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(flavoursQ.data || []).map((f: any) => (
                                                        <SelectItem key={f.id} value={String(f.id)}>
                                                            {f.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={catalogForm.wholesaleSizeId}
                                                onValueChange={(v) => setCatalogForm({ ...catalogForm, wholesaleSizeId: v })}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="Select wholesale size *" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(sizesQ.data || []).filter((s: any) => s.active).map((size: any) => (
                                                        <SelectItem key={size.id} value={String(size.id)}>
                                                            {size.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Input
                                            placeholder="Price ($) *"
                                            type="number"
                                            step="0.01"
                                            value={catalogForm.priceDollars}
                                            onChange={(e) => setCatalogForm({ ...catalogForm, priceDollars: e.target.value })}
                                            className="text-sm"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="ghost" onClick={() => setAddToCatalogIdx(null)}>Cancel</Button>
                                            <Button size="sm" onClick={handleCatalogSave} disabled={catalogSaving}>
                                                <PackagePlus className="mr-1 h-3.5 w-3.5" />
                                                {catalogSaving ? "Adding…" : "Add to Catalog & Match"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {order.subtotalCents > 0 && (
                                    <p className="mt-2 text-right font-medium">
                                        Subtotal: {formatCents(order.subtotalCents)}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Payment tracking */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Payment</h3>
                            {!paymentEdit && (
                                <Button size="sm" variant="ghost" onClick={() => {
                                    setPaymentForm({
                                        paymentStatus: order.paymentStatus || "unpaid",
                                        paymentMethod: order.paymentMethod || "",
                                        paymentNotes: order.paymentNotes || "",
                                    });
                                    setPaymentEdit(true);
                                }}>
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                            )}
                        </div>
                        {paymentEdit ? (
                            <div className="space-y-2 rounded-lg border p-3">
                                <div className="flex gap-2">
                                    <Select value={paymentForm.paymentStatus} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentStatus: v })}>
                                        <SelectTrigger className="w-32 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unpaid">Unpaid</SelectItem>
                                            <SelectItem value="invoiced">Invoiced</SelectItem>
                                            <SelectItem value="partial">Partial</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}>
                                        <SelectTrigger className="w-36 text-sm">
                                            <SelectValue placeholder="Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="check">Check</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="wire">Wire/ACH</SelectItem>
                                            <SelectItem value="square_invoice">Square Invoice</SelectItem>
                                            <SelectItem value="manual">Manual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input
                                    placeholder="Payment notes (check #, reference...)"
                                    value={paymentForm.paymentNotes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentNotes: e.target.value })}
                                    className="text-sm"
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="ghost" onClick={() => setPaymentEdit(false)}>Cancel</Button>
                                    <Button size="sm" onClick={() => paymentMutation.mutate(paymentForm)} disabled={paymentMutation.isPending}>
                                        {paymentMutation.isPending ? "Saving…" : "Save Payment"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-600">Status:</span>
                                    <Badge className={
                                        order.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                                            order.paymentStatus === "invoiced" ? "bg-blue-100 text-blue-800" :
                                                order.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-800" :
                                                    "bg-gray-100 text-slate-700"
                                    }>
                                        {order.paymentStatus || "unpaid"}
                                    </Badge>
                                    {!order.squareInvoiceId && order.subtotalCents > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="ml-auto text-xs h-7"
                                            disabled={invoiceMutation.isPending}
                                            onClick={() => invoiceMutation.mutate()}
                                        >
                                            <Receipt className="h-3 w-3 mr-1" />
                                            {invoiceMutation.isPending ? "Sending…" : "Send Invoice"}
                                        </Button>
                                    )}
                                    {order.squareInvoiceId && (
                                        <span className="ml-auto flex items-center gap-2">
                                            <span className="text-xs text-blue-600 flex items-center gap-1">
                                                <Receipt className="h-3 w-3" /> Invoice sent
                                            </span>
                                            {order.squareInvoicePublicUrl && (
                                                <a
                                                    href={order.squareInvoicePublicUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-[#A1AB74] hover:underline flex items-center gap-1"
                                                >
                                                    <ExternalLink className="h-3 w-3" /> View
                                                </a>
                                            )}
                                            {order.paymentStatus !== "paid" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-7 text-red-600"
                                                    disabled={voidInvoiceMutation.isPending}
                                                    onClick={() => voidInvoiceMutation.mutate()}
                                                >
                                                    {voidInvoiceMutation.isPending ? "Voiding…" : "Void Invoice"}
                                                </Button>
                                            )}
                                        </span>
                                    )}
                                </div>
                                {order.paymentMethod && (
                                    <div><span className="text-slate-600">Method:</span> <span className="text-slate-800">{order.paymentMethod.replace(/_/g, " ")}</span></div>
                                )}
                                {order.paymentNotes && (
                                    <div><span className="text-slate-600">Notes:</span> <span className="text-slate-800">{order.paymentNotes}</span></div>
                                )}
                                {order.paidAt && (
                                    <div><span className="text-slate-600">Paid:</span> <span className="text-slate-800">{new Date(order.paidAt).toLocaleDateString()}</span></div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Original email */}
                    <div>
                        <h3 className="mb-2 font-semibold">Original Email</h3>
                        <div className="rounded-lg border bg-slate-50 p-4">
                            <p className="mb-1 text-xs text-slate-600">
                                Subject: {order.originalEmailSubject}
                            </p>
                            <pre className="whitespace-pre-wrap text-sm text-slate-800">
                                {order.originalEmailBody}
                            </pre>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                        {order.status === "pending_review" && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={confirmDate}
                                    onChange={(e) => setConfirmDate(e.target.value)}
                                    className="w-44"
                                    placeholder="Delivery date"
                                />
                                <Button
                                    onClick={() => onConfirm(confirmDate || undefined)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="mr-1 h-4 w-4" />
                                    Confirm Order
                                </Button>
                            </div>
                        )}
                        {order.status === "confirmed" && (
                            <Button
                                onClick={() => productionStartMutation.mutate()}
                                variant="outline"
                                disabled={productionStartMutation.isPending}
                            >
                                <Factory className="mr-1 h-4 w-4" />
                                {productionStartMutation.isPending ? "Starting…" : "Start Production"}
                            </Button>
                        )}
                        {order.status === "in_production" && (
                            <Button
                                onClick={() => productionCompleteMutation.mutate()}
                                variant="outline"
                                disabled={productionCompleteMutation.isPending}
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                {productionCompleteMutation.isPending ? "Completing…" : "Production Complete"}
                            </Button>
                        )}
                        {order.status === "ready" && (
                            <Button
                                onClick={() => onStatusChange("delivered")}
                                variant="outline"
                            >
                                Mark Delivered
                            </Button>
                        )}
                        {order.status !== "cancelled" && order.status !== "delivered" && (
                            <Button
                                onClick={() => onStatusChange("cancelled")}
                                variant="ghost"
                                className="text-red-600"
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════
// ── Customers Tab ──
// ═══════════════════════════════════════

function CustomersTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [showAdd, setShowAdd] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const customersQ = useQuery({
        queryKey: ["wholesale-customers", debouncedSearch],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (debouncedSearch) params.search = debouncedSearch;
            return api.getWholesaleCustomers(params);
        },
    });

    const customers = customersQ.data || [];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                    <Input
                        placeholder="Search customers…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => setShowAdd(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Customer
                </Button>
            </div>

            <p className="text-sm text-slate-600">
                Click a customer to view details, edit profile, and manage their mapped email addresses.
                Any email mapped to a customer will be recognized when they send an order.
            </p>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left">
                                    <th className="px-4 py-3 font-medium">Business</th>
                                    <th className="px-4 py-3 font-medium">Contact</th>
                                    <th className="px-4 py-3 font-medium">Emails</th>
                                    <th className="px-4 py-3 font-medium">Locations</th>
                                    <th className="px-4 py-3 font-medium">Delivery</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((c: any) => {
                                    const aliases = Array.isArray(c.emailAliases) ? c.emailAliases : [];
                                    const allEmails = [c.email, ...aliases];
                                    return (
                                        <tr
                                            key={c.id}
                                            className="border-b cursor-pointer hover:bg-slate-50"
                                            onClick={() => setSelectedId(c.id)}
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                {c.businessName}
                                            </td>
                                            <td className="px-4 py-3">{c.contactName}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-700">
                                                    {c.email}
                                                </span>
                                                {aliases.length > 0 && (
                                                    <span className="ml-1 text-xs text-slate-600">
                                                        +{aliases.length} alias{aliases.length !== 1 ? "es" : ""}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.locations && c.locations.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {c.locations.map((loc: any) => (
                                                            <span key={loc.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
                                                                <MapPin className="w-2.5 h-2.5" />{loc.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 capitalize">
                                                {c.deliveryMethod}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    className={
                                                        c.status === "active"
                                                            ? "bg-green-100 text-green-800"
                                                            : c.status === "pending"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-gray-100 text-slate-700"
                                                    }
                                                >
                                                    {c.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {customers.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-8 text-center text-slate-600"
                                        >
                                            No wholesale customers yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {showAdd && (
                <AddCustomerDialog
                    onClose={() => setShowAdd(false)}
                    onSaved={() => {
                        setShowAdd(false);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-customers"] });
                        toast({ title: "Customer added" });
                    }}
                />
            )}

            {selectedId && (
                <CustomerDetailDialog
                    customerId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onUpdated={() => {
                        queryClient.invalidateQueries({ queryKey: ["wholesale-customers"] });
                        toast({ title: "Customer updated" });
                    }}
                />
            )}
        </div>
    );
}

// ── Customer Detail / Edit Dialog ──

function CustomerDetailDialog({
    customerId,
    onClose,
    onUpdated,
}: {
    customerId: number;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<any>(null);
    const [newAlias, setNewAlias] = useState("");
    const [saving, setSaving] = useState(false);
    const [staffForm, setStaffForm] = useState({ username: "", password: "", locationId: 0 });
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [staffSaving, setStaffSaving] = useState(false);
    const [showAddVendorLocation, setShowAddVendorLocation] = useState(false);
    const [vendorLocForm, setVendorLocForm] = useState({ name: "", address: "", city: "", state: "PA", zip: "", phone: "", notes: "", isDefault: false });
    const [vendorLocSaving, setVendorLocSaving] = useState(false);
    const [resendingWelcome, setResendingWelcome] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const customerQ = useQuery({
        queryKey: ["wholesale-customer", customerId],
        queryFn: () => api.getWholesaleCustomer(customerId),
    });

    const locationsQ = useQuery({
        queryKey: ["locations"],
        queryFn: () => api.getLocations(),
    });
    const vendorLocations = (locationsQ.data || []).filter((l: any) => l.type === "vendor" && l.active);

    const customer = customerQ.data;

    const startEditing = () => {
        if (!customer) return;
        setForm({
            businessName: customer.businessName,
            contactName: customer.contactName,
            email: customer.email,
            emailAliases: Array.isArray(customer.emailAliases) ? [...customer.emailAliases] : [],
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            deliveryMethod: customer.deliveryMethod,
            deliveryNotes: customer.deliveryNotes,
            adminNotes: customer.adminNotes || "",
            status: customer.status,
            locationIds: (customer.locations || []).map((l: any) => l.id),
        });
        setEditing(true);
    };

    const addAlias = () => {
        const trimmed = newAlias.trim().toLowerCase();
        if (!trimmed || !trimmed.includes("@")) return;
        if (trimmed === form.email || form.emailAliases.includes(trimmed)) return;
        setForm({ ...form, emailAliases: [...form.emailAliases, trimmed] });
        setNewAlias("");
    };

    const removeAlias = (alias: string) => {
        setForm({
            ...form,
            emailAliases: form.emailAliases.filter((a: string) => a !== alias),
        });
    };

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        try {
            await api.updateWholesaleCustomer(customerId, form);
            onUpdated();
            setEditing(false);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (!customer) return null;

    const aliases = Array.isArray(customer.emailAliases) ? customer.emailAliases : [];

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {customer.businessName}
                        <Badge
                            className={
                                customer.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : customer.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-slate-700"
                            }
                        >
                            {customer.status}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                {editing && form ? (
                    /* ── Edit Mode ── */
                    <div className="space-y-3">
                        <Input
                            placeholder="Business Name *"
                            value={form.businessName}
                            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                        />
                        <Input
                            placeholder="Contact Name"
                            value={form.contactName}
                            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                        />
                        <Input
                            placeholder="Primary Email *"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />

                        {/* Email aliases */}
                        <div className="rounded-lg border p-3 space-y-2">
                            <p className="text-sm font-medium">
                                <Mail className="inline h-4 w-4 mr-1" />
                                Mapped Email Addresses
                            </p>
                            <p className="text-xs text-slate-600">
                                Orders from any of these addresses will be matched to this customer.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                <Badge className="bg-blue-100 text-blue-800">
                                    {form.email} (primary)
                                </Badge>
                                {form.emailAliases.map((alias: string) => (
                                    <Badge
                                        key={alias}
                                        className="bg-gray-100 text-slate-800 cursor-pointer hover:bg-red-100 hover:text-red-700"
                                        onClick={() => removeAlias(alias)}
                                    >
                                        {alias}
                                        <X className="ml-1 h-3 w-3" />
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add alias email…"
                                    type="email"
                                    value={newAlias}
                                    onChange={(e) => setNewAlias(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addAlias();
                                        }
                                    }}
                                    className="text-sm"
                                />
                                <Button size="sm" variant="outline" onClick={addAlias}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <Input
                            placeholder="Phone"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                        <Input
                            placeholder="Address"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                                placeholder="City"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                            />
                            <Input
                                placeholder="State"
                                value={form.state}
                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                            />
                            <Input
                                placeholder="ZIP"
                                value={form.zip}
                                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Select
                                value={form.deliveryMethod}
                                onValueChange={(v) => setForm({ ...form, deliveryMethod: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                    <SelectItem value="pickup">Pickup</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={form.status}
                                onValueChange={(v) => setForm({ ...form, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Textarea
                            placeholder="Delivery notes"
                            value={form.deliveryNotes}
                            onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
                        />
                        <Textarea
                            placeholder="Admin notes (internal only)"
                            value={form.adminNotes}
                            onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
                        />
                        {vendorLocations.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Vendor Locations</label>
                                <div className="flex flex-wrap gap-2">
                                    {vendorLocations.map((loc: any) => (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            onClick={() => {
                                                const ids = form.locationIds.includes(loc.id)
                                                    ? form.locationIds.filter((id: number) => id !== loc.id)
                                                    : [...form.locationIds, loc.id];
                                                setForm({ ...form, locationIds: ids });
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5 ${form.locationIds.includes(loc.id)
                                                ? "bg-purple-100 text-purple-800 border-purple-400"
                                                : "bg-white text-slate-700 border-slate-200 hover:border-gray-400"
                                                }`}
                                        >
                                            <MapPin className="w-3.5 h-3.5" /> {loc.name}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-600">Map this partner to their vendor locations for staff access.</p>
                            </div>
                        )}
                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="ghost" onClick={() => setEditing(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                <Save className="mr-1 h-4 w-4" />
                                {saving ? "Saving…" : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* ── View Mode ── */
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button size="sm" variant="outline" onClick={startEditing}>
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit Customer
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                            <div>
                                <p className="text-xs text-slate-600">Contact</p>
                                <p className="font-medium">{customer.contactName || "—"}</p>
                                <p className="text-sm text-slate-700">{customer.phone || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600">Delivery</p>
                                <p className="font-medium capitalize">{customer.deliveryMethod}</p>
                                {customer.deliveryNotes && (
                                    <p className="text-sm text-slate-700">{customer.deliveryNotes}</p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-slate-600">Address</p>
                                <p className="text-sm">
                                    {customer.address
                                        ? `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}`
                                        : "No address on file"}
                                </p>
                            </div>
                        </div>

                        {/* Email mapping display */}
                        <div className="rounded-lg border p-3">
                            <p className="text-sm font-medium mb-2">
                                <Mail className="inline h-4 w-4 mr-1" />
                                Mapped Email Addresses
                            </p>
                            <p className="text-xs text-slate-600 mb-2">
                                Emails from any of these addresses will be matched to this customer. Click "Edit Customer" to add or remove.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                <Badge className="bg-blue-100 text-blue-800">
                                    {customer.email} (primary)
                                </Badge>
                                {aliases.map((alias: string) => (
                                    <Badge key={alias} className="bg-gray-100 text-slate-800">
                                        {alias}
                                    </Badge>
                                ))}
                                {aliases.length === 0 && (
                                    <span className="text-xs text-slate-600">
                                        No additional aliases
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Admin notes */}
                        {customer.adminNotes && (
                            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                                <p className="text-xs text-yellow-700 font-medium mb-1">Admin Notes</p>
                                <p className="text-sm text-yellow-800">{customer.adminNotes}</p>
                            </div>
                        )}

                        {/* Mapped Locations */}
                        <div className="rounded-lg border p-3">
                            <p className="text-sm font-medium mb-2">
                                <MapPin className="inline h-4 w-4 mr-1" />
                                Vendor Locations
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {(customer.locations || []).length > 0 ? (
                                    (customer.locations || []).map((loc: any) => (
                                        <Badge key={loc.id} className="bg-purple-100 text-purple-700">
                                            <MapPin className="w-3 h-3 mr-1" />{loc.name}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-600">No locations mapped. Click "Edit Customer" to add.</span>
                                )}
                            </div>
                        </div>

                        {/* Vendor Delivery Addresses */}
                        <div className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">
                                    <MapPin className="inline h-4 w-4 mr-1" />
                                    Delivery Addresses
                                </p>
                                <Button size="sm" variant="outline" onClick={() => { setShowAddVendorLocation(!showAddVendorLocation); setVendorLocForm({ name: "", address: "", city: "", state: "PA", zip: "", phone: "", notes: "", isDefault: false }); }}>
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add Address
                                </Button>
                            </div>
                            <p className="text-xs text-slate-600 mb-2">
                                Physical delivery addresses for this vendor (where Urban Churn delivers to).
                            </p>
                            {showAddVendorLocation && (
                                <div className="rounded-lg bg-slate-50 p-3 mb-3 space-y-2">
                                    <Input placeholder="Location name (e.g. Main Store) *" value={vendorLocForm.name} onChange={(e) => setVendorLocForm({ ...vendorLocForm, name: e.target.value })} className="text-sm" />
                                    <Input placeholder="Address" value={vendorLocForm.address} onChange={(e) => setVendorLocForm({ ...vendorLocForm, address: e.target.value })} className="text-sm" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input placeholder="City" value={vendorLocForm.city} onChange={(e) => setVendorLocForm({ ...vendorLocForm, city: e.target.value })} className="text-sm" />
                                        <Input placeholder="State" value={vendorLocForm.state} onChange={(e) => setVendorLocForm({ ...vendorLocForm, state: e.target.value })} className="text-sm" />
                                        <Input placeholder="ZIP" value={vendorLocForm.zip} onChange={(e) => setVendorLocForm({ ...vendorLocForm, zip: e.target.value })} className="text-sm" />
                                    </div>
                                    <Input placeholder="Phone" value={vendorLocForm.phone} onChange={(e) => setVendorLocForm({ ...vendorLocForm, phone: e.target.value })} className="text-sm" />
                                    <Input placeholder="Notes / delivery instructions" value={vendorLocForm.notes} onChange={(e) => setVendorLocForm({ ...vendorLocForm, notes: e.target.value })} className="text-sm" />
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={vendorLocForm.isDefault} onChange={(e) => setVendorLocForm({ ...vendorLocForm, isDefault: e.target.checked })} />
                                        Set as default delivery address
                                    </label>
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => setShowAddVendorLocation(false)}>Cancel</Button>
                                        <Button
                                            size="sm"
                                            disabled={vendorLocSaving || !vendorLocForm.name.trim()}
                                            onClick={async () => {
                                                setVendorLocSaving(true);
                                                try {
                                                    await api.createWholesaleVendorLocation(customerId, vendorLocForm);
                                                    queryClient.invalidateQueries({ queryKey: ["wholesale-customer", customerId] });
                                                    setShowAddVendorLocation(false);
                                                    toast({ title: "Delivery address added" });
                                                } catch (e: any) {
                                                    toast({ title: "Error", description: e.message, variant: "destructive" });
                                                } finally {
                                                    setVendorLocSaving(false);
                                                }
                                            }}
                                        >
                                            {vendorLocSaving ? "Saving…" : "Save Address"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {(customer.vendorLocations || []).length > 0 ? (
                                <div className="space-y-1">
                                    {(customer.vendorLocations || []).map((loc: any) => (
                                        <div key={loc.id} className="flex items-start justify-between rounded-lg border p-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-medium">{loc.name}</span>
                                                    {loc.isDefault && <Badge className="bg-green-100 text-green-700 text-xs">Default</Badge>}
                                                </div>
                                                {loc.address && <p className="text-xs text-slate-600">{loc.address}{loc.city ? `, ${loc.city}` : ""}{loc.state ? `, ${loc.state}` : ""} {loc.zip}</p>}
                                                {loc.phone && <p className="text-xs text-slate-600">{loc.phone}</p>}
                                                {loc.notes && <p className="text-xs text-slate-600 italic">{loc.notes}</p>}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-700 h-7 w-7 p-0 flex-shrink-0"
                                                onClick={async () => {
                                                    if (!confirm(`Remove delivery address "${loc.name}"?`)) return;
                                                    await api.deleteWholesaleVendorLocation(customerId, loc.id);
                                                    queryClient.invalidateQueries({ queryKey: ["wholesale-customer", customerId] });
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-600">No delivery addresses added yet.</p>
                            )}
                        </div>

                        {/* Portal Account / Resend Welcome */}
                        <div className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Wholesale Portal Access</p>
                                    <p className="text-xs text-slate-600 mt-0.5">Login: <span className="font-mono">{customer.email}</span> at <a href="/account/login" className="text-blue-600 underline">/account/login</a></p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={resendingWelcome}
                                    onClick={async () => {
                                        setResendingWelcome(true);
                                        try {
                                            await api.resendWholesaleWelcomeEmail(customerId);
                                            toast({ title: "Welcome email sent", description: "A new temporary password was sent to " + customer.email });
                                        } catch (e: any) {
                                            toast({ title: "Error", description: e.message, variant: "destructive" });
                                        } finally {
                                            setResendingWelcome(false);
                                        }
                                    }}
                                >
                                    {resendingWelcome ? "Sending…" : "Resend Welcome Email"}
                                </Button>
                            </div>
                        </div>

                        {/* Staff Accounts */}
                        <div className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">
                                    <Users className="inline h-4 w-4 mr-1" />
                                    Partner Staff Accounts
                                </p>
                                {(customer.locations || []).length > 0 && (
                                    <Button size="sm" variant="outline" onClick={() => {
                                        setStaffForm({ username: "", password: "", locationId: customer.locations[0]?.id || 0 });
                                        setShowStaffForm(!showStaffForm);
                                    }}>
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Staff
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 mb-2">
                                Staff accounts allow partner employees to log in and view pre-orders at their location.
                            </p>
                            {showStaffForm && (
                                <div className="rounded-lg bg-slate-50 p-3 mb-3 space-y-2">
                                    <Input
                                        placeholder="Username"
                                        value={staffForm.username}
                                        onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Password"
                                        type="password"
                                        value={staffForm.password}
                                        onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                                    />
                                    <Select
                                        value={String(staffForm.locationId)}
                                        onValueChange={(v) => setStaffForm({ ...staffForm, locationId: Number(v) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(customer.locations || []).map((loc: any) => (
                                                <SelectItem key={loc.id} value={String(loc.id)}>
                                                    {loc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => setShowStaffForm(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={staffSaving || !staffForm.username || !staffForm.password || !staffForm.locationId}
                                            onClick={async () => {
                                                setStaffSaving(true);
                                                try {
                                                    await api.createWholesaleCustomerStaff(customerId, staffForm);
                                                    queryClient.invalidateQueries({ queryKey: ["wholesale-customer", customerId] });
                                                    setShowStaffForm(false);
                                                    setStaffForm({ username: "", password: "", locationId: 0 });
                                                } catch (e: any) {
                                                    alert(e.message);
                                                } finally {
                                                    setStaffSaving(false);
                                                }
                                            }}
                                        >
                                            {staffSaving ? "Creating…" : "Create Account"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {(customer.staffAccounts || []).length > 0 ? (
                                <div className="space-y-1">
                                    {(customer.staffAccounts || []).map((s: any) => {
                                        const locName = (customer.locations || []).find((l: any) => l.id === s.assignedLocationId)?.name || "Unknown";
                                        return (
                                            <div key={s.id} className="flex items-center justify-between rounded-lg border p-2">
                                                <div>
                                                    <span className="text-sm font-medium">{s.username}</span>
                                                    <span className="ml-2 text-xs text-slate-600">{locName}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                                                    onClick={async () => {
                                                        if (!confirm(`Remove staff account "${s.username}"?`)) return;
                                                        await api.deleteWholesaleCustomerStaff(customerId, s.id);
                                                        queryClient.invalidateQueries({ queryKey: ["wholesale-customer", customerId] });
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-600">No staff accounts created yet.</p>
                            )}
                        </div>

                        {/* Order history */}
                        <div>
                            <h3 className="font-semibold mb-2">
                                Order History ({(customer.orders || []).length})
                            </h3>
                            {(customer.orders || []).length > 0 ? (
                                <div className="space-y-1">
                                    {(customer.orders || []).map((o: any) => (
                                        <div
                                            key={o.id}
                                            className="flex items-center gap-3 rounded-lg border p-3"
                                        >
                                            <span className="font-mono text-xs">
                                                {o.orderNumber}
                                            </span>
                                            <Badge
                                                className={
                                                    orderStatusColors[o.status] ||
                                                    "bg-gray-100"
                                                }
                                            >
                                                {o.status.replace(/_/g, " ")}
                                            </Badge>
                                            {o.subtotalCents > 0 && (
                                                <span className="text-sm">
                                                    {formatCents(o.subtotalCents)}
                                                </span>
                                            )}
                                            <span className="ml-auto text-xs text-slate-600">
                                                {new Date(o.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-600">No orders yet</p>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ── Add Customer Dialog ──

function AddCustomerDialog({
    onClose,
    onSaved,
}: {
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        businessName: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "PA",
        zip: "",
        deliveryMethod: "delivery",
        deliveryNotes: "",
        locationIds: [] as number[],
    });
    const [saving, setSaving] = useState(false);

    const locationsQ = useQuery({
        queryKey: ["locations"],
        queryFn: () => api.getLocations(),
    });
    const vendorLocations = (locationsQ.data || []).filter((l: any) => l.type === "vendor" && l.active);

    const handleSave = async () => {
        if (!form.businessName || !form.email) return;
        setSaving(true);
        try {
            await api.createWholesaleCustomer(form);
            onSaved();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Wholesale Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder="Business Name *"
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    />
                    <Input
                        placeholder="Contact Name"
                        value={form.contactName}
                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    />
                    <Input
                        placeholder="Email *"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <Input
                        placeholder="Phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    <Input
                        placeholder="Address"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                            placeholder="City"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                        <Input
                            placeholder="State"
                            value={form.state}
                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                        />
                        <Input
                            placeholder="ZIP"
                            value={form.zip}
                            onChange={(e) => setForm({ ...form, zip: e.target.value })}
                        />
                    </div>
                    <Select
                        value={form.deliveryMethod}
                        onValueChange={(v) => setForm({ ...form, deliveryMethod: v })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="pickup">Pickup</SelectItem>
                        </SelectContent>
                    </Select>
                    <Textarea
                        placeholder="Delivery notes (standing instructions)"
                        value={form.deliveryNotes}
                        onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
                    />
                    {vendorLocations.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Vendor Locations</label>
                            <div className="flex flex-wrap gap-2">
                                {vendorLocations.map((loc: any) => (
                                    <button
                                        key={loc.id}
                                        type="button"
                                        onClick={() => {
                                            const ids = form.locationIds.includes(loc.id)
                                                ? form.locationIds.filter((id: number) => id !== loc.id)
                                                : [...form.locationIds, loc.id];
                                            setForm({ ...form, locationIds: ids });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5 ${form.locationIds.includes(loc.id)
                                            ? "bg-purple-100 text-purple-800 border-purple-400"
                                            : "bg-white text-slate-700 border-slate-200 hover:border-gray-400"
                                            }`}
                                    >
                                        <MapPin className="w-3.5 h-3.5" /> {loc.name}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-600">Map this partner to their vendor locations for staff access.</p>
                        </div>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? "Saving…" : "Add Customer"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════
// ── Products Tab ──
// ═══════════════════════════════════════

type CatalogView = "standard" | "exclusive" | "customer";

function catalogQueryParams(view: CatalogView, customerId: string): Record<string, string> {
    if (view === "customer" && customerId) {
        return { catalog: "customer", customerId };
    }
    return { catalog: view };
}

type FlavourAvailabilityFilter = "all" | "available" | "hidden";
type FlavourSetupFilter = "all" | "setup" | "not_setup";
type FlavourSeasonalFilter = "all" | "seasonal" | "year_round";

/** Manual portal visibility — set explicitly via pencil or bulk actions, not derived from sizes. */
function isFlavourVisibleInPortal(flavour: { id?: number | null; active?: boolean }) {
    if (!flavour.id) return false;
    return flavour.active !== false;
}

function flavourHasWholesaleProducts(flavourId: number, products: any[]) {
    return products.some((p) => p.flavourId === flavourId && p.wholesaleSizeId);
}

function isFlavourWholesaleSetup(flavour: { id?: number | null; flavourId: number }, products: any[]) {
    return !!flavour.id || flavourHasWholesaleProducts(flavour.flavourId, products);
}

function resolveCanonicalSizes(sizes: any[]) {
    return WHOLESALE_CANONICAL_SIZES.map((def) => ({
        ...def,
        size: sizes.find((s) => s.slug === def.slug),
    }));
}

function getFlavourEnabledSizeIds(flavourId: number, products: any[]) {
    return new Set(
        products
            .filter((p) => p.flavourId === flavourId && p.available !== false && p.wholesaleSizeId)
            .map((p) => p.wholesaleSizeId as number),
    );
}

type SizePricingRow = { enabled: boolean; priceDollars: string };

function buildInitialSizePricing(
    flavourId: number,
    products: any[],
    canonicalSizes: ReturnType<typeof resolveCanonicalSizes>,
): Record<string, SizePricingRow> {
    const rows: Record<string, SizePricingRow> = {};
    for (const { slug, size } of canonicalSizes) {
        if (!size) {
            rows[slug] = { enabled: false, priceDollars: "" };
            continue;
        }
        const product = products.find(
            (p) => p.flavourId === flavourId && p.wholesaleSizeId === size.id,
        );
        rows[slug] = {
            enabled: product?.available !== false && !!product,
            priceDollars: product ? (product.priceCents / 100).toFixed(2) : "",
        };
    }
    return rows;
}

function enabledSizesMissingPrice(
    pricing: Record<string, SizePricingRow>,
    canonicalSizes: ReturnType<typeof resolveCanonicalSizes>,
) {
    return canonicalSizes
        .filter(({ slug, size }) => size && pricing[slug]?.enabled)
        .some(({ slug }) => !parsePriceDollars(pricing[slug]?.priceDollars || ""));
}

function parsePriceDollars(value: string): number {
    const cents = Math.round(parseFloat(value) * 100);
    return Number.isFinite(cents) && cents > 0 ? cents : 0;
}

function buildMatrixCellsFromPricing(
    flavourId: number,
    pricing: Record<string, SizePricingRow>,
    canonicalSizes: ReturnType<typeof resolveCanonicalSizes>,
    products: any[] = [],
) {
    const cells: {
        flavourId: number;
        wholesaleSizeId: number;
        priceCents: number;
        available: boolean;
        enabled: boolean;
    }[] = [];

    for (const { slug, size } of canonicalSizes) {
        if (!size) continue;
        const row = pricing[slug];
        if (!row) continue;

        const existing = products.find(
            (p) => p.flavourId === flavourId && p.wholesaleSizeId === size.id,
        );

        if (row.enabled) {
            const priceCents = parsePriceDollars(row.priceDollars);
            if (!priceCents) continue;
            cells.push({
                flavourId,
                wholesaleSizeId: size.id,
                priceCents,
                available: true,
                enabled: true,
            });
        } else if (existing) {
            cells.push({
                flavourId,
                wholesaleSizeId: size.id,
                priceCents: existing.priceCents,
                available: false,
                enabled: false,
            });
        }
    }

    return cells;
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div>
                <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                {description && <p className="text-xs text-slate-600 mt-0.5">{description}</p>}
            </div>
            {children}
        </div>
    );
}

function WholesaleSizePricingEditor({
    canonicalSizes,
    pricing,
    onPricingChange,
    onEnsureSizes,
    ensuringSizes,
    showPriceColumn = true,
}: {
    canonicalSizes: ReturnType<typeof resolveCanonicalSizes>;
    pricing: Record<string, SizePricingRow>;
    onPricingChange: (slug: string, patch: Partial<SizePricingRow>) => void;
    onEnsureSizes?: () => void;
    ensuringSizes?: boolean;
    showPriceColumn?: boolean;
}) {
    const missingCount = canonicalSizes.filter(({ size }) => !size).length;

    return (
        <div className="space-y-3">
            {missingCount > 0 && onEnsureSizes && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-medium">
                        {missingCount} standard size{missingCount === 1 ? "" : "s"} not in the catalog yet
                    </p>
                    <p className="text-xs mt-0.5 text-amber-800">
                        Add Pint, Half Gallon, 1.5 Gallon, and 3 Gallon before enabling or pricing.
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 bg-white"
                        disabled={ensuringSizes}
                        onClick={onEnsureSizes}
                    >
                        {ensuringSizes ? "Adding sizes…" : "Add standard package sizes"}
                    </Button>
                </div>
            )}
            <div className="rounded-md border border-slate-200 overflow-hidden">
                <div className={`grid ${showPriceColumn ? "grid-cols-[auto_1fr_7rem]" : "grid-cols-[auto_1fr]"} gap-2 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700`}>
                    <span>Order</span>
                    <span>Size</span>
                    {showPriceColumn && <span className="text-right">Price ($)</span>}
                </div>
                {canonicalSizes.map(({ slug, label, size }) => {
                    const row = pricing[slug] ?? { enabled: false, priceDollars: "" };
                    const disabled = !size;

                    return (
                        <div
                            key={slug}
                            className={`grid ${showPriceColumn ? "grid-cols-[auto_1fr_7rem]" : "grid-cols-[auto_1fr]"} gap-2 items-center border-t border-slate-200 px-3 py-2 bg-white ${disabled ? "opacity-60" : ""}`}
                        >
                            <Checkbox
                                checked={row.enabled}
                                disabled={disabled}
                                onCheckedChange={(checked) =>
                                    onPricingChange(slug, { enabled: checked === true })
                                }
                                aria-label={`Enable ${label}`}
                            />
                            <span className="text-sm text-slate-900">{label}</span>
                            {showPriceColumn && (
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    disabled={disabled || !row.enabled}
                                    className="h-8 text-sm text-right"
                                    value={row.priceDollars}
                                    onChange={(e) =>
                                        onPricingChange(slug, { priceDollars: e.target.value })
                                    }
                                    placeholder="0.00"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function filterWholesaleFlavours(
    flavours: any[],
    products: any[],
    search: string,
    availability: FlavourAvailabilityFilter,
    setup: FlavourSetupFilter,
    seasonal: FlavourSeasonalFilter,
) {
    const q = search.trim().toLowerCase();
    return flavours.filter((f) => {
        if (q) {
            const haystack = [
                f.flavourName,
                f.description,
                f.allergens,
                ...(f.exclusiveCustomers || []).map((c: any) => c.businessName),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            if (!haystack.includes(q)) return false;
        }

        const visible = isFlavourVisibleInPortal(f);
        if (availability === "available" && !visible) return false;
        if (availability === "hidden" && visible) return false;

        const wholesaleSetup = isFlavourWholesaleSetup(f, products);
        if (setup === "setup" && !wholesaleSetup) return false;
        if (setup === "not_setup" && wholesaleSetup) return false;

        if (seasonal === "seasonal" && !f.isSeasonal) return false;
        if (seasonal === "year_round" && f.isSeasonal) return false;

        return true;
    });
}

function ProductsTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [catalogView, setCatalogView] = useState<CatalogView>("standard");
    const [customerFilterId, setCustomerFilterId] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [showSizeDialog, setShowSizeDialog] = useState(false);
    const [editingSize, setEditingSize] = useState<any | null>(null);
    const [showFlavourDialog, setShowFlavourDialog] = useState(false);
    const [showCreateFullFlavour, setShowCreateFullFlavour] = useState(false);
    const [showCreateExclusiveFlavour, setShowCreateExclusiveFlavour] = useState(false);
    const [editingFlavour, setEditingFlavour] = useState<any | null>(null);
    const [flavourSearch, setFlavourSearch] = useState("");
    const [availabilityFilter, setAvailabilityFilter] = useState<FlavourAvailabilityFilter>("all");
    const [setupFilter, setSetupFilter] = useState<FlavourSetupFilter>("all");
    const [seasonalFilter, setSeasonalFilter] = useState<FlavourSeasonalFilter>("all");
    const [selectedFlavourIds, setSelectedFlavourIds] = useState<Set<number>>(new Set());
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [bulkSizePricing, setBulkSizePricing] = useState<Record<string, SizePricingRow>>(() =>
        Object.fromEntries(
            WHOLESALE_CANONICAL_SIZES.map((s) => [s.slug, { enabled: false, priceDollars: "" }]),
        ),
    );
    const [ensuringSizes, setEnsuringSizes] = useState(false);

    const debouncedFlavourSearch = useDebounce(flavourSearch, 200);

    const catalogParams = catalogQueryParams(catalogView, customerFilterId);

    const productsQ = useQuery({
        queryKey: ["wholesale-products", catalogView, customerFilterId],
        queryFn: () => api.getWholesaleProducts(catalogParams),
        enabled: catalogView !== "customer" || !!customerFilterId,
    });

    const sizesQ = useQuery({
        queryKey: ["wholesale-sizes"],
        queryFn: api.getWholesaleSizes,
    });

    const wholesaleFlavoursQ = useQuery({
        queryKey: ["wholesale-flavours", catalogView, customerFilterId],
        queryFn: () => api.getWholesaleFlavours(catalogParams),
        enabled: catalogView !== "customer" || !!customerFilterId,
    });

    const customersQ = useQuery({
        queryKey: ["wholesale-customers-list"],
        queryFn: () => api.getWholesaleCustomers({ status: "active" }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteWholesaleProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            toast({ title: "Product deleted" });
        },
    });

    const deleteSizeMutation = useMutation({
        mutationFn: (id: number) => api.deleteWholesaleSize(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-sizes"] });
            toast({ title: "Size deleted" });
        },
        onError: (err: any) => {
            toast({ title: "Could not delete size", description: err.message, variant: "destructive" });
        },
    });

    const products = productsQ.data || [];
    const sizes = sizesQ.data || [];
    const wholesaleFlavours = wholesaleFlavoursQ.data || [];
    const customers = customersQ.data || [];

    const canonicalSizes = useMemo(() => resolveCanonicalSizes(sizes), [sizes]);

    const allCanonicalSizeIds = useMemo(
        () => canonicalSizes.map((s) => s.size?.id).filter((id): id is number => !!id),
        [canonicalSizes],
    );

    const filteredFlavours = useMemo(
        () =>
            filterWholesaleFlavours(
                wholesaleFlavours,
                products,
                debouncedFlavourSearch,
                availabilityFilter,
                setupFilter,
                seasonalFilter,
            ),
        [wholesaleFlavours, products, debouncedFlavourSearch, availabilityFilter, setupFilter, seasonalFilter],
    );

    const ensureCanonicalSizes = async () => {
        setEnsuringSizes(true);
        try {
            await api.ensureWholesaleCanonicalSizes();
            await queryClient.invalidateQueries({ queryKey: ["wholesale-sizes"] });
            toast({ title: "Standard package sizes ready" });
        } catch (err: any) {
            toast({ title: "Could not add sizes", description: err.message, variant: "destructive" });
        } finally {
            setEnsuringSizes(false);
        }
    };

    const updateBulkSizePricing = (slug: string, patch: Partial<SizePricingRow>) => {
        setBulkSizePricing((prev) => ({
            ...prev,
            [slug]: { ...prev[slug], ...patch },
        }));
    };

    const allFilteredSelected =
        filteredFlavours.length > 0 &&
        filteredFlavours.every((f: any) => selectedFlavourIds.has(f.flavourId));

    const toggleFlavourSelection = (flavourId: number) => {
        setSelectedFlavourIds((prev) => {
            const next = new Set(prev);
            if (next.has(flavourId)) next.delete(flavourId);
            else next.add(flavourId);
            return next;
        });
    };

    const toggleAllFilteredFlavours = () => {
        if (allFilteredSelected) {
            setSelectedFlavourIds((prev) => {
                const next = new Set(prev);
                for (const f of filteredFlavours) next.delete(f.flavourId);
                return next;
            });
        } else {
            setSelectedFlavourIds((prev) => {
                const next = new Set(prev);
                for (const f of filteredFlavours) next.add(f.flavourId);
                return next;
            });
        }
    };

    const bulkSelectedSizeIds = useMemo(() => {
        const ids = new Set<number>();
        for (const { slug, size } of canonicalSizes) {
            if (size && bulkSizePricing[slug]?.enabled) ids.add(size.id);
        }
        return ids;
    }, [canonicalSizes, bulkSizePricing]);

    const bulkApplySizeAvailability = async () => {
        const ids = [...selectedFlavourIds];
        if (ids.length === 0 || bulkSelectedSizeIds.size === 0) return;

        if (enabledSizesMissingPrice(bulkSizePricing, canonicalSizes)) {
            toast({ title: "Enter a price for each enabled size", variant: "destructive" });
            return;
        }

        setBulkUpdating(true);
        try {
            const cells = ids.flatMap((flavourId) =>
                buildMatrixCellsFromPricing(
                    flavourId,
                    bulkSizePricing,
                    canonicalSizes,
                    products,
                ).filter((c) => c.enabled),
            );
            if (cells.length > 0) {
                await api.saveWholesaleProductMatrix(cells);
            }
            queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            toast({
                title: "Sizes and prices applied",
                description: `${ids.length} flavour(s), ${cells.length} size slot(s) updated`,
            });
        } catch (err: any) {
            toast({ title: "Size update failed", description: err.message, variant: "destructive" });
        } finally {
            setBulkUpdating(false);
        }
    };

    const bulkHideSelectedSizes = async () => {
        const ids = [...selectedFlavourIds];
        if (ids.length === 0 || bulkSelectedSizeIds.size === 0) return;

        setBulkUpdating(true);
        try {
            const result = await api.bulkUpdateWholesaleSizeAvailability({
                flavourIds: ids,
                wholesaleSizeIds: [...bulkSelectedSizeIds],
                enabled: false,
            });
            setBulkSizePricing((prev) => {
                const next = { ...prev };
                for (const { slug, size } of canonicalSizes) {
                    if (size && bulkSelectedSizeIds.has(size.id) && next[slug]) {
                        next[slug] = { ...next[slug], enabled: false };
                    }
                }
                return next;
            });
            queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            toast({
                title: "Package sizes hidden",
                description: `${result.total ?? 0} size slot(s) removed from ordering`,
            });
        } catch (err: any) {
            toast({ title: "Size update failed", description: err.message, variant: "destructive" });
        } finally {
            setBulkUpdating(false);
        }
    };

    const bulkDisableAllSizes = async () => {
        const ids = [...selectedFlavourIds];
        if (ids.length === 0 || allCanonicalSizeIds.length === 0) return;

        setBulkUpdating(true);
        try {
            const result = await api.bulkUpdateWholesaleSizeAvailability({
                flavourIds: ids,
                wholesaleSizeIds: allCanonicalSizeIds,
                enabled: false,
            });
            queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            toast({
                title: "Sizes disabled for selected flavours",
                description: `${result.total ?? 0} size slot(s) hidden from ordering`,
            });
        } catch (err: any) {
            toast({ title: "Size update failed", description: err.message, variant: "destructive" });
        } finally {
            setBulkUpdating(false);
        }
    };

    const bulkSetFlavourActive = async (active: boolean) => {
        const ids = [...selectedFlavourIds];
        if (ids.length === 0) return;
        setBulkUpdating(true);
        try {
            const result = await api.bulkUpdateWholesaleFlavourActive(ids, active);
            setSelectedFlavourIds(new Set());
            queryClient.invalidateQueries({ queryKey: ["wholesale-flavours"] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            toast({
                title: active ? "Flavours set to visible" : "Flavours set to hidden",
                description: `${result.total ?? ids.length} flavour(s) updated`,
            });
        } catch (err: any) {
            toast({ title: "Bulk update failed", description: err.message, variant: "destructive" });
        } finally {
            setBulkUpdating(false);
        }
    };

    const catalogTitle =
        catalogView === "standard"
            ? "Standard catalog — visible to all wholesale clients"
            : catalogView === "exclusive"
              ? "Exclusive flavours — only visible to assigned clients"
              : customerFilterId
                ? `Portal view for ${customers.find((c: any) => String(c.id) === customerFilterId)?.businessName || "customer"}`
                : "Select a customer to preview their catalogue";

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 space-y-2">
                <p className="font-medium">How wholesale flavours work</p>
                <ul className="text-blue-800/90 space-y-1 list-disc list-inside">
                    <li><strong>Create New Flavour</strong> — adds a brand-new flavour name, wholesale profile, and optional size pricing.</li>
                    <li><strong>Pencil icon</strong> on any row — set up or edit wholesale metadata, package sizes, per-size pricing, catalog access, and availability.</li>
                    <li><strong>Visibility</strong> — you choose whether each flavour is visible or hidden in the client portal (pencil icon or bulk actions). Separate from package sizes and prices.</li>
                    <li><strong>Search & multi-select</strong> — bulk set visibility, or apply package sizes and prices to many flavours at once.</li>
                </ul>
            </div>

            <Card>
                <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                { key: "standard" as const, label: "Standard Catalog" },
                                { key: "exclusive" as const, label: "Exclusive Flavours" },
                                { key: "customer" as const, label: "Preview by Client" },
                            ] as const
                        ).map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setCatalogView(key)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                    catalogView === key
                                        ? key === "exclusive"
                                            ? "bg-violet-600 text-white"
                                            : "bg-[#A1AB74] text-white"
                                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {catalogView === "customer" && (
                        <Select value={customerFilterId} onValueChange={setCustomerFilterId}>
                            <SelectTrigger className="max-w-md">
                                <SelectValue placeholder="Choose wholesale client…" />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((c: any) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.businessName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <p className="text-sm text-slate-700">{catalogTitle}</p>
                </CardContent>
            </Card>

            <div className="flex justify-between flex-wrap gap-3">
                <p className="text-sm font-medium text-slate-800">
                    {catalogView === "exclusive"
                        ? "Create flavours only specific clients can order."
                        : "Manage sizes, then set prices per flavour×size in the matrix."}
                </p>
                <div className="flex flex-wrap gap-2">
                    {catalogView === "exclusive" && (
                        <Button onClick={() => setShowCreateExclusiveFlavour(true)}>
                            <Plus className="mr-1 h-4 w-4" />
                            New Exclusive Flavour
                        </Button>
                    )}
                    {catalogView === "standard" && (
                        <Button variant="outline" onClick={() => setShowCreateFullFlavour(true)}>
                            <Plus className="mr-1 h-4 w-4" />
                            Create New Flavour
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => { setEditingSize(null); setShowSizeDialog(true); }}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Size
                    </Button>
                    <Button onClick={() => setShowAdd(true)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Price Row
                    </Button>
                </div>
            </div>

            {(catalogView !== "customer" || customerFilterId) && (
                <WholesaleProductMatrix
                    flavours={filteredFlavours}
                    sizes={sizes}
                    products={products}
                />
            )}

            <Card>
                <CardHeader className="space-y-4">
                    <CardTitle>
                        {catalogView === "exclusive" ? "Exclusive Flavour Profiles" : "Wholesale Flavour Profiles"}
                    </CardTitle>
                    <div className="flex flex-col gap-3">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                            <Input
                                placeholder="Search flavours, allergens, clients…"
                                value={flavourSearch}
                                onChange={(e) => setFlavourSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Select
                                value={availabilityFilter}
                                onValueChange={(v) => setAvailabilityFilter(v as FlavourAvailabilityFilter)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Availability" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All availability</SelectItem>
                                    <SelectItem value="available">Visible</SelectItem>
                                    <SelectItem value="hidden">Hidden</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={setupFilter}
                                onValueChange={(v) => setSetupFilter(v as FlavourSetupFilter)}
                            >
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Setup" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All setup states</SelectItem>
                                    <SelectItem value="setup">Wholesale set up</SelectItem>
                                    <SelectItem value="not_setup">Not set up yet</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={seasonalFilter}
                                onValueChange={(v) => setSeasonalFilter(v as FlavourSeasonalFilter)}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="seasonal">Seasonal only</SelectItem>
                                    <SelectItem value="year_round">Year-round only</SelectItem>
                                </SelectContent>
                            </Select>
                            {(flavourSearch || availabilityFilter !== "all" || setupFilter !== "all" || seasonalFilter !== "all") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFlavourSearch("");
                                        setAvailabilityFilter("all");
                                        setSetupFilter("all");
                                        setSeasonalFilter("all");
                                    }}
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                        {selectedFlavourIds.size > 0 && (
                            <div className="space-y-3 rounded-lg border border-[#A1AB74]/30 bg-[#A1AB74]/10 px-3 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-slate-800">
                                        {selectedFlavourIds.size} flavour{selectedFlavourIds.size === 1 ? "" : "s"} selected
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-white"
                                        disabled={bulkUpdating}
                                        onClick={() => bulkSetFlavourActive(true)}
                                    >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Set visible
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-white"
                                        disabled={bulkUpdating}
                                        onClick={() => bulkSetFlavourActive(false)}
                                    >
                                        <EyeOff className="h-4 w-4 mr-1" />
                                        Set hidden
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSelectedFlavourIds(new Set())}
                                    >
                                        Clear selection
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-700">
                                    <strong>Visibility</strong> is your manual on/off for the client portal.
                                    Package sizes and prices below are separate — a visible flavour still needs sizes enabled to be orderable.
                                </p>
                                <div className="border-t border-[#A1AB74]/20 pt-3 space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Package sizes &amp; pricing</p>
                                        <p className="text-xs text-slate-700">
                                            Check sizes to offer and set a price for each. Applies to all selected flavours.
                                        </p>
                                        <div className="mt-2">
                                            <WholesaleSizePricingEditor
                                                canonicalSizes={canonicalSizes}
                                                pricing={bulkSizePricing}
                                                onPricingChange={updateBulkSizePricing}
                                                onEnsureSizes={ensureCanonicalSizes}
                                                ensuringSizes={ensuringSizes}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                disabled={bulkUpdating || bulkSelectedSizeIds.size === 0}
                                                onClick={bulkApplySizeAvailability}
                                            >
                                                Apply sizes &amp; prices
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-white"
                                                disabled={bulkUpdating || bulkSelectedSizeIds.size === 0}
                                                onClick={bulkHideSelectedSizes}
                                            >
                                                Hide checked sizes
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-white"
                                                disabled={bulkUpdating}
                                                onClick={bulkDisableAllSizes}
                                            >
                                                Hide all sizes
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-slate-600">
                            Showing {filteredFlavours.length} of {wholesaleFlavours.length} flavours
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left">
                                    <th className="px-4 py-3 w-10">
                                        <Checkbox
                                            checked={allFilteredSelected}
                                            onCheckedChange={toggleAllFilteredFlavours}
                                            aria-label="Select all filtered flavours"
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-medium">Flavour</th>
                                    <th className="px-4 py-3 font-medium">Catalog</th>
                                    <th className="px-4 py-3 font-medium">Assigned Clients</th>
                                    <th className="px-4 py-3 font-medium">Allergens</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Visibility</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFlavours.map((f: any) => (
                                    <tr
                                        key={f.flavourId}
                                        className={`border-b hover:bg-slate-50 ${!isFlavourVisibleInPortal(f) ? "opacity-60" : ""} ${selectedFlavourIds.has(f.flavourId) ? "bg-[#A1AB74]/5" : ""}`}
                                    >
                                        <td className="px-4 py-3">
                                            <Checkbox
                                                checked={selectedFlavourIds.has(f.flavourId)}
                                                onCheckedChange={() => toggleFlavourSelection(f.flavourId)}
                                                aria-label={`Select ${f.flavourName}`}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium">{f.flavourName}</span>
                                                {!isFlavourWholesaleSetup(f, products) && (
                                                    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                                                        Not set up — click pencil
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-600 line-clamp-2 max-w-[28rem]">{f.description || "—"}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {f.isExclusive ? (
                                                <Badge className="bg-violet-100 text-violet-800">Exclusive</Badge>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-700">Standard</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {f.isExclusive ? (
                                                <div className="flex flex-wrap gap-1 max-w-[14rem]">
                                                    {(f.exclusiveCustomers || []).length === 0 ? (
                                                        <span className="text-xs text-amber-600">No clients assigned</span>
                                                    ) : (
                                                        f.exclusiveCustomers.map((c: any) => (
                                                            <Badge key={c.id} variant="outline" className="text-[10px]">
                                                                {c.businessName}
                                                            </Badge>
                                                        ))
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600">All clients</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{f.allergens || "—"}</td>
                                        <td className="px-4 py-3">
                                            <Badge className={f.isSeasonal ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"}>
                                                {f.isSeasonal ? "Seasonal" : "Standard"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge className={isFlavourVisibleInPortal(f) ? "bg-green-100 text-green-700" : "bg-gray-100 text-slate-700"}>
                                                {isFlavourVisibleInPortal(f) ? "Visible" : "Hidden"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    title={f.id ? "Edit wholesale metadata and catalog access" : "Set up wholesale for this flavour"}
                                                    onClick={() => { setEditingFlavour(f); setShowFlavourDialog(true); }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-500"
                                                    onClick={async () => {
                                                        try {
                                                            if (f.id) {
                                                                await api.deleteWholesaleFlavour(f.id);
                                                            } else {
                                                                await api.createWholesaleFlavour({ flavourId: f.flavourId, active: false });
                                                            }
                                                            queryClient.invalidateQueries({ queryKey: ["wholesale-flavours"] });
                                                            toast({ title: "Flavour profile archived" });
                                                        } catch (err: any) {
                                                            toast({ title: "Error", description: err.message, variant: "destructive" });
                                                        }
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredFlavours.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-slate-600">
                                            No flavours match your search or filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Wholesale Sizes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left">
                                    <th className="px-4 py-3 font-medium">Size</th>
                                    <th className="px-4 py-3 font-medium">Description</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sizes.map((size: any) => (
                                    <tr key={size.id} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{size.name}</div>
                                            <div className="text-xs text-slate-600">/{size.slug}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{size.description || "—"}</td>
                                        <td className="px-4 py-3">
                                            <Badge className={size.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-slate-700"}>
                                                {size.active ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => { setEditingSize(size); setShowSizeDialog(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-500"
                                                    onClick={() => {
                                                        if (confirm(`Delete wholesale size \"${size.name}\"?`)) {
                                                            deleteSizeMutation.mutate(size.id);
                                                        }
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sizes.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                                            No wholesale sizes configured
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left">
                                    <th className="px-4 py-3 font-medium">Flavour</th>
                                    <th className="px-4 py-3 font-medium">Size / Packaging</th>
                                    <th className="px-4 py-3 font-medium">Price</th>
                                    <th className="px-4 py-3 font-medium">Available</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p: any) => (
                                    <tr key={p.id} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-3">{p.flavourName}</td>
                                        <td className="px-4 py-3">
                                            {p.sizeName || p.name}
                                            {(p.sizeDescription || p.unitDescription) && (
                                                <span className="ml-2 text-xs text-slate-600">
                                                    ({p.sizeDescription || p.unitDescription})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatCents(p.priceCents)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.available ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <X className="h-4 w-4 text-red-400" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500"
                                                onClick={() => {
                                                    if (confirm("Delete this product?"))
                                                        deleteMutation.mutate(p.id);
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-8 text-center text-slate-600"
                                        >
                                            No wholesale products configured
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {showAdd && (
                <AddProductDialog
                    wholesaleFlavours={wholesaleFlavours.filter((f: any) => f.active)}
                    sizes={sizes}
                    onClose={() => setShowAdd(false)}
                    onSaved={() => {
                        setShowAdd(false);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
                        toast({ title: "Product added" });
                    }}
                />
            )}

            {showCreateFullFlavour && (
                <CreateFullFlavourDialog
                    sizes={sizes}
                    onClose={() => setShowCreateFullFlavour(false)}
                    onSaved={() => {
                        setShowCreateFullFlavour(false);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-flavours"] });
                        queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
                        queryClient.invalidateQueries({ queryKey: ["flavours"] });
                        toast({ title: "Flavour created" });
                    }}
                />
            )}

            {showCreateExclusiveFlavour && (
                <CreateExclusiveFlavourDialog
                    sizes={sizes}
                    customers={customers}
                    onClose={() => setShowCreateExclusiveFlavour(false)}
                    onSaved={() => {
                        setShowCreateExclusiveFlavour(false);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-flavours"] });
                        queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
                        queryClient.invalidateQueries({ queryKey: ["flavours"] });
                        toast({ title: "Exclusive flavour created" });
                    }}
                />
            )}

            {showFlavourDialog && editingFlavour && (
                <AddWholesaleFlavourDialog
                    customers={customers}
                    canonicalSizes={canonicalSizes}
                    products={products}
                    flavour={editingFlavour}
                    onEnsureSizes={ensureCanonicalSizes}
                    ensuringSizes={ensuringSizes}
                    onClose={() => {
                        setShowFlavourDialog(false);
                        setEditingFlavour(null);
                    }}
                    onSaved={() => {
                        const wasSetup = !isFlavourWholesaleSetup(editingFlavour, products);
                        setShowFlavourDialog(false);
                        setEditingFlavour(null);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-flavours"] });
                        queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
                        toast({ title: wasSetup ? "Wholesale flavour set up" : "Flavour profile updated" });
                    }}
                />
            )}

            {showSizeDialog && (
                <AddWholesaleSizeDialog
                    size={editingSize}
                    onClose={() => {
                        setShowSizeDialog(false);
                        setEditingSize(null);
                    }}
                    onSaved={() => {
                        setShowSizeDialog(false);
                        setEditingSize(null);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-sizes"] });
                        toast({ title: editingSize ? "Size updated" : "Size added" });
                    }}
                />
            )}
        </div>
    );
}

// ── Add Product Dialog ──

function AddProductDialog({
    wholesaleFlavours,
    sizes,
    onClose,
    onSaved,
}: {
    wholesaleFlavours: any[];
    sizes: any[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        flavourId: "",
        wholesaleSizeId: "",
        priceDollars: "",
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.flavourId || !form.wholesaleSizeId || !form.priceDollars) return;
        setSaving(true);
        try {
            await api.createWholesaleProduct({
                flavourId: parseInt(form.flavourId),
                wholesaleSizeId: parseInt(form.wholesaleSizeId),
                priceCents: Math.round(parseFloat(form.priceDollars) * 100),
            });
            onSaved();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Wholesale Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Select
                        value={form.flavourId}
                        onValueChange={(v) => setForm({ ...form, flavourId: v })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select flavor *" />
                        </SelectTrigger>
                        <SelectContent>
                            {wholesaleFlavours.map((f: any) => (
                                <SelectItem key={f.flavourId} value={String(f.flavourId)}>
                                    {f.flavourName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={form.wholesaleSizeId}
                        onValueChange={(v) => setForm({ ...form, wholesaleSizeId: v })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select wholesale size *" />
                        </SelectTrigger>
                        <SelectContent>
                            {sizes.filter((size: any) => size.active).map((size: any) => (
                                <SelectItem key={size.id} value={String(size.id)}>
                                    {size.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Price ($) *"
                        type="number"
                        step="0.01"
                        value={form.priceDollars}
                        onChange={(e) => setForm({ ...form, priceDollars: e.target.value })}
                    />
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? "Saving…" : "Add Product"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function CreateFullFlavourDialog({
    sizes,
    onClose,
    onSaved,
}: {
    sizes: any[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        name: "",
        description: "",
        allergens: "",
        isSeasonal: false,
        defaultPriceDollars: "",
        enableAllSizes: true,
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const defaultPriceCents = form.defaultPriceDollars
                ? Math.round(parseFloat(form.defaultPriceDollars) * 100)
                : undefined;
            await api.createWholesaleFlavourFull({
                name: form.name.trim(),
                description: form.description,
                allergens: form.allergens,
                isSeasonal: form.isSeasonal,
                sizeIds: form.enableAllSizes ? sizes.filter((s) => s.active).map((s) => s.id) : undefined,
                defaultPriceCents,
            });
            onSaved();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Flavour</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder="Flavour name *"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <Textarea
                        placeholder="Description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={2}
                    />
                    <Input
                        placeholder="Allergens"
                        value={form.allergens}
                        onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isSeasonal}
                            onChange={(e) => setForm({ ...form, isSeasonal: e.target.checked })}
                        />
                        Seasonal
                    </label>
                    <Input
                        placeholder="Default price for all sizes ($)"
                        type="number"
                        step="0.01"
                        value={form.defaultPriceDollars}
                        onChange={(e) => setForm({ ...form, defaultPriceDollars: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.enableAllSizes}
                            onChange={(e) => setForm({ ...form, enableAllSizes: e.target.checked })}
                        />
                        Enable all active sizes with default price
                    </label>
                    <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
                        {saving ? "Creating…" : "Create Flavour"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

type CatalogAccess = "all" | "exclusive";

function CatalogVisibilityFields({
    catalogAccess,
    onCatalogAccessChange,
    customers,
    customerIds,
    onCustomerIdsChange,
}: {
    catalogAccess: CatalogAccess;
    onCatalogAccessChange: (value: CatalogAccess) => void;
    customers: any[];
    customerIds: number[];
    onCustomerIdsChange: (ids: number[]) => void;
}) {
    return (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">Who can order this flavour?</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                    type="radio"
                    name="catalogAccess"
                    checked={catalogAccess === "all"}
                    onChange={() => onCatalogAccessChange("all")}
                    className="mt-0.5"
                />
                <span>
                    <strong>All wholesale clients</strong>
                    <span className="block text-xs text-slate-600">Standard catalog — everyone sees it in their portal</span>
                </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                    type="radio"
                    name="catalogAccess"
                    checked={catalogAccess === "exclusive"}
                    onChange={() => onCatalogAccessChange("exclusive")}
                    className="mt-0.5"
                />
                <span>
                    <strong>Specific clients only</strong>
                    <span className="block text-xs text-slate-600">Exclusive — hidden from all other clients</span>
                </span>
            </label>
            {catalogAccess === "exclusive" && (
                <CustomerAssignmentPicker
                    customers={customers}
                    selectedIds={customerIds}
                    onChange={onCustomerIdsChange}
                    searchPlaceholder="Search clients to assign…"
                />
            )}
        </div>
    );
}

function CustomerAssignmentPicker({
    customers,
    selectedIds,
    onChange,
    searchPlaceholder = "Search clients…",
}: {
    customers: any[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    searchPlaceholder?: string;
}) {
    const [search, setSearch] = useState("");
    const filtered = customers.filter((c) =>
        c.businessName?.toLowerCase().includes(search.toLowerCase()),
    );

    const toggle = (id: number) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    return (
        <div className="space-y-2">
            <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <ScrollArea className="h-48 rounded-md border p-2">
                <div className="space-y-1">
                    {filtered.length === 0 ? (
                        <p className="text-sm text-slate-600 px-2 py-4 text-center">No clients match your search</p>
                    ) : (
                        filtered.map((c) => (
                            <label
                                key={c.id}
                                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50 cursor-pointer text-sm"
                            >
                                <Checkbox
                                    checked={selectedIds.includes(c.id)}
                                    onCheckedChange={() => toggle(c.id)}
                                />
                                <span>{c.businessName}</span>
                            </label>
                        ))
                    )}
                </div>
            </ScrollArea>
            <p className="text-xs text-slate-600">
                {selectedIds.length === 0
                    ? "Select at least one client for exclusive flavours"
                    : `${selectedIds.length} client${selectedIds.length === 1 ? "" : "s"} selected`}
            </p>
        </div>
    );
}

function CreateExclusiveFlavourDialog({
    sizes,
    customers,
    onClose,
    onSaved,
}: {
    sizes: any[];
    customers: any[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        name: "",
        description: "",
        allergens: "",
        isSeasonal: false,
        defaultPriceDollars: "",
        enableAllSizes: true,
    });
    const [customerIds, setCustomerIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name.trim() || customerIds.length === 0) return;
        setSaving(true);
        try {
            const defaultPriceCents = form.defaultPriceDollars
                ? Math.round(parseFloat(form.defaultPriceDollars) * 100)
                : undefined;
            await api.createWholesaleExclusiveFlavour({
                name: form.name.trim(),
                description: form.description,
                allergens: form.allergens,
                isSeasonal: form.isSeasonal,
                customerIds,
                sizeIds: form.enableAllSizes ? sizes.filter((s) => s.active).map((s) => s.id) : undefined,
                defaultPriceCents,
            });
            onSaved();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Exclusive Flavour</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-700 -mt-2">
                    This flavour will only appear in the portal for the clients you assign below.
                </p>
                <div className="space-y-3">
                    <Input
                        placeholder="Flavour name *"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <Textarea
                        placeholder="Description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={2}
                    />
                    <Input
                        placeholder="Allergens"
                        value={form.allergens}
                        onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isSeasonal}
                            onChange={(e) => setForm({ ...form, isSeasonal: e.target.checked })}
                        />
                        Seasonal
                    </label>
                    <div>
                        <p className="text-sm font-medium mb-2">Assign to clients *</p>
                        <CustomerAssignmentPicker
                            customers={customers}
                            selectedIds={customerIds}
                            onChange={setCustomerIds}
                        />
                    </div>
                    <Input
                        placeholder="Default price for all sizes ($)"
                        type="number"
                        step="0.01"
                        value={form.defaultPriceDollars}
                        onChange={(e) => setForm({ ...form, defaultPriceDollars: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.enableAllSizes}
                            onChange={(e) => setForm({ ...form, enableAllSizes: e.target.checked })}
                        />
                        Enable all active sizes with default price
                    </label>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !form.name.trim() || customerIds.length === 0}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                    >
                        {saving ? "Creating…" : "Create Exclusive Flavour"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AddWholesaleFlavourDialog({
    customers,
    canonicalSizes,
    products,
    flavour,
    onClose,
    onSaved,
    onEnsureSizes,
    ensuringSizes,
}: {
    customers: any[];
    canonicalSizes: ReturnType<typeof resolveCanonicalSizes>;
    products: any[];
    flavour: any;
    onClose: () => void;
    onSaved: () => void;
    onEnsureSizes: () => void;
    ensuringSizes: boolean;
}) {
    const isFirstSetup = !isFlavourWholesaleSetup(flavour, products);
    const [form, setForm] = useState({
        flavourId: String(flavour.flavourId),
        description: flavour.description || "",
        allergens: flavour.allergens || "",
        isSeasonal: flavour.isSeasonal ?? false,
        active: flavour.active === true,
        sortOrder: String(flavour.sortOrder ?? 0),
    });
    const [catalogAccess, setCatalogAccess] = useState<CatalogAccess>(
        flavour.isExclusive ? "exclusive" : "all",
    );
    const [customerIds, setCustomerIds] = useState<number[]>(
        (flavour.exclusiveCustomers || []).map((c: any) => c.id),
    );
    const [sizePricing, setSizePricing] = useState<Record<string, SizePricingRow>>(() =>
        buildInitialSizePricing(flavour.flavourId, products, canonicalSizes),
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSizePricing((prev) => {
            const initial = buildInitialSizePricing(flavour.flavourId, products, canonicalSizes);
            const next = { ...prev };
            let changed = false;
            for (const { slug } of canonicalSizes) {
                if (!next[slug]) {
                    next[slug] = initial[slug];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [canonicalSizes, products, flavour.flavourId]);

    const updateSizePricing = (slug: string, patch: Partial<SizePricingRow>) => {
        setSizePricing((prev) => ({
            ...prev,
            [slug]: { ...prev[slug], ...patch },
        }));
    };

    const handleSave = async () => {
        if (!form.flavourId) return;
        if (catalogAccess === "exclusive" && customerIds.length === 0) {
            alert("Select at least one client for exclusive flavours");
            return;
        }

        if (enabledSizesMissingPrice(sizePricing, canonicalSizes)) {
            alert("Enter a price for each enabled size");
            return;
        }

        setSaving(true);
        try {
            const isExclusive = catalogAccess === "exclusive";
            const payload: Record<string, unknown> = {
                flavourId: parseInt(form.flavourId),
                description: form.description,
                allergens: form.allergens,
                isSeasonal: form.isSeasonal,
                active: form.active,
                sortOrder: parseInt(form.sortOrder) || 0,
                isExclusive,
                customerIds: isExclusive ? customerIds : [],
            };

            if (flavour.id) {
                await api.updateWholesaleFlavour(flavour.id, payload);
            } else {
                await api.createWholesaleFlavour(payload);
            }

            const cells = buildMatrixCellsFromPricing(
                flavour.flavourId,
                sizePricing,
                canonicalSizes,
                products,
            );
            if (cells.length > 0) {
                await api.saveWholesaleProductMatrix(cells);
            }

            onSaved();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isFirstSetup ? "Set Up Wholesale Flavour" : "Edit Wholesale Flavour"}
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-700 -mt-2">
                    {isFirstSetup ? (
                        <>Configure wholesale settings for <strong>{flavour.flavourName}</strong>.</>
                    ) : (
                        <>Update metadata, package sizes, and catalog access for <strong>{flavour.flavourName}</strong>.</>
                    )}
                </p>
                <div className="space-y-4">
                    <FormSection title="Flavour">
                        <div className="text-sm font-medium">{flavour.flavourName}</div>
                    </FormSection>

                    <FormSection title="Wholesale details" description="Shown to clients in the ordering portal.">
                        <div className="space-y-2">
                            <Label htmlFor="wholesale-description">Description</Label>
                            <Textarea
                                id="wholesale-description"
                                placeholder="Wholesale description for this flavour"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wholesale-allergens">Allergens</Label>
                            <Input
                                id="wholesale-allergens"
                                placeholder="e.g. Dairy, Soy, Gluten"
                                value={form.allergens}
                                onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-800">
                            <Checkbox
                                checked={form.isSeasonal}
                                onCheckedChange={(checked) =>
                                    setForm({ ...form, isSeasonal: checked === true })
                                }
                            />
                            Seasonal flavour
                        </label>
                    </FormSection>

                    <FormSection
                        title="Portal visibility"
                        description="Your manual choice whether clients see this flavour in their ordering catalog. Does not change sizes or prices."
                    >
                        <label className="flex items-center gap-2 text-sm text-slate-800">
                            <Checkbox
                                checked={form.active}
                                onCheckedChange={(checked) =>
                                    setForm({ ...form, active: checked === true })
                                }
                            />
                            Visible in the wholesale portal
                        </label>
                        <div className="space-y-2">
                            <Label htmlFor="wholesale-sort-order">Sort order</Label>
                            <Input
                                id="wholesale-sort-order"
                                type="number"
                                value={form.sortOrder}
                                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                            />
                            <p className="text-xs text-slate-600">Lower numbers appear first in the portal.</p>
                        </div>
                    </FormSection>

                    <FormSection
                        title="Package sizes & pricing"
                        description="Check which sizes clients can order and set the price for each."
                    >
                        <WholesaleSizePricingEditor
                            canonicalSizes={canonicalSizes}
                            pricing={sizePricing}
                            onPricingChange={updateSizePricing}
                            onEnsureSizes={onEnsureSizes}
                            ensuringSizes={ensuringSizes}
                        />
                    </FormSection>

                    <CatalogVisibilityFields
                        catalogAccess={catalogAccess}
                        onCatalogAccessChange={(value) => {
                            setCatalogAccess(value);
                            if (value === "all") setCustomerIds([]);
                        }}
                        customers={customers}
                        customerIds={customerIds}
                        onCustomerIdsChange={setCustomerIds}
                    />

                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? "Saving…" : isFirstSetup ? "Set Up for Wholesale" : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AddWholesaleSizeDialog({
    size,
    onClose,
    onSaved,
}: {
    size?: any | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        name: size?.name || "",
        slug: size?.slug || "",
        description: size?.description || "",
        active: size?.active ?? true,
        sortOrder: String(size?.sortOrder ?? 0),
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim(),
                active: form.active,
                sortOrder: parseInt(form.sortOrder) || 0,
            };

            if (size?.id) {
                await api.updateWholesaleSize(size.id, payload);
            } else {
                await api.createWholesaleSize(payload);
            }

            onSaved();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{size ? "Edit Wholesale Size" : "Add Wholesale Size"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder="Size name *"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <Input
                        placeholder="Slug (optional)"
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    />
                    <Input
                        placeholder="Description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <Input
                        placeholder="Sort order"
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm({ ...form, active: e.target.checked })}
                        />
                        Active in wholesale catalog
                    </label>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? "Saving…" : size ? "Save Size" : "Add Size"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════
// ── Production Report Tab ──
// ═══════════════════════════════════════

function ProductionTab() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [from, setFrom] = useState(today.toISOString().slice(0, 10));
    const [to, setTo] = useState(nextWeek.toISOString().slice(0, 10));

    const reportQ = useQuery({
        queryKey: ["wholesale-production-report", from, to],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (from) params.from = from;
            if (to) params.to = to;
            return api.getWholesaleProductionReport(params);
        },
    });

    const report = reportQ.data || [];
    const totalUnits = report.reduce(
        (sum: number, r: any) => sum + (parseInt(r.totalQuantity) || 0),
        0,
    );

    const exportCSV = () => {
        if (report.length === 0) return;
        const header = "Flavor,Product / Size,Total Qty,Orders";
        const rows = report.map((r: any) =>
            `"${r.flavourName || "(unmatched)"}","${r.productName || "—"}",${r.totalQuantity},${r.orderCount}`,
        );
        rows.push(`"TOTAL","",${totalUnits},`);
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `production-sheet-${from}-to-${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const printSheet = () => {
        const printWin = window.open("", "_blank");
        if (!printWin) return;
        const rows = report
            .map(
                (r: any) =>
                    `<tr><td style="padding:6px 12px">${r.flavourName || "(unmatched)"}</td><td style="padding:6px 12px">${r.productName || "—"}</td><td style="padding:6px 12px;text-align:right;font-weight:bold">${r.totalQuantity}</td><td style="padding:6px 12px;text-align:right">${r.orderCount}</td></tr>`,
            )
            .join("");
        printWin.document.write(`<!DOCTYPE html><html><head><title>Production Sheet ${from} – ${to}</title>
          <style>body{font-family:system-ui,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd}th{background:#f5f5f5;padding:8px 12px;text-align:left}h1{font-size:20px}h2{font-size:14px;color:#666;margin-bottom:16px}</style>
          </head><body>
          <h1>Urban Churn — Wholesale Production Sheet</h1>
          <h2>${from} to ${to} · ${totalUnits} total units</h2>
          <table><thead><tr><th>Flavour</th><th>Product / Size</th><th style="text-align:right">Total Qty</th><th style="text-align:right">Orders</th></tr></thead>
          <tbody>${rows}<tr style="font-weight:bold;border-top:2px solid #333"><td colspan="2">TOTAL</td><td style="text-align:right;padding:6px 12px">${totalUnits}</td><td></td></tr></tbody></table>
          </body></html>`);
        printWin.document.close();
        printWin.print();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <p className="mb-1 text-xs font-medium text-slate-600">From</p>
                    <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-44"
                    />
                </div>
                <div>
                    <p className="mb-1 text-xs font-medium text-slate-600">To</p>
                    <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-44"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={exportCSV}
                        disabled={report.length === 0}
                    >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={printSheet}
                        disabled={report.length === 0}
                    >
                        Print Sheet
                    </Button>
                </div>
                <Card className="ml-auto">
                    <CardContent className="px-5 py-3">
                        <p className="text-xs text-slate-600">Total Units</p>
                        <p className="text-2xl font-bold">{totalUnits}</p>
                    </CardContent>
                </Card>
            </div>

            <p className="text-sm text-slate-600">
                Aggregated quantities across all confirmed & in-production orders
                with delivery dates in the selected range. Use this to plan your
                production batches.
            </p>

            {/* Production chart */}
            {report.length > 0 && (() => {
                // Aggregate by flavour for chart
                const byFlavour: Record<string, number> = {};
                report.forEach((r: any) => {
                    const name = r.flavourName || "(unmatched)";
                    byFlavour[name] = (byFlavour[name] || 0) + (parseInt(r.totalQuantity) || 0);
                });
                const chartData = Object.entries(byFlavour)
                    .map(([name, quantity]) => ({ name, quantity }))
                    .sort((a, b) => b.quantity - a.quantity);

                return (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BarChart3 className="h-4 w-4" />
                                Flavour Quantities
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ left: 100 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 11 }}
                                        width={95}
                                    />
                                    <Tooltip
                                        formatter={(v: number) => [v, "Units"]}
                                    />
                                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                                        {chartData.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                );
            })()}

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left">
                                    <th className="px-4 py-3 font-medium">Flavour</th>
                                    <th className="px-4 py-3 font-medium">Product / Size</th>
                                    <th className="px-4 py-3 text-right font-medium">Total Qty</th>
                                    <th className="px-4 py-3 text-right font-medium">Orders</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.map((r: any, i: number) => (
                                    <tr key={i} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">
                                            {r.flavourName || "(unmatched)"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.productName || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold">
                                            {r.totalQuantity}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {r.orderCount}
                                        </td>
                                    </tr>
                                ))}
                                {report.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-8 text-center text-slate-600"
                                        >
                                            No confirmed orders in this date range
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ═══════════════════════════════════════
// ── Delivery Schedule Tab ──
// ═══════════════════════════════════════

function DeliveriesTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const today = new Date();
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    const [view, setView] = useState<"calendar" | "list">("calendar");
    const [from, setFrom] = useState(today.toISOString().slice(0, 10));
    const [to, setTo] = useState(twoWeeks.toISOString().slice(0, 10));
    const [calMonth, setCalMonth] = useState(today);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [showCreateRun, setShowCreateRun] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

    // Delivery schedule data
    const scheduleQ = useQuery({
        queryKey: ["wholesale-delivery-schedule", from, to],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (from) params.from = from;
            if (to) params.to = to;
            return api.getWholesaleDeliverySchedule(params);
        },
    });

    // For calendar view — fetch wider range based on visible month
    const calFrom = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).toISOString().slice(0, 10);
    const calTo = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).toISOString().slice(0, 10);

    const calScheduleQ = useQuery({
        queryKey: ["wholesale-delivery-schedule", calFrom, calTo],
        queryFn: () => api.getWholesaleDeliverySchedule({ from: calFrom, to: calTo }),
        enabled: view === "calendar",
    });

    // Delivery runs for this range
    const runsQ = useQuery({
        queryKey: ["wholesale-delivery-runs", view === "calendar" ? calFrom : from, view === "calendar" ? calTo : to],
        queryFn: () => api.getWholesaleDeliveryRuns({
            from: view === "calendar" ? calFrom : from,
            to: view === "calendar" ? calTo : to,
        }),
    });

    const schedule = scheduleQ.data || [];
    const calSchedule = calScheduleQ.data || [];
    const runs = runsQ.data || [];

    // Group schedule by date
    const grouped = schedule.reduce((acc: Record<string, any[]>, item: any) => {
        const date = item.confirmedDeliveryDate || "Unscheduled";
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort((a, b) => {
        if (a === "Unscheduled") return 1;
        if (b === "Unscheduled") return -1;
        return a.localeCompare(b);
    });

    // Calendar: count deliveries per day
    const deliveryCountByDay: Record<string, number> = {};
    calSchedule.forEach((d: any) => {
        const date = d.confirmedDeliveryDate;
        if (date) deliveryCountByDay[date] = (deliveryCountByDay[date] || 0) + 1;
    });

    const calDaysWithDeliveries = Object.keys(deliveryCountByDay).map(
        (d) => new Date(d + "T12:00:00"),
    );

    // Orders for selected calendar day
    const dayOrders = selectedDay
        ? calSchedule.filter((d: any) => d.confirmedDeliveryDate === selectedDay)
        : [];

    // Runs for selected day
    const dayRuns = selectedDay
        ? runs.filter((r: any) => r.scheduledDate === selectedDay)
        : [];

    return (
        <div className="space-y-4">
            {/* Header: view toggle + date controls + create run button */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                    <button
                        onClick={() => setView("calendar")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === "calendar" ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-slate-100"}`}
                    >
                        <CalendarDays className="h-3.5 w-3.5" />
                        Calendar
                    </button>
                    <button
                        onClick={() => setView("list")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === "list" ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-slate-100"}`}
                    >
                        <List className="h-3.5 w-3.5" />
                        List
                    </button>
                </div>

                {view === "list" && (
                    <>
                        <div>
                            <p className="mb-1 text-xs font-medium text-slate-600">From</p>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
                        </div>
                        <div>
                            <p className="mb-1 text-xs font-medium text-slate-600">To</p>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
                        </div>
                    </>
                )}

                <div className="flex-1" />

                <Button size="sm" onClick={() => setShowCreateRun(true)}>
                    <Route className="mr-1 h-3.5 w-3.5" />
                    Create Run
                </Button>

                <Card>
                    <CardContent className="px-5 py-3">
                        <p className="text-xs text-slate-600">
                            {view === "calendar" ? "This Month" : "Deliveries"}
                        </p>
                        <p className="text-2xl font-bold">
                            {view === "calendar" ? calSchedule.length : schedule.length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {view === "calendar" ? (
                /* ── Calendar View ── */
                <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
                    {/* Calendar widget */}
                    <Card className="self-start">
                        <CardContent className="p-4">
                            <CalendarWidget
                                mode="single"
                                month={calMonth}
                                onMonthChange={setCalMonth}
                                selected={selectedDay ? new Date(selectedDay + "T12:00:00") : undefined}
                                onSelect={(day) => {
                                    if (day) {
                                        setSelectedDay(day.toISOString().slice(0, 10));
                                    }
                                }}
                                modifiers={{
                                    hasDelivery: calDaysWithDeliveries,
                                }}
                                modifiersClassNames={{
                                    hasDelivery: "ring-2 ring-green-400 ring-offset-1",
                                }}
                            />
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                                <span className="inline-block h-3 w-3 rounded-full ring-2 ring-green-400 ring-offset-1" />
                                Has deliveries
                            </div>
                        </CardContent>
                    </Card>

                    {/* Day detail panel */}
                    <div className="space-y-4">
                        {selectedDay ? (
                            <>
                                <h3 className="text-lg font-semibold">
                                    {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </h3>

                                {/* Orders for this day */}
                                {dayOrders.length > 0 ? (
                                    <Card>
                                        <CardContent className="p-0">
                                            <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
                                                <ShoppingCart className="h-4 w-4 text-slate-600" />
                                                <span className="font-medium text-sm">Orders</span>
                                                <Badge className="bg-gray-200 text-slate-800">
                                                    {dayOrders.length}
                                                </Badge>
                                            </div>
                                            <div className="divide-y">
                                                {dayOrders.map((d: any) => (
                                                    <div key={d.id} className="flex items-center gap-4 px-4 py-3">
                                                        <div className="flex-1">
                                                            <p className="font-medium">{d.customerName}</p>
                                                            <p className="text-sm text-slate-600">
                                                                {d.customerAddress
                                                                    ? `${d.customerAddress}, ${d.customerCity}`
                                                                    : "No address on file"}
                                                            </p>
                                                        </div>
                                                        <Badge className={orderStatusColors[d.status] || "bg-gray-100"}>
                                                            {d.status.replace(/_/g, " ")}
                                                        </Badge>
                                                        <div className="flex items-center gap-1 text-sm text-slate-600">
                                                            <Truck className="h-4 w-4" />
                                                            <span className="capitalize">{d.deliveryMethod}</span>
                                                        </div>
                                                        <span className="font-mono text-xs text-slate-600">{d.orderNumber}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card>
                                        <CardContent className="py-8 text-center text-slate-600">
                                            No deliveries on this date
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Runs for this day */}
                                {dayRuns.length > 0 && (
                                    <Card>
                                        <CardContent className="p-0">
                                            <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
                                                <Route className="h-4 w-4 text-slate-600" />
                                                <span className="font-medium text-sm">Delivery Runs</span>
                                                <Badge className="bg-gray-200 text-slate-800">
                                                    {dayRuns.length}
                                                </Badge>
                                            </div>
                                            <div className="divide-y">
                                                {dayRuns.map((run: any) => (
                                                    <div
                                                        key={run.id}
                                                        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50"
                                                        onClick={() => setSelectedRunId(run.id)}
                                                    >
                                                        <div className="flex-1">
                                                            <p className="font-medium">{run.name}</p>
                                                            {run.driverName && (
                                                                <p className="text-sm text-slate-600">
                                                                    Driver: {run.driverName}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Badge className={runStatusColors[run.status] || "bg-gray-100"}>
                                                            {run.status.replace(/_/g, " ")}
                                                        </Badge>
                                                        <span className="text-sm text-slate-600">
                                                            {run.stopCount || 0} stops
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center text-slate-600">
                                    <CalendarDays className="mx-auto mb-3 h-8 w-8" />
                                    <p>Select a date to see deliveries and runs</p>
                                    <p className="mt-1 text-xs">
                                        Dates with deliveries are highlighted with a green ring
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* All runs this month */}
                        {runs.length > 0 && (
                            <Card>
                                <CardContent className="p-0">
                                    <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
                                        <Route className="h-4 w-4 text-slate-600" />
                                        <span className="font-medium text-sm">All Runs This Month</span>
                                    </div>
                                    <div className="divide-y">
                                        {runs.map((run: any) => (
                                            <div
                                                key={run.id}
                                                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50"
                                                onClick={() => setSelectedRunId(run.id)}
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium">{run.name}</p>
                                                    <p className="text-xs text-slate-600">
                                                        {new Date(run.scheduledDate + "T12:00:00").toLocaleDateString("en-US", {
                                                            weekday: "short",
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                        {run.driverName ? ` · ${run.driverName}` : ""}
                                                    </p>
                                                </div>
                                                <Badge className={runStatusColors[run.status] || "bg-gray-100"}>
                                                    {run.status.replace(/_/g, " ")}
                                                </Badge>
                                                <span className="text-sm text-slate-600">{run.stopCount || 0} stops</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            ) : (
                /* ── List View ── */
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Upcoming deliveries grouped by date. Shows confirmed, in-production,
                        and ready orders so you can plan routes and drivers.
                    </p>

                    {sortedDates.length === 0 && (
                        <Card>
                            <CardContent className="py-8 text-center text-slate-600">
                                No deliveries scheduled in this date range
                            </CardContent>
                        </Card>
                    )}

                    {sortedDates.map((date) => (
                        <Card key={date}>
                            <CardContent className="p-0">
                                <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
                                    <Calendar className="h-4 w-4 text-slate-600" />
                                    <h3 className="font-semibold">
                                        {date === "Unscheduled"
                                            ? "Unscheduled"
                                            : new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                                                weekday: "long",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                    </h3>
                                    <Badge className="bg-gray-200 text-slate-800">
                                        {grouped[date].length} order{grouped[date].length !== 1 ? "s" : ""}
                                    </Badge>
                                </div>
                                <div className="divide-y">
                                    {grouped[date].map((d: any) => (
                                        <div key={d.id} className="flex items-center gap-4 px-4 py-3">
                                            <div className="flex-1">
                                                <p className="font-medium">{d.customerName}</p>
                                                <p className="text-sm text-slate-600">
                                                    {d.customerAddress
                                                        ? `${d.customerAddress}, ${d.customerCity}`
                                                        : "No address on file"}
                                                </p>
                                            </div>
                                            <Badge className={orderStatusColors[d.status] || "bg-gray-100"}>
                                                {d.status.replace(/_/g, " ")}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-sm text-slate-600">
                                                <Truck className="h-4 w-4" />
                                                <span className="capitalize">{d.deliveryMethod}</span>
                                            </div>
                                            <span className="font-mono text-xs text-slate-600">{d.orderNumber}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Run Dialog */}
            {showCreateRun && (
                <CreateRunDialog
                    defaultDate={selectedDay || today.toISOString().slice(0, 10)}
                    onClose={() => setShowCreateRun(false)}
                    onCreated={() => {
                        setShowCreateRun(false);
                        queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-runs"] });
                        toast({ title: "Delivery run created" });
                    }}
                />
            )}

            {/* Run Detail Dialog */}
            {selectedRunId && (
                <RunDetailDialog
                    runId={selectedRunId}
                    onClose={() => setSelectedRunId(null)}
                />
            )}
        </div>
    );
}

// ── Create Run Dialog ──

function CreateRunDialog({
    defaultDate,
    onClose,
    onCreated,
}: {
    defaultDate: string;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [form, setForm] = useState({
        name: "",
        scheduledDate: defaultDate,
        driverName: "",
        driverEmail: "",
        vehicleNotes: "",
        notes: "",
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name || !form.scheduledDate) return;
        setSaving(true);
        try {
            await api.createWholesaleDeliveryRun(form);
            onCreated();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Route className="h-5 w-5" />
                        Create Delivery Run
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder="Run name * (e.g. Monday AM Route)"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <Input
                        type="date"
                        value={form.scheduledDate}
                        onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    />
                    <Input
                        placeholder="Driver name"
                        value={form.driverName}
                        onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    />
                    <Input
                        placeholder="Driver email (will receive notification)"
                        type="email"
                        value={form.driverEmail}
                        onChange={(e) => setForm({ ...form, driverEmail: e.target.value })}
                    />
                    <Input
                        placeholder="Vehicle notes (e.g. Blue van, plate ABC-123)"
                        value={form.vehicleNotes}
                        onChange={(e) => setForm({ ...form, vehicleNotes: e.target.value })}
                    />
                    <Textarea
                        placeholder="Notes"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={2}
                    />
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? "Creating…" : "Create Run"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Run Detail Dialog ──

function RunDetailDialog({
    runId,
    onClose,
}: {
    runId: number;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [addingOrder, setAddingOrder] = useState(false);
    const [orderIdToAdd, setOrderIdToAdd] = useState("");

    const runQ = useQuery({
        queryKey: ["wholesale-delivery-run", runId],
        queryFn: () => api.getWholesaleDeliveryRun(runId),
    });

    // Fetch orders for the run's scheduled date to allow adding
    const ordersQ = useQuery({
        queryKey: ["wholesale-delivery-schedule", runQ.data?.scheduledDate, runQ.data?.scheduledDate],
        queryFn: () => api.getWholesaleDeliverySchedule({
            from: runQ.data?.scheduledDate,
            to: runQ.data?.scheduledDate,
        }),
        enabled: !!runQ.data?.scheduledDate && addingOrder,
    });

    const updateRunMutation = useMutation({
        mutationFn: (data: any) => api.updateWholesaleDeliveryRun(runId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-run", runId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-runs"] });
            toast({ title: "Run updated" });
        },
    });

    const addStopMutation = useMutation({
        mutationFn: (data: any) => api.addDeliveryRunStop(runId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-run", runId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-runs"] });
            setOrderIdToAdd("");
            toast({ title: "Stop added" });
        },
    });

    const updateStopMutation = useMutation({
        mutationFn: ({ stopId, data }: { stopId: number; data: any }) =>
            api.updateDeliveryRunStop(runId, stopId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-run", runId] });
        },
    });

    const removeStopMutation = useMutation({
        mutationFn: (stopId: number) => api.removeDeliveryRunStop(runId, stopId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-run", runId] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-runs"] });
            toast({ title: "Stop removed" });
        },
    });

    const reorderMutation = useMutation({
        mutationFn: (stopIds: number[]) => api.reorderDeliveryRunStops(runId, stopIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-run", runId] });
        },
    });

    const deleteRunMutation = useMutation({
        mutationFn: () => api.deleteWholesaleDeliveryRun(runId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-delivery-runs"] });
            toast({ title: "Run deleted" });
            onClose();
        },
    });

    const sendDriverLinkMutation = useMutation({
        mutationFn: () => api.sendWholesaleDriverLink(runId),
        onSuccess: (data: any) => {
            if (data?.emailSent) {
                toast({ title: "Driver link sent", description: data.driverUrl });
            } else {
                toast({ title: "Driver link generated", description: data.driverUrl });
                navigator.clipboard?.writeText(data.driverUrl).catch(() => { });
            }
        },
        onError: () => {
            toast({ title: "Failed to generate driver link", variant: "destructive" });
        },
    });

    const run = runQ.data;
    if (!run) return null;

    const stops = run.stops || [];

    const moveStop = (idx: number, direction: -1 | 1) => {
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= stops.length) return;
        const newStops = [...stops];
        [newStops[idx], newStops[newIdx]] = [newStops[newIdx], newStops[idx]];
        reorderMutation.mutate(newStops.map((s: any) => s.id));
    };

    // Orders available to add (not already in this run)
    const existingOrderIds = new Set(stops.map((s: any) => s.wholesaleOrderId));
    const availableOrders = (ordersQ.data || []).filter(
        (o: any) => !existingOrderIds.has(o.id),
    );

    const statusActions: Record<string, { label: string; next: string; icon: any }> = {
        planned: { label: "Start Run", next: "in_progress", icon: Play },
        in_progress: { label: "Complete Run", next: "completed", icon: CheckCircle2 },
    };

    const action = statusActions[run.status];

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Route className="h-5 w-5" />
                        {run.name}
                        <Badge className={runStatusColors[run.status] || "bg-gray-100"}>
                            {run.status.replace(/_/g, " ")}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Run info */}
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                        <div>
                            <p className="text-xs text-slate-600">Date</p>
                            <p className="font-medium">
                                {new Date(run.scheduledDate + "T12:00:00").toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Driver</p>
                            <p className="font-medium">{run.driverName || "—"}</p>
                            {run.driverEmail && (
                                <p className="text-xs text-slate-600">{run.driverEmail}</p>
                            )}
                        </div>
                        {run.vehicleNotes && (
                            <div>
                                <p className="text-xs text-slate-600">Vehicle</p>
                                <p className="text-sm">{run.vehicleNotes}</p>
                            </div>
                        )}
                        {run.notes && (
                            <div>
                                <p className="text-xs text-slate-600">Notes</p>
                                <p className="text-sm">{run.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Stops */}
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold">
                                Route Stops ({stops.length})
                            </h3>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddingOrder(!addingOrder)}
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Stop
                            </Button>
                        </div>

                        {/* Add order to run */}
                        {addingOrder && (
                            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                                <p className="text-xs font-medium text-blue-800">
                                    Add an order from {new Date(run.scheduledDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                                {availableOrders.length > 0 ? (
                                    <div className="flex gap-2">
                                        <Select
                                            value={orderIdToAdd}
                                            onValueChange={setOrderIdToAdd}
                                        >
                                            <SelectTrigger className="text-sm flex-1">
                                                <SelectValue placeholder="Select order…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableOrders.map((o: any) => (
                                                    <SelectItem key={o.id} value={String(o.id)}>
                                                        {o.orderNumber} — {o.customerName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (orderIdToAdd) {
                                                    addStopMutation.mutate({
                                                        wholesaleOrderId: parseInt(orderIdToAdd),
                                                    });
                                                }
                                            }}
                                            disabled={!orderIdToAdd || addStopMutation.isPending}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-blue-600">
                                        {ordersQ.isLoading ? "Loading orders…" : "No available orders for this date"}
                                    </p>
                                )}
                            </div>
                        )}

                        {stops.length > 0 ? (
                            <div className="space-y-2">
                                {stops.map((stop: any, idx: number) => (
                                    <div
                                        key={stop.id}
                                        className={`flex items-center gap-3 rounded-lg border p-3 ${stop.status === "completed"
                                            ? "bg-green-50 border-green-200"
                                            : stop.status === "skipped"
                                                ? "bg-slate-50 border-slate-200 opacity-60"
                                                : "bg-white"
                                            }`}
                                    >
                                        {/* Stop number */}
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold">
                                            {idx + 1}
                                        </div>

                                        {/* Customer info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{stop.customerName}</p>
                                            <p className="text-xs text-slate-600 truncate">
                                                {stop.customerAddress
                                                    ? `${stop.customerAddress}, ${stop.customerCity}`
                                                    : "No address"}
                                                {" · "}
                                                <span className="font-mono">{stop.orderNumber}</span>
                                            </p>
                                        </div>

                                        {/* Stop status actions */}
                                        {run.status === "in_progress" && stop.status === "pending" && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs text-green-600"
                                                    onClick={() =>
                                                        updateStopMutation.mutate({
                                                            stopId: stop.id,
                                                            data: { status: "completed" },
                                                        })
                                                    }
                                                >
                                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                                    Done
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs text-slate-600"
                                                    onClick={() =>
                                                        updateStopMutation.mutate({
                                                            stopId: stop.id,
                                                            data: { status: "skipped" },
                                                        })
                                                    }
                                                >
                                                    <SkipForward className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}

                                        {stop.status === "completed" && (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                        )}
                                        {stop.status === "skipped" && (
                                            <SkipForward className="h-4 w-4 text-slate-600 shrink-0" />
                                        )}

                                        {/* Reorder buttons */}
                                        {run.status === "planned" && (
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    onClick={() => moveStop(idx, -1)}
                                                    disabled={idx === 0}
                                                    className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
                                                >
                                                    <ChevronUp className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() => moveStop(idx, 1)}
                                                    disabled={idx === stops.length - 1}
                                                    className="rounded p-0.5 hover:bg-gray-200 disabled:opacity-30"
                                                >
                                                    <ChevronDown className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Remove */}
                                        {run.status === "planned" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-red-400"
                                                onClick={() => removeStopMutation.mutate(stop.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-6 text-center text-slate-600">
                                    <MapPin className="mx-auto mb-2 h-6 w-6" />
                                    <p className="text-sm">No stops yet — add orders to this run</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Run actions */}
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                        {action && (
                            <Button
                                onClick={() => updateRunMutation.mutate({ status: action.next })}
                                disabled={updateRunMutation.isPending}
                            >
                                <action.icon className="mr-1 h-4 w-4" />
                                {action.label}
                            </Button>
                        )}
                        {run.status !== "cancelled" && run.status !== "completed" && (
                            <Button
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => updateRunMutation.mutate({ status: "cancelled" })}
                            >
                                Cancel Run
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendDriverLinkMutation.mutate()}
                            disabled={sendDriverLinkMutation.isPending}
                        >
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />
                            {sendDriverLinkMutation.isPending ? "Generating…" : "Driver Link"}
                        </Button>
                        <div className="flex-1" />
                        {run.status === "planned" && (
                            <Button
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => {
                                    if (confirm("Delete this delivery run?")) {
                                        deleteRunMutation.mutate();
                                    }
                                }}
                            >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════
// ── Email Log Tab ──
// ═══════════════════════════════════════

const emailStatusColors: Record<string, string> = {
    received: "bg-blue-100 text-blue-800",
    parsed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    ignored: "bg-gray-100 text-slate-700",
};

function EmailLogTab() {
    const [filterStatus, setFilterStatus] = useState("all");

    const logQ = useQuery({
        queryKey: ["wholesale-email-log", filterStatus],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (filterStatus !== "all") params.status = filterStatus;
            return api.getWholesaleEmailLog(params);
        },
    });

    const logs = logQ.data || [];

    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1">
                    <p className="text-sm text-slate-600">
                        All inbound emails received by the wholesale inbox. Monitor for
                        failed parses or orders from unknown senders.
                    </p>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="parsed">Parsed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="ignored">Ignored</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left">
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">From</th>
                                    <th className="px-4 py-3 font-medium">Subject</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log: any) => (
                                    <tr key={log.id} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px] truncate">
                                            {log.fromEmail}
                                        </td>
                                        <td className="px-4 py-3 max-w-[250px] truncate">
                                            {log.subject}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                className={
                                                    emailStatusColors[
                                                    log.processingStatus
                                                    ] || "bg-gray-100"
                                                }
                                            >
                                                {log.processingStatus}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            {log.wholesaleOrderId
                                                ? `#${log.wholesaleOrderId}`
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-8 text-center text-slate-600"
                                        >
                                            No emails received yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
