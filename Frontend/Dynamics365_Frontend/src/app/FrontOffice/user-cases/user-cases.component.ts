import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { UserCases } from './user-cases.service';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray, transferArrayItem, CdkDragStart } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-user-cases',
  standalone: true,
  imports: [CommonModule, RouterModule, CdkDropList, CdkDrag],
  templateUrl: './user-cases.component.html',
  styleUrls: ['./user-cases.component.css']
})
export class UserCasesComponent {
  private userCasesService = inject(UserCases);
  allCases = signal<Case[]>([]);

  inProgressCases = signal<Case[]>([]);
  onHoldCases = signal<Case[]>([]);
  waitingForDetailsCases = signal<Case[]>([]);
  researchingCases = signal<Case[]>([]);
  connectedDropLists = signal<string[]>(['inProgress', 'onHold', 'waitingForDetails', 'researching']);
  isUpdating = signal<{[key: string]: boolean}>({});
  selectedCase = signal<Case | null>(null);
  showCaseDetails = signal(false);

  constructor() {
    this.loadCases();
  }

  private loadCases() {
    this.userCasesService.getMyCases().subscribe({
      next: cases => {
        this.allCases.set(cases);
        this.updateColumns();
      },
      error: err => console.error('Error:', err)
    });
  }

  private updateColumns() {
    this.inProgressCases.set(this.filterCases('in progress'));
    this.onHoldCases.set(this.filterCases('on hold'));
    this.waitingForDetailsCases.set(this.filterCases('waiting for details'));
    this.researchingCases.set(this.filterCases('researching'));
  }

  private filterCases(statusFilter: string): Case[] {
    return this.allCases().filter(caseItem =>
      caseItem.Status?.toLowerCase() === statusFilter
    );
  }

  drop(event: CdkDragDrop<Case[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const previousStatus = event.previousContainer.data[event.previousIndex].Status;
      const movedCase = event.previousContainer.data[event.previousIndex];
      const newStatus = this.getStatusFromContainerId(event.container.id);
      
      event.previousContainer.data.splice(event.previousIndex, 1);
      event.container.data.unshift(movedCase);
      movedCase.Status = newStatus;

      this.updateColumns();
      this.updateCaseStatus(movedCase.IncidentId, newStatus, previousStatus);
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
      case 'inProgress': return 'in progress';
      case 'onHold': return 'on hold';
      case 'waitingForDetails': return 'waiting for details';
      case 'researching': return 'researching';
      default: return 'in progress';
    }
  }

  private updateCaseStatus(caseId: string, newStatus: string, previousStatus?: string) {
    this.isUpdating.update(state => ({...state, [caseId]: true}));

    this.userCasesService.updateCaseStatus(caseId, newStatus).subscribe({
      next: () => {
        this.isUpdating.update(state => ({...state, [caseId]: false}));
      },
      error: () => {
        this.isUpdating.update(state => ({...state, [caseId]: false}));
        if (previousStatus) {
          const movedCase = this.allCases().find(c => c.IncidentId === caseId);
          if (movedCase) {
            movedCase.Status = previousStatus;
            this.updateColumns();
          }
        }
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
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'on hold': return 'bg-purple-100 text-purple-800';
      case 'waiting for details': return 'bg-orange-100 text-orange-800';
      case 'researching': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  openCaseDetails(caseItem: Case) {
    this.selectedCase.set(caseItem);
    this.showCaseDetails.set(true);
  }
  closeCaseDetails() {
    this.selectedCase.set(null);
    this.showCaseDetails.set(false);
  }
}