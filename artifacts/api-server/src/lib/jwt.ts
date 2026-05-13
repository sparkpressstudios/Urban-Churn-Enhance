import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface JwtPayload {
    userId: number;
    username?: string;
    email?: string;
    role?: string;
    type?: "admin" | "customer";
    assignedLocationId?: number | null;
}

export function signToken(payload: JwtPayload, expiresIn: jwt.SignOptions["expiresIn"] = "24h"): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    } catch {
        return null;
    }
}
