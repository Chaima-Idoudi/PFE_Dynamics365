import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { EmployeesService } from '../employees/employees.service';
import { faTicketAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { CasesService } from '../cases/cases.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
})
export class UserDetailsComponent {
  employeesService = inject(EmployeesService);
  casesService = inject(CasesService);
  selectedUser$ = this.employeesService.selectedUser$;
  assignedCases: any[] = [];
  isLoadingCases = false;
  // Icônes
  icons = {
    ticket: faTicketAlt,
    spinner: faSpinner
  };
  ngOnInit() {
    this.selectedUser$.subscribe(user => {
      if (user) {
        this.loadAssignedCases(user.UserId);
      }
    });
  }

  closeDetails() {
    this.employeesService.setSelectedUser(null);
  }

  loadAssignedCases(userId: string) {
    this.isLoadingCases = true;
    this.casesService.getCasesByOwner(userId).subscribe({
      next: (cases) => {
        this.assignedCases = cases;
        this.isLoadingCases = false;
      },
      error: (error) => {
        console.error('Error loading assigned cases:', error);
        this.isLoadingCases = false;
      }
    });
  }
}