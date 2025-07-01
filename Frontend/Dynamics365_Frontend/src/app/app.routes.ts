import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AcceuilComponent } from './acceuil/acceuil.component';
import { HomeComponent } from './FrontOffice/home/home.component';
import { DashboardComponent } from './BackOffice/dashboard/dashboard.component';
import { UserGuard } from './guards/user.guard';
import { AdminGuard } from './guards/admin.guard';
import { UnauthorizedComponent } from './BackOffice/unauthorized/unauthorized.component';
import { EmployeesComponent } from './BackOffice/employees/employees.component';
import { SubdashboardComponent } from './BackOffice/subdashboard/subdashboard.component';
import { TasksComponent } from './BackOffice/tasks/tasks.component';
import { CasesComponent } from './BackOffice/cases/cases.component';
import { ProfileComponent } from './BackOffice/profile/profile.component';
import { UserProfileComponent } from './FrontOffice/user-profile/user-profile.component';
import { UserCasesComponent } from './FrontOffice/user-cases/user-cases.component';
import { ChatComponent } from './Chat-System/chat/chat.component';




export const routes: Routes = [
    
    {path: 'login', component: LoginComponent},
    {path: '', component: AcceuilComponent},
    { 
        path: 'home', 
        component: HomeComponent,
        canActivate: [UserGuard] , // Any authenticated user can access
        data: { requiresRegularUser: true },
        children: [
          {path: 'userProfile', component: UserProfileComponent},
          {path: 'myCases', component: UserCasesComponent},
          {path: 'chat', component: ChatComponent}
         
        ]
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
          { path: 'cases', component: CasesComponent},
          { path: 'chat', component: ChatComponent}
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
