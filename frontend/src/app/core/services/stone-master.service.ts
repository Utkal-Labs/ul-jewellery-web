import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface StoneMasterDto {
  stoneName1: string;
  stoneName:  string;
  unit: number; // 1=Ct. 2=Gm. 3=Rt. 4=Cn.
}

@Injectable({ providedIn: 'root' })
export class StoneMasterService {
  private url = `${environment.apiUrl}/stone-master`;
  constructor(private http: HttpClient) {}

  getStoneCodes() {
    return this.http.get<string[]>(`${this.url}/stone-codes`);
  }

  getSubCodes(stoneCode: string) {
    return this.http.get<string[]>(`${this.url}/sub-codes`, { params: { stoneCode } });
  }

  getStoneDetail(stoneCode: string, subCode: string) {
    return this.http.get<StoneMasterDto | null>(this.url, { params: { stoneCode, subCode } });
  }
}
