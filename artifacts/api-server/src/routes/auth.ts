import { Router, type IRouter } from "express";
import * as crypto from "node:crypto";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { recordAdminLoginAttempt } from "../lib/admin-login-log";
import { sendAdminPasswordReset } from "../lib/email";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const usernameAttempted = typeof username === "string" ? username.trim() : "";

    if (!usernameAttempted || !password) {
        await recordAdminLoginAttempt(req, {
            usernameAttempted: usernameAttempted || "(empty)",
            success: false,
            failureReason: "missing_credentials",
        });
        res.status(400).json({ error: "Username and password are required" });
        return;
    }

    const [user] = await db
        .select()
        .from(adminUsersTable)
        .where(eq(adminUsersTable.username, usernameAttempted))
        .limit(1);

    if (!user) {
        await recordAdminLoginAttempt(req, {
            usernameAttempted,
            success: false,
            failureReason: "user_not_found",
        });
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
        await recordAdminLoginAttempt(req, {
            usernameAttempted,
            adminUserId: user.id,
            success: false,
            failureReason: "invalid_password",
        });
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    await recordAdminLoginAttempt(req, {
        usernameAttempted,
        adminUserId: user.id,
        success: true,
    });

    const token = signToken({ userId: user.id, username: user.username, role: user.role, type: "admin", assignedLocationId: user.assignedLocationId });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, assignedLocationId: user.assignedLocationId } });
});

router.post("/auth/logout", (_req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
    const user = req.user;
    res.json({ user });
});

router.post("/auth/forgot-password", async (req, res) => {
    const identifier = typeof req.body.email === "string"
        ? req.body.email.trim()
        : typeof req.body.username === "string"
            ? req.body.username.trim()
            : "";

    if (!identifier) {
        res.status(400).json({ error: "Email or username is required" });
        return;
    }

    const normalized = identifier.toLowerCase();
    let user: typeof adminUsersTable.$inferSelect | undefined;

    if (identifier.includes("@")) {
        [user] = await db
            .select()
            .from(adminUsersTable)
            .where(sql`lower(${adminUsersTable.email}) = ${normalized}`)
            .limit(1);
    } else {
        [user] = await db
            .select()
            .from(adminUsersTable)
            .where(eq(adminUsersTable.username, identifier))
            .limit(1);
    }

    if (!user?.email) {
        res.json({ success: true });
        return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db
        .update(adminUsersTable)
        .set({ resetToken, resetTokenExpiresAt })
        .where(eq(adminUsersTable.id, user.id));

    const baseUrl = process.env.PUBLIC_URL || process.env.APP_URL || "https://urbanchurn.com";
    const resetUrl = `${baseUrl}/admin/reset-password?token=${resetToken}`;

    sendAdminPasswordReset({
        email: user.email,
        username: user.username,
        resetUrl,
    }).catch((e) => console.error("[EMAIL] Admin password reset failed:", e));

    res.json({ success: true });
});

router.post("/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        res.status(400).json({ error: "Token and password are required" });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
    }

    const [user] = await db
        .select()
        .from(adminUsersTable)
        .where(eq(adminUsersTable.resetToken, token))
        .limit(1);

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
        res.status(400).json({ error: "Invalid or expired reset link" });
        return;
    }

    const passwordHash = await hashPassword(password);

    await db
        .update(adminUsersTable)
        .set({
            passwordHash,
            mustChangePassword: false,
            resetToken: null,
            resetTokenExpiresAt: null,
        })
        .where(eq(adminUsersTable.id, user.id));

    const jwt = signToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        type: "admin",
        assignedLocationId: user.assignedLocationId,
    });

    res.cookie("token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
        success: true,
        token: jwt,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            assignedLocationId: user.assignedLocationId,
        },
    });
});

router.put("/auth/password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current password and new password are required" });
        return;
    }
    if (newPassword.length < 8) {
        res.status(400).json({ error: "New password must be at least 8 characters" });
        return;
    }

    const [user] = await db
        .select()
        .from(adminUsersTable)
        .where(eq(adminUsersTable.id, userId))
        .limit(1);

    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
    }

    const passwordHash = await hashPassword(newPassword);
    await db
        .update(adminUsersTable)
        .set({ passwordHash, mustChangePassword: false, resetToken: null, resetTokenExpiresAt: null })
        .where(eq(adminUsersTable.id, user.id));

    res.json({ success: true });
});

export default router;
