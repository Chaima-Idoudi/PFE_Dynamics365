import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  path: string;
  icon: string;
  label: string;
  notification?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  isSidebarOpen = false;
  isMobileView = false;
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    { icon: 'fas fa-tachometer-alt', label: 'Dashboard', path: '/dashboard/subdashbord' },
    { icon: 'fas fa-users', label: 'Workers', path: '/dashboard/employees' },
    { icon: 'fas fa-boxes', label: 'Tasks', path: '/dashboard/tasks' },
    { icon: 'fas fa-wrench', label: 'Tickets', path: '/home/myCases' },
    { icon: 'fas fa-cog', label: 'Settings', path: '/settings' }
  ];

  ngOnInit() {
    this.checkViewport();
  }

  checkViewport() {
    this.isMobileView = window.innerWidth < 768;
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