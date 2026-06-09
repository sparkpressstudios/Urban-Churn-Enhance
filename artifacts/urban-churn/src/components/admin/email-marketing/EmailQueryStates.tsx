import type { ReactNode } from "react";
import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EmailLoadingState({ label = "Loading..." }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {label}
        </div>
    );
}

export function EmailErrorState({
    message = "Something went wrong loading this page.",
    onRetry,
}: {
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-sm text-gray-600">{message}</p>
                {onRetry ? (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        Try again
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    );
}

export function EmailEmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Inbox className="h-8 w-8 text-gray-300" />
                <p className="font-medium text-gray-700">{title}</p>
                {description ? <p className="max-w-sm text-sm text-gray-500">{description}</p> : null}
                {action}
            </CardContent>
        </Card>
    );
}
