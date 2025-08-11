import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, HostListener, Output, EventEmitter } from '@angular/core';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { UserCases } from '../user-cases/user-cases.service';
import { UserCaseDetailsService } from './user-case-details.service';
import { FormsModule } from '@angular/forms';
import { 
  faUser, faEnvelope, faPhone, faFax, faLink, faUserSlash, 
  faSpinner, faExpand, faTimes, faSearchPlus, faSearchMinus, faUndo, faImage, faUpload, faCheck
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
    times: faTimes
  };
  
  @Input() caseDetails: Case | null = null;
  @Input() imageUploadMode: boolean = false;
  @Output() imageUploaded = new EventEmitter<void>();
  isEditingNote = false;
  editedNote = '';
  isSavingNote = false;
  isImageModalOpen = false;
  zoomLevel = 1;
  selectedImage: File | null = null;
  isUploadingImage = false;
  imagePreviewUrl: string | null = null;
  
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
  
  openImageModal(): void {
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
  
  onImageSelected(event: Event): void {
  // Only allow image selection if case is resolved
  if (!this.isCaseResolved()) {
    return;
  }
  
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.selectedImage = input.files[0];
    
    // Create preview URL
    this.createImagePreview(this.selectedImage);
  }
}
  
  createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  cancelImageUpload(): void {
    this.selectedImage = null;
    this.imagePreviewUrl = null;
  }

  uploadImage(): void {
  if (!this.selectedImage || !this.caseDetails?.IncidentId) return;
  
  this.isUploadingImage = true;
  this.caseDetailsService.uploadCaseImage(
    this.caseDetails.IncidentId.toString(),
    this.selectedImage
  ).subscribe({
    next: () => {
      const reader = new FileReader();
      reader.readAsDataURL(this.selectedImage!);
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1];
        
        if (this.caseDetails) {
          this.caseDetails.ImageBase64 = base64;
        }
        
        this.selectedImage = null;
        this.imagePreviewUrl = null;
        this.isUploadingImage = false;
        
        // Emit event when in imageUploadMode
        if (this.imageUploadMode) {
          this.imageUploaded.emit();
        }
      };
    },
    error: (err) => {
      console.error('Error uploading image', err);
      this.isUploadingImage = false;
    }
  });
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
  isCaseResolved(): boolean {
  return this.caseDetails?.Stage?.toLowerCase() === 'resolved';
}
  
}