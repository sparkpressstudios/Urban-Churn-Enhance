import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminRotatingFlavoursSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { IceCreamCone, Plus, Pencil, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useToast } from "@/hooks/use-toast";

interface RotatingFlavour {
    id: number;
    name: string;
    description: string;
    imageUrl: string | null;
    month: number;
    year: number;
    sortOrder: number;
    active: boolean;
}

const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const now = new Date();

const emptyForm: Omit<RotatingFlavour, "id"> = {
    name: "",
    description: "",
    imageUrl: null,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    sortOrder: 0,
    active: true,
};

export default function AdminRotatingFlavours() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<RotatingFlavour | null>(null);
    const [form, setForm] = useState(emptyForm);

    // Filter state
    const [filterMonth, setFilterMonth] = useState<string>("");
    const [filterYear, setFilterYear] = useState<string>("");

    // Build query params
    const queryParams: Record<string, string> = {};
    if (filterMonth && filterMonth !== "all") queryParams.month = filterMonth;
    if (filterYear) queryParams.year = filterYear;

    const { data: flavours = [], isLoading } = useQuery<RotatingFlavour[]>({
        queryKey: ["admin", "rotating-flavours", queryParams],
        queryFn: () => api.getRotatingFlavours(Object.keys(queryParams).length ? queryParams : undefined),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createRotatingFlavour(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "rotating-flavours"] });
            setDialogOpen(false);
            toast({ title: "Rotating flavor created" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateRotatingFlavour(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "rotating-flavours"] });
            setDialogOpen(false);
            toast({ title: "Rotating flavor updated" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteRotatingFlavour(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "rotating-flavours"] });
            toast({ title: "Rotating flavor deleted" });
        },
    });

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setDialogOpen(true);
    }

    function openEdit(flavour: RotatingFlavour) {
        setEditing(flavour);
        setForm({
            name: flavour.name,
            description: flavour.description,
            imageUrl: flavour.imageUrl,
            month: flavour.month,
            year: flavour.year,
            sortOrder: flavour.sortOrder,
            active: flavour.active,
        });
        setDialogOpen(true);
    }

    function handleSave() {
        if (!form.name.trim()) {
            toast({ title: "Name is required", variant: "destructive" });
            return;
        }
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    }

    const monthLabel = (m: number) => MONTHS.find((x) => x.value === m)?.label ?? String(m);

    useTour("admin-rotating-flavours", adminRotatingFlavoursSteps);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between" data-tour="admin-rotating-header">
                    <div className="flex items-center gap-3">
                        <IceCreamCone className="h-7 w-7 text-[#d4a853]" />
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white">Rotating Scoop Flavours</h1>
                            <p className="text-sm text-white/70">Manage the monthly rotating flavours displayed on the Locations page</p>
                        </div>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" /> Add Flavour
                    </Button>
                </div>

                {/* Filters */}
                <Card data-tour="admin-rotating-filters">
                    <CardContent className="pt-6">
                        <div className="flex items-end gap-4">
                            <div className="w-40">
                                <label className="text-sm font-medium mb-1 block">Month</label>
                                <Select value={filterMonth} onValueChange={setFilterMonth}>
                                    <SelectTrigger><SelectValue placeholder="All months" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All months</SelectItem>
                                        {MONTHS.map((m) => (
                                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-32">
                                <label className="text-sm font-medium mb-1 block">Year</label>
                                <Input
                                    type="number"
                                    placeholder="All years"
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                />
                            </div>
                            {(filterMonth || filterYear) && (
                                <Button variant="ghost" size="sm" onClick={() => { setFilterMonth(""); setFilterYear(""); }}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card data-tour="admin-rotating-table">
                    <CardHeader>
                        <CardTitle>
                            Flavors {flavours.length > 0 && <Badge variant="secondary" className="ml-2">{flavours.length}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-muted-foreground py-8 text-center">Loading…</p>
                        ) : flavours.length === 0 ? (
                            <p className="text-muted-foreground py-8 text-center">No rotating flavors found. Click "Add Flavor" to create one.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Image</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Month / Year</TableHead>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flavours.map((f) => (
                                        <TableRow key={f.id}>
                                            <TableCell>
                                                {f.imageUrl ? (
                                                    <img src={f.imageUrl} alt={f.name} className="w-12 h-12 rounded-lg object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">
                                                        No img
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{f.name}</p>
                                                    {f.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{f.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{monthLabel(f.month)} {f.year}</TableCell>
                                            <TableCell>{f.sortOrder}</TableCell>
                                            <TableCell>
                                                <Badge variant={f.active ? "default" : "secondary"}>
                                                    {f.active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            if (confirm(`Delete "${f.name}"?`)) {
                                                                deleteMutation.mutate(f.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Rotating Flavor" : "Add Rotating Flavor"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Name *</label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Strawberry Basil Swirl"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Description</label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="A brief description of this flavor…"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Image</label>
                            <ImageUpload
                                value={form.imageUrl}
                                onChange={(url) => setForm({ ...form, imageUrl: url })}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Month *</label>
                                <Select
                                    value={String(form.month)}
                                    onValueChange={(v) => setForm({ ...form, month: Number(v) })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m) => (
                                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Year *</label>
                                <Input
                                    type="number"
                                    value={form.year}
                                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Sort Order</label>
                                <Input
                                    type="number"
                                    value={form.sortOrder}
                                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <Switch
                                    checked={form.active}
                                    onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                                />
                                <label className="text-sm font-medium">Active</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {createMutation.isPending || updateMutation.isPending ? "Saving…" : editing ? "Update" : "Create"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
