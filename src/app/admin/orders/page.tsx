import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import type { OrderWithItemCount } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { OrdersTable } from "@/components/admin/orders/orders-table";

const PAGE_SIZE = 10;
const VALID_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];
const VALID_PAYMENT_STATUSES = ["unpaid", "paid", "refunded"];

interface AdminOrdersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    payment?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const params = await searchParams;
  await requireAdminPageAccess("orders");

  const searchQuery = (params.q ?? "").trim();
  const statusFilter = VALID_ORDER_STATUSES.includes(params.status ?? "")
    ? (params.status as string)
    : "";
  const paymentFilter = VALID_PAYMENT_STATUSES.includes(params.payment ?? "")
    ? (params.payment as string)
    : "";

  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*, order_items(quantity)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (searchQuery) {
    const safeTerm = searchQuery.replace(/[,%()]/g, " ").trim();
    query = query.or(
      `order_number.ilike.%${safeTerm}%,customer_name.ilike.%${safeTerm}%,customer_phone.ilike.%${safeTerm}%,customer_email.ilike.%${safeTerm}%`
    );
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (paymentFilter) {
    query = query.eq("payment_status", paymentFilter);
  }

  query = query.range(from, to);

  const { data: ordersData, count, error } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track customer orders, manage fulfillment transitions, and generate printable
            invoices.
          </p>
        </div>
        <Badge variant="default">Order Management Enabled</Badge>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Failed to load orders: {error.message}
        </div>
      ) : (
        <OrdersTable
          key={searchQuery}
          orders={(ordersData ?? []) as OrderWithItemCount[]}
          totalCount={count ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          paymentFilter={paymentFilter}
        />
      )}
    </div>
  );
}