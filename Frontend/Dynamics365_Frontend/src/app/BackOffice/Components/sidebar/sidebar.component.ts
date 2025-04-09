import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
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
export class SidebarComponent implements OnInit {
  isSidebarOpen = false; // Fermé par défaut
  isMobileView = false;
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    { icon: 'fas fa-tachometer-alt', label: 'Dashboard', path: '/dashboard' },
    { icon: 'fas fa-users', label: 'Utilisateurs', path: '/users', notification: 3 },
    { icon: 'fas fa-boxes', label: 'Produits', path: '/products' },
    { icon: 'fas fa-shopping-cart', label: 'Commandes', path: '/orders', notification: 5 },
    { icon: 'fas fa-cog', label: 'Paramètres', path: '/settings' }
  ];

  ngOnInit() {
    this.checkViewport();
  }

  onToggleCollapse() {
    this.toggleCollapse.emit();
  }

  checkViewport() {
    this.isMobileView = window.innerWidth < 768;
    // Ouvrir la sidebar seulement si ce n'est pas la vue mobile
    this.isSidebarOpen = !this.isMobileView;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkViewport();
  }
}