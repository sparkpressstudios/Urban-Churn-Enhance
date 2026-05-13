import { type Request, type Response, type NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : cookieToken;

    if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }

    req.user = payload;
    next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
}

/**
 * Block staff-role tokens from hitting /api/admin/* — staff have the /api/store portal.
 * Admins and managers are allowed through.
 */
export function requireAdminOrManager(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user || !user.role || !["admin", "manager"].includes(user.role)) {
        res.status(403).json({ error: "Admin or manager access required" });
        return;
    }
    next();
}
