export type UserRole = "customer" | "staff" | "manager" | "admin";

export type ProductStatus = "active" | "draft" | "archived";

export type StockMovementType =
  | "restock"
  | "damage"
  | "correction"
  | "return"
  | "order";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "card";

export type DeliveryZone = "inside_dhaka" | "outside_dhaka";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithCount extends Category {
  product_count: number;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  brand: string;
  country_of_origin: string;
  price: number;
  sale_price: number | null;
  stock: number;
  image_url: string | null;
  status: ProductStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface ProductWithCategory extends Product {
  categories: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
  product_variants?: ProductVariant[];
}

export interface StockMovementWithDetails {
  id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: StockMovementType;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  performed_by: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    slug: string;
  } | null;
  product_variants: {
    id: string;
    name: string;
    sku: string;
  } | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  delivery_zone: DeliveryZone;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  delivery_charge: number;
  total_amount: number;
  coupon_code: string | null;
  customer_note: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string;
  changed_by: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export interface OrderNoteEntry {
  id: string;
  order_id: string;
  author_id: string | null;
  note: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export interface OrderWithItemCount extends Order {
  order_items: Array<{ quantity: number }>;
}

export interface OrderFullDetails extends Order {
  order_items: OrderItem[];
  order_status_history: OrderStatusHistoryEntry[];
  order_notes: OrderNoteEntry[];
}