import type { Request } from "express";
import { db } from "@workspace/db";
import { adminUsersTable, adminLoginLogsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export type AdminLoginFailureReason =
    | "missing_credentials"
    | "user_not_found"
    | "invalid_password";

function getClientIp(req: Request): string | null {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0]?.trim() || null;
    }
    return req.ip || null;
}

export async function recordAdminLoginAttempt(
    req: Request,
    input: {
        usernameAttempted: string;
        adminUserId?: number | null;
        success: boolean;
        failureReason?: AdminLoginFailureReason;
    },
): Promise<void> {
    const now = new Date();
    const usernameAttempted = input.usernameAttempted.trim();

    try {
        await db.insert(adminLoginLogsTable).values({
            adminUserId: input.adminUserId ?? null,
            usernameAttempted,
            success: input.success,
            failureReason: input.success ? null : input.failureReason ?? null,
            ipAddress: getClientIp(req),
            userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
        });

        if (input.adminUserId) {
            await db
                .update(adminUsersTable)
                .set(
                    input.success
                        ? { lastLoginAt: now, lastFailedLoginAt: null }
                        : { lastFailedLoginAt: now },
                )
                .where(eq(adminUsersTable.id, input.adminUserId));
        }
    } catch (e) {
        console.error("[AUTH] Failed to record admin login attempt:", e);
    }
}
