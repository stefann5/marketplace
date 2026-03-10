import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/product.model';
import { Review, ReviewRequest } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly apiUrl = `${environment.apiUrl}/api/reviews`;

  constructor(private http: HttpClient) {}

  getReviews(productId: string, page: number, size: number): Observable<Page<Review>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Review>>(`${this.apiUrl}/${productId}`, { params });
  }

  getMyReview(productId: string): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/${productId}/mine`);
  }

  createReview(productId: string, request: ReviewRequest): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/${productId}`, request);
  }

  updateReview(reviewId: string, request: ReviewRequest): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/${reviewId}`, request);
  }
}
