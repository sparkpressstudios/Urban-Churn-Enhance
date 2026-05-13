import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEasternDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    ArrowRight,
    RotateCcw,
} from "lucide-react";

type ImportType = "products" | "orders" | "customers" | "coupons";

interface PreviewData {
    filename: string;
    detectedType: ImportType;
    headers: string[];
    totalRows: number;
    preview: Record<string, string>[];
}

interface ImportResult {
    id: number;
    type: string;
    filename: string;
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errors: { row: number; message: string }[];
    totalErrors: number;
    status: string;
}

type Step = "upload" | "preview" | "result";

export default function AdminImport() {
    const queryClient = useQueryClient();
    const [step, setStep] = useState<Step>("upload");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importType, setImportType] = useState<ImportType | "auto">("auto");
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [showAllErrors, setShowAllErrors] = useState(false);

    const { data: history = [] } = useQuery({
        queryKey: ["admin", "import-history"],
        queryFn: api.importHistory,
    });

    const previewMutation = useMutation({
        mutationFn: (file: File) => api.importPreview(file),
        onSuccess: (data: PreviewData) => {
            setPreviewData(data);
            if (importType === "auto") {
                setImportType(data.detectedType);
            }
            setStep("preview");
        },
    });

    const executeMutation = useMutation({
        mutationFn: ({ file, type }: { file: File; type?: string }) =>
            api.importExecute(file, type),
        onSuccess: (data: ImportResult) => {
            setImportResult(data);
            setStep("result");
            queryClient.invalidateQueries({ queryKey: ["admin", "import-history"] });
            queryClient.invalidateQueries({ queryKey: ["admin"] });
        },
    });

    const handleFileSelect = useCallback(
        (file: File) => {
            setSelectedFile(file);
            previewMutation.mutate(file);
        },
        [previewMutation],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith(".csv")) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect],
    );

    const handleExecute = () => {
        if (!selectedFile) return;
        executeMutation.mutate({
            file: selectedFile,
            type: importType === "auto" ? undefined : importType,
        });
    };

    const reset = () => {
        setStep("upload");
        setSelectedFile(null);
        setImportType("auto");
        setPreviewData(null);
        setImportResult(null);
    };

    const typeLabels: Record<string, string> = {
        products: "Products / Flavors",
        orders: "Orders",
        customers: "Customers",
        coupons: "Coupons",
    };

    const statusColors: Record<string, string> = {
        completed: "bg-green-100 text-green-800",
        failed: "bg-red-100 text-red-800",
        processing: "bg-yellow-100 text-yellow-800",
        pending: "bg-gray-100 text-gray-800",
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">
                        WooCommerce Import
                    </h1>
                    <p className="text-sm text-white/70 mt-1">
                        Import products, orders, and customers from WooCommerce CSV exports
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-2 text-sm">
                    {(["upload", "preview", "result"] as Step[]).map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            {i > 0 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                            <span
                                className={`px-3 py-1 rounded-full ${step === s
                                    ? "bg-[#A1AB74] text-white"
                                    : step === "result" && s !== "result"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                            >
                                {s === "upload"
                                    ? "1. Upload"
                                    : s === "preview"
                                        ? "2. Preview"
                                        : "3. Result"}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Upload */}
                {step === "upload" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Upload className="w-5 h-5" />
                                Upload WooCommerce CSV
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                    <p className="font-medium text-blue-800 mb-1">Products</p>
                                    <p className="text-blue-600 text-xs">
                                        WooCommerce → Products → Export
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                                    <p className="font-medium text-purple-800 mb-1">Orders</p>
                                    <p className="text-purple-600 text-xs">
                                        WooCommerce → Orders → Export
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                                    <p className="font-medium text-teal-800 mb-1">Customers</p>
                                    <p className="text-teal-600 text-xs">
                                        WooCommerce → Customers → Download
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-colors cursor-pointer ${dragOver
                                    ? "border-[#A1AB74] bg-[#A1AB74]/5"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = ".csv";
                                    input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) handleFileSelect(file);
                                    };
                                    input.click();
                                }}
                            >
                                <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">
                                    {previewMutation.isPending
                                        ? "Parsing CSV..."
                                        : "Drop a WooCommerce CSV file here"}
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    or click to browse (max 10MB)
                                </p>
                            </div>

                            {previewMutation.isError && (
                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                    <XCircle className="w-4 h-4" />
                                    {(previewMutation.error as Error).message}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Preview */}
                {step === "preview" && previewData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5" />
                                Preview: {previewData.filename}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Import as:</span>
                                    <Select
                                        value={importType === "auto" ? previewData.detectedType : importType}
                                        onValueChange={(v) => setImportType(v as ImportType)}
                                    >
                                        <SelectTrigger className="w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="products">Products / Flavours</SelectItem>
                                            <SelectItem value="orders">Orders</SelectItem>
                                            <SelectItem value="customers">Customers</SelectItem>
                                            <SelectItem value="coupons">Coupons</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Badge variant="secondary">
                                    {previewData.totalRows} rows detected
                                </Badge>
                                <Badge variant="outline">
                                    Auto-detected: {typeLabels[previewData.detectedType]}
                                </Badge>
                            </div>

                            {/* Column Headers */}
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Detected columns ({previewData.headers.length}):
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {previewData.headers.map((h) => (
                                        <Badge key={h} variant="outline" className="text-xs">
                                            {h}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Data Preview Table */}
                            <div className="max-h-80 overflow-auto border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12 text-xs">#</TableHead>
                                            {previewData.headers.slice(0, 8).map((h) => (
                                                <TableHead key={h} className="text-xs min-w-[120px]">
                                                    {h}
                                                </TableHead>
                                            ))}
                                            {previewData.headers.length > 8 && (
                                                <TableHead className="text-xs">
                                                    +{previewData.headers.length - 8} more
                                                </TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.preview.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs text-gray-400">
                                                    {i + 1}
                                                </TableCell>
                                                {previewData.headers.slice(0, 8).map((h) => (
                                                    <TableCell
                                                        key={h}
                                                        className="text-xs max-w-[200px] truncate"
                                                    >
                                                        {row[h] || "—"}
                                                    </TableCell>
                                                ))}
                                                {previewData.headers.length > 8 && (
                                                    <TableCell className="text-xs text-gray-400">
                                                        …
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={reset}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleExecute}
                                    disabled={executeMutation.isPending}
                                    className="bg-[#A1AB74] hover:bg-[#8B9563] text-white"
                                >
                                    {executeMutation.isPending ? (
                                        <>
                                            <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            Import {previewData.totalRows}{" "}
                                            {typeLabels[importType === "auto" ? previewData.detectedType : importType]}
                                        </>
                                    )}
                                </Button>
                            </div>

                            {executeMutation.isError && (
                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                    <XCircle className="w-4 h-4" />
                                    {(executeMutation.error as Error).message}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Result */}
                {step === "result" && importResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {importResult.status === "completed" ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-600" />
                                )}
                                Import{" "}
                                {importResult.status === "completed"
                                    ? "Complete"
                                    : "Failed"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 rounded-lg bg-gray-50 text-center">
                                    <p className="text-2xl font-bold text-gray-900">
                                        {importResult.totalRows}
                                    </p>
                                    <p className="text-xs text-gray-500">Total Rows</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-50 text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        {importResult.importedRows}
                                    </p>
                                    <p className="text-xs text-green-600">Imported</p>
                                </div>
                                <div className="p-3 rounded-lg bg-yellow-50 text-center">
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {importResult.skippedRows}
                                    </p>
                                    <p className="text-xs text-yellow-600">Skipped</p>
                                </div>
                                <div className="p-3 rounded-lg bg-red-50 text-center">
                                    <p className="text-2xl font-bold text-red-600">
                                        {importResult.errors.length}
                                    </p>
                                    <p className="text-xs text-red-600">Errors</p>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-700">Errors ({importResult.totalErrors || importResult.errors.length}):</p>
                                        {importResult.errors.length > 20 && (
                                            <button
                                                onClick={() => setShowAllErrors(!showAllErrors)}
                                                className="text-xs text-[#A1AB74] hover:underline"
                                            >
                                                {showAllErrors ? "Show fewer" : `Show all ${importResult.errors.length}`}
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-1">
                                        {(showAllErrors ? importResult.errors : importResult.errors.slice(0, 20)).map((err, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded"
                                            >
                                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                <span>
                                                    Row {err.row}: {err.message}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button onClick={reset} className="bg-[#A1AB74] hover:bg-[#8B9563] text-white">
                                Import Another File
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Import History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Import History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">
                                No imports yet. Upload a WooCommerce CSV to get started.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>File</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Rows</TableHead>
                                        <TableHead>Imported</TableHead>
                                        <TableHead>Skipped</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(history as any[]).map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium text-sm">
                                                {log.filename}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {typeLabels[log.type] || log.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {log.totalRows}
                                            </TableCell>
                                            <TableCell className="text-sm text-green-600">
                                                {log.importedRows}
                                            </TableCell>
                                            <TableCell className="text-sm text-yellow-600">
                                                {log.skippedRows}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full ${statusColors[log.status] || "bg-gray-100"}`}
                                                >
                                                    {log.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-500">
                                                {formatEasternDate(log.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
