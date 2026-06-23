import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StonePurchaseService } from '../../../core/services/stone-purchase.service';
import { inrNumber, ddmmyyyy, amountInWords, uomLabel } from './format.util';
import { buildStonePurchaseVoucherDoc, PrintData } from './stone-purchase-voucher.doc';

@Component({
  selector: 'app-stone-purchase-print',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './stone-purchase-print.component.html',
  styleUrl: './stone-purchase-print.component.scss',
})
export class StonePurchasePrintComponent implements OnInit {
  loading  = signal(true);
  error    = signal<string | null>(null);
  data     = signal<PrintData | null>(null);
  vounum   = signal('');

  // ── Computed totals / display helpers ────────────────────────────────────
  title = computed(() => {
    const tc = this.data()?.voucher?.trancode;
    return tc === 'ITP' ? 'STONE PURCHASE RETURN' : 'STONE PURCHASE';
  });

  stoneTotal = computed(() =>
    (this.data()?.stoneLines ?? []).reduce((s, l) => s + Number(l.amount ?? 0), 0),
  );

  paidTotal = computed(() =>
    (this.data()?.payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0),
  );

  /** Returns an array of empty slots to pad the line item grid to a minimum row count. */
  padRows = computed(() => {
    const MIN = 6;
    const have = this.data()?.stoneLines?.length ?? 0;
    return Array(Math.max(0, MIN - have)).fill(null);
  });

  // Format helpers exposed to template
  fmt = inrNumber;
  fmtDate = ddmmyyyy;
  fmtUom = uomLabel;
  fmtWords = amountInWords;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private svc: StonePurchaseService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    // Use the param observable (not snapshot) so we re-fetch when the URL
    // changes while the same component instance is being reused — e.g.
    // navigating from /…/SP000056/print to /…/SP000055/print would otherwise
    // keep showing the stale SP000056 data.
    this.route.paramMap.subscribe(params => {
      const v = params.get('vounum') ?? '';
      this.vounum.set(v);
      this.error.set(null);
      this.data.set(null);
      if (!v) {
        this.error.set('No voucher number specified.');
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      this.svc.getPrintData(v).subscribe({
        next: (d) => {
          // Belt-and-braces: ignore the response if the URL has moved on
          // (avoids race when two requests overlap).
          if (this.vounum() === v) {
            this.data.set(d);
            this.loading.set(false);
          }
        },
        error: (e) => {
          if (this.vounum() === v) {
            this.error.set(e?.error?.message ?? 'Failed to load voucher.');
            this.loading.set(false);
          }
        },
      });
    });
  }

  dealerAddress(): string {
    const d = this.data()?.dealer;
    return [d?.address1, d?.address2, d?.address3].filter(Boolean).join(', ');
  }

  companyAddress(): string {
    const c = this.data()?.company;
    return [c?.address1, c?.address2, c?.address3].filter(Boolean).join(', ');
  }

  isCashRow(p: any): boolean {
    return p?.accGroup === 2;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async onDownloadPdf() {
    const d = this.data();
    if (!d) return;
    try {
      // pdfmake bundles ~1MB of font data — lazy-load to keep main bundle slim
      const pdfMakeMod = await import('pdfmake/build/pdfmake');
      const vfsMod     = await import('pdfmake/build/vfs_fonts');
      const pdfMake: any = (pdfMakeMod as any).default ?? pdfMakeMod;
      const vfs: any = (vfsMod as any).default ?? vfsMod;
      pdfMake.vfs = vfs.pdfMake?.vfs ?? vfs.vfs ?? vfs;

      const doc = buildStonePurchaseVoucherDoc(d);
      pdfMake.createPdf(doc).download(`${d.voucher.vounum || 'StonePurchase'}.pdf`);
    } catch (e: any) {
      this.snack.open(`PDF generation failed: ${e?.message ?? e}`, '✕',
        { duration: 6000, panelClass: ['snack-error'] });
    }
  }

  async onPrint() {
    const d = this.data();
    if (!d) return;
    try {
      const pdfMakeMod = await import('pdfmake/build/pdfmake');
      const vfsMod     = await import('pdfmake/build/vfs_fonts');
      const pdfMake: any = (pdfMakeMod as any).default ?? pdfMakeMod;
      const vfs: any = (vfsMod as any).default ?? vfsMod;
      pdfMake.vfs = vfs.pdfMake?.vfs ?? vfs.vfs ?? vfs;

      const doc = buildStonePurchaseVoucherDoc(d);
      pdfMake.createPdf(doc).print();
    } catch {
      window.print(); // fallback: print the HTML preview directly
    }
  }

  /**
   * Return to whichever page brought us here.
   *  - From Stone Purchase Register → register page with its filter intact (URL state).
   *  - From the Stone Purchase form → form with this voucher loaded.
   *  - Direct URL hit (no history) → falls back to the register page.
   */
  onBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/reports/stone-purchase-register']);
    }
  }
}
