import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

/**
 * Middleware for the store portal. Validates JWT and enforces location scoping.
 * - admin: full access, can filter by any locationId query param
 * - manager: full access, can filter by any locationId query param
 * - staff: locked to their assignedLocationId
 *
 * Attaches req.storeLocationId (number | null). null = all locations.
 */
export function requireStoreAccess(req: Request, res: Response, next: NextFunction) {
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
    if (!payload || payload.type !== "admin") {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }

    const role = payload.role;
    if (!role || !["admin", "manager", "staff"].includes(role)) {
        res.status(403).json({ error: "Store access requires admin, manager, or staff role" });
        return;
    }

    req.user = payload;

    if (role === "staff") {
        // Staff must have an assigned location and are locked to it
        if (!payload.assignedLocationId) {
            res.status(403).json({ error: "Staff account has no assigned location. Contact an admin." });
            return;
        }
        req.storeLocationId = payload.assignedLocationId;
    } else {
        // Admin/manager can optionally filter by locationId query param
        const qLocId = req.query.locationId;
        req.storeLocationId = qLocId ? Number(qLocId) : null;
    }

    next();
}
