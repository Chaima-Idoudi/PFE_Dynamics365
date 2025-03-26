import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AcceuilComponent } from './acceuil/acceuil.component';

export const routes: Routes = [
    //{ path: 'first-component', component: FirstComponent },
    {path: 'login', component: LoginComponent},
    {path: '', component: AcceuilComponent}
];
