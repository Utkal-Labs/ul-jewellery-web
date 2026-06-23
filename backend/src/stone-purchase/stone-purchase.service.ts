import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStonePurchaseDto } from './dto/create-stone-purchase.dto';

const TRANCODE = 'RTP';
const P_SIGN = 1; // RTP/RTS = +1, ITP/ITS = -1

const toDate = (s?: string | null): Date | null => (s ? new Date(s) : null);

/**
 * Recompute the derived totals from the header percentages, the same way
 * the data-entry form does (see stone-purchase.component.ts GRAND_TOTAL).
 *
 * Some legacy rows in the DB have inconsistent stored TCS_AMT / GRAND_TOTAL —
 * the percentage column says 1% TCS but the amount column was saved as 0,
 * so the stored grand total ignores the TCS leg. Reports always recompute
 * to keep what the user sees on the report consistent with the entry form.
 */
function recomputeTotals(header: {
  totalAmount?: any; discPer?: any; taxAmt?: any; vatAmt?: any;
  tcsPer?: any; roundOff?: any;
}) {
  const stoneTotal = Number(header.totalAmount ?? 0);
  const discPer    = Number(header.discPer     ?? 0);
  const tcsPer     = Number(header.tcsPer      ?? 0);
  const taxAmt     = Number(header.taxAmt      ?? 0);
  const vatAmt     = Number(header.vatAmt      ?? 0);
  const roundOff   = Number(header.roundOff    ?? 0);

  const discAmt = +(stoneTotal * discPer / 100).toFixed(2);
  const tcsAmt  = +((stoneTotal - discAmt) * tcsPer / 100).toFixed(2);
  const grandTotal = +(stoneTotal - discAmt + taxAmt + vatAmt + tcsAmt + roundOff).toFixed(2);

  return { discAmt, tcsAmt, grandTotal };
}

/**
 * Build the HSN-wise GST tax summary directly from the line items
 * (STONE_TRANS). Mirrors how legacy Crystal Reports computes the bottom
 * "GST Tax Summary" block — group by (HSN, rate signature), sum amounts,
 * apply the CGST/SGST or IGST split based on whether the buyer is in-state.
 *
 * Why not use GST_TAXSUMMARY_DETAIL directly? Stale or empty rows produced
 * a blank "0,0" footer line even on vouchers that have HSN data on the
 * line items. Recomputing keeps the footer in sync with what's printed
 * in the line items grid.
 */
function computeHsnSummary(
  lines: { hsncode?: any; amount?: any; cgst?: any; sgst?: any; igst?: any; taxAmt?: any }[],
  intraState: boolean,
) {
  // Key by (HSN + rate signature) so different rates within the same HSN
  // surface as separate rows.
  const map = new Map<string, {
    hsncode: any;
    cgstRt:  number;
    sgstRt:  number;
    igstRt:  number;
    cgstAmt: number;
    sgstAmt: number;
    igstAmt: number;
    cess:    number;
    totTax:  number;
    txabamt: number;
  }>();

  for (const l of lines) {
    const cgstRt = intraState ? Number(l.cgst ?? 0) : 0;
    const sgstRt = intraState ? Number(l.sgst ?? 0) : 0;
    const igstRt = intraState ? 0 : Number(l.igst ?? 0);
    const hsnKey = l.hsncode != null ? String(l.hsncode) : '';
    const key = `${hsnKey}|${cgstRt}|${sgstRt}|${igstRt}`;

    if (!map.has(key)) {
      map.set(key, {
        hsncode: l.hsncode ?? null,
        cgstRt, sgstRt, igstRt,
        cgstAmt: 0, sgstAmt: 0, igstAmt: 0,
        cess: 0, totTax: 0, txabamt: 0,
      });
    }
    const row = map.get(key)!;
    const amt = Number(l.amount ?? 0);
    row.txabamt += amt;
    row.cgstAmt += amt * cgstRt / 100;
    row.sgstAmt += amt * sgstRt / 100;
    row.igstAmt += amt * igstRt / 100;
  }

  return Array.from(map.values()).map((r, i) => {
    const cgstAmt = +r.cgstAmt.toFixed(2);
    const sgstAmt = +r.sgstAmt.toFixed(2);
    const igstAmt = +r.igstAmt.toFixed(2);
    return {
      srl:     i + 1,
      hsncode: r.hsncode,
      cgstRt:  r.cgstRt,
      sgstRt:  r.sgstRt,
      igstRt:  r.igstRt,
      cgstAmt,
      sgstAmt,
      igstAmt,
      cess:    +r.cess.toFixed(2),
      totTax:  +(cgstAmt + sgstAmt + igstAmt + r.cess).toFixed(2),
      txabamt: +r.txabamt.toFixed(2),
    };
  });
}

function rethrowPrisma(e: unknown): never {
  if (e instanceof PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2002':
        throw new BadRequestException(
          `Duplicate record: ${(e.meta?.target as string[])?.join(', ')}`,
        );
      case 'P2003':
        throw new BadRequestException(
          `Foreign key violation on field: ${e.meta?.field_name ?? 'unknown'}`,
        );
      case 'P2000':
        throw new BadRequestException(
          `Value too long for a column (check date/text fields)`,
        );
      case 'P2025':
        throw new BadRequestException(
          `Record not found: ${e.meta?.cause ?? ''}`,
        );
      default:
        throw new InternalServerErrorException(
          `Database error ${e.code}: ${e.message}`,
        );
    }
  }
  throw e;
}

@Injectable()
export class StonePurchaseService {
  constructor(private prisma: PrismaService) {}

  // ─── READ ────────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.stonePurchase.findMany({
      where: { trancode: TRANCODE },
      include: { dealer: true, salesman: true },
      orderBy: { vounum: 'desc' },
    });
  }

  async findOne(vounum: string) {
    const record = await this.prisma.stonePurchase.findUnique({
      where: { trancode_vounum: { trancode: TRANCODE, vounum } },
      include: {
        dealer: true,
        salesman: true,
        stoneLines: { orderBy: { srl: 'asc' } },
        payments: {
          include: {
            account: { select: { glCode: true, accName: true, accGroup: true } },
          },
          orderBy: { srl: 'asc' },
        },
        gstSummary: { orderBy: { srl: 'asc' } },
      },
    });
    if (!record) throw new NotFoundException(`Voucher ${vounum} not found`);
    return record;
  }

  async getJournal(vounum: string) {
    const [header, stoneLines, payments, gstSummary, acctEntries] = await Promise.all([
      this.prisma.stonePurchase.findUnique({
        where: { trancode_vounum: { trancode: TRANCODE, vounum } },
        select: {
          vounum: true, voudate: true, trancode: true, dealerCode: true,
          discPer: true, discAmt: true, taxAmt: true,
          tcsPer: true, tcsAmt: true, grandTotal: true, roundOff: true,
        },
      }),
      this.prisma.stoneTrans.findMany({
        where: { trancode: TRANCODE, vounum },
        orderBy: { srl: 'asc' },
      }),
      this.prisma.customerPaidAmount.findMany({
        where: { trancode: TRANCODE, vounum },
        include: { account: { select: { accName: true } } },
        orderBy: { srl: 'asc' },
      }),
      this.prisma.gstTaxSummaryDetail.findMany({
        where: { trancode: TRANCODE, vounum },
        orderBy: { srl: 'asc' },
      }),
      this.prisma.accountTrans.findMany({
        where: { trancode: TRANCODE, vounum },
        include: { account: { select: { accName: true } } },
        orderBy: { vousrl: 'asc' },
      }),
    ]);

    if (!header) throw new NotFoundException(`Voucher ${vounum} not found`);

    const balance = acctEntries.reduce((s, e) => s + Number(e.amount ?? 0), 0);

    return {
      header,
      stoneLines,
      payments: payments.map(p => ({ ...p, accName: p.account?.accName ?? null })),
      gstSummary,
      accountEntries: acctEntries.map(e => ({
        vousrl:  e.vousrl,
        glCode:  e.glCode,
        accName: e.account?.accName ?? null,
        amount:  Number(e.amount),
      })),
      balance:  +balance.toFixed(6),
      balanced: Math.abs(balance) < 0.01,
    };
  }

  // ─── REGISTER (filter listing — Stone Purchase Register report) ─────────
  // Mirrors VB6 frmPurchaseRegister: date range + optional dealer / amount
  // filter, optional trancode override (RTP=purchase, ITP=purchase return).
  async getRegister(filter: {
    from?: string;
    to?: string;
    dealerCode?: string;
    trancode?: string;
    vounum?: string;        // exact match (preferred for single-voucher search)
    vounumFrom?: string;    // range start
    vounumTo?: string;      // range end
    minAmount?: number;
  }) {
    const where: any = {
      trancode: filter.trancode || TRANCODE,
    };

    if (filter.from || filter.to) {
      where.voudate = {};
      if (filter.from) where.voudate.gte = new Date(filter.from);
      if (filter.to)   where.voudate.lte = new Date(filter.to);
    }

    if (filter.dealerCode) where.dealerCode = filter.dealerCode;

    // Exact-match voucher search takes precedence over range when both are set.
    if (filter.vounum?.trim()) {
      where.vounum = filter.vounum.trim();
    } else if (filter.vounumFrom || filter.vounumTo) {
      where.vounum = {};
      if (filter.vounumFrom) where.vounum.gte = filter.vounumFrom;
      if (filter.vounumTo)   where.vounum.lte = filter.vounumTo;
    }

    if (filter.minAmount && filter.minAmount > 0) {
      where.grandTotal = { gte: filter.minAmount };
    }

    const rows = await this.prisma.stonePurchase.findMany({
      where,
      include: { dealer: { select: { code: true, name: true } } },
      orderBy: [{ voudate: 'desc' }, { vounum: 'desc' }],
    });

    return rows.map(r => {
      const t = recomputeTotals(r);
      return {
        trancode:    r.trancode,
        vounum:      r.vounum,
        voudate:     r.voudate,
        dealerCode:  r.dealerCode,
        dealerName:  r.dealer?.name ?? null,
        refBillNo:   r.refBillNo,
        refBillDate: r.refBillDate,
        totalAmount: Number(r.totalAmount ?? 0),
        discAmt:     t.discAmt,
        taxAmt:      Number(r.taxAmt ?? 0),
        tcsAmt:      t.tcsAmt,
        roundOff:    Number(r.roundOff ?? 0),
        grandTotal:  t.grandTotal,
        cancel:      r.cancel,
        narration:   r.narration,
      };
    });
  }

  // ─── PRINT DATA (Stone Purchase Voucher report) ──────────────────────────
  // Bundles header + child rows + dealer + state name + company setup.
  // Used by the frontend Print page (pdfmake renderer).
  async getPrintData(vounum: string) {
    const record = await this.prisma.stonePurchase.findUnique({
      where: { trancode_vounum: { trancode: TRANCODE, vounum } },
      include: {
        dealer: true,
        salesman: true,
        stoneLines: { orderBy: { srl: 'asc' } },
        payments: {
          include: {
            account: { select: { glCode: true, accName: true, accGroup: true } },
          },
          orderBy: { srl: 'asc' },
        },
        gstSummary: { orderBy: { srl: 'asc' } },
      },
    });
    if (!record) throw new NotFoundException(`Voucher ${vounum} not found`);

    const setup = await this.prisma.setupInfo.findFirst();

    // Dealer state name lookup (DealerMaster.state may already hold it; fall back to GstStateMaster.idState)
    let dealerStateName: string | null = record.dealer?.state ?? null;
    if (!dealerStateName && record.dealer?.idState) {
      const st = await this.prisma.gstStateMaster.findUnique({
        where: { id: record.dealer.idState },
      });
      dealerStateName = st?.stateName ?? null;
    }

    // Look up stone master entries for every distinct (stoneCode, stoneSub) used in this voucher
    // so we can fill missing description / HSN / UOM on the transaction rows.
    const keyOf = (c: string | null, s: string | null) => `${c ?? ''}|${s ?? ''}`;
    const distinct = Array.from(new Map(
      record.stoneLines
        .filter(l => l.stoneCode && l.stoneSub)
        .map(l => [keyOf(l.stoneCode, l.stoneSub),
                   { stoneCode: l.stoneCode!, stoneSub: l.stoneSub! }]),
    ).values());
    const masters = distinct.length
      ? await this.prisma.stoneMaster.findMany({
          where: { OR: distinct.map(k => ({ stoneCode: k.stoneCode, stoneSub: k.stoneSub })) },
          select: { stoneCode: true, stoneSub: true, description: true, hsnCode: true, uom: true },
        })
      : [];
    const masterByKey = new Map(masters.map(m => [keyOf(m.stoneCode, m.stoneSub), m]));

    // Recompute derived totals to match the data-entry form (see helper above).
    const t = recomputeTotals(record);

    // Enriched line items (with stone-master fallback) — built once, reused
    // for both the line-items grid and the HSN/GST tax summary aggregation.
    const enrichedLines = record.stoneLines.map(l => {
      const m = masterByKey.get(keyOf(l.stoneCode, l.stoneSub));
      return {
        srl:         l.srl,
        stoneCode:   l.stoneCode,
        stoneSub:    l.stoneSub,
        description: l.description?.trim()
                       || m?.description
                       || (l.stoneCode && l.stoneSub ? `${l.stoneCode}-${l.stoneSub}` : ''),
        uom:         l.uom || m?.uom || '',
        pcs:         l.pcs ?? 0,
        weight:      Number(l.weight ?? 0),
        rate:        Number(l.rate   ?? 0),
        amount:      Number(l.amount ?? 0),
        hsncode:     l.hsncode ?? m?.hsnCode ?? null,
        taxAmt:      Number(l.taxAmt ?? 0),
        cgst:        Number(l.cgst   ?? 0),
        sgst:        Number(l.sgst   ?? 0),
        igst:        Number(l.igst   ?? 0),
      };
    });

    // Decide intra-state vs inter-state once on the server so the GST split
    // is consistent across the line items, the totals, and the HSN summary.
    const dealerStateId  = record.dealer?.idState != null ? String(record.dealer.idState) : null;
    const companyStateId = setup?.stateCode != null
      ? String(setup.stateCode).replace(/^0+/, '') : null;
    const intraState = !!(dealerStateId && companyStateId && dealerStateId === companyStateId);

    // HSN-wise GST summary — always aggregated from the line items so the
    // footer never shows a stale "0 0" placeholder when the lines have data.
    const aggregatedGstSummary = computeHsnSummary(enrichedLines, intraState);

    return {
      voucher: {
        trancode:      record.trancode,
        vounum:        record.vounum,
        voudate:       record.voudate,
        refBillNo:     record.refBillNo,
        refBillDate:   record.refBillDate,
        totalAmount:   Number(record.totalAmount  ?? 0),
        discPer:       Number(record.discPer      ?? 0),
        discAmt:       t.discAmt,
        taxAmt:        Number(record.taxAmt       ?? 0),
        vatPer:        Number(record.vatPer       ?? 0),
        vatAmt:        Number(record.vatAmt       ?? 0),
        tcsTaxableAmt: Number(record.tcsTaxableAmt ?? 0),
        tcsPer:        Number(record.tcsPer       ?? 0),
        tcsAmt:        t.tcsAmt,
        roundOff:      Number(record.roundOff     ?? 0),
        grandTotal:    t.grandTotal,
        narration:     record.narration,
        panNo:         record.panNo,
        cancel:        record.cancel,
      },
      dealer: record.dealer
        ? {
            code:     record.dealer.code,
            name:     record.dealer.name,
            address1: record.dealer.address1,
            address2: record.dealer.address2,
            address3: record.dealer.address3,
            gstin:    record.dealer.gstin,
            idState:  record.dealer.idState,
            state:    dealerStateName,
          }
        : null,
      salesman: record.salesman
        ? { code: record.salesman.code, name: record.salesman.name }
        : null,
      stoneLines: enrichedLines,
      payments: record.payments.map(p => ({
        srl:      p.srl,
        glCode:   p.glCode,
        accName:  p.account?.accName  ?? null,
        accGroup: p.account?.accGroup ?? null,
        chno:     p.chno,
        chdate:   p.chdate,
        amount:   Number(p.amount ?? 0),
      })),
      // Aggregated from the line items, NOT the stored GST_TAXSUMMARY_DETAIL
      // rows (which can be stale or empty). Keeps the footer in sync with
      // the line items grid printed above it.
      gstSummary: aggregatedGstSummary,
      company: setup
        ? {
            compName:  setup.compName,
            address1:  setup.address1,
            address2:  setup.address2,
            address3:  setup.address3,
            phone:     setup.phone,
            gstinno:   setup.gstinno,
            stateCode: setup.stateCode,
            compPan:   setup.compPan,
          }
        : null,
    };
  }

  async findFirst() {
    const rec = await this.prisma.stonePurchase.findFirst({
      where: { trancode: TRANCODE },
      orderBy: { vounum: 'asc' },
    });
    if (!rec) return null;
    return this.findOne(rec.vounum);
  }

  async findLast() {
    const rec = await this.prisma.stonePurchase.findFirst({
      where: { trancode: TRANCODE },
      orderBy: { vounum: 'desc' },
    });
    if (!rec) return null;
    return this.findOne(rec.vounum);
  }

  async findNext(currentVounum: string) {
    const rec = await this.prisma.stonePurchase.findFirst({
      where: { trancode: TRANCODE, vounum: { gt: currentVounum } },
      orderBy: { vounum: 'asc' },
    });
    if (!rec) return this.findOne(currentVounum);
    return this.findOne(rec.vounum);
  }

  async findPrev(currentVounum: string) {
    const rec = await this.prisma.stonePurchase.findFirst({
      where: { trancode: TRANCODE, vounum: { lt: currentVounum } },
      orderBy: { vounum: 'desc' },
    });
    if (!rec) return this.findOne(currentVounum);
    return this.findOne(rec.vounum);
  }

  async previewVounum(): Promise<{ vounum: string }> {
    const header = await this.prisma.idHeader.findUnique({
      where: { trancode: 'ISP' },
    });
    const next = (header?.currentno ?? 0) + 1;
    const prefix = header?.prefix ?? 'SP';
    return { vounum: `${prefix}${String(next).padStart(6, '0')}` };
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────

  async create(dto: CreateStonePurchaseDto, username: string) {
    const vounum = await this.generateVounum();
    const now = new Date().toISOString().substring(0, 19);

    await this.prisma
      .$transaction(async (tx) => {
        await this.validate(dto, tx);

        const dealer = (dto.DEALER_CODE && !dto.IS_CUSTOMER)
          ? await tx.dealerMaster.findUnique({
              where: { code: dto.DEALER_CODE },
            })
          : null;

        // ── Header ──────────────────────────────────────────────────────────
        await tx.stonePurchase.create({
          data: {
            trancode:      TRANCODE,
            vounum,
            voudate:       toDate(dto.VOUDATE),
            // IS_CUSTOMER=1: stone from retail customer, no dealer FK
            dealerCode:    (dto.IS_CUSTOMER ? null : dto.DEALER_CODE)  ?? null,
            refBillNo:     dto.REF_BILL_NO?.substring(0, 15) ?? null,
            refBillDate:   toDate(dto.REF_BILL_DATE),
            // null-safe: salesman codes are 4-char master keys
            salesmanCode:  (dto.SALESMAN_CODE && dto.SALESMAN_CODE.length <= 4)
                             ? dto.SALESMAN_CODE : null,
            isCustomer:    dto.IS_CUSTOMER   ?? 0,
            totalAmount:   dto.TOTAL_AMOUNT  ?? 0,
            discPer:       dto.DISC_PER      ?? 0,
            discAmt:       dto.DISC_AMT      ?? 0,
            taxAmt:        dto.TAX_AMT       ?? 0,
            vatPer:        dto.VAT_PER       ?? 0,
            vatAmt:        dto.VAT_AMT       ?? 0,
            tcsTaxableAmt: dto.TCS_TAXABLE_AMT ?? 0,
            tcsPer:        dto.TCS_PER       ?? 1,
            tcsAmt:        dto.TCS_AMT       ?? 0,
            roundOff:      dto.ROUND_OFF     ?? 0,
            grandTotal:    dto.GRAND_TOTAL   ?? 0,
            narration:     dto.NARRATION?.substring(0, 200) ?? null,
            panNo:         dto.PAN_NO?.substring(0, 12)    ?? null,
            timeofsave:    now,
          },
        });

        // ── Stone lines ─────────────────────────────────────────────────────
        await this.insertStoneLines(tx, vounum, dto);

        // ── Payments ────────────────────────────────────────────────────────
        await this.insertPayments(tx, vounum, dto);

        // ── GST summary ─────────────────────────────────────────────────────
        await this.insertGstSummary(tx, vounum, dto);

        // ── Account ledger (double-entry) ───────────────────────────────────
        await this.postAccountEntries(tx, vounum, dto, dealer?.glCode ?? null);

        // ── Audit ───────────────────────────────────────────────────────────
        await tx.userAdditionBy.create({
          data: {
            formCaption: 'Stone Purchase',
            addVou:  vounum,
            addDate: now.substring(0, 10),
            addTime: now.substring(11, 19),
            userName: username,
          },
        });
      }, { timeout: 30000, maxWait: 10000 })
      .catch(rethrowPrisma);

    return this.findOne(vounum);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  async update(vounum: string, dto: CreateStonePurchaseDto, username: string) {
    await this.findOne(vounum); // 404 guard
    const now = new Date().toISOString().substring(0, 19);

    await this.prisma
      .$transaction(async (tx) => {
        await this.validate(dto, tx);

        // Delete all child rows first
        await tx.stoneTrans.deleteMany({ where: { trancode: TRANCODE, vounum } });
        await tx.customerPaidAmount.deleteMany({ where: { trancode: TRANCODE, vounum } });
        await tx.gstTaxSummaryDetail.deleteMany({ where: { trancode: TRANCODE, vounum } });
        await tx.accountTrans.deleteMany({ where: { trancode: TRANCODE, vounum } });

        const dealer = (dto.DEALER_CODE && !dto.IS_CUSTOMER)
          ? await tx.dealerMaster.findUnique({
              where: { code: dto.DEALER_CODE },
            })
          : null;

        // ── Header ──────────────────────────────────────────────────────────
        await tx.stonePurchase.update({
          where: { trancode_vounum: { trancode: TRANCODE, vounum } },
          data: {
            voudate:       toDate(dto.VOUDATE),
            dealerCode:    (dto.IS_CUSTOMER ? null : dto.DEALER_CODE)  ?? null,
            refBillNo:     dto.REF_BILL_NO?.substring(0, 15) ?? null,
            refBillDate:   toDate(dto.REF_BILL_DATE),
            salesmanCode:  (dto.SALESMAN_CODE && dto.SALESMAN_CODE.length <= 4)
                             ? dto.SALESMAN_CODE : null,
            isCustomer:    dto.IS_CUSTOMER   ?? 0,
            totalAmount:   dto.TOTAL_AMOUNT  ?? 0,
            discPer:       dto.DISC_PER      ?? 0,
            discAmt:       dto.DISC_AMT      ?? 0,
            taxAmt:        dto.TAX_AMT       ?? 0,
            vatPer:        dto.VAT_PER       ?? 0,
            vatAmt:        dto.VAT_AMT       ?? 0,
            tcsTaxableAmt: dto.TCS_TAXABLE_AMT ?? 0,
            tcsPer:        dto.TCS_PER       ?? 1,
            tcsAmt:        dto.TCS_AMT       ?? 0,
            roundOff:      dto.ROUND_OFF     ?? 0,
            grandTotal:    dto.GRAND_TOTAL   ?? 0,
            narration:     dto.NARRATION     ?? null,
            panNo:         dto.PAN_NO        ?? null,
          },
        });

        // ── Stone lines ─────────────────────────────────────────────────────
        await this.insertStoneLines(tx, vounum, dto);

        // ── Payments ────────────────────────────────────────────────────────
        await this.insertPayments(tx, vounum, dto);

        // ── GST summary ─────────────────────────────────────────────────────
        await this.insertGstSummary(tx, vounum, dto);

        // ── Account ledger (double-entry) ───────────────────────────────────
        await this.postAccountEntries(tx, vounum, dto, dealer?.glCode ?? null);

        // ── Audit ───────────────────────────────────────────────────────────
        await tx.userModifiedBy.create({
          data: {
            formCaption: 'Stone Purchase',
            modVou:  vounum,
            modDate: now.substring(0, 10),
            modTime: now.substring(11, 19),
            userName: username,
          },
        });
      }, { timeout: 30000, maxWait: 10000 })
      .catch(rethrowPrisma);

    return this.findOne(vounum);
  }

  // ─── CANCEL ──────────────────────────────────────────────────────────────

  async cancel(vounum: string, username: string) {
    const record = await this.findOne(vounum); // 404 guard
    if (record.cancel === 1) {
      throw new BadRequestException(`Voucher ${vounum} is already cancelled.`);
    }
    const now = new Date().toISOString().substring(0, 19);

    await this.prisma.$transaction(async (tx) => {
      // Delete all child rows (mirrors VB6 ButtClass_CancelVou)
      await tx.stoneTrans.deleteMany({ where: { trancode: TRANCODE, vounum } });
      await tx.customerPaidAmount.deleteMany({ where: { trancode: TRANCODE, vounum } });
      await tx.gstTaxSummaryDetail.deleteMany({ where: { trancode: TRANCODE, vounum } });
      await tx.accountTrans.deleteMany({ where: { trancode: TRANCODE, vounum } });

      // Zero the header and mark as cancelled (keeps the vounum in the system)
      await tx.stonePurchase.update({
        where: { trancode_vounum: { trancode: TRANCODE, vounum } },
        data: {
          cancel:        1,
          dealerCode:    null,
          salesmanCode:  null,
          totalAmount:   0,
          discPer:       0,
          discAmt:       0,
          taxAmt:        0,
          vatPer:        0,
          vatAmt:        0,
          tcsTaxableAmt: 0,
          tcsPer:        0,
          tcsAmt:        0,
          roundOff:      0,
          grandTotal:    0,
        },
      });

      await tx.userModifiedBy.create({
        data: {
          formCaption: 'Stone Purchase',
          modVou:  vounum,
          modDate: now.substring(0, 10),
          modTime: now.substring(11, 19),
          userName: username,
        },
      });
    }).catch(rethrowPrisma);

    return this.findOne(vounum);
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────

  async remove(vounum: string, username: string) {
    const now = new Date().toISOString().substring(0, 19);
    await this.prisma.$transaction(async (tx) => {
      await tx.stoneTrans.deleteMany({ where: { trancode: TRANCODE, vounum } });
      await tx.customerPaidAmount.deleteMany({ where: { trancode: TRANCODE, vounum } });
      await tx.gstTaxSummaryDetail.deleteMany({ where: { trancode: TRANCODE, vounum } });
      await tx.accountTrans.deleteMany({ where: { trancode: TRANCODE, vounum } });
      await tx.stonePurchase.delete({
        where: { trancode_vounum: { trancode: TRANCODE, vounum } },
      });
      await tx.userDeletedBy.create({
        data: {
          formCaption: 'Stone Purchase',
          delVou:  vounum,
          delDate: now.substring(0, 10),
          delTime: now.substring(11, 19),
          userName: username,
        },
      });
    });
    return { deleted: vounum };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────

  private async insertStoneLines(tx: any, vounum: string, dto: CreateStonePurchaseDto) {
    for (let i = 0; i < (dto.stoneLines ?? []).length; i++) {
      const line = dto.stoneLines[i];
      await tx.stoneTrans.create({
        data: {
          trancode:    TRANCODE,
          vounum,
          srl:         i + 1,
          stoneCode:   line.STONE_CODE  ?? null,
          stoneSub:    line.STONE_SUB   ?? null,
          description: line.DESCRIPTION ?? null,
          uom:         line.UOM         ?? null,
          pcs:         line.PCS         ?? 0,
          weight:      line.WEIGHT      ?? 0,
          rate:        line.RATE        ?? 0,
          amount:      line.AMOUNT      ?? 0,
          packetNo:    line.PACKET_NO   ?? null,
          taxAmt:      line.TAX_AMT     ?? 0,
          hsncode:     line.HSNCODE     ?? null,
          cgst:        line.CGST        ?? 0,
          sgst:        line.SGST        ?? 0,
          igst:        line.IGST        ?? 0,
        },
      });
    }
  }

  private async insertPayments(tx: any, vounum: string, dto: CreateStonePurchaseDto) {
    for (let i = 0; i < (dto.payments ?? []).length; i++) {
      const pay = dto.payments[i];
      await tx.customerPaidAmount.create({
        data: {
          trancode: TRANCODE,
          vounum,
          srl:    i + 1,
          glCode: pay.GL_CODE ?? null,
          chno:   pay.CHNO   ?? null,
          chdate: pay.CHDATE || null,
          amount: pay.AMOUNT ?? 0,
        },
      });
    }
  }

  private async insertGstSummary(tx: any, vounum: string, dto: CreateStonePurchaseDto) {
    for (let i = 0; i < (dto.gstSummary ?? []).length; i++) {
      const g = dto.gstSummary![i];
      await tx.gstTaxSummaryDetail.create({
        data: {
          trancode: TRANCODE,
          vounum,
          srl:     i + 1,
          hsncode: g.HSNCODE  ?? null,
          cgstRt:  g.CGST_RT  ?? 0,
          cgstAmt: g.CGST_AMT ?? 0,
          sgstRt:  g.SGST_RT  ?? 0,
          sgstAmt: g.SGST_AMT ?? 0,
          igstRt:  g.IGST_RT  ?? 0,
          igstAmt: g.IGST_AMT ?? 0,
          cess:    g.CESS     ?? 0,
          totTax:  g.TOT_TAX  ?? 0,
          txabamt: g.TXABAMT  ?? 0,
        },
      });
    }
  }

  // ── Validation (mirrors VB6 IsEntryOk) ───────────────────────────────────
  private async validate(dto: CreateStonePurchaseDto, tx: any) {
    if (!dto.TOTAL_AMOUNT || dto.TOTAL_AMOUNT <= 0) {
      throw new BadRequestException('Total amount must be greater than 0');
    }

    // IS_CUSTOMER=1 means stone bought from a retail customer — no dealer master lookup
    if (dto.DEALER_CODE && !dto.IS_CUSTOMER) {
      const dealer = await tx.dealerMaster.findUnique({
        where: { code: dto.DEALER_CODE },
      });
      if (!dealer)
        throw new BadRequestException(`Dealer '${dto.DEALER_CODE}' not found`);
    }

    const totalPaid = (dto.payments ?? []).reduce(
      (s, p) => s + (p.AMOUNT ?? 0),
      0,
    );
    const grandTotal = dto.GRAND_TOTAL ?? 0;
    if (totalPaid > grandTotal + 0.005) {
      throw new BadRequestException(
        `Payment total (${totalPaid.toFixed(2)}) exceeds grand total (${grandTotal.toFixed(2)})`,
      );
    }

    for (const line of dto.stoneLines ?? []) {
      if (line.STONE_CODE && line.STONE_SUB) {
        const stone = await tx.stoneMaster.findUnique({
          where: {
            stoneCode_stoneSub: {
              stoneCode: line.STONE_CODE,
              stoneSub:  line.STONE_SUB,
            },
          },
        });
        if (!stone) {
          throw new BadRequestException(
            `Stone ${line.STONE_CODE}/${line.STONE_SUB} not found in Stone Master`,
          );
        }
      }
      if ((line.AMOUNT ?? 0) < 0) {
        throw new BadRequestException('Stone line amount cannot be negative');
      }
    }

    for (const pay of dto.payments ?? []) {
      if (pay.GL_CODE) {
        const acct = await tx.accountMaster.findUnique({
          where: { glCode: pay.GL_CODE },
        });
        if (acct?.accGroup === 1 && !pay.CHNO?.trim()) {
          throw new BadRequestException(
            `Cheque number required for bank account GL ${pay.GL_CODE}`,
          );
        }
      }
    }
  }

  // ── Double-entry ledger posting ───────────────────────────────────────────
  //
  //  VB6 pSign reference:
  //    RTP / RTS  →  pSign = +1
  //    ITP / ITS  →  pSign = -1
  //
  //  Sign rules per entry type (for RTP, pSign = +1):
  //    Stone Purchase a/c   →  +amount   (Debit)
  //    Tax / GST / TCS      →  +amount   (Debit)
  //    Discount             →  -amount   (Credit, pSign * -1)
  //    Cash/Bank payment    →  -amount   (Credit, pSign * -1)
  //    Dealer balance due   →  -amount   (Credit, pSign * -1)
  //    Customer Due (no dealer) → +amount (no pSign — hardcoded positive in VB6)
  //    Round Off            →  ± (depends on chk1 + tcode prefix)
  //
  //  SUM of all account_trans.amount for one voucher MUST = 0
  //
  private async postAccountEntries(
    tx: any,
    vounum: string,
    dto: CreateStonePurchaseDto,
    dealerGlCode: number | null,
  ) {
    const voudate = dto.VOUDATE ?? null;
    let vousrl = 1;
    let totalPaid = 0;

    // Setup info is optional — GL codes for GST/discount/round-off default to null when absent
    const setup = await tx.setupInfo.findFirst();

    // Helper: insert one account_trans row
    const post = async (glCode: number, amount: number) => {
      if (!glCode || amount === 0) return;
      await tx.accountTrans.create({
        data: {
          trancode: TRANCODE,
          vounum,
          vousrl:  String(vousrl++),
          voudate,
          glCode,
          amount,
          locid: '1',
        },
      });
    };

    // ── STEP 1 — Payment entries (Credit side) ─────────────────────────────
    // VB6: amount = paymentAmount * (pSign * -1)
    // RTP pSign=+1 → multiplier = -1 → Credit (negative)
    for (const pay of dto.payments ?? []) {
      const amt = pay.AMOUNT ?? 0;
      if (!pay.GL_CODE || amt === 0) continue;
      await post(pay.GL_CODE, -(amt * P_SIGN)); // Credit
      totalPaid += amt;
    }

    // ── STEP 2 — Dealer balance outstanding (Credit side) ──────────────────
    // VB6: amount = (TotalAmt - sumPaid) * (pSign * -1)
    // Only when dealer exists AND partial payment
    const grandTotal = dto.GRAND_TOTAL ?? 0;
    const outstanding = grandTotal - totalPaid;

    if (dealerGlCode && outstanding > 0.005) {
      await post(dealerGlCode, -(outstanding * P_SIGN)); // Credit
    }

    // ── STEP 3 — Customer Due (no dealer, partial payment) ─────────────────
    // VB6: amount = (TotalAmt - sumPaid)  ← NO pSign, always positive
    if (!dealerGlCode && outstanding > 0.005 && setup?.customerDueGl) {
      await post(setup.customerDueGl, outstanding); // Positive — no pSign
    }

    // ── STEP 4 — Stone Purchase account per line (Debit side) ──────────────
    // VB6: GL = StnMast!STONE_PURC, amount = row_amount * pSign
    // Each stone line gets its own entry
    for (const line of dto.stoneLines ?? []) {
      const amt = line.AMOUNT ?? 0;
      if (!line.STONE_CODE || !line.STONE_SUB || amt === 0) continue;

      const stone = await tx.stoneMaster.findUnique({
        where: {
          stoneCode_stoneSub: {
            stoneCode: line.STONE_CODE,
            stoneSub:  line.STONE_SUB,
          },
        },
        select: { stonePurc: true },
      });

      if (!stone?.stonePurc) {
        throw new BadRequestException(
          `Stone ${line.STONE_CODE}/${line.STONE_SUB} has no purchase GL account linked in Stone Master`,
        );
      }

      await post(stone.stonePurc, amt * P_SIGN); // Debit
    }

    // ── STEP 5 — TCS old / legacy (Debit side) ────────────────────────────
    // VB6: GL = Pramset!TCS_AC, amount = TcsAmt * pSign
    const tcsAmt = dto.TCS_AMT ?? 0;
    if (tcsAmt > 0 && setup?.tcsAcGl) {
      await post(setup.tcsAcGl, tcsAmt * P_SIGN); // Debit
    }

    // ── STEP 6 — Discount (Credit side) ───────────────────────────────────
    // VB6: GL = Pramset!discount_allowed, amount = discount * pSign * -1
    const discAmt = dto.DISC_AMT ?? 0;
    if (discAmt > 0 && setup?.discountAllowedGl) {
      await post(setup.discountAllowedGl, -(discAmt * P_SIGN)); // Credit
    }

    // ── STEP 7 — Purchase Tax / VAT (Debit side) ──────────────────────────
    // VB6: GL = Pramset!PURCHASE_TAX (for RTP/ITP), amount = salesTax * pSign
    // In new schema vatAmt is the pre-GST tax equivalent
    const vatAmt = dto.VAT_AMT ?? 0;
    if (vatAmt > 0 && setup?.purchaseTaxGl) {
      await post(setup.purchaseTaxGl, vatAmt * P_SIGN); // Debit
    }

    // ── STEP 8 — GST posting (Debit side) ─────────────────────────────────
    // VB6: uses gstSummary rows (HSN-wise) if Glb_Separate_GstAcPost,
    //      else single CGST/SGST or IGST entry from Pramset GL codes.
    //
    // Strategy here: use gstSummary rows sent from frontend if available,
    // else fall back to taxAmt split from header.
    //
    const gstSummaryRows = dto.gstSummary ?? [];

    if (gstSummaryRows.length > 0) {
      // HSN-wise posting — each summary row → separate CGST+SGST or IGST entry
      for (const g of gstSummaryRows) {
        const cgstAmt = g.CGST_AMT ?? 0;
        const sgstAmt = g.SGST_AMT ?? 0;
        const igstAmt = g.IGST_AMT ?? 0;

        // CGST — use HSN-wise GL if available, else fallback to setup
        if (cgstAmt > 0) {
          // Try to get HSN-wise GL from GstStoneMasterDetl
          const hsnGl = g.HSNCODE
            ? await tx.gstStoneMasterDetl.findFirst({
                where: { hsncode: g.HSNCODE },
                select: { cgstac: true },
              })
            : null;
          const cgstGl = hsnGl?.cgstac ?? setup?.cgstGl;
          if (cgstGl) await post(cgstGl, cgstAmt * P_SIGN); // Debit
        }

        // SGST
        if (sgstAmt > 0) {
          const hsnGl = g.HSNCODE
            ? await tx.gstStoneMasterDetl.findFirst({
                where: { hsncode: g.HSNCODE },
                select: { sgstac: true },
              })
            : null;
          const sgstGl = hsnGl?.sgstac ?? setup?.sgstGl;
          if (sgstGl) await post(sgstGl, sgstAmt * P_SIGN); // Debit
        }

        // IGST
        if (igstAmt > 0) {
          const hsnGl = g.HSNCODE
            ? await tx.gstStoneMasterDetl.findFirst({
                where: { hsncode: g.HSNCODE },
                select: { igstac: true },
              })
            : null;
          const igstGl = hsnGl?.igstac ?? setup?.igstGl;
          if (igstGl) await post(igstGl, igstAmt * P_SIGN); // Debit
        }
      }
    } else {
      // Fallback — single taxAmt from header, split 50/50 CGST+SGST
      const taxAmt = dto.TAX_AMT ?? 0;
      if (taxAmt > 0) {
        const half = taxAmt / 2;
        if (setup?.cgstGl) await post(setup.cgstGl, half * P_SIGN); // Debit
        if (setup?.sgstGl) await post(setup.sgstGl, half * P_SIGN); // Debit
      }
    }

    // ── STEP 9 — Round Off (DR or CR depending on sign) ──────────────────
    // VB6 logic (for R-prefix trancode i.e. RTP):
    //   chk1 = 1 → amount = +roundOff  (Debit)
    //   chk1 = 0 → amount = -roundOff  (Credit)
    // We use dto.ROUND_OFF directly — positive = debit, negative = credit
    // Frontend must send negative value when it's a credit round-off
    const roundOff = dto.ROUND_OFF ?? 0;
    if (Math.abs(roundOff) > 0 && setup?.roundOffGl) {
      await post(setup.roundOffGl, roundOff); // sign already set by frontend
    }

    // ── Balance verification (non-fatal) ──────────────────────────────────
    // VB6 does NOT have this check. We log warnings but never block the save,
    // since incomplete GL configuration (missing PURCHASE_TAX / RNDACC) causes
    // legitimate imbalances that should not roll back the transaction.
    const posted = await tx.accountTrans.findMany({
      where: { trancode: TRANCODE, vounum },
      select: { amount: true },
    });
    const sum = posted.reduce(
      (acc: number, row: { amount: any }) => acc + Number(row.amount),
      0,
    );
    if (Math.abs(sum) > 0.01) {
      console.warn(
        `[StonePurchase] Double-entry imbalance for ${vounum}: SUM = ${sum.toFixed(4)}. ` +
        `Check PURCHASE_TAX / RNDACC GL codes in SETUP_INFO.`,
      );
    }
  }

  // ── Voucher number generator ──────────────────────────────────────────────
  // ID_HEADER uses 'ISP' (Inward Stone Purchase) as the serial key for RTP vouchers
  private async generateVounum(): Promise<string> {
    const ID_HEADER_KEY = 'ISP';
    const header = await this.prisma.idHeader.findUnique({
      where: { trancode: ID_HEADER_KEY },
    });
    const next = (header?.currentno ?? 0) + 1;
    await this.prisma.idHeader.upsert({
      where:  { trancode: ID_HEADER_KEY },
      update: { currentno: next },
      create: { trancode: ID_HEADER_KEY, prefix: 'SP', currentno: next, description: 'Stone Purchase' },
    });
    const prefix = header?.prefix ?? 'SP';
    return `${prefix}${String(next).padStart(6, '0')}`;
  }
}