import { Component, HostListener, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js/auto';
import { NgPipesModule } from 'ngx-pipes';
import { HeaderComponent } from "../Components/header/header.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgPipesModule, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit {
  isSidebarOpen = true;
  isMobileView = false;

  // Données pour les cartes de statistiques
  stats = [
    { 
      title: 'Revenue Total', 
      value: '$24,780', 
      icon: 'fas fa-dollar-sign',
      trend: '12.5% increase',
      trendIcon: 'fas fa-arrow-up',
      trendColor: 'text-green-400'
    },
    { 
      title: 'Nouvelles Commandes', 
      value: '1,024', 
      icon: 'fas fa-shopping-cart',
      trend: '8.2% increase',
      trendIcon: 'fas fa-arrow-up',
      trendColor: 'text-green-400'
    },
    { 
      title: 'Utilisateurs Actifs', 
      value: '1,254', 
      icon: 'fas fa-users',
      trend: '3.7% decrease',
      trendIcon: 'fas fa-arrow-down',
      trendColor: 'text-red-400'
    },
    { 
      title: 'Taux de Conversion', 
      value: '3.42%', 
      icon: 'fas fa-percentage',
      trend: '1.1% increase',
      trendIcon: 'fas fa-arrow-up',
      trendColor: 'text-green-400'
    }
  ];

  // Données pour les commandes récentes
  recentOrders = [
    { id: '#1245', customer: 'John Doe', date: '12/05/2023', amount: '$120', status: 'completed' },
    { id: '#1246', customer: 'Jane Smith', date: '13/05/2023', amount: '$85', status: 'processing' },
    { id: '#1247', customer: 'Robert Johnson', date: '14/05/2023', amount: '$210', status: 'completed' },
    { id: '#1248', customer: 'Emily Davis', date: '15/05/2023', amount: '$65', status: 'pending' },
    { id: '#1249', customer: 'Michael Wilson', date: '16/05/2023', amount: '$150', status: 'failed' }
  ];

  // Actions rapides
  quickActions = [
    { icon: 'fas fa-plus', label: 'Ajouter Produit' },
    { icon: 'fas fa-user-plus', label: 'Ajouter Utilisateur' },
    { icon: 'fas fa-tag', label: 'Créer Offre' },
    { icon: 'fas fa-chart-pie', label: 'Rapports' }
  ];

  constructor() {
    Chart.register(...registerables);
    this.checkViewport();
  }

  ngAfterViewInit() {
    this.renderCharts();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkViewport();
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

  private renderCharts() {
    this.renderMainChart();
    this.renderPieChart();
  }

  private renderMainChart() {
    const ctx = document.getElementById('mainChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [12000, 19000, 3000, 5000, 2000, 3000],
          borderColor: '#2a5a9a',
          backgroundColor: 'rgba(42, 90, 154, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: this.getChartOptions()
    });
  }

  private renderPieChart() {
    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Direct', 'Referral', 'Social', 'Organic'],
        datasets: [{
          data: [55, 25, 15, 5],
          backgroundColor: [
            '#2a5a9a',
            '#17a2b8',
            '#28a745',
            '#ffc107'
          ]
        }]
      },
      options: {
        ...this.getChartOptions(),
        cutout: '70%'
      }
    });
  }

  private getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#ffffff'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#cccccc'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#cccccc'
          }
        }
      }
    };
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      completed: 'bg-green-500/20 text-green-500',
      processing: 'bg-blue-500/20 text-blue-500',
      pending: 'bg-yellow-500/20 text-yellow-500',
      failed: 'bg-red-500/20 text-red-500'
    };
    return statusClasses[status] || 'bg-gray-500/20';
  }
}