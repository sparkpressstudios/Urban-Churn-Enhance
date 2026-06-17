import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEasternDate, formatEasternDateTime } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminUsersSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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
    Shield,
    Plus,
    Pencil,
    Trash2,
    Info,
    Mail,
    Copy,
    Check,
    KeyRound,
    History,
    AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLE_COLORS: Record<string, string> = {
    admin: "destructive",
    manager: "default",
    staff: "secondary",
};

const FAILURE_LABELS: Record<string, string> = {
    missing_credentials: "Missing username or password",
    user_not_found: "Username not found",
    invalid_password: "Wrong password",
};

interface UserForm {
    username: string;
    password: string;
    email: string;
    role: string;
    assignedLocationId: string;
    sendEmail: boolean;
}

const emptyForm: UserForm = {
    username: "",
    password: "",
    email: "",
    role: "staff",
    assignedLocationId: "",
    sendEmail: true,
};

export default function AdminUsers() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<UserForm>(emptyForm);
    const [createdCredentials, setCreatedCredentials] = useState<
        | {
            username: string;
            password: string;
            role: string;
            emailSent: boolean;
            loginUrl: string;
        }
        | null
    >(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [loginHistoryUser, setLoginHistoryUser] = useState<any | null>(null);

    const { data: users = [] } = useQuery({
        queryKey: ["admin", "users"],
        queryFn: () => api.getUsers(),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ["admin", "locations"],
        queryFn: () => api.getLocations(),
    });

    const { data: recentFailedLogins = [] } = useQuery({
        queryKey: ["admin", "login-logs", "recent-failed"],
        queryFn: () => api.getAdminLoginLogs({ success: "false", limit: "25" }),
    });

    const { data: userLoginLogs = [] } = useQuery({
        queryKey: ["admin", "login-logs", loginHistoryUser?.id],
        queryFn: () => api.getAdminLoginLogs({
            userId: String(loginHistoryUser!.id),
            limit: "50",
        }),
        enabled: !!loginHistoryUser,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createUser(data),
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            setCreating(false);
            setForm(emptyForm);
            setCreatedCredentials({
                username: result.username,
                password: result.tempPassword,
                role: result.role,
                emailSent: result.emailSent,
                loginUrl: `${window.location.origin}/admin/login`,
            });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            api.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            setEditing(null);
            toast({ title: "User updated" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });

    const sendCredsMutation = useMutation({
        mutationFn: (id: number) => api.sendUserCredentials(id),
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            toast({
                title: result.emailSent
                    ? "New credentials emailed to user"
                    : "Password reset — email delivery could not be confirmed",
            });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const openEdit = (user: any) => {
        setForm({
            username: user.username,
            password: "",
            email: user.email || "",
            role: user.role,
            assignedLocationId: user.assignedLocationId
                ? String(user.assignedLocationId)
                : "",
            sendEmail: false,
        });
        setEditing(user);
    };

    const openCreate = () => {
        setForm(emptyForm);
        setCreating(true);
    };

    const copy = (key: string, val: string) => {
        navigator.clipboard.writeText(val);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    useTour("admin-users", adminUsersSteps);

    // Staff requires an assigned location
    const staffNeedsLocation =
        form.role === "staff" && !form.assignedLocationId;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between" data-tour="admin-users-header">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Admin Users</h1>
                        <p className="text-white/70">
                            Manage dashboard access and roles
                        </p>
                    </div>
                    <Button onClick={openCreate} data-tour="admin-users-create">
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                    </Button>
                </div>

                {/* Role explainer */}
                <Card className="bg-blue-500/5 border-blue-500/30">
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm text-white/80">
                                <p className="font-medium text-white">How roles & access work</p>
                                <ul className="space-y-1 list-disc list-inside text-white/70">
                                    <li>
                                        <strong className="text-white">Admin</strong> — full access to
                                        the Admin Dashboard (<code>/admin</code>). Can manage products,
                                        orders, users, settings, and all locations.
                                    </li>
                                    <li>
                                        <strong className="text-white">Manager</strong> — Store Portal
                                        (<code>/store</code>) with a location switcher. Can view and
                                        fulfill orders at any location.
                                    </li>
                                    <li>
                                        <strong className="text-white">Staff</strong> — Store Portal
                                        locked to a single assigned location. Only sees orders for that
                                        shop.
                                    </li>
                                </ul>
                                <p className="text-white/60 text-xs pt-1">
                                    Staff sign in at <code>/admin/login</code> and are auto-redirected
                                    to the Store Portal.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {recentFailedLogins.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Recent failed logins
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>When</TableHead>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>IP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentFailedLogins.map((log: any) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {formatEasternDateTime(log.createdAt)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{log.usernameAttempted}</TableCell>
                                                <TableCell className="text-xs text-amber-700">
                                                    {FAILURE_LABELS[log.failureReason] || log.failureReason || "Failed"}
                                                </TableCell>
                                                <TableCell className="text-xs text-white/60 font-mono">
                                                    {log.ipAddress || "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card data-tour="admin-users-table">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Users ({users.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Last login</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.username}
                                            {user.mustChangePassword && (
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                    Pending reset
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-white/70">
                                            {user.email || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={ROLE_COLORS[user.role] as any || "secondary"}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.assignedLocationId
                                                ? locations.find((l: any) => l.id === user.assignedLocationId)?.name || "—"
                                                : user.role === "staff"
                                                    ? <span className="text-red-400 text-xs">⚠ not assigned</span>
                                                    : "All"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {user.lastLoginAt ? (
                                                <span className="text-green-700">{formatEasternDateTime(user.lastLoginAt)}</span>
                                            ) : (
                                                <span className="text-white/40">Never</span>
                                            )}
                                            {user.lastFailedLoginAt && (
                                                <div className="text-[10px] text-amber-600 mt-0.5">
                                                    Failed {formatEasternDateTime(user.lastFailedLoginAt)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatEasternDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="View login history"
                                                    onClick={() => setLoginHistoryUser(user)}
                                                >
                                                    <History className="w-4 h-4" />
                                                </Button>
                                                {user.email && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Reset password & email new credentials"
                                                        onClick={() => {
                                                            if (
                                                                confirm(
                                                                    `Generate a new password for "${user.username}" and email it to ${user.email}?`,
                                                                )
                                                            )
                                                                sendCredsMutation.mutate(user.id);
                                                        }}
                                                    >
                                                        <KeyRound className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(user)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                `Delete user "${user.username}"?`,
                                                            )
                                                        )
                                                            deleteMutation.mutate(user.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create Dialog */}
            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Admin User</DialogTitle>
                        <DialogDescription>
                            A temporary password will be generated if none is provided.
                            Staff must be assigned to a location.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (staffNeedsLocation) return;
                            createMutation.mutate({
                                username: form.username,
                                password: form.password || undefined,
                                email: form.email || undefined,
                                role: form.role,
                                assignedLocationId:
                                    form.assignedLocationId
                                        ? Number(form.assignedLocationId)
                                        : null,
                                sendEmail: form.sendEmail && !!form.email,
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label>Username *</Label>
                            <Input
                                value={form.username}
                                onChange={(e) =>
                                    setForm({ ...form, username: e.target.value })
                                }
                                required
                            />
                        </div>
                        <div>
                            <Label>Email {form.sendEmail && "*"}</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                }
                                placeholder="staff@example.com"
                                required={form.sendEmail}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Used for password resets and credentials emails.
                            </p>
                        </div>
                        <div>
                            <Label>Password (leave blank to auto-generate)</Label>
                            <Input
                                type="text"
                                value={form.password}
                                onChange={(e) =>
                                    setForm({ ...form, password: e.target.value })
                                }
                                placeholder="Auto-generated"
                            />
                        </div>
                        <div>
                            <Label>Role *</Label>
                            <Select
                                value={form.role}
                                onValueChange={(v) => setForm({ ...form, role: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin — full dashboard</SelectItem>
                                    <SelectItem value="manager">Manager — all locations (store)</SelectItem>
                                    <SelectItem value="staff">Staff — single location (store)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Assigned Location
                                {form.role === "staff" && " *"}
                            </Label>
                            <Select
                                value={form.assignedLocationId || "all"}
                                onValueChange={(v) =>
                                    setForm({
                                        ...form,
                                        assignedLocationId: v === "all" ? "" : v,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={form.role === "staff" ? "Select location" : "All locations"}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {form.role !== "staff" && (
                                        <SelectItem value="all">All locations</SelectItem>
                                    )}
                                    {locations.map((loc: any) => (
                                        <SelectItem key={loc.id} value={String(loc.id)}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {staffNeedsLocation && (
                                <p className="text-xs text-red-400 mt-1">
                                    Staff users must have an assigned location.
                                </p>
                            )}
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.sendEmail}
                                onChange={(e) =>
                                    setForm({ ...form, sendEmail: e.target.checked })
                                }
                            />
                            <Mail className="w-4 h-4" /> Email credentials to this user
                        </label>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending || staffNeedsLocation}
                        >
                            {createMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (staffNeedsLocation) return;
                            const data: any = {
                                username: form.username,
                                email: form.email || null,
                                role: form.role,
                                assignedLocationId: form.assignedLocationId
                                    ? Number(form.assignedLocationId)
                                    : null,
                            };
                            if (form.password) data.password = form.password;
                            updateMutation.mutate({ id: editing.id, data });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label>Username</Label>
                            <Input
                                value={form.username}
                                onChange={(e) =>
                                    setForm({ ...form, username: e.target.value })
                                }
                                required
                            />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                }
                            />
                        </div>
                        <div>
                            <Label>Password (leave blank to keep current)</Label>
                            <Input
                                type="password"
                                value={form.password}
                                onChange={(e) =>
                                    setForm({ ...form, password: e.target.value })
                                }
                            />
                        </div>
                        <div>
                            <Label>Role</Label>
                            <Select
                                value={form.role}
                                onValueChange={(v) => setForm({ ...form, role: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Assigned Location
                                {form.role === "staff" && " *"}
                            </Label>
                            <Select
                                value={form.assignedLocationId || "all"}
                                onValueChange={(v) =>
                                    setForm({
                                        ...form,
                                        assignedLocationId: v === "all" ? "" : v,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All locations" />
                                </SelectTrigger>
                                <SelectContent>
                                    {form.role !== "staff" && (
                                        <SelectItem value="all">All locations</SelectItem>
                                    )}
                                    {locations.map((loc: any) => (
                                        <SelectItem key={loc.id} value={String(loc.id)}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {staffNeedsLocation && (
                                <p className="text-xs text-red-400 mt-1">
                                    Staff users must have an assigned location.
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending || staffNeedsLocation}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Credentials Success Dialog */}
            <Dialog
                open={!!createdCredentials}
                onOpenChange={(o) => !o && setCreatedCredentials(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User created — share these credentials</DialogTitle>
                        <DialogDescription>
                            {createdCredentials?.emailSent
                                ? "An email with these credentials was sent. You can also copy them below."
                                : "This is the only time the password will be shown. Copy it now."}
                        </DialogDescription>
                    </DialogHeader>
                    {createdCredentials && (
                        <div className="space-y-3">
                            <CredentialRow
                                label="Login URL"
                                value={createdCredentials.loginUrl}
                                copied={copied === "url"}
                                onCopy={() => copy("url", createdCredentials.loginUrl)}
                            />
                            <CredentialRow
                                label="Username"
                                value={createdCredentials.username}
                                copied={copied === "user"}
                                onCopy={() => copy("user", createdCredentials.username)}
                            />
                            <CredentialRow
                                label="Temporary Password"
                                value={createdCredentials.password}
                                copied={copied === "pwd"}
                                onCopy={() => copy("pwd", createdCredentials.password)}
                                mono
                            />
                            <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                                After signing in, the user will land on the{" "}
                                {createdCredentials.role === "admin"
                                    ? "Admin Dashboard"
                                    : "Store Portal"}
                                . They should change this password from their profile.
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!loginHistoryUser}
                onOpenChange={(open) => !open && setLoginHistoryUser(null)}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Login history — {loginHistoryUser?.username}</DialogTitle>
                        <DialogDescription>
                            Successful and failed sign-in attempts at /admin/login
                        </DialogDescription>
                    </DialogHeader>
                    {userLoginLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No login attempts recorded yet.
                        </p>
                    ) : (
                        <div className="max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>When</TableHead>
                                        <TableHead>Result</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>IP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userLoginLogs.map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {formatEasternDateTime(log.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={log.success ? "default" : "destructive"}>
                                                    {log.success ? "Success" : "Failed"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {log.success
                                                    ? "Signed in"
                                                    : FAILURE_LABELS[log.failureReason] || log.failureReason || "Failed"}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {log.ipAddress || "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

function CredentialRow({
    label,
    value,
    onCopy,
    copied,
    mono,
}: {
    label: string;
    value: string;
    onCopy: () => void;
    copied: boolean;
    mono?: boolean;
}) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <div className="flex gap-2 mt-1">
                <Input
                    readOnly
                    value={value}
                    className={mono ? "font-mono" : ""}
                    onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" size="sm" onClick={onCopy}>
                    {copied ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
