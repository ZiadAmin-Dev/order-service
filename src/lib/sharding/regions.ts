import { env } from "../config/env";

export const SUPPORTED_REGIONS = env.regions;
export const DEFAULT_REGION = env.regions[0] || "eg";

export function isValidRegion(region: string): boolean {
    return SUPPORTED_REGIONS.includes(region.toLowerCase());
}
