export class AgentPresence {
    agentId: number;
    region: string;
    isAvailable: boolean;
    lastLat?: number;
    lastLng?: number;
    lastSeenAt: Date;
    updatedAt: Date;

    constructor(data: Partial<AgentPresence>) {
        this.agentId = data.agentId!;
        this.region = data.region!;
        this.isAvailable = data.isAvailable ?? false;
        this.lastLat = data.lastLat;
        this.lastLng = data.lastLng;
        this.lastSeenAt = data.lastSeenAt ?? new Date();
        this.updatedAt = data.updatedAt ?? new Date();
    }
}

export class AgentEarning {
    id: number;
    region: string;
    agentId: number;
    orderId: number;
    amount: number; // minor units
    currency: string;
    createdAt: Date;

    constructor(data: Partial<AgentEarning>) {
        this.id = data.id!;
        this.region = data.region!;
        this.agentId = data.agentId!;
        this.orderId = data.orderId!;
        this.amount = data.amount!;
        this.currency = data.currency!;
        this.createdAt = data.createdAt ?? new Date();
    }
}
