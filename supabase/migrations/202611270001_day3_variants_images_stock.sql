-- ============================================================================
-- Day 3 Migration: Product Variants (Sizes/SKUs), Multi-Images & Stock Movements
-- ============================================================================

-- 1. Product Variants (e.g., 250g Jar, 500g Jar, 1kg Bottle)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  sale_price NUMERIC(10, 2) CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_display_order ON public.product_variants(display_order ASC, created_at ASC);

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Keep products.stock automatically synced to the sum of active variants whenever variants exist
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_variant_count INTEGER;
  v_total_stock INTEGER;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT COUNT(*), COALESCE(SUM(CASE WHEN is_active THEN stock ELSE 0 END), 0)
  INTO v_variant_count, v_total_stock
  FROM public.product_variants
  WHERE product_id = v_product_id;

  IF v_variant_count > 0 THEN
    UPDATE public.products
    SET stock = v_total_stock
    WHERE id = v_product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_stock_from_variants ON public.product_variants;
CREATE TRIGGER trg_sync_product_stock_from_variants
  AFTER INSERT OR UPDATE OF stock, is_active OR DELETE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_stock_from_variants();

-- 2. Product Images (Multi-image gallery with primary image & ordering)
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON public.product_images(display_order ASC, created_at ASC);

-- 3. Stock Movements Audit Trail
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL
    CHECK (movement_type IN ('restock', 'damage', 'correction', 'return', 'order')),
  quantity_change INTEGER NOT NULL CHECK (quantity_change <> 0),
  previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
  new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
  reason TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_id ON public.stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- 4. Atomic Stock Adjustment Function (prevents negative stock & logs every change)
CREATE OR REPLACE FUNCTION public.record_stock_adjustment(
  p_product_id UUID,
  p_variant_id UUID,
  p_movement_type TEXT,
  p_quantity_change INTEGER,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_prev_stock INTEGER;
  v_new_stock INTEGER;
  v_movement_id UUID;
  v_variant_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.is_manager_or_above() THEN
    RAISE EXCEPTION 'Unauthorized: only managers and admins can adjust stock.';
  END IF;

  IF p_quantity_change = 0 THEN
    RAISE EXCEPTION 'Quantity change cannot be zero.';
  END IF;

  IF TRIM(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required for every stock movement.';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT stock INTO v_prev_stock
    FROM public.product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected product variant was not found.';
    END IF;

    v_new_stock := v_prev_stock + p_quantity_change;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Insufficient stock: current stock is %, cannot reduce by %.', v_prev_stock, ABS(p_quantity_change);
    END IF;

    UPDATE public.product_variants
    SET stock = v_new_stock
    WHERE id = p_variant_id;
  ELSE
    SELECT COUNT(*) INTO v_variant_count
    FROM public.product_variants
    WHERE product_id = p_product_id;

    IF v_variant_count > 0 THEN
      RAISE EXCEPTION 'This product uses size variants. Please select a specific variant to adjust stock.';
    END IF;

    SELECT stock INTO v_prev_stock
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found.';
    END IF;

    v_new_stock := v_prev_stock + p_quantity_change;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Insufficient stock: current stock is %, cannot reduce by %.', v_prev_stock, ABS(p_quantity_change);
    END IF;

    UPDATE public.products
    SET stock = v_new_stock
    WHERE id = p_product_id;
  END IF;

  INSERT INTO public.stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity_change,
    previous_stock,
    new_stock,
    reason,
    performed_by
  )
  VALUES (
    p_product_id,
    p_variant_id,
    p_movement_type,
    p_quantity_change,
    v_prev_stock,
    v_new_stock,
    TRIM(p_reason),
    v_user_id
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- 5. Enable RLS & Policies
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Product Variants Policies
DROP POLICY IF EXISTS "Public can view active variants of active products" ON public.product_variants;
CREATE POLICY "Public can view active variants of active products"
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.categories c ON c.id = p.category_id
      WHERE p.id = product_variants.product_id
        AND p.status = 'active'
        AND c.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Staff and above can view all variants" ON public.product_variants;
CREATE POLICY "Staff and above can view all variants"
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

DROP POLICY IF EXISTS "Managers and admins can insert variants" ON public.product_variants;
CREATE POLICY "Managers and admins can insert variants"
  ON public.product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can update variants" ON public.product_variants;
CREATE POLICY "Managers and admins can update variants"
  ON public.product_variants
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can delete variants" ON public.product_variants;
CREATE POLICY "Managers and admins can delete variants"
  ON public.product_variants
  FOR DELETE
  TO authenticated
  USING (public.is_manager_or_above());

-- Product Images Policies
DROP POLICY IF EXISTS "Public can view images of active products" ON public.product_images;
CREATE POLICY "Public can view images of active products"
  ON public.product_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.categories c ON c.id = p.category_id
      WHERE p.id = product_images.product_id
        AND p.status = 'active'
        AND c.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Staff and above can view all product images" ON public.product_images;
CREATE POLICY "Staff and above can view all product images"
  ON public.product_images
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

DROP POLICY IF EXISTS "Managers and admins can insert product images" ON public.product_images;
CREATE POLICY "Managers and admins can insert product images"
  ON public.product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can update product images" ON public.product_images;
CREATE POLICY "Managers and admins can update product images"
  ON public.product_images
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Managers and admins can delete product images" ON public.product_images;
CREATE POLICY "Managers and admins can delete product images"
  ON public.product_images
  FOR DELETE
  TO authenticated
  USING (public.is_manager_or_above());

-- Stock Movements Policies (Staff+ can view audit history; only Managers/Admins can log movements)
DROP POLICY IF EXISTS "Staff and above can view stock movements" ON public.stock_movements;
CREATE POLICY "Staff and above can view stock movements"
  ON public.stock_movements
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

DROP POLICY IF EXISTS "Managers and admins can insert stock movements" ON public.stock_movements;
CREATE POLICY "Managers and admins can insert stock movements"
  ON public.stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_above());

-- 6. Grant table privileges
GRANT SELECT ON TABLE public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_variants TO authenticated;
GRANT ALL ON TABLE public.product_variants TO service_role;

GRANT SELECT ON TABLE public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_images TO authenticated;
GRANT ALL ON TABLE public.product_images TO service_role;

GRANT SELECT, INSERT ON TABLE public.stock_movements TO authenticated;
GRANT ALL ON TABLE public.stock_movements TO service_role;