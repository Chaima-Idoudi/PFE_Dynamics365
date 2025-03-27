import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of, tap, throwError } from 'rxjs';

interface AuthRequest {
  email: string;
  password: string;
}
interface LogoutResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://localhost:44326/api/dynamics/authenticate'; // Remplace avec ton URL

  private readonly USER_ID_KEY = 'user_id';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ UserId: string }> {
    const body: AuthRequest = { email, password };
    return this.http.post<{ UserId: string }>(this.apiUrl, body).pipe(
      tap(response => {
        if (response?.UserId) {
          this.setUserId(response.UserId);
        }
      })
    );
  }

  logout(): Observable<LogoutResponse> {
    const userId = this.getUserId();
    
    if (!userId) {
      this.clearUserId();
      return of({ message: 'Already logged out' });
    }

    const headers = new HttpHeaders().set('Authorization', userId);

    return this.http.delete<LogoutResponse>(`${this.apiUrl.replace('/authenticate', '')}/logout`, { headers }).pipe(
      catchError(error => {
        this.clearUserId();
        return throwError(() => error);
      })
    );
  }

  private setUserId(userId: string): void {
    localStorage.setItem(this.USER_ID_KEY, userId);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  clearUserId(): void {
    localStorage.removeItem(this.USER_ID_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getUserId();
  }
}
