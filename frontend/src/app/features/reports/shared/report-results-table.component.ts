import {
  Component, Input, Output, EventEmitter, computed, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ColumnDef, KpiChip } from './report-types';
import { inrNumber, ddmmyyyy } from '../../stone-purchase/print/format.util';

type SortDirection = 'asc' | 'desc';
interface SortState { key: string; dir: SortDirection }

/**
 * Generic report results table.
 *
 *  - Columns are described declaratively via `[columns]`.
 *  - Renders sticky header, optional KPI strip, totals row, CSV export,
 *    click-to-detail rows, empty state, and loading state.
 *  - Click any column header to sort asc/desc; click a third time to clear.
 */
@Component({
  selector: 'app-report-results-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <!-- KPI strip -->
    @if (kpis?.length) {
      <div class="kpi-strip">
        @for (k of kpis ?? []; track k.label) {
          <div class="kpi" [class.accent]="k.accent">
            <span class="kpi-label">{{ k.label }}</span>
            <span class="kpi-value">{{ k.value }}</span>
          </div>
        }
      </div>
    }

    <section class="results">

      <div class="results-head">
        <div>
          <strong>{{ rows.length }}</strong>
          {{ unitLabel(rows.length) }} found
          @if (lastSearchedHint) { <span class="hint"> · {{ lastSearchedHint }}</span> }
          @if (sort()) {
            <span class="hint"> · sorted by
              <strong>{{ columnLabel(sort()!.key) }}</strong>
              {{ sort()!.dir === 'asc' ? '↑' : '↓' }}
              <button class="link-btn" type="button" (click)="clearSort()">clear</button>
            </span>
          }
        </div>
        @if (rows.length) {
          <button class="csv-btn" type="button" (click)="exportCsv()">
            <mat-icon>download</mat-icon> Export CSV
          </button>
        }
      </div>

      @if (loading) {
        <div class="state">
          <mat-icon class="spin">progress_activity</mat-icon>
          <p>Loading…</p>
        </div>
      } @else if (!rows.length) {
        <div class="state empty">
          <mat-icon>search_off</mat-icon>
          <h3>{{ emptyTitle }}</h3>
          <p>{{ emptyHint }}</p>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="result-grid">
            <thead>
              <tr>
                @for (c of columns; track c.key) {
                  <th [class.num]="c.align === 'right' || isNumericType(c)"
                      [class.center]="c.align === 'center'"
                      [class.sortable]="c.sortable !== false"
                      [class.sorted]="sort()?.key === c.key"
                      [style.width]="c.width ? c.width + 'px' : null"
                      (click)="toggleSort(c)">
                    <span class="th-label">
                      {{ c.label }}
                      @if (sort()?.key === c.key) {
                        <mat-icon class="sort-ic">{{ sort()!.dir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                      } @else if (c.sortable !== false) {
                        <mat-icon class="sort-ic faded">unfold_more</mat-icon>
                      }
                    </span>
                  </th>
                }
                @if (rowClickable) { <th class="action-col"></th> }
              </tr>
            </thead>
            <tbody>
              @for (r of sortedRows(); track $index) {
                <tr [class.clickable]="rowClickable" (click)="onRowClick(r)">
                  @for (c of columns; track c.key) {
                    <td [class.num]="c.align === 'right' || isNumericType(c)"
                        [class.center]="c.align === 'center'"
                        [class.bold]="c.bold"
                        [class.ellipsis]="c.ellipsis"
                        [title]="c.ellipsis ? formatCell(c, r) : null">
                      {{ formatCell(c, r) }}
                    </td>
                  }
                  @if (rowClickable) {
                    <td class="row-action">
                      <mat-icon>chevron_right</mat-icon>
                    </td>
                  }
                </tr>
              }
            </tbody>
            @if (hasTotals()) {
              <tfoot>
                <tr>
                  @for (c of columns; track c.key; let i = $index) {
                    <td [class.num]="c.align === 'right' || isNumericType(c)"
                        [class.center]="c.align === 'center'"
                        [class.strong]="i === 0 || c.total">
                      {{ totalCell(c, i) }}
                    </td>
                  }
                  @if (rowClickable) { <td></td> }
                </tr>
              </tfoot>
            }
          </table>
        </div>
      }
    </section>
  `,
  styleUrls: ['./report-results-table.component.scss'],
})
export class ReportResultsTableComponent {
  @Input({ required: true }) columns!: ColumnDef[];
  @Input({ required: true }) rows: any[] = [];
  @Input() loading        = false;
  @Input() rowClickable   = true;
  @Input() kpis: KpiChip[] | null = null;
  @Input() emptyTitle = 'No records matched the filter';
  @Input() emptyHint  = 'Try widening the date range or clearing filters.';
  @Input() lastSearchedHint = '';
  @Input() csvFilename = 'report';
  /** Optional initial sort, e.g. { key: 'vounum', dir: 'desc' } */
  @Input() set initialSort(s: SortState | null | undefined) {
    if (s) this.sort.set(s);
  }

  @Output() rowClick = new EventEmitter<any>();

  // ── Sort state ────────────────────────────────────────────────────────
  sort = signal<SortState | null>(null);

  /** Apply current sort to the rows for rendering and CSV export. */
  sortedRows = computed(() => {
    const s = this.sort();
    if (!s) return this.rows;
    const col = this.columns.find(c => c.key === s.key);
    if (!col) return this.rows;
    const dir = s.dir === 'asc' ? 1 : -1;
    const numeric = this.isNumericType(col);
    return [...this.rows].sort((a, b) => {
      const va = this.getVal(a, s.key);
      const vb = this.getVal(b, s.key);
      // Push empty values to the end regardless of direction
      const ea = va == null || va === '';
      const eb = vb == null || vb === '';
      if (ea && eb) return 0;
      if (ea) return 1;
      if (eb) return -1;
      const cmp = numeric
        ? (Number(va) - Number(vb))
        : col.type === 'date'
          ? new Date(va).getTime() - new Date(vb).getTime()
          : String(va).localeCompare(String(vb), undefined, { numeric: true });
      return cmp * dir;
    });
  });

  toggleSort(c: ColumnDef) {
    if (c.sortable === false) return;
    const cur = this.sort();
    if (!cur || cur.key !== c.key) {
      this.sort.set({ key: c.key, dir: 'asc' });
    } else if (cur.dir === 'asc') {
      this.sort.set({ key: c.key, dir: 'desc' });
    } else {
      this.sort.set(null);   // third click clears
    }
  }
  clearSort() { this.sort.set(null); }

  columnLabel(key: string): string {
    return this.columns.find(c => c.key === key)?.label ?? key;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  isNumericType(c: ColumnDef): boolean { return c.type === 'number' || c.type === 'currency'; }

  unitLabel(n: number): string { return n === 1 ? 'record' : 'records'; }

  /** Read nested keys (e.g. "dealer.name") */
  private getVal(row: any, key: string): any {
    return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), row);
  }

  formatCell(c: ColumnDef, row: any): string {
    const raw = this.getVal(row, c.key);
    const baseFormatted = this.applyType(c, raw);
    return c.format ? c.format(raw, row) : baseFormatted;
  }

  private applyType(c: ColumnDef, raw: any): string {
    if (raw == null || raw === '') return '';
    switch (c.type) {
      case 'currency': return inrNumber(Number(raw));
      case 'number':   return Number.isFinite(+raw) ? String(+raw) : '';
      case 'date':     return ddmmyyyy(raw);
      default:         return String(raw);
    }
  }

  hasTotals(): boolean {
    return this.columns.some(c => c.total);
  }

  totalCell(c: ColumnDef, idx: number): string {
    if (idx === 0 && !c.total) return `Total (${this.rows.length})`;
    if (!c.total) return '';
    const sum = this.rows.reduce((s, r) => s + (Number(this.getVal(r, c.key)) || 0), 0);
    return this.applyType(c, sum);
  }

  onRowClick(row: any) {
    if (this.rowClickable) this.rowClick.emit(row);
  }

  exportCsv() {
    const exportCols = this.columns.filter(c => c.exportCsv !== false);
    const header = exportCols.map(c => csvEscape(c.label));
    const lines  = this.sortedRows().map(r =>
      exportCols.map(c => csvEscape(this.formatCell(c, r))).join(','),
    );
    if (this.hasTotals()) {
      const totals = exportCols.map((c, i) => csvEscape(this.totalCell(c, i)));
      lines.push(totals.join(','));
    }
    const blob = new Blob(
      ['﻿' + header.join(',') + '\n' + lines.join('\n')],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    const ts  = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${this.csvFilename}-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function csvEscape(v: any): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
