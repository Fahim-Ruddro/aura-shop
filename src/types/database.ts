export type UserRole = "customer" | "staff" | "manager" | "admin";

export type ProductStatus = "active" | "draft" | "archived";

export type StockMovementType =
  | "restock"
  | "damage"
  | "correction"
  | "return"
  | "order";

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