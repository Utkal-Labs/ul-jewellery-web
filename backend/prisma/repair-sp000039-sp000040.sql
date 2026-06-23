-- ============================================================================
-- DATA REPAIR — SP000039 and SP000040 inconsistent TCS_AMT / GRAND_TOTAL
-- ============================================================================
--
-- Issue: These two RTP vouchers were saved with TCS_PER = 1 but TCS_AMT = 0,
-- so the stored GRAND_TOTAL ignores the TCS leg. The data-entry form recomputes
-- TCS at runtime and shows the correct grand total, but anything that reads
-- the stored aggregate (legacy reports, exports, GST returns) sees a wrong
-- value.
--
-- This script:
--   1. UPDATEs STONE_PURCHASE with the correct TCS_AMT / GRAND_TOTAL.
--   2. Adds the missing ACCOUNT_TRANS rows so the double-entry ledger stays
--      balanced (TCS_AC debit + offsetting customer/dealer-due credit).
--
-- BEFORE RUNNING:
--   - Verify TCS_AC and CUSTOMER_DUE GL codes in SETUP_INFO are correct.
--   - Both vouchers currently have NO dealer (it's a "customer" purchase).
--     That's why the offset goes to CUSTOMER_DUE (mirrors step 3 of the
--     postAccountEntries flow in stone-purchase.service.ts).
--   - Run inside a transaction; review the output before COMMIT.
--
-- Reverts: every change can be reverted by negating the amounts and deleting
-- the new ACCOUNT_TRANS rows.
-- ============================================================================

BEGIN;

-- Snapshot the relevant setup GLs (FYI; should output a single row)
SELECT "TCS_AC", "CUSTOMER_DUE" FROM "SETUP_INFO" LIMIT 1;

-- ── SP000039 — should have TCS = 20.00, GRAND_TOTAL = 2,020.00 ────────────
DO $$
DECLARE
  v_tcs_gl   int;
  v_due_gl   int;
  v_next_srl int;
BEGIN
  SELECT "TCS_AC", "CUSTOMER_DUE" INTO v_tcs_gl, v_due_gl FROM "SETUP_INFO" LIMIT 1;

  -- Header fix
  UPDATE "STONE_PURCHASE"
     SET "TCS_AMT"        = 20.00,
         "TCS_TAXABLE_AMT"= 2000.00,
         "GRAND_TOTAL"    = 2020.00
   WHERE "TRANCODE" = 'RTP' AND "VOUNUM" = 'SP000039';

  -- Next available vousrl for this voucher
  SELECT COALESCE(MAX(CAST("VOUSRL" AS int)), 0) + 1
    INTO v_next_srl
    FROM "ACCOUNT_TRANS"
   WHERE "TRANCODE" = 'RTP' AND "VOUNUM" = 'SP000039';

  -- TCS GL: +20 debit
  IF v_tcs_gl IS NOT NULL THEN
    INSERT INTO "ACCOUNT_TRANS" ("TRANCODE","VOUNUM","VOUSRL","VOUDATE","GL_CODE","AMOUNT","LOCID")
    VALUES ('RTP','SP000039', CAST(v_next_srl AS text), '2026-05-11', v_tcs_gl,  20.00, '1');
    v_next_srl := v_next_srl + 1;
  END IF;

  -- Customer Due GL: +20 (positive, no pSign — matches step 3 of postAccountEntries)
  IF v_due_gl IS NOT NULL THEN
    INSERT INTO "ACCOUNT_TRANS" ("TRANCODE","VOUNUM","VOUSRL","VOUDATE","GL_CODE","AMOUNT","LOCID")
    VALUES ('RTP','SP000039', CAST(v_next_srl AS text), '2026-05-11', v_due_gl, 20.00, '1');
  END IF;
END $$;

-- ── SP000040 — should have TCS = 10.00, GRAND_TOTAL = 1,040.00 ────────────
DO $$
DECLARE
  v_tcs_gl   int;
  v_due_gl   int;
  v_next_srl int;
BEGIN
  SELECT "TCS_AC", "CUSTOMER_DUE" INTO v_tcs_gl, v_due_gl FROM "SETUP_INFO" LIMIT 1;

  UPDATE "STONE_PURCHASE"
     SET "TCS_AMT"         = 10.00,
         "TCS_TAXABLE_AMT" = 1000.00,
         "GRAND_TOTAL"     = 1040.00
   WHERE "TRANCODE" = 'RTP' AND "VOUNUM" = 'SP000040';

  SELECT COALESCE(MAX(CAST("VOUSRL" AS int)), 0) + 1
    INTO v_next_srl
    FROM "ACCOUNT_TRANS"
   WHERE "TRANCODE" = 'RTP' AND "VOUNUM" = 'SP000040';

  IF v_tcs_gl IS NOT NULL THEN
    INSERT INTO "ACCOUNT_TRANS" ("TRANCODE","VOUNUM","VOUSRL","VOUDATE","GL_CODE","AMOUNT","LOCID")
    VALUES ('RTP','SP000040', CAST(v_next_srl AS text), '2026-05-11', v_tcs_gl,  10.00, '1');
    v_next_srl := v_next_srl + 1;
  END IF;

  IF v_due_gl IS NOT NULL THEN
    INSERT INTO "ACCOUNT_TRANS" ("TRANCODE","VOUNUM","VOUSRL","VOUDATE","GL_CODE","AMOUNT","LOCID")
    VALUES ('RTP','SP000040', CAST(v_next_srl AS text), '2026-05-11', v_due_gl, 10.00, '1');
  END IF;
END $$;

-- ── Verification — both vouchers should sum to 0 in ACCOUNT_TRANS ──────────
SELECT "VOUNUM",
       SUM("AMOUNT")::numeric(14,2) AS account_trans_balance,
       (SELECT "GRAND_TOTAL" FROM "STONE_PURCHASE" sp
         WHERE sp."TRANCODE"='RTP' AND sp."VOUNUM" = at."VOUNUM") AS new_grand_total
FROM "ACCOUNT_TRANS" at
WHERE "TRANCODE" = 'RTP' AND "VOUNUM" IN ('SP000039','SP000040')
GROUP BY "VOUNUM";

-- Review the output. If balanced (account_trans_balance = 0.00 for each),
-- replace ROLLBACK with COMMIT and re-run.
ROLLBACK;
