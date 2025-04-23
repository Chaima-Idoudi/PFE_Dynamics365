// case-details.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CasesService } from '../cases/cases.service';
import { 
  faArrowLeft, 
  faCalendar, 
  faUser, 
  faTicketAlt, 
  faFire, 
  faSignal, 
  faSnowflake, 
  faStarHalfAlt, 
  faTrashAlt, 
  faEdit, 
  faSyncAlt, 
  faCommentAlt, 
  faEnvelope,
  faPhone,
  faFax,
  faMapMarkerAlt,
  faCity,
  faInfoCircle,
  faLink,
  faExternalLinkAlt,
  faUserSlash,
  faHistory,
  faAlignLeft,
  faMap, 
  faCheckCircle, 
  faTimesCircle,
  faCalendarAlt,
  faFileAlt,
  faClock,
  faBolt,
  faShareAlt,
  faPrint,
  faArchive,
  faAddressCard,
  // Nouvelles icônes à ajouter
  faLayerGroup,
  faCodeBranch,
  faUserShield,
  faIdBadge,
  faChartLine,
  faIndustry,
  faTasks,
  faStickyNote,
  faTag,
  faCog,
  faBuilding,
  faUserTie
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-case-details',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './case-details.component.html',
  styleUrls: ['./case-details.component.css']
})
export class CaseDetailsComponent {
  casesService = inject(CasesService);
  selectedCase$ = this.casesService.getSelectedCase();

  icons = {
    // Navigation
    back: faArrowLeft,
    
    // Tickets
    ticket: faTicketAlt,
    calendar: faCalendar,
    calendarAlt: faCalendarAlt,
    
    // Priorités
    highPriority: faFire,
    mediumPriority: faSignal,
    lowPriority: faSnowflake,
    medium: faStarHalfAlt,
    bolt: faBolt,
    
    // Actions
    edit: faEdit,
    delete: faTrashAlt,
    changeStatus: faSyncAlt,
    share: faShareAlt,
    print: faPrint,
    archive: faArchive,
    link: faLink,
    externalLink: faExternalLinkAlt,
    
    // Communication
    comment: faCommentAlt,
    email: faEnvelope,
    phone: faPhone,
    fax: faFax,
    
    // Statuts
    checkCircle: faCheckCircle,
    timesCircle: faTimesCircle,
    
    // Localisation
    location: faMapMarkerAlt,
    city: faCity,
    map: faMap,
    
    // Utilisateurs
    user: faUser,
    customer: faUserTie,
    owner: faUserShield,
    userSlash: faUserSlash,
    badge: faIdBadge,
    
    // Informations
    info: faInfoCircle,
    description: faAlignLeft,
    file: faFileAlt,
    clock: faClock,
    history: faHistory,
    addressCard: faAddressCard,
    
    // Nouveaux éléments du redesign
    caseType: faLayerGroup,
    origin: faCodeBranch,
    satisfaction: faChartLine,
    industry: faIndustry,
    activities: faTasks,
    notes: faStickyNote,
    tag: faTag,
    cog: faCog,
    building: faBuilding
  };

  closeDetails() {
    this.casesService.setSelectedCase(null);
  }

  getPriorityStyle(priority: string | null) {
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
          icon: this.icons.medium,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          text: 'Normale'
        };
      case 'low':
        return {
          icon: this.icons.lowPriority,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
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

  getSatisfactionPercentage(satisfaction: string): number {
    const mapping: {[key: string]: number} = {
      'Very Dissatisfied': 20,
      'Dissatisfied': 40,
      'Neutral': 60,
      'Satisfied': 80,
      'Very Satisfied': 100
    };
    return mapping[satisfaction as keyof typeof mapping] || 0;
  }
}