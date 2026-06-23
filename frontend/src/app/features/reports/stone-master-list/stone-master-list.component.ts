import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReportFilterCardComponent } from '../shared/report-filter-card.component';
import { ReportResultsTableComponent } from '../shared/report-results-table.component';
import { FilterDef, ColumnDef, KpiChip } from '../shared/report-types';
import { ReportsService } from '../../../core/services/reports.service';

/**
 * Single-table report example.
 * Mirrors the legacy VB6 `frmListMaster.frm` Case "STO" → LIST_STONE.Rpt.
 */
@Component({
  selector: 'app-stone-master-list',
  standalone: true,
  imports: [
    CommonModule, MatIconModule,
    ReportFilterCardComponent, ReportResultsTableComponent,
  ],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h2><mat-icon>list_alt</mat-icon>Stone Master List</h2>
          <p class="hint">Single-table report — direct listing from <code>STONE_MASTER</code>.</p>
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
        csvFilename="stone-master-list"
        emptyTitle="No stones matched"
        emptyHint="Clear the search box or try a different query." />
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
    .page-head .hint { font-size: 12.5px; color: #64748b; margin: 4px 0 0; }
    .page-head code { background: #f1f5f9; padding: 0 4px; border-radius: 3px; }
  `],
})
export class StoneMasterListComponent {

  loading = signal(false);
  rows    = signal<any[]>([]);

  filters: FilterDef[] = [
    { key: 'q',      label: 'Search', type: 'text', placeholder: 'Code, sub or description', span: 2 },
    { key: 'active', label: 'Status', type: 'select', defaultValue: '',
      options: [
        { value: '',  label: 'All' },
        { value: '1', label: 'Active only' },
        { value: '0', label: 'Inactive only' },
      ] },
  ];

  columns: ColumnDef[] = [
    { key: 'stoneCode',   label: 'Code',        width: 70,  bold: true },
    { key: 'stoneSub',    label: 'Sub',         width: 60 },
    { key: 'description', label: 'Description', ellipsis: true },
    { key: 'uom',         label: 'UOM',         width: 60,  align: 'center' },
    { key: 'hsnCode',     label: 'HSN',         width: 70,  align: 'right' },
    { key: 'stonePurc',   label: 'Purc GL',     width: 70,  align: 'right' },
    { key: 'stoneSale',   label: 'Sale GL',     width: 70,  align: 'right' },
    { key: 'active',      label: 'Active',      width: 60,  align: 'center',
      format: v => v === 1 ? '✓' : v === 0 ? '—' : '' },
  ];

  kpis = computed<KpiChip[]>(() => {
    const r = this.rows();
    return [
      { label: 'Rows',     value: String(r.length) },
      { label: 'Active',   value: String(r.filter(x => x.active === 1).length) },
      { label: 'Inactive', value: String(r.filter(x => x.active === 0).length), accent: true },
    ];
  });

  constructor(private svc: ReportsService) {}

  onProceed(filter: any) {
    if (filter.__cleared__) { this.rows.set([]); return; }
    this.loading.set(true);
    this.svc.stoneMasterList(filter).subscribe({
      next: r => { this.rows.set(r ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
