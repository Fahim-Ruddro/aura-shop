import type { UserRole } from "@/types/database";

export type AdminSection =
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "inventory"
  | "customers"
  | "coupons"
  | "reports"
  | "settings"
  | "activity-log";

export interface AdminNavItem {
  key: AdminSection;
  label: string;
  href: string;
  allowedRoles: UserRole[];
  readOnlyRoles?: UserRole[];
}

export const ADMIN_STAFF_ROLES: UserRole[] = ["staff", "manager", "admin"];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/admin",
    allowedRoles: ["staff", "manager", "admin"],
  },
  {
    key: "orders",
    label: "Orders",
    href: "/admin/orders",
    allowedRoles: ["staff", "manager", "admin"],
  },
  {
    key: "products",
    label: "Products",
    href: "/admin/products",
    allowedRoles: ["staff", "manager", "admin"],
    readOnlyRoles: ["staff"],
  },
  {
    key: "categories",
    label: "Categories",
    href: "/admin/categories",
    allowedRoles: ["staff", "manager", "admin"],
    readOnlyRoles: ["staff"],
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/admin/inventory",
    allowedRoles: ["manager", "admin"],
  },
  {
    key: "customers",
    label: "Customers",
    href: "/admin/customers",
    allowedRoles: ["manager", "admin"],
  },
  {
    key: "coupons",
    label: "Coupons",
    href: "/admin/coupons",
    allowedRoles: ["manager", "admin"],
  },
  {
    key: "reports",
    label: "Reports",
    href: "/admin/reports",
    allowedRoles: ["manager", "admin"],
  },
  {
    key: "settings",
    label: "Settings",
    href: "/admin/settings",
    allowedRoles: ["admin"],
  },
  {
    key: "activity-log",
    label: "Activity log",
    href: "/admin/activity-log",
    allowedRoles: ["admin"],
  },
];

export function isAdminPanelRole(role: string | null | undefined): role is Exclude<UserRole, "customer"> {
  return role === "staff" || role === "manager" || role === "admin";
}

export function canAccessSection(role: UserRole, section: AdminSection): boolean {
  const item = ADMIN_NAV_ITEMS.find((nav) => nav.key === section);
  if (!item) return false;
  return item.allowedRoles.includes(role);
}

export function canWriteSection(role: UserRole, section: AdminSection): boolean {
  const item = ADMIN_NAV_ITEMS.find((nav) => nav.key === section);
  if (!item || !item.allowedRoles.includes(role)) return false;
  if (item.readOnlyRoles?.includes(role)) return false;
  return true;
}

export function getVisibleNavItems(role: UserRole): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

export function canAccessPathname(role: UserRole, pathname: string): boolean {
  if (!isAdminPanelRole(role)) return false;
  if (pathname === "/admin") return true;

  // Match longest prefix first
  const sorted = [...ADMIN_NAV_ITEMS]
    .filter((item) => item.href !== "/admin")
    .sort((a, b) => b.href.length - a.href.length);

  const matched = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  if (!matched) return true;
  return matched.allowedRoles.includes(role);
}