import { Component, EventEmitter, Output, HostListener, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../login/services/auth.service';
import { Router } from '@angular/router';
import { ProfileService } from '../../../BackOffice/profile/profile.service';
import { AvatarComponent } from '../../../Avatar/avatar/avatar.component';
import { NotificationService } from '../../../Notifications/notification.service';
import { catchError, forkJoin, of, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, CommonModule, AvatarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  fullName: string | null = '';
  userPhoto: string | null = null;
  @Output() toggleSidebar = new EventEmitter<void>();
  isUserDropdownOpen = false;
  isLoading = false;
  errorMessage: string | null = null;

  isNotificationOpen = false;
  realTimeNotifications: {message: string, isRead: boolean, timestamp: Date}[] = [];
  unassignmentNotifications: {ticketId: string, ticketTitle: string, isRead: boolean, timestamp: Date}[] = [];
  storedNotifications: any[] = [];
  private subscriptions = new Subscription();
  currentDate = new Date();
  isLoadingNotifications = false;
  isClearingNotifications = false;

  constructor(
    private elementRef: ElementRef,
    private authService: AuthService,
    private router: Router,
    private profileService: ProfileService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.fullName = this.authService.getFullName();
    this.loadUserProfile();

    // Initialiser les connexions de notification
    this.initializeNotifications();
    // Charger les notifications stockées immédiatement
  this.notificationService.loadStoredNotifications();
  
  // Démarrer la connexion SignalR
  this.notificationService.startConnection();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeNotifications(): void {
    // Fonction pour les notifications temps réel
    this.subscriptions.add(
      this.notificationService.notification$.subscribe(message => {
        if (message) {
          this.realTimeNotifications.unshift({
            message: message,
            isRead: false,
            timestamp: new Date()
          });
        }
      })
    );

    // Fonction pour les notifications de désassignation
    this.subscriptions.add(
      this.notificationService.ticketUnassignment$.subscribe(data => {
        if (data) {
          this.unassignmentNotifications.unshift({
            ...data,
            isRead: false,
            timestamp: new Date()
          });
        }
      })
    );

    // Charger les notifications stockées
    this.subscriptions.add(
      this.notificationService.storedNotifications$.subscribe(notifications => {
        this.storedNotifications = notifications || [];
      })
    );

    // Démarrer la connexion et charger les notifications
    this.notificationService.startConnection();
    this.notificationService.loadStoredNotifications();
  }

  private loadUserProfile(): void {
    this.profileService.getUserProfile().subscribe({
      next: (profile) => {
        if (profile.Photo) {
          this.userPhoto = profile.Photo;
        }
        if (profile.FullName) {
          this.fullName = profile.FullName;
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement du profil', err);
      }
    });
  }

  navigateToProfile() {
    this.isUserDropdownOpen = false;
    this.router.navigate(['/home/userProfile']);
  }

  onToggleClick() {
    this.toggleSidebar.emit();
  }

  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  toggleNotifications(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
    
    // Marquer toutes les notifications comme lues quand on ouvre le panneau
    if (this.isNotificationOpen) {
      this.markAllAsRead();
    }
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead(): void {
    const unreadNotifications = this.storedNotifications.filter(n => !n.IsRead);
    const markAllRequests = unreadNotifications.map(n => 
        this.notificationService.markNotificationAsRead(n.Id).pipe(
            catchError(err => {
                console.error(`Error marking notification ${n.Id} as read`, err);
                return of(null);
            })
        )
    );

    forkJoin(markAllRequests).subscribe(() => {
        // Force refresh from server
        this.notificationService.loadStoredNotifications();
    });
}

  clearNotifications(): void {
    // Vider toutes les notifications
    this.realTimeNotifications = [];
    this.unassignmentNotifications = [];
    
    // Marquer toutes les notifications stockées comme lues
    this.storedNotifications.forEach(notification => {
      if (!notification.IsRead) {
        this.notificationService.markNotificationAsRead(notification.Id);
        notification.IsRead = true;
      }
    });
  }

  async markAsRead(notification: any): Promise<void> {
  // Vérifier si la notification est déjà en cours de traitement
  if (notification.isMarkingAsRead) return;

  // Pour les notifications stockées du serveur
  if (notification.Id && !notification.IsRead) {
    notification.isMarkingAsRead = true;
    try {
      await this.notificationService.markNotificationAsRead(notification.Id).toPromise();
      notification.IsRead = true;
      // Force refresh from server
      this.notificationService.loadStoredNotifications();
    } catch (error) {
      console.error('Error marking notification as read', error);
    } finally {
      notification.isMarkingAsRead = false;
    }
  }
  // Pour les notifications temps réel
  else if ('isRead' in notification && !notification.isRead) {
    notification.isRead = true;
    // Optionnel: envoyer une requête au serveur pour marquer comme lu si nécessaire
  }
  // Pour les notifications de désassignation
  else if ('ticketId' in notification && !notification.isRead) {
    notification.isRead = true;
    // Optionnel: envoyer une requête au serveur pour marquer comme lu si nécessaire
  }
}

  logout(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.logout().subscribe({
      next: () => {
        this.handleLogoutSuccess();
      },
      error: (err) => {
        this.handleLogoutError(err);
      }
    });
  }

  private handleLogoutSuccess(): void {
    this.isLoading = false;
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  private handleLogoutError(error: any): void {
    this.isLoading = false;
    this.errorMessage = 'Une erreur est survenue lors de la déconnexion';
    console.error('Logout error:', error);
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isUserDropdownOpen = false;
    }
  }

  // Calcule le nombre total de notifications non lues
  get unreadNotificationsCount(): number {
  // Count only unread real-time notifications
  const unreadRealTime = this.realTimeNotifications.filter(n => !n.isRead).length;
  
  // Count only unread unassignment notifications
  const unreadUnassignments = this.unassignmentNotifications.filter(n => !n.isRead).length;
  
  // Count only unread stored notifications
  const unreadStored = this.storedNotifications.filter(n => !n.IsRead).length;
  
  return unreadRealTime + unreadUnassignments + unreadStored;
}



getGroupedNotifications() {
  const now = new Date();
  const groups: {[key: string]: any[]} = {
    'Aujourd\'hui': [],
    'Hier': [],
    'Cette semaine': [],
    'Ce mois-ci': [],
    'Cette année': [],
    'Anciennes': []
  };

  for (const notif of this.storedNotifications) {
    const notifDate = new Date(notif.CreatedOn);
    const diffTime = now.getTime() - notifDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0 && notifDate.getDate() === now.getDate()) {
      groups['Aujourd\'hui'].push(notif);
    } else if (diffDays === 1) {
      groups['Hier'].push(notif);
    } else if (diffDays < 7) {
      groups['Cette semaine'].push(notif);
    } else if (notifDate.getMonth() === now.getMonth() && notifDate.getFullYear() === now.getFullYear()) {
      groups['Ce mois-ci'].push(notif);
    } else if (notifDate.getFullYear() === now.getFullYear()) {
      groups['Cette année'].push(notif);
    } else {
      groups['Anciennes'].push(notif);
    }
  }
  return groups;
}
get groupedNotificationsKeys(): string[] {
  return Object.keys(this.getGroupedNotifications());
}
}
