import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEastern } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminEmailLogSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, XCircle, Search } from "lucide-react";

const preOrderTypeLabels: Record<string, string> = {
    window_closing_report: "Window Closing Report",
    admin_orders_closed: "Admin Orders Closed",
    customer_pickup_reminder: "Customer Pickup Reminder",
    customer_pickup_started: "Customer Pickup Started",
};

type Tab = "all" | "preorder";

export default function AdminEmailLog() {
    const [tab, setTab] = useState<Tab>("all");
    const [search, setSearch] = useState("");

    const { data: sentLogs = [] } = useQuery({
        queryKey: ["admin", "sent-emails", search],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (search) params.search = search;
            return api.getSentEmailsLog(params);
        },
        enabled: tab === "all",
    });

    const { data: preOrderLogs = [] } = useQuery({
        queryKey: ["admin", "preorder-email-log"],
        queryFn: () => api.getEmailLog(),
        enabled: tab === "preorder",
    });

    useTour("admin-email-log", adminEmailLogSteps);

    const tabs: { key: Tab; label: string }[] = [
        { key: "all", label: "All Sent Emails" },
        { key: "preorder", label: "Pre-Order Notifications" },
    ];

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div data-tour="admin-email-log-header">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Email Log</h1>
                    <p className="text-sm text-white/70 mt-1">
                        Full audit trail of all emails sent by the system
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/10 rounded-lg p-1 w-fit" data-tour="admin-email-log-filter">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key
                                    ? "bg-white text-gray-900"
                                    : "text-white/70 hover:text-white"
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === "all" && (
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Filter by email address…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-sm"
                        />
                    </div>
                )}

                <Card data-tour="admin-email-log-table">
                    <CardContent className="p-0">
                        {tab === "all" ? (
                            !sentLogs.length ? (
                                <div className="py-12 text-center">
                                    <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 text-sm">No emails logged yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-gray-500 bg-gray-50/50">
                                                <th className="p-3 font-medium">Sent</th>
                                                <th className="p-3 font-medium">Recipient</th>
                                                <th className="p-3 font-medium">Subject</th>
                                                <th className="p-3 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sentLogs.map((log: any) => (
                                                <tr key={log.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-3 text-xs text-gray-600 whitespace-nowrap">
                                                        {formatEastern(log.createdAt, {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        })}
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-600 font-mono">{log.toEmail}</td>
                                                    <td className="p-3 text-xs text-gray-700 max-w-xs truncate">{log.subject}</td>
                                                    <td className="p-3">
                                                        {log.status === "sent" ? (
                                                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                                                <CheckCircle className="w-3 h-3" /> Sent
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-red-600 text-xs" title={log.errorMessage || ""}>
                                                                <XCircle className="w-3 h-3" /> Failed
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            !preOrderLogs.length ? (
                                <div className="py-12 text-center">
                                    <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 text-sm">No pre-order notifications logged yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-gray-500 bg-gray-50/50">
                                                <th className="p-3 font-medium">Sent</th>
                                                <th className="p-3 font-medium">Type</th>
                                                <th className="p-3 font-medium">Recipient</th>
                                                <th className="p-3 font-medium">Pre-Order</th>
                                                <th className="p-3 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preOrderLogs.map((log: any) => (
                                                <tr key={log.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-3 text-xs text-gray-600 whitespace-nowrap">
                                                        {formatEastern(log.sentAt, {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        })}
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {preOrderTypeLabels[log.type] || log.type}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-600 font-mono">{log.recipientEmail}</td>
                                                    <td className="p-3 text-xs text-gray-500">
                                                        {log.preOrderId ? `#${log.preOrderId}` : <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="p-3">
                                                        {log.status === "sent" ? (
                                                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                                                <CheckCircle className="w-3 h-3" /> Sent
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-red-600 text-xs" title={log.errorMessage || ""}>
                                                                <XCircle className="w-3 h-3" /> Failed
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
