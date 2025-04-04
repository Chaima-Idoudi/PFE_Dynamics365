import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../login/services/auth.service';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.verifySession().pipe(
      map(response => {
        if (response.IsValid && response.IsAdmin) {
          return true;
        }
        return this.router.createUrlTree(['/login'], {
          queryParams: { returnUrl: this.router.url }
        });
      })
    );
  }
}