import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WholesaleStatCard({
    label,
    value,
    sublabel,
    valueClassName,
    onClick,
    loading,
}: {
    label: string;
    value: ReactNode;
    sublabel?: string;
    valueClassName?: string;
    onClick?: () => void;
    loading?: boolean;
}) {
    const content = (
        <>
            <p className="text-xs text-slate-600">{label}</p>
            {loading ? (
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200" />
            ) : (
                <p className={cn("text-2xl sm:text-3xl font-bold", valueClassName)}>{value}</p>
            )}
            {sublabel && <p className="mt-0.5 text-[11px] text-slate-500">{sublabel}</p>}
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="w-full text-left rounded-xl border bg-card text-card-foreground shadow transition-shadow hover:shadow-md hover:border-[#A1AB74]/40"
            >
                <div className="px-4 py-3 sm:px-5 sm:py-4">{content}</div>
            </button>
        );
    }

    return (
        <Card>
            <CardContent className="px-4 py-3 sm:px-5 sm:py-4">{content}</CardContent>
        </Card>
    );
}
