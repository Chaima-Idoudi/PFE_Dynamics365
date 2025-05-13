import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
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
    
    // Vérification et logging pour le débogage
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

 }