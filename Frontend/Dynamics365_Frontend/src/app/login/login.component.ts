import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Importez Router
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private router: Router // Injectez le Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.errorMessage = null;
    
    if (this.loginForm.valid) {
      this.isLoading = true;
      
      const email = this.loginForm.get('email')?.value ?? '';
      const password = this.loginForm.get('password')?.value ?? '';
  
      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('Authentification réussie', response);
          this.isLoading = false;
          
          // Vérification du statut admin via le service
          if (this.authService.getIsAdmin()) {
            this.router.navigate(['/dashboard']); // Redirection admin
          } else {
            this.router.navigate(['/home']); // Redirection utilisateur standard
          }
        },
        error: (error) => {
          console.error('Erreur d\'authentification', error);
          this.isLoading = false;
          
          if (error.status === 401) {
            this.errorMessage = 'Email ou mot de passe incorrect';
          } else {
            this.errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
          }
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}