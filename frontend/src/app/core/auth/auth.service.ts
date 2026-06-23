import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'jwt_token';
  readonly currentUser = signal<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUser.set(payload);
      } catch {}
    }
  }

  login(username: string, password: string) {
    return this.http.post<{ access_token: string; user: any }>(
      `${environment.apiUrl}/auth/login`, { username, password }
    ).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        this.currentUser.set(res.user);
        this.router.navigate(['/']);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
