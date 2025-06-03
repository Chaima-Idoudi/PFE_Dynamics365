import { Component, EventEmitter, Output, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../login/services/auth.service';
import { Router } from '@angular/router';
import { ProfileService } from '../../../BackOffice/profile/profile.service';
import { AvatarComponent } from '../../../Avatar/avatar/avatar.component';
import { NotificationService } from '../../../Notifications/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, CommonModule, AvatarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnDestroy {
  fullName: string | null = '';
  userPhoto: string | null = null;
  @Output() toggleSidebar = new EventEmitter<void>();
  isUserDropdownOpen = false;
  isLoading = false;
  errorMessage: string | null = null;

  isNotificationOpen = false;
  realTimeNotifications: string[] = [];
  storedNotifications: any[] = [];
  private subscriptions = new Subscription();
  currentDate = new Date();

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
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeNotifications(): void {
    // Fonction existante pour les notifications temps réel
    this.subscriptions.add(
      this.notificationService.notification$.subscribe(message => {
        if (message) {
          this.realTimeNotifications.unshift(message);
        }
      })
    );

    // NOUVEAU: Charger les notifications stockées
    this.subscriptions.add(
      this.notificationService.storedNotifications$.subscribe(notifications => {
        this.storedNotifications = notifications || [];
      })
    );

    // Démarrer la connexion et charger les notifications
    this.notificationService.startConnection();
    this.notificationService.loadStoredNotifications();
  }

  // Fonction existante conservée
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

  // Fonction existante conservée
  navigateToProfile() {
    this.isUserDropdownOpen = false;
    this.router.navigate(['/home/userProfile']);
  }

  // Fonction existante conservée
  onToggleClick() {
    this.toggleSidebar.emit();
  }

  // Fonction existante conservée
  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  // Fonction existante conservée
  toggleNotifications(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  // Fonction existante conservée
  clearNotifications(): void {
    this.realTimeNotifications = [];
  }

  // NOUVEAU: Marquer une notification comme lue
  markAsRead(notification: any): void {
    if (!notification.isRead && notification.id) {
      this.notificationService.markNotificationAsRead(notification.id);
      notification.isRead = true;
    }
  }

  // Fonction existante conservée
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

  // Fonction existante conservée
  private handleLogoutSuccess(): void {
    this.isLoading = false;
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  // Fonction existante conservée
  private handleLogoutError(error: any): void {
    this.isLoading = false;
    this.errorMessage = 'Une erreur est survenue lors de la déconnexion';
    console.error('Logout error:', error);
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  // Fonction existante conservée
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isUserDropdownOpen = false;
    }
  }
}