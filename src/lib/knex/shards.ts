import knex, { Knex } from "knex";
import { env } from "../config/env";
import { DEFAULT_REGION } from "../sharding/regions";

const shardInstances = new Map<string, Knex>();
const archiveShardInstances = new Map<string, Knex>();

function createKnexConfig(connectionConfig: {
    host: string;
    port: number;
    username: string;
    password?: string;
    name: string;
}): Knex.Config {
    return {
        client: "pg",
        connection: {
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.username,
            password: connectionConfig.password || "",
            database: connectionConfig.name,
        },
        pool: { min: 2, max: env.db.poolMax },
        migrations: {
            directory: env.db.migrationDirectory,
            extension: env.db.migrationExtension,
        },
    };
}

export function getShard(region: string = DEFAULT_REGION): Knex {
    const reg = region.toLowerCase();
    let instance = shardInstances.get(reg);
    if (!instance) {
        const conf = env.shards[reg as keyof typeof env.shards];
        if (!conf) {
            throw new Error(`No database shard configured for region: ${region}`);
        }
        instance = knex(createKnexConfig(conf));
        shardInstances.set(reg, instance);
    }
    return instance;
}

export function getArchiveShard(region: string = DEFAULT_REGION): Knex {
    const reg = region.toLowerCase();
    let instance = archiveShardInstances.get(reg);
    if (!instance) {
        const conf = env.archiveShards[reg as keyof typeof env.archiveShards];
        if (!conf) {
            throw new Error(`No archive database shard configured for region: ${region}`);
        }
        instance = knex(createKnexConfig(conf));
        archiveShardInstances.set(reg, instance);
    }
    return instance;
}

export async function destroyAllShards(): Promise<void> {
    for (const [_, inst] of shardInstances) {
        await inst.destroy();
    }
    shardInstances.clear();

    for (const [_, inst] of archiveShardInstances) {
        await inst.destroy();
    }
    archiveShardInstances.clear();
}
