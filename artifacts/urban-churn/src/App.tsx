import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/admin/AuthContext";
import { TourProvider } from "@/lib/tour";
import { CustomerAuthProvider } from "@/components/CustomerAuthContext";
import WelcomeBackDialog from "@/components/WelcomeBackDialog";
import { StoreProvider } from "@/components/store/StoreContext";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import SEO from "@/components/SEO";
import { lazy, Suspense, useEffect } from "react";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PreOrder from "@/pages/PreOrder";
import About from "@/pages/About";
import Locations from "@/pages/Locations";
import Catering from "@/pages/Catering";
import Wholesale from "@/pages/Wholesale";
import Contact from "@/pages/Contact";
import Fundraising from "@/pages/Fundraising";
import Careers from "@/pages/Careers";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import BakeryOrder from "@/pages/BakeryOrder";
import ProductDetail from "@/pages/ProductDetail";
import GiftCards from "@/pages/GiftCards";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";

// Code-split admin pages
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
const AdminForgotPassword = lazy(() => import("@/pages/admin/ForgotPassword"));
const AdminResetPassword = lazy(() => import("@/pages/admin/ResetPassword"));
const AdminChangePassword = lazy(() => import("@/pages/admin/ChangePassword"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminProductList = lazy(() => import("@/pages/admin/ProductList"));
const AdminProductEdit = lazy(() => import("@/pages/admin/ProductEdit"));
const AdminLocations = lazy(() => import("@/pages/admin/Locations"));
const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));
const AdminImport = lazy(() => import("@/pages/admin/Import"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminCoupons = lazy(() => import("@/pages/admin/Coupons"));
const AdminEvents = lazy(() => import("@/pages/admin/Events"));
const AdminEventDetail = lazy(() => import("@/pages/admin/EventDetail"));
const AdminFulfillment = lazy(() => import("@/pages/admin/Fulfillment"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const AdminBakeryOrders = lazy(() => import("@/pages/admin/BakeryOrders"));
const AdminPreOrderWindows = lazy(() => import("@/pages/admin/PreOrderWindows"));
const AdminEmailLog = lazy(() => import("@/pages/admin/EmailLog"));
const AdminCareers = lazy(() => import("@/pages/admin/Careers"));
const AdminRotatingFlavours = lazy(() => import("@/pages/admin/RotatingFlavours"));
const AdminWholesaleOrders = lazy(() => import("@/pages/admin/Wholesale"));
const AdminEventOrders = lazy(() => import("@/pages/admin/EventOrders"));
const AdminInquiries = lazy(() => import("@/pages/admin/Inquiries"));

// Code-split store portal pages
const StoreDashboard = lazy(() => import("@/pages/store/Dashboard"));
const StoreOrders = lazy(() => import("@/pages/store/Orders"));
const StoreOrderDetail = lazy(() => import("@/pages/store/OrderDetail"));

// Code-split customer account pages
const CustomerAccount = lazy(() => import("@/pages/account/Account"));
const CustomerLogin = lazy(() => import("@/pages/account/Login"));
const CustomerRegister = lazy(() => import("@/pages/account/Register"));
const CustomerForgotPassword = lazy(() => import("@/pages/account/ForgotPassword"));
const CustomerResetPassword = lazy(() => import("@/pages/account/ResetPassword"));
const WholesaleRegister = lazy(() => import("@/pages/WholesaleRegister"));
const WholesaleDashboard = lazy(() => import("@/pages/WholesaleDashboard"));
const WholesaleOrderForm = lazy(() => import("@/pages/WholesaleOrderForm"));
const WholesaleOrderDetail = lazy(() => import("@/pages/WholesaleOrderDetail"));
const DriverView = lazy(() => import("@/pages/Driver"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — avoid redundant refetches on window focus
      refetchOnWindowFocus: false,
    },
  },
});

function AdminFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pre-order" component={PreOrder} />
      <Route path="/about" component={About} />
      <Route path="/flavours">
        <Redirect to="/locations" />
      </Route>
      <Route path="/locations" component={Locations} />
      <Route path="/catering" component={Catering} />
      <Route path="/wholesale" component={Wholesale} />
      <Route path="/contact" component={Contact} />
      <Route path="/fundraising" component={Fundraising} />
      <Route path="/careers" component={Careers} />
      <Route path="/events" component={Events} />
      <Route path="/bakery" component={BakeryOrder} />
      <Route path="/gift-cards" component={GiftCards} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/pre-order/:slug" component={ProductDetail} />
      <Route path="/events/:slug" component={EventDetail} />

      {/* Customer Account Routes */}
      <Route path="/account">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="My Account | Urban Churn" noIndex />
          <CustomerAccount />
        </Suspense>
      </Route>
      <Route path="/account/login">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Login | Urban Churn" noIndex />
          <CustomerLogin />
        </Suspense>
      </Route>
      <Route path="/account/register">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Register | Urban Churn" noIndex />
          <CustomerRegister />
        </Suspense>
      </Route>
      <Route path="/account/forgot-password">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Forgot Password | Urban Churn" noIndex />
          <CustomerForgotPassword />
        </Suspense>
      </Route>
      <Route path="/account/reset-password">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Reset Password | Urban Churn" noIndex />
          <CustomerResetPassword />
        </Suspense>
      </Route>

      {/* Wholesale Portal Routes */}
      <Route path="/wholesale/register">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Wholesale Registration | Urban Churn" noIndex />
          <WholesaleRegister />
        </Suspense>
      </Route>
      <Route path="/wholesale/portal">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Wholesale Portal | Urban Churn" noIndex />
          <WholesaleDashboard />
        </Suspense>
      </Route>
      <Route path="/wholesale/portal/order/:id">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Order Details | Urban Churn" noIndex />
          <WholesaleOrderDetail />
        </Suspense>
      </Route>
      <Route path="/wholesale/portal/order">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="New Wholesale Order | Urban Churn" noIndex />
          <WholesaleOrderForm />
        </Suspense>
      </Route>

      {/* Driver delivery app (token-based, no auth) */}
      <Route path="/driver/:token">
        <Suspense fallback={<AdminFallback />}>
          <DriverView />
        </Suspense>
      </Route>

      {/* Store Portal Routes */}
      <Route path="/store">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <StoreProvider>
              <StoreDashboard />
            </StoreProvider>
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/store/orders/:id">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <StoreProvider>
              <StoreOrderDetail />
            </StoreProvider>
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/store/orders">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <StoreProvider>
              <StoreOrders />
            </StoreProvider>
          </ProtectedRoute>
        </Suspense>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/login">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Admin Login | Urban Churn" noIndex />
          <AdminLogin />
        </Suspense>
      </Route>
      <Route path="/admin/forgot-password">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Forgot Password | Urban Churn" noIndex />
          <AdminForgotPassword />
        </Suspense>
      </Route>
      <Route path="/admin/reset-password">
        <Suspense fallback={<AdminFallback />}>
          <SEO title="Reset Password | Urban Churn" noIndex />
          <AdminResetPassword />
        </Suspense>
      </Route>
      <Route path="/admin/change-password">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <StoreProvider>
              <SEO title="Change Password | Urban Churn" noIndex />
              <AdminChangePassword />
            </StoreProvider>
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <SEO title="Admin Dashboard | Urban Churn" noIndex />
            <AdminDashboard />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/orders">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminOrders />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/fulfillment">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminFulfillment />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/products/new">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminProductEdit />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/products/:id">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminProductEdit />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/products">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminProductList />
          </ProtectedRoute>
        </Suspense>
      </Route>
      {/* Redirects for old URLs */}
      <Route path="/admin/flavours">
        <Redirect to="/admin/products" />
      </Route>
      <Route path="/admin/sizes">
        <Redirect to="/admin/products" />
      </Route>
      <Route path="/admin/locations">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminLocations />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/customers">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminCustomers />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/import">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminImport />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/users">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/coupons">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminCoupons />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/events">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminEvents />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/events/:id">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminEventDetail />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/event-orders">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminEventOrders />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/settings">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/careers">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminCareers />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/rotating-flavours">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminRotatingFlavours />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/bakery-orders">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminBakeryOrders />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/pre-orders">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminPreOrderWindows />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/email-log">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminEmailLog />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/wholesale">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminWholesaleOrders />
          </ProtectedRoute>
        </Suspense>
      </Route>
      <Route path="/admin/inquiries">
        <Suspense fallback={<AdminFallback />}>
          <ProtectedRoute>
            <AdminInquiries />
          </ProtectedRoute>
        </Suspense>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <TourProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ScrollToTop />
                <Router />
              </WouterRouter>
            </TourProvider>
            <Toaster />
            <WelcomeBackDialog />
          </CustomerAuthProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
