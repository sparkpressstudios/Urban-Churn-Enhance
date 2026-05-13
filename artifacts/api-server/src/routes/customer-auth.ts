import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { customersTable, bakeryOrdersTable, wholesaleCustomersTable, eventOrdersTable, eventTicketsTable, eventsTable, ordersTable, orderItemsTable, locationsTable, wooOrderHistoryTable } from "@workspace/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { requireCustomer } from "../middlewares/customer-auth";
import { sendCustomerPasswordReset, sendWelcomeEmail } from "../lib/email";
import { getOrCreateSquareCustomer, getSquareLoyaltyProgram, getOrCreateLoyaltyAccount } from "../lib/square";

const router: IRouter = Router();

// ── Register ──
router.post("/register", async (req, res) => {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if customer record already exists (e.g. from WooCommerce import or past order)
    const [existing] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.email, normalizedEmail))
        .limit(1);

    if (existing?.hasAccount && existing?.passwordHash) {
        res.status(409).json({ error: "An account with this email already exists. Try logging in or use Forgot Password to reset your password." });
        return;
    }

    const passwordHash = await hashPassword(password);

    let customer;
    if (existing) {
        // Upgrade existing record to full account
        [customer] = await db
            .update(customersTable)
            .set({
                passwordHash,
                hasAccount: true,
                firstName: firstName || existing.firstName,
                lastName: lastName || existing.lastName,
                phone: phone || existing.phone,
                updatedAt: new Date(),
            })
            .where(eq(customersTable.id, existing.id))
            .returning();
    } else {
        // Create new customer
        [customer] = await db
            .insert(customersTable)
            .values({
                email: normalizedEmail,
                passwordHash,
                hasAccount: true,
                firstName: firstName || "",
                lastName: lastName || "",
                phone: phone || "",
            })
            .returning();
    }

    const token = signToken(
        { userId: customer.id, email: customer.email, type: "customer" },
        "7d",
    );

    res.cookie("customer_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send welcome email (fire and forget)
    sendWelcomeEmail({
        customerName: customer.firstName || normalizedEmail,
        customerEmail: customer.email,
    }).catch((e) => console.error("[EMAIL] Welcome email failed:", e));

    // Sync customer to Square (fire and forget)
    getOrCreateSquareCustomer(
        normalizedEmail,
        customer.firstName || "",
        customer.lastName || "",
        customer.phone || undefined,
    ).then((sqCustId) => {
        if (sqCustId) {
            db.update(customersTable)
                .set({ squareCustomerId: sqCustId, updatedAt: new Date() })
                .where(eq(customersTable.id, customer.id))
                .catch((e) => console.error("[SQUARE] Failed to save squareCustomerId:", e));
        }
    }).catch((e) => console.error("[SQUARE] Customer sync on register failed:", e));

    res.status(201).json({
        token,
        customer: {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            wooCustomerId: customer.wooCustomerId,
        },
    });
});

// ── Login ──
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [customer] = await db
        .select()
        .from(customersTable)
        .where(
            and(
                eq(customersTable.email, normalizedEmail),
                eq(customersTable.hasAccount, true),
            ),
        )
        .limit(1);

    if (!customer) {
        res.status(401).json({ error: "No account found with this email.", code: "NO_ACCOUNT" });
        return;
    }

    if (!customer.passwordHash) {
        // Migrated from old website — has account flag but no password
        res.status(401).json({
            error: "We found your account from our previous website! You'll need to set a new password to sign in.",
            code: "NEEDS_PASSWORD_RESET",
        });
        return;
    }

    const valid = await verifyPassword(password, customer.passwordHash);
    if (!valid) {
        res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
        return;
    }

    const token = signToken(
        { userId: customer.id, email: customer.email, type: "customer" },
        "7d",
    );

    res.cookie("customer_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
        token,
        customer: {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            wooCustomerId: customer.wooCustomerId,
        },
    });
});

// ── Logout ──
router.post("/logout", (_req, res) => {
    res.clearCookie("customer_token");
    res.json({ success: true });
});

// ── Me ──
router.get("/me", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;

    const [customer] = await db
        .select({
            id: customersTable.id,
            email: customersTable.email,
            firstName: customersTable.firstName,
            lastName: customersTable.lastName,
            phone: customersTable.phone,
            address: customersTable.address,
            city: customersTable.city,
            state: customersTable.state,
            zip: customersTable.zip,
            ordersCount: customersTable.ordersCount,
            totalSpentCents: customersTable.totalSpentCents,
            wholesaleCustomerId: customersTable.wholesaleCustomerId,
            wooCustomerId: customersTable.wooCustomerId,
        })
        .from(customersTable)
        .where(eq(customersTable.id, userId))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    res.json({ customer });
});

// ── Rewards / Loyalty ──
router.get("/rewards", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;

    try {
        const [customer] = await db
            .select({
                id: customersTable.id,
                email: customersTable.email,
                firstName: customersTable.firstName,
                lastName: customersTable.lastName,
                phone: customersTable.phone,
                squareCustomerId: customersTable.squareCustomerId,
            })
            .from(customersTable)
            .where(eq(customersTable.id, userId))
            .limit(1);

        if (!customer) {
            res.status(404).json({ error: "Customer not found" });
            return;
        }

        // Check if a loyalty program exists
        const program = await getSquareLoyaltyProgram();
        if (!program || program.status !== "ACTIVE") {
            res.json({ enrolled: false, reason: "no_program" });
            return;
        }

        // Ensure customer is synced to Square
        let sqCustId = customer.squareCustomerId;
        if (!sqCustId) {
            sqCustId = await getOrCreateSquareCustomer(
                customer.email,
                customer.firstName || "",
                customer.lastName || "",
                customer.phone || undefined,
            );
            if (sqCustId) {
                await db.update(customersTable)
                    .set({ squareCustomerId: sqCustId, updatedAt: new Date() })
                    .where(eq(customersTable.id, customer.id));
            }
        }

        if (!sqCustId) {
            res.json({ enrolled: false, reason: "sync_failed" });
            return;
        }

        // Get or create loyalty account
        const loyaltyAccount = await getOrCreateLoyaltyAccount(sqCustId, program.id, customer.phone || undefined);
        if (!loyaltyAccount) {
            res.json({ enrolled: false, reason: "account_failed" });
            return;
        }

        res.json({
            enrolled: true,
            balance: loyaltyAccount.balance,
            lifetimePoints: loyaltyAccount.lifetimePoints,
            terminology: program.terminology,
            accrualRules: program.accrualRules,
            rewardTiers: program.rewardTiers,
        });
    } catch (e) {
        console.error("[SQUARE] Rewards fetch failed:", e);
        res.json({ enrolled: false, reason: "error" });
    }
});

// ── Update Profile ──
router.put("/profile", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;
    const { firstName, lastName, phone, address, city, state, zip } = req.body;

    const [customer] = await db
        .update(customersTable)
        .set({
            firstName,
            lastName,
            phone,
            address,
            city,
            state,
            zip,
            updatedAt: new Date(),
        })
        .where(eq(customersTable.id, userId))
        .returning({
            id: customersTable.id,
            email: customersTable.email,
            firstName: customersTable.firstName,
            lastName: customersTable.lastName,
            phone: customersTable.phone,
            address: customersTable.address,
            city: customersTable.city,
            state: customersTable.state,
            zip: customersTable.zip,
        });

    res.json({ customer });
});

// ── Order History ──
router.get("/orders", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;

    // Get the customer's email to match orders
    const [customer] = await db
        .select({ email: customersTable.email })
        .from(customersTable)
        .where(eq(customersTable.id, userId))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const orders = await db
        .select({
            id: bakeryOrdersTable.id,
            orderNumber: bakeryOrdersTable.orderNumber,
            customerName: bakeryOrdersTable.customerName,
            customerPhone: bakeryOrdersTable.customerPhone,
            customerEmail: bakeryOrdersTable.customerEmail,
            pickupDate: bakeryOrdersTable.pickupDate,
            pickupTime: bakeryOrdersTable.pickupTime,
            orderType: bakeryOrdersTable.orderType,
            orderDetails: bakeryOrdersTable.orderDetails,
            addOns: bakeryOrdersTable.addOns,
            specialRequests: bakeryOrdersTable.specialRequests,
            inspirationPhotoUrl: bakeryOrdersTable.inspirationPhotoUrl,
            totalPriceCents: bakeryOrdersTable.totalPriceCents,
            status: bakeryOrdersTable.status,
            adminNotes: bakeryOrdersTable.adminNotes,
            createdAt: bakeryOrdersTable.createdAt,
            updatedAt: bakeryOrdersTable.updatedAt,
            locationName: locationsTable.name,
        })
        .from(bakeryOrdersTable)
        .leftJoin(locationsTable, eq(bakeryOrdersTable.locationId, locationsTable.id))
        .where(eq(bakeryOrdersTable.customerEmail, customer.email))
        .orderBy(desc(bakeryOrdersTable.createdAt))
        .limit(50);

    res.json(orders);
});

// ── Event Orders ──
router.get("/event-orders", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;

    const [customer] = await db
        .select({ email: customersTable.email })
        .from(customersTable)
        .where(eq(customersTable.id, userId))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const orders = await db
        .select({
            id: eventOrdersTable.id,
            orderNumber: eventOrdersTable.orderNumber,
            status: eventOrdersTable.status,
            totalCents: eventOrdersTable.totalCents,
            createdAt: eventOrdersTable.createdAt,
            eventTitle: eventsTable.title,
            eventDate: eventsTable.eventDate,
            eventSlug: eventsTable.slug,
            venueName: eventsTable.venueName,
            ticketCount: sql<number>`(select count(*) from event_tickets where event_order_id = ${eventOrdersTable.id})::int`,
        })
        .from(eventOrdersTable)
        .innerJoin(eventsTable, eq(eventOrdersTable.eventId, eventsTable.id))
        .where(eq(eventOrdersTable.customerEmail, customer.email))
        .orderBy(desc(eventOrdersTable.createdAt))
        .limit(50);

    // Fetch tickets for all orders
    const orderIds = orders.map((o) => o.id);
    const allTickets = orderIds.length > 0
        ? await db
            .select({
                id: eventTicketsTable.id,
                eventOrderId: eventTicketsTable.eventOrderId,
                ticketCode: eventTicketsTable.ticketCode,
                attendeeName: eventTicketsTable.attendeeName,
                status: eventTicketsTable.status,
                checkedIn: eventTicketsTable.checkedIn,
            })
            .from(eventTicketsTable)
            .where(inArray(eventTicketsTable.eventOrderId, orderIds))
        : [];

    const ticketsByOrderId = new Map<number, typeof allTickets>();
    for (const t of allTickets) {
        const list = ticketsByOrderId.get(t.eventOrderId) ?? [];
        list.push(t);
        ticketsByOrderId.set(t.eventOrderId, list);
    }

    const ordersWithTickets = orders.map((o) => ({
        ...o,
        tickets: ticketsByOrderId.get(o.id) ?? [],
    }));

    res.json(ordersWithTickets);
});

// ── Ice Cream Orders (Pre-Orders / Scoop Shop) ──
router.get("/ice-cream-orders", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;

    const [customer] = await db
        .select({ email: customersTable.email })
        .from(customersTable)
        .where(eq(customersTable.id, userId))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const orders = await db
        .select({
            id: ordersTable.id,
            orderNumber: ordersTable.orderNumber,
            status: ordersTable.status,
            totalCents: ordersTable.totalCents,
            discountCents: ordersTable.discountCents,
            notes: ordersTable.notes,
            createdAt: ordersTable.createdAt,
            locationName: locationsTable.name,
        })
        .from(ordersTable)
        .innerJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(eq(ordersTable.customerEmail, customer.email))
        .orderBy(desc(ordersTable.createdAt))
        .limit(50);

    // Fetch items for all orders
    const orderIds = orders.map((o) => o.id);
    const items =
        orderIds.length > 0
            ? await db
                .select()
                .from(orderItemsTable)
                .where(sql`${orderItemsTable.orderId} in ${orderIds}`)
            : [];

    const itemsByOrder = new Map<number, typeof items>();
    for (const item of items) {
        const list = itemsByOrder.get(item.orderId) || [];
        list.push(item);
        itemsByOrder.set(item.orderId, list);
    }

    res.json(
        orders.map((o) => ({
            ...o,
            items: itemsByOrder.get(o.id) || [],
        })),
    );
});

// ── WooCommerce Order History (legacy orders from old site) ──
router.get("/woo-orders", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;

    const [customer] = await db
        .select({ email: customersTable.email })
        .from(customersTable)
        .where(eq(customersTable.id, userId))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const orders = await db
        .select()
        .from(wooOrderHistoryTable)
        .where(eq(wooOrderHistoryTable.customerEmail, customer.email))
        .orderBy(desc(wooOrderHistoryTable.orderDate))
        .limit(100);

    res.json(orders);
});

// ── Check Email (for checkout pre-detection) ──
router.post("/check-email", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        res.json({ hasAccount: false });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [customer] = await db
        .select({
            hasAccount: customersTable.hasAccount,
            passwordHash: customersTable.passwordHash,
        })
        .from(customersTable)
        .where(eq(customersTable.email, normalizedEmail))
        .limit(1);

    if (!customer) {
        // Don't reveal that the email doesn't exist
        res.json({ hasAccount: false });
        return;
    }

    // Migrated user: has account flag from WooCommerce but no password set
    if (customer.hasAccount && !customer.passwordHash) {
        res.json({ hasAccount: true, needsPasswordReset: true });
        return;
    }

    res.json({ hasAccount: customer.hasAccount });
});

// ── Forgot Password ──
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [customer] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.email, normalizedEmail))
        .limit(1);

    // Always return success to prevent email enumeration
    if (!customer) {
        res.json({ success: true });
        return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
        .update(customersTable)
        .set({ resetToken, resetTokenExpiresAt, updatedAt: new Date() })
        .where(eq(customersTable.id, customer.id));

    // Send reset email
    const baseUrl = process.env.PUBLIC_URL || "https://urbanchurn.com";
    const resetUrl = `${baseUrl}/account/reset-password?token=${resetToken}`;

    sendCustomerPasswordReset({
        customerEmail: normalizedEmail,
        customerName: customer.firstName || "Customer",
        resetUrl,
    }).catch((e) => console.error("[EMAIL] Password reset failed:", e));

    res.json({ success: true });
});

// ── Reset Password ──
router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        res.status(400).json({ error: "Token and password are required" });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
    }

    const [customer] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.resetToken, token))
        .limit(1);

    if (
        !customer ||
        !customer.resetTokenExpiresAt ||
        customer.resetTokenExpiresAt < new Date()
    ) {
        res.status(400).json({ error: "Invalid or expired reset link" });
        return;
    }

    const passwordHash = await hashPassword(password);

    await db
        .update(customersTable)
        .set({
            passwordHash,
            hasAccount: true,
            resetToken: null,
            resetTokenExpiresAt: null,
            updatedAt: new Date(),
        })
        .where(eq(customersTable.id, customer.id));

    // Return a JWT so the user is auto-logged-in after reset
    const authToken = signToken(
        { userId: customer.id, email: customer.email, type: "customer" },
        "7d",
    );

    res.cookie("customer_token", authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
        success: true,
        token: authToken,
        customer: {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            wooCustomerId: customer.wooCustomerId,
        },
    });
});

// ── Change Password (authenticated) ──
router.put("/password", requireCustomer, async (req, res) => {
    const { userId } = req.customer!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current password and new password are required" });
        return;
    }
    if (newPassword.length < 8) {
        res.status(400).json({ error: "New password must be at least 8 characters" });
        return;
    }

    const [customer] = await db
        .select({ passwordHash: customersTable.passwordHash })
        .from(customersTable)
        .where(eq(customersTable.id, userId))
        .limit(1);

    if (!customer || !customer.passwordHash) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const valid = await verifyPassword(currentPassword, customer.passwordHash);
    if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
    }

    const passwordHash = await hashPassword(newPassword);

    await db
        .update(customersTable)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(customersTable.id, userId));

    res.json({ success: true });
});

// ── Register Wholesale (invite-based) ──
router.post("/register-wholesale", async (req, res) => {
    const { email, password, firstName, lastName, phone, inviteToken } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find wholesale customer by invite token or by email
    let wholesaleCustomer;

    if (inviteToken) {
        const [wc] = await db
            .select()
            .from(wholesaleCustomersTable)
            .where(eq(wholesaleCustomersTable.inviteToken, inviteToken))
            .limit(1);

        if (!wc || (wc.inviteTokenExpiresAt && wc.inviteTokenExpiresAt < new Date())) {
            res.status(400).json({ error: "Invalid or expired invite link" });
            return;
        }
        wholesaleCustomer = wc;
    } else {
        // Self-registration: match by email
        const [wc] = await db
            .select()
            .from(wholesaleCustomersTable)
            .where(eq(wholesaleCustomersTable.email, normalizedEmail))
            .limit(1);

        wholesaleCustomer = wc || null;
    }

    // Check if customer record already exists
    const [existing] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.email, normalizedEmail))
        .limit(1);

    if (existing?.hasAccount) {
        // If they already have an account, just link the wholesale customer if needed
        if (wholesaleCustomer && !existing.wholesaleCustomerId) {
            await db
                .update(customersTable)
                .set({ wholesaleCustomerId: wholesaleCustomer.id, updatedAt: new Date() })
                .where(eq(customersTable.id, existing.id));
        }

        // Clear invite token
        if (wholesaleCustomer && inviteToken) {
            await db
                .update(wholesaleCustomersTable)
                .set({ inviteToken: null, inviteTokenExpiresAt: null, status: "active", updatedAt: new Date() })
                .where(eq(wholesaleCustomersTable.id, wholesaleCustomer.id));
        }

        res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
        return;
    }

    const passwordHash = await hashPassword(password);

    let customer;
    if (existing) {
        [customer] = await db
            .update(customersTable)
            .set({
                passwordHash,
                hasAccount: true,
                firstName: firstName || existing.firstName,
                lastName: lastName || existing.lastName,
                phone: phone || existing.phone,
                wholesaleCustomerId: wholesaleCustomer?.id || null,
                updatedAt: new Date(),
            })
            .where(eq(customersTable.id, existing.id))
            .returning();
    } else {
        [customer] = await db
            .insert(customersTable)
            .values({
                email: normalizedEmail,
                passwordHash,
                hasAccount: true,
                firstName: firstName || "",
                lastName: lastName || "",
                phone: phone || "",
                wholesaleCustomerId: wholesaleCustomer?.id || null,
            })
            .returning();
    }

    // If invite token was used, clear it and activate the wholesale customer
    if (wholesaleCustomer && inviteToken) {
        await db
            .update(wholesaleCustomersTable)
            .set({ inviteToken: null, inviteTokenExpiresAt: null, status: "active", updatedAt: new Date() })
            .where(eq(wholesaleCustomersTable.id, wholesaleCustomer.id));
    }

    // If no wholesale customer existed, create one as pending
    if (!wholesaleCustomer) {
        const [newWc] = await db
            .insert(wholesaleCustomersTable)
            .values({
                businessName: `${firstName || ""} ${lastName || ""}`.trim() || normalizedEmail,
                contactName: `${firstName || ""} ${lastName || ""}`.trim(),
                email: normalizedEmail,
                phone: phone || "",
                status: "pending",
            })
            .returning();

        await db
            .update(customersTable)
            .set({ wholesaleCustomerId: newWc.id, updatedAt: new Date() })
            .where(eq(customersTable.id, customer.id));
    }

    const token = signToken(
        { userId: customer.id, email: customer.email, type: "customer" },
        "7d",
    );

    res.cookie("customer_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
        token,
        customer: {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            wholesaleCustomerId: customer.wholesaleCustomerId,
        },
    });
});

export default router;
