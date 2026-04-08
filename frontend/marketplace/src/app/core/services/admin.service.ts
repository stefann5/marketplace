import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SellerProfile } from '../models/seller.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/api/admin/sellers`;

  constructor(private http: HttpClient) {}

  listSellers(status?: string): Observable<SellerProfile[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<SellerProfile[]>(this.apiUrl, { params });
  }

  getSellerDetail(id: string): Observable<SellerProfile> {
    return this.http.get<SellerProfile>(`${this.apiUrl}/${id}`);
  }

  approveSeller(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectSeller(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/reject`, {});
  }

  suspendSeller(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/suspend`, {});
  }
}
