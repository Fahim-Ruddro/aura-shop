# Aura Shop — Role-Based Access Control (RBAC)

Aura Shop uses four user roles stored in `public.profiles.role`: `customer`, `staff`, `manager`, and `admin`.

Every privileged operation is enforced in **three independent layers**:
1. **Next.js Middleware (`src/middleware.ts`)** — blocks unauthenticated users, blocked accounts, and `customer` accounts from reaching `/admin` routes.
2. **Server Actions & Server Components (`src/lib/auth/guards.ts`)** — verifies the user's session, active status, and role permissions on the server before rendering any page or executing any mutation.
3. **Supabase Row-Level Security (RLS) Policies** — enforces database-level read/write rules directly in PostgreSQL so unauthorized requests fail even if called directly via API.

---

## Role Definitions & Permissions

### 1. `customer`
- Browse active products and categories on the storefront.
- Manage their own shopping cart, saved addresses, and profile.
- Place orders (Cash on Delivery or Online) and view their own order history.
- **No access** to any `/admin` page or admin Server Action.

### 2. `staff`
- Access the `/admin` panel (`Dashboard`, `Orders`, `Products` [view], `Categories` [view]).
- View products, categories, and customer orders.
- Update order statuses along allowed transitions and add internal staff notes.
- Cannot create/edit/archive products, adjust inventory stock, manage coupons, block customers, change shop settings, view activity logs, or manage staff roles.

### 3. `manager`
- **Everything `staff` can do**, plus:
- Create, edit, and archive products and product variants (sizes/SKUs/images).
- Create, edit, and delete empty categories.
- Adjust inventory stock with logged reasons (`stock_movements`).
- View customer details and block/unblock customer accounts.
- Create, edit, and toggle discount coupons.
- View sales reports and export CSV files.
- Cannot change delivery settings, view the admin activity log, or assign/modify staff roles.

### 4. `admin`
- **Everything `manager` can do**, plus:
- Configure shop delivery charges (Inside Dhaka, Outside Dhaka, Free Delivery minimum).
- View the complete audit `Activity log` across all users and actions.
- View staff accounts and promote/demote user roles (`customer`, `staff`, `manager`, `admin`).

---

## Route & Menu Access Matrix

| Admin Route | `customer` | `staff` | `manager` | `admin` |
| :--- | :---: | :---: | :---: | :---: |
| `/admin` (Dashboard) | No | Yes | Yes | Yes |
| `/admin/orders` (Orders) | No | Yes | Yes | Yes |
| `/admin/products` (Products) | No | View Only | Full Access | Full Access |
| `/admin/categories` (Categories) | No | View Only | Full Access | Full Access |
| `/admin/inventory` (Inventory) | No | No | Full Access | Full Access |
| `/admin/customers` (Customers) | No | No | Full Access | Full Access |
| `/admin/coupons` (Coupons) | No | No | Full Access | Full Access |
| `/admin/reports` (Reports) | No | No | Full Access | Full Access |
| `/admin/settings` (Settings & Staff) | No | No | No | Full Access |
| `/admin/activity-log` (Activity Log) | No | No | No | Full Access |