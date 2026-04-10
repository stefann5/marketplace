import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SellerProfile, SellerTheme, ThemeRequest, UpdateProfileRequest } from '../models/seller.model';

@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly apiUrl = `${environment.apiUrl}/api/sellers`;
  private activeSellersCache$?: Observable<SellerProfile[]>;
  private tenantMapCache$?: Observable<Map<string, SellerProfile>>;

  constructor(private http: HttpClient) {}

  getAllCached(): Observable<SellerProfile[]> {
    if (!this.activeSellersCache$) {
      this.activeSellersCache$ = this.http.get<SellerProfile[]>(this.apiUrl).pipe(shareReplay(1));
    }
    return this.activeSellersCache$;
  }

  getTenantMap(): Observable<Map<string, SellerProfile>> {
    if (!this.tenantMapCache$) {
      this.tenantMapCache$ = this.getAllCached().pipe(
        map(sellers => {
          const m = new Map<string, SellerProfile>();
          sellers.forEach(s => m.set(s.tenantId, s));
          return m;
        }),
        shareReplay(1)
      );
    }
    return this.tenantMapCache$;
  }

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

  getAll(): Observable<SellerProfile[]> {
    return this.http.get<SellerProfile[]>(this.apiUrl);
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
