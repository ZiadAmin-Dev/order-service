# QuickBite `order-service` — Payments Business Logic & Kashier v3 Integration

## 1. Overview & Payment Methods

QuickBite supports two primary payment methods:
1. **Online Payment (Kashier v3 Gateway)**: Card, wallet, or electronic payment via hosted session.
2. **Cash on Delivery (COD)**: Physical cash collected by the delivery agent upon fulfillment.

All financial transactions are ledgered in the `transactions` table using integer minor units.

---

## 2. Kashier v3 Online Payment Lifecycle

### 2.1 Checkout Session Initiation (`POST /api/payments/init`)
When a customer checks out an online order:
1. `order-service` creates a transaction row:
   - `transaction_type = 'payment'`
   - `status = 'pending'`
   - `method = 'online'`
   - `src_acc_id = customer_id`
   - `dst_acc_id = 'kashier_escrow'`
2. `order-service` calls Kashier v3 Sessions API:
   - Request includes `orderId`, `amount`, `currency`, `hash` (signature generated with `KASHIER_SECRET_KEY`), and `merchantRedirectUrl`.
3. Kashier returns a payment session ID and checkout redirect URL.
4. `provider_reference_id` is updated on the `transactions` row.

### 2.2 Webhook Handling (`POST /api/payments/webhook`)
Kashier v3 delivers asynchronous payment status notifications to the webhook endpoint.

#### Security & Signature Verification:
1. Kashier sends an HMAC SHA256 signature in the request headers (`x-kashier-signature` or query parameters).
2. The payload is re-hashed using the platform's `KASHIER_SECRET_KEY`.
3. If signatures do not match, the request is immediately rejected with HTTP 401 Unauthorized and logged.

#### Idempotency & Replay Protection:
- Kashier may send duplicate webhook events.
- An atomic check is performed on `transactions` using `provider_reference_id` or transaction ID.
- If the transaction is already in `completed` or `failed` status, the webhook handler returns HTTP 200 OK immediately without repeating side effects.

#### Successful Payment Processing:
1. Transaction status updated from `pending` -> `completed`.
2. Order status updated from `payment_pending` -> `placed`.
3. Real-time WebSocket event `order:placed` emitted to the branch dashboard and customer channel.

#### Failed Payment Processing:
1. Transaction status updated from `pending` -> `failed`.
2. Order status updated from `payment_pending` -> `cancelled`.
3. Real-time WebSocket event `order:payment_failed` emitted to customer.

---

## 3. Cash on Delivery (COD) Flow

1. Customer places order with `payment_method = 'cod'`.
2. Order is created directly with status `placed`.
3. A pending transaction row is logged:
   - `transaction_type = 'payment'`
   - `status = 'pending'`
   - `method = 'cod'`
   - `src_acc_id = customer_id`
   - `dst_acc_id = 'delivery_agent:' || agent_id`
4. When the delivery agent confirms delivery (`delivered`), the transaction status transitions to `completed` within the settlement transaction.

---

## 4. Refunds & Reversals

When an online order is cancelled or rejected before preparation:
1. The service invokes the Kashier v3 Refund API.
2. A new compensating transaction row is inserted:
   - `transaction_type = 'refund'`
   - `status = 'completed'`
   - `amount = original_amount`
   - `refunded_payment_id = original_transaction_id`
   - `src_acc_id = 'kashier_escrow'`
   - `dst_acc_id = customer_id`
3. The original transaction has `is_refunded` set to `TRUE`.

---

## 5. System Transaction Semantics (`src_acc_id = NULL`)

For system-initiated operations (e.g. system commission deductions or platform subsidies):
- The `src_acc_id` column is set to `NULL`.
- This adheres to the platform requirement that internal platform-generated ledger events do not require an external customer or bank account identifier.
