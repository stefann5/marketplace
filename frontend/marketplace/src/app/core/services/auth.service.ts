import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  sellerStatus: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => this.storeTokens(res))
    );
  }

  register(email: string, password: string, confirmPassword: string, role: string): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/register`, { email, password, confirmPassword, role });
  }

  refresh(): Observable<JwtResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<JwtResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(res => this.storeTokens(res))
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  storeTokens(res: JwtResponse): void {
    if (res.accessToken && res.refreshToken) {
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
    }
  }

  getUserRole(): string | null {
    return this.getClaim('role');
  }

  getTenantId(): string | null {
    return this.getClaim('tenantId');
  }

  private getClaim(key: string): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload[key] ?? null;
    } catch {
      return null;
    }
  }
}
