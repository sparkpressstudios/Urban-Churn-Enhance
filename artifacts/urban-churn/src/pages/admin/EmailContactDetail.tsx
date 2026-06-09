import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { formatEasternDate } from "@/lib/utils";

export default function EmailContactDetail() {
    const params = useParams<{ id: string }>();
    const contactId = parseInt(params.id || "0", 10);
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-contact-activity", contactId],
        queryFn: () => api.getEmailContactActivity(contactId),
        enabled: contactId > 0,
    });

    const [form, setForm] = useState<Record<string, string> | null>(null);

    const contact = data?.contact;
    const events = data?.events ?? [];

    const currentForm = form ?? (contact ? {
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zip: contact.zip,
        marketingStatus: contact.marketingStatus,
    } : null);

    const saveMutation = useMutation({
        mutationFn: () => api.updateEmailContact(contactId, currentForm ?? {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contact-activity", contactId] });
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contacts"] });
            setForm(null);
            toast({ title: "Contact updated" });
        },
        onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.deleteEmailContact(contactId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-contacts"] });
            toast({ title: "Contact deleted" });
            navigate("/admin/email/contacts");
        },
        onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
    });

    if (isLoading) {
        return (
            <AdminLayout>
                <EmailLoadingState />
            </AdminLayout>
        );
    }

    if (isError || !contact || !currentForm) {
        return (
            <AdminLayout>
                <EmailErrorState message="Contact not found or failed to load." onRetry={() => refetch()} />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-6">
                <Link href="/admin/email/contacts">
                    <Button variant="ghost" size="sm" className="mb-2">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Contacts
                    </Button>
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{contact.email}</h1>
                    <Badge>{contact.marketingStatus}</Badge>
                    <Badge variant="outline">{contact.source}</Badge>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            {([
                                ["firstName", "First name"],
                                ["lastName", "Last name"],
                                ["phone", "Phone"],
                                ["address", "Address"],
                                ["city", "City"],
                                ["state", "State"],
                                ["zip", "ZIP"],
                            ] as const).map(([key, label]) => (
                                <div key={key}>
                                    <Label>{label}</Label>
                                    <Input
                                        value={currentForm[key]}
                                        onChange={(e) => setForm({ ...currentForm, [key]: e.target.value })}
                                    />
                                </div>
                            ))}
                            <div>
                                <Label>Marketing status</Label>
                                <Select
                                    value={currentForm.marketingStatus}
                                    onValueChange={(v) => setForm({ ...currentForm, marketingStatus: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="subscribed">Subscribed</SelectItem>
                                        <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                                        <SelectItem value="bounced">Bounced</SelectItem>
                                        <SelectItem value="complained">Complained</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-wrap gap-2 sm:col-span-2">
                                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                    <Save className="mr-1 h-4 w-4" />
                                    Save changes
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="text-red-600">
                                            <Trash2 className="mr-1 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This removes {contact.email} from your marketing audience permanently.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Activity timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {events.length === 0 ? (
                                <p className="text-sm text-gray-400">No campaign activity recorded yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Campaign</TableHead>
                                            <TableHead>When</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {events.map((e: any) => (
                                            <TableRow key={e.id}>
                                                <TableCell>
                                                    <Badge variant="outline">{e.eventType}</Badge>
                                                    {e.metadata?.link ? (
                                                        <p className="mt-1 max-w-xs truncate text-xs text-gray-400">{e.metadata.link}</p>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {e.campaignName ? (
                                                        <Link href={`/admin/email/campaigns/${e.campaignId}`} className="text-blue-600 hover:underline">
                                                            {e.campaignName}
                                                        </Link>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {formatEasternDate(e.occurredAt)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div>
                            <p className="text-gray-500">Consent source</p>
                            <p>{contact.consentSource || "—"}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Added</p>
                            <p>{formatEasternDate(contact.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Last updated</p>
                            <p>{formatEasternDate(contact.updatedAt)}</p>
                        </div>
                        {contact.resendContactId ? (
                            <div>
                                <p className="text-gray-500">Resend contact ID</p>
                                <p className="break-all font-mono text-xs">{contact.resendContactId}</p>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
