import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface AuthRequest {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://localhost:44326/api/dynamics/authenticate'; // Remplace avec ton URL

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    const body: AuthRequest = { email, password };
    return this.http.post<any>(this.apiUrl, body);
  }
}
