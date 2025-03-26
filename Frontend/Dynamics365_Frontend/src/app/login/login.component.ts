import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

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
  isLoading = false; // Nouvelle propriété pour gérer l'état de chargement
  errorMessage: string | null = null; // Pour afficher les messages d'erreur

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    // Réinitialiser le message d'erreur
    this.errorMessage = null;
    
    if (this.loginForm.valid) {
      this.isLoading = true; // Activer l'indicateur de chargement
      
      const email = this.loginForm.get('email')?.value ?? '';
      const password = this.loginForm.get('password')?.value ?? '';

      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('Authentification réussie', response);
          this.isLoading = false;
          // Redirection ou autre traitement après connexion réussie
        },
        error: (error) => {
          console.error('Erreur d authentification', error);
          this.isLoading = false;
          // Gestion des erreurs spécifiques
          if (error.status === 401) {
            this.errorMessage = 'Email ou mot de passe incorrect';
          } else {
            this.errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
          }
        },
        complete: () => {
          this.isLoading = false; // Au cas où
        }
      });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs de validation
      this.loginForm.markAllAsTouched();
    }
  }

  // Getters pratiques pour accéder aux contrôles du formulaire dans le template
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}