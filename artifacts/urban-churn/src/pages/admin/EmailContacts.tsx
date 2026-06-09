import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import { Search, Plus, Upload, Users, Download } from "lucide-react";

type Step = "upload" | "preview" | "result";

export default function EmailContacts() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importStep, setImportStep] = useState<Step>("upload");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const [form, setForm] = useState({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zip: "",
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-contacts", search, statusFilter, page],
        queryFn: () => api.getEmailContacts({
            search,
            status: statusFilter || undefined,
            page,
            limit: 50,
        }),
    });

    const createMutation = useMutation({
        mutationFn: () => api.createEmailContact(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contacts"] });
            setShowAdd(false);
            setForm({ email: "", firstName: "", lastName: "", phone: "", address: "", city: "", state: "", zip: "" });
            toast({ title: "Contact added" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const previewMutation = useMutation({
        mutationFn: (file: File) => api.previewEmailContactImport(file),
        onSuccess: (result) => {
            setPreviewData(result);
            setImportStep("preview");
        },
        onError: (err: Error) => toast({ title: "Preview failed", description: err.message, variant: "destructive" }),
    });

    const importMutation = useMutation({
        mutationFn: (file: File) => api.executeEmailContactImport(file),
        onSuccess: (result) => {
            setImportResult(result);
            setImportStep("result");
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contacts"] });
        },
        onError: (err: Error) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
    });

    const syncCustomersMutation = useMutation({
        mutationFn: api.syncEmailContactsFromCustomers,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contacts"] });
            toast({ title: `Imported ${result.imported} contacts`, description: `${result.skipped} skipped (duplicates)` });
        },
        onError: (err: Error) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
    });

    const syncInquiriesMutation = useMutation({
        mutationFn: api.syncEmailContactsFromInquiries,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contacts"] });
            toast({ title: `Imported ${result.imported} contacts`, description: `${result.skipped} skipped (duplicates)` });
        },
        onError: (err: Error) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
    });

    const syncSquareMutation = useMutation({
        mutationFn: api.syncEmailContactsFromSquare,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contacts"] });
            toast({
                title: `Imported ${result.imported} Square contacts`,
                description: `${result.skipped} skipped · ${result.updated ?? 0} customer records linked`,
            });
        },
        onError: (err: Error) => toast({ title: "Square sync failed", description: err.message, variant: "destructive" }),
    });

    const contacts = data?.contacts ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 50));

    return (
        <AdminLayout>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Contacts</h1>
                    <p className="text-sm text-gray-500">Manage your marketing audience and CRM data.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => syncSquareMutation.mutate()} disabled={syncSquareMutation.isPending}>
                        <Download className="mr-1 h-4 w-4" />
                        Sync Square POS
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => syncCustomersMutation.mutate()} disabled={syncCustomersMutation.isPending}>
                        <Download className="mr-1 h-4 w-4" />
                        Sync Online Customers
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => syncInquiriesMutation.mutate()} disabled={syncInquiriesMutation.isPending}>
                        <Users className="mr-1 h-4 w-4" />
                        Sync Inquiries
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowImport(true); setImportStep("upload"); setPreviewData(null); setImportResult(null); }}>
                        <Upload className="mr-1 h-4 w-4" />
                        Import CSV
                    </Button>
                    <Button size="sm" onClick={() => setShowAdd(true)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Contact
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search contacts..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="subscribed">Subscribed</SelectItem>
                                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                                <SelectItem value="bounced">Bounced</SelectItem>
                                <SelectItem value="complained">Complained</SelectItem>
                            </SelectContent>
                        </Select>
                        <Badge variant="secondary">{total} contacts</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <EmailLoadingState />
                    ) : isError ? (
                        <EmailErrorState onRetry={() => refetch()} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Source</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts.map((c: any) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/admin/email/contacts/${c.id}`} className="text-blue-600 hover:underline">
                                                {c.email}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={c.marketingStatus === "subscribed" ? "default" : "secondary"}>
                                                {c.marketingStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">{c.source}</TableCell>
                                    </TableRow>
                                ))}
                                {contacts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-400">
                                            No contacts yet. Add manually or import a CSV.
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    )}
                    {totalPages > 1 && !isLoading && !isError ? (
                        <div className="mt-4 flex items-center justify-between">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                Previous
                            </Button>
                            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                Next
                            </Button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Contact</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <div>
                            <Label>Email *</Label>
                            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>First name</Label>
                                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                            </div>
                            <div>
                                <Label>Last name</Label>
                                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                            <Label>Address</Label>
                            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label>City</Label>
                                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                            </div>
                            <div>
                                <Label>State</Label>
                                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                            </div>
                            <div>
                                <Label>ZIP</Label>
                                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                            </div>
                        </div>
                        <Button onClick={() => createMutation.mutate()} disabled={!form.email || createMutation.isPending}>
                            Add Contact
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showImport} onOpenChange={setShowImport}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Import Contacts from CSV</DialogTitle>
                    </DialogHeader>
                    {importStep === "upload" && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                CSV must include an <strong>email</strong> column. Optional: first name, last name, phone, address, city, state, zip.
                            </p>
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                            />
                            <Button
                                disabled={!selectedFile || previewMutation.isPending}
                                onClick={() => selectedFile && previewMutation.mutate(selectedFile)}
                            >
                                Preview Import
                            </Button>
                        </div>
                    )}
                    {importStep === "preview" && previewData && (
                        <div className="space-y-4">
                            <p className="text-sm">
                                <strong>{previewData.totalRows}</strong> rows detected in {previewData.filename}
                            </p>
                            {previewData.parseErrors?.length > 0 && (
                                <p className="text-sm text-amber-600">{previewData.parseErrors.length} parse warnings</p>
                            )}
                            <Button
                                onClick={() => selectedFile && importMutation.mutate(selectedFile)}
                                disabled={importMutation.isPending}
                            >
                                Import {previewData.totalRows} Contacts
                            </Button>
                        </div>
                    )}
                    {importStep === "result" && importResult && (
                        <div className="space-y-2 text-sm">
                            <p>Imported: <strong>{importResult.importedRows}</strong></p>
                            <p>Skipped (duplicates): <strong>{importResult.skippedRows}</strong></p>
                            {importResult.errors?.length > 0 && (
                                <p className="text-amber-600">{importResult.errors.length} errors</p>
                            )}
                            <Button onClick={() => setShowImport(false)}>Done</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
