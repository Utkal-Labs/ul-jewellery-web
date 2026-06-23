// pdfmake document definition for the Stone Purchase Voucher.
// Mirrors the legacy Crystal Reports template (gst_stonepurchase.rpt) layout 1:1.

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { inrNumber, ddmmyyyy, amountInWords, uomLabel } from './format.util';

export interface PrintData {
  voucher: any;
  dealer:  any | null;
  salesman: any | null;
  stoneLines: any[];
  payments:   any[];
  gstSummary: any[];
  company:    any | null;
}

const BORDER = '#000';

export function buildStonePurchaseVoucherDoc(data: PrintData): TDocumentDefinitions {
  const { voucher, dealer, payments, stoneLines, gstSummary, company } = data;

  const title = voucher.trancode === 'ITP' ? 'STONE PURCHASE RETURN' : 'STONE PURCHASE';

  // GST intra/inter-state split is decided server-side. The gstSummary rows
  // we receive already have the right column populated (CGST+SGST for
  // intra-state, IGST for inter-state) — we just render them.

  const stoneTotal = stoneLines.reduce((s, l) => s + Number(l.amount ?? 0), 0);
  const paidTotal  = payments  .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  // ── TITLE ────────────────────────────────────────────────────────────────
  const titleBlock: Content = {
    text: title,
    alignment: 'center',
    bold: true,
    fontSize: 14,
    margin: [0, 4, 0, 10],
    decoration: 'underline',
  };

  // ── HEADER (party box) ──────────────────────────────────────────────────
  const dealerAddr = [dealer?.address1, dealer?.address2, dealer?.address3]
    .filter(Boolean).join(', ');

  const headerTable: Content = {
    table: {
      widths: ['*', 200],
      body: [[
        // LEFT — dealer + ship & bill
        {
          stack: [
            { columns: [
              { text: 'GSTIN NO.',  bold: true, width: 70 },
              { text: dealer?.gstin ?? '',  width: '*' },
            ]},
            { columns: [
              { text: 'State Code', bold: true, width: 70 },
              { text: dealer?.idState != null ? String(dealer.idState) : '', width: '*' },
            ], margin: [0, 2, 0, 0] },
            { columns: [
              { text: 'Name    :',  bold: true, width: 70 },
              { text: dealer?.name ?? '', width: '*' },
            ], margin: [0, 6, 0, 0] },
            { columns: [
              { text: 'Address :',  bold: true, width: 70 },
              { text: dealerAddr, width: '*' },
            ], margin: [0, 2, 0, 0] },

            { text: '(Ship & Bill To)', italics: true, margin: [0, 8, 0, 2] },
            { columns: [
              { text: 'GSTIN/UIN :', bold: true, width: 70 },
              { text: company?.gstinno ?? '', width: '*' },
            ]},
          ],
          margin: [6, 5, 6, 5],
        },
        // RIGHT — voucher meta
        {
          stack: [
            { columns: [
              { text: 'Voucher No. :',  bold: true, width: 80 },
              { text: voucher.vounum ?? '', width: '*' },
            ]},
            { columns: [
              { text: 'Voucher Date :', bold: true, width: 80 },
              { text: ddmmyyyy(voucher.voudate), width: '*' },
            ], margin: [0, 4, 0, 0] },
            ...(voucher.refBillNo ? [{
              columns: [
                { text: 'Ref. Bill No. :', bold: true, width: 80 },
                { text: voucher.refBillNo, width: '*' as const },
              ], margin: [0, 4, 0, 0] as [number, number, number, number],
            }] : []),
            ...(voucher.refBillDate ? [{
              columns: [
                { text: 'Ref. Bill Date :', bold: true, width: 80 },
                { text: ddmmyyyy(voucher.refBillDate), width: '*' as const },
              ], margin: [0, 4, 0, 0] as [number, number, number, number],
            }] : []),
          ],
          margin: [6, 5, 6, 5],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0.6, vLineWidth: () => 0.6,
      hLineColor: () => BORDER, vLineColor: () => BORDER,
    },
    margin: [0, 0, 0, 6],
  };

  // ── LINE ITEMS GRID ──────────────────────────────────────────────────────
  // Column order matches the legacy VB6 / Crystal Reports template:
  //   Sl No. | Stone Code - Sub | Stone Name | Pcs | Weight | Unit | HSN CODE | Rate | Amount
  const lineHeader: TableCell[] = [
    { text: 'Sl No.',           style: 'th' },
    { text: 'Stone Code - Sub', style: 'th' },
    { text: 'Stone Name',       style: 'th' },
    { text: 'Pcs',              style: 'th', alignment: 'right' },
    { text: 'Weight',           style: 'th', alignment: 'right' },
    { text: 'Unit',             style: 'th', alignment: 'center' },
    { text: 'HSN CODE',         style: 'th' },
    { text: 'Rate',             style: 'th', alignment: 'right' },
    { text: 'Amount',           style: 'th', alignment: 'right' },
  ];

  const lineRows: TableCell[][] = stoneLines.map((l, i) => [
    { text: String(i + 1),                                style: 'td' },
    { text: `${l.stoneCode ?? ''} - ${l.stoneSub ?? ''}`,  style: 'td' },
    { text: l.description ?? '',                           style: 'td' },
    { text: String(l.pcs ?? 0),                            style: 'td', alignment: 'right' },
    { text: l.weight != null ? Number(l.weight).toFixed(3) : '0.000', style: 'td', alignment: 'right' },
    { text: uomLabel(l.uom),                               style: 'td', alignment: 'center' },
    { text: l.hsncode ? String(l.hsncode) : '',            style: 'td' },
    { text: inrNumber(l.rate),                             style: 'td', alignment: 'right' },
    { text: inrNumber(l.amount),                           style: 'td', alignment: 'right' },
  ]);

  // Pad to a minimum of 6 rows so the layout doesn't collapse for tiny vouchers
  const MIN_ROWS = 6;
  while (lineRows.length < MIN_ROWS) {
    lineRows.push(Array(9).fill(0).map(() => ({ text: ' ', style: 'td' as const })));
  }

  const lineGrid: Content = {
    table: {
      headerRows: 1,
      widths: [22, 62, '*', 26, 44, 26, 50, 56, 64],
      body: [lineHeader, ...lineRows],
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => BORDER,
      vLineColor: () => BORDER,
    },
    margin: [0, 0, 0, 0],
  };

  // ── FOOTER (Narration + In Word + Payment | Totals box) ─────────────────
  const payRows: Content[] = payments
    .filter(p => Number(p.amount ?? 0) > 0)
    .map(p => {
      const isCash = p.accGroup === 2;
      const chq = (!isCash && p.chno)
        ? `Cheque No. ${p.chno}${p.chdate ? '  Date ' + ddmmyyyy(p.chdate) : ''}`
        : '';
      return {
        columns: [
          { text: p.accName ?? '', width: '*' },
          { text: chq,             width: 'auto' },
          { text: `Rs. ${inrNumber(p.amount)}`, width: 80, alignment: 'right' },
        ],
        columnGap: 6,
        margin: [0, 1, 0, 1],
      };
    });

  const leftFooter: Content = {
    stack: [
      { columns: [
        { text: 'Narration :', bold: true, width: 80 },
        { text: voucher.narration ?? '', width: '*' },
      ], margin: [0, 0, 0, 10] },

      { columns: [
        { text: 'In Word :', bold: true, width: 80 },
        { text: amountInWords(voucher.grandTotal), width: '*', italics: true },
      ], margin: [0, 0, 0, 10] },

      { text: 'Payment Detail :', bold: true, margin: [0, 6, 0, 4] },
      ...(payRows.length
        ? payRows
        : [{ text: '—', italics: true, color: '#666' } as Content]),
    ],
    // Extra padding inside the left-footer cell so the rows have room to breathe.
    margin: [12, 12, 12, 12],
  };

  // Right-side totals: two grouped sections with a divider in between.
  // Round Off is always rendered (legacy report always shows the row, even when 0).
  // VAT row is conditional — only rendered if vatAmt is non-zero (rare in GST-era data).
  const hasVat = Number(voucher.vatAmt ?? 0) !== 0;
  const totalsBody: TableCell[][] = [
    [{ text: 'Total',    bold: true, style: 'totLabel' },
     { text: inrNumber(stoneTotal),         style: 'totVal' }],
    [{ text: 'Discount', bold: true, style: 'totLabel' },
     { text: inrNumber(voucher.discAmt),    style: 'totVal' }],
    [{ text: 'GST',      bold: true, style: 'totLabel' },
     { text: inrNumber(voucher.taxAmt),     style: 'totVal' }],
    ...(hasVat ? [[
      { text: 'VAT', bold: true, style: 'totLabel' as const },
      { text: inrNumber(voucher.vatAmt),    style: 'totVal' as const },
    ]] : []),
    [{ text: 'TCS',      bold: true, style: 'totLabel' },
     { text: inrNumber(voucher.tcsAmt),     style: 'totVal' }],
    [{ text: 'Round Off', bold: true, style: 'totLabel' },
     { text: inrNumber(voucher.roundOff),   style: 'totVal' }],
    [{ text: 'Total Amt.', bold: true, style: 'totLabel' },
     { text: inrNumber(voucher.grandTotal), bold: true, style: 'totVal' }],
    [{ text: 'Paid Amt.',  bold: true, style: 'totLabel' },
     { text: inrNumber(paidTotal),          style: 'totVal' }],
  ];
  const dividerRow = totalsBody.length - 2; // heavier rule above "Total Amt."
  const totalsBox: Content = {
    table: { widths: ['*', 70], body: totalsBody },
    layout: {
      hLineWidth: (i: number) => (i === dividerRow ? 1 : 0.6),
      vLineWidth: () => 0.6,
      hLineColor: () => BORDER,
      vLineColor: () => BORDER,
    },
  };

  const footerTable: Content = {
    table: {
      widths: ['*', 200],
      body: [[ leftFooter, { stack: [totalsBox], margin: [0, 0, 0, 0] } ]],
    },
    layout: {
      hLineWidth: () => 0.6, vLineWidth: () => 0.6,
      hLineColor: () => BORDER, vLineColor: () => BORDER,
    },
    margin: [0, 0, 0, 10],
  };

  // ── SIGNATURE ROW ───────────────────────────────────────────────────────
  const signatureRow: Content = {
    columns: [
      { text: 'Signature Of Dealer', bold: true, width: '*', alignment: 'left' },
      { text: 'Checked By',          bold: true, width: '*', alignment: 'center' },
      {
        stack: [
          { text: 'Signature',           bold: true, alignment: 'right' },
          { text: `For ${company?.compName ?? 'DEMO'}`, bold: true, alignment: 'right' },
        ],
        width: '*',
      },
    ],
    margin: [4, 24, 4, 14],
  };

  // ── GST TAX SUMMARY ──────────────────────────────────────────────────────
  // Layout: SR.NO | HSN/SAC CODE | CGST (Rate %, Amount) | SGST (Rate %, Amount)
  //         | IGST (Rate %, Amount) | CESS | TOTAL TAX
  // Two-row header with merged tax-group cells above the Rate%/Amount split.
  const gstHeaderRow1: TableCell[] = [
    { text: 'SR.\nNO',     style: 'gstTh', rowSpan: 2, alignment: 'center' },
    { text: 'HSN/SAC CODE', style: 'gstTh', rowSpan: 2, alignment: 'center' },
    { text: 'CGST',  style: 'gstTh', colSpan: 2, alignment: 'center' }, {},
    { text: 'SGST',  style: 'gstTh', colSpan: 2, alignment: 'center' }, {},
    { text: 'IGST',  style: 'gstTh', colSpan: 2, alignment: 'center' }, {},
    { text: 'CESS',  style: 'gstTh', rowSpan: 2, alignment: 'center' },
    { text: 'TOTAL TAX', style: 'gstTh', rowSpan: 2, alignment: 'center' },
  ];
  const gstHeaderRow2: TableCell[] = [
    {}, {},
    { text: 'Rate %', style: 'gstTh', alignment: 'center' },
    { text: 'Amount', style: 'gstTh', alignment: 'center' },
    { text: 'Rate %', style: 'gstTh', alignment: 'center' },
    { text: 'Amount', style: 'gstTh', alignment: 'center' },
    { text: 'Rate %', style: 'gstTh', alignment: 'center' },
    { text: 'Amount', style: 'gstTh', alignment: 'center' },
    {}, {},
  ];

  // Backend now aggregates from the line items (STONE_TRANS) and applies the
  // intra/inter-state split itself, so we just render the values it returns.
  const gstRows: TableCell[][] = gstSummary.map((g, i) => {
    const cgstRt  = Number(g.cgstRt  ?? 0);
    const cgstAmt = Number(g.cgstAmt ?? 0);
    const sgstRt  = Number(g.sgstRt  ?? 0);
    const sgstAmt = Number(g.sgstAmt ?? 0);
    const igstRt  = Number(g.igstRt  ?? 0);
    const igstAmt = Number(g.igstAmt ?? 0);
    return [
      { text: String(i + 1),                        style: 'gstTd', alignment: 'center' },
      { text: g.hsncode != null ? String(g.hsncode) : '', style: 'gstTd', alignment: 'center' },
      { text: cgstRt.toFixed(2),                    style: 'gstTd', alignment: 'right' },
      { text: inrNumber(cgstAmt, 2),                style: 'gstTd', alignment: 'right' },
      { text: sgstRt.toFixed(2),                    style: 'gstTd', alignment: 'right' },
      { text: inrNumber(sgstAmt, 2),                style: 'gstTd', alignment: 'right' },
      { text: igstRt.toFixed(2),                    style: 'gstTd', alignment: 'right' },
      { text: inrNumber(igstAmt, 2),                style: 'gstTd', alignment: 'right' },
      { text: inrNumber(g.cess,   2),               style: 'gstTd', alignment: 'right' },
      { text: inrNumber(g.totTax, 2),               style: 'gstTd', alignment: 'right' },
    ];
  });

  const gstSummaryTable: Content = {
    table: {
      headerRows: 2,
      widths: [28, 90, 30, 44, 30, 44, 30, 44, 36, 56],
      body: [gstHeaderRow1, gstHeaderRow2, ...gstRows],
    },
    layout: {
      hLineWidth: () => 0.6, vLineWidth: () => 0.6,
      hLineColor: () => BORDER, vLineColor: () => BORDER,
    },
  };

  // ── CANCEL WATERMARK ─────────────────────────────────────────────────────
  const watermark = voucher.cancel === 1
    ? { text: 'CANCELLED', color: '#dc2626', opacity: 0.25, bold: true, fontSize: 90 }
    : undefined;

  // ── DOC ──────────────────────────────────────────────────────────────────
  return {
    pageSize: 'A4',
    pageMargins: [30, 28, 30, 28],
    pageOrientation: 'portrait',
    defaultStyle: { fontSize: 9, font: 'Roboto' },
    watermark,
    content: [
      titleBlock,
      headerTable,
      lineGrid,
      footerTable,
      signatureRow,
      gstSummaryTable,
    ],
    styles: {
      th:       { fontSize: 9,   bold: true },
      td:       { fontSize: 9.5 },
      totLabel: { fontSize: 9.5, margin: [4, 2, 4, 2] },
      totVal:   { fontSize: 9.5, alignment: 'right', margin: [4, 2, 4, 2] },
      gstTh:    { fontSize: 8.5, bold: true },
      gstTd:    { fontSize: 9 },
    },
  };
}
