# QuickBite `order-service` — RBAC & Authorization Architecture

## 1. Actor Roles Hierarchy

QuickBite enforces two tiers of authorization:
1. **System Roles** (stored in `req.user.role`):
   - `customer`: Can place orders, view personal order history, cancel pending orders.
   - `delivery_agent`: Can view assigned tasks, update delivery states, view personal earnings.
   - `restaurant_user`: Operates within an assigned restaurant and specific branches.
   - `system_admin`: Unrestricted administrative override across all restaurants and regions.
2. **Restaurant Staff Roles** (stored in `req.user.restaurantRole` for `restaurant_user`):
   - `owner`: Full control over the restaurant's orders, finances, balances, and staff assignments.
   - `branch_manager`: Can accept/reject orders, assign delivery drivers, update order status for their branches.
   - `staff`: Kitchen and counter staff; can view orders and update preparation status only.

---

## 2. Resource Permissions Catalog

Permissions are structured as `<resource>:<action>`:

| Resource | Action | Allowed Roles | Endpoint Scope |
| --- | --- | --- | --- |
| `orders:order` | `read` | `owner`, `branch_manager`, `staff` | `GET /api/orders` |
| `orders:order` | `accept_reject` | `owner`, `branch_manager` | `PATCH /api/orders/:id/accept`, `/reject` |
| `orders:order` | `update_status` | `owner`, `branch_manager`, `staff` | `PATCH /api/orders/:id/status` |
| `orders:delivery`| `manual_assign` | `owner`, `branch_manager` | `POST /api/deliveries/:id/assign` |
| `orders:finance` | `view_balance` | `owner` | `GET /api/finance/restaurants/:id/balance` |
| `orders:finance` | `view_payouts` | `owner` | `GET /api/finance/restaurants/:id/payouts` |

---

## 3. Scope Isolation: Restaurant Membership & Branch Access

In addition to RBAC permission checks, the service enforces ownership boundaries:
1. **`requireRestaurantMember(paramName)`**:
   - Ensures `Number(req.user.restaurantId) === Number(req.params[paramName])`.
   - Prevents staff of Restaurant A from viewing or modifying orders belonging to Restaurant B.
2. **`requireBranchAccess(paramName)`**:
   - For `branch_manager` and `staff`, verifies that `req.user.branchIds` contains the target `branchId`.
   - `owner` bypasses branch restrictions and has access across all branches of their restaurant.
   - `system_admin` bypasses all tenant boundaries.
