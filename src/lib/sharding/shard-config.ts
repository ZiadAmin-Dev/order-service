// Sharding environment helpers. Reads per-region DB_*/ARCHIVE_DB_* env keys.
// Only file allowed to read raw process.env for shard credentials, because the
// variable names are dynamic (one group per declared region).

export interface ShardConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
}

export function parseRegions(raw: string): string[] {
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

function readShardConfig(region: string, prefix: "DB" | "ARCHIVE_DB"): ShardConfig {
    // eg, DB
    const hostKey = `${prefix}_${region}_HOST`;
    const portKey = `${prefix}_${region}_PORT`;
    const userKey = `${prefix}_${region}_USERNAME`;
    const passKey = `${prefix}_${region}_PASSWORD`;
    const nameKey = `${prefix}_${region}_NAME`;

    const host = process.env[hostKey];
    const port = process.env[portKey];
    const username = process.env[userKey];
    const password = process.env[passKey];
    const name = process.env[nameKey];

    if (!host || !port || !username || name === undefined) {
        throw new Error(
            `Missing ${prefix} env for region "${region}". Expected: ${hostKey}, ${portKey}, ${userKey}, ${passKey}, ${nameKey}`,
        );
    }

    return {
        host,
        port: Number(port),
        username,
        password: password ?? "",
        name,
    };
}

export function buildShards(regions: string[]): {
    hotShards: Record<string, ShardConfig>;
    archiveShards: Record<string, ShardConfig>;
} {
    const hotShards: Record<string, ShardConfig> = {};
    const archiveShards: Record<string, ShardConfig> = {};
    for (const region of regions) {
        hotShards[region] = readShardConfig(region, "DB");
        archiveShards[region] = readShardConfig(region, "ARCHIVE_DB");
    }
    return {hotShards, archiveShards};
}
