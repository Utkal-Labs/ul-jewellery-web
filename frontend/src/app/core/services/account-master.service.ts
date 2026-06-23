import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PaymentAccount {
  glCode:   number;
  accName:  string;
  accGroup: number; // 1=Bank/Cheque (CHNO required), 2=Cash
}

@Injectable({ providedIn: 'root' })
export class AccountMasterService {
  private url = `${environment.apiUrl}/account-master`;
  constructor(private http: HttpClient) {}
  getPaymentAccounts() { return this.http.get<PaymentAccount[]>(`${this.url}/payment-accounts`); }
}
