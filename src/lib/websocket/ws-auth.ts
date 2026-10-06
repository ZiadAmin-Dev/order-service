import { IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import { verifyAccessToken, JwtPayload } from "../auth/jwt";

export interface AuthenticatedWebSocketContext {
    user: JwtPayload;
    authorizedRooms: Set<string>;
}

export function authenticateWebSocket(req: IncomingMessage): AuthenticatedWebSocketContext | null {
    try {
        const parsed = parseUrl(req.url || "", true);
        let token = (parsed.query.token as string) || (parsed.query.access_token as string);

        if (!token && req.headers.cookie) {
            const cookies = Object.fromEntries(
                req.headers.cookie.split(";").map((c) => {
                    const [k, ...v] = c.trim().split("=");
                    return [k, v.join("=")];
                })
            );
            token = cookies.access_token;
        }

        if (!token) return null;

        const user = verifyAccessToken(token);
        const authorizedRooms = new Set<string>();

        // Customer room
        authorizedRooms.add(`customer:${user.userId}`);

        // Delivery agent room
        if (user.role === "delivery_agent") {
            authorizedRooms.add(`agent:${user.userId}`);
        }

        // Restaurant & Branch rooms
        if (user.restaurantId) {
            authorizedRooms.add(`restaurant:${user.restaurantId}`);
        }
        if (user.branchIds && Array.isArray(user.branchIds)) {
            for (const bId of user.branchIds) {
                authorizedRooms.add(`branch:${bId}`);
            }
        }

        // Admin room
        if (user.role === "system_admin") {
            authorizedRooms.add("admin:all");
        }

        return { user, authorizedRooms };
    } catch {
        return null;
    }
}
