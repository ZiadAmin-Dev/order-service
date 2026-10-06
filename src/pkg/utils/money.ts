/**
 * Pure monetary utilities operating on integer minor units (e.g. piasters, halalas, cents).
 * Floating-point representation is forbidden for internal balances and totals.
 */

export function toMinorUnits(majorAmount: number): number {
    return Math.round(majorAmount * 100);
}

export function toMajorUnits(minorAmount: number): number {
    return minorAmount / 100;
}

export function calculateCommission(subtotal: number, commissionPercent: number): number {
    if (subtotal < 0 || commissionPercent < 0) {
        throw new Error("Subtotal and commission percentage must be non-negative");
    }
    return Math.round((subtotal * commissionPercent) / 100);
}

export function calculateRestaurantNet(subtotal: number, commissionAmount: number): number {
    return Math.max(0, subtotal - commissionAmount);
}

export function assertNonNegativeMinorUnits(amount: number, fieldName: string = "amount"): void {
    if (!Number.isInteger(amount) || amount < 0) {
        throw new Error(`${fieldName} must be a non-negative integer minor unit`);
    }
}
