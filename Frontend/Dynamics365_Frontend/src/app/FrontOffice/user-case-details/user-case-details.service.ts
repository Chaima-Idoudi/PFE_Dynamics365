import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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

  // New method for uploading multiple images
  uploadCaseImages(caseId: string, imageFiles: File[]): Observable<any> {
  const userId = this.authService.getUserId();
  if (!userId) return throwError(() => new Error('Non authentifié'));

  const formData = new FormData();
  formData.append('caseId', caseId);
  
  // Add each image file to the form data
  imageFiles.forEach((file, index) => {
    formData.append(`file${index}`, file, file.name);
  });

  const headers = new HttpHeaders().set('Authorization', userId);

  return this.http.post<string>(`${this.baseUrl}/updateimages`, formData, { headers }).pipe(
    switchMap(() => {
      // After successful upload, get the updated case details
      return this.getCaseDetails(caseId);
    }),
    catchError(error => {
      console.error('Erreur lors de l\'ajout des images:', error);
      return throwError(() => error);
    })
  );
}

// Ajouter une méthode pour récupérer les détails d'un cas
getCaseDetails(caseId: string): Observable<any> {
  const userId = this.authService.getUserId();
  if (!userId) return throwError(() => new Error('Non authentifié'));

  const headers = new HttpHeaders().set('Authorization', userId);
  return this.http.get<any>(`${this.baseUrl}/case/${caseId}`, { headers }).pipe(
    catchError(error => {
      console.error('Erreur lors de la récupération des détails du cas:', error);
      return throwError(() => error);
    })
  );
}


deleteCaseImage(caseId: string, fileName: string): Observable<any> {
  const userId = this.authService.getUserId();
  if (!userId) return throwError(() => new Error('Non authentifié'));

  const headers = new HttpHeaders().set('Authorization', userId);
  
  return this.http.delete<any>(`${this.baseUrl}/deleteimage/${caseId}`, { 
    headers,
    params: { fileName }
  }).pipe(
    switchMap(() => {
      // After successful deletion, get the updated case details
      return this.getCaseDetails(caseId);
    }),
    catchError(error => {
      console.error('Erreur lors de la suppression de l\'image:', error);
      return throwError(() => error);
    })
  );
}
}