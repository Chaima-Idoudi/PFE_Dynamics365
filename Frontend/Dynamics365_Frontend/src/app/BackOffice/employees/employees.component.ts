import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService, User } from './employees.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.component.html',
  providers: [EmployeesService],
})
export class EmployeesComponent implements OnInit {
  private employeesService = inject(EmployeesService);

  users = signal<User[]>([]);
  errorMessage = signal<string | null>(null);
  currentPage = signal(1);
  itemsPerPage = 5; 
  showAll = signal(false);
  searchTerm = signal('');
  onlyConnected = signal(false); // 🔹 signal au lieu d’une simple variable

  // 🔹 Utilisateurs filtrés (recherche + connectés)
  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const onlyOnline = this.onlyConnected();

    return this.users().filter(user => {
      const matchName = user.FullName.toLowerCase().includes(term);
      const matchConnection = onlyOnline ? user.IsConnected : true;
      return matchName && matchConnection;
    });
  });

  paginatedUsers = computed(() => {
    if (this.showAll()) return this.filteredUsers();

    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredUsers().slice(startIndex, startIndex + this.itemsPerPage);
  });

  ngOnInit(): void {
    this.employeesService.getUsers().subscribe({
      next: (data) => {
        console.log('Utilisateurs récupérés :', data);
        this.users.set(data);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des utilisateurs :', err);
        this.errorMessage.set('Impossible de charger les utilisateurs.');
      },
    });
  }

  toggleShowAll(event: Event) {
    event.preventDefault();
    this.showAll.update(prev => !prev);
    if (!this.showAll()) {
      this.currentPage.set(1);
    }
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

  copiedEmails: { [email: string]: boolean } = {};

  copyToClipboard(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      this.copiedEmails[email] = true;
      setTimeout(() => {
        this.copiedEmails[email] = false;
      }, 1500);
    }).catch(err => {
      console.error('Erreur lors de la copie', err);
    });
  }

  updateSearchTerm(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  toggleOnlyConnected() {
    this.onlyConnected.update(prev => !prev);
    this.currentPage.set(1); // remet à la page 1 si activé
  }
}
