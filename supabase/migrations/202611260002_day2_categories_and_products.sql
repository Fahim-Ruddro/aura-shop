-- ============================================================================
-- Day 2 Migration: Categories, Products, Storage Bucket, and RLS Policies
-- ============================================================================

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order ASC, name ASC);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Create products table (ON DELETE RESTRICT prevents deleting a category with products)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT 'Aura Shop',
  country_of_origin TEXT NOT NULL DEFAULT 'Bangladesh',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  sale_price NUMERIC(10, 2) CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('active', 'draft', 'archived')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Enable RLS on categories and products
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Categories Policies
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Staff and above can view all categories" ON public.categories;
CREATE POLICY "Staff and above can view all categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

DROP POLICY IF EXISTS "Managers and admins can insert categories" ON public.categories;
CREATE POLICY "Managers and admins can insert categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can update categories" ON public.categories;
CREATE POLICY "Managers and admins can update categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can delete categories" ON public.categories;
CREATE POLICY "Managers and admins can delete categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (public.is_manager_or_above());

-- Products Policies (Draft and Archived products are strictly hidden from customers/anon)
DROP POLICY IF EXISTS "Public can view active products in active categories" ON public.products;
CREATE POLICY "Public can view active products in active categories"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.categories c
      WHERE c.id = products.category_id
        AND c.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Staff and above can view all products" ON public.products;
CREATE POLICY "Staff and above can view all products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

DROP POLICY IF EXISTS "Managers and admins can insert products" ON public.products;
CREATE POLICY "Managers and admins can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can update products" ON public.products;
CREATE POLICY "Managers and admins can update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can delete products" ON public.products;
CREATE POLICY "Managers and admins can delete products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (public.is_manager_or_above());

-- 4. Grant table privileges to Supabase API roles
GRANT SELECT ON TABLE public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;

GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;

-- 5. Create public Storage bucket for category and product images (JPG, PNG, WebP, max 2 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-media',
  'shop-media',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public can view shop media" ON storage.objects;
CREATE POLICY "Public can view shop media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'shop-media');

DROP POLICY IF EXISTS "Managers and admins can upload shop media" ON storage.objects;
CREATE POLICY "Managers and admins can upload shop media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'shop-media' AND public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can update shop media" ON storage.objects;
CREATE POLICY "Managers and admins can update shop media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'shop-media' AND public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can delete shop media" ON storage.objects;
CREATE POLICY "Managers and admins can delete shop media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'shop-media' AND public.is_manager_or_above());