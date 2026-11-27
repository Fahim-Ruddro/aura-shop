"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  OrderStatus,
  OrderWithItemCount,
  PaymentStatus,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrdersTableProps {
  orders: OrderWithItemCount[];
  totalCount: number;
  page: number;
  pageSize: number;
  searchQuery: string;
  statusFilter: string;
  paymentFilter: string;
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-100",
  confirmed: "bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-100",
  processing: "bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-100",
  shipped: "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-100",
  delivered: "bg-emerald-600 text-white hover:bg-emerald-600",
  cancelled: "bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-100",
  returned: "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-200",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  unpaid: "border-amber-300 bg-amber-50 text-amber-800",
  paid: "border-emerald-300 bg-emerald-50 text-emerald-800",
  refunded: "border-slate-300 bg-slate-100 text-slate-700",
};

export function OrdersTable({
  orders,
  totalCount,
  page,
  pageSize,
  searchQuery,
  statusFilter,
  paymentFilter,
}: OrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchQuery);

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

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateUrlParams({ q: searchInput.trim() || null, page: "1" });
  }

  function handleReset() {
    setSearchInput("");
    router.push(pathname);
  }

  const hasFilters = Boolean(searchQuery || statusFilter || paymentFilter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-emerald-600" />
          Customer Orders ({totalCount})
        </CardTitle>
        <CardDescription>
          Filter by fulfillment status or payment state, inspect timelines, update
          status, and print customer invoices.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search & Filter Controls (URL-Synced) */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by order #, customer name, phone, or email..."
                aria-label="Search orders"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by order status"
              value={statusFilter || "all"}
              onChange={(e) =>
                updateUrlParams({
                  status: e.target.value === "all" ? null : e.target.value,
                  page: "1",
                })
              }
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>

            <select
              aria-label="Filter by payment status"
              value={paymentFilter || "all"}
              onChange={(e) =>
                updateUrlParams({
                  payment: e.target.value === "all" ? null : e.target.value,
                  page: "1",
                })
              }
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Payment States</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 font-medium text-foreground">No orders found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters
                ? "No orders match your current search or filter criteria."
                : "Orders placed by customers on the Aura Shop storefront will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total (BDT)</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const totalUnits = (order.order_items ?? []).reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    );

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString("en-BD", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {order.customer_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.customer_phone}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {totalUnits} {totalUnits === 1 ? "item" : "items"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatBDT(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "w-fit capitalize",
                                PAYMENT_STATUS_STYLES[order.payment_status]
                              )}
                            >
                              {order.payment_status}
                            </Badge>
                            <span className="text-[11px] uppercase text-muted-foreground">
                              {order.payment_method}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "capitalize",
                              ORDER_STATUS_STYLES[order.status]
                            )}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Manage
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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
                of <strong className="text-foreground">{totalCount}</strong> orders
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
  );
}