-- ============================================================================
-- Day 4 Migration: Orders, Order Items, Status Timeline, Internal Notes & RPCs
-- ============================================================================

-- 1. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL DEFAULT 'inside_dhaka'
    CHECK (delivery_zone IN ('inside_dhaka', 'outside_dhaka')),
  payment_method TEXT NOT NULL DEFAULT 'cod'
    CHECK (payment_method IN ('cod', 'bkash', 'nagad', 'card')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'returned'
      )
    ),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 60 CHECK (delivery_charge >= 0),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  coupon_code TEXT,
  customer_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Order Items Table (snapshots product name, variant, SKU & unit price at purchase time)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT NOT NULL DEFAULT '',
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- 3. Order Status Timeline Table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON public.order_status_history(order_id, created_at ASC);

-- 4. Internal Staff Notes Table
CREATE TABLE IF NOT EXISTS public.order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order_id
  ON public.order_notes(order_id, created_at DESC);

-- 5. Atomic Customer Order Placement RPC (validates stock, deducts stock, logs stock_movements)
CREATE OR REPLACE FUNCTION public.place_customer_order(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_delivery_zone TEXT,
  p_payment_method TEXT,
  p_customer_note TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_blocked BOOLEAN;
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_variant_id UUID;
  v_qty INTEGER;
  v_prod_name TEXT;
  v_prod_slug TEXT;
  v_prod_status TEXT;
  v_prod_price NUMERIC(10, 2);
  v_prod_sale NUMERIC(10, 2);
  v_prod_stock INTEGER;
  v_var_name TEXT;
  v_var_sku TEXT;
  v_var_price NUMERIC(10, 2);
  v_var_sale NUMERIC(10, 2);
  v_var_stock INTEGER;
  v_var_active BOOLEAN;
  v_unit_price NUMERIC(10, 2);
  v_line_total NUMERIC(10, 2);
  v_subtotal NUMERIC(10, 2) := 0;
  v_delivery_charge NUMERIC(10, 2);
  v_total_amount NUMERIC(10, 2);
  v_variant_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in before placing an order.';
  END IF;

  SELECT is_blocked INTO v_is_blocked
  FROM public.profiles
  WHERE id = v_user_id;

  IF COALESCE(v_is_blocked, FALSE) THEN
    RAISE EXCEPTION 'Your account has been suspended. Please contact Aura Shop support.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  v_order_number :=
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Dhaka', 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 5));

  INSERT INTO public.orders (
    order_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    delivery_zone,
    payment_method,
    payment_status,
    status,
    subtotal,
    discount_amount,
    delivery_charge,
    total_amount,
    customer_note
  )
  VALUES (
    v_order_number,
    v_user_id,
    TRIM(p_customer_name),
    TRIM(p_customer_email),
    TRIM(p_customer_phone),
    TRIM(p_shipping_address),
    p_delivery_zone,
    p_payment_method,
    'unpaid',
    'pending',
    0,
    0,
    0,
    0,
    TRIM(COALESCE(p_customer_note, ''))
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_variant_id := NULLIF(v_item->>'variant_id', '')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be at least 1.';
    END IF;

    SELECT name, slug, status, price, sale_price, stock
    INTO v_prod_name, v_prod_slug, v_prod_status, v_prod_price, v_prod_sale, v_prod_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND OR v_prod_status <> 'active' THEN
      RAISE EXCEPTION 'One or more products in your cart are no longer available.';
    END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT name, sku, price, sale_price, stock, is_active
      INTO v_var_name, v_var_sku, v_var_price, v_var_sale, v_var_stock, v_var_active
      FROM public.product_variants
      WHERE id = v_variant_id AND product_id = v_product_id
      FOR UPDATE;

      IF NOT FOUND OR NOT v_var_active THEN
        RAISE EXCEPTION 'Selected size variant for % is unavailable.', v_prod_name;
      END IF;

      IF v_var_stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for % (%). Available: %.', v_prod_name, v_var_name, v_var_stock;
      END IF;

      v_unit_price := COALESCE(v_var_sale, v_var_price);
      v_line_total := v_unit_price * v_qty;
      v_subtotal := v_subtotal + v_line_total;

      UPDATE public.product_variants
      SET stock = v_var_stock - v_qty
      WHERE id = v_variant_id;

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
        v_product_id,
        v_variant_id,
        'order',
        -v_qty,
        v_var_stock,
        v_var_stock - v_qty,
        'Order ' || v_order_number || ' placed',
        v_user_id
      );

      INSERT INTO public.order_items (
        order_id,
        product_id,
        variant_id,
        product_name,
        variant_name,
        sku,
        unit_price,
        quantity,
        line_total
      )
      VALUES (
        v_order_id,
        v_product_id,
        v_variant_id,
        v_prod_name,
        v_var_name,
        v_var_sku,
        v_unit_price,
        v_qty,
        v_line_total
      );
    ELSE
      SELECT COUNT(*) INTO v_variant_count
      FROM public.product_variants
      WHERE product_id = v_product_id AND is_active = TRUE;

      IF v_variant_count > 0 THEN
        RAISE EXCEPTION 'Please choose a size option for %.', v_prod_name;
      END IF;

      IF v_prod_stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %. Available: %.', v_prod_name, v_prod_stock;
      END IF;

      v_unit_price := COALESCE(v_prod_sale, v_prod_price);
      v_line_total := v_unit_price * v_qty;
      v_subtotal := v_subtotal + v_line_total;

      UPDATE public.products
      SET stock = v_prod_stock - v_qty
      WHERE id = v_product_id;

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
        v_product_id,
        NULL,
        'order',
        -v_qty,
        v_prod_stock,
        v_prod_stock - v_qty,
        'Order ' || v_order_number || ' placed',
        v_user_id
      );

      INSERT INTO public.order_items (
        order_id,
        product_id,
        variant_id,
        product_name,
        variant_name,
        sku,
        unit_price,
        quantity,
        line_total
      )
      VALUES (
        v_order_id,
        v_product_id,
        NULL,
        v_prod_name,
        NULL,
        UPPER(v_prod_slug),
        v_unit_price,
        v_qty,
        v_line_total
      );
    END IF;
  END LOOP;

  -- Delivery charge in BDT: Inside Dhaka ৳60, Outside Dhaka ৳120 (Free over ৳2,000)
  IF v_subtotal >= 2000 THEN
    v_delivery_charge := 0;
  ELSIF p_delivery_zone = 'outside_dhaka' THEN
    v_delivery_charge := 120;
  ELSE
    v_delivery_charge := 60;
  END IF;

  v_total_amount := v_subtotal + v_delivery_charge;

  UPDATE public.orders
  SET subtotal = v_subtotal,
      delivery_charge = v_delivery_charge,
      total_amount = v_total_amount
  WHERE id = v_order_id;

  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    note,
    changed_by
  )
  VALUES (
    v_order_id,
    NULL,
    'pending',
    'Order placed by customer.',
    v_user_id
  );

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_customer_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 6. Allowed Order Status Transition RPC (with automatic stock restoration on Cancel/Return)
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id UUID,
  p_next_status TEXT,
  p_note TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_order_number TEXT;
  v_payment_method TEXT;
  v_payment_status TEXT;
  v_allowed BOOLEAN := FALSE;
  v_item RECORD;
  v_prev_stock INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Unauthorized: only staff, managers, and admins can update order status.';
  END IF;

  SELECT status, order_number, payment_method, payment_status
  INTO v_current_status, v_order_number, v_payment_method, v_payment_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_current_status = p_next_status THEN
    RAISE EXCEPTION 'Order is already in % status.', p_next_status;
  END IF;

  -- Enforce valid state transitions
  IF v_current_status = 'pending' AND p_next_status IN ('confirmed', 'cancelled') THEN
    v_allowed := TRUE;
  ELSIF v_current_status = 'confirmed' AND p_next_status IN ('processing', 'cancelled') THEN
    v_allowed := TRUE;
  ELSIF v_current_status = 'processing' AND p_next_status IN ('shipped', 'cancelled') THEN
    v_allowed := TRUE;
  ELSIF v_current_status = 'shipped' AND p_next_status IN ('delivered', 'returned') THEN
    v_allowed := TRUE;
  ELSIF v_current_status = 'delivered' AND p_next_status = 'returned' THEN
    v_allowed := TRUE;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid status transition from % to %.', v_current_status, p_next_status;
  END IF;

  -- Restore stock and log stock_movements when transitioning into cancelled or returned
  IF p_next_status IN ('cancelled', 'returned')
     AND v_current_status NOT IN ('cancelled', 'returned') THEN
    FOR v_item IN
      SELECT product_id, variant_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id
    LOOP
      IF v_item.variant_id IS NOT NULL THEN
        SELECT stock INTO v_prev_stock
        FROM public.product_variants
        WHERE id = v_item.variant_id
        FOR UPDATE;

        IF FOUND THEN
          UPDATE public.product_variants
          SET stock = v_prev_stock + v_item.quantity
          WHERE id = v_item.variant_id;

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
            v_item.product_id,
            v_item.variant_id,
            'return',
            v_item.quantity,
            v_prev_stock,
            v_prev_stock + v_item.quantity,
            'Order ' || v_order_number || ' ' || p_next_status,
            v_user_id
          );
        END IF;
      ELSIF v_item.product_id IS NOT NULL THEN
        SELECT stock INTO v_prev_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF FOUND THEN
          UPDATE public.products
          SET stock = v_prev_stock + v_item.quantity
          WHERE id = v_item.product_id;

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
            v_item.product_id,
            NULL,
            'return',
            v_item.quantity,
            v_prev_stock,
            v_prev_stock + v_item.quantity,
            'Order ' || v_order_number || ' ' || p_next_status,
            v_user_id
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Automatically mark COD orders as paid once delivered
  IF p_next_status = 'delivered' AND v_payment_method = 'cod' AND v_payment_status = 'unpaid' THEN
    v_payment_status := 'paid';
  END IF;

  UPDATE public.orders
  SET status = p_next_status,
      payment_status = v_payment_status
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    note,
    changed_by
  )
  VALUES (
    p_order_id,
    v_current_status,
    p_next_status,
    TRIM(COALESCE(p_note, '')),
    v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT, TEXT) TO authenticated;

-- 7. Enable RLS & Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

-- Orders Policies
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Staff and above can view all orders" ON public.orders;
CREATE POLICY "Staff and above can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

DROP POLICY IF EXISTS "Staff and above can update orders" ON public.orders;
CREATE POLICY "Staff and above can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

-- Order Items Policies
DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Customers can view own order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff and above can view all order items" ON public.order_items;
CREATE POLICY "Staff and above can view all order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

-- Order Status History Policies
DROP POLICY IF EXISTS "Customers can view own order timeline" ON public.order_status_history;
CREATE POLICY "Customers can view own order timeline"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff and above can view all order timelines" ON public.order_status_history;
CREATE POLICY "Staff and above can view all order timelines"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

-- Internal Order Notes Policies (Strictly Staff+ only — never visible to customers)
DROP POLICY IF EXISTS "Staff and above can view order notes" ON public.order_notes;
CREATE POLICY "Staff and above can view order notes"
  ON public.order_notes
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_above());

DROP POLICY IF EXISTS "Staff and above can insert order notes" ON public.order_notes;
CREATE POLICY "Staff and above can insert order notes"
  ON public.order_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_or_above());

-- Managers & Admins can block/unblock customer profiles
DROP POLICY IF EXISTS "Managers and admins can update profiles" ON public.profiles;
CREATE POLICY "Managers and admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

-- 8. Grant Table Privileges
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

GRANT SELECT, INSERT ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;

GRANT SELECT, INSERT ON TABLE public.order_status_history TO authenticated;
GRANT ALL ON TABLE public.order_status_history TO service_role;

GRANT SELECT, INSERT ON TABLE public.order_notes TO authenticated;
GRANT ALL ON TABLE public.order_notes TO service_role;