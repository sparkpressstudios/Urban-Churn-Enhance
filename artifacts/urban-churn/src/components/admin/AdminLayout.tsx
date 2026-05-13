import { Link, useLocation } from "wouter";
import { useAuth } from "./AuthContext";
import {
    LayoutDashboard,
    ShoppingBag,
    MapPin,
    Package,
    Users,
    Upload,
    Shield,
    Ticket,
    CalendarDays,
    CalendarClock,
    Mail,
    ClipboardCheck,
    Settings2,
    LogOut,
    Menu,
    X,
    Briefcase,
    IceCreamCone,
    Truck,
    MessageSquare,
    TicketCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TourProvider, TourHelpButton } from "@/lib/tour";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { heading: string; items: NavItem[] };

const navGroups: NavGroup[] = [
    {
        heading: "Overview",
        items: [
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        ],
    },
    {
        heading: "Operations",
        items: [
            { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
            { href: "/admin/fulfillment", label: "Fulfillment", icon: ClipboardCheck },
            { href: "/admin/pre-orders", label: "Pre-Order Windows", icon: CalendarClock },
        ],
    },
    {
        heading: "Catalog",
        items: [
            { href: "/admin/products", label: "Products", icon: Package },
            { href: "/admin/locations", label: "Locations", icon: MapPin },
            { href: "/admin/coupons", label: "Coupons", icon: Ticket },
            { href: "/admin/events", label: "Events", icon: CalendarDays },
            { href: "/admin/event-orders", label: "Event Orders", icon: TicketCheck },
            { href: "/admin/careers", label: "Careers", icon: Briefcase },
            { href: "/admin/rotating-flavours", label: "Rotating Flavors", icon: IceCreamCone },
        ],
    },
    {
        heading: "Wholesale",
        items: [
            { href: "/admin/wholesale", label: "Wholesale Orders", icon: Truck },
        ],
    },
    {
        heading: "Inquiries",
        items: [
            { href: "/admin/inquiries", label: "Inquiries & Leads", icon: MessageSquare },
        ],
    },
    {
        heading: "Customers",
        items: [
            { href: "/admin/customers", label: "Customers", icon: Users },
            { href: "/admin/email-log", label: "Email Log", icon: Mail },
        ],
    },
    {
        heading: "System",
        items: [
            { href: "/admin/users", label: "Admin Users", icon: Shield },
            { href: "/admin/import", label: "WooCommerce Import", icon: Upload },
            { href: "/admin/settings", label: "Settings", icon: Settings2 },
        ],
    },
];

export function AdminLayout({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    const [location] = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Role-based nav filtering
    const role = (user as any)?.role || "admin";
    // Staff shouldn't be here (they're redirected to /store), but if they land here
    // show only Dashboard link. Managers see Operations + Customers but not System.
    const visibleGroups = navGroups
        .map((group) => {
            if (role === "admin") return group;
            if (role === "manager") {
                if (group.heading === "System") {
                    return {
                        ...group,
                        items: group.items.filter((i) => i.href === "/admin/settings" ? false : true),
                    };
                }
                return group;
            }
            // staff: hide everything except Overview
            if (group.heading === "Overview") return group;
            return null;
        })
        .filter((g): g is NavGroup => g !== null && g.items.length > 0);

    const isActive = (href: string) => {
        if (href === "/admin") return location === "/admin";
        return location.startsWith(href);
    };

    const sidebar = (
        <div className="flex flex-col h-full bg-[#111118] text-white">
            <div className="p-4 border-b border-white/10">
                <h1 className="text-lg font-bold text-[#A1AB74]">Urban Churn</h1>
                <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
            <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
                {visibleGroups.map((group) => (
                    <div key={group.heading}>
                        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                            {group.heading}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(item.href)
                                        ? "bg-[#A1AB74]/20 text-[#A1AB74]"
                                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
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
                <Link
                    href="/"
                    className="block px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                    ← Back to Website
                </Link>
            </div>
        </div>
    );

    return (
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
            {/* Dark overlay over background */}
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
                        Urban Churn Admin
                    </span>
                    <TourHelpButton />
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}
