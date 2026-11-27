export type UserRole = "customer" | "staff" | "manager" | "admin";

export type ProductStatus = "active" | "draft" | "archived";

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

export interface ProductWithCategory extends Product {
  categories: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
}