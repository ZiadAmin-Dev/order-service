# QuickBite `order-service` — API Contracts Specification

All responses follow the canonical QuickBite envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

---

## 1. Orders API

### 1.1 Create Order
- **Route**: `POST /api/orders`
- **Actor**: `customer`
- **Headers**: `Idempotency-Key: <uuid>`, `X-Region: <region>`
- **Request Body**:
```json
{
  "restaurantId": 2,
  "branchId": 10,
  "customerAddressId": 55,
  "paymentMethod": "online",
  "items": [
    { "productId": 101, "quantity": 2 },
    { "productId": 102, "quantity": 1 }
  ]
}
```
- **Response DTO (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "publicId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "payment_pending",
    "paymentMethod": "online",
    "subtotal": 20000,
    "deliveryFee": 2500,
    "serviceFee": 1000,
    "totalAmount": 23500,
    "currency": "EGP",
    "createdAt": "2026-10-06T20:00:00.000Z",
    "items": [
      {
        "id": 1,
        "productId": 101,
        "name": "Classic Burger",
        "quantity": 2,
        "unitPrice": 8500,
        "subtotal": 17000
      }
    ],
    "paymentSession": {
      "checkoutUrl": "https://checkout.kashier.io/session/sess_123"
    }
  }
}
```

### 1.2 Get Order by Public ID
- **Route**: `GET /api/orders/:publicId`
- **Actor**: `customer` (owner), `restaurant_user` (branch member), `delivery_agent` (assigned), `system_admin`
- **Response DTO (200 OK)**:
```json
{
  "success": true,
  "data": {
    "publicId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "preparing",
    "paymentMethod": "online",
    "subtotal": 20000,
    "deliveryFee": 2500,
    "serviceFee": 1000,
    "totalAmount": 23500,
    "currency": "EGP",
    "deliveryAddress": "123 Tahrir Sq, Cairo",
    "createdAt": "2026-10-06T20:00:00.000Z",
    "items": [ ... ]
  }
}
```

### 1.3 Accept / Reject Order
- **Route**: `PATCH /api/orders/:publicId/status`
- **Actor**: `restaurant_user` (Owner / Branch Manager)
- **Request Body**:
```json
{
  "status": "accepted"
}
```
- **Response DTO (200 OK)**:
```json
{
  "success": true,
  "data": {
    "publicId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "accepted",
    "updatedAt": "2026-10-06T20:05:00.000Z"
  }
}
```

---

## 2. Payments API

### 2.1 Kashier v3 Webhook
- **Route**: `POST /api/payments/webhook`
- **Actor**: Unauthenticated / Kashier Gateway
- **Headers**: `x-kashier-signature: <hmac>`
- **Request Body**:
```json
{
  "event": "pay",
  "data": {
    "merchantOrderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "kashierOrderHash": "kashier_ref_987",
    "status": "SUCCESS",
    "amount": 23500,
    "currency": "EGP",
    "signature": "..."
  }
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## 3. Deliveries & Agents API

### 3.1 Update Agent Presence & Location
- **Route**: `POST /api/agents/me/presence`
- **Actor**: `delivery_agent`
- **Request Body**:
```json
{
  "isAvailable": true,
  "lat": 30.0444,
  "lng": 31.2357
}
```
- **Response DTO (200 OK)**:
```json
{
  "success": true,
  "data": {
    "agentId": 42,
    "isAvailable": true,
    "lastSeenAt": "2026-10-06T20:10:00.000Z"
  }
}
```

### 3.2 Mark Order Delivered
- **Route**: `PATCH /api/deliveries/:orderPublicId/delivered`
- **Actor**: Assigned `delivery_agent`
- **Response DTO (200 OK)**:
```json
{
  "success": true,
  "data": {
    "publicId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "delivered",
    "deliveredAt": "2026-10-06T20:30:00.000Z",
    "agentEarningAmount": 2500,
    "currency": "EGP"
  }
}
```

---

## 4. Restaurant Finance API

### 4.1 Get Restaurant Running Balance
- **Route**: `GET /api/finance/restaurants/:restaurantId/balance`
- **Actor**: `restaurant_user` (Owner), `system_admin`
- **Response DTO (200 OK)**:
```json
{
  "success": true,
  "data": {
    "restaurantId": 2,
    "balance": 1850000,
    "currency": "EGP",
    "updatedAt": "2026-10-06T20:30:00.000Z"
  }
}
```

### 4.2 Record Admin Payout
- **Route**: `POST /api/finance/restaurants/:restaurantId/payouts`
- **Actor**: `system_admin`
- **Request Body**:
```json
{
  "amount": 1000000,
  "currency": "EGP",
  "note": "Bank wire ref #TRX-998811"
}
```
- **Response DTO (201 Created)**:
```json
{
  "success": true,
  "data": {
    "transactionId": 88,
    "restaurantId": 2,
    "payoutAmount": 1000000,
    "remainingBalance": 850000,
    "currency": "EGP",
    "createdAt": "2026-10-06T21:00:00.000Z"
  }
}
```
