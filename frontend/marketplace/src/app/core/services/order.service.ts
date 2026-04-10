import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models/order.model';
import { Page } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/api/orders`;

  constructor(private http: HttpClient) {}

  checkout(): Observable<Order[]> {
    return this.http.post<Order[]>(`${this.apiUrl}/checkout`, {});
  }

  getBuyerOrders(page: number = 0, size: number = 10): Observable<Page<Order>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Order>>(this.apiUrl, { params });
  }

  getSellerOrders(status?: string, page: number = 0, size: number = 10): Observable<Page<Order>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    return this.http.get<Page<Order>>(`${this.apiUrl}/seller`, { params });
  }

  fulfillOrder(orderId: string): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}/fulfill`, {});
  }
}
