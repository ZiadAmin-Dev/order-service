import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    toMinorUnits,
    toMajorUnits,
    calculateCommission,
    calculateRestaurantNet,
    assertNonNegativeMinorUnits,
} from "../../src/pkg/utils/money";

describe("Money Utilities (Minor Units Integrity)", () => {
    it("converts major units to minor units accurately", () => {
        assert.equal(toMinorUnits(10.50), 1050);
        assert.equal(toMinorUnits(0.99), 99);
        assert.equal(toMinorUnits(100), 10000);
        assert.equal(toMinorUnits(0), 0);
    });

    it("converts minor units to major units", () => {
        assert.equal(toMajorUnits(1050), 10.50);
        assert.equal(toMajorUnits(99), 0.99);
        assert.equal(toMajorUnits(10000), 100);
    });

    it("calculates platform commission in integer minor units without float drift", () => {
        // 15% of 20000 (200.00 EGP) is 3000 (30.00 EGP)
        assert.equal(calculateCommission(20000, 15), 3000);
        // 12.5% of 1500 (15.00 EGP) -> 187.5 rounded to 188 minor units
        assert.equal(calculateCommission(1500, 12.5), 188);
    });

    it("throws error for negative subtotal or commission", () => {
        assert.throws(() => calculateCommission(-100, 10));
        assert.throws(() => calculateCommission(100, -5));
    });

    it("calculates net restaurant credit (subtotal - commission)", () => {
        const subtotal = 20000;
        const commission = calculateCommission(subtotal, 15);
        const net = calculateRestaurantNet(subtotal, commission);
        assert.equal(net, 17000);
    });

    it("asserts non-negative integer minor units", () => {
        assert.doesNotThrow(() => assertNonNegativeMinorUnits(1500, "balance"));
        assert.doesNotThrow(() => assertNonNegativeMinorUnits(0, "balance"));
        assert.throws(() => assertNonNegativeMinorUnits(-10, "balance"));
        assert.throws(() => assertNonNegativeMinorUnits(10.5, "balance"));
    });
});
