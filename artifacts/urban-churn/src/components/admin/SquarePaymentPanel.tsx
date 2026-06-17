import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Copy, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";

type SquarePaymentPanelProps = {
    orderNumber: string;
    squareOrderId?: string | null;
    squarePaymentId?: string | null;
    squareReceiptNumber?: string | null;
    paymentStatus?: string | null;
    lastSyncSource?: string | null;
    squareEnvironment?: "sandbox" | "production";
    orderIdMismatch?: boolean;
    onSync?: () => void;
    isSyncing?: boolean;
};

function getSquareTransactionUrl(
    paymentId: string,
    environment: "sandbox" | "production" = "sandbox",
) {
    const host = environment === "production" ? "squareup.com" : "squareupsandbox.com";
    return `https://${host}/dashboard/sales/transactions/${paymentId}`;
}

function CopyableRow({
    label,
    value,
    mono = true,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    const { toast } = useToast();

    const copy = async () => {
        await navigator.clipboard.writeText(value);
        toast({ title: `${label} copied` });
    };

    return (
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
                <span className="text-gray-500">{label}: </span>
                <span className={mono ? "font-mono text-gray-700 break-all" : "text-gray-700"}>
                    {value}
                </span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
                <Copy className="w-3.5 h-3.5" />
            </Button>
        </div>
    );
}

export function SquarePaymentPanel({
    orderNumber,
    squareOrderId,
    squarePaymentId,
    squareReceiptNumber,
    paymentStatus,
    lastSyncSource,
    squareEnvironment = "sandbox",
    orderIdMismatch,
    onSync,
    isSyncing,
}: SquarePaymentPanelProps) {
    if (!squarePaymentId && !squareOrderId) return null;

    return (
        <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-3">
            <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-700">Square Payment</span>
                        {paymentStatus && (
                            <Badge variant="secondary" className="text-[10px]">
                                {paymentStatus}
                            </Badge>
                        )}
                        {lastSyncSource && (
                            <span className="text-gray-400">sync: {lastSyncSource}</span>
                        )}
                    </div>

                    <p className="text-gray-500">
                        Website order <span className="font-mono text-gray-700">{orderNumber}</span>{" "}
                        is sent to Square as the <strong>Reference ID</strong>.
                    </p>

                    {squareReceiptNumber && (
                        <div className="rounded border border-green-200 bg-green-50 px-2 py-1.5">
                            <span className="text-gray-500">Receipt #: </span>
                            <span className="font-mono text-base font-semibold text-green-800">
                                {squareReceiptNumber}
                            </span>
                        </div>
                    )}

                    {!squareReceiptNumber && squarePaymentId && (
                        <p className="text-amber-700">
                            Receipt number not synced yet. Use Refresh from Square to pull it.
                        </p>
                    )}

                    {orderIdMismatch && (
                        <div className="flex items-start gap-1.5 text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                                Square payment is linked to a different order ID than this record.
                                Review in the Square dashboard.
                            </span>
                        </div>
                    )}

                    {squarePaymentId && (
                        <CopyableRow label="Payment ID" value={squarePaymentId} />
                    )}
                    {squareOrderId && (
                        <CopyableRow label="Square Order ID" value={squareOrderId} />
                    )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                    {onSync && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={onSync}
                            disabled={isSyncing}
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    )}
                    {squarePaymentId && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                            <a
                                href={getSquareTransactionUrl(squarePaymentId, squareEnvironment)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Square
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
