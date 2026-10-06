import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreClient } from "../../src/lib/core-client/core-client";
import { ICacheProvider } from "../../src/pkg/cache/cache.interface";

// In-memory cache mock
class MemoryCache implements ICacheProvider {
    private store = new Map<string, any>();

    async get(key: string): Promise<any> {
        return this.store.get(key) || null;
    }

    async set(key: string, value: any): Promise<any> {
        this.store.set(key, value);
        return value;
    }

    async del(key: string): Promise<boolean> {
        return this.store.delete(key);
    }
}

describe("Core Service Client", () => {
    it("fetches branch details and caches result for subsequent requests", async () => {
        const cache = new MemoryCache();
        const client = new CoreClient(cache);

        const branch1 = await client.getBranch(10);
        assert.ok(branch1);
        assert.equal(branch1.id, 10);
        assert.equal(branch1.isActive, true);
        assert.equal(branch1.acceptOrders, true);
        assert.equal(branch1.commission, 15);

        // Verify it was stored in cache
        const cached = await cache.get("core:branch:10");
        assert.ok(cached);
        assert.equal(cached.id, 10);

        // Subsequent call returns cached branch
        const branch2 = await client.getBranch(10);
        assert.deepEqual(branch2, branch1);
    });

    it("batch validates products availability and prices", async () => {
        const cache = new MemoryCache();
        const client = new CoreClient(cache);

        const items = [
            { productId: 101, quantity: 2 },
            { productId: 102, quantity: 1 },
        ];

        const validated = await client.validateProducts(10, items);
        assert.equal(validated.length, 2);
        assert.equal(validated[0].productId, 101);
        assert.equal(validated[0].isAvailable, true);
        assert.equal(validated[0].inStock, true);
        assert.ok(Number.isInteger(validated[0].price));
    });

    it("fetches customer delivery address coordinates and snapshot text", async () => {
        const cache = new MemoryCache();
        const client = new CoreClient(cache);

        const address = await client.getCustomerAddress(1, 55);
        assert.ok(address);
        assert.equal(address.customerId, 1);
        assert.ok(address.lat);
        assert.ok(address.lng);
        assert.ok(address.addressText);
    });
});
