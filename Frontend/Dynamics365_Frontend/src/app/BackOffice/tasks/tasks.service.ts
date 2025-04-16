import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../login/services/auth.service';
@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private apiUrl = "https://localhost:44326/api/dynamics/activities";

  constructor(private http: HttpClient, private authService: AuthService) { }

  getActivities(): Observable<any[]> {
    const userId = this.authService.getUserId();
    const headers = new HttpHeaders({
      Authorization: userId || '',
    });
    return this.http.get<any[]>(this.apiUrl, { headers });
  }
}