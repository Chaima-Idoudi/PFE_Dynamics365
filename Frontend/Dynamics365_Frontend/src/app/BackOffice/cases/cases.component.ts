import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CasesService } from './cases.service';
import { faSearch, faFilter, faChevronDown, faEye, faEllipsisV, faCopy, faCheck, faSnowflake, faSignal, faFire, IconDefinition, faStarHalfAlt, faSpinner, faDownLong } from '@fortawesome/free-solid-svg-icons';
import { CaseDetailsComponent } from "../case-details/case-details.component";

@Component({
  selector: 'app-cases',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, CaseDetailsComponent],
  templateUrl: './cases.component.html',
  styleUrls: ['./cases.component.css']
})
export class CasesComponent implements OnInit {
  casesService = inject(CasesService)
  // Icônes
  icons = {
    search: faSearch,
    filter: faFilter,
    chevronDown: faChevronDown,
    eye: faEye,
    ellipsis: faEllipsisV,
    copy: faCopy,
    check: faCheck,
    highPriority: faFire,
    mediumPriority: faSignal,
    lowPriority: faDownLong,
    mediuim: faStarHalfAlt,
    spinner: faSpinner
  };

  // Signaux
  isLoading = signal<boolean>(true);
  cases = signal<any[]>([]);
  filteredCases = signal<any[]>([]);
  searchTerm = signal<string>('');
  errorMessage = signal<string>('');
  copiedIds: {[key: string]: boolean} = {};

  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = 5;
  showAll = signal<boolean>(false);
  
  ngOnInit(): void {
    this.loadCases();
  }
  
  loadCases(): void {
    this.isLoading.set(true); // Active le loading
    this.errorMessage.set(''); 
    
    this.casesService.getCases().subscribe({
      next: (data) => {
        this.cases.set(data);
        this.filteredCases.set(data);
        this.isLoading.set(false); // Désactive le loading
      },
      error: (err) => {
        this.errorMessage.set('Erreur lors du chargement des cas');
        this.isLoading.set(false); // Désactive le loading même en cas d'erreur
        console.error(err);
      }
    });
  }

  updateSearchTerm(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm.set(term);
    this.filterCases();
  }

  filterCases(): void {
    const term = this.searchTerm();
    this.filteredCases.set(
      this.cases().filter(c => 
        c.Title?.toLowerCase().includes(term) || 
        c.AssignedTo?.toLowerCase().includes(term)
      )
    );
    this.currentPage.set(1);
  }

  // Pagination methods
  get paginatedCases(): any[] {
    if (this.showAll()) return this.filteredCases();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredCases().slice(start, start + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage() * this.itemsPerPage < this.filteredCases().length) {
      this.currentPage.update(p => p + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  getFirstItemOnPage(): number {
    return (this.currentPage() - 1) * this.itemsPerPage + 1;
  }

  getLastItemOnPage(): number {
    return Math.min(this.currentPage() * this.itemsPerPage, this.filteredCases().length);
  }

  toggleShowAll(event: Event): void {
    event.preventDefault();
    this.showAll.update(v => !v);
  }

  getPriorityStyle(priority: string | null): {
    icon: IconDefinition | undefined;
    color: string;
    bgColor: string;
    text: string;
  } {
    switch (priority) {
      case 'high':
        return {
          icon: this.icons.highPriority,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          text: 'Haute'
        };
      case 'medium':
        return {
          icon: this.icons.mediuim,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          text: 'Normale'
        };
      case 'low':
        return {
          icon: this.icons.lowPriority,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          text: 'Basse'
        };
      default:
        return {
          icon: undefined, 
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          text: 'Non définie'
        };
    }
  }

  readonly STATUS = {
    PROPOSED: "proposed",
    ACTIVE: "active",
    RESOLVED: "resolved",
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

  showCaseDetails(caseItem: any): void {
    this.casesService.setSelectedCase(caseItem);
  }

  // Handle case update events from the child component
  onCasesUpdated(): void {
    this.loadCases();
  }
}