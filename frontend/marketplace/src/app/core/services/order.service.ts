import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/api/orders`;

  constructor(private http: HttpClient) {}

  checkout(): Observable<Order[]> {
    return this.http.post<Order[]>(`${this.apiUrl}/checkout`, {});
  }

  getBuyerOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  getSellerOrders(status?: string): Observable<Order[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Order[]>(`${this.apiUrl}/seller`, { params });
  }

  fulfillOrder(orderId: string): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}/fulfill`, {});
  }
}
