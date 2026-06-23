import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface GstStoneDto {
  hsnCode: number | null;
  cgst: number;
  sgst: number;
  igst: number;
}

@Injectable({ providedIn: 'root' })
export class GstStoneMasterService {
  private url = `${environment.apiUrl}/gst-stone-master`;
  constructor(private http: HttpClient) {}

  getGstDetail(stoneCode: string, subCode: string, voucherDate: string) {
    return this.http.get<GstStoneDto | null>(this.url, {
      params: { stoneCode, subCode, voucherDate },
    });
  }
}
