
CREATE OR REPLACE FUNCTION fn_period_upsert(
  p_period text,
  d_orders int,
  d_revenue numeric,
  d_expense numeric,
  d_supplier_expense numeric,
  d_inflow numeric,
  d_outflow numeric,
  d_receivables numeric,
  d_payables numeric
) RETURNS void AS $$
BEGIN
  INSERT INTO "FinancePeriod" (
    period, "totalOrders", "totalRevenue", "totalExpense", "totalSupplierExpense",
    "cashInflow", "cashOutflow", "receivables", "payables", "createdAt", "updatedAt"
  )
  VALUES (p_period, d_orders, d_revenue, d_expense, d_supplier_expense,
    d_inflow, d_outflow, d_receivables, d_payables, now(), now())
  ON CONFLICT (period) DO UPDATE SET
    "totalOrders"          = "FinancePeriod"."totalOrders"          + EXCLUDED."totalOrders",
    "totalRevenue"         = "FinancePeriod"."totalRevenue"         + EXCLUDED."totalRevenue",
    "totalExpense"         = "FinancePeriod"."totalExpense"         + EXCLUDED."totalExpense",
    "totalSupplierExpense" = "FinancePeriod"."totalSupplierExpense" + EXCLUDED."totalSupplierExpense",
    "cashInflow"           = "FinancePeriod"."cashInflow"           + EXCLUDED."cashInflow",
    "cashOutflow"          = "FinancePeriod"."cashOutflow"          + EXCLUDED."cashOutflow",
    "receivables"          = "FinancePeriod"."receivables"          + EXCLUDED."receivables",
    "payables"             = "FinancePeriod"."payables"             + EXCLUDED."payables",
    "updatedAt"            = now();

  UPDATE "FinancePeriod" SET
    "totalProfit" = "totalRevenue" - "totalExpense",
    "cashOnHand"  = "cashInflow" - "cashOutflow"
  WHERE period = p_period;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Income  -> totalRevenue  (period = receivedAt)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_income_counter() RETURNS trigger AS $$
DECLARE v_period text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_period := to_char(OLD."receivedAt", 'YYYY-MM');
    PERFORM fn_period_upsert(v_period, 0, -OLD.amount, 0, 0, 0, 0, 0, 0);
    RETURN OLD;
  ELSE
    v_period := to_char(NEW."receivedAt", 'YYYY-MM');
    PERFORM fn_period_upsert(v_period, 0, NEW.amount, 0, 0, 0, 0, 0, 0);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_income_aiud ON "Income";
CREATE TRIGGER trg_income_aiud
  AFTER INSERT OR UPDATE OR DELETE ON "Income"
  FOR EACH ROW EXECUTE FUNCTION trg_income_counter();

-- ---------------------------------------------------------------------------
-- Expense -> totalExpense (always) + totalSupplierExpense (only category=SUPPLIER)
-- period = date
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_expense_counter() RETURNS trigger AS $$
DECLARE v_period text; v_sup numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_period := to_char(OLD."date", 'YYYY-MM');
    v_sup := CASE WHEN OLD."category" = 'SUPPLIER' THEN -OLD.amount ELSE 0 END;
    PERFORM fn_period_upsert(v_period, 0, 0, -OLD.amount, v_sup, 0, 0, 0, 0);
    RETURN OLD;
  ELSE
    v_period := to_char(NEW."date", 'YYYY-MM');
    v_sup := CASE WHEN NEW."category" = 'SUPPLIER' THEN NEW.amount ELSE 0 END;
    PERFORM fn_period_upsert(v_period, 0, 0, NEW.amount, v_sup, 0, 0, 0, 0);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_aiud ON "Expense";
CREATE TRIGGER trg_expense_aiud
  AFTER INSERT OR UPDATE OR DELETE ON "Expense"
  FOR EACH ROW EXECUTE FUNCTION trg_expense_counter();

-- ---------------------------------------------------------------------------
-- Cashflow -> cashInflow (IN) / cashOutflow (OUT). period = date
-- (Income/Expense also create Cashflow rows, so money movement is counted here
--  while revenue/expense recognition is counted by their own triggers — no double count.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_cashflow_counter() RETURNS trigger AS $$
DECLARE v_period text; v_in numeric; v_out numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_period := to_char(OLD."date", 'YYYY-MM');
    v_in  := CASE WHEN OLD."type" = 'IN'  THEN -OLD.amount ELSE 0 END;
    v_out := CASE WHEN OLD."type" = 'OUT' THEN -OLD.amount ELSE 0 END;
    PERFORM fn_period_upsert(v_period, 0, 0, 0, 0, v_in, v_out, 0, 0);
    RETURN OLD;
  ELSE
    v_period := to_char(NEW."date", 'YYYY-MM');
    v_in  := CASE WHEN NEW."type" = 'IN'  THEN NEW.amount ELSE 0 END;
    v_out := CASE WHEN NEW."type" = 'OUT' THEN NEW.amount ELSE 0 END;
    PERFORM fn_period_upsert(v_period, 0, 0, 0, 0, v_in, v_out, 0, 0);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cashflow_aiud ON "Cashflow";
CREATE TRIGGER trg_cashflow_aiud
  AFTER INSERT OR UPDATE OR DELETE ON "Cashflow"
  FOR EACH ROW EXECUTE FUNCTION trg_cashflow_counter();

-- ---------------------------------------------------------------------------
-- Order -> totalOrders + receivables (HALF COD outstanding) + payables (NCC unpaid)
-- period = createdAt. Recomputed as delta on every update.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION order_rp(o "Order") RETURNS numeric[] AS $$
DECLARE v_rec numeric := 0; v_pay numeric := 0; it jsonb;
BEGIN
  IF o.status = 'delivered' AND o."paymentType" = 'half-payment' AND o."codReconciledAt" IS NULL THEN
    v_rec := o."totalAmount" - o."paidAmount";
  END IF;
  IF o."orderItems" IS NOT NULL THEN
    FOR it IN SELECT * FROM jsonb_array_elements(o."orderItems")
    LOOP
      IF (it->>'supplierId') IS NOT NULL AND (it->>'costPrice') IS NOT NULL AND (it->>'reconciledAt') IS NULL THEN
        v_pay := v_pay + COALESCE((it->>'costPrice')::numeric, 0);
      END IF;
    END LOOP;
  END IF;
  RETURN ARRAY[v_rec, v_pay];
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_order_counter() RETURNS trigger AS $$
DECLARE v_period text; v_old numeric[]; v_new numeric[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_period := to_char(NEW."createdAt", 'YYYY-MM');
    v_new := order_rp(NEW);
    PERFORM fn_period_upsert(v_period, 1, 0, 0, 0, 0, 0, v_new[1], v_new[2]);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_period := to_char(OLD."createdAt", 'YYYY-MM');
    v_old := order_rp(OLD);
    PERFORM fn_period_upsert(v_period, -1, 0, 0, 0, 0, 0, -v_old[1], -v_old[2]);
    RETURN OLD;
  ELSE
    v_period := to_char(NEW."createdAt", 'YYYY-MM');
    v_old := order_rp(OLD);
    v_new := order_rp(NEW);
    PERFORM fn_period_upsert(v_period, 0, 0, 0, 0, 0, 0, v_new[1] - v_old[1], v_new[2] - v_old[2]);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_aiud ON "Order";
CREATE TRIGGER trg_order_aiud
  AFTER INSERT OR UPDATE OR DELETE ON "Order"
  FOR EACH ROW EXECUTE FUNCTION trg_order_counter();

-- ============================================================================
-- Backfill: recompute FinancePeriod from history (does NOT touch source tables,
-- so existing triggers are not double-counted). Run once after creating triggers,
-- or any time you want to rebuild counters.
-- ============================================================================
TRUNCATE "FinancePeriod";

INSERT INTO "FinancePeriod" (
  period, "totalOrders", "totalRevenue", "totalExpense", "totalSupplierExpense",
  "cashInflow", "cashOutflow", "receivables", "payables", "createdAt", "updatedAt"
)
WITH
  rev AS (SELECT to_char("receivedAt",'YYYY-MM') p, SUM(amount) v FROM "Income" GROUP BY 1),
  exp AS (SELECT to_char("date",'YYYY-MM') p, SUM(amount) v,
                 SUM(CASE WHEN "category"='SUPPLIER' THEN amount ELSE 0 END) vs
          FROM "Expense" GROUP BY 1),
  cin AS (SELECT to_char("date",'YYYY-MM') p, SUM(amount) v FROM "Cashflow" WHERE "type"='IN' GROUP BY 1),
  cout AS (SELECT to_char("date",'YYYY-MM') p, SUM(amount) v FROM "Cashflow" WHERE "type"='OUT' GROUP BY 1),
  ord AS (
    SELECT to_char("createdAt",'YYYY-MM') p,
      COUNT(*) AS orders,
      SUM(CASE WHEN status='delivered' AND "paymentType"='half-payment' AND "codReconciledAt" IS NULL
               THEN "totalAmount" - "paidAmount" ELSE 0 END) AS rec,
      COALESCE(SUM((SELECT COALESCE(SUM(COALESCE((it->>'costPrice')::numeric,0)),0)
                     FROM jsonb_array_elements("orderItems") it
                     WHERE (it->>'supplierId') IS NOT NULL
                       AND (it->>'costPrice') IS NOT NULL
                       AND (it->>'reconciledAt') IS NULL)),0) AS pay
    FROM "Order" GROUP BY 1
  ),
  periods(p) AS (
    SELECT p FROM rev UNION SELECT p FROM exp UNION SELECT p FROM cin
    UNION SELECT p FROM cout UNION SELECT p FROM ord
  )
SELECT
  p,
  COALESCE((SELECT orders FROM ord o WHERE o.p = p), 0),
  COALESCE((SELECT v FROM rev r WHERE r.p = p), 0),
  COALESCE((SELECT v FROM exp e WHERE e.p = p), 0),
  COALESCE((SELECT vs FROM exp e WHERE e.p = p), 0),
  COALESCE((SELECT v FROM cin c WHERE c.p = p), 0),
  COALESCE((SELECT v FROM cout c WHERE c.p = p), 0),
  COALESCE((SELECT rec FROM ord o WHERE o.p = p), 0),
  COALESCE((SELECT pay FROM ord o WHERE o.p = p), 0),
  now(), now()
FROM periods;

UPDATE "FinancePeriod" SET
  "totalProfit" = "totalRevenue" - "totalExpense",
  "cashOnHand"  = "cashInflow" - "cashOutflow";
