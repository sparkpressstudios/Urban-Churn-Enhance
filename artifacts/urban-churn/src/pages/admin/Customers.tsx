import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminCustomersSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Users, Search, Pencil, Trash2, Plus } from "lucide-react";

const EMPTY_CREATE_FORM = { firstName: "", lastName: "", email: "", phone: "", address: "", city: "", state: "", zip: "", country: "US" };

export default function AdminCustomers() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<Record<string, string>>(EMPTY_CREATE_FORM);
    const [createError, setCreateError] = useState("");

    const { data: customersResponse } = useQuery({
        queryKey: ["admin", "customers", debouncedSearch],
        queryFn: () => api.getCustomers(debouncedSearch || undefined),
    });
    const customers = customersResponse?.data ?? [];

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            api.updateCustomer(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
            setEditing(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteCustomer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createCustomer(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
            setShowCreate(false);
            setCreateForm(EMPTY_CREATE_FORM);
            setCreateError("");
        },
        onError: (e: any) => setCreateError(e.message || "Failed to create customer"),
    });

    const openEdit = (customer: any) => {
        setForm({
            firstName: customer.firstName || "",
            lastName: customer.lastName || "",
            phone: customer.phone || "",
            address: customer.address || "",
            city: customer.city || "",
            state: customer.state || "",
            zip: customer.zip || "",
            country: customer.country || "US",
        });
        setEditing(customer);
    };

    useTour("admin-customers", adminCustomersSteps);

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex items-center justify-between" data-tour="admin-customers-header">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Customers</h1>
                        <p className="text-sm text-white/70 mt-1">
                            Manage customers imported from WooCommerce
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm">
                            <Users className="w-3 h-3 mr-1" />
                            {(customers as any[]).length}
                        </Badge>
                        <Button size="sm" onClick={() => { setShowCreate(true); setCreateError(""); setCreateForm(EMPTY_CREATE_FORM); }} className="bg-[#A1AB74] hover:bg-[#8B9563] text-white">
                            <Plus className="w-3 h-3 mr-1" />
                            Add Customer
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-sm" data-tour="admin-customers-search">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by email..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Customer Table */}
                <Card data-tour="admin-customers-table">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Orders</TableHead>
                                    <TableHead>Total Spent</TableHead>
                                    <TableHead className="w-20">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(customers as any[]).length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center py-8 text-gray-400"
                                        >
                                            No customers found. Import customers from a WooCommerce
                                            CSV.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    (customers as any[]).map((c: any) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">
                                                {c.firstName} {c.lastName}
                                                {c.wooCustomerId && (
                                                    <span className="text-xs text-gray-400 ml-1">
                                                        (WC #{c.wooCustomerId})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{c.email}</TableCell>
                                            <TableCell className="text-sm">
                                                {c.phone || "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {c.ordersCount}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                ${(c.totalSpentCents / 100).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => openEdit(c)}
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                        onClick={() => {
                                                            if (
                                                                confirm(
                                                                    `Delete customer ${c.firstName} ${c.lastName}?`,
                                                                )
                                                            )
                                                                deleteMutation.mutate(c.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Create Dialog */}
                <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); setCreateError(""); }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Customer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            {createError && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{createError}</p>}
                            <div>
                                <Label className="text-xs">Email *</Label>
                                <Input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                    placeholder="customer@example.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">First Name</Label>
                                    <Input value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <Label className="text-xs">Last Name</Label>
                                    <Input value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Phone</Label>
                                <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                            </div>
                            <div>
                                <Label className="text-xs">Address</Label>
                                <Input value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs">City</Label>
                                    <Input value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} />
                                </div>
                                <div>
                                    <Label className="text-xs">State</Label>
                                    <Input value={createForm.state} onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })} />
                                </div>
                                <div>
                                    <Label className="text-xs">ZIP</Label>
                                    <Input value={createForm.zip} onChange={(e) => setCreateForm({ ...createForm, zip: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                                <Button
                                    onClick={() => createMutation.mutate(createForm)}
                                    disabled={createMutation.isPending || !createForm.email.trim()}
                                    className="flex-1 bg-[#A1AB74] hover:bg-[#8B9563] text-white"
                                >
                                    {createMutation.isPending ? "Creating…" : "Create Customer"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Customer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">First Name</Label>
                                    <Input
                                        value={form.firstName}
                                        onChange={(e) =>
                                            setForm({ ...form, firstName: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Last Name</Label>
                                    <Input
                                        value={form.lastName}
                                        onChange={(e) =>
                                            setForm({ ...form, lastName: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Phone</Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({ ...form, phone: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Address</Label>
                                <Input
                                    value={form.address}
                                    onChange={(e) =>
                                        setForm({ ...form, address: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs">City</Label>
                                    <Input
                                        value={form.city}
                                        onChange={(e) =>
                                            setForm({ ...form, city: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">State</Label>
                                    <Input
                                        value={form.state}
                                        onChange={(e) =>
                                            setForm({ ...form, state: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">ZIP</Label>
                                    <Input
                                        value={form.zip}
                                        onChange={(e) =>
                                            setForm({ ...form, zip: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(null)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() =>
                                        updateMutation.mutate({ id: editing.id, data: form })
                                    }
                                    disabled={updateMutation.isPending}
                                    className="flex-1 bg-[#A1AB74] hover:bg-[#8B9563] text-white"
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
