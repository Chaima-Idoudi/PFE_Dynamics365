import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../login/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.logout().subscribe({
      next: () => {
        this.handleLogoutSuccess();
      },
      error: (err) => {
        this.handleLogoutError(err);
      }
    });
  }

  private handleLogoutSuccess(): void {
    this.isLoading = false;
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  private handleLogoutError(error: any): void {
    this.isLoading = false;
    this.errorMessage = 'Une erreur est survenue lors de la déconnexion';
    console.error('Logout error:', error);
    // On déconnecte quand même côté client
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }
}
