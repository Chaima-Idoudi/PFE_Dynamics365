import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { EmployeesService } from '../employees/employees.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
})
export class UserDetailsComponent {
  employeesService = inject(EmployeesService);
  selectedUser$ = this.employeesService.selectedUser$;
  closeDetails() {
    this.employeesService.setSelectedUser(null);
  }
}