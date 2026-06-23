import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Generic report queries reused across the legacy WinGold report tree.
 * Patterns implemented:
 *   - Single table   →  stoneMasterList()
 *   - Temporary table →  stoneBalanceAsOfDate()  (mirrored as a CTE)
 *   - Sub report     →  customerLedger()         (master + nested detail)
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE TABLE — Stone Master List
  // Mirrors VB6 frmListMaster.frm `Case "STO"` (LIST_STONE.Rpt).
  // ─────────────────────────────────────────────────────────────────────────
  async stoneMasterList(filter: { q?: string; active?: string }) {
    const where: Prisma.StoneMasterWhereInput = {};
    if (filter.q?.trim()) {
      const q = filter.q.trim();
      where.OR = [
        { stoneCode:   { contains: q, mode: 'insensitive' } },
        { stoneSub:    { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filter.active === '1') where.active = 1;
    if (filter.active === '0') where.active = 0;

    const rows = await this.prisma.stoneMaster.findMany({
      where,
      orderBy: [{ stoneCode: 'asc' }, { stoneSub: 'asc' }],
    });

    return rows.map(r => ({
      stoneCode:   r.stoneCode,
      stoneSub:    r.stoneSub,
      description: r.description,
      uom:         r.uom,
      hsnCode:     r.hsnCode,
      stonePurc:   r.stonePurc,
      stoneSale:   r.stoneSale,
      active:      r.active,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEMPORARY TABLE — Stone Balance As Of Date
  //
  // Legacy VB6 pattern (frmPurchaseRegister.frm):
  //   1. DELETE FROM TEMP_PURCHASE
  //   2. SELECT … from source tables, INSERT into TEMP_PURCHASE
  //   3. Crystal renders TEMP_PURCHASE
  //
  // Modern equivalent: a single SQL statement with a CTE that computes the
  // same projection in-memory. No physical temp table needed.
  //
  // Sign convention: receipts +, issues − (same as STONE_TRANS p_sign rule).
  //   RTP, ITS  →  receipt  (+)
  //   ITP, RTS  →  issue    (-)
  //   Anything else falls back to + (treated as receipt) for safety.
  // ─────────────────────────────────────────────────────────────────────────
  async stoneBalanceAsOfDate(filter: { asOf?: string; stoneCode?: string }) {
    const asOf = filter.asOf || new Date().toISOString().slice(0, 10);
    const codeFilter = filter.stoneCode?.trim() || null;

    // $queryRaw with parameterized values — Prisma escapes the bindings.
    const rows = await this.prisma.$queryRaw<{
      stone_code:    string;
      stone_sub:     string;
      description:   string | null;
      uom:           string | null;
      receipt_pcs:   number;
      receipt_wt:    string;
      issue_pcs:     number;
      issue_wt:      string;
      closing_pcs:   number;
      closing_wt:    string;
    }[]>`
      WITH txns AS (
        SELECT
          st."STONE_CODE" AS stone_code,
          st."STONE_SUB"  AS stone_sub,
          CASE WHEN st."TRANCODE" IN ('RTP','ITS') THEN  1
               WHEN st."TRANCODE" IN ('ITP','RTS') THEN -1
               ELSE 1 END AS sign,
          COALESCE(st."PCS",    0) AS pcs,
          COALESCE(st."WEIGHT", 0) AS wt
        FROM "STONE_TRANS" st
        JOIN "STONE_PURCHASE" h
          ON h."TRANCODE" = st."TRANCODE" AND h."VOUNUM" = st."VOUNUM"
        WHERE h."VOUDATE" <= ${asOf}::date
          AND h."CANCEL" IS NOT TRUE
          AND (${codeFilter}::text IS NULL OR st."STONE_CODE" = ${codeFilter})
      )
      SELECT
        t.stone_code,
        t.stone_sub,
        sm."DESCRIPTION" AS description,
        sm."UOM"         AS uom,
        SUM(CASE WHEN t.sign =  1 THEN t.pcs ELSE 0 END)::int             AS receipt_pcs,
        SUM(CASE WHEN t.sign =  1 THEN t.wt  ELSE 0 END)::numeric(14,3)   AS receipt_wt,
        SUM(CASE WHEN t.sign = -1 THEN t.pcs ELSE 0 END)::int             AS issue_pcs,
        SUM(CASE WHEN t.sign = -1 THEN t.wt  ELSE 0 END)::numeric(14,3)   AS issue_wt,
        SUM(t.sign * t.pcs)::int                                          AS closing_pcs,
        SUM(t.sign * t.wt)::numeric(14,3)                                 AS closing_wt
      FROM txns t
      LEFT JOIN "STONE_MASTER" sm
        ON sm."STONE_CODE" = t.stone_code AND sm."STONE_SUB" = t.stone_sub
      GROUP BY t.stone_code, t.stone_sub, sm."DESCRIPTION", sm."UOM"
      ORDER BY t.stone_code, t.stone_sub;
    `;

    return rows.map(r => ({
      stoneCode:   r.stone_code,
      stoneSub:    r.stone_sub,
      description: r.description ?? `${r.stone_code}-${r.stone_sub}`,
      uom:         r.uom ?? '',
      receiptPcs:  Number(r.receipt_pcs ?? 0),
      receiptWt:   Number(r.receipt_wt  ?? 0),
      issuePcs:    Number(r.issue_pcs   ?? 0),
      issueWt:     Number(r.issue_wt    ?? 0),
      closingPcs:  Number(r.closing_pcs ?? 0),
      closingWt:   Number(r.closing_wt  ?? 0),
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUB REPORT — Customer / Account Ledger
  //
  // Legacy WinGold "Customer Balance & Ledger" report.
  // Returns one master block + a child block of transactions for that account.
  // Caller selects the account; the report renders header info from
  // ACCOUNT_MASTER and a list of ACCOUNT_TRANS rows in the date range, with
  // a running balance computed in SQL.
  // ─────────────────────────────────────────────────────────────────────────
  async customerLedger(filter: { glCode: string; from?: string; to?: string }) {
    const glCode = +filter.glCode;
    if (!glCode) return { master: null, opening: 0, transactions: [], closing: 0 };

    const master = await this.prisma.accountMaster.findUnique({
      where: { glCode },
      select: {
        glCode: true, accName: true, accGroup: true, accCode: true,
        address1: true, address2: true, address3: true,
        currentBal: true, opening: true,
      },
    });
    if (!master) return { master: null, opening: 0, transactions: [], closing: 0 };

    const from = filter.from || '1900-01-01';
    const to   = filter.to   || new Date().toISOString().slice(0, 10);

    // Opening balance = ACCOUNT_MASTER.opening + sum(amount) of all txns BEFORE `from`.
    // Closing balance = opening + sum(amount) WHERE date in [from, to].
    const [openingRow] = await this.prisma.$queryRaw<{ opening: string }[]>`
      SELECT
        (COALESCE(${master.opening ?? 0}::numeric, 0)
          + COALESCE((SELECT SUM("AMOUNT") FROM "ACCOUNT_TRANS"
                      WHERE "GL_CODE" = ${glCode}
                        AND "VOUDATE" < ${from}), 0))::numeric(14,2) AS opening
    `;
    const opening = Number(openingRow?.opening ?? 0);

    const txns = await this.prisma.$queryRaw<{
      voudate:  string | null;
      trancode: string;
      vounum:   string;
      vousrl:   string;
      amount:   string;
      running:  string;
    }[]>`
      WITH ledger AS (
        SELECT
          "VOUDATE"  AS voudate,
          "TRANCODE" AS trancode,
          "VOUNUM"   AS vounum,
          "VOUSRL"   AS vousrl,
          "AMOUNT"::numeric(14,2) AS amount
        FROM "ACCOUNT_TRANS"
        WHERE "GL_CODE" = ${glCode}
          AND "VOUDATE" >= ${from}
          AND "VOUDATE" <= ${to}
      )
      SELECT
        voudate, trancode, vounum, vousrl, amount,
        (${opening}::numeric + SUM(amount) OVER (
          ORDER BY voudate, trancode, vounum, vousrl
        ))::numeric(14,2) AS running
      FROM ledger
      ORDER BY voudate, trancode, vounum, vousrl;
    `;

    const transactions = txns.map(t => ({
      voudate:  t.voudate,
      trancode: t.trancode,
      vounum:   t.vounum,
      vousrl:   t.vousrl,
      amount:   Number(t.amount),
      running:  Number(t.running),
    }));

    const closing = transactions.length
      ? transactions[transactions.length - 1].running
      : opening;

    return { master, opening, transactions, closing, from, to };
  }

  /** Dropdown options for customerLedger picker — accounts with debtor/creditor groups. */
  async ledgerAccountOptions(q?: string) {
    const where: Prisma.AccountMasterWhereInput = {};
    if (q?.trim()) {
      where.OR = [
        { accName: { contains: q.trim(), mode: 'insensitive' } },
        { accCode: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.accountMaster.findMany({
      where,
      select: { glCode: true, accName: true, accCode: true, accGroup: true },
      orderBy: { accName: 'asc' },
      take: 200,
    });
    return rows;
  }
}
