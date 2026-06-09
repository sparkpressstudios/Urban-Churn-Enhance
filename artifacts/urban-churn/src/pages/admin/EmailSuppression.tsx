import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
    EmailEmptyState,
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import { ArrowLeft, Search } from "lucide-react";
import { formatEasternDate } from "@/lib/utils";

const SUPPRESSION_STATUSES = ["unsubscribed", "bounced", "complained"] as const;

export default function EmailSuppression() {
    const [status, setStatus] = useState<string>("unsubscribed");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-suppression", status, search, page],
        queryFn: () => api.getEmailContacts({ status, search, page, limit: 50 }),
    });

    const contacts = data?.contacts ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 50));

    return (
        <AdminLayout>
            <div className="mb-6">
                <Link href="/admin/email">
                    <Button variant="ghost" size="sm" className="mb-2">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Email Marketing
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Suppression list</h1>
                <p className="text-sm text-gray-500">
                    Contacts who unsubscribed, bounced, or marked emails as spam. They are excluded from sends.
                </p>
            </div>

            <Card className="mb-4">
                <CardContent className="flex flex-wrap gap-3 py-4">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            className="pl-9"
                            placeholder="Search email or name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {SUPPRESSION_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {isLoading ? (
                <EmailLoadingState />
            ) : isError ? (
                <EmailErrorState onRetry={() => refetch()} />
            ) : contacts.length === 0 ? (
                <EmailEmptyState title="No suppressed contacts" description="No contacts match this filter." />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{total} contact{total === 1 ? "" : "s"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts.map((c: any) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <Link href={`/admin/email/contacts/${c.id}`} className="text-blue-600 hover:underline">
                                                {c.email}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                                        <TableCell><Badge variant="secondary">{c.marketingStatus}</Badge></TableCell>
                                        <TableCell className="text-sm text-gray-500">{formatEasternDate(c.updatedAt)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {totalPages > 1 ? (
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
            )}
        </AdminLayout>
    );
}
