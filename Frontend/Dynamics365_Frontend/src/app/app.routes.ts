import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AcceuilComponent } from './acceuil/acceuil.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './BackOffice/dashboard/dashboard.component';
import { UserGuard } from './guards/user.guard';
import { AdminGuard } from './guards/admin.guard';
import { UnauthorizedComponent } from './BackOffice/unauthorized/unauthorized.component';
import { EmployeeListComponent } from './BackOffice/employee-list/employee-list.component';

export const routes: Routes = [
    //{ path: 'first-component', component: FirstComponent },
    {path: 'login', component: LoginComponent},
    {path: '', component: AcceuilComponent},
    { 
        path: 'home', 
        component: HomeComponent,
        canActivate: [UserGuard] , // Any authenticated user can access
        data: { requiresRegularUser: true }
      },
      { 
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [AdminGuard] , // Only admin can access
        data: { requiresAdmin: true }
      },
      {
        path: 'employee',
        component: EmployeeListComponent,
        canActivate: [AdminGuard],
        data: {requiresAdmin: true}
      },

      { path: 'unauthorized', component: UnauthorizedComponent },
      { path: '**', redirectTo: '' }
];
