import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEasternDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    EmailEmptyState,
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import { Plus, Send, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    scheduled: "outline",
    sending: "default",
    sent: "default",
    cancelled: "destructive",
};

export default function EmailCampaigns() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [, navigate] = useLocation();

    const { data: campaigns = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-campaigns"],
        queryFn: api.getEmailCampaigns,
    });

    const { data: status } = useQuery({
        queryKey: ["admin", "email-marketing-status"],
        queryFn: api.getEmailMarketingStatus,
    });

    const createMutation = useMutation({
        mutationFn: () => api.createEmailCampaign({ name: "Untitled Campaign", subject: "" }),
        onSuccess: (campaign: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-campaigns"] });
            navigate(`/admin/email/campaigns/${campaign.id}`);
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    return (
        <AdminLayout>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
                    <p className="text-sm text-gray-500">
                        Create and send marketing emails to your segments.
                        {!status?.resendConfigured && (
                            <span className="ml-2 text-amber-600">Resend API key not configured — sending disabled.</span>
                        )}
                    </p>
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                    <Plus className="mr-1 h-4 w-4" />
                    New Campaign
                </Button>
            </div>

            {isLoading ? (
                <EmailLoadingState />
            ) : isError ? (
                <EmailErrorState onRetry={() => refetch()} />
            ) : (
                <div className="space-y-3">
                    {campaigns.map((campaign: any) => (
                        <Link key={campaign.id} href={`/admin/email/campaigns/${campaign.id}`}>
                            <Card className="cursor-pointer transition hover:border-blue-300">
                                <CardContent className="flex items-center justify-between py-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{campaign.name}</h3>
                                            <Badge variant={STATUS_COLORS[campaign.status] || "secondary"}>
                                                {campaign.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500">{campaign.subject || "No subject"}</p>
                                        {campaign.sentAt && (
                                            <p className="text-xs text-gray-400">
                                                Sent {formatEasternDate(campaign.sentAt)}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-300" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    {campaigns.length === 0 && (
                        <EmailEmptyState
                            title="No campaigns yet"
                            description="Create one to send your first marketing email."
                            action={<Button onClick={() => createMutation.mutate()}>New campaign</Button>}
                        />
                    )}
                </div>
            )}
        </AdminLayout>
    );
}
