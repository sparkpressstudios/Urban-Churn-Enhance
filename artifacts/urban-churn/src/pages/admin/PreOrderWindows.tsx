import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEastern, formatEasternDateTimeLocal, parseEasternDateTimeLocal } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminPreOrdersSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Plus,
    Edit,
    Trash2,
    Clock,
    CalendarDays,
    Package,
    RefreshCw,
    MapPin,
    Store,
    Handshake,
} from "lucide-react";

const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    scheduled: "bg-blue-100 text-blue-800",
    open: "bg-green-100 text-green-800",
    closed: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
};

function formatDate(d: string | Date) {
    return formatEastern(d, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatCents(c: number) {
    return `$${(c / 100).toFixed(2)}`;
}

function getCountdown(closeAt: string | Date) {
    const diff = new Date(closeAt).getTime() - Date.now();
    if (diff <= 0) return "Closed";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
}

interface PreOrderForm {
    preOrderStart: string;
    preOrderEnd: string;
    pickupDate: string;
    pickupEndDate: string;
    isRecurring: boolean;
    recurringIntervalDays: number;
    status: string;
    selectedFlavourIds: number[];
    selectedLocationIds: number[];
    locationPickupOverrides: Record<number, string>;
}

const emptyForm: PreOrderForm = {
    preOrderStart: "",
    preOrderEnd: "",
    pickupDate: "",
    pickupEndDate: "",
    isRecurring: false,
    recurringIntervalDays: 7,
    status: "scheduled",
    selectedFlavourIds: [],
    selectedLocationIds: [],
    locationPickupOverrides: {},
};

export default function AdminPreOrders() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [filterStatus, setFilterStatus] = useState("all");
    const [showCreate, setShowCreate] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<PreOrderForm>({ ...emptyForm });

    const statuses = ["all", "draft", "scheduled", "open", "closed", "cancelled"];

    const { data: preOrders = [] } = useQuery({
        queryKey: ["admin", "pre-orders", filterStatus],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (filterStatus !== "all") params.status = filterStatus;
            return api.getPreOrders(params);
        },
    });

    const { data: flavours = [] } = useQuery({
        queryKey: ["admin", "flavours"],
        queryFn: () => api.getFlavours(),
    });

    const { data: allLocations = [] } = useQuery({
        queryKey: ["admin", "locations"],
        queryFn: () => api.getLocations(),
    });

    const shopLocations = allLocations.filter((l: any) => l.type === "shop" || !l.type);
    const vendorLocations = allLocations.filter((l: any) => l.type === "vendor");
    const activeLocations = allLocations.filter((l: any) => l.active);

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createPreOrders(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-orders"] });
            toast({ title: "Pre-order(s) created" });
            setShowCreate(false);
            setForm({ ...emptyForm });
        },
        onError: (err: any) => {
            toast({ title: "Failed to create", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updatePreOrder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-order"] });
            toast({ title: "Pre-order updated" });
            setEditId(null);
            setForm({ ...emptyForm });
        },
        onError: (err: any) => {
            toast({ title: "Failed to update", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deletePreOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-orders"] });
            toast({ title: "Pre-order cancelled" });
        },
    });

    const triggerPickupMutation = useMutation({
        mutationFn: (id: number) => api.triggerPreOrderPickup(id),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-orders"] });
            toast({
                title: "Pickup notifications sent",
                description: `${data.emailsSent} email(s) sent, ${data.emailsSkipped} already sent, ${data.totalOrders} total order(s). Orders marked ready.`,
            });
        },
        onError: (err: any) => {
            toast({ title: "Failed to trigger pickup", description: err.message, variant: "destructive" });
        },
    });

    function openEditDialog(po: any) {
        const locationPickupOverrides = Object.fromEntries(
            ((po.locations as any[]) || [])
                .filter((l: any) => !!l.pickupStartDate)
                .map((l: any) => [l.id, formatEasternDateTimeLocal(l.pickupStartDate)]),
        ) as Record<number, string>;

        setEditId(po.id);
        setForm({
            preOrderStart: formatEasternDateTimeLocal(po.preOrderStart),
            preOrderEnd: formatEasternDateTimeLocal(po.preOrderEnd),
            pickupDate: formatEasternDateTimeLocal(po.pickupDate),
            pickupEndDate: po.pickupEndDate
                ? formatEasternDateTimeLocal(po.pickupEndDate)
                : "",
            isRecurring: po.isRecurring,
            recurringIntervalDays: po.recurringRule?.intervalDays || 7,
            status: po.status,
            selectedFlavourIds: [],
            selectedLocationIds: po.locations ? po.locations.map((l: any) => l.id) : [],
            locationPickupOverrides,
        });
    }

    function handleSubmit() {
        // Validate dates
        if (form.preOrderStart && form.preOrderEnd && parseEasternDateTimeLocal(form.preOrderEnd) <= parseEasternDateTimeLocal(form.preOrderStart)) {
            toast({ title: "Invalid dates", description: "Pre-order end must be after start date", variant: "destructive" });
            return;
        }
        if (form.pickupDate && form.pickupEndDate && parseEasternDateTimeLocal(form.pickupEndDate) <= parseEasternDateTimeLocal(form.pickupDate)) {
            toast({ title: "Invalid dates", description: "Pickup end date must be after pickup start date", variant: "destructive" });
            return;
        }
        if (form.pickupDate && form.preOrderEnd && parseEasternDateTimeLocal(form.pickupDate) < parseEasternDateTimeLocal(form.preOrderEnd)) {
            toast({ title: "Invalid dates", description: "Pickup date should be after the pre-order window closes", variant: "destructive" });
            return;
        }

        const locationPickupOverrides = Object.fromEntries(
            Object.entries(form.locationPickupOverrides || {}).filter(
                ([locationId, dt]) => !!dt && form.selectedLocationIds.includes(Number(locationId)),
            ),
        );

        for (const [locationIdRaw, dt] of Object.entries(locationPickupOverrides)) {
            if (form.preOrderEnd && parseEasternDateTimeLocal(dt) < parseEasternDateTimeLocal(form.preOrderEnd)) {
                const location = allLocations.find((l: any) => l.id === Number(locationIdRaw));
                toast({
                    title: "Invalid location pickup date",
                    description: `${location?.name || "A selected location"} pickup start must be after the pre-order close date.`,
                    variant: "destructive",
                });
                return;
            }
        }

        if (editId) {
            updateMutation.mutate({
                id: editId,
                data: {
                    preOrderStart: form.preOrderStart,
                    preOrderEnd: form.preOrderEnd,
                    pickupDate: form.pickupDate,
                    pickupEndDate: form.pickupEndDate || null,
                    isRecurring: form.isRecurring,
                    recurringRule: form.isRecurring
                        ? { intervalDays: form.recurringIntervalDays }
                        : null,
                    status: form.status,
                    locationIds: form.selectedLocationIds,
                    locationPickupOverrides,
                },
            });
        } else {
            createMutation.mutate({
                flavourIds: form.selectedFlavourIds.length > 0 ? form.selectedFlavourIds : undefined,
                preOrderStart: form.preOrderStart,
                preOrderEnd: form.preOrderEnd,
                pickupDate: form.pickupDate,
                pickupEndDate: form.pickupEndDate || null,
                isRecurring: form.isRecurring,
                recurringRule: form.isRecurring
                    ? { intervalDays: form.recurringIntervalDays }
                    : null,
                status: form.status,
                locationIds: form.selectedLocationIds.length > 0 ? form.selectedLocationIds : undefined,
                locationPickupOverrides,
            });
        }
    }

    function toggleFlavourId(id: number) {
        setForm((prev) => ({
            ...prev,
            selectedFlavourIds: prev.selectedFlavourIds.includes(id)
                ? prev.selectedFlavourIds.filter((fid) => fid !== id)
                : [...prev.selectedFlavourIds, id],
        }));
    }

    function toggleLocationId(id: number) {
        setForm((prev) => {
            const selectedLocationIds = prev.selectedLocationIds.includes(id)
                ? prev.selectedLocationIds.filter((lid) => lid !== id)
                : [...prev.selectedLocationIds, id];
            const locationPickupOverrides = { ...prev.locationPickupOverrides };
            if (!selectedLocationIds.includes(id)) {
                delete locationPickupOverrides[id];
            }
            return {
                ...prev,
                selectedLocationIds,
                locationPickupOverrides,
            };
        });
    }

    const isEditing = showCreate || editId !== null;
    const hasSelection = form.selectedFlavourIds.length > 0;

    useTour("admin-preorders", adminPreOrdersSteps);

    return (
        <AdminLayout>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between" data-tour="admin-preorders-header">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Product Pre-Orders</h1>
                        <p className="text-sm text-white/70 mt-1">
                            Set individual pre-order dates and pickup dates per product
                        </p>
                    </div>
                    <Button
                        className="bg-[#A1AB74] hover:bg-[#8a9360]"
                        onClick={() => {
                            setForm({
                                ...emptyForm,
                                selectedLocationIds: shopLocations.filter((l: any) => l.active).map((l: any) => l.id),
                            });
                            setEditId(null);
                            setShowCreate(true);
                        }}
                        data-tour="admin-preorders-create"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Pre-Order
                    </Button>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-2" data-tour="admin-preorders-status-filters">
                    {statuses.map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === s
                                ? "bg-[#A1AB74] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Pre-orders list */}
                {!preOrders.length ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 text-sm">No pre-orders found.</p>
                            <p className="text-gray-400 text-xs mt-1">Create one to start accepting pre-orders for specific products.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3" data-tour="admin-preorders-cards">
                        {preOrders.map((po: any) => (
                            <Card key={po.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-start gap-4 p-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {po.flavourEmoji || "🍦"} {po.flavourName || `Pre-Order #${po.id}`}
                                                </h3>
                                                <Badge
                                                    variant="secondary"
                                                    className={statusColors[po.status] || ""}
                                                >
                                                    {po.status}
                                                </Badge>
                                                {po.isRecurring && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <RefreshCw className="w-3 h-3 mr-1" />
                                                        Recurring
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Opens: {formatDate(po.preOrderStart)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Closes: {formatDate(po.preOrderEnd)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Package className="w-3 h-3" />
                                                    Pickup: {formatDate(po.pickupDate)}
                                                    {po.pickupEndDate && ` — ${formatDate(po.pickupEndDate)}`}
                                                </span>
                                                {po.orderCount > 0 && (
                                                    <span className="text-gray-600 font-medium">
                                                        {po.orderCount} orders
                                                    </span>
                                                )}
                                            </div>
                                            {/* Location pills */}
                                            {po.locations && po.locations.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {po.locations.map((loc: any) => (
                                                        <span
                                                            key={loc.id}
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${loc.type === "vendor" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}
                                                        >
                                                            {loc.type === "vendor" ? <Handshake className="w-2.5 h-2.5" /> : <Store className="w-2.5 h-2.5" />}
                                                            {loc.name}
                                                            {loc.pickupStartDate ? ` (Starts ${formatDate(loc.pickupStartDate)})` : ""}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {po.status === "open" && (
                                            <div className="mt-2">
                                                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                                    {getCountdown(po.preOrderEnd)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openEditDialog(po)}
                                            title="Edit dates"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        {po.status === "closed" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-green-600 hover:text-green-800"
                                                onClick={() => {
                                                    if (confirm("Mark all orders for this window as Ready and send pickup notification emails to customers? (Emails already sent will be skipped.)")) {
                                                        triggerPickupMutation.mutate(po.id);
                                                    }
                                                }}
                                                disabled={triggerPickupMutation.isPending}
                                                title="Mark orders ready & send pickup emails"
                                            >
                                                <Package className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {po.status !== "cancelled" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-700"
                                                onClick={() => {
                                                    if (confirm("Cancel this pre-order?")) {
                                                        deleteMutation.mutate(po.id);
                                                    }
                                                }}
                                                title="Cancel"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create / Edit Dialog */}
                <Dialog
                    open={isEditing}
                    onOpenChange={(open) => {
                        if (!open) {
                            setShowCreate(false);
                            setEditId(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editId ? "Edit Pre-Order Dates" : "Create Pre-Orders"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-5">
                            {/* Product selection (create only) */}
                            {!editId && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-gray-700">
                                            Select Products for Pre-Order
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                className="text-xs text-[#A1AB74] hover:underline font-medium"
                                                onClick={() => setForm((f) => ({ ...f, selectedFlavourIds: flavours.map((fl: any) => fl.id) }))}
                                            >
                                                Select All
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                className="text-xs text-gray-500 hover:underline font-medium"
                                                onClick={() => setForm((f) => ({ ...f, selectedFlavourIds: [] }))}
                                            >
                                                Deselect All
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Each selected product will get its own pre-order window with the same dates.
                                    </p>
                                    <div className="flex flex-wrap gap-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                                        {flavours.map((f: any) => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => toggleFlavourId(f.id)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${form.selectedFlavourIds.includes(f.id)
                                                    ? "bg-[#A1AB74] text-white border-[#A1AB74]"
                                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                                                    }`}
                                            >
                                                {f.emoji || "🍦"} {f.name}
                                            </button>
                                        ))}
                                    </div>
                                    {!hasSelection && (
                                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                            ⚠ Please select at least one product to create a pre-order for.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Schedule */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Pre-Order Dates <span className="text-xs font-normal text-gray-500">(Eastern Time)</span></h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Opens At *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={form.preOrderStart}
                                            onChange={(e) => setForm((f) => ({ ...f, preOrderStart: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>Closes At *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={form.preOrderEnd}
                                            onChange={(e) => setForm((f) => ({ ...f, preOrderEnd: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pickup dates */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Pickup Dates <span className="text-xs font-normal text-gray-500">(Eastern Time)</span></h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Pickup Date *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={form.pickupDate}
                                            onChange={(e) => setForm((f) => ({ ...f, pickupDate: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>Pickup End Date</Label>
                                        <Input
                                            type="datetime-local"
                                            value={form.pickupEndDate}
                                            onChange={(e) => setForm((f) => ({ ...f, pickupEndDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <Label>Status</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Recurring */}
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isRecurring}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, isRecurring: e.target.checked }))
                                        }
                                        className="rounded border-gray-300"
                                    />
                                    Recurring pre-order
                                </label>
                                {form.isRecurring && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Repeat every</span>
                                        <Input
                                            type="number"
                                            min={1}
                                            className="w-20"
                                            value={form.recurringIntervalDays}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    recurringIntervalDays: parseInt(e.target.value) || 7,
                                                }))
                                            }
                                        />
                                        <span className="text-xs text-gray-500">days</span>
                                    </div>
                                )}
                            </div>

                            {/* Pickup Locations */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4" /> Pickup Locations
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="text-xs text-[#A1AB74] hover:underline font-medium"
                                            onClick={() => setForm((f) => ({ ...f, selectedLocationIds: activeLocations.map((l: any) => l.id), locationPickupOverrides: {} }))}
                                        >
                                            Select All
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            type="button"
                                            className="text-xs text-blue-500 hover:underline font-medium"
                                            onClick={() => setForm((f) => ({ ...f, selectedLocationIds: shopLocations.filter((l: any) => l.active).map((l: any) => l.id), locationPickupOverrides: {} }))}
                                        >
                                            Shops Only
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            type="button"
                                            className="text-xs text-gray-500 hover:underline font-medium"
                                            onClick={() => setForm((f) => ({ ...f, selectedLocationIds: [], locationPickupOverrides: {} }))}
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">
                                    Choose which locations customers can pick up from. Defaults to all shops if none selected.
                                </p>
                                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                                    {shopLocations.filter((l: any) => l.active).length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Our Shops</p>
                                            <div className="flex flex-wrap gap-2">
                                                {shopLocations.filter((l: any) => l.active).map((loc: any) => (
                                                    <button
                                                        key={loc.id}
                                                        type="button"
                                                        onClick={() => toggleLocationId(loc.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5 ${form.selectedLocationIds.includes(loc.id)
                                                            ? "bg-blue-100 text-blue-800 border-blue-400"
                                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                                                    >
                                                        <Store className="w-3.5 h-3.5" /> {loc.name}
                                                        {!loc.allowPreorderPickup && <span className="text-[10px] text-amber-600 ml-1">(no pickup)</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {vendorLocations.filter((l: any) => l.active).length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 mt-2">Partner Vendors</p>
                                            <div className="flex flex-wrap gap-2">
                                                {vendorLocations.filter((l: any) => l.active).map((loc: any) => (
                                                    <button
                                                        key={loc.id}
                                                        type="button"
                                                        onClick={() => toggleLocationId(loc.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5 ${form.selectedLocationIds.includes(loc.id)
                                                            ? "bg-purple-100 text-purple-800 border-purple-400"
                                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                                                    >
                                                        <Handshake className="w-3.5 h-3.5" /> {loc.name}
                                                        {!loc.allowPreorderPickup && <span className="text-[10px] text-amber-600 ml-1">(no pickup)</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {activeLocations.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-2">No active locations found.</p>
                                    )}
                                </div>

                                {form.selectedLocationIds.length > 0 && (
                                    <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                                        <p className="text-xs font-semibold text-gray-600 mb-2">
                                            Optional pickup start overrides per location
                                        </p>
                                        <div className="space-y-2">
                                            {activeLocations
                                                .filter((loc: any) => form.selectedLocationIds.includes(loc.id))
                                                .map((loc: any) => (
                                                    <div key={loc.id} className="grid grid-cols-1 sm:grid-cols-[1fr,220px] gap-2 items-center">
                                                        <div className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                                                            {loc.type === "vendor" ? <Handshake className="w-3 h-3 text-purple-500" /> : <Store className="w-3 h-3 text-blue-500" />}
                                                            {loc.name}
                                                        </div>
                                                        <Input
                                                            type="datetime-local"
                                                            value={form.locationPickupOverrides[loc.id] || ""}
                                                            onChange={(e) =>
                                                                setForm((f) => ({
                                                                    ...f,
                                                                    locationPickupOverrides: {
                                                                        ...f.locationPickupOverrides,
                                                                        [loc.id]: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            placeholder="Uses global pickup start"
                                                        />
                                                    </div>
                                                ))}
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-2">
                                            Leave blank to use the global pickup start date for that location.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreate(false);
                                        setEditId(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-[#A1AB74] hover:bg-[#8a9360]"
                                    disabled={
                                        !form.preOrderStart ||
                                        !form.preOrderEnd ||
                                        !form.pickupDate ||
                                        (!editId && !hasSelection) ||
                                        createMutation.isPending ||
                                        updateMutation.isPending
                                    }
                                    onClick={handleSubmit}
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? "Saving…"
                                        : editId
                                            ? "Update Pre-Order"
                                            : `Create ${form.selectedFlavourIds.length} Pre-Order(s)`}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout >
    );
}
