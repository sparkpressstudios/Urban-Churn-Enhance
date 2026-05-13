import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.customer_token;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : cookieToken;

    if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    const payload = verifyToken(token);
    if (!payload || payload.type !== "customer") {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }

    req.customer = payload;
    next();
}
