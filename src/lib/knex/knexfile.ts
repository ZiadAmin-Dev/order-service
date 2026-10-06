import type { Knex } from "knex";
import { env } from "../config/env";

const region = (process.env.REGION || env.regions[0] || "eg").toLowerCase();
const shard = env.shards[region as keyof typeof env.shards] || env.shards.eg;

const config: Knex.Config = {
    client: "pg",
    connection: {
        host: shard.host,
        port: shard.port,
        user: shard.username,
        password: shard.password || "",
        database: shard.name,
    },
    pool: { min: 2, max: env.db.poolMax },
    migrations: {
        directory: env.db.migrationDirectory,
        extension: env.db.migrationExtension,
    },
};

export default config;
