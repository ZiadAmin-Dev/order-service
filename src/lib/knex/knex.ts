import { Knex } from "knex";
import { getShard, destroyAllShards } from "./shards";
import { DEFAULT_REGION } from "../sharding/regions";

export function db(region: string = DEFAULT_REGION): Knex {
    return getShard(region);
}

export async function pingDB(region: string = DEFAULT_REGION): Promise<void> {
    await db(region).raw("SELECT 1");
}

export async function closeDB(): Promise<void> {
    await destroyAllShards();
}
