import { Component, EventEmitter, Output, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../login/services/auth.service';
import { Router } from '@angular/router';

interface Notification {
  id: number;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  fullName: string | null = '';
  @Output() toggleSidebar = new EventEmitter<void>();
  ngOnInit(): void {
    this.fullName = this.authService.getFullName(); // Vérifier que cette ligne récupère correctement fullName
  }
  searchQuery = '';
  isUserDropdownOpen = false;
  notifications: Notification[] = [
    { id: 1, message: 'New order received', time: '10 min ago', read: false },
    { id: 2, message: 'System update available', time: '1 hour ago', read: true },
    { id: 3, message: 'New user registered', time: '2 hours ago', read: true }
  ];

  constructor(private elementRef: ElementRef,private authService: AuthService,
    private router: Router) {}
  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  onToggleClick() {
    this.toggleSidebar.emit();
  }

  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  
  isLoading = false;
  errorMessage: string | null = null;
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
    // On déconnecte quand même côté client
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isUserDropdownOpen = false;
    }
  }
}