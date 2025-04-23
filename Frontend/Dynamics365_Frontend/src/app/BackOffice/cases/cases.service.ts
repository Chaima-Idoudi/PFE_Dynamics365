import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../../login/services/auth.service';


@Injectable({
  providedIn: 'root'
})
export class CasesService {
  private apiUrl = "https://localhost:44326/api/dynamics/cases";
  private selectedCase = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private authService: AuthService) { }

  getCases(): Observable<any[]> {
    const userId = this.authService.getUserId();
    const headers = new HttpHeaders({
      Authorization: userId || '',
    });
    return this.http.get<any[]>(this.apiUrl, { headers });
  }

  setSelectedCase(caseItem: any) {
    this.selectedCase.next(caseItem);
  }

  getSelectedCase() {
    return this.selectedCase.asObservable();
  }
}