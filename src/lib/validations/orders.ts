import { z } from "zod";
import type { OrderStatus } from "@/types/database";

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function getAllowedNextStatuses(current: OrderStatus): OrderStatus[] {
  return ALLOWED_ORDER_TRANSITIONS[current] ?? [];
}

export const checkoutSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, "Full name is required.")
    .max(100, "Name must be 100 characters or less."),
  customer_email: z
    .string()
    .trim()
    .email("Please enter a valid email address."),
  customer_phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid Bangladesh phone number.")
    .max(25, "Phone number is too long."),
  shipping_address: z
    .string()
    .trim()
    .min(8, "Please provide your full house, road, and area address.")
    .max(400, "Address must be 400 characters or less."),
  delivery_zone: z.enum(["inside_dhaka", "outside_dhaka"]),
  payment_method: z.enum(["cod", "bkash", "nagad", "card"]),
  customer_note: z.string().trim().max(300, "Note must be 300 characters or less."),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Please add at least one item to your cart."),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const transitionOrderSchema = z.object({
  order_id: z.string().uuid("Invalid order ID."),
  next_status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ]),
  note: z.string().trim().max(300, "Note must be 300 characters or less."),
});

export const updatePaymentStatusSchema = z.object({
  order_id: z.string().uuid("Invalid order ID."),
  payment_status: z.enum(["unpaid", "paid", "refunded"]),
});

export const addOrderNoteSchema = z.object({
  order_id: z.string().uuid("Invalid order ID."),
  note: z
    .string()
    .trim()
    .min(2, "Internal note cannot be empty.")
    .max(500, "Internal note must be 500 characters or less."),
});