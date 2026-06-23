import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { CrudToolbarComponent, CrudMode } from '../../shared/crud-toolbar/crud-toolbar.component';
import { DateTabDirective } from '../../shared/directives/date-tab.directive';
import { StonePurchaseService } from '../../core/services/stone-purchase.service';
import { DealerMasterService } from '../../core/services/dealer-master.service';
import { SalesmanMasterService } from '../../core/services/salesman-master.service';
import { AccountMasterService, PaymentAccount } from '../../core/services/account-master.service';
import { StoneMasterService } from '../../core/services/stone-master.service';
import { PacketMasterService } from '../../core/services/packet-master.service';
import { GstStoneMasterService } from '../../core/services/gst-stone-master.service';

@Component({
  selector: 'app-stone-purchase',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, ReactiveFormsModule,
    MatSnackBarModule, MatIconModule,
    CrudToolbarComponent, DateTabDirective,
  ],
  templateUrl: './stone-purchase.component.html',
  styleUrl: './stone-purchase.component.scss',
})
export class StonePurchaseComponent implements OnInit {

  mode = signal<CrudMode>('view');
  saving = signal(false);
  currentVounum = signal('');
  isCancelled = signal(false);

  // Journal / DB-entry inspector
  showJournal    = signal(false);
  journalData    = signal<any>(null);
  journalLoading = signal(false);
  paymentAccounts = signal<PaymentAccount[]>([]);

  // Dealer live-search
  dealerList      = signal<any[]>([]);
  dealerDropdown  = signal<any[]>([]);
  showDealerDrop  = signal(false);
  dealerActiveIdx = signal(-1);

  // Salesman live-search
  salesmanList      = signal<any[]>([]);
  salesmanDropdown  = signal<any[]>([]);
  showSalesmanDrop  = signal(false);
  salesmanActiveIdx = signal(-1);
  salesmanName      = signal('');

  // Stone master lists — lazy-loaded sub-codes cached per code
  stoneCodes  = signal<string[]>([]);
  subCodesMap = signal<Record<string, string[]>>({}); // keyed by STONE_CODE

  // Packet master list (for datalist)
  packetMasterList = signal<any[]>([]);

  // GST state logic (mirrors VB6 Glb_LockState)
  dealerStateId   = signal<number | null>(null);
  readonly LOCK_STATE = 21; // Odisha GST state code — wire to SETUP_INFO.StateCode later

  // Manual tax toggle (mirrors VB6 ChkManualEnt)
  manualTax = signal(false);

  // Round off sign: true = add to total (chk1=1), false = deduct (chk1=0)
  roundOffAdd = signal(true);

  form!: FormGroup;

  get stoneLines(): FormArray { return this.form.get('stoneLines') as FormArray; }
  get payments():   FormArray { return this.form.get('payments')   as FormArray; }

  // ── Computed totals ──────────────────────────────────────────────────────

  /** Sum of AMOUNT across all stone lines (mirrors VB6 lblTotalAmount) */
  get STONE_TOTAL(): number {
    return +((this.stoneLines?.controls ?? [])
      .reduce((s, c) => s + (+(c.get('AMOUNT')?.value) || 0), 0)).toFixed(2);
  }

  /** Alias kept for template / service compatibility */
  get TOTAL_AMOUNT(): number { return this.STONE_TOTAL; }

  /** Sum of TAX_AMT across all stone lines (mirrors VB6 lblTax auto-sum) */
  get GST_TOTAL(): number {
    return +((this.stoneLines?.controls ?? [])
      .reduce((s, c) => s + (+(c.get('TAX_AMT')?.value) || 0), 0)).toFixed(2);
  }

  /** Alias for backward compat with manual-tax logic */
  get TAX_AMT_COMPUTED(): number { return this.GST_TOTAL; }

  get DISC_AMT(): number {
    const pct = +(this.form?.get('DISC_PER')?.value ?? 0);
    return +(this.STONE_TOTAL * pct / 100).toFixed(2);
  }

  get VAT_AMT(): number {
    const pct = +(this.form?.get('VAT_PER')?.value ?? 0);
    return +(this.STONE_TOTAL * pct / 100).toFixed(2);
  }

  get TCS_TAXABLE_AMT(): number {
    return +(this.STONE_TOTAL - this.DISC_AMT).toFixed(2);
  }

  get TCS_AMT(): number {
    const pct = +(this.form?.get('TCS_PER')?.value ?? 0);
    return +(this.TCS_TAXABLE_AMT * pct / 100).toFixed(2);
  }

  get GRAND_TOTAL(): number {
    const tax = this.manualTax()
      ? +(this.form?.get('TAX_AMT')?.value ?? 0)
      : this.GST_TOTAL;
    const rndAbs = Math.abs(+(this.form?.get('ROUND_OFF')?.value ?? 0));
    const rnd = this.roundOffAdd() ? rndAbs : -rndAbs;
    return +(this.STONE_TOTAL - this.DISC_AMT + tax + this.VAT_AMT + this.TCS_AMT + rnd).toFixed(2);
  }

  /** Sum of all non-zero payment amounts */
  get TOTAL_PAID(): number {
    return +((this.payments?.controls ?? [])
      .reduce((s, c) => s + (+(c.get('AMOUNT')?.value) || 0), 0)).toFixed(2);
  }

  /** Grand total minus what has been paid */
  get BALANCE_DUE(): number {
    return +(this.GRAND_TOTAL - this.TOTAL_PAID).toFixed(2);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Unit integer → display string (mirrors VB6 unit combobox) */
  unitLabel(unit: number): string {
    const map: Record<number, string> = { 1: 'Ct.', 2: 'Gm.', 3: 'Rt.', 4: 'Cn.' };
    return map[unit] ?? 'Gm.';
  }

  getStoneCodeAt(i: number): string {
    return (this.stoneLines.at(i) as FormGroup).get('STONE_CODE')?.value ?? '';
  }

  constructor(
    private fb:          FormBuilder,
    private svc:         StonePurchaseService,
    private dealerSvc:   DealerMasterService,
    private salesmanSvc: SalesmanMasterService,
    private acctSvc:     AccountMasterService,
    private stoneSvc:    StoneMasterService,
    private packetSvc:   PacketMasterService,
    private gstSvc:      GstStoneMasterService,
    private snack:       MatSnackBar,
    private cdr:         ChangeDetectorRef,
    private router:      Router,
    private routeInfo:   ActivatedRoute,
  ) {}

  // ── Snack helpers ────────────────────────────────────────────────────────

  private showError(err: any, fallback = 'Operation failed'): void {
    const body = err?.error;
    let msg: string;
    if (typeof body?.message === 'string') {
      msg = body.message;
    } else if (Array.isArray(body?.message) && body.message.length) {
      msg = body.message[0]; // first validation error is most relevant
    } else if (err?.status === 0) {
      msg = 'Server not reachable — check your connection.';
    } else {
      msg = fallback;
    }
    this.snack.open(msg, '✕', { duration: 10000, panelClass: ['snack-error'] });
  }

  private showSuccess(msg: string): void {
    this.snack.open(msg, '', { duration: 2500, panelClass: ['snack-success'] });
  }

  private showWarn(msg: string): void {
    this.snack.open(msg, '✕', { duration: 7000, panelClass: ['snack-warn'] });
  }

  // ── Focus helpers ────────────────────────────────────────────────────────

  private get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  isToday(field: string): boolean {
    return this.form.get(field)?.value === this.today;
  }

  private focusEl(id: string): void {
    setTimeout(() => document.getElementById(id)?.focus(), 50);
  }

  private scrollDropItem(dropId: string, idx: number): void {
    setTimeout(() => {
      const items = document.querySelectorAll(`#${dropId} .lookup-item`);
      items[idx]?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  private focusGridRow(gridClass: string, rowIndex: number, cellSelector: string): void {
    setTimeout(() => {
      const rows = document.querySelectorAll(`.${gridClass} tbody tr`);
      (rows[rowIndex]?.querySelector<HTMLElement>(cellSelector))?.focus();
    }, 50);
  }

  ngOnInit() {
    this.buildForm();
    this.acctSvc.getPaymentAccounts().subscribe(a => this.paymentAccounts.set(a));
    this.dealerSvc.getAll().subscribe(d => this.dealerList.set(d));
    this.salesmanSvc.getAll().subscribe(s => this.salesmanList.set(s));
    this.stoneSvc.getStoneCodes().subscribe(codes => this.stoneCodes.set(codes));
    this.packetSvc.getAll().subscribe(p => this.packetMasterList.set(p));

    // If returning from the print page (e.g. `?v=SP000003`), reload that record
    const v = this.routeInfo.snapshot.queryParamMap.get('v');
    if (v) {
      this.svc.getOne(v).subscribe({
        next: d => d ? this.loadRecord(d) : this.onNew(),
        error: () => this.onNew(),
      });
    } else {
      this.onNew(); // Default: open in add mode
    }
  }

  // ── Form construction ────────────────────────────────────────────────────

  buildForm() {
    this.form = this.fb.group({
      VOUNUM:        [''],
      VOUDATE:       [this.today],
      DEALER_CODE:   [''],
      REF_BILL_NO:   [''],
      REF_BILL_DATE: [this.today],
      SALESMAN_CODE: [''],
      IS_CUSTOMER:   [false],
      DEALER_NAME:   [{ value: '', disabled: true }],
      DEALER_ADDR1:  [{ value: '', disabled: true }],
      DEALER_ADDR2:  [{ value: '', disabled: true }],
      DEALER_ADDR3:  [{ value: '', disabled: true }],
      DEALER_STATE:  [{ value: '', disabled: true }],
      DISC_PER:  [0],
      TAX_AMT:   [{ value: 0, disabled: true }],
      VAT_PER:   [0],
      // TCS only applies once aggregate purchases cross the Sec 206C threshold
      // (₹50L per FY). Operators opt in by typing the rate when it applies.
      TCS_PER:   [0],
      ROUND_OFF: [0],
      NARRATION: [''],
      PAN_NO:    [''],
      stoneLines: this.fb.array([]),
      payments:   this.fb.array([]),
    });
  }

  // ── Stone line row ───────────────────────────────────────────────────────

  newStoneLine(d?: any): FormGroup {
    return this.fb.group({
      STONE_CODE:  [d?.stoneCode   ?? ''],
      STONE_SUB:   [d?.stoneSub    ?? ''],
      DESCRIPTION: [d?.description ?? ''],
      UOM:         [d?.uom         ?? ''],
      PCS:         [+(d?.pcs    ?? 0)],
      WEIGHT:      [+(d?.weight ?? 0)],
      RATE:        [+(d?.rate   ?? 0)],
      RATE_TYPE:   [d?.rateType    ?? 'Wt'],
      AMOUNT:      [+(d?.amount ?? 0)],
      PACKET_NO:   [d?.packetNo    ?? ''],
      TAX_AMT:     [+(d?.taxAmt ?? 0)],
      HSNCODE:     [d?.hsncode != null ? +d.hsncode : null],
      CGST:        [+(d?.cgst  ?? 0)],
      SGST:        [+(d?.sgst  ?? 0)],
      IGST:        [+(d?.igst  ?? 0)],
    });
  }

  // ── Payment line row ─────────────────────────────────────────────────────

  newPaymentLine(d?: any): FormGroup {
    // ACC_GROUP: 1=Bank/Cheque (CHNO mandatory), 2=Cash (CHNO not needed)
    const accGroup = d?.account?.accGroup != null ? +d.account.accGroup : null;
    const isCash   = accGroup === 2;
    return this.fb.group({
      GL_CODE:   [d?.glCode != null ? +d.glCode : null],
      ACC_NAME:  [d?.account?.accName ?? ''],
      ACC_GROUP: [accGroup],
      CHNO:      [{ value: d?.chno ?? '', disabled: isCash }],
      CHDATE:    [{ value: d?.chdate?.substring(0, 10) ?? '', disabled: isCash }],
      AMOUNT:    [+(d?.amount ?? 0)],
    });
  }

  /** Called when the account name dropdown changes in a payment row */
  onPayAccountSelect(i: number) {
    const ctrl     = this.payments.at(i);
    const accName  = ctrl.get('ACC_NAME')?.value ?? '';
    const account  = this.paymentAccounts().find(a => a.accName === accName) ?? null;
    const isCash   = account?.accGroup === 2;
    ctrl.patchValue({ GL_CODE: account?.glCode ?? null, ACC_GROUP: account?.accGroup ?? null },
      { emitEvent: false });
    // Enable/disable cheque fields based on account type
    if (isCash) {
      ctrl.get('CHNO')?.setValue('',  { emitEvent: false }); ctrl.get('CHNO')?.disable();
      ctrl.get('CHDATE')?.setValue('', { emitEvent: false }); ctrl.get('CHDATE')?.disable();
      this.focusGridRow('pay-grid-wrap', i, 'td:nth-child(4) input'); // jump to Amount
    } else {
      ctrl.get('CHNO')?.enable();
      ctrl.get('CHDATE')?.enable();
      this.focusGridRow('pay-grid-wrap', i, 'td:nth-child(2) input'); // jump to Ch./Card No
    }
  }

  // ── Load record ──────────────────────────────────────────────────────────

  loadRecord(data: any) {
    this.currentVounum.set(data.vounum);
    this.dealerStateId.set(data.dealer?.idState ?? null);

    this.form.patchValue({
      VOUNUM:        data.vounum,
      VOUDATE:       data.voudate?.substring(0, 10) ?? '',
      DEALER_CODE:   data.dealerCode   ?? '',
      REF_BILL_NO:   data.refBillNo    ?? '',
      REF_BILL_DATE: data.refBillDate?.substring(0, 10) ?? '',
      SALESMAN_CODE: data.salesmanCode ?? '',
      IS_CUSTOMER:   !!data.isCustomer,
      DEALER_NAME:   data.dealer?.name     ?? '',
      DEALER_ADDR1:  data.dealer?.address1 ?? '',
      DEALER_ADDR2:  data.dealer?.address2 ?? '',
      DEALER_ADDR3:  data.dealer?.address3 ?? '',
      DEALER_STATE:  data.dealer?.state ?? (data.dealer?.idState ? `State ${data.dealer.idState}` : ''),
      DISC_PER:  +(data.discPer  ?? 0),
      TAX_AMT:   +(data.taxAmt   ?? 0),
      VAT_PER:   +(data.vatPer   ?? 0),
      TCS_PER:   +(data.tcsPer   ?? 0),
      ROUND_OFF: Math.abs(+(data.roundOff ?? 0)),
      NARRATION: data.narration ?? '',
      PAN_NO:    data.panNo     ?? '',
    });

    this.salesmanName.set(data.salesman?.name ?? '');
    this.manualTax.set(false);
    this.roundOffAdd.set(+(data.roundOff ?? 0) >= 0);
    this.isCancelled.set(data.cancel === 1);

    this.stoneLines.clear();
    (data.stoneLines ?? []).forEach((l: any) => {
      const row = this.newStoneLine(l);
      this.stoneLines.push(row);
      // Pre-populate sub-code cache for loaded records
      const code = l.stoneCode ?? '';
      if (code && !this.subCodesMap()[code]) {
        this.stoneSvc.getSubCodes(code).subscribe(subs => {
          this.subCodesMap.update(m => ({ ...m, [code]: subs }));
        });
      }
    });

    this.payments.clear();
    (data.payments ?? []).forEach((p: any) => this.payments.push(this.newPaymentLine(p)));

    this.setEditable(false);
    this.cdr.markForCheck();
  }

  // ── Grid actions ─────────────────────────────────────────────────────────

  addStoneLine() {
    const row = this.newStoneLine();
    if (this.mode() !== 'view') row.enable();
    this.stoneLines.push(row);
    this.focusGridRow('stone-grid-wrap', this.stoneLines.length - 1, 'td:nth-child(1) select');
  }
  removeStoneLine(i: number) { this.stoneLines.removeAt(i); }

  addPaymentLine() {
    const line = this.newPaymentLine();
    line.enable(); // all controls on by default; cheque fields disabled after account selection
    this.payments.push(line);
    this.focusGridRow('pay-grid-wrap', this.payments.length - 1, 'td:nth-child(1) select');
  }
  removePaymentLine(i: number) { this.payments.removeAt(i); }

  // ── Stone Code change — clear dependents, load sub-code list ─────────────

  onStoneCodeChange(i: number, stoneCode: string) {
    const ctrl = this.stoneLines.at(i);
    ctrl.patchValue(
      { STONE_SUB: '', DESCRIPTION: '', UOM: '', HSNCODE: null, CGST: 0, SGST: 0, IGST: 0, AMOUNT: 0, TAX_AMT: 0 },
      { emitEvent: false },
    );

    if (!stoneCode) return;

    const loadAndFocus = () =>
      this.focusGridRow('stone-grid-wrap', i, 'td:nth-child(2) select');

    if (this.subCodesMap()[stoneCode]) {
      loadAndFocus();
      return;
    }

    this.stoneSvc.getSubCodes(stoneCode).subscribe(subs => {
      this.subCodesMap.update(m => ({ ...m, [stoneCode]: subs }));
      loadAndFocus();
    });
  }

  // ── Sub Code change — fetch stone detail + GST rates ─────────────────────

  onSubCodeChange(i: number) {
    const ctrl    = this.stoneLines.at(i);
    const code    = ctrl.get('STONE_CODE')?.value?.trim() ?? '';
    const sub     = ctrl.get('STONE_SUB')?.value?.trim()  ?? '';
    const voudate = this.form.get('VOUDATE')?.value
      ?? new Date().toISOString().substring(0, 10);

    if (!code || !sub) return;

    this.stoneSvc.getStoneDetail(code, sub).subscribe(stone => {
      if (!stone) return;
      ctrl.patchValue(
        { DESCRIPTION: stone.stoneName1 || stone.stoneName || '', UOM: this.unitLabel(stone.unit) },
        { emitEvent: false },
      );

      this.gstSvc.getGstDetail(code, sub, voudate).subscribe(gst => {
        if (gst) {
          ctrl.patchValue(
            { HSNCODE: gst.hsnCode ?? null, CGST: gst.cgst, SGST: gst.sgst, IGST: gst.igst },
            { emitEvent: false },
          );
        }
        this.calcLineAmount(i);
        // After auto-fill, move focus to PCS (5th column) for quantity entry
        this.focusGridRow('stone-grid-wrap', i, 'td:nth-child(5) input');
      });
    });
  }

  // ── Amount = PCS×RATE (Pcs mode) or WEIGHT×RATE (Wt mode) ───────────────

  calcLineAmount(i: number) {
    const ctrl     = this.stoneLines.at(i);
    const rateType = ctrl.get('RATE_TYPE')?.value ?? 'Wt';
    const pcs      = +(ctrl.get('PCS')?.value    ?? 0);
    const weight   = +(ctrl.get('WEIGHT')?.value ?? 0);
    const rate     = +(ctrl.get('RATE')?.value   ?? 0);

    const amount = rateType === 'Pcs' ? pcs * rate : weight * rate;
    ctrl.get('AMOUNT')?.setValue(+amount.toFixed(2), { emitEvent: false });
    this.calcLineTax(i);
  }

  // ── Tax per line (intra-state: CGST+SGST; inter-state: IGST) ─────────────

  calcLineTax(i: number) {
    const ctrl = this.stoneLines.at(i);
    const amt  = +(ctrl.get('AMOUNT')?.value ?? 0);
    const cgst = +(ctrl.get('CGST')?.value   ?? 0);
    const sgst = +(ctrl.get('SGST')?.value   ?? 0);
    const igst = +(ctrl.get('IGST')?.value   ?? 0);

    let tax: number;
    if (this.dealerStateId() !== null && this.dealerStateId() === this.LOCK_STATE) {
      // Intra-state: CGST + SGST (inter-divide by 100, not 0.01 — same thing, clearer intent)
      tax = +((amt * cgst / 100) + (amt * sgst / 100)).toFixed(2);
    } else {
      // Inter-state or unknown: IGST only
      tax = +(amt * igst / 100).toFixed(2);
    }

    ctrl.get('TAX_AMT')?.setValue(tax, { emitEvent: false });

    if (!this.manualTax()) {
      this.form.get('TAX_AMT')?.setValue(this.GST_TOTAL, { emitEvent: false });
    }
  }

  // ── Manual tax toggle ────────────────────────────────────────────────────

  onManualTaxToggle(checked: boolean) {
    this.manualTax.set(checked);
    if (checked) {
      this.form.get('TAX_AMT')?.enable();
    } else {
      this.form.get('TAX_AMT')?.setValue(this.GST_TOTAL, { emitEvent: false });
      this.form.get('TAX_AMT')?.disable();
    }
  }

  /** Whether cheque fields should be shown for a payment row */
  payRowIsCash(i: number): boolean {
    return this.payments.at(i).get('ACC_GROUP')?.value === 2;
  }

  // ── Dealer live-search ───────────────────────────────────────────────────

  onDealerFocus() {
    const list = this.dealerList();
    this.dealerDropdown.set(list);
    this.showDealerDrop.set(list.length > 0);
    this.dealerActiveIdx.set(-1);
  }

  onDealerInput(val: string) {
    const q = (val ?? '').toLowerCase().trim();
    const src = q
      ? this.dealerList().filter(d => d.code?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q))
      : this.dealerList();
    this.dealerDropdown.set(src);
    this.showDealerDrop.set(src.length > 0);
    this.dealerActiveIdx.set(-1);
  }

  onDealerKeydown(event: KeyboardEvent) {
    const list = this.dealerDropdown();
    if (!this.showDealerDrop() || !list.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(this.dealerActiveIdx() + 1, list.length - 1);
      this.dealerActiveIdx.set(next);
      this.scrollDropItem('dealer-drop', next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = Math.max(this.dealerActiveIdx() - 1, 0);
      this.dealerActiveIdx.set(prev);
      this.scrollDropItem('dealer-drop', prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.dealerActiveIdx();
      if (idx >= 0 && idx < list.length) this.selectDealer(list[idx]);
    } else if (event.key === 'Escape') {
      this.showDealerDrop.set(false);
    }
  }

  selectDealer(d: any) {
    this.form.get('DEALER_CODE')?.setValue(d.code);
    this.form.patchValue({
      DEALER_NAME:  d.name     ?? '',
      DEALER_ADDR1: d.address1 ?? '',
      DEALER_ADDR2: d.address2 ?? '',
      DEALER_ADDR3: d.address3 ?? '',
      DEALER_STATE: d.state ?? (d.idState ? `State ${d.idState}` : ''),
    });
    this.dealerStateId.set(d.idState ?? null);
    this.showDealerDrop.set(false);
    this.dealerActiveIdx.set(-1);
    this.focusEl('f-refbillno');
  }

  onDealerBlur() {
    setTimeout(() => {
      this.showDealerDrop.set(false);
      const code = this.form.get('DEALER_CODE')?.value?.trim();
      if (code && !this.form.get('DEALER_NAME')?.value) {
        const match = this.dealerList().find(d => d.code?.toLowerCase() === code.toLowerCase());
        if (match) this.selectDealer(match);
      }
    }, 150);
  }

  // ── Salesman live-search ─────────────────────────────────────────────────

  onSalesmanFocus() {
    const list = this.salesmanList();
    this.salesmanDropdown.set(list);
    this.showSalesmanDrop.set(list.length > 0);
    this.salesmanActiveIdx.set(-1);
  }

  onSalesmanInput(val: string) {
    const q = (val ?? '').toLowerCase().trim();
    const src = q
      ? this.salesmanList().filter(s => s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q))
      : this.salesmanList();
    this.salesmanDropdown.set(src);
    this.showSalesmanDrop.set(src.length > 0);
    this.salesmanActiveIdx.set(-1);
  }

  onSalesmanKeydown(event: KeyboardEvent) {
    const list = this.salesmanDropdown();
    if (!this.showSalesmanDrop() || !list.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(this.salesmanActiveIdx() + 1, list.length - 1);
      this.salesmanActiveIdx.set(next);
      this.scrollDropItem('salesman-drop', next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = Math.max(this.salesmanActiveIdx() - 1, 0);
      this.salesmanActiveIdx.set(prev);
      this.scrollDropItem('salesman-drop', prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.salesmanActiveIdx();
      if (idx >= 0 && idx < list.length) this.selectSalesman(list[idx]);
    } else if (event.key === 'Escape') {
      this.showSalesmanDrop.set(false);
    }
  }

  selectSalesman(s: any) {
    this.form.get('SALESMAN_CODE')?.setValue(s.code);
    this.salesmanName.set(s.name ?? '');
    this.showSalesmanDrop.set(false);
    this.salesmanActiveIdx.set(-1);
    this.focusEl('f-iscustomer');
  }

  onSalesmanBlur() {
    setTimeout(() => {
      this.showSalesmanDrop.set(false);
      const code = this.form.get('SALESMAN_CODE')?.value?.trim();
      if (code && !this.salesmanName()) {
        const match = this.salesmanList().find(s => s.code?.toLowerCase() === code.toLowerCase());
        if (match) this.salesmanName.set(match.name ?? '');
      }
    }, 150);
  }

  // ── Enable / disable all form controls ───────────────────────────────────

  setEditable(on: boolean) {
    const editableFields = [
      'VOUNUM','VOUDATE','DEALER_CODE','REF_BILL_NO','REF_BILL_DATE',
      'SALESMAN_CODE','IS_CUSTOMER','DISC_PER',
      'VAT_PER','TCS_PER','ROUND_OFF','NARRATION','PAN_NO',
    ];
    editableFields.forEach(f => on ? this.form.get(f)?.enable() : this.form.get(f)?.disable());

    if (on && this.manualTax()) {
      this.form.get('TAX_AMT')?.enable();
    } else {
      this.form.get('TAX_AMT')?.disable();
    }

    this.stoneLines.controls.forEach(c => on ? c.enable() : c.disable());
    this.payments.controls.forEach(c => {
      if (on) {
        c.enable();
        // Re-apply cheque field disabled state for cash accounts
        const isCash = c.get('ACC_GROUP')?.value === 2;
        if (isCash) { c.get('CHNO')?.disable(); c.get('CHDATE')?.disable(); }
      } else {
        c.disable();
      }
    });
  }

  // ── Toolbar actions ──────────────────────────────────────────────────────

  onNew() {
    this.mode.set('add');
    this.manualTax.set(false);
    this.roundOffAdd.set(true);
    this.isCancelled.set(false);
    this.dealerStateId.set(null);
    this.salesmanName.set('');
    this.showJournal.set(false);
    this.journalData.set(null);
    // Clear arrays before form.reset() so Angular never sees stale rows
    this.stoneLines.clear();
    this.payments.clear();
    this.form.reset({ TCS_PER: 0, DISC_PER: 0, VAT_PER: 0, TAX_AMT: 0, ROUND_OFF: 0,
                      VOUDATE: this.today, REF_BILL_DATE: this.today });
    this.addStoneLine();
    this.addPaymentLine();
    this.setEditable(true);
    this.cdr.detectChanges();
    this.focusEl('f-vounum');
    this.form.get('VOUNUM')?.setValue('Loading...');
    this.svc.nextVounum().subscribe({
      next: r => this.form.get('VOUNUM')?.setValue(r.vounum),
      error: () => this.form.get('VOUNUM')?.setValue('(Auto)'),
    });
  }

  onModify() {
    if (this.isCancelled()) {
      this.showWarn('Voucher is cancelled — modification not allowed.');
      return;
    }
    this.mode.set('edit');
    this.setEditable(true);
    this.form.get('VOUNUM')?.disable();
  }

  onDiscard() {
    this.mode.set('view');
    this.showDealerDrop.set(false);
    this.showSalesmanDrop.set(false);
    this.manualTax.set(false);
    if (this.currentVounum()) {
      this.svc.getOne(this.currentVounum()).subscribe(d => this.loadRecord(d));
    } else {
      this.form.reset();
      this.stoneLines.clear();
      this.payments.clear();
    }
  }

  onSave() {
    const v      = this.form.getRawValue();
    const taxAmt = this.manualTax() ? +v.TAX_AMT : this.GST_TOTAL;

    // ── VB6 payment validation rules ─────────────────────────────────────────
    const activePayments = (v.payments ?? []).filter((p: any) => +(p.AMOUNT) > 0);

    // Rule 1: total paid cannot exceed grand total
    if (this.TOTAL_PAID > this.GRAND_TOTAL + 0.005) {
      this.showWarn('Payment total cannot exceed the grand total.');
      return;
    }

    // Rule 2a: every active payment row must have an account selected
    for (const p of activePayments) {
      if (!p.GL_CODE) {
        this.showWarn('Select an account name for every payment row.');
        return;
      }
    }

    // Rule 2b: bank/card account requires cheque/card number
    for (const p of activePayments) {
      if (+(p.ACC_GROUP) === 1 && !p.CHNO?.trim()) {
        this.showWarn('Enter Cheque / Card No. in the payment details.');
        return;
      }
    }

    // Rule 3: customer mode + partial payment
    const isCustomer = !!v.IS_CUSTOMER;
    if (isCustomer && this.BALANCE_DUE > 0.005) {
      this.showWarn('Customer mode: payment must be made in full before saving.');
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const dto = {
      VOUDATE:         v.VOUDATE,
      DEALER_CODE:     v.DEALER_CODE,
      REF_BILL_NO:     v.REF_BILL_NO,
      REF_BILL_DATE:   v.REF_BILL_DATE,
      SALESMAN_CODE:   v.SALESMAN_CODE,
      IS_CUSTOMER:     v.IS_CUSTOMER ? 1 : 0,
      TOTAL_AMOUNT:    this.STONE_TOTAL,
      DISC_PER:        +v.DISC_PER,
      DISC_AMT:        this.DISC_AMT,
      TAX_AMT:         taxAmt,
      VAT_PER:         +v.VAT_PER,
      VAT_AMT:         this.VAT_AMT,
      TCS_TAXABLE_AMT: this.TCS_TAXABLE_AMT,
      TCS_PER:         +v.TCS_PER,
      TCS_AMT:         this.TCS_AMT,
      ROUND_OFF:       this.roundOffAdd() ? Math.abs(+v.ROUND_OFF) : -Math.abs(+v.ROUND_OFF),
      GRAND_TOTAL:     this.GRAND_TOTAL,
      NARRATION:       v.NARRATION,
      PAN_NO:          v.PAN_NO,
      stoneLines: (v.stoneLines ?? []).map((l: any) => ({
        STONE_CODE:  l.STONE_CODE  || null,
        STONE_SUB:   l.STONE_SUB   || null,
        DESCRIPTION: l.DESCRIPTION || null,
        UOM:         l.UOM         || null,
        PCS:         +(l.PCS    ?? 0),
        WEIGHT:      +(l.WEIGHT ?? 0),
        RATE:        +(l.RATE   ?? 0),
        AMOUNT:      +(l.AMOUNT ?? 0),
        PACKET_NO:   l.PACKET_NO   || null,
        TAX_AMT:     +(l.TAX_AMT ?? 0),
        HSNCODE:     l.HSNCODE === '' || l.HSNCODE == null ? null : +l.HSNCODE,
        CGST:        +(l.CGST ?? 0),
        SGST:        +(l.SGST ?? 0),
        IGST:        +(l.IGST ?? 0),
      })),
      // Rule 4: rows with amount=0 are excluded from save
      payments: activePayments.length
        ? activePayments.map((p: any) => ({
            GL_CODE: p.GL_CODE ?? null,
            CHNO:    p.CHNO   ?? '',
            CHDATE:  p.CHDATE ?? '',
            AMOUNT:  +p.AMOUNT,
          }))
        : [{ GL_CODE: null, CHNO: '', CHDATE: '', AMOUNT: 0 }],
    };

    const req = this.mode() === 'add'
      ? this.svc.create(dto)
      : this.svc.update(this.currentVounum(), dto);

    this.saving.set(true);
    req.subscribe({
      next: d => {
        this.saving.set(false);
        this.mode.set('view');
        this.loadRecord(d);
        this.showSuccess('Saved successfully.');
      },
      error: err => {
        this.saving.set(false);
        this.showError(err, 'Save failed — please try again.');
      },
    });
  }

  onDelete() {
    if (this.isCancelled()) {
      this.showWarn('Voucher is cancelled — deletion not allowed.');
      return;
    }
    if (!confirm(`Delete voucher ${this.currentVounum()}?`)) return;
    this.svc.delete(this.currentVounum()).subscribe({
      next: () => {
        this.showSuccess('Voucher deleted.');
        this.svc.getFirst().subscribe({ next: d => d ? this.loadRecord(d) : this.onNew() });
      },
      error: err => this.showError(err, 'Delete failed.'),
    });
  }

  onTop()   { this.svc.getFirst().subscribe({ next: d => d ? this.loadRecord(d) : this.onNew(), error: err => this.showError(err, 'Could not navigate to first record.') }); }
  onLast()  { this.svc.getLast().subscribe({ next: d => d && this.loadRecord(d), error: err => this.showError(err, 'Could not navigate to last record.') }); }
  onNext()  { if (this.currentVounum()) this.svc.getNext(this.currentVounum()).subscribe({ next: d => d && this.loadRecord(d), error: err => this.showError(err, 'Could not navigate to next record.') }); }
  onPrior() { if (this.currentVounum()) this.svc.getPrev(this.currentVounum()).subscribe({ next: d => d && this.loadRecord(d), error: err => this.showError(err, 'Could not navigate to previous record.') }); }

  toggleJournal() {
    if (this.showJournal()) { this.showJournal.set(false); return; }
    this.showJournal.set(true);
    this.journalLoading.set(true);
    this.journalData.set(null);
    this.svc.getJournal(this.currentVounum()).subscribe({
      next:  d => { this.journalData.set(d); this.journalLoading.set(false); },
      error: err => { this.journalLoading.set(false); this.showError(err, 'Failed to load DB entries.'); },
    });
  }

  onClose() { this.router.navigate(['/']); }
  onPrint() {
    const v = this.currentVounum();
    if (!v) {
      this.showWarn('Save the voucher first to print it.');
      return;
    }
    this.router.navigate(['/stone-purchase', v, 'print']);
  }
  onSeek()  { /* TODO: search dialog */ }

  onCancel() {
    if (!this.currentVounum()) return;
    if (this.isCancelled()) {
      this.showWarn('This voucher is already cancelled.');
      return;
    }
    if (!confirm(`Cancel voucher ${this.currentVounum()}?\n\nThis will delete all line items and account entries and zero the header. This action cannot be undone.`)) return;
    this.svc.cancelVoucher(this.currentVounum()).subscribe({
      next: d => {
        this.loadRecord(d);
        this.showSuccess(`Voucher ${this.currentVounum()} cancelled.`);
      },
      error: err => this.showError(err, 'Cancel failed.'),
    });
  }
}
