import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Mail, Phone, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order, Profile } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ORDER_STATUS_STYLES,
  PAYMENT_STATUS_STYLES,
} from "@/components/admin/orders/orders-table";
import { CustomerBlockToggle } from "@/components/admin/customers/customer-block-toggle";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;
  const actor = await requireAdminPageAccess("customers");
  const canEdit = canWriteSection(actor.role, "customers");

  const supabase = await createClient();

  const [{ data: customerData }, { data: ordersData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customerData) {
    notFound();
  }

  const customer = customerData as Profile;
  const orders = (ordersData ?? []) as Order[];

  const nonCancelledOrders = orders.filter(
    (o) => o.status !== "cancelled" && o.status !== "returned"
  );
  const totalSpent = nonCancelledOrders.reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/customers"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All Customers
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.full_name || customer.email}
              </h1>
              {customer.is_blocked ? (
                <Badge variant="destructive">Blocked</Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Joined{" "}
              {new Date(customer.created_at).toLocaleDateString("en-BD", {
                dateStyle: "long",
              })}
            </p>
          </div>
        </div>

        {canEdit && customer.role === "customer" && (
          <CustomerBlockToggle
            customerId={customer.id}
            customerLabel={customer.full_name || customer.email}
            isBlocked={customer.is_blocked}
          />
        )}
      </div>

      {/* Customer Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contact Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {customer.email}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {customer.phone || "No phone on file"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-2xl">{orders.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {nonCancelledOrders.length} active/completed orders
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lifetime Spend (BDT)</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">
              {formatBDT(totalSpent)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Excludes cancelled &amp; returned orders
          </CardContent>
        </Card>
      </div>

      {/* Customer Order History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            Order History ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This customer has not placed any orders yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total (BDT)</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((ord) => (
                    <TableRow key={ord.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {ord.order_number}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(ord.created_at).toLocaleString("en-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatBDT(ord.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            PAYMENT_STATUS_STYLES[ord.payment_status]
                          )}
                        >
                          {ord.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "capitalize",
                            ORDER_STATUS_STYLES[ord.status]
                          )}
                        >
                          {ord.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View Order
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}