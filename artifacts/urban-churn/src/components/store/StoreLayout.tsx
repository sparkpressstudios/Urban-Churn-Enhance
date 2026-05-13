import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/admin/AuthContext";
import {
    LayoutDashboard,
    ShoppingBag,
    LogOut,
    Menu,
    X,
    MapPin,
    ChevronDown,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TourProvider, TourHelpButton } from "@/lib/tour";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { storeApi } from "@/lib/store-api";

type NavItem = { href: string; label: string; icon: React.ElementType };

const navItems: NavItem[] = [
    { href: "/store", label: "Dashboard", icon: LayoutDashboard },
    { href: "/store/orders", label: "Orders", icon: ShoppingBag },
];

interface StoreLayoutProps {
    children: ReactNode;
    selectedLocationId: number | null;
    onLocationChange: (locationId: number | null) => void;
    showLocationSwitcher: boolean;
    locationName?: string;
}

export function StoreLayout({
    children,
    selectedLocationId,
    onLocationChange,
    showLocationSwitcher,
    locationName,
}: StoreLayoutProps) {
    const { user, logout } = useAuth();
    const [location] = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { data: locations = [] } = useQuery({
        queryKey: ["store", "locations"],
        queryFn: () => storeApi.getLocations(),
        enabled: showLocationSwitcher,
    });

    const isActive = (href: string) => {
        if (href === "/store") return location === "/store";
        return location.startsWith(href);
    };

    const currentLocationName = selectedLocationId
        ? locations.find((l: any) => l.id === selectedLocationId)?.name || locationName || "Store"
        : "All Locations";

    const sidebar = (
        <div className="flex flex-col h-full bg-[#111118] text-white">
            <div className="p-4 border-b border-white/10">
                <h1 className="text-lg font-bold text-[#A1AB74]">Urban Churn</h1>
                <p className="text-xs text-gray-400">Store Dashboard</p>
            </div>

            {/* Location indicator / switcher */}
            <div className="px-3 pt-3 pb-1">
                {showLocationSwitcher ? (
                    <Select
                        value={selectedLocationId ? String(selectedLocationId) : "all"}
                        onValueChange={(v) => onLocationChange(v === "all" ? null : Number(v))}
                    >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                            <div className="flex items-center gap-2 truncate">
                                <MapPin className="w-3.5 h-3.5 text-[#A1AB74] flex-shrink-0" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            {locations.map((loc: any) => (
                                <SelectItem key={loc.id} value={String(loc.id)}>
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#A1AB74]/10 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-[#A1AB74] flex-shrink-0" />
                        <span className="text-[#A1AB74] font-medium truncate">{currentLocationName}</span>
                    </div>
                )}
            </div>

            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive(item.href)
                            ? "bg-[#A1AB74]/20 text-[#A1AB74]"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-3 border-t border-white/10">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
                    <span className="flex-1 truncate">{user?.username}</span>
                    <TourHelpButton />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="text-gray-400 hover:text-white h-auto p-1"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <TourProvider>
            <div
                className="relative flex h-screen"
                style={{
                    backgroundImage: "url('/images/login-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundAttachment: "fixed",
                }}
            >
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />

                {/* Desktop Sidebar */}
                <aside className="relative hidden md:block w-60 flex-shrink-0 border-r border-white/10 z-10">
                    {sidebar}
                </aside>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <aside className="relative w-60 h-full">{sidebar}</aside>
                    </div>
                )}

                {/* Main content */}
                <div className="relative flex-1 flex flex-col overflow-hidden z-10">
                    <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#111118]/90 border-b border-white/10 backdrop-blur-sm">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarOpen(true)}
                            className="p-1 text-white hover:text-white"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                        <span className="text-sm font-semibold text-[#A1AB74] flex-1">
                            Urban Churn — {currentLocationName}
                        </span>
                        <TourHelpButton />
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
                </div>
            </div>
        </TourProvider>
    );
}
