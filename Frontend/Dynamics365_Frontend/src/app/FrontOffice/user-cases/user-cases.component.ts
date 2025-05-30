import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { UserCases } from './user-cases.service';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray, transferArrayItem, CdkDragStart } from '@angular/cdk/drag-drop';
import { UserCaseDetailsComponent } from "../user-case-details/user-case-details.component";

@Component({
  selector: 'app-user-cases',
  standalone: true,
  imports: [CommonModule, RouterModule, CdkDropList, CdkDrag, UserCaseDetailsComponent],
  templateUrl: './user-cases.component.html',
  styleUrls: ['./user-cases.component.css']
})
export class UserCasesComponent {
  private userCasesService = inject(UserCases);
  allCases = signal<Case[]>([]);

  propsedCases = signal<Case[]>([]);
  activeCases = signal<Case[]>([]);
  resolvedCases = signal<Case[]>([]);
  cancelledCases = signal<Case[]>([]);
  connectedDropLists = signal<string[]>(['proposed', 'active', 'resolved', 'cancelled']);
  isUpdating = signal<{[key: string]: boolean}>({});
  selectedCase = signal<Case | null>(null);
  //showCaseDetails = signal(false);
  isLoading = signal(true);

  constructor() {
    this.loadCases();
    this.userCasesService.getSelectedCase().subscribe(caseItem => {
      this.selectedCase.set(caseItem);
    });
  }

  private loadCases() {
    this.isLoading = signal(true);
    this.userCasesService.getMyCases().subscribe({
      next: cases => {
        this.allCases.set(cases);
        this.updateColumns();
        this.isLoading.set(false);
      },
      error: err => console.error('Error:', err)
    });
  }

  private updateColumns() {
    this.propsedCases.set(this.filterCases('proposed'));
    this.activeCases.set(this.filterCases('active'));
    this.resolvedCases.set(this.filterCases('resolved'));
    this.cancelledCases.set(this.filterCases('cancelled'));
  }

  private filterCases(statusFilter: string): Case[] {
    return this.allCases().filter(caseItem =>
      caseItem.Stage?.toLowerCase() === statusFilter
    );
  }

drop(event: CdkDragDrop<Case[]>) {
    if (event.previousContainer === event.container) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
        const previousStage = event.previousContainer.id;
        const movedCase = event.previousContainer.data[event.previousIndex];
        const newStage = event.container.id;
        
        // Sauvegarde de l'ancien état pour rollback si nécessaire
        const originalStage = movedCase.Stage;
        
        // Mise à jour optimiste immédiate
        movedCase.Stage = newStage;
        this.updateColumns();
        
        // Appel API
        this.updateCaseStatus(movedCase.IncidentId, newStage, originalStage);
    }
}

  onDragStarted(event: CdkDragStart) {
    const preview = document.querySelector('.cdk-drag-preview') as HTMLElement;
    preview.style.width = event.source.element.nativeElement.offsetWidth + 'px';
    preview.style.boxShadow = '0 4px 8px 0 rgba(0, 0, 0, 0.2)';
    preview.style.borderLeft = '4px solid #0078D4';
    preview.style.opacity = '0.9';
    preview.style.transform = 'rotate(2deg)';
    document.body.appendChild(preview);
    event.source._dragRef['_preview'] = preview;
  }

  private getStatusFromContainerId(containerId: string): string {
    switch(containerId) {
      case 'proposed': return 'proposed';
      case 'active': return 'active';
      case 'resolved': return 'resolved';
      case 'cancelled': return 'cancelled';
      default: return 'proposed';
    }
  }

private updateCaseStatus(caseId: string, newStage: string, previousStage?: string) {
    this.isUpdating.update(state => ({...state, [caseId]: true}));

    this.userCasesService.updateCaseStatus(caseId, newStage).subscribe({
        next: () => {
            // Pas besoin de recharger toutes les données, la mise à jour optimiste a déjà été faite
            this.isUpdating.update(state => ({...state, [caseId]: false}));
        },
        error: (err) => {
            console.error('Update failed:', err);
            // Rollback seulement si nécessaire
            const movedCase = this.allCases().find(c => c.IncidentId === caseId);
            if (movedCase && previousStage) {
                movedCase.Stage = previousStage;
                this.updateColumns();
            }
            this.isUpdating.update(state => ({...state, [caseId]: false}));
        }
    });
}

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
      case 'proposed': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  

  showCaseDetails(caseItem: any): void {
    this.userCasesService.setSelectedCase(caseItem);
  }
  
  
}