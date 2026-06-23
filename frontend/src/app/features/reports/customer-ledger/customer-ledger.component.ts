import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ReportResultsTableComponent } from '../shared/report-results-table.component';
import { ColumnDef } from '../shared/report-types';
import { ReportsService } from '../../../core/services/reports.service';
import { inrNumber, ddmmyyyy } from '../../stone-purchase/print/format.util';

/**
 * Sub-report example — Customer / Account Ledger.
 *
 * Pattern: a parent header block (account info + opening/closing balances)
 * + a nested detail block (transaction list with running balance).
 *
 * Mirrors the legacy WinGold "Customer Balance & Ledger" report.
 */
@Component({
  selector: 'app-customer-ledger',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatIconModule,
    ReportResultsTableComponent,
  ],
  templateUrl: './customer-ledger.component.html',
  styleUrl: './customer-ledger.component.scss',
})
export class CustomerLedgerComponent implements OnInit {

  form!: FormGroup;
  loading       = signal(false);
  searched      = signal(false);
  accountOptions = signal<any[]>([]);
  data          = signal<{
    master: any | null; opening: number; transactions: any[]; closing: number;
  } | null>(null);

  fmt     = inrNumber;
  fmtDate = ddmmyyyy;

  columns: ColumnDef[] = [
    { key: 'voudate',  label: 'Date',     type: 'date',     width: 90 },
    { key: 'trancode', label: 'TranCode', width: 80, align: 'center', bold: true },
    { key: 'vounum',   label: 'Voucher',  width: 110 },
    { key: 'amount',   label: 'Amount',   type: 'currency', width: 110, align: 'right',
      format: v => Number(v) >= 0 ? inrNumber(v) : `(${inrNumber(Math.abs(Number(v)))})` },
    { key: 'running',  label: 'Running Balance', type: 'currency', width: 130, align: 'right', bold: true },
  ];

  kpis = computed(() => {
    const d = this.data();
    if (!d?.master) return null;
    return [
      { label: 'Opening Balance', value: inrNumber(d.opening) },
      { label: 'Transactions',    value: String(d.transactions.length) },
      { label: 'Closing Balance', value: inrNumber(d.closing), accent: true },
    ];
  });

  constructor(
    private fb: FormBuilder,
    private svc: ReportsService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const today = new Date();
    const fyStartYear = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
    const fyStart = `${fyStartYear}-04-01`;
    const fyEnd   = `${fyStartYear + 1}-03-31`;

    const qp = this.route.snapshot.queryParamMap;
    this.form = this.fb.group({
      glCode: [qp.get('glCode') ?? ''],
      from:   [qp.get('from')   ?? fyStart],
      to:     [qp.get('to')     ?? fyEnd],
    });

    this.svc.ledgerAccountOptions().subscribe(o => this.accountOptions.set(o));

    if (qp.get('glCode')) this.onProceed();
  }

  onProceed() {
    const v = this.form.getRawValue();
    if (!v.glCode) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { glCode: v.glCode, from: v.from, to: v.to },
      replaceUrl: true,
    });

    this.loading.set(true);
    this.searched.set(true);
    this.svc.customerLedger(v).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onClear() {
    this.form.reset();
    this.data.set(null);
    this.searched.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  /** Joined master address (template can't use Array.filter lambdas). */
  masterAddress(): string {
    const m = this.data()?.master;
    if (!m) return '';
    return [m.address1, m.address2, m.address3].filter(Boolean).join(', ');
  }
}
