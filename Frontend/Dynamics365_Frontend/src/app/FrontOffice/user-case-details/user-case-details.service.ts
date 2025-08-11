import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../login/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserCaseDetailsService {
  private baseUrl = 'https://localhost:44326/api/dynamics/employees';
  
  constructor(private http: HttpClient, private authService: AuthService) {}

  updateNote(caseId: string, newNote: string): Observable<string> {
    const userId = this.authService.getUserId();
    if (!userId) return throwError(() => new Error('Non authentifié'));

    const headers = new HttpHeaders().set('Authorization', userId);
    const body = {
      CaseId: caseId,
      NewNote: newNote
    };

    return this.http.patch<string>(`${this.baseUrl}/updatenote`, body, { headers }).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour de la note:', error);
        return throwError(() => error);
      })
    );
  }

  uploadCaseImage(caseId: string, imageFile: File): Observable<string> {
    const userId = this.authService.getUserId();
    if (!userId) return throwError(() => new Error('Non authentifié'));

    const formData = new FormData();
    formData.append('caseId', caseId);
    formData.append('image', imageFile);

    const headers = new HttpHeaders().set('Authorization', userId);

    return this.http.post<string>(`${this.baseUrl}/updateimage`, formData, { headers }).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour de l\'image:', error);
        return throwError(() => error);
      })
    );
  }
}