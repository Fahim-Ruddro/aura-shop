"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Package,
  Printer,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  addInternalOrderNoteAction,
  transitionOrderStatusAction,
  updateOrderPaymentStatusAction,
} from "@/actions/orders";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAllowedNextStatuses } from "@/lib/validations/orders";
import type {
  OrderFullDetails,
  OrderStatus,
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
import {
  ORDER_STATUS_STYLES,
  PAYMENT_STATUS_STYLES,
} from "./orders-table";

interface OrderDetailClientProps {
  order: OrderFullDetails;
  canUpdate: boolean;
}

export function OrderDetailClient({ order, canUpdate }: OrderDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const allowedNextStatuses = getAllowedNextStatuses(order.status);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">(
    allowedNextStatuses[0] ?? ""
  );
  const [statusNote, setStatusNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order.payment_status
  );
  const [internalNote, setInternalNote] = useState("");

  function handleStatusTransition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedStatus) return;

    startTransition(async () => {
      const result = await transitionOrderStatusAction(
        order.id,
        selectedStatus,
        statusNote
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        selectedStatus === "cancelled" || selectedStatus === "returned"
          ? `Order marked as ${selectedStatus} and item stock restored automatically.`
          : `Order status updated to ${selectedStatus}.`
      );
      setStatusNote("");
      router.refresh();
    });
  }

  function handlePaymentStatusSave() {
    startTransition(async () => {
      const result = await updateOrderPaymentStatusAction(
        order.id,
        paymentStatus
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Payment status updated to ${paymentStatus}.`);
      router.refresh();
    });
  }

  function handleAddInternalNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!internalNote.trim()) return;

    startTransition(async () => {
      const result = await addInternalOrderNoteAction(order.id, internalNote);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Internal staff note added.");
      setInternalNote("");
      router.refresh();
    });
  }

  const willRestoreStock =
    selectedStatus === "cancelled" || selectedStatus === "returned";

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All Orders
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold tracking-tight sm:text-2xl">
                {order.order_number}
              </h1>
              <Badge
                className={cn("capitalize", ORDER_STATUS_STYLES[order.status])}
              >
                {order.status}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  PAYMENT_STATUS_STYLES[order.payment_status]
                )}
              >
                Payment: {order.payment_status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Placed on{" "}
              {new Date(order.created_at).toLocaleString("en-BD", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <Link
          href={`/admin/orders/${order.id}/invoice`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Printer className="mr-1.5 h-4 w-4" />
          Printable Invoice
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Ordered Items, Status Timeline & Internal Staff Notes */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items & Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                Order Items ({order.order_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.order_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {item.product_name}
                          </p>
                          {item.variant_name && (
                            <p className="text-xs text-muted-foreground">
                              Size: {item.variant_name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.sku || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBDT(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBDT(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatBDT(order.subtotal)}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>
                      Discount {order.coupon_code ? `(${order.coupon_code})` : ""}
                    </span>
                    <span>-{formatBDT(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Delivery (
                    {order.delivery_zone === "outside_dhaka"
                      ? "Outside Dhaka"
                      : "Inside Dhaka"}
                    )
                  </span>
                  <span>
                    {Number(order.delivery_charge) === 0
                      ? "Free"
                      : formatBDT(order.delivery_charge)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold text-foreground">
                  <span>Grand Total</span>
                  <span>{formatBDT(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                Order Status Timeline
              </CardTitle>
              <CardDescription>
                Chronological history of every status change on this order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.order_status_history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No timeline entries recorded.
                </p>
              ) : (
                <ol className="relative ml-3 space-y-5 border-l border-border pl-6">
                  {order.order_status_history.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-7.75 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "capitalize",
                            ORDER_STATUS_STYLES[entry.to_status]
                          )}
                        >
                          {entry.to_status}
                        </Badge>
                        {entry.from_status && (
                          <span className="text-xs text-muted-foreground">
                            from <span className="capitalize">{entry.from_status}</span>
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          •{" "}
                          {new Date(entry.created_at).toLocaleString("en-BD", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="mt-1 text-sm text-foreground">{entry.note}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        By:{" "}
                        {entry.profiles?.full_name ||
                          entry.profiles?.email ||
                          "Customer / System"}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Internal Staff Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Internal Staff Notes ({order.order_notes.length})
              </CardTitle>
              <CardDescription>
                Private notes visible only to Aura Shop staff, managers, and admins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdate && (
                <form onSubmit={handleAddInternalNote} className="space-y-2">
                  <Label htmlFor="staff-note">Add Internal Note</Label>
                  <Textarea
                    id="staff-note"
                    rows={2}
                    placeholder="e.g., Called customer to confirm delivery landmark..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !internalNote.trim()}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                    Save Note
                  </Button>
                </form>
              )}

              {order.order_notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No internal notes yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {order.order_notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border bg-muted/40 p-3 text-sm"
                    >
                      <p className="text-foreground">{n.note}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.profiles?.full_name || n.profiles?.email || "Staff"} •{" "}
                        {new Date(n.created_at).toLocaleString("en-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Status Transition Box, Payment Box & Customer Details */}
        <div className="space-y-6">
          {/* Update Fulfillment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Update Order Status</CardTitle>
              <CardDescription>
                Only valid next workflow transitions are permitted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!canUpdate ? (
                <p className="text-sm text-muted-foreground">
                  Your account has read-only access.
                </p>
              ) : allowedNextStatuses.length === 0 ? (
                <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                  This order is in a final state (
                  <strong className="capitalize text-foreground">
                    {order.status}
                  </strong>
                  ) and cannot be transitioned further.
                </div>
              ) : (
                <form onSubmit={handleStatusTransition} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="next-status">Next Status</Label>
                    <select
                      id="next-status"
                      value={selectedStatus}
                      onChange={(e) =>
                        setSelectedStatus(e.target.value as OrderStatus)
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm capitalize shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {allowedNextStatuses.map((st) => (
                        <option key={st} value={st} className="capitalize">
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {willRestoreStock && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <p>
                        Moving to <strong className="capitalize">{selectedStatus}</strong>{" "}
                        will automatically restore all item quantities back to inventory
                        and log a <code>return</code> stock movement.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="status-note">Timeline Note (Optional)</Label>
                    <Textarea
                      id="status-note"
                      rows={2}
                      placeholder="e.g., Dispatched via Pathao Courier..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending || !selectedStatus}
                    className={cn(
                      "w-full text-white",
                      willRestoreStock
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      `Mark as ${selectedStatus}`
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium uppercase">{order.payment_method}</span>
              </div>

              {canUpdate && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="pay-status">Payment Status</Label>
                  <div className="flex gap-2">
                    <select
                      id="pay-status"
                      value={paymentStatus}
                      onChange={(e) =>
                        setPaymentStatus(e.target.value as PaymentStatus)
                      }
                      className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm capitalize shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending || paymentStatus === order.payment_status}
                      onClick={handlePaymentStatusSave}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer & Shipping Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-emerald-600" />
                Customer &amp; Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{order.customer_name}</p>
                <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                {order.customer_id && (
                  <Link
                    href={`/admin/customers/${order.customer_id}`}
                    className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline"
                  >
                    View Customer Profile →
                  </Link>
                )}
              </div>

              <div className="border-t pt-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Shipping Address (
                  {order.delivery_zone === "outside_dhaka"
                    ? "Outside Dhaka"
                    : "Inside Dhaka"}
                  )
                </p>
                <p className="mt-1 text-foreground">{order.shipping_address}</p>
              </div>

              {order.customer_note && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Customer Delivery Note
                  </p>
                  <p className="mt-1 text-foreground">{order.customer_note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}