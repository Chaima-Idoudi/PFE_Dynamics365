// case-details.component.ts
import { Component, inject, EventEmitter, Output, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CasesService } from '../cases/cases.service';
import { 
  faArrowLeft, 
  faCalendar, 
  faUser, 
  faTicketAlt, 
  faFire, 
  faSignal, 
  faSnowflake, 
  faStarHalfAlt, 
  faTrashAlt, 
  faEdit, 
  faSyncAlt, 
  faCommentAlt, 
  faEnvelope,
  faPhone,
  faFax,
  faMapMarkerAlt,
  faCity,
  faInfoCircle,
  faLink,
  faExternalLinkAlt,
  faUserSlash,
  faHistory,
  faAlignLeft,
  faMap, 
  faCheckCircle, 
  faTimesCircle,
  faCalendarAlt,
  faFileAlt,
  faClock,
  faBolt,
  faShareAlt,
  faPrint,
  faArchive,
  faAddressCard,
  faLayerGroup,
  faCodeBranch,
  faUserShield,
  faIdBadge,
  faChartLine,
  faIndustry,
  faTasks,
  faStickyNote,
  faTag,
  faCog,
  faBuilding,
  faUserTie,
  faUserPlus,
  IconDefinition,
  faDownLong,
  faSpinner,
  faSearch,
  //faArrowRight,
  faArrowUpRightFromSquare,
  faNoteSticky,
} from '@fortawesome/free-solid-svg-icons';
import { EmployeesService } from '../employees/employees.service';
import { AssignCaseModel } from '../cases/Models/assign-case.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ClickOutsideDirective } from './click-outside.directive';
import { take } from 'rxjs';
import { AuthService } from '../../login/services/auth.service';
import { FormsModule } from '@angular/forms';
import { UserDetailsComponent } from "../user-details/user-details.component";
import { User } from '../employees/Models/user.model';
import { Case } from './Models/case.model';
@Component({
  selector: 'app-case-details',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, ClickOutsideDirective, FormsModule, UserDetailsComponent],
  templateUrl: './case-details.component.html',
  styleUrls: ['./case-details.component.css']
})
export class CaseDetailsComponent {
  @Output() casesUpdated = new EventEmitter<boolean>();
  @Input() caseDetails: Case | null = null;
  isEditingDescription = false;
  editedDescription = '';
  isSavingDescription = false;
  
  casesService = inject(CasesService);
  employeesService = inject(EmployeesService);
  http = inject(HttpClient);
  authService = inject(AuthService);
  
  selectedCase$ = this.casesService.getSelectedCase();
  showEmployeeDropdown = false;
  isLoadingEmployees = false;
  assignmentError: string | null = null;
  assignmentSuccess: string | null = null;
  employees: User[] = [];
  caseWasUpdated = false;
  isAssigning = false; 
  icons = {
    search: faSearch,
    spinner: faSpinner,
    
    // Navigation
    back: faArrowLeft,
    
    // Tickets
    ticket: faTicketAlt,
    calendar: faCalendar,
    calendarAlt: faCalendarAlt,
    
    // Priorités
    highPriority: faFire,
    mediumPriority: faSignal,
    lowPriority: faDownLong,
    medium: faStarHalfAlt,
    bolt: faBolt,
    
    // Actions
    edit: faEdit,
    delete: faTrashAlt,
    changeStatus: faSyncAlt,
    share: faShareAlt,
    print: faPrint,
    archive: faArchive,
    link: faLink,
    externalLink: faExternalLinkAlt,
    
    // Communication
    comment: faCommentAlt,
    email: faEnvelope,
    phone: faPhone,
    fax: faFax,
    
    // Statuts
    checkCircle: faCheckCircle,
    timesCircle: faTimesCircle,
    
    // Localisation
    location: faMapMarkerAlt,
    city: faCity,
    map: faMap,
    
    // Utilisateurs
    user: faUser,
    customer: faUserTie,
    owner: faUserShield,
    userSlash: faUserSlash,
    badge: faIdBadge,
    
    // Informations
    info: faInfoCircle,
    description: faAlignLeft,
    file: faFileAlt,
    clock: faClock,
    history: faHistory,
    addressCard: faAddressCard,
    
    // Nouveaux éléments du redesign
    caseType: faLayerGroup,
    origin: faCodeBranch,
    satisfaction: faChartLine,
    industry: faIndustry,
    activities: faTasks,
    notes: faStickyNote,
    tag: faTag,
    cog: faCog,
    building: faBuilding,

    //Assign 
    assign: faUserPlus,
    ownerDetails: faArrowUpRightFromSquare,
    note: faNoteSticky,
    
  };

  toggleEmployeeDropdown(): void {
    this.showEmployeeDropdown = !this.showEmployeeDropdown;
    
    if (this.showEmployeeDropdown) {
      // Reset search when opening dropdown
      this.employeeSearchTerm = '';
      this.filteredEmployees = [...this.employees];
      
      // Load employees if not already loaded
      if (!this.employees.length) {
        this.loadEmployees();
      }
    }
  }

  loadEmployees() {
    this.isLoadingEmployees = true;
    this.employeesService.getTechniciens().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.filteredEmployees = [...employees];
        this.isLoadingEmployees = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.isLoadingEmployees = false;
        this.assignmentError = 'Failed to load employees';
        setTimeout(() => this.assignmentError = null, 3000);
      }
    });
  }
 
  assignCaseToEmployee(employee: User) {
    this.isAssigning = true; // Active le spinner
    const userId = this.authService.getUserId();
    const headers = new HttpHeaders({
      Authorization: userId || '',
    });

    this.selectedCase$.pipe(take(1)).subscribe(selectedCase => {
      if (!selectedCase?.IncidentId) {
        console.error('Unexpected error: No case ID available');
        this.isAssigning = false;
        return;
      }
       
      const assignModel: AssignCaseModel = {
        CaseId: selectedCase.IncidentId,
        UserId: employee.UserId
      };

      this.http.post<string>(
        "https://localhost:44326/api/dynamics/assign-case", 
        assignModel, 
        { headers } 
      ).subscribe({
        next: (response) => {
          this.assignmentSuccess = response;
          setTimeout(() => this.assignmentSuccess = null, 3000);
          this.casesService.updateCaseOwner(selectedCase.IncidentId, employee.FullName);
          this.showEmployeeDropdown = false;
          this.caseWasUpdated = true;
          this.isAssigning = false; // Désactive le spinner
        },
        error: (error) => {
          console.error('Assignment error:', error);
          this.assignmentError = 'Échec de l\'assignation';
          setTimeout(() => this.assignmentError = null, 3000);
          this.isAssigning = false; // Désactive le spinner en cas d'erreur
          
          if (error.stage === 401) {
            this.assignmentError = 'Non autorisé - Veuillez vous reconnecter';
          } else if (error.stage === 400) {
            this.assignmentError = 'Requête invalide - Vérifiez les IDs';
          }
        }
      });
    });
  }
  
  closeDetails() {
    this.casesService.setSelectedCase(null);
    // Emit event to notify parent component if a case was updated
    if (this.caseWasUpdated) {
      this.casesUpdated.emit(true);
    }
  }

  getPriorityStyle(priority: string | undefined | null) {
    switch (priority) {
      case 'high':
        return {
          icon: this.icons.highPriority,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          text: 'hHigh'
        };
      case 'medium':
        return {
          icon: this.icons.medium,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          text: 'Medium'
        };
      case 'low':
        return {
          icon: this.icons.lowPriority,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          text: 'Low'
        };
      default:
        return {
          icon: this.icons.medium as IconDefinition, 
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          text: 'Non définie'
        };
    }
  }

  readonly STATUS = {
    PROPOSED: "proposed",
    ACTIVE: "active",
    RESOLVED: "resloved",
    CANCELLED: "cancelled"
  };
  
  getStatusStyle(status: string | undefined | null) {
    if (!status) return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800'
    };
    
    switch (status.toLowerCase()) {
      case this.STATUS.PROPOSED:
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800'
        };
      case this.STATUS.ACTIVE:
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800'
        };
      case this.STATUS.RESOLVED:
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800'
        };
      case this.STATUS.CANCELLED:
        return {
          bgColor: 'bg-indigo-100',
          textColor: 'text-indigo-800'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800'
        };
    }
  }

  // Helper method for status checks
  isStatus(status: string | undefined | null, statusValue: string): boolean {
    return status === statusValue;
  }

  // Helper method for status includes check
  isStatusIn(status: string | undefined | null, statusValues: string[]): boolean {
    return !!status && statusValues.includes(status);
  }

  getSatisfactionPercentage(satisfaction: string): number {
    const mapping: {[key: string]: number} = {
      'Very Dissatisfied': 20,
      'Dissatisfied': 40,
      'Neutral': 60,
      'Satisfied': 80,
      'Very Satisfied': 100
    };
    return mapping[satisfaction as keyof typeof mapping] || 0;
  }

  employeeSearchTerm: string = '';
  filteredEmployees: any[] = [];
  
  filterEmployees(): void {
    const term = this.employeeSearchTerm.toLowerCase().trim();
    
    if (!term) {
      // If search is empty, show all employees
      this.filteredEmployees = [...this.employees];
      return;
    }
    // Filter employees by name or email
    this.filteredEmployees = this.employees.filter(employee => 
      employee.FullName?.toLowerCase().includes(term) || 
      employee.Email?.toLowerCase().includes(term) 
    );
  }
  showUserDetails(employee: User) {
    // Empêche la propagation du clic pour ne pas déclencher assignCaseToEmployee
    event?.stopPropagation();
    
    // Définit l'utilisateur sélectionné via le service
    this.employeesService.setSelectedUser(employee);
  }

  showUserDetailsFromOwnerName(event: Event) {
    event.stopPropagation();
    
    this.selectedCase$.pipe(take(1)).subscribe(selectedCase => {
      if (!selectedCase?.Owner) return;
      
      // Si les employés ne sont pas encore chargés
      if (this.employees.length === 0) {
        this.loadEmployees();
        return;
      }
  
      const ownerEmployee = this.employees.find(e => e.FullName === selectedCase.Owner);
      if (ownerEmployee) {
        this.employeesService.setSelectedUser(ownerEmployee);
      } else {
        console.warn('Aucun employé trouvé avec ce nom');
        // Option: afficher un message à l'utilisateur
      }
    });
  }

 startEditingDescription(): void {
    this.selectedCase$.pipe(take(1)).subscribe(selectedCase => {
        this.editedDescription = selectedCase?.Description || '';
        this.isEditingDescription = true;
    });
}

  cancelEditingDescription(): void {
    this.isEditingDescription = false;
  }

  saveDescription(): void {
    this.isSavingDescription = true; // Active l'état de sauvegarde
    this.selectedCase$.pipe(take(1)).subscribe(selectedCase => {
        if (!selectedCase?.IncidentId) {
            this.isSavingDescription = false;
            return;
        }
        
        this.casesService.updateDescription(
            selectedCase.IncidentId.toString(),
            this.editedDescription
        ).subscribe({
            next: () => {
                if (this.caseDetails) {
                    this.caseDetails.Description = this.editedDescription;
                }
                this.casesService.setSelectedCase({
                    ...selectedCase,
                    Description: this.editedDescription
                });
                this.isEditingDescription = false;
                this.isSavingDescription = false; // Désactive l'état de sauvegarde
            },
            error: (err: any) => {
                console.error('Erreur lors de la mise à jour de la Description', err);
                this.isSavingDescription = false; // Désactive en cas d'erreur
            }
        });
    });
}


}