import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminProductsSteps } from "@/lib/tour/tour-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Search, ExternalLink, Pencil, Copy, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const tagColors: Record<string, string> = {
    classic: "bg-green-100 text-green-700",
    limited: "bg-orange-100 text-orange-700",
    seasonal: "bg-yellow-100 text-yellow-700",
    "fan-favorite": "bg-pink-100 text-pink-700",
    adventurous: "bg-purple-100 text-purple-700",
    bestseller: "bg-amber-100 text-amber-700",
    "coming-soon": "bg-gray-100 text-gray-600",
};

export default function AdminProductList() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
    const [tab, setTab] = useState("products");
    const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
    const [editingSize, setEditingSize] = useState<any>(null);
    const [sizeForm, setSizeForm] = useState({ name: "", slug: "", volumeOz: 16, price: "7.00", description: "", sortOrder: 0 });
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [bulkPrices, setBulkPrices] = useState<Record<number, string>>({});

    const { data: flavours = [] } = useQuery({
        queryKey: ["admin", "flavours"],
        queryFn: api.getFlavours,
    });

    const { data: products = [] } = useQuery({
        queryKey: ["admin", "products"],
        queryFn: api.getProducts,
    });

    const { data: sizes = [] } = useQuery({
        queryKey: ["admin", "sizes"],
        queryFn: api.getSizes,
    });

    const createSizeMutation = useMutation({
        mutationFn: (data: any) => api.createSize(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "sizes"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            setSizeDialogOpen(false);
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
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            setSizeDialogOpen(false);
            setEditingSize(null);
            toast({ title: "Size updated" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteSizeMutation = useMutation({
        mutationFn: (id: number) => api.deleteSize(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "sizes"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            toast({ title: "Size deleted" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteFlavour(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "flavours"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            setDeleteConfirm(null);
            toast({ title: "Product deleted" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: number) => api.duplicateFlavour(id),
        onSuccess: (newFlavour: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "flavours"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            toast({ title: `Duplicated as "${newFlavour.name}"` });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    // Count variations per flavour
    const variationCounts = products.reduce((acc: Record<number, number>, p: any) => {
        acc[p.flavourId] = (acc[p.flavourId] || 0) + 1;
        return acc;
    }, {});

    const filtered = flavours.filter((f: any) =>
        f.name.toLowerCase().includes(search.toLowerCase())
    );

    const allSelected = filtered.length > 0 && filtered.every((f: any) => selected.has(f.id));

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map((f: any) => f.id)));
        }
    };

    const toggleOne = (id: number) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const bulkDelete = async () => {
        if (!confirm(`Delete ${selected.size} product(s) and all their variations?`)) return;
        for (const id of selected) {
            await api.deleteFlavour(id);
        }
        queryClient.invalidateQueries({ queryKey: ["admin", "flavours"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        setSelected(new Set());
        toast({ title: `Deleted ${selected.size} products` });
    };

    const openBulkEdit = () => {
        const prices: Record<number, string> = {};
        for (const id of selected) {
            const f = flavours.find((fl: any) => fl.id === id);
            if (f) prices[id] = f.basePrice;
        }
        setBulkPrices(prices);
        setBulkEditOpen(true);
    };

    const saveBulkPrices = async () => {
        let updated = 0;
        for (const [id, price] of Object.entries(bulkPrices)) {
            const original = flavours.find((f: any) => f.id === Number(id));
            if (original && original.basePrice !== price) {
                await api.updateFlavour(Number(id), { basePrice: price });
                updated++;
            }
        }
        queryClient.invalidateQueries({ queryKey: ["admin", "flavours"] });
        setBulkEditOpen(false);
        setSelected(new Set());
        toast({ title: `Updated ${updated} product price(s)` });
    };

    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

    const autoSizeSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const openNewSize = () => {
        setEditingSize(null);
        setSizeForm({ name: "", slug: "", volumeOz: 16, price: "7.00", description: "", sortOrder: sizes.length });
        setSizeDialogOpen(true);
    };

    const openEditSize = (size: any) => {
        setEditingSize(size);
        setSizeForm({
            name: size.name,
            slug: size.slug,
            volumeOz: size.volumeOz,
            price: size.price,
            description: size.description || "",
            sortOrder: size.sortOrder,
        });
        setSizeDialogOpen(true);
    };

    const handleSizeSubmit = () => {
        const data = { ...sizeForm, slug: sizeForm.slug || autoSizeSlug(sizeForm.name) };
        if (editingSize) {
            updateSizeMutation.mutate({ id: editingSize.id, data });
        } else {
            createSizeMutation.mutate(data);
        }
    };

    useTour("admin-products", adminProductsSteps);

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex items-center justify-between" data-tour="admin-products-header">
                    <h1 className="text-2xl font-bold text-white">Products</h1>
                    <Link href="/admin/products/new">
                        <Button className="bg-[#A1AB74] hover:bg-[#8a9463]" data-tour="admin-products-add">
                            <Plus className="w-4 h-4 mr-2" /> Add Product
                        </Button>
                    </Link>
                </div>

                <Tabs value={tab} onValueChange={setTab} data-tour="admin-products-tabs">
                    <TabsList>
                        <TabsTrigger value="products">All Products ({flavours.length})</TabsTrigger>
                        <TabsTrigger value="sizes">Sizes ({sizes.length})</TabsTrigger>
                        <TabsTrigger value="menu">Menu Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="products" className="space-y-4">
                        <div className="flex items-center gap-3" data-tour="admin-products-search">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search products..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            {selected.size > 0 && (
                                <>
                                    <Button variant="outline" size="sm" onClick={openBulkEdit} className="bg-white">
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        Edit {selected.size} prices
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={bulkDelete}>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete {selected.size} selected
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="border rounded-lg overflow-hidden bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="w-10">
                                            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                                        </TableHead>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Tag</TableHead>
                                        <TableHead>Base Price</TableHead>
                                        <TableHead>Variations</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((f: any) => (
                                        <TableRow
                                            key={f.id}
                                            className={`cursor-pointer hover:bg-gray-50 ${!f.available ? "opacity-60" : ""}`}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selected.has(f.id)}
                                                    onCheckedChange={() => toggleOne(f.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/admin/products/${f.id}`}>
                                                    {f.imageUrl ? (
                                                        <img
                                                            src={f.imageUrl.startsWith("http") ? f.imageUrl : `${BASE}${f.imageUrl}`}
                                                            alt={f.name}
                                                            className="w-10 h-10 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-2xl">{f.emoji}</span>
                                                    )}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/admin/products/${f.id}`} className="font-medium text-gray-900 hover:text-[#A1AB74]">
                                                    {f.name}
                                                </Link>
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{f.description}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={tagColors[f.tag] || ""}>
                                                    {f.tag}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">${f.basePrice}</TableCell>
                                            <TableCell>
                                                <span className="text-sm text-gray-600">
                                                    {variationCounts[f.id] || 0} variation{(variationCounts[f.id] || 0) !== 1 ? "s" : ""}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {f.available ? (
                                                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inactive</Badge>
                                                )}
                                                {f.heroPosition && (
                                                    <Badge variant="outline" className="ml-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                                        ⭐ Hero #{f.heroPosition}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Duplicate product"
                                                        disabled={duplicateMutation.isPending}
                                                        onClick={() => duplicateMutation.mutate(f.id)}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => setDeleteConfirm({ id: f.id, name: f.name })}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                                {search ? "No products match your search." : "No products yet. Click \"Add Product\" to create one."}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="sizes" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-white/70">Manage ice cream sizes and their default pricing.</p>
                            <Button onClick={openNewSize} className="bg-[#A1AB74] hover:bg-[#8a9463]">
                                <Plus className="w-4 h-4 mr-2" /> Add Size
                            </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>Volume (oz)</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Sort</TableHead>
                                        <TableHead className="w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sizes.map((s: any) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.name}</TableCell>
                                            <TableCell className="text-gray-500 text-sm">{s.slug}</TableCell>
                                            <TableCell>{s.volumeOz} oz</TableCell>
                                            <TableCell className="font-medium">${s.price}</TableCell>
                                            <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">{s.description || "—"}</TableCell>
                                            <TableCell>{s.sortOrder}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => openEditSize(s)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => {
                                                            if (confirm(`Delete size "${s.name}"? Products using this size will also be removed.`)) {
                                                                deleteSizeMutation.mutate(s.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sizes.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                No sizes configured. Click "Add Size" to create one.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="menu">
                        <div className="border rounded-lg overflow-hidden bg-white">
                            <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                                <span className="text-sm text-gray-600">Live menu preview — this is what your customers see</span>
                                <a href="/flavours" target="_blank" rel="noopener noreferrer" className="text-sm text-[#A1AB74] hover:underline flex items-center gap-1">
                                    Open in new tab <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <iframe
                                src="/flavours"
                                className="w-full border-0"
                                style={{ height: "calc(100vh - 220px)", minHeight: "600px" }}
                                title="Menu Preview"
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Size Create/Edit Dialog */}
            <Dialog open={sizeDialogOpen} onOpenChange={(open) => { setSizeDialogOpen(open); if (!open) setEditingSize(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSize ? "Edit Size" : "Add Size"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                            <Label>Name</Label>
                            <Input value={sizeForm.name} onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value, slug: sizeForm.slug || autoSizeSlug(e.target.value) })} placeholder="e.g. Pint" />
                        </div>
                        <div className="space-y-1">
                            <Label>Slug</Label>
                            <Input value={sizeForm.slug} onChange={(e) => setSizeForm({ ...sizeForm, slug: e.target.value })} placeholder="e.g. pint" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Volume (oz)</Label>
                                <Input type="number" value={sizeForm.volumeOz} onChange={(e) => setSizeForm({ ...sizeForm, volumeOz: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Price ($)</Label>
                                <Input value={sizeForm.price} onChange={(e) => setSizeForm({ ...sizeForm, price: e.target.value })} placeholder="7.00" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Description</Label>
                            <Input value={sizeForm.description} onChange={(e) => setSizeForm({ ...sizeForm, description: e.target.value })} placeholder="Optional description" />
                        </div>
                        <div className="space-y-1">
                            <Label>Sort Order</Label>
                            <Input type="number" value={sizeForm.sortOrder} onChange={(e) => setSizeForm({ ...sizeForm, sortOrder: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => { setSizeDialogOpen(false); setEditingSize(null); }}>Cancel</Button>
                            <Button onClick={handleSizeSubmit} disabled={createSizeMutation.isPending || updateSizeMutation.isPending} className="bg-[#A1AB74] hover:bg-[#8a9463]">
                                {(createSizeMutation.isPending || updateSizeMutation.isPending) ? "Saving..." : editingSize ? "Update Size" : "Create Size"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Product</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This will also delete all its size variations. This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Product"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Edit Prices Dialog */}
            <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Bulk Edit Base Prices</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">Edit the base price for each selected product. Changes will be saved for all modified prices.</p>
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pt-2">
                        {Array.from(selected).map((id) => {
                            const f = flavours.find((fl: any) => fl.id === id);
                            if (!f) return null;
                            return (
                                <div key={id} className="flex items-center gap-3">
                                    <span className="text-lg">{f.emoji}</span>
                                    <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                                    <div className="relative w-28">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                        <Input
                                            className="pl-7 text-right"
                                            value={bulkPrices[id] || ""}
                                            onChange={(e) => setBulkPrices({ ...bulkPrices, [id]: e.target.value })}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Cancel</Button>
                        <Button onClick={saveBulkPrices} className="bg-[#A1AB74] hover:bg-[#8a9463]">
                            Save Prices
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
