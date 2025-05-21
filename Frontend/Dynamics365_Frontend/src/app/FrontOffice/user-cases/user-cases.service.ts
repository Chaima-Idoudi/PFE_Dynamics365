import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError } from 'rxjs';
import { AuthService } from '../../login/services/auth.service';
import { Case } from '../../BackOffice/case-details/Models/case.model';


@Injectable({
  providedIn: 'root'
})
export class UserCases {
  private casesUrl = 'https://localhost:44326/api/dynamics/employees/mycases';
  private updateCaseStatusUrl = 'https://localhost:44326/api/dynamics/employees/updatecasestage'

  constructor(private http: HttpClient, private authService: AuthService) {}

  private selectedCaseSubject = new BehaviorSubject<Case | null>(null);
  getMyCases(): Observable<Case[]> {
    const userId = this.authService.getUserId();
    if (!userId) return throwError(() => new Error('Non authentifié'));
  
    const headers = new HttpHeaders().set('Authorization', userId);
    return this.http.get<Case[]>(this.casesUrl, { headers }).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des cas:', error);
        return throwError(() => error);
      })
    );
  }
  
  setSelectedCase(caseItem: Case | null): void {
    this.selectedCaseSubject.next(caseItem);
  }

  getSelectedCase(): Observable<Case | null> {
    return this.selectedCaseSubject.asObservable();
  }

  updateCaseStatus(caseId: string, newStage: string): Observable<string> {
      const userId = this.authService.getUserId();
      if (!userId) return throwError(() => new Error('Non authentifié'));

      const headers = new HttpHeaders().set('Authorization', userId);
      const body = { CaseId: caseId, NewStage: newStage };

      return this.http.post<string>(this.updateCaseStatusUrl, body, { headers }).pipe(
          catchError(error => {
              console.error('Erreur lors de la mise à jour du stage:', {
                  caseId,
                  newStage,
                  error
              });
              return throwError(() => error);
          })
      );
  }
 
}