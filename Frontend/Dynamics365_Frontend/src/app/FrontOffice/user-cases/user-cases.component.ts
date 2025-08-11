import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { UserCases } from './user-cases.service';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray, transferArrayItem, CdkDragStart } from '@angular/cdk/drag-drop';
import { UserCaseDetailsComponent } from "../user-case-details/user-case-details.component";
import { Subscription } from 'rxjs';
import { NotificationService } from '../../Notifications/notification.service';
import { UserCaseDetailsService } from '../user-case-details/user-case-details.service';
@Component({
  selector: 'app-user-cases',
  standalone: true,
  imports: [CommonModule, RouterModule, CdkDropList, CdkDrag, UserCaseDetailsComponent],
  templateUrl: './user-cases.component.html',
  styleUrls: ['./user-cases.component.css']
})
export class UserCasesComponent implements OnInit, OnDestroy {
  private userCasesService = inject(UserCases);
  private notificationService = inject(NotificationService);
  private UserCaseDetailsService = inject(UserCaseDetailsService)
  // Subscriptions to manage
  private subscriptions: Subscription[] = [];
  
  // Signals
  allCases = signal<Case[]>([]);
  propsedCases = signal<Case[]>([]);
  activeCases = signal<Case[]>([]);
  resolvedCases = signal<Case[]>([]);
  cancelledCases = signal<Case[]>([]);
  connectedDropLists = signal<string[]>(['proposed', 'active', 'resolved', 'cancelled']);
  isUpdating = signal<{[key: string]: boolean}>({});
  selectedCase = signal<Case | null>(null);
  isLoading = signal(true);

  lastNotification = signal<string | null>(null);
  lastUnassignmentNotification = signal<{ticketId: string, ticketTitle: string} | null>(null);

  showImageModal = signal(false);
  currentCaseForImageUpload: Case | null = null;
  targetStage: string | null = null;
  previousStage: string | null = null;
  selectedImage: File | null = null;
  imagePreviewUrl: string | null = null;
  isUploadingImage = signal(false);
  

  ngOnInit(): void {
  console.log('UserCasesComponent initialized');
  
  // Start SignalR connection if not already started
  this.notificationService.startConnection();
  
  // Load initial cases
  this.loadCases();
  
  // Subscribe to real-time case updates
  const casesSubscription = this.userCasesService.cases$.subscribe(cases => {
    if (cases && cases.length > 0) {
      console.log('Cases updated from service:', cases.length);
      this.allCases.set(cases);
      this.updateColumns();
    }
  });
  this.subscriptions.push(casesSubscription);
  
  // Subscribe to selected case changes
  const selectedCaseSubscription = this.userCasesService.getSelectedCase().subscribe(caseItem => {
    console.log('Selected case updated:', caseItem?.Title || 'None');
    this.selectedCase.set(caseItem);
  });
  this.subscriptions.push(selectedCaseSubscription);
  
  // Subscribe to new ticket notifications for UI feedback (assignations uniquement)
  const notificationSubscription = this.notificationService.notification$.subscribe(message => {
    if (message) {
      console.log('Received notification message:', message);
      this.lastNotification.set(message);
      
      // Afficher temporairement la notification
      setTimeout(() => {
        if (this.lastNotification() === message) {
          this.lastNotification.set(null);
        }
      }, 5000);
    }
  });
  this.subscriptions.push(notificationSubscription);

  // Les désassignations sont traitées séparément
  const unassignmentSubscription = this.notificationService.ticketUnassignment$.subscribe(data => {
    if (data) {
      console.log('Received unassignment notification:', data);
      this.lastUnassignmentNotification.set(data);
      
      // Afficher temporairement la notification
      setTimeout(() => {
        if (this.lastUnassignmentNotification() === data) {
          this.lastUnassignmentNotification.set(null);
        }
      }, 5000);
    }
  });
  this.subscriptions.push(unassignmentSubscription);
}
  
  ngOnDestroy(): void {
    console.log('UserCasesComponent destroyed, cleaning up subscriptions');
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  private loadCases() {
    this.isLoading.set(true);
    console.log('Loading cases...');
    this.userCasesService.getMyCases().subscribe({
      next: cases => {
        console.log('Cases loaded successfully:', cases.length);
        this.allCases.set(cases);
        this.updateColumns();
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading cases:', err);
        this.isLoading.set(false);
      }
    });
  }

  private updateColumns() {
    this.propsedCases.set(this.filterCases('proposed'));
    this.activeCases.set(this.filterCases('active'));
    this.resolvedCases.set(this.filterCases('resolved'));
    this.cancelledCases.set(this.filterCases('cancelled'));
    
    console.log('Columns updated:', {
      proposed: this.propsedCases().length,
      active: this.activeCases().length,
      resolved: this.resolvedCases().length,
      cancelled: this.cancelledCases().length
    });
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
    
    console.log(`Moving case from ${previousStage} to ${newStage}:`, movedCase.Title);
    
    // Vérifier si on déplace vers "resolved" - toujours afficher le modal
    if (newStage === 'resolved') {
      // Afficher le modal que l'image existe ou non
      this.showImageRequiredModal(movedCase, newStage, previousStage);
      return; // Arrêter l'opération de déplacement jusqu'à confirmation
    }
    
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

  private updateCaseStatus(caseId: string, newStage: string, previousStage?: string) {
    this.isUpdating.update(state => ({...state, [caseId]: true}));
    console.log(`Updating case ${caseId} status to ${newStage}`);

    this.userCasesService.updateCaseStatus(caseId, newStage).subscribe({
      next: () => {
        console.log(`Case ${caseId} status updated successfully`);
        this.isUpdating.update(state => ({...state, [caseId]: false}));
      },
      error: (err) => {
        console.error('Update failed:', err);
        // Rollback seulement si nécessaire
        const movedCase = this.allCases().find(c => c.IncidentId === caseId);
        if (movedCase && previousStage) {
          console.log(`Rolling back case ${caseId} to ${previousStage}`);
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
    console.log('Showing case details:', caseItem.Title);
    this.userCasesService.setSelectedCase(caseItem);
  }

  showImageRequiredModal(caseItem: Case, newStage: string, previousStage: string) {
  this.currentCaseForImageUpload = caseItem;
  this.targetStage = newStage;
  this.previousStage = previousStage;
  this.selectedImage = null;
  this.imagePreviewUrl = null;
  this.showImageModal.set(true);
}



closeImageModal() {
  this.showImageModal.set(false);
  this.currentCaseForImageUpload = null;
  this.targetStage = null;
  this.previousStage = null;
  this.selectedImage = null;
  this.imagePreviewUrl = null;
}

onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.selectedImage = input.files[0];
    
    // Créer l'URL de prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(this.selectedImage);
  }
}

cancelImageUpload() {
  this.selectedImage = null;
  this.imagePreviewUrl = null;
}
uploadImage() {
  if (!this.selectedImage || !this.currentCaseForImageUpload?.IncidentId) return;
  
  this.isUploadingImage.set(true);
  
  // Utilisez le service UserCaseDetailsService pour télécharger l'image
  this.UserCaseDetailsService.uploadCaseImage(
    this.currentCaseForImageUpload.IncidentId.toString(),
    this.selectedImage
  ).subscribe({
    next: () => {
      const reader = new FileReader();
      reader.readAsDataURL(this.selectedImage!);
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1];
        
        if (this.currentCaseForImageUpload) {
          this.currentCaseForImageUpload.ImageBase64 = base64;
        }
        
        this.isUploadingImage.set(false);
        this.confirmStatusChange();
      };
    },
    error: (err) => {
      console.error('Error uploading image', err);
      this.isUploadingImage.set(false);
    }
  });
}

confirmStatusChange() {
  // Si nous avons toutes les données nécessaires, procéder à la mise à jour du statut
  if (this.currentCaseForImageUpload && this.targetStage) {
    const caseItem = this.currentCaseForImageUpload;
    const newStage = this.targetStage;
    const originalStage = caseItem.Stage;
    
    // Mettre à jour le statut du cas
    caseItem.Stage = newStage;
    this.updateColumns();
    
    // Appeler l'API
    this.updateCaseStatus(caseItem.IncidentId, newStage, originalStage);
    
    // Fermer le modal
    this.closeImageModal();
  }
}

cancelStatusChange() {
  this.closeImageModal();
  // Rafraîchir les colonnes pour s'assurer que l'interface est synchronisée
  this.updateColumns();
}
}
