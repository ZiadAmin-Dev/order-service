import { AgentPresence, AgentEarning } from "../entity/agent.entity";

export class AgentPresenceResponseDTO {
    agentId!: number;
    isAvailable!: boolean;
    lastSeenAt!: string;

    static from(presence: AgentPresence): AgentPresenceResponseDTO {
        const dto = new AgentPresenceResponseDTO();
        dto.agentId = Number(presence.agentId);
        dto.isAvailable = Boolean(presence.isAvailable);
        dto.lastSeenAt = (presence.lastSeenAt || new Date()).toISOString();
        return dto;
    }
}

export class AgentEarningItemResponseDTO {
    id!: number;
    orderId!: number;
    amount!: number; // minor units
    currency!: string;
    createdAt!: string;

    static from(item: AgentEarning): AgentEarningItemResponseDTO {
        const dto = new AgentEarningItemResponseDTO();
        dto.id = Number(item.id);
        dto.orderId = Number(item.orderId);
        dto.amount = Number(item.amount);
        dto.currency = item.currency;
        dto.createdAt = (item.createdAt || new Date()).toISOString();
        return dto;
    }
}

export class AgentEarningsSummaryResponseDTO {
    totalEarned!: number; // minor units
    deliveryCount!: number;
    currency!: string;
    recentEarnings!: AgentEarningItemResponseDTO[];

    static from(
        totalEarned: number,
        deliveryCount: number,
        currency: string,
        recent: AgentEarning[]
    ): AgentEarningsSummaryResponseDTO {
        const dto = new AgentEarningsSummaryResponseDTO();
        dto.totalEarned = totalEarned;
        dto.deliveryCount = deliveryCount;
        dto.currency = currency;
        dto.recentEarnings = recent.map(AgentEarningItemResponseDTO.from);
        return dto;
    }
}
