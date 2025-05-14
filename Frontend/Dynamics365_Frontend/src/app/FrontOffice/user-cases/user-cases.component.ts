import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { UserCases } from './user-cases.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-user-cases',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-cases.component.html',
  styleUrl: './user-cases.component.css'
})
export class UserCasesComponent {
  
  private userCasesService = inject(UserCases);
allCases = signal<Case[]>([]);
  // Données dynamiques
  constructor() {
    this.loadCases();
  }
  private loadCases() {
    this.userCasesService.getMyCases().subscribe({
      next: cases => this.allCases.set(cases),
      error: err => console.error('Erreur:', err)
    });
  }
  // Colonnes Kanban
  inProgressCases = computed(() => this.filterCases('in progress'));
  onHoldCases = computed(() => this.filterCases('on hold'));
  waitingForDetailsCases = computed(() => this.filterCases('waiting for details'));
  researchingCases = computed(() => this.filterCases('researching'));

  private filterCases(statusFilter: string) {
    return this.allCases().filter(caseItem => 
      caseItem.Status?.toLowerCase() === statusFilter
    );
  }

  // Méthodes pour le style
  getPriorityClass(priority: string | null | undefined): string {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(status: string | null | undefined): string {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'on hold': return 'bg-purple-100 text-purple-800';
      case 'waiting for details': return 'bg-orange-100 text-orange-800';
      case 'researching': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
