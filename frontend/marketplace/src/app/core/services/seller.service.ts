import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SellerProfile, SellerTheme, ThemeRequest, UpdateProfileRequest } from '../models/seller.model';

@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly apiUrl = `${environment.apiUrl}/api/sellers`;

  constructor(private http: HttpClient) {}

  register(data: FormData): Observable<SellerProfile> {
    return this.http.post<SellerProfile>(`${this.apiUrl}/register`, data);
  }

  registerPublic(email: string, data: FormData): Observable<SellerProfile> {
    return this.http.post<SellerProfile>(`${this.apiUrl}/register-public?email=${encodeURIComponent(email)}`, data);
  }

  getMyProfile(): Observable<SellerProfile> {
    return this.http.get<SellerProfile>(`${this.apiUrl}/me`);
  }

  updateProfile(request: UpdateProfileRequest): Observable<SellerProfile> {
    return this.http.put<SellerProfile>(`${this.apiUrl}/me`, request);
  }

  updateLogo(file: File): Observable<SellerProfile> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<SellerProfile>(`${this.apiUrl}/me/logo`, formData);
  }

  getBySlug(slug: string): Observable<SellerProfile> {
    return this.http.get<SellerProfile>(`${this.apiUrl}/${slug}`);
  }

  getTheme(): Observable<SellerTheme> {
    return this.http.get<SellerTheme>(`${this.apiUrl}/theme`);
  }

  updateTheme(request: ThemeRequest): Observable<SellerTheme> {
    return this.http.put<SellerTheme>(`${this.apiUrl}/theme`, request);
  }
}
