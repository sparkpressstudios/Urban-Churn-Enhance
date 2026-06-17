import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export type PaymentValidity = {
    category: string;
    label: string;
    reason: string;
    validForFulfillment: boolean;
};

const CATEGORY_STYLES: Record<string, string> = {
    valid_paid: "bg-green-100 text-green-800 border-green-200",
    free_order: "bg-blue-100 text-blue-800 border-blue-200",
    unpaid: "bg-red-100 text-red-800 border-red-200",
    payment_failed: "bg-red-100 text-red-800 border-red-200",
    missing_square: "bg-amber-100 text-amber-900 border-amber-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    refunded: "bg-purple-100 text-purple-800 border-purple-200",
};

export function PaymentValidityBadge({ validity }: { validity: PaymentValidity }) {
    return (
        <Badge
            variant="outline"
            className={CATEGORY_STYLES[validity.category] || "bg-gray-100 text-gray-700"}
        >
            {validity.label}
        </Badge>
    );
}

export function PaymentValidityBanner({ validity }: { validity: PaymentValidity }) {
    if (validity.validForFulfillment) return null;

    return (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
                <p className="font-medium">{validity.label} — not valid for pickup</p>
                <p className="text-red-800/90 mt-0.5">{validity.reason}</p>
            </div>
        </div>
    );
}
