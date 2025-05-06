import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AuthService } from '../../login/services/auth.service'; // pour getUserId()

export interface UserProfile {
  postalCode: any;
  FullName?: string;
  Email: string;
  IsConnected: boolean;
  UserId: string;
  IsTechnician: boolean;
  isAdmin: boolean;
  Address: string;
  Country: string;
  City: string;
  CodePostal: string;
  PhoneNumber: string;
  Photo: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private profileUrl = 'https://localhost:44326/api/dynamics/me';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getUserProfile(): Observable<UserProfile> {
    const userId = this.authService.getUserId();
    if (!userId) return throwError(() => new Error('Non authentifié'));
  
    const headers = new HttpHeaders().set('Authorization', userId);
    return this.http.get<UserProfile>(this.profileUrl, { headers }).pipe(
      tap(response => console.log('Réponse du serveur:', response)),
      catchError(error => {
        console.error('Erreur lors de la récupération du profil:', error);
        return throwError(() => error);
      })
    );
  }
}
