import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminLocationsSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, MapPin, Clock, PlusCircle, X, Store, Handshake, Upload, Users as UsersIcon } from "lucide-react";
import { Link } from "wouter";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface LocationHour {
    dayOfWeek: number;
    setNumber: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
}

const defaultHours: LocationHour[] = dayNames.map((_, i) => ({
    dayOfWeek: i,
    setNumber: 1,
    openTime: "12:00",
    closeTime: "21:00",
    isClosed: false,
}));

const emptyLocation = {
    name: "",
    slug: "",
    type: "shop" as "shop" | "vendor",
    vendorCategory: "" as "" | "scoop_shop" | "grocery" | "restaurant" | "cafe" | "market" | "other",
    address: "",
    city: "",
    state: "PA",
    zip: "",
    phone: "",
    mapUrl: "",
    imageUrl: "",
    accentColor: "#A1AB74",
    menuUrl: "",
    menuEmbedCode: "",
    hideHours: false,
    showOnPublicPage: true,
    allowPreorderPickup: true,
    sortOrder: 0,
    active: true,
    hours: [...defaultHours],
};

export default function AdminLocations() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<typeof emptyLocation>(emptyLocation);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkResult, setBulkResult] = useState<{
        totalRows: number;
        importedCount: number;
        skippedCount: number;
        errors: { row: number; name: string; message: string }[];
    } | null>(null);
    const [bulkDragActive, setBulkDragActive] = useState(false);

    const { data: locations = [] } = useQuery({
        queryKey: ["admin", "locations"],
        queryFn: api.getLocations,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createLocation(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
            setDialogOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            api.updateLocation(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
            setDialogOpen(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteLocation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
        },
    });

    const bulkMutation = useMutation({
        mutationFn: (file: File) => api.bulkImportLocations(file),
        onSuccess: (data: any) => {
            setBulkResult(data);
            queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
        },
    });

    const openBulk = () => {
        setBulkFile(null);
        setBulkResult(null);
        setBulkOpen(true);
    };

    const downloadTemplate = () => {
        const csv =
            "name,address,city,state,zip,phone,category,mapUrl\n" +
            "Example Grocery,123 Main St,Carlisle,PA,17013,717-555-0100,grocery,https://maps.google.com/?q=123+Main+St\n" +
            "Example Restaurant,456 Oak Ave,Mechanicsburg,PA,17050,717-555-0200,restaurant,\n";
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "partner-locations-template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const acceptBulkFile = (file: File | undefined) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".csv")) {
            alert("Please select a .csv file.");
            return;
        }
        setBulkFile(file);
        setBulkResult(null);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyLocation, hours: [...defaultHours] });
        setDialogOpen(true);
    };

    const openEdit = (loc: any) => {
        setEditingId(loc.id);
        setForm({
            name: loc.name,
            slug: loc.slug,
            type: loc.type || "shop",
            vendorCategory: loc.vendorCategory || "",
            address: loc.address,
            city: loc.city,
            state: loc.state,
            zip: loc.zip,
            phone: loc.phone || "",
            mapUrl: loc.mapUrl || "",
            imageUrl: loc.imageUrl || "",
            accentColor: loc.accentColor || "#A1AB74",
            menuUrl: loc.menuUrl || "",
            menuEmbedCode: loc.menuEmbedCode || "",
            hideHours: loc.hideHours ?? false,
            showOnPublicPage: loc.showOnPublicPage ?? true,
            allowPreorderPickup: loc.allowPreorderPickup ?? true,
            sortOrder: loc.sortOrder,
            active: loc.active,
            hours: loc.hours?.length
                ? (() => {
                    // Deduplicate: keep only the last entry per (dayOfWeek, setNumber)
                    const seen = new Map<string, any>();
                    for (const h of loc.hours) {
                        seen.set(`${h.dayOfWeek}-${h.setNumber ?? 1}`, {
                            dayOfWeek: h.dayOfWeek,
                            setNumber: h.setNumber ?? 1,
                            openTime: h.openTime,
                            closeTime: h.closeTime,
                            isClosed: h.isClosed,
                        });
                    }
                    return [...seen.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.setNumber - b.setNumber);
                })()
                : [...defaultHours],
        });
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            ...form,
            slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            vendorCategory: form.type === "vendor" ? (form.vendorCategory || null) : null,
        };
        if (editingId) {
            updateMutation.mutate({ id: editingId, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const updateField = (field: string, value: any) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const updateHour = (index: number, field: string, value: any) => {
        setForm((prev) => ({
            ...prev,
            hours: prev.hours.map((h, i) =>
                i === index ? { ...h, [field]: value } : h,
            ),
        }));
    };

    const addSecondSet = (dayOfWeek: number) => {
        setForm((prev) => ({
            ...prev,
            hours: [...prev.hours, {
                dayOfWeek,
                setNumber: 2,
                openTime: "17:00",
                closeTime: "21:00",
                isClosed: false,
            }].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.setNumber - b.setNumber),
        }));
    };

    const removeSecondSet = (dayOfWeek: number) => {
        setForm((prev) => ({
            ...prev,
            hours: prev.hours.filter(h => !(h.dayOfWeek === dayOfWeek && h.setNumber === 2)),
        }));
    };

    const formatHours = (hours: any[]) => {
        if (!hours?.length) return "No hours set";
        const open = hours.filter((h) => !h.isClosed);
        if (open.length === 0) return "Closed";
        const first = open[0];
        return `${first.openTime}–${first.closeTime}`;
    };

    useTour("admin-locations", adminLocationsSteps);

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex items-center justify-between" data-tour="admin-locations-header">
                    <h1 className="text-2xl font-bold text-white">Locations</h1>
                    <div className="flex gap-2">
                        <Button onClick={openBulk} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                            <Upload className="w-4 h-4 mr-2" /> Bulk Import
                        </Button>
                        <Button onClick={openCreate} className="bg-[#A1AB74] hover:bg-[#8a9463]" data-tour="admin-locations-add">
                            <Plus className="w-4 h-4 mr-2" /> Add Location
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" data-tour="admin-locations-grid">
                    {locations.map((loc: any) => (
                        <Card
                            key={loc.id}
                            className={!loc.active ? "opacity-60" : ""}
                            style={{ borderTopColor: loc.accentColor, borderTopWidth: 3 }}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            {loc.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {loc.address}, {loc.city}, {loc.state} {loc.zip}
                                        </p>
                                        {loc.phone && (
                                            <p className="text-sm text-gray-500">{loc.phone}</p>
                                        )}
                                    </div>
                                    {!loc.active && (
                                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                                            Inactive
                                        </Badge>
                                    )}
                                    {loc.type === "vendor" && (
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                            <Handshake className="w-3 h-3 mr-1" />
                                            Vendor
                                        </Badge>
                                    )}
                                    {loc.type === "shop" && (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                            <Store className="w-3 h-3 mr-1" />
                                            Shop
                                        </Badge>
                                    )}
                                    {loc.allowPreorderPickup && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                                            Pickup
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {formatHours(loc.hours)}
                                </div>
                                <LocationStaffList locationId={loc.id} />
                                <div className="mt-3 flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    {loc.active && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => {
                                                if (confirm(`Deactivate "${loc.name}"?`)) {
                                                    deleteMutation.mutate(loc.id);
                                                }
                                            }}
                                        >
                                            Deactivate
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? "Edit Location" : "Add New Location"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder="Carlisle Shop"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Slug</label>
                                <Input
                                    value={form.slug}
                                    onChange={(e) => updateField("slug", e.target.value)}
                                    placeholder="carlisle"
                                />
                            </div>
                        </div>

                        {/* Location Type */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Location Type</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateField("type", "shop")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.type === "shop" ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                                >
                                    <Store className="w-4 h-4" /> Our Shop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateField("type", "vendor")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.type === "vendor" ? "bg-purple-100 border-purple-400 text-purple-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                                >
                                    <Handshake className="w-4 h-4" /> Partner Vendor
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">Vendors are partner locations where customers can also pick up pre-orders.</p>
                        </div>

                        {form.type === "vendor" && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Vendor Category</label>
                                <Select
                                    value={form.vendorCategory || "__none__"}
                                    onValueChange={(v) => updateField("vendorCategory", v === "__none__" ? "" : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Uncategorized</SelectItem>
                                        <SelectItem value="scoop_shop">Scoop Shop</SelectItem>
                                        <SelectItem value="grocery">Grocery</SelectItem>
                                        <SelectItem value="restaurant">Restaurant</SelectItem>
                                        <SelectItem value="cafe">Café</SelectItem>
                                        <SelectItem value="market">Market</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-400">Used to filter vendors on the public Locations page.</p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Address</label>
                            <Input
                                value={form.address}
                                onChange={(e) => updateField("address", e.target.value)}
                                placeholder="258 Westminster Dr"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">City</label>
                                <Input
                                    value={form.city}
                                    onChange={(e) => updateField("city", e.target.value)}
                                    placeholder="Carlisle"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">State</label>
                                <Input
                                    value={form.state}
                                    onChange={(e) => updateField("state", e.target.value)}
                                    placeholder="PA"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">ZIP</label>
                                <Input
                                    value={form.zip}
                                    onChange={(e) => updateField("zip", e.target.value)}
                                    placeholder="17013"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Phone</label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                    placeholder="717-884-9396"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Accent Color</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={form.accentColor}
                                        onChange={(e) => updateField("accentColor", e.target.value)}
                                        className="w-12 p-1 h-9"
                                    />
                                    <Input
                                        value={form.accentColor}
                                        onChange={(e) => updateField("accentColor", e.target.value)}
                                        placeholder="#A1AB74"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Map URL</label>
                                <Input
                                    value={form.mapUrl}
                                    onChange={(e) => updateField("mapUrl", e.target.value)}
                                    placeholder="https://maps.google.com/..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Sort Order</label>
                                <Input
                                    type="number"
                                    value={form.sortOrder}
                                    onChange={(e) =>
                                        updateField("sortOrder", parseInt(e.target.value) || 0)
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Image URL</label>
                            <Input
                                value={form.imageUrl}
                                onChange={(e) => updateField("imageUrl", e.target.value)}
                                placeholder="https://... or /images/location-carlisle.jpg"
                            />
                            {form.imageUrl && (
                                <img src={form.imageUrl} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-lg border" />
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Flavor Menu URL</label>
                            <Input
                                value={form.menuUrl}
                                onChange={(e) => updateField("menuUrl", e.target.value)}
                                placeholder="https://virtualscreen.optisigns.com/#..."
                            />
                            <p className="text-xs text-gray-400">Link to the live flavor menu for this location (e.g. OptiSigns screen URL). Shown as a button on the public page.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Live Menu Embed Code</label>
                            <textarea
                                value={form.menuEmbedCode}
                                onChange={(e) => updateField("menuEmbedCode", e.target.value)}
                                placeholder='Paste HTML embed/iframe code from your menu provider'
                                rows={4}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <p className="text-xs text-gray-400">Paste the HTML or iframe code from your 3rd-party menu provider. This will be displayed on the public Locations page.</p>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.active}
                                    onCheckedChange={(v) => updateField("active", v)}
                                />
                                <label className="text-sm font-medium">Active</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.showOnPublicPage}
                                    onCheckedChange={(v) => updateField("showOnPublicPage", v)}
                                />
                                <label className="text-sm font-medium">Show on Public Locations Page</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.hideHours}
                                    onCheckedChange={(v) => updateField("hideHours", v)}
                                />
                                <label className="text-sm font-medium">Hide Hours on Public Page</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.allowPreorderPickup}
                                    onCheckedChange={(v) => updateField("allowPreorderPickup", v)}
                                />
                                <label className="text-sm font-medium">Allow Pre-Order Pickup</label>
                            </div>
                        </div>

                        {/* Hours Editor */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Store Hours</label>
                            <div className="border rounded-lg divide-y">
                                {dayNames.map((dayName, dayIdx) => {
                                    const daySets = form.hours
                                        .map((h, i) => ({ ...h, _idx: i }))
                                        .filter(h => h.dayOfWeek === dayIdx)
                                        .sort((a, b) => a.setNumber - b.setNumber);
                                    const set1 = daySets.find(h => h.setNumber === 1);
                                    const set2 = daySets.find(h => h.setNumber === 2);
                                    if (!set1) return null;
                                    return (
                                        <div key={dayIdx} className="p-3 space-y-2">
                                            <div className="flex items-center gap-3 text-sm">
                                                <span className="w-24 font-medium">{dayName}</span>
                                                <Switch
                                                    checked={!set1.isClosed}
                                                    onCheckedChange={(v) => updateHour(set1._idx, "isClosed", !v)}
                                                />
                                                {!set1.isClosed ? (
                                                    <>
                                                        <Input
                                                            type="time"
                                                            value={set1.openTime}
                                                            onChange={(e) => updateHour(set1._idx, "openTime", e.target.value)}
                                                            className="w-32"
                                                        />
                                                        <span className="text-gray-400">to</span>
                                                        <Input
                                                            type="time"
                                                            value={set1.closeTime}
                                                            onChange={(e) => updateHour(set1._idx, "closeTime", e.target.value)}
                                                            className="w-32"
                                                        />
                                                        {!set2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => addSecondSet(dayIdx)}
                                                                className="text-gray-400 hover:text-[#A1AB74] transition-colors"
                                                                title="Add split hours"
                                                            >
                                                                <PlusCircle className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">Closed</span>
                                                )}
                                            </div>
                                            {set2 && !set1.isClosed && (
                                                <div className="flex items-center gap-3 text-sm pl-[calc(6rem+2.75rem)]">
                                                    <Input
                                                        type="time"
                                                        value={set2.openTime}
                                                        onChange={(e) => updateHour(set2._idx, "openTime", e.target.value)}
                                                        className="w-32"
                                                    />
                                                    <span className="text-gray-400">to</span>
                                                    <Input
                                                        type="time"
                                                        value={set2.closeTime}
                                                        onChange={(e) => updateHour(set2._idx, "closeTime", e.target.value)}
                                                        className="w-32"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSecondSet(dayIdx)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Remove split hours"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#A1AB74] hover:bg-[#8a9463]"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingId ? "Update" : "Create"} Location
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Dialog */}
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Bulk Import Partner Vendors</DialogTitle>
                    </DialogHeader>

                    {!bulkResult ? (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 space-y-2">
                                <p>
                                    Upload a CSV to add multiple partner vendors at once. Imported rows
                                    default to <strong>type = Vendor</strong>, visible on the public
                                    page, and pre-order pickup disabled.
                                </p>
                                <p>
                                    <strong>Required columns:</strong> <code>name</code>,{" "}
                                    <code>address</code>, <code>city</code>, <code>zip</code>.{" "}
                                    <strong>Optional:</strong> <code>state</code>, <code>phone</code>,{" "}
                                    <code>category</code>, <code>mapUrl</code>.
                                </p>
                                <p>
                                    <strong>Category values:</strong> <code>scoop_shop</code>,{" "}
                                    <code>grocery</code>, <code>restaurant</code>,{" "}
                                    <code>cafe</code>, <code>market</code>, <code>other</code>{" "}
                                    (friendly names like "Scoop Shop" or "Grocery Store" also work).
                                </p>
                                <button
                                    type="button"
                                    onClick={downloadTemplate}
                                    className="text-[#A1AB74] hover:underline text-sm font-medium"
                                >
                                    ↓ Download CSV template
                                </button>
                            </div>

                            <label
                                onDragOver={(e) => { e.preventDefault(); setBulkDragActive(true); }}
                                onDragLeave={() => setBulkDragActive(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setBulkDragActive(false);
                                    acceptBulkFile(e.dataTransfer.files?.[0]);
                                }}
                                className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${bulkDragActive ? "border-[#A1AB74] bg-[#A1AB74]/10" : "border-gray-300 hover:border-gray-400"}`}
                            >
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={(e) => acceptBulkFile(e.target.files?.[0] ?? undefined)}
                                />
                                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                {bulkFile ? (
                                    <>
                                        <p className="font-medium text-gray-800">{bulkFile.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(bulkFile.size / 1024).toFixed(1)} KB — click to choose a different file
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-medium text-gray-700">
                                            Drag a CSV here, or click to browse
                                        </p>
                                        <p className="text-xs text-gray-500">.csv files only, up to 5MB</p>
                                    </>
                                )}
                            </label>

                            {bulkMutation.isError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                                    {(bulkMutation.error as Error).message}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setBulkOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-[#A1AB74] hover:bg-[#8a9463]"
                                    disabled={!bulkFile || bulkMutation.isPending}
                                    onClick={() => bulkFile && bulkMutation.mutate(bulkFile)}
                                >
                                    {bulkMutation.isPending ? "Importing…" : "Import"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold">{bulkResult.totalRows}</div>
                                    <div className="text-xs text-gray-500">Total rows</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-700">{bulkResult.importedCount}</div>
                                    <div className="text-xs text-green-600">Imported</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-red-700">{bulkResult.skippedCount}</div>
                                    <div className="text-xs text-red-600">Skipped</div>
                                </div>
                            </div>

                            {bulkResult.errors.length > 0 && (
                                <div className="border rounded-lg">
                                    <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium">
                                        Errors ({bulkResult.errors.length})
                                    </div>
                                    <div className="max-h-64 overflow-y-auto divide-y">
                                        {bulkResult.errors.map((err, i) => (
                                            <div key={i} className="px-3 py-2 text-sm">
                                                {err.row > 0 && (
                                                    <span className="text-gray-500 mr-2">Row {err.row}</span>
                                                )}
                                                <span className="font-medium">{err.name}</span>
                                                <span className="text-red-600 ml-2">— {err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setBulkFile(null); setBulkResult(null); }}
                                >
                                    Import Another
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-[#A1AB74] hover:bg-[#8a9463]"
                                    onClick={() => setBulkOpen(false)}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

function LocationStaffList({ locationId }: { locationId: number }) {
    const { data: staff = [] } = useQuery({
        queryKey: ["admin", "users-by-location", locationId],
        queryFn: () => api.getUsersByLocation(locationId),
    });

    return (
        <div className="mt-3 border-t pt-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <UsersIcon className="w-3 h-3" />
                    Assigned Staff ({staff.length})
                </div>
                <Link
                    href="/admin/users"
                    className="text-xs text-[#A1AB74] hover:underline"
                >
                    Manage →
                </Link>
            </div>
            {staff.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1">No staff assigned yet.</p>
            ) : (
                <ul className="mt-1 space-y-0.5">
                    {staff.map((s: any) => (
                        <li key={s.id} className="text-xs text-gray-600">
                            {s.username}
                            <span className="text-gray-400 ml-1">({s.role})</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
