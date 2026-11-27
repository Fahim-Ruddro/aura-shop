"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { toggleCustomerBlockAction } from "@/actions/customers";
import { formatBDT } from "@/lib/format";
import type { Profile } from "@/types/database";
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

export interface CustomerSummaryRow extends Profile {
  orders_count: number;
  total_spent: number;
}

interface CustomersManagerProps {
  customers: CustomerSummaryRow[];
  canEdit: boolean;
}

export function CustomersManager({
  customers,
  canEdit,
}: CustomersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">(
    "all"
  );

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter === "active" && c.is_blocked) return false;
      if (statusFilter === "blocked" && !c.is_blocked) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, searchTerm, statusFilter]);

  function handleToggleBlock(customer: CustomerSummaryRow) {
    const nextBlocked = !customer.is_blocked;
    startTransition(async () => {
      const result = await toggleCustomerBlockAction(customer.id, nextBlocked);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        nextBlocked
          ? `${customer.full_name || customer.email} has been blocked.`
          : `${customer.full_name || customer.email} has been unblocked.`
      );
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          Registered Customers ({customers.length})
        </CardTitle>
        <CardDescription>
          View customer lifetime order counts, total BDT (৳) spend, and block or
          unblock accounts.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, email, or phone..."
              aria-label="Search customers"
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
            >
              All ({customers.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "active" ? "default" : "outline"}
              onClick={() => setStatusFilter("active")}
            >
              Active
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "blocked" ? "default" : "outline"}
              onClick={() => setStatusFilter("blocked")}
            >
              Blocked
            </Button>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            No customer profiles match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead>Total Spent (BDT)</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {customer.full_name || "Unnamed Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.phone || "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {customer.orders_count}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatBDT(customer.total_spent)}
                    </TableCell>
                    <TableCell>
                      {customer.is_blocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Profile
                        </Link>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            className={
                              customer.is_blocked
                                ? "text-emerald-700 hover:bg-emerald-50"
                                : "text-destructive hover:bg-destructive/10"
                            }
                            onClick={() => handleToggleBlock(customer)}
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : customer.is_blocked ? (
                              <>
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Ban className="mr-1.5 h-3.5 w-3.5" />
                                Block
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}