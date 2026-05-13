import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, SkipForward, MapPin, Package, Truck, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

async function fetchDriverRun(token: string) {
    const res = await fetch(`/api/driver/${token}`);
    if (!res.ok) throw new Error("Run not found");
    return res.json();
}

async function updateStop(token: string, stopId: number, data: { status: string; completionNotes?: string }) {
    const res = await fetch(`/api/driver/${token}/stops/${stopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update stop");
    return res.json();
}

const STOP_STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    skipped: "bg-gray-100 text-gray-600",
};

export default function DriverView() {
    const params = useParams<{ token: string }>();
    const token = params.token ?? "";
    const queryClient = useQueryClient();

    const [expandedStop, setExpandedStop] = useState<number | null>(null);
    const [completionNotes, setCompletionNotes] = useState<Record<number, string>>({});

    const runQ = useQuery({
        queryKey: ["driver-run", token],
        queryFn: () => fetchDriverRun(token),
        enabled: !!token,
        refetchInterval: 30_000, // auto-refresh every 30s
    });

    const stopMutation = useMutation({
        mutationFn: ({ stopId, status, notes }: { stopId: number; status: string; notes?: string }) =>
            updateStop(token, stopId, { status, completionNotes: notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["driver-run", token] });
        },
    });

    if (runQ.isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
            </div>
        );
    }

    if (runQ.isError || !runQ.data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Truck className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                    <p className="text-gray-600 font-medium">Delivery run not found</p>
                    <p className="text-gray-400 text-sm mt-1">Check your link or contact the dispatch team.</p>
                </div>
            </div>
        );
    }

    const run = runQ.data;
    const stops: any[] = run.stops || [];
    const completed = stops.filter((s: any) => s.status === "completed").length;
    const allDone = completed === stops.length && stops.length > 0;

    const deliveryDate = new Date(run.scheduledDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-[#111118] text-white px-4 py-5 sticky top-0 z-10 shadow-lg">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div>
                        <p className="text-[#A1AB74] text-xs font-medium uppercase tracking-widest">Urban Churn</p>
                        <h1 className="text-lg font-bold mt-0.5">{run.name}</h1>
                        <p className="text-white/60 text-sm">{deliveryDate}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-[#A1AB74]">{completed}/{stops.length}</p>
                        <p className="text-white/60 text-xs">stops done</p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 max-w-lg mx-auto h-1.5 rounded-full bg-white/10">
                    <div
                        className="h-full rounded-full bg-[#A1AB74] transition-all duration-500"
                        style={{ width: stops.length > 0 ? `${(completed / stops.length) * 100}%` : "0%" }}
                    />
                </div>
            </div>

            {/* All done banner */}
            {allDone && (
                <div className="max-w-lg mx-auto px-4 pt-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-green-800">All stops complete!</p>
                            <p className="text-green-600 text-sm">Great job — the run has been marked complete.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stop cards */}
            <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
                {stops.map((stop: any, idx: number) => {
                    const isExpanded = expandedStop === stop.id;
                    const notes = completionNotes[stop.id] ?? "";

                    return (
                        <div
                            key={stop.id}
                            className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-all ${stop.status === "completed"
                                    ? "border-green-200 bg-green-50/30"
                                    : stop.status === "skipped"
                                        ? "border-gray-200 opacity-60"
                                        : "border-gray-200"
                                }`}
                        >
                            {/* Stop header — tap to expand */}
                            <button
                                className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                                onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                            >
                                {/* Stop number */}
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${stop.status === "completed" ? "bg-green-500 text-white" :
                                        stop.status === "skipped" ? "bg-gray-300 text-gray-600" :
                                            "bg-[#A1AB74] text-[#111118]"
                                    }`}>
                                    {stop.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-900 truncate">{stop.customerName}</p>
                                        <Badge className={`text-xs px-1.5 py-0 ${STOP_STATUS_COLORS[stop.status] || "bg-gray-100"}`}>
                                            {stop.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        <p className="text-sm text-gray-500 truncate">
                                            {stop.customerAddress ? `${stop.customerAddress}, ${stop.customerCity}` : "No address on file"}
                                        </p>
                                    </div>
                                </div>

                                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />}
                            </button>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                                    {/* Order items */}
                                    {stop.items && stop.items.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Package className="h-3.5 w-3.5" /> Items
                                            </p>
                                            <ul className="space-y-1">
                                                {stop.items.map((item: any, i: number) => (
                                                    <li key={i} className="text-sm text-gray-700 flex justify-between">
                                                        <span>{item.productDescription}</span>
                                                        <span className="font-medium ml-2">×{item.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Maps link */}
                                    {stop.customerAddress && (
                                        <a
                                            href={`https://maps.google.com/?q=${encodeURIComponent(`${stop.customerAddress}, ${stop.customerCity}`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-sm text-blue-600 font-medium"
                                        >
                                            <MapPin className="h-4 w-4" />
                                            Open in Maps
                                        </a>
                                    )}

                                    {/* Phone */}
                                    {stop.customerPhone && (
                                        <a
                                            href={`tel:${stop.customerPhone}`}
                                            className="block text-sm text-blue-600 font-medium"
                                        >
                                            📞 {stop.customerPhone}
                                        </a>
                                    )}

                                    {/* Delivery notes */}
                                    {stop.notes && (
                                        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                                            📋 {stop.notes}
                                        </p>
                                    )}

                                    {/* Delivered at */}
                                    {stop.deliveredAt && (
                                        <p className="text-xs text-green-600">
                                            Delivered at {new Date(stop.deliveredAt).toLocaleTimeString()}
                                        </p>
                                    )}
                                    {stop.completionNotes && (
                                        <p className="text-xs text-gray-500">Note: {stop.completionNotes}</p>
                                    )}

                                    {/* Actions for pending stops */}
                                    {stop.status === "pending" && (
                                        <div className="space-y-2 pt-1">
                                            <Textarea
                                                placeholder="Optional delivery note (left at door, spoke with…)"
                                                value={notes}
                                                onChange={(e) => setCompletionNotes({ ...completionNotes, [stop.id]: e.target.value })}
                                                className="text-sm resize-none h-16"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                                    disabled={stopMutation.isPending}
                                                    onClick={() => stopMutation.mutate({ stopId: stop.id, status: "completed", notes })}
                                                >
                                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                                    Delivered
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="text-gray-500"
                                                    disabled={stopMutation.isPending}
                                                    onClick={() => stopMutation.mutate({ stopId: stop.id, status: "skipped", notes })}
                                                >
                                                    <SkipForward className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {stops.length === 0 && (
                    <div className="text-center py-12">
                        <Truck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                        <p className="text-gray-400">No stops assigned to this run yet.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="max-w-lg mx-auto px-4 pb-8 text-center">
                <p className="text-gray-300 text-xs">Urban Churn · Delivery App</p>
            </div>
        </div>
    );
}
