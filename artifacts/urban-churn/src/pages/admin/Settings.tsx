import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminSettingsSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Settings2,
    Link2,
    MapPin,
    Webhook,
    CheckCircle,
    XCircle,
    Loader2,
    Copy,
    Save,
    RefreshCw,
    Megaphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Settings form state
    const [settingsForm, setSettingsForm] = useState({
        square_access_token: "",
        square_environment: "sandbox",
        square_app_id: "",
        square_webhook_signature_key: "",
        square_online_sales_location_id: "",
        square_wholesale_location_id: "",
    });
    const [formLoaded, setFormLoaded] = useState(false);

    // Announcement bar form state
    const [announcementForm, setAnnouncementForm] = useState({
        text: "",
        link: "",
        linkText: "",
        enabled: false,
    });
    const [announcementLoaded, setAnnouncementLoaded] = useState(false);

    // Load current settings
    const { data: settingsData } = useQuery({
        queryKey: ["admin", "settings"],
        queryFn: () => api.getSettings(),
    });

    // Populate form when data loads
    if (settingsData && !formLoaded) {
        setSettingsForm({
            square_access_token: settingsData.settings.square_access_token || "",
            square_environment: settingsData.settings.square_environment || "sandbox",
            square_app_id: settingsData.settings.square_app_id || "",
            square_webhook_signature_key: settingsData.settings.square_webhook_signature_key || "",
            square_online_sales_location_id: settingsData.settings.square_online_sales_location_id || "",
            square_wholesale_location_id: settingsData.settings.square_wholesale_location_id || "",
        });
        setFormLoaded(true);
    }

    // Load announcement settings
    const { data: announcementData } = useQuery({
        queryKey: ["admin", "announcement"],
        queryFn: () => api.getAnnouncementSettings(),
    });

    if (announcementData && !announcementLoaded) {
        setAnnouncementForm({
            text: announcementData.text || "",
            link: announcementData.link || "",
            linkText: announcementData.linkText || "",
            enabled: announcementData.enabled || false,
        });
        setAnnouncementLoaded(true);
    }

    // Save settings mutation
    const saveMutation = useMutation({
        mutationFn: (data: any) => api.updateSettings(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "square"] });
            setFormLoaded(false);
            toast({ title: "Settings saved" });
        },
    });

    // Save announcement mutation
    const saveAnnouncementMutation = useMutation({
        mutationFn: (data: { text?: string; link?: string; linkText?: string; enabled?: boolean }) =>
            api.updateAnnouncementSettings(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "announcement"] });
            queryClient.invalidateQueries({ queryKey: ["public", "announcement"] });
            setAnnouncementLoaded(false);
            toast({ title: "Announcement bar updated" });
        },
        onError: (err: any) => {
            toast({ title: "Failed to save", description: err.message, variant: "destructive" });
        },
    });

    // Test connection
    const { data: connectionStatus, isLoading: testingConnection, refetch: testConnection } = useQuery({
        queryKey: ["admin", "square", "status"],
        queryFn: () => api.getSquareStatus(),
        enabled: false,
    });

    // Square locations
    const { data: squareLocations = [], isLoading: loadingSquareLocations, refetch: fetchSquareLocations } = useQuery({
        queryKey: ["admin", "square", "locations"],
        queryFn: () => api.getSquareLocations(),
        enabled: false,
    });

    // Website location mappings
    const { data: mappings = [] } = useQuery({
        queryKey: ["admin", "square", "mappings"],
        queryFn: () => api.getSquareMappings(),
    });

    // Update mapping
    const mappingMutation = useMutation({
        mutationFn: ({ id, squareLocationId }: { id: number; squareLocationId: string }) =>
            api.updateSquareMapping(id, squareLocationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "square", "mappings"] });
            toast({ title: "Location mapping updated" });
        },
    });

    const webhookUrl = `${window.location.origin}/api/webhooks/square`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

    useTour("admin-settings", adminSettingsSteps);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div data-tour="admin-settings-header">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Settings</h1>
                    <p className="text-white/70">
                        Configure Square POS integration and payment processing
                    </p>
                </div>

                <Tabs defaultValue="announcement" data-tour="admin-settings-tabs">
                    <TabsList>
                        <TabsTrigger value="announcement">
                            <Megaphone className="w-4 h-4 mr-2" />
                            Announcement Bar
                        </TabsTrigger>
                        <TabsTrigger value="connection">
                            <Link2 className="w-4 h-4 mr-2" />
                            Connection
                        </TabsTrigger>
                        <TabsTrigger value="locations">
                            <MapPin className="w-4 h-4 mr-2" />
                            Location Mapping
                        </TabsTrigger>
                        <TabsTrigger value="webhooks">
                            <Webhook className="w-4 h-4 mr-2" />
                            Webhooks
                        </TabsTrigger>
                    </TabsList>

                    {/* Announcement Bar Tab */}
                    <TabsContent value="announcement" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Megaphone className="w-5 h-5" />
                                    Announcement Bar
                                </CardTitle>
                                <CardDescription>
                                    Edit the notification banner that appears at the top of every page
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={announcementForm.enabled}
                                            onChange={(e) =>
                                                setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })
                                            }
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
                                    </label>
                                    <Label>Show announcement bar</Label>
                                </div>

                                <div className="space-y-2">
                                    <Label>Announcement Text</Label>
                                    <Input
                                        value={announcementForm.text}
                                        onChange={(e) =>
                                            setAnnouncementForm({ ...announcementForm, text: e.target.value })
                                        }
                                        placeholder="e.g. NEW DROP: Mango Habanero & Sweet Potato Casserole — PRE-ORDER NOW"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The full text displayed in the banner. If a link is set, the entire text becomes a clickable link.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Link URL (optional)</Label>
                                    <Input
                                        value={announcementForm.link}
                                        onChange={(e) =>
                                            setAnnouncementForm({ ...announcementForm, link: e.target.value })
                                        }
                                        placeholder="e.g. /pre-order"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Where the announcement links to. Use a relative path like /pre-order or /events.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Link Button Text (optional)</Label>
                                    <Input
                                        value={announcementForm.linkText}
                                        onChange={(e) =>
                                            setAnnouncementForm({ ...announcementForm, linkText: e.target.value })
                                        }
                                        placeholder="e.g. PRE-ORDER NOW, CLICK HERE, LEARN MORE"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The clickable text for the link. If left empty, the entire announcement text becomes the link.
                                    </p>
                                </div>

                                <Button
                                    onClick={() => saveAnnouncementMutation.mutate(announcementForm)}
                                    disabled={saveAnnouncementMutation.isPending}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saveAnnouncementMutation.isPending ? "Saving..." : "Save Announcement"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Connection Tab */}
                    <TabsContent value="connection" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings2 className="w-5 h-5" />
                                    Square API Credentials
                                </CardTitle>
                                <CardDescription>
                                    Enter your Square API credentials from the{" "}
                                    <a
                                        href="https://developer.squareup.com/apps"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline"
                                    >
                                        Square Developer Dashboard
                                    </a>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Access Token</Label>
                                    <Input
                                        type="password"
                                        value={settingsForm.square_access_token}
                                        onChange={(e) =>
                                            setSettingsForm({ ...settingsForm, square_access_token: e.target.value })
                                        }
                                        placeholder="EAAAl..."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Found under Credentials in your Square app settings
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Application ID</Label>
                                    <Input
                                        value={settingsForm.square_app_id}
                                        onChange={(e) =>
                                            setSettingsForm({ ...settingsForm, square_app_id: e.target.value })
                                        }
                                        placeholder="sandbox-sq0idb-..."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Required for online payment processing on the checkout page
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Environment</Label>
                                    <Select
                                        value={settingsForm.square_environment}
                                        onValueChange={(v) =>
                                            setSettingsForm({ ...settingsForm, square_environment: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                                            <SelectItem value="production">Production (Live)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        onClick={() => saveMutation.mutate(settingsForm)}
                                        disabled={saveMutation.isPending}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {saveMutation.isPending ? "Saving..." : "Save Credentials"}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={() => testConnection()}
                                        disabled={testingConnection}
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${testingConnection ? "animate-spin" : ""}`} />
                                        Test Connection
                                    </Button>

                                    {connectionStatus && (
                                        <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
                                            {connectionStatus.connected ? (
                                                <><CheckCircle className="w-3 h-3 mr-1" /> Connected ({connectionStatus.locationCount} locations)</>
                                            ) : (
                                                <><XCircle className="w-3 h-3 mr-1" /> {connectionStatus.error}</>
                                            )}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Location Mapping Tab */}
                    <TabsContent value="locations" className="space-y-4">
                        {/* Online Sales Location */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings2 className="w-5 h-5" />
                                    Online Sales Location
                                </CardTitle>
                                <CardDescription>
                                    Square location used for all online sales (pre-orders, event tickets, gift cards) except wholesale. Should be your "Online Sales" digital location in Square Dashboard. Orders will not be sent to individual POS devices.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Square Location</Label>
                                    {squareLocations.length > 0 ? (
                                        <Select
                                            value={settingsForm.square_online_sales_location_id || "none"}
                                            onValueChange={(v) =>
                                                setSettingsForm({ ...settingsForm, square_online_sales_location_id: v === "none" ? "" : v })
                                            }
                                        >
                                            <SelectTrigger className="w-full sm:w-[320px]">
                                                <SelectValue placeholder="Select Online Sales location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Not configured</SelectItem>
                                                {squareLocations.map((loc: any) => (
                                                    <SelectItem key={loc.id} value={loc.id}>
                                                        {loc.name} {loc.address ? `(${loc.address})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Input
                                                value={settingsForm.square_online_sales_location_id}
                                                onChange={(e) =>
                                                    setSettingsForm({ ...settingsForm, square_online_sales_location_id: e.target.value })
                                                }
                                                placeholder="Square Location ID (e.g. LXXXXXXXX)"
                                                className="w-full sm:w-[320px] font-mono text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fetchSquareLocations()}
                                                disabled={loadingSquareLocations}
                                            >
                                                <RefreshCw className={`w-4 h-4 mr-2 ${loadingSquareLocations ? "animate-spin" : ""}`} />
                                                Fetch locations
                                            </Button>
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {settingsForm.square_online_sales_location_id
                                            ? `Currently set to: ${settingsForm.square_online_sales_location_id}`
                                            : "Not configured — ticket and wholesale orders will not be sent to Square until this is set."}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => saveMutation.mutate(settingsForm)}
                                    disabled={saveMutation.isPending}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saveMutation.isPending ? "Saving..." : "Save Online Sales Location"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Wholesale Location */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings2 className="w-5 h-5" />
                                    Wholesale Location
                                </CardTitle>
                                <CardDescription>
                                    Square location used for wholesale invoices and orders. Should be your "Wholesale" location in Square Dashboard.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Square Location</Label>
                                    {squareLocations.length > 0 ? (
                                        <Select
                                            value={settingsForm.square_wholesale_location_id || "none"}
                                            onValueChange={(v) =>
                                                setSettingsForm({ ...settingsForm, square_wholesale_location_id: v === "none" ? "" : v })
                                            }
                                        >
                                            <SelectTrigger className="w-full sm:w-[320px]">
                                                <SelectValue placeholder="Select Wholesale location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Not configured</SelectItem>
                                                {squareLocations.map((loc: any) => (
                                                    <SelectItem key={loc.id} value={loc.id}>
                                                        {loc.name} {loc.address ? `(${loc.address})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Input
                                                value={settingsForm.square_wholesale_location_id}
                                                onChange={(e) =>
                                                    setSettingsForm({ ...settingsForm, square_wholesale_location_id: e.target.value })
                                                }
                                                placeholder="Square Location ID (e.g. LXXXXXXXX)"
                                                className="w-full sm:w-[320px] font-mono text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fetchSquareLocations()}
                                                disabled={loadingSquareLocations}
                                            >
                                                <RefreshCw className={`w-4 h-4 mr-2 ${loadingSquareLocations ? "animate-spin" : ""}`} />
                                                Fetch locations
                                            </Button>
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {settingsForm.square_wholesale_location_id
                                            ? `Currently set to: ${settingsForm.square_wholesale_location_id}`
                                            : "Not configured — wholesale invoices will not be sent to Square until this is set."}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => saveMutation.mutate(settingsForm)}
                                    disabled={saveMutation.isPending}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saveMutation.isPending ? "Saving..." : "Save Wholesale Location"}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <MapPin className="w-5 h-5" />
                                            Location Mapping
                                        </CardTitle>
                                        <CardDescription>
                                            Map your website locations to Square POS locations so orders appear on the correct register
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchSquareLocations()}
                                        disabled={loadingSquareLocations}
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingSquareLocations ? "animate-spin" : ""}`} />
                                        Fetch Square Locations
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {mappings.length === 0 ? (
                                    <p className="text-muted-foreground text-sm py-4 text-center">
                                        No locations configured. Add locations in the Locations page first.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Website Location</TableHead>
                                                <TableHead>Square POS Location</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mappings.map((mapping: any) => (
                                                <TableRow key={mapping.id}>
                                                    <TableCell className="font-medium">
                                                        {mapping.name}
                                                        {!mapping.active && (
                                                            <Badge variant="secondary" className="ml-2">Inactive</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {squareLocations.length > 0 ? (
                                                            <Select
                                                                value={mapping.squareLocationId || "none"}
                                                                onValueChange={(v) =>
                                                                    mappingMutation.mutate({
                                                                        id: mapping.id,
                                                                        squareLocationId: v === "none" ? "" : v,
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="w-full sm:w-[300px]">
                                                                    <SelectValue placeholder="Select Square location" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Not mapped</SelectItem>
                                                                    {squareLocations.map((loc: any) => (
                                                                        <SelectItem key={loc.id} value={loc.id}>
                                                                            {loc.name} {loc.address ? `(${loc.address})` : ""}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">
                                                                {mapping.squareLocationId || "Not mapped"}{" "}
                                                                <span className="text-xs">(click "Fetch Square Locations" to select from dropdown)</span>
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {mapping.squareLocationId ? (
                                                            <Badge variant="default">
                                                                <CheckCircle className="w-3 h-3 mr-1" /> Linked
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Not linked</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Webhooks Tab */}
                    <TabsContent value="webhooks" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Webhook className="w-5 h-5" />
                                    Webhook Configuration
                                </CardTitle>
                                <CardDescription>
                                    Set up webhooks so Square POS order changes sync back to your dashboard automatically
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Webhook URL</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Copy this URL into your Square Developer Dashboard under Webhooks → Add Endpoint
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={webhookUrl}
                                            className="font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(webhookUrl)}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Webhook Signature Key</Label>
                                    <Input
                                        type="password"
                                        value={settingsForm.square_webhook_signature_key}
                                        onChange={(e) =>
                                            setSettingsForm({
                                                ...settingsForm,
                                                square_webhook_signature_key: e.target.value,
                                            })
                                        }
                                        placeholder="Paste from Square Webhook settings"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Found in Square Developer Dashboard → Webhooks → your endpoint → Signature Key
                                    </p>
                                </div>

                                <Button
                                    onClick={() => saveMutation.mutate(settingsForm)}
                                    disabled={saveMutation.isPending}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saveMutation.isPending ? "Saving..." : "Save Webhook Settings"}
                                </Button>

                                <div className="bg-muted rounded-lg p-4 space-y-2">
                                    <p className="text-sm font-medium">Required Webhook Events</p>
                                    <p className="text-xs text-muted-foreground">
                                        Subscribe to these events in your Square webhook endpoint:
                                    </p>
                                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                        <li><code className="bg-background px-1 rounded">order.updated</code> — Syncs order completion from POS to dashboard</li>
                                        <li><code className="bg-background px-1 rounded">refund.created</code> — Syncs refunds from POS to dashboard</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
