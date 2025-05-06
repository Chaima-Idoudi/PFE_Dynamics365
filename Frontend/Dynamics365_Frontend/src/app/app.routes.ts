import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AcceuilComponent } from './acceuil/acceuil.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './BackOffice/dashboard/dashboard.component';
import { UserGuard } from './guards/user.guard';
import { AdminGuard } from './guards/admin.guard';
import { UnauthorizedComponent } from './BackOffice/unauthorized/unauthorized.component';
import { EmployeesComponent } from './BackOffice/employees/employees.component';
import { SubdashboardComponent } from './BackOffice/subdashboard/subdashboard.component';
import { TasksComponent } from './BackOffice/tasks/tasks.component';
import { CasesComponent } from './BackOffice/cases/cases.component';
import { ProfileComponent } from './BackOffice/profile/profile.component';



export const routes: Routes = [
    
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
        data: { requiresAdmin: true },
        children: [
          {path: 'profile', component: ProfileComponent},
          { path: 'employees', component: EmployeesComponent }, 
          { path: 'subdashbord', component: SubdashboardComponent },
          { path: 'tasks', component: TasksComponent },  
          { path: 'cases', component: CasesComponent}
        ]
      },

       {
        path: 'employees',
        component: EmployeesComponent,
        canActivate: [AdminGuard],
        data: {requiresAdmin: true}
      }, 

      { path: 'unauthorized', component: UnauthorizedComponent },
      { path: '**', redirectTo: '' }
];
