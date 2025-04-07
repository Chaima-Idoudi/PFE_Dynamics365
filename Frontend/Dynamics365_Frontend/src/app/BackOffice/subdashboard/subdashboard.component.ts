import { Component } from '@angular/core';

@Component({
  selector: 'app-subdashboard',
  imports: [],
  templateUrl: './subdashboard.component.html',
  styleUrl: './subdashboard.component.css'
})
export class SubdashboardComponent {
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
  recentOrders = [
    { id: '#1245', customer: 'John Doe', date: '12/05/2023', amount: '$120', status: 'completed' },
    { id: '#1246', customer: 'Jane Smith', date: '13/05/2023', amount: '$85', status: 'processing' },
    { id: '#1247', customer: 'Robert Johnson', date: '14/05/2023', amount: '$210', status: 'completed' },
    { id: '#1248', customer: 'Emily Davis', date: '15/05/2023', amount: '$65', status: 'pending' },
    { id: '#1249', customer: 'Michael Wilson', date: '16/05/2023', amount: '$150', status: 'failed' }
  ];

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      completed: 'bg-green-500/20 text-green-500',
      processing: 'bg-blue-500/20 text-blue-500',
      pending: 'bg-yellow-500/20 text-yellow-500',
      failed: 'bg-red-500/20 text-red-500'
    };
    return statusClasses[status] || 'bg-gray-500/20';
  }
   quickActions = [
      { icon: 'fas fa-plus', label: 'Ajouter Produit' },
      { icon: 'fas fa-user-plus', label: 'Ajouter Utilisateur' },
      { icon: 'fas fa-tag', label: 'Créer Offre' },
      { icon: 'fas fa-chart-pie', label: 'Rapports' }
    ];
}
