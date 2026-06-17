import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adminUsersTable, locationsTable, adminLoginLogsTable } from "@workspace/db/schema";
import { eq, desc, and, gte, lte, ilike } from "drizzle-orm";
import { hashPassword } from "../../lib/password";
import { sendStaffCredentialsEmail } from "../../lib/email";

const router: IRouter = Router();

function generateTempPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
}

// List admin users (exclude password hash)
router.get("/", async (_req, res) => {
    const users = await db
        .select({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            email: adminUsersTable.email,
            role: adminUsersTable.role,
            assignedLocationId: adminUsersTable.assignedLocationId,
            mustChangePassword: adminUsersTable.mustChangePassword,
            lastLoginAt: adminUsersTable.lastLoginAt,
            lastFailedLoginAt: adminUsersTable.lastFailedLoginAt,
            createdAt: adminUsersTable.createdAt,
        })
        .from(adminUsersTable)
        .orderBy(desc(adminUsersTable.createdAt));
    res.json(users);
});

// List staff assigned to a specific location (used by Locations page)
router.get("/by-location/:locationId", async (req, res) => {
    const locationId = Number(req.params.locationId);
    const users = await db
        .select({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            email: adminUsersTable.email,
            role: adminUsersTable.role,
            createdAt: adminUsersTable.createdAt,
        })
        .from(adminUsersTable)
        .where(eq(adminUsersTable.assignedLocationId, locationId))
        .orderBy(desc(adminUsersTable.createdAt));
    res.json(users);
});

// Login audit log (must be registered before /:id)
router.get("/login-logs", async (req, res) => {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const username = (req.query.username as string | undefined)?.trim();
    const success = req.query.success as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

    const conditions = [];
    if (userId) conditions.push(eq(adminLoginLogsTable.adminUserId, userId));
    if (username) conditions.push(ilike(adminLoginLogsTable.usernameAttempted, `%${username}%`));
    if (success === "true") conditions.push(eq(adminLoginLogsTable.success, true));
    if (success === "false") conditions.push(eq(adminLoginLogsTable.success, false));
    if (from) conditions.push(gte(adminLoginLogsTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(adminLoginLogsTable.createdAt, new Date(to)));

    const logs = await db
        .select({
            id: adminLoginLogsTable.id,
            adminUserId: adminLoginLogsTable.adminUserId,
            usernameAttempted: adminLoginLogsTable.usernameAttempted,
            success: adminLoginLogsTable.success,
            failureReason: adminLoginLogsTable.failureReason,
            ipAddress: adminLoginLogsTable.ipAddress,
            userAgent: adminLoginLogsTable.userAgent,
            createdAt: adminLoginLogsTable.createdAt,
        })
        .from(adminLoginLogsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(adminLoginLogsTable.createdAt))
        .limit(limit);

    res.json(logs);
});

// Get single user
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [user] = await db
        .select({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            email: adminUsersTable.email,
            role: adminUsersTable.role,
            assignedLocationId: adminUsersTable.assignedLocationId,
            mustChangePassword: adminUsersTable.mustChangePassword,
            lastLoginAt: adminUsersTable.lastLoginAt,
            lastFailedLoginAt: adminUsersTable.lastFailedLoginAt,
            createdAt: adminUsersTable.createdAt,
        })
        .from(adminUsersTable)
        .where(eq(adminUsersTable.id, id))
        .limit(1);

    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json(user);
});

// Create admin user
router.post("/", async (req, res) => {
    const { username, password, email, role, assignedLocationId, sendEmail } = req.body;

    if (!username) {
        res.status(400).json({ error: "Username is required" });
        return;
    }

    const resolvedRole = role || "staff";

    if (resolvedRole === "staff" && !assignedLocationId) {
        res.status(400).json({
            error: "Staff users must have an assigned location. Without one they cannot access the store portal.",
        });
        return;
    }

    if (sendEmail && !email) {
        res.status(400).json({ error: "Email is required to send credentials" });
        return;
    }

    const plainPassword = password || generateTempPassword();
    if (plainPassword.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
    }

    const passwordHash = await hashPassword(plainPassword);

    const [user] = await db
        .insert(adminUsersTable)
        .values({
            username,
            email: email || null,
            passwordHash,
            role: resolvedRole,
            assignedLocationId: assignedLocationId ?? null,
            mustChangePassword: true,
        })
        .returning({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            email: adminUsersTable.email,
            role: adminUsersTable.role,
            assignedLocationId: adminUsersTable.assignedLocationId,
            mustChangePassword: adminUsersTable.mustChangePassword,
            lastLoginAt: adminUsersTable.lastLoginAt,
            lastFailedLoginAt: adminUsersTable.lastFailedLoginAt,
            createdAt: adminUsersTable.createdAt,
        });

    let emailSent = false;
    if (sendEmail && email) {
        let locationName: string | null = null;
        if (user.assignedLocationId) {
            const [loc] = await db
                .select({ name: locationsTable.name })
                .from(locationsTable)
                .where(eq(locationsTable.id, user.assignedLocationId))
                .limit(1);
            locationName = loc?.name ?? null;
        }
        const result = await sendStaffCredentialsEmail({
            email,
            username: user.username,
            password: plainPassword,
            role: user.role,
            locationName,
        });
        emailSent = !!result;
    }

    res.status(201).json({
        ...user,
        tempPassword: plainPassword,
        emailSent,
    });
});

// Update admin user
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { username, password, email, role, assignedLocationId } = req.body;

    if (role === "staff" && (assignedLocationId === null || assignedLocationId === "")) {
        res.status(400).json({
            error: "Staff users must have an assigned location.",
        });
        return;
    }

    const updateData: Record<string, any> = {};
    if (username) updateData.username = username;
    if (email !== undefined) updateData.email = email || null;
    if (role) updateData.role = role;
    if (password) {
        updateData.passwordHash = await hashPassword(password);
        updateData.mustChangePassword = false;
    }
    if (assignedLocationId !== undefined) updateData.assignedLocationId = assignedLocationId || null;

    const [user] = await db
        .update(adminUsersTable)
        .set(updateData)
        .where(eq(adminUsersTable.id, id))
        .returning({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            email: adminUsersTable.email,
            role: adminUsersTable.role,
            assignedLocationId: adminUsersTable.assignedLocationId,
            mustChangePassword: adminUsersTable.mustChangePassword,
            lastLoginAt: adminUsersTable.lastLoginAt,
            lastFailedLoginAt: adminUsersTable.lastFailedLoginAt,
            createdAt: adminUsersTable.createdAt,
        });

    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json(user);
});

// Resend credentials (generates a new temporary password and emails it)
router.post("/:id/send-credentials", async (req, res) => {
    const id = Number(req.params.id);

    const [user] = await db
        .select()
        .from(adminUsersTable)
        .where(eq(adminUsersTable.id, id))
        .limit(1);

    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    if (!user.email) {
        res.status(400).json({ error: "User has no email on file. Add one first." });
        return;
    }

    const plainPassword = generateTempPassword();
    const passwordHash = await hashPassword(plainPassword);

    await db
        .update(adminUsersTable)
        .set({ passwordHash, mustChangePassword: true })
        .where(eq(adminUsersTable.id, id));

    let locationName: string | null = null;
    if (user.assignedLocationId) {
        const [loc] = await db
            .select({ name: locationsTable.name })
            .from(locationsTable)
            .where(eq(locationsTable.id, user.assignedLocationId))
            .limit(1);
        locationName = loc?.name ?? null;
    }

    const result = await sendStaffCredentialsEmail({
        email: user.email,
        username: user.username,
        password: plainPassword,
        role: user.role,
        locationName,
    });

    res.json({ emailSent: !!result, tempPassword: plainPassword });
});

// Delete admin user
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const currentUser = req.user;
    if (currentUser?.userId === id) {
        res.status(400).json({ error: "Cannot delete your own account" });
        return;
    }

    const [deleted] = await db
        .delete(adminUsersTable)
        .where(eq(adminUsersTable.id, id))
        .returning({ id: adminUsersTable.id });

    if (!deleted) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json({ success: true });
});

export default router;
