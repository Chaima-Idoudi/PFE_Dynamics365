import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // <-- Ajoutez cette ligne

interface MenuItem {
  path: string;
  icon: string;
  label: string;
  notification?: number;
}
@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, CommonModule ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  isSidebarOpen = true;
  isMobileView = false;
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();
  constructor() {
      
      this.checkViewport();
    }
  menuItems: MenuItem[] = [
    { icon: 'fas fa-tachometer-alt', label: 'Dashboard', path: '/dashboard' },
    { icon: 'fas fa-users', label: 'Utilisateurs', path: '/users', notification: 3 },
    { icon: 'fas fa-boxes', label: 'Produits', path: '/products' },
    { icon: 'fas fa-shopping-cart', label: 'Commandes', path: '/orders', notification: 5 },
    { icon: 'fas fa-cog', label: 'Paramètres', path: '/settings' }
  ];

  onToggleCollapse() {
    this.toggleCollapse.emit();
  }

  checkViewport() {
    this.isMobileView = window.innerWidth < 768;
    if (!this.isMobileView) {
      this.isSidebarOpen = true;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  onHeaderToggle() {
    this.toggleSidebar();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkViewport();
  }
}
