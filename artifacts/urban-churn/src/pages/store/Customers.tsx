import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StoreLayout } from "@/components/store/StoreLayout";
import { useStoreContext } from "@/components/store/StoreContext";
import { storeApi } from "@/lib/store-api";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type CustomerForm = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
};

const fields: { key: keyof CustomerForm; label: string; type?: string }[] = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "ZIP Code" },
    { key: "country", label: "Country" },
];

const PAGE_SIZE = 50;

export default function StoreCustomers() {
    const queryClient = useQueryClient();
    const { selectedLocationId, setSelectedLocationId, showLocationSwitcher } = useStoreContext();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<CustomerForm>({
        firstName: "", lastName: "", email: "", phone: "",
        address: "", city: "", state: "", zip: "", country: "US",
    });
    const [editError, setEditError] = useState("");

    const { data: result, isLoading } = useQuery({
        queryKey: ["store", "customers", selectedLocationId, debouncedSearch, page],
        queryFn: () => {
            const params: Record<string, string> = {
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE),
            };
            if (selectedLocationId) params.locationId = String(selectedLocationId);
            if (debouncedSearch) params.search = debouncedSearch;
            return storeApi.getCustomers(params);
        },
    });

    const customers: any[] = result?.data ?? [];
    const total = Number(result?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const saveMutation = useMutation({
        mutationFn: (data: CustomerForm) => storeApi.updateCustomer(editing.id, data, selectedLocationId ?? undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["store", "customers"] });
            setEditing(null);
            setEditError("");
            toast.success("Customer profile updated");
        },
        onError: (error: Error) => setEditError(error.message || "Unable to save customer"),
    });

    const openEdit = (customer: any) => {
        setEditError("");
        setForm({
            firstName: customer.firstName || "",
            lastName: customer.lastName || "",
            email: customer.email || "",
            phone: customer.phone || "",
            address: customer.address || "",
            city: customer.city || "",
            state: customer.state || "",
            zip: customer.zip || "",
            country: customer.country || "US",
        });
        setEditing(customer);
    };

    return (
        <StoreLayout selectedLocationId={selectedLocationId}
            onLocationChange={(id) => { setSelectedLocationId(id); setPage(1); }}
            showLocationSwitcher={showLocationSwitcher}>
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Customers</h1>
                    <p className="text-sm text-white/70 mt-1">
                        {showLocationSwitcher ? "Customer profiles by location" : "Customers who ordered from your store"}
                    </p>
                </div>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search name, email or phone..." className="pl-9 bg-white" />
                </div>
                <Card className="bg-white">
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 text-gray-600 text-left border-b">
                                <th className="p-3">Name</th><th className="p-3">Email</th>
                                <th className="p-3">Phone</th><th className="p-3">City</th>
                                <th className="p-3">Actions</th>
                            </tr></thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} className="text-center text-gray-500 p-8">Loading customers…</td></tr>
                                ) : customers.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center text-gray-500 p-8">No customers found for this location.</td></tr>
                                ) : customers.map((customer) => (
                                    <tr key={customer.id} className="border-b last:border-0">
                                        <td className="p-3 font-medium">{[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—"}</td>
                                        <td className="p-3">{customer.email}</td>
                                        <td className="p-3">{customer.phone || "—"}</td>
                                        <td className="p-3">{[customer.city, customer.state].filter(Boolean).join(", ") || "—"}</td>
                                        <td className="p-3">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(customer)}
                                                aria-label={`Edit ${customer.email}`}>
                                                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
                {totalPages > 1 && <div className="flex items-center justify-between text-sm text-white">
                    <span>Page {page} of {totalPages} · {total} customers</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                </div>}
            </div>

            <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !saveMutation.isPending) setEditing(null); }}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                        <DialogDescription>
                            Updates the customer profile. Existing orders and Square records are not changed.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}>
                        {fields.map((field) => (
                            <div className="space-y-1" key={field.key}>
                                <Label htmlFor={`staff-customer-${field.key}`}>{field.label}</Label>
                                <Input
                                    id={`staff-customer-${field.key}`}
                                    type={field.type || "text"}
                                    required={field.key === "email"}
                                    maxLength={field.key === "email" ? 254 : field.key === "address" ? 300 : field.key === "phone" ? 40 : 120}
                                    disabled={field.key === "email" && editing?.hasAccount}
                                    value={form[field.key]}
                                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                                />
                            </div>
                        ))}
                        {editing?.hasAccount && <p className="text-xs text-gray-500">Account login emails require customer verification to change.</p>}
                        {editError && <p role="alert" className="text-sm text-red-600">{editError}</p>}
                        <div className="flex gap-2 justify-end pt-2">
                            <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={() => setEditing(null)}>Cancel</Button>
                            <Button type="submit" disabled={saveMutation.isPending || !form.email.trim()}
                                className="bg-[#A1AB74] hover:bg-[#8B9563] text-white">
                                {saveMutation.isPending ? "Saving…" : "Save Customer"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </StoreLayout>
    );
}
