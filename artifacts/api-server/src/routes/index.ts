import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import publicRouter from "./public";
import adminFlavoursRouter from "./admin/flavours";
import adminSizesRouter from "./admin/sizes";
import adminProductsRouter from "./admin/products";
import adminLocationsRouter from "./admin/locations";
import adminOrdersRouter from "./admin/orders";
import adminCustomersRouter from "./admin/customers";
import adminImportRouter from "./admin/import";
import adminUsersRouter from "./admin/users";
import adminUploadsRouter from "./admin/uploads";
import adminCouponsRouter from "./admin/coupons";
import adminAnalyticsRouter from "./admin/analytics";
import adminEventsRouter from "./admin/events";
import adminFulfillmentRouter from "./admin/fulfillment";
import adminSettingsRouter, { getSquareAppId } from "./admin/settings";
import adminBakeryOrdersRouter from "./admin/bakery-orders";
import adminPreOrderWindowsRouter from "./admin/pre-order-windows";
import adminCareersRouter from "./admin/careers";
import adminRotatingFlavoursRouter from "./admin/rotating-flavours";
import adminWholesaleRouter from "./admin/wholesale";
import adminInquiriesRouter from "./admin/inquiries";
import adminSentEmailsRouter from "./admin/sent-emails";
import storeRouter from "./store/index";
import webhooksRouter from "./webhooks";
import publicEventsRouter from "./public-events";
import bakeryOrdersRouter from "./bakery-orders";
import customerAuthRouter from "./customer-auth";
import wholesalePortalRouter from "./wholesale-portal";
import driverRouter from "./driver";
import giftCardsRouter from "./gift-cards";
import { requireAuth, requireAdmin, requireAdminOrManager } from "../middlewares/auth";
import { requireStoreAccess } from "../middlewares/store-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publicRouter);
router.use(publicEventsRouter);
router.use("/bakery-orders", bakeryOrdersRouter);
router.use("/customer", customerAuthRouter);
router.use("/customer/wholesale", wholesalePortalRouter);
router.use("/driver", driverRouter);
router.use("/gift-cards", giftCardsRouter);
router.use("/webhooks", webhooksRouter);

// Public endpoint for Square app ID (needed by payment form)
router.get("/square/app-id", getSquareAppId);

// Admin routes (auth required) — blocked for staff role (they use /api/store)
router.use("/admin/flavours", requireAuth, requireAdminOrManager, adminFlavoursRouter);
router.use("/admin/sizes", requireAuth, requireAdminOrManager, adminSizesRouter);
router.use("/admin/products", requireAuth, requireAdminOrManager, adminProductsRouter);
router.use("/admin/locations", requireAuth, requireAdminOrManager, adminLocationsRouter);
router.use("/admin/orders", requireAuth, requireAdminOrManager, adminOrdersRouter);
router.use("/admin/customers", requireAuth, requireAdminOrManager, adminCustomersRouter);
router.use("/admin/import", requireAuth, requireAdmin, adminImportRouter);
router.use("/admin/users", requireAuth, requireAdmin, adminUsersRouter);
router.use("/admin/uploads", requireAuth, requireAdminOrManager, adminUploadsRouter);
router.use("/admin/coupons", requireAuth, requireAdminOrManager, adminCouponsRouter);
router.use("/admin/analytics", requireAuth, requireAdminOrManager, adminAnalyticsRouter);
router.use("/admin/events", requireAuth, requireAdminOrManager, adminEventsRouter);
router.use("/admin/fulfillment", requireAuth, requireAdminOrManager, adminFulfillmentRouter);
router.use("/admin/settings", requireAuth, requireAdmin, adminSettingsRouter);
router.use("/admin/bakery-orders", requireAuth, requireAdminOrManager, adminBakeryOrdersRouter);
router.use("/admin/pre-order-windows", requireAuth, requireAdminOrManager, adminPreOrderWindowsRouter);
router.use("/admin/careers", requireAuth, requireAdminOrManager, adminCareersRouter);
router.use("/admin/rotating-flavours", requireAuth, requireAdminOrManager, adminRotatingFlavoursRouter);
router.use("/admin/wholesale", requireAuth, requireAdminOrManager, adminWholesaleRouter);
router.use("/admin/inquiries", requireAuth, requireAdminOrManager, adminInquiriesRouter);
router.use("/admin/sent-emails", requireAuth, requireAdminOrManager, adminSentEmailsRouter);

// Store portal routes (location-scoped auth)
router.use("/store", requireStoreAccess, storeRouter);

export default router;
