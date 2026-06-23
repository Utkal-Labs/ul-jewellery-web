import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RouterLink, RouterLinkActive, RouterOutlet,
  Router, NavigationEnd,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

interface ReportEntry {
  label:    string;
  route?:   string;
  disabled?: boolean;
  shortcut?: string;
  sub?:      ReportEntry[];   // nested sub-menu (matches VB6 sub-menus)
}
interface ReportCategory { title: string; expanded?: boolean; items: ReportEntry[] }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    RouterLink, RouterLinkActive, RouterOutlet,
    MatIconModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {

  // ── Routing state: render landing only on /reports (no child route) ──────
  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map((e: any) => e.urlAfterRedirects as string),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  isLanding = computed(() => {
    const u = this.url() ?? '';
    return u === '/reports' || u === '/reports/';
  });

  // ── Sidebar search (filters report leaves) ───────────────────────────────
  query = signal('');
  filtered = computed<ReportCategory[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.categories;
    const matches = (e: ReportEntry): ReportEntry | null => {
      const selfHit = e.label.toLowerCase().includes(q);
      const subHits = (e.sub ?? []).map(matches).filter(Boolean) as ReportEntry[];
      if (selfHit || subHits.length) {
        return { ...e, sub: subHits.length ? subHits : e.sub };
      }
      return null;
    };
    return this.categories
      .map(c => {
        const items = c.items.map(matches).filter(Boolean) as ReportEntry[];
        return items.length ? { ...c, items, expanded: true } : null;
      })
      .filter(Boolean) as ReportCategory[];
  });

  // Functional report leaves (Quick Access cards on the landing page).
  // Pulled at runtime so adding a `route` to any item lights up its card.
  quickReports = computed(() => {
    const found: { category: string; label: string; route: string }[] = [];
    const walk = (cat: string, items: ReportEntry[]) => {
      for (const it of items) {
        if (it.route && !it.disabled) found.push({ category: cat, label: it.label, route: it.route });
        if (it.sub?.length) walk(cat, it.sub);
      }
    };
    this.categories.forEach(c => walk(c.title, c.items));
    return found;
  });

  constructor(private router: Router) {}

  // 1:1 mirror of MainMenu.frm "&Report" menu in the VB6 source.
  // Hidden items (Visible = 0 'False') are omitted to match the legacy UX.
  // "Stone Purchase Register" is the one deviation — exposed because the new
  // Angular app provides the filter form for it.
  categories: ReportCategory[] = [
    {
      title: 'Order/Customer Related Reports',
      items: [
        { label: 'Pending Order Delivery',                    disabled: true },
        { label: 'Customer Metal Advance',                    disabled: true },
        { label: 'Customer Cash Advance',                     disabled: true },
        { label: 'Customer Stone Advance',                    disabled: true },
        { label: 'Customer Metal Refund',                     disabled: true },
        { label: 'Customer Cash Refund',                      disabled: true },
        { label: 'Customer Stone Refund',                     disabled: true },
        { label: 'Customer Dues Statement',                   disabled: true },
        { label: 'Customer Order History',                    disabled: true, shortcut: 'Shift+F12' },
        { label: 'Customer Wise Sale & Sale Return Amount',   disabled: true },
        { label: 'Customer Wise Sale & Sale Return Weight',   disabled: true },
        { label: 'Order Receive But Not Issue To Artisan',    disabled: true },
        { label: 'Customer Feedback',                         disabled: true },
        { label: 'Area Wise Customer Feedback',               disabled: true },
        { label: 'Due Memo Receive Report',                   disabled: true },
        { label: 'Dealer Order Issue/Receive Reports',        disabled: true },
        { label: 'Customer Balance & Ledger',                 route: '/reports/customer-ledger', shortcut: 'Ctrl+W' },
        { label: 'Customer List ( DOB & ANNI.)',              disabled: true },
        { label: 'Customer List Bill Amount Wise',            disabled: true },
        { label: 'Customer Order Status Ledger',              disabled: true },
        { label: 'Credit Note Report',                        disabled: true },
      ],
    },
    {
      title: 'Artisan Related Reports',
      items: [
        { label: 'Artisan Ledger Puritywise',                          disabled: true },
        { label: 'Artisan Ledger Cumulative',                          disabled: true },
        { label: 'Artisan (All) Balance PurityWise',                   disabled: true },
        { label: 'Artisan (All) Balance Cumulative Wise',              disabled: true },
        { label: 'Artisan WorkOrder Itemwise Mis',                     disabled: true },
        { label: 'Artisan/Dealer Comparison Chart',                    disabled: true },
        { label: 'Artisan Passbook Print',                             disabled: true },
        { label: 'Artisan Ledger Cumulative other item',               disabled: true },
        { label: 'Artisan (All) Balance Cumulative Wise other item',   disabled: true },
        { label: 'Artisan Register',                                   disabled: true },
        { label: 'Boss Artisan Register',                              disabled: true },
      ],
    },
    {
      title: 'Dealer Related Reports',
      items: [
        { label: 'Dealer Ledger Puritywise',                disabled: true },
        { label: 'Dealer Ledger Cumulative',                disabled: true },
        { label: 'Dealer (All) Balance PurityWise',         disabled: true },
        { label: 'Dealer (All) Balance Cumulative Wise',    disabled: true },
        { label: 'Special Issue Register',                  disabled: true },
        { label: 'Dealer Sale/Purchase Register',           disabled: true },
        { label: 'Dealer Order Ledger Report',              disabled: true },
        { label: 'Dealer Order History',                    disabled: true },
        { label: 'Dealer All Balance',                      disabled: true },
      ],
    },
    {
      title: 'Metal Related Reports',
      items: [
        { label: 'Standard Metal', disabled: true, sub: [
          { label: 'Ledger Report', disabled: true },
        ]},
        { label: 'Old Metal', disabled: true, sub: [
          { label: 'Ledger Report', disabled: true },
        ]},
        { label: 'Wastage Ledger',                disabled: true },
        { label: 'Purity With Grade Wise Stock',  disabled: true },
        { label: 'Metal Registers  (11 No.)',     disabled: true },
        { label: 'Metal Registers  (12 No.)',     disabled: true },
        { label: 'Metal Registers  (13 No.)',     disabled: true },
        { label: 'Receive & Issue Register',      disabled: true },
        { label: 'Making Register',               disabled: true },
        { label: 'Metal Day Book Reports',        disabled: true },
        { label: 'Metal Cumulative Report',       disabled: true },
        { label: 'Metal Trial',                   disabled: true },
      ],
    },
    {
      title: 'Stone Related Reports',
      expanded: true,
      items: [
        { label: 'Loose Stone Details', sub: [
          { label: 'Stone Balance',  route: '/reports/stone-balance', shortcut: 'Shift+F9' },
          { label: 'Stone Ledger',   disabled: true },
        ]},
        { label: 'Artisan Stone Balance',  disabled: true },
        { label: 'Artisan Stone Ledger',   disabled: true },
        // Stone Master List — single-table report example
        { label: 'Stone Master List',       route: '/reports/stone-master-list' },
        // VB6 hides "Stone Purchase Register" (mnuStPurchase, Visible=0).
        // Surfaced here because the Angular app provides its filter form.
        { label: 'Stone Purchase Register', route: '/reports/stone-purchase-register' },
        { label: 'Packet Report',          disabled: true },
      ],
    },
    {
      title: 'Accounts Related Reports',
      items: [
        { label: 'Day Book Register', disabled: true, sub: [
          { label: 'Journalbook',                       disabled: true },
          { label: 'Mixed Cash/Bank Book',              disabled: true },
          { label: 'Account Confirmation',              disabled: true },
          { label: 'TDS',                               disabled: true },
          { label: 'Received/Payment Register Report',  disabled: true },
          { label: 'Anex Party Ledger',                 disabled: true },
          { label: 'A/C Analysis Report',               disabled: true },
        ]},
        { label: 'Ledger Report', disabled: true, sub: [
          { label: 'General Ledger', disabled: true, shortcut: 'Ctrl+L' },
        ]},
        { label: 'Trial Balance', disabled: true, sub: [
          { label: 'Trial Balance (Concise)', disabled: true },
          { label: 'Groupwise Balance',       disabled: true },
        ]},
        { label: 'Final Accounts', disabled: true, sub: [
          { label: 'Trading Report As On..',      disabled: true },
          { label: 'Profit & Loss As On ..',      disabled: true },
          { label: 'Balance Sheet As On..',       disabled: true },
          { label: 'Stock Valuation',             disabled: true },
          { label: 'Bank Reconcilation Statement',disabled: true },
          { label: 'Costing Of Id..',             disabled: true },
          { label: 'P.L. & Balance Sheet',        disabled: true },
          { label: 'Dashboard',                   disabled: true },
          { label: 'Warning Report',              disabled: true },
        ]},
      ],
    },
    {
      title: 'Purchase Related Reports',
      items: [
        { label: 'Std. Metal  Purchase',            disabled: true },
        { label: 'Old Metal Purchase',              disabled: true },
        { label: 'Old Metal Extra Purchase',        disabled: true },
        { label: 'Stone Purchase',                  disabled: true },
        { label: "New Ornament Report's",           disabled: true },
        { label: 'Purchase Register',               disabled: true },
        { label: 'Purchase Return Register',        disabled: true },
        { label: 'Purchase With Item Detail',       disabled: true },
        { label: 'Purchase With Rate Cut MIS',      disabled: true },
      ],
    },
    {
      title: 'Sale Related Reports',
      items: [
        { label: 'Memo Total', disabled: true },
        { label: 'Ornament & Other Sale Register', disabled: true, sub: [
          { label: 'New Ornament Sale',             disabled: true },
          { label: 'Stone Sale',                    disabled: true },
          { label: 'Std. Bar Sale',                 disabled: true },
          { label: 'Old Metal  Sale',               disabled: true },
          { label: 'Other Sale',                    disabled: true },
          { label: 'Sale Register',                 disabled: true },
          { label: 'Estimate Report',               disabled: true },
          { label: 'Sale Franchaise Report',        disabled: true },
          { label: 'Gold Silver Sale Register Reports', disabled: true },
          { label: 'Excise Report',                 disabled: true },
          { label: 'E Invoice Analysis Report',     disabled: true },
          { label: 'New Ornament Sale Return',      disabled: true },
        ]},
        { label: 'Product Wise Sale',                  disabled: true },
        { label: 'Input TAX Account Register',         disabled: true },
        { label: 'Output TAX Account Register',        disabled: true },
        { label: 'Input Credit Account Register',      disabled: true },
        { label: 'Vat Return Statement',               disabled: true },
        { label: 'Combine Sale Register',              disabled: true },
        { label: 'Daily Order/Purchase/Sale Report',   disabled: true },
        { label: 'Artisan Wise Design Report',         disabled: true },
      ],
    },
    {
      title: 'Item Related Reports',
      items: [
        { label: 'Showroom',                      disabled: true, shortcut: 'F12' },
        { label: 'Tejori',                        disabled: true },
        { label: 'Showroom (Detail)',             disabled: true },
        { label: 'Tejori Detail',                 disabled: true },
        { label: 'Inter Item Transfer Register',  disabled: true },
        { label: 'Sale Report Id Wise',           disabled: true },
        { label: 'Artisan Daywise Total Issue & Received Report', disabled: true },
      ],
    },
    {
      title: 'Id Related Reports',
      items: [
        { label: 'Id Details Report',                                 disabled: true },
        { label: 'Id History',                                        disabled: true },
        { label: 'Location Of Ornaments',                             disabled: true },
        { label: 'Selected Id Report',                                disabled: true },
        { label: 'Sale Report Id Wise',                               disabled: true },
        { label: 'Id Wise Weight Difference',                         disabled: true },
        { label: 'Id Report With Image',                              disabled: true },
        { label: 'Design With Picture',                               disabled: true },
        { label: 'Customer/Artisan/Dealer Related Id Image',          disabled: true },
        { label: 'Showroom To Tejori',                                disabled: true },
        { label: 'Till Image not save with Id',                       disabled: true },
        { label: 'Purchase Related Id Status',                        disabled: true },
        { label: 'Id Batch Printing',                                 disabled: true },
        { label: 'Mailing ID & With Image',                           disabled: true },
        { label: 'Artisan/Dealer Wise Sale Performance',              disabled: true },
        { label: 'Item Wise Sale Performance',                        disabled: true },
        { label: 'Id Ageing Report',                                  disabled: true },
        { label: 'Output & Input Data Report',                        disabled: true },
        { label: 'Released Id(Booked)Report',                         disabled: true },
        { label: 'Id History Report',                                 disabled: true },
        { label: 'Margin Report w.r.to Sold Id',                      disabled: true },
        { label: 'Id Wise Profit / Loss Report',                      disabled: true },
        { label: 'Id Comparison Report',                              disabled: true },
        { label: 'Transit Status',                                    disabled: true },
        { label: 'Transit Register',                                  disabled: true },
        { label: 'Image Insert Into Id Through Batch',                disabled: true },
        { label: 'Design Report',                                     disabled: true },
        { label: 'MIS Report',                                        disabled: true },
        { label: 'DateWise ID Stock Reports',                         disabled: true },
        { label: 'DateWiseTejori Reports',                            disabled: true },
        { label: 'Create Similar Id',                                 disabled: true },
      ],
    },
    {
      title: 'Mint Related Reports',
      items: [
        { label: 'Mint Gain-Loss Register', disabled: true },
        { label: 'Mint Receive Register',   disabled: true },
        { label: 'Mint Issue Register',     disabled: true },
        { label: 'Mint Ledger',             disabled: true },
      ],
    },
    {
      title: 'Salesman Report',
      items: [
        { label: 'Salesman Performance', disabled: true },
      ],
    },
    {
      title: 'Approval Report',
      items: [
        { label: 'Register',                  disabled: true },
        { label: 'Item Balance',              disabled: true },
        { label: 'Item Ledger',               disabled: true },
        { label: 'Item Balance  (Other Item)',disabled: true },
        { label: 'Item Ledger (Other Item)',  disabled: true },
      ],
    },
    {
      title: 'Repair Report',
      items: [
        { label: 'Issue Register', disabled: true },
      ],
    },
    // Top-level direct items in VB6 (no sub-menu), grouped here for clarity.
    {
      title: 'Other Reports',
      items: [
        { label: 'Id Transfer Through Department Report', disabled: true },
        { label: 'YearWise Status Report',                disabled: true },
        { label: 'Other Item Stock',                      disabled: true },
        { label: 'Other Item Ledger',                     disabled: true },
        { label: 'Monthly Scheme Report',                 disabled: true },
        { label: 'GiftCard Transaction Report',           disabled: true },
        { label: 'Dealer Order Status',                   disabled: true },
        { label: 'GSTR Report',                           disabled: true },
        { label: 'GiftCoupon Transaction Report',         disabled: true },
      ],
    },
  ];

  toggle(c: ReportCategory) { c.expanded = !c.expanded; }
  toggleEntry(it: ReportEntry) { (it as any)._expanded = !(it as any)._expanded; }
  isExpanded(it: ReportEntry): boolean { return !!(it as any)._expanded; }
}
