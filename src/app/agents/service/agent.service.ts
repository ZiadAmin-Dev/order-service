import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens";
import { db } from "../../../lib/knex/knex";
import { RedisCacheProvider } from "../../../pkg/cache/redis";
import { UpdatePresenceDTO } from "../dto/agent.request.dto";
import { AgentPresence, AgentEarning } from "../entity/agent.entity";
import {
    upsertAgentPresence,
    findAgentEarnings,
    getAgentEarningsSummary,
} from "../repository/agents.repo";

@injectable()
export class AgentService {
    constructor(
        @inject(TOKENS.CacheProvider) private readonly cacheProvider: RedisCacheProvider
    ) {}

    async updatePresence(
        agentId: number,
        region: string,
        data: UpdatePresenceDTO
    ): Promise<AgentPresence> {
        // 1. Hot Redis update: presence hash + geospatial indexing
        try {
            const redis = this.cacheProvider.getClient();
            const presenceKey = `presence:agent:${agentId}`;

            await redis.hset(presenceKey, {
                isAvailable: data.isAvailable ? "1" : "0",
                lat: data.lat !== undefined ? String(data.lat) : "",
                lng: data.lng !== undefined ? String(data.lng) : "",
                lastSeenAt: Date.now(),
            });
            await redis.expire(presenceKey, 30); // 30s TTL for heartbeat liveness

            const geoKey = `geo:agents:${region}`;
            if (data.isAvailable && data.lat !== undefined && data.lng !== undefined) {
                await redis.geoadd(geoKey, data.lng, data.lat, String(agentId));
            } else {
                await redis.zrem(geoKey, String(agentId));
            }
        } catch (err) {
            console.error("Redis presence update warning:", err);
        }

        // 2. Durable PostgreSQL persistence
        const conn = db(region);
        return upsertAgentPresence(
            {
                agentId,
                region,
                isAvailable: data.isAvailable,
                lastLat: data.lat,
                lastLng: data.lng,
            },
            conn
        );
    }

    async getEarnings(
        agentId: number,
        region: string
    ): Promise<{
        totalEarned: number;
        deliveryCount: number;
        currency: string;
        recent: AgentEarning[];
    }> {
        const conn = db(region);
        const summary = await getAgentEarningsSummary(agentId, conn);
        const recent = await findAgentEarnings(agentId, 20, conn);

        return {
            totalEarned: summary.totalEarned,
            deliveryCount: summary.deliveryCount,
            currency: recent[0]?.currency || "EGP",
            recent,
        };
    }
}
