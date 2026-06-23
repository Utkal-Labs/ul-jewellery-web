import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface StonePurchaseRegisterFilter {
  from?:       string;
  to?:         string;
  dealerCode?: string;
  trancode?:   string;
  /** Exact-match voucher number — takes precedence over the From/To range. */
  vounum?:     string;
  vounumFrom?: string;
  vounumTo?:   string;
  minAmount?:  number;
}

@Injectable({ providedIn: 'root' })
export class StonePurchaseService {
  private url = `${environment.apiUrl}/stone-purchase`;

  constructor(private http: HttpClient) {}

  getAll()                   { return this.http.get<any[]>(this.url); }
  getJournal(v: string)      { return this.http.get<any>(`${this.url}/${v}/journal`); }
  getPrintData(v: string)    { return this.http.get<any>(`${this.url}/${v}/print-data`); }
  getRegister(f: StonePurchaseRegisterFilter) {
    let params = new HttpParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<any[]>(`${this.url}/register`, { params });
  }
  getOne(v: string)          { return this.http.get<any>(`${this.url}/${v}`); }
  getFirst()                 { return this.http.get<any>(`${this.url}/first`); }
  getLast()                  { return this.http.get<any>(`${this.url}/last`); }
  getNext(v: string)         { return this.http.get<any>(`${this.url}/next/${v}`); }
  getPrev(v: string)         { return this.http.get<any>(`${this.url}/prev/${v}`); }
  nextVounum()               { return this.http.get<{ vounum: string }>(`${this.url}/next-vounum`); }
  create(dto: any)           { return this.http.post<any>(this.url, dto); }
  update(v: string, dto: any){ return this.http.put<any>(`${this.url}/${v}`, dto); }
  delete(v: string)          { return this.http.delete<any>(`${this.url}/${v}`); }
  cancelVoucher(v: string)   { return this.http.patch<any>(`${this.url}/${v}/cancel`, {}); }
}
