"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDownUp,
  History,
  Loader2,
  PackageCheck,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { adjustStockAction } from "@/actions/inventory";
import { cn } from "@/lib/utils";
import {
  stockAdjustmentSchema,
  type StockAdjustmentValues,
} from "@/lib/validations/catalog";
import type {
  ProductWithCategory,
  StockMovementType,
  StockMovementWithDetails,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface InventoryRow {
  key: string;
  productId: string;
  variantId: string | null;
  productName: string;
  categoryName: string;
  variantLabel: string;
  sku: string;
  stock: number;
  status: string;
}

interface InventoryManagerProps {
  products: ProductWithCategory[];
  movements: StockMovementWithDetails[];
  canAdjust: boolean;
}

const LOW_STOCK_THRESHOLD = 5;

const MOVEMENT_BADGES: Record<StockMovementType, string> = {
  restock: "bg-emerald-600 text-white hover:bg-emerald-600",
  return: "bg-sky-600 text-white hover:bg-sky-600",
  correction: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  damage: "bg-rose-600 text-white hover:bg-rose-600",
  order: "bg-amber-600 text-white hover:bg-amber-600",
};

export function InventoryManager({
  products,
  movements,
  canAdjust,
}: InventoryManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  // Flatten products + variants into trackable stock rows
  const inventoryRows = useMemo<InventoryRow[]>(() => {
    const rows: InventoryRow[] = [];

    for (const product of products) {
      const variants = product.product_variants ?? [];
      if (variants.length > 0) {
        for (const variant of variants) {
          rows.push({
            key: `${product.id}-${variant.id}`,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            categoryName: product.categories?.name ?? "Uncategorized",
            variantLabel: variant.name,
            sku: variant.sku,
            stock: variant.stock,
            status: product.status,
          });
        }
      } else {
        rows.push({
          key: product.id,
          productId: product.id,
          variantId: null,
          productName: product.name,
          categoryName: product.categories?.name ?? "Uncategorized",
          variantLabel: "Standard (No variants)",
          sku: product.slug.toUpperCase(),
          stock: product.stock,
          status: product.status,
        });
      }
    }

    return rows;
  }, [products]);

  const lowStockCount = useMemo(
    () =>
      inventoryRows.filter(
        (r) => r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD
      ).length,
    [inventoryRows]
  );

  const outOfStockCount = useMemo(
    () => inventoryRows.filter((r) => r.stock === 0).length,
    [inventoryRows]
  );

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return inventoryRows.filter((row) => {
      if (stockFilter === "low" && (row.stock === 0 || row.stock > LOW_STOCK_THRESHOLD)) {
        return false;
      }
      if (stockFilter === "out" && row.stock !== 0) {
        return false;
      }
      if (!q) return true;
      return (
        row.productName.toLowerCase().includes(q) ||
        row.variantLabel.toLowerCase().includes(q) ||
        row.sku.toLowerCase().includes(q)
      );
    });
  }, [inventoryRows, searchTerm, stockFilter]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<StockAdjustmentValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      product_id: products[0]?.id ?? "",
      variant_id: products[0]?.product_variants?.[0]?.id ?? null,
      movement_type: "restock",
      quantity_change: 10,
      reason: "",
    },
  });

  const selectedProductId = useWatch({ control, name: "product_id" });
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );
  const availableVariants = selectedProduct?.product_variants ?? [];

  function openAdjustmentDialog(row?: InventoryRow) {
    if (row) {
      reset({
        product_id: row.productId,
        variant_id: row.variantId,
        movement_type: "restock",
        quantity_change: 10,
        reason: "",
      });
    } else {
      const firstProduct = products[0];
      reset({
        product_id: firstProduct?.id ?? "",
        variant_id: firstProduct?.product_variants?.[0]?.id ?? null,
        movement_type: "restock",
        quantity_change: 10,
        reason: "",
      });
    }
    setAdjustDialogOpen(true);
  }

  function onSubmitAdjustment(values: StockAdjustmentValues) {
    startTransition(async () => {
      const result = await adjustStockAction(values);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Stock adjusted and movement logged.");
      setAdjustDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* KPI Summary Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked Stock Items</CardDescription>
            <CardTitle className="text-2xl">{inventoryRows.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across {products.length} catalog products
          </CardContent>
        </Card>

        <Card className={lowStockCount > 0 ? "border-amber-300" : undefined}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Low Stock (1–{LOW_STOCK_THRESHOLD} units)
            </CardDescription>
            <CardTitle className="text-2xl text-amber-700">{lowStockCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Needs restocking soon
          </CardContent>
        </Card>

        <Card className={outOfStockCount > 0 ? "border-destructive/40" : undefined}>
          <CardHeader className="pb-2">
            <CardDescription className="text-destructive">
              Out of Stock (0 units)
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {outOfStockCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Unavailable until restocked
          </CardContent>
        </Card>
      </div>

      {/* Current Stock Levels Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              Current Stock Levels
            </CardTitle>
            <CardDescription>
              Every stock change requires a logged movement type and written reason.
            </CardDescription>
          </div>

          {canAdjust && products.length > 0 && (
            <Button
              type="button"
              onClick={() => openAdjustmentDialog()}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <ArrowDownUp className="mr-2 h-4 w-4" />
              Adjust Stock
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, size variant, or SKU..."
                aria-label="Search inventory"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={stockFilter === "all" ? "default" : "outline"}
                onClick={() => setStockFilter("all")}
              >
                All ({inventoryRows.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={stockFilter === "low" ? "default" : "outline"}
                onClick={() => setStockFilter("low")}
              >
                Low Stock ({lowStockCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={stockFilter === "out" ? "default" : "outline"}
                onClick={() => setStockFilter("out")}
              >
                Out of Stock ({outOfStockCount})
              </Button>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No inventory items match your current filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant / Size</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Available Stock</TableHead>
                    <TableHead>Alert Status</TableHead>
                    {canAdjust && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <p className="font-medium text-foreground">{row.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.categoryName}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{row.variantLabel}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.sku}
                      </TableCell>
                      <TableCell className="font-mono text-base font-semibold">
                        {row.stock}
                      </TableCell>
                      <TableCell>
                        {row.stock === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : row.stock <= LOW_STOCK_THRESHOLD ? (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-800"
                          >
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            Healthy
                          </Badge>
                        )}
                      </TableCell>
                      {canAdjust && (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAdjustmentDialog(row)}
                          >
                            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                            Adjust
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Movements Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            Stock Movements History ({movements.length})
          </CardTitle>
          <CardDescription>
            Immutable audit log of restocks, damage write-offs, corrections, returns, and
            order deductions.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {movements.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No stock movements logged yet. Click <strong>Adjust Stock</strong> above to
              record a restock or adjustment.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Product & Variant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Stock Before → After</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(mov.created_at).toLocaleString("en-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {mov.products?.name ?? "Unknown Product"}
                        </p>
                        {mov.product_variants && (
                          <p className="font-mono text-xs text-muted-foreground">
                            {mov.product_variants.name} ({mov.product_variants.sku})
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "capitalize",
                            MOVEMENT_BADGES[mov.movement_type]
                          )}
                        >
                          {mov.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-mono font-semibold",
                          mov.quantity_change > 0
                            ? "text-emerald-700"
                            : "text-destructive"
                        )}
                      >
                        {mov.quantity_change > 0
                          ? `+${mov.quantity_change}`
                          : mov.quantity_change}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {mov.previous_stock} → <strong>{mov.new_stock}</strong>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-foreground">
                        {mov.reason}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {mov.profiles?.full_name || mov.profiles?.email || "System"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Stock Adjustment</DialogTitle>
            <DialogDescription>
              Use positive numbers (e.g., <code>20</code>) to add stock or negative
              numbers (e.g., <code>-3</code>) to deduct stock. Negative final stock is
              blocked.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitAdjustment)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adj-product">Product *</Label>
              <select
                id="adj-product"
                {...register("product_id", {
                  onChange: (e) => {
                    const nextProd = products.find((p) => p.id === e.target.value);
                    setValue(
                      "variant_id",
                      nextProd?.product_variants?.[0]?.id ?? null
                    );
                  },
                })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name}
                  </option>
                ))}
              </select>
              {errors.product_id && (
                <p className="text-xs text-destructive">{errors.product_id.message}</p>
              )}
            </div>

            {availableVariants.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="adj-variant">Size / Variant *</Label>
                <select
                  id="adj-variant"
                  {...register("variant_id")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {availableVariants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} ({variant.sku}) — Current: {variant.stock}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adj-type">Movement Type *</Label>
                <select
                  id="adj-type"
                  {...register("movement_type")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="restock">Restock (+)</option>
                  <option value="return">Customer Return (+)</option>
                  <option value="correction">Stock Count Correction (+/-)</option>
                  <option value="damage">Damaged / Expired (-)</option>
                </select>
                {errors.movement_type && (
                  <p className="text-xs text-destructive">
                    {errors.movement_type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adj-qty">Quantity Change *</Label>
                <Input
                  id="adj-qty"
                  type="number"
                  placeholder="e.g., 25 or -2"
                  {...register("quantity_change", { valueAsNumber: true })}
                />
                {errors.quantity_change && (
                  <p className="text-xs text-destructive">
                    {errors.quantity_change.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adj-reason">Reason / Reference Note *</Label>
              <Textarea
                id="adj-reason"
                rows={3}
                placeholder="e.g., Received fresh batch #42 from Sundarbans supplier"
                {...register("reason")}
              />
              {errors.reason && (
                <p className="text-xs text-destructive">{errors.reason.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Save Stock Movement"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}