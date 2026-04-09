import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RevenueSummary,
  RevenueChart,
  OrderSummary,
  TopProduct,
  ProductView,
  SearchTerm,
  TopCategory
} from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/api/analytics`;

  constructor(private http: HttpClient) {}

  getRevenueSummary(): Observable<RevenueSummary> {
    return this.http.get<RevenueSummary>(`${this.apiUrl}/revenue`);
  }

  getRevenueChart(period: string = 'month'): Observable<RevenueChart> {
    const params = new HttpParams().set('period', period);
    return this.http.get<RevenueChart>(`${this.apiUrl}/revenue/chart`, { params });
  }

  getOrderSummary(): Observable<OrderSummary> {
    return this.http.get<OrderSummary>(`${this.apiUrl}/orders`);
  }

  getTopProducts(sortBy: string = 'revenue', limit: number = 10): Observable<TopProduct[]> {
    const params = new HttpParams().set('sortBy', sortBy).set('limit', limit.toString());
    return this.http.get<TopProduct[]>(`${this.apiUrl}/products/top`, { params });
  }

  getProductViews(): Observable<ProductView[]> {
    return this.http.get<ProductView[]>(`${this.apiUrl}/products/views`);
  }

  getSearchTerms(): Observable<SearchTerm[]> {
    return this.http.get<SearchTerm[]>(`${this.apiUrl}/customers/search-terms`);
  }

  getTopCategories(limit: number = 5): Observable<TopCategory[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<TopCategory[]>(`${this.apiUrl}/categories/top`, { params });
  }
}
