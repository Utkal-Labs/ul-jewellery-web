import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReportFilterCardComponent } from '../shared/report-filter-card.component';
import { ReportResultsTableComponent } from '../shared/report-results-table.component';
import { FilterDef, ColumnDef, KpiChip } from '../shared/report-types';
import { ReportsService } from '../../../core/services/reports.service';
import { inrNumber } from '../../stone-purchase/print/format.util';

/**
 * Temporary-table report example — Stone Balance As Of Date.
 *
 * VB6 equivalent (`frmPurchaseRegister.frm` style):
 *   DELETE FROM TEMP_STONE_BAL;
 *   For each stone_code in STONE_TRANS (asOf): aggregate +/- and insert into TEMP_STONE_BAL.
 *   Crystal renders TEMP_STONE_BAL.
 *
 * Modern equivalent: backend runs a single CTE that produces the aggregated
 * projection in-memory — no physical temp table required.
 */
@Component({
  selector: 'app-stone-balance',
  standalone: true,
  imports: [
    CommonModule, MatIconModule,
    ReportFilterCardComponent, ReportResultsTableComponent,
  ],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h2><mat-icon>balance</mat-icon>Stone Balance — As Of Date</h2>
          <p class="hint">
            Temporary-table report — aggregates <code>STONE_TRANS</code> rows
            (RTP / ITP / ITS / RTS) up to the selected date and computes
            closing balance per stone.
          </p>
        </div>
      </header>

      <app-report-filter-card
        [filters]="filters"
        [loading]="loading()"
        (proceed)="onProceed($event)" />

      <app-report-results-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [kpis]="kpis()"
        [rowClickable]="false"
        csvFilename="stone-balance"
        emptyTitle="No balance rows for the selected date"
        emptyHint="Pick a later as-of date or remove the stone code filter." />
    </div>
  `,
  styles: [`
    :host { display: block; padding: 20px 24px; }
    .page-head { margin-bottom: 16px; }
    .page-head h2 {
      display: flex; align-items: center; gap: 6px;
      font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;
    }
    .page-head h2 mat-icon { color: #4f46e5; font-size: 22px; width: 22px; height: 22px; }
    .page-head .hint { font-size: 12.5px; color: #64748b; margin: 4px 0 0; max-width: 720px; }
    .page-head code { background: #f1f5f9; padding: 0 4px; border-radius: 3px; }
  `],
})
export class StoneBalanceComponent {
  loading = signal(false);
  rows    = signal<any[]>([]);

  // Default to today (live system date)
  filters: FilterDef[] = [
    { key: 'asOf',      label: 'As Of Date',  type: 'date',
      defaultValue: new Date().toISOString().slice(0, 10) },
    { key: 'stoneCode', label: 'Stone Code',  type: 'text', placeholder: 'e.g. DI', span: 2 },
  ];

  columns: ColumnDef[] = [
    { key: 'stoneCode',   label: 'Code',       width: 70,  bold: true },
    { key: 'stoneSub',    label: 'Sub',        width: 60 },
    { key: 'description', label: 'Description', ellipsis: true },
    { key: 'uom',         label: 'UOM',        width: 60, align: 'center' },
    { key: 'receiptPcs',  label: 'Recv Pcs',   width: 80, align: 'right',  total: true,
      format: v => Number(v ?? 0).toString() },
    { key: 'receiptWt',   label: 'Recv Wt',    width: 90, align: 'right',  total: true,
      format: v => Number(v ?? 0).toFixed(3) },
    { key: 'issuePcs',    label: 'Issue Pcs',  width: 80, align: 'right',  total: true,
      format: v => Number(v ?? 0).toString() },
    { key: 'issueWt',     label: 'Issue Wt',   width: 90, align: 'right',  total: true,
      format: v => Number(v ?? 0).toFixed(3) },
    { key: 'closingPcs',  label: 'Closing Pcs',width: 90, align: 'right',  bold: true, total: true,
      format: v => Number(v ?? 0).toString() },
    { key: 'closingWt',   label: 'Closing Wt', width: 100, align: 'right', bold: true, total: true,
      format: v => Number(v ?? 0).toFixed(3) },
  ];

  kpis = computed<KpiChip[]>(() => {
    const r = this.rows();
    const totalRecv = r.reduce((s, x) => s + Number(x.receiptWt ?? 0), 0);
    const totalIssue = r.reduce((s, x) => s + Number(x.issueWt ?? 0), 0);
    const closing = r.reduce((s, x) => s + Number(x.closingWt ?? 0), 0);
    return [
      { label: 'Stone rows',       value: String(r.length) },
      { label: 'Total Received Wt', value: inrNumber(totalRecv, 3) },
      { label: 'Total Issued Wt',   value: inrNumber(totalIssue, 3) },
      { label: 'Closing Weight',    value: inrNumber(closing, 3), accent: true },
    ];
  });

  constructor(private svc: ReportsService) {}

  onProceed(filter: any) {
    if (filter.__cleared__) { this.rows.set([]); return; }
    this.loading.set(true);
    this.svc.stoneBalance(filter).subscribe({
      next: r => { this.rows.set(r ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
