import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import type { OrderFullDetails } from "@/types/database";
import { OrderDetailClient } from "@/components/admin/orders/order-detail-client";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;
  const profile = await requireAdminPageAccess("orders");
  const canUpdate = canWriteSection(profile.role, "orders");

  const supabase = await createClient();

  const [
    { data: orderData },
    { data: itemsData },
    { data: historyData },
    { data: notesData },
  ] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_status_history")
      .select("*, profiles(full_name, email)")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_notes")
      .select("*, profiles(full_name, email)")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!orderData) {
    notFound();
  }

  const fullOrder: OrderFullDetails = {
    ...(orderData as Omit<
      OrderFullDetails,
      "order_items" | "order_status_history" | "order_notes"
    >),
    order_items: itemsData ?? [],
    order_status_history: historyData ?? [],
    order_notes: notesData ?? [],
  };

  return <OrderDetailClient order={fullOrder} canUpdate={canUpdate} />;
}