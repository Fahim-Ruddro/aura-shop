"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Leaf,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { placeOrderAction } from "@/actions/orders";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  DeliveryZone,
  PaymentMethod,
  ProductWithCategory,
  Profile,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CartLine {
  key: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  maxStock: number;
  quantity: number;
}

interface StorefrontCatalogProps {
  products: ProductWithCategory[];
  profile: Profile | null;
}

export function StorefrontCatalog({
  products,
  profile,
}: StorefrontCatalogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastOrderSuccess, setLastOrderSuccess] = useState(false);

  // Checkout form state
  const [customerName, setCustomerName] = useState(profile?.full_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(profile?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState(
    profile?.phone ?? "01711000000"
  );
  const [shippingAddress, setShippingAddress] = useState(
    "House 12, Road 5, Dhanmondi, Dhaka"
  );
  const [deliveryZone, setDeliveryZone] =
    useState<DeliveryZone>("inside_dhaka");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [customerNote, setCustomerNote] = useState("");

  const cartItemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart]
  );

  const deliveryCharge =
    subtotal === 0
      ? 0
      : subtotal >= 2000
        ? 0
        : deliveryZone === "outside_dhaka"
          ? 120
          : 60;
  const grandTotal = subtotal + deliveryCharge;

  function handleAddToCart(product: ProductWithCategory) {
    const activeVariants = (product.product_variants ?? [])
      .filter((v) => v.is_active)
      .sort((a, b) => a.display_order - b.display_order);

    if (activeVariants.length > 0) {
      const chosenVariantId =
        selectedVariants[product.id] ?? activeVariants[0].id;
      const variant =
        activeVariants.find((v) => v.id === chosenVariantId) ??
        activeVariants[0];

      if (variant.stock <= 0) {
        toast.error("This size is currently out of stock.");
        return;
      }

      const key = `${product.id}-${variant.id}`;
      const unitPrice =
        variant.sale_price !== null
          ? Number(variant.sale_price)
          : Number(variant.price);

      setCart((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) {
          if (existing.quantity >= variant.stock) {
            toast.error(`Only ${variant.stock} units available in stock.`);
            return prev;
          }
          return prev.map((l) =>
            l.key === key ? { ...l, quantity: l.quantity + 1 } : l
          );
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            unitPrice,
            maxStock: variant.stock,
            quantity: 1,
          },
        ];
      });

      setLastOrderSuccess(false);
      toast.success(`Added ${product.name} (${variant.name}) to cart.`);
      return;
    }

    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }

    const key = product.id;
    const unitPrice =
      product.sale_price !== null
        ? Number(product.sale_price)
        : Number(product.price);

    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} units available in stock.`);
          return prev;
        }
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId: null,
          productName: product.name,
          variantName: null,
          unitPrice,
          maxStock: product.stock,
          quantity: 1,
        },
      ];
    });

    setLastOrderSuccess(false);
    toast.success(`Added ${product.name} to cart.`);
  }

  function updateQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.key !== key) return line;
          const nextQty = line.quantity + delta;
          if (nextQty > line.maxStock) {
            toast.error(`Maximum available stock is ${line.maxStock}.`);
            return line;
          }
          return { ...line, quantity: nextQty };
        })
        .filter((line) => line.quantity > 0)
    );
  }

  function handleCheckoutSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) {
      toast.error("Please sign in first to place an order.");
      return;
    }
    if (cart.length === 0) return;

    startTransition(async () => {
      const result = await placeOrderAction({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        delivery_zone: deliveryZone,
        payment_method: paymentMethod,
        customer_note: customerNote,
        items: cart.map((line) => ({
          product_id: line.productId,
          variant_id: line.variantId,
          quantity: line.quantity,
        })),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Order placed successfully!");
      setCart([]);
      setCustomerNote("");
      setLastOrderSuccess(true);
      router.refresh();
    });
  }

  return (
    <>
      {/* Floating / Top Cart Bar */}
      <div className="mb-6 flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-xs">
        <div className="text-sm">
          <span className="font-medium text-foreground">
            {cartItemCount === 0
              ? "Your shopping bag is empty"
              : `${cartItemCount} item${cartItemCount === 1 ? "" : "s"} in your bag`}
          </span>
          {cartItemCount > 0 && (
            <span className="ml-2 font-semibold text-emerald-700">
              • Subtotal: {formatBDT(subtotal)}
            </span>
          )}
        </div>

        <Button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Cart &amp; Checkout ({cartItemCount})
        </Button>
      </div>

      {/* Product Cards Grid */}
      {products.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-2">
            <Package className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="font-medium text-foreground">
              No active products available
            </p>
            <p className="text-sm text-muted-foreground">
              Products marked as <strong>Active</strong> by a Manager or Admin in{" "}
              <code>/admin/products</code> will appear here immediately.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const activeVariants = (product.product_variants ?? [])
              .filter((v) => v.is_active)
              .sort((a, b) => a.display_order - b.display_order);

            const selectedVariantId =
              selectedVariants[product.id] ?? activeVariants[0]?.id ?? "";
            const chosenVariant =
              activeVariants.find((v) => v.id === selectedVariantId) ??
              activeVariants[0];

            const displayPrice = chosenVariant
              ? chosenVariant.sale_price !== null
                ? Number(chosenVariant.sale_price)
                : Number(chosenVariant.price)
              : product.sale_price !== null
                ? Number(product.sale_price)
                : Number(product.price);

            const regularPrice = chosenVariant
              ? Number(chosenVariant.price)
              : Number(product.price);

            const hasSale = displayPrice < regularPrice;
            const availableStock = chosenVariant
              ? chosenVariant.stock
              : product.stock;

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
                  {activeVariants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeVariants.map((variant) => {
                        const isSelected = variant.id === chosenVariant?.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() =>
                              setSelectedVariants((prev) => ({
                                ...prev,
                                [product.id]: variant.id,
                              }))
                            }
                            className={cn(
                              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                              isSelected
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-input bg-background hover:bg-accent"
                            )}
                          >
                            {variant.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-baseline justify-between">
                    {hasSale ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-emerald-700">
                          {formatBDT(displayPrice)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatBDT(regularPrice)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-foreground">
                        {formatBDT(displayPrice)}
                      </span>
                    )}

                    <Badge
                      variant="outline"
                      className={cn(
                        availableStock > 0
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      )}
                    >
                      {availableStock > 0
                        ? `In Stock (${availableStock})`
                        : "Out of Stock"}
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    disabled={availableStock <= 0}
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {availableStock > 0 ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Slide-Over Cart & Checkout Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2 font-semibold">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                <span>Your Aura Shop Cart ({cartItemCount})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {lastOrderSuccess && cart.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                  <h3 className="mt-3 text-lg font-bold text-emerald-950">
                    Order Confirmed!
                  </h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Your order has been placed and stock has been reserved. Staff
                    can now manage it inside <code>/admin/orders</code>.
                  </p>
                </div>
              ) : cart.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Your cart is empty. Add organic products from the catalog to
                  place an order.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Lines */}
                  <div className="space-y-3">
                    {cart.map((line) => (
                      <div
                        key={line.key}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {line.productName}
                          </p>
                          {line.variantName && (
                            <p className="text-xs text-muted-foreground">
                              Size: {line.variantName}
                            </p>
                          )}
                          <p className="text-xs font-semibold text-emerald-700">
                            {formatBDT(line.unitPrice)} × {line.quantity} ={" "}
                            {formatBDT(line.unitPrice * line.quantity)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(line.key, -1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-mono text-sm">
                            {line.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(line.key, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() =>
                              updateQuantity(line.key, -line.quantity)
                            }
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Checkout Form */}
                  {!profile ? (
                    <div className="rounded-lg border bg-muted/40 p-4 text-center">
                      <p className="text-sm font-medium">
                        Sign in to complete your order
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use <code>customer@aurashop.com</code> /{" "}
                        <code>Password123!</code> to test customer checkout.
                      </p>
                      <Link
                        href="/login"
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "mt-3 bg-emerald-600 text-white hover:bg-emerald-700"
                        )}
                      >
                        Go to Sign In
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="chk-name">Recipient Name *</Label>
                        <Input
                          id="chk-name"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="chk-email">Email *</Label>
                          <Input
                            id="chk-email"
                            type="email"
                            required
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="chk-phone">Phone *</Label>
                          <Input
                            id="chk-phone"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chk-address">Delivery Address *</Label>
                        <Textarea
                          id="chk-address"
                          rows={2}
                          required
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="chk-zone">Delivery Zone</Label>
                          <select
                            id="chk-zone"
                            value={deliveryZone}
                            onChange={(e) =>
                              setDeliveryZone(e.target.value as DeliveryZone)
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                          >
                            <option value="inside_dhaka">
                              Inside Dhaka (৳60)
                            </option>
                            <option value="outside_dhaka">
                              Outside Dhaka (৳120)
                            </option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="chk-pay">Payment Method</Label>
                          <select
                            id="chk-pay"
                            value={paymentMethod}
                            onChange={(e) =>
                              setPaymentMethod(e.target.value as PaymentMethod)
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                          >
                            <option value="cod">Cash on Delivery (COD)</option>
                            <option value="bkash">bKash</option>
                            <option value="nagad">Nagad</option>
                            <option value="card">Card</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chk-note">Delivery Note (Optional)</Label>
                        <Input
                          id="chk-note"
                          placeholder="e.g., Call upon arrival at gate"
                          value={customerNote}
                          onChange={(e) => setCustomerNote(e.target.value)}
                        />
                      </div>

                      {/* Order Totals */}
                      <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatBDT(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Delivery (Free over ৳2,000)
                          </span>
                          <span>
                            {deliveryCharge === 0
                              ? "Free (৳0)"
                              : formatBDT(deliveryCharge)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                          <span>Total (BDT)</span>
                          <span className="text-emerald-700">
                            {formatBDT(grandTotal)}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Placing Order...
                          </>
                        ) : (
                          `Place Order (${formatBDT(grandTotal)})`
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}