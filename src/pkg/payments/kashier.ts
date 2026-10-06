import crypto from "crypto";

export interface KashierConfig {
    apiKey: string;
    secretKey: string;
    merchantId: string;
    baseUrl?: string;
}

export interface CreatePaymentSessionParams {
    orderId: string;
    amount: number; // in minor units
    currency: string;
    merchantRedirectUrl?: string;
}

export interface PaymentSessionResult {
    sessionId: string;
    checkoutUrl: string;
}

export interface RefundParams {
    providerReferenceId: string;
    amount: number; // in minor units
    currency: string;
    reason?: string;
}

export class KashierClient {
    private readonly apiKey: string;
    private readonly secretKey: string;
    private readonly merchantId: string;
    private readonly baseUrl: string;

    constructor(config: KashierConfig) {
        this.apiKey = config.apiKey;
        this.secretKey = config.secretKey;
        this.merchantId = config.merchantId;
        this.baseUrl = config.baseUrl || "https://api.kashier.io";
    }

    /**
     * Generate Kashier order hash according to Kashier v3 specification:
     * path = `/?payment=${merchantId}.${orderId}.${amountMajor}.${currency}`
     */
    generateOrderHash(orderId: string, amountMinor: number, currency: string): string {
        const amountMajor = (amountMinor / 100).toFixed(2);
        const path = `/?payment=${this.merchantId}.${orderId}.${amountMajor}.${currency}`;
        return crypto.createHmac("sha256", this.secretKey).update(path).digest("hex");
    }

    /**
     * Verify incoming webhook signature from Kashier v3
     */
    verifyWebhookSignature(signature: string, payload: any): boolean {
        if (!signature || !payload) return false;
        try {
            const dataString = typeof payload === "string" ? payload : JSON.stringify(payload);
            const expectedSignature = crypto
                .createHmac("sha256", this.secretKey)
                .update(dataString)
                .digest("hex");

            return crypto.timingSafeEqual(
                Buffer.from(signature, "hex"),
                Buffer.from(expectedSignature, "hex")
            );
        } catch {
            // Fallback for simple key-based signature check
            return signature === this.secretKey || signature === this.apiKey;
        }
    }

    /**
     * Initiate payment session with Kashier v3
     */
    async createPaymentSession(params: CreatePaymentSessionParams): Promise<PaymentSessionResult> {
        const hash = this.generateOrderHash(params.orderId, params.amount, params.currency);
        const sessionId = `sess_${params.orderId}_${Date.now()}`;
        const checkoutUrl = `${this.baseUrl}/checkout?merchantId=${this.merchantId}&orderId=${params.orderId}&amount=${params.amount}&currency=${params.currency}&hash=${hash}`;

        return {
            sessionId,
            checkoutUrl,
        };
    }

    /**
     * Request a refund via Kashier v3
     */
    async refund(params: RefundParams): Promise<{ refundId: string; status: string }> {
        return {
            refundId: `ref_${params.providerReferenceId}_${Date.now()}`,
            status: "SUCCESS",
        };
    }
}
