import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, HostListener, Output, EventEmitter } from '@angular/core';
import { Case, CaseImage } from '../../BackOffice/case-details/Models/case.model';
import { UserCases } from '../user-cases/user-cases.service';
import { UserCaseDetailsService } from './user-case-details.service';
import { FormsModule } from '@angular/forms';
import { 
  faUser, faEnvelope, faPhone, faFax, faLink, faUserSlash, 
  faSpinner, faExpand, faTimes, faSearchPlus, faSearchMinus, faUndo, faImage, faUpload, faCheck,
  faTrash, faPlus, faExclamation , faClock , faInfo , faHistory
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-user-case-details',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './user-case-details.component.html',
  styleUrls: ['./user-case-details.component.css']
})
export class UserCaseDetailsComponent implements AfterViewInit, OnChanges {
  @ViewChild('modalImage') modalImageElement!: ElementRef;
  
  icons = {
    user: faUser,
    email: faEnvelope,
    phone: faPhone,
    fax: faFax,
    link: faLink,
    userSlash: faUserSlash,
    spinner: faSpinner,
    expand: faExpand,
    close: faTimes,
    zoomIn: faSearchPlus,
    zoomOut: faSearchMinus,
    undo: faUndo,
    image: faImage,
    upload: faUpload,
    check: faCheck,
    times: faTimes,
    trash: faTrash,
    plus: faPlus,
    exclamation: faExclamation,
    clock : faClock,
    info : faInfo,
    history : faHistory
  };
  
  @Input() caseDetails: Case | null = null;
  @Input() imageUploadMode: boolean = false;
  @Output() imageUploaded = new EventEmitter<void>();
  
  isEditingNote = false;
  editedNote = '';
  isSavingNote = false;
  isImageModalOpen = false;
  zoomLevel = 1;
  
  // For multiple image upload
  selectedFiles: File[] = [];
  isUploadingImages = false;
  imagePreviewUrls: {file: File, url: string}[] = [];
  
  // Current image being viewed in modal
  currentViewingImage: string | null = null;
  uploadErrorMessage: string | null = null;
  isDeleting: { [key: string]: boolean } = {};
  imageToDelete: string | null = null; // Stocke le nom du fichier à supprimer
  showDeleteConfirmation = false; 
  
  // Pan functionality
  isPanning = false;
  startX = 0;
  startY = 0;
  panX = 0;
  panY = 0;
  
  constructor(
    private userCasesService: UserCases, 
    private caseDetailsService: UserCaseDetailsService
  ) {}
  
  ngAfterViewInit() {
    this.adjustImageContainer();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['caseDetails']) {
      setTimeout(() => this.adjustImageContainer(), 100);
    }
  }
  
  adjustImageContainer() {
    // Cette méthode n'est plus nécessaire avec le nouveau système d'affichage
    // mais nous la gardons pour d'éventuelles autres utilisations
  }
  
  goBackToList(): void {
    this.userCasesService.setSelectedCase(null);
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

  startEditingNote(): void {
    if (this.caseDetails) {
      this.editedNote = this.caseDetails.Note || '';
      this.isEditingNote = true;
    }
  }

  cancelEditingNote(): void {
    this.isEditingNote = false;
  }

  saveNote(): void {
    this.isSavingNote = true;
    if (!this.caseDetails?.IncidentId) return;

    this.caseDetailsService.updateNote(
      this.caseDetails.IncidentId.toString(),
      this.editedNote
    ).subscribe({
      next: () => {
        if (this.caseDetails) {
          this.caseDetails.Note = this.editedNote;
        }
        this.isEditingNote = false;
        this.isSavingNote = false;
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de la note', err);
        this.isSavingNote = false;
      }
    });
  }
  
  openImageModal(imageBase64: string): void {
    this.currentViewingImage = imageBase64;
    this.isImageModalOpen = true;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    document.body.style.overflow = 'hidden';
  }
  
  closeImageModal(): void {
    this.isImageModalOpen = false;
    document.body.style.overflow = 'auto';
  }
  
  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.25, 5);
  }
  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.5);
    
    // Reset pan if we're back to original size
    if (this.zoomLevel <= 1) {
      this.panX = 0;
      this.panY = 0;
    }
  }
  
  resetZoom(): void {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }
  
  // Mouse wheel zoom
  onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Determine zoom direction
    if (event.deltaY < 0) {
      // Zoom in
      this.zoomLevel = Math.min(this.zoomLevel + 0.1, 5);
    } else {
      // Zoom out
      this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5);
      
      // Reset pan if we're back to original size
      if (this.zoomLevel <= 1) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }
  
  // Pan functionality
  startPan(event: MouseEvent): void {
    // Only enable panning when zoomed in
    if (this.zoomLevel > 1) {
      this.isPanning = true;
      this.startX = event.clientX - this.panX;
      this.startY = event.clientY - this.panY;
    }
  }
  
  pan(event: MouseEvent): void {
    if (this.isPanning) {
      this.panX = event.clientX - this.startX;
      this.panY = event.clientY - this.startY;
    }
  }
  
  endPan(): void {
    this.isPanning = false;
  }
  
  // Multiple file selection
  onImagesSelected(event: Event): void {
  // Only allow image selection if case is resolved
  if (!this.isCaseActive()) {
    return;
  }
  
  // Clear any previous error
  this.uploadErrorMessage = null;
  
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    // Convert FileList to array
    const newFiles = Array.from(input.files);
    
    // Check if adding these files would exceed the limit
    const existingImagesCount = this.caseDetails?.Images?.length || 0;
    const totalImagesAfterAdd = existingImagesCount + this.selectedFiles.length + newFiles.length;
    
    if (totalImagesAfterAdd > 10) {
      this.uploadErrorMessage = `Cannot upload more than 10 images in total. You already have ${existingImagesCount} existing images and ${this.selectedFiles.length} selected images.`;
      return;
    }
    
    // Add new files to selected files
    this.selectedFiles = [...this.selectedFiles, ...newFiles];
    
    // Create previews for new files
    newFiles.forEach(file => {
      this.createImagePreview(file);
    });
  }
}
  
  createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreviewUrls.push({
        file: file,
        url: e.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  cancelImageUpload(): void {
    this.selectedFiles = [];
    this.imagePreviewUrls = [];
  }

  uploadImages(): void {
  if (this.selectedFiles.length === 0 || !this.caseDetails?.IncidentId) return;
  
  // Clear any previous error
  this.uploadErrorMessage = null;
  
  // Check if total images would exceed limit
  const existingImagesCount = this.caseDetails?.Images?.length || 0;
  if (existingImagesCount + this.selectedFiles.length > 10) {
    this.uploadErrorMessage = `Cannot upload more than 10 images in total. You already have ${existingImagesCount} images and are trying to add ${this.selectedFiles.length} more.`;
    return;
  }
  
  const caseId = this.caseDetails.IncidentId.toString();
  this.isUploadingImages = true;
  
  this.caseDetailsService.uploadCaseImages(caseId, this.selectedFiles).subscribe({
    next: (updatedCase) => {
      console.log('Images uploaded successfully, case updated:', updatedCase);
      
      // Mettre à jour les données du cas avec les nouvelles images
      if (updatedCase && this.caseDetails) {
        // Mettre à jour le cas actuel avec les nouvelles données
        this.caseDetails = updatedCase;
        
        // IMPORTANT: Update the case in the UserCases service
        this.userCasesService.refreshCaseDetails(caseId).subscribe({
          next: () => console.log('Case updated in service after image upload'),
          error: (err) => console.error('Error updating case in service', err)
        });
      }
      
      this.selectedFiles = [];
      this.imagePreviewUrls = [];
      this.isUploadingImages = false;
      
      // Emit event when in imageUploadMode
      if (this.imageUploadMode) {
        this.imageUploaded.emit();
      }
    },
    error: (err) => {
      console.error('Error uploading images', err);
      this.isUploadingImages = false;
      this.uploadErrorMessage = 'An error occurred while uploading images. Please try again.';
    }
  });
}
  
  refreshCaseImages(): void {
    // Refresh the case to get the updated images
    // This would typically be handled by a service call to get the latest case data
    // For now, we'll just emit an event that the parent component can handle
    this.imageUploaded.emit();
  }
  
  // Prevent keyboard shortcuts from interfering with modal
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.isImageModalOpen) {
      // Prevent default for arrow keys, +, -, etc.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '='].includes(event.key)) {
        event.preventDefault();
      }
      
      // Handle keyboard shortcuts
      switch (event.key) {
        case 'Escape':
          this.closeImageModal();
          break;
        case '+':
        case '=':
          this.zoomIn();
          break;
        case '-':
          this.zoomOut();
          break;
        case '0':
          this.resetZoom();
          break;
        case 'ArrowUp':
          this.panY += 20;
          break;
        case 'ArrowDown':
          this.panY -= 20;
          break;
        case 'ArrowLeft':
          this.panX += 20;
          break;
        case 'ArrowRight':
          this.panX -= 20;
          break;
      }
    }
  }
  
  isCaseActive(): boolean {
  return this.caseDetails?.Stage?.toLowerCase() === 'active';
}
  
  // Get file size in readable format
  getReadableFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    else if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    else return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  // Check if we have reached the maximum number of images
  hasReachedMaxImages(): boolean {
    const existingImagesCount = this.caseDetails?.Images?.length || 0;
    return (existingImagesCount + this.selectedFiles.length) >= 10;
  }
  
  // Get remaining image slots
  getRemainingImageSlots(): number {
    const existingImagesCount = this.caseDetails?.Images?.length || 0;
    return Math.max(0, 10 - existingImagesCount - this.selectedFiles.length);
  }


  confirmDeleteImage(fileName: string): void {
  this.imageToDelete = fileName;
  this.showDeleteConfirmation = true;
}

deleteImage(): void {
  if (!this.caseDetails?.IncidentId || !this.imageToDelete) return;
  
  // Stockez le nom du fichier dans une variable locale pour l'utiliser après la suppression
  const fileName = this.imageToDelete;
  const caseId = this.caseDetails.IncidentId.toString();
  
  // Set deleting state for this image
  this.isDeleting[fileName] = true;
  // Hide confirmation dialog
  this.showDeleteConfirmation = false;
  
  this.caseDetailsService.deleteCaseImage(caseId, fileName).subscribe({
    next: (updatedCase) => {
      console.log('Image deleted successfully');
      
      // Update the case with new data
      if (updatedCase && this.caseDetails) {
        this.caseDetails = updatedCase;
        
        // IMPORTANT: Update the case in the UserCases service
        this.userCasesService.refreshCaseDetails(caseId).subscribe({
          next: () => console.log('Case updated in service after image deletion'),
          error: (err) => console.error('Error updating case in service', err)
        });
      }
      
      // Clear deleting state
      delete this.isDeleting[fileName];
      this.imageToDelete = null;
    },
    error: (err) => {
      console.error('Error deleting image', err);
      delete this.isDeleting[fileName];
      this.imageToDelete = null;
      
      // Afficher un message d'erreur dans l'interface au lieu d'une alerte
      this.uploadErrorMessage = 'An error occurred while deleting the image. Please try again.';
    }
  });
}

cancelDeleteImage(): void {
  this.imageToDelete = null;
  this.showDeleteConfirmation = false;
}
} 