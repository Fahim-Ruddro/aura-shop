"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Boxes,
  FolderTree,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Store,
  TicketPercent,
  Users,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { getVisibleNavItems, type AdminSection } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const SECTION_ICONS: Record<AdminSection, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: ShoppingCart,
  products: Package,
  categories: FolderTree,
  inventory: Boxes,
  customers: Users,
  coupons: TicketPercent,
  reports: BarChart3,
  settings: Settings,
  "activity-log": Activity,
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  customer: "bg-slate-100 text-slate-800 border-slate-300",
  staff: "bg-sky-100 text-sky-800 border-sky-300",
  manager: "bg-amber-100 text-amber-900 border-amber-300",
  admin: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

interface SidebarNavListProps {
  profile: Profile;
  pathname: string;
  onNavigate?: () => void;
}

function SidebarNavList({ profile, pathname, onNavigate }: SidebarNavListProps) {
  const navItems = getVisibleNavItems(profile.role);

  return (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Leaf className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-bold tracking-tight text-foreground">Aura Shop</p>
          <p className="text-xs text-muted-foreground">Admin Console</p>
        </div>
      </div>

      {/* Role-Filtered Navigation Links */}
      <nav aria-label="Admin Navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = SECTION_ICONS[item.key];
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isReadOnly = item.readOnlyRoles?.includes(profile.role);

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </span>
              {isReadOnly && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    isActive
                      ? "bg-emerald-700 text-emerald-100"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  View
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Bottom Storefront Link */}
      <div className="p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-start"
          )}
        >
          <Store className="mr-2 h-4 w-4" />
          View Live Storefront
        </Link>
      </div>
    </div>
  );
}

interface AdminShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function AdminShell({ profile, children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (profile.full_name || profile.email || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-muted/25">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarNavList profile={profile} pathname={pathname} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                aria-label="Open navigation menu"
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "lg:hidden"
                )}
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Aura Shop Admin Menu</SheetTitle>
                  <SheetDescription>
                    Navigate between admin sections available for your role.
                  </SheetDescription>
                </SheetHeader>
                <SidebarNavList
                  profile={profile}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 lg:hidden">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-foreground">Aura Shop</span>
            </div>
          </div>

          {/* Logged-in User, Role Badge & Logout */}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-emerald-50 text-xs font-semibold text-emerald-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-none text-foreground">
                  {profile.full_name || profile.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{profile.email}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "uppercase text-xs font-semibold",
                  ROLE_BADGE_CLASSES[profile.role]
                )}
              >
                {profile.role}
              </Badge>
            </div>

            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}