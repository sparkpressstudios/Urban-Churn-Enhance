import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import { formatEasternDate } from "@/lib/utils";
import {
    ArrowLeft,
    Save,
    Send,
    Mail,
    Clock,
    XCircle,
    Check,
    MousePointer,
    ChevronRight,
    ChevronLeft,
    Trash2,
    CheckCircle2,
    Circle,
    ExternalLink,
} from "lucide-react";

const WIZARD_STEPS = ["Setup", "Audience", "Content", "Review", "Send"] as const;

export default function EmailCampaignEditor() {
    const params = useParams<{ id: string }>();
    const campaignId = parseInt(params.id || "0", 10);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [step, setStep] = useState(0);
    const [showTest, setShowTest] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [scheduleAt, setScheduleAt] = useState("");

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-campaign", campaignId],
        queryFn: () => api.getEmailCampaign(campaignId),
        enabled: campaignId > 0,
    });

    const { data: templates = [] } = useQuery({
        queryKey: ["admin", "email-templates"],
        queryFn: api.getEmailTemplates,
    });

    const { data: segments = [] } = useQuery({
        queryKey: ["admin", "email-segments"],
        queryFn: api.getEmailSegments,
    });

    const { data: status } = useQuery({
        queryKey: ["admin", "email-marketing-status"],
        queryFn: api.getEmailMarketingStatus,
    });

    const { data: topics = [] } = useQuery({
        queryKey: ["admin", "email-topics"],
        queryFn: api.getEmailTopics,
    });

    const { data: campaignStats } = useQuery({
        queryKey: ["admin", "email-campaign-stats", campaignId],
        queryFn: () => api.getEmailCampaignStats(campaignId),
        enabled: campaignId > 0 && (data?.campaign?.status === "sent" || data?.campaign?.status === "scheduled"),
    });

    const { data: recipients = [] } = useQuery({
        queryKey: ["admin", "email-campaign-recipients", campaignId],
        queryFn: () => api.getEmailCampaignRecipients(campaignId),
        enabled: campaignId > 0 && data?.campaign?.status === "sent",
    });

    const { data: linkStats } = useQuery({
        queryKey: ["admin", "email-campaign-links", campaignId],
        queryFn: () => api.getEmailCampaignLinks(campaignId),
        enabled: campaignId > 0 && data?.campaign?.status === "sent",
    });

    const { data: precheck, refetch: refetchPrecheck } = useQuery({
        queryKey: ["admin", "email-campaign-precheck", campaignId],
        queryFn: () => api.getEmailCampaignPrecheck(campaignId),
        enabled: campaignId > 0,
    });

    const [form, setForm] = useState<{
        name: string;
        subject: string;
        previewText: string;
        templateId: string;
        segmentId: string;
        topicId: string;
        fromEmail: string;
        replyTo: string;
    } | null>(null);

    const campaign = data?.campaign;
    const events = data?.events ?? [];
    const stats = (campaign?.stats as Record<string, number>) || {};

    useEffect(() => {
        if (campaign && !form) {
            setForm({
                name: campaign.name,
                subject: campaign.subject,
                previewText: campaign.previewText,
                templateId: campaign.templateId ? String(campaign.templateId) : "",
                segmentId: campaign.segmentId ? String(campaign.segmentId) : "",
                topicId: campaign.topicId ? String(campaign.topicId) : "",
                fromEmail: campaign.fromEmail || status?.marketingFromEmail || "",
                replyTo: campaign.replyTo || "",
            });
        }
    }, [campaign, form, status?.marketingFromEmail]);

    const saveMutation = useMutation({
        mutationFn: () =>
            api.updateEmailCampaign(campaignId, {
                name: form?.name,
                subject: form?.subject,
                previewText: form?.previewText,
                templateId: form?.templateId ? parseInt(form.templateId, 10) : null,
                segmentId: form?.segmentId ? parseInt(form.segmentId, 10) : null,
                topicId: form?.topicId ? parseInt(form.topicId, 10) : null,
                fromEmail: form?.fromEmail,
                replyTo: form?.replyTo,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaign", campaignId] });
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaign-precheck", campaignId] });
            toast({ title: "Campaign saved" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const testMutation = useMutation({
        mutationFn: () => api.sendEmailCampaignTest(campaignId, testEmail),
        onSuccess: () => {
            setShowTest(false);
            toast({ title: "Test email sent" });
        },
        onError: (err: Error) => toast({ title: "Test failed", description: err.message, variant: "destructive" }),
    });

    const sendMutation = useMutation({
        mutationFn: () => api.sendEmailCampaign(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaign", campaignId] });
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaigns"] });
            toast({ title: "Campaign sent!" });
        },
        onError: (err: Error) => toast({ title: "Send failed", description: err.message, variant: "destructive" }),
    });

    const scheduleMutation = useMutation({
        mutationFn: () => api.scheduleEmailCampaign(campaignId, new Date(scheduleAt).toISOString()),
        onSuccess: () => {
            setShowSchedule(false);
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaign", campaignId] });
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaigns"] });
            toast({ title: "Campaign scheduled" });
        },
        onError: (err: Error) => toast({ title: "Schedule failed", description: err.message, variant: "destructive" }),
    });

    const cancelScheduleMutation = useMutation({
        mutationFn: () => api.cancelEmailCampaignSchedule(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaign", campaignId] });
            toast({ title: "Schedule cancelled" });
        },
        onError: (err: Error) => toast({ title: "Cancel failed", description: err.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.deleteEmailCampaign(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaigns"] });
            toast({ title: "Campaign deleted" });
            window.location.href = "/admin/email/campaigns";
        },
        onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
    });

    if (isLoading) {
        return (
            <AdminLayout>
                <EmailLoadingState label="Loading campaign..." />
            </AdminLayout>
        );
    }

    if (isError || !campaign || !form) {
        return (
            <AdminLayout>
                <EmailErrorState message="Campaign not found or failed to load." onRetry={() => refetch()} />
            </AdminLayout>
        );
    }

    const isEditable = campaign.status === "draft";
    const isScheduled = campaign.status === "scheduled";
    const isSent = campaign.status === "sent";
    const displayStats = campaignStats || stats;
    const selectedSegment = segments.find((s: any) => String(s.id) === form.segmentId);
    const selectedTemplate = templates.find((t: any) => String(t.id) === form.templateId);

    const handleSaveAndAdvance = () => {
        saveMutation.mutate(undefined, {
            onSuccess: () => {
                refetchPrecheck();
                if (step < WIZARD_STEPS.length - 1) setStep((s) => s + 1);
            },
        });
    };

    return (
        <AdminLayout>
            <div className="mb-6">
                <Link href="/admin/email/campaigns">
                    <Button variant="ghost" size="sm" className="mb-2">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Campaigns
                    </Button>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{campaign.name}</h1>
                        <Badge>{campaign.status}</Badge>
                    </div>
                    {isEditable ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600">
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    Delete draft
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : null}
                </div>
            </div>

            {isEditable ? (
                <div className="mb-6 flex flex-wrap gap-2">
                    {WIZARD_STEPS.map((label, i) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => setStep(i)}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                step === i
                                    ? "bg-blue-600 text-white"
                                    : i < step
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {i + 1}. {label}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {isEditable && step === 0 ? (
                        <Card>
                            <CardHeader><CardTitle>Step 1 — Setup</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Campaign name</Label>
                                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Topic (optional)</Label>
                                    <Select value={form.topicId || "none"} onValueChange={(v) => setForm({ ...form, topicId: v === "none" ? "" : v })}>
                                        <SelectTrigger><SelectValue placeholder="No topic" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No topic</SelectItem>
                                            {topics.map((t: any) => (
                                                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>From email</Label>
                                        <Input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Reply-to</Label>
                                        <Input value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {isEditable && step === 1 ? (
                        <Card>
                            <CardHeader><CardTitle>Step 2 — Audience</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Segment</Label>
                                    <Select value={form.segmentId} onValueChange={(v) => setForm({ ...form, segmentId: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                                        <SelectContent>
                                            {segments.map((s: any) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name} ({s.contactCount} contacts)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedSegment ? (
                                    <div className="rounded-lg bg-blue-50 p-4 text-sm">
                                        <p className="font-medium text-blue-900">{selectedSegment.name}</p>
                                        <p className="text-blue-700">{selectedSegment.contactCount} total members in segment</p>
                                        {precheck?.audience ? (
                                            <p className="mt-1 text-blue-800">
                                                {precheck.audience.subscribed} subscribed contacts will receive this email
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : null}

                    {isEditable && step === 2 ? (
                        <Card>
                            <CardHeader><CardTitle>Step 3 — Content</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Subject line</Label>
                                    <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Preview text</Label>
                                    <Input value={form.previewText} onChange={(e) => setForm({ ...form, previewText: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Template</Label>
                                    <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                                        <SelectContent>
                                            {templates.map((t: any) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.name} ({t.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedTemplate ? (
                                    <Link href={`/admin/email/templates/${selectedTemplate.id}`}>
                                        <Button variant="outline" size="sm">
                                            <ExternalLink className="mr-1 h-4 w-4" />
                                            Edit template
                                        </Button>
                                    </Link>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : null}

                    {isEditable && step === 3 ? (
                        <Card>
                            <CardHeader><CardTitle>Step 4 — Review checklist</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {(precheck?.checks ?? []).map((check: any) => (
                                    <div key={check.id} className="flex items-start gap-3 rounded-lg border p-3">
                                        {check.ok ? (
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                                        ) : (
                                            <Circle className="mt-0.5 h-5 w-5 text-gray-300" />
                                        )}
                                        <div>
                                            <p className="font-medium">{check.label}</p>
                                            {!check.required && !check.ok ? (
                                                <p className="text-xs text-amber-600">Recommended but not required</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                                    <p><strong>Subject:</strong> {form.subject || "—"}</p>
                                    <p><strong>Segment:</strong> {selectedSegment?.name ?? "—"}</p>
                                    <p><strong>Template:</strong> {selectedTemplate?.name ?? "—"}</p>
                                    <p><strong>Audience:</strong> {precheck?.audience?.subscribed ?? 0} subscribed</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {isEditable && step === 4 ? (
                        <Card>
                            <CardHeader><CardTitle>Step 5 — Send</CardTitle></CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => setShowTest(true)}>
                                    <Mail className="mr-1 h-4 w-4" />
                                    Send test
                                </Button>
                                <Button variant="outline" onClick={() => setShowSchedule(true)}>
                                    <Clock className="mr-1 h-4 w-4" />
                                    Schedule
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={!precheck?.ready || sendMutation.isPending || !status?.resendConfigured}
                                    onClick={() => {
                                        saveMutation.mutate(undefined, {
                                            onSuccess: () => sendMutation.mutate(),
                                        });
                                    }}
                                >
                                    <Send className="mr-1 h-4 w-4" />
                                    Send now
                                </Button>
                                {!precheck?.ready ? (
                                    <p className="w-full text-sm text-amber-700">Complete all required checklist items before sending.</p>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : null}

                    {isScheduled ? (
                        <Card>
                            <CardContent className="flex flex-wrap items-center gap-3 py-4">
                                <p className="text-sm text-amber-700">
                                    Scheduled for {campaign.scheduledAt ? formatEasternDate(campaign.scheduledAt) : "—"}
                                </p>
                                <Button variant="outline" onClick={() => cancelScheduleMutation.mutate()} disabled={cancelScheduleMutation.isPending}>
                                    <XCircle className="mr-1 h-4 w-4" />
                                    Cancel schedule
                                </Button>
                            </CardContent>
                        </Card>
                    ) : null}

                    {(isSent || isScheduled) && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Performance</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                    ["Sent", displayStats.sent],
                                    ["Delivered", displayStats.delivered, displayStats.deliveryRate],
                                    ["Opened", displayStats.opened, displayStats.openRate],
                                    ["Clicked", displayStats.clicked, displayStats.clickRate],
                                    ["Bounced", displayStats.bounced],
                                    ["Complained", displayStats.complained],
                                ].map(([label, value, rate]) => (
                                    <div key={String(label)} className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-gray-500">{label}</p>
                                        <p className="text-xl font-bold">{value ?? 0}</p>
                                        {rate != null ? <p className="text-xs text-gray-400">{rate}% rate</p> : null}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {isSent && linkStats?.links?.length > 0 ? (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Link clicks</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>URL</TableHead>
                                            <TableHead className="text-right">Clicks</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {linkStats.links.map((row: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="max-w-md truncate text-sm">{row.link}</TableCell>
                                                <TableCell className="text-right font-medium">{row.clicks}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null}

                    {isSent && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Recipient activity</CardTitle></CardHeader>
                            <CardContent>
                                <Tabs defaultValue="recipients">
                                    <TabsList>
                                        <TabsTrigger value="recipients">By recipient</TabsTrigger>
                                        <TabsTrigger value="events">Raw events</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="recipients">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recipients.slice(0, 100).map((r: any, i: number) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-sm">{r.email}</TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                {r.delivered && <Check className="h-3.5 w-3.5 text-green-600" />}
                                                                {r.opened && <Mail className="h-3.5 w-3.5 text-blue-600" />}
                                                                {r.clicked && <MousePointer className="h-3.5 w-3.5 text-purple-600" />}
                                                                {r.bounced && <XCircle className="h-3.5 w-3.5 text-red-600" />}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                    <TabsContent value="events">
                                        <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
                                            {events.slice(0, 50).map((e: any) => (
                                                <div key={e.id} className="flex justify-between border-b pb-1">
                                                    <span>{e.eventType}{e.metadata?.link ? ` → ${e.metadata.link}` : ""}</span>
                                                    <span className="text-xs text-gray-400">{e.email}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-4">
                    {isEditable ? (
                        <Card>
                            <CardContent className="flex flex-col gap-2 py-4">
                                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                    <Save className="mr-1 h-4 w-4" />
                                    Save
                                </Button>
                                {step > 0 ? (
                                    <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                                        <ChevronLeft className="mr-1 h-4 w-4" />
                                        Back
                                    </Button>
                                ) : null}
                                {step < WIZARD_STEPS.length - 1 ? (
                                    <Button variant="outline" onClick={handleSaveAndAdvance}>
                                        Next
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : null}

                    {precheck?.audience ? (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Audience preview</CardTitle></CardHeader>
                            <CardContent className="text-sm">
                                <p className="text-2xl font-bold text-blue-600">{precheck.audience.subscribed}</p>
                                <p className="text-gray-500">subscribed recipients</p>
                                <p className="mt-2 text-xs text-gray-400">
                                    {precheck.audience.total} total in {precheck.audience.segmentName ?? "segment"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            </div>

            <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Schedule campaign</DialogTitle></DialogHeader>
                    <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                    <Button
                        className="mt-3"
                        disabled={!scheduleAt || scheduleMutation.isPending}
                        onClick={() => saveMutation.mutate(undefined, { onSuccess: () => scheduleMutation.mutate() })}
                    >
                        Schedule send
                    </Button>
                </DialogContent>
            </Dialog>

            <Dialog open={showTest} onOpenChange={setShowTest}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Send test email</DialogTitle></DialogHeader>
                    <Input type="email" placeholder="test@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                    <Button className="mt-3" disabled={!testEmail || testMutation.isPending} onClick={() => testMutation.mutate()}>
                        Send test
                    </Button>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
