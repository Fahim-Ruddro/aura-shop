import Link from "next/link";
import {
  Leaf,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { getCurrentProfile } from "@/lib/auth/guards";
import { isAdminPanelRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HomePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const isStaffMember = isAdminPanelRole(profile?.role);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Storefront Navbar */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-emerald-700"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <span>Aura Shop</span>
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                Organic & Specialty Grocery
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {profile ? (
              <>
                <div className="hidden items-center gap-2 text-sm sm:flex">
                  <span className="font-medium text-foreground">
                    {profile.full_name || profile.email}
                  </span>
                  <Badge variant="outline" className="uppercase text-xs">
                    {profile.role}
                  </Badge>
                </div>

                {isStaffMember && (
                  <Link
                    href="/admin"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "bg-emerald-600 text-white hover:bg-emerald-700"
                    )}
                  >
                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                    Admin Panel
                  </Link>
                )}

                <form action={logoutAction}>
                  <Button type="submit" variant="outline" size="sm">
                    <LogOut className="mr-1.5 h-4 w-4" />
                    Logout
                  </Button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                <LogIn className="mr-1.5 h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {params.error === "unauthorized" && (
          <div
            role="alert"
            className="mb-8 flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Access Denied</p>
              <p>
                Customer accounts cannot access the <code>/admin</code> dashboard or staff
                actions.
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="rounded-2xl border bg-linear-to-br from-emerald-50 via-background to-amber-50/40 p-8 sm:p-12">
          <Badge className="mb-4 bg-emerald-600 text-white hover:bg-emerald-600">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            100% Authentic Bangladesh Origin
          </Badge>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Pure Organic Pantry Staples, Delivered Across Bangladesh.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Sundarbans raw honey, cold-pressed mustard oil, aromatic Chinigura rice, and
            artisanal spices—sourced directly from trusted growers and delivered in BDT (৳).
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isStaffMember ? (
              <Link
                href="/admin"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                <ShieldCheck className="mr-2 h-5 w-5" />
                Open Aura Shop Admin Panel
              </Link>
            ) : (
              <Link
                href={profile ? "#catalog" : "/login"}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                {profile ? "Browse Specialty Groceries" : "Sign In to Start Shopping"}
              </Link>
            )}
          </div>
        </section>

        {/* Catalog Placeholder (Populated in Day 2 & Day 3) */}
        <section id="catalog" className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Featured Pantry Collection</h2>
              <p className="text-sm text-muted-foreground">
                Active products created in the Admin Panel appear here automatically.
              </p>
            </div>
            <Badge variant="secondary">Currency: BDT (৳)</Badge>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Sundarbans Raw Forest Honey",
                origin: "Bangladesh",
                note: "Unfiltered multiflora harvest — 250 g / 500 g",
              },
              {
                name: "Cold-Pressed Black Mustard Oil",
                origin: "Bangladesh",
                note: "Traditional wooden ghani pressed — 500 ml / 1 L",
              },
              {
                name: "Organic Dinajpur Chinigura Rice",
                origin: "Bangladesh",
                note: "Aged aromatic grain — 1 kg / 5 kg",
              },
            ].map((item) => (
              <Card key={item.name} className="border-dashed">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Origin: {item.origin}</Badge>
                    <span className="text-xs text-muted-foreground">Day 2 Catalog</span>
                  </div>
                  <CardTitle className="mt-2 text-lg">{item.name}</CardTitle>
                  <CardDescription>{item.note}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Live database products and size variants will go live here in Day 2 &
                    Day 3.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}