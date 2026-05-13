import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
    }

    const [user] = await db
        .select()
        .from(adminUsersTable)
        .where(eq(adminUsersTable.username, username))
        .limit(1);

    if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

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

export default router;
