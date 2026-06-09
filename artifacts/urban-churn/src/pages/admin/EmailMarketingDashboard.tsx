import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import {
    Users,
    Layers,
    LayoutTemplate,
    Send,
    AlertTriangle,
    Plus,
    ArrowRight,
} from "lucide-react";
export default function EmailMarketingDashboard() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-dashboard"],
        queryFn: api.getEmailMarketingDashboard,
    });

    if (isLoading) {
        return (
            <AdminLayout>
                <EmailLoadingState label="Loading email marketing dashboard..." />
            </AdminLayout>
        );
    }

    if (isError || !data) {
        return (
            <AdminLayout>
                <EmailErrorState onRetry={() => refetch()} />
            </AdminLayout>
        );
    }

    const stats = [
        { label: "Contacts", value: data.counts.contacts, sub: `${data.counts.subscribed} subscribed`, href: "/admin/email/contacts", icon: Users },
        { label: "Segments", value: data.counts.segments, href: "/admin/email/segments", icon: Layers },
        { label: "Templates", value: data.counts.templates, href: "/admin/email/templates", icon: LayoutTemplate },
        { label: "Campaigns", value: data.counts.campaigns, href: "/admin/email/campaigns", icon: Send },
    ];

    const suppressionTotal =
        (data.suppressionCounts?.unsubscribed ?? 0) +
        (data.suppressionCounts?.bounced ?? 0) +
        (data.suppressionCounts?.complained ?? 0);

    return (
        <AdminLayout>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
                    <p className="text-sm text-gray-500">Overview of your audience, content, and campaigns.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/email/campaigns">
                        <Button><Plus className="mr-1 h-4 w-4" />New campaign</Button>
                    </Link>
                    <Link href="/admin/email/contacts">
                        <Button variant="outline">Manage contacts</Button>
                    </Link>
                </div>
            </div>

            {!data.resendConfigured ? (
                <Card className="mb-6 border-amber-200 bg-amber-50">
                    <CardContent className="flex items-start gap-3 py-4">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                        <div>
                            <p className="font-medium text-amber-900">Resend is not configured</p>
                            <p className="text-sm text-amber-800">
                                Set <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code> on the API server to enable sending.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href}>
                        <Card className="transition hover:border-blue-300 hover:shadow-sm">
                            <CardContent className="flex items-center justify-between p-5">
                                <div>
                                    <p className="text-sm text-gray-500">{stat.label}</p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    {stat.sub ? <p className="text-xs text-gray-400">{stat.sub}</p> : null}
                                </div>
                                <stat.icon className="h-8 w-8 text-blue-500 opacity-60" />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent campaigns</CardTitle>
                        <Link href="/admin/email/campaigns">
                            <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.recentCampaigns ?? []).length === 0 ? (
                            <p className="text-sm text-gray-400">No campaigns yet.</p>
                        ) : (
                            data.recentCampaigns.map((c: any) => (
                                <Link key={c.id} href={`/admin/email/campaigns/${c.id}`}>
                                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium">{c.name}</p>
                                            <p className="text-xs text-gray-400">{c.subject || "No subject"}</p>
                                        </div>
                                        <Badge variant="secondary">{c.status}</Badge>
                                    </div>
                                </Link>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Suppression list</CardTitle>
                        <Link href="/admin/email/suppression">
                            <Button variant="ghost" size="sm">Manage <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between rounded-lg bg-gray-50 p-3">
                            <span className="text-gray-600">Total suppressed</span>
                            <span className="font-semibold">{suppressionTotal}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-gray-500">Unsubscribed</p>
                                <p className="text-lg font-bold">{data.suppressionCounts?.unsubscribed ?? 0}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-gray-500">Bounced</p>
                                <p className="text-lg font-bold">{data.suppressionCounts?.bounced ?? 0}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-gray-500">Complained</p>
                                <p className="text-lg font-bold">{data.suppressionCounts?.complained ?? 0}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400">Sending from: {data.marketingFromEmail}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { href: "/admin/email/topics", label: "Topics & preferences" },
                    { href: "/admin/email-log", label: "Email log" },
                    { href: "/admin/email/templates", label: "Template library" },
                    { href: "/admin/email/segments", label: "Audience segments" },
                ].map((link) => (
                    <Link key={link.href} href={link.href}>
                        <Button variant="outline" className="w-full justify-between">
                            {link.label}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                ))}
            </div>
        </AdminLayout>
    );
}
