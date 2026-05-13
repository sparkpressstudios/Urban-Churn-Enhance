interface JwtPayloadShape {
    userId: number;
    username?: string;
    email?: string;
    role?: string;
    type?: "admin" | "customer";
    assignedLocationId?: number | null;
}

declare namespace Express {
    interface Request {
        user?: JwtPayloadShape;
        customer?: JwtPayloadShape;
        /** Set by requireStoreAccess middleware. null = all locations (admin/manager). */
        storeLocationId?: number | null;
    }
}
