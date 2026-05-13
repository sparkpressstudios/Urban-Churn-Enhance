import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api } from "@/lib/api";
import { formatEasternDate } from "@/lib/utils";
import { useTour } from "@/lib/tour";
import { adminCouponsSteps } from "@/lib/tour/tour-steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";

type Coupon = {
    id: number;
    code: string;
    description: string;
    type: "percentage" | "fixed";
    value: string;
    minOrderCents: number;
    maxUsageCount: number | null;
    usageCount: number;
    active: boolean;
    expiresAt: string | null;
    createdAt: string;
};

type CouponForm = {
    code: string;
    description: string;
    type: "percentage" | "fixed";
    value: string;
    minOrderCents: number;
    maxUsageCount: string;
    active: boolean;
    expiresAt: string;
};

const emptyCoupon: CouponForm = {
    code: "",
    description: "",
    type: "percentage",
    value: "",
    minOrderCents: 0,
    maxUsageCount: "",
    active: true,
    expiresAt: "",
};

export default function AdminCoupons() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const { data: coupons = [] } = useQuery<Coupon[]>({
        queryKey: ["admin", "coupons"],
        queryFn: () => api.getCoupons(),
    });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyCoupon);

    const saveMutation = useMutation({
        mutationFn: (data: any) =>
            editingId ? api.updateCoupon(editingId, data) : api.createCoupon(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
            setDialogOpen(false);
            toast({ title: editingId ? "Coupon updated" : "Coupon created" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteCoupon(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
            toast({ title: "Coupon deleted" });
        },
    });

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyCoupon);
        setDialogOpen(true);
    };

    const openEdit = (c: Coupon) => {
        setEditingId(c.id);
        setForm({
            code: c.code,
            description: c.description,
            type: c.type,
            value: c.value,
            minOrderCents: c.minOrderCents,
            maxUsageCount: c.maxUsageCount !== null ? String(c.maxUsageCount) : "",
            active: c.active,
            expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : "",
        });
        setDialogOpen(true);
    };

    const handleSave = () => {
        if (!form.code.trim() || !form.value) return;
        saveMutation.mutate({
            code: form.code,
            description: form.description,
            type: form.type,
            value: parseFloat(form.value),
            minOrderCents: form.minOrderCents,
            maxUsageCount: form.maxUsageCount ? parseInt(form.maxUsageCount) : null,
            active: form.active,
            expiresAt: form.expiresAt || null,
        });
    };

    useTour("admin-coupons", adminCouponsSteps);

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6" data-tour="admin-coupons-header">
                <div>
                    <h1 className="text-2xl font-bold text-white">Coupons</h1>
                    <p className="text-white/70 text-sm">Manage discount codes</p>
                </div>
                <Button onClick={openCreate} className="bg-[#A1AB74] hover:bg-[#8a9360]" data-tour="admin-coupons-create">
                    <Plus className="w-4 h-4 mr-2" /> Add Coupon
                </Button>
            </div>

            <div className="bg-white rounded-xl border" data-tour="admin-coupons-table">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {coupons.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                                    <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No coupons yet
                                </TableCell>
                            </TableRow>
                        )}
                        {coupons.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-mono font-bold">{c.code}</TableCell>
                                <TableCell className="capitalize">{c.type}</TableCell>
                                <TableCell>
                                    {c.type === "percentage"
                                        ? `${c.value}%`
                                        : `$${parseFloat(c.value).toFixed(2)}`}
                                </TableCell>
                                <TableCell>
                                    {c.usageCount}
                                    {c.maxUsageCount !== null && ` / ${c.maxUsageCount}`}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={c.active ? "default" : "secondary"}>
                                        {c.active ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {c.expiresAt
                                        ? formatEasternDate(c.expiresAt)
                                        : "—"}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEdit(c)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm("Delete this coupon?"))
                                                    deleteMutation.mutate(c.id);
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? "Edit Coupon" : "Create Coupon"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Code</Label>
                            <Input
                                value={form.code}
                                onChange={(e) =>
                                    setForm({ ...form, code: e.target.value.toUpperCase() })
                                }
                                placeholder="SUMMER20"
                                className="font-mono"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Input
                                value={form.description}
                                onChange={(e) =>
                                    setForm({ ...form, description: e.target.value })
                                }
                                placeholder="20% off summer special"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Type</Label>
                                <Select
                                    value={form.type}
                                    onValueChange={(v) =>
                                        setForm({ ...form, type: v as "percentage" | "fixed" })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Value</Label>
                                <Input
                                    type="number"
                                    value={form.value}
                                    onChange={(e) =>
                                        setForm({ ...form, value: e.target.value })
                                    }
                                    placeholder={form.type === "percentage" ? "20" : "5.00"}
                                    step={form.type === "percentage" ? "1" : "0.01"}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Min Order ($)</Label>
                                <Input
                                    type="number"
                                    value={form.minOrderCents / 100 || ""}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            minOrderCents: Math.round(
                                                parseFloat(e.target.value || "0") * 100,
                                            ),
                                        })
                                    }
                                    placeholder="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <Label>Max Uses (blank = unlimited)</Label>
                                <Input
                                    type="number"
                                    value={form.maxUsageCount}
                                    onChange={(e) =>
                                        setForm({ ...form, maxUsageCount: e.target.value })
                                    }
                                    placeholder="Unlimited"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Expires At (optional)</Label>
                            <Input
                                type="datetime-local"
                                value={form.expiresAt}
                                onChange={(e) =>
                                    setForm({ ...form, expiresAt: e.target.value })
                                }
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="coupon-active"
                                checked={form.active}
                                onChange={(e) =>
                                    setForm({ ...form, active: e.target.checked })
                                }
                                className="rounded"
                            />
                            <Label htmlFor="coupon-active">Active</Label>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="w-full bg-[#A1AB74] hover:bg-[#8a9360]"
                        >
                            {saveMutation.isPending ? "Saving..." : "Save Coupon"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
