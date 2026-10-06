import { Knex } from "knex";
import { AgentPresence, AgentEarning } from "../entity/agent.entity";

export const AGENT_PRESENCE_COLUMNS = [
    "agent_id",
    "region",
    "is_available",
    "last_lat",
    "last_lng",
    "last_seen_at",
    "updated_at",
];

export const AGENT_EARNINGS_COLUMNS = [
    "id",
    "region",
    "agent_id",
    "order_id",
    "amount",
    "currency",
    "created_at",
];

function toPresenceEntity(row: any): AgentPresence {
    return new AgentPresence({
        agentId: Number(row.agent_id),
        region: row.region,
        isAvailable: Boolean(row.is_available),
        lastLat: row.last_lat ? Number(row.last_lat) : undefined,
        lastLng: row.last_lng ? Number(row.last_lng) : undefined,
        lastSeenAt: new Date(row.last_seen_at),
        updatedAt: new Date(row.updated_at),
    });
}

function toEarningEntity(row: any): AgentEarning {
    return new AgentEarning({
        id: Number(row.id),
        region: row.region,
        agentId: Number(row.agent_id),
        orderId: Number(row.order_id),
        amount: Number(row.amount),
        currency: row.currency,
        createdAt: new Date(row.created_at),
    });
}

export async function upsertAgentPresence(
    data: Partial<AgentPresence>,
    conn: Knex
): Promise<AgentPresence> {
    const [row] = await conn.raw(
        `
        INSERT INTO agent_presence (agent_id, region, is_available, last_lat, last_lng, last_seen_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON CONFLICT (agent_id) DO UPDATE
        SET is_available = EXCLUDED.is_available,
            last_lat = COALESCE(EXCLUDED.last_lat, agent_presence.last_lat),
            last_lng = COALESCE(EXCLUDED.last_lng, agent_presence.last_lng),
            last_seen_at = NOW(),
            updated_at = NOW()
        RETURNING ${AGENT_PRESENCE_COLUMNS.join(", ")};
        `,
        [
            data.agentId ?? 0,
            data.region ?? "",
            Boolean(data.isAvailable),
            data.lastLat ?? null,
            data.lastLng ?? null,
        ]
    ).then((res) => res.rows);

    return toPresenceEntity(row);
}

export async function findAgentPresence(
    agentId: number,
    conn: Knex
): Promise<AgentPresence | undefined> {
    const row = await conn("agent_presence").select(AGENT_PRESENCE_COLUMNS).where("agent_id", agentId).first();
    return row ? toPresenceEntity(row) : undefined;
}

export async function findAgentEarnings(
    agentId: number,
    limit: number = 20,
    conn: Knex
): Promise<AgentEarning[]> {
    const rows = await conn("agent_earnings")
        .select(AGENT_EARNINGS_COLUMNS)
        .where("agent_id", agentId)
        .orderBy("created_at", "desc")
        .limit(limit);
    return rows.map(toEarningEntity);
}

export async function getAgentEarningsSummary(
    agentId: number,
    conn: Knex
): Promise<{ totalEarned: number; deliveryCount: number }> {
    const row = await conn("agent_earnings")
        .where("agent_id", agentId)
        .sum({ total: "amount" })
        .count({ count: "*" })
        .first();

    return {
        totalEarned: Number(row?.total || 0),
        deliveryCount: Number(row?.count || 0),
    };
}
