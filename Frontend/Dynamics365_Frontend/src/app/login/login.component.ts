import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  returnUrl: string = '';
  
  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    // Récupère l'URL de redirection après login
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '';
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.errorMessage = null;
    
    if (this.loginForm.valid) {
      this.isLoading = true;
      
      const { email, password } = this.loginForm.value;
  
      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('Authentification réussie', response);
          this.isLoading = false;
          
          
          let redirectPath = '';
          
          if (this.returnUrl) {
           
            redirectPath = this.returnUrl;
          } else {
            // Redirection par défaut selon le rôle
            redirectPath = this.authService.getIsAdmin() ? '/dashboard' : '/home';
          }

         
          if (this.authService.getIsAdmin() && redirectPath.startsWith('/home')) {
            redirectPath = '/dashboard';
          } else if (!this.authService.getIsAdmin() && redirectPath.startsWith('/dashboard')) {
            redirectPath = '/home';
          }

          this.router.navigateByUrl(redirectPath)
            .catch(() => this.router.navigate(['/']));
        },
        error: (error) => {
          console.error('Erreur d\'authentification', error);
          this.isLoading = false;
          this.authService.logout();
          
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