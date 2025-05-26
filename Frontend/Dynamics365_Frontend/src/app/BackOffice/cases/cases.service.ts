import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { AuthService } from '../../login/services/auth.service';
import { Case } from '../case-details/Models/case.model';

@Injectable({
  providedIn: 'root'
})
export class CasesService {
  private apiUrl = "https://localhost:44326/api/dynamics/cases";
  private selectedCaseSubject = new BehaviorSubject<Case | null>(null);
 

  constructor(private http: HttpClient, private authService: AuthService) { }

  getCases(): Observable<Case[]> {
    const userId = this.authService.getUserId();
    const headers = new HttpHeaders({
      Authorization: userId || '',
    });
    return this.http.get<Case[]>(this.apiUrl, { headers });
  }

  
  setSelectedCase(caseItem: Case | null): void {
    this.selectedCaseSubject.next(caseItem);
  }

  getSelectedCase(): Observable<Case | null> {
    return this.selectedCaseSubject.asObservable();
  }

  getCurrentCaseValue(): Case | null {
    const currentCase = this.selectedCaseSubject.value;
    
    
    if (currentCase) {
      console.log('Case récupérée:', currentCase);
      console.log('CaseId disponible:', currentCase.IncidentId);
    } else {
      console.log('Aucune case sélectionnée actuellement');
    }
    
    return currentCase;
  }

  updateCaseOwner(caseId: string, newOwner: string): void {
    const currentCase = this.selectedCaseSubject.value;
    if (currentCase && currentCase.IncidentId === caseId) {
      this.selectedCaseSubject.next({
        ...currentCase,
        Owner: newOwner
      });
    }
  }

  getCasesByOwner(ownerId: string): Observable<any[]> {
    const userId = this.authService.getUserId();
    const headers = new HttpHeaders({
      Authorization: userId || '',
    });
    return this.http.get<any[]>(`https://localhost:44326/api/dynamics/cases-by-owner/${ownerId}`, { headers });
  }

 updateDescription(caseId: string, newDescription: string): Observable<string> {
    const userId = this.authService.getUserId();
    console.log('Updating description - UserID:', userId, 'CaseID:', caseId); // <-- Ajoutez ce log
    
    if (!userId) return throwError(() => new Error('Non authentifié'));

    const headers = new HttpHeaders().set('Authorization', userId);
    const body = {
        CaseId: caseId,
        NewDescription: newDescription
    };

    console.log('Sending update request:', body); // <-- Ajoutez ce log

    return this.http.patch<string>(`https://localhost:44326/api/dynamics/updatedescription`, body, { headers }).pipe(
        tap(response => console.log('Update response:', response)), // <-- Ajoutez ce log
        catchError(error => {
            console.error('Erreur lors de la mise à jour de la description:', error);
            return throwError(() => error);
        })
    );
}

 }