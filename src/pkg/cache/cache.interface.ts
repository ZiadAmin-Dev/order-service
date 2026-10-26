export interface ICacheProvider {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlSeconds?: number): Promise<any>;
    del(key: string): Promise<any>;
    setIfNotExists?(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
    /**
     * Atomic "set if absent". Returns true if the key was newly set, false if
     * it already existed. Used for dedupe / distributed locks.
     */
    trySet(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
}
