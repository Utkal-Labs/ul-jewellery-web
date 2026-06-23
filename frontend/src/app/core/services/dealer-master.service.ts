import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DealerMasterService {
  private url = `${environment.apiUrl}/dealer-master`;
  constructor(private http: HttpClient) {}
  getAll(search?: string) {
    return this.http.get<any[]>(this.url, search ? { params: { search } } : {});
  }
  getByCode(code: string) { return this.http.get<any>(`${this.url}/${code}`); }
}
