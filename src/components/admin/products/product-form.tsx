"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadShopImageAction } from "@/actions/media";
import { createProductAction, updateProductAction } from "@/actions/products";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  productSchema,
  type ProductFormValues,
} from "@/lib/validations/catalog";
import type { Category, Product } from "@/types/database";
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

interface ProductFormProps {
  mode: "create" | "edit";
  categories: Pick<Category, "id" | "name">[];
  initialProduct?: Product;
}

export function ProductForm({
  mode,
  categories,
  initialProduct,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === "edit");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialProduct?.name ?? "",
      slug: initialProduct?.slug ?? "",
      short_description: initialProduct?.short_description ?? "",
      full_description: initialProduct?.full_description ?? "",
      category_id: initialProduct?.category_id ?? categories[0]?.id ?? "",
      brand: initialProduct?.brand ?? "Aura Shop",
      country_of_origin: initialProduct?.country_of_origin ?? "Bangladesh",
      price: initialProduct ? Number(initialProduct.price) : 0,
      sale_price:
        initialProduct?.sale_price !== null &&
        initialProduct?.sale_price !== undefined
          ? Number(initialProduct.sale_price)
          : null,
      stock: initialProduct?.stock ?? 10,
      image_url: initialProduct?.image_url ?? "",
      status: initialProduct?.status ?? "active",
      tags_input: initialProduct?.tags?.join(", ") ?? "",
    },
  });

  const watchedImageUrl = watch("image_url");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "products");

      const result = await uploadShopImageAction(fd);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        setValue("image_url", result.url, { shouldValidate: true });
        toast.success("Product image uploaded.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onSubmit(values: ProductFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialProduct
          ? await updateProductAction(initialProduct.id, values)
          : await createProductAction(values);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "edit"
          ? `Product "${values.name}" updated.`
          : `Product "${values.name}" created.`
      );
      router.push("/admin/products");
      router.refresh();
    });
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create a Category First</CardTitle>
          <CardDescription>
            Every product must belong to a category. Please create at least one category
            before adding products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/categories"
            className={cn(
              buttonVariants(),
              "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            Go to Categories
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/products"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Products
        </Link>

        <Button
          type="submit"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={isPending || isUploading}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Product...
            </>
          ) : mode === "edit" ? (
            "Save Product Changes"
          ) : (
            "Create Product"
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Core Product Details */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Product title, URL slug, descriptions, and provenance details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prod-name">Product Name *</Label>
                  <Input
                    id="prod-name"
                    placeholder="e.g., Sundarbans Raw Forest Honey"
                    {...register("name", {
                      onChange: (e) => {
                        if (!slugManuallyEdited) {
                          setValue("slug", slugify(e.target.value), {
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
                  <Label htmlFor="prod-slug">URL Slug *</Label>
                  <Input
                    id="prod-slug"
                    placeholder="sundarbans-raw-forest-honey"
                    {...register("slug", {
                      onChange: () => setSlugManuallyEdited(true),
                    })}
                  />
                  {errors.slug && (
                    <p className="text-xs text-destructive">{errors.slug.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-short-desc">Short Description *</Label>
                <Input
                  id="prod-short-desc"
                  placeholder="Pure unfiltered multiflora honey harvested from the Sundarbans."
                  {...register("short_description")}
                />
                {errors.short_description && (
                  <p className="text-xs text-destructive">
                    {errors.short_description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-full-desc">Full Description</Label>
                <Textarea
                  id="prod-full-desc"
                  rows={5}
                  placeholder="Detailed sourcing story, nutritional highlights, and storage instructions..."
                  {...register("full_description")}
                />
                {errors.full_description && (
                  <p className="text-xs text-destructive">
                    {errors.full_description.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prod-brand">Brand *</Label>
                  <Input
                    id="prod-brand"
                    placeholder="Aura Shop"
                    {...register("brand")}
                  />
                  {errors.brand && (
                    <p className="text-xs text-destructive">{errors.brand.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-origin">Country of Origin *</Label>
                  <Input
                    id="prod-origin"
                    placeholder="Bangladesh"
                    {...register("country_of_origin")}
                  />
                  {errors.country_of_origin && (
                    <p className="text-xs text-destructive">
                      {errors.country_of_origin.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Stock (BDT ৳)</CardTitle>
              <CardDescription>
                Set regular price, optional discounted sale price, and available units.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="prod-price">Regular Price (৳) *</Label>
                <Input
                  id="prod-price"
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
                <Label htmlFor="prod-sale-price">Sale Price (৳, optional)</Label>
                <Input
                  id="prod-sale-price"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Leave empty if none"
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
                <Label htmlFor="prod-stock">Stock Quantity *</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  min={0}
                  {...register("stock", { valueAsNumber: true })}
                />
                {errors.stock && (
                  <p className="text-xs text-destructive">{errors.stock.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Organization, Image & Tags */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prod-category">Category *</Label>
                <select
                  id="prod-category"
                  {...register("category_id")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="text-xs text-destructive">
                    {errors.category_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-status">Visibility Status *</Label>
                <select
                  id="prod-status"
                  {...register("status")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">Active (Visible on shop)</option>
                  <option value="draft">Draft (Hidden from shop)</option>
                  <option value="archived">Archived (Hidden from shop)</option>
                </select>
                {errors.status && (
                  <p className="text-xs text-destructive">{errors.status.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-tags">Tags (comma-separated)</Label>
                <Input
                  id="prod-tags"
                  placeholder="organic, raw, sundarbans, honey"
                  {...register("tags_input")}
                />
                {errors.tags_input && (
                  <p className="text-xs text-destructive">
                    {errors.tags_input.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
              <CardDescription>
                Upload JPG, PNG, or WebP (max 2 MB) or paste an image URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  id="prod-image-url"
                  placeholder="https://..."
                  {...register("image_url")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload product image"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.image_url && (
                <p className="text-xs text-destructive">{errors.image_url.message}</p>
              )}

              {watchedImageUrl && (
                <img
                  src={watchedImageUrl}
                  alt="Product preview"
                  className="h-40 w-full rounded-md border object-cover"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}