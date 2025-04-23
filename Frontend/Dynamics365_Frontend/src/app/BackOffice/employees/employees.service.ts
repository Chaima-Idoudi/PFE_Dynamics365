import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from '../../login/services/auth.service';

export interface User {
  FullName: string;
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
export class EmployeesService {
  private apiUrl = 'https://localhost:44326/api/dynamics/employees';
  private selectedUserSource = new BehaviorSubject<User | null>(null);
  
  selectedUser$ = this.selectedUserSource.asObservable();

  selectedUser = this.selectedUserSource; 
  constructor(private http: HttpClient, private authService: AuthService) {}

  getUsers(): Observable<User[]> {
    const userId = this.authService.getUserId();
    const headers = new HttpHeaders({
      Authorization: userId || '',
    });
    return this.http.get<User[]>(this.apiUrl, { headers });
  }

  setSelectedUser(user: User | null) {
    this.selectedUserSource.next(user);
  }
}