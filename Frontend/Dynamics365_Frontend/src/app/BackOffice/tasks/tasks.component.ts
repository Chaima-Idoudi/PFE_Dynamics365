// tasks.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { TasksService } from './tasks.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faFilter, faChevronDown, faEye, faEllipsisV, faCopy, faCheck ,faSpinner,faFire,faSignal, faSnowflake,faStarHalfAlt} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TasksComponent implements OnInit {
  // Icônes
  icons = {
    search: faSearch,
    filter: faFilter,
    chevronDown: faChevronDown,
    eye: faEye,
    ellipsis: faEllipsisV,
    copy: faCopy,
    check: faCheck,
    spinner: faSpinner,
    highPriority: faFire,
    mediumPriority: faSignal,
    lowPriority: faSnowflake,
    mediuim : faStarHalfAlt,
    
  };

  // Signaux
  tasks = signal<any[]>([]);
  filteredTasks = signal<any[]>([]);
  searchTerm = signal<string>('');
  errorMessage = signal<string>('');
  copiedIds: {[key: string]: boolean} = {};
  isLoading = signal<boolean>(true); 

  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = 5;
  showAll = signal<boolean>(false);

  constructor(private tasksService: TasksService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.tasksService.getActivities().subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.filteredTasks.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Erreur lors du chargement des activités');
        console.error(err);
      }
    });
  }

  updateSearchTerm(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm.set(term);
    this.filterTasks();
  }

  filterTasks(): void {
    const term = this.searchTerm();
    this.filteredTasks.set(
      this.tasks().filter(task => 
        task.Subject?.toLowerCase().includes(term) || 
        task.AssignedTo?.toLowerCase().includes(term)
      )
    );
    this.currentPage.set(1);
  }

  

  // Pagination methods
  get paginatedTasks(): any[] {
    if (this.showAll()) return this.filteredTasks();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredTasks().slice(start, start + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage() * this.itemsPerPage < this.filteredTasks().length) {
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
    return Math.min(this.currentPage() * this.itemsPerPage, this.filteredTasks().length);
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
    switch (priority?.toLowerCase()) {
      case 'high':
        return {
          icon: this.icons.highPriority,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          text: 'High'
        };
      case 'medium':
        return {
          icon: this.icons.mediuim,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          text: 'Medium'
        };
      case 'low':
        return {
          icon: this.icons.lowPriority,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          text: 'Low'
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

}