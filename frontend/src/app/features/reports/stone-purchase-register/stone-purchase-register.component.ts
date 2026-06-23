import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  StonePurchaseService,
  StonePurchaseRegisterFilter,
} from '../../../core/services/stone-purchase.service';
import { DealerMasterService } from '../../../core/services/dealer-master.service';
import { inrNumber, ddmmyyyy } from '../../stone-purchase/print/format.util';

@Component({
  selector: 'app-stone-purchase-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './stone-purchase-register.component.html',
  styleUrl: './stone-purchase-register.component.scss',
})
export class StonePurchaseRegisterComponent implements OnInit {

  form!: FormGroup;
  rows     = signal<any[]>([]);
  loading  = signal(false);
  searched = signal(false);
  dealers  = signal<any[]>([]);

  // Helpers exposed to template
  fmt     = inrNumber;
  fmtDate = ddmmyyyy;

  // ── Sort state ──────────────────────────────────────────────────────────
  // Default: newest voucher first. Click any column header to override.
  sort = signal<{ key: string; dir: 'asc' | 'desc' } | null>({ key: 'voudate', dir: 'desc' });

  /** Sorted view of rows() — used by template + totals. */
  sortedRows = computed(() => {
    const s = this.sort();
    const r = this.rows();
    if (!s) return r;
    const dir = s.dir === 'asc' ? 1 : -1;
    const numericKeys = new Set(['totalAmount', 'discAmt', 'taxAmt', 'grandTotal']);
    const dateKeys    = new Set(['voudate', 'refBillDate']);
    return [...r].sort((a, b) => {
      const va = a[s.key]; const vb = b[s.key];
      const ea = va == null || va === ''; const eb = vb == null || vb === '';
      if (ea && eb) return 0;
      if (ea) return 1;
      if (eb) return -1;
      const cmp = numericKeys.has(s.key) ? (Number(va) - Number(vb))
        : dateKeys.has(s.key) ? new Date(va).getTime() - new Date(vb).getTime()
        : String(va).localeCompare(String(vb), undefined, { numeric: true });
      return cmp * dir;
    });
  });

  toggleSort(key: string) {
    const cur = this.sort();
    if (!cur || cur.key !== key) this.sort.set({ key, dir: 'asc' });
    else if (cur.dir === 'asc')  this.sort.set({ key, dir: 'desc' });
    else                         this.sort.set(null);
  }
  sortIcon(key: string): 'arrow_upward' | 'arrow_downward' | 'unfold_more' {
    const s = this.sort();
    if (!s || s.key !== key) return 'unfold_more';
    return s.dir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  // ── Computed totals for the footer row ───────────────────────────────────
  totals = computed(() => {
    const r = this.rows();
    return {
      count:       r.length,
      totalAmount: r.reduce((s, x) => s + Number(x.totalAmount ?? 0), 0),
      discAmt:     r.reduce((s, x) => s + Number(x.discAmt     ?? 0), 0),
      taxAmt:      r.reduce((s, x) => s + Number(x.taxAmt      ?? 0), 0),
      grandTotal:  r.reduce((s, x) => s + Number(x.grandTotal  ?? 0), 0),
    };
  });

  constructor(
    private fb: FormBuilder,
    private svc: StonePurchaseService,
    private dealerSvc: DealerMasterService,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    // Defaults: current Indian financial year (Apr 1 → Mar 31)
    const today = new Date();
    const fyStartYear = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
    const fyStart = `${fyStartYear}-04-01`;
    const fyEnd   = `${fyStartYear + 1}-03-31`;

    // Restore prior filter from query params (set when user navigated to a
    // voucher and came back via the Print page's Back button).
    const qp = this.route.snapshot.queryParamMap;
    const restored = {
      from:       qp.get('from')       ?? fyStart,
      to:         qp.get('to')         ?? fyEnd,
      trancode:   qp.get('trancode')   ?? 'RTP',
      dealerCode: qp.get('dealerCode') ?? '',
      vounum:     qp.get('vounum')     ?? '',
      vounumFrom: qp.get('vounumFrom') ?? '',
      vounumTo:   qp.get('vounumTo')   ?? '',
      minAmount:  +(qp.get('minAmount') ?? 0),
    };

    this.form = this.fb.group({
      from:       [restored.from],
      to:         [restored.to],
      trancode:   [restored.trancode],   // RTP=Purchase, ITP=Purchase Return
      dealerCode: [restored.dealerCode],
      vounum:     [restored.vounum],     // exact-match (single voucher search)
      vounumFrom: [restored.vounumFrom],
      vounumTo:   [restored.vounumTo],
      minAmount:  [restored.minAmount],
    });

    this.dealerSvc.getAll().subscribe(d => this.dealers.set(d));

    // Auto-run the search if any non-default param was passed (round-trip).
    if (qp.keys.length) this.onProceed();
  }

  onProceed() {
    const v = this.form.getRawValue();
    const filter: StonePurchaseRegisterFilter = {
      from:       v.from       || undefined,
      to:         v.to         || undefined,
      trancode:   v.trancode   || undefined,
      dealerCode: v.dealerCode || undefined,
      vounum:     v.vounum?.trim() || undefined,
      vounumFrom: v.vounumFrom || undefined,
      vounumTo:   v.vounumTo   || undefined,
      minAmount:  +v.minAmount  > 0 ? +v.minAmount : undefined,
    };

    // Mirror the active filter into the URL so the Print page's Back button
    // (browser history) returns here with the same filter applied.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.toQueryParams(filter),
      replaceUrl: true,   // don't pollute history with each search press
    });

    this.loading.set(true);
    this.searched.set(true);
    this.svc.getRegister(filter).subscribe({
      next: r => { this.rows.set(r ?? []); this.loading.set(false); },
      error: e => {
        this.loading.set(false);
        this.snack.open(
          e?.error?.message ?? 'Failed to fetch register.',
          '✕', { duration: 6000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  /** Convert filter object → URL-friendly param bag (drop empty values). */
  private toQueryParams(f: StonePurchaseRegisterFilter): Record<string, string> {
    const out: Record<string, string> = {};
    Object.entries(f).forEach(([k, val]) => {
      if (val !== undefined && val !== null && val !== '') out[k] = String(val);
    });
    return out;
  }

  onClear() {
    this.form.reset({ trancode: 'RTP', minAmount: 0, vounum: '', vounumFrom: '', vounumTo: '' });
    this.rows.set([]);
    this.searched.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  /** When the user types an exact voucher number, clear the range fields
   *  to make the precedence (exact wins) obvious. */
  onVounumExactInput() {
    if (this.form.value.vounum) {
      this.form.patchValue({ vounumFrom: '', vounumTo: '' }, { emitEvent: false });
    }
  }

  openVoucher(row: any) {
    if (!row?.vounum) return;
    this.router.navigate(['/stone-purchase', row.vounum, 'print']);
  }

  /** Download the current results table as a CSV file. */
  exportCsv() {
    const r = this.sortedRows();
    if (!r.length) return;
    const headers = [
      'Voucher No.', 'Date', 'Dealer Code', 'Dealer Name',
      'Ref. Bill No.', 'Total Amt', 'Discount', 'GST', 'Grand Total',
      'Cancelled', 'Narration',
    ];
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...r.map(x => [
        x.vounum, this.fmtDate(x.voudate), x.dealerCode ?? '', x.dealerName ?? '',
        x.refBillNo ?? '',
        Number(x.totalAmount ?? 0).toFixed(2),
        Number(x.discAmt    ?? 0).toFixed(2),
        Number(x.taxAmt     ?? 0).toFixed(2),
        Number(x.grandTotal ?? 0).toFixed(2),
        x.cancel === 1 ? 'YES' : '',
        x.narration ?? '',
      ].map(esc).join(',')),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const ts   = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `stone-purchase-register-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Download the current results table as a landscape A4 PDF. */
  async exportPdf() {
    const rows = this.sortedRows();
    if (!rows.length) return;

    try {
      // pdfmake bundles ~1MB of font data — lazy-load (same pattern as the voucher print page).
      const pdfMakeMod = await import('pdfmake/build/pdfmake');
      const vfsMod     = await import('pdfmake/build/vfs_fonts');
      const pdfMake: any = (pdfMakeMod as any).default ?? pdfMakeMod;
      const vfs: any     = (vfsMod     as any).default ?? vfsMod;
      pdfMake.vfs = vfs.pdfMake?.vfs ?? vfs.vfs ?? vfs;

      const tot = this.totals();

      const headerRow = [
        { text: 'Voucher No.', bold: true, fillColor: '#f1f5f9' },
        { text: 'Date',        bold: true, fillColor: '#f1f5f9' },
        { text: 'Dealer',      bold: true, fillColor: '#f1f5f9' },
        { text: 'Ref. Bill',   bold: true, fillColor: '#f1f5f9' },
        { text: 'Total Amt',   bold: true, fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Discount',    bold: true, fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'GST',         bold: true, fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Grand Total', bold: true, fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Narration',   bold: true, fillColor: '#f1f5f9' },
      ];

      const bodyRows = rows.map(r => {
        const dealer = (r.dealerName ?? '—') +
                       (r.dealerCode ? `\n${r.dealerCode}` : '');
        const vou    = r.vounum + (r.cancel === 1 ? ' (CANCELLED)' : '');
        return [
          { text: vou, bold: r.cancel === 1 ? false : false,
                       color: r.cancel === 1 ? '#dc2626' : undefined,
                       decoration: r.cancel === 1 ? 'lineThrough' as const : undefined },
          { text: this.fmtDate(r.voudate) },
          { text: dealer },
          { text: r.refBillNo ?? '' },
          { text: this.fmt(r.totalAmount), alignment: 'right' },
          { text: this.fmt(r.discAmt),     alignment: 'right' },
          { text: this.fmt(r.taxAmt),      alignment: 'right' },
          { text: this.fmt(r.grandTotal),  alignment: 'right', bold: true },
          { text: r.narration ?? '', color: '#64748b' },
        ];
      });

      const totalsRow = [
        { text: `Total (${tot.count})`, colSpan: 4, bold: true, fillColor: '#f8fafc' },
        {}, {}, {},
        { text: this.fmt(tot.totalAmount), alignment: 'right', bold: true, fillColor: '#f8fafc' },
        { text: this.fmt(tot.discAmt),     alignment: 'right', bold: true, fillColor: '#f8fafc' },
        { text: this.fmt(tot.taxAmt),      alignment: 'right', bold: true, fillColor: '#f8fafc' },
        { text: this.fmt(tot.grandTotal),  alignment: 'right', bold: true, color: '#4f46e5', fillColor: '#f8fafc' },
        { text: '', fillColor: '#f8fafc' },
      ];

      const doc: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [24, 28, 24, 32],
        defaultStyle: { fontSize: 9 },
        content: [
          { text: 'Stone Purchase Register',
            fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
          { text: this.summarizeFiltersForPdf(),
            fontSize: 9, color: '#475569', alignment: 'center', margin: [0, 0, 0, 12] },
          {
            table: {
              headerRows: 1,
              widths: [62, 56, '*', 70, 64, 56, 56, 70, '*'],
              body: [headerRow, ...bodyRows, totalsRow],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#888',
              vLineColor: () => '#888',
            },
          },
        ],
        footer: (current: number, count: number) => ({
          columns: [
            { text: `Generated ${this.fmtDate(new Date())}`,
              fontSize: 8, color: '#666' },
            { text: `Page ${current} of ${count}`,
              alignment: 'right', fontSize: 8, color: '#666' },
          ],
          margin: [24, 10, 24, 0],
        }),
      };

      const ts = new Date().toISOString().slice(0, 10);
      pdfMake.createPdf(doc).download(`stone-purchase-register-${ts}.pdf`);
    } catch (e: any) {
      this.snack.open(
        `PDF generation failed: ${e?.message ?? e}`,
        '✕', { duration: 6000, panelClass: ['snack-error'] },
      );
    }
  }

  /** Build a one-line filter description for the PDF header. */
  private summarizeFiltersForPdf(): string {
    const v = this.form.getRawValue();
    const parts: string[] = [];
    if (v.from && v.to)   parts.push(`${this.fmtDate(v.from)} → ${this.fmtDate(v.to)}`);
    if (v.trancode)       parts.push(`TranCode: ${v.trancode}`);
    if (v.vounum)         parts.push(`Voucher: ${v.vounum}`);
    if (v.dealerCode)     parts.push(`Dealer: ${v.dealerCode}`);
    if (v.vounumFrom || v.vounumTo) {
      parts.push(`Voucher Range: ${v.vounumFrom || '…'} → ${v.vounumTo || '…'}`);
    }
    if (+v.minAmount > 0) parts.push(`Amount ≥ ${this.fmt(+v.minAmount)}`);
    return parts.join('   ·   ');
  }
}
