import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { getVisibleNavItems } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AdminDashboardPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const params = await searchParams;
  const profile = await requireAdminPageAccess("dashboard");
  const visibleSections = getVisibleNavItems(profile.role);

  return (
    <div className="space-y-6">
      {params.error === "forbidden" && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Restricted Section</p>
            <p>
              Your current role (<strong>{profile.role}</strong>) does not have permission
              to open that admin page.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {profile.full_name || profile.email}. Here is your Aura Shop
          workspace overview.
        </p>
      </div>

      {/* Role & Security Verification Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Active Role & Access Protection
            </CardTitle>
            <Badge className="bg-emerald-600 uppercase text-white hover:bg-emerald-600">
              Role: {profile.role}
            </Badge>
          </div>
          <CardDescription>
            Protected across Next.js Middleware, Server Components/Actions, and Supabase
            Row-Level Security (RLS).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">
              Sections enabled for your role ({visibleSections.length} of 10):
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleSections.map((item) => (
                <Badge key={item.key} variant="secondary" className="gap-1.5 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {item.label}
                  {item.readOnlyRoles?.includes(profile.role) ? " (View only)" : ""}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Live KPI cards (Today&apos;s Orders, Today&apos;s Sales in BDT ৳, Pending
            Orders, Low-Stock Items, and 30-day charts) will connect here as we build
            Products, Orders, and Reports in Days 2–6.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}