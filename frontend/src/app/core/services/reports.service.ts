import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private url = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  /** Build HttpParams, dropping empty values. */
  private params(obj: Record<string, any>): HttpParams {
    let p = new HttpParams();
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 0) p = p.set(k, String(v));
    });
    return p;
  }

  // ── Single table ──────────────────────────────────────────────────────────
  stoneMasterList(f: { q?: string; active?: string }) {
    return this.http.get<any[]>(`${this.url}/stone-master-list`, { params: this.params(f) });
  }

  // ── Temporary table (aggregation) ────────────────────────────────────────
  stoneBalance(f: { asOf?: string; stoneCode?: string }) {
    return this.http.get<any[]>(`${this.url}/stone-balance`, { params: this.params(f) });
  }

  // ── Sub-report ───────────────────────────────────────────────────────────
  customerLedger(f: { glCode: string | number; from?: string; to?: string }) {
    return this.http.get<{
      master: any | null;
      opening: number;
      transactions: any[];
      closing: number;
      from?: string;
      to?:   string;
    }>(`${this.url}/customer-ledger`, { params: this.params(f) });
  }

  ledgerAccountOptions(q?: string) {
    return this.http.get<any[]>(`${this.url}/ledger-account-options`, { params: this.params({ q }) });
  }
}
