declare namespace Express {
    interface Request {
        correlationId?: string;
        region?: string; // The region of the request, if applicable
        user?: {
            userId: number;
            role: string;
            email: string;
            restaurantId?: number;
            restaurantRole?: string;
            branchIds?: number[];
        };
    }
}
