import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminCareersSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { Briefcase, Plus, Pencil, Trash2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ──

interface JobPosting {
    id: number;
    title: string;
    locations: string;
    type: string;
    description: string;
    highlights: string[];
    active: boolean;
    sortOrder: number;
}

interface CareerBenefit {
    id: number;
    title: string;
    description: string;
    iconName: string;
    iconColor: string;
    active: boolean;
    sortOrder: number;
}

const JOB_TYPES = [
    { value: "part_time", label: "Part-Time" },
    { value: "full_time", label: "Full-Time" },
    { value: "seasonal", label: "Seasonal" },
];

const TYPE_LABELS: Record<string, string> = {
    part_time: "Part-Time",
    full_time: "Full-Time",
    seasonal: "Seasonal",
};

const ICON_OPTIONS = [
    { value: "coffee", label: "Coffee (Ice Cream)" },
    { value: "calendar", label: "Calendar" },
    { value: "users", label: "Users (Team)" },
    { value: "trending-up", label: "Trending Up (Growth)" },
    { value: "star", label: "Star" },
    { value: "heart", label: "Heart" },
    { value: "award", label: "Award" },
    { value: "clock", label: "Clock" },
    { value: "shield", label: "Shield" },
    { value: "smile", label: "Smile" },
    { value: "dollar-sign", label: "Dollar Sign" },
    { value: "sun", label: "Sun" },
    { value: "gift", label: "Gift" },
    { value: "zap", label: "Zap" },
];

const COLOR_OPTIONS = [
    { value: "#d4a853", label: "Gold" },
    { value: "#A1AB74", label: "Green" },
    { value: "#111118", label: "Dark" },
    { value: "#e74c3c", label: "Red" },
    { value: "#3498db", label: "Blue" },
];

const emptyJob: Omit<JobPosting, "id"> = {
    title: "",
    locations: "",
    type: "part_time",
    description: "",
    highlights: [],
    active: true,
    sortOrder: 0,
};

const emptyBenefit: Omit<CareerBenefit, "id"> = {
    title: "",
    description: "",
    iconName: "star",
    iconColor: "#d4a853",
    active: true,
    sortOrder: 0,
};

export default function AdminCareers() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Job dialog state
    const [jobDialogOpen, setJobDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
    const [jobForm, setJobForm] = useState(emptyJob);
    const [highlightInput, setHighlightInput] = useState("");

    // Benefit dialog state
    const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
    const [editingBenefit, setEditingBenefit] = useState<CareerBenefit | null>(null);
    const [benefitForm, setBenefitForm] = useState(emptyBenefit);

    // ── Data fetching ──

    const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobPosting[]>({
        queryKey: ["admin", "career-jobs"],
        queryFn: () => api.getCareerJobs(),
    });

    const { data: benefits = [], isLoading: benefitsLoading } = useQuery<CareerBenefit[]>({
        queryKey: ["admin", "career-benefits"],
        queryFn: () => api.getCareerBenefits(),
    });

    // ── Job mutations ──

    const createJobMutation = useMutation({
        mutationFn: (data: any) => api.createCareerJob(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "career-jobs"] });
            setJobDialogOpen(false);
            toast({ title: "Job posting created" });
        },
    });

    const updateJobMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateCareerJob(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "career-jobs"] });
            setJobDialogOpen(false);
            toast({ title: "Job posting updated" });
        },
    });

    const deleteJobMutation = useMutation({
        mutationFn: (id: number) => api.deleteCareerJob(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "career-jobs"] });
            toast({ title: "Job posting removed" });
        },
    });

    // ── Benefit mutations ──

    const createBenefitMutation = useMutation({
        mutationFn: (data: any) => api.createCareerBenefit(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "career-benefits"] });
            setBenefitDialogOpen(false);
            toast({ title: "Benefit created" });
        },
    });

    const updateBenefitMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateCareerBenefit(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "career-benefits"] });
            setBenefitDialogOpen(false);
            toast({ title: "Benefit updated" });
        },
    });

    const deleteBenefitMutation = useMutation({
        mutationFn: (id: number) => api.deleteCareerBenefit(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "career-benefits"] });
            toast({ title: "Benefit removed" });
        },
    });

    // ── Job handlers ──

    function openCreateJob() {
        setEditingJob(null);
        setJobForm({ ...emptyJob, sortOrder: jobs.length });
        setHighlightInput("");
        setJobDialogOpen(true);
    }

    function openEditJob(job: JobPosting) {
        setEditingJob(job);
        setJobForm({
            title: job.title,
            locations: job.locations,
            type: job.type,
            description: job.description,
            highlights: job.highlights || [],
            active: job.active,
            sortOrder: job.sortOrder,
        });
        setHighlightInput("");
        setJobDialogOpen(true);
    }

    function handleJobSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editingJob) {
            updateJobMutation.mutate({ id: editingJob.id, data: jobForm });
        } else {
            createJobMutation.mutate(jobForm);
        }
    }

    function addHighlight() {
        const trimmed = highlightInput.trim();
        if (trimmed && !jobForm.highlights.includes(trimmed)) {
            setJobForm({ ...jobForm, highlights: [...jobForm.highlights, trimmed] });
            setHighlightInput("");
        }
    }

    function removeHighlight(index: number) {
        setJobForm({
            ...jobForm,
            highlights: jobForm.highlights.filter((_, i) => i !== index),
        });
    }

    // ── Benefit handlers ──

    function openCreateBenefit() {
        setEditingBenefit(null);
        setBenefitForm({ ...emptyBenefit, sortOrder: benefits.length });
        setBenefitDialogOpen(true);
    }

    function openEditBenefit(benefit: CareerBenefit) {
        setEditingBenefit(benefit);
        setBenefitForm({
            title: benefit.title,
            description: benefit.description,
            iconName: benefit.iconName,
            iconColor: benefit.iconColor,
            active: benefit.active,
            sortOrder: benefit.sortOrder,
        });
        setBenefitDialogOpen(true);
    }

    function handleBenefitSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editingBenefit) {
            updateBenefitMutation.mutate({ id: editingBenefit.id, data: benefitForm });
        } else {
            createBenefitMutation.mutate(benefitForm);
        }
    }

    // ── Toggle active ──

    function toggleJobActive(job: JobPosting) {
        updateJobMutation.mutate({ id: job.id, data: { active: !job.active } });
    }

    function toggleBenefitActive(benefit: CareerBenefit) {
        updateBenefitMutation.mutate({ id: benefit.id, data: { active: !benefit.active } });
    }

    const activeJobs = jobs.filter((j) => j.active).length;
    const activeBenefits = benefits.filter((b) => b.active).length;

    useTour("admin-careers", adminCareersSteps);

    return (
        <AdminLayout>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6" data-tour="admin-careers-header">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Careers</h1>
                    <p className="text-white/70 text-sm mt-1">Manage job postings and career page benefits</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-tour="admin-careers-stats">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-medium">Total Jobs</p>
                        <p className="text-2xl font-bold">{jobs.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-medium">Active Jobs</p>
                        <p className="text-2xl font-bold text-green-600">{activeJobs}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-medium">Total Benefits</p>
                        <p className="text-2xl font-bold">{benefits.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-medium">Active Benefits</p>
                        <p className="text-2xl font-bold text-green-600">{activeBenefits}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="jobs" className="space-y-4" data-tour="admin-careers-tabs">
                <TabsList>
                    <TabsTrigger value="jobs" className="gap-2">
                        <Briefcase className="w-4 h-4" />
                        Job Postings
                    </TabsTrigger>
                    <TabsTrigger value="benefits" className="gap-2">
                        <Heart className="w-4 h-4" />
                        Benefits
                    </TabsTrigger>
                </TabsList>

                {/* ═══ Job Postings Tab ═══ */}
                <TabsContent value="jobs">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle className="text-lg">Job Postings</CardTitle>
                            <Button onClick={openCreateJob} size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Job
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {jobsLoading ? (
                                <p className="text-gray-500 text-sm py-8 text-center">Loading...</p>
                            ) : jobs.length === 0 ? (
                                <p className="text-gray-500 text-sm py-8 text-center">No job postings yet. Click "Add Job" to create one.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Locations</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Order</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {jobs.map((job) => (
                                            <TableRow key={job.id} className={!job.active ? "opacity-50" : ""}>
                                                <TableCell className="font-medium">{job.title}</TableCell>
                                                <TableCell className="text-sm text-gray-600">{job.locations}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{TYPE_LABELS[job.type] || job.type}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={job.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                                                        {job.active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{job.sortOrder}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-1 justify-end">
                                                        <Button variant="ghost" size="sm" onClick={() => toggleJobActive(job)} title={job.active ? "Deactivate" : "Activate"}>
                                                            <Switch checked={job.active} className="pointer-events-none" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => openEditJob(job)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => deleteJobMutation.mutate(job.id)} className="text-red-600 hover:text-red-700">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ Benefits Tab ═══ */}
                <TabsContent value="benefits">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle className="text-lg">Career Benefits</CardTitle>
                            <Button onClick={openCreateBenefit} size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Benefit
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {benefitsLoading ? (
                                <p className="text-gray-500 text-sm py-8 text-center">Loading...</p>
                            ) : benefits.length === 0 ? (
                                <p className="text-gray-500 text-sm py-8 text-center">No benefits yet. Click "Add Benefit" to create one.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Icon</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Order</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {benefits.map((benefit) => (
                                            <TableRow key={benefit.id} className={!benefit.active ? "opacity-50" : ""}>
                                                <TableCell>
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                                                        style={{ backgroundColor: benefit.iconColor + "20", color: benefit.iconColor }}
                                                    >
                                                        {benefit.iconName.charAt(0).toUpperCase()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">{benefit.title}</TableCell>
                                                <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">{benefit.description}</TableCell>
                                                <TableCell>
                                                    <Badge className={benefit.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                                                        {benefit.active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{benefit.sortOrder}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-1 justify-end">
                                                        <Button variant="ghost" size="sm" onClick={() => toggleBenefitActive(benefit)} title={benefit.active ? "Deactivate" : "Activate"}>
                                                            <Switch checked={benefit.active} className="pointer-events-none" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => openEditBenefit(benefit)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => deleteBenefitMutation.mutate(benefit.id)} className="text-red-600 hover:text-red-700">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ═══ Job Dialog ═══ */}
            <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingJob ? "Edit Job Posting" : "New Job Posting"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleJobSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <Input
                                required
                                value={jobForm.title}
                                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                                placeholder="e.g. Part-Time Scooper"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Locations</label>
                            <Input
                                value={jobForm.locations}
                                onChange={(e) => setJobForm({ ...jobForm, locations: e.target.value })}
                                placeholder="e.g. Carlisle, Mechanicsburg"
                            />
                            <p className="text-xs text-gray-500 mt-1">Comma-separated list of locations</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <Select value={jobForm.type} onValueChange={(v) => setJobForm({ ...jobForm, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {JOB_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <Textarea
                                value={jobForm.description}
                                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                                placeholder="Brief description of the role..."
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Highlights</label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={highlightInput}
                                    onChange={(e) => setHighlightInput(e.target.value)}
                                    placeholder="e.g. Flexible hours"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addHighlight();
                                        }
                                    }}
                                />
                                <Button type="button" variant="outline" onClick={addHighlight} size="sm">
                                    Add
                                </Button>
                            </div>
                            {jobForm.highlights.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {jobForm.highlights.map((h, i) => (
                                        <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                            {h}
                                            <button type="button" onClick={() => removeHighlight(i)} className="ml-1 hover:text-red-600">×</button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                <Input
                                    type="number"
                                    value={jobForm.sortOrder}
                                    onChange={(e) => setJobForm({ ...jobForm, sortOrder: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-end gap-2 pb-1">
                                <Switch
                                    checked={jobForm.active}
                                    onCheckedChange={(v) => setJobForm({ ...jobForm, active: v })}
                                />
                                <label className="text-sm font-medium text-gray-700">Active</label>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" className="flex-1" disabled={createJobMutation.isPending || updateJobMutation.isPending}>
                                {editingJob ? "Update" : "Create"} Job
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setJobDialogOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═══ Benefit Dialog ═══ */}
            <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingBenefit ? "Edit Benefit" : "New Benefit"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBenefitSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <Input
                                required
                                value={benefitForm.title}
                                onChange={(e) => setBenefitForm({ ...benefitForm, title: e.target.value })}
                                placeholder="e.g. Free Ice Cream"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <Textarea
                                value={benefitForm.description}
                                onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
                                placeholder="Short description of this benefit..."
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                <Select value={benefitForm.iconName} onValueChange={(v) => setBenefitForm({ ...benefitForm, iconName: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ICON_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Icon Color</label>
                                <Select value={benefitForm.iconColor} onValueChange={(v) => setBenefitForm({ ...benefitForm, iconColor: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLOR_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <span className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: opt.value }} />
                                                    {opt.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                <Input
                                    type="number"
                                    value={benefitForm.sortOrder}
                                    onChange={(e) => setBenefitForm({ ...benefitForm, sortOrder: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-end gap-2 pb-1">
                                <Switch
                                    checked={benefitForm.active}
                                    onCheckedChange={(v) => setBenefitForm({ ...benefitForm, active: v })}
                                />
                                <label className="text-sm font-medium text-gray-700">Active</label>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" className="flex-1" disabled={createBenefitMutation.isPending || updateBenefitMutation.isPending}>
                                {editingBenefit ? "Update" : "Create"} Benefit
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setBenefitDialogOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
