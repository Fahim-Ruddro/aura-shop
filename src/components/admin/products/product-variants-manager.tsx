"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from "@/actions/variants";
import { formatBDT } from "@/lib/format";
import {
  variantSchema,
  type VariantFormValues,
} from "@/lib/validations/catalog";
import type { ProductVariant } from "@/types/database";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductVariantsManagerProps {
  productId: string;
  productSlug: string;
  basePrice: number;
  variants: ProductVariant[];
}

export function ProductVariantsManager({
  productId,
  productSlug,
  basePrice,
  variants,
}: ProductVariantsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: basePrice > 0 ? basePrice : 100,
      sale_price: null,
      stock: 10,
      display_order: 1,
      is_active: true,
    },
  });

  const watchedIsActive = useWatch({ control, name: "is_active" });

  function buildSuggestedSku(sizeLabel: string) {
    const prefix = productSlug
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 6)
      .toUpperCase();
    const suffix = sizeLabel
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 6)
      .toUpperCase();
    return suffix ? `${prefix || "AURA"}-${suffix}` : prefix || "AURA-VAR";
  }

  function openAddDialog() {
    setEditingVariant(null);
    reset({
      name: "",
      sku: "",
      price: basePrice > 0 ? basePrice : 100,
      sale_price: null,
      stock: 10,
      display_order: variants.length + 1,
      is_active: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(variant: ProductVariant) {
    setEditingVariant(variant);
    reset({
      name: variant.name,
      sku: variant.sku,
      price: Number(variant.price),
      sale_price:
        variant.sale_price !== null ? Number(variant.sale_price) : null,
      stock: variant.stock,
      display_order: variant.display_order,
      is_active: variant.is_active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: VariantFormValues) {
    startTransition(async () => {
      const result = editingVariant
        ? await updateVariantAction(editingVariant.id, productId, values)
        : await createVariantAction(productId, values);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        editingVariant
          ? `Variant "${values.name}" updated.`
          : `Variant "${values.name}" added.`
      );
      setDialogOpen(false);
      router.refresh();
    });
  }

  function confirmDeleteVariant() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteVariantAction(deleteTarget.id, productId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Variant "${deleteTarget.name}" removed.`);
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              Sizes & Variants ({variants.length})
            </CardTitle>
            <CardDescription>
              Add pack sizes or weights (e.g., 250g, 500g, 1kg) with unique SKUs, BDT
              (৳) pricing, and per-size stock. Total product stock syncs automatically.
            </CardDescription>
          </div>

          <Button
            type="button"
            onClick={openAddDialog}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Size / Variant
          </Button>
        </CardHeader>

        <CardContent>
          {variants.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <Layers className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">
                No size variants yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This product currently uses its single base price and stock. Add variants
                if it comes in multiple pack sizes or weights.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size / Label</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price (BDT)</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => {
                    const hasSale =
                      variant.sale_price !== null &&
                      Number(variant.sale_price) < Number(variant.price);

                    return (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {variant.sku}
                        </TableCell>
                        <TableCell>
                          {hasSale ? (
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-emerald-700">
                                {formatBDT(variant.sale_price)}
                              </span>
                              <span className="text-xs text-muted-foreground line-through">
                                {formatBDT(variant.price)}
                              </span>
                            </div>
                          ) : (
                            <span>{formatBDT(variant.price)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{variant.stock}</span>
                            {variant.stock <= 5 && (
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                              >
                                Low
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {variant.is_active ? (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(variant)}
                              aria-label={`Edit ${variant.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteTarget(variant)}
                              aria-label={`Delete ${variant.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Variant Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? "Edit Product Variant" : "Add Product Size / Variant"}
            </DialogTitle>
            <DialogDescription>
              Each variant requires a unique SKU and its own BDT (৳) price and stock
              count.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="var-name">Size / Variant Label *</Label>
                <Input
                  id="var-name"
                  placeholder="e.g., 500g Jar"
                  {...register("name", {
                    onChange: (e) => {
                      if (!editingVariant) {
                        setValue("sku", buildSuggestedSku(e.target.value), {
                          shouldValidate: true,
                        });
                      }
                    },
                  })}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="var-sku">SKU (Unique) *</Label>
                <Input
                  id="var-sku"
                  placeholder="HNY-500G"
                  {...register("sku")}
                />
                {errors.sku && (
                  <p className="text-xs text-destructive">{errors.sku.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="var-price">Price (৳) *</Label>
                <Input
                  id="var-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="var-sale">Sale Price (৳)</Label>
                <Input
                  id="var-sale"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Optional"
                  {...register("sale_price", {
                    setValueAs: (val) =>
                      val === "" || val === null || Number.isNaN(Number(val))
                        ? null
                        : Number(val),
                  })}
                />
                {errors.sale_price && (
                  <p className="text-xs text-destructive">
                    {errors.sale_price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="var-stock">Stock *</Label>
                <Input
                  id="var-stock"
                  type="number"
                  min={0}
                  {...register("stock", { valueAsNumber: true })}
                />
                {errors.stock && (
                  <p className="text-xs text-destructive">{errors.stock.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="var-order">Display Order</Label>
                <Input
                  id="var-order"
                  type="number"
                  min={0}
                  {...register("display_order", { valueAsNumber: true })}
                />
                {errors.display_order && (
                  <p className="text-xs text-destructive">
                    {errors.display_order.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 sm:mt-6">
                <div>
                  <Label htmlFor="var-active" className="cursor-pointer">
                    {watchedIsActive ? "Active" : "Hidden"}
                  </Label>
                  <p className="text-xs text-muted-foreground">Selectable in shop</p>
                </div>
                <Switch
                  id="var-active"
                  checked={Boolean(watchedIsActive)}
                  onCheckedChange={(checked) => setValue("is_active", Boolean(checked))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
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
                    Saving...
                  </>
                ) : editingVariant ? (
                  "Save Variant"
                ) : (
                  "Add Variant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Variant Confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Variant</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong> (SKU:{" "}
              <code>{deleteTarget?.sku}</code>)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteVariant}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Variant"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}