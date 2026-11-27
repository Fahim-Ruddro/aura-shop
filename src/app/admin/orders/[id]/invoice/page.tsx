import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { formatBDT } from "@/lib/format";
import type { Order, OrderItem } from "@/types/database";
import { buttonVariants } from "@/components/ui/button";
import { PrintInvoiceButton } from "@/components/admin/orders/print-invoice-button";

interface OrderInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderInvoicePage({
  params,
}: OrderInvoicePageProps) {
  const { id } = await params;
  await requireAdminPageAccess("orders");

  const supabase = await createClient();

  const [{ data: orderData }, { data: itemsData }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!orderData) {
    notFound();
  }

  const order = orderData as Order;
  const items = (itemsData ?? []) as OrderItem[];

  return (
    <div className="space-y-6">
      {/* Hide admin sidebar/topbar & controls when printing */}
      <style>{`
        @media print {
          aside, header, .no-print {
            display: none !important;
          }
          body, main {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .invoice-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Screen-only Action Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/orders/${order.id}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Order
        </Link>
        <PrintInvoiceButton />
      </div>

      {/* Printable Invoice Sheet */}
      <div className="invoice-sheet mx-auto max-w-3xl rounded-xl border bg-white p-8 text-slate-900 shadow-xs sm:p-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 border-b pb-6 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-emerald-700">
              <Leaf className="h-6 w-6" />
              <span>Aura Shop</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Organic &amp; Specialty Grocery • Dhaka, Bangladesh
            </p>
            <p className="text-xs text-slate-500">
              Support: support@aurashop.com
            </p>
          </div>

          <div className="sm:text-right">
            <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-800">
              Invoice
            </h1>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
              {order.order_number}
            </p>
            <p className="text-xs text-slate-500">
              Date:{" "}
              {new Date(order.created_at).toLocaleDateString("en-BD", {
                dateStyle: "long",
              })}
            </p>
          </div>
        </div>

        {/* Bill To & Order Meta */}
        <div className="grid gap-6 border-b py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Billed &amp; Shipped To
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {order.customer_name}
            </p>
            <p className="text-sm text-slate-600">{order.customer_phone}</p>
            <p className="text-sm text-slate-600">{order.customer_email}</p>
            <p className="mt-1 text-sm text-slate-700">{order.shipping_address}</p>
          </div>

          <div className="space-y-1 text-sm sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Payment &amp; Fulfillment
            </p>
            <p>
              <span className="text-slate-500">Payment Method:</span>{" "}
              <strong className="uppercase">{order.payment_method}</strong>
            </p>
            <p>
              <span className="text-slate-500">Payment Status:</span>{" "}
              <strong className="capitalize">{order.payment_status}</strong>
            </p>
            <p>
              <span className="text-slate-500">Order Status:</span>{" "}
              <strong className="capitalize">{order.status}</strong>
            </p>
            <p>
              <span className="text-slate-500">Delivery Zone:</span>{" "}
              <strong>
                {order.delivery_zone === "outside_dhaka"
                  ? "Outside Dhaka"
                  : "Inside Dhaka"}
              </strong>
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2">#</th>
                <th className="py-2">Product Description</th>
                <th className="py-2">SKU</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3 text-slate-500">{idx + 1}</td>
                  <td className="py-3">
                    <p className="font-medium text-slate-900">
                      {item.product_name}
                    </p>
                    {item.variant_name && (
                      <p className="text-xs text-slate-500">
                        Size: {item.variant_name}
                      </p>
                    )}
                  </td>
                  <td className="py-3 font-mono text-xs text-slate-500">
                    {item.sku || "—"}
                  </td>
                  <td className="py-3 text-right">
                    {formatBDT(item.unit_price)}
                  </td>
                  <td className="py-3 text-center font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right font-medium">
                    {formatBDT(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t pt-4">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatBDT(order.subtotal)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>-{formatBDT(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery Charge</span>
              <span>
                {Number(order.delivery_charge) === 0
                  ? "Free (৳0)"
                  : formatBDT(order.delivery_charge)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
              <span>Total Payable (BDT)</span>
              <span>{formatBDT(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t pt-4 text-center text-xs text-slate-400">
          Thank you for shopping with Aura Shop! For any queries regarding this
          invoice, please quote {order.order_number}.
        </p>
      </div>
    </div>
  );
}