import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { UserCases } from '../user-cases/user-cases.service';
import { UserCaseDetailsService } from './user-case-details.service';
import { FormsModule } from '@angular/forms';
import { faUser, faEnvelope, faPhone, faFax, faLink, faUserSlash,faSpinner, } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-user-case-details',
  standalone: true,
  imports: [CommonModule,FormsModule, FontAwesomeModule],
  templateUrl: './user-case-details.component.html',
  styleUrls: ['./user-case-details.component.css']
})
export class UserCaseDetailsComponent {
    icons = {
    user: faUser,
    email: faEnvelope,
    phone: faPhone,
    fax: faFax,
    link: faLink,
    userSlash: faUserSlash,
    spinner:faSpinner,
  };
  @Input() caseDetails: Case | null = null;
  isEditingNote = false;
  editedNote = '';
  isSavingNote = false;

  constructor(private userCasesService: UserCases,private caseDetailsService: UserCaseDetailsService) {}

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
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de la note', err);
        // Gérer l'erreur (afficher un message à l'utilisateur)
      }
    });
  }
  
}