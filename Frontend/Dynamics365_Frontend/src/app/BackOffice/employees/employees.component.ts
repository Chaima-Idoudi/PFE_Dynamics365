import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService } from './employees.service';
import { UserDetailsComponent } from '../user-details/user-details.component';
import { faSpinner , faSearch , faEye, faCopy , faCheck, faFilter , faChevronDown, faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { User } from './Models/user.model';
import { ClickOutsideDirective } from '../case-details/click-outside.directive';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, UserDetailsComponent,FontAwesomeModule,ClickOutsideDirective],
  templateUrl: './employees.component.html'
})
export class EmployeesComponent implements OnInit {
  icons = {
      spinner: faSpinner,
      search: faSearch,
      eye: faEye,
      copy: faCopy,
      check: faCheck,
      filter: faFilter,
      chevronDown: faChevronDown,
      ellipsis: faEllipsis
    };
   employeesService = inject(EmployeesService);

  users = signal<User[]>([]);
  errorMessage = signal<string | null>(null);
  currentPage = signal(1);
  itemsPerPage = 5; 
  showAll = signal(false);
  searchTerm = signal('');
  filterConnected = signal(false);
  filterTechnicians = signal(false);
  isFilterDropdownOpen = signal(false);
  copiedEmails: { [email: string]: boolean } = {};
  isLoading = signal<boolean>(true);

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filterConn = this.filterConnected();
    const filterTech = this.filterTechnicians();

    return this.users().filter(user => {
      const matchName = user.FullName.toLowerCase().includes(term);
      let matchFilter = true;
      
      if (filterConn && filterTech) {
        matchFilter = user.IsConnected && user.IsTechnician;
      } else if (filterConn) {
        matchFilter = user.IsConnected;
      } else if (filterTech) {
        matchFilter = user.IsTechnician;
      }

      return matchName && matchFilter;
    });
  });

  paginatedUsers = computed(() => {
    if (this.showAll()) return this.filteredUsers();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredUsers().slice(startIndex, startIndex + this.itemsPerPage);
  });
  
  noResultsMessage = computed(() => {
  if (this.users().length === 0) return '';
  
  if (this.filteredUsers().length === 0) {
    if (this.searchTerm() && this.filterConnected() && this.filterTechnicians()) {
      return `Aucun technicien connecté ne correspond à "${this.searchTerm()}"`;
    } else if (this.searchTerm() && this.filterConnected()) {
      return `Aucun employé connecté ne correspond à "${this.searchTerm()}"`;
    } else if (this.searchTerm() && this.filterTechnicians()) {
      return `Aucun technicien ne correspond à "${this.searchTerm()}"`;
    } else if (this.searchTerm()) {
      return `Aucun employé ne correspond à "${this.searchTerm()}"`;
    } else if (this.filterConnected() && this.filterTechnicians()) {
      return "Aucun technicien connecté trouvé";
    } else if (this.filterConnected()) {
      return "Aucun employé connecté trouvé";
    } else if (this.filterTechnicians()) {
      return "Aucun technicien trouvé";
    }
  }
  
  return '';
});

  ngOnInit(): void {
    this.employeesService.getUsers().subscribe({
      next: (data) =>{ this.users.set(data);
        this.isLoading.set(false);
      },
      
      error: (err) => {
        console.error('Erreur:', err);
        this.errorMessage.set('Impossible de charger les utilisateurs.');
      }
    });
  }

  showUserDetails(user: User) {
    this.employeesService.setSelectedUser(user);
  }

  toggleFilterConnected() {
    this.filterConnected.update(prev => !prev);
    this.currentPage.set(1);
  }

  toggleFilterTechnicians() {
    this.filterTechnicians.update(prev => !prev);
    this.currentPage.set(1);
  }

  getFilterLabel(): string {
    if (this.filterConnected() && this.filterTechnicians()) return 'Techniciens connected';
    if (this.filterConnected()) return 'connected';
    if (this.filterTechnicians()) return 'Techniciens';
    return 'All';
  }

  toggleFilterDropdown() {
    this.isFilterDropdownOpen.update(prev => !prev);
  }

  toggleShowAll(event: Event) {
    event.preventDefault();
    this.showAll.update(prev => !prev);
    if (!this.showAll()) this.currentPage.set(1);
  }

  nextPage() {
    if (this.currentPage() * this.itemsPerPage < this.filteredUsers().length) {
      this.currentPage.update(prev => prev + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(prev => prev - 1);
    }
  }

  getFirstItemOnPage(): number {
    return (this.currentPage() - 1) * this.itemsPerPage + 1;
  }

  getLastItemOnPage(): number {
    return Math.min(this.currentPage() * this.itemsPerPage, this.filteredUsers().length);
  }

  copyToClipboard(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      this.copiedEmails[email] = true;
      setTimeout(() => this.copiedEmails[email] = false, 1500);
    });
  }

  updateSearchTerm(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }
  
  showUserList() {
    this.employeesService.setSelectedUser(null);
  }
}