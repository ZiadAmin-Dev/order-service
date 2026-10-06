import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidRegion, DEFAULT_REGION, SUPPORTED_REGIONS } from "../../src/lib/sharding/regions";
import { regionResolver } from "../../src/lib/sharding/region-resolver";
import { invalidRegionError } from "../../src/lib/sharding/errors";
import type { Request, Response } from "express";

describe("Multi-Region Sharding Resolution", () => {
    it("validates configured regions correctly", () => {
        assert.equal(isValidRegion("eg"), true);
        assert.equal(isValidRegion("EG"), true);
        assert.equal(isValidRegion("ksa"), true);
        assert.equal(isValidRegion("usa"), false);
        assert.equal(isValidRegion("unknown"), false);
        assert.ok(SUPPORTED_REGIONS.includes("eg"));
        assert.equal(DEFAULT_REGION, "eg");
    });

    it("resolves region from query parameter ?region=ksa", () => {
        const req: any = { query: { region: "ksa" }, headers: {}, cookies: {} };
        let nextCalled = false;
        regionResolver(req as Request, {} as Response, (err) => {
            assert.equal(err, undefined);
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(req.region, "ksa");
    });

    it("resolves region from header X-Region: eg", () => {
        const req: any = { query: {}, headers: { "x-region": "eg" }, cookies: {} };
        let nextCalled = false;
        regionResolver(req as Request, {} as Response, (err) => {
            assert.equal(err, undefined);
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(req.region, "eg");
    });

    it("resolves region from cookie if query and header are absent", () => {
        const req: any = { query: {}, headers: {}, cookies: { region: "ksa" } };
        let nextCalled = false;
        regionResolver(req as Request, {} as Response, (err) => {
            assert.equal(err, undefined);
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(req.region, "ksa");
    });

    it("falls back to DEFAULT_REGION when no region is specified", () => {
        const req: any = { query: {}, headers: {}, cookies: {} };
        let nextCalled = false;
        regionResolver(req as Request, {} as Response, (err) => {
            assert.equal(err, undefined);
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(req.region, "eg");
    });

    it("allows region='all' for global admin queries", () => {
        const req: any = { query: { region: "all" }, headers: {}, cookies: {} };
        let nextCalled = false;
        regionResolver(req as Request, {} as Response, (err) => {
            assert.equal(err, undefined);
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(req.region, "all");
    });

    it("rejects unsupported region with invalidRegionError", () => {
        const req: any = { query: { region: "invalid_shard" }, headers: {}, cookies: {} };
        let errorPassed: any = null;
        regionResolver(req as Request, {} as Response, (err) => {
            errorPassed = err;
        });
        assert.equal(errorPassed, invalidRegionError);
        assert.equal(errorPassed.statusCode, 400);
    });
});
