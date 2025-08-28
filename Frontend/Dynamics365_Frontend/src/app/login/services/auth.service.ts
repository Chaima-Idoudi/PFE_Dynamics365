import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, of, tap, throwError } from 'rxjs';

interface AuthRequest {
  email: string;
  password: string;
}

interface LogoutResponse {
  IsSuccess: boolean;
  Message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://localhost:44326/api/dynamics/authenticate'; 
  private readonly USER_ID_KEY = 'user_id';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ UserId: string; IsAdmin: boolean, FullName: string }> {
    const body: AuthRequest = { email, password };
    return this.http.post<{ UserId: string; IsAdmin: boolean, FullName: string }>(this.apiUrl, body).pipe(
      tap(response => {
        if (response?.UserId) {
          this.setUserId(response.UserId);
          this.setIsAdmin(response.IsAdmin);
          this.setFullName(response.FullName); 
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.clearUserId();
        this.clearIsAdmin();
        this.clearFullName();
        
        // Créer un objet d'erreur personnalisé avec un message spécifique
        let errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
        
        if (error.status === 400 && error.error) {
          // Si c'est une erreur 400 (Bad Request), utiliser le message du serveur
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.Message) {
            errorMessage = error.error.Message;
          }
        } else if (error.status === 401) {
          errorMessage = 'Email ou mot de passe incorrect';
        }
        
        // Créer une nouvelle erreur avec le message approprié
        const customError = new Error(errorMessage);
        (customError as any).status = error.status;
        (customError as any).originalError = error;
        
        return throwError(() => customError);
      })
    );
  }

  logout(): Observable<LogoutResponse> {
    const userId = this.getUserId();
    
    if (!userId) {
      this.clearUserId();
      return of({ IsSuccess: false, Message: 'Already logged out' });
    }
    
    console.log(userId);
    
    const headers = new HttpHeaders({
      Authorization: userId || '',
    });

    console.log('Headers:', headers); 

    return this.http.post<LogoutResponse>(
      `${this.apiUrl.replace('/authenticate', '')}/logout`,
      {}, 
      { headers } 
    ).pipe(
      tap(response => {
        console.log('Logout response:', response); 
        if (response.IsSuccess) {
          this.clearUserId();
          this.clearIsAdmin();
          this.clearFullName();
        }
      }),
      catchError(error => {
        console.error('Logout error:', error);
        this.clearUserId();
        this.clearIsAdmin();
        this.clearFullName();
        return throwError(() => error);
      })
    );
  }

  verifySession(): Observable<{ IsValid: boolean, IsAdmin?: boolean }> {
    const userId = this.getUserId();
    if (!userId) return of({ IsValid: false });

    const headers = new HttpHeaders().set('Authorization', userId);
    return this.http.get<{ IsValid: boolean, IsAdmin?: boolean }>(
      `${this.apiUrl}/verify-session`, 
      { headers }
    ).pipe(
      catchError(() => of({ IsValid: false }))
    );
  }

  private setFullName(FullName: string): void {
    localStorage.setItem('full_name', JSON.stringify(FullName));
  }
  
  getFullName(): string | null {
    return JSON.parse(localStorage.getItem('full_name') || '""');
  }
  
  clearFullName(): void {
    localStorage.removeItem('full_name');
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

  private setIsAdmin(isAdmin: boolean): void {
    localStorage.setItem('is_admin', JSON.stringify(isAdmin));
  }
  
  getIsAdmin(): boolean {
    return JSON.parse(localStorage.getItem('is_admin') || 'false');
  }
  
  clearIsAdmin(): void {
    localStorage.removeItem('is_admin');
  }

  isAuthenticated(): boolean {
    return !!this.getUserId();
  }
}