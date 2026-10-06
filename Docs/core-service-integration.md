# QuickBite `order-service` — Core Service Integration Specification

This document details all synchronous and asynchronous integration contracts between `order-service` and `core-service`. It also documents required extensions or endpoints in `core-service` needed to support order checkout and fulfillment, while strictly adhering to `core-service`'s read-only boundary during this task.

---

## 1. Synchronous Integration Endpoints (HTTP / REST)

`order-service` communicates with `core-service` over private internal HTTP endpoints protected by `X-Internal-API-Key`.

### 1.1 Branch Details & Delivery Validation
- **Endpoint**: `GET /api/internal/branches/:id`
- **Purpose**: Validate branch exists, is active, check working hours, coordinates, delivery radius, and restaurant commission percentage.
- **Headers**: `X-Internal-API-Key: <key>`, `X-Correlation-Id: <id>`
- **Response Contract (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 10,
    "restaurantId": 2,
    "name": "Downtown Branch",
    "countryCode": "eg",
    "isActive": true,
    "acceptOrders": true,
    "lat": 30.0444,
    "lng": 31.2357,
    "deliveryRadiusKm": 15,
    "currency": "EGP",
    "commission": 15
  }
}
```

### 1.2 Product Price & Stock Verification
- **Endpoint**: `POST /api/internal/products/validate-batch`
- **Purpose**: Authoritatively verify product availability, current price, and stock for a list of products before placing an order.
- **Request Body**:
```json
{
  "branchId": 10,
  "items": [
    { "productId": 101, "quantity": 2 },
    { "productId": 102, "quantity": 1 }
  ]
}
```
- **Response Contract (200 OK)**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "items": [
      {
        "productId": 101,
        "name": "Classic Burger",
        "price": 8500,
        "isAvailable": true,
        "inStock": true,
        "imageUrl": "https://cdn.quickbite.com/burger.jpg"
      },
      {
        "productId": 102,
        "name": "French Fries",
        "price": 3000,
        "isAvailable": true,
        "inStock": true,
        "imageUrl": "https://cdn.quickbite.com/fries.jpg"
      }
    ]
  }
}
```

### 1.3 Customer Address Lookup
- **Endpoint**: `GET /api/internal/customers/:customerId/addresses/:addressId`
- **Purpose**: Verify delivery address exists, belongs to the customer, and retrieve coordinates for distance calculation and delivery fee calculation.
- **Response Contract (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 55,
    "customerId": 1,
    "addressText": "123 Tahrir Sq, Apt 4B, Cairo",
    "lat": 30.0450,
    "lng": 31.2360
  }
}
```

### 1.4 RBAC Permissions Resolution
- **Endpoint**: `GET /api/internal/rbac/roles/:role/permissions`
- **Purpose**: Fetch permissions for restaurant roles (`owner`, `branch_manager`, `staff`) for read-through caching in `order-service`.
- **Response Contract (200 OK)**:
```json
{
  "success": true,
  "data": [
    { "resource": "core:order", "action": "read" },
    { "resource": "core:order", "action": "update" },
    { "resource": "core:order", "action": "accept" }
  ]
}
```

---

## 2. Asynchronous Integration (RabbitMQ Events from `core-service`)

`core-service` publishes domain events to the `core.events` topic exchange. `order-service` consumes these events via queue `order-service.core-events`.

| Routing Key | Source Module | Payload Summary | `order-service` Effect |
| --- | --- | --- | --- |
| `product.price.changed` | `product` | `{ productId, branchId, newPrice }` | Evicts cached product price snapshot |
| `product.stock.changed` | `product` | `{ productId, branchId, stock, isAvailable }` | Evicts product stock cache |
| `branch.deactivated` | `branch` | `{ branchId, restaurantId }` | Evicts branch cache; marks branch in-flight orders for caution |
| `branch.updated` | `branch` | `{ branchId, lat, lng, deliveryRadius }` | Evicts branch location & config cache |
| `restaurant.suspended` | `restaurant` | `{ restaurantId }` | Rejects new orders for all restaurant branches |
| `rbac.permissions_changed`| `rbac` | `{ role, permissions }` | Evicts cached permissions for role |

---

## 3. Required RBAC Additions in `core-service`

To fully authorize restaurant operations in `order-service`, the following permissions are required in `core-service`'s `permissions` and `role_permissions` tables:

```sql
INSERT INTO permissions (resource, action, created_at) VALUES
('orders:order', 'read', NOW()),
('orders:order', 'update_status', NOW()),
('orders:order', 'accept_reject', NOW()),
('orders:delivery', 'manual_assign', NOW()),
('orders:finance', 'view_balance', NOW()),
('orders:finance', 'view_payouts', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Map permissions to roles
-- owner: All orders and finance permissions
-- branch_manager: orders:read, update_status, accept_reject, manual_assign
-- staff: orders:read, update_status (preparation steps only)
```

Rollout considerations:
- Seed migration should be applied to `core-service` database.
- Backward compatibility: While `order-service` runs before seed application, fallback role-based defaults (`owner` has full access) ensure operational continuity.
