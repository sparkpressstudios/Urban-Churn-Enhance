import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { formatEasternDateTimeLocal } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, AlertTriangle, Settings, CalendarClock, Pencil, RotateCcw, RotateCw, Package, MapPin, Store, Handshake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const tagOptions = [
    "classic",
    "limited",
    "seasonal",
    "fan-favorite",
    "adventurous",
    "bestseller",
    "coming-soon",
];

const emptyForm = {
    name: "",
    slug: "",
    description: "",
    htmlContent: "",
    imageUrl: "",
    tag: "classic",
    emoji: "🍦",
    basePrice: "7.00",
    available: true,
    heroPosition: null as number | null,
    sortOrder: 0,
    publishedAt: "",
};

const emptySizeForm = {
    name: "",
    slug: "",
    volumeOz: 16,
    price: "7.00",
    description: "",
    sortOrder: 0,
};

export default function AdminProductEdit() {
    const params = useParams<{ id: string }>();
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const isNew = !params.id || params.id === "new";
    const flavourId = isNew ? null : Number(params.id);

    const [form, setForm] = useState(emptyForm);
    const [editorMode, setEditorMode] = useState<"visual" | "source">("visual");
    const [sizesDialogOpen, setSizesDialogOpen] = useState(false);
    const [sizeForm, setSizeForm] = useState(emptySizeForm);
    const [editingSizeId, setEditingSizeId] = useState<number | null>(null);

    // Pre-order state
    const emptyPreOrderForm = useMemo(() => ({
        preOrderStart: "",
        preOrderEnd: "",
        pickupDate: "",
        pickupEndDate: "",
        status: "scheduled" as string,
        isRecurring: false,
        recurringIntervalDays: 7,
        selectedLocationIds: [] as number[],
        locationPickupOverrides: {} as Record<number, string>,
    }), []);
    const [preOrderForm, setPreOrderForm] = useState(emptyPreOrderForm);
    const [showPreOrderForm, setShowPreOrderForm] = useState(false);
    const [editingPreOrderId, setEditingPreOrderId] = useState<number | null>(null);
    // Local pre-orders for create mode (before flavour is saved)
    const [pendingPreOrders, setPendingPreOrders] = useState<typeof emptyPreOrderForm[]>([]);

    // Fetch flavour data for editing
    const { data: flavour } = useQuery({
        queryKey: ["admin", "flavour", flavourId],
        queryFn: () => api.getFlavour(flavourId!),
        enabled: !!flavourId,
    });

    // Fetch all sizes for the "add variation" dropdown
    const { data: allSizes = [] } = useQuery({
        queryKey: ["admin", "sizes"],
        queryFn: api.getSizes,
    });

    // Fetch variations for this flavour
    const { data: variations = [] } = useQuery({
        queryKey: ["admin", "products", "by-flavour", flavourId],
        queryFn: () => api.getProductsByFlavour(flavourId!),
        enabled: !!flavourId,
    });

    // Fetch pre-orders for this flavour
    const { data: preOrders = [] } = useQuery({
        queryKey: ["admin", "pre-orders", "by-flavour", flavourId],
        queryFn: () => api.getPreOrders({ flavourId: String(flavourId!) }),
        enabled: !!flavourId,
    });

    // Fetch all locations for pre-order location picker
    const { data: allLocations = [] } = useQuery({
        queryKey: ["admin", "locations"],
        queryFn: () => api.getLocations(),
    });

    // Populate form when flavour loads
    useEffect(() => {
        if (flavour) {
            setForm({
                name: flavour.name,
                slug: flavour.slug,
                description: flavour.description || "",
                htmlContent: flavour.htmlContent || "",
                imageUrl: flavour.imageUrl || "",
                tag: flavour.tag,
                emoji: flavour.emoji,
                basePrice: flavour.basePrice,
                available: flavour.available,
                heroPosition: flavour.heroPosition ?? null,
                sortOrder: flavour.sortOrder,
                publishedAt: flavour.publishedAt ? new Date(flavour.publishedAt).toISOString().slice(0, 16) : "",
            });
        }
    }, [flavour]);

    // Mutations
    const createFlavourMutation = useMutation({
        mutationFn: (data: any) => api.createFlavour(data),
        onSuccess: async (newFlavour: any) => {
            // Auto-generate all variations
            await api.generateProductsForFlavour(newFlavour.id);
            // Create any queued pre-orders
            for (const po of pendingPreOrders) {
                const locationPickupOverrides = Object.fromEntries(
                    Object.entries(po.locationPickupOverrides || {}).filter(
                        ([locationId, dt]) => !!dt && po.selectedLocationIds.includes(Number(locationId)),
                    ),
                );

                await api.createPreOrders({
                    flavourId: newFlavour.id,
                    preOrderStart: po.preOrderStart,
                    preOrderEnd: po.preOrderEnd,
                    pickupDate: po.pickupDate,
                    pickupEndDate: po.pickupEndDate || null,
                    isRecurring: po.isRecurring,
                    recurringRule: po.isRecurring ? { intervalDays: po.recurringIntervalDays } : null,
                    status: po.status,
                    locationIds: po.selectedLocationIds.length > 0 ? po.selectedLocationIds : undefined,
                    locationPickupOverrides,
                });
            }
            setPendingPreOrders([]);
            queryClient.invalidateQueries({ queryKey: ["admin"] });
            toast({ title: "Product created" });
            navigate(`/admin/products/${newFlavour.id}`);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateFlavourMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateFlavour(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin"] });
            toast({ title: "Product updated" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateVariationMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateProduct(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        },
    });

    const createVariationMutation = useMutation({
        mutationFn: (data: any) => api.createProduct(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            toast({ title: "Variation added" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteVariationMutation = useMutation({
        mutationFn: (id: number) => api.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            toast({ title: "Variation removed" });
        },
    });

    const addAllVariationsMutation = useMutation({
        mutationFn: () => api.generateProductsForFlavour(flavourId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            toast({ title: "All variations generated" });
        },
    });

    // Pre-order mutations
    const createPreOrderMutation = useMutation({
        mutationFn: (data: any) => api.createPreOrders(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-orders"] });
            setShowPreOrderForm(false);
            setPreOrderForm(emptyPreOrderForm);
            toast({ title: "Pre-order window created" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updatePreOrderMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updatePreOrder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-orders"] });
            setShowPreOrderForm(false);
            setEditingPreOrderId(null);
            setPreOrderForm(emptyPreOrderForm);
            toast({ title: "Pre-order window updated" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deletePreOrderMutation = useMutation({
        mutationFn: (id: number) => api.deletePreOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "pre-orders"] });
            toast({ title: "Pre-order window cancelled" });
        },
    });

    // Size management mutations
    const createSizeMutation = useMutation({
        mutationFn: (data: any) => api.createSize(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "sizes"] });
            setSizeForm(emptySizeForm);
            setEditingSizeId(null);
            toast({ title: "Size created" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateSizeMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateSize(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "sizes"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "products", "by-flavour", flavourId] });
            setSizeForm(emptySizeForm);
            setEditingSizeId(null);
            toast({ title: "Size updated" });
        },
    });

    const deleteSizeMutation = useMutation({
        mutationFn: (id: number) => api.deleteSize(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "sizes"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "products", "by-flavour", flavourId] });
            toast({ title: "Size deleted" });
        },
    });

    const updateField = (field: string, value: any) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            ...form,
            slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
        };
        if (isNew) {
            createFlavourMutation.mutate(data);
        } else {
            updateFlavourMutation.mutate({ id: flavourId!, data });
        }
    };

    // Sizes already used by this flavour
    const usedSizeIds = new Set(variations.map((v: any) => v.sizeId));
    const availableSizes = allSizes.filter((s: any) => !usedSizeIds.has(s.id));

    const isSaving = createFlavourMutation.isPending || updateFlavourMutation.isPending;

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/products">
                            <Button type="button" variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Products
                            </Button>
                        </Link>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                            {isNew ? "Add New Product" : `Edit: ${flavour?.name || "..."}`}
                        </h1>
                    </div>
                    <Button type="submit" className="bg-[#A1AB74] hover:bg-[#8a9463]" disabled={isSaving}>
                        {isSaving ? "Saving..." : isNew ? "Create Product" : "Update Product"}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Main Content - Left 2/3 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Product Data */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Product Data</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Name</label>
                                        <Input
                                            value={form.name}
                                            onChange={(e) => updateField("name", e.target.value)}
                                            placeholder="Mint Chip"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Slug</label>
                                        <Input
                                            value={form.slug}
                                            onChange={(e) => updateField("slug", e.target.value)}
                                            placeholder="mint-chip (auto-generated)"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input
                                        value={form.description}
                                        onChange={(e) => updateField("description", e.target.value)}
                                        placeholder="Cool peppermint with dark chocolate chips"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Emoji</label>
                                        <Input
                                            value={form.emoji}
                                            onChange={(e) => updateField("emoji", e.target.value)}
                                            placeholder="🍦"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Base Price</label>
                                        <Input
                                            value={form.basePrice}
                                            onChange={(e) => updateField("basePrice", e.target.value)}
                                            placeholder="7.00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Tag</label>
                                        <Select value={form.tag} onValueChange={(v) => updateField("tag", v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tagOptions.map((t) => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* HTML Content Editor */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">HTML Content (product page)</label>
                                    <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as "visual" | "source")}>
                                        <TabsList>
                                            <TabsTrigger value="visual">Visual</TabsTrigger>
                                            <TabsTrigger value="source">HTML Source</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="visual">
                                            <div
                                                className="min-h-[150px] p-3 border rounded-md bg-white prose prose-sm max-w-none"
                                                contentEditable
                                                suppressContentEditableWarning
                                                dangerouslySetInnerHTML={{ __html: form.htmlContent }}
                                                onBlur={(e) => updateField("htmlContent", e.currentTarget.innerHTML)}
                                            />
                                            <p className="text-xs text-gray-400 mt-1">
                                                Click to edit visually. Use the HTML Source tab for raw HTML.
                                            </p>
                                        </TabsContent>
                                        <TabsContent value="source">
                                            <Textarea
                                                value={form.htmlContent}
                                                onChange={(e) => updateField("htmlContent", e.target.value)}
                                                placeholder="<p>Rich HTML content for this product...</p>"
                                                className="font-mono text-sm min-h-[150px]"
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Variations — preview for new, full management for existing */}
                        {isNew ? (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="w-5 h-5" /> Size Variations Preview
                                        </CardTitle>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSizesDialogOpen(true)}
                                        >
                                            <Settings className="w-4 h-4 mr-1" /> Manage Sizes
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 mb-4">
                                        <Package className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>
                                            {allSizes.length > 0
                                                ? `${allSizes.length} size variation${allSizes.length !== 1 ? "s" : ""} will be automatically created when you save this product.`
                                                : "No sizes defined yet. Add sizes first, then variations will be auto-created when you save."}
                                        </span>
                                    </div>
                                    {allSizes.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Size</TableHead>
                                                        <TableHead>Volume</TableHead>
                                                        <TableHead>Price</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {allSizes.map((s: any) => (
                                                        <TableRow key={s.id} className="text-gray-600">
                                                            <TableCell className="font-medium">{s.name}</TableCell>
                                                            <TableCell>{s.volumeOz} oz</TableCell>
                                                            <TableCell>${s.price}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="w-5 h-5" /> Variations ({variations.length})
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSizesDialogOpen(true)}
                                            >
                                                <Settings className="w-4 h-4 mr-1" /> Manage Sizes
                                            </Button>
                                            {availableSizes.length > 0 && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="bg-[#A1AB74] hover:bg-[#8a9463] text-white"
                                                    onClick={() => addAllVariationsMutation.mutate()}
                                                    disabled={addAllVariationsMutation.isPending}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" /> Add All Missing ({availableSizes.length})
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* Add single variation */}
                                    {availableSizes.length > 0 && (
                                        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm text-gray-600">Add variation:</span>
                                            <Select
                                                onValueChange={(sizeId) => {
                                                    createVariationMutation.mutate({
                                                        flavourId: flavourId!,
                                                        sizeId: Number(sizeId),
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="w-48">
                                                    <SelectValue placeholder="Select size..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableSizes.map((s: any) => (
                                                        <SelectItem key={s.id} value={s.id.toString()}>
                                                            {s.name} ({s.volumeOz} oz) — ${s.price}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {variations.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                            <p className="text-sm text-gray-500 mb-2">No variations yet.</p>
                                            {allSizes.length === 0 ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSizesDialogOpen(true)}
                                                >
                                                    <Settings className="w-4 h-4 mr-1" /> Add Sizes First
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="bg-[#A1AB74] hover:bg-[#8a9463] text-white"
                                                    onClick={() => addAllVariationsMutation.mutate()}
                                                    disabled={addAllVariationsMutation.isPending}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" /> Generate All Variations
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Size</TableHead>
                                                            <TableHead>Volume</TableHead>
                                                            <TableHead>Price</TableHead>
                                                            <TableHead>Stock</TableHead>
                                                            <TableHead>Available</TableHead>
                                                            <TableHead className="w-10"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {variations.map((v: any) => {
                                                            const isLowStock = v.manageStock && v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold;
                                                            const isOutOfStock = v.manageStock && v.stockQuantity === 0;
                                                            const effectivePrice = v.priceOverride || v.sizePrice;
                                                            const hasOverride = !!v.priceOverride;
                                                            return (
                                                                <TableRow key={v.id}>
                                                                    <TableCell className="font-medium">{v.sizeName}</TableCell>
                                                                    <TableCell className="text-gray-500">{v.sizeVolumeOz} oz</TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <Input
                                                                                className="w-28 h-8 text-sm"
                                                                                placeholder={`$${v.sizePrice}`}
                                                                                defaultValue={v.priceOverride || ""}
                                                                                onBlur={(e) => {
                                                                                    const val = e.target.value;
                                                                                    updateVariationMutation.mutate({
                                                                                        id: v.id,
                                                                                        data: { priceOverride: val || null },
                                                                                    });
                                                                                }}
                                                                            />
                                                                            {hasOverride && (
                                                                                <>
                                                                                    <span className="text-xs text-gray-400 line-through">${v.sizePrice}</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        title="Reset to default price"
                                                                                        className="text-gray-400 hover:text-gray-600"
                                                                                        onClick={() =>
                                                                                            updateVariationMutation.mutate({
                                                                                                id: v.id,
                                                                                                data: { priceOverride: null },
                                                                                            })
                                                                                        }
                                                                                    >
                                                                                        <RotateCw className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <Switch
                                                                                checked={v.manageStock}
                                                                                onCheckedChange={(checked) =>
                                                                                    updateVariationMutation.mutate({
                                                                                        id: v.id,
                                                                                        data: { manageStock: checked, ...(checked && !v.manageStock ? { stockQuantity: 100 } : {}) },
                                                                                    })
                                                                                }
                                                                            />
                                                                            {v.manageStock ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <Input
                                                                                        className="w-20 h-8 text-sm"
                                                                                        type="number"
                                                                                        defaultValue={v.stockQuantity}
                                                                                        onBlur={(e) => {
                                                                                            const val = parseInt(e.target.value);
                                                                                            if (!isNaN(val)) {
                                                                                                updateVariationMutation.mutate({
                                                                                                    id: v.id,
                                                                                                    data: { stockQuantity: val },
                                                                                                });
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                    {isOutOfStock && (
                                                                                        <Badge variant="destructive" className="text-xs whitespace-nowrap">Out of Stock</Badge>
                                                                                    )}
                                                                                    {isLowStock && (
                                                                                        <Badge className="text-xs bg-amber-100 text-amber-700 whitespace-nowrap">
                                                                                            <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                                                                                        </Badge>
                                                                                    )}
                                                                                    {!isOutOfStock && !isLowStock && v.manageStock && (
                                                                                        <Badge className="text-xs bg-green-100 text-green-700 whitespace-nowrap">In Stock</Badge>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs text-gray-400">Not tracked</span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Switch
                                                                            checked={v.available}
                                                                            onCheckedChange={(checked) =>
                                                                                updateVariationMutation.mutate({
                                                                                    id: v.id,
                                                                                    data: { available: checked },
                                                                                })
                                                                            }
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-red-500 hover:text-red-700"
                                                                            onClick={() => {
                                                                                if (confirm(`Remove ${v.sizeName} variation?`)) {
                                                                                    deleteVariationMutation.mutate(v.id);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            {/* Summary row */}
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-gray-500">
                                                <span>{variations.length} variation{variations.length !== 1 ? "s" : ""}</span>
                                                <div className="flex items-center gap-4">
                                                    {(() => {
                                                        const tracked = variations.filter((v: any) => v.manageStock);
                                                        const totalStock = tracked.reduce((sum: number, v: any) => sum + (v.stockQuantity || 0), 0);
                                                        const lowCount = tracked.filter((v: any) => v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold).length;
                                                        const outCount = tracked.filter((v: any) => v.stockQuantity === 0).length;
                                                        if (tracked.length === 0) return <span>No stock tracking</span>;
                                                        return (
                                                            <>
                                                                <span>{totalStock} total units</span>
                                                                {lowCount > 0 && <span className="text-amber-600">{lowCount} low</span>}
                                                                {outCount > 0 && <span className="text-red-600">{outCount} out</span>}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Pre-Orders Card */}
                        <PreOrdersSection
                            isNew={isNew}
                            flavourId={flavourId}
                            preOrders={preOrders}
                            pendingPreOrders={pendingPreOrders}
                            setPendingPreOrders={setPendingPreOrders}
                            preOrderForm={preOrderForm}
                            setPreOrderForm={setPreOrderForm}
                            showPreOrderForm={showPreOrderForm}
                            setShowPreOrderForm={setShowPreOrderForm}
                            editingPreOrderId={editingPreOrderId}
                            setEditingPreOrderId={setEditingPreOrderId}
                            emptyPreOrderForm={emptyPreOrderForm}
                            createPreOrderMutation={createPreOrderMutation}
                            updatePreOrderMutation={updatePreOrderMutation}
                            deletePreOrderMutation={deletePreOrderMutation}
                            allLocations={allLocations}
                        />
                    </div>

                    {/* Sidebar - Right 1/3 */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.available}
                                        onCheckedChange={(v) => updateField("available", v)}
                                    />
                                    <label className="text-sm font-medium">Available</label>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Image</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ImageUpload
                                    value={form.imageUrl || null}
                                    onChange={(url) => updateField("imageUrl", url || "")}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Display Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Publication Date</label>
                                    <Input
                                        type="datetime-local"
                                        value={form.publishedAt}
                                        onChange={(e) => updateField("publishedAt", e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400">Products are displayed newest-first by this date.</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Sort Order</label>
                                    <Input
                                        type="number"
                                        value={form.sortOrder}
                                        onChange={(e) => updateField("sortOrder", parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Hero Feature Position</label>
                                    <Select
                                        value={form.heroPosition?.toString() || "none"}
                                        onValueChange={(v) => updateField("heroPosition", v === "none" ? null : parseInt(v))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Not featured" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not featured</SelectItem>
                                            <SelectItem value="1">⭐ Position 1 — Main hero (large)</SelectItem>
                                            <SelectItem value="2">⭐ Position 2 — Top left</SelectItem>
                                            <SelectItem value="3">⭐ Position 3 — Top right</SelectItem>
                                            <SelectItem value="4">⭐ Position 4 — Bottom left</SelectItem>
                                            <SelectItem value="5">⭐ Position 5 — Bottom right</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-400">Choose which hero slot this product appears in on the homepage.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Button type="submit" className="w-full bg-[#A1AB74] hover:bg-[#8a9463]" disabled={isSaving}>
                            {isSaving ? "Saving..." : isNew ? "Create Product" : "Update Product"}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Manage Sizes Dialog */}
            <Dialog open={sizesDialogOpen} onOpenChange={setSizesDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Manage Sizes</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">Sizes are shared across all products. Changes here affect every product.</p>

                        {/* Existing sizes */}
                        <div className="space-y-2">
                            {allSizes.map((s: any) => (
                                <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                                    <span className="text-sm text-gray-500">{s.volumeOz} oz</span>
                                    <span className="text-sm text-gray-500">${s.price}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditingSizeId(s.id);
                                            setSizeForm({
                                                name: s.name,
                                                slug: s.slug,
                                                volumeOz: s.volumeOz,
                                                price: s.price,
                                                description: s.description || "",
                                                sortOrder: s.sortOrder,
                                            });
                                        }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => {
                                            if (confirm(`Delete size "${s.name}"? This will remove all variations using this size from every product.`)) {
                                                deleteSizeMutation.mutate(s.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Add / Edit size form */}
                        <div className="border-t pt-4 space-y-3">
                            <h4 className="text-sm font-medium">{editingSizeId ? "Edit Size" : "Add New Size"}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Name</label>
                                    <Input
                                        value={sizeForm.name}
                                        onChange={(e) => setSizeForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Pint"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Slug</label>
                                    <Input
                                        value={sizeForm.slug}
                                        onChange={(e) => setSizeForm(p => ({ ...p, slug: e.target.value }))}
                                        placeholder="pint"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Volume (oz)</label>
                                    <Input
                                        type="number"
                                        value={sizeForm.volumeOz}
                                        onChange={(e) => setSizeForm(p => ({ ...p, volumeOz: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Price</label>
                                    <Input
                                        value={sizeForm.price}
                                        onChange={(e) => setSizeForm(p => ({ ...p, price: e.target.value }))}
                                        placeholder="7.00"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    className="bg-[#A1AB74] hover:bg-[#8a9463]"
                                    size="sm"
                                    onClick={() => {
                                        const data = {
                                            ...sizeForm,
                                            slug: sizeForm.slug || sizeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                                        };
                                        if (editingSizeId) {
                                            updateSizeMutation.mutate({ id: editingSizeId, data });
                                        } else {
                                            createSizeMutation.mutate(data);
                                        }
                                    }}
                                >
                                    {editingSizeId ? "Update Size" : "Add Size"}
                                </Button>
                                {editingSizeId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setEditingSizeId(null);
                                            setSizeForm(emptySizeForm);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

// ── Status badge helper ──
const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    open: "bg-green-100 text-green-700",
    closed: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
};

function formatDateShort(d: string | Date) {
    return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
    });
}

// ── Pre-Orders Section ──
function PreOrdersSection({
    isNew,
    flavourId,
    preOrders,
    pendingPreOrders,
    setPendingPreOrders,
    preOrderForm,
    setPreOrderForm,
    showPreOrderForm,
    setShowPreOrderForm,
    editingPreOrderId,
    setEditingPreOrderId,
    emptyPreOrderForm,
    createPreOrderMutation,
    updatePreOrderMutation,
    deletePreOrderMutation,
    allLocations,
}: {
    isNew: boolean;
    flavourId: number | null;
    preOrders: any[];
    pendingPreOrders: any[];
    setPendingPreOrders: (v: any) => void;
    preOrderForm: any;
    setPreOrderForm: (v: any) => void;
    showPreOrderForm: boolean;
    setShowPreOrderForm: (v: boolean) => void;
    editingPreOrderId: number | null;
    setEditingPreOrderId: (v: number | null) => void;
    emptyPreOrderForm: any;
    createPreOrderMutation: any;
    updatePreOrderMutation: any;
    deletePreOrderMutation: any;
    allLocations: any[];
}) {
    const shopLocations = allLocations.filter((l: any) => (l.type === "shop" || !l.type) && l.active);
    const vendorLocations = allLocations.filter((l: any) => l.type === "vendor" && l.active);
    const activeLocations = allLocations.filter((l: any) => l.active);

    const toggleLocationId = (id: number) => {
        setPreOrderForm((p: any) => {
            const selectedLocationIds = p.selectedLocationIds?.includes(id)
                ? p.selectedLocationIds.filter((lid: number) => lid !== id)
                : [...(p.selectedLocationIds || []), id];
            const locationPickupOverrides = { ...(p.locationPickupOverrides || {}) };
            if (!selectedLocationIds.includes(id)) {
                delete locationPickupOverrides[id];
            }
            return {
                ...p,
                selectedLocationIds,
                locationPickupOverrides,
            };
        });
    };
    const handleSavePreOrder = () => {
        if (!preOrderForm.preOrderStart || !preOrderForm.preOrderEnd || !preOrderForm.pickupDate) return;

        const locationPickupOverrides = Object.fromEntries(
            Object.entries(preOrderForm.locationPickupOverrides || {}).filter(
                ([locationId, dt]) => !!dt && (preOrderForm.selectedLocationIds || []).includes(Number(locationId)),
            ),
        );

        if (isNew) {
            // Queue locally for creation after flavour is saved
            if (editingPreOrderId !== null) {
                // Editing a pending item by index
                setPendingPreOrders((prev: any[]) =>
                    prev.map((po: any, i: number) => (i === editingPreOrderId ? { ...preOrderForm, locationPickupOverrides } : po)),
                );
            } else {
                setPendingPreOrders((prev: any[]) => [...prev, { ...preOrderForm, locationPickupOverrides }]);
            }
            setShowPreOrderForm(false);
            setEditingPreOrderId(null);
            setPreOrderForm(emptyPreOrderForm);
        } else {
            const payload = {
                flavourId,
                preOrderStart: preOrderForm.preOrderStart,
                preOrderEnd: preOrderForm.preOrderEnd,
                pickupDate: preOrderForm.pickupDate,
                pickupEndDate: preOrderForm.pickupEndDate || null,
                isRecurring: preOrderForm.isRecurring,
                recurringRule: preOrderForm.isRecurring
                    ? { intervalDays: preOrderForm.recurringIntervalDays }
                    : null,
                status: preOrderForm.status,
                locationIds: preOrderForm.selectedLocationIds?.length > 0 ? preOrderForm.selectedLocationIds : undefined,
                locationPickupOverrides,
            };
            if (editingPreOrderId) {
                updatePreOrderMutation.mutate({ id: editingPreOrderId, data: payload });
            } else {
                createPreOrderMutation.mutate(payload);
            }
        }
    };

    const startEdit = (po: any, idOrIndex: number) => {
        setEditingPreOrderId(idOrIndex);
        setPreOrderForm({
            preOrderStart: po.preOrderStart
                ? formatEasternDateTimeLocal(po.preOrderStart)
                : po.preOrderStart || "",
            preOrderEnd: po.preOrderEnd
                ? formatEasternDateTimeLocal(po.preOrderEnd)
                : po.preOrderEnd || "",
            pickupDate: po.pickupDate
                ? formatEasternDateTimeLocal(po.pickupDate)
                : po.pickupDate || "",
            pickupEndDate: po.pickupEndDate
                ? formatEasternDateTimeLocal(po.pickupEndDate)
                : "",
            status: po.status || "scheduled",
            isRecurring: po.isRecurring || false,
            recurringIntervalDays: po.recurringRule?.intervalDays || po.recurringIntervalDays || 7,
            selectedLocationIds: po.locations
                ? po.locations.map((l: any) => l.id)
                : po.selectedLocationIds || [],
            locationPickupOverrides: po.locationPickupOverrides
                ? { ...po.locationPickupOverrides }
                : (Object.fromEntries(
                    ((po.locations as any[]) || [])
                        .filter((l: any) => !!l.pickupStartDate)
                        .map((l: any) => [l.id, formatEasternDateTimeLocal(l.pickupStartDate)]),
                ) as Record<number, string>),
        });
        setShowPreOrderForm(true);
    };

    const allWindows = isNew ? pendingPreOrders : preOrders;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="w-5 h-5" /> Pre-Order Windows ({allWindows.length})
                    </CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setEditingPreOrderId(null);
                            setPreOrderForm({ ...emptyPreOrderForm, selectedLocationIds: shopLocations.map((l: any) => l.id) });
                            setShowPreOrderForm(true);
                        }}
                    >
                        <Plus className="w-4 h-4 mr-1" /> Add Window
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isNew && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                        <CalendarClock className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Pre-order windows added here will be created automatically after you save the product.</span>
                    </div>
                )}
                {/* Inline form for creating/editing a window */}
                {showPreOrderForm && (
                    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                        <h4 className="text-sm font-semibold">
                            {editingPreOrderId !== null ? "Edit Pre-Order Window" : "New Pre-Order Window"}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Orders Open (Eastern)</label>
                                <Input
                                    type="datetime-local"
                                    value={preOrderForm.preOrderStart}
                                    onChange={(e) =>
                                        setPreOrderForm((p: any) => ({ ...p, preOrderStart: e.target.value }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Orders Close (Eastern)</label>
                                <Input
                                    type="datetime-local"
                                    value={preOrderForm.preOrderEnd}
                                    onChange={(e) =>
                                        setPreOrderForm((p: any) => ({ ...p, preOrderEnd: e.target.value }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Pickup Start (Eastern)</label>
                                <Input
                                    type="datetime-local"
                                    value={preOrderForm.pickupDate}
                                    onChange={(e) =>
                                        setPreOrderForm((p: any) => ({ ...p, pickupDate: e.target.value }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Pickup End (optional)</label>
                                <Input
                                    type="datetime-local"
                                    value={preOrderForm.pickupEndDate}
                                    onChange={(e) =>
                                        setPreOrderForm((p: any) => ({ ...p, pickupEndDate: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Status</label>
                                <Select
                                    value={preOrderForm.status}
                                    onValueChange={(v) =>
                                        setPreOrderForm((p: any) => ({ ...p, status: v }))
                                    }
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
                            <div className="flex items-end gap-3">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={preOrderForm.isRecurring}
                                        onCheckedChange={(v) =>
                                            setPreOrderForm((p: any) => ({ ...p, isRecurring: v }))
                                        }
                                    />
                                    <label className="text-sm">Recurring</label>
                                </div>
                                {preOrderForm.isRecurring && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-500">every</span>
                                        <Input
                                            type="number"
                                            className="w-16 h-8 text-sm"
                                            value={preOrderForm.recurringIntervalDays}
                                            onChange={(e) =>
                                                setPreOrderForm((p: any) => ({
                                                    ...p,
                                                    recurringIntervalDays: parseInt(e.target.value) || 7,
                                                }))
                                            }
                                            min={1}
                                        />
                                        <span className="text-xs text-gray-500">days</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Pickup Locations */}
                        {activeLocations.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" /> Pickup Locations
                                    </label>
                                    <div className="flex gap-1.5">
                                        <button type="button" className="text-[10px] text-[#A1AB74] hover:underline font-medium" onClick={() => setPreOrderForm((p: any) => ({ ...p, selectedLocationIds: activeLocations.map((l: any) => l.id), locationPickupOverrides: {} }))}>All</button>
                                        <span className="text-gray-300 text-[10px]">|</span>
                                        <button type="button" className="text-[10px] text-blue-500 hover:underline font-medium" onClick={() => setPreOrderForm((p: any) => ({ ...p, selectedLocationIds: shopLocations.map((l: any) => l.id), locationPickupOverrides: {} }))}>Shops</button>
                                        <span className="text-gray-300 text-[10px]">|</span>
                                        <button type="button" className="text-[10px] text-gray-500 hover:underline font-medium" onClick={() => setPreOrderForm((p: any) => ({ ...p, selectedLocationIds: [], locationPickupOverrides: {} }))}>None</button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {shopLocations.map((loc: any) => (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            onClick={() => toggleLocationId(loc.id)}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-colors border flex items-center gap-1 ${(preOrderForm.selectedLocationIds || []).includes(loc.id)
                                                ? "bg-blue-100 text-blue-800 border-blue-400"
                                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}
                                        >
                                            <Store className="w-3 h-3" /> {loc.name}
                                        </button>
                                    ))}
                                    {vendorLocations.map((loc: any) => (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            onClick={() => toggleLocationId(loc.id)}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-colors border flex items-center gap-1 ${(preOrderForm.selectedLocationIds || []).includes(loc.id)
                                                ? "bg-purple-100 text-purple-800 border-purple-400"
                                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}
                                        >
                                            <Handshake className="w-3 h-3" /> {loc.name}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Leave empty to default to all shop locations.</p>

                                {(preOrderForm.selectedLocationIds || []).length > 0 && (
                                    <div className="mt-2 border rounded-md p-2 bg-white">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Optional pickup start overrides</p>
                                        <div className="space-y-1.5">
                                            {activeLocations
                                                .filter((loc: any) => (preOrderForm.selectedLocationIds || []).includes(loc.id))
                                                .map((loc: any) => (
                                                    <div key={loc.id} className="grid grid-cols-1 sm:grid-cols-[1fr,220px] gap-1.5 items-center">
                                                        <span className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                                                            {loc.type === "vendor" ? <Handshake className="w-3 h-3 text-purple-500" /> : <Store className="w-3 h-3 text-blue-500" />}
                                                            {loc.name}
                                                        </span>
                                                        <Input
                                                            type="datetime-local"
                                                            className="h-8 text-xs"
                                                            value={(preOrderForm.locationPickupOverrides || {})[loc.id] || ""}
                                                            onChange={(e) =>
                                                                setPreOrderForm((p: any) => ({
                                                                    ...p,
                                                                    locationPickupOverrides: {
                                                                        ...(p.locationPickupOverrides || {}),
                                                                        [loc.id]: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2 pt-1">
                            <Button
                                type="button"
                                size="sm"
                                className="bg-[#A1AB74] hover:bg-[#8a9463]"
                                onClick={handleSavePreOrder}
                                disabled={createPreOrderMutation.isPending || updatePreOrderMutation.isPending}
                            >
                                {editingPreOrderId !== null ? "Update Window" : "Create Window"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowPreOrderForm(false);
                                    setEditingPreOrderId(null);
                                    setPreOrderForm(emptyPreOrderForm);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Windows list */}
                {allWindows.length === 0 && !showPreOrderForm ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                        No pre-order windows yet. Add a window to schedule when this product is available for pre-ordering.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {allWindows.map((po: any, idx: number) => {
                            const id = isNew ? idx : po.id;
                            const status = po.status || "scheduled";
                            const isActive = status === "open";
                            const isCancelled = status === "cancelled";

                            return (
                                <div
                                    key={id}
                                    className={`border rounded-lg p-3 ${isCancelled ? "opacity-50" : ""} ${isActive ? "border-green-300 bg-green-50/50" : ""}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className={statusColors[status] || "bg-gray-100"}>
                                                {status}
                                            </Badge>
                                            {po.isRecurring && (
                                                <Badge variant="outline" className="gap-1">
                                                    <RotateCcw className="w-3 h-3" />
                                                    Every {po.recurringRule?.intervalDays || po.recurringIntervalDays || 7}d
                                                </Badge>
                                            )}
                                        </div>
                                        {!isCancelled && (
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => startEdit(po, id)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => {
                                                        if (isNew) {
                                                            setPendingPreOrders((prev: any[]) =>
                                                                prev.filter((_: any, i: number) => i !== idx),
                                                            );
                                                        } else {
                                                            if (confirm("Cancel this pre-order window?")) {
                                                                deletePreOrderMutation.mutate(po.id);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                                        <div>
                                            <span className="text-xs text-gray-400">Orders:</span>{" "}
                                            {formatDateShort(po.preOrderStart)} — {formatDateShort(po.preOrderEnd)}
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Pickup:</span>{" "}
                                            {formatDateShort(po.pickupDate)}
                                            {po.pickupEndDate && ` — ${formatDateShort(po.pickupEndDate)}`}
                                        </div>
                                    </div>
                                    {(po.locations?.length > 0 || po.selectedLocationIds?.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {(po.locations || []).map((loc: any) => (
                                                <span key={loc.id} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${loc.type === "vendor" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                                    {loc.type === "vendor" ? <Handshake className="w-2.5 h-2.5" /> : <Store className="w-2.5 h-2.5" />}
                                                    {loc.name}
                                                    {loc.pickupStartDate ? ` (${formatDateShort(loc.pickupStartDate)})` : ""}
                                                </span>
                                            ))}
                                            {!po.locations && (po.selectedLocationIds || []).map((lid: number) => {
                                                const loc = allLocations.find((l: any) => l.id === lid);
                                                if (!loc) return null;
                                                return (
                                                    <span key={lid} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${loc.type === "vendor" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                                        {loc.type === "vendor" ? <Handshake className="w-2.5 h-2.5" /> : <Store className="w-2.5 h-2.5" />}
                                                        {loc.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
