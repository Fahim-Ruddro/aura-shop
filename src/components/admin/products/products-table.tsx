"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { archiveProductAction } from "@/actions/products";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Category,
  ProductStatus,
  ProductWithCategory,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ProductSortField = "name" | "price" | "stock" | "created_at";
export type SortDirection = "asc" | "desc";

interface ProductsTableProps {
  products: ProductWithCategory[];
  categories: Pick<Category, "id" | "name">[];
  totalCount: number;
  page: number;
  pageSize: number;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  sortField: ProductSortField;
  sortDir: SortDirection;
  canEdit: boolean;
}

const STATUS_BADGE_STYLES: Record<ProductStatus, string> = {
  active: "bg-emerald-600 text-white hover:bg-emerald-600",
  draft: "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-100",
  archived: "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-200",
};

export function ProductsTable({
  products,
  categories,
  totalCount,
  page,
  pageSize,
  searchQuery,
  categoryFilter,
  statusFilter,
  sortField,
  sortDir,
  canEdit,
}: ProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [archiveTarget, setArchiveTarget] = useState<ProductWithCategory | null>(
    null
  );

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function updateUrlParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(currentSearchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateUrlParams({ q: searchInput.trim() || null, page: "1" });
  }

  function handleSortToggle(field: "name" | "price" | "stock") {
    const nextDir: SortDirection =
      sortField === field && sortDir === "asc" ? "desc" : "asc";
    updateUrlParams({ sort: field, dir: nextDir, page: "1" });
  }

  function handleResetFilters() {
    setSearchInput("");
    router.push(pathname);
  }

  function confirmArchiveProduct() {
    if (!archiveTarget) return;

    startTransition(async () => {
      const result = await archiveProductAction(archiveTarget.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`"${archiveTarget.name}" has been archived and hidden from the shop.`);
      setArchiveTarget(null);
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<ProductWithCategory>[]>(() => {
    const baseColumns: ColumnDef<ProductWithCategory>[] = [
      {
        id: "image",
        header: "Image",
        cell: ({ row }) => {
          const product = row.original;
          return product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-11 w-11 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-md border bg-muted text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: () => (
          <button
            type="button"
            onClick={() => handleSortToggle("name")}
            className="inline-flex items-center gap-1.5 font-medium hover:text-foreground"
          >
            <span>Name</span>
            {sortField === "name" ? (
              sortDir === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div>
              <p className="font-medium text-foreground">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {product.brand} • {product.country_of_origin}
              </p>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.categories?.name ?? "Uncategorized"}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: () => (
          <button
            type="button"
            onClick={() => handleSortToggle("price")}
            className="inline-flex items-center gap-1.5 font-medium hover:text-foreground"
          >
            <span>Price</span>
            {sortField === "price" ? (
              sortDir === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const product = row.original;
          const hasSale =
            product.sale_price !== null && Number(product.sale_price) < Number(product.price);

          return hasSale ? (
            <div>
              <p className="font-semibold text-emerald-700">
                {formatBDT(product.sale_price)}
              </p>
              <p className="text-xs text-muted-foreground line-through">
                {formatBDT(product.price)}
              </p>
            </div>
          ) : (
            <span className="font-medium">{formatBDT(product.price)}</span>
          );
        },
      },
      {
        accessorKey: "stock",
        header: () => (
          <button
            type="button"
            onClick={() => handleSortToggle("stock")}
            className="inline-flex items-center gap-1.5 font-medium hover:text-foreground"
          >
            <span>Stock</span>
            {sortField === "stock" ? (
              sortDir === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const stock = row.original.stock;
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{stock}</span>
              {stock <= 5 && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800">
                  Low
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge className={cn("capitalize", STATUS_BADGE_STYLES[status])}>
              {status}
            </Badge>
          );
        },
      },
    ];

    if (canEdit) {
      baseColumns.push({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex justify-end gap-2">
              <Link
                href={`/admin/products/${product.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
                aria-label={`Edit ${product.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
              {product.status !== "archived" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-amber-700 hover:bg-amber-50 hover:text-amber-900"
                  onClick={() => setArchiveTarget(product)}
                  aria-label={`Archive ${product.name}`}
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      });
    }

    return baseColumns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, sortField, sortDir]);

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasActiveFilters = Boolean(
    searchQuery || categoryFilter || statusFilter || sortField !== "created_at"
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              Product Catalog ({totalCount})
            </CardTitle>
            <CardDescription>
              Only <strong>active</strong> products in active categories appear on the
              customer storefront.
            </CardDescription>
          </div>

          {canEdit && (
            <Link
              href="/admin/products/new"
              className={cn(
                buttonVariants(),
                "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search & Filters Bar (Synced with URL) */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products by name..."
                  aria-label="Search products by name"
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by category"
                value={categoryFilter || "all"}
                onChange={(e) =>
                  updateUrlParams({
                    category: e.target.value === "all" ? null : e.target.value,
                    page: "1",
                  })
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by status"
                value={statusFilter || "all"}
                onChange={(e) =>
                  updateUrlParams({
                    status: e.target.value === "all" ? null : e.target.value,
                    page: "1",
                  })
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* TanStack Table */}
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Package className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 font-medium text-foreground">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "No products match your current search or filter settings."
                  : "Add your first Aura Shop product to start building your catalog."}
              </p>
              {canEdit && !hasActiveFilters && (
                <Link
                  href="/admin/products/new"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
                  )}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Product
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* URL-Synced Pagination Controls */}
              <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  <strong className="text-foreground">
                    {(page - 1) * pageSize + 1}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-foreground">
                    {Math.min(page * pageSize, totalCount)}
                  </strong>{" "}
                  of <strong className="text-foreground">{totalCount}</strong> products
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => updateUrlParams({ page: String(page - 1) })}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-xs font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => updateUrlParams({ page: String(page + 1) })}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Archive Confirmation Dialog */}
      <Dialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive{" "}
              <strong className="text-foreground">{archiveTarget?.name}</strong>?
              Archived products are hidden from the customer shop immediately, while past
              customer orders remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setArchiveTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={confirmArchiveProduct}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Confirm Archive"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}