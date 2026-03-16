import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, Product, ProductRequest } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) {}

  getAll(page: number, size: number): Observable<Page<Product>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Product>>(this.apiUrl, { params });
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getSellerProducts(page: number, size: number): Observable<Page<Product>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Product>>(`${this.apiUrl}/seller`, { params });
  }

  create(request: ProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, request);
  }

  update(id: string, request: ProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadImages(id: string, files: File[]): Observable<Product> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post<Product>(`${this.apiUrl}/${id}/images`, formData);
  }

  deleteImage(productId: string, imageId: string): Observable<Product> {
    return this.http.delete<Product>(`${this.apiUrl}/${productId}/images/${imageId}`);
  }

  search(params: {
    name?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    tenantId?: string;
    sortBy?: string;
    sortDirection?: string;
    page: number;
    size: number;
  }): Observable<Page<Product>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('size', params.size);
    if (params.name) httpParams = httpParams.set('name', params.name);
    if (params.categoryId != null) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.minPrice != null) httpParams = httpParams.set('minPrice', params.minPrice);
    if (params.maxPrice != null) httpParams = httpParams.set('maxPrice', params.maxPrice);
    if (params.minRating != null) httpParams = httpParams.set('minRating', params.minRating);
    if (params.tenantId) httpParams = httpParams.set('tenantId', params.tenantId);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http.get<Page<Product>>(this.apiUrl, { params: httpParams });
  }
}
