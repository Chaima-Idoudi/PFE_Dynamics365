import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../login/services/auth.service';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | boolean | UrlTree {
   
    if (!this.authService.isAuthenticated()) {
      return this.redirectToLogin();
    }

   
    return this.authService.verifySession().pipe(
      map(response => {
        if (response.IsValid && !response.IsAdmin) {
          return true; 
        }
        return this.redirectToLogin();
      })
    );
  }

  private redirectToLogin(): UrlTree {
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }
}