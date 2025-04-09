import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../login/services/auth.service'; 

export interface User {
  FullName: string;
  Email: string;
  IsConnected: boolean;
  userId: string;
}

@Injectable()
export class EmployeesService {
  private apiUrl = 'https://localhost:44326/api/dynamics/users';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getUsers(): Observable<User[]> {
    const userId = this.authService.getUserId();

    const headers = new HttpHeaders({
      Authorization: userId || '',
    });

    return this.http.get<User[]>(this.apiUrl, { headers });
  }
}
 


