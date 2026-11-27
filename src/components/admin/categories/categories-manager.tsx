"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  FolderTree,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/actions/categories";
import { uploadShopImageAction } from "@/actions/media";
import { slugify } from "@/lib/format";
import {
  categorySchema,
  type CategoryFormValues,
} from "@/lib/validations/catalog";
import type { CategoryWithCount } from "@/types/database";
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
import { Textarea } from "@/components/ui/textarea";

interface CategoriesManagerProps {
  categories: CategoryWithCount[];
  canEdit: boolean;
}

export function CategoriesManager({ categories, canEdit }: CategoriesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      image_url: "",
      display_order: 0,
      is_active: true,
    },
  });

  const watchedImageUrl = watch("image_url");
  const watchedIsActive = watch("is_active");

  function openCreateDialog() {
    setEditingCategory(null);
    setSlugManuallyEdited(false);
    reset({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      display_order: categories.length + 1,
      is_active: true,
    });
    setFormOpen(true);
  }

  function openEditDialog(category: CategoryWithCount) {
    setEditingCategory(category);
    setSlugManuallyEdited(true);
    reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setFormOpen(true);
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "categories");

      const result = await uploadShopImageAction(fd);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        setValue("image_url", result.url, { shouldValidate: true });
        toast.success("Category image uploaded.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      const result = editingCategory
        ? await updateCategoryAction(editingCategory.id, values)
        : await createCategoryAction(values);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        editingCategory
          ? `Category "${values.name}" updated.`
          : `Category "${values.name}" created.`
      );
      setFormOpen(false);
      router.refresh();
    });
  }

  function confirmDeleteCategory() {
    if (!deleteTarget) return;
    setDeleteError(null);

    startTransition(async () => {
      const result = await deleteCategoryAction(deleteTarget.id);
      if (result.error) {
        setDeleteError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(`Category "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-emerald-600" />
              All Categories ({categories.length})
            </CardTitle>
            <CardDescription>
              Categories with assigned products cannot be deleted until their products are
              reassigned.
            </CardDescription>
          </div>

          {canEdit && (
            <Button
              onClick={openCreateDialog}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {categories.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <FolderTree className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 font-medium text-foreground">No categories yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first specialty grocery category (e.g., Raw Honey, Cold-Pressed
                Oils, Organic Rice).
              </p>
              {canEdit && (
                <Button
                  onClick={openCreateDialog}
                  size="sm"
                  className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Category
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Name & Slug</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-center">Order</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="h-10 w-10 rounded-md border object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{category.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          /{category.slug}
                        </p>
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground md:table-cell">
                        {category.description || "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {category.display_order}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{category.product_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {category.is_active ? (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(category)}
                              aria-label={`Edit ${category.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(category);
                              }}
                              aria-label={`Delete ${category.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Add / Edit Category Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              Configure category details, URL slug, display order, and storefront
              visibility.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                placeholder="e.g., Raw Forest Honey"
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
              <Label htmlFor="cat-slug">URL Slug * (auto-generated, editable)</Label>
              <Input
                id="cat-slug"
                placeholder="raw-forest-honey"
                {...register("slug", {
                  onChange: () => setSlugManuallyEdited(true),
                })}
              />
              {errors.slug && (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                rows={3}
                placeholder="Short overview of products in this category..."
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-image-url">Category Image (Upload or URL)</Label>
              <div className="flex gap-2">
                <Input
                  id="cat-image-url"
                  placeholder="https://..."
                  {...register("image_url")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or WebP up to 2 MB.
              </p>
              {errors.image_url && (
                <p className="text-xs text-destructive">{errors.image_url.message}</p>
              )}
              {watchedImageUrl && (
                <img
                  src={watchedImageUrl}
                  alt="Category preview"
                  className="mt-2 h-20 w-20 rounded-md border object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cat-order">Display Order</Label>
                <Input
                  id="cat-order"
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
                  <Label htmlFor="cat-active" className="cursor-pointer">
                    {watchedIsActive ? "Active (Visible)" : "Hidden"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show on customer shop
                  </p>
                </div>
                <Switch
                  id="cat-active"
                  checked={watchedIsActive}
                  onCheckedChange={(checked) => setValue("is_active", Boolean(checked))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={isPending || isUploading}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingCategory ? (
                  "Save Changes"
                ) : (
                  "Create Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation / Blocked Warning Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && deleteTarget.product_count > 0 && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Category Cannot Be Deleted</p>
                <p>
                  This category still has{" "}
                  <strong>
                    {deleteTarget.product_count} product
                    {deleteTarget.product_count === 1 ? "" : "s"}
                  </strong>
                  . Move or archive/reassign those products before deleting this category.
                </p>
              </div>
            </div>
          )}

          {deleteError && deleteTarget?.product_count === 0 && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{deleteError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={isPending}
            >
              Close
            </Button>
            {deleteTarget && deleteTarget.product_count === 0 && (
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteCategory}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}