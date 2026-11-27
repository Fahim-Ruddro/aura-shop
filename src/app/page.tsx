import Link from "next/link";
import {
  Leaf,
  LogIn,
  LogOut,
  Package,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { getCurrentProfile } from "@/lib/auth/guards";
import { isAdminPanelRole } from "@/lib/auth/permissions";
import { formatBDT } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Category, ProductWithCategory } from "@/types/database";
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
  searchParams: Promise<{ error?: string; category?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const selectedCategorySlug = (params.category ?? "").trim();

  const [profile, supabase] = await Promise.all([
    getCurrentProfile(),
    createClient(),
  ]);
  const isStaffMember = isAdminPanelRole(profile?.role);

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const activeCategories = (categoriesData ?? []) as Category[];

  // Strictly show ONLY active products belonging to active categories
  let productsQuery = supabase
    .from("products")
    .select("*, categories!inner(id, name, slug, is_active)")
    .eq("status", "active")
    .eq("categories.is_active", true)
    .order("created_at", { ascending: false });

  if (selectedCategorySlug) {
    productsQuery = productsQuery.eq("categories.slug", selectedCategorySlug);
  }

  const { data: productsData } = await productsQuery;
  const activeProducts = (productsData ?? []) as ProductWithCategory[];

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

        {/* Live Storefront Catalog */}
        <section id="catalog" className="mt-12 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Shop Specialty Groceries</h2>
              <p className="text-sm text-muted-foreground">
                Showing {activeProducts.length} active product
                {activeProducts.length === 1 ? "" : "s"} in BDT (৳).
              </p>
            </div>

            {/* Category Filter Pills */}
            {activeCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/#catalog"
                  className={cn(
                    buttonVariants({
                      variant: selectedCategorySlug === "" ? "default" : "outline",
                      size: "sm",
                    }),
                    selectedCategorySlug === "" &&
                      "bg-emerald-600 text-white hover:bg-emerald-700"
                  )}
                >
                  All ({activeCategories.length} Categories)
                </Link>
                {activeCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/?category=${cat.slug}#catalog`}
                    className={cn(
                      buttonVariants({
                        variant:
                          selectedCategorySlug === cat.slug ? "default" : "outline",
                        size: "sm",
                      }),
                      selectedCategorySlug === cat.slug &&
                        "bg-emerald-600 text-white hover:bg-emerald-700"
                    )}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {activeProducts.length === 0 ? (
            <Card className="border-dashed py-12 text-center">
              <CardContent className="space-y-2">
                <Package className="mx-auto h-9 w-9 text-muted-foreground" />
                <p className="font-medium text-foreground">No active products available</p>
                <p className="text-sm text-muted-foreground">
                  Products marked as <strong>Active</strong> by a Manager or Admin in{" "}
                  <code>/admin/products</code> will appear here immediately.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeProducts.map((product) => {
                const hasSale =
                  product.sale_price !== null &&
                  Number(product.sale_price) < Number(product.price);

                return (
                  <Card key={product.id} className="flex flex-col overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-48 w-full border-b object-cover"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center border-b bg-muted text-muted-foreground">
                        <Leaf className="h-10 w-10 text-emerald-600/40" />
                      </div>
                    )}

                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary">
                          {product.categories?.name ?? "Specialty"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Origin: {product.country_of_origin}
                        </span>
                      </div>
                      <CardTitle className="mt-2 text-lg">{product.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {product.short_description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="mt-auto space-y-3 pt-2">
                      <div className="flex items-baseline justify-between">
                        {hasSale ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-emerald-700">
                              {formatBDT(product.sale_price)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatBDT(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-foreground">
                            {formatBDT(product.price)}
                          </span>
                        )}

                        <Badge
                          variant="outline"
                          className={cn(
                            product.stock > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                          )}
                        >
                          {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                        </Badge>
                      </div>

                      {product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}