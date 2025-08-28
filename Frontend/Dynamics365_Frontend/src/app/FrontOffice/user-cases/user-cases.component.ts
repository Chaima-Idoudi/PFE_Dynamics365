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
import { 
  faSpinner, faExpand, faTimes, faSearchPlus, faSearchMinus, faUndo, faImage, faUpload, faCheck, faTrash, faPlus,faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-cases',
  standalone: true,
  imports: [CommonModule, RouterModule, CdkDropList, CdkDrag, UserCaseDetailsComponent, FontAwesomeModule,FormsModule  ],
  templateUrl: './user-cases.component.html',
  styleUrls: ['./user-cases.component.css']
})
export class UserCasesComponent implements OnInit, OnDestroy {
  private userCasesService = inject(UserCases);
  private notificationService = inject(NotificationService);
  private UserCaseDetailsService = inject(UserCaseDetailsService);
  
  // Icons
  icons = {
    spinner: faSpinner,
    expand: faExpand,
    close: faTimes,
    zoomIn: faSearchPlus,
    zoomOut: faSearchMinus,
    undo: faUndo,
    image: faImage,
    upload: faUpload,
    check: faCheck,
    trash: faTrash,
    plus: faPlus,
    exclamation: faExclamationCircle
  };
  
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
  
  // Multiple image upload properties
  selectedImages: File[] = [];
  imagePreviewUrls: {file: File, url: string}[] = [];
  isUploadingImage = signal(false);
  uploadErrorMessage = signal<string | null>(null);

  showCancellationModal = signal(false);
  currentCaseForCancellation: Case | null = null;
  cancellationReason = signal('');
  isCancellationSubmitting = signal(false);

  isEditingCancellationReason = signal(false);
    

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
    
    // If moving to resolved stage, show the image modal
    if (newStage === 'resolved') {
      this.showImageRequiredModal(movedCase, newStage, previousStage);
      return; // Stop the operation until confirmation
    }
    
    // If moving to cancelled stage, show the cancellation reason modal
    if (newStage === 'cancelled') {
      this.showCancellationReasonModal(movedCase, newStage, previousStage);
      return; // Stop the operation until confirmation
    }
    
    // For other stages, proceed as normal
    const originalStage = movedCase.Stage;
    movedCase.Stage = newStage;
    this.updateColumns();
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
  
  // If the case is in resolved status, refresh its details first
  if (caseItem.Stage?.toLowerCase() === 'resolved') {
    this.userCasesService.refreshCaseDetails(caseItem.IncidentId).subscribe({
      next: (updatedCase) => {
        this.userCasesService.setSelectedCase(updatedCase);
      },
      error: (err) => {
        console.error('Error refreshing case details:', err);
        // Fall back to showing the case without refreshing
        this.userCasesService.setSelectedCase(caseItem);
      }
    });
  } else {
    this.userCasesService.setSelectedCase(caseItem);
  }
}

  showImageRequiredModal(caseItem: Case, newStage: string, previousStage: string) {
  this.currentCaseForImageUpload = caseItem;
  this.targetStage = newStage;
  this.previousStage = previousStage;
  this.selectedImages = [];
  this.imagePreviewUrls = [];
  this.showImageModal.set(true);
}

  closeImageModal() {
  this.showImageModal.set(false);
  this.currentCaseForImageUpload = null;
  this.targetStage = null;
  this.previousStage = null;
  this.selectedImages = [];
  this.imagePreviewUrls = [];
  this.uploadErrorMessage.set(null); // Réinitialiser le message d'erreur
}

  onImagesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    // Effacer tout message d'erreur précédent
    this.uploadErrorMessage.set(null);
    
    // Convert FileList to array
    const newFiles = Array.from(input.files);
    
    // Vérifier si l'ajout de ces fichiers dépasserait la limite
    const existingImagesCount = this.currentCaseForImageUpload?.Images?.length || 0;
    const totalImagesAfterAdd = existingImagesCount + this.selectedImages.length + newFiles.length;
    
    if (totalImagesAfterAdd > 10) {
      this.uploadErrorMessage.set(`Impossible d'ajouter plus de 10 images au total. Vous avez déjà ${existingImagesCount} images existantes.`);
      return;
    }
    
    // Add new files to selected files
    this.selectedImages = [...this.selectedImages, ...newFiles];
    
    // Create previews for new files
    newFiles.forEach(file => {
      this.createImagePreview(file);
    });
  }
}

  createImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreviewUrls.push({
        file: file,
        url: e.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  }

  removeSelectedImage(index: number) {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  cancelImageUpload() {
    this.selectedImages = [];
    this.imagePreviewUrls = [];
  }

  uploadImages() {
  if (this.selectedImages.length === 0 || !this.currentCaseForImageUpload?.IncidentId) return;
  
  // Effacer tout message d'erreur précédent
  this.uploadErrorMessage.set(null);
  
  // Vérifier si le total des images dépasserait la limite
  const existingImagesCount = this.currentCaseForImageUpload?.Images?.length || 0;
  if (existingImagesCount + this.selectedImages.length > 10) {
    this.uploadErrorMessage.set(`Impossible d'ajouter plus de 10 images au total. Vous avez déjà ${existingImagesCount} images et essayez d'en ajouter ${this.selectedImages.length} de plus.`);
    return;
  }
  
  this.isUploadingImage.set(true);
  
  // Use the UserCaseDetailsService to upload multiple images
  this.UserCaseDetailsService.uploadCaseImages(
    this.currentCaseForImageUpload.IncidentId.toString(),
    this.selectedImages
  ).subscribe({
    next: (updatedCase) => {
      this.isUploadingImage.set(false);
      this.uploadErrorMessage.set(null); // Clear any error on success
      
      // Update the case in our local list
      if (updatedCase) {
        // Update current case with new data
        this.currentCaseForImageUpload = updatedCase;
        
        // Update the cases list
        const currentCases = this.allCases();
        const updatedCases = currentCases.map(c => {
          if (c.IncidentId === updatedCase.IncidentId) {
            return updatedCase;
          }
          return c;
        });
        this.allCases.set(updatedCases);
        this.updateColumns();
      }
      
      this.confirmStatusChange();
    },
    error: (err) => {
      console.error('Error uploading images', err);
      this.isUploadingImage.set(false);
      this.uploadErrorMessage.set('Une erreur est survenue lors du téléchargement des images. Veuillez réessayer.');
    }
  });
}

  confirmStatusChange() {
  // If we have all the necessary data, proceed with the status update
  if (this.currentCaseForImageUpload && this.targetStage) {
    const caseItem = this.currentCaseForImageUpload;
    const newStage = this.targetStage;
    const originalStage = caseItem.Stage;
    
    // Check if there are existing images or newly uploaded images
    const hasExistingImages = caseItem.Images && caseItem.Images.length > 0;
    const hasNewImages = this.selectedImages.length > 0;
    
    // Only allow status change if there are images (existing or new)
    if (hasExistingImages || hasNewImages) {
      // Update the case status
      caseItem.Stage = newStage;
      this.updateColumns();
      
      // Call the API
      this.updateCaseStatus(caseItem.IncidentId, newStage, originalStage);
      
      // Close the modal
      this.closeImageModal();
    } else {
      // Show error message if no images
      alert('At least one image is required to resolve this ticket.');
    }
  }
}

  cancelStatusChange() {
    this.closeImageModal();
    // Refresh columns to ensure the interface is synchronized
    this.updateColumns();
  }

  // Get file size in readable format
  getReadableFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    else if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    else return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }
    // Get remaining image slots
  getRemainingImageSlots(): number {
  const existingImagesCount = this.currentCaseForImageUpload?.Images?.length || 0;
  return Math.max(0, 10 - existingImagesCount - this.selectedImages.length);
}

// Check if we have reached the maximum number of images
hasReachedMaxImages(): boolean {
  const existingImagesCount = this.currentCaseForImageUpload?.Images?.length || 0;
  return (existingImagesCount + this.selectedImages.length) >= 10;
}

submitCancellationReason() {
  if (!this.currentCaseForCancellation) {
    return;
  }
  
  this.isCancellationSubmitting.set(true);
  
  // If we're not editing and there's an existing reason, use that
  const reasonToSubmit = (!this.isEditingCancellationReason() && this.currentCaseForCancellation.CancellationReason) 
    ? this.currentCaseForCancellation.CancellationReason 
    : this.cancellationReason();
  
  // Call the service method to update case with cancellation reason
  this.userCasesService.updateCaseStatusWithReason(
    this.currentCaseForCancellation.IncidentId,
    this.targetStage || 'cancelled',
    reasonToSubmit
  ).subscribe({
    next: () => {
      // Update the case status locally
      if (this.currentCaseForCancellation && this.targetStage) {
        const caseItem = this.currentCaseForCancellation;
        const originalStage = caseItem.Stage;
        caseItem.Stage = this.targetStage;
        caseItem.CancellationReason = reasonToSubmit;
        this.updateColumns();
      }
      
      this.isCancellationSubmitting.set(false);
      this.closeCancellationModal();
    },
    error: (err) => {
      console.error('Error updating case with cancellation reason:', err);
      this.isCancellationSubmitting.set(false);
      // Optionally show error message
    }
  });
}

showCancellationReasonModal(caseItem: Case, newStage: string, previousStage: string) {
  this.currentCaseForCancellation = caseItem;
  this.targetStage = newStage;
  this.previousStage = previousStage;
  
  // If there's an existing cancellation reason, use it
  if (caseItem.CancellationReason) {
    this.cancellationReason.set(caseItem.CancellationReason);
    this.isEditingCancellationReason.set(false);
  } else {
    this.cancellationReason.set('');
    this.isEditingCancellationReason.set(true);
  }
  
  this.showCancellationModal.set(true);
}
startEditingCancellationReason() {
  this.isEditingCancellationReason.set(true);
}
closeCancellationModal() {
  this.showCancellationModal.set(false);
  this.currentCaseForCancellation = null;
  this.targetStage = null;
  this.previousStage = null;
  this.cancellationReason.set('');
  this.isEditingCancellationReason.set(false);
}

}
  
  
