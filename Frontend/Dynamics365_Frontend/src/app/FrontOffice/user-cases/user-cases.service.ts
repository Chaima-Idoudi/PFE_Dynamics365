import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, take, tap, throwError } from 'rxjs';
import { AuthService } from '../../login/services/auth.service';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { NotificationService } from '../../Notifications/notification.service';

@Injectable({
  providedIn: 'root'
})
export class UserCases {
  private casesUrl = 'https://localhost:44326/api/dynamics/employees/mycases';
  private updateCaseStatusUrl = 'https://localhost:44326/api/dynamics/employees/updatecasestage';

  // BehaviorSubject to store and share cases
  private casesSubject = new BehaviorSubject<Case[]>([]);
  public cases$ = this.casesSubject.asObservable();
 
  // BehaviorSubject for selected case
  private selectedCaseSubject = new BehaviorSubject<Case | null>(null);
  public selectedCase$ = this.selectedCaseSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    // Subscribe to real-time ticket assignments
    this.notificationService.ticketAssignment$.subscribe(newTicket => {
      if (newTicket) {
        this.handleNewTicketAssignment(newTicket);
      }
    });
    
    // Subscribe to real-time ticket unassignments
    this.notificationService.ticketUnassignment$.subscribe(unassignmentData => {
      if (unassignmentData) {
        this.handleTicketUnassignment(unassignmentData);
      }
    });
  }

  // Handle new ticket assignment from SignalR
  private handleNewTicketAssignment(newTicket: Case): void {
    console.log('Handling new ticket assignment:', newTicket);
    const currentCases = this.casesSubject.value;
    
    // Check if the ticket already exists
    const existingTicketIndex = currentCases.findIndex(c => c.IncidentId === newTicket.IncidentId);
    
    if (existingTicketIndex >= 0) {
      // Update existing ticket
      const updatedCases = [...currentCases];
      updatedCases[existingTicketIndex] = newTicket;
      this.casesSubject.next(updatedCases);
      console.log('Updated existing ticket in case list');
    } else {
      // Add new ticket
      this.casesSubject.next([...currentCases, newTicket]);
      console.log('Added new ticket to case list');
    }
  }

  // Handle ticket unassignment from SignalR
  private handleTicketUnassignment(unassignmentData: {ticketId: string, ticketTitle: string}): void {
    console.log('Handling ticket unassignment:', unassignmentData);
    const currentCases = this.casesSubject.value;
    
    // Remove the unassigned ticket from the list
    const updatedCases = currentCases.filter(c => c.IncidentId !== unassignmentData.ticketId);
    
    // If the list changed (ticket was found and removed)
    if (updatedCases.length !== currentCases.length) {
      this.casesSubject.next(updatedCases);
      console.log('Removed unassigned ticket from case list');
      
      // If the unassigned ticket was the selected one, clear the selection
      const selectedCase = this.selectedCaseSubject.value;
      if (selectedCase && selectedCase.IncidentId === unassignmentData.ticketId) {
        this.selectedCaseSubject.next(null);
        console.log('Cleared selected case as it was unassigned');
      }
    }
  }

  getMyCases(): Observable<Case[]> {
    const userId = this.authService.getUserId();
    if (!userId) return throwError(() => new Error('Non authentifié'));
  
    const headers = new HttpHeaders().set('Authorization', userId);
    return this.http.get<Case[]>(this.casesUrl, { headers }).pipe(
      tap(cases => {
        console.log('Cases loaded from API:', cases.length);
        // Store the cases in the subject
        this.casesSubject.next(cases);
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des cas:', error);
        return throwError(() => error);
      })
    );
  }
  
  setSelectedCase(caseItem: Case | null): void {
    console.log('Setting selected case:', caseItem?.Title || 'None');
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

    console.log('Updating case status:', { caseId, newStage });
    return this.http.post<string>(this.updateCaseStatusUrl, body, { headers }).pipe(
      tap(response => {
        console.log('Status update response:', response);
        // Update the local case data after successful status update
        const currentCases = this.casesSubject.value;
        const updatedCases = currentCases.map(c => {
          if (c.IncidentId === caseId) {
            return { ...c, Stage: newStage };
          }
          return c;
        });
        this.casesSubject.next(updatedCases);
      }),
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