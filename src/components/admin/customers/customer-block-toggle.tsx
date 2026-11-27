"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleCustomerBlockAction } from "@/actions/customers";
import { Button } from "@/components/ui/button";

interface CustomerBlockToggleProps {
  customerId: string;
  customerLabel: string;
  isBlocked: boolean;
}

export function CustomerBlockToggle({
  customerId,
  customerLabel,
  isBlocked,
}: CustomerBlockToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const nextBlocked = !isBlocked;
    startTransition(async () => {
      const result = await toggleCustomerBlockAction(customerId, nextBlocked);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        nextBlocked
          ? `${customerLabel} has been blocked from placing orders.`
          : `${customerLabel} has been unblocked.`
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={isBlocked ? "default" : "destructive"}
      disabled={isPending}
      onClick={handleToggle}
      className={
        isBlocked ? "bg-emerald-600 text-white hover:bg-emerald-700" : undefined
      }
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </>
      ) : isBlocked ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Unblock Customer Account
        </>
      ) : (
        <>
          <Ban className="mr-2 h-4 w-4" />
          Block Customer Account
        </>
      )}
    </Button>
  );
}