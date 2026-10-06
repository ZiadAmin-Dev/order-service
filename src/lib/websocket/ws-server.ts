import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { authenticateWebSocket, AuthenticatedWebSocketContext } from "./ws-auth";
import { logger } from "../logger/logger";

interface ExtendedWebSocket extends WebSocket {
    isAlive?: boolean;
    authContext?: AuthenticatedWebSocketContext;
}

export class WebSocketGateway {
    private wss: WebSocketServer | null = null;
    private rooms = new Map<string, Set<ExtendedWebSocket>>();

    attach(server: HttpServer): void {
        this.wss = new WebSocketServer({ server, path: "/ws" });

        this.wss.on("connection", (ws: ExtendedWebSocket, req) => {
            const auth = authenticateWebSocket(req);
            if (!auth) {
                ws.close(4001, "Unauthorized");
                return;
            }

            ws.isAlive = true;
            ws.authContext = auth;

            // Subscribe to authorized rooms
            for (const room of auth.authorizedRooms) {
                this.joinRoom(room, ws);
            }

            ws.on("pong", () => {
                ws.isAlive = true;
            });

            ws.on("close", () => {
                for (const room of auth.authorizedRooms) {
                    this.leaveRoom(room, ws);
                }
            });
        });

        // Heartbeat interval
        const interval = setInterval(() => {
            if (!this.wss) return;
            this.wss.clients.forEach((ws: any) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);

        this.wss.on("close", () => {
            clearInterval(interval);
        });
    }

    private joinRoom(room: string, ws: ExtendedWebSocket): void {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room)!.add(ws);
    }

    private leaveRoom(room: string, ws: ExtendedWebSocket): void {
        const set = this.rooms.get(room);
        if (set) {
            set.delete(ws);
            if (set.size === 0) this.rooms.delete(room);
        }
    }

    broadcast(room: string, event: string, payload: any): void {
        const subscribers = this.rooms.get(room);
        if (!subscribers || subscribers.size === 0) return;

        const message = JSON.stringify({ event, data: payload, timestamp: Date.now() });

        for (const ws of subscribers) {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(message);
                } catch (err) {
                    logger.error("Failed to emit WebSocket message:", { error: (err as Error).message });
                }
            }
        }
    }
}

export const wsGateway = new WebSocketGateway();
