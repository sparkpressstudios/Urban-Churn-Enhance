import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

type MatrixCell = {
    flavourId: number;
    wholesaleSizeId: number;
    productId?: number;
    priceCents: number;
    available: boolean;
    manageStock: boolean;
    stockQuantity: number;
    enabled: boolean;
};

export function WholesaleProductMatrix({
    flavours,
    sizes,
    products,
}: {
    flavours: any[];
    sizes: any[];
    products: any[];
}) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [draft, setDraft] = useState<Record<string, MatrixCell>>({});

    const activeFlavours = useMemo(
        () => flavours.filter((f) => f.active !== false),
        [flavours],
    );
    const activeSizes = useMemo(
        () => sizes.filter((s) => s.active !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        [sizes],
    );

    const productMap = useMemo(() => {
        const map = new Map<string, any>();
        for (const p of products) {
            if (p.wholesaleSizeId) {
                map.set(`${p.flavourId}-${p.wholesaleSizeId}`, p);
            }
        }
        return map;
    }, [products]);

    const getCell = (flavourId: number, sizeId: number): MatrixCell => {
        const key = `${flavourId}-${sizeId}`;
        if (draft[key]) return draft[key];
        const existing = productMap.get(key);
        if (existing) {
            return {
                flavourId,
                wholesaleSizeId: sizeId,
                productId: existing.id,
                priceCents: existing.priceCents,
                available: existing.available,
                manageStock: existing.manageStock ?? false,
                stockQuantity: existing.stockQuantity ?? 0,
                enabled: existing.available,
            };
        }
        return {
            flavourId,
            wholesaleSizeId: sizeId,
            priceCents: 0,
            available: false,
            manageStock: false,
            stockQuantity: 0,
            enabled: false,
        };
    };

    const setCell = (flavourId: number, sizeId: number, patch: Partial<MatrixCell>) => {
        const key = `${flavourId}-${sizeId}`;
        setDraft((prev) => ({
            ...prev,
            [key]: { ...getCell(flavourId, sizeId), ...patch },
        }));
    };

    const saveMutation = useMutation({
        mutationFn: () => {
            const cells = Object.values(draft);
            if (cells.length === 0) return Promise.resolve({ updated: 0 });
            return api.saveWholesaleProductMatrix(
                cells.map((c) => ({
                    flavourId: c.flavourId,
                    wholesaleSizeId: c.wholesaleSizeId,
                    priceCents: c.priceCents,
                    available: c.enabled && c.available,
                    enabled: c.enabled,
                    manageStock: c.manageStock,
                    stockQuantity: c.stockQuantity,
                })),
            );
        },
        onSuccess: () => {
            setDraft({});
            queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            toast({ title: "Matrix saved" });
        },
        onError: (err: any) => {
            toast({ title: "Save failed", description: err.message, variant: "destructive" });
        },
    });

    const enableAllSizes = async (flavourId: number, defaultPrice: string) => {
        const cents = Math.round(parseFloat(defaultPrice) * 100);
        if (!cents || cents <= 0) {
            toast({ title: "Enter a valid default price first", variant: "destructive" });
            return;
        }
        try {
            await api.enableWholesaleFlavourSizes(flavourId, {
                defaultPriceCents: cents,
            });
            queryClient.invalidateQueries({ queryKey: ["wholesale-products"] });
            toast({ title: "Sizes enabled for flavour" });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    if (activeSizes.length === 0 || activeFlavours.length === 0) {
        return null;
    }

    return (
        <Card className="border-slate-200 bg-white text-slate-900">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900">Flavour × Size Matrix</CardTitle>
                <Button
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || Object.keys(draft).length === 0}
                >
                    <Save className="h-4 w-4 mr-1" />
                    {saveMutation.isPending ? "Saving…" : "Save Matrix Changes"}
                </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-slate-100 text-slate-800">
                            <th className="px-3 py-2 text-left font-medium sticky left-0 bg-slate-100 min-w-[140px]">Flavour</th>
                            {activeSizes.map((size) => (
                                <th key={size.id} className="px-2 py-2 text-center font-medium min-w-[100px]">
                                    {size.name}
                                </th>
                            ))}
                            <th className="px-2 py-2 text-left font-medium">Quick</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeFlavours.map((flavour) => (
                            <MatrixRow
                                key={flavour.flavourId}
                                flavour={flavour}
                                sizes={activeSizes}
                                getCell={getCell}
                                setCell={setCell}
                                onEnableAll={(price) => enableAllSizes(flavour.flavourId, price)}
                            />
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

function MatrixRow({
    flavour,
    sizes,
    getCell,
    setCell,
    onEnableAll,
}: {
    flavour: any;
    sizes: any[];
    getCell: (flavourId: number, sizeId: number) => MatrixCell;
    setCell: (flavourId: number, sizeId: number, patch: Partial<MatrixCell>) => void;
    onEnableAll: (price: string) => void;
}) {
    const [bulkPrice, setBulkPrice] = useState("");

    return (
        <tr className="border-b hover:bg-slate-50">
            <td className="px-3 py-2 sticky left-0 bg-white">
                <div className="font-medium">{flavour.flavourName}</div>
                {flavour.isExclusive && (
                    <Badge className="mt-0.5 bg-violet-100 text-violet-800 text-[10px]">Exclusive</Badge>
                )}
            </td>
            {sizes.map((size) => {
                const cell = getCell(flavour.flavourId, size.id);
                return (
                    <td key={size.id} className="px-1 py-1 align-top">
                        <div className="space-y-1.5 rounded border border-gray-100 p-1.5 bg-white">
                            <label className="flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={cell.enabled}
                                    onChange={(e) =>
                                        setCell(flavour.flavourId, size.id, {
                                            enabled: e.target.checked,
                                            available: e.target.checked,
                                        })
                                    }
                                />
                                <span className="text-[10px] text-slate-800 font-medium">Available</span>
                            </label>
                            {cell.enabled && (
                                <>
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] text-slate-700">Price ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            className="h-7 text-xs px-1"
                                            value={(cell.priceCents / 100).toFixed(2)}
                                            onChange={(e) =>
                                                setCell(flavour.flavourId, size.id, {
                                                    priceCents: Math.round(parseFloat(e.target.value || "0") * 100),
                                                    enabled: true,
                                                    available: true,
                                                })
                                            }
                                        />
                                    </div>
                                    <label className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={cell.manageStock}
                                            onChange={(e) =>
                                                setCell(flavour.flavourId, size.id, {
                                                    manageStock: e.target.checked,
                                                })
                                            }
                                        />
                                        <span className="text-[10px] text-slate-800 font-medium">Track inventory</span>
                                    </label>
                                    {cell.manageStock && (
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] text-slate-700">Inventory</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                className="h-7 text-xs px-1"
                                                value={cell.stockQuantity}
                                                onChange={(e) =>
                                                    setCell(flavour.flavourId, size.id, {
                                                        stockQuantity: parseInt(e.target.value) || 0,
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </td>
                );
            })}
            <td className="px-2 py-2 align-top">
                <div className="flex gap-1">
                    <Input
                        type="number"
                        step="0.01"
                        className="h-7 w-16 text-xs"
                        placeholder="$"
                        value={bulkPrice}
                        onChange={(e) => setBulkPrice(e.target.value)}
                    />
                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => onEnableAll(bulkPrice)}>
                        All
                    </Button>
                </div>
            </td>
        </tr>
    );
}
